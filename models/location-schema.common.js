/**
 * User: rrrw
 * Date: 17.09.13  22:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*globals YUI */


/*

 Integrating LOCATIONS

 Location_T
 {
 root: {
 //NO this is not a Company_T
 locname:
 phone:
 email:
 openTimes: [{
 days: [1,5],
 times: [
 {start:[9], end: [13,0]},
 {start:[13,30], end: [18]}
 ]},
 {
 days:...
 hours:...
 }]
 }
 }
 Migration: default Location = fixed ID, generated and kept in sync with company.


 Weekly_T

 Calendar_T  {modified}
 {
 calendar
 locationId
 consultTimes
 }
 Migration: locationId = fixed ID (as above)
 Migration:  default consultT = {days:[1,2,3,4,5], hours:[ {start:[9], end: [13,0]} ]}


 CloseTime_T
 {
 an event (schedule)
 closeTime: true
 }
 Migration: none

 */

'use strict';

YUI.add( 'location-schema', function( Y, NAME ) {

        /**
         * Location schema for locations of a practice.
         *
         * Much simpler than a full blown company.
         *
         * Only allow one address in this version.
         *
         * @module DCAuth
         */

        var
            MAINLOCATION_ID = '000000000000000000000001',
            i18n = Y.doccirrus.i18n,

            // ------- Schema definitions  -------
            types = {};

        types = Y.mix( types, {
            root: {
                "base": {
                    "complex": "ext",
                    "type": "Location_T",
                    "lib": types
                }
            },
            "LocAddress_T": {
                "kind": {
                    "required": false,
                    "complex": "eq",
                    "type": "AddressKind_E",
                    "lib": "person",
                    "i18n": i18n( 'person-schema.Address_T.kind' ),
                    "-en": "kind",
                    "-de": "Adresstyp"
                }
            },
            "Location_T": {
                "Location_Base_T": {
                    "complex": "ext",
                    "type": "Location_Base_T",
                    "lib": types
                },
                "Location_D_T": {
                    "complex": "ext",
                    "type": "Location_D_T",
                    "lib": types
                },
                "Location_CH_T": {
                    "complex": "ext",
                    "type": "Location_CH_T",
                    "lib": types
                }
            },
            "Location_Base_T": {
                "locname": {
                    "required": true,
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.locname.i18n' ),
                    "-en": "locname",
                    "-de": "locname",
                    "rule-engine": {
                        i18n: i18n( 'location-schema.Location_T.locnameRule.i18n' )
                    }
                },
                "institutionCode": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.institutionCode.i18n' ),
                    "-en": "code of the institution",
                    "-de": "IKNR"
                },
                "department": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.department.i18n' ),
                    "-en": "Department",
                    "-de": "Abteilung"
                },
                "region": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.region.i18n' )
                },
                "emailFaxGateway": {
                    "validate": "emailOrEmpty",
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.emailFaxGateway.i18n' ),
                    "-en": "emailFaxGateway",
                    "-de": "emailFaxGateway"
                },
                "emailFooter": {
                    "type": "String",
                    "default": "",
                    i18n: i18n( 'location-schema.Location_T.emailFooter.i18n' ),
                    "-en": i18n( 'location-schema.Location_T.emailFooter.i18n' ),
                    "-de": i18n( 'location-schema.Location_T.emailFooter.i18n' )
                },
                "SmtpSettings": {
                    "complex": "ext",
                    "type": "SmtpSettings_T",
                    "lib": 'settings'
                },
                "commercialNo": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.commercialNo.i18n' ),
                    "-en": "Commercial No.",
                    "-de": "Betriebsstättennr.",
                    "rule-engine": {}
                },
                "nonStandardCommercialNo": {
                    "type": "Boolean",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.nonStandardCommercialNo.i18n' ),
                    "-en": "Non-standard value",
                    "-de": "Ausnahmewert",
                    "rule-engine": {
                        simpleType: true
                    }
                },
                "base0": {
                    "complex": "ext",
                    "type": "LocAddress_T",
                    "lib": types
                },
                "base1": {
                    "complex": "ext",
                    "type": "Address_T",
                    "lib": "person"
                },
                "base2": {
                    "complex": "ext",
                    "type": "BankAccount_T",
                    "lib": "person"
                },
                "base3": {
                    "complex": "ext",
                    "type": "BankAccount_CH_T",
                    "lib": "person"
                },
                "phone": {
                    "validate": "Location_T_phone",
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.phone.i18n' ),
                    "-en": "phone",
                    "-de": "phone"
                },
                "fax": {
                    "validate": "Location_T_phone",
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.fax.i18n' ),
                    "-en": "fax",
                    "-de": "fax"
                },
                "email": {
                    "validate": "email",
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.email.i18n' ),
                    "-en": "email",
                    "-de": "email"
                },
                "website": {
                    "validate": "Location_T_url",
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.website.i18n' ),
                    "-en": "email",
                    "-de": "email"
                },
                "openTimes": {
                    "complex": "inc",
                    "type": "WeeklyTime_T",
                    "apiv": { v: 2, queryParam: false },
                    "lib": types,
                    i18n: i18n( 'location-schema.Location_T.openTimes.i18n' ),
                    "-en": "openTimes",
                    "-de": "openTimes"
                },
                "isAdditionalLocation": {
                    "type": "Boolean",
                    "apiv": { v: 2, queryParam: false },
                    "default": false,
                    i18n: i18n( 'location-schema.Location_T.isAdditionalLocation.i18n' ),
                    "-en": "additional location",
                    "-de": "Nebenbetriebsstätte"
                },
                "mainLocationId": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    "validate": "Location_T_mainLocationId",
                    i18n: i18n( 'location-schema.Location_T.mainLocationId.i18n' ),
                    "-en": "main location",
                    "-de": "Hauptbetriebsstätte"
                },
                "kbvZip": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.kbvZip.i18n' ),
                    "-en": "Official ZIP",
                    "-de": "Offizielle PLZ"
                },
                "kv": {
                    "type": "String",
                    i18n: i18n( 'location-schema.Location_T.KV.i18n' ),
                    "-en": "KV",
                    "-de": "KV"
                },
                "gkvInvoiceReceiver": {
                    "complex": "eq",
                    "type": "GkvInvoiceReceiver_E",
                    "validate": "Location_T_gkvInvoiceReceiver",
                    "lib": types,
                    i18n: i18n( 'location-schema.Location_T.gkvInvoiceReceiver.i18n' ),
                    "-en": "Invoice Receiver",
                    "-de": "Abrechnungsempfänger"
                },
                "budgets": {
                    "complex": "inc",
                    "type": "Budgets_T",
                    "apiv": {v: 2, queryParam: false},
                    "lib": types,
                    i18n: i18n( 'location-schema.Location_T.budgets.i18n' ),
                    "-en": "communications",
                    "-de": "communications"
                },
                "defaultPrinter": {
                    "type": 'String',
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.defaultPrinter.i18n' ),
                    //"validate": "string",
                    "-en": "Default printer",
                    "-de": "Standarddrucker"
                },
                "enabledPrinters": {
                    "type": ["String"],
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'location-schema.Location_T.enabledPrinters.i18n' ),
                    //"validate": "validNumberOrEmpty",
                    "-en": "Printers",
                    "-de": "Drucker"
                },
                "imapUrl": {
                    "default": "",
                    "type": "string",
                    i18n: i18n( 'location-schema.EmailServerConfig_T.imapUrl.i18n' ),
                    "-en": "url",
                    "-de": "url"
                },
                "imapPort": {
                    "type": "number",
                    i18n: i18n( 'location-schema.EmailServerConfig_T.imapPort.i18n' ),
                    "-en": "imapPort",
                    "-de": "imapPort"
                },
                "imapUserName": {
                    "default": "",
                    "type": "string",
                    i18n: i18n( 'location-schema.EmailServerConfig_T.imapUserName.i18n' ),
                    "-en": "userName",
                    "-de": "userName"
                },
                "imapPassword": {
                    "default": "",
                    "type": "string",
                    i18n: i18n( 'location-schema.EmailServerConfig_T.imapPassword.i18n' ),
                    "-en": "password",
                    "-de": "password"
                },
                "isImapUseSSL": {
                    "type": "boolean",
                    i18n: i18n( 'location-schema.EmailServerConfig_T.isImapUseSSL.i18n' ),
                    "-en": "isSSL",
                    "-de": "isSSL"
                },
                "stockLocations": {
                    type: ["ObjectId"],
                    default: [],
                    i18n: i18n( 'location-schema.Location_T.stockLocations.i18n' ),
                    "-en": "Stock Locations",
                    "-de": "Stock Locations"
                },
                "countryMode": {
                    "complex": "eq",
                    "type": "CountryMode_E",
                    "lib": "countrymode"
                },
                "lastChanged": {
                    "type": "Date",
                    i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                    "-en": "last changed",
                    "-de": "zuletzt geändert"
                }
            },
            "Location_D_T": {
                "konnektorProductVersion": {
                    "type": "String",
                    i18n: i18n( 'location-schema.Location_D_T.konnektorProductVersion.i18n' )
                },
                "superLocation": {
                    "complex": "ext",
                    "type": "SuperLocation_T",
                    "lib": types
                }
            },
            "Location_CH_T": {
                "glnNumber": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false, countryMode: ["CH"] },
                    i18n: i18n( 'location-schema.Location_CH_T.glnNumber.i18n' ),
                    "validate": "Location_CH_T_glnNumber"
                },
                "zsrNumber": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false, countryMode: ["CH"] },
                    i18n: i18n( 'location-schema.Location_CH_T.zsrNumber.i18n' ),
                    "validate": "Location_CH_T_zsrNumber"
                },
                "vatNumber": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false, countryMode: ["CH"] },
                    i18n: i18n( 'location-schema.Location_CH_T.vatNumber.i18n' ),
                    "validate": "Location_CH_T_vatNumber"
                }
            },
            // start: [9,39] === '09:39'
            // start: [22] === '22:00' or '10:00pm' dep on locale
            // end same
            "WeeklyTime_T": {
                "days": {
                    "type": [Number],
                    "validate": "WeeklyTime_T_days",
                    i18n: i18n( 'location-schema.WeeklyTime_T.days.i18n' )
                },
                "colorOfConsults": {
                    "type": "String",
                    "default": " ",
                    "i18n": i18n( 'calendar-schema.CalView_T.color.i18n' ),
                    "-en": "color",
                    "-de": "Farbe"
                },
                "start": {
                    "type": ["Number"],
                    "required": true,
                    i18n: i18n( 'location-schema.WeeklyTime_T.start.i18n' )
                },
                "end": {
                    "type": [Number],
                    "required": true,
                    i18n: i18n( 'location-schema.WeeklyTime_T.end.i18n' )
                },
                "publicInsurance": {
                    "type": "boolean",
                    i18n: i18n( 'location-schema.WeeklyTime_T.publicInsurance.i18n' ),
                    "-en": "publicInsurance",
                    "-de": "publicInsurance"
                },
                "privateInsurance": {
                    "type": "boolean",
                    i18n: i18n( 'location-schema.WeeklyTime_T.privateInsurance.i18n' ),
                    "-en": "privateInsurance",
                    "-de": "privateInsurance"
                },
                "scheduleTypes": {
                    "type": [String],
                    i18n: i18n( 'location-schema.WeeklyTime_T.scheduleTypes.i18n' ),
                    "-en": "Scheduletype",
                    "-de": "Terminart"
                },
                "repetitionSettings": {
                    "complex": "inc",
                    "type": "base_VRepeatedConfig_T",
                    "lib": "v_repeatedconfig"
                }
            },
            "GkvInvoiceReceiver_E": {
                "type": "string",
                "list": [
                    {
                        val: '17',
                        i18n: 'Niedersachsen',
                        '-en': 'Niedersachsen',
                        '-de': 'Niedersachsen'
                    }, {
                        val: '18',
                        i18n: 'Dortmund',
                        '-en': 'Dortmund',
                        '-de': 'Dortmund'
                    }, {
                        val: '19',
                        i18n: 'Münster',
                        '-en': 'Münster',
                        '-de': 'Münster'
                    }, {
                        val: '20',
                        i18n: 'Dortmund',
                        '-en': 'Dortmund',
                        '-de': 'Dortmund'
                    }, {
                        val: '21',
                        i18n: 'Aachen',
                        '-en': 'Aachen',
                        '-de': 'Aachen'
                    }, {
                        val: '24',
                        i18n: 'Düsseldorf',
                        '-en': 'Düsseldorf',
                        '-de': 'Düsseldorf'
                    }, {
                        val: '25',
                        i18n: 'Duisburg',
                        '-en': 'Duisburg',
                        '-de': 'Duisburg'
                    }, {
                        val: '27',
                        i18n: 'Köln',
                        '-en': 'Köln',
                        '-de': 'Köln'
                    }, {
                        val: '28',
                        i18n: 'Linker Niederrhein',
                        '-en': 'Linker Niederrhein',
                        '-de': 'Linker Niederrhein'
                    }, {
                        val: '31',
                        i18n: 'Ruhr',
                        '-en': 'Ruhr',
                        '-de': 'Ruhr'
                    }, {
                        val: '37',
                        i18n: 'Bergisch-Land',
                        '-en': 'Bergisch-Land',
                        '-de': 'Bergisch-Land'
                    }, {
                        val: '39',
                        i18n: 'Darmstadt',
                        '-en': 'Darmstadt',
                        '-de': 'Darmstadt'
                    }, {
                        val: '40',
                        i18n: 'Frankfurt/Main',
                        '-en': 'Frankfurt/Main',
                        '-de': 'Frankfurt/Main'
                    }, {
                        val: '41',
                        i18n: 'Gießen',
                        '-en': 'Gießen',
                        '-de': 'Gießen'
                    }, {
                        val: '42',
                        i18n: 'Kassel',
                        '-en': 'Kassel',
                        '-de': 'Kassel'
                    }, {
                        val: '43',
                        i18n: 'Limburg',
                        '-en': 'Limburg',
                        '-de': 'Limburg'
                    }, {
                        val: '44',
                        i18n: 'Marburg',
                        '-en': 'Marburg',
                        '-de': 'Marburg'
                    }, {
                        val: '45',
                        i18n: 'Wiesbaden',
                        '-en': 'Wiesbaden',
                        '-de': 'Wiesbaden'
                    }, {
                        val: '47',
                        i18n: 'Koblenz',
                        '-en': 'Koblenz',
                        '-de': 'Koblenz'
                    }, {
                        val: '48',
                        i18n: 'Rheinhessen',
                        '-en': 'Rheinhessen',
                        '-de': 'Rheinhessen'
                    }, {
                        val: '49',
                        i18n: 'Pfalz',
                        '-en': 'Pfalz',
                        '-de': 'Pfalz'
                    }, {
                        val: '50',
                        i18n: 'Trier',
                        '-en': 'Trier',
                        '-de': 'Trier'
                    }, {
                        val: '55',
                        i18n: 'Karlsruhe',
                        '-en': 'Karlsruhe',
                        '-de': 'Karlsruhe'
                    }, {
                        val: '60',
                        i18n: 'Freiburg',
                        '-en': 'Freiburg',
                        '-de': 'Freiburg'
                    }, {
                        val: '61',
                        i18n: 'Stuttgart',
                        '-en': 'Stuttgart',
                        '-de': 'Stuttgart'
                    }, {
                        val: '62',
                        i18n: 'Reutlingen',
                        '-en': 'Reutlingen',
                        '-de': 'Reutlingen'
                    }, {
                        val: '63',
                        i18n: 'München Stadt u. Land',
                        '-en': 'München Stadt u. Land',
                        '-de': 'München Stadt u. Land'
                    }, {
                        val: '64',
                        i18n: 'Oberbayern',
                        '-en': 'Oberbayern',
                        '-de': 'Oberbayern'
                    }, {
                        val: '65',
                        i18n: 'Oberfranken',
                        '-en': 'Oberfranken',
                        '-de': 'Oberfranken'
                    }, {
                        val: '66',
                        i18n: 'Mittelfranken',
                        '-en': 'Mittelfranken',
                        '-de': 'Mittelfranken'
                    }, {
                        val: '67',
                        i18n: 'Unterfranken',
                        '-en': 'Unterfranken',
                        '-de': 'Unterfranken'
                    }, {
                        val: '68',
                        i18n: 'Oberpfalz',
                        '-en': 'Oberpfalz',
                        '-de': 'Oberpfalz'
                    }, {
                        val: '69',
                        i18n: 'Niederbayern',
                        '-en': 'Niederbayern',
                        '-de': 'Niederbayern'
                    }, {
                        val: '70',
                        i18n: 'Schwaben',
                        '-en': 'Schwaben',
                        '-de': 'Schwaben'
                    }, {
                        val: '72',
                        i18n: 'Berlin',
                        '-en': 'Berlin',
                        '-de': 'Berlin'
                    }, {
                        val: '73',
                        i18n: 'Saarland',
                        '-en': 'Saarland',
                        '-de': 'Saarland'
                    }, {
                        val: '78',
                        i18n: 'Mecklenburg-Vorpommern',
                        '-en': 'Mecklenburg-Vorpommern',
                        '-de': 'Mecklenburg-Vorpommern'
                    }, {
                        val: '79',
                        i18n: 'Potsdam',
                        '-en': 'Potsdam',
                        '-de': 'Potsdam'
                    }, {
                        val: '80',
                        i18n: 'Cottbus',
                        '-en': 'Cottbus',
                        '-de': 'Cottbus'
                    }, {
                        val: '81',
                        i18n: 'Frankfurt/Oder',
                        '-en': 'Frankfurt/Oder',
                        '-de': 'Frankfurt/Oder'
                    }, {
                        val: '83',
                        i18n: 'Brandenburg',
                        '-en': 'Brandenburg',
                        '-de': 'Brandenburg'
                    }, {
                        val: '85',
                        i18n: 'Magdeburg',
                        '-en': 'Magdeburg',
                        '-de': 'Magdeburg'
                    }, {
                        val: '86',
                        i18n: 'Halle',
                        '-en': 'Halle',
                        '-de': 'Halle'
                    }, {
                        val: '87',
                        i18n: 'Dessau',
                        '-en': 'Dessau',
                        '-de': 'Dessau'
                    }, {
                        val: '93',
                        i18n: 'Thüringen',
                        '-en': 'Thüringen',
                        '-de': 'Thüringen'
                    }, {
                        val: '94',
                        i18n: 'Chemnitz',
                        '-en': 'Chemnitz',
                        '-de': 'Chemnitz'
                    }, {
                        val: '95',
                        i18n: 'Dresden',
                        '-en': 'Dresden',
                        '-de': 'Dresden'
                    }, {
                        val: '96',
                        i18n: 'Leipzig',
                        '-en': 'Leipzig',
                        '-de': 'Leipzig'
                    }, {
                        val: '99',
                        i18n: 'Knappschaft',
                        '-en': 'Knappschaft',
                        '-de': 'Knappschaft'
                    }, {
                        val: '01',
                        i18n: 'Schleswig-Holstein',
                        '-en': 'Schleswig-Holstein',
                        '-de': 'Schleswig-Holstein'
                    }, {
                        val: '02',
                        i18n: 'Hamburg',
                        '-en': 'Hamburg',
                        '-de': 'Hamburg'
                    }, {
                        val: '03',
                        i18n: 'Bremen',
                        '-en': 'Bremen',
                        '-de': 'Bremen'
                    }]
            },
            "FederalState_E": {
                "type": "string",
                "list": [
                    {
                        "val": "BW",
                        i18n: i18n( 'location-schema.FederalState_E.BW' ),
                        "-en": "Baden-Württemberg",
                        "-de": "Baden-Württemberg"
                    },
                    {
                        "val": "BY",
                        i18n: i18n( 'location-schema.FederalState_E.BY' ),
                        "-en": "Bavaria",
                        "-de": "Bayern"
                    },
                    {
                        "val": "BE",
                        i18n: i18n( 'location-schema.FederalState_E.BE' ),
                        "-en": "Berlin",
                        "-de": "Berlin"
                    },
                    {
                        "val": "BB",
                        i18n: i18n( 'location-schema.FederalState_E.BB' ),
                        "-en": "Brandenburg",
                        "-de": "Brandenburg"
                    },
                    {
                        "val": "HB",
                        i18n: i18n( 'location-schema.FederalState_E.HB' ),
                        "-en": "Bremen",
                        "-de": "Bremen"
                    },
                    {
                        "val": "HH",
                        i18n: i18n( 'location-schema.FederalState_E.HH' ),
                        "-en": "Hamburg",
                        "-de": "Hamburg"
                    },
                    {
                        "val": "HE",
                        i18n: i18n( 'location-schema.FederalState_E.HE' ),
                        "-en": "Hesse",
                        "-de": "Hessen"
                    },
                    {
                        "val": "MV",
                        i18n: i18n( 'location-schema.FederalState_E.MV' ),
                        "-en": "Mecklenburg-Vorpommern",
                        "-de": "Mecklenburg-Vorpommern"
                    },
                    {
                        "val": "NI",
                        i18n: i18n( 'location-schema.FederalState_E.NI' ),
                        "-en": "Lower Saxony",
                        "-de": "Niedersachsen"
                    },
                    {
                        "val": "NW",
                        i18n: i18n( 'location-schema.FederalState_E.NW' ),
                        "-en": "North Rhine-Westphalia",
                        "-de": "Nordrhein-Westfalen"
                    },
                    {
                        "val": "RP",
                        i18n: i18n( 'location-schema.FederalState_E.RP' ),
                        "-en": "Rhineland-Palatinate",
                        "-de": "Rheinland Pfalz"
                    },
                    {
                        "val": "SL",
                        i18n: i18n( 'location-schema.FederalState_E.SL' ),
                        "-en": "Saarland",
                        "-de": "Saarland"
                    },
                    {
                        "val": "SN",
                        i18n: i18n( 'location-schema.FederalState_E.SN' ),
                        "-en": "Saxony",
                        "-de": "Sachsen"
                    },
                    {
                        "val": "ST",
                        i18n: i18n( 'location-schema.FederalState_E.ST' ),
                        "-en": "Saxony-Anhalt",
                        "-de": "Sachen-Anhalt"
                    },
                    {
                        "val": "SH",
                        i18n: i18n( 'location-schema.FederalState_E.SH' ),
                        "-en": "Schleswig-Holstein",
                        "-de": "Schleswig Holstein"
                    },
                    {
                        "val": "TH",
                        i18n: i18n( 'location-schema.FederalState_E.TH' ),
                        "-en": "Thuringia",
                        "-de": "Thüringen"
                    }
                ]
            },
            "Budgets_T": {
                "type": {
                    "complex": "eq",
                    "type": "Budget_E",
                    "lib": types,
                    i18n: i18n( 'location-schema.Location_T.budgetType.i18n' ),
                    "-en": "Budget Type",
                    "-de": "Budgettyp"
                },
                "specialities": {
                    "type": [String],
                    i18n: i18n( 'employee-schema.Employee_T.specialities' ),
                    "-en": "Specialisations",
                    "-de": "Fachgebiete"
                },
                "startBudget": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.startBudget.i18n' ),
                    "validate": "Location_T_startBudget",
                    "-en": "Start Budget",
                    "-de": "Start Budgett"
                },
                "startDate": {
                    "type": 'Date',
                    "validate": "Location_T_startDate",
                    i18n: i18n( 'location-schema.Location_T.startBudget.i18n' ),
                    "-en": "Start Date Budget",
                    "-de": "Startdatum Budget"
                },
                "patientAgeRange1": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange1.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter 0-15",
                    "-de": "Pat. Alter 0-15"
                },
                "patientAgeRange2": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange2.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter 16-49",
                    "-de": "Pat. Alter Alter 16-49"
                },
                "patientAgeRange3": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange3.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter 50-65",
                    "-de": "Pat. Alter 50-65"
                },
                "patientAgeRange4": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange4.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter >65",
                    "-de": "Pat. Alter >65"
                }
            },
            "Budget_E": {
                "type": "string",
                "list": [
                    {
                        "val": "MEDICATION",
                        i18n: i18n( 'llocation-schema.Location_T.medBudget.i18n' ),
                        "-en": "Medication Budget",
                        "-de": "Medikamentenbudgett"
                    },
                    {
                        "val": "KBVUTILITY",
                        i18n: i18n( 'location-schema.Location_T.utBudget.i18n' ),
                        "-en": "Utility Budget",
                        "-de": "Heilmittelbudget"
                    }
                ]
            },
            "StockLocation_T": {
                "title": {
                    "type": "String",
                    required: true,
                    i18n: i18n( 'location-schema.Location_T.StockLocation_T.title' ),
                    "-en": "Title",
                    "-de": "Titel"
                },
                "description": {
                    "type": "String",
                    required: true,
                    i18n: i18n( 'location-schema.Location_T.StockLocation_T.description' ),
                    "-en": "Description",
                    "-de": "Beschreibung"
                }
            },
            "SuperLocation_T": {
                "slName": {
                    "type": "String",
                    i18n: i18n( 'location-schema.SuperLocation_T.slName' ),
                    "-en": "Super location name",
                    "-de": "Super-Betriebsstättenname"
                },
                "slMain": {
                    "type": "Boolean",
                    i18n: i18n( 'location-schema.SuperLocation_T.slMain' ),
                    "-en": "Main location",
                    "-de": "Hauptbetriebsstätte"
                },
                "slMembers": {
                    "type": ["String"],
                    i18n: i18n( 'location-schema.SuperLocation_T.slMembers' ),
                    "-en": "Assigned locations",
                    "-de": "Zugehörige Betriebsstätten"
                }
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Our Schema Methods and Hooks are defined here -------

        /**
         * Class Location Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            indexes: [
                {
                    key: {
                        _id:1,
                        locname: 1,
                        stockLocations: 1
                    },
                    indexType: { collation:{ locale: 'de', numericOrdering:true} }
                }
            ],

            name: NAME,

            getMainLocationId: function getMainLocationId() {
                return MAINLOCATION_ID;
            },

            /**
             * Rearranges the weekly Times object into
             *  7 arrays - one for each day of the week.  Each one contains a list of {start,end} objects.
             *
             * @param {Object} times - a weeklyTimes object
             * @param {String} scheduleType - scheduleType of appointment
             * @returns {Array} result - array of 7 arrays for each day of week
             */
            unpackWeeklyTimes: function unpackWeeklyTimes( times, scheduleType ) {
                var i,
                    j,
                    k,
                    time,
                    day,
                    result = [
                        [],
                        [],
                        [],
                        [],
                        [],
                        [],
                        []
                    ];

                function sortedInsertByStart( time, list ) {
                    function compareTimes( t1, t2 ) {
                        return t2.start[0] - t1.start[0];
                    }

                    Y.doccirrus.utils.sort.sortedInsert(
                        time, list, compareTimes
                    );
                }

                if( times && Array.isArray( times ) ) {
                    for( i = 0; i < times.length; i++ ) {
                        // skip calendar consultTime if it doesn't have desired scheduleType
                        if( scheduleType && times[i].scheduleTypes && times[i].scheduleTypes[0] && !times[i].scheduleTypes.includes( scheduleType ) ) {
                            continue;
                        }
                        time = {};

                        if( times[i].repetitionSettings && times[i].repetitionSettings[0] ) {
                            time.repetitionSettings = JSON.parse( JSON.stringify( times[i].repetitionSettings[0] ) );

                            if( 'WEEKLY' !== time.repetitionSettings.freq ) {
                                // means that we have no values in 'days' array so just put all days there
                                for( k = 1; k < 8; k++ ) {
                                    times[i].days.push( k );
                                }
                            }
                        }

                        time.start = times[i].start;
                        time.end = times[i].end;
                        if( times[i].range ){
                            time.range = times[i].range;
                        }
                        time.availableScheduletypes = times[i].scheduleTypes;
                        time.colorOfConsults = times[i].colorOfConsults;
                        time.privateInsurance = times[i].privateInsurance;
                        time.publicInsurance = times[i].publicInsurance;
                        for( j = 0; j < times[i].days.length; j++ ) {
                            day = times[i].days[j];
                            if( day > 6 ) {
                                day = day % 7;
                            }
                            // need to check this is ok.
                            if( 0 <= day && 6 >= day ) {
                                sortedInsertByStart( time, result[day] );
                            }
                        }
                    }
                }
                return result;
            },

            getWeeklyTimeDayAlias: function getWeeklyTimeDayAlias() {
                return {
                    1: i18n( 'location-schema.WeeklyTime_T.days.alias.MO' ),
                    2: i18n( 'location-schema.WeeklyTime_T.days.alias.TU' ),
                    3: i18n( 'location-schema.WeeklyTime_T.days.alias.WE' ),
                    4: i18n( 'location-schema.WeeklyTime_T.days.alias.TH' ),
                    5: i18n( 'location-schema.WeeklyTime_T.days.alias.FR' ),
                    6: i18n( 'location-schema.WeeklyTime_T.days.alias.SA' ),
                    7: i18n( 'location-schema.WeeklyTime_T.days.alias.SU' )
                };
            },
            getGkvInvoiceReceiverFromCommercialNo: function( commercialNo ) {
                var result, notAllowed, isValid;
                if( !commercialNo || commercialNo.length < 2 ) {
                    return null;
                }

                // MOJ-3735 destination is the regional number of a KV. Usually this number can be determined by the first two digits of the bsnr number,
                // but recently this changed for Niedersachsen... destination is now always the kv number 17
                notAllowed = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16'];
                result = commercialNo.substring( 0, 2 );

                if( -1 !== notAllowed.indexOf( result ) ) {
                    result = '17';
                }

                // MOJ-3772
                if( '53' === result ) {
                    result = '55';
                }

                isValid = Y.doccirrus.schemas.location.types.GkvInvoiceReceiver_E.list.some( function( entry ) {
                    return entry.val === result;
                } );

                return isValid ? result : null;
            },
            cacheQuery: true

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );

    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader',
            'person-schema',
            'v_repeatedconfig-schema',
            'simpleperson-schema',
            'settings-schema',
            'countrymode-schema'
        ]
    }
);
