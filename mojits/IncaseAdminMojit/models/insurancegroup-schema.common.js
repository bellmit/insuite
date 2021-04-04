/**
 * User: do
 * Date: 17.10.18  17:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'insurancegroup-schema', function( Y, NAME ) {

        'use strict';

        var template = [{
            "_id":"000000000000000000000222",
            "name" : "Standard",
            "items" : [
                {
                    "serialNo" : "101",
                    "content" : [
                        {
                            "name" : "AOK PLUS",
                            "vknr" : "95101"
                        },
                        {
                            "name" : "AOK Rheinland/Hamburg",
                            "vknr" : "24101"
                        },
                        {
                            "name" : "AOK Nordost - Die Gesundheitskasse",
                            "vknr" : "72101"
                        },
                        {
                            "name" : "AOK Bayern - Die Gesundheitskasse ",
                            "vknr" : "71101"
                        },
                        {
                            "name" : "AOK Sachsen-Anhalt",
                            "vknr" : "85101"
                        },
                        {
                            "name" : "AOK Plus - Bereich Thüringen",
                            "vknr" : "89101"
                        },
                        {
                            "name" : "AOK Bremen/Bremerhaven",
                            "vknr" : "03101"
                        },
                        {
                            "name" : "AOK Nordost - Die Gesundheitskasse",
                            "vknr" : "79101"
                        },
                        {
                            "name" : "AOK Hessen",
                            "vknr" : "40101"
                        },
                        {
                            "name" : "AOK Niedersachsen",
                            "vknr" : "17101"
                        }
                    ]
                },
                {
                    "serialNo" : "102",
                    "content" : [
                        {
                            "name" : "AOK Return",
                            "vknr" : "17102"
                        }
                    ]
                },
                {
                    "serialNo" : "103",
                    "content" : [
                        {
                            "name" : "AOK Rheinland-Pfalz/Saarland",
                            "vknr" : "48103"
                        }
                    ]
                },
                {
                    "serialNo" : "111",
                    "content" : [
                        {
                            "name" : "AOK NORDWEST",
                            "vknr" : "18111"
                        }
                    ]
                },
                {
                    "serialNo" : "125",
                    "content" : [
                        {
                            "name" : "AOK Baden-Württemberg Hauptverwaltung",
                            "vknr" : "61125"
                        }
                    ]
                },
                {
                    "serialNo" : "163",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte München St. der AOK (BVG/SVA)",
                            "vknr" : "71163"
                        }
                    ]
                },
                {
                    "serialNo" : "164",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte Oberbayern der AOK (BVG/SVA)",
                            "vknr" : "71164"
                        }
                    ]
                },
                {
                    "serialNo" : "165",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte Oberfranken der AOK (BVG/SVA)",
                            "vknr" : "71165"
                        }
                    ]
                },
                {
                    "serialNo" : "166",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte Mittelfranken d.AOK (BVG/SVA)",
                            "vknr" : "71166"
                        }
                    ]
                },
                {
                    "serialNo" : "167",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte Unterfranken d. AOK (BVG/SVA)",
                            "vknr" : "71167"
                        }
                    ]
                },
                {
                    "serialNo" : "168",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte Oberpfalz der AOK (BVG/SVA)",
                            "vknr" : "71168"
                        }
                    ]
                },
                {
                    "serialNo" : "169",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte Niederbayern d. AOK (BVG/SVA)",
                            "vknr" : "71169"
                        }
                    ]
                },
                {
                    "serialNo" : "170",
                    "content" : [
                        {
                            "name" : "DLZ Ärzte Schwaben der AOK (BVG/SVA)",
                            "vknr" : "71170"
                        }
                    ]
                },
                {
                    "serialNo" : "171",
                    "content" : [
                        {
                            "name" : "AOK Bayern / Netz PNN",
                            "vknr" : "71171"
                        }
                    ]
                },
                {
                    "serialNo" : "172",
                    "content" : [
                        {
                            "name" : "AOK Bayern / Netz GOIN",
                            "vknr" : "71172"
                        }
                    ]
                },
                {
                    "serialNo" : "201",
                    "content" : [
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "79201"
                        }
                    ]
                },
                {
                    "serialNo" : "251",
                    "content" : [
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "01251"
                        },
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "09251"
                        },
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "61251"
                        },
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "69251"
                        },
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "42251"
                        },
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "66251"
                        }
                    ]
                },
                {
                    "serialNo" : "252",
                    "content" : [
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "19252"
                        },
                        {
                            "name" : "Landwirtschaftliche Krankenkasse (LKK)",
                            "vknr" : "42252"
                        }
                    ]
                },
                {
                    "serialNo" : "301",
                    "content" : [
                        {
                            "name" : "IKK classic",
                            "vknr" : "95301"
                        },
                        {
                            "name" : "Vereinigte IKK",
                            "vknr" : "71301"
                        },
                        {
                            "name" : "IKK gesund plus ",
                            "vknr" : "87301"
                        }
                    ]
                },
                {
                    "serialNo" : "302",
                    "content" : [
                        {
                            "name" : "IKK Hessen Hauptverwaltung",
                            "vknr" : "45302"
                        }
                    ]
                },
                {
                    "serialNo" : "305",
                    "content" : [
                        {
                            "name" : "IKK Brandenburg und Berlin ",
                            "vknr" : "79305"
                        }
                    ]
                },
                {
                    "serialNo" : "306",
                    "content" : [
                        {
                            "name" : "BIG direkt gesund",
                            "vknr" : "18306"
                        }
                    ]
                },
                {
                    "serialNo" : "307",
                    "content" : [
                        {
                            "name" : "IKK-Direkt/Ost",
                            "vknr" : "99307"
                        }
                    ]
                },
                {
                    "serialNo" : "310",
                    "content" : [
                        {
                            "name" : "IKK Südwest",
                            "vknr" : "73310"
                        },
                        {
                            "name" : "IKK Nord",
                            "vknr" : "01310"
                        },
                        {
                            "name" : "IKK Nordrhein",
                            "vknr" : "27310"
                        }
                    ]
                },
                {
                    "serialNo" : "311",
                    "content" : [
                        {
                            "name" : "IKK-Direkt",
                            "vknr" : "01311"
                        }
                    ]
                },
                {
                    "serialNo" : "316",
                    "content" : [
                        {
                            "name" : "IKK Baden-Württemberg",
                            "vknr" : "61316"
                        }
                    ]
                },
                {
                    "serialNo" : "320",
                    "content" : [
                        {
                            "name" : "IKK classic",
                            "vknr" : "61320"
                        }
                    ]
                },
                {
                    "serialNo" : "333",
                    "content" : [
                        {
                            "name" : "numIKK",
                            "vknr" : "85333"
                        },
                        {
                            "name" : "IKK classic",
                            "vknr" : "18333"
                        }
                    ]
                },
                {
                    "serialNo" : "401",
                    "content" : [
                        {
                            "name" : "Brandenburgische BKK",
                            "vknr" : "81401"
                        },
                        {
                            "name" : "BKK UPM Nordland Papier",
                            "vknr" : "17401"
                        },
                        {
                            "name" : "BKK Grillo Werke AG",
                            "vknr" : "25401"
                        },
                        {
                            "name" : "Bahn-Betriebskrankenkasse Ost",
                            "vknr" : "99401"
                        },
                        {
                            "name" : "BMW BKK",
                            "vknr" : "69401"
                        },
                        {
                            "name" : "Bahn-Betriebskrankenkasse",
                            "vknr" : "40401"
                        },
                        {
                            "name" : "Betriebskrankenkasse Ahlmann",
                            "vknr" : "01401"
                        },
                        {
                            "name" : "BKK B. Braun Melsungen",
                            "vknr" : "42401"
                        }
                    ]
                },
                {
                    "serialNo" : "402",
                    "content" : [
                        {
                            "name" : "BKK FTE",
                            "vknr" : "17402"
                        },
                        {
                            "name" : "Die BKK Post",
                            "vknr" : "61402"
                        },
                        {
                            "name" : "BKK Diakonie",
                            "vknr" : "19402"
                        },
                        {
                            "name" : "Ernst & Young BKK",
                            "vknr" : "42402"
                        },
                        {
                            "name" : "pronova BKK",
                            "vknr" : "49402"
                        },
                        {
                            "name" : "BKK exklusiv",
                            "vknr" : "09402"
                        },
                        {
                            "name" : "BKK-Beiersdorf AG",
                            "vknr" : "02402"
                        },
                        {
                            "name" : "Securvita BKK",
                            "vknr" : "01402"
                        }
                    ]
                },
                {
                    "serialNo" : "403",
                    "content" : [
                        {
                            "name" : "BKK Mercedes-Benz AG",
                            "vknr" : "03403"
                        },
                        {
                            "name" : "BKK BVM",
                            "vknr" : "02403"
                        },
                        {
                            "name" : "BKK Maschinenfabrik Meuselwitz",
                            "vknr" : "90403"
                        },
                        {
                            "name" : "BKK Achenbach Buschhütten",
                            "vknr" : "18403"
                        }
                    ]
                },
                {
                    "serialNo" : "404",
                    "content" : [
                        {
                            "name" : "Krones BKK",
                            "vknr" : "68404"
                        },
                        {
                            "name" : "BKK Chemie-Partner",
                            "vknr" : "24404"
                        }
                    ]
                },
                {
                    "serialNo" : "405",
                    "content" : [
                        {
                            "name" : "R+V BKK ",
                            "vknr" : "45405"
                        },
                        {
                            "name" : "actimonda krankenkasse",
                            "vknr" : "21405"
                        },
                        {
                            "name" : "BKK PricewaterhouseCoopers",
                            "vknr" : "42405"
                        },
                        {
                            "name" : "VIACTIV Krankenkasse",
                            "vknr" : "18405"
                        },
                        {
                            "name" : "BKK Mobil Oil München",
                            "vknr" : "63405"
                        },
                        {
                            "name" : "Betriebskrankenkasse Südzucker AG",
                            "vknr" : "52405"
                        },
                        {
                            "name" : "BKK Faber-Castell & Partner",
                            "vknr" : "69405"
                        }
                    ]
                },
                {
                    "serialNo" : "406",
                    "content" : [
                        {
                            "name" : "BKK FTE",
                            "vknr" : "67406"
                        },
                        {
                            "name" : "Gothaer BKK",
                            "vknr" : "08406"
                        },
                        {
                            "name" : "Securvita BKK",
                            "vknr" : "02406"
                        },
                        {
                            "name" : "BKK Wirtschaft & Finanzen",
                            "vknr" : "42406"
                        }
                    ]
                },
                {
                    "serialNo" : "407",
                    "content" : [
                        {
                            "name" : "Thüringer Betriebskrankenkasse TBK",
                            "vknr" : "89407"
                        },
                        {
                            "name" : "BKK KBA",
                            "vknr" : "67407"
                        },
                        {
                            "name" : "atlas BKK ahlmann",
                            "vknr" : "03407"
                        },
                        {
                            "name" : "BKK Ernst & Young - Ost",
                            "vknr" : "99407"
                        },
                        {
                            "name" : "BKK EUREGIO",
                            "vknr" : "21407"
                        },
                        {
                            "name" : "BKK EWE",
                            "vknr" : "12407"
                        },
                        {
                            "name" : "Novitas BKK",
                            "vknr" : "02407"
                        }
                    ]
                },
                {
                    "serialNo" : "408",
                    "content" : [
                        {
                            "name" : "BKK Freudenberg",
                            "vknr" : "53408"
                        },
                        {
                            "name" : "BKK Deutsche BP AG",
                            "vknr" : "19408"
                        },
                        {
                            "name" : "BKK PricewaterhouseCoopers-Ost",
                            "vknr" : "99408"
                        },
                        {
                            "name" : "BKK Hoechst",
                            "vknr" : "40408"
                        }
                    ]
                },
                {
                    "serialNo" : "409",
                    "content" : [
                        {
                            "name" : "Bosch BKK",
                            "vknr" : "61409"
                        },
                        {
                            "name" : "BKK RWE",
                            "vknr" : "09409"
                        },
                        {
                            "name" : "BKK der BPW Bergische Achsen KG",
                            "vknr" : "27409"
                        },
                        {
                            "name" : "BKK Dürkopp Adler AG",
                            "vknr" : "19409"
                        },
                        {
                            "name" : "BKK Vital",
                            "vknr" : "49409"
                        },
                        {
                            "name" : "PBK-Die Persönliche BKK/Ost",
                            "vknr" : "99409"
                        },
                        {
                            "name" : "BKK Merck",
                            "vknr" : "39409"
                        }
                    ]
                },
                {
                    "serialNo" : "410",
                    "content" : [
                        {
                            "name" : "Debeka Betriebskrankenkasse",
                            "vknr" : "47410"
                        },
                        {
                            "name" : "Securvita BKK / Ost",
                            "vknr" : "99410"
                        },
                        {
                            "name" : "BKK Gildemeister/Seidensticker",
                            "vknr" : "19410"
                        },
                        {
                            "name" : "BKK HENSCHEL plus",
                            "vknr" : "42410"
                        },
                        {
                            "name" : "Salus BKK",
                            "vknr" : "40410"
                        },
                        {
                            "name" : "BKK ESSANELLE",
                            "vknr" : "24410"
                        }
                    ]
                },
                {
                    "serialNo" : "411",
                    "content" : [
                        {
                            "name" : "BKK Akzo Nobel -Bayern-",
                            "vknr" : "67411"
                        },
                        {
                            "name" : "BKK Pfalz",
                            "vknr" : "49411"
                        },
                        {
                            "name" : "BKK Linde",
                            "vknr" : "45411"
                        },
                        {
                            "name" : "BKK 11880 der telegate AG/Ost",
                            "vknr" : "99411"
                        }
                    ]
                },
                {
                    "serialNo" : "412",
                    "content" : [
                        {
                            "name" : "BKK advita",
                            "vknr" : "48412"
                        },
                        {
                            "name" : "BKK DER PARTNER / OST",
                            "vknr" : "99412"
                        },
                        {
                            "name" : "SKD BKK",
                            "vknr" : "67412"
                        },
                        {
                            "name" : "BKK Conzelmann",
                            "vknr" : "62412"
                        },
                        {
                            "name" : "BKK firmus",
                            "vknr" : "03412"
                        },
                        {
                            "name" : "BKK Hamburg Mannheimer",
                            "vknr" : "02412"
                        }
                    ]
                },
                {
                    "serialNo" : "413",
                    "content" : [
                        {
                            "name" : "BKK Deutsche Bank AG",
                            "vknr" : "24413"
                        },
                        {
                            "name" : "BKK MOBIL OIL - Ost",
                            "vknr" : "99413"
                        },
                        {
                            "name" : "UPM Betriebskrankenkasse",
                            "vknr" : "70413"
                        }
                    ]
                },
                {
                    "serialNo" : "414",
                    "content" : [
                        {
                            "name" : "IDUNA Betriebskrankenkasse",
                            "vknr" : "02414"
                        },
                        {
                            "name" : "BKK Aktiv / West",
                            "vknr" : "48414"
                        },
                        {
                            "name" : "Audi Betriebskrankenkasse",
                            "vknr" : "64414"
                        },
                        {
                            "name" : "BKK ZF & Partner - Ost",
                            "vknr" : "99414"
                        }
                    ]
                },
                {
                    "serialNo" : "415",
                    "content" : [
                        {
                            "name" : "BKK ProVita",
                            "vknr" : "68415"
                        },
                        {
                            "name" : "BKK Dräger & Hanse - West",
                            "vknr" : "78415"
                        },
                        {
                            "name" : "City BKK",
                            "vknr" : "99415"
                        }
                    ]
                },
                {
                    "serialNo" : "416",
                    "content" : [
                        {
                            "name" : "BKK 24",
                            "vknr" : "09416"
                        }
                    ]
                },
                {
                    "serialNo" : "417",
                    "content" : [
                        {
                            "name" : "Betriebskrankenkasse S-H",
                            "vknr" : "01417"
                        },
                        {
                            "name" : "BKK PFAFF",
                            "vknr" : "49417"
                        },
                        {
                            "name" : "BKK Salzgitter",
                            "vknr" : "07417"
                        },
                        {
                            "name" : "BKK Karl Mayer",
                            "vknr" : "40417"
                        }
                    ]
                },
                {
                    "serialNo" : "418",
                    "content" : [
                        {
                            "name" : "City BKK",
                            "vknr" : "02418"
                        },
                        {
                            "name" : "Heimat Krankenkasse",
                            "vknr" : "19418"
                        },
                        {
                            "name" : "Metzinger BKK",
                            "vknr" : "62418"
                        }
                    ]
                },
                {
                    "serialNo" : "419",
                    "content" : [
                        {
                            "name" : "BKK Herkules",
                            "vknr" : "42419"
                        },
                        {
                            "name" : "BKK evm",
                            "vknr" : "47419"
                        },
                        {
                            "name" : "BKK PHOENIX",
                            "vknr" : "02419"
                        },
                        {
                            "name" : "Betriebskrankenkasse Gruner + Jahr",
                            "vknr" : "01419"
                        }
                    ]
                },
                {
                    "serialNo" : "420",
                    "content" : [
                        {
                            "name" : "BKK Werra-Meissner",
                            "vknr" : "42420"
                        },
                        {
                            "name" : "BKK Philips",
                            "vknr" : "02420"
                        },
                        {
                            "name" : "NOVITAS Vereinigte BKK",
                            "vknr" : "25420"
                        }
                    ]
                },
                {
                    "serialNo" : "421",
                    "content" : [
                        {
                            "name" : "BKK Groz-Beckert",
                            "vknr" : "62421"
                        },
                        {
                            "name" : "mhplus Betriebskrankenkasse",
                            "vknr" : "61421"
                        },
                        {
                            "name" : "BKK Verkehrsbau Union",
                            "vknr" : "72421"
                        }
                    ]
                },
                {
                    "serialNo" : "422",
                    "content" : [
                        {
                            "name" : "Die Continentale BKK",
                            "vknr" : "02422"
                        },
                        {
                            "name" : "Novitas BKK - Die Präventionskasse",
                            "vknr" : "01422"
                        }
                    ]
                },
                {
                    "serialNo" : "423",
                    "content" : [
                        {
                            "name" : "Autoclub BKK",
                            "vknr" : "63423"
                        },
                        {
                            "name" : "Deutsche BKK",
                            "vknr" : "07423"
                        }
                    ]
                },
                {
                    "serialNo" : "424",
                    "content" : [
                        {
                            "name" : "BKK Textilgruppe Hof",
                            "vknr" : "65424"
                        },
                        {
                            "name" : "BKK salvina",
                            "vknr" : "63424"
                        },
                        {
                            "name" : "BKK der norddeutschen Affinerie",
                            "vknr" : "02424"
                        }
                    ]
                },
                {
                    "serialNo" : "425",
                    "content" : [
                        {
                            "name" : "BKK sports direkt",
                            "vknr" : "63425"
                        },
                        {
                            "name" : "BKK Technoform",
                            "vknr" : "08425"
                        },
                        {
                            "name" : "BKK futur",
                            "vknr" : "28425"
                        }
                    ]
                },
                {
                    "serialNo" : "427",
                    "content" : [
                        {
                            "name" : "SEL-Betriebskrankenkasse -Ost-",
                            "vknr" : "99427"
                        }
                    ]
                },
                {
                    "serialNo" : "428",
                    "content" : [
                        {
                            "name" : "BKK FAHR",
                            "vknr" : "58428"
                        },
                        {
                            "name" : "Novitas Vereinigte BKK",
                            "vknr" : "25428"
                        },
                        {
                            "name" : "pronova BKK Ost",
                            "vknr" : "99428"
                        }
                    ]
                },
                {
                    "serialNo" : "429",
                    "content" : [
                        {
                            "name" : "Betriebskrankenkasse SPAR",
                            "vknr" : "02429"
                        }
                    ]
                },
                {
                    "serialNo" : "430",
                    "content" : [
                        {
                            "name" : "BKK AESCULAP",
                            "vknr" : "58430"
                        },
                        {
                            "name" : "BKK der Stadt Augsburg",
                            "vknr" : "70430"
                        },
                        {
                            "name" : "BKK Publik - Partner der BKK Salzgitter",
                            "vknr" : "07430"
                        },
                        {
                            "name" : "BKK Gesundheit / Ost",
                            "vknr" : "95430"
                        }
                    ]
                },
                {
                    "serialNo" : "431",
                    "content" : [
                        {
                            "name" : "Salus BKK Ost",
                            "vknr" : "99431"
                        }
                    ]
                },
                {
                    "serialNo" : "434",
                    "content" : [
                        {
                            "name" : "BKK MTU Friedrichshafen GmbH",
                            "vknr" : "62434"
                        },
                        {
                            "name" : "BKK ZF & Partner",
                            "vknr" : "47434"
                        },
                        {
                            "name" : "Schwenninger Betriebskrankenkasse",
                            "vknr" : "58434"
                        }
                    ]
                },
                {
                    "serialNo" : "435",
                    "content" : [
                        {
                            "name" : "BKK Mahle ",
                            "vknr" : "61435"
                        },
                        {
                            "name" : "BKK Schwarzwald-Baar-Heuberg",
                            "vknr" : "58435"
                        }
                    ]
                },
                {
                    "serialNo" : "436",
                    "content" : [
                        {
                            "name" : "BKK DIE BERGISCHE KRANKENKASSE",
                            "vknr" : "37436"
                        }
                    ]
                },
                {
                    "serialNo" : "438",
                    "content" : [
                        {
                            "name" : "Deutsche BKK",
                            "vknr" : "70438"
                        }
                    ]
                },
                {
                    "serialNo" : "439",
                    "content" : [
                        {
                            "name" : "BKK Axel Springer ",
                            "vknr" : "02439"
                        }
                    ]
                },
                {
                    "serialNo" : "440",
                    "content" : [
                        {
                            "name" : "BKK Rieker.Ricosta.Weisser",
                            "vknr" : "58440"
                        }
                    ]
                },
                {
                    "serialNo" : "449",
                    "content" : [
                        {
                            "name" : "BKK Scheufelen",
                            "vknr" : "61449"
                        }
                    ]
                },
                {
                    "serialNo" : "450",
                    "content" : [
                        {
                            "name" : "energie-BKK",
                            "vknr" : "09450"
                        }
                    ]
                },
                {
                    "serialNo" : "452",
                    "content" : [
                        {
                            "name" : "BKK TUI",
                            "vknr" : "09452"
                        }
                    ]
                },
                {
                    "serialNo" : "455",
                    "content" : [
                        {
                            "name" : "BKK MOBIL OIL",
                            "vknr" : "09455"
                        }
                    ]
                },
                {
                    "serialNo" : "456",
                    "content" : [
                        {
                            "name" : "BKK SAG Netz- u. Energietechnik GmbH",
                            "vknr" : "09456"
                        }
                    ]
                },
                {
                    "serialNo" : "461",
                    "content" : [
                        {
                            "name" : "BKK VerbundPlus",
                            "vknr" : "62461"
                        }
                    ]
                },
                {
                    "serialNo" : "468",
                    "content" : [
                        {
                            "name" : "BKK Wieland-Werke AG",
                            "vknr" : "62468"
                        }
                    ]
                },
                {
                    "serialNo" : "470",
                    "content" : [
                        {
                            "name" : "BKK Gesundheit",
                            "vknr" : "62470"
                        }
                    ]
                },
                {
                    "serialNo" : "471",
                    "content" : [
                        {
                            "name" : "BKK Mannesmann",
                            "vknr" : "24471"
                        }
                    ]
                },
                {
                    "serialNo" : "473",
                    "content" : [
                        {
                            "name" : "BKK Miele",
                            "vknr" : "19473"
                        }
                    ]
                },
                {
                    "serialNo" : "476",
                    "content" : [
                        {
                            "name" : "BKK Verkehrsbau Union Ost",
                            "vknr" : "99476"
                        }
                    ]
                },
                {
                    "serialNo" : "477",
                    "content" : [
                        {
                            "name" : "BKK Württ.Metallwaren Fabrik",
                            "vknr" : "61477"
                        }
                    ]
                },
                {
                    "serialNo" : "479",
                    "content" : [
                        {
                            "name" : "BKK HMR",
                            "vknr" : "19479"
                        }
                    ]
                },
                {
                    "serialNo" : "487",
                    "content" : [
                        {
                            "name" : "BKK Adolf Würth GmbH & Co. KG",
                            "vknr" : "61487"
                        }
                    ]
                },
                {
                    "serialNo" : "491",
                    "content" : [
                        {
                            "name" : "Daimler Betriebskrankenkasse",
                            "vknr" : "61491"
                        }
                    ]
                },
                {
                    "serialNo" : "493",
                    "content" : [
                        {
                            "name" : "BKK Voralb / Heller-Leuze-Traub",
                            "vknr" : "61493"
                        }
                    ]
                },
                {
                    "serialNo" : "494",
                    "content" : [
                        {
                            "name" : "City BKK KöRiA",
                            "vknr" : "61494"
                        }
                    ]
                },
                {
                    "serialNo" : "495",
                    "content" : [
                        {
                            "name" : "Siemens Betriebskrankenkasse",
                            "vknr" : "61495"
                        }
                    ]
                },
                {
                    "serialNo" : "501",
                    "content" : [
                        {
                            "name" : "SBK Netz ÄVOM",
                            "vknr" : "68501"
                        },
                        {
                            "name" : "BKK AKS Netz PNWÜ",
                            "vknr" : "67501"
                        },
                        {
                            "name" : "SIEMENS BKK / Netz MFM",
                            "vknr" : "64501"
                        },
                        {
                            "name" : "BKK Hoechst / Ost",
                            "vknr" : "99501"
                        }
                    ]
                },
                {
                    "serialNo" : "502",
                    "content" : [
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz PNWÜ",
                            "vknr" : "67502"
                        },
                        {
                            "name" : "BKK AKS Netz GOIN",
                            "vknr" : "64502"
                        },
                        {
                            "name" : "SBK Netz ÄVON",
                            "vknr" : "68502"
                        },
                        {
                            "name" : "Hypovereinsbank BKK Netz PPÄV",
                            "vknr" : "63502"
                        }
                    ]
                },
                {
                    "serialNo" : "503",
                    "content" : [
                        {
                            "name" : "BKK KBA Netz PNWÜ",
                            "vknr" : "67503"
                        },
                        {
                            "name" : "SBK Netz MQR",
                            "vknr" : "68503"
                        },
                        {
                            "name" : "Nürnberger BKK Netz PNI",
                            "vknr" : "70503"
                        }
                    ]
                },
                {
                    "serialNo" : "504",
                    "content" : [
                        {
                            "name" : "BKK ESSANELLE Netz ÄVOM",
                            "vknr" : "68504"
                        },
                        {
                            "name" : "BKK AKS Netz MFM",
                            "vknr" : "64504"
                        },
                        {
                            "name" : "BKK Linde Netz PNWÜ",
                            "vknr" : "67504"
                        },
                        {
                            "name" : "Gothaer BKK Ost",
                            "vknr" : "99504"
                        }
                    ]
                },
                {
                    "serialNo" : "505",
                    "content" : [
                        {
                            "name" : "HYPOVEREINSBANK / Netz GO-IN",
                            "vknr" : "64505"
                        },
                        {
                            "name" : "BKK ESSANELLE / Netz PNWÜ",
                            "vknr" : "67505"
                        },
                        {
                            "name" : "BKK TEKADE Netz ÄVOM",
                            "vknr" : "68505"
                        }
                    ]
                },
                {
                    "serialNo" : "506",
                    "content" : [
                        {
                            "name" : "Nünberger BKK Netz ÄVOM",
                            "vknr" : "68506"
                        },
                        {
                            "name" : "Bahn BKK Netz GOIN",
                            "vknr" : "64506"
                        },
                        {
                            "name" : "BKK Ostbayern / Netz PNN",
                            "vknr" : "66506"
                        },
                        {
                            "name" : "BKK Deutsche Bank Netz PPÄV",
                            "vknr" : "63506"
                        },
                        {
                            "name" : "BKK Mobil Oil AG Netz PNWÜ",
                            "vknr" : "67506"
                        }
                    ]
                },
                {
                    "serialNo" : "507",
                    "content" : [
                        {
                            "name" : "BKK AKZO Nobel Netz PPÄV",
                            "vknr" : "63507"
                        },
                        {
                            "name" : "BKK VOR ORT Netz GOIN",
                            "vknr" : "64507"
                        },
                        {
                            "name" : "BKK N-ERGIE Netz PNWÜ",
                            "vknr" : "67507"
                        },
                        {
                            "name" : "BKK AKS Netz ÄVOM",
                            "vknr" : "68507"
                        },
                        {
                            "name" : "BKK Faber-Castell Netz-PNN",
                            "vknr" : "66507"
                        }
                    ]
                },
                {
                    "serialNo" : "508",
                    "content" : [
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz PPÄV",
                            "vknr" : "63508"
                        },
                        {
                            "name" : "Betriebskrankenkasse Medicus West",
                            "vknr" : "95508"
                        },
                        {
                            "name" : "BAVARIA BKK - Ost",
                            "vknr" : "99508"
                        },
                        {
                            "name" : "Nünberger BKK Netz MQR",
                            "vknr" : "68508"
                        },
                        {
                            "name" : "BKK Schwesternschaft München Netz PNWÜ",
                            "vknr" : "67508"
                        },
                        {
                            "name" : "BKK ESSANELLE - Netz GO-IN",
                            "vknr" : "64508"
                        }
                    ]
                },
                {
                    "serialNo" : "509",
                    "content" : [
                        {
                            "name" : "BKK TEKADE Netz PNWÜ",
                            "vknr" : "67509"
                        },
                        {
                            "name" : "BKK ESSANELLE Netz MQR",
                            "vknr" : "68509"
                        },
                        {
                            "name" : "BKK Deutsche Bank Netz GOIN",
                            "vknr" : "64509"
                        }
                    ]
                },
                {
                    "serialNo" : "510",
                    "content" : [
                        {
                            "name" : "Energie-BKK Netz PNWÜ",
                            "vknr" : "67510"
                        },
                        {
                            "name" : "BKK TEKADE Netz MQR",
                            "vknr" : "68510"
                        },
                        {
                            "name" : "BKK BMW Netz MFM",
                            "vknr" : "64510"
                        }
                    ]
                },
                {
                    "serialNo" : "511",
                    "content" : [
                        {
                            "name" : "BKK AKS Netz MQR",
                            "vknr" : "68511"
                        },
                        {
                            "name" : "BKK SKW - Netz GO-IN",
                            "vknr" : "64511"
                        },
                        {
                            "name" : "BKK AKZO Nobel -Bayern- Netz PNN",
                            "vknr" : "66511"
                        },
                        {
                            "name" : "mhplus BKK Netz PNWÜ",
                            "vknr" : "67511"
                        }
                    ]
                },
                {
                    "serialNo" : "512",
                    "content" : [
                        {
                            "name" : "BKK AKZO Nobel Bayern / Netz GO-IN",
                            "vknr" : "64512"
                        },
                        {
                            "name" : "BKK Krones Netz MQR",
                            "vknr" : "68512"
                        },
                        {
                            "name" : "SKD BKK Netz PNWÜ",
                            "vknr" : "67512"
                        }
                    ]
                },
                {
                    "serialNo" : "513",
                    "content" : [
                        {
                            "name" : "Nünberger BKK Netz ÄVON",
                            "vknr" : "68513"
                        },
                        {
                            "name" : "neue BKK Netz PNWÜ",
                            "vknr" : "67513"
                        },
                        {
                            "name" : "Nürnberger BKK / Netz PNN",
                            "vknr" : "66513"
                        },
                        {
                            "name" : "NÜRNBERGER BKK / Netz MFM",
                            "vknr" : "64513"
                        }
                    ]
                },
                {
                    "serialNo" : "514",
                    "content" : [
                        {
                            "name" : "AUDI BKK / Netz MFM",
                            "vknr" : "64514"
                        },
                        {
                            "name" : "BKK ESSANELLE Netz ÄVON",
                            "vknr" : "68514"
                        },
                        {
                            "name" : "BKK Allianz Netz PNWÜ",
                            "vknr" : "67514"
                        }
                    ]
                },
                {
                    "serialNo" : "515",
                    "content" : [
                        {
                            "name" : "BKK TEKADE Netz ÄVON",
                            "vknr" : "68515"
                        },
                        {
                            "name" : "HYPOVEREINSBANK BKK Netz-MFM",
                            "vknr" : "64515"
                        },
                        {
                            "name" : "BKK ESSANELLE / Netz PNN",
                            "vknr" : "66515"
                        },
                        {
                            "name" : "Hypo Vereinsbank BKK Netz PNWÜ",
                            "vknr" : "67515"
                        },
                        {
                            "name" : "BKK der Siemag",
                            "vknr" : "18515"
                        },
                        {
                            "name" : "BKK Schwesternschaft Netz PPÄV",
                            "vknr" : "63515"
                        }
                    ]
                },
                {
                    "serialNo" : "516",
                    "content" : [
                        {
                            "name" : "BAVARIA BKK Netz PNWÜ",
                            "vknr" : "67516"
                        },
                        {
                            "name" : "BKK für Heilberufe Netz GOIN",
                            "vknr" : "64516"
                        },
                        {
                            "name" : "BKK AKS Netz ÄVON",
                            "vknr" : "68516"
                        },
                        {
                            "name" : "BKK AKS Netz PPÄV",
                            "vknr" : "63516"
                        },
                        {
                            "name" : "BKK ESSANELLE / Netz HERZO",
                            "vknr" : "66516"
                        }
                    ]
                },
                {
                    "serialNo" : "517",
                    "content" : [
                        {
                            "name" : "BKK SKW Netz MQR",
                            "vknr" : "68517"
                        },
                        {
                            "name" : "BKK AKZO Nobel -Bayern- Netz PNWÜ",
                            "vknr" : "67517"
                        },
                        {
                            "name" : "BKK Linde Netz GOIN",
                            "vknr" : "64517"
                        },
                        {
                            "name" : "BKK N-ERGIE Netz PNN",
                            "vknr" : "66517"
                        }
                    ]
                },
                {
                    "serialNo" : "518",
                    "content" : [
                        {
                            "name" : "BKK BMW Netz MQR",
                            "vknr" : "68518"
                        },
                        {
                            "name" : "BKK MAN und MTU Netz PNN",
                            "vknr" : "66518"
                        },
                        {
                            "name" : "BKK MAN u. MTU München - Netz MFM",
                            "vknr" : "64518"
                        },
                        {
                            "name" : "BKK Junghans und Partner Netz PNWÜ",
                            "vknr" : "67518"
                        }
                    ]
                },
                {
                    "serialNo" : "519",
                    "content" : [
                        {
                            "name" : "BKK N-ERGIE Netz HERZO",
                            "vknr" : "66519"
                        },
                        {
                            "name" : "mhplus BKK Netz PPÄV",
                            "vknr" : "63519"
                        },
                        {
                            "name" : "Autoclub BKK Netz PNWÜ",
                            "vknr" : "67519"
                        },
                        {
                            "name" : "neue BKK Netz ÄVOM",
                            "vknr" : "68519"
                        },
                        {
                            "name" : "mhplus BKK Netz GOIN",
                            "vknr" : "64519"
                        }
                    ]
                },
                {
                    "serialNo" : "520",
                    "content" : [
                        {
                            "name" : "BKK BMW Netz GO-IN",
                            "vknr" : "64520"
                        },
                        {
                            "name" : "BKK 24 Netz PNWÜ",
                            "vknr" : "67520"
                        },
                        {
                            "name" : "Energie BKK Netz PPÄV",
                            "vknr" : "63520"
                        },
                        {
                            "name" : "BKK Faber-Castell Netz-ÄVOM",
                            "vknr" : "68520"
                        },
                        {
                            "name" : "BKK BMW Netz HERZOGenaurach",
                            "vknr" : "66520"
                        }
                    ]
                },
                {
                    "serialNo" : "521",
                    "content" : [
                        {
                            "name" : "Taunus BKK Netz PNWÜ",
                            "vknr" : "67521"
                        },
                        {
                            "name" : "BKK ALLIANZ / Netz MFM",
                            "vknr" : "64521"
                        },
                        {
                            "name" : "BKK Faber-Castell Netz MQR",
                            "vknr" : "68521"
                        }
                    ]
                },
                {
                    "serialNo" : "522",
                    "content" : [
                        {
                            "name" : "BKK Faber-Castell Netz-ÄVON",
                            "vknr" : "68522"
                        },
                        {
                            "name" : "BKK Allianz Netz GO-IN",
                            "vknr" : "64522"
                        },
                        {
                            "name" : "neue BKK Netz PPÄV",
                            "vknr" : "63522"
                        },
                        {
                            "name" : "SKD BKK Netz PNN",
                            "vknr" : "66522"
                        }
                    ]
                },
                {
                    "serialNo" : "523",
                    "content" : [
                        {
                            "name" : "BKK Krones Netz ÄVOM",
                            "vknr" : "68523"
                        },
                        {
                            "name" : "BKK TEKADE Netz PPÄV",
                            "vknr" : "63523"
                        },
                        {
                            "name" : "UPM BKK Netz MFM",
                            "vknr" : "64523"
                        },
                        {
                            "name" : "BKK Allianz - Netz HERZO",
                            "vknr" : "66523"
                        }
                    ]
                },
                {
                    "serialNo" : "524",
                    "content" : [
                        {
                            "name" : "BKK Krones Netz ÄVON",
                            "vknr" : "68524"
                        },
                        {
                            "name" : "BKK TEKADE-FGF / Netz MFM",
                            "vknr" : "64524"
                        },
                        {
                            "name" : "BKK Mannesmann -Ost-",
                            "vknr" : "99524"
                        },
                        {
                            "name" : "BKK TEKADE-FGF Netz PNN",
                            "vknr" : "66524"
                        }
                    ]
                },
                {
                    "serialNo" : "525",
                    "content" : [
                        {
                            "name" : "BKK Schott-Rohglas Netz ÄVON",
                            "vknr" : "68525"
                        },
                        {
                            "name" : "Deutsche BKK Ost",
                            "vknr" : "99525"
                        },
                        {
                            "name" : "BKK TEKADE Netz ZIF",
                            "vknr" : "66525"
                        },
                        {
                            "name" : "BKK Allianz Netz PPÄV",
                            "vknr" : "63525"
                        },
                        {
                            "name" : "BKK N-ERGIE Netz GOIN",
                            "vknr" : "64525"
                        }
                    ]
                },
                {
                    "serialNo" : "526",
                    "content" : [
                        {
                            "name" : "BKK AKZENT / Netz GO-IN",
                            "vknr" : "64526"
                        },
                        {
                            "name" : "BKK AKZENT / Netz-PNN",
                            "vknr" : "66526"
                        },
                        {
                            "name" : "BKK Allianz Netz ÄVOM",
                            "vknr" : "68526"
                        },
                        {
                            "name" : "BKK Mobil Oil Netz PPÄV",
                            "vknr" : "63526"
                        }
                    ]
                },
                {
                    "serialNo" : "527",
                    "content" : [
                        {
                            "name" : "Hypo Vereinsbank BKK Netz ZiF",
                            "vknr" : "66527"
                        },
                        {
                            "name" : "BKK Spar Netz GOIN",
                            "vknr" : "64527"
                        },
                        {
                            "name" : "BKK ESSANELLE / Netz PPÄV",
                            "vknr" : "63527"
                        },
                        {
                            "name" : "BKK Allianz Netz ÄVON",
                            "vknr" : "68527"
                        }
                    ]
                },
                {
                    "serialNo" : "528",
                    "content" : [
                        {
                            "name" : "BKK Bavaria / Netz MFM",
                            "vknr" : "64528"
                        },
                        {
                            "name" : "BAVARIA BKK / Netz PNN",
                            "vknr" : "66528"
                        },
                        {
                            "name" : "Hypo Vereinsbank BKK Netz ÄVOM",
                            "vknr" : "68528"
                        }
                    ]
                },
                {
                    "serialNo" : "529",
                    "content" : [
                        {
                            "name" : "BKK ESSANELLE Netz ZIF",
                            "vknr" : "66529"
                        },
                        {
                            "name" : "Hypo Vereinsbank BKK Netz ÄVON",
                            "vknr" : "68529"
                        },
                        {
                            "name" : "BKK Linde Netz PPÄV",
                            "vknr" : "63529"
                        },
                        {
                            "name" : "Energie BKK Netz GOIN",
                            "vknr" : "64529"
                        }
                    ]
                },
                {
                    "serialNo" : "530",
                    "content" : [
                        {
                            "name" : "BKK der Stadt Augsburg / Netz GOIN",
                            "vknr" : "64530"
                        },
                        {
                            "name" : "BAVARIA BKK / Netz PPÄV",
                            "vknr" : "63530"
                        },
                        {
                            "name" : "BKK Gesundheit ",
                            "vknr" : "95530"
                        },
                        {
                            "name" : "Bavaria BKK Netz ÄVOM",
                            "vknr" : "68530"
                        },
                        {
                            "name" : "BKK Aktiv Netz PNN",
                            "vknr" : "66530"
                        }
                    ]
                },
                {
                    "serialNo" : "531",
                    "content" : [
                        {
                            "name" : "Bavaria BKK Netz ÄVON",
                            "vknr" : "68531"
                        },
                        {
                            "name" : "Autoclub BKK Netz PPÄV",
                            "vknr" : "63531"
                        },
                        {
                            "name" : "SIEMENS BKK / Netz GO-IN",
                            "vknr" : "64531"
                        },
                        {
                            "name" : "Siemens BKK / Netz-HERZOgenaurach",
                            "vknr" : "66531"
                        }
                    ]
                },
                {
                    "serialNo" : "532",
                    "content" : [
                        {
                            "name" : "SBK Netz ZIF",
                            "vknr" : "66532"
                        },
                        {
                            "name" : "BKK 24 Netz PPÄV",
                            "vknr" : "63532"
                        },
                        {
                            "name" : "AUDI BKK / Netz GO-IN",
                            "vknr" : "64532"
                        },
                        {
                            "name" : "Audi BKK Netz ÄVO Mitte",
                            "vknr" : "68532"
                        }
                    ]
                },
                {
                    "serialNo" : "533",
                    "content" : [
                        {
                            "name" : "Taunus BKK Netz PPÄV",
                            "vknr" : "63533"
                        },
                        {
                            "name" : "NÜRNBERGER BKK / Netz GOIN",
                            "vknr" : "64533"
                        },
                        {
                            "name" : "AUDI BKK Netz ÄVO Nord",
                            "vknr" : "68533"
                        },
                        {
                            "name" : "Nürnberger BKK Netz HERZOgenaurach",
                            "vknr" : "66533"
                        }
                    ]
                },
                {
                    "serialNo" : "534",
                    "content" : [
                        {
                            "name" : "AUDI BKK Netz MQR",
                            "vknr" : "68534"
                        },
                        {
                            "name" : "BKK TEKADE-FGF Netz HERZOGenaurach",
                            "vknr" : "66534"
                        },
                        {
                            "name" : "BKK TEKADE-FGF / Netz GO-IN",
                            "vknr" : "64534"
                        }
                    ]
                },
                {
                    "serialNo" : "535",
                    "content" : [
                        {
                            "name" : "BKK MAN u. MTU München / Netz GO-IN",
                            "vknr" : "64535"
                        },
                        {
                            "name" : "HYPOVEREINSBANK BKK Netz HERZOGenaurach",
                            "vknr" : "66535"
                        },
                        {
                            "name" : "HypoVereinsbank BKK Netz MQR",
                            "vknr" : "68535"
                        }
                    ]
                },
                {
                    "serialNo" : "536",
                    "content" : [
                        {
                            "name" : "Bahn BKK Netz ÄVON",
                            "vknr" : "68536"
                        },
                        {
                            "name" : "BKK Schwesternschaft Netz GOIN",
                            "vknr" : "64536"
                        },
                        {
                            "name" : "BKK Faber-Castell Netz HERZO",
                            "vknr" : "66536"
                        }
                    ]
                },
                {
                    "serialNo" : "537",
                    "content" : [
                        {
                            "name" : "Bahn BKK Netz MQR",
                            "vknr" : "68537"
                        },
                        {
                            "name" : "BKK Schwesternschaft Netz MFM",
                            "vknr" : "64537"
                        },
                        {
                            "name" : "BKK Faber-Castell Netz ZIF",
                            "vknr" : "66537"
                        }
                    ]
                },
                {
                    "serialNo" : "538",
                    "content" : [
                        {
                            "name" : "BAVARIA BKK / Netz HERZO",
                            "vknr" : "66538"
                        },
                        {
                            "name" : "mhplus BKK Netz MQR",
                            "vknr" : "68538"
                        },
                        {
                            "name" : "BAVARIA BKK / Netz GOIN",
                            "vknr" : "64538"
                        }
                    ]
                },
                {
                    "serialNo" : "539",
                    "content" : [
                        {
                            "name" : "ESSO BKK Netz GOIN",
                            "vknr" : "64539"
                        },
                        {
                            "name" : "mhplus BKK Netz ÄVON",
                            "vknr" : "68539"
                        },
                        {
                            "name" : "Nürnberger BKK Netz ZIF",
                            "vknr" : "66539"
                        }
                    ]
                },
                {
                    "serialNo" : "540",
                    "content" : [
                        {
                            "name" : "mhplus BKK Netz ÄVOM",
                            "vknr" : "68540"
                        },
                        {
                            "name" : "Saint-Gobain BKK Netz GOIN",
                            "vknr" : "64540"
                        },
                        {
                            "name" : "BKK AKS Netz PNN",
                            "vknr" : "66540"
                        },
                        {
                            "name" : "BKK Melitta plus",
                            "vknr" : "19540"
                        }
                    ]
                },
                {
                    "serialNo" : "541",
                    "content" : [
                        {
                            "name" : "Schwenninger BKK Netz ÄVOM",
                            "vknr" : "68541"
                        },
                        {
                            "name" : "Schwenninger BKK Netz GOIN",
                            "vknr" : "64541"
                        },
                        {
                            "name" : "BKK AKS Netz HERZO",
                            "vknr" : "66541"
                        }
                    ]
                },
                {
                    "serialNo" : "542",
                    "content" : [
                        {
                            "name" : "Schwenninger BKK Netz ÄVON",
                            "vknr" : "68542"
                        },
                        {
                            "name" : "BKK AKS Netz ZIF",
                            "vknr" : "66542"
                        },
                        {
                            "name" : "Securvita BKK Netz GOIN",
                            "vknr" : "64542"
                        }
                    ]
                },
                {
                    "serialNo" : "543",
                    "content" : [
                        {
                            "name" : "BKK Schwesternschaft Netz PNN",
                            "vknr" : "66543"
                        },
                        {
                            "name" : "neue BKK Netz GOIN",
                            "vknr" : "64543"
                        },
                        {
                            "name" : "Schwenninger BKK Netz MQR",
                            "vknr" : "68543"
                        }
                    ]
                },
                {
                    "serialNo" : "544",
                    "content" : [
                        {
                            "name" : "BKK für Heilberufe Netz ÄVOM",
                            "vknr" : "68544"
                        },
                        {
                            "name" : "BKK Vereinigte Deutsche Nickel-Werke",
                            "vknr" : "18544"
                        },
                        {
                            "name" : "BKK Schwesternschaft Netz HERZO",
                            "vknr" : "66544"
                        },
                        {
                            "name" : "Shell BKK / LIFE Netz GOIN",
                            "vknr" : "64544"
                        }
                    ]
                },
                {
                    "serialNo" : "545",
                    "content" : [
                        {
                            "name" : "BKK für Heilberufe Netz ÄVON",
                            "vknr" : "68545"
                        },
                        {
                            "name" : "BKK Junghans und Partner Netz GOIN",
                            "vknr" : "64545"
                        },
                        {
                            "name" : "BKK Schwesternschaft Netz ZiF",
                            "vknr" : "66545"
                        }
                    ]
                },
                {
                    "serialNo" : "546",
                    "content" : [
                        {
                            "name" : "BKK für Heilberufe Netz MQR",
                            "vknr" : "68546"
                        },
                        {
                            "name" : "BKK Mobil Oil Netz GOIN",
                            "vknr" : "64546"
                        },
                        {
                            "name" : "BKK für Heilberufe Netz HERZOG",
                            "vknr" : "66546"
                        }
                    ]
                },
                {
                    "serialNo" : "547",
                    "content" : [
                        {
                            "name" : "BKK für Heilberufe Netz ZIF",
                            "vknr" : "66547"
                        },
                        {
                            "name" : "BKK Junghans und Partner Netz MQR",
                            "vknr" : "68547"
                        },
                        {
                            "name" : "AXA BKK Netz GOIN",
                            "vknr" : "64547"
                        },
                        {
                            "name" : "BKK FTE-Ost",
                            "vknr" : "99547"
                        }
                    ]
                },
                {
                    "serialNo" : "548",
                    "content" : [
                        {
                            "name" : "AXA BKK Netz PNN",
                            "vknr" : "66548"
                        },
                        {
                            "name" : "BKK Rheinland Netz GOIN",
                            "vknr" : "64548"
                        },
                        {
                            "name" : "BKK Junghans und Partner Netz ÄVOM",
                            "vknr" : "68548"
                        }
                    ]
                },
                {
                    "serialNo" : "549",
                    "content" : [
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz GOIN",
                            "vknr" : "64549"
                        },
                        {
                            "name" : "Bahn BKK Netz PNN",
                            "vknr" : "66549"
                        },
                        {
                            "name" : "BKK Junghans und Partner Netz ÄVON",
                            "vknr" : "68549"
                        }
                    ]
                },
                {
                    "serialNo" : "550",
                    "content" : [
                        {
                            "name" : "Energie-BKK Netz ÄVON",
                            "vknr" : "68550"
                        }
                    ]
                },
                {
                    "serialNo" : "551",
                    "content" : [
                        {
                            "name" : "mhplus BKK Netz MfM",
                            "vknr" : "64551"
                        },
                        {
                            "name" : "BKK AKZO Nobel Bayern / Netz ZiF",
                            "vknr" : "66551"
                        },
                        {
                            "name" : "Energie-BKK Netz ÄVOM",
                            "vknr" : "68551"
                        }
                    ]
                },
                {
                    "serialNo" : "552",
                    "content" : [
                        {
                            "name" : "neue BKK Netz MfM",
                            "vknr" : "64552"
                        },
                        {
                            "name" : "BKK AKZO Nobel Bayern / Netz HERZOG",
                            "vknr" : "66552"
                        },
                        {
                            "name" : "Energie-BKK Netz MQR",
                            "vknr" : "68552"
                        }
                    ]
                },
                {
                    "serialNo" : "553",
                    "content" : [
                        {
                            "name" : "BKK FUTUR Netz PNN",
                            "vknr" : "66553"
                        },
                        {
                            "name" : "Energie-BKK Netz MfM",
                            "vknr" : "64553"
                        },
                        {
                            "name" : "neue BKK Netz ÄVON",
                            "vknr" : "68553"
                        }
                    ]
                },
                {
                    "serialNo" : "554",
                    "content" : [
                        {
                            "name" : "neue BKK Netz MQR",
                            "vknr" : "68554"
                        },
                        {
                            "name" : "BKK Provita Netz ZiF",
                            "vknr" : "66554"
                        },
                        {
                            "name" : "Autoclub BKK Netz GO-IN",
                            "vknr" : "64554"
                        }
                    ]
                },
                {
                    "serialNo" : "555",
                    "content" : [
                        {
                            "name" : "Autoclub BKK Netz MfM",
                            "vknr" : "64555"
                        },
                        {
                            "name" : "Audi BKK Netz HERZOG",
                            "vknr" : "66555"
                        },
                        {
                            "name" : "BKK Mobil Oil Netz ÄVOM",
                            "vknr" : "68555"
                        }
                    ]
                },
                {
                    "serialNo" : "556",
                    "content" : [
                        {
                            "name" : "BKK Mobil Oil Netz ÄVON",
                            "vknr" : "68556"
                        },
                        {
                            "name" : "BKK N-ERGIE Netz ZIF",
                            "vknr" : "66556"
                        },
                        {
                            "name" : "BKK 24 Netz GO-IN",
                            "vknr" : "64556"
                        }
                    ]
                },
                {
                    "serialNo" : "557",
                    "content" : [
                        {
                            "name" : "BAVARIA BKK Netz ZIF",
                            "vknr" : "66557"
                        },
                        {
                            "name" : "BKK  Wirtschaft & Finanzen - OST",
                            "vknr" : "99557"
                        },
                        {
                            "name" : "BKK Mobil Oil Netz MQR",
                            "vknr" : "68557"
                        },
                        {
                            "name" : "BKK Bertelsmann",
                            "vknr" : "19557"
                        },
                        {
                            "name" : "Taunus BKK Netz GOIN",
                            "vknr" : "64557"
                        }
                    ]
                },
                {
                    "serialNo" : "558",
                    "content" : [
                        {
                            "name" : "BKK Linde Netz PNN",
                            "vknr" : "66558"
                        },
                        {
                            "name" : "BKK AKZO Nobel Netz ÄVON",
                            "vknr" : "68558"
                        },
                        {
                            "name" : "City BKK / Ost",
                            "vknr" : "99558"
                        }
                    ]
                },
                {
                    "serialNo" : "559",
                    "content" : [
                        {
                            "name" : "BKK Allianz Netz MQR",
                            "vknr" : "68559"
                        }
                    ]
                },
                {
                    "serialNo" : "560",
                    "content" : [
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz MQR",
                            "vknr" : "68560"
                        },
                        {
                            "name" : "BKK Rheinland Netz PNN",
                            "vknr" : "66560"
                        }
                    ]
                },
                {
                    "serialNo" : "561",
                    "content" : [
                        {
                            "name" : "Energie BKK Netz PNN",
                            "vknr" : "66561"
                        },
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz ÄVOM",
                            "vknr" : "68561"
                        }
                    ]
                },
                {
                    "serialNo" : "562",
                    "content" : [
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz ÄVON",
                            "vknr" : "68562"
                        },
                        {
                            "name" : "Karstadt Quelle BKK Netz PNN",
                            "vknr" : "66562"
                        }
                    ]
                },
                {
                    "serialNo" : "563",
                    "content" : [
                        {
                            "name" : "Autoclub BKK Netz MQR",
                            "vknr" : "68563"
                        },
                        {
                            "name" : "Schwenninger BKK Netz PNN",
                            "vknr" : "66563"
                        }
                    ]
                },
                {
                    "serialNo" : "564",
                    "content" : [
                        {
                            "name" : "BKK Deutsche Bank Netz HERZOG",
                            "vknr" : "66564"
                        },
                        {
                            "name" : "Autoclub BKK Netz ÄVO Mitte",
                            "vknr" : "68564"
                        }
                    ]
                },
                {
                    "serialNo" : "565",
                    "content" : [
                        {
                            "name" : "Autoclub BKK Netz ÄVO Nord",
                            "vknr" : "68565"
                        },
                        {
                            "name" : "mhplus BKK Netz HERZOG",
                            "vknr" : "66565"
                        }
                    ]
                },
                {
                    "serialNo" : "566",
                    "content" : [
                        {
                            "name" : "Energie BKK Netz HERZOG",
                            "vknr" : "66566"
                        },
                        {
                            "name" : "BKK 24 Netz ÄVO-Mitte",
                            "vknr" : "68566"
                        }
                    ]
                },
                {
                    "serialNo" : "567",
                    "content" : [
                        {
                            "name" : "BKK 24 Netz ÄVO-Nord",
                            "vknr" : "68567"
                        },
                        {
                            "name" : "Schwenninger BKK Netz HERZOG",
                            "vknr" : "66567"
                        }
                    ]
                },
                {
                    "serialNo" : "568",
                    "content" : [
                        {
                            "name" : "neue BKK Netz HERZOG",
                            "vknr" : "66568"
                        },
                        {
                            "name" : "BKK 24 Netz MQR",
                            "vknr" : "68568"
                        }
                    ]
                },
                {
                    "serialNo" : "569",
                    "content" : [
                        {
                            "name" : "mhplus BKK Netz ZIF",
                            "vknr" : "66569"
                        },
                        {
                            "name" : "Taunus BKK Netz ÄVOM",
                            "vknr" : "68569"
                        }
                    ]
                },
                {
                    "serialNo" : "570",
                    "content" : [
                        {
                            "name" : "Taunus BKK Netz ÄVON",
                            "vknr" : "68570"
                        },
                        {
                            "name" : "Energie BKK Netz ZIF",
                            "vknr" : "66570"
                        }
                    ]
                },
                {
                    "serialNo" : "571",
                    "content" : [
                        {
                            "name" : "Taunus BKK Netz MQR",
                            "vknr" : "68571"
                        },
                        {
                            "name" : "Schwenninger BKK Netz ZIF",
                            "vknr" : "66571"
                        }
                    ]
                },
                {
                    "serialNo" : "572",
                    "content" : [
                        {
                            "name" : "neue BKK Netz ZIF",
                            "vknr" : "66572"
                        }
                    ]
                },
                {
                    "serialNo" : "573",
                    "content" : [
                        {
                            "name" : "BKK Deutsche Bank Netz PNN",
                            "vknr" : "66573"
                        }
                    ]
                },
                {
                    "serialNo" : "574",
                    "content" : [
                        {
                            "name" : "Securvita BKK Netz PNN",
                            "vknr" : "66574"
                        },
                        {
                            "name" : "IDUNA Betriebskrankenkasse Ost",
                            "vknr" : "99574"
                        }
                    ]
                },
                {
                    "serialNo" : "575",
                    "content" : [
                        {
                            "name" : "neue BKK Netz PNN",
                            "vknr" : "66575"
                        },
                        {
                            "name" : "mhplus Betriebskrankenkasse Ost",
                            "vknr" : "99575"
                        }
                    ]
                },
                {
                    "serialNo" : "576",
                    "content" : [
                        {
                            "name" : "mhplus BKK Netz PNN",
                            "vknr" : "66576"
                        },
                        {
                            "name" : "BKK Lafarge Dachsysteme - Ost",
                            "vknr" : "99576"
                        }
                    ]
                },
                {
                    "serialNo" : "577",
                    "content" : [
                        {
                            "name" : "DaimlerChrysler BKK Netz PNN",
                            "vknr" : "66577"
                        },
                        {
                            "name" : "TAUNUS BKK -Ost",
                            "vknr" : "99577"
                        }
                    ]
                },
                {
                    "serialNo" : "578",
                    "content" : [
                        {
                            "name" : "DaimlerChrysler BKK Netz HERZOG",
                            "vknr" : "66578"
                        },
                        {
                            "name" : "BKK Hamburg Mannheimer Ost",
                            "vknr" : "99578"
                        }
                    ]
                },
                {
                    "serialNo" : "579",
                    "content" : [
                        {
                            "name" : "BKK Junghans und Partner Netz PNN",
                            "vknr" : "66579"
                        },
                        {
                            "name" : "BKK FTE - OST",
                            "vknr" : "99579"
                        }
                    ]
                },
                {
                    "serialNo" : "580",
                    "content" : [
                        {
                            "name" : "BKK Junghans und Partner Netz HERZOG",
                            "vknr" : "66580"
                        },
                        {
                            "name" : "BKK Pfalz -OST-",
                            "vknr" : "99580"
                        }
                    ]
                },
                {
                    "serialNo" : "581",
                    "content" : [
                        {
                            "name" : "BKK FTE-Ost",
                            "vknr" : "99581"
                        },
                        {
                            "name" : "BKK Junghans und Partner Netz ZIF",
                            "vknr" : "66581"
                        }
                    ]
                },
                {
                    "serialNo" : "582",
                    "content" : [
                        {
                            "name" : "BKK Mobil Oil Netz HERZOG",
                            "vknr" : "66582"
                        },
                        {
                            "name" : "Daimler Betriebskrankenkasse / Ost",
                            "vknr" : "99582"
                        }
                    ]
                },
                {
                    "serialNo" : "583",
                    "content" : [
                        {
                            "name" : "BKK für Heilberufe Netz PNN",
                            "vknr" : "66583"
                        },
                        {
                            "name" : "Schwenninger Betriebskrankenkasse/Ost",
                            "vknr" : "99583"
                        }
                    ]
                },
                {
                    "serialNo" : "584",
                    "content" : [
                        {
                            "name" : "BKK Mobil Oil Netz ZiF",
                            "vknr" : "66584"
                        },
                        {
                            "name" : "BKK ESSANELLE Ost",
                            "vknr" : "99584"
                        }
                    ]
                },
                {
                    "serialNo" : "585",
                    "content" : [
                        {
                            "name" : "BKK Mobil Oil Netz PNN",
                            "vknr" : "66585"
                        }
                    ]
                },
                {
                    "serialNo" : "586",
                    "content" : [
                        {
                            "name" : "AXA BKK Netz ZiF",
                            "vknr" : "66586"
                        },
                        {
                            "name" : "BKK Aktiv / Ost",
                            "vknr" : "99586"
                        }
                    ]
                },
                {
                    "serialNo" : "587",
                    "content" : [
                        {
                            "name" : "BKK Allianz Netz ZiF",
                            "vknr" : "66587"
                        },
                        {
                            "name" : "BKK firmus /Ost",
                            "vknr" : "99587"
                        }
                    ]
                },
                {
                    "serialNo" : "588",
                    "content" : [
                        {
                            "name" : "BKK Rheinland Netz ZiF",
                            "vknr" : "66588"
                        },
                        {
                            "name" : "BKK Ford & Rheinland / Ost",
                            "vknr" : "99588"
                        }
                    ]
                },
                {
                    "serialNo" : "589",
                    "content" : [
                        {
                            "name" : "BKK A.T.U. / Ost",
                            "vknr" : "99589"
                        },
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz HERZO",
                            "vknr" : "66589"
                        }
                    ]
                },
                {
                    "serialNo" : "590",
                    "content" : [
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz ZiF",
                            "vknr" : "66590"
                        },
                        {
                            "name" : "BKK Gildemeister/Seidensticker-Ost",
                            "vknr" : "99590"
                        }
                    ]
                },
                {
                    "serialNo" : "591",
                    "content" : [
                        {
                            "name" : "BKK DEMAG KRAUSS-MAFFEI Netz PNN",
                            "vknr" : "66591"
                        },
                        {
                            "name" : "NOVITAS Vereinigte BKK / Ost",
                            "vknr" : "99591"
                        }
                    ]
                },
                {
                    "serialNo" : "592",
                    "content" : [
                        {
                            "name" : "Gemeinsame BKK in Köln - Ost",
                            "vknr" : "99592"
                        },
                        {
                            "name" : "Shell BKK / LIFE Netz PNN",
                            "vknr" : "66592"
                        }
                    ]
                },
                {
                    "serialNo" : "593",
                    "content" : [
                        {
                            "name" : "Bertelsmann BKK Netz ZiF",
                            "vknr" : "66593"
                        },
                        {
                            "name" : "Autoclub BKK Ost",
                            "vknr" : "99593"
                        }
                    ]
                },
                {
                    "serialNo" : "594",
                    "content" : [
                        {
                            "name" : "BKK Gildemeister Seidensticker HERZOG",
                            "vknr" : "66594"
                        },
                        {
                            "name" : "BKK Schott-Zeiss - Ost",
                            "vknr" : "99594"
                        }
                    ]
                },
                {
                    "serialNo" : "595",
                    "content" : [
                        {
                            "name" : "BKK Deutsche BP AG - Ost -",
                            "vknr" : "99595"
                        },
                        {
                            "name" : "Autoclub BKK Netz PNN",
                            "vknr" : "66595"
                        }
                    ]
                },
                {
                    "serialNo" : "596",
                    "content" : [
                        {
                            "name" : "Autoclub BKK Netz HERZO",
                            "vknr" : "66596"
                        },
                        {
                            "name" : "BKK Aktiv / Ost",
                            "vknr" : "99596"
                        }
                    ]
                },
                {
                    "serialNo" : "597",
                    "content" : [
                        {
                            "name" : "Autoclub BKK Netz ZiF",
                            "vknr" : "66597"
                        },
                        {
                            "name" : "BKK ESSANELLE Ost",
                            "vknr" : "99597"
                        }
                    ]
                },
                {
                    "serialNo" : "598",
                    "content" : [
                        {
                            "name" : "BKK 24 Netz PNN",
                            "vknr" : "66598"
                        },
                        {
                            "name" : "BKK TUI / Ost",
                            "vknr" : "99598"
                        }
                    ]
                },
                {
                    "serialNo" : "599",
                    "content" : [
                        {
                            "name" : "BKK 24 Netz ZiF",
                            "vknr" : "66599"
                        }
                    ]
                },
                {
                    "serialNo" : "601",
                    "content" : [
                        {
                            "name" : "BARMER",
                            "vknr" : "89601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "88601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "71601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "78601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "01601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "55601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "72601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "73601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "40601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "17601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "02601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "19601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "48601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "95601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "37601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "79601"
                        },
                        {
                            "name" : "BARMER",
                            "vknr" : "03601"
                        }
                    ]
                },
                {
                    "serialNo" : "602",
                    "content" : [
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "72602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "73602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "48602"
                        },
                        {
                            "name" : "DAK-Gesundheit",
                            "vknr" : "02602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "79602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "89602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "88602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "96602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "03602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "40602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "19602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "17602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "71602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "24602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "78602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "55602"
                        },
                        {
                            "name" : "DAK Gesundheit",
                            "vknr" : "01602"
                        }
                    ]
                },
                {
                    "serialNo" : "603",
                    "content" : [
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "03603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "79603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "72603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "01603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "17603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "31603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "48603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "19603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "02603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "78603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "71603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "40603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "55603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "88603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "94603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "73603"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse - KKH",
                            "vknr" : "89603"
                        }
                    ]
                },
                {
                    "serialNo" : "605",
                    "content" : [
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "71605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse ",
                            "vknr" : "01605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "72605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "03605"
                        },
                        {
                            "name" : "TK Rheinland-Pfalz",
                            "vknr" : "48605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "55605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "17605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "19605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "73605"
                        },
                        {
                            "name" : "Techniker Krankenkasse",
                            "vknr" : "02605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "89605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "40605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "88605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "79605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "78605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "25605"
                        },
                        {
                            "name" : "Techniker-Krankenkasse",
                            "vknr" : "95605"
                        }
                    ]
                },
                {
                    "serialNo" : "606",
                    "content" : [
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "88606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "01606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "19606"
                        },
                        {
                            "name" : "HEK Rheinland-Pfalz",
                            "vknr" : "48606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "79606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "73606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "89606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "55606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "96606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "02606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "71606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "72606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "27606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "78606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "03606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "17606"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse",
                            "vknr" : "40606"
                        }
                    ]
                },
                {
                    "serialNo" : "607",
                    "content" : [
                        {
                            "name" : "hkk",
                            "vknr" : "03607"
                        }
                    ]
                },
                {
                    "serialNo" : "701",
                    "content" : [
                        {
                            "name" : "Knappschaft",
                            "vknr" : "18701"
                        },
                        {
                            "name" : "Knappschaft-Ost",
                            "vknr" : "99701"
                        }
                    ]
                },
                {
                    "serialNo" : "799",
                    "content" : [
                        {
                            "name" : "Test GKV-SV",
                            "vknr" : "74799"
                        }
                    ]
                },
                {
                    "serialNo" : "800",
                    "content" : [
                        {
                            "name" : "Hilfskostenträger LEG I",
                            "vknr" : "71800"
                        },
                        {
                            "name" : "Konsiliarfälle",
                            "vknr" : "73800"
                        }
                    ]
                },
                {
                    "serialNo" : "801",
                    "content" : [
                        {
                            "name" : "SHV Deggendorf",
                            "vknr" : "69801"
                        },
                        {
                            "name" : "Sozialamt Landkr.Aschersleben-Staßfurt",
                            "vknr" : "87801"
                        },
                        {
                            "name" : "Landratsamt Erzgebirgskreis Asyl",
                            "vknr" : "94801"
                        },
                        {
                            "name" : "SHV Altötting",
                            "vknr" : "64801"
                        },
                        {
                            "name" : "Stadt Suhl/Thüringen SA",
                            "vknr" : "91801"
                        },
                        {
                            "name" : "SHV Aschaffenburg-Stadt",
                            "vknr" : "67801"
                        },
                        {
                            "name" : "Kreisverwaltung Ahrweiler",
                            "vknr" : "47801"
                        },
                        {
                            "name" : "SHV Stadt Ansbach",
                            "vknr" : "66801"
                        },
                        {
                            "name" : "Kreissozialamt Rhein-Neckar Heidelberg",
                            "vknr" : "53801"
                        },
                        {
                            "name" : "Magistrat der Stadt Marburg -Sozialamt-",
                            "vknr" : "44801"
                        },
                        {
                            "name" : "Sozialamt Stadt Krefeld",
                            "vknr" : "28801"
                        },
                        {
                            "name" : "Sozialamt der Stadt Düsseldorf Amt 50",
                            "vknr" : "24801"
                        },
                        {
                            "name" : "LHST München, Sozialhilfeverwaltung",
                            "vknr" : "63801"
                        },
                        {
                            "name" : "Sozialamt Landkreis Friesland",
                            "vknr" : "16801"
                        },
                        {
                            "name" : "Kinder/Jugendamt Villingen-Schwenningen",
                            "vknr" : "58801"
                        },
                        {
                            "name" : "Sozialamt Landkreis Grafschaft Bentheim",
                            "vknr" : "13801"
                        },
                        {
                            "name" : "Kreisausschuss des Kreises Dithmarschen",
                            "vknr" : "01801"
                        },
                        {
                            "name" : "SHV Augsburg-Stadt",
                            "vknr" : "70801"
                        },
                        {
                            "name" : "Senatorin f. Soziales, Ki., Jug. u. Fr.",
                            "vknr" : "03801"
                        },
                        {
                            "name" : "Sozialamt der Stadt Saarbrücken",
                            "vknr" : "73801"
                        },
                        {
                            "name" : "Kreissozialamt Emmendingen",
                            "vknr" : "57801"
                        },
                        {
                            "name" : "Stadtverw. Baden-Baden, FB Bild. u Soz.",
                            "vknr" : "56801"
                        },
                        {
                            "name" : "Stadtverwaltung - Sozialamt Frankenthal",
                            "vknr" : "49801"
                        },
                        {
                            "name" : "Sozialamt Stadt Oldenburg",
                            "vknr" : "12801"
                        },
                        {
                            "name" : "Landesamt f.Jugend u.Soz. Rheinland-Pfa",
                            "vknr" : "48801"
                        },
                        {
                            "name" : "Sozialamt der Stadt Aachen",
                            "vknr" : "21801"
                        },
                        {
                            "name" : "Stadtverwaltung Gera SA/Krankenhilfe",
                            "vknr" : "90801"
                        },
                        {
                            "name" : "Kreisverwaltung Bernkastel-Wittlich",
                            "vknr" : "50801"
                        },
                        {
                            "name" : "Sozialamt Landkreis Emsland",
                            "vknr" : "06801"
                        },
                        {
                            "name" : "SA Stadt Wuppertal/Ressort 204.14",
                            "vknr" : "37801"
                        },
                        {
                            "name" : "Hilfskostenträger LEG II",
                            "vknr" : "71801"
                        },
                        {
                            "name" : "Sozialamt der Stadt Duisburg",
                            "vknr" : "25801"
                        },
                        {
                            "name" : "Amt f Grundsichrg. u Flüchtlinge 500115",
                            "vknr" : "45801"
                        },
                        {
                            "name" : "Sozialamt Stadt Köln",
                            "vknr" : "27801"
                        },
                        {
                            "name" : "Landkreis Diepholz -Sozialamt-",
                            "vknr" : "15801"
                        },
                        {
                            "name" : "Stadt Frankfurt a. Main,Jug.SA,51.A46.1",
                            "vknr" : "40801"
                        },
                        {
                            "name" : "BASFI Operative Steuerung / SI 223",
                            "vknr" : "02801"
                        },
                        {
                            "name" : "Kreissozialamt Zollernalbkreis Balingen",
                            "vknr" : "62801"
                        },
                        {
                            "name" : "LRA Ostalbkreis-Geschäftsber. Soziales",
                            "vknr" : "61801"
                        },
                        {
                            "name" : "Stadtverwaltung Erfurt HdsD -Amt 50-",
                            "vknr" : "89801"
                        },
                        {
                            "name" : "SHV Stadtrat Bamberg",
                            "vknr" : "65801"
                        },
                        {
                            "name" : "Sozialamt Braunschweig",
                            "vknr" : "07801"
                        },
                        {
                            "name" : "Sozialhilfe Amberg-Sulzbach",
                            "vknr" : "68801"
                        },
                        {
                            "name" : "KSA Ortenau Bereich Stadt Lahr",
                            "vknr" : "59801"
                        },
                        {
                            "name" : "Sozialamt der Stadt Essen",
                            "vknr" : "31801"
                        }
                    ]
                },
                {
                    "serialNo" : "802",
                    "content" : [
                        {
                            "name" : "Landratsamt Erzgebirgskreis Soz.Hilfen",
                            "vknr" : "94802"
                        },
                        {
                            "name" : "Stadtverwaltung Weimar - Dez. Soziales",
                            "vknr" : "89802"
                        },
                        {
                            "name" : "KSA Ortenau Bereich Stadt Offenburg",
                            "vknr" : "59802"
                        },
                        {
                            "name" : "Landratsamt Calw",
                            "vknr" : "54802"
                        },
                        {
                            "name" : "BG Notarztdienst Bayern",
                            "vknr" : "71802"
                        },
                        {
                            "name" : "Sozialamt des Kreises Aachen",
                            "vknr" : "21802"
                        },
                        {
                            "name" : "Sozialhilfe Amberg-Stadt",
                            "vknr" : "68802"
                        },
                        {
                            "name" : "SHT Stadt Bonn",
                            "vknr" : "27802"
                        },
                        {
                            "name" : "SHV Berchtesgadener Land",
                            "vknr" : "64802"
                        },
                        {
                            "name" : "SHV Landratsamt Bamberg",
                            "vknr" : "65802"
                        },
                        {
                            "name" : "Stadtverwaltung - Sozialamt Kaiserslaut",
                            "vknr" : "49802"
                        },
                        {
                            "name" : "Sozialamt Stadt Delmenhorst",
                            "vknr" : "12802"
                        },
                        {
                            "name" : "SHV Landratsamt Ansbach",
                            "vknr" : "66802"
                        },
                        {
                            "name" : "Sozialamt Hannover-Stadt",
                            "vknr" : "09802"
                        },
                        {
                            "name" : "Landkreis Jerichower Land SA",
                            "vknr" : "85802"
                        },
                        {
                            "name" : "Landratsamt München Sozialhilfeamt",
                            "vknr" : "63802"
                        },
                        {
                            "name" : "Sozialamt Stadt Remscheid",
                            "vknr" : "37802"
                        },
                        {
                            "name" : "Landkreis Anhalt-Bitterfeld Sozialamt",
                            "vknr" : "86802"
                        },
                        {
                            "name" : "Sozialamt des Stadtverbandes Saarbrück.",
                            "vknr" : "73802"
                        },
                        {
                            "name" : "Salzlandkreis Der Landrat SA",
                            "vknr" : "87802"
                        },
                        {
                            "name" : "SHV Aichach-Friedberg",
                            "vknr" : "70802"
                        },
                        {
                            "name" : "Kreissozialamt Biberach",
                            "vknr" : "62802"
                        },
                        {
                            "name" : "Städt. Jugendamt Konstanz, Jugendhilfe",
                            "vknr" : "58802"
                        },
                        {
                            "name" : "Sozialamt Landkreis Aurich",
                            "vknr" : "06802"
                        },
                        {
                            "name" : "BASFI Operative Steuerung / SI 223",
                            "vknr" : "02802"
                        },
                        {
                            "name" : "Sozialamt Mülheim/Ruhr",
                            "vknr" : "31802"
                        },
                        {
                            "name" : "Amt für Migration und Integration",
                            "vknr" : "57802"
                        },
                        {
                            "name" : "Kreisverwaltung Altenkirchen",
                            "vknr" : "47802"
                        },
                        {
                            "name" : "Magistrat Stadt Wiesbaden-Jugendamt-",
                            "vknr" : "45802"
                        },
                        {
                            "name" : "Sozialamt Landkreis Wesermarsch",
                            "vknr" : "16802"
                        },
                        {
                            "name" : "Landratsamt Rhein-Neckar-Kreis",
                            "vknr" : "53802"
                        },
                        {
                            "name" : "AOK Berlin -U- Sozialamt",
                            "vknr" : "72802"
                        },
                        {
                            "name" : "Magistrat der Stadt Flensburg",
                            "vknr" : "01802"
                        },
                        {
                            "name" : "Sozialamt der Stadt Bremerhaven",
                            "vknr" : "03802"
                        },
                        {
                            "name" : "SHV Freyung",
                            "vknr" : "69802"
                        },
                        {
                            "name" : "SHV Aschaffenburg-Land SG 33",
                            "vknr" : "67802"
                        },
                        {
                            "name" : "Kreisverwaltung Bitburg-Prüm",
                            "vknr" : "50802"
                        },
                        {
                            "name" : "Amt für soziale Leistungen Mainz",
                            "vknr" : "48802"
                        }
                    ]
                },
                {
                    "serialNo" : "803",
                    "content" : [
                        {
                            "name" : "Landkreis Mansfeld-Südharz, Amt f. Soz.",
                            "vknr" : "86803"
                        },
                        {
                            "name" : "Sozialamt Kelheim",
                            "vknr" : "69803"
                        },
                        {
                            "name" : "AOK Berlin -J- Jugendamt",
                            "vknr" : "72803"
                        },
                        {
                            "name" : "LWV Hessen,Regionalverwaltung Wiesbaden",
                            "vknr" : "45803"
                        },
                        {
                            "name" : "Landkreis Limburg-Weilburg, Der KRA, SA",
                            "vknr" : "43803"
                        },
                        {
                            "name" : "Sozialamt Kreis Mettmann, Kreisverwalt.",
                            "vknr" : "24803"
                        },
                        {
                            "name" : "FH Hamburg, LEB Kinder/Jugendnotdienst",
                            "vknr" : "02803"
                        },
                        {
                            "name" : "Jugendamt der Stadt Bielefeld",
                            "vknr" : "19803"
                        },
                        {
                            "name" : "Sozialamt Stadt Wilhelmshaven",
                            "vknr" : "16803"
                        },
                        {
                            "name" : "Kreissozialamt Offenburg",
                            "vknr" : "59803"
                        },
                        {
                            "name" : "Sozialamt der Stadt Bochum",
                            "vknr" : "18803"
                        },
                        {
                            "name" : "Jugendamt der Stadt Bremerhaven",
                            "vknr" : "03803"
                        },
                        {
                            "name" : "SHV Stadt Erlangen",
                            "vknr" : "66803"
                        },
                        {
                            "name" : "Kreissozialamt Freiburg",
                            "vknr" : "57803"
                        },
                        {
                            "name" : "Kreissozialamt Rhein-Neckar Sinsheim",
                            "vknr" : "53803"
                        },
                        {
                            "name" : "Thüringer Landesverw.-amt - Ref. 210",
                            "vknr" : "90803"
                        },
                        {
                            "name" : "SHV Bad Kissingen",
                            "vknr" : "67803"
                        },
                        {
                            "name" : "Sozialamt Kreis Heinsberg",
                            "vknr" : "21803"
                        },
                        {
                            "name" : "Kreissozialamt Konstanz",
                            "vknr" : "58803"
                        },
                        {
                            "name" : "Landratsamt Cham -SHV-",
                            "vknr" : "68803"
                        },
                        {
                            "name" : "Sozialamt des Saar-Pfalz-Kreises",
                            "vknr" : "73803"
                        },
                        {
                            "name" : "SHV Stadt Bayreuth",
                            "vknr" : "65803"
                        },
                        {
                            "name" : "LHST München, AsylbLG",
                            "vknr" : "63803"
                        },
                        {
                            "name" : "Neue Grippe (PKV)",
                            "vknr" : "71803"
                        },
                        {
                            "name" : "Kreisverwaltung Daun",
                            "vknr" : "50803"
                        },
                        {
                            "name" : "Stadtverwaltung Eisenach Sozialamt",
                            "vknr" : "89803"
                        },
                        {
                            "name" : "Jobcenter u Sozial., GB II, Abt. II-031",
                            "vknr" : "40803"
                        },
                        {
                            "name" : "SHV Bad Tölz-Wolfratshausen",
                            "vknr" : "64803"
                        },
                        {
                            "name" : "SHT der Stadt Remscheid-Jugendhilfe-",
                            "vknr" : "37803"
                        },
                        {
                            "name" : "Sozialamt Kreis Ammerland",
                            "vknr" : "12803"
                        },
                        {
                            "name" : "Sozialamt Landkreis Lüchow-Dannenberg",
                            "vknr" : "11803"
                        },
                        {
                            "name" : "Stadt Dessau-Roßlau Sozialamt",
                            "vknr" : "87803"
                        },
                        {
                            "name" : "Sozialamt Stadt Mönchengladbach",
                            "vknr" : "28803"
                        },
                        {
                            "name" : "SA Stadt Oberhausen B. 3-2-10 c/o FiBu",
                            "vknr" : "31803"
                        },
                        {
                            "name" : "Jugendamt Stadt Mainz",
                            "vknr" : "48803"
                        },
                        {
                            "name" : "Stadt Köln Asylbewerber",
                            "vknr" : "27803"
                        },
                        {
                            "name" : "Kreisverwaltung Birkenfeld",
                            "vknr" : "47803"
                        },
                        {
                            "name" : "SHV Augsburg-Land",
                            "vknr" : "70803"
                        },
                        {
                            "name" : "LRA Ravensburg, Amt f. Migrat. u. Int.",
                            "vknr" : "62803"
                        }
                    ]
                },
                {
                    "serialNo" : "804",
                    "content" : [
                        {
                            "name" : "Thüringer Landesverwaltungsamt Ref. 210",
                            "vknr" : "89804"
                        },
                        {
                            "name" : "SA Stadt Landshut",
                            "vknr" : "69804"
                        },
                        {
                            "name" : "Kreisverwaltung Genthin (SA)",
                            "vknr" : "85804"
                        },
                        {
                            "name" : "SHV Stadtjugendamt Bayreuth",
                            "vknr" : "65804"
                        },
                        {
                            "name" : "Landkreis Lüneburg Sozialamt",
                            "vknr" : "11804"
                        },
                        {
                            "name" : "LHST München, Stadtjugendamt",
                            "vknr" : "63804"
                        },
                        {
                            "name" : "Kreissozialamt Rhein-Neckar Weinheim",
                            "vknr" : "53804"
                        },
                        {
                            "name" : "Sozialamt Halle",
                            "vknr" : "86804"
                        },
                        {
                            "name" : "AOK Berlin BEG",
                            "vknr" : "72804"
                        },
                        {
                            "name" : "Stadtverwaltung - Sozialamt Landau",
                            "vknr" : "49804"
                        },
                        {
                            "name" : "Stadtverwaltung Maintal",
                            "vknr" : "40804"
                        },
                        {
                            "name" : "Sozialamt Erftkreis",
                            "vknr" : "27804"
                        },
                        {
                            "name" : "Sozialamt Kreis Neuss",
                            "vknr" : "24804"
                        },
                        {
                            "name" : "Sozialamt Solingen",
                            "vknr" : "37804"
                        },
                        {
                            "name" : "Sozialhilfeverwaltung Dachau",
                            "vknr" : "64804"
                        },
                        {
                            "name" : "KRA Werra-Meissner-Kreis SA KV II / 4b",
                            "vknr" : "42804"
                        },
                        {
                            "name" : "Sozialhilfe Neumarkt",
                            "vknr" : "68804"
                        },
                        {
                            "name" : "Kreisverwaltung Cochem-Zell",
                            "vknr" : "47804"
                        },
                        {
                            "name" : "Amt f. Migration u Integr. Reutlingen",
                            "vknr" : "62804"
                        },
                        {
                            "name" : "Jugendamt Bremen-Sen. f Soziales/Jugend",
                            "vknr" : "03804"
                        },
                        {
                            "name" : "Sozialamt Landkreis Ostvorpommern",
                            "vknr" : "78804"
                        },
                        {
                            "name" : "Landratsamt Ortenaukreis",
                            "vknr" : "59804"
                        },
                        {
                            "name" : "SHV Dillingen-Do.",
                            "vknr" : "70804"
                        },
                        {
                            "name" : "Städt. SA Freiburg Ki, Jug. u. Familie",
                            "vknr" : "57804"
                        },
                        {
                            "name" : "Rheingau-Taunus-Kreis Asylbewerber",
                            "vknr" : "45804"
                        },
                        {
                            "name" : "Stadt Essen Asylbewerber",
                            "vknr" : "31804"
                        },
                        {
                            "name" : "Landeshauptstadt Dresden SA, SG Soz. D.",
                            "vknr" : "95804"
                        },
                        {
                            "name" : "Sozialamt Landkreis Nienburg",
                            "vknr" : "15804"
                        },
                        {
                            "name" : "SHV Rhön-Grabfeld",
                            "vknr" : "67804"
                        },
                        {
                            "name" : "SHV Landratsamt Erlangen-Höchstadt",
                            "vknr" : "66804"
                        },
                        {
                            "name" : "Kreissozialamt Rottweil",
                            "vknr" : "58804"
                        },
                        {
                            "name" : "Sozialamt Stadt Düren",
                            "vknr" : "21804"
                        },
                        {
                            "name" : "Landratsamt Rastatt - Jugendamt",
                            "vknr" : "56804"
                        },
                        {
                            "name" : "Kreisverwaltung Mainz-Bingen",
                            "vknr" : "48804"
                        },
                        {
                            "name" : "Sozialamt des Kreises Neunkirchen",
                            "vknr" : "73804"
                        },
                        {
                            "name" : "Sozialamt Landkreis Cloppenburg",
                            "vknr" : "12804"
                        },
                        {
                            "name" : "Kreissozialamt (KSA).Kleve",
                            "vknr" : "25804"
                        },
                        {
                            "name" : "Landeshauptstadt Kiel Sozialamt",
                            "vknr" : "01804"
                        }
                    ]
                },
                {
                    "serialNo" : "805",
                    "content" : [
                        {
                            "name" : "AOK Berlin BVFG",
                            "vknr" : "72805"
                        },
                        {
                            "name" : "Sozialhilfe Neustadt/Wn",
                            "vknr" : "68805"
                        },
                        {
                            "name" : "Landkreis Harz - Der Landrat",
                            "vknr" : "85805"
                        },
                        {
                            "name" : "SHV Stadt Fürth",
                            "vknr" : "66805"
                        },
                        {
                            "name" : "Kreissozialamt Sigmaringen",
                            "vknr" : "62805"
                        },
                        {
                            "name" : "Rheingau-Taunus-Kreis-Kreisjugendamt",
                            "vknr" : "45805"
                        },
                        {
                            "name" : "Kreisausschuß des Kreises Hzgt Lauenbu",
                            "vknr" : "01805"
                        },
                        {
                            "name" : "Jugendamt Stadt Viersen",
                            "vknr" : "28805"
                        },
                        {
                            "name" : "Sozialamt Krs.Düren-Zahlst.Niederzier-",
                            "vknr" : "21805"
                        },
                        {
                            "name" : "Schwalm-Eder-Kreis, KRA, Fb. Soz.verw.",
                            "vknr" : "44805"
                        },
                        {
                            "name" : "Landkr. Limburg-Weilburg -Fb V b Jugend",
                            "vknr" : "43805"
                        },
                        {
                            "name" : "Landratsamt Böblingen -Kreiskassen-",
                            "vknr" : "61805"
                        },
                        {
                            "name" : "Kinder/Jugendamt Schwarzwald-Baar-Kreis",
                            "vknr" : "58805"
                        },
                        {
                            "name" : "Kreissozialamt Offenburg-Außenst. Lahr",
                            "vknr" : "59805"
                        },
                        {
                            "name" : "Landratsamt Rastatt Sozialamt",
                            "vknr" : "56805"
                        },
                        {
                            "name" : "Stadt Mühlheim Asylbewerber",
                            "vknr" : "31805"
                        },
                        {
                            "name" : "Sozialamt des Kreises St. Wendel",
                            "vknr" : "73805"
                        },
                        {
                            "name" : "Sozialamt Landkreis Emsland",
                            "vknr" : "13805"
                        },
                        {
                            "name" : "SHV Hassberge Landratsamt",
                            "vknr" : "67805"
                        },
                        {
                            "name" : "Stadt Hildesheim-FB Soz., Jugend u Woh.",
                            "vknr" : "10805"
                        },
                        {
                            "name" : "SHV Ebersberg",
                            "vknr" : "64805"
                        },
                        {
                            "name" : "Stadtverwaltung Worms ",
                            "vknr" : "48805"
                        },
                        {
                            "name" : "Landratsamt Lörrach",
                            "vknr" : "57805"
                        },
                        {
                            "name" : "LRA Neckar-Odenwald-Kreis -  ASYL",
                            "vknr" : "53805"
                        },
                        {
                            "name" : "Sozialamt Stadt Emden",
                            "vknr" : "06805"
                        },
                        {
                            "name" : "Stadtjugendamt Landshut",
                            "vknr" : "69805"
                        },
                        {
                            "name" : "SHV Landratsamt Bayreuth",
                            "vknr" : "65805"
                        },
                        {
                            "name" : "Sozialamt LK Mansfelder Land/Hettstedt",
                            "vknr" : "87805"
                        },
                        {
                            "name" : "Stadtverwaltung Sozialdezernat",
                            "vknr" : "49805"
                        },
                        {
                            "name" : "Landkreis Oldenburg -Sozialamt-",
                            "vknr" : "12805"
                        },
                        {
                            "name" : "Stadt Bonn Asylbewerber",
                            "vknr" : "27805"
                        },
                        {
                            "name" : "Sozialamt Stadt Erkrath",
                            "vknr" : "24805"
                        },
                        {
                            "name" : "SHV Günzburg",
                            "vknr" : "70805"
                        },
                        {
                            "name" : "Sozialamt Chemnitz",
                            "vknr" : "94805"
                        }
                    ]
                },
                {
                    "serialNo" : "806",
                    "content" : [
                        {
                            "name" : "SHV Landratsamt Landshut",
                            "vknr" : "69806"
                        },
                        {
                            "name" : "Kreisverwaltung Rhein-Lahn",
                            "vknr" : "47806"
                        },
                        {
                            "name" : "Landkreis Börde, Sozialamt",
                            "vknr" : "85806"
                        },
                        {
                            "name" : "Rheingau-Taunus-Kreis-Kreissozialamt",
                            "vknr" : "45806"
                        },
                        {
                            "name" : "SHV Kitzingen",
                            "vknr" : "67806"
                        },
                        {
                            "name" : "Sozialamt Landkreis Osterholz",
                            "vknr" : "14806"
                        },
                        {
                            "name" : "SHV Landratsamt Fürth",
                            "vknr" : "66806"
                        },
                        {
                            "name" : "Stadt Coburg -Sozialamt-",
                            "vknr" : "65806"
                        },
                        {
                            "name" : "Landratsamt Bodenseekreis-Sozialamt",
                            "vknr" : "62806"
                        },
                        {
                            "name" : "Stadtverwaltung Trier -Sozialamt-",
                            "vknr" : "50806"
                        },
                        {
                            "name" : "Sozialamt der Stadt Dortmund",
                            "vknr" : "18806"
                        },
                        {
                            "name" : "Kreisausschuß Ldkr. Marburg-Biedenko",
                            "vknr" : "44806"
                        },
                        {
                            "name" : "Sozialamt Landkreis Demmin",
                            "vknr" : "78806"
                        },
                        {
                            "name" : "Hansestadt Lübeck, Fachb.Wirtsch.u.Soz.",
                            "vknr" : "01806"
                        },
                        {
                            "name" : "Stadtverwaltung Offenbach Sozialamt",
                            "vknr" : "40806"
                        },
                        {
                            "name" : "Kreissozialamt Offenburg-Außenst. Wolfa",
                            "vknr" : "59806"
                        },
                        {
                            "name" : "Stadt Oberhausen Asylbewerber",
                            "vknr" : "31806"
                        },
                        {
                            "name" : "RP Freiburg, Referat 15 - BEA/LEA",
                            "vknr" : "57806"
                        },
                        {
                            "name" : "Sozialamt Kreis Euskirchen",
                            "vknr" : "27806"
                        },
                        {
                            "name" : "Stadtverw. Soz.Amt",
                            "vknr" : "49806"
                        },
                        {
                            "name" : "SHV Eichstätt",
                            "vknr" : "64806"
                        },
                        {
                            "name" : "Landratsamt Freudenstadt - Sozialamt",
                            "vknr" : "56806"
                        },
                        {
                            "name" : "Kreisverwaltung Alzey-Worms",
                            "vknr" : "48806"
                        },
                        {
                            "name" : "Sozialamt Kreis Wesel",
                            "vknr" : "25806"
                        },
                        {
                            "name" : "Landkreis Saalekreis",
                            "vknr" : "86806"
                        },
                        {
                            "name" : "Sozialamt Landkreis Vechta",
                            "vknr" : "12806"
                        },
                        {
                            "name" : "Sozialamt des Kreises Saarlouis",
                            "vknr" : "73806"
                        },
                        {
                            "name" : "Hansestadt Lüneburg Sozialamt",
                            "vknr" : "11806"
                        },
                        {
                            "name" : "Sozialamt Stadt Haan",
                            "vknr" : "24806"
                        },
                        {
                            "name" : "Sozialamt Kreis Düren-Zahlst.Nideggen-",
                            "vknr" : "21806"
                        },
                        {
                            "name" : "Region Hannover -Sozialamt-",
                            "vknr" : "09806"
                        },
                        {
                            "name" : "Landkreis Limburg-Weilburg-Der KRA, SA",
                            "vknr" : "43806"
                        },
                        {
                            "name" : "Sozialamt Landkreis Hildesheim",
                            "vknr" : "10806"
                        },
                        {
                            "name" : "BZA Steglitz",
                            "vknr" : "72806"
                        },
                        {
                            "name" : "Sozialamt des Kreises Borken",
                            "vknr" : "19806"
                        },
                        {
                            "name" : "LRA Neu-Ulm Sozialhilfeverwaltung",
                            "vknr" : "70806"
                        },
                        {
                            "name" : "Sozialhilfe Regensburg-Land",
                            "vknr" : "68806"
                        }
                    ]
                },
                {
                    "serialNo" : "807",
                    "content" : [
                        {
                            "name" : "Kreisverwaltung Havelberg (SA)",
                            "vknr" : "85807"
                        },
                        {
                            "name" : "Stadt Regensburg Amt für Soziales",
                            "vknr" : "68807"
                        },
                        {
                            "name" : "Stadt Leipzig 50.1",
                            "vknr" : "96807"
                        },
                        {
                            "name" : "Kreissozialamt Enzkreis",
                            "vknr" : "54807"
                        },
                        {
                            "name" : "SHV Main-Spessart",
                            "vknr" : "67807"
                        },
                        {
                            "name" : "SHV Landratsamt Neustadt-Bad Windsheim",
                            "vknr" : "66807"
                        },
                        {
                            "name" : "Landratsamt Tübingen, Abt. Soziales",
                            "vknr" : "62807"
                        },
                        {
                            "name" : "Sozialamt Landkreis Köthen",
                            "vknr" : "87807"
                        },
                        {
                            "name" : "Stadtverwaltung Idstein-Sozialamt-",
                            "vknr" : "45807"
                        },
                        {
                            "name" : "Stadtverwaltung - Sozialamt Pirmasens",
                            "vknr" : "49807"
                        },
                        {
                            "name" : "Stadt Osnabrück-Sozialamt, Stadthaus 2",
                            "vknr" : "13807"
                        },
                        {
                            "name" : "Landkreis Heidekreis",
                            "vknr" : "15807"
                        },
                        {
                            "name" : "Sozialamt des Kreises Merzig-Wadern",
                            "vknr" : "73807"
                        },
                        {
                            "name" : "Landkreis Stade -Sozialamt-",
                            "vknr" : "14807"
                        },
                        {
                            "name" : "Sozialamt Stadt Heiligenhaus",
                            "vknr" : "24807"
                        },
                        {
                            "name" : "Amt f. Soziales u. Senioren (ASS FR)",
                            "vknr" : "57807"
                        },
                        {
                            "name" : "Sozialamt Stadt Bonn Erstattung-Hilfef.",
                            "vknr" : "27807"
                        },
                        {
                            "name" : "Kreisverwaltung Trier-Saarburg",
                            "vknr" : "50807"
                        },
                        {
                            "name" : "Sozialamt Krs.Düren-Zahlst.Langerwehe-",
                            "vknr" : "21807"
                        },
                        {
                            "name" : "Landkreis Wittmund",
                            "vknr" : "06807"
                        },
                        {
                            "name" : "Kreisjugendamt Offenburg-Außenst. Wolfa",
                            "vknr" : "59807"
                        },
                        {
                            "name" : "Sozialamt Bingen-Land",
                            "vknr" : "48807"
                        },
                        {
                            "name" : "SHV Kaufbeuren-Stadt",
                            "vknr" : "70807"
                        },
                        {
                            "name" : "Landratsamt Erding -Sozialhilfeverw.-",
                            "vknr" : "64807"
                        },
                        {
                            "name" : "Sozialamt der Stadt Bottrop",
                            "vknr" : "19807"
                        },
                        {
                            "name" : "SHV Landratsamt Coburg",
                            "vknr" : "65807"
                        },
                        {
                            "name" : "Region Hannover FB Jugend",
                            "vknr" : "09807"
                        },
                        {
                            "name" : "Sozialamt der Stadt Hagen",
                            "vknr" : "18807"
                        },
                        {
                            "name" : "Landratsamt Freudenstadt - Jugendamt",
                            "vknr" : "56807"
                        },
                        {
                            "name" : "Stadt Oberhausen Bereich 3-1/Ki,Jug.,Bi",
                            "vknr" : "31807"
                        },
                        {
                            "name" : "Sozialamt Lk Rostock",
                            "vknr" : "78807"
                        },
                        {
                            "name" : "Magistrat der Stadt Neumünster",
                            "vknr" : "01807"
                        },
                        {
                            "name" : "Kreisverwaltung Mayen-Koblenz",
                            "vknr" : "47807"
                        },
                        {
                            "name" : "SHV Passau Stadt",
                            "vknr" : "69807"
                        },
                        {
                            "name" : "Städt. Sozialamt Singen",
                            "vknr" : "58807"
                        },
                        {
                            "name" : "Kreisausschuß des Krs.Hersfeld-Rotenbg.",
                            "vknr" : "42807"
                        },
                        {
                            "name" : "BezAmt Tempelhof-Schöneberg v. Berlin",
                            "vknr" : "72807"
                        }
                    ]
                },
                {
                    "serialNo" : "808",
                    "content" : [
                        {
                            "name" : "BZA Tiergarten",
                            "vknr" : "72808"
                        },
                        {
                            "name" : "SHV Stadtjugendamt Passau",
                            "vknr" : "69808"
                        },
                        {
                            "name" : "Stadt-Jugendamt Regensburg-Amt 51.2.4Ko",
                            "vknr" : "68808"
                        },
                        {
                            "name" : "Stadtverwaltung - Sozialamt Speyer",
                            "vknr" : "49808"
                        },
                        {
                            "name" : "Städt. Sozialamt Schramberg",
                            "vknr" : "58808"
                        },
                        {
                            "name" : "SHV Miltenberg",
                            "vknr" : "67808"
                        },
                        {
                            "name" : "Sozialamt Landkreis Gifhorn",
                            "vknr" : "07808"
                        },
                        {
                            "name" : "LRA FDS-Amt f. Migration u. Flüchtlinge",
                            "vknr" : "56808"
                        },
                        {
                            "name" : "Sozialamt der Stadt Hamm",
                            "vknr" : "18808"
                        },
                        {
                            "name" : "Sozialamt Bodenheim",
                            "vknr" : "48808"
                        },
                        {
                            "name" : "Sozialamt Landkreis Rostock - Asyl",
                            "vknr" : "78808"
                        },
                        {
                            "name" : "Kreisausschuß des Kreises Nordfriesland",
                            "vknr" : "01808"
                        },
                        {
                            "name" : "Kreissozialamt Ortenau Ausstl. Achern",
                            "vknr" : "59808"
                        },
                        {
                            "name" : "Sozialamt Stadt Koblenz",
                            "vknr" : "47808"
                        },
                        {
                            "name" : "Sozialamt Stadt Hilden",
                            "vknr" : "24808"
                        },
                        {
                            "name" : "Kreisjugendamt Coburg",
                            "vknr" : "65808"
                        },
                        {
                            "name" : "Sozialamt Stadt Nürnberg",
                            "vknr" : "66808"
                        },
                        {
                            "name" : "SHV Ostallgäu",
                            "vknr" : "70808"
                        },
                        {
                            "name" : "Landschaftsver.Rheinl.ü.ö.TR.d.Sozialh.",
                            "vknr" : "27808"
                        },
                        {
                            "name" : "Landratsamt Mittelsachsen",
                            "vknr" : "94808"
                        },
                        {
                            "name" : "Stadtverwaltung Trier Asyl",
                            "vknr" : "50808"
                        },
                        {
                            "name" : "Städt. Sozialamt Heidelberg",
                            "vknr" : "53808"
                        },
                        {
                            "name" : "Landkreis Cuxhaven -Sozialamt-",
                            "vknr" : "14808"
                        },
                        {
                            "name" : "SHV Freising",
                            "vknr" : "64808"
                        },
                        {
                            "name" : "Sozialamt Krs.Düren-Zahlst.Merzenich-",
                            "vknr" : "21808"
                        },
                        {
                            "name" : "Regierungspräs. Tübingen -Asylstelle-",
                            "vknr" : "62808"
                        }
                    ]
                },
                {
                    "serialNo" : "809",
                    "content" : [
                        {
                            "name" : "Bezirksamt Mitte von Berlin",
                            "vknr" : "72809"
                        },
                        {
                            "name" : "SHV Landratsamt Passau",
                            "vknr" : "69809"
                        },
                        {
                            "name" : "Sozial- und Wohnungsamt Magdeburg",
                            "vknr" : "85809"
                        },
                        {
                            "name" : "Sozialamt Landkreis Wittenberg",
                            "vknr" : "87809"
                        },
                        {
                            "name" : "Kreissozialamt Alb-Donau-Kreis, Ulm",
                            "vknr" : "62809"
                        },
                        {
                            "name" : "Sozialamt Gau Algesheim",
                            "vknr" : "48809"
                        },
                        {
                            "name" : "Stadtjugendamt Bergisch Gladbach",
                            "vknr" : "27809"
                        },
                        {
                            "name" : "SHV Landratsamt Forchheim",
                            "vknr" : "65809"
                        },
                        {
                            "name" : "Vil.-Sch. Amt f.Fam., Jug.u.Sozi./SH+JH",
                            "vknr" : "58809"
                        },
                        {
                            "name" : "SHV Landratsamt Nürnberger Land",
                            "vknr" : "66809"
                        },
                        {
                            "name" : "Jugendamt Hanau",
                            "vknr" : "40809"
                        },
                        {
                            "name" : "SHV Kempten-Stadt",
                            "vknr" : "70809"
                        },
                        {
                            "name" : "Sozialamt der Stadt Herne",
                            "vknr" : "18809"
                        },
                        {
                            "name" : "LRA Ortenau-Migrationsamt-Asylbewerber",
                            "vknr" : "59809"
                        },
                        {
                            "name" : "Sozialamt Stadt Langenfeld",
                            "vknr" : "24809"
                        },
                        {
                            "name" : "JA Stadt Duisburg 51-12 Wirtsch. Jug.hi",
                            "vknr" : "25809"
                        },
                        {
                            "name" : "Sozialamt Kreis Düren-Arbeitsgruppen-",
                            "vknr" : "21809"
                        },
                        {
                            "name" : "Stadt-Jugendamt Regensburg-Amt 51.3",
                            "vknr" : "68809"
                        },
                        {
                            "name" : "Kreisausschuß des Kreises Ostholstein",
                            "vknr" : "01809"
                        },
                        {
                            "name" : "Stadtverwaltung - Sozialamt Zweibrücken",
                            "vknr" : "49809"
                        },
                        {
                            "name" : "Stadt Nettetal -Jugendamt-",
                            "vknr" : "28809"
                        },
                        {
                            "name" : "Städt. Sozialamt Mannheim",
                            "vknr" : "53809"
                        },
                        {
                            "name" : "SHV Schweinfurt-Stadt",
                            "vknr" : "67809"
                        },
                        {
                            "name" : "Stadtverwaltung Trier Jugendamt",
                            "vknr" : "50809"
                        },
                        {
                            "name" : "Amt für Soziales",
                            "vknr" : "64809"
                        },
                        {
                            "name" : "Hess. Ministerium f. Soz. u Integration",
                            "vknr" : "45809"
                        },
                        {
                            "name" : "Sozialamt Greifswald Stadt",
                            "vknr" : "78809"
                        }
                    ]
                },
                {
                    "serialNo" : "810",
                    "content" : [
                        {
                            "name" : "Kreisverwaltung Osterburg (SA)",
                            "vknr" : "85810"
                        },
                        {
                            "name" : "Sozialhilfe Schwandorf",
                            "vknr" : "68810"
                        },
                        {
                            "name" : "SHV Schweinfurt-Land",
                            "vknr" : "67810"
                        },
                        {
                            "name" : "Kreisverwaltung Trier-Saarburg JA",
                            "vknr" : "50810"
                        },
                        {
                            "name" : "SHV Garmisch-Partenkirchen",
                            "vknr" : "64810"
                        },
                        {
                            "name" : "SHV Landratsamt Roth",
                            "vknr" : "66810"
                        },
                        {
                            "name" : "Diakonie Himmelsthür ",
                            "vknr" : "10810"
                        },
                        {
                            "name" : "Kreisausschuß des Kreises Plön",
                            "vknr" : "01810"
                        },
                        {
                            "name" : "SHV Stadtrat Hof",
                            "vknr" : "65810"
                        },
                        {
                            "name" : "Sozialamt Guntersblum",
                            "vknr" : "48810"
                        },
                        {
                            "name" : "Sozialamt des Kreises Steinfurt",
                            "vknr" : "19810"
                        },
                        {
                            "name" : "Stadt Wuppertal (Asylbewerber)/R.204.14",
                            "vknr" : "37810"
                        },
                        {
                            "name" : "KSA Märkisch Oderland",
                            "vknr" : "81810"
                        },
                        {
                            "name" : "DDG Dt. Dienstl.-zentr. f.d. Ges.-wesen",
                            "vknr" : "38810"
                        },
                        {
                            "name" : "LAB Niedersachsen - Standort Bramsche",
                            "vknr" : "13810"
                        },
                        {
                            "name" : "Sozialamt Kreisverwaltung Düren",
                            "vknr" : "21810"
                        },
                        {
                            "name" : "Kreisverwaltung Bad Kreuznach",
                            "vknr" : "47810"
                        },
                        {
                            "name" : "KSA Potsdam-Mittelmark",
                            "vknr" : "79810"
                        },
                        {
                            "name" : "Landratsamt Saalkreis, Sozialamt",
                            "vknr" : "86810"
                        },
                        {
                            "name" : "Sozialamt Stadt Quedlinburg",
                            "vknr" : "87810"
                        },
                        {
                            "name" : "SHV Regen",
                            "vknr" : "69810"
                        },
                        {
                            "name" : "Landratsamt Oberallgäu Asyl",
                            "vknr" : "70810"
                        },
                        {
                            "name" : "Oberbergischer Kreis Kreissozialamt",
                            "vknr" : "27810"
                        },
                        {
                            "name" : "Landratsamt Nordsachsen Sozialamt",
                            "vknr" : "96810"
                        },
                        {
                            "name" : "Kreissozialamt Tuttlingen",
                            "vknr" : "58810"
                        },
                        {
                            "name" : "Sozialamt Stadt Mettmann",
                            "vknr" : "24810"
                        },
                        {
                            "name" : "Sozialamt Landkreis NWM - Asyl",
                            "vknr" : "78810"
                        },
                        {
                            "name" : "Sozialamt Landkreis Uelzen",
                            "vknr" : "11810"
                        },
                        {
                            "name" : "BezAmt Charlottenburg-Wilmersdorf v. Bl",
                            "vknr" : "72810"
                        },
                        {
                            "name" : "Kreissozialamt Wangen-Aussenstelle",
                            "vknr" : "62810"
                        }
                    ]
                },
                {
                    "serialNo" : "811",
                    "content" : [
                        {
                            "name" : "Stadt Ingolstadt -Sozialamt-",
                            "vknr" : "64811"
                        },
                        {
                            "name" : "Sozialamt Landkreis Sangerhausen",
                            "vknr" : "86811"
                        },
                        {
                            "name" : "LAB Niedersachsen - Standort Osnabrück",
                            "vknr" : "13811"
                        },
                        {
                            "name" : "KS - Kommunal Service GmbH",
                            "vknr" : "38811"
                        },
                        {
                            "name" : "Sozialamt Heidesheim",
                            "vknr" : "48811"
                        },
                        {
                            "name" : "Städt. Sozialamt Albstadt",
                            "vknr" : "62811"
                        },
                        {
                            "name" : "Landratsamt Lindau",
                            "vknr" : "70811"
                        },
                        {
                            "name" : "Stadt Würzburg Sozialamt",
                            "vknr" : "67811"
                        },
                        {
                            "name" : "SA Lk Nordwestmecklenburg, FD Soziales",
                            "vknr" : "78811"
                        },
                        {
                            "name" : "Sozialamt Rhein-Neckar-Kreis Wiesloch",
                            "vknr" : "53811"
                        },
                        {
                            "name" : "Kreisverwaltung Oschersleben (SA)",
                            "vknr" : "85811"
                        },
                        {
                            "name" : "SHV Rottal-Inn, Pfarrkirchen",
                            "vknr" : "69811"
                        },
                        {
                            "name" : "BezAmt Steglitz-Zehlendorf v. Berlin",
                            "vknr" : "72811"
                        },
                        {
                            "name" : "Jugendamt Offenbach",
                            "vknr" : "40811"
                        },
                        {
                            "name" : "Landkreis Harburg Sozialamt",
                            "vknr" : "11811"
                        },
                        {
                            "name" : "Sozialamt des Kreises Coesfeld",
                            "vknr" : "19811"
                        },
                        {
                            "name" : "Landkreis Celle (Sozialamt)",
                            "vknr" : "09811"
                        },
                        {
                            "name" : "Sozialamt Stadt Monheim",
                            "vknr" : "24811"
                        },
                        {
                            "name" : "Stadt Bedburg Asylbewerber",
                            "vknr" : "27811"
                        },
                        {
                            "name" : "Sozialamt Krs.Düren-Zahlst.Jülich-",
                            "vknr" : "21811"
                        },
                        {
                            "name" : "Landkreis Verden -Sozialamt-",
                            "vknr" : "15811"
                        },
                        {
                            "name" : "Kreisausschuß des Kreises Pinneberg",
                            "vknr" : "01811"
                        },
                        {
                            "name" : "Sozialamt Stadtbezirk Villingen",
                            "vknr" : "58811"
                        },
                        {
                            "name" : "Regionalverband Saarbrücken Jugendamt",
                            "vknr" : "73811"
                        },
                        {
                            "name" : "SHV Landkreis Hof",
                            "vknr" : "65811"
                        },
                        {
                            "name" : "SHV Stadt Schwabach",
                            "vknr" : "66811"
                        },
                        {
                            "name" : "Sozialamt Stadt Brandenburg",
                            "vknr" : "79811"
                        },
                        {
                            "name" : "Sozialhilfe Tirschenreuth",
                            "vknr" : "68811"
                        }
                    ]
                },
                {
                    "serialNo" : "812",
                    "content" : [
                        {
                            "name" : "Sozialamt Landkreis Weißenfels",
                            "vknr" : "86812"
                        },
                        {
                            "name" : "Sozialamt Stadt Ratingen",
                            "vknr" : "24812"
                        },
                        {
                            "name" : "Landratsamt Vogtlandkreis Sozialamt",
                            "vknr" : "94812"
                        },
                        {
                            "name" : "Städt. Sozialamt Eningen",
                            "vknr" : "62812"
                        },
                        {
                            "name" : "Kreisausschuß des Krs.Rendsbg.-Eckernf.",
                            "vknr" : "01812"
                        },
                        {
                            "name" : "Sozialhilfe Weiden",
                            "vknr" : "68812"
                        },
                        {
                            "name" : "Sozialamt Nieder-Olm",
                            "vknr" : "48812"
                        },
                        {
                            "name" : "SHV Würzburg-Landratsamt",
                            "vknr" : "67812"
                        },
                        {
                            "name" : "Kreissozialamt Villingen",
                            "vknr" : "58812"
                        },
                        {
                            "name" : "SHV Landsberg",
                            "vknr" : "64812"
                        },
                        {
                            "name" : "SHV Memmingen-Stadt",
                            "vknr" : "70812"
                        },
                        {
                            "name" : "LAB Niedersachsen, Standort Oldenburg",
                            "vknr" : "12812"
                        },
                        {
                            "name" : "Kreissozialamt Westerwaldkreis",
                            "vknr" : "47812"
                        },
                        {
                            "name" : "Sozialamt Landkreis Nordvorpommern",
                            "vknr" : "78812"
                        },
                        {
                            "name" : "Städt. Jugendamt Mannheim",
                            "vknr" : "53812"
                        },
                        {
                            "name" : "SHV Straubing-Stadt",
                            "vknr" : "69812"
                        },
                        {
                            "name" : "Kreisjugendamt Calw",
                            "vknr" : "54812"
                        },
                        {
                            "name" : "Altmarkkreis Salzwedel, Sozialamt",
                            "vknr" : "85812"
                        },
                        {
                            "name" : "SHV Landratsamt Kronach",
                            "vknr" : "65812"
                        },
                        {
                            "name" : "Sozialamt Kreis Düren Zahlst. Linnich",
                            "vknr" : "21812"
                        },
                        {
                            "name" : "Stadt Bergheim Asylbewerber",
                            "vknr" : "27812"
                        },
                        {
                            "name" : "SHV Landkreis Weissenburg-Gunzenhausen",
                            "vknr" : "66812"
                        },
                        {
                            "name" : "Landratsamt - Kreissozialamt Esslingen-",
                            "vknr" : "61812"
                        },
                        {
                            "name" : "SA Stadt Cottbus-Asylbewerber",
                            "vknr" : "80812"
                        },
                        {
                            "name" : "Kreisverwaltung Bad Dürkheim-Sozialamt",
                            "vknr" : "49812"
                        },
                        {
                            "name" : "Jugendamt Stadt Leipzig",
                            "vknr" : "96812"
                        },
                        {
                            "name" : "LAB Niedersachsen St. Bad Fallingbostel",
                            "vknr" : "15812"
                        },
                        {
                            "name" : "Landratsamt Anhalt-Zerbst / Sozialamt",
                            "vknr" : "87812"
                        },
                        {
                            "name" : "Sozialamt des Kreises Lippe",
                            "vknr" : "19812"
                        },
                        {
                            "name" : "BZA Charlottenburg",
                            "vknr" : "72812"
                        }
                    ]
                },
                {
                    "serialNo" : "813",
                    "content" : [
                        {
                            "name" : "LRA Altenburger Land JA",
                            "vknr" : "90813"
                        },
                        {
                            "name" : "Landkreis Stendal Sozialamt",
                            "vknr" : "85813"
                        },
                        {
                            "name" : "Sozialamt der Stadt Gelsenkirchen",
                            "vknr" : "19813"
                        },
                        {
                            "name" : "Stadt Heidelberg-Kinder- und Jugendamt",
                            "vknr" : "53813"
                        },
                        {
                            "name" : "SHV Stadtjugendamt Straubing",
                            "vknr" : "69813"
                        },
                        {
                            "name" : "Landratsamt Landkreis Leipzig Sozialamt",
                            "vknr" : "96813"
                        },
                        {
                            "name" : "Stadt Brühl Asylbewerber",
                            "vknr" : "27813"
                        },
                        {
                            "name" : "Landratsamt Weimarer Land SA",
                            "vknr" : "89813"
                        },
                        {
                            "name" : "Kreisausschuß des Krs.Schleswig-Flensb.",
                            "vknr" : "01813"
                        },
                        {
                            "name" : "Stadt Würzburg Stadtjugendamt",
                            "vknr" : "67813"
                        },
                        {
                            "name" : "Sozialamt Stadt Velbert",
                            "vknr" : "24813"
                        },
                        {
                            "name" : "Saarpfalz-Kreis - Jugendamt -",
                            "vknr" : "73813"
                        },
                        {
                            "name" : "Sozialamt Nierstein-Oppenheim",
                            "vknr" : "48813"
                        },
                        {
                            "name" : "Kreisverwaltung Germersheim - Sozialamt",
                            "vknr" : "49813"
                        },
                        {
                            "name" : "Sozialamt des Märkischen Kreis",
                            "vknr" : "18813"
                        },
                        {
                            "name" : "Sozialamt Krs.Düren Zahlst.Aldenhoven",
                            "vknr" : "21813"
                        },
                        {
                            "name" : "Kreissozialamt Waldshut",
                            "vknr" : "58813"
                        },
                        {
                            "name" : "Landratsamt Landkr. Hildburghausen - SA",
                            "vknr" : "91813"
                        },
                        {
                            "name" : "Kreisverwaltung Neuwied",
                            "vknr" : "47813"
                        },
                        {
                            "name" : "Bez.Amt Friedrichshain-Kreuzberg v. Bln",
                            "vknr" : "72813"
                        },
                        {
                            "name" : "Kreisjugendamt Neustadt a. d. Waldnaab",
                            "vknr" : "68813"
                        },
                        {
                            "name" : "Magistrat Stadt Kassel -SA/Abt. 505/KH-",
                            "vknr" : "42813"
                        },
                        {
                            "name" : "SHV Unterallgäu",
                            "vknr" : "70813"
                        },
                        {
                            "name" : "Sozialamt Stadt Thale",
                            "vknr" : "87813"
                        },
                        {
                            "name" : "Sozialamt Landkreis Güstrow",
                            "vknr" : "78813"
                        },
                        {
                            "name" : "SHV Landkreis Kulmbach",
                            "vknr" : "65813"
                        },
                        {
                            "name" : "SHV LRA Fürth, ZAE Zirndorf",
                            "vknr" : "66813"
                        },
                        {
                            "name" : "LRA Miesbach - Arbeit und Soziales",
                            "vknr" : "64813"
                        },
                        {
                            "name" : "LRA Bodenseekreis-KSA Krankenhilfe",
                            "vknr" : "62813"
                        }
                    ]
                },
                {
                    "serialNo" : "814",
                    "content" : [
                        {
                            "name" : "Amt für Soziales Stadt Ballenstedt",
                            "vknr" : "87814"
                        },
                        {
                            "name" : "Kreissozialamt Konstanz - Asyl",
                            "vknr" : "58814"
                        },
                        {
                            "name" : "Kreisausschuß des Kreises Segeberg",
                            "vknr" : "01814"
                        },
                        {
                            "name" : "Sozialamt der Stadt Naumburg",
                            "vknr" : "86814"
                        },
                        {
                            "name" : "SHV Donau-Ries",
                            "vknr" : "70814"
                        },
                        {
                            "name" : "Sozialamt Sprendlingen-Gensingen",
                            "vknr" : "48814"
                        },
                        {
                            "name" : "Städt. Sozialamt Metzingen",
                            "vknr" : "62814"
                        },
                        {
                            "name" : "Stadt Würzburg Sozialamt Asylbewerber",
                            "vknr" : "67814"
                        },
                        {
                            "name" : "Sozialamt Stadt Wülfrath",
                            "vknr" : "24814"
                        },
                        {
                            "name" : "Gemeinde Elsdorf Asylbewerber",
                            "vknr" : "27814"
                        },
                        {
                            "name" : "Kreisverwaltung Kaiserslautern - SozAmt",
                            "vknr" : "49814"
                        },
                        {
                            "name" : "SHV Mühldorf",
                            "vknr" : "64814"
                        },
                        {
                            "name" : "Sozialamt Barth Stadt",
                            "vknr" : "78814"
                        },
                        {
                            "name" : "SHV Straubing-Bogen, Straubing",
                            "vknr" : "69814"
                        },
                        {
                            "name" : "Sozialamt Kreis Düren Zahlst. Titz",
                            "vknr" : "21814"
                        },
                        {
                            "name" : "Landratsamt Cham-Amt f Jugend u Familie",
                            "vknr" : "68814"
                        },
                        {
                            "name" : "Landratsamt Schönebeck (SA)",
                            "vknr" : "85814"
                        },
                        {
                            "name" : "Gemeinde Bedburg-Hau SoHi u. Asyl",
                            "vknr" : "25814"
                        },
                        {
                            "name" : "Kreisverwaltung Neuwied Kreisjugendamt",
                            "vknr" : "47814"
                        },
                        {
                            "name" : "Bezirksamt Marzahn-Hellersdorf v.Berlin",
                            "vknr" : "72814"
                        },
                        {
                            "name" : "Landratsamt Altenburger Land - FD S u O",
                            "vknr" : "90814"
                        },
                        {
                            "name" : "SHV Landkreis Lichtenfels",
                            "vknr" : "65814"
                        },
                        {
                            "name" : "Landratsamt Ilmkreis Sozialamt",
                            "vknr" : "89814"
                        }
                    ]
                },
                {
                    "serialNo" : "815",
                    "content" : [
                        {
                            "name" : "Landratsamt Schmalkalden-Mein. FD Soz.",
                            "vknr" : "91815"
                        },
                        {
                            "name" : "Bezirksamt Lichtenberg von Berlin",
                            "vknr" : "72815"
                        },
                        {
                            "name" : "Sozialamt VG Gernrode / Harz",
                            "vknr" : "87815"
                        },
                        {
                            "name" : "SHV Neuburg-Schrobenhausen",
                            "vknr" : "64815"
                        },
                        {
                            "name" : "Kreissozialamt Karlsruhe",
                            "vknr" : "52815"
                        },
                        {
                            "name" : "Kreisverwaltung Simmern",
                            "vknr" : "47815"
                        },
                        {
                            "name" : "Sozialamt des Kreises Gütersloh",
                            "vknr" : "19815"
                        },
                        {
                            "name" : "Sozialamt Eich",
                            "vknr" : "48815"
                        },
                        {
                            "name" : "Kreisausschuß des Kreises Steinburg",
                            "vknr" : "01815"
                        },
                        {
                            "name" : "Sozialamt Stadt Göttingen",
                            "vknr" : "08815"
                        },
                        {
                            "name" : "Landkreis St. Wendel - Kreisjugendamt -",
                            "vknr" : "73815"
                        },
                        {
                            "name" : "Sozialamt Landkreis Ludwigslust",
                            "vknr" : "78815"
                        },
                        {
                            "name" : "Jobcenter u Sozial., GB II, Abt. II-031",
                            "vknr" : "40815"
                        },
                        {
                            "name" : "Landratsamt Wanzleben (SA)",
                            "vknr" : "85815"
                        },
                        {
                            "name" : "Landratsamt Saale-Holzland-Kreis - SA",
                            "vknr" : "90815"
                        },
                        {
                            "name" : "SHV Oberallgäu",
                            "vknr" : "70815"
                        },
                        {
                            "name" : "Sozialamt Stadt Merseburg",
                            "vknr" : "86815"
                        },
                        {
                            "name" : "Kreisverwaltung Donnersbergkreis - SA",
                            "vknr" : "49815"
                        },
                        {
                            "name" : "Landkreis Rotenburg/ Wümme",
                            "vknr" : "15815"
                        },
                        {
                            "name" : "SHV Dingolfing-Landau",
                            "vknr" : "69815"
                        },
                        {
                            "name" : "Kreisjugendamt Fürth",
                            "vknr" : "66815"
                        },
                        {
                            "name" : "Sozialamt des Hochsauerlandkreises",
                            "vknr" : "18815"
                        },
                        {
                            "name" : "Bezirksregierung Münster Dez. 28.3",
                            "vknr" : "38815"
                        },
                        {
                            "name" : "SHV Landkreis Wunsiedel",
                            "vknr" : "65815"
                        },
                        {
                            "name" : "Sozialamt Landkreis Hameln-Pyrmont",
                            "vknr" : "09815"
                        },
                        {
                            "name" : "Kreisjugendamt Regensburg",
                            "vknr" : "68815"
                        },
                        {
                            "name" : "Kreisjugendamt Rems-Murr-Kreis",
                            "vknr" : "61815"
                        },
                        {
                            "name" : "Jugendamt Düsseldorf",
                            "vknr" : "24815"
                        },
                        {
                            "name" : "LRA Rhön-Grabfeld, m. F.,Amt f. JFSwJuh",
                            "vknr" : "67815"
                        },
                        {
                            "name" : "Jugendamt der Stadt Aachen",
                            "vknr" : "21815"
                        },
                        {
                            "name" : "Stadt Erftstadt Asylbewerber",
                            "vknr" : "27815"
                        },
                        {
                            "name" : "Städt. Sozialamt Pfullingen",
                            "vknr" : "62815"
                        }
                    ]
                },
                {
                    "serialNo" : "816",
                    "content" : [
                        {
                            "name" : "Jugendamt Burgenlandkreis",
                            "vknr" : "86816"
                        },
                        {
                            "name" : "SHV Pfaffenhofen",
                            "vknr" : "64816"
                        },
                        {
                            "name" : "Sozialamt Landkreis Schaumburg",
                            "vknr" : "09816"
                        },
                        {
                            "name" : "Landkreis Göttingen -Sozialamt-",
                            "vknr" : "08816"
                        },
                        {
                            "name" : "Sozialamt des Kreises Herford",
                            "vknr" : "19816"
                        },
                        {
                            "name" : "Sozialamt LK Quedlinburg / VG Unterharz",
                            "vknr" : "87816"
                        },
                        {
                            "name" : "BezAmt Treptow-Köpenick v. Berlin",
                            "vknr" : "72816"
                        },
                        {
                            "name" : "SHV Stadtjugendamt Coburg",
                            "vknr" : "65816"
                        },
                        {
                            "name" : "Sozialamt Grimmen Stadt",
                            "vknr" : "78816"
                        },
                        {
                            "name" : "Städt. Sozialamt Ravensburg",
                            "vknr" : "62816"
                        },
                        {
                            "name" : "SHV Deggendorf Asylbewerber-SG52AsylBLG",
                            "vknr" : "69816"
                        },
                        {
                            "name" : "Sozialamt Landkreis Goslar",
                            "vknr" : "07816"
                        },
                        {
                            "name" : "Stadt Frechen Asylbewerber",
                            "vknr" : "27816"
                        },
                        {
                            "name" : "Landkreis Kassel, Fb Soziales-Krankenh.",
                            "vknr" : "42816"
                        },
                        {
                            "name" : "Kreisjugendamt Saarlouis ",
                            "vknr" : "73816"
                        },
                        {
                            "name" : "Kreis Stormarn Der Landrat FD GSAngel.",
                            "vknr" : "01816"
                        },
                        {
                            "name" : "SA Landratsamt Wernigerode",
                            "vknr" : "85816"
                        },
                        {
                            "name" : "Kreisjugendamt Miltenberg",
                            "vknr" : "67816"
                        },
                        {
                            "name" : "Städt.Sozialamt Gerlingen/Krs.Ludwigsb.",
                            "vknr" : "61816"
                        },
                        {
                            "name" : "Stadtjugendamt Weiden",
                            "vknr" : "68816"
                        },
                        {
                            "name" : "Sozialamt des Kreises Olpe",
                            "vknr" : "18816"
                        },
                        {
                            "name" : "Kreisverwaltung Kusel - Sozialamt",
                            "vknr" : "49816"
                        },
                        {
                            "name" : "Sozialamt Monsheim",
                            "vknr" : "48816"
                        },
                        {
                            "name" : "Jugendamt Stadt Nürnberg",
                            "vknr" : "66816"
                        },
                        {
                            "name" : "LandratsA. Aichach-Friedberg Asylstelle",
                            "vknr" : "70816"
                        },
                        {
                            "name" : "Landratsamt Greiz  SA/Asyl",
                            "vknr" : "90816"
                        }
                    ]
                },
                {
                    "serialNo" : "817",
                    "content" : [
                        {
                            "name" : "Landratsamt Greiz - Jugendamt",
                            "vknr" : "90817"
                        },
                        {
                            "name" : "LRA Wartburgkreis Versorgungsamt",
                            "vknr" : "89817"
                        },
                        {
                            "name" : "Aufnahme- und  Eingliederungsamt",
                            "vknr" : "61817"
                        },
                        {
                            "name" : "Landkreis Kassel, Fb Soziales-Krankenh.",
                            "vknr" : "42817"
                        },
                        {
                            "name" : "Städt. Sozialamt Reutlingen",
                            "vknr" : "62817"
                        },
                        {
                            "name" : "Sozialamt des Kreises Höxter",
                            "vknr" : "19817"
                        },
                        {
                            "name" : "Landkreis Teltow-Fläming Sozialamt",
                            "vknr" : "79817"
                        },
                        {
                            "name" : "Sozialamt Westhofen",
                            "vknr" : "48817"
                        },
                        {
                            "name" : "Sozialamt Marlow Stadt",
                            "vknr" : "78817"
                        },
                        {
                            "name" : "Kreisjugendamt Enzkreis",
                            "vknr" : "54817"
                        },
                        {
                            "name" : "Sozialamt LK Quedlinbg. Bode-Selke-Aue",
                            "vknr" : "87817"
                        },
                        {
                            "name" : "Sozialamt Stadt Baesweiler",
                            "vknr" : "21817"
                        },
                        {
                            "name" : "Stadt Hürth Asylbewerber",
                            "vknr" : "27817"
                        },
                        {
                            "name" : "KSA Oder-Spree",
                            "vknr" : "81817"
                        },
                        {
                            "name" : "Kreissozialamt Hochtaunus",
                            "vknr" : "40817"
                        },
                        {
                            "name" : "Kreisverwaltung Südl. Weinstr. - SA",
                            "vknr" : "49817"
                        },
                        {
                            "name" : "Kreisjugendamt Weißenburg-Gunzenhausen",
                            "vknr" : "66817"
                        },
                        {
                            "name" : "Städtisches Sozialamt Karlsruhe",
                            "vknr" : "52817"
                        },
                        {
                            "name" : "SHV für den Landkreis Rosenheim",
                            "vknr" : "64817"
                        },
                        {
                            "name" : "BZA Lichtenberg",
                            "vknr" : "72817"
                        },
                        {
                            "name" : "Ordnungsamt Burgenlandkreis (Asylb.)",
                            "vknr" : "86817"
                        },
                        {
                            "name" : "Sozialamt des Kreises Siegen",
                            "vknr" : "18817"
                        },
                        {
                            "name" : "Kreisjugendamt Kulmbach",
                            "vknr" : "65817"
                        },
                        {
                            "name" : "Landratsamt Landkreis Sonneberg",
                            "vknr" : "91817"
                        },
                        {
                            "name" : "Amt für Jugend und Familien um A",
                            "vknr" : "67817"
                        }
                    ]
                },
                {
                    "serialNo" : "818",
                    "content" : [
                        {
                            "name" : "Sozialamt Stadt Blankenburg",
                            "vknr" : "85818"
                        },
                        {
                            "name" : "SHV Starnberg",
                            "vknr" : "64818"
                        },
                        {
                            "name" : "LRA Nürnberger Land-Jugend u Familie",
                            "vknr" : "66818"
                        },
                        {
                            "name" : "Städt. Sozialamt Tübingen",
                            "vknr" : "62818"
                        },
                        {
                            "name" : "Landkreis Kassel, Fb Soziales-Krankenh.",
                            "vknr" : "42818"
                        },
                        {
                            "name" : "Sozialamt Stadt Eschweiler",
                            "vknr" : "21818"
                        },
                        {
                            "name" : "KSA Spree-Neisse-Asylbewerber",
                            "vknr" : "80818"
                        },
                        {
                            "name" : "Burgenlandkreis Sozialamt ",
                            "vknr" : "86818"
                        },
                        {
                            "name" : "SHV Landkreis Lichtenfels Sachgebiet 23",
                            "vknr" : "65818"
                        },
                        {
                            "name" : "Stadt Dinslaken Sozialamt Asylbewerber",
                            "vknr" : "25818"
                        },
                        {
                            "name" : "BZA Marzahn",
                            "vknr" : "72818"
                        },
                        {
                            "name" : "Stadt Kerpen Asylbewerber",
                            "vknr" : "27818"
                        },
                        {
                            "name" : "Grundsicherungsamt Landkreis Barnim",
                            "vknr" : "81818"
                        },
                        {
                            "name" : "SA Lk Mecklenburgische Seenplatte",
                            "vknr" : "78818"
                        },
                        {
                            "name" : "Sozialamt Wöllstein",
                            "vknr" : "48818"
                        },
                        {
                            "name" : "Rhein-Pfalz-Kreis - Sozialamt",
                            "vknr" : "49818"
                        },
                        {
                            "name" : "RP Stuttgart, LEA Wertheim",
                            "vknr" : "61818"
                        },
                        {
                            "name" : "Sozialamt des Kreises Soest",
                            "vknr" : "18818"
                        },
                        {
                            "name" : "LRA Würzburg Wirtschaftl. Jugendhilfe",
                            "vknr" : "67818"
                        }
                    ]
                },
                {
                    "serialNo" : "819",
                    "content" : [
                        {
                            "name" : "Landratsamt Gotha -Sozialamt-",
                            "vknr" : "89819"
                        },
                        {
                            "name" : "Städt. Sozialamt Ulm",
                            "vknr" : "62819"
                        },
                        {
                            "name" : "Stadt Schwabach Jugendhilfeverwaltung",
                            "vknr" : "66819"
                        },
                        {
                            "name" : "Kreissozialamt Heidenheim/Brenz",
                            "vknr" : "61819"
                        },
                        {
                            "name" : "Kreisjugendamt Hof",
                            "vknr" : "65819"
                        },
                        {
                            "name" : "Kreissozialamt Main-Taunus",
                            "vknr" : "40819"
                        },
                        {
                            "name" : "Kreisverwaltung Südwestpfalz-Sozialamt",
                            "vknr" : "49819"
                        },
                        {
                            "name" : "Sozialamt Landkreis Spree-Neisse",
                            "vknr" : "80819"
                        },
                        {
                            "name" : "Sozialamt des Ennepe-Ruhr-Kreises",
                            "vknr" : "18819"
                        },
                        {
                            "name" : "Sozialamt Wörrstadt",
                            "vknr" : "48819"
                        },
                        {
                            "name" : "SHV Traunstein",
                            "vknr" : "64819"
                        },
                        {
                            "name" : "SJA Kempten - Jugendamt",
                            "vknr" : "70819"
                        },
                        {
                            "name" : "Sozialamt Stadt Herzogenrath",
                            "vknr" : "21819"
                        },
                        {
                            "name" : "Landkreis Harz Dezernat III/Jugendamt",
                            "vknr" : "85819"
                        },
                        {
                            "name" : "Stadt Pulheim Asylbewerber",
                            "vknr" : "27819"
                        },
                        {
                            "name" : "Sozialamt Landkreis Holzminden",
                            "vknr" : "08819"
                        },
                        {
                            "name" : "Sozialamt Landkreis Helmstedt",
                            "vknr" : "07819"
                        },
                        {
                            "name" : "KSA Ostprignitz-Ruppin",
                            "vknr" : "79819"
                        },
                        {
                            "name" : "Stadtjugendamt Schweinfurt",
                            "vknr" : "67819"
                        },
                        {
                            "name" : "Sozialamt Ribnitz-Damgarten Stadt",
                            "vknr" : "78819"
                        },
                        {
                            "name" : "BZA Berlin Mitte",
                            "vknr" : "72819"
                        }
                    ]
                },
                {
                    "serialNo" : "820",
                    "content" : [
                        {
                            "name" : "Landkreis Saalkreis - Asylbewerber -",
                            "vknr" : "86820"
                        },
                        {
                            "name" : "Landratsamt Eichsfeld Sozialamt",
                            "vknr" : "89820"
                        },
                        {
                            "name" : "SHV Weilheim-Schongau",
                            "vknr" : "64820"
                        },
                        {
                            "name" : "Kreisjugendamt Deggendorf",
                            "vknr" : "69820"
                        },
                        {
                            "name" : "Landeshauptstadt Dresden JA Soz. JuDien",
                            "vknr" : "95820"
                        },
                        {
                            "name" : "Stadt Augsburg-Amt f. Kinder, Jug u Fam",
                            "vknr" : "70820"
                        },
                        {
                            "name" : "Landesaufnahmestelle für Flüchtlinge",
                            "vknr" : "52820"
                        },
                        {
                            "name" : "Bezirksamt Pankow von Berlin ",
                            "vknr" : "72820"
                        },
                        {
                            "name" : "Sozialamt Landkreis Northeim",
                            "vknr" : "08820"
                        },
                        {
                            "name" : "Sozialamt des Kreises Unna",
                            "vknr" : "18820"
                        },
                        {
                            "name" : "LRA WUG Notaufnahmeeinrichtung Asyl",
                            "vknr" : "66820"
                        },
                        {
                            "name" : "KSA Oberhavel",
                            "vknr" : "79820"
                        },
                        {
                            "name" : "Sozialamt Stadt Burscheid",
                            "vknr" : "27820"
                        },
                        {
                            "name" : "Sozialamt Stadt Monschau",
                            "vknr" : "21820"
                        },
                        {
                            "name" : "Sozialamt Landkreis Meckl.-Strelitz",
                            "vknr" : "78820"
                        },
                        {
                            "name" : "Landkreis Wunsiedel i. F. - Jugendamt",
                            "vknr" : "65820"
                        },
                        {
                            "name" : "Sozialamt des Kreises Minden/Lübbecke",
                            "vknr" : "19820"
                        },
                        {
                            "name" : "Stadt Remscheid Asylbewerber",
                            "vknr" : "37820"
                        },
                        {
                            "name" : "Städtisches Sozialamt Pforzheim",
                            "vknr" : "54820"
                        },
                        {
                            "name" : "Kreisjugendamt Bad Kissingen",
                            "vknr" : "67820"
                        },
                        {
                            "name" : "Zentrale Ausländerbehörde Brandenburg",
                            "vknr" : "81820"
                        }
                    ]
                },
                {
                    "serialNo" : "821",
                    "content" : [
                        {
                            "name" : "KSA Prignitz",
                            "vknr" : "79821"
                        },
                        {
                            "name" : "Sozialamt Stadt Frankfurt/Oder",
                            "vknr" : "81821"
                        },
                        {
                            "name" : "BZA Prenzlauer Berg",
                            "vknr" : "72821"
                        },
                        {
                            "name" : "Stadt Rosenheim - Sozialamt",
                            "vknr" : "64821"
                        },
                        {
                            "name" : "Kreisjugendamt Freyung",
                            "vknr" : "69821"
                        },
                        {
                            "name" : "LRA Heilbronn - Migration/Integration",
                            "vknr" : "61821"
                        },
                        {
                            "name" : "Durchgangswohnheim Osthofen",
                            "vknr" : "48821"
                        },
                        {
                            "name" : "Landratsamt Saalfeld-Rudolstadt - SA",
                            "vknr" : "90821"
                        },
                        {
                            "name" : "Sozialamt Gemeinde Roetgen",
                            "vknr" : "21821"
                        },
                        {
                            "name" : "SHV Augsburg-Stadt, Jugendamt",
                            "vknr" : "70821"
                        },
                        {
                            "name" : "Landratsamt Unstrut-Hainich-Kr.-FD Soz.",
                            "vknr" : "89821"
                        },
                        {
                            "name" : "Sen. f Soz, Ju, Frauen, Integr. u Sport",
                            "vknr" : "03821"
                        },
                        {
                            "name" : "Städt. Sozialamt Weingarten",
                            "vknr" : "62821"
                        },
                        {
                            "name" : "Stadtjugendamt Pforzheim",
                            "vknr" : "54821"
                        },
                        {
                            "name" : "Sozialamt Lk Ludwigslust-Parchim",
                            "vknr" : "78821"
                        },
                        {
                            "name" : "Landkreis Wunsiedel i. F. - Asyl",
                            "vknr" : "65821"
                        },
                        {
                            "name" : "Jugendamt Stadt Bochum, Stadtamt 51/47",
                            "vknr" : "18821"
                        },
                        {
                            "name" : "Kreisjugendamt Amberg-Sulzbach umF",
                            "vknr" : "68821"
                        },
                        {
                            "name" : "Landratsamt Nordsachsen Ord.amt-Asyl",
                            "vknr" : "96821"
                        },
                        {
                            "name" : "Sozialamt Stadt Bergisch Gladbach",
                            "vknr" : "27821"
                        },
                        {
                            "name" : "Amt für Kinder, Jugend u. Fam. Halle",
                            "vknr" : "86821"
                        },
                        {
                            "name" : "Stadtjugendamt Aschaffenburg",
                            "vknr" : "67821"
                        }
                    ]
                },
                {
                    "serialNo" : "822",
                    "content" : [
                        {
                            "name" : "Landratsamt  LK Zwickau - Jugendamt",
                            "vknr" : "94822"
                        },
                        {
                            "name" : "BZA Treptow",
                            "vknr" : "72822"
                        },
                        {
                            "name" : "Kreisjugendamt Kelheim",
                            "vknr" : "69822"
                        },
                        {
                            "name" : "UMA der Stadt Hagen / 55048",
                            "vknr" : "18822"
                        },
                        {
                            "name" : "Jugendamt Bitterfeld",
                            "vknr" : "86822"
                        },
                        {
                            "name" : "Stadtjugendamt Amberg",
                            "vknr" : "68822"
                        },
                        {
                            "name" : "Landratsamt Saale-Orla-Kreis FD Sozialh",
                            "vknr" : "90822"
                        },
                        {
                            "name" : "LRA Ansbach, Amt für Jugend und Familie",
                            "vknr" : "66822"
                        },
                        {
                            "name" : "Landratsamt Landkreis Nordhausen ",
                            "vknr" : "89822"
                        },
                        {
                            "name" : "Städt. Sozialamt Heilbronn",
                            "vknr" : "61822"
                        },
                        {
                            "name" : "Kreisjugendamt Aichach-Friedberg",
                            "vknr" : "70822"
                        },
                        {
                            "name" : "Kreissozialamt Offenbach",
                            "vknr" : "40822"
                        },
                        {
                            "name" : "Sozialamt der Stadt Münster",
                            "vknr" : "19822"
                        },
                        {
                            "name" : "KJA Berchtesgadener Land Jugendamt",
                            "vknr" : "64822"
                        },
                        {
                            "name" : "Sozialamt Stadt Leichlingen",
                            "vknr" : "27822"
                        },
                        {
                            "name" : "LRA Schweinfurt Asyl",
                            "vknr" : "67822"
                        },
                        {
                            "name" : "Kreisjugendamt Wangen",
                            "vknr" : "62822"
                        },
                        {
                            "name" : "Sozialamt Gemeinde Simmerath",
                            "vknr" : "21822"
                        },
                        {
                            "name" : "Sozialamt Lk Vorpommern-Greifswald",
                            "vknr" : "78822"
                        },
                        {
                            "name" : "Sozialamt Kreis Osterode",
                            "vknr" : "08822"
                        },
                        {
                            "name" : "Sozialamt der Stadt Duisburg Asyl",
                            "vknr" : "25822"
                        },
                        {
                            "name" : "Stadtverwaltung Alzey",
                            "vknr" : "48822"
                        }
                    ]
                },
                {
                    "serialNo" : "823",
                    "content" : [
                        {
                            "name" : "Stadtverwaltung -Jugendamt Frankenthal",
                            "vknr" : "49823"
                        },
                        {
                            "name" : "Landkreis Stendal Jugendamt",
                            "vknr" : "85823"
                        },
                        {
                            "name" : "Sozialamt Landkreis Weißenfels",
                            "vknr" : "86823"
                        },
                        {
                            "name" : "Kreis Siegen-Wittgenstein",
                            "vknr" : "18823"
                        },
                        {
                            "name" : "Kreisjugendamt Schweinfurt",
                            "vknr" : "67823"
                        },
                        {
                            "name" : "Sozialamt Ingelheim",
                            "vknr" : "48823"
                        },
                        {
                            "name" : "BZA Weißensee",
                            "vknr" : "72823"
                        },
                        {
                            "name" : "Landratsamt Meißen Kreisjugendamt",
                            "vknr" : "95823"
                        },
                        {
                            "name" : "Kreisjugendamt Ravensburg",
                            "vknr" : "62823"
                        },
                        {
                            "name" : "Sozialamt Stadt Wermelskirchen",
                            "vknr" : "27823"
                        },
                        {
                            "name" : "LRA Augsburg Jugendamt",
                            "vknr" : "70823"
                        },
                        {
                            "name" : "Sozialamt Stadt Stolberg",
                            "vknr" : "21823"
                        },
                        {
                            "name" : "KJA Bad Tölz-Wolfratshausen Jugendamt",
                            "vknr" : "64823"
                        },
                        {
                            "name" : "Sozialamt Gemeinde Süderholz",
                            "vknr" : "78823"
                        },
                        {
                            "name" : "Sozialamt des Kreises Paderborn",
                            "vknr" : "19823"
                        },
                        {
                            "name" : "SJA Erlangen, Wirtschaftl. Jugendhilfe",
                            "vknr" : "66823"
                        },
                        {
                            "name" : "Kreisjugendamt Landshut",
                            "vknr" : "69823"
                        },
                        {
                            "name" : "Landratsamt Landkreis Sömmerda SA",
                            "vknr" : "89823"
                        }
                    ]
                },
                {
                    "serialNo" : "824",
                    "content" : [
                        {
                            "name" : "LRA Erlangen-Höchstadt, Ki., Ju. u Fam.",
                            "vknr" : "66824"
                        },
                        {
                            "name" : "RP Tübingen, Landeserstaufnahmestelle",
                            "vknr" : "62824"
                        },
                        {
                            "name" : "Stadtverwaltung -Jugendamt Kaiserslaut.",
                            "vknr" : "49824"
                        },
                        {
                            "name" : "Landratsamt Bautzen Jugendamt",
                            "vknr" : "95824"
                        },
                        {
                            "name" : "Landratsamt Karlsruhe -Sozialamt-",
                            "vknr" : "52824"
                        },
                        {
                            "name" : "Kreisjugendamt Passau",
                            "vknr" : "69824"
                        },
                        {
                            "name" : "LRA Lichtenfels JA, SG Jugend u Familie",
                            "vknr" : "65824"
                        },
                        {
                            "name" : "Kreisverwaltung Uckermark -Sozialamt-",
                            "vknr" : "79824"
                        },
                        {
                            "name" : "Sozialamt Gemeinde Zingst",
                            "vknr" : "78824"
                        },
                        {
                            "name" : "Stadt Schweinfurt Asyl-Aufnahmeeinricht",
                            "vknr" : "67824"
                        },
                        {
                            "name" : "Landratsamt Kyffhäuserkreis SA",
                            "vknr" : "89824"
                        },
                        {
                            "name" : "Sozialamt Landkreis Peine",
                            "vknr" : "07824"
                        },
                        {
                            "name" : "Landkreis Anhalt-Bitterfeld Der Landrat",
                            "vknr" : "86824"
                        },
                        {
                            "name" : "KJA Dachau Jugendamt",
                            "vknr" : "64824"
                        },
                        {
                            "name" : "Landratsamt - Amt für Jugend u Familie",
                            "vknr" : "70824"
                        },
                        {
                            "name" : "Sozialamt Stadt Würselen",
                            "vknr" : "21824"
                        },
                        {
                            "name" : "Sozialamt des Kreises Recklinghausen",
                            "vknr" : "19824"
                        },
                        {
                            "name" : "Jugendamt Landkreis Oder-Spree",
                            "vknr" : "81824"
                        },
                        {
                            "name" : "BZA Kreuzberg",
                            "vknr" : "72824"
                        },
                        {
                            "name" : "Sozialamt Gemeindeverw.Budenheim",
                            "vknr" : "48824"
                        },
                        {
                            "name" : "Jugendamt Stadt Bergkamen",
                            "vknr" : "18824"
                        },
                        {
                            "name" : "Sozialamt Kürten",
                            "vknr" : "27824"
                        }
                    ]
                },
                {
                    "serialNo" : "825",
                    "content" : [
                        {
                            "name" : "Stadtverwaltung - Jugendamt Landau",
                            "vknr" : "49825"
                        },
                        {
                            "name" : "LRA Kyffhäuserkreis Jugendamt (UMA)",
                            "vknr" : "89825"
                        },
                        {
                            "name" : "KJA Ebersberg Jugendamt",
                            "vknr" : "64825"
                        },
                        {
                            "name" : "Jugendamt Chemnitz",
                            "vknr" : "94825"
                        },
                        {
                            "name" : "Jugendamt Stadt Wermelskirchen",
                            "vknr" : "27825"
                        },
                        {
                            "name" : "Kreisjugendamt Regen",
                            "vknr" : "69825"
                        },
                        {
                            "name" : "Landkreis Märkisch-Oderland -Jugendamt-",
                            "vknr" : "81825"
                        },
                        {
                            "name" : "LRA Zollernalbkreis, SG4.41-Asyl",
                            "vknr" : "62825"
                        },
                        {
                            "name" : "SHV Günzburg, Jugendamt",
                            "vknr" : "70825"
                        },
                        {
                            "name" : "Sozialamt Rostock Stadt",
                            "vknr" : "78825"
                        },
                        {
                            "name" : "Sozialamt Stadt Erkelenz",
                            "vknr" : "21825"
                        },
                        {
                            "name" : "Landkreis Saalekreis Jugendamt",
                            "vknr" : "86825"
                        },
                        {
                            "name" : "Jugend- u. Sportamt Worms",
                            "vknr" : "48825"
                        },
                        {
                            "name" : "Sozialamt Landkreis Elbe-Elster",
                            "vknr" : "80825"
                        },
                        {
                            "name" : "Main-Kinzig Kreis, Hilfe für Migranten",
                            "vknr" : "40825"
                        },
                        {
                            "name" : "Sozialamt Stadt Salzgitter",
                            "vknr" : "07825"
                        },
                        {
                            "name" : "Amt für Wirtschaftliche Jugendhilfe",
                            "vknr" : "18825"
                        },
                        {
                            "name" : "Bezirksamt Neukölln von Berlin",
                            "vknr" : "72825"
                        }
                    ]
                },
                {
                    "serialNo" : "826",
                    "content" : [
                        {
                            "name" : "Jugendamt Landkreis Barnim",
                            "vknr" : "81826"
                        },
                        {
                            "name" : "Kreisjugendamt Rottal/Inn,Pfarrkirchen",
                            "vknr" : "69826"
                        },
                        {
                            "name" : "KSA Elbe-Elster-Asylbewerber",
                            "vknr" : "80826"
                        },
                        {
                            "name" : "Jugendamt Main-Kinzig-Kreis",
                            "vknr" : "40826"
                        },
                        {
                            "name" : "Wirtschaftliche Jugendhilfe Stadt Unna",
                            "vknr" : "18826"
                        },
                        {
                            "name" : "Sozialamt Ahrenshagen",
                            "vknr" : "78826"
                        },
                        {
                            "name" : "Landratsamt LK Zwickau Sozialamt-Asyl",
                            "vknr" : "94826"
                        },
                        {
                            "name" : "Kreissozialamt Biedenkopf",
                            "vknr" : "41826"
                        },
                        {
                            "name" : "Sozialamt Gemeinde Odenthal",
                            "vknr" : "27826"
                        },
                        {
                            "name" : "LRA Neu-Ulm, Jugendamt",
                            "vknr" : "70826"
                        },
                        {
                            "name" : "KJA Eichstätt Jugendamt",
                            "vknr" : "64826"
                        },
                        {
                            "name" : "Stadtverw. Ludwigshafen Ber. Jugendamt ",
                            "vknr" : "49826"
                        },
                        {
                            "name" : "LRA Sigmaringen, FB Recht und Ordnung",
                            "vknr" : "62826"
                        },
                        {
                            "name" : "Stadt Leipzig 50.1",
                            "vknr" : "96826"
                        },
                        {
                            "name" : "Sozialamt Stadt Gangelt",
                            "vknr" : "21826"
                        },
                        {
                            "name" : "Grenzdurchgangslager Friedland",
                            "vknr" : "08826"
                        },
                        {
                            "name" : "KSA Havelland",
                            "vknr" : "79826"
                        },
                        {
                            "name" : "Stadtverwaltung Emmerich SoHi u. Asyl",
                            "vknr" : "25826"
                        },
                        {
                            "name" : "Stadtverwaltung Bingen",
                            "vknr" : "48826"
                        },
                        {
                            "name" : "Bezirksamt Reinickendorf v. Berlin",
                            "vknr" : "72826"
                        },
                        {
                            "name" : "Kreis-Sozialamt Künzelsau",
                            "vknr" : "61826"
                        }
                    ]
                },
                {
                    "serialNo" : "827",
                    "content" : [
                        {
                            "name" : "BZA Schöneberg",
                            "vknr" : "72827"
                        },
                        {
                            "name" : "KSA Märkisch-Oberland-Asylbewerber",
                            "vknr" : "81827"
                        },
                        {
                            "name" : "SHV Kaufbeuren-Stadt, Jugendamt",
                            "vknr" : "70827"
                        },
                        {
                            "name" : "LRA Traunstein, Amt für Ki/Jug u Fam",
                            "vknr" : "64827"
                        },
                        {
                            "name" : "Gesundheitsversorgung für Papierlose",
                            "vknr" : "09827"
                        },
                        {
                            "name" : "Jugendamt Bodenseekreis",
                            "vknr" : "62827"
                        },
                        {
                            "name" : "Landratsamt LK Leipzig Sozialamt-Asyl",
                            "vknr" : "96827"
                        },
                        {
                            "name" : "Gesundheitsversorgung für Papierlose ",
                            "vknr" : "08827"
                        },
                        {
                            "name" : "Kreisjugendamt Straubing",
                            "vknr" : "69827"
                        },
                        {
                            "name" : "Sozialamt Lk Vorpommern-Rügen FD Soz.",
                            "vknr" : "78827"
                        },
                        {
                            "name" : "Wirtschaftliche Jugendhilfe Stadt Werne",
                            "vknr" : "18827"
                        },
                        {
                            "name" : "Stadtverwaltung Geilenkirchen Sozialamt",
                            "vknr" : "21827"
                        },
                        {
                            "name" : "Stadtverwaltung - Jugendamt Neustadt/Ws",
                            "vknr" : "49827"
                        },
                        {
                            "name" : "Kreisverw. Alzey-Worms, Abteilung 5",
                            "vknr" : "48827"
                        }
                    ]
                },
                {
                    "serialNo" : "828",
                    "content" : [
                        {
                            "name" : "KSA Barnim-Asylbewerber",
                            "vknr" : "81828"
                        },
                        {
                            "name" : "Bezirksamt Spandau von Berlin",
                            "vknr" : "72828"
                        },
                        {
                            "name" : "Sozialamt Landkreis Wolfenbüttel",
                            "vknr" : "07828"
                        },
                        {
                            "name" : "Sozialamt des Kreises Warendorf",
                            "vknr" : "19828"
                        },
                        {
                            "name" : "Stadtverw. Pirmasens Amt f Jug u Sozial",
                            "vknr" : "49828"
                        },
                        {
                            "name" : "Kreisjugendamt Offenbach",
                            "vknr" : "40828"
                        },
                        {
                            "name" : "Kreisjugendamt Ostallgäu",
                            "vknr" : "70828"
                        },
                        {
                            "name" : "Sozialamt Schwerin Stadt",
                            "vknr" : "78828"
                        },
                        {
                            "name" : "Kreisjugendamt Biberach",
                            "vknr" : "62828"
                        },
                        {
                            "name" : "Sozialamt Stadt Heinsberg",
                            "vknr" : "21828"
                        },
                        {
                            "name" : "Landrat Amt f. Jugend u. Soziales SG502",
                            "vknr" : "27828"
                        },
                        {
                            "name" : "KSA Dahme-Spreewald-Asylbewerber",
                            "vknr" : "80828"
                        },
                        {
                            "name" : "Kreisjugendamt Dingolfing-Landau",
                            "vknr" : "69828"
                        },
                        {
                            "name" : "Landkreis Gießen, Fd50, Soz. u. Senior.",
                            "vknr" : "41828"
                        }
                    ]
                },
                {
                    "serialNo" : "829",
                    "content" : [
                        {
                            "name" : "KJA Märkisch-Oberland-Asylbewerber",
                            "vknr" : "81829"
                        },
                        {
                            "name" : "Sozialamt Landkreis Dahme-Spreewald",
                            "vknr" : "80829"
                        },
                        {
                            "name" : "Stadt Emsdetten FD 51-Jugendamt",
                            "vknr" : "19829"
                        },
                        {
                            "name" : "Kreisausschuss des Vogelbergkreises",
                            "vknr" : "41829"
                        },
                        {
                            "name" : "Sozialamt Altenpleen",
                            "vknr" : "78829"
                        },
                        {
                            "name" : "LRA Ludwigsburg Sozial-und Jugendamt",
                            "vknr" : "61829"
                        },
                        {
                            "name" : "KJA Fürstenfeldbruck Jugendamt",
                            "vknr" : "64829"
                        },
                        {
                            "name" : "Stadt Kempten-Amt f Integration FB 53.1",
                            "vknr" : "70829"
                        },
                        {
                            "name" : "Sozialamt Gemeinde Rösrath",
                            "vknr" : "27829"
                        },
                        {
                            "name" : "Sozialamt Stadt Hückelhoven",
                            "vknr" : "21829"
                        },
                        {
                            "name" : "Landratsamt Sigmaringen - FB Jugend",
                            "vknr" : "62829"
                        },
                        {
                            "name" : "Stadtverwaltung - Jugendamt Speyer",
                            "vknr" : "49829"
                        },
                        {
                            "name" : "Ausländeramt der Stadt Passau",
                            "vknr" : "69829"
                        },
                        {
                            "name" : "LRA Forchheim Amt f Jug., Fam. u Senior",
                            "vknr" : "65829"
                        }
                    ]
                },
                {
                    "serialNo" : "830",
                    "content" : [
                        {
                            "name" : "KJA Barnim-Asylbewerber",
                            "vknr" : "81830"
                        },
                        {
                            "name" : "Stadtverwaltung - Jugendamt Zweibrücken",
                            "vknr" : "49830"
                        },
                        {
                            "name" : "KJA Garmisch-Partenk.Kreisjugendamt",
                            "vknr" : "64830"
                        },
                        {
                            "name" : "Stadtverwaltung Geldern SoHi u. Asyl",
                            "vknr" : "25830"
                        },
                        {
                            "name" : "Sozialamt Stadt Selfkant",
                            "vknr" : "21830"
                        },
                        {
                            "name" : "LRA Sächs. Schweiz-Osterzgebirge Asyl",
                            "vknr" : "95830"
                        },
                        {
                            "name" : "SHV Oberallgäu, Jugendamt",
                            "vknr" : "70830"
                        },
                        {
                            "name" : "KRA des Wetteraukreises, Fb Ju,Fam,Soz.",
                            "vknr" : "41830"
                        },
                        {
                            "name" : "Stadt Solingen Asylbewerber",
                            "vknr" : "37830"
                        },
                        {
                            "name" : "SA Leverkusen, Stadtverwaltung",
                            "vknr" : "27830"
                        },
                        {
                            "name" : "Kreis Steinfurt Jugendamt",
                            "vknr" : "19830"
                        },
                        {
                            "name" : "LRA Zollernalbkreis - Kreisjugendamt",
                            "vknr" : "62830"
                        },
                        {
                            "name" : "Kreisausschuß  Waldeck-Frkbg. Sozialamt",
                            "vknr" : "42830"
                        },
                        {
                            "name" : "Landeseinr. Ausreisepflichtige (LEfAA)",
                            "vknr" : "48830"
                        }
                    ]
                },
                {
                    "serialNo" : "831",
                    "content" : [
                        {
                            "name" : "Thür. Lvwamt Ref. 210, EAE Gera u. Suhl",
                            "vknr" : "90831"
                        },
                        {
                            "name" : "SJA Ingolstadt Jugendamt",
                            "vknr" : "64831"
                        },
                        {
                            "name" : "SA Wuppertal (Substitutionsbehandlung)",
                            "vknr" : "37831"
                        },
                        {
                            "name" : "Landratsamt Bautzen Ordnungsamt Asyl",
                            "vknr" : "95831"
                        },
                        {
                            "name" : "Amt für Kinder, Jugendliche u. Familien",
                            "vknr" : "19831"
                        },
                        {
                            "name" : "Jugendamt Reutlingen",
                            "vknr" : "62831"
                        },
                        {
                            "name" : "Landeseinr. Asylbegehrende (LEfAA)",
                            "vknr" : "48831"
                        },
                        {
                            "name" : "SHV Lindau, Jugendamt",
                            "vknr" : "70831"
                        },
                        {
                            "name" : "Sozialamt Stadt Übach-Palenberg",
                            "vknr" : "21831"
                        },
                        {
                            "name" : "SA Leverkusen Fachber. Kinder u. Jugend",
                            "vknr" : "27831"
                        },
                        {
                            "name" : "Sozialamt Stralsund Stadt",
                            "vknr" : "78831"
                        },
                        {
                            "name" : "Stadtjugendamt Magdeburg (SJA)",
                            "vknr" : "85831"
                        },
                        {
                            "name" : "SA Stadt Frankfurt/Oder-Asylbewerber",
                            "vknr" : "81831"
                        }
                    ]
                },
                {
                    "serialNo" : "832",
                    "content" : [
                        {
                            "name" : "SHV Memmingen-Stadt, Jugendamt",
                            "vknr" : "70832"
                        },
                        {
                            "name" : "JA Eisenhüttenstadt-Asylbewerber",
                            "vknr" : "81832"
                        },
                        {
                            "name" : "Jugendamt Stadt Brandenburg ",
                            "vknr" : "79832"
                        },
                        {
                            "name" : "Landratsamt Görlitz Ordnungsamt Asyl",
                            "vknr" : "95832"
                        },
                        {
                            "name" : "KJA Landsberg Jugendamt",
                            "vknr" : "64832"
                        },
                        {
                            "name" : "AS Wuppertal (Substitutionsbehandlung)",
                            "vknr" : "37832"
                        },
                        {
                            "name" : "SA Leverkusen Asylbewerber, Stadtverw.",
                            "vknr" : "27832"
                        },
                        {
                            "name" : "Stadtverwaltung Geldern Jugendamt",
                            "vknr" : "25832"
                        },
                        {
                            "name" : "KSA Oberspreewald-Lausitz-Asylbewerber",
                            "vknr" : "80832"
                        },
                        {
                            "name" : "Sozialamt Barth Land",
                            "vknr" : "78832"
                        },
                        {
                            "name" : "Sozialamt Stadt Waldfeucht",
                            "vknr" : "21832"
                        },
                        {
                            "name" : "Kreisausschuss Lahn-Dill-Kreis",
                            "vknr" : "41832"
                        },
                        {
                            "name" : "Landeseinr. Asylbegehrende (LEfAA)",
                            "vknr" : "48832"
                        },
                        {
                            "name" : "Kreissozialamt Reutlingen",
                            "vknr" : "62832"
                        }
                    ]
                },
                {
                    "serialNo" : "833",
                    "content" : [
                        {
                            "name" : "KSA Potsdam-Mittelmark-Asylbewerber",
                            "vknr" : "79833"
                        },
                        {
                            "name" : "LRA Miesbach FB Jugend und Familie",
                            "vknr" : "64833"
                        },
                        {
                            "name" : "Sozialamt Stadt Wassenberg",
                            "vknr" : "21833"
                        },
                        {
                            "name" : "Sozialamt Landkr. Oberspreewald-Lausitz",
                            "vknr" : "80833"
                        },
                        {
                            "name" : "Sozialamt Darß/Fischland",
                            "vknr" : "78833"
                        },
                        {
                            "name" : "Kreisverwaltung Bad Dürkheim-Jugendamt",
                            "vknr" : "49833"
                        },
                        {
                            "name" : "Landratsamt Unterallgäu-Kreisjugendamt",
                            "vknr" : "70833"
                        },
                        {
                            "name" : "Sozialamt Stadt Wolfsburg (WS)",
                            "vknr" : "07833"
                        },
                        {
                            "name" : "Landratsamt Meißen Asyl",
                            "vknr" : "95833"
                        },
                        {
                            "name" : "Stadt Wesseling Asylbewerber",
                            "vknr" : "27833"
                        }
                    ]
                },
                {
                    "serialNo" : "834",
                    "content" : [
                        {
                            "name" : "SA Stadt Brandenburg-Asylbewerber",
                            "vknr" : "79834"
                        },
                        {
                            "name" : "KJA Mühldorf Jugendamt",
                            "vknr" : "64834"
                        },
                        {
                            "name" : "Rheinisch-Bergischer-Kreis -Jugendamt-",
                            "vknr" : "27834"
                        },
                        {
                            "name" : "Sozialamt Chemnitz",
                            "vknr" : "94834"
                        },
                        {
                            "name" : "Kreisverwaltung Germersheim-Jugendamt",
                            "vknr" : "49834"
                        },
                        {
                            "name" : "Landratsamt Donau-Ries, AsylBLG-EAE",
                            "vknr" : "70834"
                        },
                        {
                            "name" : "Sozialamt Franzburg/Richtenberg",
                            "vknr" : "78834"
                        },
                        {
                            "name" : "Sozialamt Stadt Wegberg",
                            "vknr" : "21834"
                        },
                        {
                            "name" : "Stadtverwaltung Goch SoHi u. Asyl",
                            "vknr" : "25834"
                        }
                    ]
                },
                {
                    "serialNo" : "835",
                    "content" : [
                        {
                            "name" : "Landratsant Kamenz - Ausländerbehörde",
                            "vknr" : "95835"
                        },
                        {
                            "name" : "KJA Neuburg-Schrobenhausen Jugendamt",
                            "vknr" : "64835"
                        },
                        {
                            "name" : "KSA Teltow-Fläming-Asylbewerber",
                            "vknr" : "79835"
                        },
                        {
                            "name" : "SHT Rhein-Sieg-Kreis",
                            "vknr" : "27835"
                        },
                        {
                            "name" : "Kreisverwaltung Kaiserslautern-JugAmt",
                            "vknr" : "49835"
                        }
                    ]
                },
                {
                    "serialNo" : "836",
                    "content" : [
                        {
                            "name" : "Landratsamt Mittelsachsen Jugendamt",
                            "vknr" : "94836"
                        },
                        {
                            "name" : "Kreisverwaltung Donnersbergkreis-JugAmt",
                            "vknr" : "49836"
                        },
                        {
                            "name" : "Stadt Köln SA-Substitutionbeh.",
                            "vknr" : "27836"
                        },
                        {
                            "name" : "Jugendamt des Vogelsbergkreises",
                            "vknr" : "41836"
                        },
                        {
                            "name" : "Sozialamt Landkreis Müritz",
                            "vknr" : "78836"
                        },
                        {
                            "name" : "SA Stadt Hoyerswerda-Ausländerbehörde",
                            "vknr" : "95836"
                        },
                        {
                            "name" : "KJA Pfaffenhofen Jugendamt",
                            "vknr" : "64836"
                        },
                        {
                            "name" : "Landeshauptstadt Kiel Jugendamt 54.1.3",
                            "vknr" : "01836"
                        },
                        {
                            "name" : "KSA Ostprignitz-Ruppin-Asylbewerber",
                            "vknr" : "79836"
                        }
                    ]
                },
                {
                    "serialNo" : "837",
                    "content" : [
                        {
                            "name" : "KSA Oberhavel-Asylbewerber",
                            "vknr" : "79837"
                        },
                        {
                            "name" : "KJA Rosenheim-Land Kreisjugendamt",
                            "vknr" : "64837"
                        },
                        {
                            "name" : "Kreisverwaltung Kusel - Jugendamt",
                            "vknr" : "49837"
                        },
                        {
                            "name" : "Sozialamt Wismar Stadt",
                            "vknr" : "78837"
                        },
                        {
                            "name" : "Landratsamt Mittelsachsen Asyl",
                            "vknr" : "94837"
                        },
                        {
                            "name" : "Stadt Köln AS-Substitutionbeh.",
                            "vknr" : "27837"
                        },
                        {
                            "name" : "Landeswohlfahrtsverband Hessen, Kassel",
                            "vknr" : "42837"
                        }
                    ]
                },
                {
                    "serialNo" : "838",
                    "content" : [
                        {
                            "name" : "Kreisverwaltung Südl. Weinstr.-JugAmt",
                            "vknr" : "49838"
                        },
                        {
                            "name" : "Landessozialamt Hessen-Erziehungshilfe",
                            "vknr" : "42838"
                        },
                        {
                            "name" : "Kreis-Sozialamt Schwäbisch-Hall",
                            "vknr" : "61838"
                        },
                        {
                            "name" : "Sozialamt Miltzow",
                            "vknr" : "78838"
                        },
                        {
                            "name" : "LASV Dezernat 44 / Maßregelvollzug",
                            "vknr" : "80838"
                        },
                        {
                            "name" : "SA Bergheim (Substitutionsbehandlung)",
                            "vknr" : "27838"
                        },
                        {
                            "name" : "KSA Prignitz-Asylbewerber",
                            "vknr" : "79838"
                        },
                        {
                            "name" : "KJA Starnberg Kreisjugendamt",
                            "vknr" : "64838"
                        }
                    ]
                },
                {
                    "serialNo" : "839",
                    "content" : [
                        {
                            "name" : "Rhein-Pfalz-Kreis - Jugendamt",
                            "vknr" : "49839"
                        },
                        {
                            "name" : "KJA Spree-Neiße-Asylbewerber",
                            "vknr" : "80839"
                        },
                        {
                            "name" : "KSA Uckermark-Asylbewerber",
                            "vknr" : "79839"
                        },
                        {
                            "name" : "Sozialamt Niepars",
                            "vknr" : "78839"
                        },
                        {
                            "name" : "Jugendamt der Stadt Flensburg",
                            "vknr" : "01839"
                        },
                        {
                            "name" : "Stadt Bad Münstereifel Asylbewerber",
                            "vknr" : "27839"
                        }
                    ]
                },
                {
                    "serialNo" : "840",
                    "content" : [
                        {
                            "name" : "Landeswohlfahrtsverband Hessen",
                            "vknr" : "39840"
                        },
                        {
                            "name" : "KSA Havelland-Asylbewerber",
                            "vknr" : "79840"
                        },
                        {
                            "name" : "Gemeinde Blankenheim Asylbewerber",
                            "vknr" : "27840"
                        },
                        {
                            "name" : "Amt für Migration u. Fl. M-V",
                            "vknr" : "78840"
                        },
                        {
                            "name" : "Magistrat der Stadt Fulda-Jugendamt",
                            "vknr" : "42840"
                        },
                        {
                            "name" : "Amt für Jugend u Familie SG 21/FB 2111",
                            "vknr" : "64840"
                        },
                        {
                            "name" : "Amt der Gemeinde Selent / Schlesen",
                            "vknr" : "01840"
                        },
                        {
                            "name" : "Kreisverwaltung Südwestpfalz-Jugendamt",
                            "vknr" : "49840"
                        },
                        {
                            "name" : "Sozialamt Stadt Hamminkeln Asyl",
                            "vknr" : "25840"
                        },
                        {
                            "name" : "Landesamt f.Jugend, Soziales u.Versorg.",
                            "vknr" : "73840"
                        },
                        {
                            "name" : "Jugendamt Landkreis Spree-Neiße",
                            "vknr" : "80840"
                        },
                        {
                            "name" : "Städt. Sozialamt Stuttgart",
                            "vknr" : "61840"
                        }
                    ]
                },
                {
                    "serialNo" : "841",
                    "content" : [
                        {
                            "name" : "Jugendamt Landkreis Dahme-Spreewald",
                            "vknr" : "80841"
                        },
                        {
                            "name" : "Landesamt f. Ausländerangelegenheiten",
                            "vknr" : "01841"
                        },
                        {
                            "name" : "Gemeinde Dahlem Asylbewerber",
                            "vknr" : "27841"
                        },
                        {
                            "name" : "JA Stadt Brandenburg-Asylbewerber",
                            "vknr" : "79841"
                        },
                        {
                            "name" : "Stadtjugendamt Rosenheim",
                            "vknr" : "64841"
                        }
                    ]
                },
                {
                    "serialNo" : "842",
                    "content" : [
                        {
                            "name" : "KJA Dahme-Spreewald-Asylbewerber",
                            "vknr" : "80842"
                        },
                        {
                            "name" : "Kreis-Sozialamt Tauberbischofsheim",
                            "vknr" : "61842"
                        },
                        {
                            "name" : "Sozialamt Recknitz-Trebeltal",
                            "vknr" : "78842"
                        },
                        {
                            "name" : "Gemeinde Hünxe Sozialamt Asylbewerber",
                            "vknr" : "25842"
                        },
                        {
                            "name" : "KJA Altötting Jugendamt",
                            "vknr" : "64842"
                        },
                        {
                            "name" : "Ärztlicher Dienst für Asylbewerber",
                            "vknr" : "01842"
                        },
                        {
                            "name" : "Kreisverwaltung Euskirchen Asylbewerber",
                            "vknr" : "27842"
                        }
                    ]
                },
                {
                    "serialNo" : "843",
                    "content" : [
                        {
                            "name" : "RP Stuttgart,Ref.15,Aufnahmeeinrichtg. ",
                            "vknr" : "61843"
                        },
                        {
                            "name" : "SA Lk Mecklenburgische Seenplatte-Asyl",
                            "vknr" : "78843"
                        },
                        {
                            "name" : "LAB Niedersachsen Standort Braunschweig",
                            "vknr" : "07843"
                        },
                        {
                            "name" : "Gemeinde Hellenthal Asylbewerber",
                            "vknr" : "27843"
                        },
                        {
                            "name" : "Landkreis Fulda, KRA, Fd5100-Soz.h. Zuw",
                            "vknr" : "42843"
                        },
                        {
                            "name" : "Ärztlicher Dienst für Asylbewerber",
                            "vknr" : "01843"
                        }
                    ]
                },
                {
                    "serialNo" : "844",
                    "content" : [
                        {
                            "name" : "Asylstelle LRA Rems-Murr-Kreis",
                            "vknr" : "61844"
                        },
                        {
                            "name" : "Gemeinde Kall Asylbewerber",
                            "vknr" : "27844"
                        },
                        {
                            "name" : "LAB Niedersachsen, Standort Ehra-Lessin",
                            "vknr" : "07844"
                        },
                        {
                            "name" : "SA Lk Ludwigslust-Parchim - Asyl",
                            "vknr" : "78844"
                        }
                    ]
                },
                {
                    "serialNo" : "845",
                    "content" : [
                        {
                            "name" : "Sozialamt Stadt Norderstedt",
                            "vknr" : "01845"
                        },
                        {
                            "name" : "Landesaufnahmestelle Saarland",
                            "vknr" : "73845"
                        },
                        {
                            "name" : "Stadt Mechernich Asylbewerber",
                            "vknr" : "27845"
                        },
                        {
                            "name" : "SA Lk Vorpommern-Greifswald - Asyl",
                            "vknr" : "78845"
                        }
                    ]
                },
                {
                    "serialNo" : "846",
                    "content" : [
                        {
                            "name" : "LRA Vogtlandkreis O.Amt SG Asylb.leist.",
                            "vknr" : "94846"
                        },
                        {
                            "name" : "Reg.präsidium Stuttgart, LEA Ellwangen",
                            "vknr" : "61846"
                        },
                        {
                            "name" : "Sozialamt Rostock-Stadt - Asyl",
                            "vknr" : "78846"
                        },
                        {
                            "name" : "Landkreis Fulda - Fachdienst 5100 -",
                            "vknr" : "42846"
                        },
                        {
                            "name" : "Gemeinde Nettersheim Asylbewerber",
                            "vknr" : "27846"
                        },
                        {
                            "name" : "Gemeindeverwaltung Issum SoHi u. Asyl",
                            "vknr" : "25846"
                        },
                        {
                            "name" : "Kreis Ostholstein - Wirtsch. Jugendhil.",
                            "vknr" : "01846"
                        }
                    ]
                },
                {
                    "serialNo" : "847",
                    "content" : [
                        {
                            "name" : "SA Lk Vorpommern-Rügen - Asyl",
                            "vknr" : "78847"
                        },
                        {
                            "name" : "St. Neumünster Wirtschaftl. Jugendhilfe",
                            "vknr" : "01847"
                        },
                        {
                            "name" : "Stadt Schleiden Asylbewerber",
                            "vknr" : "27847"
                        }
                    ]
                },
                {
                    "serialNo" : "848",
                    "content" : [
                        {
                            "name" : "medbo Bezirksklinikum",
                            "vknr" : "68848"
                        },
                        {
                            "name" : "Sozialamt Schwerin-Stadt - Asyl",
                            "vknr" : "78848"
                        },
                        {
                            "name" : "SHV Augsburg-Land, Bes. soz. Angel.",
                            "vknr" : "70848"
                        },
                        {
                            "name" : "Kreis Plön, Amt f. Jugend u. Sport",
                            "vknr" : "01848"
                        },
                        {
                            "name" : "Gemeinde Weilerswist Asylbewerber",
                            "vknr" : "27848"
                        }
                    ]
                },
                {
                    "serialNo" : "849",
                    "content" : [
                        {
                            "name" : "SHV Bezirk Niederbayern, Landshut",
                            "vknr" : "69849"
                        },
                        {
                            "name" : "SHV Bezirk Oberbayern",
                            "vknr" : "64849"
                        },
                        {
                            "name" : "SHV Bezirk Schwaben",
                            "vknr" : "70849"
                        },
                        {
                            "name" : "Kreis Schleswig-Flensburg, FD Jug./Fam.",
                            "vknr" : "01849"
                        },
                        {
                            "name" : "Stadt Zülpich Asylbewerber",
                            "vknr" : "27849"
                        },
                        {
                            "name" : "Bezirk Mittelfranken Sozialreferat",
                            "vknr" : "66849"
                        },
                        {
                            "name" : "LA für Gesundheit und Soziales M-V",
                            "vknr" : "78849"
                        },
                        {
                            "name" : "Landeswohlfahrtsverband Sachsen",
                            "vknr" : "96849"
                        },
                        {
                            "name" : "ADD Aufnahmeeinrichtung Asylbegehrende",
                            "vknr" : "47849"
                        },
                        {
                            "name" : "SHV Bezirk Unterfranken",
                            "vknr" : "67849"
                        },
                        {
                            "name" : "SHV Bezirk Oberfranken",
                            "vknr" : "65849"
                        },
                        {
                            "name" : "Bezirk Oberpfalz Sozialverwaltung",
                            "vknr" : "68849"
                        }
                    ]
                },
                {
                    "serialNo" : "850",
                    "content" : [
                        {
                            "name" : "Postbeamtenkrankenkasse Stuttgart (MA)",
                            "vknr" : "61850"
                        }
                    ]
                },
                {
                    "serialNo" : "851",
                    "content" : [
                        {
                            "name" : "Unfallkasse Post, Telekom Freiburg (DU)",
                            "vknr" : "57851"
                        },
                        {
                            "name" : "Unfallkasse Post, Telekom Hannover (DU)",
                            "vknr" : "09851"
                        },
                        {
                            "name" : "Unfallkasse Post, Telekom Berlin (DU)",
                            "vknr" : "72851"
                        }
                    ]
                },
                {
                    "serialNo" : "854",
                    "content" : [
                        {
                            "name" : "Freie HB, Senator f. Gesundheit,Ref. 45",
                            "vknr" : "03854"
                        },
                        {
                            "name" : "Landesdirektion Sachsen",
                            "vknr" : "98854"
                        },
                        {
                            "name" : "Bayerisches Landesamt für Arbeitsschutz",
                            "vknr" : "71854"
                        },
                        {
                            "name" : "RP Darmstadt Abt. Arbeitsschutz u Umw.",
                            "vknr" : "40854"
                        },
                        {
                            "name" : "Staatliche Arbeitsschutzbehörde-UK Nord",
                            "vknr" : "01854"
                        }
                    ]
                },
                {
                    "serialNo" : "855",
                    "content" : [
                        {
                            "name" : "Entschädigungsbehörde Berlin",
                            "vknr" : "72855"
                        }
                    ]
                },
                {
                    "serialNo" : "860",
                    "content" : [
                        {
                            "name" : "Bundespolizei Zentr. Abr. Heilfürsorge",
                            "vknr" : "27860"
                        },
                        {
                            "name" : "Grenzschutzpräsidium Nord",
                            "vknr" : "01860"
                        },
                        {
                            "name" : "Grenzschutzpräsidium Ost",
                            "vknr" : "72860"
                        },
                        {
                            "name" : "Grenzschutzpräsidium Süd, Ärztl. Dienst",
                            "vknr" : "63860"
                        },
                        {
                            "name" : "Bundesamt für den Zivildienst (T.-U.)",
                            "vknr" : "24860"
                        },
                        {
                            "name" : "Grenzschutzpräsidium Mitte Ärztl.Dienst",
                            "vknr" : "42860"
                        }
                    ]
                },
                {
                    "serialNo" : "861",
                    "content" : [
                        {
                            "name" : "Bundesgrenzschutz-Bewerber",
                            "vknr" : "72861"
                        }
                    ]
                },
                {
                    "serialNo" : "868",
                    "content" : [
                        {
                            "name" : "BA für PM der Bundeswehr, Ref. I 2.3.5",
                            "vknr" : "79868"
                        },
                        {
                            "name" : "Wehrbereichsverwaltung - West",
                            "vknr" : "24868"
                        }
                    ]
                },
                {
                    "serialNo" : "869",
                    "content" : [
                        {
                            "name" : "BA für PM der Bundeswehr, Ref. I 2.3.5",
                            "vknr" : "79869"
                        },
                        {
                            "name" : "Wehrbereichsverwaltung-West (Musterung)",
                            "vknr" : "24869"
                        },
                        {
                            "name" : "Wehrbereichsverwaltung I (Musterung) MP",
                            "vknr" : "78869"
                        }
                    ]
                },
                {
                    "serialNo" : "870",
                    "content" : [
                        {
                            "name" : "PolizeiVwAmt Ref. Heilfürsorge/Sonderv",
                            "vknr" : "95870"
                        },
                        {
                            "name" : "Bayer.Bereitschaftspolizei II.Polizeiab",
                            "vknr" : "64870"
                        },
                        {
                            "name" : "Bayer.Bereitschaftspolizei, Würzburg",
                            "vknr" : "67870"
                        },
                        {
                            "name" : "Zentrale Polizeitechnische Dienste NRW",
                            "vknr" : "24870"
                        },
                        {
                            "name" : "Bayer.Bereitschaftspolizei,5.Polizeiabt",
                            "vknr" : "70870"
                        },
                        {
                            "name" : "Polizeiverwaltungsamt Heilfst. Leipzig",
                            "vknr" : "96870"
                        },
                        {
                            "name" : "Polizei Bremen (DU)",
                            "vknr" : "03870"
                        },
                        {
                            "name" : "Bayer.Bereitschaftspolizei ärztl. Dien.",
                            "vknr" : "63870"
                        },
                        {
                            "name" : "Ministerium für Inneres S-H",
                            "vknr" : "01870"
                        },
                        {
                            "name" : "Hess. Bereitschaftspolizei, Wiesbade",
                            "vknr" : "45870"
                        },
                        {
                            "name" : "Niedersächsisches Landesamt (NLBV)",
                            "vknr" : "09870"
                        },
                        {
                            "name" : "Landespolizeiverwaltung - Heilfürsorge",
                            "vknr" : "02870"
                        },
                        {
                            "name" : "Landesbereitschaftspolizei Sachsen-Anh.",
                            "vknr" : "86870"
                        },
                        {
                            "name" : "Polizeiarzt 4.Pol.Abt.Bay.Bereitschafts",
                            "vknr" : "66870"
                        },
                        {
                            "name" : "VII. Bereitschaftspolizeiabteilung",
                            "vknr" : "68870"
                        },
                        {
                            "name" : "Polizeiverwaltungsamt Heilfst. Chemnitz",
                            "vknr" : "94870"
                        },
                        {
                            "name" : "Heilfürsorge der Polizei",
                            "vknr" : "78870"
                        },
                        {
                            "name" : "Feuerwehr der Stadt Osnabrück ",
                            "vknr" : "13870"
                        },
                        {
                            "name" : "Polizeiärztlicher Dienst",
                            "vknr" : "89870"
                        },
                        {
                            "name" : "ZDPol des Landes Brandenburg/Heilfürs.",
                            "vknr" : "79870"
                        }
                    ]
                },
                {
                    "serialNo" : "871",
                    "content" : [
                        {
                            "name" : "Justizvollzugsanstalt Goldlauter",
                            "vknr" : "91871"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Gera",
                            "vknr" : "90871"
                        },
                        {
                            "name" : "Landesbereitschaftspolizei Sachsen-Anha",
                            "vknr" : "86871"
                        },
                        {
                            "name" : "Polizei Bremen",
                            "vknr" : "03871"
                        },
                        {
                            "name" : "Justizbeh. Strafvollz.Abt.Gesundheitsw.",
                            "vknr" : "02871"
                        },
                        {
                            "name" : "Landesbereitschaftspolizei Sachsen-Anha",
                            "vknr" : "85871"
                        },
                        {
                            "name" : "Bayer.Bereitschaftspolizei I.Pol.Abt.",
                            "vknr" : "63871"
                        },
                        {
                            "name" : "Landesbereitschaftspolizei Sachsen-Anha",
                            "vknr" : "87871"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Chemnitz",
                            "vknr" : "94871"
                        },
                        {
                            "name" : "Feuerwehr Schwerin",
                            "vknr" : "78871"
                        },
                        {
                            "name" : "Ministerium für Inneres S-H",
                            "vknr" : "01871"
                        },
                        {
                            "name" : "Bereitschaftspolizei Rheinland-Pfalz",
                            "vknr" : "48871"
                        },
                        {
                            "name" : "Bayer.Bereitschaftspolizei VI.Polizeiab",
                            "vknr" : "64871"
                        },
                        {
                            "name" : "VII. Bereitschaftspolizeiabt.Med.Dienst",
                            "vknr" : "68871"
                        }
                    ]
                },
                {
                    "serialNo" : "872",
                    "content" : [
                        {
                            "name" : "JVA Untermaßfeld - Wirtschaftverwaltung",
                            "vknr" : "91872"
                        },
                        {
                            "name" : "Jugendstrafanstalt Arnstadt",
                            "vknr" : "89872"
                        },
                        {
                            "name" : "Freie Heilfürsorge Brhv. Polizei",
                            "vknr" : "03872"
                        },
                        {
                            "name" : "Hansestadt Rostock Beihilfestelle",
                            "vknr" : "78872"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Hohenleuben",
                            "vknr" : "90872"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Leipzig",
                            "vknr" : "96872"
                        },
                        {
                            "name" : "Heilfürsorge Polizei Berlin",
                            "vknr" : "72872"
                        },
                        {
                            "name" : "Komm. Versorg.Verband Sachsen (Feuerw.)",
                            "vknr" : "95872"
                        }
                    ]
                },
                {
                    "serialNo" : "873",
                    "content" : [
                        {
                            "name" : "Polizei Berlin Ärztl.Dienst/Dienstunf.",
                            "vknr" : "72873"
                        },
                        {
                            "name" : "Feuerwehr Wismar",
                            "vknr" : "78873"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Tonna",
                            "vknr" : "89873"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Torgau",
                            "vknr" : "96873"
                        },
                        {
                            "name" : "Landeskriminalamt München",
                            "vknr" : "63873"
                        }
                    ]
                },
                {
                    "serialNo" : "874",
                    "content" : [
                        {
                            "name" : "Bayer. Bereitschaftspolizei bes. Eins.",
                            "vknr" : "63874"
                        },
                        {
                            "name" : "Thüringer Jugendarrestanstalt Arnstadt",
                            "vknr" : "89874"
                        },
                        {
                            "name" : "Stadt Esslingen Besoldungs-/Personalamt",
                            "vknr" : "61874"
                        },
                        {
                            "name" : "Stadtverwaltung Neubrandenburg Pers.amt",
                            "vknr" : "78874"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Waldheim",
                            "vknr" : "96874"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Zwickau",
                            "vknr" : "94874"
                        },
                        {
                            "name" : "Feuerwehr Salzgitter (Heilfürsorge)",
                            "vknr" : "07874"
                        }
                    ]
                },
                {
                    "serialNo" : "875",
                    "content" : [
                        {
                            "name" : "Justizvollzugsanstalt Dresden",
                            "vknr" : "95875"
                        },
                        {
                            "name" : "Freie Heilfürsorge Brhv. Feuerwehr",
                            "vknr" : "03875"
                        },
                        {
                            "name" : "Feuerwehr Hansestadt Lübeck",
                            "vknr" : "01875"
                        },
                        {
                            "name" : "Feuerwehr Greifswald - Personalamt",
                            "vknr" : "78875"
                        },
                        {
                            "name" : "Hess. Bereitschaftspolizei Kassel V.Abt",
                            "vknr" : "42875"
                        },
                        {
                            "name" : "Bereitschaftspolizei Mühlheim/Main",
                            "vknr" : "40875"
                        },
                        {
                            "name" : "Justizvollzugskrankenhaus Leipzig",
                            "vknr" : "96875"
                        },
                        {
                            "name" : "Hessische Bereitschaftspolizei II HBPA",
                            "vknr" : "41875"
                        },
                        {
                            "name" : "Stadt Hildesheim Berufsfeuerwehr",
                            "vknr" : "10875"
                        },
                        {
                            "name" : "Stadt Ulm Personalamt",
                            "vknr" : "62875"
                        }
                    ]
                },
                {
                    "serialNo" : "876",
                    "content" : [
                        {
                            "name" : "Justizvollzugsanstalt Bautzen",
                            "vknr" : "95876"
                        },
                        {
                            "name" : "Jugendstrafvollzugsanstalt Regis-Breit.",
                            "vknr" : "96876"
                        },
                        {
                            "name" : "Feuerwehr Stadt Flensburg",
                            "vknr" : "01876"
                        },
                        {
                            "name" : "Feuerwehr Stralsund",
                            "vknr" : "78876"
                        },
                        {
                            "name" : "Heilfürsorge BWL",
                            "vknr" : "61876"
                        }
                    ]
                },
                {
                    "serialNo" : "877",
                    "content" : [
                        {
                            "name" : "Justizvollzugsanstalt Görlitz",
                            "vknr" : "95877"
                        },
                        {
                            "name" : "Justizvollzugsanst.Neuburg-Herrenwörth",
                            "vknr" : "64877"
                        },
                        {
                            "name" : "Feuerwehr Stadt Kiel",
                            "vknr" : "01877"
                        },
                        {
                            "name" : "Krankenunterstk.der Berufsf.Hannover",
                            "vknr" : "09877"
                        }
                    ]
                },
                {
                    "serialNo" : "878",
                    "content" : [
                        {
                            "name" : "Stadt Cuxhaven (Feuerwehr)",
                            "vknr" : "14878"
                        },
                        {
                            "name" : "Berufsfeuerwehr der Stadt Göttingen",
                            "vknr" : "08878"
                        },
                        {
                            "name" : "Stadt Wolfsburg Heilfürsorgestelle 10/1",
                            "vknr" : "07878"
                        },
                        {
                            "name" : "Feuerwehr Stadt Neumünster",
                            "vknr" : "01878"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Zeithain",
                            "vknr" : "95878"
                        },
                        {
                            "name" : "Freie Arzt-und Medizinkasse",
                            "vknr" : "40878"
                        },
                        {
                            "name" : "Stadt Delmenhorst Berufsfeuerwehr",
                            "vknr" : "12878"
                        },
                        {
                            "name" : "Justizvollzugsanstalt Neuburg",
                            "vknr" : "64878"
                        },
                        {
                            "name" : "Landeshauptstadt Hannover - Feuerwehr",
                            "vknr" : "09878"
                        },
                        {
                            "name" : "Stadt Emden-Berufsfeuerwehr",
                            "vknr" : "06878"
                        }
                    ]
                },
                {
                    "serialNo" : "879",
                    "content" : [
                        {
                            "name" : "Feuerwehr Stadt Brunsbüttel",
                            "vknr" : "01879"
                        },
                        {
                            "name" : "Freie und Hansestadt Hamburg,Justizbeh.",
                            "vknr" : "14879"
                        },
                        {
                            "name" : "Feuerwehr Bremen",
                            "vknr" : "03879"
                        },
                        {
                            "name" : "Stadt Wilhelmshaven Berufsfeuerwehr",
                            "vknr" : "16879"
                        },
                        {
                            "name" : "Berufsfeuerwehr Braunschweig",
                            "vknr" : "07879"
                        },
                        {
                            "name" : "NLBV Stadt Oldenburg Berufsfeuerwehr",
                            "vknr" : "12879"
                        }
                    ]
                },
                {
                    "serialNo" : "880",
                    "content" : [
                        {
                            "name" : "Gesundheitsamt Köln Nichtsesshaften",
                            "vknr" : "27880"
                        },
                        {
                            "name" : "Niederrsächs. Landeskrankenhaus Wehnen",
                            "vknr" : "12880"
                        },
                        {
                            "name" : "Feuerwehr Kreis Stormarn",
                            "vknr" : "01880"
                        }
                    ]
                },
                {
                    "serialNo" : "881",
                    "content" : [
                        {
                            "name" : "Städt. Gesundheitsamt Bremerhaven",
                            "vknr" : "03881"
                        }
                    ]
                },
                {
                    "serialNo" : "882",
                    "content" : [
                        {
                            "name" : "Inter Krankenvers. Abt. Mediz. Verb.",
                            "vknr" : "49882"
                        }
                    ]
                },
                {
                    "serialNo" : "883",
                    "content" : [
                        {
                            "name" : "Medizinalverband Mundenheim",
                            "vknr" : "49883"
                        }
                    ]
                },
                {
                    "serialNo" : "886",
                    "content" : [
                        {
                            "name" : "Medizinischer Dienst d. Krankenvers. MV",
                            "vknr" : "78886"
                        },
                        {
                            "name" : "MDK in Bayern",
                            "vknr" : "71886"
                        },
                        {
                            "name" : "Medizinischer Dienst d Krankenvers. S-H",
                            "vknr" : "01886"
                        },
                        {
                            "name" : "Sächsisches Staatsministerium d. Innern",
                            "vknr" : "98886"
                        },
                        {
                            "name" : "Medizinischer Dienst der Krankenkassen",
                            "vknr" : "85886"
                        }
                    ]
                },
                {
                    "serialNo" : "887",
                    "content" : [
                        {
                            "name" : "Landesamt für Schule und Bildung",
                            "vknr" : "98887"
                        }
                    ]
                },
                {
                    "serialNo" : "888",
                    "content" : [
                        {
                            "name" : "Landesdirektion Chemnitz-Referat 27",
                            "vknr" : "96888"
                        },
                        {
                            "name" : "MDK Berlin-Brandenburg e. V.",
                            "vknr" : "79888"
                        }
                    ]
                },
                {
                    "serialNo" : "889",
                    "content" : [
                        {
                            "name" : "MDK im Freistaat Sachsen e. V.",
                            "vknr" : "96889"
                        },
                        {
                            "name" : "MDK im Freistaat Sachsen e. V.",
                            "vknr" : "94889"
                        },
                        {
                            "name" : "Med.Dienst d.Krankenvers.Thüringen e.V.",
                            "vknr" : "89889"
                        },
                        {
                            "name" : "MDK im Freistaat Sachsen e. V.",
                            "vknr" : "95889"
                        },
                        {
                            "name" : "MDK Berlin-Brandenburg",
                            "vknr" : "72889"
                        }
                    ]
                },
                {
                    "serialNo" : "890",
                    "content" : [
                        {
                            "name" : "Bundesamt für den Zivildienst \"B\"",
                            "vknr" : "78890"
                        }
                    ]
                },
                {
                    "serialNo" : "891",
                    "content" : [
                        {
                            "name" : "Gemeindeunfallversicherungsverband Schl",
                            "vknr" : "01891"
                        }
                    ]
                },
                {
                    "serialNo" : "892",
                    "content" : [
                        {
                            "name" : "EUV Berlin",
                            "vknr" : "72892"
                        }
                    ]
                },
                {
                    "serialNo" : "893",
                    "content" : [
                        {
                            "name" : "Ausführungsbeh.f.Unfallvers.Schl.-Hols",
                            "vknr" : "01893"
                        }
                    ]
                },
                {
                    "serialNo" : "894",
                    "content" : [
                        {
                            "name" : "Sächs. Staatsministerium f. Soziales",
                            "vknr" : "95894"
                        }
                    ]
                },
                {
                    "serialNo" : "895",
                    "content" : [
                        {
                            "name" : "BA f. Fam. u. zivilgesellsch. Aufgaben",
                            "vknr" : "89895"
                        },
                        {
                            "name" : "BA für Familie u. zivilges. Aufgaben",
                            "vknr" : "74895"
                        }
                    ]
                },
                {
                    "serialNo" : "896",
                    "content" : [
                        {
                            "name" : "medi-convent GmbH Hamburg",
                            "vknr" : "02896"
                        }
                    ]
                },
                {
                    "serialNo" : "900",
                    "content" : [
                        {
                            "name" : "Rezeptprüfstelle Duderstadt-SSB Hamburg",
                            "vknr" : "02900"
                        },
                        {
                            "name" : "KV Berlin Asyl",
                            "vknr" : "72900"
                        },
                        {
                            "name" : "GKV BW",
                            "vknr" : "52900"
                        },
                        {
                            "name" : "Rezeptprüfstelle Duderstadt (RPD)",
                            "vknr" : "17900"
                        }
                    ]
                },
                {
                    "serialNo" : "901",
                    "content" : [
                        {
                            "name" : "Rezeptprüfstelle Duderstadt (RPD)",
                            "vknr" : "88901"
                        },
                        {
                            "name" : "AOK Rheinland/Hamburg-ZOM",
                            "vknr" : "25901"
                        },
                        {
                            "name" : "AOK Rheinland/Hamburg  rh.-ma-nord ZOM",
                            "vknr" : "28901"
                        },
                        {
                            "name" : "Bezirksregierung Köln Dezernat 20",
                            "vknr" : "27901"
                        },
                        {
                            "name" : "Bezirksregierung Arnsberg",
                            "vknr" : "20901"
                        },
                        {
                            "name" : "Bezirksregierung Düsseldorf Dezernat 20",
                            "vknr" : "24901"
                        }
                    ]
                },
                {
                    "serialNo" : "902",
                    "content" : [
                        {
                            "name" : "BKK NOVITAS - ZOM",
                            "vknr" : "25902"
                        },
                        {
                            "name" : "Bezirksregierung Detmold",
                            "vknr" : "20902"
                        },
                        {
                            "name" : "BKK SAINT-GABAIN rhein-maas-nord ( ZOM)",
                            "vknr" : "28902"
                        },
                        {
                            "name" : "AOK Rheinland/Hamburg Euregios",
                            "vknr" : "21902"
                        }
                    ]
                },
                {
                    "serialNo" : "903",
                    "content" : [
                        {
                            "name" : "BKK SAINT-GOBAIN Euregios",
                            "vknr" : "21903"
                        },
                        {
                            "name" : "NOVITAS BKK rhein-maas-nord ( ZOM)",
                            "vknr" : "28903"
                        },
                        {
                            "name" : "Bezirksregierung Münster",
                            "vknr" : "20903"
                        },
                        {
                            "name" : "BKK Bayer - ZOM",
                            "vknr" : "25903"
                        }
                    ]
                },
                {
                    "serialNo" : "904",
                    "content" : [
                        {
                            "name" : "BARMER GEK rhein-maas-nord ( ZOM)",
                            "vknr" : "28904"
                        },
                        {
                            "name" : "BARMER GEK Regionalstelle - ZOM",
                            "vknr" : "25904"
                        },
                        {
                            "name" : "BARMER GEK Euregios",
                            "vknr" : "21904"
                        }
                    ]
                },
                {
                    "serialNo" : "905",
                    "content" : [
                        {
                            "name" : "Gmünder EK rhein-maas-nord ( ZOM)",
                            "vknr" : "28905"
                        },
                        {
                            "name" : "Gmünder Ersatzkasse - IZOM",
                            "vknr" : "21905"
                        },
                        {
                            "name" : "Gmünder Ersatzkasse Viersen - ZOM",
                            "vknr" : "25905"
                        }
                    ]
                },
                {
                    "serialNo" : "906",
                    "content" : [
                        {
                            "name" : "DAK GESUNDHEIT Euregios",
                            "vknr" : "21906"
                        },
                        {
                            "name" : "DAK GESUNDHEIT rh.-ma.-no. (ZOM)",
                            "vknr" : "28906"
                        },
                        {
                            "name" : "DAK - Unternehmen Leben - ZOM",
                            "vknr" : "25906"
                        }
                    ]
                },
                {
                    "serialNo" : "907",
                    "content" : [
                        {
                            "name" : "HaMü rhein-maas-nord ( ZOM)",
                            "vknr" : "28907"
                        },
                        {
                            "name" : "Hamburg-Münchner Ersatzkasse - ZOM",
                            "vknr" : "25907"
                        },
                        {
                            "name" : "Hamburg-Münchener Ersatzkasse - IZOM",
                            "vknr" : "21907"
                        }
                    ]
                },
                {
                    "serialNo" : "908",
                    "content" : [
                        {
                            "name" : "HEK rhein-maas-nord ( ZOM)",
                            "vknr" : "28908"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse - ZOM",
                            "vknr" : "25908"
                        },
                        {
                            "name" : "Hanseatische Krankenkasse - Euregios",
                            "vknr" : "21908"
                        }
                    ]
                },
                {
                    "serialNo" : "909",
                    "content" : [
                        {
                            "name" : "HZK-Krankenkasse - ZOM",
                            "vknr" : "25909"
                        },
                        {
                            "name" : "HZK-Krankenkasse - IZOM",
                            "vknr" : "21909"
                        },
                        {
                            "name" : "HZK rhein-maas-nord ( ZOM)",
                            "vknr" : "28909"
                        }
                    ]
                },
                {
                    "serialNo" : "910",
                    "content" : [
                        {
                            "name" : "Kaufmännische KK-KKH rh.-ma.-no. ( ZOM)",
                            "vknr" : "28910"
                        },
                        {
                            "name" : "KKH-Allianz  ZOM",
                            "vknr" : "25910"
                        },
                        {
                            "name" : "Kaufmännische Krankenkasse-KKHEuregios",
                            "vknr" : "21910"
                        }
                    ]
                },
                {
                    "serialNo" : "911",
                    "content" : [
                        {
                            "name" : "Techniker Krankenkasse - Euregios",
                            "vknr" : "21911"
                        },
                        {
                            "name" : "Techniker Krankenkasse - ZOM",
                            "vknr" : "25911"
                        },
                        {
                            "name" : "TK rhein-maas-nord ( ZOM)",
                            "vknr" : "28911"
                        }
                    ]
                },
                {
                    "serialNo" : "912",
                    "content" : [
                        {
                            "name" : "AOK Europa ",
                            "vknr" : "21912"
                        },
                        {
                            "name" : "Vereinigte IKK rhein-maas-nord ( ZOM)",
                            "vknr" : "28912"
                        }
                    ]
                },
                {
                    "serialNo" : "913",
                    "content" : [
                        {
                            "name" : "pronova BKK Euregios",
                            "vknr" : "28913"
                        },
                        {
                            "name" : "AOK Rheinland/Hamburg GCI",
                            "vknr" : "21913"
                        }
                    ]
                },
                {
                    "serialNo" : "914",
                    "content" : [
                        {
                            "name" : "BKK VBU rhein-maas-nord (ZOM)",
                            "vknr" : "28914"
                        },
                        {
                            "name" : "IKK classic Euregio Maas-Rhein",
                            "vknr" : "21914"
                        },
                        {
                            "name" : "IKK classic Euregio Rhein-Waal",
                            "vknr" : "25914"
                        }
                    ]
                },
                {
                    "serialNo" : "934",
                    "content" : [
                        {
                            "name" : "Landratsamt Donau-Ries, Jugend u Fam.",
                            "vknr" : "70934"
                        }
                    ]
                },
                {
                    "serialNo" : "947",
                    "content" : [
                        {
                            "name" : "Vorarlberger Gebietskrankenkasse",
                            "vknr" : "70947"
                        }
                    ]
                },
                {
                    "serialNo" : "948",
                    "content" : [
                        {
                            "name" : "Sozialvers.Anstalt Bauern-Lst.Vorarlb.",
                            "vknr" : "70948"
                        }
                    ]
                },
                {
                    "serialNo" : "949",
                    "content" : [
                        {
                            "name" : "Sozialvers.Anstalt d. Bauern -LST.Tirol",
                            "vknr" : "70949"
                        }
                    ]
                },
                {
                    "serialNo" : "950",
                    "content" : [
                        {
                            "name" : "Asylstelle der Stadt Bielefeld (500.13)",
                            "vknr" : "19950"
                        },
                        {
                            "name" : "Stadt Krefeld Asylbewerber",
                            "vknr" : "28950"
                        },
                        {
                            "name" : "Stadtverwaltung  Bochum",
                            "vknr" : "18950"
                        },
                        {
                            "name" : "KJA Pinneberg, FD 33-8, Wi. Jugendhilfe",
                            "vknr" : "01950"
                        },
                        {
                            "name" : "Sozialämter/DRK/Asylbewerber",
                            "vknr" : "49950"
                        },
                        {
                            "name" : "Stadt Bergneustadt Asylbewerber",
                            "vknr" : "27950"
                        },
                        {
                            "name" : "Stadt Aachen Asylbewerber",
                            "vknr" : "21950"
                        },
                        {
                            "name" : "Stadt Düsseldorf Asylbewerber",
                            "vknr" : "24950"
                        },
                        {
                            "name" : "Kreisjugendamt München",
                            "vknr" : "63950"
                        },
                        {
                            "name" : "Landratsamt Vogtlandkreis Jugendamt ",
                            "vknr" : "94950"
                        },
                        {
                            "name" : "Ausl.-Amt FFB-Asylb/SHT",
                            "vknr" : "64950"
                        },
                        {
                            "name" : "Kreissozialamt Bergstraße",
                            "vknr" : "39950"
                        },
                        {
                            "name" : "Stadtverwaltung Kalkar SoHi u. Asyl",
                            "vknr" : "25950"
                        }
                    ]
                },
                {
                    "serialNo" : "951",
                    "content" : [
                        {
                            "name" : "Kreisverwaltung Germersheim",
                            "vknr" : "49951"
                        },
                        {
                            "name" : "Landratsamt Erzgebirgskreis Jugendamt",
                            "vknr" : "94951"
                        },
                        {
                            "name" : "Asylstelle Stadt Bottrop",
                            "vknr" : "19951"
                        },
                        {
                            "name" : "Jugendamt Landkreis Anklam",
                            "vknr" : "78951"
                        },
                        {
                            "name" : "LRA Ostalbkreis  -Kreisjugendamt Aalen-",
                            "vknr" : "61951"
                        },
                        {
                            "name" : "SHV Ebersberg-Asylbewerber-",
                            "vknr" : "64951"
                        },
                        {
                            "name" : "Asylstelle der Stadt Dortmund",
                            "vknr" : "18951"
                        },
                        {
                            "name" : "Gemeinde Aldenhoven Asylbewerber",
                            "vknr" : "21951"
                        },
                        {
                            "name" : "Gemeinde Engelskirchen Asylbewerber",
                            "vknr" : "27951"
                        }
                    ]
                },
                {
                    "serialNo" : "952",
                    "content" : [
                        {
                            "name" : "Stadt Kamp-Lintfort Sozialamt Asyl",
                            "vknr" : "25952"
                        },
                        {
                            "name" : "Asylstelle der Stadt Gelsenkirchen",
                            "vknr" : "19952"
                        },
                        {
                            "name" : "Landesdirektion Sachsen Abt. 6 Ref. 67 ",
                            "vknr" : "94952"
                        },
                        {
                            "name" : "Stadt Alsdorf Asylbewerber",
                            "vknr" : "21952"
                        },
                        {
                            "name" : "SHV Freising -Asylbewerber-",
                            "vknr" : "64952"
                        },
                        {
                            "name" : "Asylstelle der Stadt Hagen",
                            "vknr" : "18952"
                        },
                        {
                            "name" : "Stadt Gummersbach Asylbewerber",
                            "vknr" : "27952"
                        }
                    ]
                },
                {
                    "serialNo" : "953",
                    "content" : [
                        {
                            "name" : "Landratsamt Erding FB Jugend u. Familie",
                            "vknr" : "64953"
                        },
                        {
                            "name" : "Landratsamt Esslingen -Kreisjugendamt-",
                            "vknr" : "61953"
                        },
                        {
                            "name" : "Asylstelle der Stadt Münster",
                            "vknr" : "19953"
                        },
                        {
                            "name" : "JA Lk Mecklenburgische Seenplatte",
                            "vknr" : "78953"
                        },
                        {
                            "name" : "Stadt Hückeswagen Asylbewerber",
                            "vknr" : "27953"
                        },
                        {
                            "name" : "Asylstelle der Stadt Hamm",
                            "vknr" : "18953"
                        },
                        {
                            "name" : "Stadt Baesweiler Asylbewerber",
                            "vknr" : "21953"
                        }
                    ]
                },
                {
                    "serialNo" : "954",
                    "content" : [
                        {
                            "name" : "Gemeindeverwaltung Kerken SoHi u. Asyl",
                            "vknr" : "25954"
                        },
                        {
                            "name" : "LRA Freising-Amt für Jugend und Familie",
                            "vknr" : "64954"
                        },
                        {
                            "name" : "Gemeinde Lindlar Asylbewerber",
                            "vknr" : "27954"
                        },
                        {
                            "name" : "Jugendamt Lk Rostock",
                            "vknr" : "78954"
                        },
                        {
                            "name" : "Asylstelle der Stadt Herne",
                            "vknr" : "18954"
                        },
                        {
                            "name" : "Landratsamt Göppingen -Kreisjugendamt-",
                            "vknr" : "61954"
                        },
                        {
                            "name" : "Stadt Düren Asylbewerber",
                            "vknr" : "21954"
                        }
                    ]
                },
                {
                    "serialNo" : "955",
                    "content" : [
                        {
                            "name" : "SSB Nordrhein ",
                            "vknr" : "38955"
                        },
                        {
                            "name" : "SA Erkelenz/Asylb. c/o SA Krs.Heinsberg",
                            "vknr" : "21955"
                        },
                        {
                            "name" : "Stadt Mönchengladbach Asylbewerber",
                            "vknr" : "28955"
                        },
                        {
                            "name" : "Kreisjugendamt Heidenheim/Brenz",
                            "vknr" : "61955"
                        },
                        {
                            "name" : "Gemeinde Marienheide Asylbewerber",
                            "vknr" : "27955"
                        }
                    ]
                },
                {
                    "serialNo" : "956",
                    "content" : [
                        {
                            "name" : "JA Amt f. Jugend, Soziales und Familie",
                            "vknr" : "78956"
                        },
                        {
                            "name" : "Stadtverwaltung Kevelaer SoHi u. Asyl",
                            "vknr" : "25956"
                        },
                        {
                            "name" : "Stadt Eschweiler Asylbewerber",
                            "vknr" : "21956"
                        },
                        {
                            "name" : "Gemeinde Morsbach Asylbewerber",
                            "vknr" : "27956"
                        }
                    ]
                },
                {
                    "serialNo" : "957",
                    "content" : [
                        {
                            "name" : "Gemeinde Nümbrecht Asylbewerber",
                            "vknr" : "27957"
                        },
                        {
                            "name" : "Kreisjugendamt Aalen,Ast. Schw.Gmünd",
                            "vknr" : "61957"
                        },
                        {
                            "name" : "Gemeinde Gangelt Asylbewerber",
                            "vknr" : "21957"
                        }
                    ]
                },
                {
                    "serialNo" : "958",
                    "content" : [
                        {
                            "name" : "JA Lk Nordwestmecklenburg, FD Jugend",
                            "vknr" : "78958"
                        },
                        {
                            "name" : "Stadt Geilenkirchen Asylbewerber",
                            "vknr" : "21958"
                        },
                        {
                            "name" : "Stadtverwaltung Kleve SoHi u. Asyl",
                            "vknr" : "25958"
                        },
                        {
                            "name" : "Stadt Radevormwald Asylbewerber",
                            "vknr" : "27958"
                        },
                        {
                            "name" : "Kreisjugendamt Schwäb. Hall",
                            "vknr" : "61958"
                        }
                    ]
                },
                {
                    "serialNo" : "959",
                    "content" : [
                        {
                            "name" : "Jugendamt Landkreis Nordvorpommern",
                            "vknr" : "78959"
                        },
                        {
                            "name" : "Gemeinde Reichshof Asylbewerber",
                            "vknr" : "27959"
                        },
                        {
                            "name" : "Kreisjugendamt Tauberbischofsheim",
                            "vknr" : "61959"
                        },
                        {
                            "name" : "Stadt Heimbach Asylbewerber",
                            "vknr" : "21959"
                        }
                    ]
                },
                {
                    "serialNo" : "960",
                    "content" : [
                        {
                            "name" : "Sozialamt LRA Rems-Murr-Kreis ",
                            "vknr" : "61960"
                        },
                        {
                            "name" : "Landratsamt LK Leipzig Jugendamt",
                            "vknr" : "96960"
                        },
                        {
                            "name" : "Gewahrsameinr. f. Ausreisepflichtige",
                            "vknr" : "49960"
                        },
                        {
                            "name" : "Jugendamt Landkreis Güstrow",
                            "vknr" : "78960"
                        },
                        {
                            "name" : "Stadt Heinsberg Asylbewerber",
                            "vknr" : "21960"
                        },
                        {
                            "name" : "Stadt Waldbröl Asylbewerber",
                            "vknr" : "27960"
                        },
                        {
                            "name" : "Stadt Mettmann Asylbewerber",
                            "vknr" : "24960"
                        },
                        {
                            "name" : "Gemeinde Kranenburg SoHi u. Asyl",
                            "vknr" : "25960"
                        },
                        {
                            "name" : "Gemeinde Brüggen Asylbewerber",
                            "vknr" : "28960"
                        }
                    ]
                },
                {
                    "serialNo" : "961",
                    "content" : [
                        {
                            "name" : "Stadt Herzogenrath Asylbewerber",
                            "vknr" : "21961"
                        },
                        {
                            "name" : "Stadt Erkrath Asylbewerber",
                            "vknr" : "24961"
                        },
                        {
                            "name" : "Asylstelle des Ortes Breckerfeld",
                            "vknr" : "18961"
                        },
                        {
                            "name" : "Asylstelle des Kreises Borken",
                            "vknr" : "19961"
                        },
                        {
                            "name" : "Stadt Wiehl Asylbewerber",
                            "vknr" : "27961"
                        },
                        {
                            "name" : "Gemeinde Grefrath Asylbewerber",
                            "vknr" : "28961"
                        }
                    ]
                },
                {
                    "serialNo" : "962",
                    "content" : [
                        {
                            "name" : "Jugendamt Lk Ludwigslust-Parchim",
                            "vknr" : "78962"
                        },
                        {
                            "name" : "Asylstelle des Ortes Ennepetal",
                            "vknr" : "18962"
                        },
                        {
                            "name" : "Asylstelle des Kreises Coesfeld",
                            "vknr" : "19962"
                        },
                        {
                            "name" : "Stadt Haan Asylbewerber",
                            "vknr" : "24962"
                        },
                        {
                            "name" : "Stadt Moers Sozialamt Asylbewerber",
                            "vknr" : "25962"
                        },
                        {
                            "name" : "Stadt Hückelhoven Asylbewerber",
                            "vknr" : "21962"
                        },
                        {
                            "name" : "Stadt Kempen Asylbewerber",
                            "vknr" : "28962"
                        },
                        {
                            "name" : "Stadt Wipperfürth Asylbewerber",
                            "vknr" : "27962"
                        }
                    ]
                },
                {
                    "serialNo" : "963",
                    "content" : [
                        {
                            "name" : "Asylstelle des Ortes Gevelsberg",
                            "vknr" : "18963"
                        },
                        {
                            "name" : "Asylstelle des Kreises Gütersloh",
                            "vknr" : "19963"
                        },
                        {
                            "name" : "AS Bergheim (Substitutionsbehandlung)",
                            "vknr" : "27963"
                        },
                        {
                            "name" : "Kreisjugendamt Bergstraße",
                            "vknr" : "39963"
                        },
                        {
                            "name" : "Gemeinde Hürtgenwald Asylbewerber",
                            "vknr" : "21963"
                        },
                        {
                            "name" : "Stadt Heiligenhaus Asylbewerber",
                            "vknr" : "24963"
                        },
                        {
                            "name" : "Stadt Nettetal Asylbewerber",
                            "vknr" : "28963"
                        }
                    ]
                },
                {
                    "serialNo" : "964",
                    "content" : [
                        {
                            "name" : "Stadt Neukirchen-Vluyn Sozialamt Asyl",
                            "vknr" : "25964"
                        },
                        {
                            "name" : "Asylstelle des Ortes Hattingen",
                            "vknr" : "18964"
                        },
                        {
                            "name" : "Amt für Jugend und Schule Leichlingen",
                            "vknr" : "27964"
                        },
                        {
                            "name" : "Stadt Hilden Asylbewerber",
                            "vknr" : "24964"
                        },
                        {
                            "name" : "Gemeinde Inden Asylbewerber",
                            "vknr" : "21964"
                        },
                        {
                            "name" : "Kreis Bergstraße, KRA, Amt f. Soziales",
                            "vknr" : "39964"
                        },
                        {
                            "name" : "Asylstelle des Kreises Herford",
                            "vknr" : "19964"
                        },
                        {
                            "name" : "Gemeinde Niederkrüchten Asylbewerber",
                            "vknr" : "28964"
                        }
                    ]
                },
                {
                    "serialNo" : "965",
                    "content" : [
                        {
                            "name" : "Stadtjugendamt Neubrandenburg",
                            "vknr" : "78965"
                        },
                        {
                            "name" : "Gemeinde Schwalmtal Asylbewerber",
                            "vknr" : "28965"
                        },
                        {
                            "name" : "Stadt Jülich Asylbewerber",
                            "vknr" : "21965"
                        },
                        {
                            "name" : "Asylstelle des Ortes Herdecke",
                            "vknr" : "18965"
                        },
                        {
                            "name" : "Asylstelle des Kreises Höxter",
                            "vknr" : "19965"
                        },
                        {
                            "name" : "Stadt Langenfeld Asylbewerber",
                            "vknr" : "24965"
                        }
                    ]
                },
                {
                    "serialNo" : "966",
                    "content" : [
                        {
                            "name" : "Stadt Monheim am Rhein Asylbewerber",
                            "vknr" : "24966"
                        },
                        {
                            "name" : "Landratsamt Nordsachsen Jugendamt",
                            "vknr" : "96966"
                        },
                        {
                            "name" : "Asylstelle des Ortes Schwelm",
                            "vknr" : "18966"
                        },
                        {
                            "name" : "Gemeinde Kreuzau Asylbewerber",
                            "vknr" : "21966"
                        },
                        {
                            "name" : "Stadtverwaltung Rees SoHi u. Asyl",
                            "vknr" : "25966"
                        },
                        {
                            "name" : "Stadt Tönisvorst Asylbewerber",
                            "vknr" : "28966"
                        },
                        {
                            "name" : "Asylstelle des Kreises Lippe",
                            "vknr" : "19966"
                        }
                    ]
                },
                {
                    "serialNo" : "967",
                    "content" : [
                        {
                            "name" : "Jugendamt Landkreis Meckl.-Strelitz",
                            "vknr" : "78967"
                        },
                        {
                            "name" : "Stadt Ratingen Asylbewerber",
                            "vknr" : "24967"
                        },
                        {
                            "name" : "Gemeinde Langerwehe Asylbewerber",
                            "vknr" : "21967"
                        },
                        {
                            "name" : "Asylstelle des Kreises Minden-Lübbecke",
                            "vknr" : "19967"
                        },
                        {
                            "name" : "Asylstelle des Ortes Sprockhövel",
                            "vknr" : "18967"
                        },
                        {
                            "name" : "Stadt Viersen/Abrechnung Malteser-San.",
                            "vknr" : "28967"
                        }
                    ]
                },
                {
                    "serialNo" : "968",
                    "content" : [
                        {
                            "name" : "Stadt Willich Asylbewerber",
                            "vknr" : "28968"
                        },
                        {
                            "name" : "Stadt Velbert Asylbewerber",
                            "vknr" : "24968"
                        },
                        {
                            "name" : "Asylstelle des Ortes Wetter",
                            "vknr" : "18968"
                        },
                        {
                            "name" : "Stadt Linnich Asylbewerber",
                            "vknr" : "21968"
                        },
                        {
                            "name" : "Stadt Rheinberg Sozialamt Asylbewerber",
                            "vknr" : "25968"
                        },
                        {
                            "name" : "Jugendamt Landkreis Parchim",
                            "vknr" : "78968"
                        },
                        {
                            "name" : "Asylstelle des Kreises Paderborn",
                            "vknr" : "19968"
                        }
                    ]
                },
                {
                    "serialNo" : "969",
                    "content" : [
                        {
                            "name" : "Jugendamt Landkreis Uecker-Randow",
                            "vknr" : "78969"
                        },
                        {
                            "name" : "LA Leipziger Land Asyl/BSHG ",
                            "vknr" : "96969"
                        },
                        {
                            "name" : "Asylstelle des Kreises Recklinghausen",
                            "vknr" : "19969"
                        },
                        {
                            "name" : "Asylstelle des Ortes Witten",
                            "vknr" : "18969"
                        },
                        {
                            "name" : "Gemeinde Merzenich Asylbewerber",
                            "vknr" : "21969"
                        },
                        {
                            "name" : "Stadt Wülfrath Asylbewerber",
                            "vknr" : "24969"
                        }
                    ]
                },
                {
                    "serialNo" : "970",
                    "content" : [
                        {
                            "name" : "Landratsamt SchwHall-Untere Aufnahmebeh",
                            "vknr" : "61970"
                        },
                        {
                            "name" : "SSB Nordrhein - RPD",
                            "vknr" : "38970"
                        },
                        {
                            "name" : "Stadt Bergisch Gladbach Asylbewerber",
                            "vknr" : "27970"
                        },
                        {
                            "name" : "Asylstelle des Hochsauerlandkreises",
                            "vknr" : "18970"
                        },
                        {
                            "name" : "Gemeindeverwaltung Rheurdt SoHi u. Asyl",
                            "vknr" : "25970"
                        },
                        {
                            "name" : "Asylstelle des Kreises Steinfurt",
                            "vknr" : "19970"
                        },
                        {
                            "name" : "Sozialamt der Stadt Darmstadt",
                            "vknr" : "39970"
                        },
                        {
                            "name" : "Stadt Monschau Asylbewerber",
                            "vknr" : "21970"
                        }
                    ]
                },
                {
                    "serialNo" : "971",
                    "content" : [
                        {
                            "name" : "Asylstelle der Stadt Ahlen",
                            "vknr" : "19971"
                        },
                        {
                            "name" : "Stadt Burscheid Asylbewerber",
                            "vknr" : "27971"
                        },
                        {
                            "name" : "Asylstelle des Märkischen Kreises",
                            "vknr" : "18971"
                        },
                        {
                            "name" : "Stadt Nideggen Asylbewerber",
                            "vknr" : "21971"
                        }
                    ]
                },
                {
                    "serialNo" : "972",
                    "content" : [
                        {
                            "name" : "Gemeinde Kürten Asylbewerber",
                            "vknr" : "27972"
                        },
                        {
                            "name" : "Gemeinde Schermbeck Sozialamt Asyl",
                            "vknr" : "25972"
                        },
                        {
                            "name" : "Stadt Bielefeld- Zentrale Ausländerbeh.",
                            "vknr" : "19972"
                        },
                        {
                            "name" : "Gemeinde Niederzier Asylbewerber",
                            "vknr" : "21972"
                        },
                        {
                            "name" : "Stadtjugendamt Rostock",
                            "vknr" : "78972"
                        },
                        {
                            "name" : "Stadt Olpe Asylbewerber",
                            "vknr" : "18972"
                        }
                    ]
                },
                {
                    "serialNo" : "973",
                    "content" : [
                        {
                            "name" : "Bezirksregierung Detmold Asylbewerber",
                            "vknr" : "19973"
                        },
                        {
                            "name" : "Asylstelle des Kr. Siegen-Wittgenstein",
                            "vknr" : "18973"
                        },
                        {
                            "name" : "Stadt Leichlingen Asylbewerber",
                            "vknr" : "27973"
                        },
                        {
                            "name" : "Gemeinde Nörvenich Asylbewerber",
                            "vknr" : "21973"
                        }
                    ]
                },
                {
                    "serialNo" : "974",
                    "content" : [
                        {
                            "name" : "Lk Darmstadt-Dieburg-Zuwand. u. Flücht.",
                            "vknr" : "39974"
                        },
                        {
                            "name" : "Gemeinde Roetgen Asylbewerber",
                            "vknr" : "21974"
                        },
                        {
                            "name" : "Gemeinde Sonsbeck Sozialamt Asyl",
                            "vknr" : "25974"
                        },
                        {
                            "name" : "Jugendamt Lk Vorpommern-Rügen, FD Jug.",
                            "vknr" : "78974"
                        },
                        {
                            "name" : "Gemeinde Odenthal Asylbewerber",
                            "vknr" : "27974"
                        },
                        {
                            "name" : "Asylstelle des Kreises Soest",
                            "vknr" : "18974"
                        },
                        {
                            "name" : "Bezirksregierung Münster Asylbewerber",
                            "vknr" : "19974"
                        }
                    ]
                },
                {
                    "serialNo" : "975",
                    "content" : [
                        {
                            "name" : "Stadtjugendamt Schwerin",
                            "vknr" : "78975"
                        },
                        {
                            "name" : "Stadt Overath, A.f.Ord.u.Soz. Asylwesen",
                            "vknr" : "27975"
                        },
                        {
                            "name" : "Asylstelle Stadt Unna",
                            "vknr" : "18975"
                        },
                        {
                            "name" : "Gemeinde Selfkant Asylbewerber",
                            "vknr" : "21975"
                        }
                    ]
                },
                {
                    "serialNo" : "976",
                    "content" : [
                        {
                            "name" : "Gemeinde Simmerath Asylbewerber",
                            "vknr" : "21976"
                        },
                        {
                            "name" : "Jugendamt Darmstadt Stadt",
                            "vknr" : "39976"
                        },
                        {
                            "name" : "Asylstelle Bönen",
                            "vknr" : "18976"
                        },
                        {
                            "name" : "Stadtverwaltung Straelen SoHi u. Asyl",
                            "vknr" : "25976"
                        },
                        {
                            "name" : "Gemeinde Rösrath Asylbewerber",
                            "vknr" : "27976"
                        }
                    ]
                },
                {
                    "serialNo" : "977",
                    "content" : [
                        {
                            "name" : "Stadt Stolberg Asylbewerber",
                            "vknr" : "21977"
                        },
                        {
                            "name" : "Stadt Wermelskirchen Asylbewerber",
                            "vknr" : "27977"
                        },
                        {
                            "name" : "Stadtverw. Kierspe Soz. Angelegenheiten",
                            "vknr" : "18977"
                        }
                    ]
                },
                {
                    "serialNo" : "978",
                    "content" : [
                        {
                            "name" : "Stadtjugendamt Stralsund",
                            "vknr" : "78978"
                        },
                        {
                            "name" : "Gemeinde Titz Asylbewerber",
                            "vknr" : "21978"
                        },
                        {
                            "name" : "Hansestadt Attendorn Asylbewerber",
                            "vknr" : "18978"
                        },
                        {
                            "name" : "Gemeindeverwaltung Uedem SoHi u. Asyl",
                            "vknr" : "25978"
                        },
                        {
                            "name" : "Sozialamt Stadt Köln-Kostenerstattungsf",
                            "vknr" : "27978"
                        }
                    ]
                },
                {
                    "serialNo" : "979",
                    "content" : [
                        {
                            "name" : "Stadt Köln/Asyl-Kostenerstattungsfälle",
                            "vknr" : "27979"
                        },
                        {
                            "name" : "Stadt Drolshagen Soziale Dienste/Asyl",
                            "vknr" : "18979"
                        },
                        {
                            "name" : "Stadt Übach-Palenberg Asylbewerber",
                            "vknr" : "21979"
                        }
                    ]
                },
                {
                    "serialNo" : "980",
                    "content" : [
                        {
                            "name" : "Gemeinde Vettweiß Asylbewerber",
                            "vknr" : "21980"
                        },
                        {
                            "name" : "Gemeinde Finnentrop Asylbewerber",
                            "vknr" : "18980"
                        },
                        {
                            "name" : "Stadt Voerde Sozialamt Asylbewerber",
                            "vknr" : "25980"
                        },
                        {
                            "name" : "Kreissozialamt Odenwaldkreis",
                            "vknr" : "39980"
                        },
                        {
                            "name" : "Gemeinde Alfter Asylbewerber",
                            "vknr" : "27980"
                        },
                        {
                            "name" : "Stadt Neuss Asylbewerber",
                            "vknr" : "24980"
                        }
                    ]
                },
                {
                    "serialNo" : "981",
                    "content" : [
                        {
                            "name" : "Stadt Dormagen Asylbewerber",
                            "vknr" : "24981"
                        },
                        {
                            "name" : "Gemeinde Kirchhundem Asylbewerber",
                            "vknr" : "18981"
                        },
                        {
                            "name" : "Gemeinde Waldfeucht Asylbewerber",
                            "vknr" : "21981"
                        },
                        {
                            "name" : "Stadt Bad Honnef Asylbewerber",
                            "vknr" : "27981"
                        }
                    ]
                },
                {
                    "serialNo" : "982",
                    "content" : [
                        {
                            "name" : "Stadt Wassenberg Asylbewerber",
                            "vknr" : "21982"
                        },
                        {
                            "name" : "Stadt Lennestadt Bereich Soziales-Asyl",
                            "vknr" : "18982"
                        },
                        {
                            "name" : "Stadtverwaltung Bornheim Asylbewerber",
                            "vknr" : "27982"
                        },
                        {
                            "name" : "Gemeinde Wachtendonk SoHi u. Asyl",
                            "vknr" : "25982"
                        },
                        {
                            "name" : "Stadt Grevenbroich Asylbewerber",
                            "vknr" : "24982"
                        }
                    ]
                },
                {
                    "serialNo" : "983",
                    "content" : [
                        {
                            "name" : "Stadt Jüchen Asylbewerber",
                            "vknr" : "24983"
                        },
                        {
                            "name" : "Gemeinde Wenden Asylbewerber",
                            "vknr" : "18983"
                        },
                        {
                            "name" : "Stadt Wegberg Asylbewerber",
                            "vknr" : "21983"
                        },
                        {
                            "name" : "Jugendamt Landkreis Müritz",
                            "vknr" : "78983"
                        },
                        {
                            "name" : "Gemeinde Eitorf Asylbewerber",
                            "vknr" : "27983"
                        }
                    ]
                },
                {
                    "serialNo" : "984",
                    "content" : [
                        {
                            "name" : "Stadtjugendamt Wismar",
                            "vknr" : "78984"
                        },
                        {
                            "name" : "Stadt Kaarst Asylbewerber",
                            "vknr" : "24984"
                        },
                        {
                            "name" : "Gemeindeverwaltung Weeze SoHi u. Asyl",
                            "vknr" : "25984"
                        },
                        {
                            "name" : "Asylstelle Stadt Bergkamen",
                            "vknr" : "18984"
                        },
                        {
                            "name" : "Stadt Hennef/Sieg Asylbewerber",
                            "vknr" : "27984"
                        },
                        {
                            "name" : "Stadt Würselen Asylbewerber",
                            "vknr" : "21984"
                        }
                    ]
                },
                {
                    "serialNo" : "985",
                    "content" : [
                        {
                            "name" : "Asylstelle Stadt Fröndenberg",
                            "vknr" : "18985"
                        },
                        {
                            "name" : "Stadt Königswinter Asylbewerber",
                            "vknr" : "27985"
                        },
                        {
                            "name" : "Stadt Korschenbroich Asylbewerber",
                            "vknr" : "24985"
                        },
                        {
                            "name" : "Sozialamt Gross-Gerau Stadt",
                            "vknr" : "39985"
                        }
                    ]
                },
                {
                    "serialNo" : "986",
                    "content" : [
                        {
                            "name" : "Stadt Meerbusch Asylbewerber",
                            "vknr" : "24986"
                        },
                        {
                            "name" : "Asylstelle Gemeinde Holzwickede",
                            "vknr" : "18986"
                        },
                        {
                            "name" : "Stadt Lohmar Asylbewerber",
                            "vknr" : "27986"
                        },
                        {
                            "name" : "Kreissozialamt Groß-Gerau",
                            "vknr" : "39986"
                        }
                    ]
                },
                {
                    "serialNo" : "987",
                    "content" : [
                        {
                            "name" : "Asylstelle Stadt Kamen",
                            "vknr" : "18987"
                        },
                        {
                            "name" : "Sozialamt Bischofsheim",
                            "vknr" : "39987"
                        },
                        {
                            "name" : "Stadt Rommerskirchen Asylbewerber",
                            "vknr" : "24987"
                        },
                        {
                            "name" : "Stadt Meckenheim Asylbewerber",
                            "vknr" : "27987"
                        }
                    ]
                },
                {
                    "serialNo" : "988",
                    "content" : [
                        {
                            "name" : "Asylstelle Stadt Lünen",
                            "vknr" : "18988"
                        },
                        {
                            "name" : "Stadt Xanten Sozialamt Asylbewerber",
                            "vknr" : "25988"
                        },
                        {
                            "name" : "Gemeinde Much Asylbewerber",
                            "vknr" : "27988"
                        },
                        {
                            "name" : "Bezirksregierung Arnsberg Asylbewerber",
                            "vknr" : "24988"
                        },
                        {
                            "name" : "Sozialamt Ginsheim-Gustavsburg",
                            "vknr" : "39988"
                        }
                    ]
                },
                {
                    "serialNo" : "989",
                    "content" : [
                        {
                            "name" : "Gemeinde Neunkirchen-Seelscheid Asyl",
                            "vknr" : "27989"
                        },
                        {
                            "name" : "Asylstelle Stadt Schwerte",
                            "vknr" : "18989"
                        },
                        {
                            "name" : "Sozialamt Raunheim",
                            "vknr" : "39989"
                        }
                    ]
                },
                {
                    "serialNo" : "990",
                    "content" : [
                        {
                            "name" : "Stadt Niederkassel Asylbewerber",
                            "vknr" : "27990"
                        },
                        {
                            "name" : "Asylstelle Stadt Selm",
                            "vknr" : "18990"
                        },
                        {
                            "name" : "Magistrat Rüsselsheim, FB Jug. u. Soz.",
                            "vknr" : "39990"
                        },
                        {
                            "name" : "KV Berlin Notdienstpraxis",
                            "vknr" : "72990"
                        }
                    ]
                },
                {
                    "serialNo" : "991",
                    "content" : [
                        {
                            "name" : "Stadt Rheinbach Asylbewerber",
                            "vknr" : "27991"
                        },
                        {
                            "name" : "Asylstelle Stadt Werne",
                            "vknr" : "18991"
                        },
                        {
                            "name" : "Kreisjugendamt Gross-Gerau",
                            "vknr" : "39991"
                        }
                    ]
                },
                {
                    "serialNo" : "992",
                    "content" : [
                        {
                            "name" : "Gemeinde Ruppichteroth Asylbewerber",
                            "vknr" : "27992"
                        },
                        {
                            "name" : "Bezirksregierung Arnsberg Asylbewerber",
                            "vknr" : "18992"
                        },
                        {
                            "name" : "Sozialamt Riedstadt",
                            "vknr" : "39992"
                        }
                    ]
                },
                {
                    "serialNo" : "993",
                    "content" : [
                        {
                            "name" : "Stadt Sankt Augustin Asylbewerber",
                            "vknr" : "27993"
                        },
                        {
                            "name" : "Sozialamt Mörfelden-Walldorf",
                            "vknr" : "39993"
                        }
                    ]
                },
                {
                    "serialNo" : "994",
                    "content" : [
                        {
                            "name" : "Oberkreisdirektor Siegburg Asylbewerber",
                            "vknr" : "27994"
                        },
                        {
                            "name" : "Sozialamt Gernsheim",
                            "vknr" : "39994"
                        }
                    ]
                },
                {
                    "serialNo" : "995",
                    "content" : [
                        {
                            "name" : "Obdachlosenbehandlung/BA Pankow",
                            "vknr" : "72995"
                        },
                        {
                            "name" : "Stadt Swisttal Asylbewerber",
                            "vknr" : "27995"
                        },
                        {
                            "name" : "Sozialamt Büttelborn",
                            "vknr" : "39995"
                        }
                    ]
                },
                {
                    "serialNo" : "996",
                    "content" : [
                        {
                            "name" : "Sozialamt Nauheim",
                            "vknr" : "39996"
                        },
                        {
                            "name" : "Stadt Troisdorf Asylbewerber",
                            "vknr" : "27996"
                        }
                    ]
                },
                {
                    "serialNo" : "997",
                    "content" : [
                        {
                            "name" : "Gemeinde Wachtberg Asylbewerber",
                            "vknr" : "27997"
                        },
                        {
                            "name" : "Sozialamt Kelsterbach",
                            "vknr" : "39997"
                        }
                    ]
                },
                {
                    "serialNo" : "998",
                    "content" : [
                        {
                            "name" : "Gemeinde Windeck Asylbewerber",
                            "vknr" : "27998"
                        },
                        {
                            "name" : "Sozialamt Trebur",
                            "vknr" : "39998"
                        },
                        {
                            "name" : "KVNO - Impffonds NRW",
                            "vknr" : "38998"
                        }
                    ]
                },
                {
                    "serialNo" : "999",
                    "content" : [
                        {
                            "name" : "KVNO-SSB",
                            "vknr" : "38999"
                        },
                        {
                            "name" : "KV Sachsen Landesgeschäftsstelle",
                            "vknr" : "98999"
                        },
                        {
                            "name" : "Sprechstundenbedarfsverwaltende Stelle ",
                            "vknr" : "40999"
                        },
                        {
                            "name" : "Fondsverwaltung - KVBW",
                            "vknr" : "61999"
                        },
                        {
                            "name" : "KVWL-Notdienstpauschale",
                            "vknr" : "20999"
                        }
                    ]
                }
            ]
        }];

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'InsuranceGroup_T',
                        lib: types
                    }
                },
                InsuranceGroup_T: {
                    name: {
                        type: 'String',
                        required: true,
                        i18n: i18n('insurancegroup-schema.InsuranceGroup_T.name')
                    },
                    items: {
                        "complex": "inc",
                        "type": "InsuranceGroupItem_T",
                        "lib": types,
                        i18n: i18n( 'insurancegroup-schema.InsuranceGroup_T.items' ),
                        "-en": "Einträge",
                        "-de": "Entries"
                    }
                },
                InsuranceGroupItem_T: {
                    serialNo: {
                        type: 'String',
                        i18n: i18n('insurancegroup-schema.InsuranceGroupItem_T.serialNo'),
                        "-en": "Seriennummer",
                        "-de": "Serial No."
                    },
                    content: {
                        "complex": "inc",
                        "type": "InsuranceGroupItemContent_T",
                        "lib": types,
                        i18n: i18n( 'insurancegroup-schema.InsuranceGroupItem_T.content' ),
                        "-en": "Inhalt",
                        "-de": "Content"
                    }
                },
                InsuranceGroupItemContent_T: {
                    name: {
                        type: 'String',
                        i18n: i18n('insurancegroup-schema.InsuranceGroupItemContent_T.name'),
                        "-en": "Name",
                        "-de": "Name"
                    },
                    vknr: {
                        type: 'String',
                        i18n: i18n('insurancegroup-schema.InsuranceGroupItemContent_T.vknr'),
                        "-en": "VKNR",
                        "-de": "VKNR"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            defaultItems: template,

            cacheQuery: true

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader'
        ]
    }
);
