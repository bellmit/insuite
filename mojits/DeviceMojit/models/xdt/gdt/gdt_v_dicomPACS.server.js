/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */



YUI.add( 'gdt_v_dicomPACS', function( Y ) {

        //gdt templates to use

        var moment = require('moment');

        let gdt_dicomPACS = {};
        gdt_dicomPACS.type = "gdt";
        gdt_dicomPACS.name = "gdt21";
        gdt_dicomPACS.version = "00.00";
        gdt_dicomPACS.versionField = "0000";
        gdt_dicomPACS.acceptedVersions = ["00.00"];

        gdt_dicomPACS.dateFormat = "DDMMYYYY";
        gdt_dicomPACS.shortDateFormat = "MMYY";
        gdt_dicomPACS.timeFormat = "HHmmss";

        gdt_dicomPACS.encodings = ["ASCII (german)", "Code page 437", "ISO 8859-1"];

        gdt_dicomPACS.sizeCounter = 1; //1 byte for the counter
        gdt_dicomPACS.sizeLabel = 3; //3 bytes for the Label: B00/B01/B02
        gdt_dicomPACS.sizeDataField = 128; //128 bytes for field content
        gdt_dicomPACS.sizeCrc16 = 4;
        gdt_dicomPACS.sizeLen = 3;
        gdt_dicomPACS.sizeRecLen = 5;
        gdt_dicomPACS.sizefileLen = 0;
        gdt_dicomPACS.sizeSatz = 4;
        gdt_dicomPACS.sizeFk = 4;

        gdt_dicomPACS.serialCr = "[CR]"; //0x0D
        gdt_dicomPACS.serialNewLineReplacement = "[FS]"; //0x1C

        gdt_dicomPACS.recordType = "8000";
        gdt_dicomPACS.recordSize = "8100";
        gdt_dicomPACS.objType = "";
        gdt_dicomPACS.objEntries = "";
        gdt_dicomPACS.recordEntries = "";

        gdt_dicomPACS.saetze = {
            "6310": {
                desc: "Daten einer Untersuchung übermitteln", attribute: "studyData", fk: {
                    "8000":     {amount: "1", optional: false},
                    "3600":     {amount: "1", optional: true},
                    "3300":     {amount: "1", optional: true},
                    "3301":     {amount: "1", optional: false},
                    "3302":     {amount: "1", optional: false},
                    "3303":     {amount: "1", optional: false},
                    "3304":     {amount: "1", optional: true},
                    "3110":     {amount: "1", optional: true},
                    "6200":     {amount: "1", optional: true},
                    "6201":     {amount: "1", optional: true},
                    "9800":     {amount: "1", optional: true},
                    "7000":     {amount: "1", optional: true},
                    "6230":     {amount: "1", optional: true},
                    "6220":     {amount: "1", optional: true},
                    "8100":     {amount: "1", optional: false}
                }
            }
        };
        gdt_dicomPACS.fields = {
            "3110": {  desc: "Geschlecht des Patienten",                  attribute: "3110",      type: "number", len: "1", mapper: "gender"  },
            "3300": {  desc: "Namenszusatz / Vorsatzwort des Patienten",  attribute: "3300",      type: "string"  },
            "3301": {  desc: "Name des Patienten",                        attribute: "3301",      type: "string"  },
            "3302": {  desc: "Vorname des Patienten",                     attribute: "3302",      type: "string"  },
            "3303": {  desc: "Geburtsdatum des Patienten",                attribute: "3303",      type: "date",   len: "8", mapper: "date"  },
            "3304": {  desc: "Titel des Patienten",                       attribute: "3304",      type: "string"  },
            "3600": {  desc: "Patientennummer / Patientenkennung",        attribute: "3600",      type: "string"  },
            "6200": {  desc: "Tag der Speicherung von Behandlungsdaten",  attribute: "6200.date", type: "date",   len: "8", mapper: "dateTime"  },
            "6201": {  desc: "Uhrzeit der Erhebung von Behandlungsdaten", attribute: "6200.time", type: "time",   len: "6", mapper: "dateTime"  },
            "6220": {  desc: "Auftrag",                                   attribute: "6220",      type: "string"  },
            "6230": {  desc: "Station",                                   attribute: "6230",      type: "string"  },
            "7000": {  desc: "Dicom-Pfad",                                attribute: "7000",      type: "string"  },
            "8000": {  desc: "Satzidentifikation",                        attribute: "8000",      type: "string"  },
            "8100": {  desc: "Satzlänge",                                 attribute: "8100",      type: "number", len: "5", mapper: "byte"  },
            "9800": {  desc: "Untersuchungsart",                          attribute: "9800",      type: "string"  },

            "0000": {  desc: "invalid field", attribute: "invalid", type: "string"  }
        };
        gdt_dicomPACS.stringMappers = {
            gender: function(prop, propInfo) {
                if (1 === prop) {return [propInfo.desc, "männlich"];}
                else if (2 === prop) {return [propInfo.desc, "weiblich"];}
                else {return [propInfo.desc, "ungültig ("+prop+")"];}
            },
            byte: function(prop, propInfo) {
                return [propInfo.desc, prop+" byte"];
            },
            date: function(prop, propInfo) {
                return [propInfo.desc, moment(prop).format("YYYY-MM-DD")];
            },
            time: function(prop, propInfo) {
                return [propInfo.desc, moment(prop).format("HH:mm:ss")];
            }
        };

        Y.namespace( 'doccirrus.api.xdtVersions.gdt' ).gdt_dicomPACS = gdt_dicomPACS;

    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
