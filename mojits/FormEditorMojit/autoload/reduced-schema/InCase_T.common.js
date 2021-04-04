
/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*eslint prefer-template:0, strict:0  */
/*global YUI */
'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-schema-InCase-T',

    /* Module code */
    function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TIMESTAMP_FORMAT_DOQUVIDE = i18n( 'general.TIMESTAMP_FORMAT_DOQUVIDE' );

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        //-- start schema
        Y.dcforms.schema.InCase_T = {
            "version": 1,
            "mapper": "incase",
            "activityId": {
                "required": true,
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Activity ID",
                    "de": "Akteneintrag ID",
                    "de-ch": "Akteneintrag ID"
                },
                "description": {
                    "en": "Activity ID",
                    "de": "Eintrags ID",
                    "de-ch": "Eintrags ID"
                }
            },
            "diagnoses": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Diagnoses",
                    "de": "Diagnosen",
                    "de-ch": "Diagnosen"
                },
                "description": {
                    "en": "Diagnoses",
                    "de": "Diagnose",
                    "de-ch": "Diagnose"
                },
                "searchAsArrayOfValues": true
            },
            "diagnosesText": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "diagnoses text",
                    "de": "Diagnosen texte",
                    "de-ch": "Diagnosen texte"
                },
                "description": {
                    "en": "Diagnosis in Text form",
                    "de": "Diagnose in Textform",
                    "de-ch": "Diagnose in Textform"
                }
            },
            "referralDiagnosesText": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "custom diagnoses text",
                    "de": "custom Diagnosen texte",
                    "de-ch": "custom Diagnosen texte"
                },
                "description": {
                    "en": "Diagnosis in Text form",
                    "de": "Diagnose in Textform",
                    "de-ch": "Diagnose in Textform"
                }
            },
            "diagnosesTextDate": {
                "type": "String",
                "label": {
                    "en": "diagnoses text with date",
                    "de": "Diagnosen texte und Datum",
                    "de-ch": "Diagnosen texte und Datum"
                },
                "description": {
                    "en": "Diagnosis in Text form and the Date",
                    "de": "Diagnose ist Textform und Datum",
                    "de-ch": "Diagnose ist Textform und Datum"
                }
            },
            "invoiceNo": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Invoice No.",
                    "de": "Rechnungsnummer",
                    "de-ch": "Rechnungsnummer"
                },
                "description": {
                    "en": "Invoice number",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "invoiceLinkedContents": {
                "type": "InvoiceLinkedItem_T",
                "insight2": false,
                "label": {
                    "en": "Invoice history / statement",
                    "de": "Invoice history / statement",
                    "de-ch": "Invoice history / statement"
                },
                "description": {
                    "en": "Invoice history / statement",
                    "de": "Invoice history / statement",
                    "de-ch": "Invoice history / statement"
                }
            },
            "warning1Price": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Warning 1 price",
                    "de": "Mahnkosten 1",
                    "de-ch": "Mahnkosten 1"
                }
            },
            "warning1PricePlain": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Warning 1 price (plain)",
                    "de": "Mahnkosten 1 (ohne Währung)",
                    "de-ch": "Mahnkosten 1 (ohne Währung)"
                }
            },
            "warning2Price": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Warning 2 price",
                    "de": "Mahnkosten 2",
                    "de-ch": "Mahnkosten 2"
                }
            },
            "warning2PricePlain": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Warning 2 price (plain)",
                    "de": "Mahnkosten 2 (ohne Währung)",
                    "de-ch": "Mahnkosten 2 (ohne Währung)"
                }
            },

            "socialSecurityNo": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Social Security Number",
                    "de": "Sozialversicherungsnummer",
                    "de-ch": "Sozialversicherungsnummer / AHV"
                }
            },
            "emergencyContact": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Emergency contact",
                    "de": "Notfallkontakt",
                    "de-ch": "Notfallkontakt"
                }
            },
            "internetAddress": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Website address",
                    "de": "Internetaddresse",
                    "de-ch": "Internetaddresse"
                }
            },
            "mobilePhone": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Mobile phone",
                    "de": "Handy (privat)",
                    "de-ch": "Handy (privat)"
                }
            },

            "insuranceName": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance name",
                    "de": "Kostenträger",
                    "de-ch": "Kostenträger"
                },
                "description": {
                    "en": "Health Insurance",
                    "de": "Krankenkasse",
                    "de-ch": "Krankenkasse"
                }
            },
            "insuranceBgNumber": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "BG Case Number",
                    "de": "BG-Nummer",
                    "de-ch": "BG-Nummer"
                },
                "description": {
                    "en": "Casefile number for BG / employee inurance",
                    "de": "BG-Nummer",
                    "de-ch": "BG-Nummer"
                }
            },
            "insuranceNames": {
                "type": "String",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "All insurance names",
                    "de": "Alle Kostenträger",
                    "de-ch": "Alle Kostenträger"
                },
                "description": {
                    "en": "Comma separated list of insurance companies",
                    "de": "Komma getrennte Liste der Versicherungsgesellschaften",
                    "de-ch": "Komma getrennte Liste der Versicherungsgesellschaften"
                }
            },
            "billingFactor": {
                "type": "Number",
                "insight2": true,
                "label": {
                    "en": "billing factor",
                    "de": "Rechnungsfaktor",
                    "de-ch": "Rechnungsfaktor"
                },
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Multiplies total treatment cost.",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "documentTags": {
                "type": ["String"],
                "insight2": false,
                "model": "document",
                "label": {
                    "en": "tags",
                    "de": "tags",
                    "de-ch": "tags"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Dokumentenbeleg",
                    "de-ch": "Dokumentenbeleg"
                }
            },
            "documentTagsPlain": {
                "type": "String",
                "insight2": true,
                "model": "document",
                "label": {
                    "en": "Tags",
                    "de": "Dokument Tags",
                    "de-ch": "Dokument Tags"
                },
                "description": {
                    "en": "Document tags",
                    "de": "Dokument Tags",
                    "de-ch": "Dokument Tags"
                }
            },
            "documentCreatedOn": {
                "type": "Date",
                "insight2": true,
                "model": "document",
                "label": {
                    "en": "Created on",
                    "de": "Erzeugt am",
                    "de-ch": "Erzeugt am"
                },
                "description": {
                    "en": "Date of document creation",
                    "de": "Erzeugt am",
                    "de-ch": "Erzeugt am"
                }
            },
            "documentCaption": {
                "type": "String",
                "insight2": true,
                "model": "document",
                "label": {
                    "en": "Caption",
                    "de": "Überschrift",
                    "de-ch": "Überschrift"
                },
                "description": {
                    "en": "Caption of the document",
                    "de": "Dokumentenname",
                    "de-ch": "Dokumentenname"
                }
            },
            "documentMediaId": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Linked media ID",
                    "de": "Verbundene Media ID",
                    "de-ch": "Verbundene Media ID"
                },
                "description": {
                    "en": "Media Id linked to the document",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "documentContentType": {
                "type": "String",
                "insight2": true,
                "model": "document",
                "label": {
                    "en": "contentType",
                    "de": "Inhaltstyp",
                    "de-ch": "Inhaltstyp"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Inhaltstyp des Dokument",
                    "de-ch": "Inhaltstyp des Dokument"
                }
            },
            "documentUrl": {
                "type": "String",
                "insight2": true,
                "model": "document",
                "label": {
                    "en": "URL",
                    "de": "URL",
                    "de-ch": "URL"
                },
                "description": {
                    "en": "MISSING",
                    "de": "URL des Dokument",
                    "de-ch": "URL des Dokument"
                }
            },
            "documentType": {
                "type": "String",
                "insight2": true,
                "model": "document",
                "label": {
                    "en": "Document type",
                    "de": "Dokumentenart",
                    "de-ch": "Dokumentenart"
                },
                "description": {
                    "en": "Type of the document",
                    "de": "Dokumententyp",
                    "de-ch": "Dokumententyp"
                }
            },
            "documentId": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Document ID",
                    "de": "Dokument ID",
                    "de-ch": "Dokument ID"
                },
                "description": {
                    "en": "Document ID",
                    "de": "Dokumenten ID",
                    "de-ch": "Dokumenten ID"
                }
            },
            "insuranceId": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance iD",
                    "de": "IKNR",
                    "de-ch": "IKNR"
                },
                "description": {
                    "en": "Insurance ID",
                    "de": "ID der Versicherung",
                    "de-ch": "ID der Versicherung"
                }
            },
            "insuranceNo": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance no.",
                    "de": "Versicherten-Nr.",
                    "de-ch": "Versicherten-Nr."
                },
                "description": {
                    "en": "Insurance number",
                    "de": "Versichertennummer",
                    "de-ch": "Versichertennummer"
                }
            },
            "jobTitle": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Job title",
                    "de": "Beruf (Kat.)",
                    "de-ch": "Beruf (Kat.)"
                },
                "description": {
                    "en": "Job title",
                    "de": "Beruf",
                    "de-ch": "Beruf"
                }
            },
            "patientId": {
                "required": true,
                "type": "String",
                "insight2": true,
                "inpacs": true,
                "model": "patient",
                "label": {
                    "en": "Patient Number",
                    "de": "Patienten Nummer",
                    "de-ch": "Patienten Nummer"
                }
            },
            "workingAt": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Employer",
                    "de": "Arbeitgeber",
                    "de-ch": "Arbeitgeber"
                },
                "description": {
                    "en": "Employer",
                    "de": "Arbeitgeber",
                    "de-ch": "Arbeitgeber"
                }
            },
            "dob": {
                "type": "Date",
                "insight2": true,
                "inpacs": true,
                "model": "patient",
                "label": {
                    "en": "Birthdate",
                    "de": "Geburtsdatum",
                    "de-ch": "Geburtsdatum"
                },
                "description": {
                    "en": "Date of birth",
                    "de": "Geburtsdatum",
                    "de-ch": "Geburtsdatum"
                }
            },
            "dateOfDeath": {
                "type": "Date",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Date of Death",
                    "de": "Todestag",
                    "de-ch": "Todestag"
                },
                "description": {
                    "en": "Date of Death",
                    "de": "Todestag",
                    "de-ch": "Todestag"
                }
            },
            "isDeceased": {
                "type": "Boolean",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Is Dead",
                    "de": "Todes",
                    "de-ch": "Todes"
                }
            },
            "isPensioner": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Pensioner",
                    "de": "Ist pensioniert",
                    "de-ch": "Ist pensioniert"
                }
            },
            "inActive": {
                "type": "Boolean",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Inactive",
                    "de": "Inaktiv",
                    "de-ch": "Inaktiv"
                }
            },
            "dateOfInActive": {
                "type": "Date",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Date of Inactive",
                    "de": "Inaktiv seit",
                    "de-ch": "Inaktiv seit"
                }
            },
            "reason": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Reason",
                    "de": "Bemerkung",
                    "de-ch": "Bemerkung"
                }
            },
            "jobStatus": {
                "type": "string",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Job Status",
                    "de": "Beschäftigungsart",
                    "de-ch": "Beschäftigungsart"
                }
            },
            "age": {
                "type": "Number",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Age",
                    "de": "Alter",
                    "de-ch": "Alter"
                },
                "description": {
                    "en": "Age",
                    "de": "Alter",
                    "de-ch": "Alter"
                }
            },
            "cardStatus": {
                "schema": "patient",
                "path": "cardStatus",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Card status",
                    "de": "Kartenstatus",
                    "de-ch": "Kartenstatus"
                },
                "description": {
                    "en": "Card status",
                    "de": "Kartenstatus",
                    "de-ch": "Kartenstatus"
                }
            },
            "date": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "Date DD.MM.YY",
                    "de": "Datum DD.MM.YY",
                    "de-ch": "Datum DD.MM.YY"
                },
                "description": {
                    "en": "Date DD.MM.YY",
                    "de": "Datum DD.MM.YY",
                    "de-ch": "Datum DD.MM.YY"
                }
            },
            "invoiceDate": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Invoice date",
                    "de": "Rechnungsdatum",
                    "de-ch": "Rechnungsdatum"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Rechnungsdatum",
                    "de-ch": "Rechnungsdatum"
                }
            },
            "invoiceBilledDate": {
                "type": "Date",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Invoice billing date",
                    "de": "Rechnung Abgerechnet am",
                    "de-ch": "Rechnung Abgerechnet am"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Rechnung Abgerechnet am",
                    "de-ch": "Rechnung Abgerechnet am"
                }
            },
            "eventMessage": {
                "schema": "activity",
                "path": "eventMessage",
                "insight2": true,
                "label": {
                    "en": "Event message",
                    "de": "Ereignis Nachricht",
                    "de-ch": "Ereignis Nachricht"
                }
            },
            "eventDate": {
                "schema": "activity",
                "path": "eventDate",
                "insight2": true,
                "label": {
                    "en": "Event date",
                    "de": "Ereignis Datum",
                    "de-ch": "Ereignis Datum"
                }
            },
            "timestampBFB": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Date BFB",
                    "de": "Datum BFB",
                    "de-ch": "Datum BFB"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Datum im BFB Format (DD.MM.YY)",
                    "de-ch": "Datum im BFB Format (DD.MM.YY)"
                }
            },
            "status": {
                "schema": "activity",
                "path": "status",
                "insight2": true,
                "label": {
                    "en": "Status",
                    "de": "Status",
                    "de-ch": "Status"
                }
            },
            "dobSmaller": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Birthdate KBV",
                    "de": "Geburtsdatum KBV",
                    "de-ch": "Geburtsdatum KBV"
                },
                "description": {
                    "en": "Date of birth, compliant to KBV",
                    "de": "Geburtsdatum KBV konform",
                    "de-ch": "Geburtsdatum KBV konform"
                }
            },
            "dobSmallerWithoutPoints": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Birthdate KBV short",
                    "de": "Geburtsdatum KBV kurz",
                    "de-ch": "Geburtsdatum KBV kurz"
                },
                "description": {
                    "en": "Date of Birth without points, compliant to KVB (DDMMYY)",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "dd": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "B.Day",
                    "de": "Geb. Tag",
                    "de-ch": "Geb. Tag"
                },
                "description": {
                    "en": "Day of the birth (DD)",
                    "de": "Tag des Geburtsdatum (DD)",
                    "de-ch": "Tag des Geburtsdatum (DD)"
                }
            },
            "mm": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "B.Month",
                    "de": "Geb. Monat",
                    "de-ch": "Geb. Monat"
                },
                "description": {
                    "en": "Birth Month (MM)",
                    "de": "Geburtsmonat (MM)",
                    "de-ch": "Geburtsmonat (MM)"
                }
            },
            "yy": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "B.Year YY",
                    "de": "Geb. Jahr YY",
                    "de-ch": "Geb. Jahr YY"
                },
                "description": {
                    "en": "Birth Year (YY)",
                    "de": "Geburtsjahr kurz (YY)",
                    "de-ch": "Geburtsjahr kurz (YY)"
                }
            },
            "yyyy": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "B.Year YYYY",
                    "de": "Geb. Jahr YYYY",
                    "de-ch": "Geb. Jahr YYYY"
                },
                "description": {
                    "en": "Birth year (YYYY)",
                    "de": "Geburtsjahr lang (YYYY)",
                    "de-ch": "Geburtsjahr lang (YYYY)"
                }
            },
            "editDate": {
                "type": "Date",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Date edited",
                    "de": "Zuletzt geändert am",
                    "de-ch": "Zuletzt geändert am"
                },
                "description": {
                    "en": "Date of last edit on patient's data",
                    "de": "letztes Änderungsdatum",
                    "de-ch": "letztes Änderungsdatum"
                }
            },
            "currentDate": {
                "type": "Date",
                "insight2": true,
                "model": "activity",
                "insuite_t": true,
                "label": {
                    "en": "Today's Date",
                    "de": "Heutiges Datum",
                    "de-ch": "Heutiges Datum"
                },
                "description": {
                    "en": "Today's Date",
                    "de": "aktuelles Datum",
                    "de-ch": "aktuelles Datum"
                }
            },
            "from": {
                "type": "String",
                "insight2": false,
                "insuite_t": true,
                "label": {
                    "en": "From Date",
                    "de": "Abrechnungszeitraum von",
                    "de-ch": "Abrechnungszeitraum von"
                },
                "description": {
                    "en": "From Date",
                    "de": "Beginn Abrechnungszeitraum",
                    "de-ch": "Beginn Abrechnungszeitraum"
                }
            },
            "to": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "insuite_t": true,
                "label": {
                    "en": "To Date",
                    "de": "Abrechnungszeitraum bis",
                    "de-ch": "Abrechnungszeitraum bis"
                },
                "description": {
                    "en": "o DateT",
                    "de": "Ende Abrechnungszeitraum",
                    "de-ch": "Ende Abrechnungszeitraum"
                }
            },
            "displayname": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Patient name",
                    "de": "Patienten Name",
                    "de-ch": "Patienten Name"
                },
                "description": {
                    "en": "Patient name",
                    "de": "Name des Patienten",
                    "de-ch": "Name des Patienten"
                }
            },
            "talk": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Mr./Ms./...",
                    "de": "Anrede",
                    "de-ch": "Anrede"
                },
                "description": {
                    "en": "Salutation",
                    "de": "Anrede",
                    "de-ch": "Anrede"
                }
            },
            "title": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Title",
                    "de": "Titel",
                    "de-ch": "Titel"
                },
                "description": {
                    "en": "Title",
                    "de": "Titel",
                    "de-ch": "Titel"
                }
            },
            "patientName": {
                "type": "String",
                "model": "patient",
                "linkType": "patientDetails",
                "insight2": true,
                "inpacs": true,
                "label": {
                    "en": "Patient Name",
                    "de": "Patientennamen",
                    "de-ch": "Patientennamen"
                },
                "description": {
                    "en": "Patient Name",
                    "de": "Name des Patienten",
                    "de-ch": "Name des Patienten"
                },
                "searchAsArrayOfValues": true
            },
            "bankName": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Bank Name",
                    "de": "Bankinstitut",
                    "de-ch": "Bankinstitut"
                },
                "description": {
                    "en": "Bank Name",
                    "de": "Name der Bank",
                    "de-ch": "Name der Bank"
                }
            },
            "bankIBAN": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Bank IBAN",
                    "de": "Kontonummer / IBAN",
                    "de-ch": "Kontonummer / IBAN"
                },
                "description": {
                    "en": "Bank IBAN",
                    "de": "IBAN",
                    "de-ch": "IBAN"
                }
            },
            "bankBIC": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Bank BIC",
                    "de": "Bankleitzahl / BIC",
                    "de-ch": "Bankleitzahl / BIC"
                },
                "description": {
                    "en": "Bank BIC",
                    "de": "BIC",
                    "de-ch": "BIC"
                }
            },
            "accountOwner": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Account owner",
                    "de": "Kontoinhaber",
                    "de-ch": "Kontoinhaber"
                },
                "description": {
                    "en": "Owner of the Bank account",
                    "de": "Kontoinhaber",
                    "de-ch": "Kontoinhaber"
                }
            },
            "address": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Client address",
                    "de": "Patienten Adresse",
                    "de-ch": "Patienten Adresse"
                },
                "description": {
                    "en": "Patient's address",
                    "de": "Adresse des Patienten",
                    "de-ch": "Adresse des Patienten"
                }
            },
            "billingAddressAndType": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Billing address",
                    "de": "Rechnungsadresse",
                    "de-ch": "Rechnungsadresse"
                },
                "description": {
                    "en": "Billing address",
                    "de": "Rechnungsadresse",
                    "de-ch": "Rechnungsadresse"
                }
            },
            "billingAddressType": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Billingd address type",
                    "de": "Rechnungsadresse Typ",
                    "de-ch": "Rechnungsadresse Typ"
                },
                "description": {
                    "en": "Billingd address type",
                    "de": "Rechnungsadresse Typ",
                    "de-ch": "Rechnungsadresse Typ"
                }
            },
            "receiver": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Receiver",
                    "de": "Empfänger",
                    "de-ch": "Empfänger"
                },
                "description": {
                    "en": "Receiver of the Invoice.",
                    "de": "Adresse des Empfängers",
                    "de-ch": "Adresse des Empfängers"
                }
            },
            "street": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Street",
                    "de": "Strasse",
                    "de-ch": "Strasse"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Straße",
                    "de-ch": "Strasse"
                }
            },
            "houseno": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "House No.",
                    "de": "Hausnummer",
                    "de-ch": "Hausnummer"
                },
                "description": {
                    "en": "House number",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "zip": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Post Code",
                    "de": "PLZ",
                    "de-ch": "PLZ"
                },
                "description": {
                    "en": "Zip code",
                    "de": "Postleitzahl",
                    "de-ch": "Postleitzahl"
                }
            },
            "city": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "City",
                    "de": "Stadt",
                    "de-ch": "Stadt"
                },
                "description": {
                    "en": "City",
                    "de": "Stadt",
                    "de-ch": "Stadt"
                }
            },
            "postbox": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "PO Box",
                    "de": "Postfach",
                    "de-ch": "Postfach"
                },
                "description": {
                    "en": "P.O. Box",
                    "de": "Postfach",
                    "de-ch": "Postfach"
                }
            },
            "addon": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Additional address field",
                    "de": "Anschriftenzusatz",
                    "de-ch": "Anschriftenzusatz"
                },
                "description": {
                    "en": "Additional address field",
                    "de": "Anschriftenzusatz",
                    "de-ch": "Anschriftenzusatz"
                }
            },
            "country": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Country",
                    "de": "Land",
                    "de-ch": "Land"
                },
                "description": {
                    "en": "Country",
                    "de": "Land",
                    "de-ch": "Land"
                }
            },
            "countryCode": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Country Code",
                    "de": "Ländercode",
                    "de-ch": "Ländercode"
                },
                "description": {
                    "en": "Country Code",
                    "de": "Länder Code",
                    "de-ch": "Länder Code"
                }
            },
            "editorName": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Editor",
                    "de": "Nutzer",
                    "de-ch": "Nutzer"
                },
                "description": {
                    "en": "Last user to edit this activity",
                    "de": "Nutzer",
                    "de-ch": "Nutzer"
                }
            },
            "editorInitials": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Last Editor Initials",
                    "de": "Nutzer Kurzname",
                    "de-ch": "Nutzer Kurzname"
                },
                "description": {
                    "en": "Initials of last user to edit this activity",
                    "de": "Nutzer Initialen",
                    "de-ch": "Nutzer Initialen"
                }
            },
            "patientAdditionalNumbers": {
                "type": "String",
                "model": "patient",
                "insight2": true,
                "label": {
                    "en": "Partner patient ID numbers",
                    "de": "weitere Nummern",
                    "de-ch": "weitere Nummern"
                },
                "description": {
                    "en": "Partner patient ID numbers",
                    "de": "weitere Nummern",
                    "de-ch": "weitere Nummern"
                }
            },
            "items": {
                "type": "InvoiceItem_T",
                "insight2": false,
                "label": {
                    "en": "Items (collapsed, oldest first)",
                    "de": "Items (kompakt, aufsteigend)",
                    "de-ch": "Items (kompakt, aufsteigend)"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Behandlungen",
                    "de-ch": "Behandlungen"
                }
            },
            "itemsDesc": {
                "type": "InvoiceItem_T",
                "insight2": false,
                "label": {
                    "en": "Items (collapsed, newest first)",
                    "de": "Items (kompakt, absteigend)",
                    "de-ch": "Items (kompakt, absteigend)"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Behandlungen",
                    "de-ch": "Behandlungen"
                }
            },
            "itemsAll": {
                "type": "InvoiceItem_T",
                "insight2": false,
                "label": {
                    "en": "Items (all, oldest first)",
                    "de": "Items (voll, aufsteigend)",
                    "de-ch": "Items (voll, aufsteigend)"
                }
            },
            "itemsAllDesc": {
                "type": "InvoiceItem_T",
                "insight2": false,
                "label": {
                    "en": "Items (all, newset first)",
                    "de": "Items (voll, absteigend)",
                    "de-ch": "Items (voll, absteigend)"
                }
            },
            "itemsAPKCode": {
                "type": "InvoiceItem_T",
                "insight2": false,
                "label": {
                    "en": "Items (APK-Code, oldest first)",
                    "de": "Items (APK-Code, aufsteigend)",
                    "de-ch": "Items (APK-Code, aufsteigend)"
                }
            },
            "itemsAPKCodeDesc": {
                "type": "InvoiceItem_T",
                "insight2": false,
                "label": {
                    "en": "Items (APK-Code, newest first)",
                    "de": "Items (APK-Code, absteigend)",
                    "de-ch": "Items (APK-Code, absteigend)"
                }
            },
            "itemsCode": {
                "type": "InvoiceItem_T",
                "insight2": false,
                "label": {
                    "en": "Items (Code)",
                    "de": "Items (Code)",
                    "de-ch": "Items (Code)"
                }
            },
            "currency": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Currency",
                    "de": "Währung",
                    "de-ch": "Währung"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Währung",
                    "de-ch": "Währung"
                }
            },
            "beforetax": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total before tax",
                    "de": "Summe vor USt",
                    "de-ch": "Summe vor USt"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Summe vor USt",
                    "de-ch": "Summe vor USt"
                }
            },
            "beforetaxPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total before tax (plain)",
                    "de": "Summe vor USt (ohne Währung)",
                    "de-ch": "Summe vor USt (ohne Währung)"
                },
                "description": {
                    "en": "Total before tax (plain)",
                    "de": "Summe vor USt (ohne Währung)",
                    "de-ch": "Summe vor USt (ohne Währung)"
                }
            },
            "vat": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "VAT",
                    "de": "USt",
                    "de-ch": "USt"
                },
                "description": {
                    "en": "VAT",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "vatPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "VAT (plain)",
                    "de": "USt (ohne Währung)",
                    "de-ch": "USt (ohne Währung)"
                },
                "description": {
                    "en": "VAT (plain)",
                    "de": "USt (ohne Währung)",
                    "de-ch": "USt (ohne Währung)"
                }
            },
            "vatList": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "VAT Summary",
                    "de": "USt Liste",
                    "de-ch": "USt Liste"
                },
                "description": {
                    "en": "VAT List",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "total": {
                "type": "Number",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total",
                    "de": "Gesamtsumme",
                    "de-ch": "Gesamtsumme"
                },
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Total",
                    "de": "Gesamtsumme",
                    "de-ch": "Gesamtsumme"
                }
            },
            "totalPlain": {
                "type": "Number",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total (plain)",
                    "de": "Gesamtsumme (ohne Währung)",
                    "de-ch": "Gesamtsumme (ohne Währung)"
                },
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Total (plain)",
                    "de": "Gesamtsumme (ohne Währung)",
                    "de-ch": "Gesamtsumme (ohne Währung)"
                }
            },
            "totalReceipts": {
                "schema": "activity",
                "path": "totalReceipts",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Amount paid",
                    "de": "Summe gezahlt",
                    "de-ch": "Summe gezahlt"
                },
                "type": "Number",
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Amount paid",
                    "de": "Summe gezahlt",
                    "de-ch": "Summe gezahlt"
                }
            },
            "totalReceiptsPlain": {
                "schema": "activity",
                "path": "totalReceipts",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Amount paid (plain)",
                    "de": "Summe gezahlt (ohne Währung)",
                    "de-ch": "Summe gezahlt (ohne Währung)"
                },
                "type": "Number",
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Amount paid (plain)",
                    "de": "Summe gezahlt (ohne Währung)",
                    "de-ch": "Summe gezahlt (ohne Währung)"
                }
            },
            "totalPenalties": {
                "schema": "activity",
                "path": "totalPenalties",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Amount paid",
                    "de": "Summe gezahlt",
                    "de-ch": "Summe gezahlt"
                },
                "type": "Number",
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Total late fees",
                    "de": "Summe Mahnkosten",
                    "de-ch": "Summe Mahnkosten"
                }
            },
            "totalPenaltiesPlain": {
                "schema": "activity",
                "path": "totalPenalties",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total penalties (plain)",
                    "de": "Summe Mahnkosten (ohne Währung)",
                    "de-ch": "Summe Mahnkosten (ohne Währung)"
                },
                "type": "Number",
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Total penalties (plain)",
                    "de": "Summe Mahnkosten (ohne Währung)",
                    "de-ch": "Summe Mahnkosten (ohne Währung)"
                }
            },
            "totalReceiptsOutstanding": {
                "schema": "activity",
                "path": "totalReceiptsOutstanding",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Receipts outstanding",
                    "de": "Restbetrag (ausstehende Quittungen)",
                    "de-ch": "Restbetrag (ausstehende Quittungen)"
                },
                "type": "Number",
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Total less receipts",
                    "de": "Summe minus Einnahmen",
                    "de-ch": "Summe minus Einnahmen"
                }
            },
            "totalReceiptsOutstandingPlain": {
                "schema": "activity",
                "path": "totalReceiptsOutstanding",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Receipts outstanding (plain)",
                    "de": "Restbetrag (ausstehende Quittungen, ohne Währung)",
                    "de-ch": "Restbetrag (ausstehende Quittungen, ohne Währung)"
                },
                "type": "Number",
                "rendererName": "currencyFormat",
                "description": {
                    "en": "Total less receipts (plain)",
                    "de": "Summe minus Einnahmen (ohne Währung)",
                    "de-ch": "Summe minus Einnahmen (ohne Währung)"
                }
            },
            "totalOwing": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Amount owing",
                    "de": "Restbetrag",
                    "de-ch": "Restbetrag"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Restbetrag/geschuldeter Betrag",
                    "de-ch": "Restbetrag/geschuldeter Betrag"
                }
            },
            "totalOwingPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Amount owing (plain)",
                    "de": "Restbetrag (ohne Währung)",
                    "de-ch": "Restbetrag (ohne Währung)"
                },
                "description": {
                    "en": "Amount owing (plain)",
                    "de": "Restbetrag/geschuldeter Betrag (ohne Währung)",
                    "de-ch": "Restbetrag/geschuldeter Betrag (ohne Währung)"
                }
            },
            "total75": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "75% of Total",
                    "de": "75% der Gesamtsumme",
                    "de-ch": "75% der Gesamtsumme"
                },
                "description": {
                    "en": "MISSING",
                    "de": "75% der Gesamtsumme",
                    "de-ch": "75% der Gesamtsumme"
                }
            },
            "total25": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "25% of Total",
                    "de": "25% der Gesamtsumme",
                    "de-ch": "25% der Gesamtsumme"
                },
                "description": {
                    "en": "25% of Total",
                    "de": "25% der Gesamtsumme",
                    "de-ch": "25% der Gesamtsumme"
                }
            },
            "total25Plain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "25% of Total (plain)",
                    "de": "25% der Gesamtsumme (ohne Währung)",
                    "de-ch": "25% der Gesamtsumme (ohne Währung)"
                },
                "description": {
                    "en": "25% of Total (plain)",
                    "de": "25% der Gesamtsumme (ohne Währung)",
                    "de-ch": "25% der Gesamtsumme (ohne Währung)"
                }
            },
            "total15": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "15% of Total",
                    "de": "15% der Gesamtsumme",
                    "de-ch": "15% der Gesamtsumme"
                },
                "description": {
                    "en": "MISSING",
                    "de": "15% der Gesamtsumme",
                    "de-ch": "15% der Gesamtsumme"
                }
            },
            "total15Plain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "15% of Total (plain)",
                    "de": "15% der Gesamtsumme (ohne Währung)",
                    "de-ch": "15% der Gesamtsumme (ohne Währung)"
                },
                "description": {
                    "en": "15% of Total (plain)",
                    "de": "15% der Gesamtsumme (ohne Währung)",
                    "de-ch": "15% der Gesamtsumme (ohne Währung)"
                }
            },
            "totalDoc": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total for Doctor",
                    "de": "Summe Ärztliche Leistungen",
                    "de-ch": "Summe Ärztliche Leistungen"
                },
                "description": {
                    "en": "Total medical services/Treatments",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "totalDocPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total for Doctor (plain)",
                    "de": "Summe Ärztliche Leistungen (ohne Währung)",
                    "de-ch": "Summe Ärztliche Leistungen (ohne Währung)"
                },
                "description": {
                    "en": "Total medical services/Treatments",
                    "de": "MISSING",
                    "de-ch": "MISSING"
                }
            },
            "totalWithoutExpenses": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total w/o Expenses",
                    "de": "Summe ohne ASK",
                    "de-ch": "Summe ohne ASK"
                },
                "description": {
                    "en": "Total w/o Expenses",
                    "de": "Summe ohne ASK",
                    "de-ch": "Summe ohne ASK"
                }
            },
            "totalWithoutExpensesPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total w/o Expenses (plain)",
                    "de": "Summe ohne ASK (ohne Währung)",
                    "de-ch": "Summe ohne ASK (ohne Währung)"
                },
                "description": {
                    "en": "Total w/o Expenses (plain)",
                    "de": "Summe ohne ASK (ohne Währung)",
                    "de-ch": "Summe ohne ASK (ohne Währung)"
                }
            },
            "totalWithoutSundries": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total w/o Sundry expenses (Materials, postage, etc)",
                    "de": "Summe ohne Auslagen",
                    "de-ch": "Summe ohne Auslagen"
                },
                "description": {
                    "en": "Total w/o Expenses expenses (materials, postage, etc)",
                    "de": "Summe ohne Auslagen (Martialkosten, porto, etc)",
                    "de-ch": "Summe ohne Auslagen (Martialkosten, porto, etc)"
                }
            },
            "totalWithoutSundriesPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total w/o Sundry expenses (Materials, postage, etc - plain)",
                    "de": "Summe ohne Auslagen (ohne Währung)",
                    "de-ch": "Summe ohne Auslagen (ohne Währung)"
                },
                "description": {
                    "en": "Total w/o Expenses expenses (materials, postage, etc - plain)",
                    "de": "Summe ohne Auslagen (Martialkosten, porto, etc - ohne Währung)",
                    "de-ch": "Summe ohne Auslagen (Martialkosten, porto, etc - ohne Währung)"
                }
            },
            "totalExpense": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total for Expenses",
                    "de": "Summe Auslagen",
                    "de-ch": "Summe Auslagen"
                },
                "description": {
                    "en": "Total for Expenses",
                    "de": "Summe Auslagen",
                    "de-ch": "Summe Auslagen"
                }
            },
            "totalExpensePlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total for Expenses (plain)",
                    "de": "Summe Auslagen (ohne Währung)",
                    "de-ch": "Summe Auslagen (ohne Währung)"
                },
                "description": {
                    "en": "Total for Expenses (plain)",
                    "de": "Summe Auslagen (ohne Währung)",
                    "de-ch": "Summe Auslagen (ohne Währung)"
                }
            },
            "totalASK": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total extra general costs",
                    "de": "Summe allgemeine Sachkosten",
                    "de-ch": "Summe allgemeine Sachkosten"
                },
                "description": {
                    "en": "Total general material costs",
                    "de": "Summe allgemeine Sachkosten",
                    "de-ch": "Summe allgemeine Sachkosten"
                }
            },
            "totalASKPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total extra general costs (plain)",
                    "de": "Summe allgemeine Sachkosten (ohne Währung)",
                    "de-ch": "Summe allgemeine Sachkosten (ohne Währung)"
                },
                "description": {
                    "en": "Total general material costs (plain)",
                    "de": "Summe allgemeine Sachkosten (ohne Währung)",
                    "de-ch": "Summe allgemeine Sachkosten (ohne Währung)"
                }
            },
            "totalBSK": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total extra specific costs",
                    "de": "Summe besondere Sachkosten",
                    "de-ch": "Summe besondere Sachkosten"
                },
                "description": {
                    "en": "Total extra specific costs",
                    "de": "Summe besondere Sachkosten",
                    "de-ch": "Summe besondere Sachkosten"
                }
            },
            "totalBSKPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total extra specific costs (plain)",
                    "de": "Summe besondere Sachkosten (ohne Währung)",
                    "de-ch": "Summe besondere Sachkosten (ohne Währung)"
                },
                "description": {
                    "en": "Total extra specific costs (plain)",
                    "de": "Summe besondere Sachkosten (ohne Währung)",
                    "de-ch": "Summe besondere Sachkosten (ohne Währung)"
                }
            },
            "totalAHB": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total general medical costs",
                    "de": "Summe allgemeine Heilbehandlung",
                    "de-ch": "Summe allgemeine Heilbehandlung"
                },
                "description": {
                    "en": "MISSING",
                    "de": "Summe allgemeine Heilbehandlung",
                    "de-ch": "Summe allgemeine Heilbehandlung"
                }
            },
            "totalAHBPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total general medical costs (plain)",
                    "de": "Summe allgemeine Heilbehandlung (ohne Währung)",
                    "de-ch": "Summe allgemeine Heilbehandlung (ohne Währung)"
                },
                "description": {
                    "en": "Total general medical costs (plain)",
                    "de": "Summe allgemeine Heilbehandlung (ohne Währung)",
                    "de-ch": "Summe allgemeine Heilbehandlung (ohne Währung)"
                }
            },
            "totalBHB": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total specific medical costs",
                    "de": "Summe besondere Heilbehandlung",
                    "de-ch": "Summe besondere Heilbehandlung"
                }
            },
            "totalBHBPlain": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total specific medical costs (plain)",
                    "de": "Summe besondere Heilbehandlung (ohne Währung)",
                    "de-ch": "Summe besondere Heilbehandlung (ohne Währung)"
                }
            },
            "totalMaterialCosts": {
                "type": "Number",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total material costs of treatment",
                    "de": "Sachkosten Betrag (Leistung)",
                    "de-ch": "Sachkosten (Leistung)"
                },
                "rendererName": "currencyFormat"
            },
            "materialCostDescription": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Additional material for treatment",
                    "de": "Sachkosten Bezeichnungen (Leistung)",
                    "de-ch": "Sachkosten Bezeichnungen (Leistung)"
                }
            },
            "patient": {
                "type": "Patient_T",
                "insight2": false,
                "label": {
                    "en": "Patient (obj)",
                    "de": "Personalienfeld",
                    "de-ch": "Personalienfeld"
                }
            },
            "patient2": {
                "type": "Personalienfeld_T",
                "insight2": false,
                "label": {
                    "en": "Patient (obj, postal address)",
                    "de": "Personalienfeld (Postanschrift)",
                    "de-ch": "Personalienfeld (Postanschrift)"
                }
            },
            "barcode1a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 01a",
                    "de": "BFB barcode 01a",
                    "de-ch": "BFB barcode 01a"
                }
            },
            "barcode2a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 02a",
                    "de": "BFB barcode 02a",
                    "de-ch": "BFB barcode 02a"
                }
            },
            "barcode2b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 02b",
                    "de": "BFB barcode 02b",
                    "de-ch": "BFB barcode 02b"
                }
            },
            "barcode3a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 03a",
                    "de": "BFB barcode 03a",
                    "de-ch": "BFB barcode 03a"
                }
            },
            "barcode4": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 04",
                    "de": "BFB barcode 04",
                    "de-ch": "BFB barcode 04"
                }
            },
            "barcode6": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 06",
                    "de": "BFB barcode 06",
                    "de-ch": "BFB barcode 06"
                }
            },
            "barcode8": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 08",
                    "de": "BFB barcode 08",
                    "de-ch": "BFB barcode 08"
                }
            },
            "barcode8a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 08A",
                    "de": "BFB barcode 08A",
                    "de-ch": "BFB barcode 08A"
                }
            },
            "barcode9": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 09",
                    "de": "BFB barcode 09",
                    "de-ch": "BFB barcode 09"
                }
            },
            "barcode10": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 10",
                    "de": "BFB barcode 10",
                    "de-ch": "BFB barcode 10"
                }
            },
            "barcode10L": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 10L",
                    "de": "BFB barcode 10L",
                    "de-ch": "BFB barcode 10L"
                }
            },
            "barcode10A": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 10A",
                    "de": "BFB barcode 10A",
                    "de-ch": "BFB barcode 10A"
                }
            },
            "barcode10Ca": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 10Ca",
                    "de": "BFB barcode 10Ca",
                    "de-ch": "BFB barcode 10Ca"
                }
            },
            "barcodeOEGD": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode OEGD",
                    "de": "BFB barcode OEGD",
                    "de-ch": "BFB barcode OEGD"
                }
            },
            "barcode12a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 12a",
                    "de": "BFB barcode 12a",
                    "de-ch": "BFB barcode 12a"
                }
            },
            "barcode12b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 12b",
                    "de": "BFB barcode 12b",
                    "de-ch": "BFB barcode 12b"
                }
            },
            "barcode11": {
                "type": "String",
                "label": {
                    "en": "BFB barcode 11",
                    "de": "BFB barcode 11",
                    "de-ch": "BFB barcode 11"
                }
            },
            "barcode12c": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 12c",
                    "de": "BFB barcode 12c",
                    "de-ch": "BFB barcode 12c"
                }
            },
            "barcode13": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 13",
                    "de": "BFB barcode 13",
                    "de-ch": "BFB barcode 13"
                }
            },
            "barcode13_2": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 13 >= Q4 2020 Heilmittel 2.0",
                    "de": "BFB barcode 13 >= Q4 2020 Heilmittel 2.0",
                    "de-ch": "BFB barcode 13 >= Q4 2020 Heilmittel 2.0"
                }
            },
            "barcode14": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "barcode 14",
                    "de": "barcode 14",
                    "de-ch": "barcode 14"
                }
            },
            "barcode15_1": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 15_1",
                    "de": "BFB barcode 15_1",
                    "de-ch": "BFB barcode 15_1"
                }
            },
            "barcode18": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 18",
                    "de": "BFB barcode 18",
                    "de-ch": "BFB barcode 18"
                }
            },
            "barcode19a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 19a",
                    "de": "BFB barcode 19a",
                    "de-ch": "BFB barcode 19a"
                }
            },
            "barcode19b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 19b",
                    "de": "BFB barcode 19b",
                    "de-ch": "BFB barcode 19b"
                }
            },
            "barcode20b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 20b",
                    "de": "BFB barcode 20b",
                    "de-ch": "BFB barcode 20b"
                }
            },
            "barcode20c": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 20c",
                    "de": "BFB barcode 20c",
                    "de-ch": "BFB barcode 20c"
                }
            },
            "barcode21": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 21",
                    "de": "BFB barcode 21",
                    "de-ch": "BFB barcode 21"
                }
            },
            "barcode25": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 25",
                    "de": "BFB barcode 25",
                    "de-ch": "BFB barcode 25"
                }
            },
            "barcode26a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 26a",
                    "de": "BFB barcode 26a",
                    "de-ch": "BFB barcode 26a"
                }
            },
            "barcode26b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 26b",
                    "de": "BFB barcode 26b",
                    "de-ch": "BFB barcode 26b"
                }
            },
            "barcode26c": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 26c",
                    "de": "BFB barcode 26c",
                    "de-ch": "BFB barcode 26c"
                }
            },
            "barcode27a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 27a",
                    "de": "BFB barcode 27a",
                    "de-ch": "BFB barcode 27a"
                }
            },
            "barcode27b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 27b",
                    "de": "BFB barcode 27b",
                    "de-ch": "BFB barcode 27b"
                }
            },
            "barcode27c": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 27c",
                    "de": "BFB barcode 27c",
                    "de-ch": "BFB barcode 27c"
                }
            },
            "barcode28a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 28a",
                    "de": "BFB barcode 28a",
                    "de-ch": "BFB barcode 28a"
                }
            },
            "barcode28b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 28b",
                    "de": "BFB barcode 28b",
                    "de-ch": "BFB barcode 28b"
                }
            },
            "barcode28c": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 28c",
                    "de": "BFB barcode 28c",
                    "de-ch": "BFB barcode 28c"
                }
            },
            "barcode36": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 36",
                    "de": "BFB barcode 36",
                    "de-ch": "BFB barcode 36"
                }
            },
            "barcode39a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 39a",
                    "de": "BFB barcode 39a",
                    "de-ch": "BFB barcode 39a"
                }
            },
            "barcode39b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 39b",
                    "de": "BFB barcode 39b",
                    "de-ch": "BFB barcode 39b"
                }
            },
            "barcode52_2": {
                "type": "String",
                "label": {
                    "en": "BFB barcode 52.2",
                    "de": "BFB barcode 52.2",
                    "de-ch": "BFB barcode 52.2"
                }
            },
            "barcode53": {
                "type": "String",
                "label": {
                    "en": "BFB barcode 53",
                    "de": "BFB barcode 53",
                    "de-ch": "BFB barcode 53"
                }
            },
            "barcode30": {
                "type": "String",
                "label": {
                    "en": "BFB barcode 30",
                    "de": "BFB barcode 30",
                    "de-ch": "BFB barcode 30"
                }
            },
            "barcode55": {
                "type": "String",
                "label": {
                    "en": "BFB barcode 55",
                    "de": "BFB barcode 55",
                    "de-ch": "BFB barcode 55"
                }
            },
            "barcode56_2": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 56.2",
                    "de": "BFB barcode 56.2",
                    "de-ch": "BFB barcode 56.2"
                }
            },
            "barcode61Ab": {
                "type": "String",
                "label": {
                    "en": "BFB barcode 61Ab",
                    "de": "BFB barcode 61Ab",
                    "de-ch": "BFB barcode 61Ab"
                }
            },
            "barcode61Da": {
                "type": "String",
                "label": {
                    "en": "BFB barcode 61Da",
                    "de": "BFB barcode 61Da",
                    "de-ch": "BFB barcode 61Da"
                }
            },
            "barcode63a": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 63a",
                    "de": "BFB barcode 63a",
                    "de-ch": "BFB barcode 63a"
                }
            },
            "barcode63b": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 63b",
                    "de": "BFB barcode 63b",
                    "de-ch": "BFB barcode 63b"
                }
            },
            "barcode63c": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 63c",
                    "de": "BFB barcode 63c",
                    "de-ch": "BFB barcode 63c"
                }
            },
            "barcode63d": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 63d",
                    "de": "BFB barcode 63d",
                    "de-ch": "BFB barcode 63d"
                }
            },
            "barcode64": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 64",
                    "de": "BFB barcode 64",
                    "de-ch": "BFB barcode 64"
                }
            },
            "barcode65": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB barcode 65",
                    "de": "BFB barcode 65",
                    "de-ch": "BFB barcode 65"
                }
            },
            "documentMetaDataQrCode": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Document Metadata QR Code",
                    "de": "Dokumenten Metadaten QR-Code",
                    "de-ch": "Dokumenten Metadaten QR-Code"
                }
            },
            "certNumber": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB Certificate Number",
                    "de": "BFB Zertifikat-Nummer",
                    "de-ch": "BFB Zertifikat-Nummer"
                }
            },
            "actType": {
                "schema": "activity",
                "path": "actType",
                "required": true,
                "insight2": true,
                "label": {
                    "en": "Activity Type",
                    "de": "Aktivitätstyp",
                    "de-ch": "Aktivitätstyp"
                },
                "model": "activity",
                "type": "String"
            },
            "subType": {
                "schema": "activity",
                "path": "subType",
                "required": false,
                "insight2": true,
                "label": {
                    "en": "subType",
                    "de": "Subtyp",
                    "de-ch": "Subtyp"
                },
                "model": "activity",
                "type": "String",
                "searchAsArrayOfValues": true
            },
            "dateNormal": {
                "type": "Date",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Activity, Date normal",
                    "de": "Aktivität, Datum DD.MM.YYYY",
                    "de-ch": "Aktivität, Datum DD.MM.YYYY"
                }
            },
            "p2_840": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Standard KBV text",
                    "de": "P2-840 Feld",
                    "de-ch": "P2-840 Feld"
                }
            },
            "quarters": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Treatment period",
                    "de": "Behandlungszeitraum",
                    "de-ch": "Behandlungszeitraum"
                }
            },
            "sysPoints": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Practice point value",
                    "de": "Praxispunktwert",
                    "de-ch": "Praxispunktwert"
                }
            },
            "sysPointsCent": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Practice point value in cents",
                    "de": "Praxispunktwert cents",
                    "de-ch": "Praxispunktwert cents"
                }
            },
            "totalAdjusted": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Total paid out",
                    "de": "Gesamt-Erstattung",
                    "de-ch": "Gesamt-Erstattung"
                }
            },
            "gender": {
                "type": "String",
                "insight2": true,
                "inpacs": true,
                "model": "patient",
                "label": {
                    "en": "Gender",
                    "de": "Geschlecht",
                    "de-ch": "Geschlecht"
                }
            },
            "genderUpperCase": {
                "type": "String",
                "insight2": true,
                "inpacs": true,
                "model": "patient",
                "label": {
                    "en": "Gender (upper case)",
                    "de": "Geschlecht (großgeschrieben)",
                    "de-ch": "Geschlecht (grossgeschrieben)"
                }
            },
            "isMale": {
                "type": "Boolean",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "male",
                    "de": "männlich",
                    "de-ch": "männlich"
                }
            },
            "isFemale": {
                "type": "Boolean",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "female",
                    "de": "weiblich",
                    "de-ch": "weiblich"
                }
            },
            "isMaleM": {
                "type": "Boolean",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "male M",
                    "de": "männlich M",
                    "de-ch": "männlich M"
                }
            },
            "isFemaleW": {
                "type": "Boolean",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "female W",
                    "de": "weiblich W",
                    "de-ch": "weiblich W"
                }
            },
            "docBlock": {
                "type": "String",
                "insight2": false,
                "insuite_t": true,
                "label": {
                    "en": "Doctor's Stamp (old, deprecated)",
                    "de": "Arztstempel (alt)",
                    "de-ch": "Arztstempel (alt)"
                }
            },
            "arztstempel": {
                "type": "String",
                "insight2": false,
                "insuite_t": true,
                "label": {
                    "en": "Doctor's Stamp",
                    "de": "Arztstempel",
                    "de-ch": "Arztstempel"
                }
            },
            "bfbArztstempel": {
                "type": "String",
                "insight2": false,
                "insuite_t": true,
                "label": {
                    "en": "BFB Doctor's Stamp",
                    "de": "BFB Arztstempel",
                    "de-ch": "BFB Arztstempel"
                }
            },
            "commercialNo": {
                "type": "String",
                "insight2": true,
                "model": "location",
                "label": {
                    "en": "practice number",
                    "de": "Praxis BSNR",
                    "de-ch": "Praxis BSNR"
                },
                "searchAsArrayOfValues": true
            },
            "institutionCode": {
                "type": "String",
                "insight2": true,
                "model": "location",
                "label": {
                    "en": "Institution Code IKNR",
                    "de": "Praxis IKNR",
                    "de-ch": "Praxis IKNR"
                },
                "searchAsArrayOfValues": true
            },
            "locName": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "inpacs": true,
                "label": {
                    "en": "practice name",
                    "de": "Praxisname",
                    "de-ch": "Praxisname"
                },
                "searchAsArrayOfValues": true
            },
            "locPhone": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice phone",
                    "de": "Praxistelefon",
                    "de-ch": "Praxistelefon"
                }
            },
            "locFax": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice fax",
                    "de": "Praxisfax",
                    "de-ch": "Praxisfax"
                }
            },
            "locStreet": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice street",
                    "de": "Praxisstrasse",
                    "de-ch": "Praxisstrasse"
                }
            },
            "locHouseno": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice houseno",
                    "de": "Praxishausnummer",
                    "de-ch": "Praxishausnummer"
                }
            },
            "locZip": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice zip",
                    "de": "Praxis PLZ",
                    "de-ch": "Praxis PLZ"
                }
            },
            "locCity": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice city",
                    "de": "Praxisort",
                    "de-ch": "Praxisort"
                }
            },
            "locCountry": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice country",
                    "de": "Praxis Land",
                    "de-ch": "Praxis Land"
                }
            },
            "locCountryCode": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice country code",
                    "de": "Praxis Ländesvorwahl",
                    "de-ch": "Praxis Ländesvorwahl"
                }
            },
            "locEmail": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice email",
                    "de": "Praxis E-Mail",
                    "de-ch": "Praxis E-Mail"
                }
            },
            "locWWW": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice www",
                    "de": "Praxis www",
                    "de-ch": "Praxis www"
                }
            },
            "locBankName": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice bank name",
                    "de": "Praxis Bankinstitut",
                    "de-ch": "Praxis Bankinstitut"
                }
            },
            "locBankIBAN": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice IBAN",
                    "de": "Praxis IBAN",
                    "de-ch": "Praxis IBAN"
                }
            },
            "locBankBIC": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice BIC",
                    "de": "Praxis BIC",
                    "de-ch": "Praxis BIC"
                }
            },
            "locRegion": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "practice region",
                    "de": "Praxis Region",
                    "de-ch": "Praxis Region"
                }
            },
            "locKV": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "location KV number",
                    "de": "Praxis KV",
                    "de-ch": "Praxis KV"
                }
            },
            "locDepartment": {
                "required": true,
                "type": "String",
                "insight2": true,
                "model": "location",
                "insuite_t": true,
                "label": {
                    "en": "ward",
                    "de": "Praxis Abteilung",
                    "de-ch": "Praxis Abteilung"
                }
            },
            "employeeTalk": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee Talk",
                    "de": "Arzt Ansprache",
                    "de-ch": "Arzt Ansprache"
                }
            },
            "employeeTitle": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "inpacs": true,
                "label": {
                    "en": "employee Title",
                    "de": "Arzt Titel",
                    "de-ch": "Arzt Titel"
                },
                "searchAsArrayOfValues": true
            },
            "employeeFirstname": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee Firstname",
                    "de": "Arzt Vorname",
                    "de-ch": "Arzt Vorname"
                }
            },
            "employeeNameaffix": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee Name affix",
                    "de": "Arzt Namenszusatz",
                    "de-ch": "Arzt Namenszusatz"
                }
            },
            "employeeId": {
                "type": "String",
                "inpacs": true,
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Employee ID",
                    "de": "Mitarbeiter ID",
                    "de-ch": "Mitarbeiter ID"
                }
            },
            "employeeName": {
                "type": "String",
                "inpacs": true,
                "model": "employee",
                "label": {
                    "en": "Name",
                    "de": "Name",
                    "de-ch": "Name"
                }
            },
            "employeeLastname": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee Lastname",
                    "de": "Arzt Nachname",
                    "de-ch": "Arzt Nachname"
                }
            },
            "employeeOfficialNo": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee Official No",
                    "de": "LANR",
                    "de-ch": "LANR"
                }
            },
            "employeeType": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee type",
                    "de": "Mitarbeiter Typ",
                    "de-ch": "Mitarbeiter Typ"
                }
            },
            "employeeTypeTranslated": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee type (translated)",
                    "de": "Mitarbeiter Typ (übersetzt)",
                    "de-ch": "Mitarbeiter Typ (übersetzt)"
                }
            },
            "employeeDepartment": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee Department",
                    "de": "Arzt Abteilung",
                    "de-ch": "Arzt Abteilung"
                }
            },
            "employeeNo": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employeeNo",
                    "de": "Arzt Interne Nummer",
                    "de-ch": "Arzt Interne Nummer"
                }
            },
            "employeeWorkDescription": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "label": {
                    "en": "employee Work Description",
                    "de": "Arzt Jobbezeichnung",
                    "de-ch": "Arzt Jobbezeichnung"
                }
            },
            "employeeSpecialities": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee specialities (codes)",
                    "de": "Sonstige (BTM)",
                    "de-ch": "Sonstige (BTM)"
                }
            },
            "employeeSpecialitiesText": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee specialities (text)",
                    "de": "Sonstige (BTM) Texte",
                    "de-ch": "Sonstige (BTM) Texte"
                }
            },
            "employeePhysicianIknr": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee IKNR",
                    "de": "Arzt IKNR",
                    "de-ch": "Arzt IKNR"
                }
            },
            "employeePhysicianType": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "employee type",
                    "de": "Arzt Typ",
                    "de-ch": "Arzt Typ"
                }
            },
            "employeeGlnNumber": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "Employee GLN",
                    "de": "Mitarbeiter GLN",
                    "de-ch": "Mitarbeiter GLN"
                }
            },
            "employeeZsrNumber": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "ZSR Number",
                    "de": "ZSR Nummer",
                    "de-ch": "ZSR Nummer"
                }
            },
            "employeeKNumber": {
                "type": "String",
                "insight2": true,
                "model": "employee",
                "insuite_t": true,
                "label": {
                    "en": "K-Number",
                    "de": "K-Nummer",
                    "de-ch": "K-Nummer"
                }
            },
            "specialisationText": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "specialisation Text",
                    "de": "Bezeichnung Arztstempel",
                    "de-ch": "Bezeichnung Arztstempel"
                }
            },
            "physicianName": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr.",
                    "de": "Zuweisername",
                    "de-ch": "Zuweisername"
                }
            },
            "physicianNameTemplate": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr. Template",
                    "de": "Zuweisername Briefvorlage",
                    "de-ch": "Zuweisername Briefvorlage"
                }
            },
            "physicianSurnameTemplate": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr. Template (surname only)",
                    "de": "Zuweisername Briefvorlage (Nachname)",
                    "de-ch": "Zuweisername Briefvorlage (Nachname)"
                }
            },
            "selectedContactAddress": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Address of selected contact",
                    "de": "Adresse des ausgewählten Kontakts",
                    "de-ch": "Adresse des ausgewählten Kontakts"
                }
            },
            "selectedContactNameTemplate": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Name of selected contact",
                    "de": "Name des ausgewählten Kontakts",
                    "de-ch": "Name des ausgewählten Kontakts"
                }
            },
            "selectedContactSurnameTemplate": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Name of selected contact (surname only)",
                    "de": "Name des ausgewählten Kontakts (Nachname)",
                    "de-ch": "Name des ausgewählten Kontakts (Nachname)"
                }
            },
            "selectedContactGLN": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "GLN of selected contact",
                    "de": "GLN des ausgewählten Kontakts",
                    "de-ch": "GLN des ausgewählten Kontakts"
                }
            },
            "selectedContactFirstName": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "First name of selected contact",
                    "de": "Vorname des ausgewählten Kontakt",
                    "de-ch": "Vorname des ausgewählten Kontakt"
                }
            },
            "selectedContactLastName": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Surname of selected contact",
                    "de": "Nachname des ausgewählten Kontakt",
                    "de-ch": "Nachname des ausgewählten Kontakt"
                }
            },
            "selectedContactSalutation": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Salutation for selected contact",
                    "de": "Anrede des ausgewählten Kontakt",
                    "de-ch": "Anrede des ausgewählten Kontakt"
                }
            },
            "selectedContactTitle": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Title of selected contact",
                    "de": "Titel des ausgewählten Kontakt",
                    "de-ch": "Titel des ausgewählten Kontakt"
                }
            },
            "selectedContactStreet": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Street of ",
                    "de": "Straße des ausgewählten Kontakts",
                    "de-ch": "Strasse des ausgewählten Kontakts"
                }
            },
            "selectedContactHouseNo": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "House number of selected street",
                    "de": "Hausnummer des ausgewählten Kontakts",
                    "de-ch": "Hausnummer des ausgewählten Kontakts"
                }
            },
            "selectedContactPostBox": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "PO box number of selected street",
                    "de": "Postfach des ausgewählten Kontakts",
                    "de-ch": "Postfach des ausgewählten Kontakts"
                }
            },
            "selectedContactCity": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "City of selected contact address",
                    "de": "Stadt des ausgewählten Kontakts",
                    "de-ch": "Stadt des ausgewählten Kontakts"
                }
            },
            "selectedContactZip": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Post code of selected address",
                    "de": "Postleitzahl des ausgewählten Kontakts",
                    "de-ch": "Postleitzahl des ausgewählten Kontakts"
                }
            },
            "selectedContactCountry": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Country name of selected address",
                    "de": "Land des ausgewählten Kontakts",
                    "de-ch": "Land des ausgewählten Kontakts"
                }
            },
            "selectedContactAddOn": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Additional line of selected contact address",
                    "de": "Anschriftenzusatz des ausgewählten Kontakts",
                    "de-ch": "Anschriftenzusatz des ausgewählten Kontakts"
                }
            },
            "referringDoctor": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr. from last schein",
                    "de": "Überweisername Briefvorlage aus dem letzten Schein",
                    "de-ch": "Überweisername Briefvorlage aus dem letzten Fall"
                }
            },
            "referringDoctorSurnameTemplate": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr. from last schein (surname)",
                    "de": "Überweisername Briefvorlage aus dem letzten Schein (surname)",
                    "de-ch": "Überweisername Briefvorlage aus dem letzten Fall (surname)"
                }
            },
            "referringDoctorAddress": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr. Address (from Schein)",
                    "de": "Zuweiseradresse (von Schein)",
                    "de-ch": "Zuweiseradresse (von Fall)"
                }
            },
            "physicianAddress": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr. Address",
                    "de": "Zuweiseradresse",
                    "de-ch": "Zuweiseradresse"
                }
            },
            "physicianExpertise": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Referrering Dr. Expertise",
                    "de": "Zuweiser Fachrichtung",
                    "de-ch": "Zuweiser Fachrichtung"
                }
            },
            "familyDoctorName": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Family Dr.",
                    "de": "Hausarztname",
                    "de-ch": "Hausarztname"
                }
            },
            "familyDoctorNameTemplate": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Family Dr. Template",
                    "de": "Hausarztname Briefvorlage",
                    "de-ch": "Hausarztname Briefvorlage"
                }
            },
            "familyDoctorSurnameTemplate": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Family Dr. Template (surname)",
                    "de": "Hausarztname Briefvorlage (Nachname)",
                    "de-ch": "Hausarztname Briefvorlage (Nachname)"
                }
            },
            "familyDoctorAddress": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Family Dr. Address",
                    "de": "Hausarztadresse",
                    "de-ch": "Hausarztadresse"
                }
            },
            "familyDoctorExpertise": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Family Dr. Expertise",
                    "de": "Hausarzt Fachrichtung",
                    "de-ch": "Hausarzt Fachrichtung"
                }
            },
            "institutionName": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Institution Name",
                    "de": "Einrichtungname",
                    "de-ch": "Einrichtungname"
                }
            },
            "institutionAddress": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Institution Address",
                    "de": "Einrichtungadresse",
                    "de-ch": "Einrichtungadresse"
                }
            },
            "institutionType": {
                "type": "String",
                "insight2": true,
                "model": "physician",
                "label": {
                    "en": "Institution Type",
                    "de": "Einrichtung Typ",
                    "de-ch": "Einrichtung Typ"
                }
            },
            "contactAddresses": {
                "type": "Array",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Contact addresses",
                    "de": "Weitere Addressen",
                    "de-ch": "Weitere Addressen"
                }
            },
            "contactAddressesName": {
                "type": "Array",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Contact Names and Addresses",
                    "de": "Kontakte Namen und Adressen",
                    "de-ch": "Kontakte Namen und Adressen"
                }
            },
            "orSphR": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orSphR",
                    "de": "orSphR",
                    "de-ch": "orSphR"
                }
            },
            "orCylR": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orCylR",
                    "de": "orCylR",
                    "de-ch": "orCylR"
                }
            },
            "orAxsR": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orAxsR",
                    "de": "orAxsR",
                    "de-ch": "orAxsR"
                }
            },
            "orAddR": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orAddR",
                    "de": "orAddR",
                    "de-ch": "orAddR"
                }
            },
            "orPsmR": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orPsmR",
                    "de": "orPsmR",
                    "de-ch": "orPsmR"
                }
            },
            "orBasR": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orBasR",
                    "de": "orBasR",
                    "de-ch": "orBasR"
                }
            },
            "orSphL": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orSphL",
                    "de": "orSphL",
                    "de-ch": "orSphL"
                }
            },
            "orCylL": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orCylL",
                    "de": "orCylL",
                    "de-ch": "orCylL"
                }
            },
            "orAxsL": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orAxsL",
                    "de": "orAxsL",
                    "de-ch": "orAxsL"
                }
            },
            "orAddL": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orAddL",
                    "de": "orAddL",
                    "de-ch": "orAddL"
                }
            },
            "orPsmL": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orPsmL",
                    "de": "orPsmL",
                    "de-ch": "orPsmL"
                }
            },
            "orBasL": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orBasL",
                    "de": "orBasL",
                    "de-ch": "orBasL"
                }
            },
            "orHSA": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "orHSA",
                    "de": "orHSA",
                    "de-ch": "orHSA"
                }
            },
            "refractionAll": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "All refraction",
                    "de": "Alle Refraktion",
                    "de-ch": "Alle Refraktion"
                }
            },
            "tonometryAll": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "All tonometry",
                    "de": "Alle Tonometrie",
                    "de-ch": "Alle Tonometrie"
                }
            },
            "scheinBillingFactorValue": {
                "type": "Number",
                "insight2": true,
                "model": "activity",
                "actTypes": ["PKVSCHEIN"],
                "schema": "activity",
                "label": {
                    "en": "billing factor value",
                    "de": "Schein Faktor",
                    "de-ch": "Fall Faktor"
                },
                "rendererName": "currencyFormat"
            },
            "reasonType": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Case, Treatment reason",
                    "de": "Fall, Behandlungsgrund",
                    "de-ch": "Fall, Behandlungsgrund"
                }
            },
            "dayOfAccident": {
                "type": "Date",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Case, day of accident",
                    "de": "Fall, Unfalldatum",
                    "de-ch": "Fall, Unfalldatum"
                }
            },
            "caseNumber": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Case, Casenumber",
                    "de": "Fall, Fallordner Nummer",
                    "de-ch": "Fall, Fallorder Nummer"
                }
            },
            "treatmentType": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Case, Treatment type",
                    "de": "Fall, Leistungstyp",
                    "de-ch": "Fall, Leistungstyp"
                }
            },
            "scheinNotes": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Fall, Notes, case",
                    "de": "Fall, Notizen",
                    "de-ch": "Fall, Notizen"
                }
            },
            "scheinTypeText": {
                "type": "String",
                "path": "scheinType",
                "insight2": true,
                "schema": "activity",
                "model": "activity",
                "label": {
                    "en": "Group",
                    "de": "Gruppe",
                    "de-ch": "Gruppe"
                }
            },
            "continuousIcds": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["SCHEIN", "PKVSCHEIN"],
                "label": {
                    "en": "Case, Long-term diagnoses",
                    "de": "Fall, Dauerdiagnosen",
                    "de-ch": "Fall, Dauerdiagnosen"
                }
            },
            "scheinBillingAreaText": {
                "type": "String",
                "insight2": true,
                "path": "scheinBillingArea",
                "schema": "activity",
                "model": "activity",
                "label": {
                    "en": "Note the Billing Area",
                    "de": "Abrechnungsgebiet",
                    "de-ch": "Abrechnungsgebiet"
                }
            },
            "scheinSubgroupText": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "path": "scheinSubgroup",
                "label": {
                    "en": "Note Subgroup text",
                    "de": "Untergruppe",
                    "de-ch": "Untergruppe"
                }
            },
            "diagnosisCert": {
                "schema": "activity",
                "path": "diagnosisCert",
                "insight2": true,
                "label": {
                    "en": "diagnosis, certainty",
                    "de": "Diagnose, Sicherheit",
                    "de-ch": "Diagnose, Sicherheit"
                },
                "model": "activity",
                "type": "String"
            },
            "diagnosisTreatmentRelevance": {
                "schema": "activity",
                "path": "diagnosisTreatmentRelevance",
                "insight2": true,
                "label": {
                    "en": "diagnosis, relevance",
                    "de": "Diagnose, Relevanz",
                    "de-ch": "Diagnose, Relevanz"
                },
                "model": "activity",
                "type": "String"
            },
            "areTreatmentDiagnosesBillable": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "treatment billable",
                    "de": "Leistung abrechenbar",
                    "de-ch": "Leistung abrechenbar"
                }
            },
            "billingFactorValue": {
                "type": "Number",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "billing factor value",
                    "de": "Rechnungsfaktor Wert",
                    "de-ch": "Rechnungsfaktor Wert"
                },
                "rendererName": "currencyFormat"
            },
            "costType": {
                "schema": "activity",
                "path": "costType",
                "insight2": true,
                "label": {
                    "en": "Cost type",
                    "de": "Auslagen",
                    "de-ch": "Auslagen"
                },
                "model": "activity",
                "type": "string"
            },
            "diagnosisType": {
                "schema": "activity",
                "path": "diagnosisType",
                "insight2": true,
                "label": {
                    "en": "diagnosis, type",
                    "de": "Diagnose, Typ",
                    "de-ch": "Diagnose, Typ"
                },
                "model": "activity",
                "type": "String"
            },
            "abrechenbar": {
                "type": "Boolean",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Properties billable",
                    "de": "Eigenschaften Abrechenbar",
                    "de-ch": "Eigenschaften Abrechenbar"
                }
            },
            "meldepflicht": {
                "type": "Boolean",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Properties reporting obligation",
                    "de": "Eigenschaften Meldepflicht",
                    "de-ch": "Eigenschaften Meldepflicht"
                }
            },
            "findingsTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "Findings table",
                    "de": "Befunde Tabelle",
                    "de-ch": "Befunde Tabelle"
                },
                "match": ["FINDING", "OBSERVATION"]
            },
            "findingsTableST": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "Findings table (with subtype)",
                    "de": "Befunde Tabelle (mit subtyp)",
                    "de-ch": "Befunde Tabelle (mit subtyp)"
                },
                "match": ["FINDING", "OBSERVATION"]
            },
            "findingsTableNST": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "Findings table (no subtype)",
                    "de": "Befunde Tabelle (ohne subtyp)",
                    "de-ch": "Befunde Tabelle (ohne subtyp)"
                },
                "match": ["FINDING", "OBSERVATION"]
            },
            "historiesTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "history table",
                    "de": "Anamnese Tabelle",
                    "de-ch": "Anamnese Tabelle"
                },
                "match": ["HISTORY", "EXTERNAL", "FROMPATIENT"]
            },
            "medicationsTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "medications table",
                    "de": "Medikamente Tabelle",
                    "de-ch": "Medikamente Tabelle"
                },
                "match": ["MEDICATION"]
            },
            "treatmentsTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "treatments table",
                    "de": "Leistungen Tabelle",
                    "de-ch": "Leistungen Tabelle"
                },
                "match": ["TREATMENT"]
            },
            "proceduresTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "procedures table",
                    "de": "Procederen Tabelle",
                    "de-ch": "Procederen Tabelle"
                },
                "match": ["PROCEDERE"]
            },
            "diagnosesTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "diagnoses table",
                    "de": "Diagnosen Tabelle",
                    "de-ch": "Diagnosen Tabelle"
                },
                "match": ["DIAGNOSIS"]
            },
            "utilitiesTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "utilities table",
                    "de": "Heilmittel Tabelle",
                    "de-ch": "Heilmittel Tabelle"
                },
                "match": ["UTILITY"]
            },
            "utilitiesAll": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "utilities all",
                    "de": "Heilmittel Alle",
                    "de-ch": "Heilmittel Alle"
                },
                "match": ["UTILITY"]
            },
            "assistivesTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "assistives table",
                    "de": "Hilfsmittel Tabelle",
                    "de-ch": "Hilfsmittel Tabelle"
                },
                "match": ["ASSISTIVE"]
            },
            "communicationsTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "communications table",
                    "de": "Kommunikation Tabelle",
                    "de-ch": "Kommunikation Tabelle"
                },
                "match": ["COMMUNICATION"]
            },
            "processesTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "processes table",
                    "de": "Vorgänge Tabelle",
                    "de-ch": "Vorgänge Tabelle"
                },
                "match": ["PROCESS"]
            },
            "therapyTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "therapy table",
                    "de": "Therapie Tabelle",
                    "de-ch": "Therapie Tabelle"
                },
                "match": ["THERAPY"]
            },
            "therapyStepsTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "therapy steps table",
                    "de": "Therapieschritt Tabelle",
                    "de-ch": "Therapieschritt Tabelle"
                },
                "match": ["THERAPYSTEP"]
            },
            "formsTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "forms table",
                    "de": "Formulare Tabelle",
                    "de-ch": "Formulare Tabelle"
                },
                "match": ["FORM"]
            },
            "docletterDiagnosisTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "Docletterdiagnosis activity table",
                    "de": "Briefdiagnose Tabelle",
                    "de-ch": "Briefdiagnose Tabelle"
                }
            },
            "linkedActivitiesTable": {
                "type": "Activity_T",
                "insight2": false,
                "label": {
                    "en": "Linked activities table",
                    "de": "Tabelle der verknüpften Einträge",
                    "de-ch": "Tabelle der verknüpften Einträge"
                }
            },
            "checkupPlanTable": {
                "type": "CheckupPlanItem_T",
                "insight2": false,
                "label": {
                    "en": "Checkup plan table",
                    "de": "Vorsorgeplan Tabelle",
                    "de-ch": "Vorsorgeplan Tabelle"
                }
            },
            "therapyText": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "therapy text",
                    "de": "Therapie Text",
                    "de-ch": "Therapie Text"
                }
            },
            "contactsTable": {
                "type": "Contact_T",
                "insight2": false,
                "label": {
                    "en": "Contacts table (of serial letters)",
                    "de": "Kontaktentabelle (Serienbrief)",
                    "de-ch": "Kontaktentabelle (Serienbrief)"
                }
            },
            "diagnosesShort": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "diagnoses",
                    "de": "Diagnosen kurz",
                    "de-ch": "Diagnosen kurz"
                }
            },
            "kontrollunters": {
                "schema": "activity",
                "path": "kontrollunters",
                "insight2": true,
                "label": {
                    "en": "Kontrolluntersuchung",
                    "de": "Kontrolluntersuchung",
                    "de-ch": "Kontrolluntersuchung"
                },
                "model": "activity",
                "type": "boolean"
            },
            "abnDatumZeit": {
                "schema": "activity",
                "path": "abnDatumZeit",
                "insight2": false,
                "label": {
                    "en": "Abnahmedatum/Abnahmezeit",
                    "de": "Abnahmedatum/Abnahmezeit",
                    "de-ch": "Abnahmedatum/Abnahmezeit"
                },
                "model": "activity",
                "type": "date"
            },
            "befEilt": {
                "schema": "activity",
                "path": "befEilt",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Befundübermittlung eilt (Dringlichkeitsstatus)",
                    "de": "Befundübermittlung eilt (Dringlichkeitsstatus)",
                    "de-ch": "Befundübermittlung eilt (Dringlichkeitsstatus)"
                },
                "type": "boolean"
            },
            "befEiltTel": {
                "type": "String",
                "schema": "activity",
                "path": "befEiltTel",
                "insight2": true,
                "label": {
                    "en": "Telefon-Nr.",
                    "de": "Telefon-Nr.",
                    "de-ch": "Telefon-Nr."
                },
                "model": "activity"
            },
            "befEiltFax": {
                "type": "String",
                "schema": "activity",
                "path": "befEiltFax",
                "insight2": true,
                "label": {
                    "en": "Fax-Nr.",
                    "de": "Fax-Nr.",
                    "de-ch": "Fax-Nr."
                },
                "model": "activity"
            },
            "knappschaftskennzeichen": {
                "type": "String",
                "schema": "activity",
                "path": "knappschaftskennzeichen",
                "model": "activity",
                "insight2": true,
                "label": {
                    "en": "Knappschaftskennzeichen",
                    "de": "Knappschaftskennzeichen",
                    "de-ch": "Knappschaftskennzeichen"
                }
            },
            "befEiltTelBool": {
                "type": "Boolean",
                "schema": "activity",
                "path": "befEiltTelBool",
                "model": "activity",
                "insight2": true,
                "label": {
                    "en": "Telefon",
                    "de": "Telefon",
                    "de-ch": "Telefon"
                }
            },
            "befEiltFaxBool": {
                "type": "Boolean",
                "schema": "activity",
                "path": "befEiltFaxBool",
                "model": "activity",
                "insight2": true,
                "label": {
                    "en": "Fax",
                    "de": "Fax",
                    "de-ch": "Fax"
                }
            },
            "befEiltNr": {
                "type": "String",
                "schema": "activity",
                "path": "befEiltNr",
                "model": "activity",
                "insight2": true,
                "label": {
                    "en": "Nr.",
                    "de": "Nr.",
                    "de-ch": "Nr."
                }
            },
            "ssw": {
                "type": "String",
                "schema": "activity",
                "path": "ssw",
                "model": "activity",
                "insight2": true,
                "label": {
                    "en": "SSW",
                    "de": "SSW",
                    "de-ch": "SSW"
                }
            },
            "zuAngaben": {
                "type": "String",
                "schema": "activity",
                "path": "zuAngaben",
                "model": "activity",
                "insight2": true,
                "label": {
                    "en": "Zusätzliche Angaben zu Untersuchungen",
                    "de": "Zusätzliche Angaben zu Untersuchungen",
                    "de-ch": "Zusätzliche Angaben zu Untersuchungen"
                }
            },
            "edtaGrBlutbild": {
                "schema": "activity",
                "path": "edtaGrBlutbild",
                "insight2": true,
                "label": {
                    "en": "großes Blutbild",
                    "de": "großes Blutbild",
                    "de-ch": "grosses Blutbild"
                },
                "model": "activity",
                "type": "boolean"
            },
            "edtaKlBlutbild": {
                "schema": "activity",
                "path": "edtaKlBlutbild",
                "insight2": true,
                "label": {
                    "en": "kleines Blutbild",
                    "de": "kleines Blutbild",
                    "de-ch": "kleines Blutbild"
                },
                "model": "activity",
                "type": "boolean"
            },
            "edtaHbA1c": {
                "schema": "activity",
                "path": "edtaHbA1c",
                "insight2": true,
                "label": {
                    "en": "HbA1c",
                    "de": "HbA1c",
                    "de-ch": "HbA1c"
                },
                "model": "activity",
                "type": "boolean"
            },
            "edtaReti": {
                "schema": "activity",
                "path": "edtaReti",
                "insight2": true,
                "label": {
                    "en": "Retikulozyten",
                    "de": "Retikulozyten",
                    "de-ch": "Retikulozyten"
                },
                "model": "activity",
                "type": "boolean"
            },
            "edtaBlutsenkung": {
                "schema": "activity",
                "path": "edtaBlutsenkung",
                "insight2": true,
                "label": {
                    "en": "Blutsenkung",
                    "de": "Blutsenkung",
                    "de-ch": "Blutsenkung"
                },
                "model": "activity",
                "type": "boolean"
            },
            "edtaDiffBlutbild": {
                "schema": "activity",
                "path": "edtaDiffBlutbild",
                "insight2": true,
                "label": {
                    "en": "Diff. Blutbild (Ausstrich)",
                    "de": "Diff. Blutbild (Ausstrich)",
                    "de-ch": "Diff. Blutbild (Ausstrich)"
                },
                "model": "activity",
                "type": "boolean"
            },
            "citratQu": {
                "schema": "activity",
                "path": "citratQu",
                "insight2": true,
                "label": {
                    "en": "Quick",
                    "de": "Quick",
                    "de-ch": "Quick"
                },
                "model": "activity",
                "type": "boolean"
            },
            "citratQuMarcumar": {
                "schema": "activity",
                "path": "citratQuMarcumar",
                "insight2": true,
                "label": {
                    "en": "Quick unter Marcumar-Therapie",
                    "de": "Quick unter Marcumar-Therapie",
                    "de-ch": "Quick unter Marcumar-Therapie"
                },
                "model": "activity",
                "type": "boolean"
            },
            "citratThrombin": {
                "schema": "activity",
                "path": "citratThrombin",
                "insight2": true,
                "label": {
                    "en": "Thrombinzeit",
                    "de": "Thrombinzeit",
                    "de-ch": "Thrombinzeit"
                },
                "model": "activity",
                "type": "boolean"
            },
            "citratPTT": {
                "schema": "activity",
                "path": "citratPTT",
                "insight2": true,
                "label": {
                    "en": "PTT",
                    "de": "PTT",
                    "de-ch": "PTT"
                },
                "model": "activity",
                "type": "boolean"
            },
            "citratFibri": {
                "schema": "activity",
                "path": "citratFibri",
                "insight2": true,
                "label": {
                    "en": "Fibrinogen",
                    "de": "Fibrinogen",
                    "de-ch": "Fibrinogen"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbAlkPhos": {
                "schema": "activity",
                "path": "svbAlkPhos",
                "insight2": true,
                "label": {
                    "en": "alkalische Phosphatase",
                    "de": "alkalische Phosphatase",
                    "de-ch": "alkalische Phosphatase"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbAmylase": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Amylase SVB (laboratory certificate)",
                    "de": "Amylase SVB (Laborschein)",
                    "de-ch": "Amylase SVB (Laborschein)"
                }
            },
            "svbASL": {
                "schema": "activity",
                "path": "svbASL",
                "insight2": true,
                "label": {
                    "en": "ASL",
                    "de": "ASL",
                    "de-ch": "ASL"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbBiliD": {
                "schema": "activity",
                "path": "svbBiliD",
                "insight2": true,
                "label": {
                    "en": "Bilirubin direkt",
                    "de": "Bilirubin direkt",
                    "de-ch": "Bilirubin direkt"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbBiliG": {
                "schema": "activity",
                "path": "svbBiliG",
                "insight2": true,
                "label": {
                    "en": "Bilirubin gesamt",
                    "de": "Bilirubin gesamt",
                    "de-ch": "Bilirubin gesamt"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbCalc": {
                "schema": "activity",
                "path": "svbCalc",
                "insight2": true,
                "label": {
                    "en": "Calcium",
                    "de": "Calcium",
                    "de-ch": "Calcium"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbCholesterin": {
                "schema": "activity",
                "path": "svbCholesterin",
                "insight2": true,
                "label": {
                    "en": "Cholesterin",
                    "de": "Cholesterin",
                    "de-ch": "Cholesterin"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbCholin": {
                "schema": "activity",
                "path": "svbCholin",
                "insight2": true,
                "label": {
                    "en": "Cholinesterase",
                    "de": "Cholinesterase",
                    "de-ch": "Cholinesterase"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbCK": {
                "schema": "activity",
                "path": "svbCK",
                "insight2": true,
                "label": {
                    "en": "CK",
                    "de": "CK",
                    "de-ch": "CK"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbCKMB": {
                "schema": "activity",
                "path": "svbCKMB",
                "insight2": true,
                "label": {
                    "en": "CK-MB",
                    "de": "CK-MB",
                    "de-ch": "CK-MB"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbCRP": {
                "schema": "activity",
                "path": "svbCRP",
                "insight2": true,
                "label": {
                    "en": "CRP",
                    "de": "CRP",
                    "de-ch": "CRP"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbEisen": {
                "schema": "activity",
                "path": "svbEisen",
                "insight2": true,
                "label": {
                    "en": "Eisen",
                    "de": "Eisen",
                    "de-ch": "Eisen"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbEiwE": {
                "schema": "activity",
                "path": "svbEiwE",
                "insight2": true,
                "label": {
                    "en": "Eiweiß Elektrophorese",
                    "de": "Eiweiß Elektrophorese",
                    "de-ch": "Eiweiss Elektrophorese"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbEiwG": {
                "schema": "activity",
                "path": "svbEiwG",
                "insight2": true,
                "label": {
                    "en": "Eiweiß gesamt",
                    "de": "Eiweiß gesamt",
                    "de-ch": "Eiweiss gesamt"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbGammaGT": {
                "schema": "activity",
                "path": "svbGammaGT",
                "insight2": true,
                "label": {
                    "en": "Gamma GT",
                    "de": "Gamma GT",
                    "de-ch": "Gamma GT"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbGlukose": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Glukose SVB (Laborschein)",
                    "de": "Glukose SVB (Laborschein)",
                    "de-ch": "Glukose SVB (Laborschein)"
                }
            },
            "svbGOT": {
                "schema": "activity",
                "path": "svbGOT",
                "insight2": true,
                "label": {
                    "en": "GOT",
                    "de": "GOT",
                    "de-ch": "GOT"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbGPT": {
                "schema": "activity",
                "path": "svbGPT",
                "insight2": true,
                "label": {
                    "en": "GPT",
                    "de": "GPT",
                    "de-ch": "GPT"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbHarnsäure": {
                "schema": "activity",
                "path": "svbHarnsäure",
                "insight2": true,
                "label": {
                    "en": "Harnsäure",
                    "de": "Harnsäure",
                    "de-ch": "Harnsäure"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbHarnstoff": {
                "schema": "activity",
                "path": "svbHarnstoff",
                "insight2": true,
                "label": {
                    "en": "Harnstoff",
                    "de": "Harnstoff",
                    "de-ch": "Harnstoff"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbHBDH": {
                "schema": "activity",
                "path": "svbHBDH",
                "insight2": true,
                "label": {
                    "en": "HBDH",
                    "de": "HBDH",
                    "de-ch": "HBDH"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbHDL": {
                "schema": "activity",
                "path": "svbHDL",
                "insight2": true,
                "label": {
                    "en": "HDL-Cholesterin",
                    "de": "HDL-Cholesterin",
                    "de-ch": "HDL-Cholesterin"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbLgA": {
                "schema": "activity",
                "path": "svbLgA",
                "insight2": true,
                "label": {
                    "en": "IgA",
                    "de": "IgA",
                    "de-ch": "IgA"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbLgG": {
                "schema": "activity",
                "path": "svbLgG",
                "insight2": true,
                "label": {
                    "en": "IgG",
                    "de": "IgG",
                    "de-ch": "IgG"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbLgM": {
                "schema": "activity",
                "path": "svbLgM",
                "insight2": true,
                "label": {
                    "en": "IgM",
                    "de": "IgM",
                    "de-ch": "IgM"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbKali": {
                "schema": "activity",
                "path": "svbKali",
                "insight2": true,
                "label": {
                    "en": "Kalium",
                    "de": "Kalium",
                    "de-ch": "Kalium"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbKrea": {
                "schema": "activity",
                "path": "svbKrea",
                "insight2": true,
                "label": {
                    "en": "Kreatinin",
                    "de": "Kreatinin",
                    "de-ch": "Kreatinin"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbKreaC": {
                "schema": "activity",
                "path": "svbKreaC",
                "insight2": true,
                "label": {
                    "en": "Kreatinin Clearance",
                    "de": "Kreatinin Clearance",
                    "de-ch": "Kreatinin Clearance"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbLDH": {
                "schema": "activity",
                "path": "svbLDH",
                "insight2": true,
                "label": {
                    "en": "LDH",
                    "de": "LDH",
                    "de-ch": "LDH"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbLDL": {
                "schema": "activity",
                "path": "svbLDL",
                "insight2": true,
                "label": {
                    "en": "LDL-Cholesterin",
                    "de": "LDL-Cholesterin",
                    "de-ch": "LDL-Cholesterin"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbLipase": {
                "schema": "activity",
                "path": "svbLipase",
                "insight2": true,
                "label": {
                    "en": "Lipase",
                    "de": "Lipase",
                    "de-ch": "Lipase"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbNatrium": {
                "schema": "activity",
                "path": "svbNatrium",
                "insight2": true,
                "label": {
                    "en": "Natrium",
                    "de": "Natrium",
                    "de-ch": "Natrium"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbOPVorb": {
                "schema": "activity",
                "path": "svbOPVorb",
                "insight2": true,
                "label": {
                    "en": "OP-Vorbereitung",
                    "de": "OP-Vorbereitung",
                    "de-ch": "OP-Vorbereitung"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbPhos": {
                "schema": "activity",
                "path": "svbPhos",
                "insight2": true,
                "label": {
                    "en": "Phosphat, anorganisches",
                    "de": "Phosphat, anorganisches",
                    "de-ch": "Phosphat, anorganisches"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbTransf": {
                "schema": "activity",
                "path": "svbTransf",
                "insight2": true,
                "label": {
                    "en": "Transferrin",
                    "de": "Transferrin",
                    "de-ch": "Transferrin"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbTrigl": {
                "schema": "activity",
                "path": "svbTrigl",
                "insight2": true,
                "label": {
                    "en": "Triglyceride",
                    "de": "Triglyceride",
                    "de-ch": "Triglyceride"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbTSHBasal": {
                "schema": "activity",
                "path": "svbTSHBasal",
                "insight2": true,
                "label": {
                    "en": "TSH basal",
                    "de": "TSH basal",
                    "de-ch": "TSH basal"
                },
                "model": "activity",
                "type": "boolean"
            },
            "svbTSHTRH": {
                "schema": "activity",
                "path": "svbTSHTRH",
                "insight2": true,
                "label": {
                    "en": "TSH nach TRH",
                    "de": "TSH nach TRH",
                    "de-ch": "TSH nach TRH"
                },
                "model": "activity",
                "type": "boolean"
            },
            "glu1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Glucose 1 (laboratory certificate)",
                    "de": "Glukose 1 (Laborschein)",
                    "de-ch": "Glukose 1 (Laborschein)"
                }
            },
            "glu2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Glucose 2 (laboratory certificate)",
                    "de": "Glukose 2 (Laborschein)",
                    "de-ch": "Glukose 2 (Laborschein)"
                }
            },
            "glu3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Glucose 3 (laboratory certificate)",
                    "de": "Glukose 3 (Laborschein)",
                    "de-ch": "Glukose 3 (Laborschein)"
                }
            },
            "glu4": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Glucose 4 (laboratory certificate)",
                    "de": "Glukose 4 (Laborschein)",
                    "de-ch": "Glukose 4 (Laborschein)"
                }
            },
            "urinStatus": {
                "schema": "activity",
                "path": "urinStatus",
                "insight2": true,
                "label": {
                    "en": "Status",
                    "de": "Status",
                    "de-ch": "Status"
                },
                "model": "activity",
                "type": "boolean"
            },
            "urinMikroalb": {
                "schema": "activity",
                "path": "urinMikroalb",
                "insight2": true,
                "label": {
                    "en": "Mikroalbumin",
                    "de": "Mikroalbumin",
                    "de-ch": "Mikroalbumin"
                },
                "model": "activity",
                "type": "boolean"
            },
            "urinSchwTest": {
                "schema": "activity",
                "path": "urinSchwTest",
                "insight2": true,
                "label": {
                    "en": "Schwangerschaftstest",
                    "de": "Schwangerschaftstest",
                    "de-ch": "Schwangerschaftstest"
                },
                "model": "activity",
                "type": "boolean"
            },
            "urinGlukose": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Glucose urine (laboratory certificate)",
                    "de": "Glukose Urin (Laborschein)",
                    "de-ch": "Glukose Urin (Laborschein)"
                }
            },
            "urinAmylase": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Amylase urine (laboratory certificate)",
                    "de": "Amylase Urin (Laborschein)",
                    "de-ch": "Amylase Urin (Laborschein)"
                }
            },
            "urinSediment": {
                "schema": "activity",
                "path": "urinSediment",
                "insight2": true,
                "label": {
                    "en": "Sediment",
                    "de": "Sediment",
                    "de-ch": "Sediment"
                },
                "model": "activity",
                "type": "boolean"
            },
            "sonstiges": {
                "schema": "activity",
                "path": "sonstiges",
                "insight2": true,
                "label": {
                    "en": "Sonstiges",
                    "de": "Sonstiges",
                    "de-ch": "Sonstiges"
                },
                "model": "activity",
                "type": "boolean"
            },
            "sonstigesText": {
                "schema": "activity",
                "path": "sonstigesText",
                "insight2": true,
                "label": {
                    "en": "Freitext",
                    "de": "Freitext",
                    "de-ch": "Freitext"
                },
                "model": "activity",
                "type": "String"
            },
            "harnStreifenTest": {
                "schema": "activity",
                "path": "harnStreifenTest",
                "insight2": true,
                "label": {
                    "en": "Harnstoffstreifentest (62)",
                    "de": "Harnstoffstreifentest (62)",
                    "de-ch": "Harnstoffstreifentest (62)"
                },
                "model": "activity",
                "type": "boolean"
            },
            "nuechternPlasmaGlukose": {
                "schema": "activity",
                "path": "sonstiges",
                "insight2": true,
                "label": {
                    "en": "Nüchternplasmaglukose (63)",
                    "de": "Nüchternplasmaglukose (63)",
                    "de-ch": "Nüchternplasmaglukose (63)"
                },
                "model": "activity",
                "type": "boolean"
            },
            "lipidprofil": {
                "schema": "activity",
                "path": "sonstiges",
                "insight2": true,
                "label": {
                    "en": "Lipidprofil (64)",
                    "de": "Lipidprofil (64)",
                    "de-ch": "Lipidprofil (64)"
                },
                "model": "activity",
                "type": "boolean"
            },
            "labRequestType": {
                "schema": "activity",
                "path": "labRequestType",
                "insight2": false,
                "label": {
                    "en": "Laborscheintyp",
                    "de": "Laborscheintyp",
                    "de-ch": "Laborscheintyp"
                },
                "model": "activity",
                "type": "String"
            },
            "ggfKennziffer": {
                "schema": "activity",
                "path": "ggfKennziffer",
                "insight2": true,
                "label": {
                    "en": "ggf. Kennziffer",
                    "de": "ggf. Kennziffer",
                    "de-ch": "ggf. Kennziffer"
                },
                "model": "activity",
                "type": "String"
            },
            "behandlungGemaess": {
                "schema": "activity",
                "path": "behandlungGemaess",
                "insight2": true,
                "label": {
                    "en": "Behandlung gemäß § 116b SGB V",
                    "de": "Behandlung gemäß § 116b SGB V",
                    "de-ch": "Behandlung gemäss § 116b SGB V"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "auftrag": {
                "schema": "activity",
                "path": "auftrag",
                "insight2": true,
                "label": {
                    "en": "Laborauftrag",
                    "de": "Laborauftrag",
                    "de-ch": "Laborauftrag"
                },
                "model": "activity",
                "type": "String"
            },
            "fk4202": {
                "schema": "activity",
                "path": "fk4202",
                "insight2": true,
                "label": {
                    "en": "Unfall, Unfallfolgen",
                    "de": "Unfall, Unfallfolgen",
                    "de-ch": "Unfall, Unfallfolgen"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "fk4219": {
                "schema": "activity",
                "insight2": true,
                "label": {
                    "en": "Referral from other physicians",
                    "de": "Schein, Überweisung von anderen Ärzten",
                    "de-ch": "Fall, Überweisung von anderen Ärzten"
                },
                "model": "activity",
                "type": "String"
            },
            "scheinRemittor": {
                "schema": "activity",
                "insight2": true,
                "label": {
                    "en": "Referring doctor number",
                    "de": "Schein, Überweiser LANR",
                    "de-ch": "Fall, Überweiser LANR"
                },
                "model": "activity",
                "type": "String"
            },
            "scheinEstablishment": {
                "schema": "activity",
                "insight2": true,
                "label": {
                    "en": "Referring location",
                    "de": "Schein, Überweiser BSNR",
                    "de-ch": "Fall, Überweiser BSNR"
                },
                "model": "activity",
                "type": "String"
            },
            "scheinDate": {
                "schema": "activity",
                "insight2": true,
                "label": {
                    "en": "Original Schein Date",
                    "de": "Schein, Ausstellungsdatum",
                    "de-ch": "Fall, Ausstellungsdatum"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinId": {
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Schein ID",
                    "de": "Schein ID",
                    "de-ch": "Fall ID"
                },
                "type": "String"
            },
            "scheinSpecialisation": {
                "schema": "activity",
                "insight2": true,
                "label": {
                    "en": "Specialisation",
                    "de": "Schein, Fachrichtung",
                    "de-ch": "Fall, Fachrichtung"
                },
                "model": "activity",
                "type": "String"
            },
            "scheinTransferType": {
                "schema": "activity",
                "path": "scheinTransferType",
                "insight2": true,
                "label": {
                    "en": "TSVG Vermittlungs-/Kontaktart",
                    "de": "Schein, TSVG Vermittlungs-/Kontaktart",
                    "de-ch": "Fall, TSVG Vermittlungs-/Kontaktart"
                },
                "model": "activity",
                "type": "String"
            },
            "scheinTransferTypeInfo": {
                "schema": "activity",
                "path": "scheinTransferTypeInfo",
                "insight2": true,
                "label": {
                    "en": "Ergänzende Informationen zur TSVG Vermittlungs-/Kontaktart",
                    "de": "Schein, Ergänzende Informationen zur TSVG Vermittlungs-/Kontaktart",
                    "de-ch": "Fall, Ergänzende Informationen zur TSVG Vermittlungs-/Kontaktart"
                },
                "model": "activity",
                "type": "String"
            },
            "tsvDoctorNo": {
                "schema": "activity",
                "insight2": true,
                "label": {
                    "en": "(N)BSNR of the mediated specialist",
                    "de": "(N)BSNR des vermittelten Facharztes",
                    "de-ch": "(N)BSNR des vermittelten Facharztes"
                },
                "model": "activity",
                "type": "String"
            },
            "fk4204": {
                "schema": "activity",
                "path": "fk4204",
                "insight2": true,
                "label": {
                    "en": "Eingeschränkter Leistungsanspruch",
                    "de": "Eingeschränkter Leistungsanspruch",
                    "de-ch": "Eingeschränkter Leistungsanspruch"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "labRequestRemittor": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Dr No. First Person",
                    "de": "Arzt Nr. des Erstveranlassers",
                    "de-ch": "Arzt Nr. des Erstveranlassers"
                }
            },
            "labRequestEstablishment": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Establishment of the Authorized person",
                    "de": "Betriebsstätte des Erstveranlassers",
                    "de-ch": "Betriebsstätte des Erstveranlassers"
                }
            },
            "kurativ": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Curative",
                    "de": "Kurativ",
                    "de-ch": "Kurativ"
                }
            },
            "praeventiv": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Preventative",
                    "de": "Präventiv",
                    "de-ch": "Präventiv"
                }
            },
            "ess": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "(ESS) Contraception, Sterilization, Miscarriage/Abortion",
                    "de": "(ESS) Empfängnisregelung, Sterilisation, Schwangerschaftsabbruch",
                    "de-ch": "(ESS) Empfängnisregelung, Sterilisation, Schwangerschaftsabbruch"
                }
            },
            "bb": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "(BB) Doctor's Treatment",
                    "de": "(BB) Belegärztliche Behandlung",
                    "de-ch": "(BB) Belegärztliche Behandlung"
                }
            },
            "belegarztBeh": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "(BB) Doctor's Treatment BFB2",
                    "de": "(BB) Belegärztliche Behandlung BFB2",
                    "de-ch": "(BB) Belegärztliche Behandlung BFB2"
                }
            },
            "quarter": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Quarter",
                    "de": "Quartal",
                    "de-ch": "Quartal"
                }
            },
            "year": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Year",
                    "de": "Jahr",
                    "de-ch": "Jahr"
                }
            },
            "yearShort": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Year short (YY)",
                    "de": "Jahr kurz  (JJ)",
                    "de-ch": "Jahr kurz  (JJ)"
                }
            },
            "abnahmeDatum": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Date of removal",
                    "de": "Abnahmedatum",
                    "de-ch": "Abnahmedatum"
                }
            },
            "abnahmeZeit": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Decrease time",
                    "de": "Abnahmezeit",
                    "de-ch": "Abnahmezeit"
                }
            },
            "auBis": {
                "schema": "activity",
                "path": "auBis",
                "insight2": true,
                "label": {
                    "en": "AU bis",
                    "de": "AU bis",
                    "de-ch": "AU bis"
                },
                "model": "activity",
                "type": "String"
            },
            "untersArt": {
                "schema": "activity",
                "path": "untersArt",
                "insight2": true,
                "label": {
                    "en": "Untersuchungsart",
                    "de": "Untersuchungsart",
                    "de-ch": "Untersuchungsart"
                },
                "model": "activity",
                "type": "String"
            },
            "auftragsleistungen": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Execution of contractual services",
                    "de": "Ausführung von Auftragsleistungen",
                    "de-ch": "Ausführung von Auftragsleistungen"
                }
            },
            "konsiliaruntersuchung": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Consular Investigation",
                    "de": "Konsiliaruntersuchung",
                    "de-ch": "Konsiliaruntersuchung"
                }
            },
            "mitWeiterBehandlung": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "With further treatment",
                    "de": "Mit-/Weiterbehandlung",
                    "de-ch": "Mit-/Weiterbehandlung"
                }
            },
            "ueberwAn": {
                "schema": "activity",
                "path": "ueberwAn",
                "insight2": true,
                "label": {
                    "en": "Überweisung an",
                    "de": "Überweisung an",
                    "de-ch": "Überweisung an"
                },
                "model": "activity",
                "type": "String"
            },
            "datumOP": {
                "schema": "activity",
                "path": "datumOP",
                "insight2": true,
                "label": {
                    "en": "Op date (referral)",
                    "de": "OP Datum Überweisung",
                    "de-ch": "OP Datum Überweisung"
                },
                "model": "activity",
                "type": "Date"
            },
            "erstBesch": {
                "schema": "activity",
                "path": "erstBesch",
                "insight2": true,
                "label": {
                    "en": "Erstbescheinigung",
                    "de": "Erstbescheinigung",
                    "de-ch": "Erstbescheinigung"
                },
                "model": "activity",
                "type": "boolean"
            },
            "folgeBesc": {
                "schema": "activity",
                "path": "folgeBesc",
                "insight2": false,
                "label": {
                    "en": "Folgebescheinigung",
                    "de": "Folgebescheinigung",
                    "de-ch": "Folgebescheinigung"
                },
                "model": "activity",
                "type": "boolean"
            },
            "arbeitsunfall": {
                "schema": "activity",
                "path": "arbeitsunfall",
                "insight2": false,
                "label": {
                    "en": "Arbeitsunfall",
                    "de": "Arbeitsunfall",
                    "de-ch": "Arbeitsunfall"
                },
                "model": "activity",
                "type": "boolean"
            },
            "durchgangsarzt": {
                "schema": "activity",
                "path": "durchgangsarzt",
                "insight2": false,
                "label": {
                    "en": "Durchgangsarzt",
                    "de": "Durchgangsarzt",
                    "de-ch": "Durchgangsarzt"
                },
                "model": "activity",
                "type": "boolean"
            },
            "auVon": {
                "schema": "activity",
                "path": "auVon",
                "insight2": true,
                "label": {
                    "en": "AU von",
                    "de": "AU von",
                    "de-ch": "AU von"
                },
                "model": "activity",
                "type": "Date"
            },
            "auVorraussichtlichBis": {
                "schema": "activity",
                "path": "auVorraussichtlichBis",
                "insight2": true,
                "label": {
                    "en": "AU voraussichtlich bis",
                    "de": "AU voraussichtlich bis",
                    "de-ch": "AU voraussichtlich bis"
                },
                "model": "activity",
                "type": "Date"
            },
            "festgestelltAm": {
                "schema": "activity",
                "path": "festgestelltAm",
                "insight2": true,
                "label": {
                    "en": "Festgestellt am",
                    "de": "Festgestellt am",
                    "de-ch": "Festgestellt am"
                },
                "model": "activity",
                "type": "Date"
            },
            "sonstigerUnf": {
                "schema": "activity",
                "path": "sonstigerUnf",
                "insight2": false,
                "label": {
                    "en": "sonstiger Unfall, Unfallfolgen",
                    "de": "sonstiger Unfall, Unfallfolgen",
                    "de-ch": "sonstiger Unfall, Unfallfolgen"
                },
                "model": "activity",
                "type": "boolean"
            },
            "bvg": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "BVG (AU)",
                    "de": "BVG (AU)",
                    "de-ch": "BVG (AU)"
                }
            },
            "krankengeld": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Illness benefit",
                    "de": "Krankengeld",
                    "de-ch": "Krankengeld"
                }
            },
            "endBesch": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Certificate Expiry",
                    "de": "Endbescheinigung",
                    "de-ch": "Endbescheinigung"
                }
            },
            "rehab": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Rehabilitation",
                    "de": "Rehabilitation",
                    "de-ch": "Rehabilitation"
                }
            },
            "reintegration": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Reintegration",
                    "de": "stufenweise Wiedereingliederung",
                    "de-ch": "stufenweise Wiedereingliederung"
                }
            },
            "massnahmen": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Other measures",
                    "de": "Sonstige Maßnahmen",
                    "de-ch": "Sonstige Massnahmen"
                }
            },
            "massnahmenChk": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Sonstige Maßnahmen (Checkbox)",
                    "de": "Sonstige Maßnahmen (Checkbox)",
                    "de-ch": "Sonstige Massnahmen (Checkbox)"
                }
            },
            "diagnosesAdd": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Diagnostic note",
                    "de": "Hinweise zur Diagnose",
                    "de-ch": "Hinweise zur Diagnose"
                }
            },
            "findings": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "findings",
                    "de": "Befunde Text",
                    "de-ch": "Befunde Text"
                }
            },
            "medications": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "medications",
                    "de": "Medikation Text",
                    "de-ch": "Medikation Text"
                }
            },
            "diagnosesBC": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "diagnoses short (BFB)",
                    "de": "Diagnosen kurz (BFB)",
                    "de-ch": "Diagnosen kurz (BFB)"
                }
            },
            "diagnosesLongBC": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "diagnoses long (BFB)",
                    "de": "Diagnosen lang (BFB)",
                    "de-ch": "Diagnosen lang (BFB)"
                }
            },
            "notfall": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "emergency",
                    "de": "Notfall",
                    "de-ch": "Notfall"
                }
            },
            "folgegeraet": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Subsequent device",
                    "de": "Folgegerät",
                    "de-ch": "Folgegerät"
                }
            },
            "erstgeraet": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Initial Device",
                    "de": "Erstgerät",
                    "de-ch": "Erstgerät"
                }
            },
            "hoerhilfeNotwLinks": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Hearing aid necessary (left)",
                    "de": "Hörhilfe notwendig (links)",
                    "de-ch": "Hörhilfe notwendig (links)"
                }
            },
            "hoerhilfeNotwBeiderseits": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Hearing aid necessary (on both sides)",
                    "de": "Hörhilfe notwendig (beiderseits)",
                    "de-ch": "Hörhilfe notwendig (beiderseits)"
                }
            },
            "hoerhilfeNotwRechts": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Hearing aid necessary (right)",
                    "de": "Hörhilfe notwendig (rechts)",
                    "de-ch": "Hörhilfe notwendig (rechts)"
                }
            },
            "notfallScheinNotfalldienst": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Medical emergency service (emergency certificate)",
                    "de": "ärztlicher Notfalldienst  (Notfallschein)",
                    "de-ch": "ärztlicher Notfalldienst  (Notfallschein)"
                }
            },
            "notfallScheinUrlaub": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Vacation or illness (emergency certificate)",
                    "de": "Urlaubs- bzw. Krankheitsvertretung  (Notfallschein)",
                    "de-ch": "Urlaubs- bzw. Krankheitsvertretung  (Notfallschein)"
                }
            },
            "notfallScheinNotfall": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Emergency (emergency certificate)",
                    "de": "Notfall (Notfallschein)",
                    "de-ch": "Notfall (Notfallschein)"
                }
            },
            "betreuungVon": {
                "type": "Date",
                "insight2": true,
                "label": {
                    "en": "Support of",
                    "de": "Betreuung von",
                    "de-ch": "Betreuung von"
                }
            },
            "betreuungBis": {
                "type": "Date",
                "insight2": true,
                "label": {
                    "en": "Support up",
                    "de": "Betreuung bis",
                    "de-ch": "Betreuung bis"
                }
            },
            "betreuungNotwendig": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Care Required",
                    "de": "Betreuung notwendig",
                    "de-ch": "Betreuung notwendig"
                }
            },
            "betreuungNichtNotwendig": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Care is not necessary",
                    "de": "Betreuung nicht notwendig",
                    "de-ch": "Betreuung nicht notwendig"
                }
            },
            "betreuungUnfall": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Accident care",
                    "de": "Betreuung Unfall",
                    "de-ch": "Betreuung Unfall"
                }
            },
            "betreuungKeinUnfall": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "No Accident care",
                    "de": "Betreuung kein Unfall",
                    "de-ch": "Betreuung kein Unfall"
                }
            },
            "civilStatus": {
                "complex": "eq",
                "type": "CivilStatus_E",
                "lib": "reduced",
                "insight2": true,
                "label": {
                    "en": "Civil Status",
                    "de": "Zivilstand",
                    "de-ch": "Zivilstand"
                }
            },
            "comment": {
                "schema": "activity",
                "path": "comment",
                "insight2": true,
                "label": {
                    "en": "comment",
                    "de": "Kommentar",
                    "de-ch": "Kommentar"
                },
                "model": "activity",
                "type": "String"
            },
            "patientDOB": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Patient's DOB",
                    "de": "Patienten Geburtstag",
                    "de-ch": "Patienten Geburtstag"
                }
            },
            "dobD": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Day of Birth",
                    "de": "Geburtstag",
                    "de-ch": "Geburtstag"
                }
            },
            "dobM": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Month of Birth",
                    "de": "Geburtsmonat",
                    "de-ch": "Geburtsmonat"
                }
            },
            "dobY": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Year of Birth",
                    "de": "Geburtsjahr",
                    "de-ch": "Geburtsjahr"
                }
            },
            "dobPlain": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Date of Birth (unformatted)",
                    "de": "Geburtstag (unformatiert)",
                    "de-ch": "Geburtstag (unformatiert)"
                }
            },
            "insured": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Policy Holder",
                    "de": "Versicherter",
                    "de-ch": "Versicherter"
                }
            },
            "insuredDob": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Policy Holder's DOB",
                    "de": "Geburtsdatum des Versicherten",
                    "de-ch": "Geburtsdatum des Versicherten"
                }
            },
            "insuranceNumber": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Insurance Number",
                    "de": "Versicherten-Nr.",
                    "de-ch": "Versicherten-Nr."
                }
            },
            "doctorID": {
                "schema": "patient",
                "path": "primaryDoc",
                "insight2": false,
                "label": {
                    "en": "primaryDoc",
                    "de": "primaryDoc",
                    "de-ch": "primaryDoc"
                },
                "model": "patient",
                "type": "String"
            },
            "medication1": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Medication 1",
                    "de": "Medication 1",
                    "de-ch": "Medication 1"
                }
            },
            "medication2": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Medication 2",
                    "de": "Medication 2",
                    "de-ch": "Medication 2"
                }
            },
            "medication3": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Medication 3",
                    "de": "Medication 3",
                    "de-ch": "Medication 3"
                }
            },
            "dosis1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Dose 1",
                    "de": "Dosis 1",
                    "de-ch": "Dosis 1"
                }
            },
            "dosis2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Dose 2",
                    "de": "Dosis2",
                    "de-ch": "Dosis2"
                }
            },
            "dosis3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Dose 3",
                    "de": "Dosis3",
                    "de-ch": "Dosis3"
                }
            },
            "pzn1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "PZN 1",
                    "de": "PZN 1",
                    "de-ch": "PZN 1"
                }
            },
            "pzn2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "PZN 2",
                    "de": "PZN 2",
                    "de-ch": "PZN 2"
                }
            },
            "pzn3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "PZN 3",
                    "de": "PZN 3",
                    "de-ch": "PZN 3"
                }
            },
            "avp1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "AVP 1",
                    "de": "AVP 1",
                    "de-ch": "AVP 1"
                }
            },
            "avp2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "AVP 2",
                    "de": "AVP 2",
                    "de-ch": "AVP 2"
                }
            },
            "avp3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "AVP 3",
                    "de": "AVP 3",
                    "de-ch": "AVP 3"
                }
            },
            "prescribedUntil1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Prescribed until 1",
                    "de": "Gültig bis 1",
                    "de-ch": "Gültig bis 1"
                }
            },
            "prescribedUntil2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Prescribed until 2",
                    "de": "Gültig bis 2",
                    "de-ch": "Gültig bis 2"
                }
            },
            "prescribedUntil3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Prescribed until 3",
                    "de": "Gültig bis 3",
                    "de-ch": "Gültig bis 3"
                }
            },
            "labDataTable": {
                "type": "LabDataRow_T",
                "insight2": false,
                "label": {
                    "en": "lab data",
                    "de": "lab data",
                    "de-ch": "lab data"
                }
            },
            "ldtVersion": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "LDT Version",
                    "de": "LDT Version",
                    "de-ch": "LDT Version"
                }
            },
            "medicationStr": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Medication",
                    "de": "Medikamente",
                    "de-ch": "Medikamente"
                }
            },
            "paidFree": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Exempt from charges",
                    "de": "gebührenbefreit",
                    "de-ch": "gebührenbefreit"
                }
            },
            "paid": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Charges Apply",
                    "de": "gebührenpflichtig",
                    "de-ch": "gebührenpflichtig"
                }
            },
            "line1": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Line 1",
                    "de": "Drukzeile 1",
                    "de-ch": "Drukzeile 1"
                }
            },
            "line2": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Line 2",
                    "de": "Drukzeile 2",
                    "de-ch": "Drukzeile 2"
                }
            },
            "line3": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Line 3",
                    "de": "Drukzeile 3",
                    "de-ch": "Drukzeile 3"
                }
            },
            "line4": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Line 4",
                    "de": "Drukzeile 4",
                    "de-ch": "Drukzeile 4"
                }
            },
            "line5": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Line 5",
                    "de": "Drukzeile 5",
                    "de-ch": "Drukzeile 5"
                }
            },
            "line6": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Line 6",
                    "de": "Drukzeile 6",
                    "de-ch": "Drukzeile 6"
                }
            },
            "line7": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Line 7",
                    "de": "Drukzeile 7",
                    "de-ch": "Drukzeile 7"
                }
            },
            "firstname": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Pat. first name",
                    "de": "Pat. Vorname",
                    "de-ch": "Pat. Vorname"
                }
            },
            "middlename": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Pat. Middle Name",
                    "de": "Pat. Zweiter Vorname",
                    "de-ch": "Pat. Zweiter Vorname"
                }
            },
            "lastname": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Pat. Surname",
                    "de": "Pat. Nachname",
                    "de-ch": "Pat. Nachname"
                }
            },
            "nameaffix": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Name Prefix",
                    "de": "Pat. Namenszusatz",
                    "de-ch": "Pat. Namenszusatz"
                }
            },
            "nameinfix": {
                "type": "String",
                "label": {
                    "en": "Name Preamble",
                    "de": "Pat. Vorsatzwort",
                    "de-ch": "Pat. Vorsatzwort"
                }
            },
            "fullname": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Full Name",
                    "de": "Full Name",
                    "de-ch": "Full Name"
                }
            },
            "nameAndAddress": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Name And Address",
                    "de": "Name und Anschrift",
                    "de-ch": "Name und Anschrift"
                }
            },
            "longPatientName": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Patient name with all affixes and infixes",
                    "de": "langer Patientenname",
                    "de-ch": "langer Patientenname"
                }
            },
            "lang": {
                "complex": "eq",
                "type": "Language_E",
                "lib": "reduced",
                "insight2": false,
                "label": {
                    "en": "Language",
                    "de": "Sprache",
                    "de-ch": "Sprache"
                }
            },
            "communications": {
                "type": "Communication_T",
                "insight2": false,
                "label": {
                    "en": "Contact details",
                    "de": "Kontaktdaten",
                    "de-ch": "Kontaktdaten"
                }
            },
            "insuranceKind": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance Type",
                    "de": "Versicherungsart",
                    "de-ch": "Versicherungsart"
                }
            },
            "persGroup": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Special Group",
                    "de": "Besondere Personen Gruppe",
                    "de-ch": "Besondere Personen Gruppe"
                }
            },
            "dmp": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "DMP-Mark",
                    "de": "DMP-Kennzeichen",
                    "de-ch": "DMP-Kennzeichen"
                }
            },
            "doctorNumber": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Physician Number",
                    "de": "Lebenslange Arztnr.",
                    "de-ch": "Lebenslange Arztnr."
                }
            },
            "transactionDate": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Transaction Date",
                    "de": "Datum",
                    "de-ch": "Datum"
                }
            },
            "chiffre": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Pat. Cipher PSY",
                    "de": "Pat. Chiffre PSY",
                    "de-ch": "Pat. Chiffre PSY"
                }
            },
            "insuranceAddr1": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance Address line 1",
                    "de": "Versicherung Adresszeile 1",
                    "de-ch": "Versicherung Adresszeile 1"
                }
            },
            "insuranceAddr2": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance Address line 2",
                    "de": "Versicherung Adresszeile 2",
                    "de-ch": "Versicherung Adresszeile 2"
                }
            },
            "isBVG": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "BVG (Patient)",
                    "de": "BVG (Patient)",
                    "de-ch": "BVG (Patient)"
                }
            },
            "markerArray": {
                "type": "String",
                "insight2": true,
                "model": "marker",
                "label": {
                    "en": "Markers (array)",
                    "de": "Marker (alle)",
                    "de-ch": "Marker (alle)"
                },
                "searchAsArrayOfValues": true
            },
            "markerText": {
                "type": "String",
                "model": "patient",
                "insight2": true,
                "label": {
                    "en": "Markers (text)",
                    "de": "Marker",
                    "de-ch": "Marker"
                }
            },
            "selectedActsTable": {
                "type": "SelectedActivity_T",
                "insight2": false,
                "label": {
                    "en": "Selected Activites (table)",
                    "de": "Ausgewählte Aktivitäten (aufstellung)",
                    "de-ch": "Ausgewählte Aktivitäten (aufstellung)"
                }
            },
            "latestMedDataTable": {
                "type": "MedData_T",
                "insight2": false,
                "label": {
                    "en": "Latest Meddata (table)",
                    "de": "Medizindaten (tabelle)",
                    "de-ch": "Medizindaten (tabelle)"
                }
            },
            "medDataTable": {
                "type": "MedData_T",
                "insight2": false,
                "label": {
                    "en": "Med data, general (table)",
                    "de": "Medizindaten allgemein (tabelle)"
                }
            },
            "ingredientplanMedDataTable": {
                "type": "Ingredient_T",
                "insight2": false,
                "label": {
                    "en": "Ingredient Plan (table)",
                    "de": "Wirkstoffplan (tabelle)"
                }
            },
            "selectedActsString": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Selected Activites (text)",
                    "de": "Ausgewählte Aktivitäten (inhalt)",
                    "de-ch": "Ausgewählte Aktivitäten (inhalt)"
                }
            },
            "userContent": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "User content",
                    "de": "Aktivitätsbeschreibung",
                    "de-ch": "Aktivitätsbeschreibung"
                }
            },
            "utDiagnosisName": {
                "schema": "activity",
                "path": "utDiagnosisName",
                "insight2": true,
                "label": {
                    "en": "utDiagnosisName",
                    "de": "HM Diagnose Text",
                    "de-ch": "HM Diagnose Text"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy1Name": {
                "schema": "activity",
                "path": "utRemedy1Name",
                "insight2": true,
                "label": {
                    "en": "utRemedy1",
                    "de": "HM Verordnung 1",
                    "de-ch": "HM Verordnung 1"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy1Item": {
                "schema": "activity",
                "path": "utRemedy1Name",
                "insight2": true,
                "label": {
                    "en": "utRemedy1",
                    "de": "HM Verordnung 1",
                    "de-ch": "HM Verordnung 1"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy1Explanation": {
                "schema": "activity",
                "path": "utRemedy1Explanation",
                "insight2": true,
                "label": {
                    "en": "utRemedy1Explanation",
                    "de": "HM Verordnung 1 Erklärung",
                    "de-ch": "HM Verordnung 1 Erklärung"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy1Seasons": {
                "schema": "activity",
                "path": "utRemedy1Seasons",
                "insight2": true,
                "label": {
                    "en": "utRemedy1Seasons",
                    "de": "HM Sitzungen 1",
                    "de-ch": "HM Sitzungen 1"
                },
                "model": "activity",
                "type": "Number"
            },
            "utRemedy1PerWeek": {
                "schema": "activity",
                "path": "utRemedy1PerWeek",
                "insight2": true,
                "label": {
                    "en": "utRemedy1Seasons",
                    "de": "HM Frequenz 1",
                    "de-ch": "HM Frequenz 1"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy1ItemPrice": {
                "schema": "activity",
                "path": "utRemedy1ItemPrice",
                "insight2": true,
                "label": {
                    "en": "utRemedy1ItemPrice",
                    "de": "HM Verordnung Position 1 Preis",
                    "de-ch": "HM Verordnung Position 1 Preis"
                },
                "model": "activity",
                "type": "Number"
            },
            "utRemedy1ItemPricePlain": {
                "schema": "activity",
                "path": "utRemedy1ItemPrice",
                "insight2": true,
                "label": {
                    "en": "utRemedy1ItemPrice (plain)",
                    "de": "HM Verordnung Position 1 Preis (ohne Währung)",
                    "de-ch": "HM Verordnung Position 1 Preis (ohne Währung)"
                },
                "model": "activity",
                "type": "Number"
            },
            "utRemedy2Name": {
                "schema": "activity",
                "path": "utRemedy2Name",
                "insight2": true,
                "label": {
                    "en": "utRemedy2",
                    "de": "HM Verordnung 2",
                    "de-ch": "HM Verordnung 2"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy2Item": {
                "schema": "activity",
                "path": "utRemedy2Name",
                "insight2": true,
                "label": {
                    "en": "utRemedy2",
                    "de": "HM Verordnung 2",
                    "de-ch": "HM Verordnung 2"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy2Explanation": {
                "schema": "activity",
                "path": "utRemedy2Explanation",
                "insight2": true,
                "label": {
                    "en": "utRemedy2Explanation",
                    "de": "HM Verordnung 2 Erklärung",
                    "de-ch": "HM Verordnung 2 Erklärung"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy2Seasons": {
                "schema": "activity",
                "path": "utRemedy2Seasons",
                "insight2": true,
                "label": {
                    "en": "utRemedy2Seasons",
                    "de": "HM Sitzungen 2",
                    "de-ch": "HM Sitzungen 2"
                },
                "model": "activity",
                "type": "Number"
            },
            "utRemedy2PerWeek": {
                "schema": "activity",
                "path": "utRemedy2PerWeek",
                "insight2": true,
                "label": {
                    "en": "utRemedy2Seasons",
                    "de": "HM Frequenz 2",
                    "de-ch": "HM Frequenz 2"
                },
                "model": "activity",
                "type": "String"
            },
            "utRemedy2ItemPrice": {
                "schema": "activity",
                "path": "utRemedy2ItemPrice",
                "insight2": true,
                "label": {
                    "en": "utRemedy2ItemPrice",
                    "de": "HM Verordnung Position 2 Preis",
                    "de-ch": "HM Verordnung Position 2 Preis"
                },
                "model": "activity",
                "type": "Number"
            },
            "utRemedy2ItemPricePlain": {
                "schema": "activity",
                "path": "utRemedy2ItemPrice",
                "insight2": true,
                "label": {
                    "en": "utRemedy2ItemPrice (plain)",
                    "de": "HM Verordnung Position 2 Preis (ohne Währung)",
                    "de-ch": "HM Verordnung Position 2 Preis (ohne Währung)"
                },
                "model": "activity",
                "type": "Number"
            },
            "utVocalTherapy": {
                "schema": "activity",
                "path": "utVocalTherapy",
                "insight2": true,
                "label": {
                    "en": "utVocalTherapy",
                    "de": "HM Stimmtherapie",
                    "de-ch": "HM Stimmtherapie"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utSpeakTherapy": {
                "schema": "activity",
                "path": "utSpeakTherapy",
                "insight2": true,
                "label": {
                    "en": "utSpeakTherapy",
                    "de": "HM Sprechtherapie",
                    "de-ch": "HM Sprechtherapie"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utSpeechTherapy": {
                "schema": "activity",
                "path": "utSpeechTherapy",
                "insight2": true,
                "label": {
                    "en": "utSpeechTherapy",
                    "de": "HM Sprachtherapie",
                    "de-ch": "HM Sprachtherapie"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utAgreement": {
                "schema": "activity",
                "path": "utAgreement",
                "insight2": true,
                "label": {
                    "en": "UT Agreement",
                    "de": "HM Zustimmung",
                    "de-ch": "HM Zustimmung"
                },
                "model": "activity",
                "type": "String"
            },
            "utAgreementApprovedTill": {
                "schema": "activity",
                "path": "utAgreementApprovedTill",
                "insight2": true,
                "label": {
                    "en": "Genehmigung des langfristigen Heilmittelbedarfs bis",
                    "de": "Genehmigung des langfristigen Heilmittelbedarfs bis",
                    "de-ch": "Genehmigung des langfristigen Heilmittelbedarfs bis"
                },
                "model": "activity",
                "type": "Date"
            },
            "utFirst": {
                "type": "Boolean",
                "label": {
                    "en": "Not home visit",
                    "de": "HM Erstverordnung",
                    "de-ch": "HM Erstverordnung"
                },
                "insight2": true
            },
            "utFollowing": {
                "type": "Boolean",
                "label": {
                    "en": "Not home visit",
                    "de": "HM Folgeverordnung",
                    "de-ch": "HM Folgeverordnung"
                },
                "insight2": true
            },
            "utPrescriptionType": {
                "type": "String",
                "label": {
                    "en": "UT Prescription type",
                    "de": "HM Verordnungstyp",
                    "de-ch": "HM Verordnungstyp"
                },
                "insight2": true
            },
            "utIcdCode": {
                "type": "String",
                "label": {
                    "en": "UT ICD Code",
                    "de": "HM ICD Code",
                    "de-ch": "HM ICD Code"
                },
                "insight2": true
            },
            "utSecondIcdCode": {
                "type": "String",
                "label": {
                    "en": "UT Secondary ICD Code (utility)",
                    "de": "HM Sekundärer ICD Code",
                    "de-ch": "HM Sekundärer ICD Code"
                },
                "insight2": true
            },
            "utNoNormalCase": {
                "schema": "activity",
                "path": "utNoNormalCase",
                "insight2": true,
                "label": {
                    "en": "utNoNormalCase",
                    "de": "HM Kein Regelfall",
                    "de-ch": "HM Kein Regelfall"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utHomeVisit": {
                "schema": "activity",
                "path": "utHomeVisit",
                "insight2": true,
                "label": {
                    "en": "utHomeVisit",
                    "de": "HM Hausbesuch",
                    "de-ch": "HM Hausbesuch"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utNotHomeVisit": {
                "type": "String",
                "label": {
                    "en": "Not home visit",
                    "de": "HM Kein Hausbesuch",
                    "de-ch": "HM Kein Hausbesuch"
                },
                "insight2": true
            },
            "utTherapyReport": {
                "schema": "activity",
                "path": "utTherapyReport",
                "insight2": true,
                "label": {
                    "en": "utTherapyReport",
                    "de": "HM Ist Bericht",
                    "de-ch": "HM Ist Bericht"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utNotTherapyReport": {
                "type": "String",
                "label": {
                    "en": "Not Therapy Report",
                    "de": "HM kein Therapie Bericht",
                    "de-ch": "HM kein Therapie Bericht"
                },
                "insight2": true
            },
            "utGroupTherapy": {
                "schema": "activity",
                "path": "utGroupTherapy",
                "insight2": true,
                "label": {
                    "en": "utGroupTherapy",
                    "de": "HM Ist Gruppentherapie",
                    "de-ch": "HM Ist Gruppentherapie"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utDurationOfSeason": {
                "schema": "activity",
                "path": "utDurationOfSeason",
                "insight2": true,
                "label": {
                    "en": "utDurationOfSeason",
                    "de": "HM Dauer",
                    "de-ch": "HM Dauer"
                },
                "model": "activity",
                "type": "Number"
            },
            "utLatestStartOfTreatment": {
                "schema": "activity",
                "path": "utLatestStartOfTreatment",
                "insight2": true,
                "label": {
                    "en": "utLatestStartOfTreatment",
                    "de": "HM Behandlungsstart",
                    "de-ch": "HM Behandlungsstart"
                },
                "model": "activity",
                "type": "Date"
            },
            "utMedicalJustification": {
                "schema": "activity",
                "path": "utMedicalJustification",
                "insight2": true,
                "label": {
                    "en": "utMedicalJustification",
                    "de": "HM Begründung",
                    "de-ch": "HM Begründung"
                },
                "model": "activity",
                "type": "String"
            },
            "utTherapyGoals": {
                "schema": "activity",
                "path": "utTherapyGoals",
                "insight2": true,
                "label": {
                    "en": "utTherapyGoals",
                    "de": "HM Ziele",
                    "de-ch": "HM Ziele"
                },
                "model": "activity",
                "type": "String"
            },
            "utUnfall": {
                "schema": "activity",
                "path": "utUnfall",
                "insight2": true,
                "label": {
                    "en": "Unfall",
                    "de": "Unfall",
                    "de-ch": "Unfall"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utBvg": {
                "type": "String",
                "label": {
                    "en": "HM BVG",
                    "de": "HM BVG",
                    "de-ch": "HM BVG"
                },
                "insight2": true
            },
            "utNeuroFinding": {
                "schema": "activity",
                "path": "utNeuroFinding",
                "insight2": true,
                "label": {
                    "en": "HM Neurologische, pädiatrische Besonderheiten",
                    "de": "HM Neurologische, pädiatrische Besonderheiten",
                    "de-ch": "HM Neurologische, pädiatrische Besonderheiten"
                },
                "model": "activity",
                "type": "String"
            },
            "utAudioDiagDate": {
                "schema": "activity",
                "path": "utAudioDiagDate",
                "insight2": true,
                "label": {
                    "en": "HM Tonaudiodiagramm vom",
                    "de": "HM Tonaudiodiagramm vom",
                    "de-ch": "HM Tonaudiodiagramm vom"
                },
                "model": "activity",
                "type": "Date"
            },
            "utAudioDiagReact": {
                "schema": "activity",
                "path": "utAudioDiagReact",
                "insight2": true,
                "label": {
                    "en": "HM Freifeldbefunde ermittelt durch Reaktion",
                    "de": "HM Freifeldbefunde ermittelt durch Reaktion",
                    "de-ch": "HM Freifeldbefunde ermittelt durch Reaktion"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utAudioDiagCond": {
                "schema": "activity",
                "path": "utAudioDiagCond",
                "insight2": true,
                "label": {
                    "en": "HM Freifeldbefunde ermittelt durch Konditionierung",
                    "de": "HM Freifeldbefunde ermittelt durch Konditionierung",
                    "de-ch": "HM Freifeldbefunde ermittelt durch Konditionierung"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utAudioDiagOwn": {
                "schema": "activity",
                "path": "utAudioDiagOwn",
                "insight2": true,
                "label": {
                    "en": "HM Freifeldbefunde ermittelt durch eigene Angaben",
                    "de": "HM Freifeldbefunde ermittelt durch eigene Angaben",
                    "de-ch": "HM Freifeldbefunde ermittelt durch eigene Angaben"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utLupenlaryngoskopie": {
                "schema": "activity",
                "path": "utLupenlaryngoskopie",
                "insight2": true,
                "label": {
                    "en": "HM Lupenlaryngoskopie",
                    "de": "HM Lupenlaryngoskopie",
                    "de-ch": "HM Lupenlaryngoskopie"
                },
                "model": "activity",
                "type": "String"
            },
            "utLupenstroboskopieRight": {
                "schema": "activity",
                "path": "utLupenstroboskopieRight",
                "insight2": true,
                "label": {
                    "en": "HM Lupenstroboskopie Rechts",
                    "de": "HM Lupenstroboskopie Rechts",
                    "de-ch": "HM Lupenstroboskopie Rechts"
                },
                "model": "activity",
                "type": "String"
            },
            "utLupenstroboskopieLeft": {
                "schema": "activity",
                "path": "utLupenstroboskopieLeft",
                "insight2": true,
                "label": {
                    "en": "HM Lupenstroboskopie Links",
                    "de": "HM Lupenstroboskopie Links",
                    "de-ch": "HM Lupenstroboskopie Links"
                },
                "model": "activity",
                "type": "String"
            },
            "utAmplitudeRight": {
                "schema": "activity",
                "path": "utAmplitudeRight",
                "insight2": true,
                "label": {
                    "en": "HM Amplitude Rechts",
                    "de": "HM Amplitude Rechts",
                    "de-ch": "HM Amplitude Rechts"
                },
                "model": "activity",
                "type": "String"
            },
            "utAmplitudeLeft": {
                "schema": "activity",
                "path": "utAmplitudeLeft",
                "insight2": true,
                "label": {
                    "en": "HM Amplitude Links",
                    "de": "HM Amplitude Links",
                    "de-ch": "HM Amplitude Links"
                },
                "model": "activity",
                "type": "String"
            },
            "utRandkantenverschiebungRight": {
                "schema": "activity",
                "path": "utRandkantenverschiebungRight",
                "insight2": true,
                "label": {
                    "en": "HM Randkantenverschiebung Rechts",
                    "de": "HM Randkantenverschiebung Rechts",
                    "de-ch": "HM Randkantenverschiebung Rechts"
                },
                "model": "activity",
                "type": "String"
            },
            "utRandkantenverschiebungLeft": {
                "schema": "activity",
                "path": "utRandkantenverschiebungLeft",
                "insight2": true,
                "label": {
                    "en": "HM Randkantenverschiebung Links",
                    "de": "HM Randkantenverschiebung Links",
                    "de-ch": "HM Randkantenverschiebung Links"
                },
                "model": "activity",
                "type": "String"
            },
            "utRegular": {
                "schema": "activity",
                "path": "utRegular",
                "insight2": true,
                "label": {
                    "en": "HM Regularität",
                    "de": "HM Regularität",
                    "de-ch": "HM Regularität"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utRegularNo": {
                "type": "Boolean",
                "label": {
                    "en": "UT Regularity (No)",
                    "de": "HM Regularität (nein)",
                    "de-ch": "HM Regularität (nein)"
                },
                "insight2": true
            },
            "utGlottisschluss": {
                "schema": "activity",
                "path": "utGlottisschluss",
                "insight2": true,
                "label": {
                    "en": "HM Kompletter Glottisschluss",
                    "de": "HM Kompletter Glottisschluss",
                    "de-ch": "HM Kompletter Glottisschluss"
                },
                "model": "activity",
                "type": "Boolean"
            },
            "utGlottisschlussNo": {
                "type": "Boolean",
                "label": {
                    "en": "UT  Complete glottis closure (no)",
                    "de": "HM Kompletter Glottisschluss (nein)",
                    "de-ch": "HM Kompletter Glottisschluss (nein)"
                },
                "insight2": true
            },
            "utEarDrumFindingRight": {
                "schema": "activity",
                "path": "utEarDrumFindingRight",
                "insight2": true,
                "label": {
                    "en": "HM Trommelfellbefund Rechts",
                    "de": "HM Trommelfellbefund Rechts",
                    "de-ch": "HM Trommelfellbefund Rechts"
                },
                "model": "activity",
                "type": "String"
            },
            "utEarDrumFindingLeft": {
                "schema": "activity",
                "path": "utEarDrumFindingLeft",
                "insight2": true,
                "label": {
                    "en": "HM Trommelfellbefund Links",
                    "de": "HM Trommelfellbefund Links",
                    "de-ch": "HM Trommelfellbefund Links"
                },
                "model": "activity",
                "type": "String"
            },
            "utUtility1Position1Name": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 1 Position 1 Name",
                    "de": "HM Heilmittel 1 Position 1 Name",
                    "de-ch": "HM Heilmittel 1 Position 1 Name"
                }
            },
            "utUtility1Position1Price": {
                "type": "Number",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 1 Position 1 Preis",
                    "de": "HM Heilmittel 1 Position 1 Preis",
                    "de-ch": "HM Heilmittel 1 Position 1 Preis"
                }
            },
            "utUtility1Position2Name": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 1 Position 2 Name",
                    "de": "HM Heilmittel 1 Position 2 Name",
                    "de-ch": "HM Heilmittel 1 Position 2 Name"
                }
            },
            "utUtility1Position2Price": {
                "type": "Number",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 1 Position 2 Preis",
                    "de": "HM Heilmittel 1 Position 2 Preis",
                    "de-ch": "HM Heilmittel 1 Position 2 Preis"
                }
            },
            "utUtility1Position3Name": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 1 Position 3 Name",
                    "de": "HM Heilmittel 1 Position 3 Name",
                    "de-ch": "HM Heilmittel 1 Position 3 Name"
                }
            },
            "utUtility1Position3Price": {
                "type": "Number",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 1 Position 3 Preis",
                    "de": "HM Heilmittel 1 Position 3 Preis",
                    "de-ch": "HM Heilmittel 1 Position 3 Preis"
                }
            },
            "utUtility2Position1Name": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 2 Position 1 Name",
                    "de": "HM Heilmittel 2 Position 1 Name",
                    "de-ch": "HM Heilmittel 2 Position 1 Name"
                }
            },
            "utUtility2Position1Price": {
                "type": "Number",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 2 Position 1 Preis",
                    "de": "HM Heilmittel 2 Position 1 Preis",
                    "de-ch": "HM Heilmittel 2 Position 1 Preis"
                }
            },
            "utUtility2Position2Name": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 2 Position 2 Name",
                    "de": "HM Heilmittel 2 Position 2 Name",
                    "de-ch": "HM Heilmittel 2 Position 2 Name"
                }
            },
            "utUtility2Position2Price": {
                "type": "Number",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 2 Position 2 Preis",
                    "de": "HM Heilmittel 2 Position 2 Preis",
                    "de-ch": "HM Heilmittel 2 Position 2 Preis"
                }
            },
            "utUtility2Position3Name": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 2 Position 3 Name",
                    "de": "HM Heilmittel 2 Position 3 Name",
                    "de-ch": "HM Heilmittel 2 Position 3 Name"
                }
            },
            "utUtility2Position3Price": {
                "type": "Number",
                "insight2": true,
                "label": {
                    "en": "HM Heilmittel 2 Position 3 Preis",
                    "de": "HM Heilmittel 2 Position 3 Preis",
                    "de-ch": "HM Heilmittel 2 Position 3 Preis"
                }
            },
            "ut2Chapter": {
                "model": "activity",
                "schema": "activity",
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittelbereich",
                    "de": "HM2 Heilmittelbereich",
                    "de-ch": "HM2 Heilmittelbereich"
                }
            },
            "ut2Chapter_physio": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittelbereich Physio",
                    "de": "HM2 Heilmittelbereich Physio",
                    "de-ch": "HM2 Heilmittelbereich Physio"
                }
            },
            "ut2Chapter_podo": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittelbereich Podo",
                    "de": "HM2 Heilmittelbereich Podo",
                    "de-ch": "HM2 Heilmittelbereich Podo"
                }
            },
            "ut2Chapter_logo": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittelbereich Logo",
                    "de": "HM2 Heilmittelbereich Logo",
                    "de-ch": "HM2 Heilmittelbereich Logo"
                }
            },
            "ut2Chapter_ergo": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittelbereich Ergo",
                    "de": "HM2 Heilmittelbereich Ergo",
                    "de-ch": "HM2 Heilmittelbereich Ergo"
                }
            },
            "ut2Chapter_et": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittelbereich Ernährungstherapie",
                    "de": "HM2 Heilmittelbereich Ernährungstherapie",
                    "de-ch": "HM2 Heilmittelbereich Ernährungstherapie"
                }
            },
            "utICD": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 ICD-10-Code",
                    "de": "HM2 ICD-10-Code",
                    "de-ch": "HM2 ICD-10-Code"
                }
            },
            "utICD2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 ICD-10-Code 2",
                    "de": "HM2 ICD-10-Code 2",
                    "de-ch": "HM2 ICD-10-Code 2"
                }
            },
            "utDiagnosisText": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Diagnosentext",
                    "de": "HM2 Diagnosentext",
                    "de-ch": "HM2 Diagnosentext"
                }
            },
            "ut2DiagnosisGroupCode": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Diagnosegruppe Code",
                    "de": "HM2 Diagnosegruppe Code",
                    "de-ch": "HM2 Diagnosegruppe Code"
                }
            },
            "ut2ConductionSymptoms_a": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Leitsymptomatik a",
                    "de": "HM2 Leitsymptomatik a",
                    "de-ch": "HM2 Leitsymptomatik a"
                }
            },
            "ut2ConductionSymptoms_b": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Leitsymptomatik b",
                    "de": "HM2 Leitsymptomatik b",
                    "de-ch": "HM2 Leitsymptomatik b"
                }
            },
            "ut2ConductionSymptoms_c": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Leitsymptomatik c",
                    "de": "HM2 Leitsymptomatik c",
                    "de-ch": "HM2 Leitsymptomatik c"
                }
            },
            "ut2PatientSpecificConductionSymptoms": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 patientenindividuelle Leitsymptomatik",
                    "de": "HM2 patientenindividuelle Leitsymptomatik",
                    "de-ch": "HM2 patientenindividuelle Leitsymptomatik"
                }
            },
            "ut2ConductionSymptoms_text": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Leitsymptomatik Text",
                    "de": "HM2 Leitsymptomatik  Text",
                    "de-ch": "HM2 Leitsymptomatik  Text"
                }
            },
            "ut2UnitsSum": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Verordnungsmenge der Verordnung",
                    "de": "HM2 Verordnungsmenge der Verordnung",
                    "de-ch": "HM2 Verordnungsmenge der Verordnung"
                }
            },
            "ut2PriceSum": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Gesamtpreis der Verordnung",
                    "de": "HM2 Gesamtpreis der Verordnung",
                    "de-ch": "HM2 Gesamtpreis der Verordnung"
                }
            },
            "ut2PrimaryRemedy": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Vorranige(s) Heilmittel (komplett)",
                    "de": "HM2 Vorranige(s) Heilmittel (komplett)",
                    "de-ch": "HM2 Vorranige(s) Heilmittel (komplett)"
                }
            },
            "ut2AdditionalRemedy": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Ergänzendes Heilmittel (komplett)",
                    "de": "HM2 Ergänzendes Heilmittel (komplett)",
                    "de-ch": "HM2 Ergänzendes Heilmittel (komplett)"
                }
            },
            "ut2RemedyStandardizedCombination": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Standardisierte Heilmittelkombination (komplett)",
                    "de": "HM2 Standardisierte Heilmittelkombination (komplett)",
                    "de-ch": "HM2 Standardisierte Heilmittelkombination (komplett)"
                }
            },
            "ut2RemedyPosition1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 1",
                    "de": "HM2 Heilmittel Position 1",
                    "de-ch": "HM2 Heilmittel Position 1"
                }
            },
            "ut2HasBlankRegulation": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Blankoverordnung",
                    "de": "HM2 Blankoverordnung",
                    "de-ch": "HM2 Blankoverordnung"
                }
            },
            "ut2HasAgreementBVB": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 BVB",
                    "de": "HM2 BVB",
                    "de-ch": "HM2 BVB"
                }
            },
            "ut2HasAgreementLHM": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 LHM",
                    "de": "HM2 LHM",
                    "de-ch": "HM2 LHM"
                }
            },
            "ut2HasApproval": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Patientenspezifischen Genehmigung des langfristigen Heilmittelbedarfs",
                    "de": "HM2 Patientenspezifischen Genehmigung des langfristigen Heilmittelbedarfs",
                    "de-ch": "HM2 Patientenspezifischen Genehmigung des langfristigen Heilmittelbedarfs"
                }
            },
            "ut2HasTherapyReport": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Therapiebericht",
                    "de": "HM2 Therapiebericht",
                    "de-ch": "HM2 Therapiebericht"
                }
            },
            "ut2HasHomeVisit": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Hausbesuch",
                    "de": "HM2 Hausbesuch",
                    "de-ch": "HM2 Hausbesuch"
                }
            },
            "ut2RemedyPosition1Text": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 1 Text",
                    "de": "HM2 Heilmittel Position 1 Text",
                    "de-ch": "HM2 Heilmittel Position 1 Text"
                }
            },
            "ut2RemedyPosition1Unit": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 1 Einheiten",
                    "de": "HM2 Heilmittel Position 1 Einheiten",
                    "de-ch": "HM2 Heilmittel Position 1 Einheiten"
                }
            },
            "ut2RemedyPosition2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 2",
                    "de": "HM2 Heilmittel Position 2",
                    "de-ch": "HM2 Heilmittel Position 2"
                }
            },
            "ut2RemedyPosition2Text": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 2 Text",
                    "de": "HM2 Heilmittel Position 2 Text",
                    "de-ch": "HM2 Heilmittel Position 2 Text"
                }
            },
            "ut2RemedyPosition2Unit": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 2 Einheiten",
                    "de": "HM2 Heilmittel Position 2 Einheiten",
                    "de-ch": "HM2 Heilmittel Position 2 Einheiten"
                }
            },
            "ut2RemedyPosition3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 3",
                    "de": "HM2 Heilmittel Position 3",
                    "de-ch": "HM2 Heilmittel Position 3"
                }
            },
            "ut2RemedyPosition3Text": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 3 Text",
                    "de": "HM2 Heilmittel Position 3 Text",
                    "de-ch": "HM2 Heilmittel Position 3 Text"
                }
            },
            "ut2RemedyPosition3Unit": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Heilmittel Position 3 Einheiten",
                    "de": "HM2 Heilmittel Position 3 Einheiten",
                    "de-ch": "HM2 Heilmittel Position 3 Einheiten"
                }
            },
            "ut2AdditionalRemedyPosition": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Ergänzendes Heilmittel Position",
                    "de": "HM2 Ergänzendes Heilmittel Position",
                    "de-ch": "HM2 Ergänzendes Heilmittel Position"
                }
            },
            "ut2AdditionalRemedyPositionText": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Ergänzendes Heilmittel Position Text",
                    "de": "HM2 Ergänzendes Heilmittel Position Text",
                    "de-ch": "HM2 Ergänzendes Heilmittel Position Text"
                }
            },
            "ut2AdditionalRemedyPositionUnit": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Ergänzendes Heilmittel Position Einheiten",
                    "de": "HM2 Ergänzendes Heilmittel Position Einheiten",
                    "de-ch": "HM2 Ergänzendes Heilmittel Position Einheiten"
                }
            },
            "ut2UrgentNeedForAction": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "HM2 Dringender Behandlungsbedarf",
                    "de": "HM2 Dringender Behandlungsbedarf",
                    "de-ch": "HM2 Dringender Behandlungsbedarf"
                }
            },
            "ut2TherapyFrequency": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "HM2 Therapiefrequenz",
                    "de": "HM2 Therapiefrequenz",
                    "de-ch": "HM2 Therapiefrequenz"
                }
            },
            "content": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Document Content Description",
                    "de": "Akteninhalt Beschreibung",
                    "de-ch": "Akteninhalt Beschreibung"
                }
            },
            "code": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Code / Digit",
                    "de": "Code / Ziffern",
                    "de-ch": "Code / Ziffern"
                },
                "searchAsArrayOfValues": true
            },
            "userTitle": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "User title",
                    "de": "Benutzer Titel",
                    "de-ch": "Benutzer Titel"
                }
            },
            "userNameaffix": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "User nameaffix",
                    "de": "Benutzer Namenszusatz",
                    "de-ch": "Benutzer Namenszusatz"
                }
            },
            "userFirstname": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "User firstname",
                    "de": "Benutzer Vorname",
                    "de-ch": "Benutzer Vorname"
                }
            },
            "userLastname": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "User lastname",
                    "de": "Benutzer Nachname",
                    "de-ch": "Benutzer Nachname"
                }
            },
            "userDepartment": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "User department",
                    "de": "Benutzer Abteilung",
                    "de-ch": "Benutzer Abteilung"
                }
            },
            "userWorkDescription": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "User work description",
                    "de": "Benutzer Jobbezeichnung",
                    "de-ch": "Benutzer Jobbezeichnung"
                }
            },
            "scheinDiagnosis": {
                "schema": "activity",
                "path": "scheinDiagnosis",
                "insight2": true,
                "label": {
                    "en": "Diagnosis (Text)",
                    "de": "Diagnose/Verdacht (Text)",
                    "de-ch": "Diagnose/Verdacht (Text)"
                },
                "model": "activity",
                "type": "String"
            },
            "scheinOrder": {
                "schema": "activity",
                "path": "scheinOrder",
                "insight2": true,
                "label": {
                    "en": "Order",
                    "de": "Auftrag",
                    "de-ch": "Auftrag"
                },
                "model": "activity",
                "type": "String"
            },
            "scheinDayOfAccident": {
                "schema": "activity",
                "path": "dayOfAccident",
                "insight2": true,
                "label": {
                    "en": "day of accident",
                    "de": "Unfalltag",
                    "de-ch": "Unfalltag"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinTimeOfAccident": {
                "schema": "activity",
                "path": "timeOfAccident",
                "insight2": true,
                "label": {
                    "en": "time of accident",
                    "de": "Unfalluhrzeit",
                    "de-ch": "Unfalluhrzeit"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinDayOfArrivalt": {
                "schema": "activity",
                "path": "dayOfArrival",
                "insight2": true,
                "label": {
                    "en": "day of arrival",
                    "de": "eingetroffen in Praxis am",
                    "de-ch": "eingetroffen in Praxis am"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinTimeOfArrival": {
                "schema": "activity",
                "path": "timeOfArrival",
                "insight2": true,
                "label": {
                    "en": "day of arrival",
                    "de": "eingetroffen in Praxis um",
                    "de-ch": "eingetroffen in Praxis um"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinDayOfFristTreat": {
                "schema": "activity",
                "path": "dayOfFristTreat",
                "insight2": true,
                "label": {
                    "en": "day of frist treat",
                    "de": "erstmalig behandelt am",
                    "de-ch": "erstmalig behandelt am"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinFristTreatPhysician": {
                "type": "String",
                "insight2": true,
                "path": "fristTreatPhysician",
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "First time treated by",
                    "de": "erstmalig behandelt durch",
                    "de-ch": "erstmalig behandelt durch"
                }
            },
            "scheinWorkingHoursStart": {
                "schema": "activity",
                "path": "workingHoursStart",
                "insight2": true,
                "label": {
                    "en": "working hours start",
                    "de": "Beginn Arbeitszeit",
                    "de-ch": "Beginn Arbeitszeit"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinWorkingHoursEnd": {
                "schema": "activity",
                "path": "workingHoursEnd",
                "insight2": true,
                "label": {
                    "en": "working hours end",
                    "de": "Ende Arbeitszeit",
                    "de-ch": "Ende Arbeitszeit"
                },
                "model": "activity",
                "type": "Date"
            },
            "scheinBgAhb": {
                "type": "Boolean",
                "path": "uvGoaeType",
                "schema": "activity",
                "model": "activity",
                "insight2": true,
                "label": {
                    "en": "General medical treatment",
                    "de": "Allgemeine Heilbehandlung",
                    "de-ch": "Allgemeine Heilbehandlung"
                }
            },
            "scheinBgBhb": {
                "type": "Boolean",
                "insight2": true,
                "path": "uvGoaeType",
                "schema": "activity",
                "model": "activity",
                "label": {
                    "en": "Special curative treatment",
                    "de": "Besondere Heilbehandlung",
                    "de-ch": "Besondere Heilbehandlung"
                }
            },
            "auVonBG": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "AU von (BG)",
                    "de": "AU von (BG)",
                    "de-ch": "AU von (BG)"
                }
            },
            "auVorraussichtlichBisBG": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "AU expected to(BG)",
                    "de": "AU voraussichtlich bis (BG)",
                    "de-ch": "AU voraussichtlich bis (BG)"
                }
            },
            "bestPatientPhone": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Best phone number. Patient",
                    "de": "Beste Telefonnr. Patient",
                    "de-ch": "Beste Telefonnr. Patient"
                }
            },
            "patPhone": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Patient, Telefon",
                    "de": "Patient, Telefon",
                    "de-ch": "Patient, Telefon"
                }
            },
            "patEmail": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Patient, E-Mail",
                    "de": "Patient, E-Mail",
                    "de-ch": "Patient, E-Mail"
                }
            },
            "patFax": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Patient, Fax",
                    "de": "Patient, Fax",
                    "de-ch": "Patient, Fax"
                }
            },
            "patHttp": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Patient, Internetadresse",
                    "de": "Patient, Internetadresse",
                    "de-ch": "Patient, Internetadresse"
                }
            },
            "scheinAccidentCompany": {
                "type": "String",
                "insight2": true,
                "path": "accidentCompany",
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Accident company name",
                    "de": "Unfallbetrieb Firmenname",
                    "de-ch": "Unfallbetrieb Firmenname"
                }
            },
            "scheinAccidentCompanyCity": {
                "type": "String",
                "insight2": true,
                "path": "accidentCompanyCity",
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Accident company city",
                    "de": "Unfallbetrieb Ort",
                    "de-ch": "Unfallbetrieb Ort"
                }
            },
            "scheinAccidentCompanyPLZ": {
                "type": "String",
                "insight2": true,
                "path": "accidentCompanyPLZ",
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Accident company postal code",
                    "de": "Unfallbetrieb Postleitzahl",
                    "de-ch": "Unfallbetrieb Postleitzahl"
                }
            },
            "scheinAccidentCompanyStreetHouseno": {
                "type": "String",
                "insight2": true,
                "path": "accidentCompanyStreet",
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Accident company Street and House Number",
                    "de": "Unfallbetrieb Strasse+Hausnummer",
                    "de-ch": "Unfallbetrieb Strasse+Hausnummer"
                }
            },
            "assistive1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Assistive tools 1",
                    "de": "Hilfsmittel 1",
                    "de-ch": "Hilfsmittel 1"
                }
            },
            "assistive2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Assistive tools 2",
                    "de": "Hilfsmittel 2",
                    "de-ch": "Hilfsmittel 2"
                }
            },
            "assistive3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Assistive tools 3",
                    "de": "Hilfsmittel 3",
                    "de-ch": "Hilfsmittel 3"
                }
            },
            "assistive1All": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Assistive Tools such as the form Entry 1",
                    "de": "Hilfsmittel 1 wie Formulareintrag",
                    "de-ch": "Hilfsmittel 1 wie Formulareintrag"
                }
            },
            "assistive2All": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Assistive Tools such as the form Entry 2",
                    "de": "Hilfsmittel 2 wie Formulareintrag",
                    "de-ch": "Hilfsmittel 2 wie Formulareintrag"
                }
            },
            "assistive3All": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Assistive Tools such as the form Entry 3",
                    "de": "Hilfsmittel 3 wie Formulareintrag",
                    "de-ch": "Hilfsmittel 3 wie Formulareintrag"
                }
            },
            "assistiveDose1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Aid amount 1",
                    "de": "Hilfsmittel Menge 1",
                    "de-ch": "Hilfsmittel Menge 1"
                }
            },
            "assistiveDose2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Aid amount 2",
                    "de": "Hilfsmittel Menge 2",
                    "de-ch": "Hilfsmittel Menge 2"
                }
            },
            "assistiveDose3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Aid amount 3",
                    "de": "Hilfsmittel Menge 3",
                    "de-ch": "Hilfsmittel Menge 3"
                }
            },
            "assistivePrescPeriod1": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Prescription Period 1",
                    "de": "Hilfsmittel Verordnungszeitraum 1",
                    "de-ch": "Hilfsmittel Verordnungszeitraum 1"
                }
            },
            "assistivePrescPeriod2": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Prescription Period 2",
                    "de": "Hilfsmittel Verordnungszeitraum 2",
                    "de-ch": "Hilfsmittel Verordnungszeitraum 2"
                }
            },
            "assistivePrescPeriod3": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Prescription Period 3",
                    "de": "Hilfsmittel Verordnungszeitraum 3",
                    "de-ch": "Hilfsmittel Verordnungszeitraum 3"
                }
            },
            "daleUvInsuranceId": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Dale UV GKV IKNR",
                    "de": "Dale UV GKV IKNR",
                    "de-ch": "Dale UV GKV IKNR"
                }
            },
            "daleUvInsuranceName": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Dale UV GKV Insurance Name",
                    "de": "Dale UV GKV Kostenträgername",
                    "de-ch": "Dale UV GKV Kostenträgername"
                }
            },
            "careDegree": {
                "schema": "patient",
                "path": "careDegree",
                "insight2": true,
                "label": {
                    "en": "Care Degree",
                    "de": "Pflegegrad",
                    "de-ch": "Pflegegrad"
                },
                "model": "patient",
                "type": "String"
            },
            "labRequestId": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Request ID",
                    "de": "Anforderungs-Ident",
                    "de-ch": "Anforderungs-Ident"
                }
            },
            "receiptNo": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Receipt No",
                    "de": "Quittungsnummer",
                    "de-ch": "Quittungsnummer"
                }
            },
            "invoiceText": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Receipts invoice text",
                    "de": "Quittungs Rechnungsbeschreibung",
                    "de-ch": "Quittungs Rechnungsbeschreibung"
                }
            },
            "amount": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Receipt amount",
                    "de": "Quittungsbetrag",
                    "de-ch": "Quittungsbetrag"
                }
            },
            "hasOP": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "hasOP",
                    "de": "hasOP",
                    "de-ch": "hasOP"
                }
            },
            "taskTitle": {
                "insight2": true,
                "type": "String",
                "model": "task",
                "label": {
                    "en": "Title",
                    "de": "Titel",
                    "de-ch": "Titel"
                },
                "searchAsArrayOfValues": true
            },
            "details": {
                "insight2": true,
                "model": "task",
                "type": "String",
                "label": {
                    "en": "Details",
                    "de": "Details",
                    "de-ch": "Details"
                }
            },
            "roles": {
                "insight2": true,
                "model": "task",
                "type": "String",
                "label": {
                    "en": "Roles",
                    "de": "Roles",
                    "de-ch": "Roles"
                }
            },
            "allDay": {
                "insight2": true,
                "model": "task",
                "type": "Boolean",
                "label": {
                    "en": "All day",
                    "de": "Ganztägig",
                    "de-ch": "Ganztägig"
                }
            },
            "taskStatus": {
                "insight2": true,
                "model": "task",
                "type": "String",
                "label": {
                    "en": "Status",
                    "de": "Status",
                    "de-ch": "Status"
                }
            },
            "urgency": {
                "type": "String",
                "insight2": true,
                "model": "task",
                "label": {
                    "en": "Urgency",
                    "de": "Dringlichkeit",
                    "de-ch": "Dringlichkeit"
                }
            },
            "start": {
                "insight2": true,
                "model": "schedule",
                "type": "DateTime",
                "label": {
                    "en": "Start Date",
                    "de": "Beginn",
                    "de-ch": "Beginn"
                }
            },
            "end": {
                "insight2": true,
                "model": "schedule",
                "type": "DateTime",
                "label": {
                    "en": "End Date",
                    "de": "Ende",
                    "de-ch": "Ende"
                }
            },
            "doctorStart": {
                "insight2": true,
                "model": "schedule",
                "type": "DateTime",
                "label": {
                    "en": "Doctor Start",
                    "de": "Arzt Start",
                    "de-ch": "Arzt Start"
                }
            },
            "doctorEnd": {
                "insight2": true,
                "model": "schedule",
                "type": "DateTime",
                "label": {
                    "en": "Doctor End",
                    "de": "Arzt Ende",
                    "de-ch": "Arzt Ende"
                }
            },
            "userDescr": {
                "insight2": true,
                "model": "schedule",
                "type": "String",
                "label": {
                    "en": "Description",
                    "de": "Bezeichnung",
                    "de-ch": "Bezeichnung"
                },
                "searchAsArrayOfValues": true
            },
            "catalogShort": {
                "insight2": true,
                "model": "activity",
                "type": "String",
                "label": {
                    "en": "Catalog",
                    "de": "Katalog",
                    "de-ch": "Katalog"
                }
            },
            "caseFolderId": {
                "required": false,
                "type": "String",
                "insight2": true,
                "inpacs": true,
                "model": "virtualFields",
                "label": {
                    "en": "Case folder ID",
                    "de": "Fallordner ID",
                    "de-ch": "Fallordner ID"
                }
            },
            "caseFolderType": {
                "insight2": true,
                "inpacs": true,
                "schema": "casefolder",
                "path": "type",
                "model": "casefolder",
                "label": {
                    "en": "Invoice",
                    "de": "Abrechnung",
                    "de-ch": "Abrechnung"
                },
                "type": "string"
            },
            "caseFolderAdditionalType": {
                "insight2": true,
                "inpacs": true,
                "schema": "casefolder",
                "path": "additionalType",
                "model": "casefolder",
                "label": {
                    "en": "Type",
                    "de": "zusätzl. Typ",
                    "de-ch": "zusätzl. Typ"
                },
                "type": "String"
            },
            "eta": {
                "insight2": true,
                "model": "schedule",
                "type": "Date",
                "label": {
                    "en": "Scheduled Start Time",
                    "de": "Geplante Startzeit",
                    "de-ch": "Geplante Startzeit"
                }
            },
            "pushtime": {
                "insight2": true,
                "model": "schedule",
                "type": "Date",
                "label": {
                    "en": "Push time",
                    "de": "Schieben",
                    "de-ch": "Schieben"
                }
            },
            "calltime": {
                "insight2": true,
                "model": "schedule",
                "type": "Date",
                "label": {
                    "en": "Call time",
                    "de": "Anrufzeit",
                    "de-ch": "Anrufzeit"
                }
            },
            "alertTime": {
                "insight2": true,
                "model": "schedule",
                "type": "Date",
                "label": {
                    "en": "Alert Time",
                    "de": "Zieldatum",
                    "de-ch": "Zieldatum"
                }
            },
            "adhoc": {
                "insight2": true,
                "model": "schedule",
                "type": "Boolean",
                "label": {
                    "en": "adhoc",
                    "de": "adhoc",
                    "de-ch": "adhoc"
                }
            },
            "group": {
                "insight2": true,
                "model": "schedule",
                "type": "Boolean",
                "label": {
                    "en": "Group",
                    "de": "Gruppe",
                    "de-ch": "Gruppe"
                }
            },
            "closeTime": {
                "insight2": true,
                "model": "schedule",
                "type": "Boolean",
                "label": {
                    "en": "Close Time",
                    "de": "Sperrzeiten",
                    "de-ch": "Sperrzeiten"
                }
            },
            "duration": {
                "insight2": true,
                "model": "schedule",
                "type": "Number",
                "label": {
                    "en": "Duration",
                    "de": "Dauer",
                    "de-ch": "Dauer"
                }
            },
            "allCalDay": {
                "insight2": true,
                "model": "schedule",
                "type": "Boolean",
                "label": {
                    "en": "All day",
                    "de": "Ganztägig",
                    "de-ch": "Ganztägig"
                }
            },
            "scheduletypePopulated": {
                "insight2": true,
                "model": "schedule",
                "type": "String",
                "label": {
                    "en": "Schedule type",
                    "de": "Eintragsart",
                    "de-ch": "Eintragsart"
                }
            },
            "plannedDuration": {
                "insight2": true,
                "model": "schedule",
                "type": "Number",
                "label": {
                    "en": "Planned Duration",
                    "de": "Plan Dauer",
                    "de-ch": "Plan Dauer"
                }
            },
            "number": {
                "insight2": true,
                "model": "schedule",
                "type": "Number",
                "label": {
                    "en": "number",
                    "de": "Nummer",
                    "de-ch": "Nummer"
                }
            },
            "lastEditedDate": {
                "insight2": true,
                "model": "schedule",
                "type": "Date",
                "label": {
                    "en": "Last Edited Date",
                    "de": "letzte Änderung",
                    "de-ch": "letzte Änderung"
                }
            },
            "isFromPortal": {
                "insight2": true,
                "model": "schedule",
                "type": "Boolean",
                "label": {
                    "en": "From the Patient Portal",
                    "de": "vom Patientenportal",
                    "de-ch": "vom Patientenportal"
                }
            },
            "arrivalTime": {
                "insight2": true,
                "model": "schedule",
                "type": "DateTime",
                "label": {
                    "en": "Arrival Time",
                    "de": "Ankunftszeit",
                    "de-ch": "Ankunftszeit"
                }
            },
            "url": {
                "insight2": true,
                "model": "schedule",
                "type": "String",
                "label": {
                    "en": "url",
                    "de": "Internetadresse",
                    "de-ch": "Internetadresse"
                }
            },
            "scheduled": {
                "insight2": true,
                "model": "schedule",
                "type": "Number",
                "label": {
                    "en": "Scheduled",
                    "de": "Bestimmt",
                    "de-ch": "Bestimmt"
                }
            },
            "waitingTime": {
                "insight2": true,
                "model": "schedule",
                "type": "Number",
                "label": {
                    "en": "Waiting Time",
                    "de": "Wartezeit",
                    "de-ch": "Wartezeit"
                }
            },
            "scheduleDetails": {
                "insight2": true,
                "model": "schedule",
                "type": "String",
                "label": {
                    "en": "Details",
                    "de": "Details",
                    "de-ch": "Details"
                }
            },
            "calName": {
                "insight2": true,
                "model": "calendar",
                "type": "String",
                "label": {
                    "en": "Name",
                    "de": "Name",
                    "de-ch": "Name"
                },
                "searchAsArrayOfValues": true
            },
            "scheduletypeName": {
                "insight2": true,
                "model": "schedule",
                "type": "String",
                "label": {
                    "en": "Type of event",
                    "de": "Terminart",
                    "de-ch": "Terminart"
                },
                "searchAsArrayOfValues": true
            },
            "ageGroup": {
                "type": "Number",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Age group",
                    "de": "Alter",
                    "de-ch": "Alter"
                }
            },
            "mediCode": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "Medication code",
                    "de": "mediCode",
                    "de-ch": "mediCode"
                }
            },
            "diagCode": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "Diagnosis code",
                    "de": "diagCode",
                    "de-ch": "diagCode"
                }
            },
            "treatCode": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "Treatment code",
                    "de": "treatCode",
                    "de-ch": "treatCode"
                }
            },
            "diagnosis": {
                "type": "String",
                "insight2": true,
                "label": {
                    "de": "Diagnosen",
                    "en": "Diagnoses",
                    "de-ch": "Diagnosen"
                },
                "searchAsArrayOfValues": true
            },
            "treatments": {
                "type": "String",
                "insight2": true,
                "label": {
                    "de": "Leistungen",
                    "en": "Treatments",
                    "de-ch": "Leistungen"
                },
                "searchAsArrayOfValues": true
            },
            "phNLabel": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Medication",
                    "de": "Medikation",
                    "de-ch": "Medikation"
                }
            },
            "isPrescribed": {
                "type": "Boolean",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "Medication is prescribed",
                    "de": "Medikament ist verordnet",
                    "de-ch": "Medikament ist verordnet"
                }
            },
            "phPZN": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "PZN",
                    "de": "PZN",
                    "de-ch": "PZN"
                }
            },
            "phGTIN": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "GTIN",
                    "de": "GTIN",
                    "de-ch": "GTIN"
                }
            },
            "phContinuousMed": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "Medication is Continuous",
                    "de": "Dauermedikament",
                    "de-ch": "Dauermedikament"
                }
            },
            "phContinuousMedDate": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "Prescribed until",
                    "de": "Dauermedikament bis",
                    "de-ch": "Dauermedikament bis"
                }
            },
            "asvTeamnumber": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "asv Team number",
                    "de": "Asv-Team Anzahl",
                    "de-ch": "Asv-Team Anzahl"
                }
            },
            "catalogUsageId": {
                "type": "String",
                "insight2": false,
                "model": "catalogUsage",
                "label": {
                    "en": "Usage ID",
                    "de": "Verwendung ID",
                    "de-ch": "Verwendung ID"
                }
            },
            "seq": {
                "type": "String",
                "insight2": false,
                "model": "catalogUsage",
                "label": {
                    "en": "seq",
                    "de": "seq",
                    "de-ch": "seq"
                }
            },
            "catalogUsagecatalogShort": {
                "type": "String",
                "insight2": false,
                "model": "catalogUsage",
                "label": {
                    "en": "catalog Usage catalog Short",
                    "de": "Katalog Benutzung Katalog Kurze",
                    "de-ch": "Katalog Benutzung Katalog Kurze"
                }
            },
            "catalogTags": {
                "type": "String",
                "insight2": true,
                "model": "catalogUsage",
                "label": {
                    "en": "Tags",
                    "de": "Tags",
                    "de-ch": "Tags"
                },
                "searchAsArrayOfValues": true
            },
            "customerNo": {
                "type": "String",
                "insight2": true,
                "model": "practice",
                "label": {
                    "en": "Customer No",
                    "de": "Kundennummer",
                    "de-ch": "Kundennummer"
                }
            },
            "dcCustomerNo": {
                "type": "String",
                "insight2": true,
                "model": "practice",
                "label": {
                    "en": "DC Customer No",
                    "de": "KundennummerDC",
                    "de-ch": "KundennummerDC"
                }
            },
            "maternityLeaveDate": {
                "type": "String",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Maternity Leave Start Date",
                    "de": "Beginn Mutterschutz",
                    "de-ch": "Beginn Mutterschutz"
                }
            },
            "pregnancyDueDate": {
                "type": "String",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Pregnancy Due Date",
                    "de": "Errechneter Entbindungstermin",
                    "de-ch": "Errechneter Entbindungstermin"
                }
            },
            "pregnancyDueDatePicker": {
                "type": "String",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Pregnancy Due Date (DDMMYYYY)",
                    "de": "Errechneter Entbindungstermin (TTMMJJJJ)",
                    "de-ch": "Errechneter Entbindungstermin (TTMMJJJJ)"
                }
            },
            "pregnancyDueDatePickerYY": {
                "type": "String",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Pregnancy Due Date (DDMMYY)",
                    "de": "Errechneter Entbindungstermin (TTMMJJ)",
                    "de-ch": "Errechneter Entbindungstermin (TTMMJJ)"
                }
            },
            "weekOfGestation": {
                "type": "String",
                "insight2": false,
                "model": "patient",
                "label": {
                    "en": "Week of gestation",
                    "de": "Schwangerschaftswoche",
                    "de-ch": "Schwangerschaftswoche"
                }
            },
            "dosis": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "Dosage",
                    "de": "Dosis",
                    "de-ch": "Dosis"
                }
            },
            "phCompany": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "Manufacturer",
                    "de": "Hersteller",
                    "de-ch": "Hersteller"
                }
            },
            "phIngr": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "Active Ingredient",
                    "de": "Wirkstoffe",
                    "de-ch": "Wirkstoffe"
                }
            },
            "phAtc": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "en": "ATC",
                    "de": "ATC",
                    "de-ch": "ATC"
                }
            },
            "phForm": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Darreichungsform",
                    "en": "Medication form",
                    "de-ch": "Darreichungsform"
                }
            },
            "phAdditionalInfo": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Zusatzinfo",
                    "en": "Additional Info",
                    "de-ch": "Zusatzinfo"
                }
            },
            "phReason": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Grund",
                    "en": "Reason",
                    "de-ch": "Grund"
                }
            },
            "phNote": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Hinweis",
                    "en": "Note",
                    "de-ch": "Hinweis"
                }
            },
            "explanations": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Erläuterungen",
                    "en": "Explanations",
                    "de-ch": "Erläuterungen"
                }
            },
            "phUnit": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Einheit",
                    "en": "Unit",
                    "de-ch": "Einheit"
                }
            },
            "phPriceSale": {
                "type": "Number",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Preis",
                    "en": "Price",
                    "de-ch": "Preis"
                },
                "rendererName": "currencyFormat"
            },
            "phPackSize": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Packungsgröße",
                    "en": "Package Size",
                    "de-ch": "Packungsgrösse"
                }
            },
            "phSampleMed": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Mustermedikament",
                    "en": "Sample medication",
                    "de-ch": "Mustermedikament"
                }
            },
            "isDivisible": {
                "type": "String",
                "insight2": true,
                "model": "medication",
                "label": {
                    "de": "Teilbar",
                    "en": "Is divisible",
                    "de-ch": "Teilbar"
                }
            },
            "hasVat": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "VAT mandatory",
                    "de": "MwSt. pflichtig",
                    "de-ch": "MwSt. pflichtig"
                }
            },
            "billingRole": {
                "type": "Array",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "label": {
                    "en": "Billing role",
                    "de": "Abrechnungsfunktion",
                    "de-ch": "Abrechnungsfunktion"
                }
            },
            "createUniqCaseIdentNoOnInvoice": {
                "type": "Boolean",
                "insight2": true,
                "label": {
                    "en": "Use treatment ID number (FK3000)",
                    "de": "BHF-Ident (FK 3000)",
                    "de-ch": "BHF-Ident (FK 3000)"
                },
                "description": {
                    "en": "Use Treatment Identification Number for invoicing (FK 3000)",
                    "de": "Behandlungsfall-Identifikationsnummer in Abrechnung verwenden (FK 3000)",
                    "de-ch": "Behandlungsfall-Identifikationsnummer in Abrechnung verwenden (FK 3000)"
                }
            },

            //  Surgery details linked to TREATMENT activities

            "opAdditional": {//fk5023
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "OP GO numbers addition",
                    "de": "OP GO-Nummern-Zusatz",
                    "de-ch": "OP GO-Nummern-Zusatz"
                }
            },
            "opPostOpCodes": {//fk5024
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "OP GNR Additional Identifier",
                    "de": "OP GNR-Zusatzkennzeichen",
                    "de-ch": "OP GNR-Zusatzkennzeichen"
                }
            },
            "opAdmissionDate": { //fk5025
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Recorded date",
                    "de": "OP Aufnahmedatum",
                    "de-ch": "OP Aufnahmedatum"
                }
            },
            "opDischargeDate": { //fk5026
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Discharge date",
                    "de": "OP Entlassungsdatum",
                    "de-ch": "OP Entlassungsdatum"
                }
            },
            "opDate": { //fk5034
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "OP date",
                    "de": "OP-Datum",
                    "de-ch": "OP-Datum"
                }
            },
            "opCodes": { //fk5035
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "OP codes",
                    "de": "OP-Schlüssel",
                    "de-ch": "OP-Schlüssel"
                }
            },
            "opJustificationTreatment": { //fk5036
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "OP Treatment code as justification",
                    "de": "OP GNR als Begründung",
                    "de-ch": "OP GNR als Begründung"
                }
            },
            "opDuration": { //fk5037
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "OP Total incision-suture time",
                    "de": "OP Gesamt Schnitt-Naht-Zeit",
                    "de-ch": "OP Gesamt Schnitt-Naht-Zeit"
                }
            },
            "opComplications": { //fk5038
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "OP Complication",
                    "de": "OP Komplikation",
                    "de-ch": "OP Komplikation"
                }
            },
            "fk4235Date": {
                "type": "String",
                "label": {
                    "en": "Date of the certificate of recognition (from schein)",
                    "de": "Datum der Anerkennungsbescheides (von Schein)",
                    "de-ch": "Datum der Anerkennungsbescheides (von Fall)"
                }
            },
            "BFB3_Voraussichtlicher_Entbindungstermin": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB03 Voraussichtlicher Entbindungstermin",
                    "de": "BFB03 Voraussichtlicher Entbindungstermin",
                    "de-ch": "BFB03 Voraussichtlicher Entbindungstermin"
                }
            },
            "BFB3_Untersuchungsdatum": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB03 estimated date of delivery",
                    "de": "BFB03 Untersuchungsdatum",
                    "de-ch": "BFB03 Untersuchungsdatum"
                }
            },
            "BFB3_Besondere_Feststellungen": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB03 Special Findings",
                    "de": "BFB03 Besondere Feststellungen",
                    "de-ch": "BFB03 Besondere Feststellungen"
                }
            },
            "BFB4_Unfall_Unfallfolge": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Accident, accident consequence",
                    "de": "BFB04 Unfall, Unfallfolge",
                    "de-ch": "BFB04 Unfall, Unfallfolge"
                }
            },
            "BFB4_Arbeitsunfall_Berufskrankheit": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Accident at work, occupational disease",
                    "de": "BFB04 Arbeitsunfall, Berufskrankheit",
                    "de-ch": "BFB04 Arbeitsunfall, Berufskrankheit"
                }
            },
            "BFB4_Versorgungsleiden": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 supply suffering",
                    "de": "BFB04 Versorgungsleiden",
                    "de-ch": "BFB04 Versorgungsleiden"
                }
            },
            "BFB4_Hinfahrt": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 one way",
                    "de": "BFB04 Hinfahrt",
                    "de-ch": "BFB04 Hinfahrt"
                }
            },
            "BFB4_Ruckfahrt": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 return journey",
                    "de": "BFB04 Rückfahrt",
                    "de-ch": "BFB04 Rückfahrt"
                }
            },
            "BFB4_Voll_Teilstationare_Krankenhausbehandlung": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Full / inpatient hospital treatment",
                    "de": "BFB04 Voll-/Teilstationäre Krankenhausbehandlung",
                    "de-ch": "BFB04 Voll-/Teilstationäre Krankenhausbehandlung"
                }
            },
            "BFB4_Vor_Nachstationare_Behandlung": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Pre / post-treatment",
                    "de": "BFB04 Vor-/Nachstationäre Behandlung",
                    "de-ch": "BFB04 Vor-/Nachstationäre Behandlung"
                }
            },
            "BFB4_Anderer_Grund": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Other reason",
                    "de": "BFB04 Anderer Grund",
                    "de-ch": "BFB04 Anderer Grund"
                }
            },
            "BFB4_Anderer_Grund_Freitext": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB04 Other reason text",
                    "de": "BFB04 Anderer Grund Freitext",
                    "de-ch": "BFB04 Anderer Grund Freitext"
                }
            },
            "BFB4_Hochfrequente_Behandlung_Dialyse_Chemo_Strahlen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 High Frequency Treatment - Dialysis Chemo Radiation",
                    "de": "BFB04 Hochfrequente Behandlung - Dialyse Chemo Strahlen",
                    "de-ch": "BFB04 Hochfrequente Behandlung - Dialyse Chemo Strahlen"
                }
            },
            "BFB4_Hochfrequente_Behandlung_vergleichbarer_Ausnahmefall": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 High-frequency treatment - comparable exceptional case",
                    "de": "BFB04 Hochfrequente Behandlung - vergleichbarer Ausnahmefall",
                    "de-ch": "BFB04 Hochfrequente Behandlung - vergleichbarer Ausnahmefall"
                }
            },
            "BFB4_Dauerhafte_Mobilitatsbeeintrachtigung_Merkzeichen_aG_BI_H_Pflegegrad_3_mit_dauerhafter_Mobilitatsbeeintrachtigung_Pflegegrad_4_oder_5": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Permanent Mobility Impairment - \"aG\", \"BI\", \"H\", Grade 3 with Permanent Mobility Impairment, Grade 4 or 5",
                    "de": "BFB04 Dauerhafte Mobilitätsbeeinträchtigung - Merkzeichen „aG“, „BI“, „H“, Pflegegrad 3 mit dauerhafter Mobilitätsbeeinträchtigung, Pflegegrad 4 oder 5",
                    "de-ch": "BFB04 Dauerhafte Mobilitätsbeeinträchtigung - Merkzeichen „aG“, „BI“, „H“, Pflegegrad 3 mit dauerhafter Mobilitätsbeeinträchtigung, Pflegegrad 4 oder 5"
                }
            },
            "BFB4_Dauerhafte_Mobilitatsbeeintrachtigung_vergleichbare_Mobilitatsbeeintrachtigung_und_Behandlungsdauer_mindestens_6_Monate": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Permanent mobility impairment - comparable mobility impairment and duration of treatment at least 6 months",
                    "de": "BFB04 Dauerhafte Mobilitätsbeeinträchtigung - vergleichbare Mobilitätsbeeinträchtigung und Behandlungsdauer mindestens 6 Monate",
                    "de-ch": "BFB04 Dauerhafte Mobilitätsbeeinträchtigung - vergleichbare Mobilitätsbeeinträchtigung und Behandlungsdauer mindestens 6 Monate"
                }
            },
            "BFB4_Begrundung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB04 Reason",
                    "de": "BFB04 Begründung",
                    "de-ch": "BFB04 Begründung"
                }
            },
            "BFB4_Anderer_Grund_der_Fahrt_mit_KTW_erfordert": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Another reason that requires driving with KTW",
                    "de": "BFB04 Anderer Grund, der Fahrt mit KTW erfordert",
                    "de-ch": "BFB04 Anderer Grund, der Fahrt mit KTW erfordert"
                }
            },
            "BFB4_Vom_am": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB04 From / on",
                    "de": "BFB04 Vom/am",
                    "de-ch": "BFB04 Vom/am"
                }
            },
            "BFB4_X_mal_pro_Woche": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB04 X times a week",
                    "de": "BFB04 X mal pro Woche",
                    "de-ch": "BFB04 X mal pro Woche"
                }
            },
            "BFB4_Bis_voraussichtlich": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB04 Until probably",
                    "de": "BFB04 Bis voraussichtlich",
                    "de-ch": "BFB04 Bis voraussichtlich"
                }
            },
            "BFB4_Behandlungsstatte": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB04 treatment facility",
                    "de": "BFB04 Behandlungsstätte",
                    "de-ch": "BFB04 Behandlungsstätte"
                }
            },
            "BFB4_Taxi_Mietwagen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Taxi / Car Rental",
                    "de": "BFB04 Taxi/Mietwagen",
                    "de-ch": "BFB04 Taxi/Mietwagen"
                }
            },
            "BFB4_Rollstuhl": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 wheelchair",
                    "de": "BFB04 Rollstuhl",
                    "de-ch": "BFB04 Rollstuhl"
                }
            },
            "BFB4_Tragestuhl": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 carrying chair",
                    "de": "BFB04 Tragestuhl",
                    "de-ch": "BFB04 Tragestuhl"
                }
            },
            "BFB4_liegend": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 reclining",
                    "de": "BFB04 liegend",
                    "de-ch": "BFB04 liegend"
                }
            },
            "BFB4_KTW_da_medizinisch_fachliche_Betreuung_und_oder_Einrichtung_notwendig_ist_wegen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 KTW, as medical-technical support and / or equipment is necessary because of",
                    "de": "BFB04 KTW, da medizinisch-fachliche Betreuung und/oder Einrichtung notwendig ist wegen",
                    "de-ch": "BFB04 KTW, da medizinisch-fachliche Betreuung und/oder Einrichtung notwendig ist wegen"
                }
            },
            "BFB4_KTW_wegen_Begrundung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB04 KTW due to (justification)",
                    "de": "BFB04 KTW wegen (Begründung)",
                    "de-ch": "BFB04 KTW wegen (Begründung)"
                }
            },
            "BFB4_RTW": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 RTW",
                    "de": "BFB04 RTW",
                    "de-ch": "BFB04 RTW"
                }
            },
            "BFB4_NAW_NEF": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 NAW/NEF",
                    "de": "BFB04 NAW/NEF",
                    "de-ch": "BFB04 NAW/NEF"
                }
            },
            "BFB4_Andere": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB04 Other",
                    "de": "BFB04 Andere",
                    "de-ch": "BFB04 Andere"
                }
            },
            "BFB4_Andere_Freitext": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB04 Other text",
                    "de": "BFB04 Andere Freitext",
                    "de-ch": "BFB04 Andere Freitext"
                }
            },
            "BFB6diagnosesText": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB06 diagnoses text",
                    "de": "BFB06 Diagnosen",
                    "de-ch": "BFB06 Diagnosen"
                }
            },
            "BFB6findingsText": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB06 findings text",
                    "de": "BFB06 Befund",
                    "de-ch": "BFB06 Befund"
                }
            },
            "BFB6medicationsText": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB06 medications text",
                    "de": "BFB06 Medikamente",
                    "de-ch": "BFB06 Medikamente"
                }
            },
            "BFB9_Entbindungsdatum": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB09 Date of Delivery",
                    "de": "BFB09 geboren am",
                    "de-ch": "BFB09 geboren am"
                }
            },
            "BFB9_weniger_als_2500_gr": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB09 Less than 2500 gr.",
                    "de": "BFB09 Geburtsgewicht unter 2500 Gramm",
                    "de-ch": "BFB09 Geburtsgewicht unter 2500 Gramm"
                }
            },
            "BFB9_nicht_voll_ausgebildete_Reifezeichen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB09 Not fully trained maturity marks",
                    "de": "BFB09 Geburtsgewicht ab 2500 Gramm, es besteht jedoch ein wesentlich erweiterter Pflegebedarf wegen nicht voll ausgebildeter Reifezeichen oder verfrühter Beendigung der Schwan-gerschaft",
                    "de-ch": "BFB09 Geburtsgewicht ab 2500 Gramm, es besteht jedoch ein wesentlich erweiterter Pflegebedarf wegen nicht voll ausgebildeter Reifezeichen oder verfrühter Beendigung der Schwan-gerschaft"
                }
            },
            "BFB9_verfrühte_Beendigung_der_Schwangerschaft": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB09 Premature termination of pregnancy",
                    "de": "BFB09 Totgeburt ab 500 Gramm und mit Anzeichen nach a) oder b)",
                    "de-ch": "BFB09 Totgeburt ab 500 Gramm und mit Anzeichen nach a) oder b)"
                }
            },
            "BFB9_Bei_dem_Kind_liegt_eine_Behinderung_vor": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB09 Child is disabled",
                    "de": "BFB09 Bei dem Kind liegt eine Behinderung vor",
                    "de-ch": "BFB09 Bei dem Kind liegt eine Behinderung vor"
                }
            },
            "BFB10C_first_initiator_location_number": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB10C First initiator location number",
                    "de": "BFB10C Betriebsstättennummer des Erstveranlassers",
                    "de-ch": "BFB10C Betriebsstättennummer des Erstveranlassers"
                }
            },
            "BFB10C_first_initiator_physican_number": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB10C First initiator physican number",
                    "de": "BFB10C Arztnummer des Erstveranlassers",
                    "de-ch": "BFB10C Arztnummer des Erstveranlassers"
                }
            },
            "BFB10C_first_scan": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C First scan",
                    "de": "BFB10C Ersttestung",
                    "de-ch": "BFB10C Ersttestung"
                }
            },
            "BFB10C_further_scan": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Further scan",
                    "de": "BFB10C Weitere Testung",
                    "de-ch": "BFB10C Weitere Testung"
                }
            },
            "BFB10C_scan_after_corona_app_warning": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Scan after corona app warning",
                    "de": "BFB10C Testung nach Corona App Warnung",
                    "de-ch": "BFB10C Ersttestung"
                }
            },
            "BFB10C_diagnostic_confirmation": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Diagnostische Abklärung",
                    "de": "BFB10C Diagnostische Abklärung",
                    "de-ch": "BFB10C Diagnostische Abklärung"
                }
            },
            "BFB10C_risk_attribute_placing": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Risk attribute placing",
                    "de": "BFB10C Risikomerkmal Betreuung/Unterbringung",
                    "de-ch": "BFB10C Risikomerkmal Betreuung/Unterbringung"
                }
            },
            "BFB10C_risk_attribute_job": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Risk attribute job",
                    "de": "BFB10C Risikomerkmal Tätigkeit",
                    "de-ch": "BFB10C Risikomerkmal Tätigkeit"
                }
            },
            "BFB10C_risk_attribute_medical_facility": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Risk attribute facility",
                    "de": "BFB10C Risikomerkmal medizinische Einrichtung",
                    "de-ch": "BFB10C Risikomerkmal medizinische Einrichtung"
                }
            },
            "BFB10C_risk_attribute_community_facility": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Risk attribute community facility",
                    "de": "BFB10C Risikomerkmal Gemeinschaftseinrichtung",
                    "de-ch": "BFB10C Risikomerkmal Gemeinschaftseinrichtung"
                }
            },
            "BFB10C_risk_attribute_care_facility": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Risk attribute care facility",
                    "de": "BFB10C Risikomerkmal Pflegeeinrichtung",
                    "de-ch": "BFB10C Risikomerkmal Pflegeeinrichtung"
                }
            },
            "BFB10C_risk_attribute_other_facility": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Risk attribute other facility",
                    "de": "BFB10C Risikomerkmal sonstige Einrichtung",
                    "de-ch": "BFB10C Risikomerkmal sonstige Einrichtung"
                }
            },
            "BFB10C_consent_result_submit_to_rki": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB10C Consent result submit to RKI",
                    "de": "BFB10C Einverständnis zur Übermittlung der Ergebnisse an das RKI",
                    "de-ch": "BFB10C Einverständnis zur Übermittlung der Ergebnisse an das RKI"
                }
            },
            "BFB10C_phone_number": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB10C Phone number",
                    "de": "BFB10C Telefonnummer",
                    "de-ch": "BFB10C Telefonnummer"
                }
            },
            "BFB10C_guid": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB10C GUID",
                    "de": "BFB10C GUID",
                    "de-ch": "BFB10C GUID"
                }
            },
            "BFBOEGD_10C_abnahmeDatum": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD_10C Acceptance date",
                    "de": "BFBOEGD_10C Abnahmedatum",
                    "de-ch": "BFBOEGD_10C Abnahmedatum"
                }
            },
            "BFBOEGD_regional_special_agreement": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD regional special agreement",
                    "de": "BFBOEGD Regionale Sondervereinbarung",
                    "de-ch": "BFBOEGD Regionale Sondervereinbarung"
                }
            },
            "BFBOEGD_special_number": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD special number",
                    "de": "BFBOEGD KV Sonderziffer",
                    "de-ch": "BFBOEGD KV Sonderziffer"
                }
            },
            "BFBOEGD_rvo": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD RVO",
                    "de": "BFBOEGD RVO",
                    "de-ch": "BFBOEGD RVO"
                }
            },
            "BFBOEGD_test_v": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD TestV",
                    "de": "BFBOEGD TestV",
                    "de-ch": "BFBOEGD TestV"
                }
            },
            "BFBOEGD_self_payer": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD self payer",
                    "de": "BFBOEGD Selbstzahler",
                    "de-ch": "BFBOEGD Selbstzahler"
                }
            },
            "BFBOEGD_paragraph_2_rvo_contact": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §2 RVO Conteact person",
                    "de": "BFBOEGD §2 RVO Kontaktperson",
                    "de-ch": "BFBOEGD §2 RVO Kontaktperson"
                }
            },
            "BFBOEGD_paragraph_2_rvo_app": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §2 Message „increased risk“ by Corona warning app",
                    "de": "BFBOEGD §2 RVO Meldung „erhöhtes Risiko“ durch Corona-Warn-App",
                    "de-ch": "BFBOEGD §2 RVO Meldung „erhöhtes Risiko“ durch Corona-Warn-App"
                }
            },
            "BFBOEGD_paragraph_3_rvo_event": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §3 RVO Outbreak event",
                    "de": "BFBOEGD §3 RVO Ausbruchsgeschehen",
                    "de-ch": "BFBOEGD §3 RVO Ausbruchsgeschehen"
                }
            },
            "BFBOEGD_paragraph_4_rvo_spread": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §4 Nr. 1-3 RVO Prevention of spread",
                    "de": "BFBOEGD §4 Nr. 1-3 RVO Verhütung der Verbreitung",
                    "de-ch": "BFBOEGD §4 Nr. 1-3 RVO Verhütung der Verbreitung"
                }
            },
            "BFBOEGD_paragraph_4_rvo_area": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §4 Nr. 4 b) RVO Risk area",
                    "de": "BFBOEGD §4 Nr. 4 b) RVO Risikogebiet",
                    "de-ch": "BFBOEGD §4 Nr. 4 b) RVO Risikogebiet"
                }
            },
            "BFBOEGD_paragraph_4_rvo_stay_abroad": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §4 Nr. 4 a) RVO Stay abroad",
                    "de": "BFBOEGD §4 Nr. 4 a) RVO Auslandsaufenthalt",
                    "de-ch": "BFBOEGD §4 Nr. 4 a) RVO Auslandsaufenthalt"
                }
            },
            "BFBOEGD_paragraph_2_test_v_contact": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §2 TestV Conteact person",
                    "de": "BFBOEGD §2 TestV Kontaktperson",
                    "de-ch": "BFBOEGD §2 TestV Kontaktperson"
                }
            },
            "BFBOEGD_paragraph_2_test_v_app": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §2 TestV Message „increased risk“ by Corona warning app",
                    "de": "BFBOEGD §2 TestV Meldung „erhöhtes Risiko“ durch Corona-Warn-App",
                    "de-ch": "BFBOEGD §2 TestV Meldung „erhöhtes Risiko“ durch Corona-Warn-App"
                }
            },
            "BFBOEGD_paragraph_3_test_v_event": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD §3 TestV Outbreak event",
                    "de": "BFBOEGD §3 TestV Ausbruchsgeschehen",
                    "de-ch": "BFBOEGD §3 TestV Ausbruchsgeschehen"
                }
            },
            "BFBOEGD_paragraph_4_test_v_spread": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD TestV §4 Abs. 1 Nr. und 2 TestV Prevention of spread",
                    "de": "BFBOEGD TestV §4 Abs. 1 Nr. und 2 TestV Verhütung der Verbreitung",
                    "de-ch": "BFBOEGD TestV §4 Abs. 1 Nr. und 2 TestV Verhütung der Verbreitung"
                }
            },
            "BFBOEGD_paragraph_4_test_v_after_positive_antigen_test": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD Bestätigungs-PCR nach § 4b Satz 1 TestV nach positivem Antigentest",
                    "de": "BFBOEGD Bestätigungs-PCR nach § 4b Satz 1 TestV nach positivem Antigentest",
                    "de-ch": "BFBOEGD Bestätigungs-PCR nach § 4b Satz 1 TestV nach positivem Antigentest"
                }
            },
            "BFBOEGD_paragraph_4_test_v_after_positive_pcr_test": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD Varianten-PCR nach § 4b Satz 2 TestV nach positivem PCR-Test",
                    "de": "BFBOEGD Varianten-PCR nach § 4b Satz 2 TestV nach positivem PCR-Test",
                    "de-ch": "BFBOEGD Varianten-PCR nach § 4b Satz 2 TestV nach positivem PCR-Test"
                }
            },
            "BFBOEGD_paragraph_4_test_v_stay_abroad": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD TestV §4 Abs. 3 TestV risk area abroad",
                    "de": "BFBOEGD TestV §4 Abs. 3 Risikogebiet Ausland",
                    "de-ch": "BFBOEGD TestV §4 Abs. 3 Risikogebiet Ausland"
                }
            },
            "BFBOEGD_phs_note": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD Note PHS",
                    "de": "BFBOEGD Identifikation/Akten- zeichen ÖGD",
                    "de-ch": "BFBOEGD Identifikation/Akten- zeichen ÖGD"
                }
            },
            "BFBOEGD_phs_zip": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFBOEGD ZIP PHS",
                    "de": "BFBOEGD PLZ ÖGD",
                    "de-ch": "BFBOEGD PLZ ÖGD"
                }
            },
            "BFB12_erstverordnung": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Erstverordnung",
                    "de": "BFB12 Erstverordnung",
                    "de-ch": "BFB12 Erstverordnung"
                }
            },
            "BFB12_folgeverordnung": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Folgeverordnung",
                    "de": "BFB12 Folgeverordnung",
                    "de-ch": "BFB12 Folgeverordnung"
                }
            },
            "BFB12_Unfall": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Unfall",
                    "de": "BFB12 Unfall",
                    "de-ch": "BFB12 Unfall"
                }
            },
            "BFB12_ZeitraumVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Von",
                    "de": "BFB12 Von",
                    "de-ch": "BFB12 Von"
                }
            },
            "BFB12_ZeitraumBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Bis",
                    "de": "BFB12 Bis",
                    "de-ch": "BFB12 Bis"
                }
            },
            "BFB12_MedBoxHerrichten": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentenbox: Herrichten",
                    "de": "BFB12 Medikamentenbox: Herrichten",
                    "de-ch": "BFB12 Medikamentenbox: Herrichten"
                }
            },
            "BFB12_MedBoxHaeufigkeitTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentenbox: tgl.",
                    "de": "BFB12 Medikamentenbox: tgl.",
                    "de-ch": "BFB12 Medikamentenbox: tgl."
                }
            },
            "BFB12_MedBoxHaeufigkeitWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentenbox: wtl.",
                    "de": "BFB12 Medikamentenbox: wtl.",
                    "de-ch": "BFB12 Medikamentenbox: wtl."
                }
            },
            "BFB12_MedBoxHaeufigkeitMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentenbox: mtl.",
                    "de": "BFB12 Medikamentenbox: mtl.",
                    "de-ch": "BFB12 Medikamentenbox: mtl."
                }
            },
            "BFB12_MedBoxVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentenbox: von",
                    "de": "BFB12 Medikamentenbox: von",
                    "de-ch": "BFB12 Medikamentenbox: von"
                }
            },
            "BFB12_MedBoxBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentenbox: bis",
                    "de": "BFB12 Medikamentenbox: bis",
                    "de-ch": "BFB12 Medikamentenbox: bis"
                }
            },
            "BFB12_MedGabe": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentengabe",
                    "de": "BFB12 Medikamentengabe",
                    "de-ch": "BFB12 Medikamentengabe"
                }
            },
            "BFB12_MedGabeTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentengabe: tgl.",
                    "de": "BFB12 Medikamentengabe: tgl.",
                    "de-ch": "BFB12 Medikamentengabe: tgl."
                }
            },
            "BFB12_MedGabeWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentengabe: wtl.",
                    "de": "BFB12 Medikamentengabe: wtl.",
                    "de-ch": "BFB12 Medikamentengabe: wtl."
                }
            },
            "BFB12_MedGabeMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentengabe: mtl.",
                    "de": "BFB12 Medikamentengabe: mtl.",
                    "de-ch": "BFB12 Medikamentengabe: mtl."
                }
            },
            "BFB12_MedGabeVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentengabe: von",
                    "de": "BFB12 Medikamentengabe: von",
                    "de-ch": "BFB12 Medikamentengabe: von"
                }
            },
            "BFB12_MedGabeBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Medikamentengabe: bis",
                    "de": "BFB12 Medikamentengabe: bis",
                    "de-ch": "BFB12 Medikamentengabe: bis"
                }
            },
            "BFB12_Injektion": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen",
                    "de": "BFB12 Injektionen",
                    "de-ch": "BFB12 Injektionen"
                }
            },
            "BFB12_InjektionHerrichten": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: herrichten",
                    "de": "BFB12 Injektionen: herrichten",
                    "de-ch": "BFB12 Injektionen: herrichten"
                }
            },
            "BFB12_InjektionIntramuskulaer": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: Intramuskulär",
                    "de": "BFB12 Injektionen: Intramuskulär",
                    "de-ch": "BFB12 Injektionen: Intramuskulär"
                }
            },
            "BFB12_InjektionSubkutan": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: Subkutan",
                    "de": "BFB12 Injektionen: Subkutan",
                    "de-ch": "BFB12 Injektionen: Subkutan"
                }
            },
            "BFB12_InjektionTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: tgl.",
                    "de": "BFB12 Injektionen: tgl.",
                    "de-ch": "BFB12 Injektionen: tgl."
                }
            },
            "BFB12_InjektionWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: wtl.",
                    "de": "BFB12 Injektionen: wtl.",
                    "de-ch": "BFB12 Injektionen: wtl."
                }
            },
            "BFB12_InjektionMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: mtl.",
                    "de": "BFB12 Injektionen: mtl.",
                    "de-ch": "BFB12 Injektionen: mtl."
                }
            },
            "BFB12_InjektionVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: von",
                    "de": "BFB12 Injektionen: von",
                    "de-ch": "BFB12 Injektionen: von"
                }
            },
            "BFB12_InjektionBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Injektionen: bis",
                    "de": "BFB12 Injektionen: bis",
                    "de-ch": "BFB12 Injektionen: bis"
                }
            },
            "BFB12_BlutzuckerErst_Neueinstellung": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Blutzuckermessung: Erst- oder Neueinstellung",
                    "de": "BFB12 Blutzuckermessung: Erst- oder Neueinstellung",
                    "de-ch": "BFB12 Blutzuckermessung: Erst- oder Neueinstellung"
                }
            },
            "BFB12_BlutzuckerIntensInsulintherapie": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Blutzuckermessung: bei intensivierter Insulintherapie",
                    "de": "BFB12 Blutzuckermessung: bei intensivierter Insulintherapie",
                    "de-ch": "BFB12 Blutzuckermessung: bei intensivierter Insulintherapie"
                }
            },
            "BFB12_BlutzuckerTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Blutzuckermessung: tgl.",
                    "de": "BFB12 Blutzuckermessung: tgl.",
                    "de-ch": "BFB12 Blutzuckermessung: tgl."
                }
            },
            "BFB12_BlutzuckerWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Blutzuckermessung: wtl.",
                    "de": "BFB12 Blutzuckermessung: wtl.",
                    "de-ch": "BFB12 Blutzuckermessung: wtl."
                }
            },
            "BFB12_BlutzuckerMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Blutzuckermessung: mtl.",
                    "de": "BFB12 Blutzuckermessung: mtl.",
                    "de-ch": "BFB12 Blutzuckermessung: mtl."
                }
            },
            "BFB12_BlutzuckerVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Blutzuckermessung: von",
                    "de": "BFB12 Blutzuckermessung: von",
                    "de-ch": "BFB12 Blutzuckermessung: von"
                }
            },
            "BFB12_BlutzuckerBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Blutzuckermessung: bis",
                    "de": "BFB12 Blutzuckermessung: bis",
                    "de-ch": "BFB12 Blutzuckermessung: bis"
                }
            },
            "BFB12_KompressionsbehandlungLinks": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsbehandlung: links",
                    "de": "BFB12 Kompressionsbehandlung: links",
                    "de-ch": "BFB12 Kompressionsbehandlung: links"
                }
            },
            "BFB12_KompressionsbehandlungRechts": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsbehandlung: rechts",
                    "de": "BFB12 Kompressionsbehandlung: rechts",
                    "de-ch": "BFB12 Kompressionsbehandlung: rechts"
                }
            },
            "BFB12_KompressionsbehandlungBeidseits": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsbehandlung: beidseits",
                    "de": "BFB12 Kompressionsbehandlung: beidseits",
                    "de-ch": "BFB12 Kompressionsbehandlung: beidseits"
                }
            },
            "BFB12_KompStruempfeAnziehen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsstrümpfe: anziehen",
                    "de": "BFB12 Kompressionsstrümpfe: anziehen",
                    "de-ch": "BFB12 Kompressionsstrümpfe: anziehen"
                }
            },
            "BFB12_KompStruempfeAusziehen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsstrümpfe: ausziehen",
                    "de": "BFB12 Kompressionsstrümpfe: ausziehen",
                    "de-ch": "BFB12 Kompressionsstrümpfe: ausziehen"
                }
            },
            "BFB12_KompStruempfeTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsstrümpfe: tgl.",
                    "de": "BFB12 Kompressionsstrümpfe: tgl.",
                    "de-ch": "BFB12 Kompressionsstrümpfe: tgl."
                }
            },
            "BFB12_KompStruempfeWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsstrümpfe: wtl.",
                    "de": "BFB12 Kompressionsstrümpfe: wtl.",
                    "de-ch": "BFB12 Kompressionsstrümpfe: wtl."
                }
            },
            "BFB12_KompStruempfeMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsstrümpfe: mtl.",
                    "de": "BFB12 Kompressionsstrümpfe: mtl.",
                    "de-ch": "BFB12 Kompressionsstrümpfe: mtl."
                }
            },
            "BFB12_KompStruempfeVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsstrümpfe: von",
                    "de": "BFB12 Kompressionsstrümpfe: von",
                    "de-ch": "BFB12 Kompressionsstrümpfe: von"
                }
            },
            "BFB12_KompStruempfeBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsstrümpfe: bis",
                    "de": "BFB12 Kompressionsstrümpfe: bis",
                    "de-ch": "BFB12 Kompressionsstrümpfe: bis"
                }
            },
            "BFB12_KompVerbaendeAnlegen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsverbände: anlegen",
                    "de": "BFB12 Kompressionsverbände: anlegen",
                    "de-ch": "BFB12 Kompressionsverbände: anlegen"
                }
            },
            "BFB12_KompVerbaendeAbnehmen": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsverbände: abnehmen",
                    "de": "BFB12 Kompressionsverbände: abnehmen",
                    "de-ch": "BFB12 Kompressionsverbände: abnehmen"
                }
            },
            "BFB12_KompVerbaendeTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsverbände: tgl.",
                    "de": "BFB12 Kompressionsverbände: tgl.",
                    "de-ch": "BFB12 Kompressionsverbände: tgl."
                }
            },
            "BFB12_KompVerbaendeWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsverbände: wtl.",
                    "de": "BFB12 Kompressionsverbände: wtl.",
                    "de-ch": "BFB12 Kompressionsverbände: wtl."
                }
            },
            "BFB12_KompVerbaendeMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsverbände: mtl.",
                    "de": "BFB12 Kompressionsverbände: mtl.",
                    "de-ch": "BFB12 Kompressionsverbände: mtl."
                }
            },
            "BFB12_KompVerbaendeVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsverbände: von",
                    "de": "BFB12 Kompressionsverbände: von",
                    "de-ch": "BFB12 Kompressionsverbände: von"
                }
            },
            "BFB12_KompVerbaendeBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Kompressionsverbände: bis",
                    "de": "BFB12 Kompressionsverbände: bis",
                    "de-ch": "BFB12 Kompressionsverbände: bis"
                }
            },
            "BFB12_Stuetzverbaende": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Stützverbände",
                    "de": "BFB12 Stützverbände",
                    "de-ch": "BFB12 Stützverbände"
                }
            },
            "BFB12_StuetzverbaendeTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Stützverbände: tgl.",
                    "de": "BFB12 Stützverbände: tgl.",
                    "de-ch": "BFB12 Stützverbände: tgl."
                }
            },
            "BFB12_StuetzverbaendeWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Stützverbände: wtl.",
                    "de": "BFB12 Stützverbände: wtl.",
                    "de-ch": "BFB12 Stützverbände: wtl."
                }
            },
            "BFB12_StuetzverbaendeMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Stützverbände: mtl.",
                    "de": "BFB12 Stützverbände: mtl.",
                    "de-ch": "BFB12 Stützverbände: mtl."
                }
            },
            "BFB12_StuetzverbaendeVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Stützverbände: von",
                    "de": "BFB12 Stützverbände: von",
                    "de-ch": "BFB12 Stützverbände: von"
                }
            },
            "BFB12_StuetzverbaendeBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Stützverbände: bis",
                    "de": "BFB12 Stützverbände: bis",
                    "de-ch": "BFB12 Stützverbände: bis"
                }
            },
            "BFB12_Dekubitus": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Dekubitusbehandlung",
                    "de": "BFB12 Dekubitusbehandlung",
                    "de-ch": "BFB12 Dekubitusbehandlung"
                }
            },
            "BFB12_DekubitusTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Dekubitusbehandlung: tgl.",
                    "de": "BFB12 Dekubitusbehandlung: tgl.",
                    "de-ch": "BFB12 Dekubitusbehandlung: tgl."
                }
            },
            "BFB12_DekubitusWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Dekubitusbehandlung: wtl.",
                    "de": "BFB12 Dekubitusbehandlung: wtl.",
                    "de-ch": "BFB12 Dekubitusbehandlung: wtl."
                }
            },
            "BFB12_DekubitusMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Dekubitusbehandlung: mtl.",
                    "de": "BFB12 Dekubitusbehandlung: mtl.",
                    "de-ch": "BFB12 Dekubitusbehandlung: mtl."
                }
            },
            "BFB12_DekubitusVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Dekubitusbehandlung: von",
                    "de": "BFB12 Dekubitusbehandlung: von",
                    "de-ch": "BFB12 Dekubitusbehandlung: von"
                }
            },
            "BFB12_DekubitusBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Dekubitusbehandlung: bis",
                    "de": "BFB12 Dekubitusbehandlung: bis",
                    "de-ch": "BFB12 Dekubitusbehandlung: bis"
                }
            },
            "BFB12_WunderversorgungAkut": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Wunderversorgung akut",
                    "de": "BFB12 Wunderversorgung akut",
                    "de-ch": "BFB12 Wunderversorgung akut"
                }
            },
            "BFB12_WunderversorgungChronisch": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Wunderversorgung chronisch",
                    "de": "BFB12 Wunderversorgung chronisch",
                    "de-ch": "BFB12 Wunderversorgung chronisch"
                }
            },
            "BFB12_HaeufigkeitTaeglichWunderversorgung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Häufigkeit täglich (Wunderversorgung)",
                    "de": "BFB12 Häufigkeit täglich (Wunderversorgung)",
                    "de-ch": "BFB12 Häufigkeit täglich (Wunderversorgung)"
                }
            },
            "BFB12_HaeufigkeitWoechentlichWunderversorgung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Häufigkeit wöchentlich (Wunderversorgung)",
                    "de": "BFB12 Häufigkeit wöchentlich (Wunderversorgung)",
                    "de-ch": "BFB12 Häufigkeit wöchentlich (Wunderversorgung)"
                }
            },
            "BFB12_HaeufigkeitMonatlichWunderversorgung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Häufigkeit monatlich (Wunderversorgung)",
                    "de": "BFB12 Häufigkeit monatlich (Wunderversorgung)",
                    "de-ch": "BFB12 Häufigkeit monatlich (Wunderversorgung)"
                }
            },
            "BFB12_WundversorgungVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Zeitraum von (Wundversorgung)",
                    "de": "BFB12 Zeitraum von (Wundversorgung)",
                    "de-ch": "BFB12 Zeitraum von (Wundversorgung)"
                }
            },
            "BFB12_WundversorgungBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Zeitraum bis (Wundversorgung)",
                    "de": "BFB12 Zeitraum bis (Wundversorgung)",
                    "de-ch": "BFB12 Zeitraum bis (Wundversorgung)"
                }
            },
            "BFB12_PositionswechselDekubitusBehandlung": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Positionswechsel zur Dekubitusbehandlung",
                    "de": "BFB12 Positionswechsel zur Dekubitusbehandlung",
                    "de-ch": "BFB12 Positionswechsel zur Dekubitusbehandlung"
                }
            },
            "BFB12_HaeufigkeitTaeglichPositionswechselDekubitusBehandlung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Häufigkeit täglich (Positionswechsel zur Dekubitusbehandlung)",
                    "de": "BFB12 Häufigkeit täglich (Positionswechsel zur Dekubitusbehandlung)",
                    "de-ch": "BFB12 Häufigkeit täglich (Positionswechsel zur Dekubitusbehandlung)"
                }
            },
            "BFB12_HaeufigkeitWoechentlichPositionswechselDekubitusBehandlung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Häufigkeit wöchentlich (Positionswechsel zur Dekubitusbehandlung)",
                    "de": "BFB12 Häufigkeit wöchentlich (Positionswechsel zur Dekubitusbehandlung)",
                    "de-ch": "BFB12 Häufigkeit wöchentlich (Positionswechsel zur Dekubitusbehandlung)"
                }
            },
            "BFB12_HaeufigkeitMonatlichPositionswechselDekubitusBehandlung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Häufigkeit monatlich (Positionswechsel zur Dekubitusbehandlung)",
                    "de": "BFB12 Häufigkeit monatlich (Positionswechsel zur Dekubitusbehandlung)",
                    "de-ch": "BFB12 Häufigkeit monatlich (PositionswechselDekubitusBehandlung)"
                }
            },
            "BFB12_PositionswechselDekubitusBehandlungVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Zeitraum von (Positionswechsel zur Dekubitusbehandlung)",
                    "de": "BFB12 Zeitraum von (Positionswechsel zur Dekubitusbehandlung)",
                    "de-ch": "BFB12 Zeitraum von (Positionswechsel zur Dekubitusbehandlung)"
                }
            },
            "BFB12_PositionswechselDekubitusBehandlungBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Zeitraum bis (Positionswechsel zur Dekubitusbehandlung)",
                    "de": "BFB12 Zeitraum bis (Positionswechsel zur Dekubitusbehandlung)",
                    "de-ch": "BFB12 Zeitraum bis (Positionswechsel zur Dekubitusbehandlung)"
                }
            },
            "BFB12_AndereWundverb": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 andere Wundverbände",
                    "de": "BFB12 andere Wundverbände",
                    "de-ch": "BFB12 andere Wundverbände"
                }
            },
            "BFB12_AndereWundverbTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 andere Wundverbände: tgl.",
                    "de": "BFB12 andere Wundverbände: tgl.",
                    "de-ch": "BFB12 andere Wundverbände: tgl."
                }
            },
            "BFB12_AndereWundverbWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 andere Wundverbände: wtl.",
                    "de": "BFB12 andere Wundverbände: wtl.",
                    "de-ch": "BFB12 andere Wundverbände: wtl."
                }
            },
            "BFB12_AndereWundverbMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 andere Wundverbände: mtl.",
                    "de": "BFB12 andere Wundverbände: mtl.",
                    "de-ch": "BFB12 andere Wundverbände: mtl."
                }
            },
            "BFB12_AndereWundverbVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 andere Wundverbände: von",
                    "de": "BFB12 andere Wundverbände: von",
                    "de-ch": "BFB12 andere Wundverbände: von"
                }
            },
            "BFB12_AndereWundverbBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 andere Wundverbände: bis",
                    "de": "BFB12 andere Wundverbände: bis",
                    "de-ch": "BFB12 andere Wundverbände: bis"
                }
            },
            "BFB12_SonstigeMassnahmen": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Sonstige Maßnahmen",
                    "de": "BFB12 Sonstige Maßnahmen",
                    "de-ch": "BFB12 Sonstige Massnahmen"
                }
            },
            "BFB12_AnleitungBehandlungspflege": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB12 Anleitung zur Behandlungspflege",
                    "de": "BFB12 Anleitung zur Behandlungspflege",
                    "de-ch": "BFB12 Anleitung zur Behandlungspflege"
                }
            },
            "BFB12_Unterstuetzungspflege": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Untersützungspflege",
                    "de": "BFB12 Untersützungspflege",
                    "de-ch": "BFB12 Untersützungspflege"
                }
            },
            "BFB12_Krankenhausvermeidungspflege": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Krankenhausvermeidungspflege",
                    "de": "BFB12 Krankenhausvermeidungspflege",
                    "de-ch": "BFB12 Krankenhausvermeidungspflege"
                }
            },
            "BFB12_Grundpflege": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 Grundpflege",
                    "de": "BFB12 Grundpflege",
                    "de-ch": "BFB12 Grundpflege"
                }
            },
            "BFB12_GrundpflegeTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Grundpflege: tgl.",
                    "de": "BFB12 Grundpflege: tgl.",
                    "de-ch": "BFB12 Grundpflege: tgl."
                }
            },
            "BFB12_GrundpflegeWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Grundpflege: wtl.",
                    "de": "BFB12 Grundpflege: wtl.",
                    "de-ch": "BFB12 Grundpflege: wtl."
                }
            },
            "BFB12_GrundpflegeMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 Grundpflege: mtl.",
                    "de": "BFB12 Grundpflege: mtl.",
                    "de-ch": "BFB12 Grundpflege: mtl."
                }
            },
            "BFB12_GrundpflegeVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Grundpflege: von",
                    "de": "BFB12 Grundpflege: von",
                    "de-ch": "BFB12 Grundpflege: von"
                }
            },
            "BFB12_GrundpflegeBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 Grundpflege: bis",
                    "de": "BFB12 Grundpflege: bis",
                    "de-ch": "BFB12 Grundpflege: bis"
                }
            },
            "BFB12_HauswirtVers": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB12 hauswirtschaftliche Versorgung",
                    "de": "BFB12 hauswirtschaftliche Versorgung",
                    "de-ch": "BFB12 hauswirtschaftliche Versorgung"
                }
            },
            "BFB12_HauswirtVersTag": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 hauswirtschaftliche Versorgung: tgl.",
                    "de": "BFB12 hauswirtschaftliche Versorgung: tgl.",
                    "de-ch": "BFB12 hauswirtschaftliche Versorgung: tgl."
                }
            },
            "BFB12_HauswirtVersWoche": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 hauswirtschaftliche Versorgung: wtl.",
                    "de": "BFB12 hauswirtschaftliche Versorgung: wtl.",
                    "de-ch": "BFB12 hauswirtschaftliche Versorgung: wtl."
                }
            },
            "BFB12_HauswirtVersMonat": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB12 hauswirtschaftliche Versorgung: mtl.",
                    "de": "BFB12 hauswirtschaftliche Versorgung: mtl.",
                    "de-ch": "BFB12 hauswirtschaftliche Versorgung: mtl."
                }
            },
            "BFB12_HauswirtVersVon": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 hauswirtschaftliche Versorgung: von",
                    "de": "BFB12 hauswirtschaftliche Versorgung: von",
                    "de-ch": "BFB12 hauswirtschaftliche Versorgung: von"
                }
            },
            "BFB12_HauswirtVersBis": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB12 hauswirtschaftliche Versorgung: bis",
                    "de": "BFB12 hauswirtschaftliche Versorgung: bis",
                    "de-ch": "BFB12 hauswirtschaftliche Versorgung: bis"
                }
            },
            "BFB19_Befunde_Therapie": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB19 Befunde/Therapie",
                    "de": "BFB19 Befunde/Therapie",
                    "de-ch": "BFB19 Befunde/Therapie"
                }
            },
            "BFB25_Schwächung_der_Gesundheit_Krankheitsverhütung": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB25 Weakening of health /disease prevention",
                    "de": "BFB25 Schwächung der Gesundheit /Krankheitsverhütung",
                    "de-ch": "BFB25 Schwächung der Gesundheit /Krankheitsverhütung"
                }
            },
            "BFB25_Vermeidung_der_Verschlimmerung_behandlungsbedingter_Krankheiten": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB25 Avoid the aggravation of treatment-related diseases",
                    "de": "BFB25 Vermeidung der Verschlimmerung behandlungsbedingter Krankheiten",
                    "de-ch": "BFB25 Vermeidung der Verschlimmerung behandlungsbedingter Krankheiten"
                }
            },
            "BFB25_Gefährdung_der_gesundheitlichen_Entwicklung_von_Kindern": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB25 Risk to the health development of children",
                    "de": "BFB25 Gefährdung der gesundheitlichen Entwicklung von Kindern",
                    "de-ch": "BFB25 Gefährdung der gesundheitlichen Entwicklung von Kindern"
                }
            },
            "BFB25_In_Behandlung_seit": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB25 In treatment since",
                    "de": "BFB25 In Behandlung seit",
                    "de-ch": "BFB25 In Behandlung seit"
                }
            },
            "BFB25_Letzte_Untersuchung": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB25 Last Examination",
                    "de": "BFB25 Letzte Untersuchung",
                    "de-ch": "BFB25 Letzte Untersuchung"
                }
            },
            "BFB25_Empfohlener_Kurort": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB25 Recommended health resort",
                    "de": "BFB25 Empfohlener Kurort",
                    "de-ch": "BFB25 Empfohlener Kurort"
                }
            },
            "BFB25_Dauer_in_Wochen": {
                "type": "Number",
                "insight2": false,
                "label": {
                    "en": "BFB25 Duration (in weeks)",
                    "de": "BFB25 Dauer (in Wochen)",
                    "de-ch": "BFB25 Dauer (in Wochen)"
                }
            },
            "BFB25_Kompaktkur_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB25 Compact Cure (Yes)",
                    "de": "BFB25 Kompaktkur (Ja)",
                    "de-ch": "BFB25 Kompaktkur (Ja)"
                }
            },
            "BFB25_Kompaktkur_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB25 Compact Cure (No)",
                    "de": "BFB25 Kompaktkur (Nein)",
                    "de-ch": "BFB25 Kompaktkur (Nein)"
                }
            },
            "BFB30insurance_AOK": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Kassenart AOK",
                    "de": "BFB30 Kassenart AOK",
                    "de-ch": "BFB30 Kassenart AOK"
                }
            },
            "BFB30insurance_BKK": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Kassenart BKK",
                    "de": "BFB30 Kassenart BKK",
                    "de-ch": "BFB30 Kassenart BKK"
                }
            },
            "BFB30insurance_IKK": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Kassenart IKK",
                    "de": "BFB30 Kassenart IKK",
                    "de-ch": "BFB30 Kassenart IKK"
                }
            },
            "BFB30insurance_LKK": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Kassenart LKK",
                    "de": "BFB30 Kassenart LKK",
                    "de-ch": "BFB30 Kassenart LKK"
                }
            },
            "BFB30insurance_VDeK": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Kassenart VDeK",
                    "de": "BFB30 Kassenart VDeK",
                    "de-ch": "BFB30 Kassenart VDeK"
                }
            },
            "BFB30insurance_BKnapp": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Kassenart Bundesknappschaft",
                    "de": "BFB30 Kassenart Bundesknappschaft",
                    "de-ch": "BFB30 Kassenart Bundesknappschaft"
                }
            },
            "BFB30_age_lt35": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group under 35",
                    "de": "BFB30 Altersgruppe unter 35",
                    "de-ch": "BFB30 Altersgruppe unter 35"
                }
            },
            "BFB30_age_35_39": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 35-39",
                    "de": "BFB30 Altersgruppe 35-39",
                    "de-ch": "BFB30 Altersgruppe 35-39"
                }
            },
            "BFB30_age_40_44": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 40-44",
                    "de": "BFB30 Altersgruppe 40-44",
                    "de-ch": "BFB30 Altersgruppe 40-44"
                }
            },
            "BFB30_age_45-49": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 45-49",
                    "de": "BFB30 Altersgruppe 45-49",
                    "de-ch": "BFB30 Altersgruppe 45-49"
                }
            },
            "BFB30_age_50_54": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 50-54",
                    "de": "BFB30 Altersgruppe 50-54",
                    "de-ch": "BFB30 Altersgruppe 50-54"
                }
            },
            "BFB30_age_55_59": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 55-59",
                    "de": "BFB30 Altersgruppe 55-59",
                    "de-ch": "BFB30 Altersgruppe 55-59"
                }
            },
            "BFB30_age_60_64": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 60-64",
                    "de": "BFB30 Altersgruppe 60-64",
                    "de-ch": "BFB30 Altersgruppe 60-64"
                }
            },
            "BFB30_age_65_69": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 65-69",
                    "de": "BFB30 Altersgruppe 65-69",
                    "de-ch": "BFB30 Altersgruppe 65-69"
                }
            },
            "BFB30_age_70_74": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 70-74",
                    "de": "BFB30 Altersgruppe 70-74",
                    "de-ch": "BFB30 Altersgruppe 70-74"
                }
            },
            "BFB30_age_75_79": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age group 75-79",
                    "de": "BFB30 Altersgruppe 75-79",
                    "de-ch": "BFB30 Altersgruppe 75-79"
                }
            },
            "BFB30_age_gt80": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Age Group 80 and age",
                    "de": "BFB30 Altersgruppe 80 u. älter",
                    "de-ch": "BFB30 Altersgruppe 80 u. älter"
                }
            },
            "BFB30_sex_male": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Sex Male",
                    "de": "BFB30 Geschlecht Männlich",
                    "de-ch": "BFB30 Geschlecht Männlich"
                }
            },
            "BFB30_sex_female": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "de": "BFB30 Sex Female",
                    "en": "BFB30 Geschlecht Weiblich",
                    "de-ch": "BFB30 Sex Female"
                }
            },
            "BFB30_Wiederholung": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 repeat",
                    "de": "BFB30 Wiederholung",
                    "de-ch": "BFB30 Wiederholung"
                }
            },
            "BFB30_hypertonia_eigen": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Hypertension history",
                    "de": "BFB30 Hypertonie Eigenanamnese",
                    "de-ch": "BFB30 Hypertonie Eigenanamnese"
                }
            },
            "BFB30_hypertonia_fam": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Family history of hypertension",
                    "de": "BFB30 Hypertonie Familienanamnese",
                    "de-ch": "BFB30 Hypertonie Familienanamnese"
                }
            },
            "BFB30_coronalHeartDisease_eigen": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 History of heart disease",
                    "de": "BFB30 Herkrankheit Eigenanamnese",
                    "de-ch": "BFB30 Herkrankheit Eigenanamnese"
                }
            },
            "BFB30_coronalHeartDisease_fam": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Family history of heart disease",
                    "de": "BFB30 Herkrankheit Familienanamnese",
                    "de-ch": "BFB30 Herkrankheit Familienanamnese"
                }
            },
            "BFB30_otherArterialClosure_eigen": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 History of Arterial closure ",
                    "de": "BFB30 Arterienverschluss Eigenanamnese",
                    "de-ch": "BFB30 Arterienverschluss Eigenanamnese"
                }
            },
            "BFB30_otherArterialClosure_fam": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Family history of Arterial closure ",
                    "de": "BFB30 Arterienverschluss Familienanamnese",
                    "de-ch": "BFB30 Arterienverschluss Familienanamnese"
                }
            },
            "BFB30_diabetesMellitus_eigen": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 History of Diabetes",
                    "de": "BFB30 Diabetes Eigenanamnese",
                    "de-ch": "BFB30 Diabetes Eigenanamnese"
                }
            },
            "BFB30_diabetesMellitus_fam": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Family history of Diabetes",
                    "de": "BFB30 Diabetes Familienanamnese",
                    "de-ch": "BFB30 Diabetes Familienanamnese"
                }
            },
            "BFB30_hyperlipidemia_eigen": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 History of Hyperlipidaemia",
                    "de": "BFB30 Hyperlipidämie Eigenanamnese",
                    "de-ch": "BFB30 Hyperlipidämie Eigenanamnese"
                }
            },
            "BFB30_hyperlipidemia_fam": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Family history of Hyperlipidaemia",
                    "de": "BFB30 Hyperlipidämie Familienanamnese",
                    "de-ch": "BFB30 Hyperlipidämie Familienanamnese"
                }
            },
            "BFB30_kidneyDiseases_eigen": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 History of kidney diseases",
                    "de": "BFB30 Nierenkrankheit Eigenanamnese",
                    "de-ch": "BFB30 Nierenkrankheit Eigenanamnese"
                }
            },
            "BFB30_kidneyDiseases_fam": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Family history of kidney diseases",
                    "de": "BFB30 Nierenkrankheit Familienanamnese",
                    "de-ch": "BFB30 Nierenkrankheit Familienanamnese"
                }
            },
            "BFB30_lungDiseases_eigen": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 History of lung diseases",
                    "de": "BFB30 Lungenerkrankung Eigenanamnese",
                    "de-ch": "BFB30 Lungenerkrankung Eigenanamnese"
                }
            },
            "BFB30_lungDiseases_fam": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 family history of lung diseases",
                    "de": "BFB30 Lungenerkrankung Familienanamnese",
                    "de-ch": "BFB30 Lungenerkrankung Familienanamnese"
                }
            },
            "BFB30_nicotineAbuse": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Nicotin",
                    "de": "BFB30 Nikotin",
                    "de-ch": "BFB30 Nikotin"
                }
            },
            "BFB30_adipositas": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Obesity",
                    "de": "BFB30 Adipositas",
                    "de-ch": "BFB30 Adipositas"
                }
            },
            "BFB30_chronicEmotionalStressFactor": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Chronic emotional stress factor",
                    "de": "BFB30 emotionale Belastung",
                    "de-ch": "BFB30 emotionale Belastung"
                }
            },
            "BFB30_alcoholAbuse": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 Alcohol abuse",
                    "de": "BFB30 Alkoholabusus",
                    "de-ch": "BFB30 Alkoholabusus"
                }
            },
            "BFB30_sedentaryLifestyle": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "BFB30 lack of exercise",
                    "de": "BFB30 Bewegungsmangel",
                    "de-ch": "BFB30 Bewegungsmangel"
                }
            },
            "BFB39_Alterskategorie_20_29": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Alterskategorie 20-29",
                    "de": "BFB39 Age category 20-29",
                    "de-ch": "BFB39 Age category 20-29"
                }
            },
            "BFB39_Auftragsart_Primaerscreening": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Order type primary screening",
                    "de": "BFB39 Auftragsart Primärscreening",
                    "de-ch": "BFB39 Auftragsart Primärscreening"
                }
            },
            "BFB39_Auftragsart_Abklaerungsdiagnostik": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Order type clarification diagnostics",
                    "de": "BFB39 Auftragsart Abklärungsdiagnostik",
                    "de-ch": "BFB39 Auftragsart Abklärungsdiagnostik"
                }
            },
            "BFB39_Auftrag_Zyto": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Order cyto",
                    "de": "BFB39 Auftrag Zyto",
                    "de-ch": "BFB39 Auftrag Zyto"
                }
            },
            "BFB39_Auftrag_HPV": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Order HPV",
                    "de": "BFB39 Auftrag HPV",
                    "de-ch": "BFB39 Auftrag HPV"
                }
            },
            "BFB39_Auftrag_KoTest": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Order KoTest",
                    "de": "BFB39 Auftrag KoTest",
                    "de-ch": "BFB39 Auftrag KoTest"
                }
            },
            "BFB39_Alterskategorie_30_34": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Alterskategorie 30-34",
                    "de": "BFB39 Age category 30-34",
                    "de-ch": "BFB39 Age category 30-34"
                }
            },
            "BFB39_Alterskategorie_ab_35": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Alterskategorie ab 35",
                    "de": "BFB39 Age category from 35",
                    "de-ch": "BFB39 Age category from 35"
                }
            },
            "BFB39_Wiederholungsuntersuchung_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Repeat survey (yes)",
                    "de": "BFB39 Wiederholungsuntersuchung (Ja)",
                    "de-ch": "BFB39 Wiederholungsuntersuchung (Ja)"
                }
            },
            "BFB39_Wiederholungsuntersuchung_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Repeat survey (No)",
                    "de": "BFB39 Wiederholungsuntersuchung (Nein)",
                    "de-ch": "BFB39 Wiederholungsuntersuchung (Nein)"
                }
            },
            "BFB39_Datum_der_letzten_Untersuchung": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB39 Date of Last Exam",
                    "de": "BFB39 Datum der letzten Untersuchung",
                    "de-ch": "BFB39 Datum der letzten Untersuchung"
                }
            },
            "BFB39_Nr_des_letzten_zytol_Befundes": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 No. the last zytol. report",
                    "de": "BFB39 Nr. des letzten zytol. Befundes",
                    "de-ch": "BFB39 Nr. des letzten zytol. Befundes"
                }
            },
            "BFB39_Gruppe_des_letzten_Befundes": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 Group of the last report",
                    "de": "BFB39 Gruppe des letzten Befundes",
                    "de-ch": "BFB39 Gruppe des letzten Befundes"
                }
            },
            "BFB39_Gruppe": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 Group",
                    "de": "BFB39 Gruppe",
                    "de-ch": "BFB39 Gruppe"
                }
            },
            "BFB39_HPV_Impfung_vollständig": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV vaccination complete",
                    "de": "BFB39 HPV-Impfung vollständig",
                    "de-ch": "BFB39 HPV-Impfung vollständig"
                }
            },
            "BFB39_HPV_Impfung_unvollständig": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV vaccination incomplete",
                    "de": "BFB39 HPV-Impfung unvollständig",
                    "de-ch": "BFB39 HPV-Impfung unvollständig"
                }
            },
            "BFB39_HPV_Impfung_keine": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV vaccination none",
                    "de": "BFB39 HPV-Impfung keine",
                    "de-ch": "BFB39 HPV-Impfung keine"
                }
            },
            "BFB39_HPV_Impfung_unklar": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV vaccination not clears",
                    "de": "BFB39 HPV-Impfung unklar",
                    "de-ch": "BFB39 HPV-Impfung unklar"
                }
            },
            "BFB39_Liegt_ein_HPV_HR_Testergebnis_vor_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV Is there an HPV-HR test result? Yes",
                    "de": "BFB39 Liegt ein HPV-HR-Testergebnis vor? Ja",
                    "de-ch": "BFB39 Liegt ein HPV-HR-Testergebnis vor? Ja"
                }
            },
            "BFB39_Liegt_ein_HPV_HR_Testergebnis_vor_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV Is there an HPV-HR test result? No",
                    "de": "BFB39 Liegt ein HPV-HR-Testergebnis vor? Nein",
                    "de-ch": "BFB39 Liegt ein HPV-HR-Testergebnis vor? Nein"
                }
            },
            "BFB39_Datum_des_HPV_HR_Tests": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV HR test date",
                    "de": "BFB39 Datum des HPV-HR-Tests",
                    "de-ch": "BFB39 Datum des HPV-HR-Tests"
                }
            },
            "BFB39_HPV_HR_Testergebnis_positiv": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV HR test result positiv",
                    "de": "BFB39 HPV-HR-Testergebnis positiv",
                    "de-ch": "BFB39 HPV-HR-Testergebnis positiv"
                }
            },
            "BFB39_HPV_HR_Testergebnis_negativ": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV HR test result negativ",
                    "de": "BFB39 HPV-HR-Testergebnis negativ",
                    "de-ch": "BFB39 HPV-HR-Testergebnis negativ"
                }
            },
            "BFB39_HPV_HR_Testergebnis_nicht_verwendbar": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 HPV HR test result not usable",
                    "de": "BFB39 HPV-HR-Testergebnis nicht verwendbar",
                    "de-ch": "BFB39 HPV-HR-Testergebnis nicht verwendbar"
                }
            },
            "BFB39_Gyn_OP_Strahlen_oder_Chemotherapie_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Gynecological Surgery, radiation or chemotherapy (yes)",
                    "de": "BFB39 Gynäkologische OP, Strahlen oder Chemotherapie (Ja)",
                    "de-ch": "BFB39 Gynäkologische OP, Strahlen oder Chemotherapie (Ja)"
                }
            },
            "BFB39_Gyn_OP_Strahlen_oder_Chemotherapie_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Gynecological Surgery, radiation or chemotherapy (No)",
                    "de": "BFB39 Gynäkologische OP, Strahlen oder Chemotherapie (Nein)",
                    "de-ch": "BFB39 Gynäkologische OP, Strahlen oder Chemotherapie (Nein)"
                }
            },
            "BFB39_Art_der_Gyn_OP_Strahlen_oder_Chemotherapie": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 Type of gynecological surgery, radiotherapy or chemotherapy (what?)",
                    "de": "BFB39 Art der Gynäkologische OP, Strahlen oder Chemotherapie (Welche?)",
                    "de-ch": "BFB39 Art der Gynäkologische OP, Strahlen oder Chemotherapie (Welche?)"
                }
            },
            "BFB39_Datum_der_Gyn_OP": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB39 Date of gynecological surgery (when?)",
                    "de": "BFB39 Datum der Gynäkologische OP (Wann?)",
                    "de-ch": "BFB39 Datum der Gynäkologische OP (Wann?)"
                }
            },
            "BFB39_Letzte_Periode": {
                "type": "Date",
                "insight2": false,
                "label": {
                    "en": "BFB39 Last Period",
                    "de": "BFB39 Letzte Periode",
                    "de-ch": "BFB39 Letzte Periode"
                }
            },
            "BFB39_Gravidität_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Pregnancy (yes)",
                    "de": "BFB39 Gravidität (Ja)",
                    "de-ch": "BFB39 Gravidität (Ja)"
                }
            },
            "BFB39_Gravidität_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Pregnancy (No)",
                    "de": "BFB39 Gravidität (Nein)",
                    "de-ch": "BFB39 Gravidität (Nein)"
                }
            },
            "BFB39_Path_Gynäkologische_Blutungen_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Path. Gynecological bleeding (yes)",
                    "de": "BFB39 Path. Gynäkologische Blutungen (Ja)",
                    "de-ch": "BFB39 Path. Gynäkologische Blutungen (Ja)"
                }
            },
            "BFB39_Path_Gynäkologische_Blutungen_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Path. Gynecological bleeding (No)",
                    "de": "BFB39 Path. Gynäkologische Blutungen (Nein)",
                    "de-ch": "BFB39 Path. Gynäkologische Blutungen (Nein)"
                }
            },
            "BFB39_Sonstiger_Ausfluss_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Other discharge (yes)",
                    "de": "BFB39 Sonstiger Ausfluss (Ja)",
                    "de-ch": "BFB39 Sonstiger Ausfluss (Ja)"
                }
            },
            "BFB39_Sonstiger_Ausfluss_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Other discharge (No)",
                    "de": "BFB39 Sonstiger Ausfluss (Nein)",
                    "de-ch": "BFB39 Sonstiger Ausfluss (Nein)"
                }
            },
            "BFB39_IUP_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 IUP (Yes)",
                    "de": "BFB39 IUP (Ja)",
                    "de-ch": "BFB39 IUP (Ja)"
                }
            },
            "BFB39_IUP_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 IUP (No)",
                    "de": "BFB39 IUP (Nein)",
                    "de-ch": "BFB39 IUP (Nein)"
                }
            },
            "BFB39_Ovulationshemmer_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Ovulation inhibitors (Yes)",
                    "de": "BFB39 Ovulationshemmer (Ja)",
                    "de-ch": "BFB39 Ovulationshemmer (Ja)"
                }
            },
            "BFB39_Ovulationshemmer_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Ovulation inhibitors (No)",
                    "de": "BFB39 Ovulationshemmer (Nein)",
                    "de-ch": "BFB39 Ovulationshemmer (Nein)"
                }
            },
            "BFB39_Sonstige_Hormon_Anwendung_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Other hormone application (Yes)",
                    "de": "BFB39 Sonstige Hormon-Anwendung (Ja)",
                    "de-ch": "BFB39 Sonstige Hormon-Anwendung (Ja)"
                }
            },
            "BFB39_Sonstige_Hormon_Anwendung_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Other hormone application (No)",
                    "de": "BFB39 Sonstige Hormon-Anwendung (Nein)",
                    "de-ch": "BFB39 Sonstige Hormon-Anwendung (Nein)"
                }
            },
            "BFB39_Art_der_Hormon_Anwendung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 Type of hormone use/application (Which?)",
                    "de": "BFB39 Art der Hormon-Anwendung (Welche?)",
                    "de-ch": "BFB39 Art der Hormon-Anwendung (Welche?)"
                }
            },
            "BFB39_Grund_der_Hormon_Anwendung": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 The basis of the use of hormones (why?)",
                    "de": "BFB39 Grund der Hormon-Anwendung (Warum?)",
                    "de-ch": "BFB39 Grund der Hormon-Anwendung (Warum?)"
                }
            },
            "BFB39_Vulva_Inspektion_auffällig_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Vulva inspection noticeable (yes)",
                    "de": "BFB39 Vulva Inspektion auffällig (Ja)",
                    "de-ch": "BFB39 Vulva Inspektion auffällig (Ja)"
                }
            },
            "BFB39_Vulva_Inspektion_auffällig_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Vulva inspection noticeable (No)",
                    "de": "BFB39 Vulva Inspektion auffällig (Nein)",
                    "de-ch": "BFB39 Vulva Inspektion auffällig (Nein)"
                }
            },
            "BFB39_Portio_und_Vagina_auffällig_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Cervical and vagina noticeable (yes)",
                    "de": "BFB39 Portio und Vagina auffällig (Ja)",
                    "de-ch": "BFB39 Portio und Vagina auffällig (Ja)"
                }
            },
            "BFB39_Portio_und_Vagina_auffällig_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Cervical and vagina noticeable (No)",
                    "de": "BFB39 Portio und Vagina auffällig (Nein)",
                    "de-ch": "BFB39 Portio und Vagina auffällig (Nein)"
                }
            },
            "BFB39_Inneres_Genitale_auffällig_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Inner genital noticeable (yes)",
                    "de": "BFB39 Inneres Genitale auffällig (Ja)",
                    "de-ch": "BFB39 Inneres Genitale auffällig (Ja)"
                }
            },
            "BFB39_Inneres_Genitale_auffällig_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Inner genital noticeable (No)",
                    "de": "BFB39 Inneres Genitale auffällig (Nein)",
                    "de-ch": "BFB39 Inneres Genitale auffällig (Nein)"
                }
            },
            "BFB39_Inguinale_Lymphknoten_auffällig_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Inguinale lymph nodes noticeable (yes)",
                    "de": "BFB39 Inguinale Lymphknoten auffällig (Ja)",
                    "de-ch": "BFB39 Inguinale Lymphknoten auffällig (Ja)"
                }
            },
            "BFB39_Inguinale_Lymphknoten_auffällig_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Inguinale lymph nodes noticeable (No)",
                    "de": "BFB39 Inguinale Lymphknoten auffällig (Nein)",
                    "de-ch": "BFB39 Inguinale Lymphknoten auffällig (Nein)"
                }
            },
            "BFB39_Behandlungsbedürftige_Nebenbefunde_Ja": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Necessary secondary findings (Yes)",
                    "de": "BFB39 Behandlungsbedürftige Nebenbefunde (Ja)",
                    "de-ch": "BFB39 Behandlungsbedürftige Nebenbefunde (Ja)"
                }
            },
            "BFB39_Behandlungsbedürftige_Nebenbefunde_Nein": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Necessary secondary findings (No)",
                    "de": "BFB39 Behandlungsbedürftige Nebenbefunde (Nein)",
                    "de-ch": "BFB39 Behandlungsbedürftige Nebenbefunde (Nein)"
                }
            },
            "BFB39_Klinischer_Befund_unauffaellig": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Clinical findings normal",
                    "de": "BFB39 Klinischer Befund unauffällig",
                    "de-ch": "BFB39 Klinischer Befund unauffällig"
                }
            },
            "BFB39_Klinischer_Befund_auffaellig": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "BFB39 Clinical findings abnormal",
                    "de": "BFB39 Klinischer Befund auffällig",
                    "de-ch": "BFB39 Klinischer Befund auffällig"
                }
            },
            "BFB39_Gyn_Diagnose": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB39 Gyn. Diagnose",
                    "de": "BFB39 Gyn. Diagnose",
                    "de-ch": "BFB39 Gyn. Diagnose"
                }
            },
            "BFB61_Mobility_Check_Limitation": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB61 Mobility Check Limitations",
                    "de": "BFB61 Mobility Check Limitation",
                    "de-ch": "BFB61 Mobility Check Limitation"
                }
            },
            "BFB61_Mobility_Check_Help_Needed": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB61 Mobility Check Help Needed",
                    "de": "BFB61 Mobility Check Help Needed",
                    "de-ch": "BFB61 Mobility Check Help Needed"
                }
            },
            "BFB61_Mobility_Check_Infeasible": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB61 Mobility Check Infeasible",
                    "de": "BFB61 Mobility Check Infeasible",
                    "de-ch": "BFB61 Mobility Check Infeasible"
                }
            },
            "BFB61_Mobility_String": {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "BFB61 Mobility String",
                    "de": "BFB61 Mobility String",
                    "de-ch": "BFB61 Mobility String"
                }
            },
            "hasDoquvide": {
                "type": "Boolean",
                "insight2": true,
                "schema": "patient",
                "model": "patient",
                "label": {
                    "en": "Patient, Doquvide",
                    "de": "Patient, Doquvide",
                    "de-ch": "Patient, Doquvide"
                },
                "description": {
                    "en": "Patient, Doquvide",
                    "de": "Patient, Doquvide",
                    "de-ch": "Patient, Doquvide"
                }
            },
            "doquvidePatientId": {
                "type": "String",
                "insight2": true,
                "schema": "patient",
                "model": "patient",
                "label": {
                    "en": "Patient, Doquvide ID",
                    "de": "Patient, Doquvide ID",
                    "de-ch": "Patient, Doquvide ID"
                },
                "description": {
                    "en": "Patient, Doquvide ID",
                    "de": "Patient, Doquvide ID",
                    "de-ch": "Patient, Doquvide ID"
                }
            },
            "dqsPatientId": {
                "type": "String",
                "insight2": true,
                "schema": "patient",
                "model": "patient",
                "label": {
                    "en": "Patient, DQS ID",
                    "de": "Patient, DQS ID",
                    "de-ch": "Patient, DQS ID"
                },
                "description": {
                    "en": "Patient, DQS ID",
                    "de": "Patient, DQS ID",
                    "de-ch": "Patient, DQS ID"
                }
            },
            "hasCardiacDevice": {
                "type": "Boolean",
                "insight2": true,
                "schema": "patient",
                "model": "patient",
                "label": {
                    "en": "Has cardiac device",
                    "de": "hat Implantat",
                    "de-ch": "hat Implantat"
                },
                "description": {
                    "en": "Has cardiac device (pacemaker, defibrillator, loop recorder, etc)",
                    "de": "Patient mit Ereignisrekorder, Schrittmacher oder Defibrillator",
                    "de-ch": "Patient mit Ereignisrekorder, Schrittmacher oder Defibrillator"
                }
            },
            "cardiacDeviceNumber": {
                "type": "String",
                "insight2": true,
                "schema": "patient",
                "model": "patient",
                "label": {
                    "en": "Cardiac device serial number",
                    "de": "Implantatnummer",
                    "de-ch": "Implantatnummer"
                },
                "description": {
                    "en": "Cardiac device serial number",
                    "de": "Implantatnummer",
                    "de-ch": "Implantatnummer"
                }
            },
            "cardiacDeviceManufacturer": {
                "type": "String",
                "insight2": true,
                "schema": "patient",
                "model": "patient",
                "label": {
                    "en": "Cardiac device manufacturer",
                    "de": "Implantathersteller",
                    "de-ch": "Implantathersteller"
                },
                "description": {
                    "en": "Cardiac device manufacturer",
                    "de": "Implantathersteller",
                    "de-ch": "Implantathersteller"
                }
            },
            "nightTime": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "nightTime",
                    "de": "noctu",
                    "de-ch": "noctu"
                }
            },
            "otherInsurance": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "otherInsurance",
                    "de": "Sonstige (K/T)",
                    "de-ch": "Sonstige (K/T)"
                }
            },
            "workAccident": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "workAccident",
                    "de": "Arb.unfall",
                    "de-ch": "Arb.unfall"
                }
            },
            "assistive": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "assistive",
                    "de": "Hilfsmittel",
                    "de-ch": "Hilfsmittel"
                }
            },
            "vaccination": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "vaccination",
                    "de": "Impfstoff",
                    "de-ch": "Impfstoff"
                }
            },
            "practiceAssistive": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "practiceAssistive",
                    "de": "Spr.Std.Bedarf",
                    "de-ch": "Spr.Std.Bedarf"
                }
            },
            "dentist": {
                "type": "Boolean",
                "insight2": false,
                "label": {
                    "en": "dentist",
                    "de": "Begr.Pflicht",
                    "de-ch": "Begr.Pflicht"
                }
            },
            "isPatientBVG": {
                "insight2": false,
                "label": {
                    "en": "BVG",
                    "de": "BVG",
                    "de-ch": "BVG"
                }
            },
            "correctUsage": {
                "insight2": false,
                "label": {
                    "en": "correctUsage",
                    "de": "Sich.eingehalten",
                    "de-ch": "Sich.eingehalten"
                }
            },
            "patientInformed": {
                "insight2": false,
                "label": {
                    "en": "patientInformed",
                    "de": "Infomaterial ausg.",
                    "de-ch": "Infomaterial ausg."
                }
            },
            "inLabel": {
                "insight2": false,
                "label": {
                    "en": "inLabel",
                    "de": "In-Label",
                    "de-ch": "In-Label"
                }
            },
            "offLabel": {
                "insight2": false,
                "label": {
                    "en": "offLabel",
                    "de": "Off-Label",
                    "de-ch": "Off-Label"
                }
            },
            "exactMed1": {
                "insight2": false,
                "label": {
                    "en": "aut idem med1",
                    "de": "aut idem med1",
                    "de-ch": "aut idem med1"
                }
            },
            "exactMed2": {
                "insight2": false,
                "label": {
                    "en": "aut idem med2",
                    "de": "aut idem med2",
                    "de-ch": "aut idem med2"
                }
            },
            "exactMed3": {
                "insight2": false,
                "label": {
                    "en": "aut idem med3",
                    "de": "aut idem med3",
                    "de-ch": "aut idem med3"
                }
            },

            //  Only for BIOTRONIC events (tables of repeating entities from XML about cardiac event)

            "MDC_IDC_EPISODE_CURRENT": {
                "type": "MdcIdcEpisode_T",
                "insight2": false,
                "label": {
                    "en": "MDC_IDC_EPISODE (current)",
                    "de": "MDC_IDC_EPISODE (actual)",
                    "de-ch": "MDC_IDC_EPISODE (actual)"
                }
            },
            "MDC_IDC_EPISODE": {
                "type": "MdcIdcEpisode_T",
                "insight2": false,
                "label": {
                    "en": "MDC_IDC_EPISODE (all)",
                    "de": "MDC_IDC_EPISODE (alle)",
                    "de-ch": "MDC_IDC_EPISODE (alle)"
                }
            },
            "MDC_IDC_LEAD": {
                "type": "MdcIdcLead_T",
                "insight2": false,
                "label": {
                    "en": "MDC_IDC_LEAD",
                    "de": "MDC_IDC_LEAD",
                    "de-ch": "MDC_IDC_LEAD"
                }
            },
            "MDC_IDC_SET_ZONE": {
                "type": "MdcIdcZone_T",
                "insight2": false,
                "label": {
                    "en": "MDC_IDC_SET_ZONE",
                    "de": "MDC_IDC_SET_ZONE",
                    "de-ch": "MDC_IDC_SET_ZONE"
                }
            },

            //  Only for Gravidogramm, and only with inGyn licence

            "fetuses": {
                "type": "String",
                "label": {
                    "en": "Fetuses",
                    "de": "Föten",
                    "de-ch": "Föten"
                }
            },
            "initialWeight": {
                "type": "String",
                "label": {
                    "en": "Initial weight",
                    "de": "Ausgangsgewicht vor der SS",
                    "de-ch": "Ausgangsgewicht vor der SS"
                }
            },
            "pevlivcMeasurementSP25": {
                "type": "String",
                "label": {
                    "en": "Pelvic Measurement Sp. 25",
                    "de": "Beckenmaße Sp. 25",
                    "de-ch": "Beckenmasse Sp. 25"
                }
            },
            "pevlivcMeasurementCR28": {
                "type": "String",
                "label": {
                    "en": "Pelvic Measurement Cr. 28",
                    "de": "Beckenmaße Cr. 28",
                    "de-ch": "Beckenmasse Cr. 28"
                }
            },
            "pevlivcMeasurementTR31": {
                "type": "String",
                "label": {
                    "en": "Pelvic Measurement TR. 31",
                    "de": "Beckenmaße Tr. 31",
                    "de-ch": "Beckenmasse Tr. 31"
                }
            },
            "pevlivcMeasurementC20": {
                "type": "String",
                "label": {
                    "en": "Pelvic Measurement C. 20",
                    "de": "Beckenmaße C. 20",
                    "de-ch": "Beckenmasse C. 20"
                }
            },
            "rubellaTiter": {
                "type": "String",
                "label": {
                    "en": "Rubella Titer",
                    "de": "Rötelntiter",
                    "de-ch": "Rötelntiter"
                }
            },
            "antibody1": {
                "type": "String",
                "label": {
                    "en": "Antibody I.",
                    "de": "Antikörper I.",
                    "de-ch": "Antikörper I."
                }
            },
            "antibody2": {
                "type": "String",
                "label": {
                    "en": "Antibody II.",
                    "de": "Antikörper II.",
                    "de-ch": "Antikörper II."
                }
            },
            "HBsAg": {
                "type": "String",
                "label": {
                    "en": "HBsAg",
                    "de": "HBsAg",
                    "de-ch": "HBsAg"
                }
            },
            "syphillis": {
                "type": "String",
                "label": {
                    "en": "Syphillis",
                    "de": "Lues",
                    "de-ch": "Lues"
                }
            },
            "toxoplasmosis": {
                "type": "String",
                "label": {
                    "en": "Toxoplasmosis",
                    "de": "Toxo",
                    "de-ch": "Toxo"
                }
            },
            "HIV": {
                "type": "String",
                "label": {
                    "en": "HIV",
                    "de": "HIV",
                    "de-ch": "HIV"
                }
            },
            "chlamidia": {
                "type": "String",
                "label": {
                    "en": "Chlamidia",
                    "de": "Chlamydien",
                    "de-ch": "Chlamydien"
                }
            },
            "glucoseTolerance": {
                "type": "String",
                "label": {
                    "en": "Glocose tolerance test",
                    "de": "Glukosetoleranztest",
                    "de-ch": "Glukosetoleranztest"
                }
            },
            "gravidogrammTable": {
                "type": "GravidogrammItem_T",
                "label": {
                    "en": "Gravidogramm table",
                    "de": "Gravidogrammtabelle",
                    "de-ch": "Gravidogrammtabelle"
                }
            },
            "entityName": {
                "type": "String",
                "insight2": true,
                "schema": "syncreporting",
                "model": "syncreporting",
                "path": "entityName",
                "label": {
                    "en": "Reporting entry type",
                    "de": "Report Eintragstyp",
                    "de-ch": "Report Eintragstyp"
                }
            },
            "ambulantePsychotherapeutischeAkutbehandlung": {
                "schema": "activity",
                "path": "ambulantePsychotherapeutischeAkutbehandlung",
                "label": {
                    "en": "ambulante Psychotherapeutische Akutbehandlung (PTV11)",
                    "de": "ambulante Psychotherapeutische Akutbehandlung (PTV11)",
                    "de-ch": "ambulante Psychotherapeutische Akutbehandlung (PTV11)"
                }
            },
            "ambulantePsychoTherapie": {
                "schema": "activity",
                "path": "ambulantePsychoTherapie",
                "label": {
                    "en": "ambulante PsychoTherapie (PTV11)",
                    "de": "ambulante PsychoTherapie (PTV11)",
                    "de-ch": "ambulante PsychoTherapie (PTV11)"
                }
            },
            "zeitnahErforderlich": {
                "schema": "activity",
                "path": "ambulantePsychotherapeutischeAkutbehandlung",
                "label": {
                    "en": "zeitnah Erforderlich (PTV11)",
                    "de": "zeitnah Erforderlich (PTV11)",
                    "de-ch": "zeitnah Erforderlich (PTV11)"
                }
            },
            "analytischePsychotherapie": {
                "schema": "activity",
                "path": "analytischePsychotherapie",
                "label": {
                    "en": "Analytische Psychotherapie (PTV11)",
                    "de": "Analytische Psychotherapie (PTV11)",
                    "de-ch": "Analytische Psychotherapie (PTV11)"
                }
            },
            "tiefenpsychologischFundiertePsychotherapie": {
                "schema": "activity",
                "path": "tiefenpsychologischFundiertePsychotherapie",
                "label": {
                    "en": "Tiefenpsychologisch fundierte Psychotherapie (PTV11)",
                    "de": "Tiefenpsychologisch fundierte Psychotherapie (PTV11)",
                    "de-ch": "Tiefenpsychologisch fundierte Psychotherapie (PTV11)"
                }
            },
            "verhaltenstherapie": {
                "schema": "activity",
                "path": "verhaltenstherapie",
                "label": {
                    "en": "Verhaltenstherapie (PTV11)",
                    "de": "Verhaltenstherapie (PTV11)",
                    "de-ch": "Verhaltenstherapie (PTV11)"
                }
            },
            "naehereAngabenZuDenEmpfehlungen": {
                "schema": "activity",
                "path": "naehereAngabenZuDenEmpfehlungen",
                "label": {
                    "en": "nähere Angaben zu den Empfehlungen (PTV11)",
                    "de": "nähere Angaben zu den Empfehlungen (PTV11)",
                    "de-ch": "nähere Angaben zu den Empfehlungen (PTV11)"
                }
            },

            //  INGREDIENTPLAN / Wirkstoffplan + MEDDATA / Medizindaten reporting
            //  comment, group and dosis already defined above

            "medDataType": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Med data parameter",
                    "de": "Medizindaten-Parameter",
                    "de-ch": "Medizindaten-Parameter"
                }
            },
            "ingredientName": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Active ingredient",
                    "de": "Wirkstoff",
                    "de-ch": "Wirkstoff"
                }
            },
            "value": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Value (med data / ingredient plan)",
                    "de": "Wert (Medizindaten / Wirkstoffplan)",
                    "de-ch": "Wert (Medizindaten / Wirkstoffplan)"
                }
            },
            "textValue": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Text value (med data / ingredient plan)",
                    "de": "Text (Medizindaten / Wirkstoffplan)",
                    "de-ch": "Text (Medizindaten / Wirkstoffplan)"
                }
            },
            "categoryTranslated": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Category",
                    "de": "Kategorie",
                    "de-ch": "Kategorie"
                }
            },
            "unit": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Unit (med data / ingredient plan)",
                    "de": "Einheit (Medizindaten / Wirkstoffplan)",
                    "de-ch": "Einheit (Medizindaten / Wirkstoffplan)"
                }
            },
            "initialDosis": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Start dosis",
                    "de": "Start-Dosis",
                    "de-ch": "Start-Dosis"
                }
            },
            "targetDosis": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Target Dosis",
                    "de": "Ziel-Dosis",
                    "de-ch": "Ziel-Dosis"
                }
            },
            "noteOnAdaption": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Note on adaptation",
                    "de": "Anpassung",
                    "de-ch": "Anpassung"
                }
            },
            "stage": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "stage",
                    "de": "Stufe",
                    "de-ch": "Stufe"
                }
            },
            "strength": {
                "insight2": true,
                "model": "meddata",
                "type": "String",
                "label": {
                    "en": "Strength",
                    "de": "Wirkstärke",
                    "de-ch": "Wirkstärke"
                }
            },
            "medicalTaxPoints": {
                "schema": "activity",
                "path": "medicalTaxPoints",
                "label": {
                    "-en": "Medical service",
                    "-de": "Ärztliche Leistung (AL)",
                    "-de-ch": "Ärztliche Leistung (AL)"
                },
                "rendererName": "currencyFormat"
            },
            "technicalTaxPoints": {
                "schema": "activity",
                "path": "technicalTaxPoints",
                "label": {
                    "-en": "Technical service",
                    "-de": "Technische Leistung (TL)",
                    "-de-ch": "Technische Leistung (TL)"
                },
                "rendererName": "currencyFormat"
            },
            "assistanceTaxPoints": {
                "schema": "activity",
                "path": "assistanceTaxPoints",
                "label": {
                    "-en": "Assitance",
                    "-de": "Assistenz",
                    "-de-ch": "Assistenz"
                }
            },
            "medicalScalingFactor": {
                "schema": "activity",
                "path": "assistanceTaxPoints",
                "label": {
                    "-en": "Medical scaling factor",
                    "-de": "Medizinischer Skalierungsfaktor",
                    "-de-ch": "Medizinischer Skalierungsfaktor"
                }
            },
            "technicalScalingFactor": {
                "schema": "activity",
                "path": "technicalScalingFactor",
                "label": {
                    "-en": "Technical scaling factor",
                    "-de": "Technisher Skalierungsfaktor",
                    "-de-ch": "Technisher Skalierungsfaktor"
                }
            },
            "taxPointValue": {
                "schema": "activity",
                "path": "taxPointValue",
                "label": {
                    "en": "Tarmed Tax Point Value",
                    "-de": "Tarmed Taxpunktwerte",
                    "de-ch": "Tarmed Taxpunktwerte"
                }
            },

            "patientDbId": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Patient ID",
                    "de": "Patient ID",
                    "de-ch": "Patient ID"
                }
            },
            "patientSince": {
                "type": "Date",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Patient since",
                    "de": "Patient seit",
                    "de-ch": "Patient seit"
                }
            },
            "insuranceGrpId": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance grp. ID",
                    "de": "VKNR",
                    "de-ch": "VKNR"
                }
            },
            "costCarrierBillingSection": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Cost Carrier Billing Section",
                    "de": "Kostenträgerabrechnungsbereich (KTAB)",
                    "de-ch": "Kostenträgerabrechnungsbereich (KTAB)"
                }
            },
            "lastCardRead": {
                "type": "Date",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Reading date of electronic health card",
                    "de": "Lesedatum EGK",
                    "de-ch": "Lesedatum EGK"
                }
            },
            "patientVersion": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: ID",
                    "de": "PatVer: ID",
                    "de-ch": "PatVer: ID"
                }
            },
            "updateDatum": {
                "type": "Date",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Update date",
                    "de": "PatVer: Update-Datum",
                    "de-ch": "PatVer: Update-Datum"
                }
            },

            "patVer_title": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Title",
                    "de": "PatVer: Titel",
                    "de-ch": "PatVer: Titel"
                }
            },
            "patVer_lastname": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Pat. Surname",
                    "de": "PatVer: Pat. Nachname",
                    "de-ch": "PatVer: Pat. Nachname"
                }
            },
            "patVer_gender": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Gender",
                    "de": "PatVer: Geschlecht",
                    "de-ch": "PatVer: Geschlecht"
                }
            },
            "patVer_bestPatientPhone": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Best phone number. Patient",
                    "de": "PatVer: Beste Telefonnr. Patient",
                    "de-ch": "PatVer: Beste Telefonnr. Patient"
                }
            },
            "patVer_street": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Street",
                    "de": "PatVer: Strasse",
                    "de-ch": "PatVer: Strasse"
                }
            },
            "patVer_houseno": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: House No.",
                    "de": "PatVer: Hausnummer",
                    "de-ch": "PatVer: Hausnummer"
                }
            },
            "patVer_zip": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Post Code",
                    "de": "PatVer: PLZ",
                    "de-ch": "PatVer: PLZ"
                }
            },
            "patVer_city": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: City",
                    "de": "PatVer: Stadt",
                    "de-ch": "PatVer: Stadt"
                }
            },
            "patVer_countryCode": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Country Code",
                    "de": "PatVer: Ländercode",
                    "de-ch": "PatVer: Ländercode"
                }
            },
            "patVer_insuranceName": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Insurance name",
                    "de": "PatVer: Kostenträger",
                    "de-ch": "PatVer: Kostenträger"
                }
            },
            "patVer_insuranceKind": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Insurance Type",
                    "de": "PatVer: Versicherungsart",
                    "de-ch": "PatVer: Versicherungsart"
                }
            },
            "patVer_insuranceNo": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Insurance no.",
                    "de": "PatVer: Versicherten-Nr.",
                    "de-ch": "PatVer: Versicherten-Nr."
                }
            },
            "patVer_insuranceId": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Insurance iD",
                    "de": "PatVer: IKNR",
                    "de-ch": "PatVer: IKNR"
                }
            },
            "patVer_persGroup": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Special Group",
                    "de": "PatVer: Besondere Personen Gruppe",
                    "de-ch": "PatVer: Besondere Personen Gruppe"
                }
            },
            "patVer_costCarrierBillingSection": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Cost Carrier Billing Section",
                    "de": "PatVer: Kostenträgerabrechnungsbereich (KTAB)",
                    "de-ch": "PatVer: Kostenträgerabrechnungsbereich (KTAB)"
                }

            },
            "patVer_lastCardRead": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Reading date of electronic health card",
                    "de": "PatVer: Lesedatum EGK",
                    "de-ch": "PatVer: Lesedatum EGK"
                }
            },
            "patVer_insuranceGrpId": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "PatVer: Insurance grp. ID",
                    "de": "PatVer: VKNR",
                    "de-ch": "PatVer: VKNR"
                }
            },

            "feeSchedule": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurace fee schedule",
                    "de": "Gebührenordnung der Versicherung",
                    "de-ch": "Gebührenordnung der Versicherung"
                }
            },
            "insuranceType": {
                "type": "String",
                "insight2": true,
                "model": "patient",
                "label": {
                    "en": "Insurance type",
                    "de": "Versicherungstyp",
                    "de-ch": "Versicherungstyp"
                }

            },
            "scheinType": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["SCHEIN"],
                "label": {
                    "en": "group code",
                    "de": "Gruppencode",
                    "de-ch": "Gruppencode"
                }
            },
            "scheinSubgroup": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["SCHEIN"],
                "label": {
                    "en": "Subgroup code",
                    "de": "Untergruppencode",
                    "de-ch": "Untergruppencode"
                }
            },
            "scheinSettledDate": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["SCHEIN", "PKVSCHEIN"],
                "label": {
                    "en": "Invoice date",
                    "de": "Abrechnungsdatum",
                    "de-ch": "Abrechnungsdatum"
                }
            },
            "continuousDiagIds": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Continuous diagnoses IDs",
                    "de": "Dauerdiagnosen IDs",
                    "de-ch": "Dauerdiagnosen IDs"
                }
            },
            "pzq": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "KBV Quartalsprofil",
                    "de": "KBV Quartalsprofil",
                    "de-ch": "KBV Quartalsprofil"
                }
            },
            "pzt": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "KBV Tagesprofil",
                    "de": "KBV Tagesprofil",
                    "de-ch": "KBV Tagesprofil"
                }
            },
            "testTime": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "Test Time (daily)",
                    "de": "Pruefzeit Tag",
                    "de-ch": "Pruefzeit Tag"
                }
            },
            "timeRequirement": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "KBV Time Required",
                    "de": "KBV Zeitbedarf",
                    "de-ch": "KBV Zeitbedarf"
                }
            },
            "kbvScore": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "KBV score",
                    "de": "KBV Punktmenge",
                    "de-ch": "KBV Punktmenge"
                }
            },
            "expenseType": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "KBV Treatment type",
                    "de": "KBV Leistung Typ",
                    "de-ch": "KBV Leistung Typ"
                }
            },
            "treatmentExplanations": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "Treatment explanation",
                    "de": "Begründung der Leistung",
                    "de-ch": "Begründung der Leistung"
                }
            },
            "ageRestrictions": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["TREATMENT"],
                "label": {
                    "en": "Age limitation",
                    "de": "Altersbegrenzung",
                    "de-ch": "Altersbegrenzung"
                }
            },
            "diagnosisSite": {
                "type": "String",
                "insight2": true,
                "model": "activity",
                "schema": "activity",
                "actTypes": ["DIAGNOSIS"],
                "label": {
                    "en": "Diagnosis, site",
                    "de": "Diagnose, Seite",
                    "de-ch": "Diagnose, Seite"
                }
            },
            "referringDoctorId": {
                "type": "String",
                "insight2": true,
                "model": "virtualFields",
                "label": {
                    "en": "Referring doctor ID",
                    "de": "Überweiser ID",
                    "de-ch": "Überweiser ID"
                }
            },
            "referringDoctorTitle": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, title",
                    "de": "Überweiser, Titel",
                    "de-ch": "Überweiser, Titel"
                }
            },
            "referringDoctorFirstname": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, firstname",
                    "de": "Überweiser, Vorname",
                    "de-ch": "Überweiser, Vorname"
                }
            },
            "referringDoctorLastname": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, lastname",
                    "de": "Überweiser, Nachname",
                    "de-ch": "Überweiser, Nachname"
                }
            },
            "referringDoctorStreet": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, street",
                    "de": "Überweiser, Strasse",
                    "de-ch": "Überweiser, Strasse"
                }
            },
            "referringDoctorHouseNo": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, Houseno.",
                    "de": "Überweiser, Hausnr.",
                    "de-ch": "Überweiser, Hausnr."
                }
            },
            "referringDoctorZip": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, Zip",
                    "de": "Überweiser, PLZ",
                    "de-ch": "Überweiser, PLZ"
                }
            },
            "referringDoctorCity": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, city",
                    "de": "Überweiser, Stadt",
                    "de-ch": "Überweiser, Stadt"
                }
            },
            "referringDoctorInstitutionType": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, institution type",
                    "de": "Überweiser, Arzttyp",
                    "de-ch": "Überweiser, Arzttyp"
                }
            },
            "referringDoctorExpertise": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, expertise",
                    "de": "Überweiser, Fachrichtungen",
                    "de-ch": "Überweiser, Fachrichtungen"
                }
            },
            "referringDoctorLANR": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, LANR",
                    "de": "Überweiser, LANR",
                    "de-ch": "Überweiser, LANR"
                }
            },
            "referringDoctorBSNR": {
                "type": "String",
                "insight2": true,
                "model": "basecontact",
                "label": {
                    "en": "Referring doctor, BSNR",
                    "de": "Überweiser, BSNR",
                    "de-ch": "Überweiser, BSNR"
                }
            },
            "timestampDate": {
                "type": "Date",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Activity, date",
                    "de": "Aktivität, Datum",
                    "de-ch": "Aktivität, Datum"
                }
            },
            "time": {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Activity, time",
                    "de": "Aktivität, Uhrzeit",
                    "de-ch": "Aktivität, Uhrzeit"
                }

            },

            // AMTS Follow-up and Anamnesis bindings

            "AMTS_Anamnesis_Healthstatus_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_00",
                    "de": "AMTS_Anamnese_Gesundheitszustand_00",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_00"
                }
            },
            "AMTS_Anamnesis_Healthstatus_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_01",
                    "de": "AMTS_Anamnese_Gesundheitszustand_01",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_01"
                }
            },
            "AMTS_Anamnesis_Healthstatus_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_02",
                    "de": "AMTS_Anamnese_Gesundheitszustand_02",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_02"
                }
            },
            "AMTS_Anamnesis_Healthstatus_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_03",
                    "de": "AMTS_Anamnese_Gesundheitszustand_03",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_03"
                }
            },
            "AMTS_Anamnesis_Healthstatus_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_04",
                    "de": "AMTS_Anamnese_Gesundheitszustand_04",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_04"
                }
            },
            "AMTS_Anamnesis_Healthstatus_05": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_05",
                    "de": "AMTS_Anamnese_Gesundheitszustand_05",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_05"
                }
            },
            "AMTS_Anamnesis_Healthstatus_06": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_06",
                    "de": "AMTS_Anamnese_Gesundheitszustand_06",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_06"
                }
            },
            "AMTS_Anamnesis_Healthstatus_07": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_07",
                    "de": "AMTS_Anamnese_Gesundheitszustand_07",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_07"
                }
            },
            "AMTS_Anamnesis_Healthstatus_08": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_08",
                    "de": "AMTS_Anamnese_Gesundheitszustand_08",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_08"
                }
            },
            "AMTS_Anamnesis_Healthstatus_09": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_09",
                    "de": "AMTS_Anamnese_Gesundheitszustand_09",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_09"
                }
            },
            "AMTS_Anamnesis_Healthstatus_10": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Healthstatus_10",
                    "de": "AMTS_Anamnese_Gesundheitszustand_10",
                    "de-ch": "AMTS_Anamnese_Gesundheitszustand_10"
                }
            },
            "AMTS_Anamnesis_Symptom_DIZZINESS": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_DIZZINESS",
                    "de": "AMTS_Anamnese_Symptom_SCHWINDEL",
                    "de-ch": "AMTS_Anamnese_Symptom_SCHWINDEL"
                }
            },
            "AMTS_Anamnesis_Symptom_BLURRED_VISION": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_BLURRED_VISION",
                    "de": "AMTS_Anamnese_Symptom_SEHSTOERUNG",
                    "de-ch": "AMTS_Anamnese_Symptom_SEHSTOERUNG"
                }
            },
            "AMTS_Anamnesis_Symptom_FALL": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_FALL",
                    "de": "AMTS_Anamnese_Symptom_STURZ",
                    "de-ch": "AMTS_Anamnese_Symptom_STURZ"
                }
            },
            "AMTS_Anamnesis_Symptom_HEADACHE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_HEADACHE",
                    "de": "AMTS_Anamnese_Symptom_KOPFSCHMERZEN",
                    "de-ch": "AMTS_Anamnese_Symptom_KOPFSCHMERZEN"
                }
            },
            "AMTS_Anamnesis_Symptom_ANOREXIA": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_ANOREXIA",
                    "de": "AMTS_Anamnese_Symptom_APPETITLOSIGKEIT",
                    "de-ch": "AMTS_Anamnese_Symptom_APPETITLOSIGKEIT"
                }
            },
            "AMTS_Anamnesis_Symptom_DIARRHEA": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_DIARRHEA",
                    "de": "AMTS_Anamnese_Symptom_DURCHFALL",
                    "de-ch": "AMTS_Anamnese_Symptom_DURCHFALL"
                }
            },
            "AMTS_Anamnesis_Symptom_VOMIT": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_VOMIT",
                    "de": "AMTS_Anamnese_Symptom_ERBRECHEN",
                    "de-ch": "AMTS_Anamnese_Symptom_"
                }
            },
            "AMTS_Anamnesis_Symptom_STOMACH_DISCOMFORT": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_ABDOMINAL_PAIN",
                    "de": "AMTS_Anamnese_Symptom_BAUCHSCHMERZEN",
                    "de-ch": "AMTS_Anamnese_Symptom_BAUCHSCHMERZEN"
                }
            },
            "AMTS_Anamnesis_Symptom_DRY_MOUTH": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_DRY_MOUTH",
                    "de": "AMTS_Anamnese_Symptom_MUNDTROCKENHEIT",
                    "de-ch": "AMTS_Anamnese_Symptom_MUNDTROCKENHEIT"
                }
            },
            "AMTS_Anamnesis_Symptom_DIFFICULTIES_SWALLOWING": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_DIFFICULTIES_SWALLOWING",
                    "de": "AMTS_Anamnese_Symptom_SCHLUCKBESCHWERDEN",
                    "de-ch": "AMTS_Anamnese_Symptom_SCHLUCKBESCHWERDEN"
                }
            },
            "AMTS_Anamnesis_Symptom_HEARTBURN": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_HEARTBURN",
                    "de": "AMTS_Anamnese_Symptom_SODBRENNEN",
                    "de-ch": "AMTS_Anamnese_Symptom_SODBRENNEN"
                }
            },
            "AMTS_Anamnesis_Symptom_NAUSEA": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_NAUSEA",
                    "de": "AMTS_Anamnese_Symptom_UEBELKEIT",
                    "de-ch": "AMTS_Anamnese_Symptom_UEBELKEIT"
                }
            },
            "AMTS_Anamnesis_Symptom_CONSTIPATION": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_CONSTIPATION",
                    "de": "AMTS_Anamnese_Symptom_VERSTOPFUNG",
                    "de-ch": "AMTS_Anamnese_Symptom_VERSTOPFUNG"
                }
            },
            "AMTS_Anamnesis_Symptom_SKIN_RASH": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_SKIN_RASH",
                    "de": "AMTS_Anamnese_Symptom_HAUTAUSSCHLAG",
                    "de-ch": "AMTS_Anamnese_Symptom_HAUTAUSSCHLAG"
                }
            },
            "AMTS_Anamnesis_Symptom_ITCHING": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_ITCHING",
                    "de": "AMTS_Anamnese_Symptom_JUCKREIZ",
                    "de-ch": "AMTS_Anamnese_Symptom_JUCKREIZ"
                }
            },
            "AMTS_Anamnesis_Symptom_SWOLLEN_LEGS": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_EDEMA_SWOLLEN_LEGS",
                    "de": "AMTS_Anamnese_Symptom_OEDEME_WASSEREINLAGERUNG_SCHWELLUNG",
                    "de-ch": "AMTS_Anamnese_Symptom_OEDEME_WASSEREINLAGERUNG_SCHWELLUNG"
                }
            },
            "AMTS_Anamnesis_Symptom_MUSCLE_PAIN": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_MUSCLE_PAIN",
                    "de": "AMTS_Anamnese_Symptom_MUSKELSCHMERZEN",
                    "de-ch": "AMTS_Anamnese_Symptom_MUSKELSCHMERZEN"
                }
            },
            "AMTS_Anamnesis_Symptom_TENDENCY_TO_BRUISES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_TENDENCY_TO_BRUISES",
                    "de": "AMTS_Anamnese_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN",
                    "de-ch": "AMTS_Anamnese_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN"
                }
            },
            "AMTS_Anamnesis_Symptom_NOSEBLEEDS": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_NOSEBLEEDS",
                    "de": "AMTS_Anamnese_Symptom_NASENBLUTEN",
                    "de-ch": "AMTS_Anamnese_Symptom_NASENBLUTEN"
                }
            },
            "AMTS_Anamnesis_Symptom_BLEEDING_GUMS": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_BLEEDING_GUMS",
                    "de": "AMTS_Anamnese_Symptom_ZAHNFLEISCHBLUTEN",
                    "de-ch": "AMTS_Anamnese_Symptom_ZAHNFLEISCHBLUTEN"
                }
            },
            "AMTS_Anamnesis_Symptom_BREATHING_PROBLEMS": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_BREATHING_PROBLEMS",
                    "de": "AMTS_Anamnese_Symptom_ATEMPROBLEME",
                    "de-ch": "AMTS_Anamnese_Symptom_ATEMPROBLEME"
                }
            },
            "AMTS_Anamnesis_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS",
                    "de": "AMTS_Anamnese_Symptom_HERZ_KREISLAUF_PROBLEME",
                    "de-ch": "AMTS_Anamnese_Symptom_HERZ_KREISLAUF_PROBLEME"
                }
            },
            "AMTS_Anamnesis_Symptom_INSOMNIA": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_INSOMNIA",
                    "de": "AMTS_Anamnese_Symptom_SCHLAFSTOERUNG",
                    "de-ch": "AMTS_Anamnese_Symptom_SCHLAFSTOERUNG"
                }
            },
            "AMTS_Anamnesis_Symptom_SEXUAL_DYSFUNCTION": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_SEXUAL_DYSFUNCTION",
                    "de": "AMTS_Anamnese_Symptom_SEXUELLE_DYSFUNKTION",
                    "de-ch": "AMTS_Anamnese_Symptom_SEXUELLE_DYSFUNKTION"
                }
            },
            "AMTS_Anamnesis_Symptom_FREE_TEXT_CHECKBOX": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_FREE_TEXT_CHECKBOX",
                    "de": "AMTS_Anamnese_Symptom_FREITEXT_CHECKBOX",
                    "de-ch": "AMTS_Anamnese_Symptom_FREITEXT_CHECKBOX"
                }
            },
            "AMTS_Anamnesis_Symptom_FREE_TEXT": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Symptom_FREE_TEXT",
                    "de": "AMTS_Anamnese_Symptom_FREITEXT",
                    "de-ch": "AMTS_Anamnese_Symptom_FREITEXT"
                }
            },
            "AMTS_Anamnesis_Goals_Create_MedPlan": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Create_MedPlan",
                    "de": "AMTS_Anamnese_Ziele_Medikationsplan_erstellen",
                    "de-ch": "AMTS_Anamnese_Ziele_Medikationsplan_erstellen"
                }
            },
            "AMTS_Anamnesis_Goals_Sideeffect_Check": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Sideeffect_Check",
                    "de": "AMTS_Anamnese_Ziele_Nebenwirkungen_pruefen",
                    "de-ch": "AMTS_Anamnese_Ziele_Nebenwirkungen_pruefen"
                }
            },
            "AMTS_Anamnesis_Goals_Interaction_Check": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Interaction_Check",
                    "de": "AMTS_Anamnese_Ziele_Wechselwirkungen_pruefen",
                    "de-ch": "AMTS_Anamnese_Ziele_Wechselwirkungen_pruefen"
                }
            },
            "AMTS_Anamnesis_Goals_Safe_Application": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Safe_Application",
                    "de": "AMTS_Anamnese_Ziele_Sicherheit_bei_Anwendung",
                    "de-ch": "AMTS_Anamnese_Ziele_Sicherheit_bei_Anwendung"
                }
            },
            "AMTS_Anamnesis_Goals_Increase_Therapy_Effectiveness": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Increase_Therapy_Effectivenes",
                    "de": "AMTS_Anamnese_Ziele_Therapie_Effektivitaet_erhoehen",
                    "de-ch": "AMTS_Anamnese_Ziele_Therapie_Effektivitaet_erhoehen"
                }
            },
            "AMTS_Anamnesis_Goals_Improve_Drug_Knowledge": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Improve_Drug_Knowledge",
                    "de": "AMTS_Anamnese_Ziele_Medikamente_besser_verstehen",
                    "de-ch": "AMTS_Anamnese_Ziele_Medikamente_besser_verstehen"
                }
            },
            "AMTS_Anamnesis_Goals_Disease_Knowledge": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Increase_Disease_Knowledge",
                    "de": "AMTS_Anamnese_Ziele_Ueber_Krankheiten_informiert_sein",
                    "de-ch": "AMTS_Anamnese_Ziele_Ueber_Krankheiten_informiert_sein"
                }
            },
            "AMTS_Anamnesis_Goals_Reduce_Medication_Amount": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Reduce_Medication_Amount",
                    "de": "AMTS_Anamnese_Ziele_Medikamentenanzahl_verringern",
                    "de-ch": "AMTS_Anamnese_Ziele_Medikamentenanzahl_verringern"
                }
            },
            "AMTS_Anamnesis_Goals_Discontinue_Medication": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Discontinue_Medication",
                    "de": "AMTS_Anamnese_Ziele_Konkreter_Absetzwunsch",
                    "de-ch": "AMTS_Anamnese_Ziele_Konkreter_Absetzwunsch"
                }
            },
            "AMTS_Anamnesis_Goals_Improve_Symptoms": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Improve_Symptoms",
                    "de": "AMTS_Anamnese_Ziele_Symptome_verbessern",
                    "de-ch": "AMTS_Anamnese_Ziele_Symptome_verbessern"
                }
            },
            "AMTS_Anamnesis_Goals_Improve_Psyche": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Improve_Psyche",
                    "de": "AMTS_Anamnese_Ziele_Psychische_Situation_Verbessern",
                    "de-ch": "AMTS_Anamnese_Ziele_Psychische_Situation_Verbessern"
                }
            },
            "AMTS_Anamnesis_Goals_Increase_Physical_Performance": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Increase_Physical_Performance",
                    "de": "AMTS_Anamnese_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern",
                    "de-ch": "AMTS_Anamnese_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern"
                }
            },
            "AMTS_Anamnesis_Goals_Second_Opinion": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Second_Opinion",
                    "de": "AMTS_Anamnese_Ziele_Zweitmeinung_einholen",
                    "de-ch": "AMTS_Anamnese_Ziele_Zweitmeinung_einholen"
                }
            },
            "AMTS_Anamnesis_Goals_FFREE_TEXT_CHECKBOX": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_FREE_TEXT_CHECKBOX",
                    "de": "AMTS_Anamnese_Ziele_FFREITEXT_CHECKBOX",
                    "de-ch": "AMTS_Anamnese_Ziele_FFREITEXT_CHECKBOX"
                }
            },
            "AMTS_Anamnesis_Goals_Freetext": {
                "type": "String",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Goals_Freetext",
                    "de": "AMTS_Anamnese_Ziele_Freitext",
                    "de-ch": "AMTS_Anamnese_Ziele_Freitext"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_00",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_00",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_00"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_01",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_01",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_01"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_02",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_02",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_02"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_03",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_03",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_03"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_04",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_04",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_04"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_05": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_GoodMood_05",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_05",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_GuteLaune_05"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_00",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_00",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_00"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_01",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_01",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_01"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_02",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_02",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_02"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_03",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_03",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_03"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_04",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_04",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_04"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_05": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Relaxed_05",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_05",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Ruhig_und_Entspannt_05"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_00",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_00",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_00"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_01",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_01",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_01"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_02",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_02",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_02"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_03",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_03",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_03"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_04",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_04",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_04"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_05": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_Active_05",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_05",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Energetisch_und_Aktiv_05"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_00",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_00",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_00"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_01",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_01",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_01"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_02",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_02",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_02"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_03",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_03",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_03"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_04",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_04",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_04"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_05": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_FreshWakeup_05",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_05",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Frisch_und_Ausgeruht_05"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_00",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_00",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_00"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_01",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_01",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_01"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_02",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_02",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_02"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_03",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_03",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_03"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_04",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_04",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_04"
                }
            },
            "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_05": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_05",
                    "de": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_05",
                    "de-ch": "AMTS_Anamnesis_Wohlbefinden_Fragebogen_Alltag_Interessant_05"
                }
            },
            "AMTS_Follow_Up_Symptom_DIZZINESS_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIZZINESS_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_SCHWINDEL_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHWINDEL_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_DIZZINESS_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIZZINESS_SAME",
                    "de": "AMTS_Follow_Up_Symptom_SCHWINDEL_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHWINDEL_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_DIZZINESS_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIZZINESS_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_SCHWINDEL_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHWINDEL_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_BLURRED_VISION_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BLURRED_VISION_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_SEHSTOERUNG_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SEHSTOERUNG_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_BLURRED_VISION_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BLURRED_VISION_SAME",
                    "de": "AMTS_Follow_Up_Symptom_SEHSTOERUNG_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_SEHSTOERUNG_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_BLURRED_VISION_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BLURRED_VISION_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_SEHSTOERUNG_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SEHSTOERUNG_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_FALL_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_FALL_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_STURZ_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_STURZ_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_FALL_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_FALL_SAME",
                    "de": "AMTS_Follow_Up_Symptom_STURZ_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_STURZ_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_FALL_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_FALL_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_STURZ_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_STURZ_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_HEADACHE_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEADACHE_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_KOPFSCHMERZEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_KOPFSCHMERZEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_HEADACHE_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEADACHE_SAME",
                    "de": "AMTS_Follow_Up_Symptom_KOPFSCHMERZEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_KOPFSCHMERZEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_HEADACHE_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEADACHE_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_KOPFSCHMERZEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_KOPFSCHMERZEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_ANOREXIA_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_ANOREXIA_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_APPETITLOSIGKEIT_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_APPETITLOSIGKEIT_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_ANOREXIA_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_ANOREXIA_SAME",
                    "de": "AMTS_Follow_Up_Symptom_APPETITLOSIGKEIT_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_APPETITLOSIGKEIT_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_ANOREXIA_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_ANOREXIA_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_APPETITLOSIGKEIT_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_APPETITLOSIGKEIT_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_DIARRHEA_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIARRHEA_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_DURCHFALL_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_DURCHFALL_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_DIARRHEA_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIARRHEA_SAME",
                    "de": "AMTS_Follow_Up_Symptom_DURCHFALL_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_DURCHFALL_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_DIARRHEA_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIARRHEA_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_DURCHFALL_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_DURCHFALL_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_VOMIT_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_VOMIT_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_ERBRECHEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_ERBRECHEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_VOMIT_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_VOMIT_SAME",
                    "de": "AMTS_Follow_Up_Symptom_ERBRECHEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_ERBRECHEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_VOMIT_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_VOMIT_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_ERBRECHEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_ERBRECHEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_STOMACH_DISCOMFORT_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_STOMACH_DISCOMFORT_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_BAUCHSCHMERZEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_BAUCHSCHMERZEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_STOMACH_DISCOMFORT_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_STOMACH_DISCOMFORT_SAME",
                    "de": "AMTS_Follow_Up_Symptom_BAUCHSCHMERZEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_BAUCHSCHMERZEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_STOMACH_DISCOMFORT_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_STOMACH_DISCOMFORT_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_BAUCHSCHMERZEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_BAUCHSCHMERZEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_DRY_MOUTH_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DRY_MOUTH_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_MUNDTROCKENHEIT_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_MUNDTROCKENHEIT_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_DRY_MOUTH_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DRY_MOUTH_SAME",
                    "de": "AMTS_Follow_Up_Symptom_MUNDTROCKENHEIT_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_MUNDTROCKENHEIT_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_DRY_MOUTH_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DRY_MOUTH_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_MUNDTROCKENHEIT_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_MUNDTROCKENHEIT_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_DIFFICULTIES_SWALLOWING_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIFFICULTIES_SWALLOWING_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_SCHLUCKBESCHWERDEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHLUCKBESCHWERDEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_DIFFICULTIES_SWALLOWING_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIFFICULTIES_SWALLOWING_SAME",
                    "de": "AMTS_Follow_Up_Symptom_SCHLUCKBESCHWERDEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHLUCKBESCHWERDEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_DIFFICULTIES_SWALLOWING_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_DIFFICULTIES_SWALLOWING_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_SCHLUCKBESCHWERDEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHLUCKBESCHWERDEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_HEARTBURN_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEARTBURN_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_SODBRENNEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SODBRENNEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_HEARTBURN_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEARTBURN_SAME",
                    "de": "AMTS_Follow_Up_Symptom_SODBRENNEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_SODBRENNEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_HEARTBURN_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEARTBURN_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_SODBRENNEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SODBRENNEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_NAUSEA_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_NAUSEA_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_UEBELKEIT_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_UEBELKEIT_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_NAUSEA_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_NAUSEA_SAME",
                    "de": "AMTS_Follow_Up_Symptom_UEBELKEIT_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_UEBELKEIT_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_NAUSEA_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_NAUSEA_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_UEBELKEIT_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_UEBELKEIT_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_CONSTIPATION_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_CONSTIPATION_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_VERSTOPFUNG_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_VERSTOPFUNG_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_CONSTIPATION_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_CONSTIPATION_SAME",
                    "de": "AMTS_Follow_Up_Symptom_VERSTOPFUNG_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_VERSTOPFUNG_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_CONSTIPATION_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_CONSTIPATION_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_VERSTOPFUNG_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_VERSTOPFUNG_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_SKIN_RASH_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_SKIN_RASH_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_HAUTAUSSCHLAG_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_HAUTAUSSCHLAG_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_SKIN_RASH_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_SKIN_RASH_SAME",
                    "de": "AMTS_Follow_Up_Symptom_HAUTAUSSCHLAG_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_HAUTAUSSCHLAG_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_SKIN_RASH_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_SKIN_RASH_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_HAUTAUSSCHLAG_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_HAUTAUSSCHLAG_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_ITCHING_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_ITCHING_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_JUCKREIZ_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_JUCKREIZ_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_ITCHING_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_ITCHING_SAME",
                    "de": "AMTS_Follow_Up_Symptom_JUCKREIZ_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_JUCKREIZ_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_ITCHING_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_ITCHING_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_JUCKREIZ_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_JUCKREIZ_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_SWOLLEN_LEGS_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_EDEMA_SWOLLEN_LEGS_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_OEDEME_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_OEDEME_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_SWOLLEN_LEGS_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_EDEMA_SWOLLEN_LEGS_SAME",
                    "de": "AMTS_Follow_Up_Symptom_OEDEME_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_OEDEME_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_SWOLLEN_LEGS_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_EDEMA_SWOLLEN_LEGS_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_OEDEME_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_OEDEME_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_MUSCLE_PAIN_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_MUSCLE_PAIN_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_MUSKELSCHMERZEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_MUSKELSCHMERZEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_MUSCLE_PAIN_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_MUSCLE_PAIN_SAME",
                    "de": "AMTS_Follow_Up_Symptom_MUSKELSCHMERZEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_MUSKELSCHMERZEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_MUSCLE_PAIN_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_MUSCLE_PAIN_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_MUSKELSCHMERZEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_MUSKELSCHMERZEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_TENDENCY_TO_BRUISES_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_TENDENCY_TO_BRUISES_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_TENDENCY_TO_BRUISES_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_TENDENCY_TO_BRUISES_SAME",
                    "de": "AMTS_Follow_Up_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_TENDENCY_TO_BRUISES_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_TENDENCY_TO_BRUISES_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_NEIGUNG_ZU_BLAUEN_FLECKEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_NOSEBLEEDS_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_NOSEBLEEDS_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_NASENBLUTEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_NASENBLUTEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_NOSEBLEEDS_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_NOSEBLEEDS_SAME",
                    "de": "AMTS_Follow_Up_Symptom_NASENBLUTEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_NASENBLUTEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_NOSEBLEEDS_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_NOSEBLEEDS_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_NASENBLUTEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_NASENBLUTEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_BLEEDING_GUMS_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BLEEDING_GUMS_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_ZAHNFLEISCHBLUTEN_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_ZAHNFLEISCHBLUTEN_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_BLEEDING_GUMS_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BLEEDING_GUMS_SAME",
                    "de": "AMTS_Follow_Up_Symptom_ZAHNFLEISCHBLUTEN_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_ZAHNFLEISCHBLUTEN_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_BLEEDING_GUMS_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BLEEDING_GUMS_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_ZAHNFLEISCHBLUTEN_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_ZAHNFLEISCHBLUTEN_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_BREATHING_PROBLEMS_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BREATHING_PROBLEMS_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_ATEMPROBLEME_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_ATEMPROBLEME_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_BREATHING_PROBLEMS_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BREATHING_PROBLEMS_SAME",
                    "de": "AMTS_Follow_Up_Symptom_ATEMPROBLEME_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_ATEMPROBLEME_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_BREATHING_PROBLEMS_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_BREATHING_PROBLEMS_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_ATEMPROBLEME_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_ATEMPROBLEME_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_HERZ_KREISLAUF_PROBLEME_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_HERZ_KREISLAUF_PROBLEME_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS_SAME",
                    "de": "AMTS_Follow_Up_Symptom_HERZ_KREISLAUF_PROBLEME_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_HERZ_KREISLAUF_PROBLEME_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_HEART_AND_BLOOD_PRESSURE_PROBLEMS_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_HERZ_KREISLAUF_PROBLEME_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_HERZ_KREISLAUF_PROBLEME_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_INSOMNIA_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_INSOMNIA_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_SCHLAFSTOERUNG_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHLAFSTOERUNG_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_INSOMNIA_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_INSOMNIA_SAME",
                    "de": "AMTS_Follow_Up_Symptom_SCHLAFSTOERUNG_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHLAFSTOERUNG_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_INSOMNIA_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_INSOMNIA_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_SCHLAFSTOERUNG_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SCHLAFSTOERUNG_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_SEXUAL_DYSFUNCTION_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_SEXUAL_DYSFUNCTION_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_SEXUELLE_DYSFUNKTION_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SEXUELLE_DYSFUNKTION_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_SEXUAL_DYSFUNCTION_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_SEXUAL_DYSFUNCTION_SAME",
                    "de": "AMTS_Follow_Up_Symptom_SEXUELLE_DYSFUNKTION_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_SEXUELLE_DYSFUNKTION_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_SEXUAL_DYSFUNCTION_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_SEXUAL_DYSFUNCTION_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_SEXUELLE_DYSFUNKTION_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_SEXUELLE_DYSFUNKTION_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Symptom_FREE_TEXT_BETTER": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_FREE_TEXT_BETTER",
                    "de": "AMTS_Follow_Up_Symptom_FREITEXT_BESSER",
                    "de-ch": "AMTS_Follow_Up_Symptom_FREITEXT_BESSER"
                }
            },
            "AMTS_Follow_Up_Symptom_FREE_TEXT_SAME": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_FREE_TEXT_SAME",
                    "de": "AMTS_Follow_Up_Symptom_FREITEXT_GLEICH",
                    "de-ch": "AMTS_Follow_Up_Symptom_FREITEXT_GLEICH"
                }
            },
            "AMTS_Follow_Up_Symptom_FREE_TEXT_WORSE": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Symptom_FREE_TEXT_WORSE",
                    "de": "AMTS_Follow_Up_Symptom_FREITEXT_SCHLECHTER",
                    "de-ch": "AMTS_Follow_Up_Symptom_FREITEXT_SCHLECHTER"
                }
            },
            "AMTS_Follow_Up_Goals_Create_MedPlan_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Create_MedPlan_YES",
                    "de": "AMTS_Follow_Up_Ziele_Medikationsplan_erstellen_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikationsplan_erstellen_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Create_MedPlan_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Create_MedPlan_NO",
                    "de": "AMTS_Follow_Up_Ziele_Medikationsplan_erstellen_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikationsplan_erstellen_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Create_MedPlan_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Create_MedPlan_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Medikationsplan_erstellen_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikationsplan_erstellen_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Sideeffect_Check_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Sideeffect_Check_YES",
                    "de": "AMTS_Follow_Up_Ziele_Nebenwirkungen_pruefen_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Nebenwirkungen_pruefen_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Sideeffect_Check_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Sideeffect_Check_NO",
                    "de": "AMTS_Follow_Up_Ziele_Nebenwirkungen_pruefen_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Nebenwirkungen_pruefen_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Sideeffect_Check_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Sideeffect_Check_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Nebenwirkungen_pruefen_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Nebenwirkungen_pruefen_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Interaction_Check_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Interaction_Check_YES",
                    "de": "AMTS_Follow_Up_Ziele_Wechselwirkungen_pruefen_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Wechselwirkungen_pruefen_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Interaction_Check_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Interaction_Check_NO",
                    "de": "AMTS_Follow_Up_Ziele_Wechselwirkungen_pruefen_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Wechselwirkungen_pruefen_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Interaction_Check_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Interaction_Check_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Wechselwirkungen_pruefen_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Wechselwirkungen_pruefen_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Safe_Application_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Safe_Application_YES",
                    "de": "AMTS_Follow_Up_Ziele_Sicherheit_bei_Anwendung_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Sicherheit_bei_Anwendung_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Safe_Application_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Safe_Application_NO",
                    "de": "AMTS_Follow_Up_Ziele_Sicherheit_bei_Anwendung_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Sicherheit_bei_Anwendung_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Safe_Application_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Safe_Application_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Sicherheit_bei_Anwendung_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Sicherheit_bei_Anwendung_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Therapy_Effectiveness_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Therapy_Effectiveness_YES",
                    "de": "AMTS_Follow_Up_Ziele_Therapie_Effektivitaet_erhoehen_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Therapie_Effektivitaet_erhoehen_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Therapy_Effectiveness_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Therapy_Effectiveness_NO",
                    "de": "AMTS_Follow_Up_Ziele_Therapie_Effektivitaet_erhoehen_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Therapie_Effektivitaet_erhoehen_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Therapy_Effectiveness_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Therapy_Effectiveness_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Therapie_Effektivitaet_erhoehen_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Therapie_Effektivitaet_erhoehen_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Drug_Knowledge_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Drug_Knowledge_YES",
                    "de": "AMTS_Follow_Up_Ziele_Medikamente_besser_verstehen_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikamente_besser_verstehen_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Drug_Knowledge_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Drug_Knowledge_NO",
                    "de": "AMTS_Follow_Up_Ziele_Medikamente_besser_verstehen_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikamente_besser_verstehen_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Drug_Knowledge_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Drug_Knowledge_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Medikamente_besser_verstehen_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikamente_besser_verstehen_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Disease_Knowledge_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Disease_Knowledge_YES",
                    "de": "AMTS_Follow_Up_Ziele_Ueber_Krankheiten_informiert_sein_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Ueber_Krankheiten_informiert_sein_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Disease_Knowledge_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Disease_Knowledge_NO",
                    "de": "AMTS_Follow_Up_Ziele_Ueber_Krankheiten_informiert_sein_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Ueber_Krankheiten_informiert_sein_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Disease_Knowledge_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Disease_Knowledge_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Ueber_Krankheiten_informiert_sein_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Ueber_Krankheiten_informiert_sein_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Reduce_Medication_Amount_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Reduce_Medication_Amount_YES",
                    "de": "AMTS_Follow_Up_Ziele_Medikamentenanzahl_verringern_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikamentenanzahl_verringern_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Reduce_Medication_Amount_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Reduce_Medication_Amount_NO",
                    "de": "AMTS_Follow_Up_Ziele_Medikamentenanzahl_verringern_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikamentenanzahl_verringern_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Reduce_Medication_Amount_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Reduce_Medication_Amount_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Medikamentenanzahl_verringern_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Medikamentenanzahl_verringern_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Discontinue_Medication_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Discontinue_Medication_YES",
                    "de": "AMTS_Follow_Up_Ziele_Konkreter_Absetzwunsch_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Konkreter_Absetzwunsch_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Discontinue_Medication_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Discontinue_Medication_NO",
                    "de": "AMTS_Follow_Up_Ziele_Konkreter_Absetzwunsch_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Konkreter_Absetzwunsch_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Discontinue_Medication_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Discontinue_Medication_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Konkreter_Absetzwunsch_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Konkreter_Absetzwunsch_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Symptoms_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Symptoms_YES",
                    "de": "AMTS_Follow_Up_Ziele_Symptome_verbessern_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Symptome_verbessern_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Symptoms_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Symptoms_NO",
                    "de": "AMTS_Follow_Up_Ziele_Symptome_verbessern_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Symptome_verbessern_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Symptoms_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Symptoms_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Symptome_verbessern_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Symptome_verbessern_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Psyche_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Psyche_YES",
                    "de": "AMTS_Follow_Up_Ziele_Psychische_Situation_Verbessern_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Psychische_Situation_Verbessern_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Psyche_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Psyche_NO",
                    "de": "AMTS_Follow_Up_Ziele_Psychische_Situation_Verbessern_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Psychische_Situation_Verbessern_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Improve_Psyche_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Improve_Psyche_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Psychische_Situation_Verbessern_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Psychische_Situation_Verbessern_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Physical_Performance_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Physical_Performance_YES",
                    "de": "AMTS_Follow_Up_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Physical_Performance_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Physical_Performance_NO",
                    "de": "AMTS_Follow_Up_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Increase_Physical_Performance_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Increase_Physical_Performance_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Koerperliche_Leistungsfaehigkeit_verbessern_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Second_Opinion_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Second_Opinion_YES",
                    "de": "AMTS_Follow_Up_Ziele_Zweitmeinung_einholen_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Zweitmeinung_einholen_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Second_Opinion_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Second_Opinion_NO",
                    "de": "AMTS_Follow_Up_Ziele_Zweitmeinung_einholen_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Zweitmeinung_einholen_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Second_Opinion_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Second_Opinion_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Zweitmeinung_einholen_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Zweitmeinung_einholen_Teilweise"
                }
            },
            "AMTS_Follow_Up_Goals_Freetext_CHECKBOX_YES": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Freetext_Checkbox_YES",
                    "de": "AMTS_Follow_Up_Ziele_Freitext_Checkbox_JA",
                    "de-ch": "AMTS_Follow_Up_Ziele_Freitext_Checkbox_JA"
                }
            },
            "AMTS_Follow_Up_Goals_Freetext_CHECKBOX_NO": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Freetext_Checkbox_NO",
                    "de": "AMTS_Follow_Up_Ziele_Freitext_Checkbox_NEIN",
                    "de-ch": "AMTS_Follow_Up_Ziele_Freitext_Checkbox_NEIN"
                }
            },
            "AMTS_Follow_Up_Goals_Freetext_CHECKBOX_Partial": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Goals_Freetext_Checkbox_Partial",
                    "de": "AMTS_Follow_Up_Ziele_Freitext_Checkbox_Teilweise",
                    "de-ch": "AMTS_Follow_Up_Ziele_Freitext_Checkbox_Teilweise"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_well_informed_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_well_informed_00",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_00",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_00"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_well_informed_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_well_informed_01",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_01",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_01"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_well_informed_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_well_informed_02",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_02",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_02"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_well_informed_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_well_informed_03",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_03",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_03"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_well_informed_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_well_informed_04",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_04",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Gut_Informiert_04"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_safe_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_safe_00",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_00",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_00"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_safe_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_safe_01",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_01",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_01"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_safe_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_safe_02",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_02",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_02"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_safe_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_safe_03",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_03",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_03"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_safe_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_safe_04",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_04",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Sicherheit_04"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_more_involved_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_more_involved_00",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_00",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_00"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_more_involved_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_more_involved_01",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_01",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_01"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_more_involved_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_more_involved_02",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_02",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_02"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_more_involved_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_more_involved_03",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_03",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_03"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_more_involved_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_more_involved_04",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_04",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Staerker_Einbezogen_04"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Trust_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Trust_00",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_00",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_00"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Trust_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Trust_01",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_01",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_01"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Trust_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Trust_02",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_02",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_02"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Trust_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Trust_03",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_03",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_03"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Trust_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Trust_04",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_04",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Mehr_Vertrauen_04"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_00": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_00",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_00",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_00"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_01": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_01",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_01",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_01"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_02": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_02",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_02",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_02"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_03": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_03",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_03",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_03"
                }
            },
            "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_04": {
                "type": "Boolean",
                "insight2": false,
                "model": "activity",
                "label": {
                    "en": "AMTS_Follow_Up_Consequences_Med_Check_Improved_Health_04",
                    "de": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_04",
                    "de-ch": "AMTS_Follow_Up_Auswirkungen_Med_Check_Bessere_Gesundheit_04"
                }
            },


            "MedicationInfoTree": {
                "type": "String",
                "label": {
                   "en": "Medication information tree",
                   "de": "Informationsbaum für Medikamente",
                   "de-ch": "Informationsbaum für Medikamente"
                }
            },
            "labLogTimestamp": {
                "type": "Date",
                "insight2": true,
                "model": "activity",
                "label": {
                    "en": "Labbook, Last change",
                    "de": "Laborbuch, Letzte Änderung",
                    "de-ch": "Laborbuch, Letzte Änderung"
                }
            },
            "fk5010BatchNumber": {
                "schema": "activity",
                "path": "fk5010BatchNumber",
                "insight2": true,
                "label": {
                    "en": "Batch number",
                    "de": "Chargennummer",
                    "de-ch": "Chargennummer"
                }
            }
        };

        //-- end schema

        var
            dateFields = [
                'dob',
                'dateOfDeath',
                'dateOfInActive',
                'inActive',
                'isDeceased',
                'reason',

                'jobStatus',
                'editDate',
                'currentDate',
                'dateNormal',

                'BFB3_Voraussichtlicher_Entbindungstermin',
                'BFB3_Untersuchungsdatum',

                'BFB9_Entbindungsdatum',

                'BFB12_ZeitraumVon',
                'BFB12_ZeitraumBis',
                'BFB12_MedBoxVon',
                'BFB12_MedBoxBis',
                'BFB12_MedGabeVon',
                'BFB12_MedGabeBis',
                'BFB12_InjektionVon',
                'BFB12_InjektionBis',
                'BFB12_BlutzuckerVon',
                'BFB12_BlutzuckerBis',
                'BFB12_KompStruempfeVon',
                'BFB12_KompStruempfeBis',
                'BFB12_KompVerbaendeVon',
                'BFB12_KompVerbaendeBis',
                'BFB12_StuetzverbaendeVon',
                'BFB12_StuetzverbaendeBis',
                'BFB12_DekubitusVon',
                'BFB12_DekubitusBis',
                'BFB12_AndereWundverbVon',
                'BFB12_AndereWundverbBis',
                'BFB12_GrundpflegeVon',
                'BFB12_GrundpflegeBis',
                'BFB12_HauswirtVersVon',
                'BFB12_HauswirtVersBis',

                'BFB25_In_Behandlung_seit',
                'BFB25_Letzte_Untersuchung',

                'labLogTimestamp'
            ],

            key,
            ict = Y.dcforms.schema.InCase_T,
            fldList = Y.doccirrus.schemas.activity.associateFieldWithActType(),
            ictObj,
            actTypesTranslated,
            modelLabelKey,
            i;

        for( key in ict ) {

            if( ict.hasOwnProperty( key ) ) {
                ictObj = ict[key];

                //  used when debugging to find items which should have a schema set:
                //if ( !ictObj.schema && ictObj.model && 'activity' === ictObj.model && ictObj.path ) {
                //    ictObj.schema = ictObj.model;
                //}

                if( 'object' === typeof ictObj && ictObj.schema && ictObj.path ) {
                    ictObj.model = ictObj.schema;
                    ictObj.actTypes = fldList[ictObj.path];

                }

                //  MOJ-8649 Practice fields are 'Einrichtung' group, not 'Praxis' as in audit model
                if ( ictObj.model === 'practice' ) {
                    ictObj.modelLabel = { de: 'Einrichtung' };
                }

                if( ictObj.model === 'patient' ||
                    ictObj.model === 'location' ||
                    ictObj.model === 'employee' ||
                    ictObj.model === 'task' ||
                    ictObj.model === 'schedule' ||
                    ictObj.model === 'scheduletype' ||
                    ictObj.model === 'casefolder' ||
                    ictObj.model === 'calendar' ||
                    ictObj.model === 'medication' ||
                    ictObj.model === 'marker' ||
                    ictObj.model === 'meddata' ||
                    ictObj.model === 'virtualFields'
                //ictObj.model === 'practice'
                ) {

                    modelLabelKey = 'audit-schema.ModelMeta_E.' + ictObj.model;
                    ictObj.modelLabel = {
                        de: i18n( modelLabelKey )
                    };
                }
                if( ictObj.actTypes && ictObj.actTypes.length ) {
                    actTypesTranslated = ictObj.actTypes.map( translateActivityEnum );

                    ictObj.actTypesLabel = {
                        de: actTypesTranslated,
                        en: actTypesTranslated
                    };
                }

            }

        }

        for( i = 0; i < dateFields.length; i++ ) {
            if( Y.dcforms.schema.InCase_T[dateFields[i]] ) {
                Y.dcforms.schema.InCase_T[dateFields[i]].dateFormat = getDefaultLocaleTimeString();
            }
        }

        var xmlTypes = Y.doccirrus.schemas.cardio.xmlTypes;
        Object.keys(xmlTypes).filter( function(xmlKey){
            return xmlKey.indexOf('MDC.') === 0 || xmlKey.indexOf('BIO.') === 0;
        }).forEach( function(xmlKey){
            var cuttedKey = xmlKey,
                cuttedKeyWoDots = cuttedKey.replace(/\./g,'_'),
                obj = {
                    "type": xmlTypes[xmlKey],
                    "insight2": true,
                    "cardioXML": true,
                    "label": {
                        "en": cuttedKeyWoDots,
                        "de": cuttedKeyWoDots
                    }
                };
            if( 'Date' === xmlTypes[xmlKey] ){
                obj.dateFormat = getDefaultLocaleTimeString();

                //  for date types, add an additional mapping for formatted date string with time EXTMOJ-1884
                Y.dcforms.schema.InCase_T[cuttedKeyWoDots + '_TIME'] = {
                    "type": 'String',
                    "insight2": true,
                    "cardioXML": true,
                    "label": {
                        "en": cuttedKeyWoDots + '_TIME',
                        "de": cuttedKeyWoDots + '_TIME'
                    },
                    "dateFormat": TIMESTAMP_FORMAT_DOQUVIDE
                };
            }
            Y.dcforms.schema.InCase_T[cuttedKeyWoDots] = obj;
        });

        function translateActivityEnum( actType ) {
            var translationKey = 'activity-schema.Activity_E.' + actType;
            return i18n( translationKey );
        }

        function getDefaultLocaleTimeString( isShort ) {
            return isShort ? "DD.MM.YY" : TIMESTAMP_FORMAT;
        }

        //  Check for broken entries (may break reporting and other users of this schema, EXTMOJ-1780)

        for( key in ict ) {

            if( ict.hasOwnProperty( key ) ) {
                //  treat complex types as string in reduced schema, check for junk inschema which may break downstream
                if ( 'undefined' === typeof ictObj.type || 'object' === typeof ictObj.type || 'function' === typeof ictObj.type ) {
                    if ( 'object' === typeof ictObj ) {
                        Y.log( 'Incompatible schema member type InCase_T ' + key + ': ' + ictObj.type, 'warn', NAME );

                        ictObj.type = 'string';
                    } else {
                        Y.log( 'Invalid schema member injected in InCase_T: ' + key, 'error', NAME );
                    }
                }
            }
        }
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'activity-schema', 'cardio-schema' ]
    }
);
