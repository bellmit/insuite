/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */



YUI.add( 'gdt_v_21', function( Y ) {

        //gdt templates to use

        var moment = require('moment');
    
        let gdt21 = {};
        gdt21.type = "gdt";
        gdt21.name = "gdt21";
        gdt21.version = "02.10";
        gdt21.versionField = "9218";
        gdt21.acceptedVersions = ["01.00","02.00","02.01","02.10","1.00","2.00","2.01","2.10"];

        gdt21.dateFormat = "DDMMYYYY";
        gdt21.shortDateFormat = "MMYY";
        gdt21.timeFormat = "HHmmss";

        gdt21.encodings = ["ASCII (german)", "Code page 437", "ISO 8859-15"];
        gdt21.encodingField = "9206";

        gdt21.sizeCounter = 1; //1 byte for the counter
        gdt21.sizeLabel = 3; //3 bytes for the Label: B00/B01/B02
        gdt21.sizeDataField = 128; //128 bytes for field content
        gdt21.sizeCrc16 = 4;
        gdt21.sizeLen = 3;
        gdt21.sizeRecLen = 5;
        gdt21.sizefileLen = 0;
        gdt21.sizeSatz = 4;
        gdt21.sizeFk = 4;

        gdt21.serialCr = "[CR]"; //0x0D
        gdt21.serialNewLineReplacement = "[FS]"; //0x1C

        gdt21.recordType = "8000";
        gdt21.recordSize = "8100";
        gdt21.objType = "";
        gdt21.objEntries = "";
        gdt21.recordEntries = "";

        gdt21.saetze = {
            "6300": {
                desc: "Stammdaten anfordern", attribute: "patientDataRequest", fk: {
                    "8000": {amount: "1", optional: false},
                    "8100": {amount: "1", optional: false},
                    "8315": {amount: "1", optional: true},
                    "8316": {amount: "1", optional: true},
                    "9206": {amount: "1", optional: true},
                    "9218": {amount: "1", optional: false},
                    "3000": {amount: "1", optional: false}
                }
            },
            "6301": {
                desc: "Stammdaten übermitteln", attribute: "patientData", fk: {
                    "8000": {amount: "1", optional: false},
                    "8100": {amount: "1", optional: false},
                    "8315": {amount: "1", optional: true},
                    "8316": {amount: "1", optional: true},
                    "9206": {amount: "1", optional: true},
                    "9218": {amount: "1", optional: false},
                    "3000": {amount: "1", optional: false},
                    "3100": {amount: "1", optional: true},
                    "3101": {amount: "1", optional: false},
                    "3102": {amount: "1", optional: false},
                    "3103": {amount: "1", optional: false},
                    "3104": {amount: "1", optional: true},
                    "3105": {amount: "1", optional: true},
                    "3106": {amount: "1", optional: true},
                    "3107": {amount: "1", optional: true},
                    "3108": {amount: "1", optional: true},
                    "3110": {amount: "1", optional: true},
                    "3622": {amount: "1", optional: true},
                    "3623": {amount: "1", optional: true},
                    "3628": {amount: "1", optional: true}
                }
            },
            "6302": {
                desc: "Neue Untersuchung anfordern", attribute: "studyDataRequest", fk: {
                    "8000": {amount: "1", optional: false},
                    "8100": {amount: "1", optional: false},
                    "8315": {amount: "1", optional: true},
                    "8316": {amount: "1", optional: true},
                    "9206": {amount: "1", optional: true},
                    "9218": {amount: "1", optional: false},
                    "0102": {amount: "1", optional: true},
                    "0103": {amount: "1", optional: true},
                    "0132": {amount: "1", optional: true},
                    "3000": {amount: "1", optional: false},
                    "3100": {amount: "1", optional: true},
                    "3101": {amount: "1", optional: false},
                    "3102": {amount: "1", optional: false},
                    "3103": {amount: "1", optional: false},
                    "3104": {amount: "1", optional: true},
                    "3105": {amount: "1", optional: true},
                    "3106": {amount: "1", optional: true},
                    "3107": {amount: "1", optional: true},
                    "3108": {amount: "1", optional: true},
                    "3110": {amount: "1", optional: true},
                    "3622": {amount: "1", optional: true},
                    "3623": {amount: "1", optional: true},
                    "3628": {amount: "1", optional: true},
                    "8402": {amount: "1", optional: true},
                    "8410": {amount: "1", optional: true}
                }
            },
            "6310": {
                desc: "Daten einer Untersuchung übermitteln", attribute: "studyData", fk: {
                    "8000":     {amount: "1", optional: false},
                    "8100":     {amount: "1", optional: false},
                    "8315":     {amount: "1", optional: true},
                    "8316":     {amount: "1", optional: true},
                    "9206":     {amount: "1", optional: true},
                    "9218":     {amount: "1", optional: false},
                    "0102":     {amount: "1", optional: true},
                    "0103":     {amount: "1", optional: true},
                    "0132":     {amount: "1", optional: true},
                    "3000":     {amount: "1", optional: false},
                    "3100":     {amount: "1", optional: true},
                    "3101":     {amount: "1", optional: false},
                    "3102":     {amount: "1", optional: false},
                    "3103":     {amount: "1", optional: false},
                    "3104":     {amount: "1", optional: true},
                    "3105":     {amount: "1", optional: true},
                    "3106":     {amount: "1", optional: true},
                    "3107":     {amount: "1", optional: true},
                    "3108":     {amount: "1", optional: true},
                    "3110":     {amount: "1", optional: true},
                    "3622":     {amount: "1", optional: true},
                    "3623":     {amount: "1", optional: true},
                    "3628":     {amount: "1", optional: true},
                    "8402":     {amount: "1", optional: true},
                    "6200":     {amount: "1", optional: true},
                    "6201":     {amount: "1", optional: true},
                    "6205":     {amount: "n", optional: true},
                    "6220":     {amount: "n", optional: true},
                    "6221":     {amount: "n", optional: true},
                    "6227":     {amount: "n", optional: true},
                    "6226":     {amount: "n", optional: true},
                    "6228":     {amount: "n", optional: true},
                    "6302":     {amount: "n", optional: true, children: {
                        "6303": {amount: "1", optional: false},
                        "6304": {amount: "1", optional: false},
                        "6305": {amount: "1", optional: false}}},

                    "6330": {amount: "n", optional: true, children: {"6331": {amount: "1", optional: false}}},
                    "6332": {amount: "n", optional: true, children: {"6333": {amount: "1", optional: false}}},
                    "6334": {amount: "n", optional: true, children: {"6335": {amount: "1", optional: false}}},
                    "6336": {amount: "n", optional: true, children: {"6337": {amount: "1", optional: false}}},
                    "6338": {amount: "n", optional: true, children: {"6339": {amount: "1", optional: false}}},
                    "6340": {amount: "n", optional: true, children: {"6341": {amount: "1", optional: false}}},
                    "6342": {amount: "n", optional: true, children: {"6343": {amount: "1", optional: false}}},
                    "6344": {amount: "n", optional: true, children: {"6345": {amount: "1", optional: false}}},
                    "6346": {amount: "n", optional: true, children: {"6347": {amount: "1", optional: false}}},
                    "6348": {amount: "n", optional: true, children: {"6349": {amount: "1", optional: false}}},
                    "6350": {amount: "n", optional: true, children: {"6351": {amount: "1", optional: false}}},
                    "6352": {amount: "n", optional: true, children: {"6353": {amount: "1", optional: false}}},
                    "6354": {amount: "n", optional: true, children: {"6355": {amount: "1", optional: false}}},
                    "6356": {amount: "n", optional: true, children: {"6357": {amount: "1", optional: false}}},
                    "6358": {amount: "n", optional: true, children: {"6359": {amount: "1", optional: false}}},
                    "6360": {amount: "n", optional: true, children: {"6361": {amount: "1", optional: false}}},
                    "6362": {amount: "n", optional: true, children: {"6363": {amount: "1", optional: false}}},
                    "6364": {amount: "n", optional: true, children: {"6365": {amount: "1", optional: false}}},
                    "6366": {amount: "n", optional: true, children: {"6367": {amount: "1", optional: false}}},
                    "6368": {amount: "n", optional: true, children: {"6369": {amount: "1", optional: false}}},
                    "6370": {amount: "n", optional: true, children: {"6371": {amount: "1", optional: false}}},
                    "6372": {amount: "n", optional: true, children: {"6373": {amount: "1", optional: false}}},
                    "6374": {amount: "n", optional: true, children: {"6375": {amount: "1", optional: false}}},
                    "6376": {amount: "n", optional: true, children: {"6377": {amount: "1", optional: false}}},
                    "6378": {amount: "n", optional: true, children: {"6379": {amount: "1", optional: false}}},
                    "6380": {amount: "n", optional: true, children: {"6381": {amount: "1", optional: false}}},
                    "6382": {amount: "n", optional: true, children: {"6383": {amount: "1", optional: false}}},
                    "6384": {amount: "n", optional: true, children: {"6385": {amount: "1", optional: false}}},
                    "6386": {amount: "n", optional: true, children: {"6387": {amount: "1", optional: false}}},
                    "6388": {amount: "n", optional: true, children: {"6389": {amount: "1", optional: false}}},
                    "6390": {amount: "n", optional: true, children: {"6391": {amount: "1", optional: false}}},
                    "6392": {amount: "n", optional: true, children: {"6393": {amount: "1", optional: false}}},
                    "6394": {amount: "n", optional: true, children: {"6395": {amount: "1", optional: false}}},
                    "6396": {amount: "n", optional: true, children: {"6397": {amount: "1", optional: false}}},
                    "6398": {amount: "n", optional: true, children: {"6399": {amount: "1", optional: false}}},

                    "8410":         {amount: "n", optional: false, children: {
                        "8411":     {amount: "1", optional: true},
                        "8428":     {amount: "1", optional: true},
                        "8429":     {amount: "1", optional: true},
                        "8430":     {amount: "1", optional: true, children: {
                            "8431": {amount: "n", optional: true}}},
                        "8437":     {amount: "1", optional: false},
                        "8438":     {amount: "n", optional: true},
                        "8418":     {amount: "1", optional: true},
                        "8420":     {amount: "1", optional: true},
                        "8421":     {amount: "1", optional: false},
                        "8432":     {amount: "1", optional: true},
                        "8439":     {amount: "1", optional: true},
                        "8460":     {amount: "1", optional: true},
                        "8461":     {amount: "1", optional: true},
                        "8462":     {amount: "1", optional: true},
                        "8470":     {amount: "n", optional: true},
                        "8480":     {amount: "n", optional: true}}},
                    "8990": {amount: "1", optional: true},
                    "0201": {amount: "1", optional: true},
                    "8310": {amount: "1", optional: true},
                    "8491": {amount: "1", optional: true}
                }
            },
            "6311": {
                desc: "Daten einer Untersuchung zeigen", attribute: "studyDataViewRequest", fk: {
                    "8000": {amount: "1", optional: false},
                    "8100": {amount: "1", optional: false},
                    "8315": {amount: "1", optional: true},
                    "8316": {amount: "1", optional: true},
                    "9206": {amount: "1", optional: true},
                    "9218": {amount: "1", optional: false},
                    "3000": {amount: "1", optional: false},
                    "3100": {amount: "1", optional: true},
                    "3101": {amount: "1", optional: true},
                    "3102": {amount: "1", optional: true},
                    "3103": {amount: "1", optional: true},
                    "3104": {amount: "1", optional: true},
                    "6200": {amount: "1", optional: true},
                    "6201": {amount: "1", optional: true},
                    "8402": {amount: "1", optional: true},
                    "8432": {amount: "1", optional: true},
                    "8439": {amount: "1", optional: true}
                }
            }
        };
        gdt21.fields = {
            "0102": {  desc: "Softwareverantwortlicher (SV)",                                attribute: "sv",                 type: "string", len: "<=60"  },
            "0103": {  desc: "Software",                                                     attribute: "sw",                 type: "string", len: "<=60"  },
            "0132": {  desc: "Release-Stand der Software",                                   attribute: "swVersion",          type: "string", len: "<=60"  },
            "0201": {  desc: "Betriebsstättennummer (BSNR)",                                 attribute: "bsnr",               type: "number", len: "9"  },
            "3000": {  desc: "Patientennummer / Patientenkennung",                           attribute: "patientId",          type: "string", len: "<=10"  },
            "3100": {  desc: "Namenszusatz / Vorsatzwort des Patienten",                     attribute: "patientNameAdd",     type: "string", len: "<=15"  },
            "3101": {  desc: "Name des Patienten",                                           attribute: "patientName",        type: "string", len: "<=28"  },
            "3102": {  desc: "Vorname des Patienten",                                        attribute: "patientForename",    type: "string", len: "<=28"  },
            "3103": {  desc: "Geburtsdatum des Patienten",                                   attribute: "patientDob",         type: "date",   len: "8", mapper: "date"  },
            "3104": {  desc: "Titel des Patienten",                                          attribute: "patientTitle",       type: "string", len: "<=15"  },
            "3105": {  desc: "Versichertennummer des Patienten",                             attribute: "patientInsNo",       type: "string", len: "<=12"  },
            "3106": {  desc: "Wohnort des Patienten",                                        attribute: "patientcity",        type: "string", len: "<=30"  },
            "3107": {  desc: "Straße des Patienten",                                         attribute: "patientStreet",      type: "string", len: "<=28"  },
            "3108": {  desc: "Versichertenart MFR",                                          attribute: "insuranceKind",      type: "number", len: "1"  },
            "3110": {  desc: "Geschlecht des Patienten",                                     attribute: "patientGender",      type: "number", len: "1", mapper: "gender"  },
            "3622": {  desc: "Größe des Patienten",                                          attribute: "patientHeight",      type: "float", mapper: "cm"  },
            "3623": {  desc: "Gewicht des Patienten",                                        attribute: "patientWeight",      type: "float", mapper: "kg"  },
            "3628": {  desc: "Muttersprache des Patienten",                                  attribute: "patientNativelang",  type: "string", len: "<=60"  },
            "4121": {  desc: "Gebührenordnung",                                              attribute: "insuranceFeeSchedule",   type: "number", len: "1"  },
            "6200": {  desc: "Tag der Speicherung von Behandlungsdaten",                     attribute: "treatmentDate.date", type: "date",   len: "8", mapper: "dateTime"  },
            "6201": {  desc: "Uhrzeit der Erhebung von Behandlungsdaten",                    attribute: "treatmentDate.time", type: "time",   len: "6", mapper: "dateTime"  },
            "6205": {  desc: "Aktuelle Diagnose",                                            attribute: "curDiag",            type: "string", len: "<=60"  },
            "6220": {  desc: "Befund",                                                       attribute: "report",             type: "string", len: "<=60"  },
            "6221": {  desc: "Fremdbefund",                                                  attribute: "forReport",          type: "string", len: "<=60"  },
            "6226": {  desc: "Anzahl der nachfolgenden Fortsetzungszeilen der Kennung 6228", attribute: "resTextAmount",      type: "number", len: "<=4"  },
            "6227": {  desc: "Kommentar",                                                    attribute: "comment",            type: "string", len: "<=60"  },
            "6228": {  desc: "Ergebnistabellentext, formatiert",                             attribute: "resTextValues",      type: "string", len: "<=60", mapper: "resText"  },
            "6302": {  desc: "Datei-Archivierungskennung",                                   attribute: "fileArchiveLabel",   type: "string", len: "<=60"  },
            "6303": {  desc: "Dateiformat",                                                  attribute: "fileFormat",         type: "string", len: "<=60"  },
            "6304": {  desc: "Dateiinhalt",                                                  attribute: "fileContentDesc",    type: "string", len: "<=60"  },
            "6305": {  desc: "Verweis auf Datei",                                            attribute: "fileRef",            type: "string", len: "<=60"  },

            "6330": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6331": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6332": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6333": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6334": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6335": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6336": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6337": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6338": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6339": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6340": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6341": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6342": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6343": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6344": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6345": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6346": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6347": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6348": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6349": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6350": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6351": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6352": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6353": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6354": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6355": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6356": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6357": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6358": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6359": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6360": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6361": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6362": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6363": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6364": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6365": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6366": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6367": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6368": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6369": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6370": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6371": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6372": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6373": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6374": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6375": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6376": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6377": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6378": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6379": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6380": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6381": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6382": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6383": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6384": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6385": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6386": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6387": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6388": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6389": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6390": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6391": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6392": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6393": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6394": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6395": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6396": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6397": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },
            "6398": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: "<=60", mapper: "freeCat"  },    "6399": {  desc: "Inhalt", attribute: "content", type: "string", len: "<=60"  },

            "8000": {  desc: "Satzidentifikation",                         attribute: "recordType",            type: "string", len: "4", mapper: "satzID"  },
            "8100": {  desc: "Satzlänge",                                  attribute: "recordSize",            type: "number", len: "5", mapper: "byte"  },
            "8310": {  desc: "Fall-ID",                                    attribute: "caseFolderId",          type: "string", len: "<=60"  },
            "8315": {  desc: "GDT-ID des Empfängers",                      attribute: "receiverGdtId",         type: "string", len: "<=8"  },
            "8316": {  desc: "GDT-ID des Senders",                         attribute: "senderGdtId",           type: "string", len: "<=8"  },
            "8402": {  desc: "Geräte und verfahrensspezifisches Kennfeld", attribute: "procedure",             type: "string", len: "<=6", mapper: "procedure"  },
            "8410": {  desc: "Test(s)",                                    attribute: "testId",                type: "string", len: "<=20"  },
            "8411": {  desc: "Testbezeichnung",                            attribute: "testLabel",             type: "string", len: "<=60"  },
            "8418": {  desc: "Teststatus",                                 attribute: "testStatus",            type: "string", len: "1"  },
            "8420": {  desc: "Ergebnis-Wert",                              attribute: "testResultVal",         type: "float"  },
            "8421": {  desc: "Einheit",                                    attribute: "testResultUnit",        type: "string", len: "<=60"  },
            "8428": {  desc: "Probenmaterial-Ident",                       attribute: "sampleId",              type: "string", len: "<=8"},
            "8429": {  desc: "Probenmaterial-Index",                       attribute: "sampleIndex",           type: "number", len: "2"  },
            "8430": {  desc: "Probenmaterial-Bezeichnung",                 attribute: "sampleLabel",           type: "string", len: "<=60"  },
            "8431": {  desc: "Probenmaterial-Spezifikation",               attribute: "sampleSpec",            type: "string", len: "<=60"  },
            "8432": {  desc: "Abnahme-Datum",                              attribute: "collDate.date",         type: "date",   len: "8", mapper: "dateTime"  },
            "8437": {  desc: "Einheit(en) für Datenstrom",                 attribute: "dataStreamUnits",       type: "string", len: "<=60"  },
            "8438": {  desc: "Datenstrom",                                 attribute: "dataStream",            type: "string", len: "<=60"  },
            "8439": {  desc: "Abnahme-Zeit",                               attribute: "collDate.time",         type: "time",   len: "6"  },
            "8460": {  desc: "Normalwert-Text",                            attribute: "normalValueText",       type: "string", len: "<=60"  },
            "8461": {  desc: "Normalwert untere Grenze",                   attribute: "normalValueLowerBound", type: "float"  },
            "8462": {  desc: "Normalwert obere Grenze",                    attribute: "normalValueUpperBound", type: "float"  },
            "8470": {  desc: "Testbezogene Hinweise",                      attribute: "testNotes",             type: "string", len: "<=60"  },
            "8480": {  desc: "Ergebnis-Text",                              attribute: "resultText",            type: "string", len: "<=60"  },
            "8491": {  desc: "Beauftragender / verantwortl. Arzt",         attribute: "responsibleDoctor",     type: "string", len: "<=60"  },
            "8990": {  desc: "Signatur",                                   attribute: "signature",             type: "string", len: "<=60"  },
            "9206": {  desc: "Verwendeter Zeichensatz",                    attribute: "encoding",              type: "encoding", len: "1"  },
            "9218": {  desc: "Version GDT",                                attribute: "gdtVersion",            type: "string", len: "5"  },


            "0000": {  desc: "invalid field", attribute: "invalid", type: "string"  }
        };
        gdt21.objects = {};
        gdt21.procedures = {
            "ALLG00": {group: "Untersuchungen, allgemein",     desc: "Nicht näher spezifizierte Untersuchungen"},
            "ALLE01": {group: "Allergologie",                  desc: "Anamneseerfassung allergologisch"},
            "ALLE02": {group: "Allergologie",                  desc: "Befunderfassung allergologisch"},
            "ALLE03": {group: "Allergologie",                  desc: "Diagnoseerfassung allergologisch"},
            "ALLE04": {group: "Allergologie",                  desc: "Pricktest"},
            "ALLE05": {group: "Allergologie",                  desc: "Intracutantest"},
            "ALLE06": {group: "Allergologie",                  desc: "Provokationstest"},
            "ALLE07": {group: "Allergologie",                  desc: "Invitrotest"},
            "ALLE08": {group: "Allergologie",                  desc: "Insektengift"},
            "ALLE09": {group: "Allergologie",                  desc: "Epikutantest"},
            "ALLE10": {group: "Allergologie",                  desc: "Tägliche Hyposensibilisierungsbehandlung"},
            "APNO00": {group: "Schlaf-Apnoe-Untersuchungen",   desc: "Apnoe, allgemein"},
            "APNO01": {group: "Schlaf-Apnoe-Untersuchungen",   desc: "Langzeit Schlafapnoe Screening"},
            "APNO02": {group: "Schlaf-Apnoe-Untersuchungen",   desc: "Polysomnografie"},
            "AUDI00": {group: "Audiometrische Untersuchungen", desc: "Audiometrie, allgemein"},
            "AUDI01": {group: "Audiometrische Untersuchungen", desc: "Reinton-Schwellen-Audiogramm"},
            "AUDI02": {group: "Audiometrische Untersuchungen", desc: "EEG-Audiometrie"},
            "BDM00":  {group: "Blutdruckmessung",              desc: "Blutdruckmessung, allgemein"},
            "BDM01":  {group: "Blutdruckmessung",              desc: "Langzeit-Blutdruckmessung"},
            "EKG00":  {group: "Elektrokardiographie",          desc: "EKG, allgemein"},
            "EKG01":  {group: "Elektrokardiographie",          desc: "Ruhe-EKG"},
            "EKG02":  {group: "Elektrokardiographie",          desc: "Arrhythmie-EKG"},
            "EKG03":  {group: "Elektrokardiographie",          desc: "Spätpotential-EKG"},
            "EKG04":  {group: "Elektrokardiographie",          desc: "Langzeit-EKG"},
            "ERGO00": {group: "Belastungs-Untersuchungen",     desc: "Belastungs-Untersuchungen, allgemein"},
            "ERGO01": {group: "Belastungs-Untersuchungen",     desc: "Belastungs-EKG"},
            "ERGO02": {group: "Belastungs-Untersuchungen",     desc: "Fluss-Volumen unter Belastung"},
            "ERGO03": {group: "Belastungs-Untersuchungen",     desc: "Blutgase"},
            "ERGO04": {group: "Belastungs-Untersuchungen",     desc: "Blutgase unter Belastung"},
            "ERGO05": {group: "Belastungs-Untersuchungen",     desc: "Sprioergometrie"},
            "ERGO06": {group: "Belastungs-Untersuchungen",     desc: "Atemgasanalyse"},
            "ERGO07": {group: "Belastungs-Untersuchungen",     desc: "Pulsoximetrie"},
            "ERGO08": {group: "Belastungs-Untersuchungen",     desc: "Indirekte Kalorimetrie"},
            "ERGO09": {group: "Belastungs-Untersuchungen",     desc: "Indirekte Kalorimetrie mit Haube"},
            "ERGO10": {group: "Belastungs-Untersuchungen",     desc: "HZV-Bestimmung über CO2-Rückatmung"},
            "ERGO11": {group: "Belastungs-Untersuchungen",     desc: "Atemantriebsmessung über CO2-Rückatmung"},
            "HÄMA01": {group: "Blutbilder",                    desc: "Kleines Blutbild"},
            "HÄMA02": {group: "Blutbilder",                    desc: "Großes Blutbild"},
            "HÄMA03": {group: "Blutbilder",                    desc: "Manuelles Differentialblutbild"},
            "HÄMA04": {group: "Blutbilder",                    desc: "Retikulozyten"},
            "HÄMA05": {group: "Blutbilder",                    desc: "CD4/CD8"},
            "LUFU00": {group: "Lungenfunktions-Messung",       desc: "Lungenfunktion, allgemein"},
            "LUFU01": {group: "Lungenfunktions-Messung",       desc: "Langsame Spirometrie"},
            "LUFU02": {group: "Lungenfunktions-Messung",       desc: "Forcierte Spirometrie (Fluss-Volumen)"},
            "LUFU03": {group: "Lungenfunktions-Messung",       desc: "MVV (Maximal Voluntary Ventilation)"},
            "LUFU04": {group: "Lungenfunktions-Messung",       desc: "Bodyplethysmographie"},
            "LUFU05": {group: "Lungenfunktions-Messung",       desc: "FRC pl (Lungenvolumen – Bodyplethysmograpie)"},
            "LUFU06": {group: "Lungenfunktions-Messung",       desc: "FRC He (Lungenvolumen – Helium Rückatmung)"},
            "LUFU07": {group: "Lungenfunktions-Messung",       desc: "Resistance nach Verschlussdruckmethode"},
            "LUFU08": {group: "Lungenfunktions-Messung",       desc: "Resistance nach Impulsoscillation-Methode"},
            "LUFU09": {group: "Lungenfunktions-Messung",       desc: "Resistance nach Oszilloresistometrie-Methode"},
            "LUFU10": {group: "Lungenfunktions-Messung",       desc: "Compliance"},
            "LUFU11": {group: "Lungenfunktions-Messung",       desc: "Atemmuskulaturstärke-Messung"},
            "LUFU12": {group: "Lungenfunktions-Messung",       desc: "Atemantrieb-Messung"},
            "LUFU13": {group: "Lungenfunktions-Messung",       desc: "Diffusion Single-Breath"},
            "LUFU14": {group: "Lungenfunktions-Messung",       desc: "Diffusion Steady-State"},
            "LUFU15": {group: "Lungenfunktions-Messung",       desc: "Diffusion Rebreathing"},
            "LUFU16": {group: "Lungenfunktions-Messung",       desc: "Diffusion Membranfaktor"},
            "LUFU17": {group: "Lungenfunktions-Messung",       desc: "Capnographie"},
            "LUFU18": {group: "Lungenfunktions-Messung",       desc: "Rhinomanometrie"},
            "LUFU19": {group: "Lungenfunktions-Messung",       desc: "Ruheatemanalyse"},
            "NEUR00": {group: "Neurologische Messung",         desc: "Neurologie, allgemein"},
            "NEUR01": {group: "Neurologische Messung",         desc: "Langzeit-EEG"},
            "NEUR02": {group: "Neurologische Messung",         desc: "EEG mit simultaner EKG-Aufzeichnung"},
            "NEUR03": {group: "Neurologische Messung",         desc: "Motorisches NLG"},
            "NEUR04": {group: "Neurologische Messung",         desc: "Sensorisches NLG"},
            "NEUR05": {group: "Neurologische Messung",         desc: "Evozierte Potentiale"},
            "NEUR06": {group: "Neurologische Messung",         desc: "Rotationstest"},
            "NEUR07": {group: "Neurologische Messung",         desc: "Nystagmusanalyse"},
            "NEUR08": {group: "Neurologische Messung",         desc: "Sakkadentest"},
            "NEUR09": {group: "Neurologische Messung",         desc: "Posture"},
            "NEUR10": {group: "Neurologische Messung",         desc: "Biofeedback"},
            "OPTO00": {group: "Augenheilkunde",                desc: "Augenheilkunde, allgemein"},
            "OPTO01": {group: "Augenheilkunde",                desc: "Refraktionsbestimmung, objektiv"},
            "OPTO02": {group: "Augenheilkunde",                desc: "Refraktionsbestimmung, subjektiv"},
            "OPTO03": {group: "Augenheilkunde",                desc: "Refraktionswerte Brille/Kontaktlinse"},
            "OPTO04": {group: "Augenheilkunde",                desc: "Blendenempfindlichkeitsmessung (Visus)"},
            "OPTO05": {group: "Augenheilkunde",                desc: "Gesichtsfeldmessung"},
            "OPTO06": {group: "Augenheilkunde",                desc: "Augendruckmessung"},
            "OPTO07": {group: "Augenheilkunde",                desc: "Hornhautmessung (Krümmungsradien/Achslagen)"},
            "OPTO08": {group: "Augenheilkunde",                desc: "Hornhautmessung (3D-Geometriedaten)"},
            "OPTO09": {group: "Augenheilkunde",                desc: "Fundusbilder"},
            "OPTO10": {group: "Augenheilkunde",                desc: "Angiographiebilder"},
            "OPTO11": {group: "Augenheilkunde",                desc: "Spaltlampenbilder"},
            "OPTO12": {group: "Augenheilkunde",                desc: "Topograpiebilder"},
            "OPTO13": {group: "Augenheilkunde",                desc: "Schichtbilder"},
            "OPTO14": {group: "Augenheilkunde",                desc: "Generische Bilddaten"},
            "PROV00": {group: "Provokations-Test",             desc: "Provokation, allgemein"},
            "PROV01": {group: "Provokations-Test",             desc: "Spezifische Aerosol-Provokation"},
            "PROV02": {group: "Provokations-Test",             desc: "Unspezifische Aerosol-Provokation"},
            "PROV03": {group: "Provokations-Test",             desc: "Kaltluft Provokation"},
            "PROV04": {group: "Provokations-Test",             desc: "Bronchodilatation"},
            "SONO00": {group: "Sonographie-Messungen",         desc: "Sonographie, allgemein"},
            "SONO01": {group: "Sonographie-Messungen",         desc: "Ultraschall-Doppler"},
            "URO00" : {group: "Urologie",                      desc: "Urologie, allgemein"},
            "URO01" : {group: "Urologie",                      desc: "Uroflowmetrie"},
            "XXXX00": {group: "error", desc: "invalid type"}
        };
        gdt21.stringMappers = {
            gender: function(prop, propInfo) {
                if (1 === prop) {return [propInfo.desc, "männlich"];}
                else if (2 === prop) {return [propInfo.desc, "weiblich"];}
                else {return [propInfo.desc, "ungültig ("+prop+")"];}
            },
            cm: function(prop, propInfo) {
                return [propInfo.desc, prop+"cm"];
            },
            kg: function(prop, propInfo) {
                return [propInfo.desc, prop+"kg"];
            },
            byte: function(prop, propInfo) {
                return [propInfo.desc, prop+" byte"];
            },
            date: function(prop, propInfo) {
                return [propInfo.desc, moment(prop).format("YYYY-MM-DD")];
            },
            time: function(prop, propInfo) {
                return [propInfo.desc, moment(prop).format("HH:mm:ss")];
            },
            dateTime: function(prop, propInfo) {
                return [propInfo.desc, moment(prop).format("YYYY-MM-DD HH:mm:ss")];
            },
            satzID: function(prop, propInfo) {
                return [propInfo.desc, gdt21.saetze[prop].desc];
            },
            procedure: function(prop, propInfo) {
                var proc = gdt21.procedures[prop];
                return [propInfo.desc, proc?"["+prop+"] "+proc.group+": "+proc.desc:prop];
            }
        };

        Y.namespace( 'doccirrus.api.xdtVersions.gdt' ).gdt21 = gdt21;
    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
