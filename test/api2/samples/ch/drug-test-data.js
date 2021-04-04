/**
 * User: nicolas.pettican
 * Date: 24.04.20  16:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


'use strict';

const drug = {
        "icd10CodeList": [
            {
                "name": "Augenerkrankung durch Toxoplasmen",
                "icd10Code": "B58.0",
                "upperCode": "B58",
                "level": "SUB"
            },
            {
                "name": "Toxoplasmose",
                "icd10Code": "B58",
                "upperCode": "B50-B64",
                "level": "CAT"
            },
            {
                "name": "Protozoenkrankheiten",
                "icd10Code": "B50-B64",
                "upperCode": "A00-B99",
                "level": "GRP"
            },
            {
                "name": "Bestimmte infektiöse und parasitäre Krankheiten",
                "icd10Code": "A00-B99",
                "upperCode": "",
                "level": "CHP"
            },
            {
                "name": "Toxoplasmose, nicht näher bezeichnet",
                "icd10Code": "B58.9",
                "upperCode": "B58",
                "level": "SUB"
            },
            {
                "name": "Toxoplasmose",
                "icd10Code": "B58",
                "upperCode": "B50-B64",
                "level": "CAT"
            },
            {
                "name": "Protozoenkrankheiten",
                "icd10Code": "B50-B64",
                "upperCode": "A00-B99",
                "level": "GRP"
            },
            {
                "name": "Bestimmte infektiöse und parasitäre Krankheiten",
                "icd10Code": "A00-B99",
                "upperCode": "",
                "level": "CHP"
            },
            {
                "name": "Sonstige akute Infektionen an mehreren Lokalisationen der oberen Atemwege",
                "icd10Code": "J06.8",
                "upperCode": "J06",
                "level": "SUB"
            },
            {
                "name": "Akute Infektionen an mehreren oder nicht näher bezeichneten Lokalisationen der oberen Atemwege",
                "icd10Code": "J06",
                "upperCode": "J00-J06",
                "level": "CAT"
            },
            {
                "name": "Akute Infektionen der oberen Atemwege",
                "icd10Code": "J00-J06",
                "upperCode": "J00-J99",
                "level": "GRP"
            },
            {
                "name": "Krankheiten des Atmungssystems",
                "icd10Code": "J00-J99",
                "upperCode": "",
                "level": "CHP"
            },
            {
                "name": "Betreuung der Mutter bei (Verdacht auf) sonstige Anomalie oder Schädigung des Fetus",
                "icd10Code": "O35.8",
                "upperCode": "O35",
                "level": "SUB"
            },
            {
                "name": "Betreuung der Mutter bei festgestellter oder vermuteter Anomalie oder Schädigung des Fetus",
                "icd10Code": "O35",
                "upperCode": "O30-O48",
                "level": "CAT"
            },
            {
                "name": "Betreuung der Mutter im Hinblick auf den Fetus und die Amnionhöhle sowie mögliche Entbindungskomplikationen",
                "icd10Code": "O30-O48",
                "upperCode": "O00-O99",
                "level": "GRP"
            },
            {
                "name": "Schwangerschaft, Geburt und Wochenbett",
                "icd10Code": "O00-O99",
                "upperCode": "",
                "level": "CHP"
            }
        ],
        "company": "Teofarma S.R.I. Fabio Ferrara",
        "divisibility": "DIVISIBLE2",
        "atcCodeList": [
            {
                "name": "Spiramycin",
                "atcCode": "J01FA02",
                "upperCode": "J01FA",
                "level": "CS"
            },
            {
                "name": "Makrolide",
                "atcCode": "J01FA",
                "upperCode": "J01F",
                "level": "CTPU"
            },
            {
                "name": "Makrolide, Lincosamide und Streptogramine",
                "atcCode": "J01F",
                "upperCode": "J01",
                "level": "TPU"
            },
            {
                "name": "Antibiotika zur systemischen Anwendung",
                "atcCode": "J01",
                "upperCode": "J",
                "level": "TH"
            },
            {
                "name": "Antiinfektiva zur systemischen Anwendung",
                "atcCode": "J",
                "upperCode": "",
                "level": "AG"
            }
        ],
        "packageList": [
            {
                "pzn": "08645877",
                "pznOriginal": "",
                "name": "Rovamycine® 1 500 000 I.E. 30 Filmtbl. N2",
                "quantity": 30,
                "prices": {
                    "pricePatientPayment": 6.23,
                    "pricePharmacyBuy": 42.56,
                    "pricePharmacySale": 62.3
                }
            }
        ],
        "moleculeList": [
            {
                "name": "Spiramycin",
                "moleculeTypeCode": "A",
                "ingredientCode": [
                    {
                        "type": "MOLECULEID",
                        "value": 1401
                    }
                ],
                "strengthValue": "1,50",
                "strengthUnitCode": "MIOIE"
            },
            {
                "name": "Lactose",
                "moleculeTypeCode": "I",
                "ingredientCode": [
                    {
                        "type": "MOLECULEID",
                        "value": 1108
                    }
                ],
                "strengthValue": "",
                "strengthUnitCode": ""
            },
            {
                "name": "Weizenstärke",
                "moleculeTypeCode": "I",
                "ingredientCode": [
                    {
                        "type": "MOLECULEID",
                        "value": 16655
                    }
                ],
                "strengthValue": "",
                "strengthUnitCode": ""
            },
            {
                "name": "Siliciumdioxid hydrat",
                "moleculeTypeCode": "I",
                "ingredientCode": [
                    {
                        "type": "MOLECULEID",
                        "value": 25052
                    }
                ],
                "strengthValue": "",
                "strengthUnitCode": ""
            },
            {
                "name": "Magnesium stearat",
                "moleculeTypeCode": "I",
                "ingredientCode": [
                    {
                        "type": "MOLECULEID",
                        "value": 15923
                    }
                ],
                "strengthValue": "",
                "strengthUnitCode": ""
            },
            {
                "name": "Hypromellose",
                "moleculeTypeCode": "I",
                "ingredientCode": [
                    {
                        "type": "MOLECULEID",
                        "value": 10122
                    }
                ],
                "strengthValue": "",
                "strengthUnitCode": ""
            },
            {
                "name": "Macrogol 20.000",
                "moleculeTypeCode": "I",
                "ingredientCode": [
                    {
                        "type": "MOLECULEID",
                        "value": 19691
                    }
                ],
                "strengthValue": "",
                "strengthUnitCode": ""
            }
        ],
        "original": {
            "text_SPC_ORIGINAL_ID": null,
            "text_ATCTEXT_ID": null,
            "ID": 13954,
            "LIFESTYLE_FLAG": 0,
            "IMPORT_FLAG": 0,
            "BALANCEDDIETETICSADD_FLAG": 0,
            "COSMETICS_FLAG": 0,
            "DIETARYSUPPLEMENT_FLAG": 0,
            "BANDAGE_FLAG": 0,
            "DIPSTIC_FLAG": 0,
            "ADJUVANT_FLAG": 0,
            "DISPENSINGTYPECODE": "2",
            "HOMOEOPATHIC_FLAG": 0,
            "NAME": "Rovamycine® 1 500 000 I.E. Filmtbl.",
            "NEGATIVE_FLAG": 0,
            "PHARMACEUTICAL_FLAG": 1,
            "TRANSFUSIONLAW_FLAG": 0,
            "ANIMALPHARMACEUTICAL_FLAG": 0,
            "ANTHROPOSOPHIC_FLAG": 0,
            "COMPANYID": 13520,
            "DIETETICS_FLAG": 0,
            "HERBAL_FLAG": 0,
            "ICD10CODE_LIST": [
                {
                    "NAME": "Augenerkrankung durch Toxoplasmen",
                    "CODE": "B58.0",
                    "NAME_SORT": "B58.0",
                    "CATALOGID": 18,
                    "NAME_SHORT": "B58.0",
                    "UPPERCODE": "B58",
                    "PARENT": {
                        "NAME": "Toxoplasmose",
                        "CODE": "B58",
                        "NAME_SORT": "B58",
                        "CATALOGID": 18,
                        "NAME_SHORT": "B58",
                        "UPPERCODE": "B50-B64",
                        "PARENT": {
                            "NAME": "Protozoenkrankheiten",
                            "CODE": "B50-B64",
                            "NAME_SORT": "B50-B64",
                            "CATALOGID": 18,
                            "NAME_SHORT": "B50-B64",
                            "UPPERCODE": "A00-B99",
                            "PARENT": {
                                "NAME": "Bestimmte infektiöse und parasitäre Krankheiten",
                                "CODE": "A00-B99",
                                "NAME_SORT": "A00-B99",
                                "CATALOGID": 18,
                                "NAME_SHORT": "A00-B99"
                            }
                        }
                    }
                },
                {
                    "NAME": "Toxoplasmose, nicht näher bezeichnet",
                    "CODE": "B58.9",
                    "NAME_SORT": "B58.9",
                    "CATALOGID": 18,
                    "NAME_SHORT": "B58.9",
                    "UPPERCODE": "B58",
                    "PARENT": {
                        "NAME": "Toxoplasmose",
                        "CODE": "B58",
                        "NAME_SORT": "B58",
                        "CATALOGID": 18,
                        "NAME_SHORT": "B58",
                        "UPPERCODE": "B50-B64",
                        "PARENT": {
                            "NAME": "Protozoenkrankheiten",
                            "CODE": "B50-B64",
                            "NAME_SORT": "B50-B64",
                            "CATALOGID": 18,
                            "NAME_SHORT": "B50-B64",
                            "UPPERCODE": "A00-B99",
                            "PARENT": {
                                "NAME": "Bestimmte infektiöse und parasitäre Krankheiten",
                                "CODE": "A00-B99",
                                "NAME_SORT": "A00-B99",
                                "CATALOGID": 18,
                                "NAME_SHORT": "A00-B99"
                            }
                        }
                    }
                },
                {
                    "NAME": "Sonstige akute Infektionen an mehreren Lokalisationen der oberen Atemwege",
                    "CODE": "J06.8",
                    "NAME_SORT": "J06.8",
                    "CATALOGID": 18,
                    "NAME_SHORT": "J06.8",
                    "UPPERCODE": "J06",
                    "PARENT": {
                        "NAME": "Akute Infektionen an mehreren oder nicht näher bezeichneten Lokalisationen der oberen Atemwege",
                        "CODE": "J06",
                        "NAME_SORT": "J06",
                        "CATALOGID": 18,
                        "NAME_SHORT": "J06",
                        "UPPERCODE": "J00-J06",
                        "PARENT": {
                            "NAME": "Akute Infektionen der oberen Atemwege",
                            "CODE": "J00-J06",
                            "NAME_SORT": "J00-J06",
                            "CATALOGID": 18,
                            "NAME_SHORT": "J00-J06",
                            "UPPERCODE": "J00-J99",
                            "PARENT": {
                                "NAME": "Krankheiten des Atmungssystems",
                                "CODE": "J00-J99",
                                "NAME_SORT": "J00-J99",
                                "CATALOGID": 18,
                                "NAME_SHORT": "J00-J99"
                            }
                        }
                    }
                },
                {
                    "NAME": "Betreuung der Mutter bei (Verdacht auf) sonstige Anomalie oder Schädigung des Fetus",
                    "CODE": "O35.8",
                    "NAME_SORT": "O35.8",
                    "CATALOGID": 18,
                    "NAME_SHORT": "O35.8",
                    "UPPERCODE": "O35",
                    "PARENT": {
                        "NAME": "Betreuung der Mutter bei festgestellter oder vermuteter Anomalie oder Schädigung des Fetus",
                        "CODE": "O35",
                        "NAME_SORT": "O35",
                        "CATALOGID": 18,
                        "NAME_SHORT": "O35",
                        "UPPERCODE": "O30-O48",
                        "PARENT": {
                            "NAME": "Betreuung der Mutter im Hinblick auf den Fetus und die Amnionhöhle sowie mögliche Entbindungskomplikationen",
                            "CODE": "O30-O48",
                            "NAME_SORT": "O30-O48",
                            "CATALOGID": 18,
                            "NAME_SHORT": "O30-O48",
                            "UPPERCODE": "O00-O99",
                            "PARENT": {
                                "NAME": "Schwangerschaft, Geburt und Wochenbett",
                                "CODE": "O00-O99",
                                "NAME_SORT": "O00-O99",
                                "CATALOGID": 18,
                                "NAME_SHORT": "O00-O99"
                            }
                        }
                    }
                }
            ],
            "ICONCODE_LIST": [
                "AM",
                "RP",
                "SCHW",
                "STILL",
                "TL2",
                "TLGD"
            ],
            "NAME_HTML": "Rovamycine® 1 500 000 I.E. Filmtbl.",
            "NAME_SORT": "ROVAMYCINE 00001 00500 00000 I.E. FILMTBL.",
            "PHYTOPHARMACEUTICAL_FLAG": 0,
            "PRISCUS_FLAG": 0,
            "RECIPET_FLAG": 0,
            "PACKAGE_LIST": [
                {
                    "ID": 11233,
                    "CUSTOM_FLAG": 0,
                    "SALESSTATUSCODE": "N",
                    "SIZE_AMOUNT": 30,
                    "SIZE_NORMSIZECODE": "2",
                    "SIZE_UNITCODE": "st",
                    "PZN": "08645877",
                    "NAME": "Rovamycine® 1 500 000 I.E. 30 Filmtbl. N2",
                    "ONMARKETDATE": 895183200000,
                    "NAME_SORT": "00010",
                    "pricePatientPayment": 6.23,
                    "pricePharmacyBuy": 42.56,
                    "pricePharmacySale": 62.3,
                    "PATIENTPAYMENTHINT": "AVP>=50,00 => ZuZa=AVP/10=6,23"
                }
            ],
            "ITEM_LIST": [
                {
                    "ID": 1395401,
                    "PRODUCTID": 13954,
                    "ATCCODE_LIST": [
                        {
                            "NAME": "Spiramycin",
                            "CODE": "J01FA02",
                            "NAME_SORT": "J01FA02",
                            "CATALOGID": 17,
                            "NAME_SHORT": "J01FA02",
                            "UPPERCODE": "J01FA",
                            "PARENT": {
                                "NAME": "Makrolide",
                                "CODE": "J01FA",
                                "NAME_SORT": "J01FA",
                                "CATALOGID": 17,
                                "NAME_SHORT": "J01FA",
                                "UPPERCODE": "J01F",
                                "PARENT": {
                                    "NAME": "Makrolide, Lincosamide und Streptogramine",
                                    "CODE": "J01F",
                                    "NAME_SORT": "J01F",
                                    "CATALOGID": 17,
                                    "NAME_SHORT": "J01F",
                                    "UPPERCODE": "J01",
                                    "PARENT": {
                                        "NAME": "Antibiotika zur systemischen Anwendung",
                                        "CODE": "J01",
                                        "NAME_SORT": "J01",
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01",
                                        "UPPERCODE": "J",
                                        "PARENT": {
                                            "NAME": "Antiinfektiva zur systemischen Anwendung",
                                            "CODE": "J",
                                            "NAME_SORT": "J",
                                            "CATALOGID": 17,
                                            "NAME_SHORT": "J"
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    "BASECOUNT": 1,
                    "BREAKLINETYPECODE": "B",
                    "DIVISIBILITYTYPECODE": "E",
                    "DIVISIBLE_FLAG": 1,
                    "DIVISIBLE2_FLAG": 1,
                    "ITEMROACODE": "18",
                    "ITEMROA_LIST": [
                        "18"
                    ],
                    "PHARMFORMCODE": "014",
                    "IDENTA": {
                        "custom_FLAG": null
                    },
                    "COMPOSITIONELEMENTS_LIST": [
                        {
                            "ID": 4589,
                            "MASSFROM": 1.5,
                            "MOLECULEID": 1401,
                            "MOLECULENAME": "Spiramycin",
                            "MOLECULETYPECODE": "A",
                            "MOLECULEUNITCODE": "MIOIE"
                        },
                        {
                            "ID": 168,
                            "MOLECULEID": 1108,
                            "MOLECULENAME": "Lactose",
                            "MOLECULETYPECODE": "I"
                        },
                        {
                            "ID": 1333,
                            "MOLECULEID": 16655,
                            "MOLECULENAME": "Weizenstärke",
                            "MOLECULETYPECODE": "I"
                        },
                        {
                            "ID": 155,
                            "MOLECULEID": 25052,
                            "MOLECULENAME": "Siliciumdioxid hydrat",
                            "MOLECULETYPECODE": "I"
                        },
                        {
                            "ID": 9,
                            "MOLECULEID": 15923,
                            "MOLECULENAME": "Magnesium stearat",
                            "MOLECULETYPECODE": "I"
                        },
                        {
                            "ID": 10,
                            "MOLECULEID": 10122,
                            "MOLECULENAME": "Hypromellose",
                            "MOLECULETYPECODE": "I"
                        },
                        {
                            "ID": 719,
                            "MOLECULEID": 19691,
                            "MOLECULENAME": "Macrogol 20.000",
                            "MOLECULETYPECODE": "I"
                        }
                    ],
                    "DESCRIPTIONSPC": "Die Filmtablette ist mit einer Bruchrille versehen.",
                    "NAME": "1 Filmtbl.",
                    "NAME_SORT": "00010"
                }
            ],
            "ADDITIONALFLAGS": [
                {
                    "NAME": "CHEMICAL_FLAG",
                    "VALUE": "0"
                },
                {
                    "NAME": "CONTRACEPTIVE_FLAG",
                    "VALUE": "0"
                },
                {
                    "NAME": "BIOCIDAL_FLAG",
                    "VALUE": "0"
                },
                {
                    "NAME": "PLANTPROTECTIVE_FLAG",
                    "VALUE": "0"
                },
                {
                    "NAME": "FOODTYPECODE",
                    "VALUE": "N"
                },
                {
                    "NAME": "MEDIAOBJECT_FLAG",
                    "VALUE": "0"
                }
            ],
            "COMPANYNAME": "Teofarma S.R.I. Fabio Ferrara",
            "CUSTOM_FLAG": 0,
            "ACTIVESUBSTANCE_COUNT": 1,
            "EXCEPTIONLIST_FLAG": 0,
            "MEDICINEPRODUCT_FLAG": 0,
            "MEDICINEPRODUCTEXCEPTION_FLAG": 0,
            "OTC_FLAG": 0,
            "TEXT_SPC_ID": 194138,
            "COMPANYSALE_LIST": [],
            "IDENTAPICTURE_FLAG": 0,
            "OTX_FLAG": 0,
            "amr": []
        },
        "documents": {
            "BI": [
                {
                    "title": "Zusammensetzung",
                    "content": "<p>1 Filmtablette Rovamycine&reg; 1 500 000 I.E. enth&auml;lt 375 mg Spiramycin Sonstige Bestandteile: Rovamycine&reg; 1 500 000 I.E. enth&auml;lt Lactose-Monohydrat und Weizenst&auml;rke.<br /> Die vollst&auml;ndige Auflistung der sonstigen Bestandteile siehe Abschnitt 6.1.</p> <BR/><p>Lactose-Monohydrat, Siliciumdioxid-Hydrat, Magnesiumstearat (Ph.Eur.), Weizenst&auml;rke, Hypromellose, Macrogol 20000.</p> "
                },
                {
                    "title": "Anwendung",
                    "content": "<p>Spiramycin kann angewendet werden bei:<br /> - Staphylokokkeninfektionen nach vorheriger mikrobiologischer Austestung, wenn Erythromycin, betalaktamasefeste Penicilline oder Cephalosporine nicht wirksam sind.<br /> - Tonsillo-Pharyngitis und bronchopulmonalen Infektionen, wenn andere wirksame Antibiotika nicht anwendbar sind.<br /> - Akuter Toxoplasmose, vor allem in der Fr&uuml;hschwangerschaft (Behandlungsbeginn vor der 20. Schwangerschaftswoche), sowie bei akuter Toxoplasmose der Augen, wenn Pyrimethamin und/oder ein Sulfonamid nicht anwendbar sind.<br /> Es sind die jeweils geltenden offiziellen/nationalen Richtlinien zur antibakteriellen Resistenz sowie zur sachgerechten Anwendung und Verordnung von Antibiotika zu beachten.</p> "
                },
                {
                    "title": "Gegenanzeigen",
                    "content": "<p>Rovamycine&reg; 1 500 000 I.E. darf nicht eingenommen werden bei:<br />- &Uuml;berempfindlichkeit gegen&uuml;ber Spiramycin, einem anderen Makrolidantibiotikum, Weizenst&auml;rke oder einem der sonstigen Bestandteile.</p> "
                },
                {
                    "title": "Schwangerschaft",
                    "content": "<p>Schwangerschaft:<br /> Tierexperimentelle Studien und Erfahrungen bei der Anwendung an Schwangeren ergaben bisher keine Hinweise auf eine fetale Sch&auml;digung. Eine Anwendung w&auml;hrend der Schwangerschaft ist bei entsprechender Indikation m&ouml;glich (siehe Abschnitt 5.3).<br /> Es kann nicht ausgeschlossen werden, da&szlig; die Wirksamkeit oraler Kontrazeptiva durch die gleichzeitige Einnahme von Rovamycine&reg; 1 500 000 I.E. beeintr&auml;chtigt wird (siehe Abschnitt 4.5).<br /> Stillzeit:<br /> Spiramycin geht in bakteriostatisch wirksamen Konzentrationen in die Muttermilch &uuml;ber. Da Spiramycin in die Muttermilch &uuml;bertritt, kann es beim gestillten S&auml;ugling zu Magen-Darm-St&ouml;rungen kommen. Ist eine Behandlung w&auml;hrend der Stillzeit erforderlich, sollte abgestillt werden.</p> "
                },
                {
                    "title": "Nebenwirkungen",
                    "content": "<p>Bei der Bewertung von Nebenwirkungen werden folgende H&auml;ufigkeiten zugrunde gelegt:<br /> Sehr h&auml;ufig: (&ge; 1/10)<br /> H&auml;ufig: (&ge; 1/100 bis &lt; 1/10)<br /> Gelegentlich: (&ge; 1/1.000 bis &lt; 1/100)<br /> Selten: (&ge; 1/10.000 bis &lt; 1/1.000)<br /> Sehr selten: (&lt; 1/10.000)<br /> Nicht bekannt (H&auml;ufigkeit auf Grundlage der verf&uuml;gbaren Daten nicht absch&auml;tzbar)<br /> <br />Magen-Darm-Trakt<br /> H&auml;ufig, besonders aber bei h&ouml;herer Dosierung, kommt es zu &Uuml;belkeit, Erbrechen, Bauchschmerzen und Durchfall. Bei anhaltenden, blutig-schleimigen Durchf&auml;llen mit Koliken ist an eine pseudomembran&ouml;se Kolitis zu denken. Die Therapie mit Spiramycin mu&szlig; dann sofort abgebrochen und eine entsprechende Therapie (z. B. Vancomycin 4mal 250 mg/Tag oral) eingeleitet werden.<br /> <br />Wirkungen auf die Leber<br /> Gelegentlich k&ouml;nnen Lebersch&auml;den und Leberfunktionsst&ouml;rungen auftreten. Bei einer entsprechenden Symptomatik sollte die Therapie mit Rovamycine&reg; 1 500 000 I.E. abgebrochen werden.<br /> <br />Wirkungen auf das Nervensystem <br />Gelegentlich kann es zu Par&auml;sthesien kommen.<br /> <br />&Uuml;berempfindlichkeitsreaktionen<br /> Allergische Nebenwirkungen, wie z.B. Exantheme, Urtikaria oder Pruritus, kommen gelegentlich vor. Sehr selten kann es zu Fieber, zu einem angioneurotischen &Ouml;dem (Quincke-&Ouml;dem) oder zum anaphylaktischen Schock kommen. Weizenst&auml;rke kann &Uuml;berempfindlichkeitsreaktionen hervorrufen.<br /><br /> Wirkungen auf das Blut<br /> In sehr seltenen F&auml;llen kann es zu einer akuten H&auml;molyse kommen (siehe auch Abschnitt 4.4).<br /> <b><br />Meldung des Verdachts auf Nebenwirkungen</b><br /> Die Meldung des Verdachts auf Nebenwirkungen nach der Zulassung ist von gro&szlig;er Wichtigkeit. Sie erm&ouml;glicht eine kontinuierliche &Uuml;berwachung des Nutzen-Risiko-Verh&auml;ltnisses des Arzneimittels. Angeh&ouml;rige von Gesundheitsberufen sind aufgefordert, jeden Verdachtsfall einer Nebenwirkung dem Bundesinstitut f&uuml;r Arzneimittel und Medizinprodukte, Abt. Pharmakovigilanz, Kurt-Georg-Kiesinger-Allee 3, D-53175 Bonn, Website: www.bfarm.de anzuzeigen.</p> "
                },
                {
                    "title": "Wechselwirkungen",
                    "content": "<p>Spiramycin/Lincomycin/Clindamycin<br /> Bei gleichzeitiger Gabe von Spiramycin und Lincomycin bzw. Clindamycin kann hinsichtlich der bakteriellen Wirkung ein antagonistischer Effekt auftreten.<br /> Eine Kombination mit diesen Wirkstoffen sollte deshalb vermieden werden.<br /> Spiramycin/Dihydroergotamin/Mutterkornalkaloide<br /> Bei gleichzeitiger Gabe von Dihydroergotamin oder einem nichthydrierten Mutterkornalkaloid und Spiramycin kann es zu einer Verst&auml;rkung der vasokonstriktorischen Wirkung kommen.<br /> Spiramycin/Methylprednisolon/Carbamazepin/Cumarine/Digoxin<br /> Bei einer Therapie mit Spiramycin ist die Verz&ouml;gerung der Elimination von Methylprednisolon, Carbamazepin und Antikoagulantien vom Cumarintyp sowie eine Erh&ouml;hung der Digoxin-Spiegel bei einem Teil der Patienten nicht auszuschlie&szlig;en.<br /> Orale Kontrazeptiva<br /> Es kann nicht ausgeschlossen werden, dass die Wirksamkeit oraler Kontrazeptiva durch die gleichzeitige Einnahme von Rovamycine&reg; 1 500 000 I.E. beeintr&auml;chtigt wird, (siehe Abschnitt 4.6)<br /> Spiramycin/Fluphenazin<br /> Die gleichzeitige Gabe von Spiramycin und Fluphenazin kann zu einer akuten Spannungs- und Bewegungsst&ouml;rung f&uuml;hren.<br /> Spiramycin/Mequitazin<br /> Bei gleichzeitiger Anwendung von Spiramycin und Mequitazin &uuml;ber 48 Stunden kann es bei angeborener QT-Zeitverl&auml;ngerung zu Kammertachykardien vom Typ &bdquo;Torsades de pointes\" kommen.</p> "
                },
                {
                    "title": "Warnhinweise und Vorsichtsmaßnahmen für die Anwendung",
                    "content": "<p>Spiramycin sollte nicht bei Patienten mit Glukose-6-Phosphat-Dehydrogenase-Mangel angewendet werden, da in sehr seltenen F&auml;llen akute H&auml;molysen berichtet wurden.<br /> Bei schweren Leberfunktionsst&ouml;rungen sollte die Therapie mit Rovamycine&reg; 1 500 000 I.E. nur unter &auml;rztlicher &Uuml;berwachung erfolgen.<br /> Rovamycine&reg;Rovamycine 1 500 000 I.E. ist f&uuml;r Kinder unter 6 Jahren nicht geeignet (siehe Abschnitt 4.2).<br /> Weizenst&auml;rke kann geringe Mengen Gluten enthalten, die aber auch f&uuml;r Patienten, die an Z&ouml;liakie leiden, als vertr&auml;glich gelten.<br /> Patienten mit der seltenen heredit&auml;ren Galactose-Intoleranz, Lactase-Mangel oder Glucose-Galactose-Malabsorption sollten Rovamycine&reg; 1 500 000 I.E. nicht einnehmen.</p> "
                },
                {
                    "title": "Dosierung",
                    "content": "<p>Bei Allgemeininfektionen betr&auml;gt die durchschnittliche Tagesdosis f&uuml;r Erwachsene und Jugendliche ab 12 Jahren 6 Mio. I.E. Spiramycin (4x1 Filmtablette Rovamycine&reg; 1 500 000 I.E).<br /> F&uuml;r Erwachsene ist bei schweren Erkrankungen eine Verdoppelung der Dosis auf 12 Mio. I.E. (entspr. 4x2 Filmtabletten Rovamycine&reg; 1 500 000 I.E pro Tag) m&ouml;glich.<br /> Bei Toxoplasmose erhalten Erwachsene eine orale Tagesdosis von 9 Mio. I.E. (entspr. 2 mal 2 und 2 mal 1 Filmtablette Rovamycine&reg; 1 500 000 I.E. Diese Dosierung wird ebenfalls f&uuml;r die Fr&uuml;hschwangerschaft (Behandlungsbeginn vor der 20. Schwangerschaftswoche) empfohlen. Die Kombination mit einem Sulfonamid ist m&ouml;glich.<br /> Die Filmtabletten werden unzerkaut mit reichlich Fl&uuml;ssigkeit eingenommen. Gleichzeitige Nahrungsaufnahme beeinflusst die Resorption nicht.<br /> Die Dauer der Therapie richtet sich nach Art und Schwere der Erkrankung. Nach Abklingen der Krankheitserscheinungen sollten die Tabletten noch 2 - 3 Tage eingenommen werden.<br /> Bei Infektionen mit &szlig;-h&auml;molysierenden Streptokokken der serologischen Gruppe A sollte die Therapiedauer aus Sicherheitsgr&uuml;nden nicht k&uuml;rzer als 10 Tage sein, um Sp&auml;tkomplikationen (Rheumatisches Fieber, Glomerulonephritis) vorzubeugen.<br /> Bei der Toxoplasmose betr&auml;gt die Therapiedauer 4 Wochen. Nach einem zweiw&ouml;chigen einnahmefreien Intervall kann die Behandlung wiederholt werden.<br /> Zur Behandlung der Toxoplasmose in der Fr&uuml;hschwangerschaft (Behandlungsbeginn vor der 20. Schwangerschaftswoche) wird eine Therapiedauer von 3 Wochen empfohlen.<br /> Rovamycine&reg; 1 500 000 I.E. ist f&uuml;r Kinder unter 6 Jahren nicht geeignet (siehe Abschnitt 4.4).</p> "
                }
            ],
            "SPC": [
                {
                    "title": "Fachinformation",
                    "content": "<p><b>Teofarma S.r.l.<br /> </b><b> Rovamycine&reg; 1 500 000 I.E. Filmtabletten </b></p> "
                },
                {
                    "title": "1.       BEZEICHNUNG DES ARZNEIMITTELS",
                    "content": "<p><b>Rovamycine&reg; 1 500 000 I.E.</b> Filmtabletten<br />Wirkstoff: Spiramycin</p> "
                },
                {
                    "title": "2.       QUALITATIVE UND QUANTITATIVE ZUSAMMENSETZUNG",
                    "content": "<p>1 Filmtablette Rovamycine&reg; 1 500 000 I.E. enth&auml;lt 375 mg Spiramycin Sonstige Bestandteile: Rovamycine&reg; 1 500 000 I.E. enth&auml;lt Lactose-Monohydrat und Weizenst&auml;rke.<br /> Die vollst&auml;ndige Auflistung der sonstigen Bestandteile siehe Abschnitt 6.1.</p> "
                },
                {
                    "title": "3.       DARREICHUNGSFORM",
                    "content": "<p>Filmtabletten.<br /> Die Filmtablette ist mit einer Bruchrille versehen. Die Filmtablette kann in gleiche H&auml;lften geteilt werden.</p> "
                },
                {
                    "title": "4.       KLINISCHE ANGABEN",
                    "content": "<p></p> "
                },
                {
                    "title": "4.1     Anwendungsgebiete",
                    "content": "<p>Spiramycin kann angewendet werden bei:<br /> - Staphylokokkeninfektionen nach vorheriger mikrobiologischer Austestung, wenn Erythromycin, betalaktamasefeste Penicilline oder Cephalosporine nicht wirksam sind.<br /> - Tonsillo-Pharyngitis und bronchopulmonalen Infektionen, wenn andere wirksame Antibiotika nicht anwendbar sind.<br /> - Akuter Toxoplasmose, vor allem in der Fr&uuml;hschwangerschaft (Behandlungsbeginn vor der 20. Schwangerschaftswoche), sowie bei akuter Toxoplasmose der Augen, wenn Pyrimethamin und/oder ein Sulfonamid nicht anwendbar sind.<br /> Es sind die jeweils geltenden offiziellen/nationalen Richtlinien zur antibakteriellen Resistenz sowie zur sachgerechten Anwendung und Verordnung von Antibiotika zu beachten.</p> "
                },
                {
                    "title": "4.2     Dosierung, Art und Dauer der Anwendung",
                    "content": "<p>Bei Allgemeininfektionen betr&auml;gt die durchschnittliche Tagesdosis f&uuml;r Erwachsene und Jugendliche ab 12 Jahren 6 Mio. I.E. Spiramycin (4x1 Filmtablette Rovamycine&reg; 1 500 000 I.E).<br /> F&uuml;r Erwachsene ist bei schweren Erkrankungen eine Verdoppelung der Dosis auf 12 Mio. I.E. (entspr. 4x2 Filmtabletten Rovamycine&reg; 1 500 000 I.E pro Tag) m&ouml;glich.<br /> Bei Toxoplasmose erhalten Erwachsene eine orale Tagesdosis von 9 Mio. I.E. (entspr. 2 mal 2 und 2 mal 1 Filmtablette Rovamycine&reg; 1 500 000 I.E. Diese Dosierung wird ebenfalls f&uuml;r die Fr&uuml;hschwangerschaft (Behandlungsbeginn vor der 20. Schwangerschaftswoche) empfohlen. Die Kombination mit einem Sulfonamid ist m&ouml;glich.<br /> Die Filmtabletten werden unzerkaut mit reichlich Fl&uuml;ssigkeit eingenommen. Gleichzeitige Nahrungsaufnahme beeinflusst die Resorption nicht.<br /> Die Dauer der Therapie richtet sich nach Art und Schwere der Erkrankung. Nach Abklingen der Krankheitserscheinungen sollten die Tabletten noch 2 - 3 Tage eingenommen werden.<br /> Bei Infektionen mit &szlig;-h&auml;molysierenden Streptokokken der serologischen Gruppe A sollte die Therapiedauer aus Sicherheitsgr&uuml;nden nicht k&uuml;rzer als 10 Tage sein, um Sp&auml;tkomplikationen (Rheumatisches Fieber, Glomerulonephritis) vorzubeugen.<br /> Bei der Toxoplasmose betr&auml;gt die Therapiedauer 4 Wochen. Nach einem zweiw&ouml;chigen einnahmefreien Intervall kann die Behandlung wiederholt werden.<br /> Zur Behandlung der Toxoplasmose in der Fr&uuml;hschwangerschaft (Behandlungsbeginn vor der 20. Schwangerschaftswoche) wird eine Therapiedauer von 3 Wochen empfohlen.<br /> Rovamycine&reg; 1 500 000 I.E. ist f&uuml;r Kinder unter 6 Jahren nicht geeignet (siehe Abschnitt 4.4).</p> "
                },
                {
                    "title": "4.3     Gegenanzeigen",
                    "content": "<p>Rovamycine&reg; 1 500 000 I.E. darf nicht eingenommen werden bei:<br />- &Uuml;berempfindlichkeit gegen&uuml;ber Spiramycin, einem anderen Makrolidantibiotikum, Weizenst&auml;rke oder einem der sonstigen Bestandteile.</p> "
                },
                {
                    "title": "4.4     Besondere Warnhinweise und Vorsichtsma&szlig;nahmen f&uuml;r die Anwendung",
                    "content": "<p>Spiramycin sollte nicht bei Patienten mit Glukose-6-Phosphat-Dehydrogenase-Mangel angewendet werden, da in sehr seltenen F&auml;llen akute H&auml;molysen berichtet wurden.<br /> Bei schweren Leberfunktionsst&ouml;rungen sollte die Therapie mit Rovamycine&reg; 1 500 000 I.E. nur unter &auml;rztlicher &Uuml;berwachung erfolgen.<br /> Rovamycine&reg;Rovamycine 1 500 000 I.E. ist f&uuml;r Kinder unter 6 Jahren nicht geeignet (siehe Abschnitt 4.2).<br /> Weizenst&auml;rke kann geringe Mengen Gluten enthalten, die aber auch f&uuml;r Patienten, die an Z&ouml;liakie leiden, als vertr&auml;glich gelten.<br /> Patienten mit der seltenen heredit&auml;ren Galactose-Intoleranz, Lactase-Mangel oder Glucose-Galactose-Malabsorption sollten Rovamycine&reg; 1 500 000 I.E. nicht einnehmen.</p> "
                },
                {
                    "title": "4.5    Wechselwirkungen mit anderen Arzneimitteln und sonstige Wechselwirkungen",
                    "content": "<p>Spiramycin/Lincomycin/Clindamycin<br /> Bei gleichzeitiger Gabe von Spiramycin und Lincomycin bzw. Clindamycin kann hinsichtlich der bakteriellen Wirkung ein antagonistischer Effekt auftreten.<br /> Eine Kombination mit diesen Wirkstoffen sollte deshalb vermieden werden.<br /> Spiramycin/Dihydroergotamin/Mutterkornalkaloide<br /> Bei gleichzeitiger Gabe von Dihydroergotamin oder einem nichthydrierten Mutterkornalkaloid und Spiramycin kann es zu einer Verst&auml;rkung der vasokonstriktorischen Wirkung kommen.<br /> Spiramycin/Methylprednisolon/Carbamazepin/Cumarine/Digoxin<br /> Bei einer Therapie mit Spiramycin ist die Verz&ouml;gerung der Elimination von Methylprednisolon, Carbamazepin und Antikoagulantien vom Cumarintyp sowie eine Erh&ouml;hung der Digoxin-Spiegel bei einem Teil der Patienten nicht auszuschlie&szlig;en.<br /> Orale Kontrazeptiva<br /> Es kann nicht ausgeschlossen werden, dass die Wirksamkeit oraler Kontrazeptiva durch die gleichzeitige Einnahme von Rovamycine&reg; 1 500 000 I.E. beeintr&auml;chtigt wird, (siehe Abschnitt 4.6)<br /> Spiramycin/Fluphenazin<br /> Die gleichzeitige Gabe von Spiramycin und Fluphenazin kann zu einer akuten Spannungs- und Bewegungsst&ouml;rung f&uuml;hren.<br /> Spiramycin/Mequitazin<br /> Bei gleichzeitiger Anwendung von Spiramycin und Mequitazin &uuml;ber 48 Stunden kann es bei angeborener QT-Zeitverl&auml;ngerung zu Kammertachykardien vom Typ &bdquo;Torsades de pointes\" kommen.</p> "
                },
                {
                    "title": "4.6    Schwangerschaft und Stillzeit",
                    "content": "<p>Schwangerschaft:<br /> Tierexperimentelle Studien und Erfahrungen bei der Anwendung an Schwangeren ergaben bisher keine Hinweise auf eine fetale Sch&auml;digung. Eine Anwendung w&auml;hrend der Schwangerschaft ist bei entsprechender Indikation m&ouml;glich (siehe Abschnitt 5.3).<br /> Es kann nicht ausgeschlossen werden, da&szlig; die Wirksamkeit oraler Kontrazeptiva durch die gleichzeitige Einnahme von Rovamycine&reg; 1 500 000 I.E. beeintr&auml;chtigt wird (siehe Abschnitt 4.5).<br /> Stillzeit:<br /> Spiramycin geht in bakteriostatisch wirksamen Konzentrationen in die Muttermilch &uuml;ber. Da Spiramycin in die Muttermilch &uuml;bertritt, kann es beim gestillten S&auml;ugling zu Magen-Darm-St&ouml;rungen kommen. Ist eine Behandlung w&auml;hrend der Stillzeit erforderlich, sollte abgestillt werden.</p> "
                },
                {
                    "title": "4.7    Auswirkungen auf die Verkehrst&uuml;chtigkeit und die F&auml;higkeit zum Bedienen von Maschinen",
                    "content": "<p>Es gibt bisher keine Hinweise darauf, dass unter der Therapie mit Rovamycine&reg; 1 500 0001. E. die F&auml;higkeit zur aktiven Teilnahme am Stra&szlig;enverkehr oder zur Bedienung von Maschinen beeintr&auml;chtigt ist.</p> "
                },
                {
                    "title": "4.8    Nebenwirkungen",
                    "content": "<p>Bei der Bewertung von Nebenwirkungen werden folgende H&auml;ufigkeiten zugrunde gelegt:<br /> Sehr h&auml;ufig: (&ge; 1/10)<br /> H&auml;ufig: (&ge; 1/100 bis &lt; 1/10)<br /> Gelegentlich: (&ge; 1/1.000 bis &lt; 1/100)<br /> Selten: (&ge; 1/10.000 bis &lt; 1/1.000)<br /> Sehr selten: (&lt; 1/10.000)<br /> Nicht bekannt (H&auml;ufigkeit auf Grundlage der verf&uuml;gbaren Daten nicht absch&auml;tzbar)<br /> <br />Magen-Darm-Trakt<br /> H&auml;ufig, besonders aber bei h&ouml;herer Dosierung, kommt es zu &Uuml;belkeit, Erbrechen, Bauchschmerzen und Durchfall. Bei anhaltenden, blutig-schleimigen Durchf&auml;llen mit Koliken ist an eine pseudomembran&ouml;se Kolitis zu denken. Die Therapie mit Spiramycin mu&szlig; dann sofort abgebrochen und eine entsprechende Therapie (z. B. Vancomycin 4mal 250 mg/Tag oral) eingeleitet werden.<br /> <br />Wirkungen auf die Leber<br /> Gelegentlich k&ouml;nnen Lebersch&auml;den und Leberfunktionsst&ouml;rungen auftreten. Bei einer entsprechenden Symptomatik sollte die Therapie mit Rovamycine&reg; 1 500 000 I.E. abgebrochen werden.<br /> <br />Wirkungen auf das Nervensystem <br />Gelegentlich kann es zu Par&auml;sthesien kommen.<br /> <br />&Uuml;berempfindlichkeitsreaktionen<br /> Allergische Nebenwirkungen, wie z.B. Exantheme, Urtikaria oder Pruritus, kommen gelegentlich vor. Sehr selten kann es zu Fieber, zu einem angioneurotischen &Ouml;dem (Quincke-&Ouml;dem) oder zum anaphylaktischen Schock kommen. Weizenst&auml;rke kann &Uuml;berempfindlichkeitsreaktionen hervorrufen.<br /><br /> Wirkungen auf das Blut<br /> In sehr seltenen F&auml;llen kann es zu einer akuten H&auml;molyse kommen (siehe auch Abschnitt 4.4).<br /> <b><br />Meldung des Verdachts auf Nebenwirkungen</b><br /> Die Meldung des Verdachts auf Nebenwirkungen nach der Zulassung ist von gro&szlig;er Wichtigkeit. Sie erm&ouml;glicht eine kontinuierliche &Uuml;berwachung des Nutzen-Risiko-Verh&auml;ltnisses des Arzneimittels. Angeh&ouml;rige von Gesundheitsberufen sind aufgefordert, jeden Verdachtsfall einer Nebenwirkung dem Bundesinstitut f&uuml;r Arzneimittel und Medizinprodukte, Abt. Pharmakovigilanz, Kurt-Georg-Kiesinger-Allee 3, D-53175 Bonn, Website: www.bfarm.de anzuzeigen.</p> "
                },
                {
                    "title": "4.9    &Uuml;berdosierung",
                    "content": "<p>Berichte &uuml;ber Vergiftungsf&auml;lle mit Spiramycin liegen nicht vor. Ein spezifisches Antidot ist nicht bekannt.</p> "
                },
                {
                    "title": "5. PHARMAKOLOGISCHE EIGENSCHAFTEN",
                    "content": "<p>&#65279;</p> "
                },
                {
                    "title": "5.1    Pharmakodynamische Eigenschaften",
                    "content": "<p>Pharmakotherapeutische Gruppe: Makrolide, Lincosamide and Streptogramine <br />ATC-Code: J01FA02<br /> <br />Wirkmechanismus:<br /> Spiramycin ist ein Fermentierungsprodukt von Streptomyces ambofaciens. Die therapeutisch eingesetzte Mixtur enth&auml;lt drei Spiramycine, mit Spiramycin 1 als vorherrschender Komponente. Spiramycin geh&ouml;rt zur Substanzklasse der Makrolid-Antibiotika, die als Hemmstoffe der Proteinsynthese gelten. Makrolide binden an die 50S-Untereinheit des Bakterienribosoms an sich &uuml;berschneidenden, aber nicht identischen Bindungsstellen in der zentralen Loop-Region der Dom&auml;ne V der Untereinheit (Basenmutationen in diesem Bereich &uuml;bertragen eine Kreuzresistenz auf verschiedene Makrolide). Sie binden dicht am Peptidyltransferasezentrum, das vollst&auml;ndig aus RNA besteht und die Bildung von Peptidbindungen w&auml;hrend der Elongation katalysiert. <br />Dieser Wirkmechanismus kennzeichnet alle MLSB (Makrolid-Lincosamid-Streptogramin-B)-Antibiotika und wird durch den zwischen dem Peptidyltransferasezentrum und dem Wirkstoff innerhalb des Ribosoms bestehenden Raum moduliert. Durch die Blockade des Ausgangs des Polypeptidtunnels, die eine fr&uuml;hzeitige Freisetzung von Peptidyl-tRNA ausl&ouml;st, hemmen Makrolide die Verl&auml;ngerung der Peptidkette. Dar&uuml;ber hinaus wurde gezeigt, dass das Ribosomen-Assembly im fr&uuml;hen Stadium der Proteinsynthese verhindert wird. In therapeutischen Konzentrationen wirkt Spiramycin prim&auml;r bakteriostatisch. Da Lincomycin, Clindamycin und Spiramycin das Assembly der 50S-Untereinheit beeinflussen k&ouml;nnen, k&ouml;nnte die Behandlung bezogen auf die antibakterielle Funktion dieser Substanzen antagonistische Wirkungen haben.<br /><br />Beziehung zwischen Pharmakokinetik und Pharmakodynamik<br /> Das Ausma&szlig; der bakteriostatischen Wirkung von Spiramycin h&auml;ngt im wesentlichen von der Zeitdauer ab, w&auml;hrend der der Wirkstoffspiegel oberhalb der minimalen Hemmkonzentration (MHK) des Erregers liegt.<br /> <br />Resistenzmechanismus:<br /> F&uuml;r Makrolid-Antibiotika wurden Resistenzmechanismen identifiziert: die auf durch eine Methylase vermittelte Modifikation der Zielstruktur (durch erm-Gene codiert) bzw. Effluxmechanismen (durch ein mef-Gen codiert) basieren. Je nach Resistenzmechanismus sind Kreuzresistenzen zwischen Spiramycin, Erythromycin, Streptogramin B und Lincosaminen (einschlie&szlig;lich Clindamycin) m&ouml;glich.<br /> <br />Grenzwerte (Breakpoints):<br /> Zum Zeitpunkt der Erstellung dieses Textes lagen keine EUCAST-Empfehlungen zu den Grenzwerten f&uuml;r die Empfindlichkeit vor. Da spezifische Grenzwerte nach DIN f&uuml;r Spiramycin nicht vorliegen, werden die ermittelten MHK h&auml;ufig in Bezug auf die Grenzwerte f&uuml;r Erythromycin interpretiert. Die Grenzwerte von Erythromycin f&uuml;r S. pneumoniae und andere Streptococcus spp. sind:<br /> <img src=\"data:image/png;base64,\" /><br /></p> "
                },
                {
                    "title": "5.2    Pharmakokinetische Eigenschaften",
                    "content": "<p>Spiramycin wird bei oraler Applikation unvollst&auml;ndig resorbiert. Blutspiegelmaxima werden nach 2 - 3 Stunden erreicht und variieren individuell betr&auml;chtlich. Nach mehrt&auml;giger Verabreichung von 4mal t&auml;glich 1 g Spiramycin betragen die Serumkonzentrationen 2 Stunden nach der letzten Gabe 2,0 - 3,0 mg/l (Schwankungsbreite 1,0 - 5,0 mg/l). Die Gewebeg&auml;ngigkeit von Spiramycin ist gut. In verschiedenen Geweben (Lungen, Tonsillen, Prostata, Knochen) und K&ouml;rperfl&uuml;ssigkeiten (Speichel, Galle, Bronchialsekret, Nasennebenh&ouml;hlensekret) wurden relativ hohe Wirkstoffkonzentrationen gemessen, die z. T. &uuml;ber den korrespondierenden Serumwerten lagen. Spiramycin durchdringt die Plazenta. In der Muttermilch wurden Konzentrationen gefunden, die 20 - 40 mal h&ouml;her als die Serumwerte lagen. Spiramycin ist nicht liquorg&auml;ngig. Die Plasmaproteinbindung liegt bei 30 %. Spiramycin wird zum gr&ouml;&szlig;ten Teil metabolisiert, wahrscheinlich in der Leber. Die Ausscheidung erfolgt &uuml;berwiegend &uuml;ber die Galle. Nur 5 - 10% einer oral verabreichten Dosis werden &uuml;ber die Niere ausgeschieden.<br /> Die Plasmahalbwertszeit betr&auml;gt 6,8 &plusmn;1,3 Stunden. Die absolute Bioverf&uuml;gbarkeit liegt nach oraler Gabe bei 36 &plusmn; 14%. Eine im Jahr 1985 durchgef&uuml;hrte Bioverf&uuml;gbarkeitsstudie an 12 Probanden ergab im Vergleich zu einer parenteralen Zubereitung:<br /><img src=\"data:image/png;base64,\" /></p> "
                },
                {
                    "title": "5.3    Pr&auml;klinische Daten zur Sicherheit",
                    "content": "<p>Akute Toxizit&auml;t<br /> F&uuml;r das Spiramycinsulfat wird bei M&auml;usen ein LD<sub>50</sub> von 1,5-2 g/kg bei subkutaner Verabreichung und 0,15 - 0,25 g/kg bei intraven&ouml;ser Applikation angegeben. Oral wurden 5,0 g/kg vertragen.<br /> Mit dem Spiramycinadipat wurde bei Ratten eine LD<sub>50</sub> von 3,5 g/kg nach subkutaner Verabreichung festgestellt. An der Injektionsstelle wurden nekrotische Ver&auml;nderungen<br /> beobachtet. Die Autopsie ergab schwere tubul&auml;re Nephritis, toxische Ver&auml;nderung der Leber, des Gastro-Intestinal-Traktes und anderer Organe.<br /><br /> Chronische Toxizit&auml;t<br /> Bei Dosierungen von 0,5 g Spiramycinsulfat/kg t&auml;glich kommt es bei Ratten und Hunden zu akuten Gastroenteritiden sowie zu toxischen Ver&auml;nderungen an Leber und Niere.<br /> <br />Mutagenes und tumorerzeugendes Potential<br /> F&uuml;r Spiramycin liegt keine ausf&uuml;hrliche Mutagenit&auml;tspr&uuml;fung vor. Eine In-vitro-Untersuchung mit S&auml;ugerzellen zeigte negative Resultate.<br /> Ein mutagenes Potential kann nicht ausreichend beurteilt werden. Tierexperimentelle Untersuchungen zum tumorerzeugenden Potential von Spiramycin liegen nicht vor. Ein tumorerzeugendes Potential von Spiramycin kann daher nicht ausgeschlossen werden.<br /> <br />Reproduktionstoxizit&auml;t<br /> Tierexperimentelle Untersuchungen und bisherige Erfahrungen bei der Anwendung am Menschen ergaben keine Hinweise auf eine fetale Sch&auml;digung (siehe Abschnitt 4.6).</p> "
                },
                {
                    "title": "6.       PHARMAZEUTISCHE ANGABEN",
                    "content": "<p></p> "
                },
                {
                    "title": "6.1     Liste der sonstigen Bestandteile",
                    "content": "<p>Lactose-Monohydrat, Siliciumdioxid-Hydrat, Magnesiumstearat (Ph.Eur.), Weizenst&auml;rke, Hypromellose, Macrogol 20000.</p> "
                },
                {
                    "title": "6.2     Inkompatibilit&auml;ten",
                    "content": "<p>Nicht zutreffend.</p> "
                },
                {
                    "title": "6.3     Dauer der Haltbarkeit",
                    "content": "<p>3 Jahre.</p> "
                },
                {
                    "title": "6.4     Besondere Vorsichtsma&szlig;nahmen f&uuml;r die Aufbewahrung",
                    "content": "<p>F&uuml;r dieses Arzneimittel sind keine besonderen Lagerungshinweise erforderlich.</p> "
                },
                {
                    "title": "6.5    Art und Inhalt des Beh&auml;ltnisses",
                    "content": "<p>Originalpackung mit 30 Filmtabletten (N2).</p> "
                },
                {
                    "title": "6.6    Besondere Vorsichtsma&szlig;nahmen f&uuml;r die Beseitigung und sonstige Hinweise zur Handhabung",
                    "content": "<p>Keine besonderen Anforderungen.</p> "
                },
                {
                    "title": "7.       INHABER DER ZULASSUNG",
                    "content": "<p>Teofarma S.r.l.<br />Via F.lli Cervi, 8<br />I-27010 Valle Salimbene (PV)<br />ITALIEN<br />Telefon: 0039 0382 422008<br />Telefax: 0039 0382 525845<br />E-mail: servicioclienti@teofarma.it</p> "
                },
                {
                    "title": "8.       ZULASSUNGSNUMMER",
                    "content": "<p>6397397.01.00</p> "
                },
                {
                    "title": "9.       DATUM DER ZULASSUNG/VERL&Auml;NGERUNG DER ZULASSUNG",
                    "content": "<p>05.11.1996/04.07.2006</p> "
                },
                {
                    "title": "10.     STAND DER INFORMATION",
                    "content": "<p>06/2015</p> "
                },
                {
                    "title": "11.     VERKAUFSABGRENZUNG",
                    "content": "<p>Verschreibungspflichtig</p>"
                }
            ]
        },
        "isTeratogen": false,
        "isTransfusion": false,
        "isReImport": false,
        "isInNegative": false,
        "isLifestyleDrug": false,
        "isConditionalLifeStyleDrug": false,
        "isGBATherapyAdvice": false,
        "isDiscountAgreement": false,
        "isAltDiscountAgreement": false,
        "isMedProduct": false,
        "isPrescMed": false,
        "isOTC": false,
        "isPharmacyOnly": false,
        "isRecipeOnly": true,
        "isBTM": false
    };

module.exports = {
    getData: () => JSON.parse( JSON.stringify( drug ) ),
    getPostResult: () => JSON.parse( JSON.stringify( drug ) ),
    getDeleteResult: () => JSON.parse( JSON.stringify( drug ) )
};