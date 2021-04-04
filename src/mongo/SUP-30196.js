/**
 * User: do
 * Date: 29.07.20  17:50
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, ISODate */


/**
 * Use the following to check for distinct prices in one quarter nad create actType map form updateData to update with the latter script'
 *
['35571', '35572', 'sv', 'gA'].forEach( function( code ) {
    const countAll = db.activities.count( Object.assign( {}, base, {code: code} ) );
    const distinctPrices = db.activities.distinct( 'price', Object.assign( {}, base, {code: code} ) );
    print( `${code} : ${countAll}` );
    distinctPrices.forEach( function( price ) {
        const countPrice = db.activities.count( Object.assign( {}, base, {code: code}, {price: price} ) );
        const updateData = db.activities.findOne( Object.assign( {}, base, {code: code}, {price: price} ), {
            u_extra: 1,
            price: 1,
            unit: 1,
            actualPrice: 1,
            actualUnit: 1,
            catalog: 1,
            catalogRef: 1
        } );
        print( `\t${price} : ${countPrice}` );
        printjsononeline( updateData );
        print( '\n' )
    } )
} )
 */

const actMap = {
    '35571': {
        "price": 18.24,
        "catalog": true,
        "catalogRef": "DC-EBM-D-1583833525695.json",
        "u_extra": {
            "validfrom": "2017-07-01..",
            "quittungstext": "Zuschlag Einzeltherapie",
            "leistungserbringerart": "1",
            "leistungsgruppe": "8",
            "kv": {
                "kv": "72",
                "arztpraxis": true,
                "kv_bewertung": [
                    {
                        "value": "166",
                        "unit": "Punkte",
                        "leistungserbringerart": "1"
                    }, {
                        "value": "18.24",
                        "unit": "Euro",
                        "leistungserbringerart": "1",
                        "versorgungsgebiet": "1"
                    }]
            },
            "gkv_kontenart": [
                {
                    "gkv_kontenart": "408"
                }, {
                    "gkv_kontenart": "409"
                }, {
                    "gkv_kontenart": "463"
                }, {
                    "gkv_kontenart": "570"
                }, {
                    "gkv_kontenart": "996"
                }],
            "fachgruppe_liste": {
                "zulaessig": true,
                "liste": [
                    {
                        "versorgungsbereich": "1",
                        "fachgruppe": ["001", "002", "010", "080", "090", "092", "093", "094", "096", "097", "098", "099", "340", "341", "342", "343", "344", "505", "520", "536", "537", "538", "539", "547", "562", "563", "565"]
                    }, {
                        "versorgungsbereich": "2",
                        "fachgruppe": ["020", "022", "030", "040", "041", "042", "043", "044", "045", "046", "047", "048", "050", "060", "061", "062", "070", "080", "081", "082", "083", "084", "085", "086", "087", "088", "089", "091", "095", "100", "102", "120", "130", "131", "140", "141", "142", "144", "145", "146", "147", "148", "149", "150", "160", "161", "200", "220", "304", "309", "310", "320", "321", "322", "324", "326", "327", "330", "470", "471", "504", "510", "511", "512", "513", "514", "515", "516", "517", "518", "521", "522", "523", "524", "525", "526", "527", "528", "529", "530", "531", "533", "534", "542", "544", "545", "546", "548", "549", "550", "551", "552", "553", "554", "555", "556", "557", "558", "559", "560", "561", "564", "567", "571", "572"]
                    }]
            },
            "berichtspflicht": false,
            "genehmigungspflicht": true,
            "aop_115b": false,
            "begruendungen_liste": {
                "ops_liste": [],
                "ops_liste_include": null,
                "icd_liste": [],
                "gnr_liste": []
            },
            "ausschluss_liste": [
                {
                    "value": "1",
                    "unit": "1",
                    "gnr": [
                        {
                            "seq": "01205",
                            "hint": "Notfallpauschale (Abklärung, Koordination I)"
                        }, {
                            "seq": "01207",
                            "hint": "Notfallpauschale (Abklärung, Koordination II)"
                        }, {
                            "seq": "01210",
                            "hint": "Notfallpauschale"
                        }, {
                            "seq": "01212",
                            "hint": "Notfallpauschale"
                        }, {
                            "seq": "01214",
                            "hint": "Notfallkonsultationspauschale I"
                        }, {
                            "seq": "01216",
                            "hint": "Notfallkonsultationspauschale II"
                        }, {
                            "seq": "01218",
                            "hint": "Notfallkonsultationspauschale III"
                        }, {
                            "seq": "04355",
                            "hint": "Sozialpädiatrisch orientierte eingehende Beratung, Erörterung und/oder Abklärung"
                        }, {
                            "seq": "04356",
                            "hint": "Zuschlag im Zusammenhang mit der Gebührenordnungsposition 04355 für die weiterführende sozialpädiatrisch orientierte Versorgung"
                        }, {
                            "seq": "14220",
                            "hint": "Gespräch, Beratung, Erörterung, Abklärung (Einzelbehandlung)"
                        }, {
                            "seq": "14221",
                            "hint": "Gruppenbehandlung"
                        }, {
                            "seq": "14222",
                            "hint": "Anleitung Bezugs- oder Kontaktperson"
                        }, {
                            "seq": "14310",
                            "hint": "Funktionelle Entwicklungstherapie (Einzelbehandlung)"
                        }, {
                            "seq": "14311",
                            "hint": "Funktionelle Entwicklungstherapie (Gruppenbehandlung)"
                        }, {
                            "seq": "16220",
                            "hint": "Gespräch, Beratung, Erörterung, Abklärung (Einzelbehandlung)"
                        }, {
                            "seq": "16223",
                            "hint": "Psychiatrische Kontrolluntersuchung"
                        }, {
                            "seq": "21220",
                            "hint": "Gespräch, Beratung, Erörterung, Abklärung (Einzelbehandlung)"
                        }, {
                            "seq": "21221",
                            "hint": "Psychiatrische Behandlung (Gruppenbehandlung)"
                        }, {
                            "seq": "21235",
                            "hint": "Neurologische Kontrolluntersuchung"
                        }, {
                            "seq": "22220",
                            "hint": "Psychotherapeutisches Gespräch (Einzelbehandlung)"
                        }, {
                            "seq": "22221",
                            "hint": "Psychosomatik (Einzelbehandlung)"
                        }, {
                            "seq": "22222",
                            "hint": "Psychotherapeutisch medizinische Behandlung (Gruppenbehandlung)"
                        }, {
                            "seq": "23220",
                            "hint": "Psychotherapeutisches Gespräch (Einzelbehandlung)"
                        }, {
                            "seq": "30702",
                            "hint": "Zusatzpauschale Schmerztherapie"
                        }, {
                            "seq": "35100",
                            "hint": "Differentialdiagnostische Klärung psychosomatischer Krankheitszustände"
                        }, {
                            "seq": "35110",
                            "hint": "Verbale Intervention bei psychosomatischen Krankheitszuständen"
                        }, {
                            "seq": "51023",
                            "hint": "Zuschlag Videosprechstunde"
                        }]
                }, {
                    "value": "1",
                    "unit": "14",
                    "gnr": [
                        {
                            "seq": "03040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 03000 und 03030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "03220",
                            "hint": "Zuschlag zur GOP 03000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "03221",
                            "hint": "Zuschlag zur GOP 03220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 04000 und 04030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "04220",
                            "hint": "Zuschlag zur GOP 04000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04221",
                            "hint": "Zuschlag zur GOP 04220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }]
                }, {
                    "value": "1",
                    "unit": "2",
                    "gnr": [
                        {
                            "seq": "35151",
                            "hint": "Psychotherapeutische Sprechstunde"
                        }, {
                            "seq": "35152",
                            "hint": "Psychotherapeutische Akutbehandlung"
                        }]
                }, {
                    "value": "1",
                    "unit": "7",
                    "gnr": [
                        {
                            "seq": "03040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 03000 und 03030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "03220",
                            "hint": "Zuschlag zur GOP 03000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "03221",
                            "hint": "Zuschlag zur GOP 03220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 04000 und 04030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "04220",
                            "hint": "Zuschlag zur GOP 04000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04221",
                            "hint": "Zuschlag zur GOP 04220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "05220",
                            "hint": "Zuschlag für die anästhesiologische Grundversorgung"
                        }, {
                            "seq": "05222",
                            "hint": "Zuschlag zur GOP 05220"
                        }, {
                            "seq": "06220",
                            "hint": "Zuschlag für die augenärztliche Grundversorgung"
                        }, {
                            "seq": "06222",
                            "hint": "Zuschlag zur GOP 06220"
                        }, {
                            "seq": "07220",
                            "hint": "Zuschlag für die chirurgische Grundversorgung"
                        }, {
                            "seq": "07222",
                            "hint": "Zuschlag zur GOP 07220"
                        }, {
                            "seq": "08220",
                            "hint": "Zuschlag für die gynäkologische Grundversorgung"
                        }, {
                            "seq": "08222",
                            "hint": "Zuschlag zur GOP 08220"
                        }, {
                            "seq": "09220",
                            "hint": "Zuschlag für die Hals-Nasen-Ohrenärztliche Grundversorgung"
                        }, {
                            "seq": "09222",
                            "hint": "Zuschlag zur GOP 09220"
                        }, {
                            "seq": "10220",
                            "hint": "Zuschlag für die hautärztliche Grundversorgung"
                        }, {
                            "seq": "10222",
                            "hint": "Zuschlag zur GOP 10220"
                        }, {
                            "seq": "13220",
                            "hint": "Zuschlag für die allgemeine internistische Grundversorgung"
                        }, {
                            "seq": "13222",
                            "hint": "Zuschlag zur GOP 13220"
                        }, {
                            "seq": "13294",
                            "hint": "Zuschlag für die angiologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13296",
                            "hint": "Zuschlag zur GOP 13294"
                        }, {
                            "seq": "13344",
                            "hint": "Zuschlag für die endokrinologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13346",
                            "hint": "Zuschlag zur GOP 13344"
                        }, {
                            "seq": "13394",
                            "hint": "Zuschlag für die gastroenterologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13396",
                            "hint": "Zuschlag zur GOP 13394"
                        }, {
                            "seq": "13494",
                            "hint": "Zuschlag für die hämato-/onkologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13496",
                            "hint": "Zuschlag zur GOP 13494"
                        }, {
                            "seq": "13543",
                            "hint": "Zuschlag für die kardiologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13544",
                            "hint": "Zuschlag zur GOP 13543"
                        }, {
                            "seq": "13594",
                            "hint": "Zuschlag für die nephrologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13596",
                            "hint": "Zuschlag zu der GOP 13594"
                        }, {
                            "seq": "13644",
                            "hint": "Zuschlag für die pneumologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13646",
                            "hint": "Zuschlag zur GOP 13644"
                        }, {
                            "seq": "13694",
                            "hint": "Zuschlag für die rheumatologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13696",
                            "hint": "Zuschlag zur GOP 13694"
                        }, {
                            "seq": "14214",
                            "hint": "Zuschlag für die kinder- und jugendpsychiatrische Grundversorgung"
                        }, {
                            "seq": "14216",
                            "hint": "Zuschlag zur GOP 14214"
                        }, {
                            "seq": "16215",
                            "hint": "Zuschlag für die neurologische Grundversorgung"
                        }, {
                            "seq": "16217",
                            "hint": "Zuschlag zur GOP 16215"
                        }, {
                            "seq": "18220",
                            "hint": "Zuschlag für die orthopädische Grundversorgung"
                        }, {
                            "seq": "18222",
                            "hint": "Zuschlag zur GOP 18220"
                        }, {
                            "seq": "20220",
                            "hint": "Zuschlag für die phoniatrisch-pädaudiologische Grundversorgung"
                        }, {
                            "seq": "20222",
                            "hint": "Zuschlag zur GOP 20220"
                        }, {
                            "seq": "21218",
                            "hint": "Zuschlag für die psychiatrische Grundversorgung"
                        }, {
                            "seq": "21219",
                            "hint": "Zuschlag zur GOP 21218"
                        }, {
                            "seq": "21225",
                            "hint": "Zuschlag für die nervenheilkundliche Grundversorgung"
                        }, {
                            "seq": "21226",
                            "hint": "Zuschlag zur GOP 21225"
                        }, {
                            "seq": "22216",
                            "hint": "Zuschlag für die psychotherapeutisch-medizinische Grundversorgung"
                        }, {
                            "seq": "22218",
                            "hint": "Zuschlag zur GOP 22216"
                        }, {
                            "seq": "23216",
                            "hint": "Zuschlag für die psychotherapeutische Grundversorgung"
                        }, {
                            "seq": "23218",
                            "hint": "Zuschlag zur GOP 23216"
                        }, {
                            "seq": "26220",
                            "hint": "Zuschlag für die urologische Grundversorgung"
                        }, {
                            "seq": "26222",
                            "hint": "Zuschlag zur GOP 26220"
                        }, {
                            "seq": "27220",
                            "hint": "Zuschlag für die physikalisch rehabilitative Grundversorgung"
                        }, {
                            "seq": "27222",
                            "hint": "Zuschlag zur GOP 27220"
                        }]
                }],
            "grundleistungen_liste": [
                {
                    "value": "1",
                    "unit": "0",
                    "liste": ["30932", "35401", "35402", "35405", "35411", "35412", "35415", "35421", "35422", "35425"]
                }],
            "pfg_ausschluss": true,
            "bewertung_liste": [
                {
                    "value": "166",
                    "unit": "Punkte",
                    "leistungserbringerart": "1"
                }, {
                    "value": "18.24",
                    "unit": "Euro",
                    "leistungserbringerart": "1",
                    "versorgungsgebiet": "1"
                }]
        },
        "actualPrice": 166,
        "unit": "Euro",
        "actualUnit": "Punkte"
    },
    '35572': {
        "price": 7.69,
        "catalog": true,
        "catalogRef": "DC-EBM-D-1586413165908.json",
        "u_extra": {
            "validfrom": "2017-07-01..",
            "quittungstext": "Zuschlag Gruppentherapie",
            "leistungserbringerart": "1",
            "leistungsgruppe": "8",
            "kv": {
                "kv": "72",
                "arztpraxis": true,
                "kv_bewertung": [
                    {
                        "value": "70",
                        "unit": "Punkte",
                        "leistungserbringerart": "1"
                    }, {
                        "value": "7.69",
                        "unit": "Euro",
                        "leistungserbringerart": "1",
                        "versorgungsgebiet": "1"
                    }]
            },
            "gkv_kontenart": [
                {
                    "gkv_kontenart": "408"
                }, {
                    "gkv_kontenart": "409"
                }, {
                    "gkv_kontenart": "463"
                }, {
                    "gkv_kontenart": "570"
                }, {
                    "gkv_kontenart": "996"
                }],
            "fachgruppe_liste": {
                "zulaessig": true,
                "liste": [
                    {
                        "versorgungsbereich": "1",
                        "fachgruppe": ["001", "002", "010", "080", "090", "092", "093", "094", "096", "097", "098", "099", "340", "341", "342", "343", "344", "505", "520", "536", "537", "538", "539", "547", "562", "563", "565"]
                    }, {
                        "versorgungsbereich": "2",
                        "fachgruppe": ["020", "022", "030", "040", "041", "042", "043", "044", "045", "046", "047", "048", "050", "060", "061", "062", "070", "080", "081", "082", "083", "084", "085", "086", "087", "088", "089", "091", "095", "100", "102", "120", "130", "131", "140", "141", "142", "144", "145", "146", "147", "148", "149", "150", "160", "161", "200", "220", "304", "309", "310", "320", "321", "322", "324", "326", "327", "330", "470", "471", "504", "510", "511", "512", "513", "514", "515", "516", "517", "518", "521", "522", "523", "524", "525", "526", "527", "528", "529", "530", "531", "533", "534", "542", "544", "545", "546", "548", "549", "550", "551", "552", "553", "554", "555", "556", "557", "558", "559", "560", "561", "564", "567", "571", "572"]
                    }]
            },
            "berichtspflicht": false,
            "genehmigungspflicht": true,
            "aop_115b": false,
            "begruendungen_liste": {
                "ops_liste": [],
                "ops_liste_include": null,
                "icd_liste": [],
                "gnr_liste": []
            },
            "ausschluss_liste": [
                {
                    "value": "1",
                    "unit": "1",
                    "gnr": [
                        {
                            "seq": "01205",
                            "hint": "Notfallpauschale (Abklärung, Koordination I)"
                        }, {
                            "seq": "01207",
                            "hint": "Notfallpauschale (Abklärung, Koordination II)"
                        }, {
                            "seq": "01210",
                            "hint": "Notfallpauschale"
                        }, {
                            "seq": "01212",
                            "hint": "Notfallpauschale"
                        }, {
                            "seq": "01214",
                            "hint": "Notfallkonsultationspauschale I"
                        }, {
                            "seq": "01216",
                            "hint": "Notfallkonsultationspauschale II"
                        }, {
                            "seq": "01218",
                            "hint": "Notfallkonsultationspauschale III"
                        }, {
                            "seq": "04355",
                            "hint": "Sozialpädiatrisch orientierte eingehende Beratung, Erörterung und/oder Abklärung"
                        }, {
                            "seq": "04356",
                            "hint": "Zuschlag im Zusammenhang mit der Gebührenordnungsposition 04355 für die weiterführende sozialpädiatrisch orientierte Versorgung"
                        }, {
                            "seq": "14220",
                            "hint": "Gespräch, Beratung, Erörterung, Abklärung (Einzelbehandlung)"
                        }, {
                            "seq": "14221",
                            "hint": "Gruppenbehandlung"
                        }, {
                            "seq": "14222",
                            "hint": "Anleitung Bezugs- oder Kontaktperson"
                        }, {
                            "seq": "14310",
                            "hint": "Funktionelle Entwicklungstherapie (Einzelbehandlung)"
                        }, {
                            "seq": "14311",
                            "hint": "Funktionelle Entwicklungstherapie (Gruppenbehandlung)"
                        }, {
                            "seq": "16220",
                            "hint": "Gespräch, Beratung, Erörterung, Abklärung (Einzelbehandlung)"
                        }, {
                            "seq": "16223",
                            "hint": "Psychiatrische Kontrolluntersuchung"
                        }, {
                            "seq": "21220",
                            "hint": "Gespräch, Beratung, Erörterung, Abklärung (Einzelbehandlung)"
                        }, {
                            "seq": "21221",
                            "hint": "Psychiatrische Behandlung (Gruppenbehandlung)"
                        }, {
                            "seq": "21235",
                            "hint": "Neurologische Kontrolluntersuchung"
                        }, {
                            "seq": "22220",
                            "hint": "Psychotherapeutisches Gespräch (Einzelbehandlung)"
                        }, {
                            "seq": "22221",
                            "hint": "Psychosomatik (Einzelbehandlung)"
                        }, {
                            "seq": "22222",
                            "hint": "Psychotherapeutisch medizinische Behandlung (Gruppenbehandlung)"
                        }, {
                            "seq": "23220",
                            "hint": "Psychotherapeutisches Gespräch (Einzelbehandlung)"
                        }, {
                            "seq": "30702",
                            "hint": "Zusatzpauschale Schmerztherapie"
                        }, {
                            "seq": "35100",
                            "hint": "Differentialdiagnostische Klärung psychosomatischer Krankheitszustände"
                        }, {
                            "seq": "35110",
                            "hint": "Verbale Intervention bei psychosomatischen Krankheitszuständen"
                        }, {
                            "seq": "51023",
                            "hint": "Zuschlag Videosprechstunde"
                        }]
                }, {
                    "value": "1",
                    "unit": "14",
                    "gnr": [
                        {
                            "seq": "03040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 03000 und 03030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "03220",
                            "hint": "Zuschlag zur GOP 03000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "03221",
                            "hint": "Zuschlag zur GOP 03220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 04000 und 04030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "04220",
                            "hint": "Zuschlag zur GOP 04000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04221",
                            "hint": "Zuschlag zur GOP 04220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }]
                }, {
                    "value": "1",
                    "unit": "2",
                    "gnr": [
                        {
                            "seq": "35151",
                            "hint": "Psychotherapeutische Sprechstunde"
                        }, {
                            "seq": "35152",
                            "hint": "Psychotherapeutische Akutbehandlung"
                        }]
                }, {
                    "value": "1",
                    "unit": "7",
                    "gnr": [
                        {
                            "seq": "03040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 03000 und 03030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "03220",
                            "hint": "Zuschlag zur GOP 03000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "03221",
                            "hint": "Zuschlag zur GOP 03220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04040",
                            "hint": "Zusatzpauschale zu den Gebührenordnungspositionen 04000 und 04030 für die Wahrnehmung des hausärztlichen Versorgungsauftrags gemäß § 73 Abs. 1 SGB V"
                        }, {
                            "seq": "04220",
                            "hint": "Zuschlag zur GOP 04000 für die Behandlung und Betreuung eines Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "04221",
                            "hint": "Zuschlag zur GOP 04220 für die intensive Behandlung und Betreuung eines  Patienten mit mindestens einer lebensverändernden chronischen Erkrankung"
                        }, {
                            "seq": "05220",
                            "hint": "Zuschlag für die anästhesiologische Grundversorgung"
                        }, {
                            "seq": "05222",
                            "hint": "Zuschlag zur GOP 05220"
                        }, {
                            "seq": "06220",
                            "hint": "Zuschlag für die augenärztliche Grundversorgung"
                        }, {
                            "seq": "06222",
                            "hint": "Zuschlag zur GOP 06220"
                        }, {
                            "seq": "07220",
                            "hint": "Zuschlag für die chirurgische Grundversorgung"
                        }, {
                            "seq": "07222",
                            "hint": "Zuschlag zur GOP 07220"
                        }, {
                            "seq": "08220",
                            "hint": "Zuschlag für die gynäkologische Grundversorgung"
                        }, {
                            "seq": "08222",
                            "hint": "Zuschlag zur GOP 08220"
                        }, {
                            "seq": "09220",
                            "hint": "Zuschlag für die Hals-Nasen-Ohrenärztliche Grundversorgung"
                        }, {
                            "seq": "09222",
                            "hint": "Zuschlag zur GOP 09220"
                        }, {
                            "seq": "10220",
                            "hint": "Zuschlag für die hautärztliche Grundversorgung"
                        }, {
                            "seq": "10222",
                            "hint": "Zuschlag zur GOP 10220"
                        }, {
                            "seq": "13220",
                            "hint": "Zuschlag für die allgemeine internistische Grundversorgung"
                        }, {
                            "seq": "13222",
                            "hint": "Zuschlag zur GOP 13220"
                        }, {
                            "seq": "13294",
                            "hint": "Zuschlag für die angiologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13296",
                            "hint": "Zuschlag zur GOP 13294"
                        }, {
                            "seq": "13344",
                            "hint": "Zuschlag für die endokrinologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13346",
                            "hint": "Zuschlag zur GOP 13344"
                        }, {
                            "seq": "13394",
                            "hint": "Zuschlag für die gastroenterologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13396",
                            "hint": "Zuschlag zur GOP 13394"
                        }, {
                            "seq": "13494",
                            "hint": "Zuschlag für die hämato-/onkologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13496",
                            "hint": "Zuschlag zur GOP 13494"
                        }, {
                            "seq": "13543",
                            "hint": "Zuschlag für die kardiologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13544",
                            "hint": "Zuschlag zur GOP 13543"
                        }, {
                            "seq": "13594",
                            "hint": "Zuschlag für die nephrologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13596",
                            "hint": "Zuschlag zu der GOP 13594"
                        }, {
                            "seq": "13644",
                            "hint": "Zuschlag für die pneumologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13646",
                            "hint": "Zuschlag zur GOP 13644"
                        }, {
                            "seq": "13694",
                            "hint": "Zuschlag für die rheumatologisch-internistische Grundversorgung"
                        }, {
                            "seq": "13696",
                            "hint": "Zuschlag zur GOP 13694"
                        }, {
                            "seq": "14214",
                            "hint": "Zuschlag für die kinder- und jugendpsychiatrische Grundversorgung"
                        }, {
                            "seq": "14216",
                            "hint": "Zuschlag zur GOP 14214"
                        }, {
                            "seq": "16215",
                            "hint": "Zuschlag für die neurologische Grundversorgung"
                        }, {
                            "seq": "16217",
                            "hint": "Zuschlag zur GOP 16215"
                        }, {
                            "seq": "18220",
                            "hint": "Zuschlag für die orthopädische Grundversorgung"
                        }, {
                            "seq": "18222",
                            "hint": "Zuschlag zur GOP 18220"
                        }, {
                            "seq": "20220",
                            "hint": "Zuschlag für die phoniatrisch-pädaudiologische Grundversorgung"
                        }, {
                            "seq": "20222",
                            "hint": "Zuschlag zur GOP 20220"
                        }, {
                            "seq": "21218",
                            "hint": "Zuschlag für die psychiatrische Grundversorgung"
                        }, {
                            "seq": "21219",
                            "hint": "Zuschlag zur GOP 21218"
                        }, {
                            "seq": "21225",
                            "hint": "Zuschlag für die nervenheilkundliche Grundversorgung"
                        }, {
                            "seq": "21226",
                            "hint": "Zuschlag zur GOP 21225"
                        }, {
                            "seq": "22216",
                            "hint": "Zuschlag für die psychotherapeutisch-medizinische Grundversorgung"
                        }, {
                            "seq": "22218",
                            "hint": "Zuschlag zur GOP 22216"
                        }, {
                            "seq": "23216",
                            "hint": "Zuschlag für die psychotherapeutische Grundversorgung"
                        }, {
                            "seq": "23218",
                            "hint": "Zuschlag zur GOP 23216"
                        }, {
                            "seq": "26220",
                            "hint": "Zuschlag für die urologische Grundversorgung"
                        }, {
                            "seq": "26222",
                            "hint": "Zuschlag zur GOP 26220"
                        }, {
                            "seq": "27220",
                            "hint": "Zuschlag für die physikalisch rehabilitative Grundversorgung"
                        }, {
                            "seq": "27222",
                            "hint": "Zuschlag zur GOP 27220"
                        }]
                }],
            "grundleistungen_liste": [
                {
                    "value": "1",
                    "unit": "0",
                    "liste": ["30933", "35503", "35504", "35505", "35506", "35507", "35508", "35509", "35513", "35514", "35515", "35516", "35517", "35518", "35519", "35523", "35524", "35525", "35526", "35527", "35528", "35529", "35533", "35534", "35535", "35536", "35537", "35538", "35539", "35543", "35544", "35545", "35546", "35547", "35548", "35549", "35553", "35554", "35555", "35556", "35557", "35558", "35559"]
                }],
            "pfg_ausschluss": true,
            "bewertung_liste": [
                {
                    "value": "70",
                    "unit": "Punkte",
                    "leistungserbringerart": "1"
                }, {
                    "value": "7.69",
                    "unit": "Euro",
                    "leistungserbringerart": "1",
                    "versorgungsgebiet": "1"
                }]
        },
        "actualPrice": 70,
        "unit": "Euro",
        "actualUnit": "Punkte"
    },
    "sv": {
        "price": 119.54,
        "catalog": false,
        "catalogRef": "DC-EBM-D-1566553071107.json",
        "actualPrice": 119.54,
        "unit": "Euro",
        "actualUnit": "Euro"
    },
    'gA': {
        "price": 59.77,
        "catalog": false,
        "catalogRef": "DC-EBM-D-1566553071107.json",
        "actualPrice": 59.77,
        "unit": "Euro",
        "actualUnit": "Euro"
    }
};

const timestampQuery = {
    $gt: ISODate( "2020-03-31T22:00:00.000Z" ), $lt: ISODate( "2020-06-30T22:00:00.000Z" )
};
const base = {
    timestamp: timestampQuery,
    actType: 'TREATMENT',
    catalogShort: 'EBM'
};

const baseReportings = {
    timestampDate: timestampQuery,
    actType: 'TREATMENT',
    catalogShort: 'EBM'
};

Object.keys( actMap ).forEach( function( code ) {
    const updateData = actMap[code];
    const count = db.activities.count( Object.assign( {}, base, {code: code}, {price: {$ne: updateData.price}} ) );
    const count2 = db.reportings.count( Object.assign( {}, baseReportings, {code: code}, {total: {$ne: updateData.price}} ) );
    print( `${code} update price to ${updateData.price} activities=${count}   reportings=${count2}` );
    const result = db.activities.update( Object.assign( {}, base, {code: code}, {price: {$ne: updateData.price}} ), {$set: updateData}, {multi: true} );
    print( 'result activities' );
    print( result );
    const result2 = db.reportings.update( Object.assign( {}, baseReportings, {code: code}, {total: {$ne: updateData.price}} ), {$set: {total: updateData.price}}, {multi: true} );
    print( 'result reportings' );
    print( result2 );
} );