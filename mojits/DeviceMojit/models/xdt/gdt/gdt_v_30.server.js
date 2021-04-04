/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */



YUI.add( 'gdt_v_30', function( Y ) {

        //gdt templates to use

        var moment = require('moment');

        let gdt30 = {};
        gdt30.type = "gdt";
        gdt30.name = "gdt30";
        gdt30.version = "03.00";
        gdt30.versionField = "9218";
        gdt30.acceptedVersions = ["03.00","03.01"];

        gdt30.dateFormat = "DDMMYYYY";
        gdt30.shortDateFormat = "MMYY";
        gdt30.timeFormat = "HHmmss";

        gdt30.sizeCounter = 1; //1 byte for the counter
        gdt30.sizeLabel = 3; //3 bytes for the Label: B00/B01/B02
        gdt30.sizeDataField = 128; //128 bytes for field content
        gdt30.sizeCrc16 = 4;
        gdt30.sizeLen = 3;
        gdt30.sizeRecLen = 7;
        gdt30.sizefileLen = 0;
        gdt30.sizeSatz = 4;
        gdt30.sizeFk = 4;

        gdt30.encodings = ["ASCII (german)", "Code page 437", "ISO 8859-15"];
        gdt30.encodingField = "9206";

        gdt30.serialCr = "[CR]"; //0x0D
        gdt30.serialNewLineReplacement = "[FS]"; //0x1C

        gdt30.recordType = "8000";
        gdt30.recordSize = "8100";
        gdt30.objType = "8200";
        gdt30.objEntries = "8201";
        gdt30.recordEntries = "8202";

        gdt30.saetze = {
            //id -> {desc, attribute, fk}
            "6300": {
                desc: "Stammdaten anfordern", attribute: "patientDataRequest", fk: {
                    "8000":                  {amount: "1", optional: false},
                    "8100":                  {amount: "1", optional: true},
                    "Obj_Kopfdaten":         {amount: "1", optional: false},
                    "Obj_Patient":           {amount: "1", optional: false},
                    "Obj_Versichertenkarte": {amount: "1", optional: true},
                    "8202":                  {amount: "1", optional: false}
                }
            },
            "6301": {
                desc: "Stammdaten übermitteln", attribute: "patientData", fk: {
                    "8000":                  {amount: "1", optional: false},
                    "8100":                  {amount: "1", optional: true},
                    "Obj_Kopfdaten":         {amount: "1", optional: false},
                    "Obj_Patient":           {amount: "1", optional: false},
                    "Obj_Basisdiagnostik":   {amount: "1", optional: true},
                    "Obj_Versichertenkarte": {amount: "1", optional: true},
                    "8202":                  {amount: "1", optional: false}
                }
            },
            "6302": {
                desc: "Neue Untersuchung anfordern", attribute: "studyDataRequest", fk: {
                    "8000":                   {amount: "1", optional: false},
                    "8100":                   {amount: "1", optional: true},
                    "Obj_Kopfdaten":          {amount: "1", optional: false},
                    "Obj_Patient":            {amount: "1", optional: false},
                    "Obj_Anforderung":        {amount: "1", optional: false},
                    "Obj_Basisdiagnostik":    {amount: "1", optional: true},
                    "Obj_Dauermedikament":    {amount: "1", optional: true},
                    "Obj_Dauerdiagnose":      {amount: "1", optional: true},
                    "Obj_Versichertenkarte":  {amount: "1", optional: true},
                    "Obj_Überweisung":        {amount: "1", optional: true},
                    "Obj_Diagnose":           {amount: "1", optional: true},
                    "Obj_Anhang":             {amount: "1", optional: true},
                    "Obj_Empfänger":          {amount: "1", optional: true},
                    "Obj_Arztidentifikation": {amount: "1", optional: true},
                    "8202":                   {amount: "1", optional: false}
                }
            },
            "6303": {
                desc: "Angeforderte Untersuchung stornieren", attribute: "studyDataCancel", fk: {
                    "8000":                   {amount: "1", optional: false},
                    "8100":                   {amount: "1", optional: true},
                    "Obj_Kopfdaten":          {amount: "1", optional: false},
                    "Obj_Patient":            {amount: "1", optional: false},
                    "Obj_Anforderung":        {amount: "1", optional: false},
                    "Obj_Basisdiagnostik":    {amount: "1", optional: true},
                    "Obj_Dauermedikament":    {amount: "1", optional: true},
                    "Obj_Dauerdiagnose":      {amount: "1", optional: true},
                    "Obj_Versichertenkarte":  {amount: "1", optional: true},
                    "Obj_Überweisung":        {amount: "1", optional: true},
                    "Obj_Diagnose":           {amount: "1", optional: true},
                    "Obj_Anhang":             {amount: "1", optional: true},
                    "Obj_Empfänger":          {amount: "1", optional: true},
                    "Obj_Arztidentifikation": {amount: "1", optional: true},
                    "8202":                   {amount: "1", optional: false}
                }
            },
            "6310": {
                desc: "Daten einer Untersuchung übermitteln", attribute: "studyData", fk: {
                    "8000":                   {amount: "1", optional: false},
                    "8100":                   {amount: "1", optional: true},
                    "Obj_Kopfdaten":          {amount: "1", optional: false},
                    "Obj_Patient":            {amount: "1", optional: false},
                    "Obj_Anforderung":        {amount: "1", optional: false},
                    "Obj_Basisdiagnostik":    {amount: "1", optional: true},
                    "Obj_Versichertenkarte":  {amount: "1", optional: true},
                    "Obj_Laborergebnis":      {amount: "1", optional: true},
                    "6200":                   {amount: "1", optional: true, children: {
                        "6205":               {amount: "n", optional: true},
                        "6206":               {amount: "1", optional: true, children: {
                            "6210":           {amount: "1", optional: false},
                            "6211":           {amount: "1", optional: false}}},
                        "6214":               {amount: "1", optional: true},
                        "6218":               {amount: "1", optional: true},
                        "6406":               {amount: "1", optional: true},
                        "6407":               {amount: "1", optional: true},
                        "6408":               {amount: "1", optional: true},
                        "6409":               {amount: "1", optional: true},
                        "6431":               {amount: "1", optional: true}}},
                    "6220":                   {amount: "n", optional: true},
                    "6221":                   {amount: "n", optional: true},
                    "6227":                   {amount: "n", optional: true},
                    "6226":                   {amount: "n", optional: true, children: {
                        "6228":               {amount: "n", optional: false}}},
                    "Obj_Anhang":             {amount: "1", optional: true},

                    //optimize?
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

                    "8402":                   {amount: "1", optional: true},
                    "8405":                   {amount: "1", optional: true},
                    "Obj_Arztidentifikation": {amount: "1", optional: true},
                    "8202":                   {amount: "1", optional: false}
                }
            },
            "6311": {
                desc: "Daten einer Untersuchung zeigen", attribute: "studyDataViewRequest", fk: {
                    "8000":                   {amount: "1", optional: false},
                    "8100":                   {amount: "1", optional: true},
                    "Obj_Kopfdaten":          {amount: "1", optional: false},
                    "Obj_Patient":            {amount: "1", optional: false},
                    "Obj_Anforderung":        {amount: "1", optional: false},
                    "4111":                   {amount: "1", optional: true},
                    "Obj_Arztidentifikation": {amount: "1", optional: true},
                    "8202":                   {amount: "1", optional: false}
                }
            }
        };
        gdt30.fields = {
            "0102": {  desc: "Softwareverantwortlicher (SV)",                              attribute: "sv",                             type: "string"  },
            "0103": {  desc: "Software",                                                   attribute: "sw",                             type: "string"  },
            "0132": {  desc: "Release-Stand der Software",                                 attribute: "swVersion",                      type: "string"  },
            "0201": {  desc: "(N)-BSNR",                                                   attribute: "bsnr",                           type: "number", len: "9"  },
            "0202": {  desc: "Name des Kostenträgers",                                     attribute: "payerName",                      type: "string"  },
            "0212": {  desc: "LANR",                                                       attribute: "lanr",                           type: "number", len: "9"  },
            "0950": {  desc: "Pharmazentralnummer Dauermedikament",                        attribute: "permMedPharmaCentNo",            type: "string"  },
            "0957": {  desc: "Darreichungsform Dauermedikament",                           attribute: "permMedAdminKind",               type: "string"  },
            "2002": {  desc: "Name des Kostenträgers",                                     attribute: "payerName",                      type: "string"  },
            "3000": {  desc: "Patientennummer / Patientenkennung",                         attribute: "patientId",                      type: "string"  },
            "3004": {  desc: "Kartentyp/-generation",                                      attribute: "cardType",                       type: "string"  },
            "3006": {  desc: "CDM Version",                                                attribute: "cardCdmVersion",                 type: "string"  },
            "3100": {  desc: "Namenszusatz / Vorsatzwort des Patienten",                   attribute: "patientNameAdd",                 type: "string"  },
            "3101": {  desc: "Name des Patienten",                                         attribute: "patientName",                    type: "string"  },
            "3102": {  desc: "Vorname des Patienten",                                      attribute: "patientForename",                type: "string"  },
            "3103": {  desc: "Geburtsdatum des Patienten",                                 attribute: "patientDob",                     type: "date",   len: "8", mapper: "date"  },
            "3104": {  desc: "Titel des Patienten",                                        attribute: "patientTitle",                   type: "string"  },
            "3105": {  desc: "Versichertennummer des Patienten",                           attribute: "patientInsNo",                   type: "string"  },
            "3106": {  desc: "Wohnort des Patienten",                                      attribute: "patientCity",                    type: "string"  },
            "3107": {  desc: "Straße des Patienten",                                       attribute: "patientStreet",                  type: "string"  },
            "3108": {  desc: "Versichertenart MFR",                                        attribute: "insuranceKind",                  type: "number", len: "1"  },
            "3110": {  desc: "Geschlecht des Patienten",                                   attribute: "patientGender",                  type: "number", len: "1", mapper: "gender"  },
            "3112": {  desc: "PLZ des Patienten",                                          attribute: "patientZip",                     type: "string"  },
            "3113": {  desc: "Wohnort des Patienten",                                      attribute: "patientCity",                    type: "string"  },
            "3114": {  desc: "Wohnsitzländercode",                                         attribute: "patientCountrycode",             type: "string"  },
            "3115": {  desc: "Anschriftenzusatz",                                          attribute: "patientLocationAddon",           type: "string"  },
            "3116": {  desc: "KV-Bereich",                                                 attribute: "patientKVArea",                  type: "number", len: "2"  },
            "3119": {  desc: "Versichertennummer eGK des Patienten",                       attribute: "patientInsuranceNo",             type: "string", len: "10"  },
            "3618": {  desc: "Mobiltelefonnummer des Patienten",                           attribute: "patientMobile",                  type: "string"  },
            "3619": {  desc: "Email-Adresse des Patienten",                                attribute: "patientEmail",                   type: "string"  },
            "3622": {  desc: "Größe des Patienten",                                        attribute: "patientHeight",                  type: "float", mapper: "cm"  },
            "3623": {  desc: "Gewicht des Patienten",                                      attribute: "patientWeight",                  type: "float", mapper: "kg"  },
            "3626": {  desc: "Telefonnummer des Patienten",                                attribute: "patientPhone",                   type: "string"  },
            "3628": {  desc: "Muttersprache des Patienten",                                attribute: "patientNativelang",              type: "string"  },
            "3649": {  desc: "Dauerdiagnose ab Datum",                                     attribute: "permDiagStartDate",              type: "date",   len: "8", mapper: "date"  },
            "3650": {  desc: "Dauerdiagnose",                                              attribute: "permDiagName",                   type: "string"  },
            "3651": {  desc: "Dauermedikament ab Datum",                                   attribute: "permMedStartDate",               type: "date",   len: "8", mapper: "date"  },
            "3652": {  desc: "Dauermedikament",                                            attribute: "permMedName",                    type: "string"  },
            "3654": {  desc: "Risikofaktoren",                                             attribute: "riskFactors",                    type: "string"  },
            "3656": {  desc: "Allergien",                                                  attribute: "allergies",                      type: "string"  },
            "3658": {  desc: "Unfälle",                                                    attribute: "accidents",                      type: "string"  },
            "3660": {  desc: "Operationen",                                                attribute: "surgicalOps",                    type: "string"  },
            "3662": {  desc: "Anamnese",                                                   attribute: "anamnesis",                      type: "string"  },
            "3664": {  desc: "Anzahl Geburten",                                            attribute: "numberOfBirths",                 type: "number"  },
            "3666": {  desc: "Anzahl Kinder",                                              attribute: "numberOfChildren",               type: "number"  },
            "3668": {  desc: "Anzahl Schwangerschaften",                                   attribute: "numberOfPregnancies",            type: "number"  },
            "3670": {  desc: "Dauertherapie",                                              attribute: "permTherapy",                    type: "string"  },
            "3672": {  desc: "Kontrolltermine",                                            attribute: "followupAppointment",            type: "date",   len: "8", mapper: "date"  },
            "3673": {  desc: "Dauerdiagnose ICD-Code",                                     attribute: "permDiagICD",                    type: "string", len: "3,5,6"  },
            "3674": {  desc: "Diagnosesicherheit Dauerdiagnose",                           attribute: "permDiagConfidence",             type: "string", len: "1"  },
            "3675": {  desc: "Seitenlokalisation Dauerdiagnose",                           attribute: "permDiagBodySideLoc",            type: "string", len: "1"  },
            "3676": {  desc: "Diagnoseerläuterung Dauerdiagnose",                          attribute: "permDiagExplanation",            type: "string"  },
            "3677": {  desc: "Diagnoseausnahmetatbestand Dauerdiagnose",                   attribute: "permDiagDerogation",             type: "string"  },
            "3700": {  desc: "Bezeichnung der basisdiagnostischen Kategorie",              attribute: "basicDiagCategoryLabel",         type: "string"  },
            "3701": {  desc: "Inhalt der basisdiagnostischen Kategorie",                   attribute: "basicDiagCategoryContent",       type: "string"  },
            "4104": {  desc: "VKNR",                                                       attribute: "insuranceVKNR",                  type: "number", len: "5"  },
            "4106": {  desc: "Kostenträger-Abrechnungsgebiet",                             attribute: "payerBillingArea",               type: "number", len: "2"  },
            "4109": {  desc: "Letzter Einlesetag der Versichertenkarte im Quartal",        attribute: "insurancelastCardReadOfQuarter", type: "date",   len: "8", mapper: "date"  },
            "4110": {  desc: "Bis-Datum der Gültigkeit",                                   attribute: "insuranceValidToDate",           type: "shortDate", len: "4"  },
            "4111": {  desc: "Krankenkassennummer (KIK)",                                  attribute: "insuranceNo",                    type: "number", len: "7"  },
            "4112": {  desc: "Versichertenstatus KVK",                                     attribute: "insuranceStatus",                type: "number", len: "4"  },
            "4113": {  desc: "Statusergänzung / DMP-Kennzeichnung",                        attribute: "insuranceStatusAdditionDMP",     type: "string", len: "1"  },
            "4121": {  desc: "Gerbührenzuordnung",                                         attribute: "insuranceFeeSchedule",           type: "number", len: "1"  },
            "4122": {  desc: "Abrechnungsgebiet",                                          attribute: "insuranceBillingArea",           type: "number", len: "2"  },
            "4200": {  desc: "Terminwunsch",                                               attribute: "desiredDate",                    type: "date", mapper: "date"  },
            "4202": {  desc: "Unfall, Unfallfolgen",                                       attribute: "accident_consequences",          type: "number", len: "1"  },
            "4203": {  desc: "Behandlung gem. § 116b SGB Vn",                              attribute: "accident_consequences",          type: "number", len: "1"  },
            "4204": {  desc: "Eingeschränkter Leistungsanspruch gem. § 18 Abs. 3a SGB V",  attribute: "treatmentAccordingToSGBV",       type: "number", len: "1"  },
            "4205": {  desc: "Auftrag",                                                    attribute: "assignment",                     type: "string"  },
            "4207": {  desc: "Diagnose / Verdachtsdiagnose",                               attribute: "diagnosis_suspected",            type: "string"  },
            "4208": {  desc: "Befund / Medikation",                                        attribute: "findings_Medication",            type: "string"  },
            "4209": {  desc: "Auftrag / Diagnose / Verdacht",                              attribute: "assigment_diag_suspicion",       type: "string"  },
            "4217": {  desc: "(N)BSNR (Nebenbetriebsstätten-nummer) des Erstveranlassers", attribute: "initiatorBSNR",                  type: "number", len: "9"  },
            "4218": {  desc: "(N)BSNR des Überweisers",                                    attribute: "refBSNR",                        type: "number", len: "9"  },
            "4219": {  desc: "Überweisung von anderen Ärzten",                             attribute: "refFromOther",                   type: "string"  },
            "4220": {  desc: "Überweisung an",                                             attribute: "refTo",                          type: "string"  },
            "4221": {  desc: "Behandlungstyp",                                             attribute: "treatmentType",                  type: "number", len: "1"  },
            "4229": {  desc: "Ausnahmeindikation",                                         attribute: "exceptionalMedIndication",       type: "number", len: "5"  },
            "4231": {  desc: "Kontrolluntersuchung einer bekannten Infektion",             attribute: "followUpOfKnownInfection",       type: "number", len: "1"  },
            "4237": {  desc: "Krankenhaus-Name",                                           attribute: "HospName",                       type: "string"  },
            "4241": {  desc: "LANR (lebenslange Arztnummer) des Erstveranlassers",         attribute: "initiatorLANR",                  type: "number", len: "9"  },
            "4242": {  desc: "LANR des überweisers",                                       attribute: "refLANR",                        type: "number", len: "9"  },
            "6001": {  desc: "ICD-Code",                                                   attribute: "icd",                            type: "string", len: "3,5,6"  },
            "6003": {  desc: "Diagnosesicherheit",                                         attribute: "confidence",                     type: "string", len: "1"  },
            "6004": {  desc: "Seitenlokalisation",                                         attribute: "bodySideLoc",                    type: "string", len: "1"  },
            "6006": {  desc: "Diagnoseerläuterung",                                        attribute: "explanation",                    type: "string"  },
            "6008": {  desc: "Diagnoseausnahmetatbestand",                                 attribute: "derogation",                     type: "string"  },
            "6200": {  desc: "Tag der Speicherung von Behandlungsdaten",                   attribute: "treatmentdata",                  type: "date",   len: "8", mapper: "dateTime"  },
            "6201": {  desc: "Uhrzeit der Erhebung von Behandlungsdaten",                  attribute: "treatmentdata",                  type: "time",   len: "6", mapper: "dateTime"  },
            "6205": {  desc: "Aktuelle Diagnose",                                          attribute: "curDiag",                        type: "string"  },
            "6206": {  desc: "Pharmazentralnummer (PZN)",                                  attribute: "pzn",                            type: "string"  },
            "6210": {  desc: "Medikament verordnet auf Rezept",                            attribute: "prescMed",                       type: "string"  },
            "6211": {  desc: "Außerhalb Rezept verordnetes Medikament",                    attribute: "noprescMed",                     type: "string"  },
            "6214": {  desc: "Anzahl Packungen (Faktor)",                                  attribute: "medNumOfPackages",               type: "string", len: "3"  },
            "6218": {  desc: "Angabe zu Einnahme",                                         attribute: "medInfoIntake",                  type: "string"  },
            "6220": {  desc: "Befund",                                                     attribute: "report",                         type: "string"  },
            "6221": {  desc: "Fremdbefund",                                                attribute: "forReport",                      type: "string"  },
            "6226": {  desc: "Ergebnistabellentext, formatiert",                           attribute: "resTextAmount",                  type: "number", mapper: "resText"  },
            "6227": {  desc: "Kommentar",                                                  attribute: "comment",                        type: "string"  },
            "6228": {  desc: "Ergebnistabellentext, formatiert",                           attribute: "resTextValues",                  type: "string", mapper: "resText"  },
            "6302": {  desc: "Datei-Archivierungskennung",                                 attribute: "fileArchiveLabel",               type: "string"  },
            "6303": {  desc: "Dateiformat",                                                attribute: "fileFormat",                     type: "string"  },
            "6304": {  desc: "Dateiinhalt",                                                attribute: "fileContentDesc",                type: "string"  },
            "6305": {  desc: "Verweis auf Datei",                                          attribute: "fileRef",                        type: "string"  },
            "6329": {  desc: "Inhalt der Datei als BASE64-kodierte Anlage",                attribute: "fileDataBase64",                 type: "string"  },

            "6330": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6331": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6332": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6333": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6334": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6335": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6336": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6337": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6338": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6339": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6340": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6341": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6342": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6343": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6344": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6345": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6346": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6347": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6348": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6349": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6350": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6351": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6352": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6353": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6354": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6355": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6356": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6357": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6358": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6359": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6360": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6361": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6362": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6363": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6364": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6365": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6366": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6367": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6368": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6369": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6370": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6371": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6372": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6373": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6374": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6375": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6376": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6377": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6378": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6379": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6380": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6381": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6382": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6383": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6384": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6385": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6386": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6387": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6388": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6389": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6390": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6391": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6392": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6393": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6394": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6395": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6396": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6397": {  desc: "Inhalt", attribute: "content", type: "string"  },
            "6398": {  desc: "Freie Kategorie", attribute: "freeCat", type: "string", mapper: "freeCat"  },    "6399": {  desc: "Inhalt", attribute: "content", type: "string"  },

            "6406": {  desc: "Gebührenfrei",                                          attribute: "freeOfCharge",                type: "number", len: "1"  },
            "6407": {  desc: "Noctu",                                                 attribute: "noctu",                       type: "number", len: "1"  },
            "6408": {  desc: "BVG",                                                   attribute: "bvg",                         type: "number", len: "1"  },
            "6409": {  desc: "Unfall",                                                attribute: "accident",                    type: "number", len: "1"  },
            "6431": {  desc: "Auf Idem",                                              attribute: "onIdem",                      type: "number", len: "1"  },
            "8000": {  desc: "Satzidentifikation",                                    attribute: "recordType",                  type: "string", len: "4", mapper: "satzID"  },
            "8100": {  desc: "Satzlänge",                                             attribute: "recordSize",                  type: "number", len: "7", mapper: "byte"  },
            "8200": {  desc: "Objekt-Ident",                                          attribute: "objType",                     type: "string"  },
            "8201": {  desc: "Objektende",                                            attribute: "objEntries",                  type: "number"  },
            "8202": {  desc: "Anzahl Einträge",                                       attribute: "recordEntries",               type: "number"  },
            "8310": {  desc: "Anforderungs-Ident",                                    attribute: "recordRequestId",             type: "string"  },
            "8314": {  desc: "Anforderungs-UID",                                      attribute: "recordRequestUid",            type: "string"  },
            "8315": {  desc: "GDT-ID des Empfängers",                                 attribute: "receiverGdtId",               type: "string"  },
            "8316": {  desc: "GDT-ID des Senders",                                    attribute: "senderGdtId",                 type: "string"  },
            "8402": {  desc: "Geräte und verfahrensspezifisches Kennfeld",            attribute: "procedure",                   type: "string", mapper: "procedure"  },
            "8403": {  desc: "Gebührenordnung",                                       attribute: "feeSchedule",                 type: "string", len: "1"  },
            "8404": {  desc: "Unterkategorie zur KF 8402",                            attribute: "subcat8402",                  type: "string"  },
            "8405": {  desc: "Probe",                                                 attribute: "sample",                      type: "string"  },
            "8406": {  desc: "Datum",                                                 attribute: "sampleDate",                  type: "string"  },
            "8407": {  desc: "Uhrzeit",                                               attribute: "sampleTime",                  type: "string", len: "1"  },
            "8410": {  desc: "Test(s)",                                               attribute: "sampleId",                    type: "string"  },
            "8411": {  desc: "Testbezeichnung",                                       attribute: "sampleLabel",                 type: "string"  },
            "8412": {  desc: "Test-OID",                                              attribute: "sampleOid",                   type: "string"  },
            "8413": {  desc: "Test-Geráte-OID",                                       attribute: "sampleDevOid",                type: "string"  },
            "8417": {  desc: "Datenstrom (als Einzelwerte)",                          attribute: "sampleDataStream",            type: "string", len: "1"  },
            "8418": {  desc: "Teststatus",                                            attribute: "sampleStatus",                type: "string", len: "1"  },
            "8420": {  desc: "Ergebnis-Wert",                                         attribute: "sampleResultVal",             type: "float"  },
            "8421": {  desc: "Einheit",                                               attribute: "sampleResultUnit",            type: "string"  },
            "8425": {  desc: "Budget-frei",                                           attribute: "budgetFree",                  type: "number", len: "1"  },
            "8428": {  desc: "Probenmaterial-Ident",                                  attribute: "sampleId",                    type: "string"  },
            "8429": {  desc: "Probenmaterial-Index",                                  attribute: "sampleIndex",                 type: "number", len: "2"  },
            "8430": {  desc: "Probenmaterial-Bezeichnung",                            attribute: "sampleLabel",                 type: "string"  },
            "8431": {  desc: "Probenmaterial-Spezifikation",                          attribute: "sampleSpec",                  type: "string"  },
            "8432": {  desc: "Abnahme-Datum",                                         attribute: "sampleCollDate",              type: "date",   len: "8", mapper: "dateTime"  },
            "8433": {  desc: "Abnahme-Zeit",                                          attribute: "sampleCollDate",              type: "time",   len: "6", mapper: "dateTime"  },
            "8437": {  desc: "Einheit(en) für Datenstrom",                            attribute: "dataStreamUnits",             type: "string"  },
            "8438": {  desc: "Datenstrom",                                            attribute: "dataStream",                  type: "string"  },
            "8439": {  desc: "Abnahme-Zeit",                                          attribute: "collDate",                    type: "time",   len: "6", mapper: "time"  },
            "8460": {  desc: "Normalwert-Text",                                       attribute: "sampleNormalValueText",       type: "string"  },
            "8461": {  desc: "Normalwert untere Grenze",                              attribute: "sampleNormalValueLowerBound", type: "float"  },
            "8462": {  desc: "Normalwert obere Grenze",                               attribute: "sampleNormalValueUpperBound", type: "float"  },
            "8470": {  desc: "Testbezogene Hinweise",                                 attribute: "sampleTestNotes",             type: "string"  },
            "8480": {  desc: "Ergebnis-Text",                                         attribute: "sampleResultText",            type: "string"  },
            "8501": {  desc: "Dringlichkeitsstatus",                                  attribute: "sampleUrgency",               type: "string"  },
            "8504": {  desc: "Medikamenteneinnahme zum Zeitpunkt der Probenentnahme", attribute: "sampleIntakeMedication",      type: "string"  },
            "8510": {  desc: "Schwangerschaft",                                       attribute: "pregnancy",                   type: "num", len: "1"  },
            "8511": {  desc: "Schwangerschaftsdauer (in Wochen, Tage)",               attribute: "pregnancyGestationLen",       type: "num", len: "3"  },
            "8512": {  desc: "1. Tag des Zyklus",                                     attribute: "pregnancyFirstDayOfCycle",    type: "date",   len: "8", mapper: "date"  },
            "8601": {  desc: "Name des Rechnungsempfängers",                          attribute: "recipientName",               type: "string"  },
            "8602": {  desc: "Titel, Vorname des Rechnungsempfängers",                attribute: "recipientTitleForename",      type: "string"  },
            "8606": {  desc: "Wohnort des Rechnungsempfängers",                       attribute: "recipientCity",               type: "string"  },
            "8607": {  desc: "Straße des Rechnungsempfängers",                        attribute: "recipientStreetHouseno",      type: "string"  },
            "8608": {  desc: "Kommentar / Aktenzeichen",                              attribute: "Comment_RefNumber",           type: "string"  },
            "8609": {  desc: "Abrechnungstyp",                                        attribute: "billingType",                 type: "string", len: "1"  },
            "8610": {  desc: "Privattarif",                                           attribute: "privateCharges",              type: "number", len: "1"  },
            "8615": {  desc: "Auftraggeber",                                          attribute: "client",                      type: "string"  },
            "8990": {  desc: "Signatur (Namenszeichen)",                              attribute: "signature",                   type: "string"  },
            "9103": {  desc: "Datum der Erstellung",                                  attribute: "dateOfCreation",              type: "date",   len: "8", mapper: "date"  },
            "9152": {  desc: "Zähler URL",                                            attribute: "urlCounter",                  type: "number", len: "4"  },
            "9153": {  desc: "Beschreibung URL",                                      attribute: "urlDescription",              type: "string"  },
            "9154": {  desc: "URL",                                                   attribute: "url",                         type: "string"  },
            "9206": {  desc: "Verwendeter Zeichensatz",                               attribute: "encoding",                    type: "encoding", len: "1"  },
            "9218": {  desc: "Version GDT",                                           attribute: "gdtVersion",                  type: "string", len: "5"  },
            "9901": {  desc: "Systeminterner Parameter",                              attribute: "systemInternalParameter",     type: "string"  },
            "0000": {  desc: "invalid field", attribute: "invalid", type: "string"  }
        };
        gdt30.objects = {//TODO: p41 hierarchy option?
            "Obj_Kopfdaten": {desc: "Kopfdaten", fk: {
                "8200": {amount: "1", optional: false},
                "8315": {amount: "1", optional: true},
                "8316": {amount: "1", optional: true},
                "9103": {amount: "1", optional: true},
                "9206": {amount: "1", optional: true},
                "9218": {amount: "1", optional: false},
                "0102": {amount: "1", optional: true},
                "0103": {amount: "1", optional: true},
                "0132": {amount: "1", optional: true},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Patient": {desc: "Patient", fk: {
                "8200": {amount: "1", optional: false},
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
                "3112": {amount: "1", optional: true},
                "3113": {amount: "1", optional: true},
                "3114": {amount: "1", optional: true},
                "3116": {amount: "1", optional: true},
                "3119": {amount: "1", optional: true},
                "3618": {amount: "1", optional: true},
                "3619": {amount: "1", optional: true},
                "3626": {amount: "n", optional: true},
                "3628": {amount: "1", optional: true},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Anforderung": {desc: "Anforderung", fk: {
                "8200": {amount: "1", optional: false},
                "6200": {amount: "1", optional: true},
                "6201": {amount: "1", optional: true},
                "8310": {amount: "1", optional: false},
                "8314": {amount: "1", optional: false},
                "8402": {amount: "1", optional: false},
                "8410": {amount: "1", optional: true},
                "8432": {amount: "1", optional: true},
                "8439": {amount: "1", optional: true},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Basisdiagnostik": {desc: "Basisdiagnostik", fk: {
                "8200":     {amount: "1", optional: false},
                "3622":     {amount: "1", optional: true},
                "3623":     {amount: "1", optional: true},
                "3654":     {amount: "n", optional: true},
                "3656":     {amount: "n", optional: true},
                "3658":     {amount: "n", optional: true},
                "3660":     {amount: "n", optional: true},
                "3662":     {amount: "n", optional: true},
                "3664":     {amount: "1", optional: true},
                "3666":     {amount: "1", optional: true},
                "3668":     {amount: "1", optional: true},
                "3670":     {amount: "1", optional: true},
                "3672":     {amount: "n", optional: true},
                "3678":     {amount: "n", optional: true},
                "3700":     {amount: "n", optional: true, children: {
                    "3701": {amount: "1", optional: true}}},
                "8201":     {amount: "1", optional: false}
            }},
            "Obj_Dauermedikament": {desc: "Dauermedikament", fk: {
                "8200":         {amount: "1", optional: false},
                "3651":         {amount: "n", optional: true, children: {
                    "3652":     {amount: "n", optional: false, children: {
                        "0950": {amount: "1", optional: false},
                        "0957": {amount: "1", optional: true}}}}},
                "8201":         {amount: "1", optional: false}
            }},
            "Obj_Dauerdiagnose": {desc: "Dauerdiagnose", fk: {
                "8200":         {amount: "1", optional: false},
                "3649":         {amount: "n", optional: true, children: {
                    "3650":     {amount: "n", optional: false},
                    "3673":     {amount: "n", optional: false, children: {
                        "3674": {amount: "1", optional: false},
                        "3675": {amount: "1", optional: true},
                        "3676": {amount: "n", optional: true},
                        "3677": {amount: "n", optional: true}}}}},
                "8201":         {amount: "1", optional: false}
            }},
            "Obj_Versichertenkarte": {desc: "Versichertenkarte", fk: {
                "8200": {amount: "1", optional: false},
                "2002": {amount: "1", optional: false},
                "3004": {amount: "1", optional: false},
                "3006": {amount: "1", optional: false},
                "4104": {amount: "1", optional: false},
                "4106": {amount: "1", optional: false},
                "4109": {amount: "1", optional: false},
                "4110": {amount: "1", optional: false},
                "4111": {amount: "1", optional: false},
                "4112": {amount: "1", optional: false},
                "4113": {amount: "1", optional: false},
                "4121": {amount: "1", optional: false},
                "4122": {amount: "1", optional: false},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Überweisung": {desc: "Überweisung", fk: {
                "8200":     {amount: "1", optional: false},
                "4202":     {amount: "1", optional: true},
                "4203":     {amount: "1", optional: true},
                "4204":     {amount: "1", optional: true},
                "4205":     {amount: "n", optional: false},
                "4207":     {amount: "n", optional: true},
                "4208":     {amount: "n", optional: true},
                "4209":     {amount: "1", optional: false},
                "4217":     {amount: "1", optional: true, children: {
                    "4241": {amount: "1", optional: true}}},
                "4218":     {amount: "1", optional: false, children: {
                    "4242": {amount: "1", optional: false}}},
                "4219":     {amount: "1", optional: false},
                "4220":     {amount: "1", optional: false},
                "4221":     {amount: "1", optional: true},
                "4229":     {amount: "1", optional: true},
                "4231":     {amount: "1", optional: true},
                "8201":     {amount: "1", optional: false}
            }},
            "Obj_Einweisung": {desc: "Einweisung", fk: {//"Muster 2" - unused?
                "8200":     {amount: "1", optional: false},
                "4202":     {amount: "1", optional: true},
                "4205":     {amount: "n", optional: false},
                "4207":     {amount: "n", optional: true},
                "4208":     {amount: "n", optional: true},
                "4209":     {amount: "1", optional: false},
                "4218":     {amount: "1", optional: false, children: {
                    "4242": {amount: "1", optional: false}}},
                "4237":     {amount: "1", optional: true},
                "8201":     {amount: "1", optional: false}
            }},
            "Obj_Diagnose": {desc: "Diagnose", fk: {
                "8200":     {amount: "1", optional: false},
                "6001":     {amount: "n", optional: false, children: {
                    "6003": {amount: "1", optional: false},
                    "6004": {amount: "1", optional: true},
                    "6006": {amount: "n", optional: true},
                    "6008": {amount: "n", optional: false},
                    "6205": {amount: "1", optional: true}}},
                "8201":     {amount: "1", optional: false}
            }},
            "Obj_Anhang": {desc: "Anhang", fk: {
                "8200":     {amount: "1", optional: false},
                "6302":     {amount: "n", optional: true, children: {
                    "6303": {amount: "1", optional: false},
                    "6304": {amount: "1", optional: false},
                    "6305": {amount: "1", optional: false},
                    "6329": {amount: "n", optional: false}}},
                "8201":     {amount: "1", optional: false}
            }},
            "Obj_Laborinformation": {desc: "Laborinformation", fk: {
                "8200": {amount: "1", optional: false},
                "8402": {amount: "1", optional: true},
                "8403": {amount: "1", optional: true},
                "8405": {amount: "1", optional: true},
                "8407": {amount: "1", optional: true},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Labortest": {desc: "Labortest", fk: {
                "8200":     {amount: "1", optional: false},
                "8410":     {amount: "1", optional: true},
                "8411":     {amount: "1", optional: true, children: {
                    "8412": {amount: "1", optional: true},
                    "8413": {amount: "1", optional: true}}},
                "8425":     {amount: "1", optional: true},
                "8428":     {amount: "1", optional: true},
                "8429":     {amount: "1", optional: true},
                "8432":     {amount: "1", optional: true},
                "8433":     {amount: "1", optional: true},
                "8501":     {amount: "1", optional: true},
                "8504":     {amount: "n", optional: true},
                "8510":     {amount: "1", optional: true, children: {
                    "8511": {amount: "1", optional: true}}},
                "8512":     {amount: "1", optional: true},
                "8201":     {amount: "1", optional: false}
            }},
            "Obj_RgEmpfänger": {desc: "RgEmpfänger", fk: {
                "8200": {amount: "1", optional: false},
                "8601": {amount: "1", optional: false},
                "8602": {amount: "1", optional: false},
                "8606": {amount: "1", optional: false},
                "8607": {amount: "1", optional: false},
                "8608": {amount: "1", optional: true},
                "8609": {amount: "1", optional: false},
                "8610": {amount: "1", optional: false},
                "8615": {amount: "1", optional: true},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Empfänger": {desc: "Empfänger", fk: {
                "8200": {amount: "1", optional: false},
                "8601": {amount: "1", optional: false},
                "8602": {amount: "1", optional: false},
                "8606": {amount: "1", optional: false},
                "8607": {amount: "1", optional: false},
                "8608": {amount: "1", optional: true},
                "8609": {amount: "1", optional: false},
                "8610": {amount: "1", optional: false},
                "8615": {amount: "1", optional: true},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Laborergebnis": {desc: "Laborergebnis", fk: {
                "8200":         {amount: "1", optional: false},
                "8410":         {amount: "n", optional: false, children: {
                    "8411":     {amount: "1", optional: true},
                    "8412":     {amount: "1", optional: true},
                    "8413":     {amount: "1", optional: true},
                    "8428":     {amount: "1", optional: true},
                    "8429":     {amount: "1", optional: true},
                    "8430":     {amount: "1", optional: true, children: {
                        "8431": {amount: "n", optional: true}}},
                    "8437":     {amount: "1", optional: false},
                    "8438":     {amount: "n", optional: true},
                    "8418":     {amount: "1", optional: false},
                    "8420":     {amount: "1", optional: true},
                    "8421":     {amount: "1", optional: false},
                    "8432":     {amount: "1", optional: true},
                    "8439":     {amount: "1", optional: true},
                    "8460":     {amount: "1", optional: true},
                    "8461":     {amount: "1", optional: true},
                    "8462":     {amount: "1", optional: true},
                    "8470":     {amount: "n", optional: true},
                    "8480":     {amount: "n", optional: true}}},
                "8201":         {amount: "1", optional: false}
            }},
            "Obj_Terminanfrage": {desc: "Terminanfrage", fk: {
                "8200": {amount: "1", optional: false},
                "4200": {amount: "1", optional: false},
                "4205": {amount: "n", optional: true},
                "4207": {amount: "n", optional: true},
                "4237": {amount: "1", optional: true},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Satzende": {desc: "Satzende", fk: {
                "8200": {amount: "1", optional: false},
                "8202": {amount: "1", optional: false},
                "8201": {amount: "1", optional: false}
            }},
            "Obj_Arztidentifikation": {desc: "Arztidentifikation", fk: {
                "8200": {amount: "1", optional: false},
                "0201": {amount: "1", optional: false},
                "0212": {amount: "1", optional: false},
                "8990": {amount: "1", optional: false},
                "8201": {amount: "1", optional: false}
            }}
        };
        gdt30.procedures = {
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
        gdt30.stringMappers = {
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
                return [propInfo.desc, gdt30.saetze[prop].desc];
            },
            procedure: function(prop, propInfo) {
                var proc = gdt30.procedures[prop];
                return [propInfo.desc, proc?"["+prop+"] "+proc.group+": "+proc.desc:prop];
            },
            resText: function(prop) {
                var ret = "";
                for(let i = 0; i < prop.resTextValues.length; i++) {
                    ret += (i>0?'\n    ':"") + prop.resTextValues[i];
                }
                return [ret];
            },
            freeCat: function(prop) {
                return [prop.head, prop.content];
            }
        };

        Y.namespace( 'doccirrus.api.xdtVersions.gdt' ).gdt30 = gdt30;

    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
