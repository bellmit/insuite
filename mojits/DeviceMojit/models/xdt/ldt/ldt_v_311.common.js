/**
 * User: jm
 * Date: 10-10-17  16:42
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */

YUI.add( 'ldt_v_311', function( Y ) {

        var
            moment = Y.doccirrus.commonutils.getMoment(),
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

        /**
         * creates a basic mapper in the style of "Test Status: [A] Analytik abgeschlossen"
         *
         * @method basicMapper
         * @param {object} map containing the field values as keys e.g. { A: "Analytik abgeschlossen" }
         * @returns {function}
         */
        function basicMapper( map ) {
            return function( prop, propInfo ) {
                if( prop.head ) {
                    prop = prop.head;
                }
                return [propInfo && propInfo.desc, '['+prop+'] '+map[prop] || "unbekannt", true];
            };
        }

        function basicMapperDescLess( map ) {
            return function( prop ) {
                if( prop.head ) {
                    prop = prop.head;
                }
                return ['['+prop+'] '+map[prop] || "unbekannt", undefined, true];
            };
        }

        var ldt311 = {};

        ldt311.type = "ldt";
        ldt311.name = "ldt311";
        ldt311.version = "LDT3.1.1";
        ldt311.versionField = "0001";
        ldt311.acceptedVersions = ["LDT3.1.1"];

        ldt311.dateFormat = "YYYYMMDD";
        ldt311.shortDateFormat = "YYMM";
        ldt311.timeFormat = "HHmmssSSS";

        ldt311.fileNameFormat = /^Z01.+\.ldt$/;

        ldt311.sizeCounter = 1; //1 byte for the counter
        ldt311.sizeLabel = 3; //3 bytes for the Label: B00/B01/B02
        ldt311.sizeDataField = 60; //128 bytes for field content
        ldt311.sizeCrc16 = 4;
        ldt311.sizeLen = 3;
        ldt311.sizeRecLen = 5;
        ldt311.sizefileLen = 8;
        ldt311.sizeSatz = 4;
        ldt311.sizeFk = 4;

        ldt311.encodings = ["ISO 8859-15"];
        ldt311.encodingField = "9106";

        ldt311.serialCr = "[CR]"; //0x0D
        ldt311.serialNewLineReplacement = "[FS]"; //0x1C

        ldt311.recordType = "8000";
        ldt311.recordEnd = "8001";
        // ldt311.recordSize = "8100";
        ldt311.objType = "8002";
        ldt311.objEnd = "8003"; //no length content
        // ldt311.objEntries = "8003";
        // ldt311.recordLength = "9202";

        ldt311.objectStyle = "ldt30";

        ldt311.Satzordnung = {
            auftrag: /8230,(8215,)+8231/g,
            befund: /8220,(8205,)+8221/g
        };

        ldt311.saetze = {
            "8205": {
                desc: "Befund", attribute: "finding", fk: {
                    "fk8000": {
                        amount: "1", optional: false, children: {
                            "fk8136": {
                                amount: "n", optional: true, children: {
                                    "Obj_0036": {amount: "1", optional: false}
                                }
                            },
                            "fk8122": {
                                amount: "1", optional: false, children: {
                                    "Obj_0022": {amount: "1", optional: false}
                                }
                            },
                            "fk8145": {
                                amount: "1", optional: true, children: {
                                    "Obj_0045": {amount: "1", optional: false}
                                }
                            },
                            "fk8169": {
                                amount: "1", optional: true, children: {
                                    "Obj_0069": {amount: "1", optional: false}
                                }
                            },
                            "fk8150": {
                                amount: "1", optional: true, children: {
                                    "Obj_0050": {amount: "1", optional: false}
                                }
                            },
                            "fk8140": {
                                amount: "1", optional: true, children: {
                                    "Obj_0040": {amount: "1", optional: false}
                                }
                            },
                            "fk8153": {
                                amount: "1", optional: true, children: {
                                    "Obj_0053": {amount: "1", optional: false}
                                }
                            },
                            "fk8117": {
                                amount: "1", optional: false, children: {
                                    "Obj_0017": {amount: "1", optional: false}
                                }
                            },
                            "fk8127": {
                                amount: "n", optional: true, children: {
                                    "Obj_0027": {amount: "1", optional: false}
                                }
                            },
                            "fk8137": {
                                amount: "n", optional: false, children: {
                                    "Obj_0037": {amount: "1", optional: false}
                                }
                            },
                            "fk8135": {
                                amount: "1", optional: false, children: {
                                    "Obj_0035": {amount: "1", optional: false}
                                }
                            },
                            "fk8167": {
                                amount: "n", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            },
                            "fk8110": {
                                amount: "n", optional: true, children: {
                                    "Obj_0010": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8001": {amount: "1", optional: false}
                }
            },
            "8215": {
                desc: "Auftrag", attribute: "request", fk: {
                    "fk8000": {
                        amount: "1", optional: false, children: {
                            "fk8122": {
                                amount: "1", optional: false, children: {
                                    "Obj_0022": {amount: "1", optional: false}
                                }
                            },
                            "fk8145": {
                                amount: "1", optional: true, children: {
                                    "Obj_0045": {amount: "1", optional: false}
                                }
                            },
                            "fk8169": {
                                amount: "1", optional: true, children: {
                                    "Obj_0069": {amount: "1", optional: false}
                                }
                            },
                            "fk8150": {
                                amount: "1", optional: true, children: {
                                    "Obj_0050": {amount: "1", optional: false}
                                }
                            },
                            "fk8140": {
                                amount: "1", optional: true, children: {
                                    "Obj_0040": {amount: "1", optional: false}
                                }
                            },
                            "fk8153": {
                                amount: "1", optional: true, children: {
                                    "Obj_0053": {amount: "1", optional: false}
                                }
                            },
                            "fk8113": {
                                amount: "1", optional: true, children: {
                                    "Obj_0013": {amount: "1", optional: false}
                                }
                            },
                            "fk8127": {
                                amount: "n", optional: true, children: {
                                    "Obj_0027": {amount: "1", optional: false}
                                }
                            },
                            "fk8101": {
                                amount: "1", optional: false, children: {
                                    "Obj_0001": {amount: "1", optional: false}
                                }
                            },
                            "fk8137": {
                                amount: "n", optional: false, children: {
                                    "Obj_0037": {amount: "1", optional: false}
                                }
                            },
                            "fk8159": {
                                amount: "n", optional: true, children: {
                                    "Obj_0059": {amount: "1", optional: false}
                                }
                            },
                            "fk8167": {
                                amount: "n", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            },
                            "fk8110": {
                                amount: "n", optional: true, children: {
                                    "Obj_0010": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8001": {amount: "1", optional: false}
                }
            },
            "8220": {
                desc: "L-Datenpaket-Header", attribute: "lPackageHeader", fk: {
                    "fk8000": {
                        amount: "1", optional: false, children: {
                            "fk8132": {
                                amount: "1", optional: false, children: {
                                    "Obj_0032": {amount: "1", optional: false}
                                }
                            },
                            "fk8136": {
                                amount: "1", optional: false, children: {
                                    "Obj_0036": {amount: "1", optional: false}
                                }
                            },
                            "fk8119": {
                                amount: "1", optional: false, children: {
                                    "Obj_0019": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8001": {amount: "1", optional: false}
                }
            },
            "8221": {
                desc: "L-Datenpaket-Abschluss", attribute: "lPackageFooter", fk: {
                    "fk8000": {
                        amount: "1", optional: false, children: {
                            "fk9300": {amount: "1", optional: false}
                        }
                    },
                    "fk8001": {amount: "1", optional: false}
                }
            },
            "8230": {
                desc: "P-Datenpaket-Header", attribute: "pPackageHeader", fk: {
                    "fk8000": {
                        amount: "1", optional: false, children: {
                            "fk8132": {
                                amount: "1", optional: false, children: {
                                    "Obj_0032": {amount: "1", optional: false}
                                }
                            },
                            "fk7265": {amount: "1", optional: false},
                            "fk8122": {
                                amount: "1", optional: false, children: {
                                    "Obj_0022": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8001": {amount: "1", optional: false}
                }
            },
            "8231": {
                desc: "P-Datenpaket-Abschluss", attribute: "pPackageFooter", fk: {
                    "fk8000": {
                        amount: "1", optional: false, children: {
                            "fk9300": {amount: "1", optional: false}
                        }
                    },
                    "fk8001": {amount: "1", optional: false}
                }
            }
        };
        ldt311.fields = {
            "0001": {  desc: "Version XDT",                                                             attribute: "xdtVersion",                        type: "string", len: "<=12"},
            "0080": {  desc: "ID der Fallakte oder Studie",                                             attribute: "caseId",                            type: "string", len: "<=60"},
            "0081": {  desc: "Bezeichnung der Fallakte oder Studie",                                    attribute: "caseName",                          type: "string", len: "<=60"},
            "0103": {  desc: "Software",                                                                attribute: "sw",                                type: "string", len: "<=60"},
            "0105": {  desc: "KBV-Prüfnummer",                                                          attribute: "kbvValidationNo",                   type: "string", len: "16"},
            "0132": {  desc: "Release-Stand der Software",                                              attribute: "swVersion",                         type: "string", len: "<=60"},
            "0200": {  desc: "Betriebsstätten-ID",                                                      attribute: "locationId",                        type: "string", len: "<=60"},
            "0201": {  desc: "Betriebs- (BSNR) oder Nebenbetriebsstättennummer (NBSNR)",                attribute: "bsnr",                              type: "number",len: "9"},
            "0203": {  desc: "(N)BSNR-Bezeichnung",                                                     attribute: "bsnrDesc",                          type: "string", len: "<=60"},
            "0204": {  desc: "Status der Betriebsstätte",                                               attribute: "locationStatus",                    type: "number",len: "1",    mapper: "locationStatus"},
            "0212": {  desc: "Lebenslange Arztnummer (LANR)",                                           attribute: "docLANR",                           type: "number", len: "9"},
            "0213": {  desc: "Institutionskennzeichen (IK) (der Betriebsstätte)",                       attribute: "iknr",                              type: "number",len: "9"},
            "0222": {  desc: "ASV-Teamnummer",                                                          attribute: "asvTeamNo",                         type: "number", len: "9"},
            "0223": {  desc: "Pseudo-LANR für Krankenhausärzte im Rahmen der ASV-Abrechnung",           attribute: "asvPseudoLANR",                     type: "number",len: "9"},
            "0306": {  desc: "Vertrags-ID des behan-delnden Arztes",                                    attribute: "docContractId",                     type: "string", len: "<=60"},
            "0307": {  desc: "Arzt-ID eines Arztes",                                                    attribute: "docId",                             type: "string", len: "<=60"},
            "0308": {  desc: "Typ der Arzt-ID",                                                         attribute: "docIdType",                         type: "number", len: "1",   mapper: "docIdType"},
            "0600": {  desc: "Name der Einrichtung des Auftraggebers",                                  attribute: "labClientLocation",                 type: "string",len: "<=60"},
            "1202": {  desc: "Adresstyp",                                                               attribute: "addressType",                       type: "number", len: "1",   mapper: "addressType"},
            "1250": {  desc: "Organisation/Firma",                                                      attribute: "company",                           type: "string", len: "<=60"},
            "1251": {  desc: "Rechtsform der Organisa-tion",                                            attribute: "companyLegalForm",                  type: "string", len: "<=60"},
            "1252": {  desc: "Funktionsbezeichnung oder Titel der Person innerhalb der Organisation",   attribute: "companyMemberDesc",                 type: "string",len: "<=60"},
            "3000": {  desc: "Patientennummer",                                                         attribute: "patientId",                         type: "string", len: "<=60"},
            "3100": {  desc: "Namenszusatz",                                                            attribute: "patientNameAdd",                    type: "string", len: "<=20"},
            "3101": {  desc: "Name",                                                                    attribute: "patientName",                       type: "string", len: "<=45"},
            "3102": {  desc: "Vorname",                                                                 attribute: "patientForename",                   type: "string", len: "<=45"},
            "3103": {  desc: "Geburtsdatum",                                                            attribute: "patientDob",                        type: "date", len: "8",     mapper: "date"},
            "3104": {  desc: "Titel",                                                                   attribute: "patientTitle",                      type: "string", len: "<=20"},
            "3105": {  desc: "Versichertennummer",                                                      attribute: "patientInsNo",                      type: "number", len: "6-12"},
            "3107": {  desc: "Straße",                                                                  attribute: "patientStreet",                     type: "string", len: "<=46"},
            "3108": {  desc: "Versichertenart",                                                         attribute: "patientInsKind",                    type: "number", len: "1",   mapper: "insurancekind"},
            "3109": {  desc: "Hausnummer",                                                              attribute: "patientHouseNo",                    type: "string", len: "<=9"},
            "3110": {  desc: "Geschlecht",                                                              attribute: "patientGender",                     type: "string", len: "1",   mapper: "gender"},
            "3112": {  desc: "PLZ",                                                                     attribute: "patientZip",                        type: "string", len: "<=10"},
            "3113": {  desc: "Ort",                                                                     attribute: "patientCity",                       type: "string", len: "<=40"},
            "3114": {  desc: "Wohnsitzlaendercode",                                                     attribute: "patientCountrycode",                type: "string", len: "<=3"},
            "3115": {  desc: "Anschriftenzusatz",                                                       attribute: "patientAddressAdd",                 type: "string", len: "<=40"},
            "3116": {  desc: "WOP",                                                                     attribute: "patientWop",                        type: "string", len: "2",   mapper: "wop"},
            "3119": {  desc: "Versicherten_ID",                                                         attribute: "patientInsId",                      type: "string", len: "10"},
            "3120": {  desc: "Vorsatzwort",                                                             attribute: "patientPrefix",                     type: "string", len: "<=20"},
            "3121": {  desc: "PostfachPLZ",                                                             attribute: "patientPostboxZip",                 type: "string", len: "<=10"},
            "3122": {  desc: "PostfachOrt",                                                             attribute: "patientPostboxCity",                type: "string", len: "<=40"},
            "3123": {  desc: "Postfach",                                                                attribute: "patientPostbox",                    type: "string", len: "<=8"},
            "3124": {  desc: "PostfachWohnsitzlaendercode",                                             attribute: "patientPostboxCountrycode",         type: "string",len: "<=3"},
            "3130": {  desc: "Einschreibestatus Selektivverträge",                                      attribute: "selContractRegistrationStatus",     type: "number",len: "1",    mapper: "selContractRegistrationStatus"},
            "3131": {  desc: "Teilnahme von",                                                           attribute: "selContractFrom",                   type: "date", len: "8"},
            "3132": {  desc: "Teilnahme bis",                                                           attribute: "selContractTo",                     type: "date", len: "8"},
            "3133": {  desc: "Datum der Antragstellung",                                                attribute: "selContractApplicationDate",        type: "date", len: "8"},
            "3134": {  desc: "Bezeichnung des Selektiv-vertrages",                                      attribute: "selContractName",                   type: "string", len: "<=60"},
            "3412": {  desc: "Blutgruppe-Eurocode",                                                     attribute: "bloodTypeEuroCode",                 type: "string", len: "6"},
            "3413": {  desc: "Antikörpersuchtest (gegen Erythrozytenantigene)",                         attribute: "antibodySearchTest",                type: "number",len: "1",    mapper: "antibodySearchTest"},
            "3414": {  desc: "Spezifität weitere Erythrozytenantigene",                                 attribute: "specErythrocytesAntigens",          type: "string",len: "<=60"},
            "3415": {  desc: "Spezifität Erythrozyten- antikörper",                                     attribute: "specErythrocytesAntibodies",        type: "string",len: "<=60"},
            "3416": {  desc: "Spezifität HLA-, HPA-, HNA-Antigene",                                     attribute: "specHlaHpaHnaAntigens",             type: "string",len: "<=60"},
            "3417": {  desc: "Spezifität HLA-, HPA-, HNA-Antikörper",                                   attribute: "specHlaHpaHnaAntibodies",           type: "string",len: "<=60"},
            "3418": {  desc: "Direkter Coombstest (DCT)",                                               attribute: "testDCT",                           type: "number", len: "1",   mapper: "testDCT"},
            "3419": {  desc: "Ergebnis Kreuzprobe",                                                     attribute: "resultCrossMatching",               type: "string", len: "<=60"},
            "3420": {  desc: "Anforderung NHP",                                                         attribute: "requirementNHP",                    type: "number", len: "1",   mapper: "requirementNHP"},
            "3424": {  desc: "Therapiebeginn",                                                          attribute: "therapyBegin",                      type: "date", len: "8"},
            "3425": {  desc: "Therapieende",                                                            attribute: "therapyEnd",                        type: "date", len: "8"},
            "3471": {  desc: "Entbindungstermin (errechnet)",                                           attribute: "dateOfChildbirth_calculated",       type: "date",len: "8"},
            "3564": {  desc: "Text",                                                                    attribute: "text",                              type: "string", len: "<=990"},
            "3622": {  desc: "Größe des Patienten",                                                     attribute: "patientHeight",                     type: "float",  mapper: "cm"},
            "3623": {  desc: "Gewicht des Patienten",                                                   attribute: "patientWeight",                     type: "float",  mapper: "kg"},
            "3628": {  desc: "Muttersprache",                                                           attribute: "nativeLanguage",                    type: "string", len: "<=60"},
            "3664": {  desc: "Anzahl Geburten",                                                         attribute: "numberOfChildbirths",               type: "number", len: "2"},
            "3666": {  desc: "Anzahl Kinder",                                                           attribute: "numberOfChildren",                  type: "number", len: "2"},
            "3668": {  desc: "Anzahl Schwangerschaften",                                                attribute: "numberOfPregnancies",               type: "number", len: "2"},
            "3689": {  desc: "Status der Medikation",                                                   attribute: "medicationStatus",                  type: "number",len: "1",    mapper: "medicationStatus"},
            "4104": {  desc: "Abrechnungs-VKNR",                                                        attribute: "insuranceVKNR",                     type: "number", len: "5"},
            "4106": {  desc: "Kostenträger-Abrechnungsbereich (KTAB)",                                  attribute: "payerBillingArea",                  type: "number",len: "2",    mapper: "payerBillingArea"},
            "4108": {  desc: "Zulassungsnummer",                                                        attribute: "cardreaderCertificationNo",         type: "string", len: "<=60"},
            "4109": {  desc: "Letzter Einlesetag der Versichertenkarte im Quartal",                     attribute: "insurancelastCardReadOfQuarter",    type: "date",len: "8",      mapper: "date"},
            "4110": {  desc: "Bis-Datum der Gültigkeit",                                                attribute: "insuranceValidToDate",              type: "date",len: "8",      mapper: "date"},
            "4111": {  desc: "Kostentraegerkennung",                                                    attribute: "payerNo",                           type: "number", len: "9"},
            "4121": {  desc: "Gebührenordnung",                                                         attribute: "codeCatalog",                       type: "number", len: "1",   mapper: "gebueO"},
            "4122": {  desc: "Abrechnungsgebiet",                                                       attribute: "insuranceBillingArea",              type: "number", len: "2"},
            "4124": {  desc: "SKT-Zusatzangaben",                                                       attribute: "insuranceSktAdd",                   type: "string", len: "<=60"},
            "4126": {  desc: "SKT-Zusatzbemerkung",                                                     attribute: "insuranceSktNotes",                 type: "string", len: "<=60"},
            "4131": {  desc: "Besondere Personengruppen",                                               attribute: "insuranceSpeGroup",                 type: "string",len: "2",    mapper: "insuranceSpeGroup"},
            "4132": {  desc: "DMP_Kennzeichnung",                                                       attribute: "insuranceDmp",                      type: "string", len: "2",   mapper: "insuranceDmp"},
            "4133": {  desc: "Versicherungsschutz-Beginn",                                              attribute: "insuranceValidFromDate",            type: "date",len: "8",      mapper: "date"},
            "4134": {  desc: "Kostentraegername",                                                       attribute: "insuranceFullName",                 type: "string", len: "<=28"},
            "4202": {  desc: "Unfall, Unfallfolgen",                                                    attribute: "accident_consequences",             type: "number", len: "1"},
            "4204": {  desc: "Eingeschränkter Leistungsanspruch gem. § 18 Abs. 3a SGB V",               attribute: "treatmentAccordingToSGBV",          type: "number",len: "1"},
            "4207": {  desc: "Diagnose / Verdachtsdiagnose",                                            attribute: "diagnosis_suspected",               type: "string", len: "<=60"},
            "4208": {  desc: "Befund / Medikation",                                                     attribute: "findings_Medication",               type: "string", len: "<=60"},
            "4217": {  desc: "(N)BSNR des Erstveranlassers",                                            attribute: "initiatorBSNR",                     type: "number", len: "9"},
            "4221": {  desc: "Kurativ / Präventiv / ESS / bei belegärztl. Behandlung",                  attribute: "treatmentType",                     type: "number",len: "1",    mapper: "treatmenttype"},
            "4225": {  desc: "ASV-Teamnummer des Erstveranlassers",                                     attribute: "initiatorASVNR",                    type: "number", len: "9"},
            "4229": {  desc: "Ausnahmeindikation",                                                      attribute: "exceptionalMedIndication",          type: "number", len: "5"},
            "4231": {  desc: "Kontrolluntersuchung einer bekannten Infektion",                          attribute: "followUpOfKnownInfection",          type: "number",len: "1"},
            "4239": {  desc: "Scheinuntergruppe",                                                       attribute: "scheinSubgroup",                    type: "number", len: "2",   mapper: "scheinuntergruppe"},
            "4241": {  desc: "LANR (lebenslange Arztnummer) des Erstveranlassers",                      attribute: "initiatorLANR",                     type: "number",len: "9"},
            "4248": {  desc: "Pseudo-LANR (für Kr.H.Ärzte unter ASV) des Erstveranlassers",             attribute: "initiatorPseudoBSNR",               type: "number",len: "9"},
            "5001": {  desc: "Gebührennummern",                                                         attribute: "gnr",                               type: "string", len: "<=9"},
            "5005": {  desc: "Multiplikator",                                                           attribute: "factor",                            type: "number", len: "2"},
            "5009": {  desc: "freier Begründungstext",                                                  attribute: "reason",                            type: "string", len: "<=60"},
            "6001": {  desc: "ICD-Code",                                                                attribute: "icdCode",                           type: "string", len: "<=6"},
            "6003": {  desc: "Diagnosesicherheit",                                                      attribute: "diagnosisCertainty",                type: "string", len: "1",   mapper: "diagnosisCertainty"},
            "6004": {  desc: "Lokalisation",                                                            attribute: "diagnosisLoc",                      type: "string", len: "1",   mapper: "diagnosisLoc"},
            "6006": {  desc: "Diagnoseerläuterung",                                                     attribute: "diagnosisDesc",                     type: "string", len: "<=60"},
            "6008": {  desc: "Diagnoseausnahmetatbestand",                                              attribute: "diagnosisExceptionDesc",            type: "string", len: "<=60"},
            "6206": {  desc: "Pharmazentralnummer (PZN)",                                               attribute: "medicationPzn",                     type: "number", len: "8"},
            "6207": {  desc: "Rezeptur",                                                                attribute: "medicationRecipe",                  type: "string", len: "<=990"},
            "6208": {  desc: "Handelsname des Arzneimittels",                                           attribute: "medicationName",                    type: "string", len: "<=60"},
            "6212": {  desc: "Arzneimittelwirkstoff / Wirkstoff",                                       attribute: "medicationAgent",                   type: "string", len: "<=60"},
            "6214": {  desc: "Wirkstoff-Klassifikation (Code-System)",                                  attribute: "medicationAgentClassification",     type: "string",len: "<=60"},
            "6221": {  desc: "Kennzeichnung Fremdbefund",                                               attribute: "externalFindingCode",               type: "number", len: "1"},
            "6224": {  desc: "Wirkstoff-Code",                                                          attribute: "medicationAgentCode",               type: "string", len: "<=60"},
            "6303": {  desc: "Dateiformat",                                                             attribute: "fileFormat",                        type: "string", len: "<=60"},
            "6305": {  desc: "Verweis auf die Datei",                                                   attribute: "fileRef",                           type: "string", len: "<=60"},
            "6327": {  desc: "Bildinhalt / Dokumenten-inhalt",                                          attribute: "fileContentDesc",                   type: "string", len: "<=60"},
            "6328": {  desc: "Dateicodierung",                                                          attribute: "fileEncoding",                      type: "string", len: "<=60"},
            "6329": {  desc: "Inhalt der Datei als base64-kodierte Anlage",                             attribute: "fileContentBase64",                 type: "string",len: "<=60"},
            "7251": {  desc: "Bezeichnung des verwendeten Kataloges",                                   attribute: "catalogName",                       type: "string", len: "<=60"},
            "7253": {  desc: "Kostenübernahmeerklärung des Auftraggebers liegt vor",                    attribute: "commissionerCostCovStatement",      type: "number",len: "1",    mapper: "noYes"},
            "7258": {  desc: "ID Katalog durchgeführte Leistungen",                                     attribute: "servicesRenderedCatalogId",         type: "string",len: "<=60"},
            "7259": {  desc: "ID Katalog abrechenbare Leistungen",                                      attribute: "servicesBillableCatalogId",         type: "string",len: "<=60"},
            "7260": {  desc: "ID Katalog anforderbare Leistungen",                                      attribute: "servicesRequestableCatalogId",      type: "number",len: "1",    mapper: "servicesRequestableCatalogId"},
            "7261": {  desc: "Sonstige Versicherungsnummer",                                            attribute: "insuranceIdOther",                  type: "string", len: "<=60"},
            "7263": {  desc: "Test-ID",                                                                 attribute: "testIdCode",                        type: "string", len: "<=60"},
            "7264": {  desc: "Test-Gerät-UID",                                                          attribute: "testDeviceUid",                     type: "string", len: "<=60"},
            "7265": {  desc: "Absender des Datensatzes",                                                attribute: "datasetSender",                     type: "number",len: "1",    mapper: "datasetSender"},
            "7266": {  desc: "Laborart",                                                                attribute: "labKind",                           type: "number", len: "1",   mapper: "labKind"},
            "7267": {  desc: "ID des Auftraggebers",                                                    attribute: "commissionerId",                    type: "string", len: "<=60"},
            "7268": {  desc: "Fachrichtung oder Stationskennung",                                       attribute: "fieldOrStationId",                  type: "string", len: "<=60"},
            "7272": {  desc: "Freitext zum Timestamp",                                                  attribute: "timestampFreeText",                 type: "string", len: "<=990"},
            "7273": {  desc: "Zeitzone",                                                                attribute: "timezone",                          type: "string", len: "<=9", mapper: "E163"},
            "7275": {  desc: "ID verwendeter Terminologie",                                             attribute: "terminologyId",                     type: "string", len: "<=60"},
            "7276": {  desc: "ID verwendeter Nummernpool",                                              attribute: "numberPoolId",                      type: "string", len: "<=60"},
            "7278": {  desc: "Timestamp",                                                               attribute: "timestamp.date",                    type: "date", len: "8",     mapper: "dateTime"},
            "7279": {  desc: "Timestamp",                                                               attribute: "timestamp.time",                    type: "time", len: "<=9",   mapper: "dateTime"},
            "7280": {  desc: "Grund der Benachrichtigung",                                              attribute: "NoticeReason",                      type: "number",len: "1",    mapper: "NoticeReason"},
            "7281": {  desc: "Nachweisverfahren",                                                       attribute: "processOfProof",                    type: "number", len: "1",   mapper: "processOfProof"},
            "7285": {  desc: "Keim-Nummer",                                                             attribute: "germNo",                            type: "string", len: "<=60"},
            "7286": {  desc: "Resistenz-Methode",                                                       attribute: "resistanceMethod",                  type: "number", len: "1",   mapper: "resistanceMethod"},
            "7287": {  desc: "Wirkstoff-Ident",                                                         attribute: "AgentId",                           type: "string", len: "<=60"},
            "7288": {  desc: "Wirkstoff-Generic-Nummer",                                                attribute: "agentGenericNo",                    type: "string", len: "<=60"},
            "7289": {  desc: "MHK/Breakpoint-Wert",                                                     attribute: "mhk_breakpointValue",               type: "string", len: "<=60"},
            "7290": {  desc: "Resistenz-Interpretation",                                                attribute: "resistanceInterpretation",          type: "number",len: "1",    mapper: "resistanceInterpretation"},
            "7292": {  desc: "Lokalisation Probenmaterial",                                             attribute: "materialLoc",                       type: "string", len: "<=60"},
            "7293": {  desc: "Einheit der Mengenangabe",                                                attribute: "materialAmountUnit",                type: "string", len: "<=60"},
            "7295": {  desc: "Tag der Untersuchung",                                                    attribute: "examDay",                           type: "date", len: "8"},
            "7296": {  desc: "Wiederholungsuntersuchung",                                               attribute: "examRepeated",                      type: "string",len: "1",    mapper: "noYes"},
            "7297": {  desc: "Datum der letzten Untersuchung",                                          attribute: "examDateOfLast",                    type: "date", len: "8"},
            "7298": {  desc: "Nr. des letzten zytologischen Befundes",                                  attribute: "findingNoOfLastCytological",        type: "string",len: "<=60"},
            "7299": {  desc: "Gruppe des letzten Befundes",                                             attribute: "findingGroupOfLast",                type: "string", len: "<=6"},
            "7301": {  desc: "Ergebnis",                                                                attribute: "resultStatus",                      type: "number", len: "1",   mapper: "resultStatus"},
            "7302": {  desc: "Testmethode",                                                             attribute: "testMethod",                        type: "string", len: "<=60"},
            "7303": {  desc: "Abrechnungsinfo zur Untersuchung",                                        attribute: "examBillingInfo",                   type: "number",len: "<=2",  mapper: "examBillingInfo"},
            "7304": {  desc: "Ergebnis-ID",                                                             attribute: "resultId",                          type: "string", len: "<=60"},
            "7305": {  desc: "Befund-ID",                                                               attribute: "findingId",                         type: "string", len: "<=60"},
            "7306": {  desc: "Darstellung Ergebniswerte",                                               attribute: "resultValues",                      type: "number",len: "2",    mapper: "resultValues"},
            "7310": {  desc: "Art des Materials",                                                       attribute: "materialKind",                      type: "number", len: "1",   mapper: "materialKind"},
            "7311": {  desc: "Organisches Material",                                                    attribute: "materialIsOrganic",                 type: "number",len: "1",    mapper: "materialIsOrganic"},
            "7312": {  desc: "Anorganisches Material",                                                  attribute: "materialIsAnorganic",               type: "number",len: "1",    mapper: "materialIsAnorganic"},
            "7313": {  desc: "Art / Rasse / Material",                                                  attribute: "materialKindRace",                  type: "string", len: "<=60"},
            "7314": {  desc: "Name / Kennung",                                                          attribute: "materialName",                      type: "string", len: "<=60"},
            "7315": {  desc: "Alter",                                                                   attribute: "materialAge",                       type: "number", len: "<=10"},
            "7316": {  desc: "Normalwert Listenbezeichnung",                                            attribute: "normalValListName",                 type: "string", len: "<=60"},
            "7317": {  desc: "Normalwert Listenzeile",                                                  attribute: "normalValListLine",                 type: "string", len: "<=60"},
            "7318": {  desc: "Nahrungsaufnahme zum Zeitpunkt der Materialentnahme",                     attribute: "materialFoodIntAtTimeOfProbe",      type: "string",len: "<=60"},
            "7319": {  desc: "Identifikationsnummer der Quelle",                                        attribute: "sourceIdNo",                        type: "string", len: "<=60"},
            "7320": {  desc: "Recall empfohlen",                                                        attribute: "RecallRecommended",                 type: "number", len: "1"},
            "7321": {  desc: "Status Einsender",                                                        attribute: "senderStatus",                      type: "number", len: "2",   mapper: "senderStatus"},
            "7326": {  desc: "Alter in",                                                                attribute: "ageUnit",                           type: "number", len: "1",   mapper: "ageUnit"},
            "7328": {  desc: "Zusätzliche Namenszeile",                                                 attribute: "AddName",                           type: "string", len: "<=10"},
            "7329": {  desc: "Normalbereichsrelevantes Geschlecht",                                     attribute: "NormalRangeRelSex",                 type: "string",len: "1",    mapper: "gender"},
            "7330": {  desc: "Telefonnummer",                                                           attribute: "patientPhone",                      type: "string", len: "<=60"},
            "7331": {  desc: "Mobiltelefonnummer",                                                      attribute: "patientMobile",                     type: "string", len: "<=60"},
            "7332": {  desc: "Alternative elektronische Postadresse",                                   attribute: "patientAltElectronicAddress",       type: "string",len: "<=60"},
            "7333": {  desc: "Faxnummer",                                                               attribute: "patientFax",                        type: "string", len: "<=60"},
            "7334": {  desc: "Webadresse",                                                              attribute: "patientWeb",                        type: "string", len: "<=60"},
            "7335": {  desc: "E-Mail-Adresse",                                                          attribute: "patientEmail",                      type: "string", len: "<=60"},
            "7336": {  desc: "Gyn. OP, Strahlen oder Chemotherapie",                                    attribute: "gynsurgRadChemo",                   type: "number",len: "1",    mapper: "noYes"},
            "7337": {  desc: "Art der gyn. OP, Strahlen oder Chemotherapie",                            attribute: "gynsurgRadChemoKind",               type: "string",len: "<=60"},
            "7338": {  desc: "Datum der gyn. OP",                                                       attribute: "gynsurgDate",                       type: "date", len: "8"},
            "7339": {  desc: "Gravidität",                                                              attribute: "gravidity",                         type: "number", len: "1",   mapper: "noYes"},
            "7340": {  desc: "Spezifizierung der alterna-tiven elektronischen Post-adresse",            attribute: "patientAltElectronicAddressSpec",   type: "string",len: "<=60"},
            "7351": {  desc: "Geburtsdatum",                                                            attribute: "patientDob",                        type: "date", len: "8"},
            "7352": {  desc: "URL Katalog",                                                             attribute: "catalogUrl",                        type: "string", len: "<=60"},
            "7354": {  desc: "Keim/Pilz-Identifizierung",                                               attribute: "germId",                            type: "string", len: "<=60"},
            "7355": {  desc: "Keim/Pilz -Name",                                                         attribute: "germName",                          type: "string", len: "<=120"},
            "7356": {  desc: "Keim-OID",                                                                attribute: "germOID",                           type: "string", len: "<=60"},
            "7357": {  desc: "Wachstum",                                                                attribute: "growth",                            type: "number", len: "1",   mapper: "growth"},
            "7358": {  desc: "Name im Klartext",                                                        attribute: "personNameFull",                    type: "string", len: "<=60"},
            "7359": {  desc: "Wirkstoff-OID",                                                           attribute: "agentOid",                          type: "string", len: "<=60"},
            "7361": {  desc: "Keim-ID im Katalog",                                                      attribute: "germCatalogId",                     type: "string", len: "<=60"},
            "7362": {  desc: "Abrechnungsart PKV",                                                      attribute: "pkvBillingType",                    type: "number", len: "1",   mapper: "abrechnungstyp"},
            "7363": {  desc: "Alarmwert untere Grenze",                                                 attribute: "alarmLowerLimit",                   type: "string", len: "<=60"},
            "7364": {  desc: "Probengefäß-Ident",                                                       attribute: "probeContainerId",                  type: "string", len: "<=60"},
            "7365": {  desc: "Analysen-ID",                                                             attribute: "analysisId",                        type: "string", len: "<=20"},
            "7366": {  desc: "Langbezeichnung der angeforderten Leistung",                              attribute: "serviceNameLong",                   type: "string",len: "<=60"},
            "7367": {  desc: "Sensitivität",                                                            attribute: "sensitivity",                       type: "string", len: "1",   mapper: "sensitivity"},
            "7368": {  desc: "Zellmaterial nicht verwertbar",                                           attribute: "materialCellsUnusable",             type: "number",len: "1",    mapper: "materialCellsUnusable"},
            "7369": {  desc: "MHK-Einheit",                                                             attribute: "mhkUnit",                           type: "string", len: "<=60"},
            "7370": {  desc: "Wirkstoff- oder Handelsname",                                             attribute: "agentOrTradeName",                  type: "string", len: "<=60"},
            "7371": {  desc: "Alarmwert obere Grenze",                                                  attribute: "alarmUpperLimit",                   type: "string", len: "<=60"},
            "7372": {  desc: "Tumorklassifikation",                                                     attribute: "tumorClassification",               type: "string", len: "<=60"},
            "7373": {  desc: "Grading",                                                                 attribute: "tumorGrading",                      type: "string", len: "<=5"},
            "7374": {  desc: "Stadium",                                                                 attribute: "tumorStage",                        type: "string", len: "<=5"},
            "7375": {  desc: "Jahr der Tumordiagnose",                                                  attribute: "tumorDiagnosisYear",                type: "number", len: "4"},
            "7376": {  desc: "Lokalisation Tumor",                                                      attribute: "tumorLoc",                          type: "string", len: "<=60"},
            "7377": {  desc: "Maße",                                                                    attribute: "tumorMeasurements",                 type: "string", len: "<=60"},
            "7378": {  desc: "Farbe",                                                                   attribute: "tumorColor",                        type: "string", len: "<=60"},
            "7379": {  desc: "Infiltrationstiefe",                                                      attribute: "infiltrationDepth",                 type: "string", len: "<=60"},
            "7380": {  desc: "Path. gynäkologische Blutungen",                                          attribute: "pathGynBleeds",                     type: "number",len: "1",    mapper: "noYes"},
            "7381": {  desc: "Sonstiger Ausfluss",                                                      attribute: "otherDischarge",                    type: "number", len: "1",   mapper: "noYes"},
            "7382": {  desc: "IUP",                                                                     attribute: "iup",                               type: "number", len: "1",   mapper: "noYes"},
            "7383": {  desc: "Ovulationshemmer",                                                        attribute: "ovulationInhibitor",                type: "number", len: "1",   mapper: "noYes"},
            "7384": {  desc: "Sonstige Hormonanwendung",                                                attribute: "otherHormoneTreatment",             type: "number",len: "1",    mapper: "noYes"},
            "7385": {  desc: "Vulva Inspektion auffällig",                                              attribute: "vulvaInspectionSuspicious",         type: "number",len: "1",    mapper: "noYes"},
            "7386": {  desc: "Portio und Vagina auffällig",                                             attribute: "portioAndVaginaSuspicious",         type: "number",len: "1",    mapper: "noYes"},
            "7387": {  desc: "Inneres Genitale auffällig",                                              attribute: "innerGenitalsSuspicious",           type: "number",len: "1",    mapper: "noYes"},
            "7388": {  desc: "Inguinale Lymphknoten auffällig",                                         attribute: "inguinalLymphNodesSuspicious",      type: "number",len: "1",    mapper: "noYes"},
            "7389": {  desc: "Behandlungsbedürftige Nebenbefunde",                                      attribute: "secFindingsRequiringTreatment",     type: "number",len: "1",    mapper: "noYes"},
            "7390": {  desc: "Haut",                                                                    attribute: "skin",                              type: "number", len: "1",   mapper: "noYes"},
            "7391": {  desc: "Mamma auffällig",                                                         attribute: "mammaSuspicious",                   type: "number", len: "1",   mapper: "noYes"},
            "7392": {  desc: "Axilläre Lymphknoten auffällig",                                          attribute: "axillaryLymphNodesSuspicious",      type: "number",len: "1",    mapper: "noYes"},
            "7393": {  desc: "Rektum/Kolon: Blut oder Schleim",                                         attribute: "rectColonBloodOrSlime",             type: "number",len: "1",    mapper: "noYes"},
            "7394": {  desc: "Neu aufgetr. Unregelmäßigkeiten",                                         attribute: "irregularitiesNew",                 type: "number",len: "1",    mapper: "noYes"},
            "7395": {  desc: "Rektum/Kolon: Tastbefund auffällig",                                      attribute: "rectColonPalpationSuspicious",      type: "number",len: "1",    mapper: "noYes"},
            "7396": {  desc: "Stuhltest zurückgegeben",                                                 attribute: "stoolProbeReturned",                type: "number",len: "1",    mapper: "noYes"},
            "7397": {  desc: "Stuhltest positiv",                                                       attribute: "stoolProbePositive",                type: "number", len: "1",   mapper: "noYes"},
            "7398": {  desc: "RR (Blutdruck)",                                                          attribute: "rr",                                type: "string", len: "7"},
            "7399": {  desc: "RR, zweite Messung",                                                      attribute: "rr2",                               type: "string", len: "7"},
            "7400": {  desc: "HPV-Befund",                                                              attribute: "hpvFinding",                        type: "number", len: "1",   mapper: "noYes"},
            "7401": {  desc: "High-Risk",                                                               attribute: "highRisk",                          type: "number", len: "1",   mapper: "positiveNegativeInvalid"},
            "7402": {  desc: "High Risk Typ",                                                           attribute: "highRiskType",                      type: "number", len: "<=2"},
            "7403": {  desc: "Low-Risk",                                                                attribute: "lowRisk",                           type: "number", len: "1",   mapper: "positiveNegativeInvalid"},
            "7404": {  desc: "Low Risk Typ",                                                            attribute: "lowRiskType",                       type: "number", len: "<=2"},
            "7405": {  desc: "Endozervikale Zellen",                                                    attribute: "endocervicalCells",                 type: "number",len: "1",    mapper: "endocervicalCells"},
            "7406": {  desc: "Proliferationsgrad",                                                      attribute: "proliferationDeg",                  type: "string", len: "<=10"},
            "7407": {  desc: "Döderleinflora",                                                          attribute: "floraDöderlein",                    type: "number", len: "1",   mapper: "noYes"},
            "7408": {  desc: "Mischflora",                                                              attribute: "floraMixed",                        type: "number", len: "1",   mapper: "noYes"},
            "7409": {  desc: "Kokkenflora",                                                             attribute: "floraKokken",                       type: "number", len: "1",   mapper: "noYes"},
            "7410": {  desc: "Trichomonaden",                                                           attribute: "trichomonads",                      type: "number", len: "1",   mapper: "noYes"},
            "7411": {  desc: "Candida",                                                                 attribute: "candida",                           type: "number", len: "1",   mapper: "noYes"},
            "7412": {  desc: "Gardnerella",                                                             attribute: "gardnerella",                       type: "number", len: "1",   mapper: "noYes"},
            "7413": {  desc: "Codierung der Gruppe",                                                    attribute: "groupEncoding",                     type: "string", len: "<=4"},
            "7414": {  desc: "Gruppe",                                                                  attribute: "group",                             type: "string", len: "<=5"},
            "7415": {  desc: "Zytologische Kontrolle",                                                  attribute: "cytologicalControl",                type: "number",len: "1",    mapper: "noYes"},
            "7416": {  desc: "Grund der Nachkontrolle",                                                 attribute: "reasonForAddControl",               type: "number",len: "1",    mapper: "reasonForAddControl"},
            "7417": {  desc: "Histologische Klärung",                                                   attribute: "histClarification",                 type: "number",len: "1",    mapper: "noYes"},
            "7418": {  desc: "p16/Ki67",                                                                attribute: "p16_ki67",                          type: "number", len: "1",   mapper: "positiveNegativeInvalid"},
            "7419": {  desc: "L1",                                                                      attribute: "l1",                                type: "number", len: "1",   mapper: "positiveNegativeInvalid"},
            "7420": {  desc: "Status Person",                                                           attribute: "personStatus",                      type: "number", len: "2",   mapper: "personStatus"},
            "7421": {  desc: "Status Rechnungsempfänger",                                               attribute: "billingRecipientStatus",            type: "number",len: "2",    mapper: "billingRecipientStatus"},
            "7422": {  desc: "Chlamydien",                                                              attribute: "chlamydia",                         type: "number", len: "1",   mapper: "positiveNegativeInvalid"},
            "7423": {  desc: "Gyn. Diagnose",                                                           attribute: "gynDiagnosis",                      type: "string", len: "<=990"},
            "7424": {  desc: "Resistenz erstellt nach",                                                 attribute: "resistanceCreatedAfter",            type: "number",len: "1",    mapper: "resistanceCreatedAfter"},
            "7425": {  desc: "Extragynäkologische Zytologie",                                           attribute: "extragynCytology",                  type: "number",len: "1",    mapper: "extragynCytology"},
            "7426": {  desc: "Neisseria Gonorrhoeae",                                                   attribute: "neisseriaGon",                      type: "number", len: "1",   mapper: "positiveNegativeInvalid"},
            "7427": {  desc: "Art",                                                                     attribute: "kind",                                  type: "number", len: "1",   mapper: "kind"},
            "7428": {  desc: "Geschlecht des Tieres",                                                   attribute: "genderOfAnimal",                                  type: "number", len: "1",   mapper: "genderOfAnimal"},
            "7429": {  desc: "DRG_Hinweis",                                                             attribute: "noticeDRG",                                  type: "string", len: "<=990"},
            "7430": {  desc: "Patienten-ID im Selektivvertrag",                                         attribute: "obj_0006Attribute",                 type: "string", len: "<=60"},
            "7431": {  desc: "Fachgebiet",                                                              attribute: "specialField",                                  type: "number", len: "1",   mapper: "specialField"},
            "7432": {  desc: "kastriert/sterilisiert",                                                  attribute: "castrationOrSterilization",                                  type: "number", len: "1",   mapper: "castrationOrSterilization"},
            "7922": {  desc: "Sterbedatum des Patienten",                                               attribute: "patientDateOfDeath",                type: "date", len: "8"},
            "8000": {  desc: "Satzart",                                                                 attribute: "recordType",                        type: "number", len: "4",   mapper: "satzID"},
            "8001": {  desc: "Satzende",                                                                attribute: "recordEnd",                         type: "number", len: "4",   mapper: "satzIDEnd"},
            "8002": {  desc: "Objektident",                                                             attribute: "objId",                             type: "string", len: "8",   mapper: "objectMapper"},
            "8003": {  desc: "Objektende",                                                              attribute: "objId",                             type: "string", len: "8",   mapper: "objectMapper"},
            "8101": {  desc: "Abrechnungsinformation",                                                  attribute: "obj_0001Attribute",                 type: "string",len: "22",   mapper: "objTypeHeader"},
            "8102": {  desc: "Abrechnungen GKV",                                                        attribute: "obj_0002Attribute",                 type: "string",len: "14",   mapper: "objTypeHeader"},
            "8103": {  desc: "Abrechnungen PKV",                                                        attribute: "obj_0003Attribute",                 type: "string",len: "14",   mapper: "objTypeHeader"},
            "8104": {  desc: "Abrechnungen IGEL",                                                       attribute: "obj_0004Attribute",                 type: "string",len: "15",   mapper: "objTypeHeader"},
            "8105": {  desc: "Abrechnungen Sonstige Kostenübernahme",                                   attribute: "obj_0005Attribute",                 type: "string",len: "36",   mapper: "objTypeHeader"},
            "8106": {  desc: "Abrechnungen Selektivvertrag",                                            attribute: "obj_0006Attribute",                 type: "string",len: "26",   mapper: "objTypeHeader"},
            "8107": {  desc: "Anschrift",                                                               attribute: "obj_0007Attribute",                 type: "string", len: "9",   mapper: "objTypeHeader"},
            "8108": {  desc: "Adressat",                                                                attribute: "obj_0008Attribute",                 type: "string", len: "8",   mapper: "objTypeHeader"},
            "8110": {  desc: "Anhang-Liste",                                                            attribute: "obj_0010Attribute",                 type: "string",len: "6",    mapper: "objTypeHeader"},
            "8111": {  desc: "Antibiogramm",                                                            attribute: "obj_0011Attribute",                 type: "string",len: "12",   mapper: "objTypeHeader"},
            "8113": {  desc: "Auftragsinformation",                                                     attribute: "obj_0013Attribute",                 type: "string",len: "19",   mapper: "objTypeHeader"},
            "8114": {  desc: "Arztidentifikation",                                                      attribute: "obj_0014Attribute",                 type: "string",len: "18",   mapper: "objTypeHeader"},
            "8117": {  desc: "Befundinformationen",                                                     attribute: "obj_0017Attribute",                 type: "string",len: "19",   mapper: "objTypeHeader"},
            "8118": {  desc: "Abweichender Befundweg",                                                  attribute: "obj_0031Attribute2",                type: "string",len: "22",   mapper: "objTypeHeader"},
            "8119": {  desc: "Betriebsstätte",                                                          attribute: "obj_0019Attribute",                 type: "string",len: "15",   mapper: "objTypeHeader"},
            "8122": {  desc: "Einsenderidentifikation",                                                 attribute: "obj_0022Attribute",                 type: "string",len: "23",   mapper: "objTypeHeader"},
            "8126": {  desc: "Fehlermeldung Aufmerksamkeit",                                            attribute: "obj_0026Attribute",                 type: "string",len: "28",   mapper: "objTypeHeader"},
            "8127": {  desc: "Veranlassungsgründe",                                                     attribute: "obj_0027Attribute",                 type: "string",len: "18",   mapper: "objTypeHeader"},
            "8131": {  desc: "Kommunikationsdaten",                                                     attribute: "obj_0031Attribute",                 type: "string",len: "19",   mapper: "objTypeHeader"},
            "8132": {  desc: "Kopfdaten",                                                               attribute: "obj_0032Attribute",                 type: "string", len: "9",   mapper: "objTypeHeader"},
            "8134": {  desc: "Krebsfrüherkennung Frauen",                                               attribute: "obj_0034Attribute",                 type: "string",len: "26",   mapper: "objTypeHeader"},
            "8135": {  desc: "Laborergebnisbericht",                                                    attribute: "obj_0035Attribute",                 type: "string",len: "20",   mapper: "objTypeHeader"},
            "8136": {  desc: "Laborkennungen",                                                          attribute: "obj_0036Attribute",                 type: "string",len: "12",   mapper: "objTypeHeader"},
            "8137": {  desc: "Material-Liste",                                                          attribute: "obj_0037Attribute",                 type: "string",len: "8",    mapper: "objTypeHeader"},
            "8140": {  desc: "Mutterschaft",                                                            attribute: "obj_0040Attribute",                 type: "string",len: "12",   mapper: "objTypeHeader"},
            "8141": {  desc: "Namenskennung",                                                           attribute: "obj_0041Attribute",                 type: "string",len: "13",   mapper: "objTypeHeader"},
            "8142": {  desc: "Normalwert",                                                              attribute: "obj_0042Attribute",                 type: "string",len: "10",   mapper: "objTypeHeader"},
            "8143": {  desc: "Organisation",                                                            attribute: "obj_0043Attribute",                 type: "string",len: "12",   mapper: "objTypeHeader"},
            "8145": {  desc: "Patient",                                                                 attribute: "obj_0045Attribute",                 type: "string", len: "7",   mapper: "objTypeHeader"},
            "8147": {  desc: "Person",                                                                  attribute: "obj_0047Attribute",                 type: "string", len: "6",   mapper: "objTypeHeader"},
            "8148": {  desc: "RgEmpfänger",                                                             attribute: "obj_0048Attribute",                 type: "string",len: "12",   mapper: "objTypeHeader"},
            "8150": {  desc: "Schwangerschaft",                                                         attribute: "obj_0050Attribute",                 type: "string",len: "15",   mapper: "objTypeHeader"},
            "8151": {  desc: "Sendendes System",                                                        attribute: "obj_0051Attribute",                 type: "string",len: "16",   mapper: "objTypeHeader"},
            "8153": {  desc: "Tier Sonstiges",                                                          attribute: "obj_0053Attribute",                 type: "string",len: "14",   mapper: "objTypeHeader"},
            "8154": {  desc: "Timestamp",                                                               attribute: "obj_0054Attribute",                 type: "string", len: "9",   mapper: "objTypeHeader"},
            "8155": {  desc: "Transfusionsmedizin Mutterschaftsvorsorge",                               attribute: "obj_0055Attribute",                 type: "string",len: "41",   mapper: "objTypeHeader"},
            "8156": {  desc: "Tumor",                                                                   attribute: "obj_0056Attribute",                 type: "string", len: "5",   mapper: "objTypeHeader"},
            "8158": {  desc: "Untersuchungsabrechnung",                                                 attribute: "obj_0058Attribute",                 type: "string",len: "23",   mapper: "objTypeHeader"},
            "8159": {  desc: "Untersuchungsanforderungen",                                              attribute: "obj_0059Attribute",                 type: "string",len: "24",   mapper: "objTypeHeader"},
            "8160": {  desc: "\"UE Klinische Chemie\"-Liste",                                           attribute: "obj_0060Attribute",                 type: "string",len: "19",   mapper: "objTypeHeader"},
            "8161": {  desc: "\"UE Mikrobiologie\"-Liste",                                              attribute: "obj_0061Attribute",                 type: "string",len: "16",   mapper: "objTypeHeader"},
            "8162": {  desc: "\"UE Zytologie Krebs-vorsorge\"-Liste",                                   attribute: "obj_0062Attribute",                 type: "string",len: "26",   mapper: "objTypeHeader"},
            "8163": {  desc: "\"UE Zytologie\"-Liste",                                                  attribute: "obj_0063Attribute",                 type: "string",len: "12",   mapper: "objTypeHeader"},
            "8167": {  desc: "Zusätzliche Informationen",                                               attribute: "obj_0068Attribute",                 type: "string",len: "26",   mapper: "objTypeHeader"},
            "8169": {  desc: "Körperkenngrössen",                                                       attribute: "obj_0069Attribute",                 type: "string",len: "19",   mapper: "objTypeHeader"},
            "8170": {  desc: "Medikament",                                                              attribute: "obj_0070Attribute",                 type: "string",len: "10",   mapper: "objTypeHeader"},
            "8171": {  desc: "Wirkstoff",                                                               attribute: "obj_0071Attribute",                 type: "string", len: "9",   mapper: "objTypeHeader"},
            "8200": {  desc: "Akutdiagnose",                                                            attribute: "obj_0100Attribute",                 type: "string",len: "12",   mapper: "objTypeHeader"},
            "8212": {  desc: "Softwareverantwortlicher",                                                attribute: "obj_0043Attribute2",                type: "string",len: "24",   mapper: "objTypeHeader"},
            "8213": {  desc: "Timestamp Erstellung Untersuchungsanforderung",                           attribute: "obj_0054Attribute2",                type: "string",len: "45",   mapper: "objTypeHeader"},
            "8214": {  desc: "Timestamp Auftragserteilung",                                             attribute: "obj_0054Attribute3",                type: "string",len: "27",   mapper: "objTypeHeader"},
            "8215": {  desc: "Timestamp Auftragseingang",                                               attribute: "obj_0054Attribute4",                type: "string",len: "25",   mapper: "objTypeHeader"},
            "8216": {  desc: "Timestamp Befunderstellung",                                              attribute: "obj_0054Attribute5",                type: "string",len: "26",   mapper: "objTypeHeader"},
            "8217": {  desc: "Präzisierung Veranlassungsgrund",                                         attribute: "obj_0068Attribute2",                type: "string",len: "32",   mapper: "objTypeHeader"},
            "8218": {  desc: "Timestamp Erstellung Datensatz",                                          attribute: "obj_0054Attribute6",                type: "string",len: "30",   mapper: "objTypeHeader"},
            "8219": {  desc: "Timestamp Materialabnahme entnahme",                                      attribute: "obj_0054Attribute7",                type: "string",len: "34",   mapper: "objTypeHeader"},
            "8220": {  desc: "Timestamp Eingangserfassung Material",                                    attribute: "obj_0054Attribute8",                type: "string",len: "36",   mapper: "objTypeHeader"},
            "8221": {  desc: "Timestamp Erstellung Laborergebnisbericht",                               attribute: "obj_0054Attribute9",                type: "string",len: "41",   mapper: "objTypeHeader"},
            "8222": {  desc: "Timestamp Beginn Analytik",                                               attribute: "obj_0054Attribute10",               type: "string",len: "25",   mapper: "objTypeHeader"},
            "8223": {  desc: "Timestamp Ergebniserstellung",                                            attribute: "obj_0054Attribute11",               type: "string",len: "28",   mapper: "objTypeHeader"},
            "8224": {  desc: "Timestamp QM Erfassung",                                                  attribute: "obj_0054Attribute12",               type: "string",len: "22",   mapper: "objTypeHeader"},
            "8225": {  desc: "Timestamp Messung",                                                       attribute: "obj_0054Attribute13",               type: "string",len: "17",   mapper: "objTypeHeader"},
            "8226": {  desc: "Timestamp Gültig ab",                                                     attribute: "obj_0054Attribute14",               type: "string",len: "20",   mapper: "objTypeHeader"},
            "8227": {  desc: "Timestamp Gültig bis",                                                    attribute: "obj_0054Attribute15",               type: "string",len: "21",   mapper: "objTypeHeader"},
            "8228": {  desc: "Wohnanschrift",                                                           attribute: "obj_0007Attribute2",                type: "string",len: "13",   mapper: "objTypeHeader"},
            "8229": {  desc: "Anschrift Arbeitsstelle",                                                 attribute: "obj_0007Attribute3",                type: "string",len: "23",   mapper: "objTypeHeader"},
            "8230": {  desc: "Rechnungsanschrift",                                                      attribute: "obj_0007Attribute4",                type: "string",len: "18",   mapper: "objTypeHeader"},
            "8231": {  desc: "Temporäre Anschrift",                                                     attribute: "obj_0007Attribute5",                type: "string",len: "20",   mapper: "objTypeHeader"},
            "8232": {  desc: "Private Kommunikationsdaten",                                             attribute: "obj_0031Attribute2",                type: "string",len: "27",   mapper: "objTypeHeader"},
            "8233": {  desc: "Geschäftliche Kommunikationsdaten",                                       attribute: "obj_0031Attribute3",                type: "string",len: "34",   mapper: "objTypeHeader"},
            "8235": {  desc: "Person zum Timestamp",                                                    attribute: "obj_0047Attribute2",                type: "string",len: "20",   mapper: "objTypeHeader"},
            "8236": {  desc: "Testbezogene Hinweise",                                                   attribute: "obj_0068Attribute3",                type: "string",len: "21",   mapper: "objTypeHeader"},
            "8237": {  desc: "Ergebnistext",                                                            attribute: "obj_0068Attribute4",                type: "string",len: "12",   mapper: "objTypeHeader"},
            "8238": {  desc: "Auftragsbezogene Hinweise",                                               attribute: "obj_0068Attribute5",                type: "string",len: "25",   mapper: "objTypeHeader"},
            "8239": {  desc: "Laborbezeichnung",                                                        attribute: "obj_0043Attribute3",                type: "string",len: "16",   mapper: "objTypeHeader"},
            "8240": {  desc: "Überweisung von anderen Ärzten",                                          attribute: "obj_0014Attribute2",                type: "string",len: "32",   mapper: "objTypeHeader"},
            "8241": {  desc: "Überweisung an",                                                          attribute: "obj_0014Attribute3",                type: "string",len: "15",   mapper: "objTypeHeader"},
            "8242": {  desc: "base64-kodierte Anlage",                                                  attribute: "obj_0068Attribute6",                type: "string",len: "22",   mapper: "objTypeHeader"},
            "8243": {  desc: "Timestamp Zeitpunkt Medikamenteneinnahme",                                attribute: "obj_0054Attribute4",                type: "string",len: "40",   mapper: "objTypeHeader"},
            "8244": {  desc: "BAK",                                                                     attribute: "obj_0072Attribute",                 type: "string", len: "3",   mapper: "objTypeHeader"},
            "8245": {  desc: "BAK-Ergebnis",                                                            attribute: "obj_0068Attribute7",                type: "string",len: "12",   mapper: "objTypeHeader"},
            "8246": {  desc: "BAK-Ergebnisbezogene Hinweise",                                           attribute: "obj_0068Attribute8",                type: "string",len: "29",   mapper: "objTypeHeader"},
            "8247": {  desc: "Diagnostische Bewertung Empfehlung",                                      attribute: "obj_0068Attribute9",                type: "string",len: "34",   mapper: "objTypeHeader"},
            "8248": {  desc: "UE Sonstige Untersuchungsergebnisse",                                     attribute: "obj_0073Attribute",                 type: "string",len: "35",   mapper: "objTypeHeader"},
            "8310": {  desc: "Auftragsnummer des Einsenders",                                           attribute: "recordRequestId",                   type: "string", len: "<=60"},
            "8311": {  desc: "Auftragsnummer des Labors",                                               attribute: "labReqNo",                          type: "string", len: "<=60"},
            "8312": {  desc: "Kunden- (Arzt-) Nummer",                                                  attribute: "customerNo",                        type: "string", len: "<=20"},
            "8313": {  desc: "ID Nachforderung",                                                        attribute: "subsequentReqId",                   type: "string", len: "<=60"},
            "8315": {  desc: "ID des Empfängers",                                                       attribute: "receiverId",                        type: "string", len: "<=60"},
            "8316": {  desc: "ID des Senders",                                                          attribute: "senderId",                          type: "string", len: "<=60"},
            "8324": {  desc: "ID eines Laborstandortes",                                                attribute: "labLocId",                          type: "string", len: "<=60"},
            "8401": {  desc: "Status (Befund/Bericht)",                                                 attribute: "findingKind",                       type: "string", len: "1",   mapper: "findingkind"},
            "8406": {  desc: "Kosten in (€) Cent",                                                      attribute: "cost",                              type: "number", len: "<=60"},
            "8410": {  desc: "Test-ID",                                                                 attribute: "testId",                            type: "string", len: "<=20"},
            "8411": {  desc: "Testbezeichnung",                                                         attribute: "testLabel",                         type: "string", len: "<=60"},
            "8417": {  desc: "Anlass der Untersuchung",                                                 attribute: "examReason",                        type: "number", len: "2",   mapper: "examReason"},
            "8418": {  desc: "Ergebnisstatus",                                                          attribute: "testStatus",                        type: "string", len: "2",   mapper: "testStatus"},
            "8419": {  desc: "Einheitensystem des Messwertes / Wertes",                                 attribute: "measurementUnitKind",               type: "number",len: "1",    mapper: "measurementUnitKind"},
            "8420": {  desc: "Ergebnis-Wert",                                                           attribute: "testResultVal",                     type: "string", len: "<=60"},
            "8421": {  desc: "Maßeinheit des Messwertes / Wertes",                                      attribute: "TestResultUnit",                    type: "string", len: "<=60"},
            "8422": {  desc: "Grenzwertindikator des Laborwerts",                                       attribute: "testResultLimitIndicator",          type: "string",len: "<=2",  mapper: "testResultLimitIndicator"},
            "8423": {  desc: "pathologisch bekannt",                                                    attribute: "testResultPathKnown",               type: "number", len: "1"},
            "8424": {  desc: "Normwertspezifikation",                                                   attribute: "normalValSpec",                     type: "number", len: "2",   mapper: "normalValSpec"},
            "8427": {  desc: "Spezifizierung des Veranlassungsgrundes",                                 attribute: "specReasonOfOrder",                 type: "number",len: "2",    mapper: "specReasonOfOrder"},
            "8428": {  desc: "Probenmaterial-Ident",                                                    attribute: "sampleId",                          type: "string", len: "<=60"},
            "8429": {  desc: "Probenmaterial-Index",                                                    attribute: "sampleIndex",                       type: "number", len: "<=4"},
            "8430": {  desc: "Probenmaterial-Bezeichnung",                                              attribute: "sampleLabel",                       type: "string", len: "<=60"},
            "8431": {  desc: "Probenmaterial-Spezifikation",                                            attribute: "sampleSpec",                        type: "string", len: "<=60"},
            "8434": {  desc: "Anforderungen",                                                           attribute: "sampleRequests",                    type: "string", len: "<=60"},
            "8460": {  desc: "Normalwert-Text",                                                         attribute: "sampleNormalValueText",             type: "string", len: "<=990"},
            "8461": {  desc: "Normalwert untere Grenze",                                                attribute: "sampleNormalValueLowerBound",       type: "float",len: "<=60"},
            "8462": {  desc: "Normalwert obere Grenze",                                                 attribute: "sampleNormalValueUpperBound",       type: "float", len: "<=60"},
            "8491": {  desc: "Einwilligungserklärung des Patienten liegt vor",                          attribute: "patientWrittenApprovalExists",      type: "number",len: "1"},
            "8501": {  desc: "Dringlichkeit",                                                           attribute: "sampleUrgency",                     type: "number", len: "1",   mapper: "dringlichkeit"},
            "8504": {  desc: "Medikamenteneinnahme zum Zeitpunkt der Probenentnahme",                   attribute: "medicationTaken",                   type: "number",len: "1",    mapper: "noYes"},
            "8511": {  desc: "Schwangerschaftsdauer (in Wochen, Tage)",                                 attribute: "pregnancyGestationLen",             type: "num",len: "3",       mapper: "weekDays"},
            "8512": {  desc: "1. Tag des letzten Zyklus",                                               attribute: "firstDayOfLastCycle",               type: "date",len: "8",      mapper: "date"},
            "8520": {  desc: "Menge des Probenmaterials",                                               attribute: "sampleAmountVal",                   type: "float",len: "<=60",  mapper: "sampleAmountVal"},
            "8522": {  desc: "Sammelzeit des Probenmaterials",                                          attribute: "sampleCollectionTime",              type: "time", len: "4"},
            "8523": {  desc: "Wirkstoffmenge, Menge / Bezugsmenge, Wirkstärke",                         attribute: "amount_volume_dosage",              type: "float",len: "<=60",  mapper: "timespan"},
            "8608": {  desc: "Kommentar / Aktenzeichen",                                                attribute: "Comment_RefNumber",                 type: "string", len: "<=60"},
            "8610": {  desc: "Privattarif",                                                             attribute: "privateCharges",                    type: "number", len: "1",   mapper: "privattarif"},
            "8611": {  desc: "zusätzlicher Befundweg",                                                  attribute: "additionalWayFindings",             type: "number",len: "1",    mapper: "zusBefundweg"},
            "8614": {  desc: "bereits abgerechnet",                                                     attribute: "billingAlreadyDone",                type: "number",len: "1",    mapper: "noYes"},
            "8990": {  desc: "Namenskürzel / Namenszeichen",                                            attribute: "nameInitials",                      type: "string", len: "<=60"},
            "9300": {  desc: "Prüfsumme",                                                               attribute: "checksum",                          type: "string", len: "40"},
            "9908": {  desc: "Originaldokument: Pfad / Speicherort",                                    attribute: "documentOriginalPath",              type: "string",len: "<=60"},
            "9909": {  desc: "Langzeit-Archivierung: Pfad / Speicherort",                               attribute: "documentArchivePath",               type: "string",len: "<=60"},
            "9970": {  desc: "Dokumententyp",                                                           attribute: "documentType",                      type: "string", len: "3",   mapper: "documentType"},
            "9980": {  desc: "Externe Dokumenten-ID zur Archivierung",                                  attribute: "documentExternalId",                type: "string"},
            "9981": {  desc: "Dokumentenquelle",                                                        attribute: "documentSource",                    type: "number", len: "1",   mapper: "documentSource"},
            "0000": {  desc: "invalid",                                                                 attribute: "invalid",                           type: "string", len: "42"}
        };
        ldt311.objects = {
            "Obj_0001": {
                desc: "Abrechnungsinformationen", fk: {
                    "fk8102": {
                        amount: "n", optional: true, children: {
                            "Obj_0002": {amount: "1", optional: false}
                        }
                    },
                    "fk8103": {
                        amount: "n", optional: true, children: {
                            "Obj_0003": {amount: "1", optional: false}
                        }
                    },
                    "fk8104": {
                        amount: "1", optional: true, children: {
                            "Obj_0004": {amount: "1", optional: false}
                        }
                    },
                    "fk8105": {
                        amount: "1", optional: true, children: {
                            "Obj_0005": {amount: "1", optional: false}
                        }
                    },
                    "fk8106": {
                        amount: "1", optional: true, children: {
                            "Obj_0006": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0002": {
                desc: "Abrechnung GKV", fk: {
                    "fk4239": {amount: "1", optional: false},
                    "fk4134": {amount: "1", optional: false},
                    "fk4104": {amount: "1", optional: false},
                    "fk4106": {amount: "1", optional: false},
                    "fk4108": {amount: "1", optional: true},
                    "fk3116": {amount: "1", optional: true},
                    "fk3108": {amount: "1", optional: true},
                    "fk4109": {amount: "1", optional: true},
                    "fk4133": {amount: "1", optional: true},
                    "fk4110": {amount: "1", optional: true},
                    "fk4111": {amount: "1", optional: false},
                    "fk4229": {amount: "n", optional: true},
                    "fk4122": {amount: "1", optional: false},
                    "fk4124": {amount: "1", optional: true},
                    "fk4126": {amount: "n", optional: true},
                    "fk4131": {amount: "1", optional: true},
                    "fk4132": {amount: "1", optional: true},
                    "fk4202": {amount: "1", optional: true},
                    "fk4204": {amount: "1", optional: true},
                    "fk4221": {amount: "1", optional: true},
                    "fk4231": {amount: "1", optional: true},
                    "fk4241": {amount: "1", optional: true},
                    "fk4248": {amount: "1", optional: true},
                    "fk4217": {amount: "1", optional: true},
                    "fk4225": {amount: "1", optional: true}
                }
            },
            "Obj_0003": {
                desc: "Abrechnung PKV", fk: {
                    "fk7362": {amount: "1", optional: false},
                    "fk4134": {amount: "n", optional: true},
                    "fk4121": {
                        amount: "1", optional: false, children: {
                            "fk4202": {amount: "1", optional: true},
                            "fk8148": {
                                amount: "1", optional: true, children: {
                                    "Obj_0048": {amount: "1", optional: false}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0004": {
                desc: "Abrechnung Ige-Leistungen", fk: {
                    "fk4121": {amount: "1", optional: false},
                    "fk7253": {
                        amount: "1", optional: false, children: {
                            "fk8148": {
                                amount: "1", optional: true, children: {
                                    "Obj_0048": {amount: "1", optional: false}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0005": {
                desc: "Abrechnung sonstige Kostenübernahme", fk: {
                    "fk7261": {amount: "1", optional: true},
                    "fk7253": {
                        amount: "1", optional: false, children: {
                            "fk8148": {
                                amount: "1", optional: true, children: {
                                    "Obj_0048": {amount: "1", optional: false}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0006": {
                desc: "Abrechnung Selektivvertrag", fk: {
                    "fk3130": {
                        amount: "1", optional: false, children: {
                            "fk3134": {
                                amount: "1", optional: false, children: {
                                    "fk4134": {amount: "1", optional: true}
                                }
                            },
                            "fk3131": {amount: "1", optional: true},
                            "fk3132": {amount: "1", optional: true},
                            "fk3133": {amount: "1", optional: true},
                            "fk7430": {amount: "1", optional: true}
                        }
                    },
                    "fk4121": {amount: "1", optional: true},
                    "fk8148": {
                        amount: "1", optional: false, children: {
                            "Obj_0048": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0007": {
                desc: "Anschrift", fk: {
                    "fk3112": {
                        amount: "1", optional: true, children: {
                            "fk3113": {amount: "1", optional: true},
                            "fk3107": {amount: "1", optional: true},
                            "fk3109": {amount: "1", optional: true},
                            "fk3115": {amount: "1", optional: true}
                        }
                    },
                    "fk3114": {amount: "1", optional: true},
                    "fk3121": {
                        amount: "1", optional: true, children: {
                            "fk3122": {amount: "1", optional: true},
                            "fk3123": {amount: "1", optional: true}
                        }
                    },
                    "fk3124": {amount: "1", optional: true},
                    "fk1202": {amount: "n", optional: true}
                }
            },
            "Obj_0008": {
                desc: "Adressat", fk: {
                    "fk8147": {
                        amount: "1", optional: true, children: {
                            "Obj_0047": {amount: "1", optional: false}
                        }
                    },
                    "fk8143": {
                        amount: "1", optional: true, children: {
                            "Obj_0043": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0010": {
                desc: "Anhang", fk: {
                    "fk9970": {amount: "1", optional: false},
                    "fk6221": {amount: "1", optional: true},
                    "fk6305": {amount: "1", optional: true},
                    "fk8242": {
                        amount: "1", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk6303": {amount: "1", optional: false},
                    "fk6328": {amount: "1", optional: true},
                    "fk6327": {amount: "1", optional: true},
                    "fk9908": {amount: "1", optional: true},
                    "fk9909": {amount: "1", optional: true},
                    "fk9980": {amount: "n", optional: true},
                    "fk9981": {amount: "1", optional: true}
                }
            },
            "Obj_0011": {
                desc: "Antibiogramm", fk: {
                    "fk7287": {
                        amount: "n", optional: false, children: {
                            "fk7288": {amount: "n", optional: true},
                            "fk7359": {amount: "n", optional: true},
                            "fk7370": {amount: "n", optional: true},
                            "fk7354": {
                                amount: "n", optional: true, children: {
                                    "fk7367": {amount: "1", optional: true},
                                    "fk7389": {
                                        amount: "1", optional: true, children: {
                                            "fk7369": {amount: "1", optional: true}
                                        }
                                    },
                                    "fk7290": {
                                        amount: "n", optional: true, children: {
                                            "fk7424": {amount: "1", optional: true}
                                        }
                                    }
                                }
                            },
                            "fk8237": {
                                amount: "1", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0013": {
                desc: "Auftragsinformation", fk: {
                    "fk8310": {
                        amount: "1", optional: false, children: {
                            "fk8313": {amount: "n", optional: true}
                        }
                    },
                    "fk8311": {amount: "1", optional: true},
                    "fk7268": {amount: "1", optional: true},
                    "fk0080": {
                        amount: "1", optional: true, children: {
                            "fk0081": {amount: "n", optional: true}
                        }
                    },
                    "fk8118": {
                        amount: "1", optional: true, children: {
                            "Obj_0031": {amount: "1", optional: false}
                        }
                    },
                    "fk8611": {
                        amount: "n", optional: true, children: {
                            "fk8147": {
                                amount: "1", optional: true, children: {
                                    "Obj_0047": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8213": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8238": {
                        amount: "1", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: false, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0014": {
                desc: "Arztidentifikation", fk: {
                    "fk8147": {
                        amount: "1", optional: false, children: {
                            "Obj_0047": {amount: "1", optional: false}
                        }
                    },
                    "fk0212": {amount: "n", optional: true},
                    "fk0223": {amount: "n", optional: true},
                    "fk0306": {amount: "1", optional: true},
                    "fk0307": {
                        amount: "n", optional: true, children: {
                            "fk0308": {amount: "n", optional: true}
                        }
                    },
                    "fk0222": {amount: "1", optional: true}
                }
            },
            "Obj_0017": {
                desc: "Befundinformationen", fk: {
                    "fk8310": {
                        amount: "1", optional: true, children: {
                            "fk8313": {amount: "n", optional: true},
                            "fk8214": {
                                amount: "1", optional: true, children: {
                                    "Obj_0054": {amount: "1", optional: false}
                                }
                            },
                            "fk8215": {
                                amount: "1", optional: true, children: {
                                    "Obj_0054": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8311": {
                        amount: "1", optional: false, children: {
                            "fk7305": {amount: "1", optional: true},
                            "fk8401": {amount: "1", optional: true}
                        }
                    },
                    "fk0080": {
                        amount: "1", optional: true, children: {
                            "fk0081": {amount: "n", optional: true}
                        }
                    },
                    "fk7258": {
                        amount: "1", optional: true, children: {
                            "fk7251": {amount: "1", optional: true}
                        }
                    },
                    "fk4229": {amount: "n", optional: true},
                    "fk8118": {
                        amount: "1", optional: true, children: {
                            "Obj_0031": {amount: "1", optional: false}
                        }
                    },
                    "fk8611": {
                        amount: "n", optional: true, children: {
                            "fk8147": {
                                amount: "1", optional: true, children: {
                                    "Obj_0047": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk7320": {
                        amount: "1", optional: true, children: {
                            "fk8154": {
                                amount: "1", optional: true, children: {
                                    "Obj_0054": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8247": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8216": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    },
                    "fk8126": {
                        amount: "n", optional: true, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: false, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0019": {
                desc: "Betriebsstätte", fk: {
                    "fk0204": {amount: "n", optional: false},
                    "fk0203": {
                        amount: "1", optional: false, children: {
                            "fk0200": {amount: "1", optional: true},
                            "fk0201": {amount: "1", optional: true},
                            "fk0213": {amount: "1", optional: true},
                            "fk8143": {
                                amount: "1", optional: true, children: {
                                    "Obj_0043": {amount: "1", optional: false}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0022": {
                desc: "Einsenderidentifikation", fk: {
                    "fk7321": {amount: "n", optional: false},
                    "fk8312": {
                        amount: "1", optional: true, children: {
                            "fk7267": {amount: "1", optional: true}
                        }
                    },
                    "fk8114": {
                        amount: "1", optional: true, children: {
                            "Obj_0014": {amount: "1", optional: false}
                        }
                    },
                    "fk8240": {
                        amount: "1", optional: true, children: {
                            "Obj_0014": {amount: "1", optional: false}
                        }
                    },
                    "fk8241": {
                        amount: "1", optional: true, children: {
                            "Obj_0014": {amount: "1", optional: false}
                        }
                    },
                    "fk8147": {
                        amount: "1", optional: true, children: {
                            "Obj_0047": {amount: "1", optional: false}
                        }
                    },
                    "fk7268": {amount: "1", optional: true},
                    "fk8119": {
                        amount: "1", optional: true, children: {
                            "Obj_0019": {amount: "1", optional: false}
                        }
                    },
                    "fk8143": {
                        amount: "1", optional: true, children: {
                            "Obj_0043": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0026": {
                desc: "Fehlermeldung/Aufmerksamkeit", fk: {
                    "fk7280": {
                        amount: "n", optional: false, children: {
                            "fk7320": {
                                amount: "1", optional: true, children: {
                                    "fk8154": {
                                        amount: "1", optional: true, children: {
                                            "Obj_0054": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk8147": {
                        amount: "1", optional: false, children: {
                            "Obj_0047": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0027": {
                desc: "Veranlassungsgrund", fk: {
                    "fk7303": {
                        amount: "n", optional: false, children: {
                            "fk8417": {
                                amount: "1", optional: false, children: {
                                    "fk8427": {
                                        amount: "1", optional: false, children: {
                                            "fk8217": {amount: "1", optional: false},
                                            "Obj_0068": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            },
                            "fk8200": {
                                amount: "n", optional: false, children: {
                                    "Obj_0100": {amount: "1", optional: false}
                                }
                            },
                            "fk4208": {
                                amount: "n", optional: false, children: {
                                    "fk8170": {
                                        amount: "n", optional: true, children: {
                                            "Obj_0070": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: false, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0031": {
                desc: "Kommunikationsdaten", fk: {
                    "fk7330": {amount: "n", optional: true},
                    "fk7331": {amount: "n", optional: true},
                    "fk7332": {
                        amount: "n", optional: true, children: {
                            "fk7340": {amount: "1", optional: true}
                        }
                    },
                    "fk7333": {amount: "n", optional: true},
                    "fk7335": {amount: "n", optional: true},
                    "fk7334": {amount: "n", optional: true}
                }
            },
            "Obj_0032": {
                desc: "Kopfdaten", fk: {
                    "fk0001": {amount: "1", optional: false},
                    "fk8151": {
                        amount: "1", optional: false, children: {
                            "Obj_0051": {amount: "1", optional: false}
                        }
                    },
                    "fk8218": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8212": {
                        amount: "1", optional: true, children: {
                            "Obj_0043": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0034": {
                desc: "Krebsfrüherkennung Frauen (Muster39)", fk: {
                    "fk7295": {amount: "1", optional: false},
                    "fk7296": {amount: "1", optional: true},
                    "fk7297": {amount: "1", optional: true},
                    "fk7298": {amount: "1", optional: true},
                    "fk7299": {amount: "1", optional: true},
                    "fk7336": {
                        amount: "1", optional: true, children: {
                            "fk7337": {amount: "n", optional: true}
                        }
                    },
                    "fk7338": {amount: "1", optional: true},
                    "fk3668": {amount: "1", optional: true},
                    "fk8512": {amount: "1", optional: true},
                    "fk7339": {amount: "1", optional: true},
                    "fk7380": {amount: "1", optional: true},
                    "fk7381": {amount: "1", optional: true},
                    "fk7382": {amount: "1", optional: true},
                    "fk7383": {amount: "1", optional: true},
                    "fk7384": {amount: "1", optional: true},
                    "fk7385": {amount: "1", optional: true},
                    "fk7386": {amount: "1", optional: true},
                    "fk7387": {amount: "1", optional: true},
                    "fk7388": {amount: "1", optional: true},
                    "fk7389": {amount: "1", optional: true},
                    "fk7390": {amount: "1", optional: true},
                    "fk7391": {amount: "1", optional: true},
                    "fk7392": {amount: "1", optional: true},
                    "fk7393": {amount: "1", optional: true},
                    "fk7394": {amount: "1", optional: true},
                    "fk7395": {amount: "1", optional: true},
                    "fk7396": {amount: "1", optional: true},
                    "fk7397": {amount: "1", optional: true},
                    "fk7423": {amount: "1", optional: true},
                    "fk7398": {amount: "1", optional: true},
                    "fk7399": {amount: "1", optional: true},
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0035": {
                desc: "Laborergebnisbericht", fk: {
                    "fk8160": {
                        amount: "n", optional: true, children: {
                            "Obj_0060": {amount: "1", optional: false}
                        }
                    },
                    "fk8161": {
                        amount: "n", optional: true, children: {
                            "Obj_0061": {amount: "1", optional: false}
                        }
                    },
                    "fk8162": {
                        amount: "n", optional: true, children: {
                            "Obj_0062": {amount: "1", optional: false}
                        }
                    },
                    "fk8163": {
                        amount: "n", optional: true, children: {
                            "Obj_0063": {amount: "1", optional: false}
                        }
                    },
                    "fk8155": {
                        amount: "n", optional: true, children: {
                            "Obj_0055": {amount: "1", optional: false}
                        }
                    },
                    "fk8248": {
                        amount: "n", optional: true, children: {
                            "Obj_0073": {amount: "1", optional: false}
                        }
                    },
                    "fk8156": {
                        amount: "n", optional: true, children: {
                            "Obj_0056": {amount: "1", optional: false}
                        }
                    },
                    "fk8221": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: true, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0036": {
                desc: "Laborkennung", fk: {
                    "fk8239": {
                        amount: "1", optional: true, children: {
                            "Obj_0043": {amount: "1", optional: false}
                        }
                    },
                    "fk7352": {amount: "n", optional: true},
                    "fk8324": {amount: "1", optional: true},
                    "fk7266": {amount: "1", optional: false}
                }
            },
            "Obj_0037": {
                desc: "Material", fk: {
                    "fk7364": {amount: "1", optional: false},
                    "fk8429": {amount: "1", optional: true},
                    "fk8428": {amount: "1", optional: true},
                    "fk8430": {amount: "1", optional: true},
                    "fk8431": {amount: "1", optional: true},
                    "fk7292": {amount: "1", optional: true},
                    "fk7310": {
                        amount: "1", optional: true, children: {
                            "fk7311": {amount: "1", optional: true},
                            "fk7312": {
                                amount: "1", optional: true, children: {
                                    "fk8167": {
                                        amount: "1", optional: true, children: {
                                            "Obj_0068": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk8504": {
                        amount: "n", optional: true, children: {
                            "fk8170": {
                                amount: "1", optional: true, children: {
                                    "Obj_0070": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk7318": {amount: "n", optional: true},
                    "fk8520": {
                        amount: "1", optional: true, children: {
                            "fk8421": {amount: "1", optional: true},
                            "fk8522": {amount: "1", optional: true}
                        }
                    },
                    "fk8219": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8220": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8126": {
                        amount: "1", optional: true, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: false, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0040": {
                desc: "Mutterschaft", fk: {
                    "fk3668": {
                        amount: "1", optional: false, children: {
                            "fk3664": {amount: "1", optional: true},
                            "fk3666": {amount: "1", optional: true}
                        }
                    }
                }
            },
            "Obj_0041": {
                desc: "Namenskennung", fk: {
                    "fk7420": {
                        amount: "1", optional: false, children: {
                            "fk7358": {
                                amount: "1", optional: true, children: {
                                    "fk8990": {amount: "1", optional: true},
                                    "fk8110": {
                                        amount: "1", optional: true, children: {
                                            "Obj_0010": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0042": {
                desc: "Normalwert", fk: {
                    "fk8424": {
                        amount: "1", optional: false, children: {
                            "fk8167": {
                                amount: "1", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8460": {amount: "n", optional: true},
                    "fk8461": {
                        amount: "1", optional: true, children: {
                            "fk8419": {
                                amount: "1", optional: true, children: {
                                    "fk8421": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk8462": {
                        amount: "1", optional: true, children: {
                            "fk8419": {
                                amount: "1", optional: true, children: {
                                    "fk8421": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk7316": {
                        amount: "1", optional: true, children: {
                            "fk7317": {amount: "n", optional: true}
                        }
                    },
                    "fk7363": {
                        amount: "1", optional: true, children: {
                            "fk8419": {
                                amount: "1", optional: true, children: {
                                    "fk8421": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk7371": {
                        amount: "1", optional: true, children: {
                            "fk8419": {
                                amount: "1", optional: true, children: {
                                    "fk8421": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk8422": {
                        amount: "1", optional: false, children: {
                            "fk8126": {
                                amount: "1", optional: true, children: {
                                    "Obj_0026": {amount: "1", optional: false}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0043": {
                desc: "Organisation", fk: {
                    "fk1250": {
                        amount: "1", optional: false, children: {
                            "fk1251": {amount: "1", optional: true},
                            "fk1252": {
                                amount: "n", optional: true, children: {
                                    "fk8147": {
                                        amount: "1", optional: true, children: {
                                            "Obj_0047": {amount: "n", optional: true}
                                        }
                                    }
                                }
                            },
                            "fk8229": {
                                amount: "1", optional: true, children: {
                                    "Obj_0007": {amount: "n", optional: true}
                                }
                            },
                            "fk8230": {
                                amount: "1", optional: true, children: {
                                    "Obj_0007": {amount: "1", optional: true}
                                }
                            },
                            "fk8131": {
                                amount: "1", optional: true, children: {
                                    "Obj_0031": {amount: "1", optional: true}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0045": {
                desc: "Patient", fk: {
                    "fk8147": {
                        amount: "1", optional: false, children: {
                            "Obj_0047": {amount: "1", optional: false}
                        }
                    },
                    "fk3119": {amount: "1", optional: true},
                    "fk3105": {amount: "1", optional: true},
                    "fk7329": {amount: "1", optional: true},
                    "fk7922": {amount: "1", optional: true},
                    "fk3000": {amount: "1", optional: true}
                }
            },
            "Obj_0047": {
                desc: "Person", fk: {
                    "fk7420": {amount: "1", optional: true},
                    "fk3100": {amount: "1", optional: true},
                    "fk3120": {amount: "1", optional: true},
                    "fk3101": {amount: "1", optional: false},
                    "fk3102": {amount: "n", optional: false},
                    "fk3103": {amount: "1", optional: true},
                    "fk3104": {amount: "1", optional: true},
                    "fk3110": {amount: "1", optional: true},
                    "fk3628": {amount: "1", optional: true},
                    "fk8990": {amount: "1", optional: true},
                    "fk8228": {
                        amount: "1", optional: true, children: {
                            "Obj_0007": {amount: "1", optional: false}
                        }
                    },
                    "fk8229": {
                        amount: "1", optional: true, children: {
                            "Obj_0007": {amount: "1", optional: false}
                        }
                    },
                    "fk8230": {
                        amount: "1", optional: true, children: {
                            "Obj_0007": {amount: "1", optional: false}
                        }
                    },
                    "fk8232": {
                        amount: "1", optional: true, children: {
                            "Obj_0031": {amount: "1", optional: false}
                        }
                    },
                    "fk8233": {
                        amount: "1", optional: true, children: {
                            "Obj_0031": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0048": {
                desc: "RgEmpfänger", fk: {
                    "fk8310": {amount: "1", optional: false},
                    "fk7421": {amount: "1", optional: false},
                    "fk0600": {
                        amount: "1", optional: true, children: {
                            "fk7328": {amount: "1", optional: true}
                        }
                    },
                    "fk8108": {
                        amount: "1", optional: false, children: {
                            "Obj_0008": {amount: "1", optional: false}
                        }
                    },
                    "fk8610": {amount: "1", optional: true},
                    "fk8608": {amount: "1", optional: true}
                }
            },
            "Obj_0050": {
                desc: "Schwangerschaft", fk: {
                    "fk8511": {amount: "1", optional: true},
                    "fk8512": {amount: "1", optional: true},
                    "fk3471": {amount: "1", optional: true}
                }
            },
            "Obj_0051": {
                desc: "Sendendes System", fk: {
                    "fk8315": {amount: "1", optional: true},
                    "fk8316": {amount: "1", optional: true},
                    "fk0105": {amount: "1", optional: true},
                    "fk8212": {
                        amount: "1", optional: true, children: {
                            "Obj_0043": {amount: "1", optional: false}
                        }
                    },
                    "fk0103": {
                        amount: "1", optional: false, children: {
                            "fk0132": {amount: "1", optional: true}
                        }
                    }
                }
            },
            "Obj_0053": {
                desc: "Tier/Sonstiges", fk: {
                    "fk7319": {amount: "1", optional: true},
                    "fk7313": {amount: "1", optional: true},
                    "fk7314": {amount: "1", optional: true},
                    "fk7315": {
                        amount: "1", optional: true, children: {
                            "fk7326": {amount: "1", optional: true}
                        }
                    },
                    "fk7351": {amount: "1", optional: true},
                    "fk7428": {amount: "1", optional: true},
                    "fk7432": {amount: "1", optional: true},
                    "fk8107": {
                        amount: "1", optional: true, children: {
                            "Obj_0007": {amount: "1", optional: false}
                        }
                    },
                    "fk8147": {
                        amount: "1", optional: true, children: {
                            "Obj_0047": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0054": {
                desc: "Timestamp", fk: {
                    "fk7278": {amount: "1", optional: false},
                    "fk7279": {amount: "1", optional: true},
                    "fk7273": {amount: "1", optional: false},
                    "fk7272": {amount: "1", optional: true},
                    "fk8235": {
                        amount: "1", optional: true, children: {
                            "Obj_0047": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0055": {
                desc: "Transfusionsmedizin/Mutterschaftsvorsorge", fk: {
                    "fk7304": {amount: "1", optional: false},                         //  resultId
                    "fk7364": {amount: "n", optional: false},                         //  probeContainerId
                    "fk8418": {amount: "1", optional: false},                         //  testStatus
                    "fk3412": {amount: "1", optional: true},                          //  bloodTypeEuroCode
                    "fk3413": {amount: "1", optional: true},                          //  antibodySearchTest
                    "fk3414": {amount: "1", optional: true},                          //  specErythrocytesAntigens
                    "fk3415": {amount: "1", optional: true},                          //  specErythrocytesAntibodies
                    "fk3416": {amount: "1", optional: true},                          //  specHlaHpaHnaAntigens
                    "fk3417": {amount: "1", optional: true},                          //  specHlaHpaHnaAntibodies
                    "fk7263": {amount: "1", optional: true},                          //  testIdCode
                    "fk3418": {amount: "1", optional: true},                          //  testDCT (Direct Coombs Test / Direct Antiglobulin Test)
                    "fk3419": {
                        amount: "n", optional: true, children: {               //  resultCrossMatching
                            "fk7275": {amount: "n", optional: true}
                        }
                    },                        //  terminologyId
                    "fk3420": {amount: "1", optional: true},                          //  requirementNHP
                    "fk8220": {
                        amount: "1", optional: true, children: {               //  obj_0054Attribute8 (timestamp input capture material)
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },                       //  ...
                    "fk8222": {
                        amount: "1", optional: true, children: {               //  obj_0054Attribute10 (timestamp begin analysis)
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },                       //  ...
                    "fk8223": {
                        amount: "1", optional: true, children: {               //  obj_0054Attribute11 (tempstamp results created)
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },                       //  ...
                    "fk8224": {
                        amount: "1", optional: true, children: {               //  obj_0054Attribute12 (timestamp QM recorded)
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },                       //  ...
                    "fk8225": {
                        amount: "1", optional: true, children: {               //  obj_0054Attribute13 (timestamp measurement)
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },                       //  ...
                    "fk8126": {
                        amount: "1", optional: true, children: {               //  obj_0054Attribute13 (timestamp measurement)
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },                       //  ...
                    "fk8167": {
                        amount: "n", optional: true, children: {               //  Not documented --- actually Obj_0068
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },                       //  ...
                    "fk7429": {amount: "1", optional: true},
                    "fk8158": {
                        amount: "1", optional: true, children: {               //  obj_0058Attribute (investigation billing)
                            "Obj_0058": {amount: "1", optional: false}
                        }
                    }                        //  ...
                }
            },
            "Obj_0056": {
                desc: "Tumor", fk: {
                    "fk7364": {amount: "1", optional: false},
                    "fk7372": {amount: "1", optional: true},
                    "fk7373": {amount: "1", optional: true},
                    "fk7374": {amount: "1", optional: true},
                    "fk7375": {amount: "1", optional: true},
                    "fk7376": {amount: "1", optional: false},
                    "fk7377": {amount: "n", optional: true},
                    "fk7378": {amount: "1", optional: true},
                    "fk7379": {amount: "1", optional: true},
                    "fk3424": {amount: "1", optional: true},
                    "fk3425": {amount: "1", optional: true},
                    "fk8220": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8222": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8223": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8224": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8225": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8126": {
                        amount: "1", optional: true, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk7429": {amount: "1", optional: true},
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0058": {
                desc: "Untersuchungsabrechnung", fk: {
                    "fk7303": {amount: "1", optional: false},
                    "fk4121": {amount: "1", optional: false},
                    "fk5001": {
                        amount: "n", optional: true, children: {
                            "fk8406": {amount: "1", optional: true},
                            "fk5005": {amount: "1", optional: true},
                            "fk5009": {amount: "n", optional: true},
                            "fk8614": {amount: "1", optional: false}
                        }
                    },
                    "fk7259": {amount: "1", optional: true},
                    "fk7251": {amount: "1", optional: false}
                }
            },
            "Obj_0059": {
                desc: "Untersuchungsanforderung", fk: {
                    "fk7260": {
                        amount: "1", optional: true, children: {
                            "fk7352": {amount: "1", optional: true},
                            "fk7251": {amount: "1", optional: true},
                            "fk7365": {
                                amount: "1", optional: true, children: {
                                    "fk7366": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk7276": {amount: "1", optional: true},
                    "fk8410": {
                        amount: "1", optional: true, children: {
                            "fk8411": {amount: "1", optional: true}
                        }
                    },
                    "fk7303": {amount: "1", optional: false},
                    "fk8501": {amount: "1", optional: true},
                    "fk8423": {amount: "1", optional: true},
                    "fk7364": {
                        amount: "n", optional: false, children: {
                            "fk8428": {amount: "1", optional: true},
                            "fk8429": {amount: "1", optional: true}
                        }
                    },
                    "fk8434": {amount: "1", optional: true},
                    "fk8134": {
                        amount: "1", optional: true, children: {
                            "Obj_0034": {amount: "1", optional: false}
                        }
                    },
                    "fk8156": {
                        amount: "1", optional: true, children: {
                            "Obj_0056": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8238": {
                        amount: "1", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8491": {
                        amount: "1", optional: true, children: {
                            "fk8110": {
                                amount: "1", optional: true, children: {
                                    "Obj_0010": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8213": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: true, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0060": {
                desc: "Untersuchungsergebnis Klinische Chemie", fk: {
                    "fk7304": {amount: "1", optional: false},                 //  resultId
                    "fk7364": {amount: "n", optional: false},                 //  probeContainerId
                    "fk7260": {
                        amount: "1", optional: true, children: {
                            "fk7352": {amount: "1", optional: true},
                            "fk7251": {amount: "1", optional: true},
                            "fk7365": {
                                amount: "1", optional: true, children: {
                                    "fk7366": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk8410": {
                        amount: "1", optional: true, children: {
                            "fk8411": {amount: "1", optional: true},
                            "fk7263": {amount: "1", optional: true},
                            "fk7264": {amount: "1", optional: true}
                        }
                    },
                    "fk8418": {
                        amount: "1", optional: true, children: {
                            "fk7302": {amount: "n", optional: true}
                        }
                    },
                    "fk7306": {
                        amount: "n", optional: false, children: {
                            "fk8420": {
                                amount: "n", optional: false, children: {
                                    "fk8419": {
                                        amount: "1", optional: false, children: {
                                            "fk8421": {amount: "1", optional: false}
                                        }
                                    },
                                    "fk8142": {
                                        amount: "n", optional: false, children: {
                                            "Obj_0042": {amount: "1", optional: false}
                                        }
                                    },
                                    "fk8225": {
                                        amount: "1", optional: false, children: {
                                            "Obj_0054": {amount: "1", optional: false}
                                        }
                                    },
                                    "fk8237": {
                                        amount: "1", optional: false, children: {
                                            "Obj_0068": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            },
                            "fk8236": {
                                amount: "1", optional: false, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8220": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8222": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8223": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8224": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8126": {
                        amount: "1", optional: true, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: false, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    },
                    "fk8158": {
                        amount: "1", optional: true, children: {
                            "Obj_0058": {amount: "1", optional: false}
                        }
                    },
                    "fk7429": {amount: "1", optional: true},
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0061": {
                desc: "Untersuchungsergebnis Mikrobiologie", fk: {
                    "fk7304": {amount: "1", optional: false},
                    "fk7364": {amount: "n", optional: false},
                    "fk7260": {
                        amount: "n", optional: true, children: {
                            "fk7352": {amount: "1", optional: true},
                            "fk7251": {amount: "1", optional: true},
                            "fk7365": {
                                amount: "1", optional: true, children: {
                                    "fk7366": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk8410": {
                        amount: "n", optional: true, children: {
                            "fk8411": {amount: "1", optional: true}
                        }
                    },
                    "fk8434": {amount: "n", optional: true},
                    "fk7281": {
                        amount: "n", optional: false, children: {
                            "fk7302": {amount: "1", optional: true}
                        }
                    },
                    "fk8418": {amount: "1", optional: false},
                    "fk8244": {
                        amount: "n", optional: true, children: {
                            "Obj_0072": {amount: "1", optional: false}
                        }
                    },
                    "fk7354": {
                        amount: "n", optional: true, children: {
                            "fk7355": {amount: "1", optional: true},
                            "fk7427": {amount: "1", optional: true},
                            "fk7301": {amount: "1", optional: true},
                            "fk7357": {
                                amount: "1", optional: true, children: {
                                    "fk7293": {amount: "n", optional: true}
                                }
                            },
                            "fk7356": {amount: "1", optional: true},
                            "fk7285": {amount: "1", optional: true},
                            "fk7361": {
                                amount: "1", optional: true, children: {
                                    "fk7251": {amount: "1", optional: true}
                                }
                            },
                            "fk8236": {
                                amount: "1", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            },
                            "fk8225": {
                                amount: "1", optional: true, children: {
                                    "Obj_0054": {amount: "1", optional: false}
                                }
                            },
                            "fk8237": {
                                amount: "1", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk7286": {
                        amount: "n", optional: false, children: {
                            "fk8111": {
                                amount: "1", optional: true, children: {
                                    "Obj_0011": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8237": {
                        amount: "1", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8220": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8222": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8223": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8224": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8225": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8126": {
                        amount: "1", optional: true, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: false, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    },
                    "fk8158": {
                        amount: "1", optional: true, children: {
                            "Obj_0058": {amount: "1", optional: false}
                        }
                    },
                    "fk7429": {amount: "1", optional: true},
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0062": {
                desc: "Untersuchungsergebnis Zytologie Krebsvorsorge", fk: {
                    "fk7304": {amount: "1", optional: false},
                    "fk7364": {amount: "n", optional: false},
                    "fk8410": {
                        amount: "1", optional: false, children: {
                            "fk8411": {amount: "1", optional: true},
                            "fk8422": {
                                amount: "n", optional: true, children: {
                                    "fk8126": {
                                        amount: "1", optional: true, children: {
                                            "Obj_0026": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            },
                            "fk8237": {
                                amount: "1", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8418": {amount: "1", optional: true},
                    "fk7368": {amount: "1", optional: true},
                    "fk7405": {amount: "1", optional: true},
                    "fk7406": {amount: "1", optional: true},
                    "fk7407": {amount: "1", optional: true},
                    "fk7408": {amount: "1", optional: true},
                    "fk7409": {amount: "1", optional: true},
                    "fk7410": {amount: "1", optional: true},
                    "fk7411": {amount: "1", optional: true},
                    "fk7412": {amount: "1", optional: true},
                    "fk7414": {
                        amount: "1", optional: true, children: {
                            "fk7413": {amount: "1", optional: true}
                        }
                    },
                    "fk7415": {amount: "1", optional: false},
                    "fk7416": {amount: "1", optional: true},
                    "fk7417": {amount: "1", optional: false},
                    "fk8237": {
                        amount: "1", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8134": {
                        amount: "1", optional: true, children: {
                            "Obj_0034": {amount: "1", optional: false}
                        }
                    },
                    "fk8126": {
                        amount: "1", optional: true, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8220": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8222": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8223": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8224": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8225": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: true, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    },
                    "fk8158": {
                        amount: "1", optional: true, children: {
                            "Obj_0058": {amount: "1", optional: false}
                        }
                    },
                    "fk7429": {amount: "1", optional: true}
                }
            },
            "Obj_0063": {
                desc: "Untersuchungsergebnis Zytologie", fk: {
                    "fk7304": {
                        amount: "1", optional: false, children: {
                            "fk7320": {
                                amount: "1", optional: false, children: {
                                    "fk8154": {
                                        amount: "1", optional: false, children: {
                                            "Obj_0054": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk7364": {amount: "n", optional: false},
                    "fk7260": {
                        amount: "n", optional: false, children: {
                            "fk7352": {amount: "1", optional: false},
                            "fk7251": {amount: "1", optional: false},
                            "fk7365": {
                                amount: "1", optional: false, children: {
                                    "fk7366": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk8410": {
                        amount: "n", optional: false, children: {
                            "fk8411": {amount: "1", optional: false}
                        }
                    },
                    "fk8418": {
                        amount: "1", optional: false, children: {
                            "fk8422": {
                                amount: "n", optional: false, children: {
                                    "fk8126": {
                                        amount: "1", optional: false, children: {
                                            "Obj_0026": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk8237": {
                        amount: "1", optional: false, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk7368": {amount: "1", optional: false},
                    "fk7400": {
                        amount: "1", optional: false, children: {
                            "fk7401": {
                                amount: "1", optional: false, children: {
                                    "fk7402": {amount: "n", optional: true}
                                }
                            },
                            "fk7403": {
                                amount: "1", optional: false, children: {
                                    "fk7404": {amount: "n", optional: true}
                                }
                            }
                        }
                    },
                    "fk7418": {amount: "1", optional: false},
                    "fk7419": {amount: "1", optional: false},
                    "fk7422": {amount: "1", optional: false},
                    "fk7425": {amount: "1", optional: false},
                    "fk7426": {amount: "1", optional: false},
                    "fk8126": {
                        amount: "1", optional: false, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8220": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8222": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8223": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8224": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8225": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: false, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: false, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: false, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    },
                    "fk8158": {
                        amount: "1", optional: true, children: {
                            "Obj_0058": {amount: "1", optional: false}
                        }
                    },
                    "fk7429": {amount: "1", optional: true}
                }
            },
            "Obj_0068": {
                desc: "Fließtext", fk: {
                    "fk3564": {amount: "n", optional: true},
                    "fk6329": {amount: "n", optional: true}
                }
            },
            "Obj_0069": {
                desc: "Körperkenngrössen", fk: {
                    "fk3622": {
                        amount: "1", optional: true, children: {
                            "fk8421": {amount: "1", optional: false},
                            "fk8225": {
                                amount: "1", optional: false, children: {
                                    "Obj_0054": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk3623": {
                        amount: "1", optional: true, children: {
                            "fk8421": {amount: "1", optional: false},
                            "fk8225": {
                                amount: "1", optional: false, children: {
                                    "Obj_0054": {amount: "1", optional: false}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0070": {
                desc: "Medikament", fk: {
                    "fk8243": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk6208": {amount: "1", optional: false},
                    "fk6207": {
                        amount: "1", optional: true, children: {
                            "fk8171": {
                                amount: "n", optional: true, children: {
                                    "Obj_0068": {amount: "1", optional: false}
                                }
                            }
                        }
                    },
                    "fk6206": {amount: "1", optional: true},
                    "fk8523": {
                        amount: "1", optional: true, children: {
                            "fk8421": {amount: "1", optional: true}
                        }
                    },
                    "fk3689": {amount: "n", optional: true},
                    "fk8226": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8227": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "1", optional: false, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    }
                }
            },
            "Obj_0071": {
                desc: "Wirkstoff", fk: {
                    "fk6212": {
                        amount: "1", optional: false, children: {
                            "fk6224": {
                                amount: "1", optional: true, children: {
                                    "fk6214": {amount: "1", optional: true}
                                }
                            },
                            "fk8523": {
                                amount: "1", optional: true, children: {
                                    "fk8421": {amount: "1", optional: true}
                                }
                            }
                        }
                    }
                }
            },
            "Obj_0072": {
                desc: "BAK", fk: {
                    "fk8245": {
                        amount: "1", optional: false, children: {
                            "Obj_0068": {amount: "1", optional: true}
                        }
                    },
                    "fk7306": {
                        amount: "n", optional: false, children: {
                            "fk8420": {
                                amount: "n", optional: false, children: {
                                    "fk8419": {
                                        amount: "1", optional: false, children: {
                                            "fk8421": {amount: "1", optional: false}
                                        }
                                    },
                                    "fk8142": {
                                        amount: "n", optional: false, children: {
                                            "Obj_0042": {amount: "1", optional: false}
                                        }
                                    },
                                    "fk8237": {
                                        amount: "n", optional: false, children: {
                                            "Obj_0068": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk8246": {
                        amount: "1", optional: false, children: {
                            "Obj_0068": {amount: "1", optional: true}
                        }
                    }
                }
            },
            "Obj_0073": {
                desc: "Sonstige Untersuchungsergebnisse", fk: {
                    "fk7431": {amount: "1", optional: false},
                    "fk7304": {
                        amount: "1", optional: false, children: {
                            "fk7320": {
                                amount: "1", optional: true, children: {
                                    "fk8154": {
                                        amount: "1", optional: true, children: {
                                            "Obj_0054": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk7364": {amount: "n", optional: true},
                    "fk7260": {
                        amount: "1", optional: false, children: {
                            "fk7352": {amount: "1", optional: false},
                            "fk7251": {amount: "1", optional: true},
                            "fk7365": {
                                amount: "1", optional: false, children: {
                                    "fk7366": {amount: "1", optional: true}
                                }
                            }
                        }
                    },
                    "fk8410": {
                        amount: "n", optional: false, children: {
                            "fk8411": {amount: "1", optional: false}
                        }
                    },
                    "fk8418": {
                        amount: "1", optional: false, children: {
                            "fk8422": {
                                amount: "n", optional: false, children: {
                                    "fk8126": {
                                        amount: "1", optional: false, children: {
                                            "Obj_0026": {amount: "1", optional: false}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "fk8237": {
                        amount: "1", optional: false, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk7368": {amount: "1", optional: true},
                    "fk8126": {
                        amount: "1", optional: true, children: {
                            "Obj_0026": {amount: "1", optional: false}
                        }
                    },
                    "fk8220": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8222": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8223": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8224": {
                        amount: "1", optional: true, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8225": {
                        amount: "1", optional: false, children: {
                            "Obj_0054": {amount: "1", optional: false}
                        }
                    },
                    "fk8167": {
                        amount: "n", optional: true, children: {
                            "Obj_0068": {amount: "1", optional: false}
                        }
                    },
                    "fk8110": {
                        amount: "n", optional: true, children: {
                            "Obj_0010": {amount: "1", optional: false}
                        }
                    },
                    "fk8141": {
                        amount: "1", optional: true, children: {
                            "Obj_0041": {amount: "1", optional: false}
                        }
                    },
                    "fk8158": {
                        amount: "1", optional: true, children: {
                            "Obj_0058": {amount: "1", optional: false}
                        }
                    },
                    "fk7429": {amount: "1", optional: true}
                }
            },
            "Obj_0100": {
                desc: "Diagnose", fk: {
                    "fk4207": {amount: "n", optional: true},
                    "fk6001": {
                        amount: "1", optional: true, children: {
                            "fk6003": {amount: "1", optional: true},
                            "fk6004": {amount: "1", optional: true},
                            "fk6006": {amount: "n", optional: true},
                            "fk6008": {amount: "n", optional: true}
                        }
                    }
                }
            }
        };
        ldt311.stringMappers = {
            cm: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, ''+typeof prop === 'object' ? prop.head : prop+'cm'];
            },
            kg: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, ''+typeof prop === 'object' ? prop.head : prop+'kg'];
            },
            byte: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, ''+typeof prop === 'object' ? prop.head : prop+' byte'];
            },
            date: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, moment( prop ).format( TIMESTAMP_FORMAT )];
            },
            time: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, moment( prop ).format( "HH:mm:ss.SSS" )];
            },
            dateTime: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, moment( prop ).format( "YYYY-MM-DD HH:mm:ss.SSS" )];
            },
            weekDays: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, ''+prop.substr( 0, 2 )+' Woche(n), '+prop.substr( 2 )+' Tag(e)'];
            },
            satzID: function( prop/*, propInfo*/ ) {
                //return [propInfo && propInfo.desc, ldt311.saetze[prop].desc];
                return [' - '+ldt311.saetze[prop.head].desc+' - ', undefined, true];
            },
            objTypeHeader: function( prop ) {
                return [prop.head.replace( /_/g, " " ), "", true];
            },
            encoding: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop.desc];
            },
            procedure: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, ''+prop.group+': '+prop.desc+' (BDM01)'];
            },
            resText: function( prop/*, propInfo*/ ) {
                //Y.log("current prop: "+ util.inspect(prop));
                //Y.log("current propInfo: "+ util.inspect(propInfo));
                var
                    ret = "",
                    i;
                for( i = 0; i < prop.length; i++ ) {
                    ret += ''+i > 0 ? '\n' : ''+'    prop[i]';
                }
                return [ret];
            },
            freeCat: function( prop ) {
                return ['    '+prop.head, prop.content];
            },
            sampleAmountVal: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop];
            },
            nbsnr: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop];
            },
            timespan: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, ''+prop[0]+prop[1]+'h', '+'+prop[2]+prop[3]+'m'];
            },
            insurancekind: basicMapper( {
                "1": "Mitglied",
                "3": "Familienversicherter",
                "5": "Rentner"
            } ),
            testResultLimitIndicator: basicMapper( {
                "N": "Normal",
                "H": "schwach erhöht",
                "+": "schwach erhöht",
                "HH": "stark erhöht",
                "++": "stark erhöht",
                "L": "schwach erniedrigt",
                "-": "schwach erniedrigt",
                "LL": "stark erniedrigt",
                "--": "stark erniedrigt",
                "!H": "extrem erhöht",
                "!L": "extrem erniedrigt",
                "A": "auffällig",
                "AA": "sehr auffällig"
            } ),
            findingkind: basicMapper( {
                "1": "Auftrag nicht abgeschlossen",
                "2": "Auftrag abgeschlossen"
            } ),
            testStatus: basicMapper( {
                "01": "keine gesicherte Information",
                "02": "Ergebnis folgt",
                "03": "Ergebnis",
                "04": "Ergebnis korrigiert",
                "05": "Ergebnis ermittelt",
                "06": "Befundergebnis",
                "07": "Befundergebnis bereits berichtet",
                "08": "Befundergebnis korrigiert",
                "09": "Ergebnis fehlt",
                "10": "Erweiterte Analytik erforderlich",
                "11": "Material fehlt",
                "12": "Storniert"
            } ),
            gebueO: basicMapper( {
                "0": "EBM",
                "1": "BMÄ",
                "2": "EGO",
                "3": "GOÄ 96",
                "4": "BG-Tarif"
            } ),
            scheinuntergruppe: basicMapper( {
                "21": "Auftragsleistungen",
                "23": "Konsiliaruntersuchung",
                "24": "Mit-/Weiterbehandlung",
                "27": "Überweisungsschein für Laboratoriumsuntersuchung als Auftragsleistung (Muster 10)",
                "28": "Anforderungsschein für Laboratoriumsuntersuchungen bei Laborgemeinschaften (Muster 10a)"
            } ),
            E010: basicMapper( {} ),
            E011: basicMapper( {
                "1": "ja"
            } ),
            E012: basicMapper( {} ),
            zusBefundweg: basicMapper( {
                "0": "Papier",
                "1": "Telefon",
                "2": "Fax",
                "3": "E-Mail",
                "4": "DFÜ",
                "5": "Tourpost",
                "6": "KV-Connect"
            } ),
            E014: basicMapper( {} ),
            payerBillingArea: basicMapper( {
                "00": "Primärabrechnung",
                "01": "Sozialversicherungsabkommen (SVA)",
                "02": "Bundesversorgungsgesetz (BVG)",
                "03": "Bundesentschädigungsgesetz (BEG)",
                "04": "Grenzgänger (GG)",
                "05": "Rheinschiffer (RHS)",
                "06": "Sozialhilfeträger, ohne Asylstellen (SHT)",
                "07": "Bundesvertriebenengesetz (BVFG) ",
                "08": "Asylstellen (AS)",
                "09": "Schwangerschaftsabbrüche"
            } ),
            kind: basicMapper( {
                "1": "Keim",
                "2": "Pilz"
            } ),
            privattarif: basicMapper( {
                "1": "Privat",
                "2": "Post B",
                "3": "KVB"
            } ),
            gender: basicMapper( {
                "M": "männlich",
                "W": "weiblich",
                "X": "unbestimmt",
                "U": "unbekannt"
            } ),
            insuranceDmp: basicMapper( {
                "00": "keine Angabe",
                "01": "Diabetes mellitus Typ 2",
                "02": "Brustkrebs",
                "03": "Koronare Herzkrankheit",
                "04": "Diabetes mellitus Typ 1",
                "05": "Asthma bronchiale",
                "06": "COPD (chronic obstructive pulmo-nary disease)"
            } ),
            insuranceSpeGroup: basicMapper( {
                "00": "keine Angabe",
                "04": "BSHG (Bundessozialhilfegesetz) § 264 SGB V",
                "06": "BVG (Gesetz über die Versorgung der Opfer des Krieges)",
                "07": "SVA-Kennzeichnung für zwischenstaatliches Krankenversicherunrecht: Personen mit Wohnsitz im Inland, Abrechnung nach Aufwand",
                "08": "SVA-Kennzeichnung, pauschal",
                "09": "Empfänger von Gesundheitsleistungen nach den §§ 4, 6 AsylbLG"
            } ),
            wop: basicMapper( {
                "00": "Dummy bei eGK",
                "01": "Schleswig-Holstein",
                "02": "Hamburg",
                "03": "Bremen",
                "17": "Niedersachsen",
                "20": "Westfalen-Lippe",
                "38": "Nordrhein",
                "46": "Hessen",
                "47": "Koblenz",
                "48": "Rheinhessen",
                "49": "Pfalz",
                "50": "Trier",
                "51": "Rheinland-Pfalz",
                "52": "Baden-Württemberg",
                "55": "Nordbaden",
                "60": "Südbaden",
                "61": "Nordwürttemberg",
                "62": "Südwürttemberg",
                "71": "Bayern",
                "72": "Berlin",
                "73": "Saarland",
                "74": "KBV",
                "78": "Mecklenburg-Vorpommern",
                "83": "Brandenburg",
                "88": "Sachsen-Anhalt",
                "93": "Thüringen",
                "98": "Sachsen"
            } ),
            senderStatus: basicMapperDescLess( {
                "01": "Erstveranlasser",
                "02": "Einsender Arzt",
                "03": "Einsender sonstige",
                "04": "Versicherter",
                "05": "Rechnungsempfänger",
                "06": "Bevollmächtigter",
                "07": "Laborarzt/Befundersteller",
                "08": "Leistungserbringer",
                "11": "Halter (eines Tieres)",
                "12": "Patient",
                "14": "Überweiser",
                "15": "staatliche Einrichtung",
                "16": "sonstige juristische Person",
                "17": "sonstige medizinische Einrichtung"
            } ),
            abrechnungstyp: basicMapper( {
                "1": "Abrechnung Laborfacharzt",
                "2": "Abrechnung Privat-LG"
            } ),
            sensitivity: basicMapper( {
                "S": "sensibel",
                "I": "intermediär",
                "R": "resistent",
                "H": "Hochdosistherapie",
                "N": "IE (keine Interpretation)"
            } ),
            growth: basicMapper( {
                "0": "nicht nachweisbar / kein Wachstum",
                "1": "spärlich",
                "2": "mäßig/vereinzelt",
                "3": "reichlich",
                "4": "massenhaft"
            } ),
            personStatus: basicMapper( {
                "01": "Erstveranlasser",
                "02": "Einsender Arzt",
                "03": "Einsender sonstige",
                "04": "Versicherter",
                "05": "Rechnungsempfänger",
                "06": "Bevollmächtigter",
                "07": "Laborarzt/Befundersteller",
                "08": "Leistungserbringer",
                "09": "Softwareverantwortlicher",
                "10": "Zusätzlicher Befundempfänger",
                "11": "Halter (eines Tieres)",
                "12": "Patient",
                "14": "Überweiser",
                "16": "sonstige juristische Person",
                "17": "Medizinisch-technische/r Assistent/in (MFA)",
                "18": "Medizinische/r Fachangestelle/r (MFA)"
            } ),
            billingRecipientStatus: basicMapper( {
                "02": "Einsender Arzt",
                "03": "Einsender sonstige",
                "04": "Versicherter",
                "05": "Rechnungsempfänger",
                "06": "Bevollmächtigter",
                "11": "Halter (eines Tieres)",
                "12": "Patient",
                "15": "staatliche Einrichtung",
                "16": "sonstige juristische Person",
                "90": "sonstige medizinische Einrichtung"
            } ),
            resistanceInterpretation: basicMapper( {
                "0": "nicht getestet",
                "1": "sensibel/wirksam",
                "2": "mäßig sensibel/schwach wirksam",
                "3": "resistent/unwirksam",
                "4": "wirksam in hohen Konzentrationen",
                "5": "natürliche Resistenz"
            } ),
            E031: basicMapper( {
                "0": "Verdacht auf infektiös",
                "1": "gesichert infektiös"
            } ),
            dringlichkeit: basicMapper( {
                "1": "Notfall/intraoperativ",
                "2": "Eilig"
            } ),
            materialKind: basicMapper( {
                "1": "organisch",
                "2": "anorganisch"
            } ),
            materialIsOrganic: basicMapper( {
                "1": "tierisch",
                "2": "pflanzlich",
                "3": "nicht bestimmbar"
            } ),
            materialIsAnorganic: basicMapper( {
                "1": "Wasser",
                "2": "Luft",
                "3": "nicht bestimmbar",
                "4": "sonstiges"
            } ),
            diagnosisCertainty: basicMapper( {
                G: "gesicherte Diagnose",
                A: "Ausschluss",
                V: "Verdacht auf",
                Z: "Zustand nach"
            } ),
            diagnosisLoc: basicMapper( {
                R: "rechts",
                L: "links",
                B: "beiderseits"
            } ),
            treatmenttype: basicMapper( {
                "1": "kurativ",
                "2": "präventiv",
                "3": "Empfängnisregelung, Sterilisation, Schwangerschaftsabbruch",
                "4": "belegärztliche Behandlung"
            } ),
            noYes: basicMapper( {
                "0": "Nein",
                "1": "Ja"
            } ),
            selContractRegistrationStatus: basicMapper( {
                "0": "Nicht eingeschrieben",
                "1": "Eingeschrieben",
                "2": "Einschreibung beantragt"
            } ),
            addressType: basicMapper( {
                "1": "Physischer Ort",
                "2": "Postanschrift"
            } ),
            documentSource: basicMapper( {
                "1": "eigen",
                "2": "fremd"
            } ),
            locationStatus: basicMapperDescLess( {
                "1": "Arztpraxis",
                "2": "Laborarztpraxis",
                "3": "Laborgemeinschaft",
                "4": "sonstige medizinische Einrichtung",
                "5": "Hauptbetriebsstätte",
                "6": "Nebenbetriebsstätte"
            } ),
            docIdType: basicMapper( {
                "2": "IK des Arztes",
                "3": "Telematik-ID",
                "4": "ID für GEVK-Verträge",
                "5": "ID für HÄVG-Verträge",
                "6": "ID für MEDI-Verträge",
                "7": "Selektivvertrag",
                "9": "Sonstige"
            } ),
            materialCellsUnusable: basicMapper( {
                "1": "Zellmaterial nicht verwertbar"
            } ),
            NoticeReason: basicMapper( {
                "1": "Pathologisch auffälliger Befund",
                "2": "Lebensbedrohlicher Zustand",
                "3": "Wiedervorstellung empfohlen",
                "4": "Probenmaterial nicht verwendbar",
                "5": "Probenmaterial unvollständig",
                "6": "Meldung nach KFRG (Krebsfrüherkennungs- und -registergesetz) erfolgt",
                "7": "Meldung nach IfSG (Infektionsschutzgesetz) erfolgt"
            } ),
            examBillingInfo: basicMapper( {
                "1": "GKV Laborfacharzt",
                "2": "GKV LG",
                "3": "PKV Laborfacharzt",
                "4": "PKV LG",
                "5": "Selektivvertrag",
                "6": "IGeL",
                "7": "Sonstige Kostenübernahme",
                "8": "ASV",
                "9": "GKV Laborfacharzt präventiv",
                "10": "GKV LG präventiv",
                "11": "keine Zuordnung (nur zulässig im Obj_0027)",
                "99": "storniert (nur in Satzart 8215-Nachforderung zulässig)"
            } ),
            labKind: basicMapper( {
                "1": "Laborgemeinschaft",
                "2": "Facharztlabor",
                "3": "Leistungserbringergemeinschaft",
                "4": "Eigenlabor"
            } ),
            normalValSpec: basicMapper( {
                "10": "Methodenspezifische Standards nach WHO",
                "11": "Methodenspezifische Standards nach IFCC (u.a. serologische Verfahren)",
                "12": "Methodenspezifische Standards nach DGKL",
                "13": "Sonstige Standards",
                "20": "Patientenspezifische Einflussgröße „Alter“ betreffend",
                "21": "Patientenspezifische Einflussgröße „Geschlecht“ betreffend",
                "22": "Patientenspezifische Einflussgröße „Alter + Geschlecht“ betreffend",
                "23": "Patientenspezifische Einflussgröße „SSW“ betreffend",
                "24": "Patientenspezifische Einflussgröße „Alter + SSW“ betreffend",
                "25": "weitere patientenspezifische Einflussgrößen (z.B. Medikation)",
                "26": "Information zu Patientenspezifischer Einflussgröße „Alter“ fehlte",
                "27": "Information zu Patientenspezifischer Einflussgröße „Geschlecht“ fehlte",
                "28": "Information zu Patientenspezifischer Einflussgröße „Alter“ und „Geschlecht“ fehlte",
                "30": "Funktionsprofile"
            } ),
            documentType: basicMapper( {
                "006": "Muster 6",
                "010": "Muster 10",
                "10A": "Muster 10A",
                "039": "Muster 39",
                "090": "Auftragsdokument PKV-FA",
                "091": "Auftragsdokument PKV-LG",
                "092": "Auftragsdokument IGeL",
                "093": "Auftragsdokument Sonstige Kostenübernahme",
                "094": "Auftragsdokument Selektivvertrag",
                "100": "Laborbefund",
                "101": "Mutterpass",
                "102": "Impfpass",
                "103": "Notfallausweis",
                "110": "Patientenbefund",
                "120": "Medikationsplan",
                "150": "Verlaufsbericht",
                "160": "Behandlungsbericht",
                "200": "Einverständniserklärung lt. GenDG (Gen-Diagnostik-Gesetz)",
                "250": "weitere laborspezifische Dokumente",
                "251": "Allergie/RAST",
                "252": "Molekulardiagnostik",
                "253": "Endokrinologie",
                "254": "Virologie",
                "255": "Mikrobiologie",
                "256": "Funktionsdiagnostik",
                "257": "Infektionsserologie",
                "258": "Kinderwunsch",
                "300": "Meldung gemäß IfSG (Infektionsschutz-Gesetz)",
                "301": "Meldung Krebsregister",
                "400": "Normbereichsgrafik",
                "500": "Rechnung",
                "900": "LDT-Datensatz",
                "999": "sonstige"
            } ),
            antibodySearchTest: basicMapper( {
                "1": "positiv",
                "2": "negativ",
                "3": "unspezifisch",
                "4": "in Abklärung",
                "5": "Abklärung empfohlen"
            } ),
            testDCT: basicMapper( {
                "0": "negativ",
                "1": "1-fach positiv",
                "2": "2-fach positiv",
                "3": "3-fach positiv",
                "4": "4-fach positiv"
            } ),
            requirementNHP: basicMapper( {
                "0": "Nothilfepass nur bei Nachweis Erythrozytenantikörper ausfüllen",
                "1": "Nothilfepass ausstellen"
            } ),
            servicesRequestableCatalogId: basicMapper( {
                "1": "LOINC",
                "2": "LDT ELV",
                "3": "LVZ sonstige",
                "4": "sonstige mit URL"
            } ),
            resultValues: basicMapper( {
                "01": "numerisch (exponentielle Darstellung möglich)",
                "02": "numerisch mit Messwertuntergrenze",
                "03": "numerisch mit Messwertobergrenze",
                "04": "alpha-numerisch",
                "05": "Titer",
                "06": "Titer mit Untergrenze",
                "07": "Titer mit Obergrenze",
                "99": "Sonstige"
            } ),
            resistanceMethod: basicMapper( {
                "0": "kein Antibiogramm erstellt",
                "1": "Agardiffusion",
                "2": "Agardilution",
                "3": "PCR + Hybridisierung",
                "4": "sonstige",
                "5": "Breakpoint-Methode"
            } ),
            endocervicalCells: basicMapper( {
                "1": "vorhanden",
                "2": "nicht vorhanden"
            } ),
            reasonForAddControl: basicMapper( {
                "1": "nach Entzündungsbehandlung",
                "2": "nach Oestrogenbehandlung",
                "3": "Sonstiges"
            } ),
            positiveNegativeInvalid: basicMapper( {
                "1": "positiv",
                "2": "negativ",
                "3": "invalid"
            } ),
            extragynCytology: basicMapper( {
                "1": "positiv",
                "2": "negativ",
                "3": "nicht auswertbar",
                "4": "suspekt"
            } ),
            resultStatus: basicMapper( {
                "0": "nicht nachweisbar",
                "1": "zweifelhaft/unspezifisch",
                "2": "nachweisbar"
            } ),
            resistanceCreatedAfter: basicMapper( {
                "1": "CLSI",
                "2": "EUCAST",
                "3": "CA-FMS"
            } ),
            objectMapper: basicMapper( {
                "Obj_0001": "Obj_Abrechnungsinformationen",
                "Obj_0002": "Obj_Abrechnung GKV",
                "Obj_0003": "Obj_Abrechnung PKV",
                "Obj_0004": "Obj_Abrechnung IGe-Leistungen",
                "Obj_0005": "Obj_Abrechnung sonstige Kostenübernahme",
                "Obj_0006": "Obj_Abrechnung Selektivvertrag",
                "Obj_0007": "Obj_Anschrift",
                "Obj_0008": "Obj_Adressat",
                "Obj_0010": "Obj_Anhang",
                "Obj_0011": "Obj_Antibiogramm",
                "Obj_0013": "Obj_Auftragsinformation",
                "Obj_0014": "Obj_Arztidentifikation",
                "Obj_0017": "Obj_Befundinformationen",
                "Obj_0019": "Obj_Betriebsstaette",
                "Obj_0022": "Obj_Einsenderidentifikation",
                "Obj_0026": "Obj_Fehlermeldung/Aufmerksamkeit",
                "Obj_0027": "Obj_Veranlassungsgrund",
                "Obj_0031": "Obj_Kommunikationsdaten",
                "Obj_0032": "Obj_Kopfdaten",
                "Obj_0034": "Obj_Krebsfrueherkennung Frauen (Muster39)",
                "Obj_0035": "Obj_Laborergebnisbericht",
                "Obj_0036": "Obj_Laborkennung",
                "Obj_0037": "Obj_Material",
                "Obj_0040": "Obj_Mutterschaft",
                "Obj_0041": "Obj_Namenskennung",
                "Obj_0042": "Obj_Normalwert",
                "Obj_0043": "Obj_Organisation",
                "Obj_0045": "Obj_Patient",
                "Obj_0047": "Obj_Person",
                "Obj_0048": "Obj_RgEmpfaenger",
                "Obj_0050": "Obj_Schwangerschaft",
                "Obj_0051": "Obj_Sendendes System",
                "Obj_0053": "Obj_Tier/Sonstiges",
                "Obj_0054": "Obj_Timestamp",
                "Obj_0055": "Obj_Transfusionsmedizin/Mutterschaftsvorsorge",
                "Obj_0056": "Obj_Tumor",
                "Obj_0058": "Obj_Untersuchungsabrechnung",
                "Obj_0059": "Obj_Untersuchungsanforderung",
                "Obj_0060": "Obj_Untersuchungsergebnis Klinische Chemie",
                "Obj_0061": "Obj_Untersuchungsergebnis Mikrobiologie",
                "Obj_0062": "Obj_Untersuchungsergebnis Zytologie Krebsvorsorge",
                "Obj_0063": "Obj_Untersuchungsergebnis Zytologie",
                "Obj_0068": "Obj_Fließtext",
                "Obj_0069": "Obj_Koerperkenngroessen",
                "Obj_0070": "Obj_Medikament",
                "Obj_0071": "Obj_Wirkstoff",
                "Obj_0072": "Obj_BAK",
                "Obj_0073": "Obj_Sonstige_Untersuchungsergebnisse",
                "Obj_0100": "Obj_Diagnose"
            } ),
            datasetSender: basicMapper( {
                "1": "Primärsystem",
                "2": "Order Entry",
                "3": "Scansystem"
            } ),
            ageUnit: basicMapper( {
                "1": "Sekunden",
                "2": "Minuten",
                "3": "Tage",
                "4": "Jahre"
            } ),
            processOfProof: basicMapper( {
                "0": "sonstige, wenn Erreger + Resistenz angefordert",
                "1": "Antigen-Nachweis",
                "2": "PCR",
                "3": "Mikroskopie",
                "4": "Aglutination",
                "5": "Kultur",
                "6": "Biochemische Identifikation (z.B. Vitek)",
                "7": "Maldi-Tof"
            } ),
            measurementUnitKind: basicMapper( {
                "1": "SI-Einheit",
                "2": "abweichende Einheit",
                "9": "dimensionslose Größe"
            } ),
            examReason: basicMapper( {
                "01": "Vorsorge",
                "02": "Verlaufskontrolle",
                "03": "Zustand vor",
                "04": "Zustand nach",
                "05": "Ausschluss",
                "06": "Bestätigung",
                "07": "gezielte Suche",
                "08": "ungezielte Suche",
                "09": "Erfolgskontrolle",
                "10": "Abschlusskontrolle",
                "11": "Immunität/Impferfolg"
            } ),
            specReasonOfOrder: basicMapper( {
                "01": "Eingriff",
                "02": "Medikamentengabe",
                "03": "unklares Fieber",
                "04": "Infektion",
                "05": "Rheuma",
                "06": "Allergie",
                "07": "Herz/Kreislauf",
                "08": "Tumor",
                "09": "Impfungen",
                "10": "Reisen",
                "11": "Immunität nach Infektion",
                "12": "Sonstiges"
            } ),
            medicationStatus: basicMapper( {
                "1": "Akutmedikation",
                "2": "Bedarfsmedikation",
                "3": "Dauermedikation",
                "4": "Selbstmedikation"
            } ),
            abrechnungDurch: basicMapper( {
                "0": "Labor",
                "1": "Einweiser"
            } ),
            genderOfAnimal: basicMapper( {
                0: 'unbekannt',
                1: 'weiblich',
                2: 'männlich',
                3: 'unbestimmt'
            } ),
            specialField: basicMapper( {
                0: 'Sonstige',
                1: 'Pathologie',
                2: 'Humangenetik',
                3: 'Molekulargenetik'
            } ),
            castrationOrSterilization: basicMapper( {
                1: 'kastiert',
                2: 'sterilisiert'
            } )
        };
        ldt311.rules = {
            F001: /^\d{5}$/,
            F004: /^\w\d\d(\.\d(\d|-)?)?$/,
            F007: /^LDT\d\.\d(\d)?\.\d(\d(\d(\d)?)?)?$/,
            F008: /^[A-Z](\d(\d(\d(\d)?)?)?([A-Za-z][A-Z1-4]?)?)?[A-Z0-9#$*<>]?$|^([A-Z])?\d(\d(\d(\d)?)?)?([A-Za-z][A-Z1-4]?)?[A-Z0-9#$*<>]?$/,
            F009: /^\d{5}[A-Z]?$/,
            F010: /^(0[1-36-9]|1[1-9]|2[014578]|3[1789]|4\d|5\d|6\d|7[0-389]|8[135-8]|9[3-689])\d{5}..$/,
            F011: /^$/, //TODO
            F012: /^[VXYZ]\/\d{2}\/\d{4}\/\d\d\/[VXYZ]{3}$/, //TODO
            F013: /^[A-Z]\d{8}\d$/, //TODO
            F014: /^00\d{6}\d$/, //TODO
            F015: /^\d{3}\/\d{3}$/,
            F020: /^\d{7}\d$/, //TODO
            F021: /^35(0[1-36-9]|1[1-9]|2[014578]|3[1789]|4\d|5\d|6\d|7[0-389]|8[135-8]|9[3-689])\d{5}$/,
            F022: /^5{6}\d\d\d$/, //TODO ?
            E003: /^00[2-9]|0[1-9]\d|[1-9]\d{2}$/,
            E004: /^8220|8221|8230|8231|8205|8215$/,
            E005: /^N|H|\+|HH|\+\+|L|-||LL|--|!H|!+|!L|!-|A|AA$/, //TODO
            E006: /^1|2$/,
            E007: /^0[1-9]|1[0-2]$/,
            E008: /^[0-4]$/,
            E009: /^2[13478]$/,
            E010: /^00$/,
            E011: /^1$/,
            E012: /^(?!0)$/, //TODO ?
            E013: /^[0-6]$/,
            E014: /^0[1-36-9]|1[1-9]|2[014578]|3[1789]|4\d|5\d|6\d|7[0-389]|8[135-8]|9[3-689]$/,
            E015: /^0\d$/,
            E016: /^1|2$/,
            E017: /^[123]$/,
            E018: /^[MWX]$/,
            E019: /^[MWXU]$/,
            E020: /^0[1-6]$/,
            E021: /^0[46-9]$/,
            E022: /^0[0-3]|17|20|38|46|4[7-9]|5[0-25]|6[0-2]|7[1-38]|8[38]|9[38]$/,
            E023: /^0[1-8]|1[124-7]$/,
            E024: /^1|2$/,
            E025: /^[SIRHN]$/,
            E026: /^[0-4]$/,
            E027: /^0[1-9]|1[0-246-8]$/,
            E029: /^0[2-6]|1[125-7]|90$/,
            E030: /^[0-5]$/,
            E031: /^1|2$/,
            E032: /^1|2$/,
            E033: /^1|2$/,
            E034: /^[1-3]$/,
            E035: /^[1-4]$/,
            E037: /^[GAVZ]$/,
            E038: /^[RLB]$/,
            E039: /^[1-4]$/,
            E040: /^0|1$/,
            E041: /^[0-2]$/,
            E042: /^1|2$/,
            E044: /^1|2$/,
            E046: /^[1-6]$/,
            E047: /^[2-79]$/,
            E048: /^1$/,
            E049: /^[1-7]$/,
            E050: /^[1-9]|10|11|99$/,
            E051: /^[1-4]$/,
            E052: /^1[0-3]|2[0-8]|30$/,
            E053: /^006|010|10A|039|09[1-4]|10[0-3]|1[1256]0|[2-5]00|25[0-8]|301|900|999$/,
            E054: /^[1-5]$/,
            E055: /^[0-4]$/,
            E056: /^0|1$/,
            E057: /^[1-4]$/,
            E058: /^0[1-7]|99$/,
            E059: /^[0-5]$/,
            E060: /^1|2$/,
            E061: /^[1-3]$/,
            E062: /^[1-3]$/,
            E063: /^[1-4]$/,
            E064: /^[0-2]$/,
            E065: /^[1-3]$/,
            E066: /^Obj_0(0(0[1-8]|1[013479]|2[267]|3[124-7]|4[0-35]|5[013-689]|6[0-389]|7[0-3])|100)$/,
            E067: /^[1-3]$/,
            E068: /^[1-4]$/,
            E069: /^[1-7]$/,
            E070: /^[129]$/,
            E146: /^0[1-9]|10|11$/,
            E147: /^0[1-9]|1[0-2]$/,
            E156: /^[1-4]$/,
            E163: /^UTC(\−(\d{1,2}(:?30)?)|\+(\d{1,2}(:?\d{2})?))?$/,
            E164: /^[0-3]$/,
            E165: /^[0-3]$/,
            E166: /^1|2$/
        };

        Y.namespace( 'doccirrus.api.xdtVersions.ldt' ).ldt311 = ldt311;

    },
    '0.0.1', {
        requires: [
            'inport-schema',
            'dccommonutils'
        ]
    }
);
