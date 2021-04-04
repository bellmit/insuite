/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */

'use strict';

YUI.add( 'ldt_v_20_old', function( Y ) {

        var moment = Y.doccirrus.commonutils.getMoment();

        let ldt20_old = {};
                    
        ldt20_old.type = "ldt";
        ldt20_old.name = "ldt20";
        ldt20_old.version = "LDT1001.02";
        ldt20_old.versionField = "9212";
        ldt20_old.acceptedVersions = ["LDT1001.02", "LDT1001.01"];

        ldt20_old.dateFormat = "DDMMYYYY";
        ldt20_old.shortDateFormat = "MMYY";
        ldt20_old.timeFormat = "HHmm";

        ldt20_old.sizeCounter = 1; //1 byte for the counter
        ldt20_old.sizeLabel = 3; //3 bytes for the Label: B00/B01/B02
        ldt20_old.sizeDataField = 128; //128 bytes for field content
        ldt20_old.sizeCrc16 = 4;
        ldt20_old.sizeLen = 3;
        ldt20_old.sizeRecLen = 5;
        ldt20_old.sizefileLen = 8;
        ldt20_old.sizeSatz = 4;
        ldt20_old.sizeFk = 4;

        ldt20_old.encodings = ["ASCII (german)", "Code page 437", "ISO 8859-1", "ISO 8859-15"];
        ldt20_old.encodingField = "9106";

        ldt20_old.serialCr = "[CR]"; //0x0D
        ldt20_old.serialNewLineReplacement = "[FS]"; //0x1C

        ldt20_old.recordType = "8000";
        ldt20_old.recordSize = "8100";
        ldt20_old.objType = "8200";
        ldt20_old.objEntries = "8201";
        ldt20_old.recordEntries = "8100";
        ldt20_old.recordLength = "9202";

        ldt20_old.saetze = {
            //id -> {desc, attribute, fk}
            "0020": {
                desc: "Datenträger-Header", attribute: "dataHeader", fk: {
                    "fk8000": {amount: "1", optional: false},
                    "fk8100": {amount: "1", optional: false},
                    "fk9105": {amount: "1", optional: false},
                    "fk9901": {amount: "n", optional: true}
                }
            },
            "0021": {
                desc: "Datenträger-Abschluss", attribute: "dataFooter", fk: {
                    "fk8000": {amount: "1", optional: false},
                    "fk8100": {amount: "1", optional: false},
                    "fk9901": {amount: "n", optional: true}
                }
            },
            "8201": {
                desc: "Labor-Bericht", attribute: "labReport", fk: {
                    "fk8000":         {amount: "1", optional: false},
                    "fk8100":         {amount: "1", optional: false},
                    "fk8310":         {amount: "1", optional: false}, //dependency: R409
                    "fk8311":         {amount: "1", optional: true},
                    "fk8301":         {amount: "1", optional: false},
                    "fk8302":         {amount: "1", optional: false},
                    "fk8303":         {amount: "1", optional: true},
                    "fk3100":         {amount: "1", optional: true},
                    "fk3120":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R409
                    "fk3102":         {amount: "1", optional: false}, //dependency: R409
                    "fk3103":         {amount: "1", optional: false}, //dependency: R409
                    "fk3104":         {amount: "1", optional: true},
                    "fk8401":         {amount: "1", optional: false},
                    "fk8609":         {amount: "1", optional: false}, //dependency: R387
                    "fk8615":         {amount: "1", optional: true}, //dependency: R719
                    "fk8403":         {amount: "1", optional: false}, //dependency: R387
                    "fk8405":         {amount: "1", optional: true},
                    "fk8407":         {amount: "1", optional: true},
                    "fk8410":         {amount: "n", optional: false, children: {
                        "fk8411":     {amount: "1", optional: true},
                        "fk5001":     {amount: "n", optional: true, children: { //dependency: R391
                            "fk8406": {amount: "1", optional: true}, //dependency: R384
                            "fk5005": {amount: "1", optional: true},
                            "fk8614": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk8418":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8420":     {amount: "1", optional: true},
                        "fk8421":     {amount: "1", optional: false}, //dependency: R378
                        "fk8480":     {amount: "n", optional: true},
                        "fk8470":     {amount: "n", optional: true},
                        "fk8460":     {amount: "n", optional: true},
                        "fk8461":     {amount: "1", optional: true},
                        "fk8462":     {amount: "1", optional: true},
                        "fk8422":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk8490":         {amount: "n", optional: true},
                    "fk9901":         {amount: "n", optional: true}
                }
            },
            "8202": {
                desc: "LG-Bericht", attribute: "lgReport", fk: {
                    "fk8000":         {amount: "1", optional: false},
                    "fk8100":         {amount: "1", optional: false},
                    "fk8310":         {amount: "1", optional: false},
                    "fk8311":         {amount: "1", optional: true},
                    "fk8301":         {amount: "1", optional: false},
                    "fk8302":         {amount: "1", optional: false},
                    "fk8303":         {amount: "1", optional: true},
                    "fk3100":         {amount: "1", optional: true},
                    "fk3120":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: true},
                    "fk3102":         {amount: "1", optional: true},
                    "fk3103":         {amount: "1", optional: true},
                    "fk3104":         {amount: "1", optional: true},
                    "fk8401":         {amount: "1", optional: false},
                    "fk8609":         {amount: "1", optional: false}, //dependency: R387
                    "fk8615":         {amount: "1", optional: true}, //dependency: R719
                    "fk8403":         {amount: "1", optional: false}, //dependency: R387
                    "fk8405":         {amount: "1", optional: true},
                    "fk8407":         {amount: "1", optional: true},
                    "fk8410":         {amount: "n", optional: false, children: {
                        "fk8411":     {amount: "1", optional: true},
                        "fk5001":     {amount: "n", optional: true, children: { //dependency: R391
                            "fk8406": {amount: "1", optional: true}, //dependency: R384
                            "fk5002": {amount: "1", optional: true},
                            "fk5005": {amount: "1", optional: true},
                            "fk5009": {amount: "1", optional: true},
                            "fk8614": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk8418":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8420":     {amount: "1", optional: true},
                        "fk8421":     {amount: "1", optional: false}, //dependency: R378
                        "fk8480":     {amount: "n", optional: true},
                        "fk8470":     {amount: "n", optional: true},
                        "fk8460":     {amount: "n", optional: true},
                        "fk8461":     {amount: "1", optional: true},
                        "fk8462":     {amount: "1", optional: true},
                        "fk8422":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk8490":         {amount: "n", optional: true},
                    "fk9901":         {amount: "n", optional: true}
                }
            },
            "8203": {
                desc: "Mikrobiologie-Bericht", attribute: "mbReport", fk: {
                    "fk8000":         {amount: "1", optional: false},
                    "fk8100":         {amount: "1", optional: false},
                    "fk8310":         {amount: "1", optional: false}, //dependency: R409
                    "fk8311":         {amount: "1", optional: true},
                    "fk8301":         {amount: "1", optional: false},
                    "fk8302":         {amount: "1", optional: false},
                    "fk8303":         {amount: "1", optional: true},
                    "fk3100":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R409
                    "fk3102":         {amount: "1", optional: false}, //dependency: R409
                    "fk3103":         {amount: "1", optional: false}, //dependency: R409
                    "fk3104":         {amount: "1", optional: true},
                    "fk8401":         {amount: "1", optional: false},
                    "fk8609":         {amount: "1", optional: false}, //dependency: R387
                    "fk8615":         {amount: "1", optional: true}, //dependency: R719
                    "fk8403":         {amount: "1", optional: false}, //dependency: R387
                    "fk8405":         {amount: "1", optional: true},
                    "fk8407":         {amount: "1", optional: true},
                    "fk8434":         {amount: "n", optional: true, children: {
                        "fk5001":     {amount: "n", optional: true, children: { //dependency: R391
                            "fk8406": {amount: "1", optional: true}, //dependency: R384
                            "fk5005": {amount: "1", optional: true},
                            "fk8614": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk8418":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8420":     {amount: "1", optional: true},
                        "fk8421":     {amount: "1", optional: false}, //dependency: R378
                        "fk8480":     {amount: "n", optional: true},
                        "fk8470":     {amount: "n", optional: true},
                        "fk8460":     {amount: "n", optional: true},
                        "fk8461":     {amount: "1", optional: true},
                        "fk8462":     {amount: "1", optional: true},
                        "fk8422":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk8410":         {amount: "n", optional: false, children: {
                        "fk8411":     {amount: "1", optional: true},
                        "fk5001":     {amount: "n", optional: true, children: { //dependency: R391
                            "fk8406": {amount: "1", optional: true}, //dependency: R384
                            "fk5005": {amount: "1", optional: true},
                            "fk8614": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk8418":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8420":     {amount: "1", optional: true},
                        "fk8421":     {amount: "1", optional: false}, //dependency: R378
                        "fk8480":     {amount: "n", optional: true},
                        "fk8470":     {amount: "n", optional: true},
                        "fk8460":     {amount: "n", optional: true},
                        "fk8461":     {amount: "1", optional: true},
                        "fk8462":     {amount: "1", optional: true},
                        "fk8422":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk8490":         {amount: "n", optional: true},
                    "fk9901":         {amount: "n", optional: true}
                }
            },
            "8204": {
                desc: "Labor-Bericht \"Sonstige Einsendepraxen\"", attribute: "seReport", fk: {
                    "fk8000":         {amount: "1", optional: false},
                    "fk8100":         {amount: "1", optional: false},
                    "fk8310":         {amount: "1", optional: false}, //dependency: R409
                    "fk8311":         {amount: "1", optional: true},
                    "fk8301":         {amount: "1", optional: false},
                    "fk8302":         {amount: "1", optional: false},
                    "fk8303":         {amount: "1", optional: true},
                    "fk3100":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R409
                    "fk3102":         {amount: "1", optional: false}, //dependency: R409
                    "fk3103":         {amount: "1", optional: false}, //dependency: R409
                    "fk3104":         {amount: "1", optional: true},
                    "fk8401":         {amount: "1", optional: false},
                    "fk8609":         {amount: "1", optional: false}, //dependency: R387
                    "fk8615":         {amount: "1", optional: true}, //dependency: R719
                    "fk8403":         {amount: "1", optional: false}, //dependency: R387
                    "fk8405":         {amount: "1", optional: true},
                    "fk8434":         {amount: "n", optional: true, children: {
                        "fk5001":     {amount: "n", optional: true, children: { //dependency: R391
                            "fk8406": {amount: "1", optional: true}, //dependency: R384
                            "fk5005": {amount: "1", optional: true},
                            "fk8614": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk8418":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8420":     {amount: "1", optional: true},
                        "fk8421":     {amount: "1", optional: false}, //dependency: R378
                        "fk8480":     {amount: "n", optional: true},
                        "fk8470":     {amount: "n", optional: true},
                        "fk8460":     {amount: "n", optional: true},
                        "fk8461":     {amount: "1", optional: true},
                        "fk8462":     {amount: "1", optional: true},
                        "fk8422":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk8410":         {amount: "n", optional: false, children: {
                        "fk8411":     {amount: "1", optional: true},
                        "fk5001":     {amount: "n", optional: true, children: { //dependency: R391
                            "fk8406": {amount: "1", optional: true}, //dependency: R384
                            "fk5005": {amount: "1", optional: true},
                            "fk8614": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk8418":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8420":     {amount: "1", optional: true},
                        "fk8421":     {amount: "1", optional: false}, //dependency: R378
                        "fk8480":     {amount: "n", optional: true},
                        "fk8470":     {amount: "n", optional: true},
                        "fk8460":     {amount: "n", optional: true},
                        "fk8461":     {amount: "1", optional: true},
                        "fk8462":     {amount: "1", optional: true},
                        "fk8422":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk8490":         {amount: "n", optional: true},
                    "fk9901":         {amount: "n", optional: true}
                }
            },
            "8218": {
                desc: "Elektronische Überweisung", attribute: "elTransaction", fk: {
                    "fk8000":         {amount: "1", optional: false},
                    "fk8100":         {amount: "1", optional: false},
                    "fk8310":         {amount: "1", optional: false},
                    "fk8313":         {amount: "1", optional: true},
                    "fk8609":         {amount: "1", optional: false},
                    "fk8614":         {amount: "1", optional: true},
                    "fk8615":         {amount: "1", optional: true}, //dependency: R719
                    "fk3100":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R434
                    "fk3102":         {amount: "1", optional: false}, //dependency: R434
                    "fk3103":         {amount: "1", optional: false},
                    "fk3104":         {amount: "1", optional: true},
                    "fk3105":         {amount: "1", optional: false}, //dependency: R434, R811
                    "fk3107":         {amount: "1", optional: false}, //dependency: R434
                    "fk3112":         {amount: "1", optional: false}, //dependency: R434
                    "fk3114":         {amount: "1", optional: false}, //dependency: R434
                    "fk3113":         {amount: "1", optional: false}, //dependency: R434
                    "fk3116":         {amount: "1", optional: false}, //dependency: R???
                    "fk3108":         {amount: "1", optional: false}, //dependency: R434
                    "fk8405":         {amount: "1", optional: true},
                    "fk8407":         {amount: "1", optional: true},
                    "fk3200":         {amount: "1", optional: true},
                    "fk3201":         {amount: "1", optional: true},
                    "fk3202":         {amount: "1", optional: true},
                    "fk3203":         {amount: "1", optional: true},
                    "fk3206":         {amount: "1", optional: true},
                    "fk3205":         {amount: "1", optional: true},
                    "fk3207":         {amount: "1", optional: true},
                    "fk3209":         {amount: "1", optional: true},
                    "fk2002":         {amount: "1", optional: false}, //dependency: R434
                    "fk4104":         {amount: "1", optional: false}, //dependency: R434
                    "fk4106":         {amount: "1", optional: false}, //dependency: R434
                    "fk4109":         {amount: "1", optional: false}, //dependency: R???
                    "fk4110":         {amount: "1", optional: false}, //dependency: R???, 811
                    "fk4111":         {amount: "1", optional: false}, //dependency: R434
                    "fk4112":         {amount: "1", optional: true},
                    "fk4113":         {amount: "1", optional: true},
                    "fk8403":         {amount: "1", optional: false},
                    "fk4202":         {amount: "1", optional: true},
                    "fk4122":         {amount: "1", optional: false}, //dependency: R434
                    "fk4209":         {amount: "n", optional: true},
                    "fk4217":         {amount: "1", optional: true, children: { //dependency: R431
                        "fk4241":     {amount: "1", optional: false},
                        "fk9901":     {amount: "n", optional: true}}}, //dependency: R713
                    "fk4218":         {amount: "1", optional: false, children: { //dependency: R434
                        "fk4242":     {amount: "1", optional: false},
                        "fk9901":     {amount: "n", optional: true}}}, //dependency: R714
                    "fk4219":         {amount: "1", optional: false}, //dependency: R434
                    "fk4220":         {amount: "1", optional: false}, //dependency: R386, 434
                    "fk4239":         {amount: "1", optional: false}, //dependency: R434
                    "fk4221":         {amount: "1", optional: false}, //dependency: R404
                    "fk4229":         {amount: "1", optional: true}, //dependency: R432
                    "fk4231":         {amount: "1", optional: true},
                    "fk8610":         {amount: "1", optional: false}, //dependency: R398
                    "fk8601":         {amount: "1", optional: false}, //dependency: R398, 399
                    "fk8602":         {amount: "1", optional: false}, //dependency: R398, 399
                    "fk8606":         {amount: "1", optional: false}, //dependency: R398, 399
                    "fk8607":         {amount: "1", optional: false}, //dependency: R398, 399
                    "fk8608":         {amount: "1", optional: true}, //dependency: R402
                    "fk8503":         {amount: "1", optional: true},
                    "fk8510":         {amount: "1", optional: true, children: {
                        "fk8511":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}}, //dependency: R423
                    "fk8504":         {amount: "n", optional: true},
                    "fk8512":         {amount: "1", optional: true},
                    "fk3622":         {amount: "1", optional: true},
                    "fk3623":         {amount: "1", optional: true},
                    "fk8501":         {amount: "1", optional: true, children: {
                        "fk8611":     {amount: "n", optional: true, children: { //dependency: R394
                            "fk8612": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk9901":     {amount: "n", optional: true}}}, //dependency: R422
                    "fk8613":         {amount: "n", optional: true},
                    "fk8434":         {amount: "n", optional: true, children: {
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8520":     {amount: "1", optional: true, children: {
                            "fk8521": {amount: "1", optional: false},
                            "fk8522": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk8410":         {amount: "n", optional: true, children: {
                        "fk8411":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //dependency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8520":     {amount: "1", optional: true, children: {
                            "fk8521": {amount: "1", optional: false},
                            "fk8522": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk9901":         {amount: "n", optional: true}
                }
            },
            "8219": {
                desc: "Auftrag an eine Laborgemeinschaft", attribute: "lgRequest", fk: {
                    "fk8000":         {amount: "1", optional: false},
                    "fk8100":         {amount: "1", optional: false},
                    "fk8310":         {amount: "1", optional: false},
                    "fk8313":         {amount: "1", optional: true},
                    "fk8609":         {amount: "1", optional: false},
                    "fk8614":         {amount: "1", optional: true},
                    "fk8615":         {amount: "1", optional: true}, //depdendency: R719
                    "fk3103":         {amount: "1", optional: false},
                    "fk8405":         {amount: "1", optional: true},
                    "fk8407":         {amount: "1", optional: true},
                    "fk8503":         {amount: "1", optional: true},
                    "fk8424":         {amount: "1", optional: true},
                    "fk8510":         {amount: "1", optional: true, children: {
                        "fk8511":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}}, //depdendency: R423
                    "fk8504":         {amount: "1", optional: true},
                    "fk8512":         {amount: "1", optional: true},
                    "fk3622":         {amount: "1", optional: true},
                    "fk3623":         {amount: "1", optional: true},
                    "fk8403":         {amount: "1", optional: false},
                    "fk8425":         {amount: "1", optional: true},
                    "fk8423":         {amount: "1", optional: true},
                    "fk8501":         {amount: "1", optional: true, children: {
                        "fk8611":     {amount: "n", optional: true, children: { //depdendency: R394
                            "fk8612": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk9901":     {amount: "n", optional: true}}}, //depdendency: R422
                    "fk8613":         {amount: "n", optional: true},
                    "fk8410":         {amount: "n", optional: false, children: {
                        "fk8411":     {amount: "1", optional: true},
                        "fk8428":     {amount: "1", optional: true},
                        "fk8429":     {amount: "1", optional: true},
                        "fk8430":     {amount: "1", optional: true},
                        "fk8431":     {amount: "n", optional: true}, //depdendency: R393
                        "fk8432":     {amount: "1", optional: true},
                        "fk8433":     {amount: "1", optional: true},
                        "fk8520":     {amount: "1", optional: true, children: {
                            "fk8521": {amount: "1", optional: false},
                            "fk8522": {amount: "1", optional: true},
                            "fk9901": {amount: "n", optional: true}}},
                        "fk9901":     {amount: "n", optional: true}}},
                    "fk9901":         {amount: "n", optional: true}
                }
            },
            "8220": {
                desc: "L-Datenpaket-Header", attribute: "lPackageHeader", fk: {
                    "fk8000":     {amount: "1", optional: false},
                    "fk8100":     {amount: "1", optional: false},
                    "fk9212":     {amount: "1", optional: false},
                    "fk0201":     {amount: "1", optional: false},
                    "fk0203":     {amount: "1", optional: false},
                    "fk0212":     {amount: "n", optional: false, children: {
                        "fk0211": {amount: "1", optional: false},
                        "fk9901": {amount: "n", optional: true}}},
                    "fk0205":     {amount: "1", optional: false},
                    "fk0215":     {amount: "1", optional: false},
                    "fk0216":     {amount: "1", optional: false},
                    "fk8300":     {amount: "1", optional: false}, //dependency: R425
                    "fk8320":     {amount: "1", optional: false}, //dependency: R425
                    "fk8321":     {amount: "1", optional: false}, //dependency: R425
                    "fk8322":     {amount: "1", optional: false}, //dependency: R425
                    "fk8323":     {amount: "1", optional: false}, //dependency: R425
                    "fk0101":     {amount: "1", optional: false},
                    "fk9106":     {amount: "1", optional: false},
                    "fk8312":     {amount: "1", optional: false},
                    "fk9103":     {amount: "1", optional: false},
                    "fk9472":     {amount: "n", optional: true},
                    "fk9300":     {amount: "1", optional: true},
                    "fk9301":     {amount: "1", optional: true},
                    "fk9901":     {amount: "n", optional: true}
                }
            },
            "8221": {
                desc: "L-Datenpaket-Abschluss", attribute: "lPackageFooter", fk: {
                    "fk8000": {amount: "1", optional: false},
                    "fk8100": {amount: "1", optional: false},
                    "fk9202": {amount: "1", optional: false},
                    "fk9901": {amount: "n", optional: true}
                }
            },
            "8230": {
                desc: "P-Datenpaket-Header", attribute: "pPackageHeader", fk: {
                    "fk8000":     {amount: "1", optional: false},
                    "fk8100":     {amount: "1", optional: false},
                    "fk9212":     {amount: "1", optional: false},
                    "fk0201":     {amount: "1", optional: false},
                    "fk0203":     {amount: "1", optional: false},
                    "fk0212":     {amount: "n", optional: false, children: {
                        "fk0211": {amount: "1", optional: false},
                        "fk9901": {amount: "n", optional: true}}},
                    "fk0205":     {amount: "1", optional: false},
                    "fk0215":     {amount: "1", optional: false},
                    "fk0216":     {amount: "1", optional: false},
                    "fk8300":     {amount: "1", optional: false}, //dependency: R425
                    "fk8320":     {amount: "1", optional: false}, //dependency: R425
                    "fk8321":     {amount: "1", optional: false}, //dependency: R425
                    "fk8322":     {amount: "1", optional: false}, //dependency: R425
                    "fk8323":     {amount: "1", optional: false}, //dependency: R425
                    "fk0101":     {amount: "1", optional: false},
                    "fk9106":     {amount: "1", optional: false},
                    "fk8312":     {amount: "1", optional: false},
                    "fk9103":     {amount: "1", optional: false},
                    "fk9472":     {amount: "n", optional: true},
                    "fk9300":     {amount: "1", optional: true},
                    "fk9301":     {amount: "1", optional: true},
                    "fk9901":     {amount: "n", optional: true}
                }
            },
            "8231": {
                desc: "P-Datenpaket-Abschluss", attribute: "pPackageFooter", fk: {
                    "fk8000": {amount: "1", optional: false},
                    "fk8100": {amount: "1", optional: false},
                    "fk9202": {amount: "1", optional: false},
                    "fk9901": {amount: "n", optional: true}
                }
            }
        };
        ldt20_old.fields = {
            "0101": {  desc: "KBV-Prüfnummer",                                               attribute: "kbvValidationNo",                type: "string", len: "16"  },
            "0201": {  desc: "Betriebs- (BSNR) oder Nebenbetriebsstättennummer (NBSNR)",     attribute: "bsnr",                           type: "number", len: "9"  },
            "0203": {  desc: "(N)BSNR-Bezeichnung",                                          attribute: "bsnrDesc",                       type: "string", len: "<=60"  },
            "0205": {  desc: "Straße der (N)BSNR-Adresse",                                   attribute: "bsnrStreet",                     type: "string", len: "<=60"  },
            "0211": {  desc: "Arztname",                                                     attribute: "docName",                        type: "string", len: "<=60"  },
            "0212": {  desc: "Lebenslange Arztnummer (LANR)",                                attribute: "docLANR",                        type: "number", len: "9"  },
            "0215": {  desc: "PLZ der (N)BSNR-Adresse",                                      attribute: "bsnrZip",                        type: "string", len: "<=7"  },
            "0216": {  desc: "Ort der (N)BSNR-Adresse",                                      attribute: "bsnrCity",                       type: "string", len: "<=60"  },
            "2002": {  desc: "Kassenname",                                                   attribute: "insName",                        type: "string", len: "<=28"  },
            "3100": {  desc: "Namenszusatz",                                                 attribute: "patientNameAdd",                 type: "string", len: "<=20"  },
            "3101": {  desc: "Name",                                                         attribute: "patientName",                    type: "string", len: "<=45"  },
            "3102": {  desc: "Vorname",                                                      attribute: "patientForename",                type: "string", len: "<=45"  },
            "3103": {  desc: "Geburtsdatum",                                                 attribute: "patientDob",                     type: "date",   len: "8", mapper: "date"  },
            "3104": {  desc: "Titel",                                                        attribute: "patientTitle",                   type: "string", len: "<=20"  },
            "3105": {  desc: "Versichertennummer",                                           attribute: "patientInsNo",                   type: "number", len: "6-12"  },
            "3107": {  desc: "Straße",                                                       attribute: "patientStreet",                  type: "string", len: "<=46"  },
            "3108": {  desc: "Versichertenart",                                              attribute: "patientInsKind",                 type: "number", len: "1", mapper: "insurancekind"  },
            "3112": {  desc: "PLZ",                                                          attribute: "patientZip",                     type: "string", len: "<=10"  },
            "3113": {  desc: "Ort",                                                          attribute: "patientCity",                    type: "string", len: "<=40"  },
            "3114": {  desc: "Wohnsitzlaendercode",                                          attribute: "patientCountrycode",             type: "string", len: "<=3"  },
            "3116": {  desc: "WOP",                                                          attribute: "patientWop",                     type: "string", len: "2", mapper: "wop"  },
            "3200": {  desc: "Namenszusatz/Vorsatzwort des Hauptversicherten",               attribute: "mainPatientPrefix",              type: "string", len: "<=15"  },
            "3201": {  desc: "Name des Hauptversicherten",                                   attribute: "mainPatientName",                type: "string", len: "<=28"  },
            "3202": {  desc: "Vorname des Hauptversicherten",                                attribute: "mainPatientForename",            type: "string", len: "<=28"  },
            "3203": {  desc: "Geburtsdatum des Hauptversicherten",                           attribute: "mainPatientDob",                 type: "date",   len: "8", mapper: "date"  },
            "3205": {  desc: "Straße des Hauptversicherten",                                 attribute: "mainPatientStreet",              type: "string", len: "<=28"  },
            "3206": {  desc: "Titel des Hauptversicherten",                                  attribute: "mainPatientTitle",               type: "string", len: "<=15"  },
            "3207": {  desc: "PLZ des Hauptversicherten",                                    attribute: "mainPatientZip",                 type: "string", len: "<=10"  },
            "3209": {  desc: "Wohnort des Hauptversicherten",                                attribute: "mainPatientCity",                type: "string", len: "<=23"  },
            "3622": {  desc: "Größe des Patienten",                                          attribute: "patientHeight",                  type: "float", mapper: "cm"  },
            "3623": {  desc: "Gewicht des Patienten",                                        attribute: "patientWeight",                  type: "float", mapper: "kg"  },
            "4104": {  desc: "VKNR",                                                         attribute: "insuranceVKNR",                  type: "number", len: "5"  },
            "4106": {  desc: "Kostenträger-Abrechnungsgebiet",                               attribute: "payerBillingArea",               type: "number", len: "2"  },
            "4109": {  desc: "Letzter Einlesetag der Versichertenkarte im Quartal",          attribute: "insurancelastCardReadOfQuarter", type: "date",   len: "8", mapper: "date"  },
            "4110": {  desc: "Bis-Datum der Gültigkeit",                                     attribute: "insuranceValidToDate",           type: "date",   len: "8", mapper: "date"  },
            "4111": {  desc: "Kostentraegerkennung",                                         attribute: "payerNo",                        type: "number", len: "9"  },
            "4112": {  desc: "Versichertenstatus KVK",                                       attribute: "insuranceStatusKvk",             type: "number", len: "4"  },
            "4113": {  desc: "Statusergänzung/DMPKennzeichnung",                             attribute: "insuranceStatusAdd",             type: "string", len: "1"  },
            "4122": {  desc: "Abrechnungsgebiet",                                            attribute: "insuranceBillingArea",           type: "number", len: "2"  },
            "4202": {  desc: "Unfall, Unfallfolgen",                                         attribute: "accident_consequences",          type: "number", len: "1"  },
            "4209": {  desc: "Auftrag/Diagnose/Verdacht",                                    attribute: "order_Diagnose",                 type: "string", len: "<=60"  },
            "4217": {  desc: "(N)BSNR (Nebenbetriebsstätten-nummer) des Erstveranlassers",   attribute: "initiatorBSNR",                  type: "number", len: "9"  },
            "4218": {  desc: "(N)BSNR des Überweisers",                                      attribute: "refBSNR",                        type: "number", len: "9", mapper: "nbsnr"  },
            "4219": {  desc: "Überweisung von anderen Ärzten",                               attribute: "refFromOther",                   type: "string", len: "<=60"  },
            "4220": {  desc: "Überweisung an",                                               attribute: "refTo",                          type: "string", len: "<=60"  },
            "4221": {  desc: "Behandlungstyp",                                               attribute: "treatmentType",                  type: "number", len: "1", mapper: "treatmenttype"  },
            "4229": {  desc: "Ausnahmeindikation",                                           attribute: "exceptionalMedIndication",       type: "number", len: "5"  },
            "4231": {  desc: "Kontrolluntersuchung einer bekannten Infektion",               attribute: "followUpOfKnownInfection",       type: "number", len: "1"  },
            "4239": {  desc: "Scheinuntergruppe",                                            attribute: "scheinSubgroup",                 type: "number", len: "2", mapper: "scheinuntergruppe"  },
            "4241": {  desc: "LANR (lebenslange Arztnummer) des Erstveranlassers",           attribute: "initiatorLANR",                  type: "number", len: "9"  },
            "4242": {  desc: "LANR des überweisers",                                         attribute: "refLANR",                        type: "number", len: "9"  },
            "5001": {  desc: "Gebührennummer (GNR)",                                         attribute: "gnr",                            type: "string", len: "<=9"  },
            "5002": {  desc: "Art der Untersuchung",                                         attribute: "inspectionKind",                 type: "string", len: "<=60"  },
            "5005": {  desc: "Multiplikator",                                                attribute: "factor",                         type: "number", len: "2"  },
            "5009": {  desc: "freier Begründungstext",                                       attribute: "reason",                         type: "string", len: "<=60"  },
            "8000": {  desc: "Satzart",                                                      attribute: "recordType",                     type: "string", len: "4", mapper: "satzID"  },
            "8100": {  desc: "Satzlänge",                                                    attribute: "recordSize",                     type: "number", len: "5", mapper: "byte"  },
            "8301": {  desc: "Eingangsdatum des Auftrags im Labor",                          attribute: "labReqReceived",                 type: "date",   len: "8", mapper: "date"  },
            "8302": {  desc: "Berichtsdatum",                                                attribute: "reportDate.date",                type: "date",   len: "8", mapper: "dateTime"  },
            "8303": {  desc: "Berichtszeit",                                                 attribute: "reportDate.time",                type: "time",   len: "4", mapper: "time"  },
            "8310": {  desc: "Anforderungs-Ident",                                           attribute: "recordRequestId",                type: "string", len: "<=13"  },
            "8311": {  desc: "Auftragsnummer des Labors",                                    attribute: "labReqNo",                       type: "string", len: "<=30"  },
            "8312": {  desc: "Kunden- (Arzt-) Nummer",                                       attribute: "customerNo",                     type: "string", len: "<=8"  },
            "8313": {  desc: "Nachforderung",                                                attribute: "subsequentReq",                  type: "number", len: "1"  },
            "8320": {  desc: "Laborname",                                                    attribute: "labName",                        type: "string", len: "<=60"  },
            "8321": {  desc: "Straße der Laboradresse",                                      attribute: "labStreet",                      type: "string", len: "<=60"  },
            "8322": {  desc: "PLZ der Laboradresse",                                         attribute: "labZip",                         type: "string", len: "<=7"  },
            "8323": {  desc: "Ort der Laboradresse",                                         attribute: "labCity",                        type: "string", len: "<=60"  },
            "8401": {  desc: "Befundart",                                                    attribute: "findingKind",                    type: "string", len: "1", mapper: "findingkind"  },
            "8403": {  desc: "Gebührenordnung",                                              attribute: "feeSchedule",                    type: "number", len: "1", mapper: "gebueO"  },
            "8405": {  desc: "Patienteninformation",                                         attribute: "patientAddInfo",                 type: "string", len: "<=60"  },
            "8406": {  desc: "Kosten in Cent",                                               attribute: "cost",                           type: "number", len: "<=60"  },
            "8407": {  desc: "\"Geschlecht\" des Patienten",                                 attribute: "patientGender",                  type: "number", len: "1", mapper: "gender"  },
            "8410": {  desc: "Test(s)",                                                      attribute: "testId",                         type: "string", len: "<=8"  },
            "8411": {  desc: "Testbezeichnung",                                              attribute: "testLabel",                      type: "string", len: "<=60"  },
            "8418": {  desc: "Teststatus",                                                   attribute: "testStatus",                     type: "string", len: "1", mapper: "teststatus"  },
            "8420": {  desc: "Ergebnis-Wert",                                                attribute: "testResultVal",                  type: "float"  },
            "8421": {  desc: "Einheit",                                                      attribute: "TestResultUnit",                 type: "string", len: "<=20"  },
            "8422": {  desc: "Grenzwert-Indikator",                                          attribute: "testResultLimitIndicator",       type: "string", len: "<=2"  },
            "8423": {  desc: "pathologisch bekannt",                                         attribute: "testResultPathKnown",            type: "number", len: "1"  },
            "8424": {  desc: "Mutterschaft",                                                 attribute: "maternity",                      type: "number", len: "1"  },
            "8425": {  desc: "Budget-frei",                                                  attribute: "budgetFree",                     type: "number", len: "1"  },
            "8428": {  desc: "Probenmaterial-Ident",                                         attribute: "sampleId",                       type: "string", len: "<=8"  },
            "8429": {  desc: "Probenmaterial-Index",                                         attribute: "sampleIndex",                    type: "number", len: "2"  },
            "8430": {  desc: "Probenmaterial-Bezeichnung",                                   attribute: "sampleLabel",                    type: "string", len: "<=60"  },
            "8431": {  desc: "Probenmaterial-Spezifikation",                                 attribute: "sampleSpec",                     type: "string", len: "<=60"  },
            "8432": {  desc: "Abnahme-Datum",                                                attribute: "sampleColDate.date",             type: "date",   len: "8", mapper: "dateTime"  },
            "8433": {  desc: "Abnahme-Zeit",                                                 attribute: "sampleColDate.time",             type: "time",   len: "4", mapper: "dateTime"  },
            "8434": {  desc: "Anforderungen",                                                attribute: "sampleRequests",                 type: "string", len: "<=60"  },
            "8460": {  desc: "Normalwert-Text",                                              attribute: "sampleNormalValueText",          type: "string", len: "<=60"  },
            "8461": {  desc: "Normalwert untere Grenze",                                     attribute: "sampleNormalValueLowerBound",    type: "float"  },
            "8462": {  desc: "Normalwert obere Grenze",                                      attribute: "sampleNormalValueUpperBound",    type: "float"  },
            "8470": {  desc: "Testbezogene Hinweise",                                        attribute: "sampleTestNotes",                type: "string", len: "<=60"  },
            "8480": {  desc: "Ergebnis-Text",                                                attribute: "sampleResultText",               type: "string", len: "<=60"  },
            "8490": {  desc: "Auftragsbezogene Hinweise",                                    attribute: "sampleRequestAdditionalInfo",    type: "string", len: "<=60"  },
            "8501": {  desc: "Dringlichkeitsstatus",                                         attribute: "sampleUrgency",                  type: "number", len: "1", mapper: "dringlichkeit"  },
            "8503": {  desc: "Infektiös",                                                    attribute: "sampleInfectious",               type: "number", len: "1"  },
            "8504": {  desc: "Medikamenteneinnahme zum Zeitpunkt der Probenentnahme",        attribute: "medicationTaken",                type: "string", len: "<=60"  },
            "8510": {  desc: "Schwangerschaft",                                              attribute: "pregnancy",                      type: "num",    len: "1", mapper: "pregnancy"  },
            "8511": {  desc: "Schwangerschaftsdauer (in Wochen, Tage)",                      attribute: "pregnancyGestationLen",          type: "num",    len: "3"  },
            "8512": {  desc: "1. Tag des letzten Zyklus",                                    attribute: "firstDayOfLastCycle",            type: "date",   len: "8", mapper: "date"  },
            "8520": {  desc: "Menge des Probenmaterials",                                    attribute: "sampleAmountVal",                type: "float", mapper: "sampleAmountVal"  },
            "8521": {  desc: "Maßeinheit",                                                   attribute: "sampleAmountUnit",               type: "string", len: "<=60"  },
            "8522": {  desc: "Sammelzeit des Probenmaterials",                               attribute: "sampleColSpan",                  type: "string", len: "4", mapper: "timespan"  },
            "8601": {  desc: "Name des Rechnungsempfängers",                                 attribute: "recipientName",                  type: "string", len: "<=28"  },
            "8602": {  desc: "Titel, Vorname des Rechnungsempfängers",                       attribute: "recipientTitleForename",         type: "string", len: "<=28"  },
            "8606": {  desc: "Wohnort des Rechnungsempfängers",                              attribute: "recipientCity",                  type: "string", len: "<=30"  },
            "8607": {  desc: "Straße des Rechnungsempfängers",                               attribute: "recipientStreetHouseno",         type: "string", len: "<=28"  },
            "8608": {  desc: "Kommentar / Aktenzeichen",                                     attribute: "Comment_RefNumber",              type: "string", len: "<=60"  },
            "8609": {  desc: "Abrechnungstyp",                                               attribute: "billingType",                    type: "string", len: "1", mapper: "abrechnungstyp"  },
            "8610": {  desc: "Privattarif",                                                  attribute: "privateCharges",                 type: "number", len: "1", mapper: "privattarif"  },
            "8611": {  desc: "zusätzlicher Befundweg",                                       attribute: "additionalWayFindings",          type: "number", len: "1", mapper: "zusBefundweg"  },
            "8612": {  desc: "Rufnummer",                                                    attribute: "callNumber",                     type: "string", len: "<=60"  },
            "8613": {  desc: "zusätzlicher Empfänger",                                       attribute: "additionalRecipients",           type: "string", len: "<=60"  },
            "8614": {  desc: "Abrechnung durch",                                             attribute: "BillingDoneBy",                  type: "number", len: "1", mapper: "abrechnungDurch"  },
            "8615": {  desc: "Auftraggeber",                                                 attribute: "labClient",                      type: "string", len: "<=60"  },
            "9103": {  desc: "Erstellungsdatum",                                             attribute: "dateOfCreation",                 type: "date",   len: "8", mapper: "date"  },
            "9105": {  desc: "Ordnungsnummer des Datenträgers dieses Datenpaketes",          attribute: "FileNumber",                     type: "number", len: "3"  },
            "9106": {  desc: "verwendeter Zeichensatz",                                      attribute: "encoding",                       type: "encoding", len: "1"  },
            "9202": {  desc: "Gesamtlänge des Datenpaketes",                                 attribute: "sizeTotal",                      type: "number", len: "8"  },
            "9212": {  desc: "Version der Satzbeschreibung",                                 attribute: "ldtVersion",                     type: "string", len: "<=11"  },
            "9300": {  desc: "Prüfsumme / Elektronische Signatur",                           attribute: "checksum_signature",             type: "string", len: "<=60"  },
            "9301": {  desc: "Kryptoschlüssel",                                              attribute: "cryptographicKey",               type: "string", len: "<=60"  },
            "9472": {  desc: "allgemeine Informationen",                                     attribute: "generalInformation",             type: "string", len: "<=60"  },
            "9901": {  desc: "Jokerfeld",                                                    attribute: "wildcardField",                  type: "string", len: "<=60"  },

            "0000": {  desc: "invalid", attribute: "invalid", type: "string", len: "42"  }
        };
        ldt20_old.objects = {};
        ldt20_old.stringMappers = {
            gender: function( prop, propInfo ) {
                var genderMap = {
                    "1": "männlich",
                    "2": "weiblich",
                    "M": "männlich",
                    "W": "weiblich",
                    "m": "männlich",
                    "w": "weiblich"
                };
                return [propInfo && propInfo.desc, genderMap[prop] || "ungültig (" + prop + ")"];
            },
            cm: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop + "cm"];
            },
            kg: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop + "kg"];
            },
            byte: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop + " byte"];
            },
            date: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, moment( prop ).format( "YYYY-MM-DD" )];
            },
            time: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, moment( prop ).format( "HH:mm:ss" )];
            },
            dateTime: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, moment( prop ).format( "YYYY-MM-DD HH:mm:ss" )];
            },
            satzID: function( prop/*, propInfo*/ ) {
                //return [propInfo && propInfo.desc, ldt20_old.saetze[prop].desc];
                return [" - " + ldt20_old.saetze[prop].desc + " - "];
            },
            encoding: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop.desc];
            },
            procedure: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop.group + ": " + prop.desc + " (BDM01)"];
            },
            resText: function( prop/*, propInfo*/ ) {
                //Y.log("current prop: "+ util.inspect(prop));
                //Y.log("current propInfo: "+ util.inspect(propInfo));
                var ret = "", i;
                for( i = 0; i < prop.length; i++ ) {
                    ret += (i > 0 ? '\n' : "") + "    " + prop[i];
                }
                return [ret];
            },
            freeCat: function( prop ) {
                return ["    " + prop.head, prop.content];
            },
            teststatus: function( prop, propInfo ) {
                var map = {
                    B: "bereits berichtet",
                    K: "korrigierter Wert",
                    F: "fehlt/folgt"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            findingkind: function( prop, propInfo ) {
                var map = {
                    E: "Endbefund",
                    T: "Teilbefund",
                    V: "Vorläufiger Befund",
                    A: "Archiv-Befund",
                    N: "Nachforderung"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            gebueO: function( prop, propInfo ) {
                var map = {
                    "1": "BMÄ",
                    "2": "EGO",
                    "3": "GOÄ 96",
                    "4": "BG-Tarif",
                    "5": "GOÄ 88"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            scheinuntergruppe: function( prop, propInfo ) {
                var map = {
                    "21": "Auftragsleistungen",
                    "23": "Konsiliaruntersuchung",
                    "24": "Mit-/Weiterbehandlung",
                    "27": "Überweisungsschein für Laboratoriumsuntersuchung als Auftragsleistung (Muster 10)",
                    "28": "Anforderungsschein für Laboratoriumsuntersuchungen bei Laborgemeinschaften (Muster 10a)"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            abrechnungstyp: function( prop, propInfo ) {
                var map = {
                    "K": "Kassenpatient (Auftrag erfolgt mittels Muster 10 bzw. Muster 10a)",
                    "P": "Privatpatient",
                    "X": "andere Rechnungsempfänger, z.B. BG",
                    "E": "Einsender (persönlich)"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            privattarif: function( prop, propInfo ) {
                var map = {
                    "1": "Privat",
                    "2": "Post B",
                    "3": "KVB"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            zusBefundweg: function( prop ) {
                var map = {
                    "0": "Papier",
                    "1": "Telefon",
                    "2": "Telefax",
                    "4": "Mailbox",
                    "5": "Praxis-Computer",
                    "7": "Diskette"
                };
                return ["Art", "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            abrechnungDurch: function( prop, propInfo ) {
                var map = {
                    "0": "Labor",
                    "1": "Einweiser"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            treatmenttype: function( prop, propInfo ) {
                var map = {
                    "1": "Kurativ",
                    "2": "Präventiv",
                    "3": "Empfängnisregelung, Sterilisation, Schwangerschaftsabbruch",
                    "4": "belegärztliche Behandlung"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            insurancekind: function( prop, propInfo ) {
                var map = {
                    "1": "Mitglied",
                    "3": "Familienversicherter",
                    "5": "Rentner"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            wop: function( prop, propInfo ) {
                var map = {
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
                    "78": "Mecklenburg-Vorpommern",
                    "83": "Brandenburg",
                    "88": "Sachsen-Anhalt",
                    "93": "Thüringen",
                    "98": "Sachsen"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            dringlichkeit: function( prop, propInfo ) {
                var map = {
                    "1": "Notfall",
                    "2": "eilig"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            pregnancy: function( prop, propInfo ) {
                var map = {
                    "0": "nein",
                    "1": "ja"
                };
                return [propInfo && propInfo.desc, "[" + prop + "] " + (map[prop] || "unbekannt")];
            },
            sampleAmountVal: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop];
            },
            nbsnr: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop];
            },
            timespan: function( prop, propInfo ) {
                return [propInfo && propInfo.desc, prop[0] + prop[1] + "h, " + prop[2] + prop[3] + "m"];
            }
        };

        Y.namespace( 'doccirrus.api.xdtVersions.ldt' ).ldt20_old = ldt20_old;

    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
