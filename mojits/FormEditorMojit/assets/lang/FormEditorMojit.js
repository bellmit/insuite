/**
 *  A first attempt at internationalization of FormEditorMojit module
 *
 *  NOTE: this is deprecated, to be moved to main lang files
 */

/*global YUI */

YUI.add("lang/FormEditorMojit", function(Y, NAME) {

    'use strict';

    Y.log(
        NAME + ' Adding client-side language module for German. Depreacted, replacement system under development.',
        'warn',
        'FormEditorMojit'
    );

    Y.Intl.add(
        "FormEditorMojit",      // associated mojit
        "",                     // BCP 47 language tag

        /*
         *  key-value pairs for this module and language
         */

        {
            /*
             *  Status messages
             */

            STATUS_PLEASE_WAIT: "Bitte warten",
            STATUS_LOADING: "Lade",
            STATUS_RENDERING_PDF: "PDF erzeugen",
            STATUS_EDITING: "In Bearbeitung",
            STATUS_LOADED: "Geladen",
            STATUS_RELOADING: "Erneut laden",
            STATUS_CREATING_PAGE: "Seite erzeugen",
            STATUS_ADDED: "Hinzugefügt",
            STATUS_SUBMITTING_FORM: "Formular absenden",
            STATUS_SAVING_CHANGES: "Änderungen speichern",
            STATUS_SAVING_TO_DISK: "Save to disc",
            STATUS_CHANGES_SAVED: "Änderungen gespeichert",
            STATUS_ALL_CHANGES_SAVED: "Alle Änderungen gespeichert",
            STATUS_SAVING_FORM: "Formulardaten speichern",
            STATUS_RETRYING_SAVE: "Erneut speichern",

            /*
             *  Dialog for reordering elements
             */

            TITLE_REORDER: "Elemente neu ordnen",

            /*
             *  Dialog for PDF rendering
             */

            LBL_PDF_COMPLETE: "Fertigstellen",
            LBL_PDF_DOWNLOAD: "PDF speichern",
            LBL_PDF_OPEN: "PDF öffnen",


            /*
             *  Form editor
             */

            LBL_FE_QUERY_EMPTY: "Abfrage ergab 0 Objekte",
            LBL_FE_SUCCESS: "Erfolg",
            LBL_FE_FAILURE: "Fehler",
            LBL_FE_COULD_NOT_LOAD: "Objekt konnte nicht geladen werden:",
            LBL_FE_LOADED_OBJECT: "Objekt geladen",
            LBL_FE_OK_MAP: "Drücken Sie 'OK'.",

            LBL_FE_PDF_OPTIONS: "Druckoptionen",

            LBL_FE_ERROR: "Fehler",
            LBL_FE_WARNING: "Warnung",
            LBL_FE_IN_PROGRESS: "Läuft",
            LBL_FE_DELETE: "Löschen: ",
            LBL_FE_COULD_NOT_DELETE: "Formular konnte nicht gelöscht werden: ",
            LBL_FE_DELETED: "Gelöscht: ",
            LBL_FE_COULD_NOT_CREATE_VERSION: "Neue Version konnte nicht erstellt werden",

            LBL_FE_EXPORT: "Formular Export oder Import",
            LBL_FE_DOWNLOAD: "Herunterladen Archiv",
            LBL_FE_UPLOAD: "Hochladen Archiv",
            BTN_FE_EXPORT: "Export",

            /*
             *  Table editor
             */

            LBL_EE_OVERFLOW: "Überlaufform",
            LBL_EE_NOTABLECOLS: "Keine Spalten Tabelle hinzugefügt",

            /*
             *  Generic labels
             */

            LBL_CREATE_A_NEW_FORM: "Neues Formular",
            LBL_NEW_FORM_NAME: "Name des Formulars",

            LBL_SUBMITTING: "Absenden",
            LBL_THANK_YOU_QUESTIONNAIRE: "Vielen Dank",

            LBL_LOADING: "Laden",
            LBL_DONE: "Abgeschlossen",
            LBL_LOADING_FORM_TEMPLATE: "Lade von Vorlage",

            LBL_ERROR: "Fehler",
            LBL_COULD_NOT_RESET_FORM: "Reset war nicht erfolgreich",
            LBL_FORM_TEMPLATE_EMPTY: "Formularvorlage ist leer",
            LBL_ERROR_WHILE_LOADING_FORM: "Ein Formular oder ein Sub-Formular ist nicht vorhanden oder konnte nicht geladen werden.",

            LBL_WARNING: "Warnung",
            LBL_COULD_NOT_SAVE_PAGE: "Seite konnte nicht gespeichert werden",

            LBL_EXPORTING_PDF: "PDF erstellen",
            LBL_RENDERING_PAGE: "Rendering",
            LBL_UPLOADING_PAGE: "Hochladen",
            LBL_OF: "von",
            LBL_FIND_IT_HERE: "Finden sie in",
            LBL_CONVERTING: "Konvertieren",
            LBL_PAGES_TO_PDF: "Seiten als PDF",

            LBL_RESET_FORM: "Formular zurücksetzen",
            LBL_CONFIRM_RESET: "Bitte Formular Rücksetzung bestätigen",
            LBL_RESETTING_FORM: "Formular wird zurückgesetzt",
            LBL_RESETTING_PLEASE_WAIT: "Formular wird zurückgesetzt - bitte warten Sie",
            LBL_FORM_SAVED_TO_DISK: "Formular gespeichert.",

            LBL_PLEASE_CHOOSE_FORM: "Bitte wählen sie ein Formular aus dem Baum auf der linken Seite.",

            LBL_INFO: "Hinweis",
            LBL_PLEASE_SELECT_SINGLE_IMAGE: "Bitte wählen sie eine Bilddatei (*.jpeg)",
            LBL_ERROR_LOADING_IMAGE: "Fehler beim Laden der Bilddatei",
            LBL_COULD_NOT_STORE_IMAGE: "Bilddatei konnte nicht gespeichert werden",
            LBL_IMAGE_POSTED: "Bilddatei wurde gesendet",

            LBL_TIP: "Hinweis",
            LBL_TIP_RADIO: "Um mehrere Radio-Elemente zu erstellen, tragen Sie eins pro Zeile ein und kennzeichnenn den Standardwert mit einem *",
            LBL_TIP_DROPDOWN: "Schreiben Sie jede Dropdown-Option in eine eigene Zeile und kennzeichnen Sie den Standardwert mit einem *.",
            LBL_TIP_CHECKBOX: "Bitte Standardwert mit * markieren.",

            LBL_FORM_NAME: "Formularname",
            LBL_PAPER_SIZE: "Papierformat",
            LBL_WIDTH: "Breite",
            LBL_HEIGHT: "Höhe",
            LBL_PRESETS: "Standards",
            LBL_ORIENTATION: "Ausrichtung",
            LBL_PORTRAIT: "Hochformat",
            LBL_LANDSCAPE: "Querformat",

            LBL_ELEMENT_REMOVED: "Entfernt",

            LBL_SELECT_IMAGE: "Bild wählen",

            BTN_CLOSE: "Schließen",
            BTN_CANCEL: "Abbrechen",
            BTN_CONFIRM: "Bestätigen",
            BTN_OK: "Ok",

            /*
             *  Version history form
             */

            LBL_FH_NOVERSION: "Keine früheren Versionen von diesem Formular",
            LBL_FH_COULDNOTLOAD: "Formularversion konnte nicht geladen werden",

            LBL_FH_VERSIONNO: "#",
            LBL_FH_TITLE: "Titel",
            LBL_FH_REVCOMMENT: "Kommentar",
            LBL_FH_DATE: "Datum",
            BTN_FH_PREVIEW: "Vorschau",
            BTN_FH_REVERT: "Zurückkehren",

            /*
             *  Error and warning messages
             */

            ERR_COUND_NOT_CREATE_PAGE: "Seite konnte nicht erstellt werden",
            ERR_DUPLICATE_FORM_NAME: "Es existiert bereits ein Formular mit diesem Namen. Bitte wählen Sie einen anderen Namen",
            ERR_BAD_NAME_CHAR: "Unzulässige Zeichen im Formularnamen",
            ERR_NO_FORM_NAME: "Formularname nicht angegeben",
            ERR_INVALID_PAPER_WIDTH: "Bitte geben sie eine gültige Papierbreite in (mm) an",
            ERR_INVALID_PAPER_HEIGHT: "Bitte geben sie eine gültige Papierhöhe in (mm) an",

            /*
             *  Translations modal
             */

            BTN_TM_TRANSLATE: "Übersetzen",
            LBL_TM_EDIT_TRANSLATIONS: "Übersetzungen bearbeiten",
            LBL_TM_GERMAN: "Deutsch",
            LBL_TM_ENGLISH: "Englisch",
            LBL_TM_OK: "OK"

        }

    );
}, '3.16.0', { requires: ['intl'] } );
