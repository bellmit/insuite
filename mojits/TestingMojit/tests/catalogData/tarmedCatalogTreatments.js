module.exports = [{
  "seq" : "00.0510",
  "treatmentCategory" : "Hauptleistung",
  "title" : "Spezifische Beratung durch den Facharzt für Grundversorgung bei Personen über 6 Jahren und unter 75 Jahren, pro 5 Min.",
  "medicalText" : "Gilt für Personen über 6 Jahren und unter 75 Jahren.\r\n\r\nGilt insbesondere für:\r\n\r\nDiätberatung: Gewichtsreduktion; bei Diabetes, Hyperlipämie und anderen Stoffwechselkrankheiten; Abgabe und Besprechung von Diätplänen.\r\n\r\nSozialberatung: Information über soziale Institutionen wie Gemeindehilfe, Spitex, Tagesspital, Fürsorge.\r\n\r\nRehabilitationsberatung: nach Unfall, Herzinfarkt, cerebralem Insult und bei Langzeitleiden; Information über Zielsetzung, Inhalt der entsprechenden Rehabilitation und Motivation.\r\n\r\nSuchtberatung: Prävention von Medikamentenabusus und Suchtmittelabusus; Ansprechen des Problems, Aufzeigen von Lösungswegen und Motivation.\r\n\r\nSportmedizinische Beratung: Training, Belastungsgrenzen.\r\n\r\nAllergologische Beratung: Erläuterung individueller, expositionsprophylaktischer Massnahmen, Verhaltensinstruktion bei Erkrankungen inkl. Notfallset.\r\n\r\nErgonomische Beratung: Rückenhygiene und Gelenkshygiene im beruflichen und privaten Bereich; gelenkschonende Verhaltensweisen und spezielle Hilfsmittel bei {pcP}-Patienten.\r\n\r\nDie Beratungen beinhalten Hinweise auf Drucksachen, Beratungsstellen und andere Fachstellen sowie Selbsthilfegruppen, jedoch nicht das Herstellen von Kontakten mit diesen Institutionen.",
  "technicalText" : "",
  "divisionCode" : "0001",
  "divisionText" : "Sprechzimmer",
  "benefitsCode" : "01",
  "benefitsText" : "-",
  "medicalTaxPoints" : 10.42,
  "technicalTaxPoints" : 8.19,
  "assistanceTaxPoints" : 0,
  "assistanceQuantity" : 0,
  "medicalScalingFactor" : 1,
  "technicalScalingFactor" : 1,
  "treatmentTime" : 5,
  "preparationAndFollowUpTime" : 0,
  "reportTime" : 0,
  "roomOccupancyTime" : 5,
  "rotationTime" : 0,
  "chapter" : "00.02.02",
  "sideMandatory" : false,
  "validFrom" : "2017-12-31T23:00:00.000Z",
  "validUntil" : null,
  "u_extra" : {
    "genderRules" : [],
    "ageRules" : [
      {
        "from" : 6,
        "fromTolerance" : 0,
        "until" : 75,
        "untilTolerance" : 0,
        "unit" : "years",
        "validFrom" : "2017-12-31T23:00:00.000Z",
        "validUntil" : null
      }
    ],
    "dignityRules" : {
      "quantDignity" : {
        "code" : "FMH05",
        "text" : "FMH 5"
      },
      "qualDignity" : [
        {
          "code" : "0500",
          "description" : [
            {
              "text" : "Innere Medizin",
              "fmh" : "1",
              "validFrom" : "2000-12-31T23:00:00.000Z",
              "validUntil" : null,
              "mutationDate" : "11/08/01 00:00:00",
              "type" : "N"
            }
          ],
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00",
          "subDignities" : [],
          "superDignities" : []
        },
        {
          "code" : "1100",
          "description" : [
            {
              "text" : "Kinder- und Jugendmedizin",
              "fmh" : "1",
              "validFrom" : "2000-12-31T23:00:00.000Z",
              "validUntil" : null,
              "mutationDate" : "11/08/01 00:00:00",
              "type" : "N"
            }
          ],
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00",
          "subDignities" : [],
          "superDignities" : []
        },
        {
          "code" : "9900",
          "description" : [
            {
              "text" : "Allgemeine Medizin",
              "fmh" : "1",
              "validFrom" : "2000-12-31T23:00:00.000Z",
              "validUntil" : null,
              "mutationDate" : "11/08/01 00:00:00",
              "type" : "N"
            }
          ],
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00",
          "subDignities" : [],
          "superDignities" : []
        }
      ]
    },
    "frequencyRules" : [
      {
        "quantity" : 6,
        "timeQuantity" : 3,
        "timeUnit" : "23",
        "applicability" : "00",
        "validFrom" : "2017-12-31T23:00:00.000Z",
        "validUntil" : null
      }
    ],
    "hierarchyRules" : [],
    "combinationRules" : [],
    "blocRules" : [],
    "cumulationRules" : [
      {
        "slaveSeq" : "00.0515",
        "slaveMaster" : "00.0510",
        "type" : "E",
        "masterType" : "L",
        "slaveType" : "L",
        "display" : "V",
        "validFrom" : "2017-12-31T23:00:00.000Z",
        "validUntil" : null,
        "mutationDate" : "09/01/17 00:00:00"
      },
      {
        "slaveSeq" : "00.0516",
        "slaveMaster" : "00.0510",
        "type" : "E",
        "masterType" : "L",
        "slaveType" : "L",
        "display" : "V",
        "validFrom" : "2017-12-31T23:00:00.000Z",
        "validUntil" : null,
        "mutationDate" : "09/01/17 00:00:00"
      },
      {
        "slaveSeq" : "00.0525",
        "slaveMaster" : "00.0510",
        "type" : "E",
        "masterType" : "L",
        "slaveType" : "L",
        "display" : "V",
        "validFrom" : "2009-02-28T23:00:00.000Z",
        "validUntil" : null,
        "mutationDate" : "11/28/08 00:00:00"
      },
      {
        "slaveSeq" : "03.0130",
        "slaveMaster" : "00.0510",
        "type" : "E",
        "masterType" : "L",
        "slaveType" : "L",
        "display" : "V",
        "validFrom" : "2009-02-28T23:00:00.000Z",
        "validUntil" : null,
        "mutationDate" : "11/28/08 00:00:00"
      },
      {
        "slaveSeq" : "03.0135",
        "slaveMaster" : "00.0510",
        "type" : "E",
        "masterType" : "L",
        "slaveType" : "L",
        "display" : "V",
        "validFrom" : "2009-02-28T23:00:00.000Z",
        "validUntil" : null,
        "mutationDate" : "11/28/08 00:00:00"
      }
    ],
    "treatmentGroups" : [
      {
        "code" : "03",
        "validFrom" : "2014-09-30T22:00:00.000Z",
        "validUntil" : null,
        "mutationDate" : "09/01/14 00:00:00",
        "text" : [
          {
            "text" : "Tarifpositionen bei denen der Zuschlag für hausärztliche Leistungen in der Arztpraxis (00.0015) abgerechnet werden kann.",
            "interpretation" : "",
            "textValidFrom" : "2017-12-31T23:00:00.000Z",
            "textValidUntil" : null,
            "textMutationDate" : "09/01/17 00:00:00"
          }
        ],
        "frequencyRules" : []
      }
    ]
  },
  "catalogShort": 'TARMED'
},
  {
    "seq" : "00.0010",
    "treatmentCategory" : "Hauptleistung",
    "title" : "Konsultation, erste 5 Min. (Grundkonsultation)",
    "medicalText" : "Beinhaltet alle ärztlichen Leistungen, die der Facharzt in seiner Praxis oder der Arzt bei ambulanten Patienten im Spital ohne oder mit einfachen Hilfsmitteln (etwa Inhalt 'Besuchskoffer') am Patienten hinsichtlich der Beschwerden und Erscheinungen erbringt, derentwegen dieser zum Facharzt kommt, bzw. gebracht wird und hinsichtlich der Beschwerden und Erscheinungen, die während der gleichen Behandlungsdauer auftreten.\r\n\r\nBeinhaltet Begrüssung, Verabschiedung, nicht besonders tarifierte Besprechungen und Untersuchungen, nicht besonders tarifierte Verrichtungen (z.B.: bestimmte Injektionen, Verbände usw.), Begleitung zu und Übergabe (inkl. Anordnungen) an Hilfspersonal betreffend Administration, technische und kurative Leistungen, Medikamentenabgabe (in Notfallsituation u/o als Starterabgabe), auf Konsultation bezogene unmittelbar vorgängige/anschliessende Akteneinsicht/Akteneinträge.",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 10.42,
    "technicalTaxPoints" : 8.19,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 5,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 5,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2017-12-31T23:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "9999",
            "description" : [
              {
                "text" : "Alle",
                "fmh" : "0",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2000-12-31T23:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "11/08/01 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 1,
          "timeQuantity" : 1,
          "timeUnit" : "07",
          "applicability" : "00",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [
        {
          "slaveSeq" : "00.0060",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "00.0110",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "00.1325",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2010-03-31T22:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "12/23/09 00:00:00"
        },
        {
          "slaveSeq" : "02.0010",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0020",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0030",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0040",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0050",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "08.0500",
          "slaveMaster" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        }
      ],
      "treatmentGroups" : [
        {
          "code" : "03",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "09/01/14 00:00:00",
          "text" : [
            {
              "text" : "Tarifpositionen bei denen der Zuschlag für hausärztliche Leistungen in der Arztpraxis (00.0015) abgerechnet werden kann.",
              "interpretation" : "",
              "textValidFrom" : "2017-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "09/01/17 00:00:00"
            }
          ],
          "frequencyRules" : []
        },
        {
          "code" : "18",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00",
          "text" : [
            {
              "text" : "Allgemeine Grundleistungen",
              "interpretation" : "",
              "textValidFrom" : "2000-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "11/08/01 00:00:00"
            }
          ],
          "frequencyRules" : []
        },
        {
          "code" : "58",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00",
          "text" : [
            {
              "text" : "Allgemeine Grundleistungen nicht kumulierbar mit Konsilium",
              "interpretation" : "",
              "textValidFrom" : "2000-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "11/08/01 00:00:00"
            }
          ],
          "frequencyRules" : []
        }
      ]
    },
    "catalogShort": 'TARMED'
  },
  /* 2 */
  {
    "seq" : "00.0015",
    "treatmentCategory" : "Zuschlagsleistung",
    "title" : "+ Zuschlag für hausärztliche Leistungen in der Arztpraxis",
    "medicalText" : "Darf nur im Zusammenhang mit der Erbringung von hausärztlichen Leistungen abgerechnet werden und wenn dem Patienten am selben Tag keine spezialärztlichen Leistungen durch den gleichen Leistungserbringer verrechnet werden.\r\n\r\nDarf nicht von ambulanten Diensten von Spitälern abgerechnet werden.",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 10.88,
    "technicalTaxPoints" : 0,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 0,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 0,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2017-12-31T23:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "0500",
            "description" : [
              {
                "text" : "Innere Medizin",
                "fmh" : "1",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "1100",
            "description" : [
              {
                "text" : "Kinder- und Jugendmedizin",
                "fmh" : "1",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "3000",
            "description" : [
              {
                "text" : "Praktischer Arzt/praktische Ärztin",
                "fmh" : "0",
                "validFrom" : "2014-06-30T22:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "07/01/14 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "3010",
            "description" : [
              {
                "text" : "Allgemeine Innere Medizin",
                "fmh" : "1",
                "validFrom" : "2014-06-30T22:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "07/01/14 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "9900",
            "description" : [
              {
                "text" : "Allgemeine Medizin",
                "fmh" : "1",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 1,
          "timeQuantity" : 1,
          "timeUnit" : "21",
          "applicability" : "00",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [
        {
          "seq" : "00.0010",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null
        }
      ],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [
        {
          "slaveSeq" : "03",
          "slaveMaster" : "00.0015",
          "type" : "X",
          "masterType" : "L",
          "slaveType" : "G",
          "display" : "L",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "09/01/14 00:00:00"
        }
      ],
      "treatmentGroups" : [
        {
          "code" : "03",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "09/01/14 00:00:00",
          "text" : [
            {
              "text" : "Tarifpositionen bei denen der Zuschlag für hausärztliche Leistungen in der Arztpraxis (00.0015) abgerechnet werden kann.",
              "interpretation" : "",
              "textValidFrom" : "2017-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "09/01/17 00:00:00"
            }
          ],
          "frequencyRules" : []
        }
      ]
    },
    "catalogShort": 'TARMED'
  },
  {
    "seq" : "00.0020",
    "treatmentCategory" : "Zuschlagsleistung",
    "title" : "+ Konsultation bei Personen über 6 Jahren und unter 75 Jahren, jede weiteren 5 Min. (Konsultationszuschlag)",
    "medicalText" : "Gilt für Personen über 6 Jahren und unter 75 Jahren.",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 10.42,
    "technicalTaxPoints" : 8.19,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 5,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 5,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2017-12-31T23:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [
        {
          "from" : 6,
          "fromTolerance" : 0,
          "until" : 75,
          "untilTolerance" : 0,
          "unit" : "years",
          "validFrom" : "2017-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "9999",
            "description" : [
              {
                "text" : "Alle",
                "fmh" : "0",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2000-12-31T23:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "11/08/01 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 2,
          "timeQuantity" : 1,
          "timeUnit" : "07",
          "applicability" : "00",
          "validFrom" : "2017-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [
        {
          "seq" : "00.0010",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [
        {
          "slaveSeq" : "00.0025",
          "slaveMaster" : "00.0020",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2017-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "09/01/17 00:00:00"
        },
        {
          "slaveSeq" : "00.0026",
          "slaveMaster" : "00.0020",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2017-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "09/01/17 00:00:00"
        }
      ],
      "treatmentGroups" : [
        {
          "code" : "03",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "09/01/14 00:00:00",
          "text" : [
            {
              "text" : "Tarifpositionen bei denen der Zuschlag für hausärztliche Leistungen in der Arztpraxis (00.0015) abgerechnet werden kann.",
              "interpretation" : "",
              "textValidFrom" : "2017-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "09/01/17 00:00:00"
            }
          ],
          "frequencyRules" : []
        }
      ]
    },
    "catalogShort": 'TARMED'
  },
  {
    "seq" : "00.0030",
    "treatmentCategory" : "Zuschlagsleistung",
    "title" : "+ Konsultation, letzte 5 Min. (Konsultationszuschlag)",
    "medicalText" : "",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 5.21,
    "technicalTaxPoints" : 4.1,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 5,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 5,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2017-12-31T23:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "9999",
            "description" : [
              {
                "text" : "Alle",
                "fmh" : "0",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2000-12-31T23:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "11/08/01 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 1,
          "timeQuantity" : 1,
          "timeUnit" : "07",
          "applicability" : "00",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [
        {
          "seq" : "00.0010",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [],
      "treatmentGroups" : [
        {
          "code" : "03",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "09/01/14 00:00:00",
          "text" : [
            {
              "text" : "Tarifpositionen bei denen der Zuschlag für hausärztliche Leistungen in der Arztpraxis (00.0015) abgerechnet werden kann.",
              "interpretation" : "",
              "textValidFrom" : "2017-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "09/01/17 00:00:00"
            }
          ],
          "frequencyRules" : []
        }
      ]
    },
    "catalogShort": 'TARMED'
  },
  {
    "seq" : "00.0010",
    "treatmentCategory" : "Hauptleistung",
    "title" : "Konsultation, erste 5 Min. (Grundkonsultation)",
    "medicalText" : "Beinhaltet alle ärztlichen Leistungen, die der Facharzt in seiner Praxis oder der Arzt bei ambulanten Patienten im Spital ohne oder mit einfachen Hilfsmitteln (etwa Inhalt 'Besuchskoffer') am Patienten hinsichtlich der Beschwerden und Erscheinungen erbringt, derentwegen dieser zum Facharzt kommt, bzw. gebracht wird und hinsichtlich der Beschwerden und Erscheinungen, die während der gleichen Behandlungsdauer auftreten.\r\n\r\nBeinhaltet Begrüssung, Verabschiedung, nicht besonders tarifierte Besprechungen und Untersuchungen, nicht besonders tarifierte Verrichtungen (z.B.: bestimmte Injektionen, Verbände usw.), Begleitung zu und Übergabe (inkl. Anordnungen) an Hilfspersonal betreffend Administration, technische und kurative Leistungen, Medikamentenabgabe (in Notfallsituation u/o als Starterabgabe), auf Konsultation bezogene unmittelbar vorgängige/anschliessende Akteneinsicht/Akteneinträge.",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 9.57,
    "technicalTaxPoints" : 8.19,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 5,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 5,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2000-12-31T23:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "9999",
            "description" : [
              {
                "text" : "Alle",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2000-12-31T23:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "11/08/01 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 1,
          "timeQuantity" : 1,
          "timeUnit" : "07",
          "applicability" : "00",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [
        {
          "slaveSeq" : "00.0060",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "00.0110",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "00.1325",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2010-03-31T22:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "12/23/09 00:00:00"
        },
        {
          "slaveSeq" : "02.0010",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0020",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0030",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0040",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "02.0050",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "08.0500",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "L",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        },
        {
          "slaveSeq" : "12",
          "masterSeq" : "00.0010",
          "type" : "E",
          "masterType" : "L",
          "slaveType" : "G",
          "display" : "V",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00"
        }
      ],
      "treatmentGroups" : [
        {
          "code" : "18",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00",
          "text" : [
            {
              "text" : "Allgemeine Grundleistungen",
              "textValidFrom" : "2000-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "11/08/01 00:00:00"
            }
          ],
          "frequencyRules" : []
        },
        {
          "code" : "58",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null,
          "mutationDate" : "11/08/01 00:00:00",
          "text" : [
            {
              "text" : "Allgemeine Grundleistungen nicht kumulierbar mit Konsilium",
              "textValidFrom" : "2000-12-31T23:00:00.000Z",
              "textValidUntil" : null,
              "textMutationDate" : "11/08/01 00:00:00"
            }
          ],
          "frequencyRules" : []
        }
      ]
    },
    "catalogShort": 'TARMED_UVG_IVG_MVG'
  },
  {
    "seq" : "00.0015",
    "treatmentCategory" : "Zuschlagsleistung",
    "title" : "+ Zuschlag für hausärztliche Leistungen in der Arztpraxis",
    "medicalText" : "Darf nur im Zusammenhang mit der Erbringung von hausärztlichen Leistungen abgerechnet werden und wenn dem Patienten am selben Tag keine spezialärztlichen Leistungen durch den gleichen Leistungserbringer verrechnet werden.\r\n\r\nDarf nicht von ambulanten Diensten von Spitälern abgerechnet werden.",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 10,
    "technicalTaxPoints" : 0,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 0,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 0,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2014-09-30T22:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "0500",
            "description" : [
              {
                "text" : "Innere Medizin",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "1100",
            "description" : [
              {
                "text" : "Kinder- und Jugendmedizin",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "3000",
            "description" : [
              {
                "text" : "Praktischer Arzt/praktische Ärztin",
                "validFrom" : "2014-06-30T22:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "07/01/14 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "3010",
            "description" : [
              {
                "text" : "Allgemeine Innere Medizin",
                "validFrom" : "2014-06-30T22:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "07/01/14 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          },
          {
            "code" : "9900",
            "description" : [
              {
                "text" : "Allgemeine Medizin",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2014-09-30T22:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "07/01/14 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 1,
          "timeQuantity" : 1,
          "timeUnit" : "21",
          "applicability" : "00",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [
        {
          "seq" : "00.0010",
          "validFrom" : "2014-09-30T22:00:00.000Z",
          "validUntil" : null
        }
      ],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [],
      "treatmentGroups" : []
    },
    "catalogShort": 'TARMED_UVG_IVG_MVG'
  },

  /* 3 */
  {
    "seq" : "00.0020",
    "treatmentCategory" : "Zuschlagsleistung",
    "title" : "+ Konsultation, jede weiteren 5 Min. (Konsultationszuschlag)",
    "medicalText" : "",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 9.57,
    "technicalTaxPoints" : 8.19,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 5,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 5,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2000-12-31T23:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "9999",
            "description" : [
              {
                "text" : "Alle",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2000-12-31T23:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "11/08/01 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 2,
          "timeQuantity" : 1,
          "timeUnit" : "07",
          "applicability" : "01",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [
        {
          "seq" : "00.0010",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [],
      "treatmentGroups" : []
    },
    "catalogShort": 'TARMED_UVG_IVG_MVG'
  },
  {
    "seq" : "00.0030",
    "treatmentCategory" : "Zuschlagsleistung",
    "title" : "+ Konsultation, letzte 5 Min. (Konsultationszuschlag)",
    "medicalText" : "",
    "technicalText" : "",
    "divisionCode" : "0001",
    "divisionText" : "Sprechzimmer",
    "benefitsCode" : "01",
    "benefitsText" : "-",
    "medicalTaxPoints" : 4.78,
    "technicalTaxPoints" : 4.1,
    "assistanceTaxPoints" : 0,
    "assistanceQuantity" : 0,
    "medicalScalingFactor" : 1,
    "technicalScalingFactor" : 1,
    "treatmentTime" : 5,
    "preparationAndFollowUpTime" : 0,
    "reportTime" : 0,
    "roomOccupancyTime" : 5,
    "rotationTime" : 0,
    "chapter" : "00.01.01",
    "sideMandatory" : false,
    "validFrom" : "2000-12-31T23:00:00.000Z",
    "validUntil" : null,
    "u_extra" : {
      "genderRules" : [],
      "ageRules" : [],
      "dignityRules" : {
        "quantDignity" : {
          "code" : "FMH05",
          "text" : "FMH 5"
        },
        "qualDignity" : [
          {
            "code" : "9999",
            "description" : [
              {
                "text" : "Alle",
                "validFrom" : "2000-12-31T23:00:00.000Z",
                "validUntil" : null,
                "mutationDate" : "11/08/01 00:00:00",
                "type" : "N"
              }
            ],
            "validFrom" : "2000-12-31T23:00:00.000Z",
            "validUntil" : null,
            "mutationDate" : "11/08/01 00:00:00",
            "subDignities" : [],
            "superDignities" : []
          }
        ]
      },
      "frequencyRules" : [
        {
          "quantity" : 1,
          "timeQuantity" : 1,
          "timeUnit" : "07",
          "applicability" : "00",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "hierarchyRules" : [
        {
          "seq" : "00.0010",
          "validFrom" : "2000-12-31T23:00:00.000Z",
          "validUntil" : null
        }
      ],
      "combinationRules" : [],
      "blocRules" : [],
      "cumulationRules" : [],
      "treatmentGroups" : []
    },
    "catalogShort": 'TARMED_UVG_IVG_MVG'
  },
    {
        "seq" : "00.2550",
        "treatmentCategory" : "Zusatzleistung, die mit mehreren, nicht näher bezeichneten Hauptleistungen abgerechnet werden kann.",
        "title" : "(+) %-Zuschlag für Notfall C, Mo-So 22-7",
        "medicalText" : "Notfallkriterien Abend/Nacht/Wochenende (tarifarisch):\r\n \r\n- Bei direktem Arzt - Patientenkontakt: Vom Facharzt als medizinisch notwendig erachtet\r\n\r\n- Ohne direkten Arzt-Patientenkontakt: Medizinisch notwendig und/oder vom Patienten, Angehörigen oder Dritten als offensichtlich notwendig erachtet\r\n \r\n- Der Facharzt befasst sich sofort, verzugslos mit dem Patienten bzw. sucht ihn auf. \r\n \r\n- Es wird ein unmittelbarer Arzt - Patienten - Kontakt vorausgesetzt. Ausnahme: Vergebliche Fahrt zum Unfallort/Ereignisort.\r\n \r\n- Besuche: zuhause, Alters- und Pflegeheim, Unfallort, Ereignisort usw..\r\n \r\nFür die Entschädigung massgebend ist der Zeitpunkt des ersten, direkten und unmittelbaren Arzt - Patienten - Kontakts (Ausnahme: Bei Notfallbesuch gilt die Startzeit).\r\n \r\nZuschlag von 50% auf den Tarifpositionen, die in diesem Zeitraum für die Behandlung des entsprechenden Notfalls verrechnet werden.\r\n \r\nZuschlag nur auf die AL und nicht auf die TL der entsprechenden Tarifpositionen.\r\n \r\nDarf nur von nicht vom Spital oder Institut fix besoldeten Fachärzten abgerechnet werden.\r\n \r\nGilt nicht für Einsätze, welche im Spital oder Institut erbracht werden.",
        "technicalText" : "",
        "benefitsCode" : "01",
        "benefitsText" : "-",
        "medicalTaxPoints" : 0,
        "technicalTaxPoints" : 0,
        "assistanceTaxPoints" : 0,
        "assistanceQuantity" : 0,
        "medicalScalingFactor" : 0.5,
        "technicalScalingFactor" : 0,
        "treatmentTime" : 0,
        "preparationAndFollowUpTime" : 0,
        "reportTime" : 0,
        "roomOccupancyTime" : 0,
        "rotationTime" : 0,
        "chapter" : "00.08",
        "sideMandatory" : false,
        "validFrom" : "2017-12-31T23:00:00.000Z",
        "validUntil" : null,
        "u_extra" : {
            "genderRules" : [],
            "ageRules" : [],
            "dignityRules" : {
                "quantDignity" : {
                    "code" : null,
                    "text" : null
                },
                "qualDignity" : [
                    {
                        "code" : "9999",
                        "description" : [
                            {
                                "text" : "Alle",
                                "fmh" : "0",
                                "validFrom" : "2000-12-31T23:00:00.000Z",
                                "validUntil" : null,
                                "mutationDate" : "11/08/01 00:00:00",
                                "type" : "N"
                            }
                        ],
                        "validFrom" : "2000-12-31T23:00:00.000Z",
                        "validUntil" : null,
                        "mutationDate" : "11/08/01 00:00:00",
                        "subDignities" : [],
                        "superDignities" : []
                    }
                ]
            },
            "frequencyRules" : [],
            "hierarchyRules" : [],
            "combinationRules" : [],
            "blocRules" : [],
            "cumulationRules" : [
                {
                    "slaveSeq" : "00.2560",
                    "slaveMaster" : "00.2550",
                    "type" : "E",
                    "masterType" : "L",
                    "slaveType" : "L",
                    "display" : "V",
                    "validFrom" : "2000-12-31T23:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "11/08/01 00:00:00"
                },
                {
                    "slaveSeq" : "00.2570",
                    "slaveMaster" : "00.2550",
                    "type" : "E",
                    "masterType" : "L",
                    "slaveType" : "L",
                    "display" : "V",
                    "validFrom" : "2000-12-31T23:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "11/08/01 00:00:00"
                },
                {
                    "slaveSeq" : "00.2580",
                    "slaveMaster" : "00.2550",
                    "type" : "E",
                    "masterType" : "L",
                    "slaveType" : "L",
                    "display" : "V",
                    "validFrom" : "2000-12-31T23:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "11/08/01 00:00:00"
                },
                {
                    "slaveSeq" : "00.2590",
                    "slaveMaster" : "00.2550",
                    "type" : "E",
                    "masterType" : "L",
                    "slaveType" : "L",
                    "display" : "V",
                    "validFrom" : "2000-12-31T23:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "11/08/01 00:00:00"
                },
                {
                    "slaveSeq" : "20",
                    "slaveMaster" : "00.2550",
                    "type" : "E",
                    "masterType" : "L",
                    "slaveType" : "G",
                    "display" : "V",
                    "validFrom" : "2000-12-31T23:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "11/08/01 00:00:00"
                }
            ],
            "treatmentGroups" : [
                {
                    "code" : "03",
                    "validFrom" : "2014-09-30T22:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "09/01/14 00:00:00",
                    "text" : [
                        {
                            "text" : "Tarifpositionen bei denen der Zuschlag für hausärztliche Leistungen in der Arztpraxis (00.0015) abgerechnet werden kann.",
                            "interpretation" : "",
                            "textValidFrom" : "2017-12-31T23:00:00.000Z",
                            "textValidUntil" : null,
                            "textMutationDate" : "09/01/17 00:00:00"
                        }
                    ],
                    "frequencyRules" : []
                },
                {
                    "code" : "52",
                    "validFrom" : "2000-12-31T23:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "11/08/01 00:00:00",
                    "text" : [
                        {
                            "text" : "Dringlichkeits- und Notfallzuschläge",
                            "interpretation" : "",
                            "textValidFrom" : "2007-03-31T22:00:00.000Z",
                            "textValidUntil" : null,
                            "textMutationDate" : "01/08/07 00:00:00"
                        }
                    ],
                    "frequencyRules" : []
                },
                {
                    "code" : "59",
                    "validFrom" : "2000-12-31T23:00:00.000Z",
                    "validUntil" : null,
                    "mutationDate" : "11/08/01 00:00:00",
                    "text" : [
                        {
                            "text" : "Leistungen nur für Praxisärzte",
                            "interpretation" : "",
                            "textValidFrom" : "2000-12-31T23:00:00.000Z",
                            "textValidUntil" : null,
                            "textMutationDate" : "11/08/01 00:00:00"
                        }
                    ],
                    "frequencyRules" : []
                }
            ]
        },
        "catalogShort" : "TARMED"
    }
  ];