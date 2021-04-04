/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-CaseFile-T',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         *
         *  The paper name is that used in the forms dialogs, the hpdf property is the paper geometry name used by the
         *  libharu PDF library
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.CaseFile_T = {
            "version": 1.0,
            "mapper": "casefile",
            "activityId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Activity ID",
                    "de": "Activity ID"
                }
            },
            "patientId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Patient ID",
                    "de": "Patient ID"
                }
            },
            "firstname": {
                "type": "String",
                "label": {
                    "en": "Pat. first name",
                    "de": "Pat. Vorname"
                }
            },
            "middlename": {
                "type": "String",
                "label": {
                    "en": "Pat. Middle Name",
                    "de": "Pat. Zweiter Vorname"
                }
            },
            "lastname": {
                "type": "String",
                "label": {
                    "en": "Pat. Surname",
                    "de": "Pat. Nachname"
                }
            },
            "gender": {
                "type": "String",
                "label": {
                    "en": "Gender",
                    "de": "Geschlecht"
                }
            },
            "isMale": {
                "type": "Boolean",
                "label": {
                    "en": "male",
                    "de": "männlich"
                }
            },
            "isFemale": {


                "type": "Boolean",
                "label": {
                    "en": "female",
                    "de": "weiblich"
                }
            },
            "chiffre": {
                "type": "String",
                "label": {
                    "en": "Pat. Chiffre PSY",
                    "de": "Pat. Chiffre PSY"
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
                    "de": "Versicherungsname"
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
            "insuranceAddr1": {
                "type": "String",
                "label": {
                    "en": "Insurance Addr1",
                    "de": "Versicherung Adresszeile 1"
                }
            },
            "insuranceAddr2": {
                "type": "String",
                "label": {
                    "en": "Insurance Addr2",
                    "de": "Versicherung Adresszeile 2"
                }
            },
            "isBVG": {
                "type": "Boolean",
                "label": {
                    "en": "BVG",
                    "de": "BVG"
                }
            },
            "jobTitle": {
                "type": "String",
                "label": {
                    "en": "Job title",
                    "de": "Beruf (Kat.)"
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
            "date": {
                "type": "String",
                "label": {
                    "en": "Date",
                    "de": "Datum"
                }
            },
            "timestampBFB": {
                "type": "String",
                "label": {
                    "en": "Date BFB",
                    "de": "Datum BFB"
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
            "from": {
                "type": "String",
                "label": {
                    "en": "From Date",
                    "de": "Von Datum"
                }
            },

            "to": {
                "type": "String",
                "label": {
                    "en": "To Date",
                    "de": "Bis Datum"
                }
            },

            "displayname": {
                "type": "String",
                "label": {
                    "en": "Patient name",
                    "de": "Patienten Name"
                }
            },

            "docBlock": {
                "type": "String",
                "label": {
                    "en": "Doctor's Stamp",
                    "de": "Arztstempel"
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
                    "de": "Summe vor Steuern"
                }
            },
            "vat": {
                "type": "String",
                "label": {
                    "en": "VAT",
                    "de": "Steuer"
                }
            },
            "total": {
                "type": "String",
                "label": {
                    "en": "Total",
                    "de": "Gesamtsumme"
                }
            },
            "selectedActsTable": {
                "type": "SelectedActivity_T",
                "label": {
                    "en": "Selected Activites (table)",
                    "de": "Ausgewählte Aktivitäten (aufstellung)"
                }
            },
            "selectedActsString": {
                "type": "String",
                "label": {
                    "en": "Selected Activites (text)",
                    "de": "Ausgewählte Aktivitäten (inhalt)"
                }
            },
            "patient": {
                "type": "Personalienfeld_T",
                "label": {
                    "en": "Patient (obj, official address)",
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

            //  adding userContent for Heilmittel (UTILITY)

            "userContent": {
                "schema": "activity",
                "path": "userContent"
            },

            "utDiagnosisName": {
                "schema": "activity",
                "path": "utDiagnosisName"
            },
            "utRemedy1Name": {
                "schema": "activity",
                "path": "utRemedy1Name"
            },
            "utRemedy1Explanation": {
                "schema": "activity",
                "path": "utRemedy1Explanation"
            },
            "utRemedy1Seasons": {
                "schema": "activity",
                "path": "utRemedy1Seasons"
            },
            "utRemedy1PerWeek": {
                "schema": "activity",
                "path": "utRemedy1PerWeek"
            },
            "utRemedy2Name": {
                "schema": "activity",
                "path": "utRemedy2Name"
            },
            "utRemedy2Explanation": {
                "schema": "activity",
                "path": "utRemedy2Explanation"
            },
            "utRemedy2Seasons": {
                "schema": "activity",
                "path": "utRemedy2Seasons"
            },
            "utRemedy2PerWeek": {
                "schema": "activity",
                "path": "utRemedy2PerWeek"
            },
            "utVocalTherapy": {
                "schema": "activity",
                "path": "utVocalTherapy"
            },
            "utSpeakTherapy": {
                "schema": "activity",
                "path": "utSpeakTherapy"
            },
            "utSpeechTherapy": {
                "schema": "activity",
                "path": "utSpeechTherapy"
            },
            "utFirst": {
                "type": "Boolean",
                "label": {
                    "en": "Not home visit",
                    "de": "HM Erstverordnung"
                }
            },
            "utFollowing": {
                "type": "Boolean",
                "label": {
                    "en": "Not home visit",
                    "de": "HM Folgeverordnung"
                }
            },
            "utIcdCode": {
                "type": "String",
                "label": {
                    "en": "HM ICD Code",
                    "de": "HM ICD Code"
                }
            },
            "utNoNormalCase": {
                "schema": "activity",
                "path": "utNoNormalCase"
            },
            "utHomeVisit": {
                "schema": "activity",
                "path": "utHomeVisit"
            },
            "utNotHomeVisit": {
                "type": "String",
                "label": {
                    "en": "Not home visit",
                    "de": "HM Kein Hausbesuch"
                }
            },
            "utTherapyReport": {
                "schema": "activity",
                "path": "utTherapyReport"
            },
            "utNotTherapyReport": {
                "type": "String",
                "label": {
                    "en": "Not Ther. Report",
                    "de": "HM kein Th. Bericht"
                }
            },
            "utGroupTherapy": {
                "schema": "activity",
                "path": "utGroupTherapy"
            },
            "utDurationOfSeason": {
                "schema": "activity",
                "path": "utDurationOfSeason"
            },
            "utLatestStartOfTreatment": {
                "schema": "activity",
                "path": "utLatestStartOfTreatment"
            },
            "utMedicalJustification": {
                "schema": "activity",
                "path": "utMedicalJustification"
            },
            "utTherapyGoals": {
                "schema": "activity",
                "path": "utTherapyGoals"
            },
            "utUnfall": {
                "schema": "activity",
                "path": "utUnfall"
            },
            "utBvg": {
                "schema": "activity",
                "path": "utBvg"
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "Currency",
                    "de": "HM Indikation / Akt. Inhalt"
                }
            },
            "code": {
                "type": "String",
                "label": {
                    "en": "Currency",
                    "de": "HM Schlüssel / Code"
                }
            },
            "paidFree": {
                "type": "String",
                "label": {
                    "en": "paid free",
                    "de": "gebührenbefreit"
                }
            },
            "paid": {
                "type": "String",
                "label": {
                    "en": "paid",
                    "de": "gebührenpflichtig"
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
            "barcode12a": {
                "type": "String",
                "label": {
                    "en": "BFB barcode12a",
                    "de": "BFB barcode12a"
                }
            },
            "barcode12b": {
                "type": "String",
                "label": {
                    "en": "BFB barcode12b",
                    "de": "BFB barcode12b"
                }
            },
            "barcode11": {
                "type": "String",
                "label": {
                    "en": "BFB barcode11",
                    "de": "BFB barcode11"
                }
            },
            "barcode12c": {
                "type": "String",
                "label": {
                    "en": "BFB barcode12c",
                    "de": "BFB barcode12c"
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
            "barcode20b": {
                "type": "String",
                "label": {
                    "en": "BFB barcode20b",
                    "de": "BFB barcode20b"
                }
            },
            "barcode20c": {
                "type": "String",
                "label": {
                    "en": "BFB barcode20c",
                    "de": "BFB barcode20c"
                }
            },
            "barcode21": {
                "type": "String",
                "label": {
                    "en": "BFB barcode21",
                    "de": "BFB barcode21"
                }
            },
            "barcode30": {
                "type": 'String',
                "label": {
                    "en": "BFB barcode30",
                    "de": "BFB barcode30"
                }
            },
            "barcode52_2": {
                "type": 'String',
                "label": {
                    "en": "BFB barcode52.2",
                    "de": "BFB barcode52.2"
                }
            },
            "barcode53": {
                "type": 'String',
                "label": {
                    "en": "BFB barcode53",
                    "de": "BFB barcode53"
                }
            },
            "barcode55": {
                "type": 'String',
                "label": {
                    "en": "BFB barcode55",
                    "de": "BFB barcode55"
                }
            },
            "barcode56_2": {
                "type": "String",
                "label": {
                    "en": "BFB barcode56.2",
                    "de": "BFB barcode56.2"
                }
            },
            "barcode61Ab": {
                "type": 'String',
                "label": {
                    "en": "BFB barcode61Ab",
                    "de": "BFB barcode61Ab"
                }
            },
            "barcode61Da": {
                "type": 'String',
                "label": {
                    "en": "BFB barcode61Da",
                    "de": "BFB barcode61Da"
                }
            },
            "certNumber": {
                "type": "String",
                "label": {
                    "en": "BFB Certificate Number",
                    "de": "BFB Zertifikat-Nummer"
                }
            },
            "kontrollunters": {
                "schema": "activity",
                "path": "kontrollunters"
            },
            "abnDatumZeit": {
                "schema": "activity",
                "path": "abnDatumZeit"
            },
            "befEilt": {
                "schema": "activity",
                "path": "befEilt"
            },
            "befEiltTel": {
                "schema": "activity",
                "path": "befEiltTel"
            },
            "befEiltFax": {
                "schema": "activity",
                "path": "befEiltFax"
            },
            "edtaGrBlutbild": {
                "schema": "activity",
                "path": "edtaGrBlutbild"
            },
            "edtaKlBlutbild": {
                "schema": "activity",
                "path": "edtaKlBlutbild"
            },
            "edtaHbA1c": {
                "schema": "activity",
                "path": "edtaHbA1c"
            },
            "edtaReti": {
                "schema": "activity",
                "path": "edtaReti"
            },
            "edtaBlutsenkung": {
                "schema": "activity",
                "path": "edtaBlutsenkung"
            },
            "edtaDiffBlutbild": {
                "schema": "activity",
                "path": "edtaDiffBlutbild"
            },
            "citratQu": {
                "schema": "activity",
                "path": "citratQu"
            },
            "citratQuMarcumar": {
                "schema": "activity",
                "path": "citratQuMarcumar"
            },
            "citratThrombin": {
                "schema": "activity",
                "path": "citratThrombin"
            },
            "citratPTT": {
                "schema": "activity",
                "path": "citratPTT"
            },
            "citratFibri": {
                "schema": "activity",
                "path": "citratFibri"
            },
            "svbAlkPhos": {
                "schema": "activity",
                "path": "svbAlkPhos"
            },
            "svbAmylase": {
                "schema": "activity",
                "path": "svbAmylase"
            },
            "svbASL": {
                "schema": "activity",
                "path": "svbASL"
            },
            "svbBiliD": {
                "schema": "activity",
                "path": "svbBiliD"
            },
            "svbBiliG": {
                "schema": "activity",
                "path": "svbBiliG"
            },
            "svbCalc": {
                "schema": "activity",
                "path": "svbCalc"
            },
            "svbCholesterin": {
                "schema": "activity",
                "path": "svbCholesterin"
            },
            "svbCholin": {
                "schema": "activity",
                "path": "svbCholin"
            },
            "svbCK": {
                "schema": "activity",
                "path": "svbCK"
            },
            "svbCKMB": {
                "schema": "activity",
                "path": "svbCKMB"
            },
            "svbCRP": {
                "schema": "activity",
                "path": "svbCRP"
            },
            "svbEisen": {
                "schema": "activity",
                "path": "svbEisen"
            },
            "svbEiwE": {
                "schema": "activity",
                "path": "svbEiwE"
            },
            "svbEiwG": {
                "schema": "activity",
                "path": "svbEiwG"
            },
            "svbGammaGT": {
                "schema": "activity",
                "path": "svbGammaGT"
            },
            "svbGlukose": {
                "schema": "activity",
                "path": "svbGlukose"
            },
            "svbGOT": {
                "schema": "activity",
                "path": "svbGOT"
            },
            "svbGPT": {
                "schema": "activity",
                "path": "svbGPT"
            },
            "svbHarnsäure": {
                "schema": "activity",
                "path": "svbHarnsäure"
            },
            "svbHarnstoff": {
                "schema": "activity",
                "path": "svbHarnstoff"
            },
            "svbHBDH": {
                "schema": "activity",
                "path": "svbHBDH"
            },
            "svbHDL": {
                "schema": "activity",
                "path": "svbHDL"
            },
            "svbLgA": {
                "schema": "activity",
                "path": "svbLgA"
            },
            "svbLgG": {
                "schema": "activity",
                "path": "svbLgG"
            },
            "svbLgM": {
                "schema": "activity",
                "path": "svbLgM"
            },
            "svbKali": {
                "schema": "activity",
                "path": "svbKali"
            },
            "svbKrea": {
                "schema": "activity",
                "path": "svbKrea"
            },
            "svbKreaC": {
                "schema": "activity",
                "path": "svbKreaC"
            },
            "svbLDH": {
                "schema": "activity",
                "path": "svbLDH"
            },
            "svbLDL": {
                "schema": "activity",
                "path": "svbLDL"
            },
            "svbLipase": {
                "schema": "activity",
                "path": "svbLipase"
            },
            "svbNatrium": {
                "schema": "activity",
                "path": "svbNatrium"
            },
            "svbOPVorb": {
                "schema": "activity",
                "path": "svbOPVorb"
            },
            "svbPhos": {
                "schema": "activity",
                "path": "svbPhos"
            },
            "svbTransf": {
                "schema": "activity",
                "path": "svbTransf"
            },
            "svbTrigl": {
                "schema": "activity",
                "path": "svbTrigl"
            },
            "svbTSHBasal": {
                "schema": "activity",
                "path": "svbTSHBasal"
            },
            "svbTSHTRH": {
                "schema": "activity",
                "path": "svbTSHTRH"
            },
            "glu1": {
                "schema": "activity",
                "path": "glu1"
            },
            "glu2": {
                "schema": "activity",
                "path": "glu2"
            },
            "glu3": {
                "schema": "activity",
                "path": "glu3"
            },
            "glu4": {
                "schema": "activity",
                "path": "glu4"
            },
            "urinStatus": {
                "schema": "activity",
                "path": "urinStatus"
            },
            "urinMikroalb": {
                "schema": "activity",
                "path": "urinMikroalb"
            },
            "urinSchwTest": {
                "schema": "activity",
                "path": "urinSchwTest"
            },
            "urinGlukose": {
                "schema": "activity",
                "path": "urinGlukose"
            },
            "urinAmylase": {
                "schema": "activity",
                "path": "urinAmylase"
            },
            "urinSediment": {
                "schema": "activity",
                "path": "urinSediment"
            },
            "sonstiges": {
                "schema": "activity",
                "path": "sonstiges"
            },
            "sonstigesText": {
                "schema": "activity",
                "path": "sonstigesText"
            },
            "labRequestType": {
                "schema": "activity",
                "path": "labRequestType"
            },
            "ggfKennziffer": {
                "schema": "activity",
                "path": "ggfKennziffer"
            },
            "behandlungGemaess": {
                "schema": "activity",
                "path": "behandlungGemaess"
            },
            "auftrag": {
                "schema": "activity",
                "path": "auftrag"
            },
            "fk4202": {
                "schema": "activity",
                "path": "fk4202"
            },
            "fk4204": {
                "schema": "activity",
                "path": "fk4204"
            },
            "labRequestRemittor": {
                "type": "String",
                "label": {
                    "en": "Arzt Nr. des Erstveranlassers",
                    "de": "Arzt Nr. des Erstveranlassers"
                }
            },
            "labRequestEstablishment": {
                "type": "String",
                "label": {
                    "en": "Betriebsstätte des Erstveranlassers",
                    "de": "Betriebsstätte des Erstveranlassers"
                }
            },
            "kurativ": {
                "type": "Boolean",
                "label": {
                    "en": "Kurativ",
                    "de": "Kurativ"
                }
            },
            "praeventiv": {
                "type": "Boolean",
                "label": {
                    "en": "Präventiv",
                    "de": "Präventiv"
                }
            },
            "ess": {
                "type": "Boolean",
                "label": {
                    "en": "(ESS) Empfängnisregelung, Sterilisation, Schwangerschaftsabbruch",
                    "de": "(ESS) Empfängnisregelung, Sterilisation, Schwangerschaftsabbruch"
                }
            },
            "bb": {
                "type": "Boolean",
                "label": {
                    "en": "(BB) Belegärztliche Behandlung",
                    "de": "(BB) Belegärztliche Behandlung"
                }
            },
            "quarter": {
                "type": "String",
                "label": {
                    "en": "Quarter",
                    "de": "Quartal"
                }
            },
            "year": {
                "type": "String",
                "label": {
                    "en": "Year",
                    "de": "Jahr"
                }
            },
            "yearShort": {
                "type": "String",
                "label": {
                    "en": "Year short (YY)",
                    "de": "Jahr kurz  (JJ)"
                }
            },
            "abnahmeDatum": {
                "type": "String",
                "label": {
                    "en": "Abnahmedatum",
                    "de": "Abnahmedatum"
                }
            },
            "abnahmeZeit": {
                "type": "String",
                "label": {
                    "en": "Abnahmezeit",
                    "de": "Abnahmezeit"
                }
            },
            "auBis": {
                "schema": "activity",
                "path": "auBis"
            },
            "untersArt": {
                "schema": "activity",
                "path": "untersArt"
            },
            "auftragsleistungen": {
                "type": "Boolean",
                "label": {
                    "en": "Auftragsleistung",
                    "de": "Auftragsleistung"
                }
            },
            "konsiliaruntersuchung": {
                "type": "Boolean",
                "label": {
                    "en": "Konsiliaruntersuchung",
                    "de": "Konsiliaruntersuchung"
                }
            },
            "mitWeiterBehandlung": {
                "type": "Boolean",
                "label": {
                    "en": "Mit-/Weiterbehandlung",
                    "de": "Mit-/Weiterbehandlung"
                }
            },
            "ueberwAn": {
                "schema": "activity",
                "path": "ueberwAn"
            },
            "datumOP": {
                "schema": "activity",
                "path": "datumOP"
            },
            "erstBesch": {
                "schema": "activity",
                "path": "erstBesch"
            },
            "folgeBesc": {
                "schema": "activity",
                "path": "folgeBesc"
            },
            "arbeitsunfall": {
                "schema": "activity",
                "path": "arbeitsunfall"
            },
            "durchgangsarzt": {
                "schema": "activity",
                "path": "durchgangsarzt"
            },
            "auVon": {
                "schema": "activity",
                "path": "auVon"
            },
            "auVorraussichtlichBis": {
                "schema": "activity",
                "path": "auVorraussichtlichBis"
            },
            "festgestelltAm": {
                "schema": "activity",
                "path": "festgestelltAm"
            },
            "sonstigerUnf": {
                "schema": "activity",
                "path": "sonstigerUnf"
            },
            "bvg": {
                "schema": "activity",
                "path": "bvg"
            },
            "krankengeld": {
                "schema": "activity",
                "path": "krankengeld"
            },
            "endBesch": {
                "schema": "activity",
                "path": "endBesch"
            },
            "rehab": {
                "schema": "activity",
                "path": "rehab"
            },
            "reintegration": {
                "schema": "activity",
                "path": "reintegration"
            },
            "massnahmen": {
                "schema": "activity",
                "path": "massnahmen"
            },
            "diagnosesAdd": {
                "schema": "activity",
                "path": "diagnosesAdd"
            },
            "findings": {
                "type": "String",
                "label": {
                    "en": "findings",
                    "de": "Befunde Text"
                }
            },
            "medications": {
                "type": "String",
                "label": {
                    "en": "medications",
                    "de": "Medikation Text"
                }
            },
            "diagnosesBC": {
                "type": "String",
                "label": {
                    "en": "diagnoses short (BFB)",
                    "de": "Diagnosen kurz (BFB)"
                }
            },
            "diagnosesLongBC": {
                "type": "String",
                "label": {
                    "en": "diagnoses long (BFB)",
                    "de": "Diagnosen lang (BFB)"
                }
            },
            "notfall": {
                "type": "Boolean",
                "label": {
                    "en": "emergency",
                    "de": "Notfall"
                }
            },
            "folgegeraet": {
                "type": "Boolean",
                "label": {
                    "en": "Folgegerät",
                    "de": "Folgegerät"
                }
            },
            "erstgeraet": {
                "type": "Boolean",
                "label": {
                    "en": "Erstgerät",
                    "de": "Erstgerät"
                }
            },
            "hoerhilfeNotwLinks": {
                "type": "Boolean",
                "label": {
                    "en": "Hörhilfe notwendig (links)",
                    "de": "Hörhilfe notwendig (links)"
                }
            },
            "hoerhilfeNotwBeiderseits": {
                "type": "Boolean",
                "label": {
                    "en": "Hörhilfe notwendig (beiderseits)",
                    "de": "Hörhilfe notwendig (beiderseits)"
                }
            },
            "hoerhilfeNotwRechts": {
                "type": "Boolean",
                "label": {
                    "en": "Hörhilfe notwendig (rechts)",
                    "de": "Hörhilfe notwendig (rechts)"
                }
            },
            "notfallScheinNotfalldienst": {
                "type": "Boolean",
                "label": {
                    "en": "ärztlicher Notfalldienst  (Notfallschein)",
                    "de": "ärztlicher Notfalldienst  (Notfallschein)"
                }
            },
            "notfallScheinUrlaub": {
                "type": "Boolean",
                "label": {
                    "en": "Urlaubs- bzw. Krankheitsvertretung  (Notfallschein)",
                    "de": "Urlaubs- bzw. Krankheitsvertretung  (Notfallschein)"
                }
            },
            "notfallScheinNotfall": {
                "type": "Boolean",
                "label": {
                    "en": "Notfall (Notfallschein)",
                    "de": "Notfall (Notfallschein)"
                }
            },
            "betreuungVon": {
                "type": "String",
                "label": {
                    "en": "Betreuung von",
                    "de": "Betreuung von"
                }
            },
            "betreuungBis": {
                "type": "String",
                "label": {
                    "en": "Betreuung bis",
                    "de": "Betreuung bis"
                }
            },
            "betreuungNotwendig": {
                "type": "String",
                "label": {
                    "en": "Betreuung notwendig",
                    "de": "Betreuung notwendig"
                }
            },
            "betreuungNichtNotwendig": {
                "type": "String",
                "label": {
                    "en": "Betreuung nicht notwendig",
                    "de": "Betreuung nicht notwendig"
                }
            },
            "betreuungUnfall": {
                "type": "String",
                "label": {
                    "en": "Betreuung Unfall",
                    "de": "Betreuung Unfall"
                }
            },
            "betreuungKeinUnfall": {
                "type": "String",
                "label": {
                    "en": "Betreuung kein Unfall",
                    "de": "Betreuung kein Unfall"
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
