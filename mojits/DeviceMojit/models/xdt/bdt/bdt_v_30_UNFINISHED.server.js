/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*

TODO: This file is largely unfinished and contains mostly a copy of bdt10 with a few BDT2 and 3 extensions.
Full evaluation/comparison with BDT2 and 3 spec necessary before release.


 */

/*global YUI */



YUI.add( 'bdt_v_30', function( Y, NAME ) {

        dbg("loading bdt stuff");

        //bdt templates to use
        
        var moment = require('moment');

        let bdt30 = {};
        bdt30.type = "bdt";
        bdt30.name = "bdt30";
        bdt30.version = "02/94";
        bdt30.versionField = "0001";
        bdt30.acceptedVersions = ["BDT 2.94", "BDT 2.0", "BDT 3.0"];

        bdt30.dateFormat = "DDMMYYYY";
        bdt30.shortDateFormat = "MMYY";
        bdt30.timeFormat = "HHmm";
        bdt30.longTimeFormat = "HHmmssSS";
        bdt30.dateTimeFormat = "DDMMYYYYHHmm";

        bdt30.encodings = ["ISO 8859-15"];
        bdt30.encodingField = "9106";

        bdt30.sizeCounter = 1; //1 byte for the counter
        bdt30.sizeLabel = 3; //3 bytes for the Label: B00/B01/B02
        bdt30.sizeDataField = 128; //128 bytes for field content
        bdt30.sizeCrc16 = 4;
        bdt30.sizeLen = 3;
        bdt30.sizeSatz = 4;
        bdt30.sizeFk = 4;

        bdt30.serialCr = "[CR]"; //0x0D
        bdt30.serialNewLineReplacement = "[FS]"; //0x1C

        bdt30.recordType = "8000";
        bdt30.recordSize = "8100";
        bdt30.objType = "";
        bdt30.objEntries = "";
        bdt30.recordEntries = "";

        bdt30.saetze = {
            "0001": {
                desc: "Kommunikations-Header", attribute: "comHeader", fk: {
                    "8000":             {amount: "1", optional: false},
                    "Obj_Kopfdaten":    {amount: "1", optional: false},
                    "9604":             {amount: "1", optional: true},
                    "8202":             {amount: "1", optional: false}
                }
            },
            "0020": {
                desc: "Datei-Header", attribute: "dataHeader", fk: {
                    "8000":         {amount: "1", optional: false},
                    "9806":         {amount: "n", optional: false},
                    "0010":         {amount: "1", optional: false},
                    "0011":         {amount: "1", optional: true},
                    "0012":         {amount: "1", optional: true},
                    "9603":         {amount: "1", optional: false},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "spec": {
                desc: "Referenzierte Datensatzbeschreibungen", attribute: "spec", fk: {
                    "8000":         {amount: "1", optional: false},
                    "9900":         {amount: "n", optional: false, children: {
                        "9999":     {amount: "1", optional: true},
                        "9910":     {amount: "1", optional: true},
                        "9902":     {amount: "1", optional: true},
                        "9903":     {amount: "1", optional: false},
                        "9904":     {amount: "1", optional: false},
                        "9905":     {amount: "1", optional: true}}},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "iden": {
                desc: "Vergabe BDT-interner Identifikatoren", attribute: "iden", fk: {
                    "8000":                         {amount: "1", optional: false},
                    "9806":                         {amount: "n", optional: false, children: {
                        "Obj_Betriebsstätte":       {amount: "1", optional: false}}},
                    "9801":                         {amount: "n", optional: false, children: {
                        "Obj_Arztidentifikation":   {amount: "1", optional: false}}},
                    "9802":                         {amount: "n", optional: false, children: {
                        "9803":                     {amount: "1", optional: false}}},
                    "8202":                         {amount: "1", optional: false}
                }
            },
            "frei": {
                desc: "Freie Kategorien", attribute: "frei", fk: {
                    "8000":      {amount: "1", optional: false},
                    "8010":      {amount: "n", optional: false, children: {
                        "8011":  {amount: "1", optional: false},
                        "8012":  {amount: "1", optional: false},
                        "8013":  {amount: "1", optional: false}}},
                    "8202":      {amount: "1", optional: false}
                }
            },
            "0010": {
                desc: "Praxisstammdaten", attribute: "practiceData", fk: {
                    "8000":         {amount: "1", optional: false},
                    "9806":         {amount: "n", optional: false, children: {
                        "9801":     {amount: "n", optional: false, chidlren: {
                            "0024": {amount: "n", optional: true}}},
                        "0218":     {amount: "1", optional: true},
                        "1297":     {amount: "1", optional: true, children: {
                            "9999": {amount: "1", optional: true}}},
                        "1298":     {amount: "1", optional: true, children: {
                            "9999": {amount: "1", optional: true}}},
                        "1299":     {amount: "1", optional: true, children: {
                            "9999": {amount: "1", optional: true}}}}},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "adrs": {
                desc: "Adressen", attribute: "adrs", fk: {
                    "8000":         {amount: "1", optional: false},
                    "1200":         {amount: "1", optional: true},
                    "9810":         {amount: "1", optional: true},
                    "1201":         {amount: "1", optional: true},
                    "1202":         {amount: "1", optional: true},
                    "9801":         {amount: "n", optional: true},
                    "1210":         {amount: "1", optional: true, children: {
                        "1211":     {amount: "1", optional: true}}},
                    "0307":         {amount: "1", optional: true, children: {
                        "0308":     {amount: "1", optional: true}}},
                    "0309":         {amount: "1", optional: true},
                    "0200":         {amount: "1", optional: true},
                    "1214":         {amount: "n", optional: true},
                    "1215":         {amount: "1", optional: true},
                    "1216":         {amount: "n", optional: true},
                    "1217":         {amount: "n", optional: true},
                    "1218":         {amount: "n", optional: true},
                    "1219":         {amount: "n", optional: true},
                    "1220":         {amount: "n", optional: true},
                    "1225":         {amount: "1", optional: true},
                    "1226":         {amount: "1", optional: true},
                    "1250":         {amount: "1", optional: false, children: {
                        "1251":     {amount: "1", optional: true},
                        "1252":     {amount: "1", optional: true},
                        "1260":     {amount: "1", optional: true},
                        "1265":     {amount: "n", optional: true}}},
                    "1270":         {amount: "1", optional: true},
                    "1271":         {amount: "1", optional: true, children: {
                        "1272":     {amount: "1", optional: true}}},
                    "1273":         {amount: "1", optional: true},
                    "1275":         {amount: "1", optional: true},
                    "1276":         {amount: "1", optional: true},
                    "1277":         {amount: "1", optional: true},
                    "1290":         {amount: "1", optional: true, children: {
                        "1291":     {amount: "1", optional: true},
                        "1297":     {amount: "n", optional: true, children: {
                            "9999": {amount: "1", optional: true}}},
                        "1298":     {amount: "n", optional: true, children: {
                            "9999": {amount: "1", optional: true}}},
                        "1299":     {amount: "n", optional: true, children: {
                            "9999": {amount: "1", optional: true}}}}},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "term": {
                desc: "Termine", attribute: "term", fk: {
                    "8000":         {amount: "1", optional: false},
                    "1300":         {amount: "1", optional: true},
                    "1301":         {amount: "1", optional: false, children: {
                        "1302":     {amount: "1", optional: true}}},
                    "1303":         {amount: "n", optional: true, children: {
                        "9801":     {amount: "1", optional: true},
                        "9803":     {amount: "1", optional: true},
                        "1304":     {amount: "1", optional: true}}},
                    "1305":         {amount: "n", optional: true, children: {
                        "3000":     {amount: "1", optional: true},
                        "1320":     {amount: "1", optional: true}}},
                    "1325":         {amount: "1", optional: true},
                    "1310":         {amount: "1", optional: false},
                    "1311":         {amount: "1", optional: true},
                    "1312":         {amount: "1", optional: true},
                    "1330":         {amount: "1", optional: true, children: {
                        "1331":     {amount: "1", optional: true}}},
                    "9801":         {amount: "n", optional: true},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "diag": {
                desc: "Diagnosenkürzel", attribute: "diag", fk: {
                    "8000":         {amount: "1", optional: false},
                    "1400":         {amount: "1", optional: false, children: {
                        "Obj_Diagnose": {amount: "n", optional: false}}},
                    "1900":         {amount: "1", optional: true},
                    "9801":         {amount: "n", optional: true},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "grnk": {
                desc: "Ziffernketten für Leistungen", attribute: "grnk", fk: {
                    "8000":                 {amount: "1", optional: false},
                    "1500":                 {amount: "1", optional: false, children: {
                        "1502":             {amount: "n", optional: false, children: {
                            "5001":         {amount: "n", optional: false, children: {
                                "1503":     {amount: "n", optional: true, children: {
                                    "1504": {amount: "1", optional: false}}},
                                "1550":     {amount: "1", optional: true},
                                "1560":     {amount: "1", optional: true}}}}}}},
                    "1900":                 {amount: "1", optional: true},
                    "9801":                 {amount: "n", optional: true},
                    "8202":                 {amount: "1", optional: false}
                }
            },
            "hapo": {
                desc: "Verordnungskürzel", attribute: "hapo", fk: {
                    "8000":         {amount: "1", optional: false},
                    "1600":         {amount: "1", optional: false, children: {
                        "1601":     {amount: "1", optional: true},
                        "1900":     {amount: "1", optional: true},
                        "6206":     {amount: "n", optional: false, children: {
                            "6208": {amount: "1", optional: true},
                            "6213": {amount: "n", optional: true}}},
                        "0925":     {amount: "n", optional: false, children: {
                            "0926": {amount: "1", optional: true},
                            "6213": {amount: "n", optional: false}}},
                        "0919":     {amount: "n", optional: false, children: {
                            "0920": {amount: "1", optional: true},
                            "6213": {amount: "n", optional: false}}},
                        "6207":     {amount: "n", optional: false, children: {
                            "6213": {amount: "n", optional: false}}}}},
                    "9801":         {amount: "n", optional: true},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "bbst": {
                desc: "Behandlungsbausteine", attribute: "bbst", fk: {
                    "8000":         {amount: "1", optional: false},
                    "1700":         {amount: "1", optional: false},
                    "1701":         {amount: "1", optional: true},
                    "1702":         {amount: "n", optional: false, children: {
                        "1703":     {amount: "1", optional: false}}},
                    "1900":         {amount: "1", optional: true},
                    "9801":         {amount: "n", optional: true},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "text": {
                desc: "Textbausteine", attribute: "text", fk: {
                    "8000":         {amount: "1", optional: false},
                    "1800":         {amount: "1", optional: false, children: {
                        "1801":     {amount: "1", optional: true},
                        "1802":     {amount: "1", optional: false}}},
                    "1900":         {amount: "1", optional: true},
                    "9801":         {amount: "n", optional: true},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "6100": {
                desc: "Administrative und medizinische Patientenstammblattdaten", attribute: "patientDataAdminMed", fk: {
                    "8000":                     {amount: "1", optional: false},
                    "Obj_Patient":              {amount: "1", optional: false},
                    "3631":                     {amount: "1", optional: true},
                    "9801":                     {amount: "n", optional: false, children: {
                        "3610":                 {amount: "1", optional: true}}},
                    "3630":                     {amount: "1", optional: true},
                    "0309":                     {amount: "1", optional: true},
                    "3629":                     {amount: "1", optional: true},
                    "3632":                     {amount: "n", optional: true, children: {
                        "3633":                 {amount: "1", optional: true},
                        "Obj_Standardadresse":  {amount: "1", optional: true},
                        "Obj_Adressangaben":    {amount: "1", optional: true}}},
                    "3528":                     {amount: "1", optional: true, children: {
                        "3529":                 {amount: "1", optional: true},
                        "Obj_Standardadresse":  {amount: "1", optional: true},
                        "Obj_Adressangaben":    {amount: "1", optional: true}}},
                    "Obj_Krankenversicherung":  {amount: "n", optional: true},
                    "Obj_Versicherter":         {amount: "1", optional: true},
                    "3130":                     {amount: "1", optional: true, children: {
                        "0212":                 {amount: "1", optional: true},
                        "3131":                 {amount: "1", optional: true},
                        "3132":                 {amount: "1", optional: true},
                        "3133":                 {amount: "1", optional: true},
                        "3134":                 {amount: "1", optional: true}}},
                    "3620":                     {amount: "1", optional: true},
                    "3625":                     {amount: "1", optional: true},
                    "Obj_Standardadresse":      {amount: "1", optional: true},
                    "Obj_Adressangaben":        {amount: "1", optional: true},
                    "3672":                     {amount: "n", optional: true},
                    "3601":                     {amount: "n", optional: true},
                    "3602":                     {amount: "n", optional: true, children: {
                        "3600":                 {amount: "1", optional: true}}},
                    "Obj_Patientenverfügung":   {amount: "1", optional: true},
                    "Obj_Vorsorgevollmacht":    {amount: "1", optional: true},
                    "Obj_Vermerke":             {amount: "1", optional: true},
                    "3310":                     {amount: "n", optional: true, children: {
                        "4102":                 {amount: "1", optional: true},
                        "3311":                 {amount: "1", optional: true},
                        "7002":                 {amount: "1", optional: true},
                        "4103":                 {amount: "1", optional: true}}},
                    "8202":                     {amount: "1", optional: false}
                }
            },
            "6200": {
                desc: "Behandlungsdaten", attribute: "treatmentData", fk: {
                    "8000":                                                     {amount: "1", optional: false},
                    "3000":                                                     {amount: "1", optional: false},
                    "6200":                                                     {amount: "n", optional: false, children: {
                        "0080":                                                 {amount: "n", optional: true, children: {
                            "0081":                                             {amount: "1", optional: true},
                            "6011":                                             {amount: "1", optional: true, children: {
                                "9999":                                         {amount: "1", optional: true}}}}},
                        "9801":                                                 {amount: "1", optional: true},
                        "9802":                                                 {amount: "1", optional: true},
                        "6201":                                                 {amount: "1", optional: true},
                        "3622":                                                 {amount: "1", optional: true, children: {
                            "8421":                                             {amount: "1", optional: true},
                            "8448":                                             {amount: "1", optional: true}}},
                        "3623":                                                 {amount: "1", optional: true, children: {
                            "8421":                                             {amount: "1", optional: true},
                            "8448":                                             {amount: "1", optional: true}}},
                        "6230":                                                 {amount: "1", optional: true, children: {
                            "8421":                                             {amount: "1", optional: true},
                            "8448":                                             {amount: "1", optional: true}}},
                        "Obj_Diagnose":                                         {amount: "1", optional: true},
                        "0925":                                                 {amount: "n", optional: true, children: {
                            "0926":                                             {amount: "1", optional: true}}},
                        "0919":                                                 {amount: "n", optional: true, children: {
                            "0920":                                             {amount: "1", optional: true},
                            "0921":                                             {amount: "1", optional: true}}},
                        "3637":                                                 {amount: "n", optional: true, children: {
                            "3639":                                             {amount: "1", optional: true}}},
                        "Obj_Medikationsplan":                                  {amount: "1", optional: true},
                        "Obj_Medizinische_Dokumentation":                       {amount: "1", optional: true},
                        "Obj_Ueberweisung":                                     {amount: "n", optional: true},
                        "Obj_Einweisung":                                       {amount: "1", optional: true},
                        "Obj_AU":                                               {amount: "1", optional: true},
                        "6325":                                                 {amount: "n", optional: true, children: {
                            "9981":                                             {amount: "1", optional: true},
                            "2801":                                             {amount: "1", optional: true},
                            "2802":                                             {amount: "1", optional: true},
                            "9971":                                             {amount: "1", optional: true}}},
                        "Obj_Anhang":                                           {amount: "n", optional: true, children: {
                            "1296":                                             {amount: "1", optional: true},
                            "6310":                                             {amount: "1", optional: true},
                            "6320":                                             {amount: "1", optional: true},
                            "8401":                                             {amount: "1", optional: true},
                            "Obj_Anhang":                                       {amount: "n", optional: true}}},
                        "2803":                                                 {amount: "n", optional: true, children: {
                            "1296":                                             {amount: "1", optional: true},
                            "6310":                                             {amount: "1", optional: true},
                            "1290":                                             {amount: "1", optional: true},
                            "8401":                                             {amount: "1", optional: true},
                            "3001":                                             {amount: "1", optional: true},
                            "9801":                                             {amount: "1", optional: true},
                            "0051":                                             {amount: "1", optional: true}}}}},
                    "Obj_Laborergebnisbericht":                                 {amount: "n", optional: true, children: {
                        "Obj_Untersuchungsergebnis_Klinische_Chemie":           {amount: "n", optional: true},
                        "Obj_Untersuchungeergebnis_Mikrobiologie":              {amount: "n", optional: true},
                        "Obj_Untersuchungsergebnis_Zytologie_Krebsvorsorge":    {amount: "n", optional: true},
                        "Obj_Untersuchungsergebnis Zytologie":                  {amount: "n", optional: true}}},
                    "Obj_Basisdiagnostik":                                      {amount: "1", optional: true},
                    "Obj_Allergien":                                            {amount: "1", optional: true},
                    "Obj_Blutgruppenzugehörigkeit":                             {amount: "1", optional: true},
                    "Obj_Diabetes":                                             {amount: "1", optional: true},
                    "Obj_Epilepsie":                                            {amount: "1", optional: true},
                    "Obj_Implantat":                                            {amount: "n", optional: true},
                    "Obj_Mutterschaft":                                         {amount: "1", optional: true},
                    "Obj_Organspenden":                                         {amount: "1", optional: true},
                    "Obj_Röntgenpass":                                          {amount: "1", optional: true},
                    "Obj_Strahlenpass":                                         {amount: "1", optional: true},
                    "Obj_Impfungen":                                            {amount: "1", optional: true},
                    "8202":                                                     {amount: "1", optional: false}
                }
            },
            "X001": {
                desc: "Abrechnungsnotizen und offene Aufträge", attribute: "billS_orders", fk: {
                    "8000":             {amount: "1", optional: false},
                    "2029":             {amount: "1", optional: false},
                    "2030":             {amount: "1", optional: false},
                    "9801":             {amount: "1", optional: false},
                    "3000":             {amount: "1", optional: false},
                    "Obj_Anhang":       {amount: "1", optional: true},
                    "0051":             {amount: "1", optional: true},
                    "0052":             {amount: "1", optional: true},
                    "0053":             {amount: "1", optional: true},
                    "2099":             {amount: "1", optional: true},
                    "Obj_RgEmpfänger":  {amount: "1", optional: true},
                    "8202":             {amount: "1", optional: false}
                }
            },
            "0021": {
                desc: "Praxisstammdaten", attribute: "practiceData", fk: {
                    "8000":         {amount: "1", optional: false},
                    "8202":         {amount: "1", optional: false}
                }
            },
            "0002": {
                desc: "Praxisstammdaten", attribute: "practiceData", fk: {
                    "8000":         {amount: "1", optional: false},
                    "8202":         {amount: "1", optional: false}
                }
            }
        };
        bdt30.objects = {};
        bdt30.fields = {
            "0001": {  desc: "Version XDT",                                                                                   attribute: "xdtVersion",                     type: "string"  },
            "0002": {  desc: "Releasenummer XDT",                                                                             attribute: "xdtRelease",                     type: "string"  },
            "0003": {  desc: "Profil XDT",                                                                                    attribute: "xdtProfile",                     type: "string"  },
            "0010": {  desc: "Anwendungsfall [„Use Case“] BDT",                                                               attribute: "bdtUseCase",                     type: "number", len: 2  },
            "0011": {  desc: "Kommentar zum Anwendungsfall",                                                                  attribute: "bcdtComment",                    type: "string"  },
            "0012": {  desc: "Vertraulichkeit",                                                                               attribute: "bdtConfidentiality",             type: "string"  },
            "0051": {  desc: "Bearbeitungsstatus",                                                                            attribute: "bdtProgressStatus",              type: "number", len: 1  },
            "0052": {  desc: "Abrechnungsstatus",                                                                             attribute: "bdtBillingStatus",               type: "date"  },
            "0053": {  desc: "Bezahlstatus",                                                                                  attribute: "bdtPaymentStatus",               type: "number", len: 1  },
            "0054": {  desc: "Status der medizinischen Dokumentation",                                                        attribute: "bdtMedDocuStatus",               type: "string"  },
            "0055": {  desc: "Typ der medizinischen Dokumentation",                                                           attribute: "bdtMedDocuStatusType",           type: "string"  },
            "0057": {  desc: "Informationstyp der med. Dokumentation",                                                        attribute: "bdtMedDocuStatusInfoType",       type: "string"  },
            "0058": {  desc: "Datum der Dokumentation",                                                                       attribute: "bdtDateOfDocu",                  type: "date"  },
            "0078": {  desc: "Name einer Datei, die als Antwort erwartet wird",                                               attribute: "bdtExpectedResponseFileName",    type: "string"  },
            "0079": {  desc: "Ausführbare Datei",                                                                             attribute: "bdtExecuteFileAfterReceipt",     type: "string"  },
            "0080": {  desc: "ID der Fallakte oder Studie",                                                                   attribute: "bdtCaseStudyId",                 type: "string"  },
            "0081": {  desc: "Bezeichnung der Fallakte oder Studie",                                                          attribute: "bdtCaseStudyName",               type: "string"  },
            "0102": {  desc: "Softwareverantwortlicher (SV)",                                                                 attribute: "sv",                             type: "string"  },
            "0103": {  desc: "Software",                                                                                      attribute: "sw",                             type: "string"  },
            "0104": {  desc: "Hardware",                                                                                      attribute: "hw",                             type: "string"  },
            "0105": {  desc: "KBV-Prüfnummer",                                                                                attribute: "kbvValidationNo",                type: "string"  },
            "0111": {  desc: "Email-Adresse des SV",                                                                          attribute: "svEMail",                        type: "string"  },
            "0121": {  desc: "Straße des SV",                                                                                 attribute: "svStreet",                       type: "string"  },
            "0122": {  desc: "PLZ des SV",                                                                                    attribute: "svZip",                          type: "string"  },
            "0123": {  desc: "Ort des SV",                                                                                    attribute: "svCity",                         type: "string"  },
            "0124": {  desc: "Telefonnummer des SV",                                                                          attribute: "svPhone",                        type: "string"  },
            "0125": {  desc: "Telefaxnummer des SV",                                                                          attribute: "svFax",                          type: "string"  },
            "0132": {  desc: "Versions- und ReleaseStand der Software",                                                       attribute: "swVersion",                      type: "string"  },
            "0200": {  desc: "Betriebsstätten-ID",                                                                            attribute: "practiceID",                     type: "string"  },
            "0201": {  desc: "(N)-BSNR",                                                                                      attribute: "practiceNBSNR",                  type: "number", len: 9  },
            "0203": {  desc: "Betriebsstätten-Bezeichnung",                                                                   attribute: "practiceName",                   type: "string"  },
            "0204": {  desc: "Status der Betriebstätte",                                                                      attribute: "practiceStatus",                 type: "number", len: 1  },
            "0205": {  desc: "Straße",                                                                                        attribute: "practiceStreet",                 type: "string"  },
            "0208": {  desc: "Telefonnummer",                                                                                 attribute: "practicePhone",                  type: "string"  },
            "0209": {  desc: "Telefaxnummer",                                                                                 attribute: "practiceFax",                    type: "string"  },
            "0210": {  desc: "Modemnummer",                                                                                   attribute: "practiceModem",                  type: "string"  },
            "0211": {  desc: "Arztname",                                                                                      attribute: "docName",                        type: "string"  },
            "0212": {  desc: "LANR",                                                                                          attribute: "docLanr",                        type: "string", len: 9  },
            "0213": {  desc: "Institutionskennzeichen (IK) (der Betriebsstätte)",                                             attribute: "practiceIk",                     type: "string", len: 9  },
            "0215": {  desc: "PLZ der (N)BSNRAdresse",                                                                        attribute: "practiceZip",                    type: "string"  },
            "0216": {  desc: "Ort der (N)BSNRAdresse",                                                                        attribute: "practiceCity",                   type: "string"  },
            "0218": {  desc: "E-Mail der (N)BSNR / Praxis",                                                                   attribute: "practiceEMail",                  type: "string"  },
            "0219": {  desc: "Titel des Arztes",                                                                              attribute: "docTitle",                       type: "string"  },
            "0220": {  desc: "Arztvorname (n)",                                                                               attribute: "docForename",                    type: "string"  },
            "0221": {  desc: "Namenszusatz des Arztes",                                                                       attribute: "docNameadd",                     type: "string"  },
            "0222": {  desc: "ASV Teamnummer",                                                                                attribute: "docAsvTeamNo",                   type: "string"  },
            "0224": {  desc: "Ort der Zulassung oder Ermächtigung",                                                           attribute: "practiceAuthorizedDoc",          type: "number", len: 1  },
            "0306": {  desc: "Vertrags_ID des behandelnden Arztes",                                                           attribute: "docContractId",                  type: "string"  },
            "0307": {  desc: "Arzt-ID eines Arztes",                                                                          attribute: "docId",                          type: "string"  },
            "0308": {  desc: "Typ der Arzt-ID (FK 0307)",                                                                     attribute: "docIdType",                      type: "number", len: 1  },
            "0309": {  desc: "Arztname und Ort",                                                                              attribute: "docNameCity",                    type: "string"  },
            "0423": {  desc: "E-Mail-Adresse des Arztes",                                                                     attribute: "docEMail",                       type: "string"  },
            "0600": {  desc: "Name der Einrichtung",                                                                          attribute: "docPracticeName",                type: "string"  },
            "0919": {  desc: "Hilfsmittelbezeichnung",                                                                        attribute: "facilityName",                   type: "string"  },
            "0920": {  desc: "Hilfsmittelnummer",                                                                             attribute: "facilityNo",                     type: "string", len: 10  },
            "0921": {  desc: "Anzahl Hilfsmittel",                                                                            attribute: "facilityAmount",                 type: "string"  },
            "0925": {  desc: "Heilmittel",                                                                                    attribute: "medName",                        type: "string", len: 5  },
            "0926": {  desc: "Anzahl Heilmittel",                                                                             attribute: "medAmount",                      type: "string"  },
            "1200": {  desc: "Adresskürzel",                                                                                  attribute: "addrShort",                      type: "string"  },
            "1201": {  desc: "Adresskategorie",                                                                               attribute: "addrCategory",                   type: "string"  },
            "1202": {  desc: "Adresstyp",                                                                                     attribute: "addrType",                       type: "string", len: 1  },
            "1210": {  desc: "Name der Person",                                                                               attribute: "addrIndivName",                  type: "string"  },
            "1211": {  desc: "Typ des Namens",                                                                                attribute: "addrIndivNameType",              type: "string"  },
            "1214": {  desc: "Label zum Namen",                                                                               attribute: "addrIndivNameLabel",             type: "string"  },
            "1215": {  desc: "Titel (als Namensbestandteil)",                                                                 attribute: "addrIndivNameTitle",             type: "string"  },
            "1216": {  desc: "Rufname / Vorname",                                                                             attribute: "addrIndivNameForename",          type: "string"  },
            "1217": {  desc: "Namenszusatz / Vorsatzwort / Adelsprädikat / sonstiger Titel",                                  attribute: "addrIndivNameAddPräfix",         type: "string"  },
            "1218": {  desc: "Namenszusatz / Nachwort",                                                                       attribute: "addrIndivNameAddSuffix",         type: "string"  },
            "1219": {  desc: "Beruf / Fachrichtung",                                                                          attribute: "addrIndivJob",                   type: "string"  },
            "1220": {  desc: "Kommentar",                                                                                     attribute: "addrComment",                    type: "string"  },
            "1225": {  desc: "Anrede / Briefanrede",                                                                          attribute: "addrTalk",                       type: "string"  },
            "1226": {  desc: "Schlusssatz / Grußformel",                                                                      attribute: "addrClosingSentence",            type: "string"  },
            "1250": {  desc: "Organisation / Firma",                                                                          attribute: "addrCompany",                    type: "string"  },
            "1251": {  desc: "Rechtsform der Organisation",                                                                   attribute: "addrCompanyLegalForm",           type: "string"  },
            "1252": {  desc: "Funktionsbezeichnung oder Titel der Person innerhalb der Organisation",                         attribute: "addrCompanyIndivFunction",       type: "string"  },
            "1260": {  desc: "Sprechzeiten / Öffnungszeiten",                                                                 attribute: "addrCompanyBusinessHours",       type: "string"  },
            "1265": {  desc: "Kommentar",                                                                                     attribute: "addrCompanyComment",             type: "string"  },
            "1270": {  desc: "Straßenadresszeile",                                                                            attribute: "addrStreet",                     type: "string"  },
            "1271": {  desc: "Straßenname oder Straßennummer / Straßenbezeichnung",                                           attribute: "addrStreetAdd",                  type: "string"  },
            "1272": {  desc: "Hausnummer",                                                                                    attribute: "addrStreetNo",                   type: "string"  },
            "1273": {  desc: "Zusätzliche Adressbezeichner",                                                                  attribute: "addrAddDesc",                    type: "string"  },
            "1275": {  desc: "Postfach",                                                                                      attribute: "addrPostbox",                    type: "string"  },
            "1276": {  desc: "PLZ",                                                                                           attribute: "addrZip",                        type: "string"  },
            "1277": {  desc: "Ort / Stadt",                                                                                   attribute: "addrCity",                       type: "string"  },
            "1290": {  desc: "„Nummer“ der Telekommunikationsverbindung",                                                     attribute: "addrTelComAddr",                 type: "string"  },
            "1291": {  desc: "Identifikator Telekommunikationsverbindung, TK-Typ",                                            attribute: "addrTelComType",                 type: "string", len: 5  },
            "1296": {  desc: "Verweis auf Adressbuch (Kürzel)",                                                               attribute: "addrRefAddrBook",                type: "string"  },
            "1297": {  desc: "Authentisierungszertifikat (öffentlicher Schlüssel)",                                           attribute: "authAuthCert",                   type: "string"  },
            "1298": {  desc: "Verschlüsselungszertifikat (öffentlicher Schlüssel)",                                           attribute: "authEncCert",                    type: "string"  },
            "1299": {  desc: "Signaturzertifikat (öffentlicher Schlüssel)",                                                   attribute: "authSigCert",                    type: "string"  },
            "1300": {  desc: "Name / Bezeichnung des Terminkalenders",                                                        attribute: "calKind",                        type: "string"  },
            "1301": {  desc: "Terminbeschreibung",                                                                            attribute: "appointmDesc",                   type: "string"  },
            "1302": {  desc: "Kommentar",                                                                                     attribute: "appointmComment",                type: "string"  },
            "1303": {  desc: "Art der benötigten Ressource",                                                                  attribute: "appointmResKind",                type: "number", len: 1  },
            "1304": {  desc: "Beschreibung der Ressource",                                                                    attribute: "appointmResDesc",                type: "string"  },
            "1305": {  desc: "Terminpartner / Teilnehmer",                                                                    attribute: "appointmParticipant",            type: "string"  },
            "1310": {  desc: "Startzeitpunkt",                                                                                attribute: "appointmStartTime",              type: "datetime", mapper: "datetime"  },
            "1311": {  desc: "Endzeitpunkt",                                                                                  attribute: "appointmEndTime",                type: "datetime", mapper: "datetime"  },
            "1312": {  desc: "Länge in Minuten",                                                                              attribute: "appointmLength",                 type: "number", len: 4  },
            "1315": {  desc: "Zeitzone",                                                                                      attribute: "appointmTimezone",               type: "string"  },
            "1320": {  desc: "Terminzustand",                                                                                 attribute: "appointmState",                  type: "number", len: 1  },
            "1325": {  desc: "Ort des Termins",                                                                               attribute: "appointmLocation",               type: "string"  },
            "1330": {  desc: "Erinnerung einschalten",                                                                        attribute: "appointmReminderActivate",       type: "datetime", mapper: "datetime"  },
            "1331": {  desc: "Erinnerungsintervall",                                                                          attribute: "appointmReminderInterval",       type: "number", len: 2  },
            "1400": {  desc: "Kürzel Diagnose",                                                                               attribute: "diagShort",                      type: "string"  },
            "1402": {  desc: "Diagnose (n) im Klartext",                                                                      attribute: "diagDesc",                       type: "string"  },
            "1500": {  desc: "Kürzel Ziffernkette",                                                                           attribute: "chainShort",                     type: "string"  },
            "1502": {  desc: "Gebührenordnung",                                                                               attribute: "chainFeeOrd",                    type: "string"  },
            "1503": {  desc: "Code für Ergänzungen zur GNR",                                                                  attribute: "chainFeeOrdIdAddCode",           type: "string", len: 4  },
            "1504": {  desc: "Begründung zur GNR",                                                                            attribute: "chainFeeOrdReason",              type: "string"  },
            "1550": {  desc: "Steigerungsfaktor bei Privatabrechungen",                                                       attribute: "chainFeeOrdPrivFactor",          type: "string"  },
            "1560": {  desc: "Art der Heilbehandlung bei BG-Fällen",                                                          attribute: "chainFeeOrdBGTreatKind",         type: "number", len: 1  },
            "1600": {  desc: "Kürzel Verordnung",                                                                             attribute: "prescShort",                     type: "string"  },
            "1601": {  desc: "Art des Verordnungskürzels",                                                                    attribute: "prescKind",                      type: "number", len: 1  },
            "1700": {  desc: "Kürzel Behandlungsbaustein",                                                                    attribute: "treatShort",                     type: "string"  },
            "1701": {  desc: "Klasse des Behandlungsbausteins",                                                               attribute: "treatClass",                     type: "string"  },
            "1702": {  desc: "Zuordnung (Feldbezeichner) des Behandlungsbausteins",                                           attribute: "treatFieldAssociation",          type: "string"  },
            "1703": {  desc: "Inhalt des Behandlungsbausteins",                                                               attribute: "treatContent",                   type: "string"  },
            "1800": {  desc: "Kürzel Textbaustein",                                                                           attribute: "textSnippetShort",               type: "string"  },
            "1801": {  desc: "Klasse des Textbausteins",                                                                      attribute: "textSnippetClass",               type: "string"  },
            "1802": {  desc: "Textbaustein",                                                                                  attribute: "textSnippet",                    type: "string"  },
            "1900": {  desc: "Bezeichnung des Kürzels",                                                                       attribute: "shortName",                      type: "string"  },
            "2002": {  desc: "Kassenname",                                                                                    attribute: "insuranceInsurerName",           type: "string"  },
            "2019": {  desc: "Typ der Krankenversicherung",                                                                   attribute: "insuranceType",                  type: "number", len: 1  },
            "2029": {  desc: "Vertragstyp",                                                                                   attribute: "contractKind",                   type: "string"  },
            "2030": {  desc: "Vertragskennzeichen",                                                                           attribute: "contractIndicator",              type: "string"  },
            "2099": {  desc: "Patientenindividuelle Faktoren",                                                                attribute: "patientspecificFactors",         type: "string"  },
            "2801": {  desc: "Beschreibung des Dokumenteninhalts",                                                            attribute: "documentContentDesc",            type: "string"  },
            "2802": {  desc: "Datum des Dokuments",                                                                           attribute: "documentDate",                   type: "date", mapper: "date"  },
            "2803": {  desc: "Versanddatum",                                                                                  attribute: "documentDateSent",               type: "datetime", mapper: "datetime"  },
            "3000": {  desc: "Patientennummer / Patientenkennung / Patienten-ID",                                             attribute: "patientId",                      type: "string"  },
            "3001": {  desc: "dokumentationsspezifische Patienten-ID",                                                        attribute: "patientIdDocSpecific",           type: "string"  },
            "3005": {  desc: "Name des Bevollmächtigten bei Organspenden",                                                    attribute: "patientRepOrganDonation",        type: "string"  },
            "3006": {  desc: "Name des Betreuers",                                                                            attribute: "patientCaretakerName",           type: "string"  },
            "3100": {  desc: "Namenszusatz des Patienten",                                                                    attribute: "patientNameAdd",                 type: "string"  },
            "3101": {  desc: "Name des Patienten / Nachname",                                                                 attribute: "patientName",                    type: "string"  },
            "3102": {  desc: "Vorname des Patienten",                                                                         attribute: "patientForename",                type: "string"  },
            "3103": {  desc: "Geburtsdatum des Patienten",                                                                    attribute: "patientDob",                     type: "date", mapper: "date"  },
            "3104": {  desc: "Titel des Patienten",                                                                           attribute: "patientTitle",                   type: "string"  },
            "3105": {  desc: "Versichertennummer des Patienten",                                                              attribute: "patientInsNo",                   type: "string"  },
            "3106": {  desc: "Wohnort des Patienten",                                                                         attribute: "patientCity",                    type: "string"  },
            "3107": {  desc: "Straße des Patienten",                                                                          attribute: "patientStreet",                  type: "string"  },
            "3108": {  desc: "Versichertenart MFR / Versichertenstatus",                                                      attribute: "insuranceKind",                  type: "number", len: 1  },
            "3110": {  desc: "Geschlecht (administrativ)",                                                                    attribute: "patientSex",                     type: "number", len: 1, mapper: "gender"  },
            "3111": {  desc: "Jahr: Geburtsjahr des Patienten",                                                               attribute: "patientYearOfBirth",             type: "string"  },
            "3112": {  desc: "PLZ des Patienten",                                                                             attribute: "patientZip",                     type: "string"  },
            "3113": {  desc: "Wohnort des Patienten",                                                                         attribute: "patientCity",                    type: "string"  },
            "3114": {  desc: "Wohnsitzländercode",                                                                            attribute: "patientCountryCode",             type: "string"  },
            "3115": {  desc: "Anschriftenzusatz",                                                                             attribute: "patientAddrAdd",                 type: "string"  },
            "3116": {  desc: "KV-Bereich",                                                                                    attribute: "patientKVArea",                  type: "string"  },
            "3119": {  desc: "Versichertennummer eGK des Patienten",                                                          attribute: "patientInsuranceId",             type: "string"  },
            "3120": {  desc: "Vorsatzwort (zum Namen)",                                                                       attribute: "patientNamePrefix",              type: "string"  },
            "3124": {  desc: "Postfach Wohnsitzländercode",                                                                   attribute: "patientPostboxCountryCode",      type: "string"  },
            "3130": {  desc: "Einschreibestatus Selektivverträge",                                                            attribute: "selectiveContrState",            type: "number", len: 1  },
            "3131": {  desc: "Teilnahme von",                                                                                 attribute: "selectiveContrFrom",             type: "date", mapper: "date"  },
            "3132": {  desc: "Teilnahme bis",                                                                                 attribute: "selectiveContrUnti",             type: "date", mapper: "date"  },
            "3133": {  desc: "Datum der Antragsstellung",                                                                     attribute: "selectiveContrDate",             type: "date", mapper: "date"  },
            "3134": {  desc: "Bezeichnung des Selektivvertrags",                                                              attribute: "selectiveContrDesc",             type: "string"  },
            "3200": {  desc: "Namenszusatz des Hauptversicherten",                                                            attribute: "insuredPrimNameAdd",             type: "string"  },
            "3201": {  desc: "Name des Hauptversicherten",                                                                    attribute: "insuredPrimName",                type: "string"  },
            "3202": {  desc: "Vorname des. Hauptversicherten",                                                                attribute: "insuredPrimForename",            type: "string"  },
            "3203": {  desc: "Geburtsdatum des Hauptversicherten",                                                            attribute: "insuredPrimDob",                 type: "date", mapper: "date"  },
            "3205": {  desc: "Straße des Hauptversicherten",                                                                  attribute: "insuredPrimStreet",              type: "string"  },
            "3206": {  desc: "Titel des Hauptversicherten",                                                                   attribute: "insuredPrimTitle",               type: "string"  },
            "3207": {  desc: "PLZ des Hauptversicherten",                                                                     attribute: "insuredPrimZip",                 type: "string"  },
            "3209": {  desc: "Wohnort des Hauptversicherten",                                                                 attribute: "insuredPrimCity",                type: "string"  },
            "3210": {  desc: "Geschlecht des Hauptversicherten",                                                              attribute: "insuredPrimGender",              type: "number", len: 1  },
            "3301": {  desc: "Datum des Medikationsplans",                                                                    attribute: "medplanDate",                    type: "date", mapper: "date"  },
            "3302": {  desc: "Externe Versionsnummer des Einnahmeplans / Medikationsplans",                                   attribute: "medplanVerExternal",             type: "string", len: 4  },
            "3303": {  desc: "Interne Versionsnummer des Einnahmeplans / Medikationsplans",                                   attribute: "medplanVerInternal",             type: "string", len: 8  },
            "3304": {  desc: "Besonderheiten",                                                                                attribute: "medplanSpecifics",               type: "string"  },
            "3310": {  desc: "Art ausgestellter oder vorhandener Gesundheitspässe",                                           attribute: "healthpassKind",                 type: "string"  },
            "3311": {  desc: "Aussteller des Passes",                                                                         attribute: "healthpassIssuer",               type: "string"  },
            "3399": {  desc: "Med. Sachverhalt ab Datum",                                                                     attribute: "medicalsituationSince",          type: "date", mapper: "date"  },
            "3401": {  desc: "Reaktion",                                                                                      attribute: "allergyReaction",                type: "string"  },
            "3402": {  desc: "Besondere Gefahr",                                                                              attribute: "particularDanger",               type: "string"  },
            "3411": {  desc: "Blutformel",                                                                                    attribute: "bloodFormula",                   type: "string"  },
            "3421": {  desc: "Diabetes",                                                                                      attribute: "diabetes",                       type: "number", len: 1  },
            "3422": {  desc: "Diabetestyp",                                                                                   attribute: "diabetesType",                   type: "string"  },
            "3423": {  desc: "Diabetestherapie",                                                                              attribute: "diabetesTherapy",                type: "string"  },
            "3424": {  desc: "Therapiedauer",                                                                                 attribute: "diabetesTherapyLen",             type: "doubledate", mapper: "date"  },
            "3425": {  desc: "Besondere Probleme",                                                                            attribute: "particularProblems",             type: "string"  },
            "3426": {  desc: "Problemdauer",                                                                                  attribute: "particularProblemsLen",          type: "doubleyear", mapper: "year"  },
            "3427": {  desc: "Vom Patienten durchgeführte Blutglukosebestimmungen/Woche",                                     attribute: "bloodGlucosePerWeek",            type: "string"  },
            "3428": {  desc: "Zeitraum",                                                                                      attribute: "bloodGlucosePerWeekLen",         type: "doublemonthyear", mapper: "monthyear"  },
            "3429": {  desc: "Messwert Mikroalbuminurie",                                                                     attribute: "microalbuminuriaVal",            type: "string"  },
            "3430": {  desc: "Messwert Makroalbuminurie",                                                                     attribute: "macroalbuminuriaVal",            type: "string"  },
            "3431": {  desc: "Augenbefund",                                                                                   attribute: "eyeFindings",                    type: "string"  },
            "3432": {  desc: "Körperliche Untersuchung",                                                                      attribute: "bodyInspec",                     type: "string"  },
            "3433": {  desc: "Beine",                                                                                         attribute: "legsInspec",                     type: "string"  },
            "3434": {  desc: "Neurologische Untersuchung",                                                                    attribute: "neurInspec",                     type: "string"  },
            "3435": {  desc: "Technische Untersuchung",                                                                       attribute: "techInspec",                     type: "string"  },
            "3437": {  desc: "(Vereinbarte) Behandlungsziele",                                                                attribute: "treatmentGoals",                 type: "string"  },
            "3441": {  desc: "Jahr der Diabetesdiagnose",                                                                     attribute: "yearOfDiabetesDiagnosis",        type: "year", mapper: "year"  },
            "3451": {  desc: "Epilepsie",                                                                                     attribute: "epilepsy",                       type: "number", len: 1  },
            "3452": {  desc: "Krankheitsbild",                                                                                attribute: "symptoms",                       type: "string"  },
            "3453": {  desc: "Behandlungsmaßnahmen im Notfall",                                                               attribute: "emergencyTreatments",            type: "string"  },
            "3454": {  desc: "Antiepileptika",                                                                                attribute: "epilepsyMedication",             type: "string"  },
            "3455": {  desc: "Wirkstoffnamen",                                                                                attribute: "agentNames",                     type: "string"  },
            "3461": {  desc: "Art des Implantats",                                                                            attribute: "implantKind",                    type: "string"  },
            "3462": {  desc: "Typbezeichnung des Implantats",                                                                 attribute: "implantTypename",                type: "string"  },
            "3463": {  desc: "Datum der Implantation",                                                                        attribute: "implantDate",                    type: "string"  },
            "3464": {  desc: "Sonstiges",                                                                                     attribute: "implantOther",                   type: "string"  },
            "3465": {  desc: "Implantatpass",                                                                                 attribute: "implantPass",                    type: "number", len: 1  },
            "3466": {  desc: "Art des Implantatpasses",                                                                       attribute: "implantPassKind",                type: "string"  },
            "3471": {  desc: "errechneter Entbindungstermin",                                                                 attribute: "childbirthDateCalculated",       type: "date", mapper: "date"  },
            "3472": {  desc: "Mutterschaft",                                                                                  attribute: "motherhood",                     type: "number", len: 1  },
            "3481": {  desc: "Organentnahme / Gewebeentnahme",                                                                attribute: "organTissueRemoval",             type: "number", len: 1  },
            "3482": {  desc: "Ausnahme (Organe / Gewebe, das nicht entnommen werden darf)",                                   attribute: "organTissueRemovalException",    type: "string"  },
            "3483": {  desc: "Angabe von Organen / Geweben, die nur entnommen werden dürfen",                                 attribute: "organTissueRemovalAllowed",      type: "string"  },
            "3484": {  desc: "Weitere Angaben zum Aufbewahrungsort",                                                          attribute: "organTissueRemovalAddInfo",      type: "string"  },

            "3501": {  desc: "Durch Röntgenaufnahmen untersuchte Körperregion",                                               attribute: "xrayBodyRegion",      type: "string"  },
            "3502": {  desc: "Bezeichnung der Untersuchung, Untersuchungstechnik oder Bezeichnung des Behandlungsverfahrens", attribute: "",      type: "string"  },
            "3503": {  desc: "Institution, in der die Untersuchung durchgeführt wurde",                                       attribute: "",      type: "string"  },
            "3504": {  desc: "Datum: Bilanzierung der bisherigen Berufslebensdosis: Zeitraum der Überwachung",                attribute: "",      type: "string"  },
            "3505": {  desc: "Effektive Gesamtdosis",                                                                         attribute: "",      type: "string"  },
            "3506": {  desc: "Datum der Bilanzierung",                                                                        attribute: "",      type: "string"  },
            "3507": {  desc: "Exposition nach RöV oder StrlSchV",                                                             attribute: "",      type: "string"  },
            "3508": {  desc: "Angaben zum Überwachungsverfahren",                                                             attribute: "",      type: "string"  },
            "3509": {  desc: "Erläuterungen bei innerer Strahlenexposition: Angaben zum Radionuklid",                         attribute: "",      type: "string"  },
            "3510": {  desc: "Ergebnis einer arbeitsmedizinischen Vorsorgeuntersuchung",                                      attribute: "",      type: "string"  },
            "3511": {  desc: "Ergebnis einer arbeitsmedizinischen Vorsorgeuntersuchung zum Atemschutz",                       attribute: "",      type: "string"  },
            "3515": {  desc: "Organdosis, gesamt",                                                                            attribute: "",      type: "string"  },
            "3527": {  desc: "Notfallkennzeichen",                                                                            attribute: "",      type: "string"  },
            "3528": {  desc: "Person, die im Notfall zu benachrichtigen ist",                                                 attribute: "",      type: "string"  },
            "3529": {  desc: "Kommentar zum Verhalten im Notfall",                                                            attribute: "",      type: "string"  },
            "3530": {  desc: "Sonstige im Notfall wichtige Daten",                                                            attribute: "",      type: "string"  },
            "3531": {  desc: "Serum-Injektion",                                                                               attribute: "",      type: "string"  },
            "3532": {  desc: "Art der Serum-Injektion",                                                                       attribute: "",      type: "string"  },
            "3533": {  desc: "Herkunft des Serums",                                                                           attribute: "",      type: "string"  },
            "3541": {  desc: "Art der Impfung",                                                                               attribute: "",      type: "string"  },
            "3542": {  desc: "Erfolg der Impf-Maßnahme",                                                                      attribute: "",      type: "string"  },
            "3561": {  desc: "Kommunikationsstörungen",                                                                       attribute: "",      type: "string"  },
            "3562": {  desc: "Weglaufgefährdung",                                                                             attribute: "",      type: "string"  },
            "3563": {  desc: "Sonstige Hinweise / Kommentare",                                                                attribute: "",      type: "string"  },
            "3581": {  desc: "Aufbewahrungsort der Patientenverfügung",                                                       attribute: "",      type: "string"  },
            "3582": {  desc: "Weitere Angaben zum Aufbewahrungsort",                                                          attribute: "",      type: "string"  },
            "3591": {  desc: "Aufbewahrungsort der Vorsorgevollmacht",                                                        attribute: "",      type: "string"  },
            "3592": {  desc: "Weitere Angaben zum Aufbewahrungsort",                                                          attribute: "",      type: "string"  },
            "3593": {  desc: "Kommentar",                                                                                     attribute: "",      type: "string"  },
            "3600": {  desc: "Typ des archivierten Dokuments",                                                                attribute: "",      type: "string"  },

            "3601": {  desc: "Röntgennummer",                                                         attribute: "xrayNo",                         type: "string"  },
            "3602": {  desc: "Archivnummer",                                                          attribute: "archiveNo",                      type: "string"  },
            "3603": {  desc: "BG-Nummer",                                                             attribute: "bgNo",                           type: "string"  },
            "3610": {  desc: "Patienc seit",                                                          attribute: "patientSince",                   type: "date", mapper: "date"  },
            "3612": {  desc: "Versicherungsbeginn bei Kassenwechsel",                                 attribute: "patientInsuranceStart",          type: "date", mapper: "date"  },
            "3620": {  desc: "Beruf des Patiencen",                                                   attribute: "patientJob",                     type: "string"  },
            "3622": {  desc: "Größe des Patienten",                                                   attribute: "patientHeight",                  type: "float", mapper: "cm"  },
            "3623": {  desc: "Gewicht des Patienten",                                                 attribute: "patientWeight",                  type: "float", mapper: "kg"  },
            "3625": {  desc: "Arbeitgeber des Patienten",                                             attribute: "patientEmployer",                type: "string"  },
            "3626": {  desc: "Telefonnummer Patient",                                                 attribute: "patientPhone",                   type: "string"  },
            "3627": {  desc: "Nationalität Patient",                                                  attribute: "patientNationality",             type: "string"  },
            "3628": {  desc: "Muttersprache",                                                         attribute: "patientNativelang",              type: "string"  },
            "3630": {  desc: "Arztnummer Hausarzt",                                                   attribute: "patientDocId",                   type: "string", len: 9  },
            "3631": {  desc: "Entfernung Wohnort-Praxis",                                             attribute: "patientDistancePractice",        type: "string"  },
            "3635": {  desc: "Interne Zuordnung Arzt bei Gemeinschaftspraxen",                        attribute: "internalDocAlloc",               type: "string"  },
            "3637": {  desc: "Rezeptkennung",                                                         attribute: "receiptId",                      type: "number", len: 1  },
            "3649": {  desc: "Dauerdiagnosen ab Datum",                                               attribute: "patientconDiagFrom",             type: "date", mapper: "date"  },
            "3650": {  desc: "Dauerdiagnosen",                                                        attribute: "patientconDiagList",             type: "string"  },
            "3651": {  desc: "Dauermedikamente ab Datum",                                             attribute: "patientconMedFrom",              type: "date", mapper: "date"  },
            "3652": {  desc: "Dauermedikamente",                                                      attribute: "patientconMedList",              type: "string"  },
            "3654": {  desc: "Risikofaktoren",                                                        attribute: "patientRiskFactors",             type: "string"  },
            "3656": {  desc: "Allergien",                                                             attribute: "patientAllergies",               type: "string"  },
            "3658": {  desc: "Unfälle",                                                               attribute: "patientAccidents",               type: "string"  },
            "3660": {  desc: "Operationen",                                                           attribute: "patientSurgeries",               type: "string"  },
            "3662": {  desc: "Anamnese",                                                              attribute: "anamnesis",                      type: "string"  },
            "3664": {  desc: "Anzahl Geburten",                                                       attribute: "patientNoChildbirths",           type: "number"  },
            "3666": {  desc: "Anzahl Kinder",                                                         attribute: "patientNoChildren",              type: "number"  },
            "3668": {  desc: "Anzahl Schwangerschaften",                                              attribute: "patientNoPregnancies",           type: "number"  },
            "3670": {  desc: "Dauerrherapie",                                                         attribute: "conTherapyList",                 type: "string"  },
            "3672": {  desc: "Kontrolltermine",                                                       attribute: "controlAppointment",             type: "date", mapper: "date"  },

            "3700": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3701": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3702": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3703": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3704": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3705": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3706": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3707": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3708": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3709": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3710": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3711": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3712": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3713": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3714": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3715": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3716": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3717": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },
            "3718": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "3719": {  desc: "Inhalt", attribute: "content", type: "string", len: 70, mapper: "freeCat"  },

            "4101": {  desc: "Quartal der Abrechnung",                                       attribute: "billingQ",                       type: "string", len: 5  },
            "4102": {  desc: "Ausstellungsdatum",                                            attribute: "dateOfCreation",                 type: "date", mapper: "date"  },
            "4103": {  desc: "Gültigkeitsdatum",                                             attribute: "dateValidUntil",                 type: "date", mapper: "date"  },
            "4104": {  desc: "Kassennummer (VKNR)",                                          attribute: "insuranceVKNR",                  type: "number", len: 5  },
            "4105": {  desc: "Geschäftsstelle",                                              attribute: "branchOffice",                   type: "string", len: 70  },
            "4106": {  desc: "Kostenträgeruntergruppe",                                      attribute: "payerBillingArea",               type: "number", len: 2  },
            "4107": {  desc: "Abrechnungsart (Schein)",                                      attribute: "billingType",                    type: "number", len: 1  },
            "4109": {  desc: "Letzter Einlesetag der VK-Karte im Quartal",                   attribute: "insurancelastCardReadOfQuarter", type: "date", len: 8, mapper: "date"  },
            "4110": {  desc: "Bis-Datum der Gültigkeit",                                     attribute: "insuranceValidToDate",           type: "date", len: 8, mapper: "date"  },
            "4111": {  desc: "Krankenkassennummer (KIK)",                                    attribute: "insuranceNo",                    type: "number", len: 9  },
            "4112": {  desc: "Versichertenstatus VK",                                        attribute: "insuredStatusFromCard",          type: "number", len: 4  },
            "4113": {  desc: "ost/West-Status VK",                                           attribute: "insuredEWStatusFromCard",        type: "number", len: 1  },
            "4121": {  desc: "Gebührenordnung",                                              attribute: "feeSchedule",                    type: "string", len: 2  },
            "4122": {  desc: "Abrechnungsgebiet",                                            attribute: "insuranceBillingArea",           type: "number", len: 2  },
            "4201": {  desc: "Ursache des Leidens",                                          attribute: "SourceOfAffliction",             type: "number", len: 1  },
            "4206": {  desc: "Mutm. Tag der Entbindung",                                     attribute: "AssumedDateOfChildbirth",        type: "date", mapper: "date"  },
            "4207": {  desc: "Diagnose / Verdacht",                                          attribute: "diagnosis_suspected",            type: "string", len: 70  },
            "4209": {  desc: "Erläuternder Text zur Überweisung",                            attribute: "referralDesc",                   type: "string", len: 70  },
            "4210": {  desc: "Ankreuzfeld Muvo LSR",                                         attribute: "checkboxMuvoLsr",                type: "number", len: 1  },
            "4211": {  desc: "Ankreuzfeld Muvo HAH",                                         attribute: "checkboxMuvoLHah",               type: "number", len: 1  },
            "4212": {  desc: "Ankreuzfeld AbO/Rh",                                           attribute: "checkboxAboRh",                  type: "number", len: 1  },
            "4213": {  desc: "Ankreuzfeld AK",                                               attribute: "checkboxAk",                     type: "number", len: 1  },
            "4218": {  desc: "Überweisung von Arztnr.",                                      attribute: "referralFromDocID",              type: "number", len: 9  },
            "4220": {  desc: "Überweisung an",                                               attribute: "referralTo",                     type: "string", len: 70  },
            "4230": {  desc: "gesetzl. Abzug zur stat. Behandlung gemäß § 6a GOÄ",           attribute: "priceReductionStatTreatment",    type: "number", len: 1  },
            "4233": {  desc: "Stationäre Behandlung von... bis...",                          attribute: "statTreatmentFromUntil",         type: "doubledate", mapper: "doubledate"  },
            "4236": {  desc: "Klasse bei stat. Behandl.",                                    attribute: "statTreatmentClass",             type: "number", len: 1  },
            "4237": {  desc: "Krankenhaus-Name",                                             attribute: "hospitalName",                   type: "string", len: 70  },
            "4238": {  desc: "Krankenhausaufenthalt",                                        attribute: "hospitalStay",                   type: "string", len: 3  },
            "4239": {  desc: "Scheinuntergruppe",                                            attribute: "scheinSubgroup",                 type: "string", len: 2  },
            "4243": {  desc: "Weiterbehandelnder Arzt",                                      attribute: "referredDoc",                    type: "string", len: 70  },
            "4267": {  desc: "Befund",                                                       attribute: "finding",                        type: "string", len: 70  },
            "4268": {  desc: "Symptome",                                                     attribute: "symptoms",                       type: "string", len: 70  },
            "4500": {  desc: "Unfall tag",                                                   attribute: "accidentTime",                   type: "date", mapper: "datetime"  },
            "4501": {  desc: "Uhrzeit des Unfalls",                                          attribute: "accidentTime",                   type: "time"  },
            "4502": {  desc: "Eingecroffen in Praxis am",                                    attribute: "arrivedInPractice",              type: "date", mapper: "datetime"  },
            "4503": {  desc: "Uhrzeit des Ein treffens",                                     attribute: "arrivedInPractice",              type: "time"  },
            "4504": {  desc: "Beginn Arbeitszeit",                                           attribute: "beginOfWork",                    type: "time", mapper: "time"  },
            "4505": {  desc: "Unfallort",                                                    attribute: "accidentLocation",               type: "string", len: 70  },
            "4506": {  desc: "Beschäftigung als",                                            attribute: "EmployedAs",                     type: "string", len: 70  },
            "4507": {  desc: "Beschäftigt seit",                                             attribute: "EmployedSince",                  type: "date", mapper: "date"  },
            "4508": {  desc: "Staatsangehörigkeit",                                          attribute: "nationality",                    type: "string", len: 70  },
            "4509": {  desc: "Unfallbetrieb",                                                attribute: "accidentCompany",                type: "string", len: 70  },
            "4510": {  desc: "Unfallhergang",                                                attribute: "accidentCourseOfEvents",         type: "string", len: 70  },
            "4512": {  desc: "Verhalten des Verletzten nach dem Unfall",                     attribute: "accidentBehaviourPostAccident",  type: "string", len: 70  },
            "4513": {  desc: "Erstmalige Behandlung",                                        attribute: "initialTreatment",               type: "date", mapper: "date"  },
            "4514": {  desc: "Behandlung durch",                                             attribute: "initialTreatmentDoneBy",         type: "string", len: 70  },
            "4515": {  desc: "Art dieser ersten ärztlichen Behandlung",                      attribute: "initialTreatmentKind",           type: "string", len: 70  },
            "4520": {  desc: "Alkoholeinfluß",                                               attribute: "influenceOfAlcohol",             type: "number", len: 1  },
            "4521": {  desc: "Anzeichen des Alkoholeinflusses",                              attribute: "influenceOfAlcoholIndicators",   type: "string", len: 70  },
            "4522": {  desc: "B1utentnahme",                                                 attribute: "bloodSampleTaken",               type: "number", len: 1  },
            "4530": {  desc: "Befund",                                                       attribute: "finding",                        type: "string", len: 70  },
            "4540": {  desc: "Röntgenergebnis",                                              attribute: "xrayResult",                     type: "string", len: 70  },
            "4550": {  desc: "Art etwaiger Erstversorgung",                                  attribute: "firstCareKind",                  type: "string", len: 70  },
            "4551": {  desc: "Krankhafte verlinderungen unabhängig vom Unfall",              attribute: "abatementIndependentOfAccident", type: "string", len: 70  },
            "4552": {  desc: "Bedenken gegen Angaben",                                       attribute: "doubtsAgainstStatements",        type: "number", len: 1  },
            "4553": {  desc: "Art der Bedenken",                                             attribute: "doubtsAgainstStatementsKind",    type: "string", len: 70  },
            "4554": {  desc: "Bedenken gegen Vorliegen eines Arbeitsunfalls",                attribute: "doubtsAgainstJobAccident",       type: "number", len: 1  },
            "4555": {  desc: "Art der Bedenken",                                             attribute: "doubtsAgainstJobAccidentKind",   type: "string", len: 70  },
            "4560": {  desc: "arbeitsfähig",                                                 attribute: "ableToWork",                     type: "number", len: 1  },
            "4561": {  desc: "wieder arbeitsfähig ab",                                       attribute: "ableToWorkAgainFrom",            type: "date", mapper: "date"  },
            "4562": {  desc: "AU-Bescheinigung ausgestellt",                                 attribute: "attestationCreated",             type: "number", len: 1  },
            "4570": {  desc: "Besondere Heilbehandlung erforderlich",                        attribute: "specialTreatmentRequired",       type: "number", len: 1  },
            "4571": {  desc: "Besondere Heilbehandlung durch",                               attribute: "specialTreatmentDoneBy",         type: "number", len: 1  },
            "4572": {  desc: "Anschrift des behandelnden Arztes",                            attribute: "AddressDoc",                     type: "string", len: 70  },
            "4573": {  desc: "AU ab",                                                        attribute: "unableToWorkFrom",               type: "date", mapper: "date"  },
            "4574": {  desc: "voraussichtliche Dauer der AU",                                attribute: "unableToWorkTimespan",           type: "string", len: 3  },
            "4580": {  desc: "Rechnungsart",                                                 attribute: "billingKind",                    type: "string", len: 2  },
            "4581": {  desc: "Allgemeine Heilbehandlung durch",                              attribute: "treatmentDoneBy",                type: "number", len: 1  },
            "4582": {  desc: "AU über 3 Tage",                                               attribute: "unableToWorkForMoreThanThreeD",  type: "number", len: 1  },
            "4583": {  desc: "AU bescheinigt bis",                                           attribute: "unableToWorkUntil",              type: "date", mapper: "date"  },
            "4584": {  desc: "Nachschau erforderlich am",                                    attribute: "checkRequiredOn",                type: "date", mapper: "date"  },
            "4601": {  desc: "Rechnungsnummer",                                              attribute: "billingNo",                      type: "string", len: 70  },
            "4602": {  desc: "Rechnungsanschrift",                                           attribute: "billingAddr",                    type: "string", len: 70  },
            "4603": {  desc: "Überweisender Arzt",                                           attribute: "referringDoc",                   type: "string", len: 70  },
            "4604": {  desc: "Rechnungsdatum",                                               attribute: "billingDate",                    type: "date", mapper: "date"  },
            "4605": {  desc: "Endsumme",                                                     attribute: "billingSum",                     type: "string", len: 70  },
            "4608": {  desc: "Abdingungserklärung",                                          attribute: "declarationRedNegotiation",      type: "number", len: 1  },
            "4611": {  desc: "Unterkonto Arzt",                                              attribute: "subaccountDoc",                  type: "string", len: 70  },
            "4613": {  desc: "Anlage zur Rechnung",                                          attribute: "billingAttachment",              type: "number", len: 1  },
            "4615": {  desc: "Kopfzeile",                                                    attribute: "billingHeader",                  type: "string", len: 70  },
            "4617": {  desc: "Fußzeile",                                                     attribute: "billingFooter",                  type: "string", len: 70  },
            "5000": {  desc: "Leistungstag",                                                 attribute: "dayOfService",                   type: "date", mapper: "date"  },
            "5001": {  desc: "GNR/GNR-Ident",                                                attribute: "gnr",                            type: "string", len: 7  },
            "5002": {  desc: "Art der Untersuchung",                                         attribute: "inspectionKind",                 type: "string", len: 70  },
            "5003": {  desc: "Empfänger des Briefes",                                        attribute: "letterRecipient",                type: "string", len: 70  },
            "5004": {  desc: "Kilometer (nur bei GOÄ)",                                      attribute: "kilmetres",                      type: "number", len: 3  },
            "5005": {  desc: "Multiplikator",                                                attribute: "factor",                         type: "number", len: 2  },
            "5006": {  desc: "Um-Uhrzeit",                                                   attribute: "time",                           type: "time", mapper: "time"  },
            "5007": {  desc: "Bestellzeit-Ausführungszeit",                                  attribute: "orderTimeExecutionTime",         type: "doubleTime", mapper: "doubleTime"  },
            "5008": {  desc: "DKM",                                                          attribute: "dkm",                            type: "number", len: 3  },
            "5009": {  desc: "freier Begründungstext",                                       attribute: "reason",                         type: "string", len: 70  },
            "5010": {  desc: "Medikament als Begründung",                                    attribute: "medAsJustification",             type: "string", len: 70  },
            "5011": {  desc: "Sachkosten-Bezeichnung",                                       attribute: "matcostDesc",                    type: "string", len: 70  },
            "5012": {  desc: "Sachkosten-/Material-kosten (Dpf)",                            attribute: "matcostVal",                     type: "number"  },
            "5013": {  desc: "Prozent der Leistung",                                         attribute: "percentOfService",               type: "number", len: 3  },
            "5015": {  desc: "Organ",                                                        attribute: "organ",                          type: "string", len: 70  },
            "5017": {  desc: "Besuchsort bei Hausbesuchen",                                  attribute: "homeVisitLocation",              type: "string", len: 70  },
            "5018": {  desc: "Zone bei Besuchen",                                            attribute: "homeVisitZone",                  type: "string", len: 2  },
            "5060": {  desc: "Beschreibung der GNR bei privatabrechnung",                    attribute: "privbillGnrDesc",                type: "string", len: 70  },
            "5061": {  desc: "Gebühr bei Privatrechnung",                                    attribute: "privbillFee",                    type: "float"  },
            "5062": {  desc: "Faktor bei Privatrechnung",                                    attribute: "privbillfactor",                 type: "float"  },
            "5063": {  desc: "Betrag bei Privatrechnung",                                    attribute: "privbillPrice",                  type: "float"  },
            "5064": {  desc: "Endsumme Privatrechnung",                                      attribute: "privbillSum",                    type: "float"  },
            "5065": {  desc: "Punktwert",                                                    attribute: "pointVal",                       type: "string", len: 70  },
            "5090": {  desc: "Honorarbezeichnung",                                           attribute: "feeDesc",                        type: "string", len: 70  },
            "5091": {  desc: "Gutachten-Bezeichnung",                                        attribute: "evalDesc",                       type: "string", len: 70  },
            "6000": {  desc: "Abrechnungsdiagnose",                                          attribute: "billDiagnosis",                  type: "string", len: 70  },
            "6001": {  desc: "ICD-Schlüssel",                                                attribute: "icdKey",                         type: "string", len: 5  },
            "6200": {  desc: "Tag der Speicherung von Behandlungsdaten",                     attribute: "treatmentdata",                  type: "date", mapper: "dateTime"  },
            "6205": {  desc: "Aktuelle Diagnose",                                            attribute: "curDiag",                        type: "string", len: 70  },
            "6210": {  desc: "Medikament verordnet auf Rezept",                              attribute: "medWithPresc",                   type: "string", len: 70  },
            "6211": {  desc: "Außerhalb Rezept verordnetes Medikament",                      attribute: "medWithoutPresc",                type: "string", len: 70  },
            "6215": {  desc: "Ärztemuster",                                                  attribute: "docEx",                          type: "string", len: 70  },
            "6220": {  desc: "Befund",                                                       attribute: "report",                         type: "string", len: 70  },
            "6221": {  desc: "Fremdbefund",                                                  attribute: "forReport",                      type: "string", len: 70  },
            "6222": {  desc: "Laborbefund",                                                  attribute: "labReport",                      type: "string", len: 70  },
            "6225": {  desc: "Röntgenbefund",                                                attribute: "xrayReport",                     type: "string", len: 70  },
            "6230": {  desc: "Blutdruck",                                                    attribute: "bloodpressure",                  type: "string", len: 70  },
            "6240": {  desc: "Symptome",                                                     attribute: "symptoms",                       type: "string", len: 70  },
            "6260": {  desc: "Therapie",                                                     attribute: "therapy",                        type: "string", len: 70  },
            "6265": {  desc: "Physikalische Therapie",                                       attribute: "physTherapy",                    type: "string", len: 70  },
            "6280": {  desc: "Überweisung Inhalt",                                           attribute: "transactionContent",             type: "string", len: 70  },
            "6285": {  desc: "AU Dauer",                                                     attribute: "unableToWorkTimespan",           type: "doubleDate", mapper: "doubledate"  },
            "6286": {  desc: "AU wegen",                                                     attribute: "unableToWorkBecause",            type: "string", len: 70  },
            "6290": {  desc: "Krankenhauseinweisung, Krankenhaus",                           attribute: "hospitalrefHospital",            type: "string", len: 70  },
            "6291": {  desc: "Krankenhauseinw. wegen",                                       attribute: "hospitalrefBecause",             type: "string", len: 70  },
            "6300": {  desc: "Bescheinigung, Art",                                           attribute: "confirmationKind",               type: "string", len: 70  },
            "6301": {  desc: "Bescheinigung, Inhalt",                                        attribute: "confirmationContent",            type: "string", len: 70  },
            "6306": {  desc: "Attest, Art",                                                  attribute: "attestationKind",                type: "string", len: 70  },
            "6307": {  desc: "Attest, Inhalt",                                               attribute: "attestationContent",             type: "string", len: 70  },
            "6310": {  desc: "Name des Briefempfängers",                                     attribute: "letterRecipientName",            type: "string", len: 70  },
            "6311": {  desc: "Anrede",                                                       attribute: "honorifics",                     type: "string", len: 70  },
            "6312": {  desc: "Straße",                                                       attribute: "street",                         type: "string", len: 70  },
            "6313": {  desc: "PLZ",                                                          attribute: "zip",                            type: "string", len: 70  },
            "6314": {  desc: "Wohnort",                                                      attribute: "city",                           type: "string", len: 70  },
            "6315": {  desc: "Schlußsatz",                                                   attribute: "closingStatement",               type: "string", len: 70  },
            "6316": {  desc: "Telefon-Nummer",                                               attribute: "phone",                          type: "string", len: 70  },
            "6317": {  desc: "Telefax-Nummer",                                               attribute: "fax",                            type: "string", len: 70  },
            "6319": {  desc: "Arztnummer/Arztident",                                         attribute: "docId",                          type: "string", len: 70  },
            "6320": {  desc: "Briefinhalt",                                                  attribute: "letterContent",                  type: "string", len: 70  },
            "6325": {  desc: "Bild-Archivierungsnummer",                                     attribute: "picArchiveId",                   type: "string", len: 70  },
            "6326": {  desc: "Grafikformat",                                                 attribute: "picFormat",                      type: "string", len: 70  },
            "6327": {  desc: "Bildinhalt",                                                   attribute: "picContent",                     type: "string", len: 70  },

            "6330": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6331": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6332": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6333": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6334": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6335": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6336": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6337": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6338": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6339": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6340": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6341": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6342": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6343": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6344": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6345": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6346": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6347": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6348": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6349": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6350": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6351": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6352": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6353": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6354": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6355": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6356": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6357": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6358": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6359": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6360": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6361": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6362": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6363": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6364": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6365": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6366": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6367": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6368": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6369": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6370": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6371": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6372": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6373": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6374": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6375": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6376": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6377": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6378": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6379": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6380": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6381": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6382": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6383": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6384": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6385": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6386": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6387": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6388": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6389": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6390": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6391": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6392": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6393": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6394": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6395": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6396": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6397": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },
            "6398": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", len: 70, mapper: "freeCat"  },    "6399": {  desc: "Inhalt", attribute: "content", type: "string", len: 70  },

            "8000": {  desc: "Satzidentifikation",                                           attribute: "recordType",                     type: "string", len: 4, mapper: "satzID"  },
            "8100": {  desc: "Satzlänge",                                                    attribute: "recordSize",                     type: "number", len: 5, mapper: "byte"  },
            "8401": {  desc: "Befundart",                                                    attribute: "findingKind",                    type: "string", len: 1  },
            "8402": {  desc: "Geräte und verfahrensspezifisches Kennfeld",                   attribute: "procedure",                      type: "procedure", mapper: "procedure", len: 2  },
            "8410": {  desc: "Test(s)",                                                      attribute: "sampleId",                       type: "string", len: 6  },
            "8411": {  desc: "Testbezeichnung",                                              attribute: "sampleLabel",                    type: "string", len: 70  },
            "8418": {  desc: "Teststatus",                                                   attribute: "sampleStatus",                   type: "string", len: 1  },
            "8420": {  desc: "Ergebnis-Wert",                                                attribute: "sampleResultVal",                type: "string", len: 70  },
            "8421": {  desc: "Einheit",                                                      attribute: "sampleResultUnit",               type: "string", len: 70  },
            "8422": {  desc: "Grenzwert-Indikator",                                          attribute: "limitIndicator",                 type: "string", len: 2  },
            "8429": {  desc: "Probenmaterial-Nummer",                                        attribute: "sampleIndex",                    type: "number", len: 70  },
            "8430": {  desc: "Probenmaterial-Bezeichnung",                                   attribute: "sampleLabel",                    type: "string", len: 70  },
            "8431": {  desc: "Probenmaterial-Spezifikation",                                 attribute: "sampleSpec",                     type: "string", len: 70  },
            "8432": {  desc: "Abnahme-Datum",                                                attribute: "sampleCollDate",                 type: "date", mapper: "dateTime"  },
            "8433": {  desc: "Abnahme-Zeit",                                                 attribute: "sampleCollDate",                 type: "time", mapper: "dateTime"  },
            "8440": {  desc: "Keim-Ident",                                                   attribute: "germId",                         type: "string", len: 70  },
            "8441": {  desc: "Keim-Bezeichnung",                                             attribute: "germDesc",                       type: "string", len: 70  },
            "8442": {  desc: "Keim-Nummer",                                                  attribute: "germNo",                         type: "number"  },
            "8443": {  desc: "Resistenz-Methode",                                            attribute: "resistenceMethod",               type: "number", len: 1  },
            "8444": {  desc: "Wirkstoff-Ident",                                              attribute: "agentId",                        type: "string", len: 70  },
            "8445": {  desc: "Wirkstoff-Generic-Name",                                       attribute: "agentDesc",                      type: "string", len: 70  },
            "8446": {  desc: "MHK-Breakpoint-Wert",                                          attribute: "mhkBreakpointVal",               type: "string", len: 70  },
            "8447": {  desc: "Resistenz-Interpretation",                                     attribute: "resistenceInterpretation",       type: "number", len: 1  },
            "8460": {  desc: "Normalwert-Text",                                              attribute: "sampleNormalValueText",          type: "string", len: 70  },
            "8470": {  desc: "Anmerkung",                                                    attribute: "sampleTestNotes",                type: "string", len: 70  },
            "8480": {  desc: "Abschluß-Zeile",                                               attribute: "sampleResultText",               type: "string", len: 70  },
            "8490": {  desc: "Auftragsbezogene Hinweise",                                    attribute: "sampleRequestAdditionalInfo",    type: "string", len: 70  },
            "8990": {  desc: "Signatur",                                                     attribute: "signature",                      type: "string", len: 70  },
            "9100": {  desc: "Arztnummer des Absenders",                                     attribute: "senderDocId",                    type: "string", len: 70  },
            "9103": {  desc: "Datum der Erstellung",                                         attribute: "dateOfCreation",                 type: "date", mapper: "date"  },
            "9105": {  desc: "Ordnungsnr. Datenträger (Header) des DP",                      attribute: "datapackageOrderNo",             type: "string", len: 3  },
            "9106": {  desc: "Zeichencode",                                                  attribute: "encoding",                       type: "encoding", len: 1  },
            "9202": {  desc: "Gesamtlänge des Datenpaketes in Byte",                         attribute: "datapackageSize",                type: "number", len: 8  },
            "9203": {  desc: "Anzahl Datenträger des DP",                                    attribute: "datapackageVolumeAmount",        type: "number", len: 3  },
            "9210": {  desc: "Version ADT-Satzbeschreibung",                                 attribute: "versionADT",                     type: "string", len: 5  },
            "9213": {  desc: "Version BDT",                                                  attribute: "versionBDT",                     type: "string", len: 5  },
            "9600": {  desc: "Archivierungsart",                                             attribute: "archiveKind",                    type: "number", len: 1, mapper: "archiveKind"  },
            "9601": {  desc: "Zeitraum der Speicherung",                                     attribute: "storageTimespan",                type: "doubledate", mapper: "date"  },
            "9602": {  desc: "Beginn der Übertragung",                                       attribute: "transmissionBegin",              type: "longtime", mapper: "longtime"  },
            "9901": {  desc: "Systeminterner Parameter",                                     attribute: "systeminternalParameter",        type: "string", len: 70  },

            "0000": {  desc: "invalid field", attribute: "invalid", type: "string"  }
        };
        bdt30.stringMappers = {
            gender: function(prop, propInfo, hideName) {
                if (1 === prop) {return (hideName?"":propInfo.desc+": ")+"männlich";}
                else if (2 === prop) {return (hideName?"":propInfo.desc+": ")+"weiblich";}
                else {return (hideName?"":propInfo.desc+": ")+"ungültig ("+prop+")";}
            },
            cm: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc+": ")+prop+"cm";
            },
            kg: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc+": ")+prop+"kg";
            },
            byte: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc+": ")+prop+" byte";
            },
            date: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc + ": ")+moment(prop).format("YYYY-MM-DD");
            },
            time: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc+": ")+moment(prop).format("HH:mm:ss");
            },
            longtime: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc+": ")+moment(prop).format("HH:mm:ss.SS");
            },
            dateTime: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc+": ")+moment(prop).format("YYYY-MM-DD HH:mm:ss");
            },
            satzID: function(prop) {
                return " - "+bdt30.saetze[prop].desc+" - ";
            },
            archiveKind: function(prop, propInfo, hideName) {
                var val = ["Speicherung Gesamtbestand","Speicherung beliebiger Zeitraum","Speicherung eines Quartals"][prop-1]||"ungütlig";
                return (hideName?"":propInfo.desc+": ")+val+" (Typ "+prop+")";
            },
            practiceType: function(prop, propInfo, hideName) {
                var val = ["Einzelpraxis","Gemeinschaftspraxis","Fachübergreifende GP","Praxisgemeinschaft","Fachübergreifende GP ohne Kennzeichen Leistung"][prop-1]||"ungütlig";
                return (hideName?"":propInfo.desc+": ")+val+" (Typ "+prop+")";
            },
            encoding: function(prop, propInfo, hideName) {
                var val = bdt30.encodings[prop-1]||"ungütlig";
                return (hideName?"":propInfo.desc+": ")+val+" (Typ "+prop+")";
            },
            procedure: function(prop, propInfo, hideName) {
                return (hideName?"":propInfo.desc+": ")+prop.group+": "+prop.desc+" (BDM01)";
            }
        };
        bdt30.rules = {};
        
        /**
         * debug logging function, so that we don't need to delete debug logging messages in this module
         * @method dbg
         * @param {String} msg
         */
        function dbg(msg) {Y.log("\x1b[90mbdtVersions debug: "+msg+"\x1b[0m", "debug", NAME);}

        Y.namespace( 'doccirrus.api.xdtVersions.bdt' ).bdt30 = bdt30;

    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
