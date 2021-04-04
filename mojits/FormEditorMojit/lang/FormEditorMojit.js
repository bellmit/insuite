/**
 *  A first attempt at internationalization of FormEditorMojit module
 */

/* global YUI */



YUI.add("lang/FormEditorMojit", function(Y) {

    Y.Intl.add(
        "FormEditorMojit",      // associated mojit
        "",                     // BCP 47 language tag

        /*
         *  key-value pairs for this module and language
         */

        {

            /*
             *  Labels title and control buttons
             */

            TITLE_MY_FORMS: "Meine Formulare",
            STATUS_LOADING: "Wird geladen...",
            STATUS_PLEASE_WAIT: "Bitte warten...",

            BTN_EXPORT_PDF: "PDF exportieren",
            BTN_FILL_FORM: "Zurück",
            BTN_EDIT_FORM: "Formular bearbeiten",
            BTN_COPY_DEFAULT: "Kopie Standardformular",
            BTN_SAVE_CHANGES: "Änderungen speichern",
            BTN_TEST: "Test",
            BTN_ADD_PAGE: "Seite hinzufügen",
            BTN_REMOVE_PAGE: "Seite entfernen",
            BTN_COPY_PAGE: "Seite kopieren",
            BTN_RESET_FORM: "Änderungen bearbeiten",
            BTN_SAVE_TO_DISK: "Speichern",
            BTN_CHOOSE_IMAGE: "Bild wählen",
            BTN_SUBMIT_QUESTIONNAIRE: "Fragebogen absenden",
            BTN_EP_REORDER_ELEMENTS: "Elemente neu ordnen",
            BTN_CLOSE: "Schließen",

            /*
             *  Labels for form editor view
             */

            LBL_FE_LOADING_LIST: "Lade Formularliste...",
            LBL_FE_LOADING_PROPERTIES: "Lade Eigenschaften...",
            LBL_FE_NOSCHEMA: "Dieses Formular hat kein Schema",
            LBL_FE_SELECT_PAGE: "Bitte Formularseite wählen...",
            LBL_FE_SELECT_ELEMENT: "Bitte Element wählen...",
            LBL_FE_LOADING_IMAGES: "Lade Bilder...",
            LBL_FE_SHOW_DEBUG: "Debug-Bereich",
            LBL_FE_TEST_MAP: "Test-Mapping",

            LBL_FE_FORMSTREE: "Praxis Formulare",
            LBL_FE_FORMSTREEDEFAULT: "Doc Cirrus Formulare",
            LBL_FE_FORM: "Formular",
            LBL_FE_SCHEMA: "Schema",
            LBL_FE_PDF_OPTIONS: "Druckoptionen",
            LBL_FE_PAGE: "Seite",
            LBL_FE_ELEMENT: "Element",
            LBL_FE_IMAGES: "Bilder",
            LBL_FE_DEBUG: "Debuggen",

            LBL_FE_EXPORT: "Export oder Import von Formularen",
            LBL_FE_DOWNLOAD: "Herunterladen Archiv",
            LBL_FE_UPLOAD: "Hochladen Archiv",
            BTN_FE_EXPORT: "Ausfuhr",

            BTN_FE_SUBMIT: "Absenden",
            BTN_FE_NEWFORM: "Neues Formular",
            BTN_FE_NEWPAGE: "Neue Seite",
            BTN_FE_TESTFORM: "Serialisiert",
            BTN_FE_TESTCATS: "Kategorien",
            BTN_FE_SAVEDISK: "Auf Festplatte Speichern",
            BTN_FE_RESETALL: "Alle Zurückgesetzt",
            BTN_FE_APPLY_MAP: "Anwenden",
            BTN_FE_UNMAP: "Unmap",

            LBL_FE_MAPPING_TIP: "Bitte fügen Sie eine JSON-Objekt oder URL Testform-Zuordnung.",

            MENU_FE_NEWPAGE: "Neue Seite",
            MENU_FE_LABEL: "Label",
            MENU_FE_INPUT: "Eingabefeld",
            MENU_FE_TA: "Textarea",
            MENU_FE_TEXTMATRIX: "Textmatrix",
            MENU_FE_DATE: "Datum",
            MENU_FE_CHECKBOX: "Kontrollkästchen",
            MENU_FE_CHECKBOXTRANS: "Kontrollkästchen Transparent",
            MENU_FE_RADIO: "Radio",
            MENU_FE_RADIOTRANS: "Radio-Transparent",
            MENU_FE_DROPDOWN: "Dropdown",
            MENU_FE_TABLE: "Tabelle",
            MENU_FE_REPORTTABLE: "Bericht Tabelle",
            MENU_FE_IMAGE: "Bild",
            MENU_FE_BARCODE: "Barcode",
            MENU_FE_AUDIO: "Audio",
            MENU_FE_VIDEO: "Video",
            MENU_FE_SUBFORM: "Subform",

            /*
             *  Common labels for modals
             */

            LBL_MD_NOTICE: "Hinweis",
            LBL_MD_CANCEL: "Abbrechen",
            LBL_MD_CONFIRM: "Bestätigen",

            /*
             *  Labels for form properties panel
             */

            LBL_FP_NAME: "Name",
            LBL_FP_GRID: "Raster",
            LBL_FP_LANGUAGE: "Sprache",
            LBL_FP_FILE: "Datei",
            LBL_FP_CATEGORY: "Kategorie",
            LBL_FP_SCHEMA: "Schema",
            LBL_FP_DEFAULTFOR: "Standardrolle",
            LBL_FP_PAPER: "Papier",
            LBL_FP_SUBFORM: "Subform",
            LBL_FP_READONLY: "Verschlossen",
            LBL_FP_BFB: "Blankoformular",
            LBL_FP_INSIGHT2: "InSight Bericht",
            LBL_FP_ELASTIC: "Festes Layout",
            LBL_FP_ACTTYPE: "Leistungsart",
            BTN_FP_UPDATE: "Aktualisieren",
            BTN_FP_DELETE_FORM: "Löschen",
            BTN_FP_COPY_FORM: "Kopieren",
            BTN_FP_NEW_VERSION: "V+",

            LBL_FP_REVISIONCOMMENT: "Versionskommentar",

            LBL_FP_CONFIRM_DELETE: "Das Formular selbst und alle gespeicherten Instanzen werden gelöscht! Sind Sie sicher?",
            LBL_FP_CONFIRM_NEW_VERSION: "Erstellen Sie eine neue Version für dieses Formular",

            LBL_FP_DEL_NOTINUSE: "Formular wird gelöscht",
            LBL_FP_DEL_ISINUSE: "Formular ist in Verwendung. Löschen blendet es dauerhaft aus. Wo es verwendet wurde, ist es jedoch noch sichtbar.",

            /*
             *  Labels for BFB properties panel (visible only for BFB forms)
             */

            LBL_BFB_ALTERNATE: "Formular, wenn keine BFB Nutzung",

            /*
             *  Labels for element properties panel (shares with 'add element')
             */

            EDIT_FORM_ELEMENT: "Formularelement bearbeiten",
            LBL_ELEMENT_TYPE: "Elementtyp",
            LBL_EE_COLORS: "Farben",
            LBL_BORDER_COLOR: "Rahmen",

            LBL_EE_POSITION: "Position und Schrift",
            LBL_TOP_MM: "Oben",
            LBL_LEFT_MM: "Links",

            LBL_ALIGN: "Ausrichten",
            OPT_LEFT: "links",
            OPT_RIGHT: "rechts",
            OPT_CENTER: "mittig",
            OPT_JUSTIFY: "justify",
            LBL_EE_VALUE: "Standardwert",
            BTN_ATTACH_IMAGE: "Bild anhängen",

            LBL_FONT_FACE: "Schriftart",
            LBL_FONT_SPACE: "Zeilenabstand",

            BTN_UPDATE_ELEMENT: "Aktualisieren",
            BTN_REMOVE_ELEMENT: "Entfernen",
            BTN_EE_UNLINK: "Verlinkung entfernen",
            LBL_EE_READONLY: "Nur lesen",
            LBL_EE_GRID_ALIGN: "Raster ausrichten",
            LBL_EE_BFB: "Felder für Blankoformular",
            LBL_EE_CLIP: "Ausblenden",

            LBL_EE_ISLINKED: "Dieses Element ist mit dem ursprünglich, kopierten Element verlinkt.  Klicken Sie &quot;Verlinkung entfernen&quot;, um neue Eingaben für dieses Element nutzen zu können.",
            LBL_EE_OVERFLOW: "Überlaufform",
            LBL_EE_NOTABLECOLS: "Keine Spalten Tabelle hinzugefügt",

            LBL_BOLD: "Bold",
            LBL_ITALIC: "Italic",
            LBL_UNDERLINE: "Underline",

            /**
             *  Labels for page properties panel
             */

            LBL_IS_CARBON_COPY: "Diese Seite nicht in inCase anzeigen.",
            LBL_PAGE_HEADER: "Briefkopf",
            LBL_PAGE_FOOTER: "Fußzeile",

            /**
             *  Labels for print properties panel
             */

            LBL_PP_PRINTERNAME: "Drucker",
            LBL_PP_ROTATION: "Drehung",
            LBL_PP_PDFSCALE: "Größenordnung",
            LBL_PP_OFFSETX: "Offset X (mm)",
            LBL_PP_OFFSETY: "Offset Y (mm)",
            LBL_PP_PRINT_BG: "Hintergrund drucken",
            LBL_PP_PDFA4: "A4 PDF",
            LBL_PP_TESTPRINT: "Testdruck",

            /*
             *  Labels for panel properties form
             */

            PANEL_PROPERTIES: "Panel-Eigenschaften",
            LBL_DOM_ID: "DOM-ID",
            LBL_WIDTH_MM: "Breite",
            LBL_HEIGHT_MM: "Höhe",
            LBL_FONT_HEIGHT_MM: "Schriftgröße",
            LBL_FOREGROUND_COLOR: "Vordergrund",
            LBL_BACKGROUND_COLOR: "Hintergrund",
            LBL_BACKGROUND_IMAGE: "Hintergrundbild",
            BTN_SET_BG_IMAGE: "Setze Hintergrundbild",
            BTN_UPDATE_PANEL: "Aktualisieren",
            BTN_REMOVE_PANEL: "Panel löschen",

            /*
             *  Labels for new element form
             */

            ADD_FORM_ELEMENT: "Hinzufügen",
            BTN_CREATE_ELEMENT: "Neues Element",
            OPT_ADD_LABEL: "Label",
            OPT_ADD_INPUT: "Input",
            OPT_ADD_TEXTAREA: "Textarea",
            OPT_ADD_TEXTMATRIX: "Textmatrix",
            OPT_ADD_CHECKBOX: "Checkbox",
            OPT_ADD_CHECKBOXTRANS: "Checkbox trans.",
            OPT_ADD_DROPDOWN: "Dropdown",
            OPT_ADD_RADIO: "Radiobox",
            OPT_ADD_DATE: "Datum",
            OPT_ADD_RADIOTRANS: "Radiobox trans.",
            OPT_ADD_IMAGE: "Bild",
            OPT_ADD_TABLE: "Table",
            OPT_ADD_REPORTTABLE: "Report Table",
            OPT_ADD_BARCODE: 'Barcode',
            OPT_ADD_AUDIO: 'Audio',
            OPT_ADD_SUBFORM: 'subform',

            LBL_FORM_NAME: "Formularname",
            LBL_PAPER_SIZE: "Papierformat",
            LBL_WIDTH: "Breite",
            LBL_HEIGHT: "Höhe",
            LBL_PRESETS: "Voreinstellungen",
            LBL_ORIENTATION: "Ausrichtung",
            LBL_PORTRAIT: "Hochformat",
            LBL_LANDSCAPE: "Querformat",

            LBL_FORM_CATEGORY: 'Kategorie',
            LBL_FORM_SCHEMA: 'Datenschema',

            BTN_CANCEL: "Abbruch",
            BTN_OK: "OK",

            /*
             *  Labels for table editor
             */

            LBL_TE_TABLE_SCHEMA: "Tabellenschema",
            LBL_TE_COLS: "Spalten",
            LBL_TE_AD_COL: "Spalte hinzufügen",
            LBL_TE_LOADING_SCHEMA: "Lade Schema...",
            BTN_TE_SET_SCHEMA: "Wähle Schema",
            BTN_TE_ADD_COL: "Spalte hinzufügen",
            ERR_NAME_TOO_LONG: "Form name is too long",

            /*
             *  Labels for backup form
             */

            LBL_FB_DISK_USER: "Festplatte (Benutzerformulare)",
            LBL_FB_DISK_DEFAULT: "Festplatte (Standardformulare)",
            LBL_FB_DB_USER: "Datenbank (Benutzerformulare)",
            LBL_FB_DB_DEFAULT: "Datenbank (Standardformulare)",

            /*
             *  Labels for assignment form
             */

            H_AF_ASSIGN: "Zuweisen",
            LBL_AF_ASSIGN: "Weisen Sie dieses Formular, um eine Sonderrolle",
            LBL_AF_STARTFORM: "inForm Startmaske",
            LBL_AF_QUOTE: "inCase Kostenplan",
            LBL_AF_INVOICE: "inCase Rechnung",
            LBL_AF_PERSONALIENFELD: "inCase Personalienfeld",
            LBL_AF_PATIENTRECIEPT: "inCase Patientquittung",
            LBL_AF_DOCLETTER: "inCase Arztbrief",

            LBL_AF_PRIVATEBILL: "inCase Privatrechnung",

            LBL_AF_PRESCRIPTION: "inCase Privatrezept",
            LBL_AF_INSURANCE: "inCase Kassenrezept",
            LBL_AF_DISABILITY: "inCase Arbeitsunfähigkeit",
            LBL_AF_TRANSFER: "inCase Überweisung",
            LBL_AF_DKGBILL: "inCase Privatrechnung (DKG-NT)",

            LBL_AF_TERMINLISTE: "inCase Termin Liste",
            BTN_AF_ASSIGN: "Setzen",

            /*
             *  Embedded forms (questionnaire)
             */

            BTN_EMBED_PREVIOUS: "Vorherige",
            BTN_EMBED_NEXT: "Nächste",
            BTN_EMBED_SUBMIT: "Abschicken",
            BTN_EMBED_PDF: "PDF-Export",

            /*
             *  Translations modal
             */

            BTN_TM_TRANSLATE: "Übersetzen",
            LBL_TM_EDIT_TRANSLATIONS: "Übersetzungen bearbeiten",
            LBL_TM_GERMAN: "Deutsch",
            LBL_TM_ENGLISH: "Englisch",
            LBL_TM_OK: "OK",


            //  TEMPORARY HACK - ADD SOME MISSING KEYS TO FALLBACK DICT
            //  This whole system is to be replaced

            /*
             *  Status messages
             */

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

            LBL_FE_BFB: "Alternative zu BFB",

            LBL_FE_ERROR: "Fehler",
            LBL_FE_WARNING: "Warnung",
            LBL_FE_IN_PROGRESS: "Läuft",
            LBL_FE_DELETE: "Löschen: ",
            LBL_FE_COULD_NOT_DELETE: "Formular konnte nicht gelöscht werden: ",
            LBL_FE_DELETED: "Gelöscht: ",
            LBL_FE_COULD_NOT_CREATE_VERSION: "Neue Version konnte nicht erstellt werden",

            BTN_FE_PRINTDEBUG: "Export für Print",

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
            LBL_UPLOADING_PAGE: "Upload",
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

            LBL_ELEMENT_REMOVED: "Entfernt",
            LBL_SELECT_IMAGE: "Bild wählen",
            BTN_CONFIRM: "Bestätigen",

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
            ERR_INVALID_PAPER_HEIGHT: "Bitte geben sie eine gültige Papierhöhe in (mm) an"


        }

    );
}, "3.1.0", {requires: ['intl']});