/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */

YUI.add( 'ldt_v_20', function( Y ) {

        var moment = Y.doccirrus.commonutils.getMoment();

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

        var ldt20 = {};

        ldt20.type = "ldt";
        ldt20.name = "ldt20";
        ldt20.version = "LDT1014.01";
        ldt20.versionField = "9212";
        ldt20.acceptedVersions = ["LDT1014.01"];

        ldt20.dateFormat = "YYYYMMDD";
        ldt20.shortDateFormat = "YYMM";
        ldt20.timeFormat = "HHmm";

        ldt20.sizeCounter = 1; //1 byte for the counter
        ldt20.sizeLabel = 3; //3 bytes for the Label: B00/B01/B02
        ldt20.sizeDataField = 128; //128 bytes for field content
        ldt20.sizeCrc16 = 4;
        ldt20.sizeLen = 3;
        ldt20.sizeRecLen = 5;
        ldt20.sizefileLen = 8;
        ldt20.sizeSatz = 4;
        ldt20.sizeFk = 4;

        ldt20.encodings = ["ASCII (german)", "Code page 437", "ISO 8859-1", "ISO 8859-15"];
        ldt20.encodingField = "9106";

        ldt20.serialCr = "[CR]"; //0x0D
        ldt20.serialNewLineReplacement = "[FS]"; //0x1C

        ldt20.recordType = "8000";
        ldt20.recordSize = "8100";
        ldt20.objType = "8200";
        ldt20.objEntries = "8201";
        ldt20.recordEntries = "8100";
        ldt20.recordLength = "9202";

        ldt20.saetze = {
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
                    "fk8616":         {amount: "1", optional: true},
                    "fk8626":         {amount: "1", optional: true},
                    "fk8627":         {amount: "1", optional: true},
                    "fk8617":         {amount: "1", optional: true},
                    "fk4111":         {amount: "1", optional: true},
                    "fk8618":         {amount: "1", optional: true},
                    "fk8619":         {amount: "1", optional: true},
                    "fk8620":         {amount: "1", optional: true},
                    "fk8622":         {amount: "1", optional: true},
                    "fk8623":         {amount: "1", optional: true},
                    "fk8625":         {amount: "1", optional: true},
                    "fk8301":         {amount: "1", optional: false},
                    "fk8302":         {amount: "1", optional: false},
                    "fk8303":         {amount: "1", optional: true},
                    "fk3100":         {amount: "1", optional: true},
                    "fk3120":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R409
                    "fk3102":         {amount: "1", optional: false}, //dependency: R409
                    "fk3103":         {amount: "1", optional: false}, //dependency: R409
                    "fk3104":         {amount: "1", optional: true},
                    "fk3110":         {amount: "1", optional: true},
                    "fk4207":         {amount: "n", optional: true},
                    "fk8401":         {amount: "1", optional: false},
                    "fk8609":         {amount: "1", optional: false}, //dependency: R387
                    "fk8615":         {amount: "1", optional: true}, //dependency: R719
                    "fk8403":         {amount: "1", optional: false}, //dependency: R387
                    "fk8405":         {amount: "1", optional: true},
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
                    "fk3101":         {amount: "1", optional: true}, //dependency: R409
                    "fk3102":         {amount: "1", optional: true}, //dependency: R409
                    "fk3103":         {amount: "1", optional: true},
                    "fk3104":         {amount: "1", optional: true},
                    "fk3110":         {amount: "1", optional: true},
                    "fk3120":         {amount: "1", optional: true},
                    "fk4207":         {amount: "n", optional: true},
                    "fk8401":         {amount: "1", optional: false},
                    "fk8609":         {amount: "1", optional: false}, //dependency: R387
                    "fk8615":         {amount: "1", optional: true}, //dependency: R719
                    "fk8403":         {amount: "1", optional: false}, //dependency: R387
                    "fk8405":         {amount: "1", optional: true},
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
            "8203": {
                desc: "Mikrobiologie-Bericht", attribute: "mbReport", fk: {
                    "fk8000":         {amount: "1", optional: false},
                    "fk8100":         {amount: "1", optional: false},
                    "fk8310":         {amount: "1", optional: false}, //dependency: R409
                    "fk8311":         {amount: "1", optional: true},
                    "fk8616":         {amount: "1", optional: true},
                    "fk8626":         {amount: "1", optional: true},
                    "fk8627":         {amount: "1", optional: true},
                    "fk8617":         {amount: "1", optional: true},
                    "fk4111":         {amount: "1", optional: true},
                    "fk8618":         {amount: "1", optional: true},
                    "fk8619":         {amount: "1", optional: true},
                    "fk8620":         {amount: "1", optional: true},
                    "fk8622":         {amount: "1", optional: true},
                    "fk8623":         {amount: "1", optional: true},
                    "fk8625":         {amount: "1", optional: true},
                    "fk8301":         {amount: "1", optional: false},
                    "fk8302":         {amount: "1", optional: false},
                    "fk8303":         {amount: "1", optional: true},
                    "fk3100":         {amount: "1", optional: true},
                    "fk3120":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R409
                    "fk3102":         {amount: "1", optional: false}, //dependency: R409
                    "fk3103":         {amount: "1", optional: false}, //dependency: R409
                    "fk3104":         {amount: "1", optional: true},
                    "fk3110":         {amount: "1", optional: true},
                    "fk4207":         {amount: "n", optional: true},
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
                    "fk3120":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R409
                    "fk3102":         {amount: "1", optional: false}, //dependency: R409
                    "fk3103":         {amount: "1", optional: false}, //dependency: R409
                    "fk3104":         {amount: "1", optional: true},
                    "fk3110":         {amount: "1", optional: true},
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
                            "fk8406": {amount: "1", optional: false}, //dependency: R384
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
                    "fk3120":         {amount: "1", optional: true},
                    "fk3101":         {amount: "1", optional: false}, //dependency: R434
                    "fk3102":         {amount: "1", optional: false}, //dependency: R434
                    "fk3103":         {amount: "1", optional: false},
                    "fk3104":         {amount: "1", optional: true},
                    "fk3105":         {amount: "1", optional: false}, //dependency: R434, R811
                    "fk3119":         {amount: "1", optional: false}, //dependency: R434, R812
                    "fk3107":         {amount: "1", optional: false}, //dependency: R434
                    "fk3109":         {amount: "1", optional: true},
                    "fk3112":         {amount: "1", optional: false}, //dependency: R434
                    "fk3114":         {amount: "1", optional: false}, //dependency: R434
                    "fk3113":         {amount: "1", optional: false}, //dependency: R434
                    "fk3121":         {amount: "1", optional: false}, //dependency: R434
                    "fk3122":         {amount: "1", optional: false}, //dependency: R434
                    "fk3123":         {amount: "1", optional: false}, //dependency: R434
                    "fk3124":         {amount: "1", optional: false}, //dependency: R434
                    "fk3116":         {amount: "1", optional: false}, //dependency: R???
                    "fk3108":         {amount: "1", optional: false}, //dependency: R434
                    "fk3110":         {amount: "1", optional: false},
                    "fk8405":         {amount: "1", optional: true},
                    "fk2002":         {amount: "1", optional: false}, //dependency: R434
                    "fk4104":         {amount: "1", optional: false}, //dependency: R434
                    "fk4106":         {amount: "1", optional: false}, //dependency: R434
                    "fk4109":         {amount: "1", optional: false}, //dependency: R???
                    "fk4133":         {amount: "1", optional: false}, //dependency: R???, 812
                    "fk4110":         {amount: "1", optional: false}, //dependency: R???, 811
                    "fk4111":         {amount: "1", optional: false}, //dependency: R434
                    "fk4131":         {amount: "1", optional: true},
                    "fk4132":         {amount: "1", optional: true},
                    "fk4124":         {amount: "1", optional: false}, //dependency: R434
                    "fk8403":         {amount: "1", optional: false},
                    "fk4202":         {amount: "1", optional: true},
                    "fk4122":         {amount: "1", optional: false}, //dependency: R434
                    "fk4204":         {amount: "1", optional: true},
                    "fk4205":         {amount: "n", optional: false}, //dependency: R756
                    "fk4207":         {amount: "n", optional: true},
                    "fk4208":         {amount: "n", optional: true},
                    "fk8616":         {amount: "1", optional: true},
                    "fk8626":         {amount: "1", optional: true},
                    "fk8627":         {amount: "1", optional: true},
                    "fk8617":         {amount: "1", optional: true},
                    "fk8618":         {amount: "1", optional: true},
                    "fk8619":         {amount: "1", optional: true},
                    "fk8620":         {amount: "1", optional: true},
                    "fk8621":         {amount: "1", optional: true},
                    "fk8622":         {amount: "1", optional: true},
                    "fk8623":         {amount: "1", optional: true},
                    "fk8625":         {amount: "1", optional: true},
                    "fk8624":         {amount: "1", optional: true},
                    "fk7330":         {amount: "1", optional: true},
                    "fk4217":         {amount: "1", optional: true, children: { //dependency: R431
                        "fk4241":     {amount: "1", optional: false},
                        "fk9901":     {amount: "n", optional: true}}}, //dependency: R713
                    "fk4225":         {amount: "1", optional: true, children: {
                        "fk4241":     {amount: "1", optional: false},
                        "fk4248":     {amount: "1", optional: false},
                        "fk9901":     {amount: "n", optional: true}}}, //dependency: R713
                    "fk4218":         {amount: "1", optional: false}, //dependency: R434
                    "fk4242":         {amount: "1", optional: false},
                    // "fk4218":         {amount: "1", optional: false, children: { //dependency: R434
                    //     "fk4242":     {amount: "1", optional: false},
                    //     "fk9901":     {amount: "n", optional: true}}}, //dependency: R714
                    "fk4226":         {amount: "1", optional: true, children: {
                        "fk4242":     {amount: "1", optional: false},
                        "fk4249":     {amount: "1", optional: false},
                        "fk9901":     {amount: "n", optional: true}}}, //dependency: R713
                    "fk4219":         {amount: "1", optional: false}, //dependency: R434
                    "fk4220":         {amount: "1", optional: false}, //dependency: R386, 434
                    "fk4239":         {amount: "1", optional: false}, //dependency: R434
                    "fk4221":         {amount: "1", optional: false}, //dependency: R404
                    "fk4229":         {amount: "1", optional: true}, //dependency: R432
                    "fk4231":         {amount: "1", optional: true},
                    "fk8432":         {amount: "1", optional: true},
                    "fk8433":         {amount: "1", optional: true},
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
                    "fk8512":         {amount: "1", optional: true},
                    "fk8504":         {amount: "n", optional: true},
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
                    "fk3101":         {amount: "1", optional: true},
                    "fk3102":         {amount: "1", optional: true},
                    "fk3103":         {amount: "1", optional: false},
                    "fk3110":         {amount: "1", optional: false},
                    "fk8405":         {amount: "1", optional: true},
                    "fk8503":         {amount: "1", optional: true},
                    "fk8424":         {amount: "1", optional: true},
                    "fk8510":         {amount: "1", optional: true, children: {
                        "fk8511":     {amount: "1", optional: true},
                        "fk9901":     {amount: "n", optional: true}}}, //depdendency: R423
                    "fk8512":         {amount: "1", optional: true},
                    "fk8504":         {amount: "n", optional: true},
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
                    "fk0212":     {amount: "n", optional: true, children: {
                        "fk0211": {amount: "1", optional: true},
                        "fk0222": {amount: "n", optional: true},
                        "fk9901": {amount: "n", optional: true}}},
                    "fk0223":     {amount: "n", optional: true, children: {
                        "fk0211": {amount: "1", optional: true},
                        "fk0222": {amount: "n", optional: true},
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
                    "fk0212":     {amount: "n", optional: true, children: {
                        "fk0211": {amount: "1", optional: true},
                        "fk0222": {amount: "n", optional: true},
                        "fk9901": {amount: "n", optional: true}}},
                    "fk0223":     {amount: "n", optional: true, children: {
                        "fk0211": {amount: "1", optional: true},
                        "fk0222": {amount: "n", optional: true},
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
        ldt20.fields = {
            "0101": {  desc: "KBV-Prüfnummer",                                               attribute: "kbvValidationNo",                type: "string", len: "16"  },
            "0201": {  desc: "Betriebs- (BSNR) oder Nebenbetriebsstättennummer (NBSNR)",     attribute: "bsnr",                           type: "number", len: "9"  },
            "0203": {  desc: "(N)BSNR-Bezeichnung",                                          attribute: "bsnrDesc",                       type: "string", len: "<=60"  },
            "0205": {  desc: "Straße der (N)BSNR-Adresse",                                   attribute: "bsnrStreet",                     type: "string", len: "<=60"  },
            "0211": {  desc: "Arztname",                                                     attribute: "docName",                        type: "string", len: "<=60"  },
            "0212": {  desc: "Lebenslange Arztnummer (LANR)",                                attribute: "docLANR",                        type: "number", len: "9"  },
            "0215": {  desc: "PLZ der (N)BSNR-Adresse",                                      attribute: "bsnrZip",                        type: "string", len: "<=7"  },
            "0216": {  desc: "Ort der (N)BSNR-Adresse",                                      attribute: "bsnrCity",                       type: "string", len: "<=60"  },
            "0222": {  desc: "ASV-Teamnummer",                                               attribute: "asvTeamNo",                      type: "number", len: "9"  },
            "0223": {  desc: "Pseudo-LANR für Krankenhausärzte im Rahmen der ASV-Abrechnung",attribute: "asvPseudoLANR",                  type: "number", len: "9"  },
            "2002": {  desc: "Kassenname",                                                   attribute: "insName",                        type: "string", len: "<=28"  },
            "3100": {  desc: "Namenszusatz",                                                 attribute: "patientNameAdd",                 type: "string", len: "<=20"  },
            "3101": {  desc: "Name",                                                         attribute: "patientName",                    type: "string", len: "<=45"  },
            "3102": {  desc: "Vorname",                                                      attribute: "patientForename",                type: "string", len: "<=45"  },
            "3103": {  desc: "Geburtsdatum",                                                 attribute: "patientDob",                     type: "date",   len: "8", mapper: "date"  },
            "3104": {  desc: "Titel",                                                        attribute: "patientTitle",                   type: "string", len: "<=20"  },
            "3105": {  desc: "Versichertennummer",                                           attribute: "patientInsNo",                   type: "number", len: "6-12"  },
            "3107": {  desc: "Straße",                                                       attribute: "patientStreet",                  type: "string", len: "<=46"  },
            "3108": {  desc: "Versichertenart",                                              attribute: "patientInsKind",                 type: "number", len: "1", mapper: "insurancekind"  },
            "3109": {  desc: "Hausnummer",                                                   attribute: "patientHouseNo",                 type: "string", len: "<=9"  },
            "3110": {  desc: "Geschlecht",                                                   attribute: "patientGender",                  type: "string", len: "1", mapper: "gender"  },
            "3112": {  desc: "PLZ",                                                          attribute: "patientZip",                     type: "string", len: "<=10"  },
            "3113": {  desc: "Ort",                                                          attribute: "patientCity",                    type: "string", len: "<=40"  },
            "3114": {  desc: "Wohnsitzlaendercode",                                          attribute: "patientCountrycode",             type: "string", len: "<=3"  },
            "3116": {  desc: "WOP",                                                          attribute: "patientWop",                     type: "string", len: "2", mapper: "wop"  },
            "3119": {  desc: "Versicherten_ID",                                              attribute: "patientInsId",                   type: "string", len: "10"  },
            "3120": {  desc: "Vorsatzwort",                                                  attribute: "patientPrefix",                  type: "string", len: "<=20"  },
            "3121": {  desc: "PostfachPLZ",                                                  attribute: "patientPostboxZip",              type: "string", len: "<=10"  },
            "3122": {  desc: "PostfachOrt",                                                  attribute: "patientPostboxCity",             type: "string", len: "<=40"  },
            "3123": {  desc: "Postfach",                                                     attribute: "patientPostbox",                 type: "string", len: "<=8"  },
            "3124": {  desc: "PostfachWohnsitzlaendercode",                                  attribute: "patientPostboxCountrycode",      type: "string", len: "<=3"  },
            "3622": {  desc: "Größe des Patienten",                                          attribute: "patientHeight",                  type: "float", mapper: "cm"  },
            "3623": {  desc: "Gewicht des Patienten",                                        attribute: "patientWeight",                  type: "float", mapper: "kg"  },
            "4104": {  desc: "VKNR",                                                         attribute: "insuranceVKNR",                  type: "number", len: "5"  },
            "4106": {  desc: "Kostenträger-Abrechnungsgebiet",                               attribute: "payerBillingArea",               type: "number", len: "2"  },
            "4109": {  desc: "Letzter Einlesetag der Versichertenkarte im Quartal",          attribute: "insurancelastCardReadOfQuarter", type: "date",   len: "8", mapper: "date"  },
            "4110": {  desc: "Bis-Datum der Gültigkeit",                                     attribute: "insuranceValidToDate",           type: "date",   len: "8", mapper: "date"  },
            "4111": {  desc: "Kostentraegerkennung",                                         attribute: "payerNo",                        type: "number", len: "9"  },
            "4122": {  desc: "Abrechnungsgebiet",                                            attribute: "insuranceBillingArea",           type: "number", len: "2"  },
            "4124": {  desc: "SKT-Zusatzangaben",                                            attribute: "insuranceSktAdd",                type: "string", len: "<=60"  },
            "4131": {  desc: "BesonderePersonengruppe",                                      attribute: "insuranceSpeGroup",              type: "string", len: "<=2"  },
            "4132": {  desc: "DMP_Kennzeichnung",                                            attribute: "insuranceDmp",                   type: "string", len: "<=2"  },
            "4133": {  desc: "Versicherungsschutz-Beginn",                                   attribute: "insuranceValidFromDate",         type: "date",   len: "8", mapper: "date"  },
            "4202": {  desc: "Unfall, Unfallfolgen",                                         attribute: "accident_consequences",          type: "number", len: "1"  },
            "4204": {  desc: "Eingeschränkter Leistungsanspruch gem. § 18 Abs. 3a SGB V",    attribute: "treatmentAccordingToSGBV",       type: "number", len: "1"  },
            "4205": {  desc: "Auftrag",                                                      attribute: "order",                          type: "string", len: "<=60"  },
            "4207": {  desc: "Diagnose / Verdachtsdiagnose",                                 attribute: "diagnosis_suspected",            type: "string", len: "<=60"  },
            "4208": {  desc: "Befund / Medikation",                                          attribute: "findings_Medication",            type: "string", len: "<=60"  },
            "4209": {  desc: "Auftrag/Diagnose/Verdacht",                                    attribute: "order_diagnosis_suspected",      type: "string", len: "<=60"  },
            "4217": {  desc: "(N)BSNR des Erstveranlassers",                                 attribute: "initiatorBSNR",                  type: "number", len: "9"  },
            "4218": {  desc: "(N)BSNR des Überweisers",                                      attribute: "refBSNR",                        type: "number", len: "9", mapper: "nbsnr"  },
            "4219": {  desc: "Überweisung von anderen Ärzten",                               attribute: "refFromOther",                   type: "string", len: "<=60"  },
            "4220": {  desc: "Überweisung an",                                               attribute: "refTo",                          type: "string", len: "<=60"  },
            "4221": {  desc: "Behandlungstyp",                                               attribute: "treatmentType",                  type: "number", len: "1", mapper: "treatmenttype"  },
            "4225": {  desc: "ASV-Teamnummer des Erstveranlassers",                          attribute: "initiatorASVNR",                 type: "number", len: "9"  },
            "4226": {  desc: "ASV-Teamnummer des Überweisers",                               attribute: "refASVNR",                       type: "number", len: "9"  },
            "4229": {  desc: "Ausnahmeindikation",                                           attribute: "exceptionalMedIndication",       type: "number", len: "5"  },
            "4231": {  desc: "Kontrolluntersuchung einer bekannten Infektion",               attribute: "followUpOfKnownInfection",       type: "number", len: "1"  },
            "4239": {  desc: "Scheinuntergruppe",                                            attribute: "scheinSubgroup",                 type: "number", len: "2", mapper: "scheinuntergruppe"  },
            "4241": {  desc: "LANR (lebenslange Arztnummer) des Erstveranlassers",           attribute: "initiatorLANR",                  type: "number", len: "9"  },
            "4242": {  desc: "LANR des Überweisers",                                         attribute: "refLANR",                        type: "number", len: "9"  },
            "4248": {  desc: "Pseudo-LANR (für Kr.H.Ärzte unter ASV) des Erstveranlassers",  attribute: "initiatorPseudoBSNR",            type: "number", len: "9"  },
            "4249": {  desc: "Pseudo-LANR (für Kr.H.Ärzte unter ASV) des Überweisers",       attribute: "refPseudoBSNR",                  type: "number", len: "9"  },
            "5001": {  desc: "Gebührennummer (GNR)",                                         attribute: "gnr",                            type: "string", len: "<=9"  },
            "5002": {  desc: "Art der Untersuchung",                                         attribute: "inspectionKind",                 type: "string", len: "<=60"  },
            "5005": {  desc: "Multiplikator",                                                attribute: "factor",                         type: "number", len: "2"  },
            "5009": {  desc: "freier Begründungstext",                                       attribute: "reason",                         type: "string", len: "<=60"  },
            "6001": {  desc: "ICD Code",                                                     attribute: "icdCode",                        type: "string", len: "<=6"  },
            "6003": {  desc: "Diagnosesicherheit",                                           attribute: "diagnosisCertainty",             type: "string", len: "1",   mapper: "diagnosisCertainty"},
            "6004": {  desc: "Lokalisation",                                                 attribute: "diagnosisLoc",                   type: "string", len: "1",   mapper: "diagnosisLoc"},
            "6006": {  desc: "Diagnoseerläuterung",                                          attribute: "diagnosisDesc",                  type: "string", len: "<=60"},
            "6008": {  desc: "Diagnoseausnahmetatbestand",                                   attribute: "diagnosisExceptionDesc",         type: "string", len: "<=60"},
            "7330": {  desc: "Telefonnummer des Getesteten",                                 attribute: "coronaPhoneNumberOfTestedPatient",type: "string", len: "<=60"  },
            "8000": {  desc: "Satzart",                                                      attribute: "recordType",                     type: "string", len: "4", mapper: "satzID"  },
            "8100": {  desc: "Satzlänge",                                                    attribute: "recordSize",                     type: "number", len: "5", mapper: "byte"  },
            "8300": {  desc: "Labor",                                                        attribute: "lab",                            type: "string", len: "<=60"  },
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
            "8616": {  desc: "Testungen",                                                    attribute: "coronaTypeOfTest",               type: "number", len: "1", mapper: "coronaTypeOfTest"  },
            "8617": {  desc: "Beauftragungsgrund",                                           attribute: "coronaReasonOfTest",             type: "number", len: "1", mapper: "coronaReasonOfTest"  },
            "8618": {  desc: "Betreut/untergebracht in",                                     attribute: "coronaResidingIn",               type: "number", len: "1", mapper: "noYes"  },
            "8619": {  desc: "Tätigkeit in Einrichtung",                                     attribute: "coronaOccupationInFacility",     type: "number", len: "1", mapper: "noYes"  },
            "8620": {  desc: "Betroffene Einrichtung",                                       attribute: "coronaAffectedFacility",         type: "number", len: "1", mapper: "coronaAffectedFacility"  },
            "8621": {  desc: "Einverständnis",                                               attribute: "coronaAgreement",                type: "number", len: "1", mapper: "noYes"  },
            "8622": {  desc: "Corona-GUID",                                                  attribute: "coronaGUID",                     type: "string", len: "43"  },
            "8623": {  desc: "Identifikation/Aktenzeichen ÖGD",                              attribute: "coronaIdentificationOEGD",       type: "string", len: "<=22"  },
            "8624": {  desc: "Covid-Beauftragung",                                           attribute: "coronaCommissioning",            type: "number", len: "1", mapper: "coronaCommissioning"  },
            "8625": {  desc: "PLZ ÖGD",                                                      attribute: "coronaPostalCodeOEGD",           type: "string", len: "5"  },
            "8626": {  desc: "Rechtsgrundlage der Testung",                                  attribute: "coronaLegalBasisOfTest",         type: "number", len: "1"  },
            "8627": {  desc: "KV-Sonderziffer",                                              attribute: "kvSpecialNumber",                type: "string", len: "<=5"  },
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
        ldt20.objects = {};
        ldt20.stringMappers = {
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
                //return [propInfo && propInfo.desc, ldt20.saetze[prop].desc];
                return [" - " + ldt20.saetze[prop].desc + " - "];
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
                var
                    ret = "",
                    i;
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
                    "5": "GOÄ 88",
                    "90": "EAL"
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
                    "1": "Labor",
                    "2": "Einweiser"
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
            },
            coronaTypeOfTest: basicMapper( {
                1: 'Ersttestung',
                2: 'weitere Testung'
            } ),
            coronaReasonOfTest: basicMapper( {
                1: '§ 2 TestV Kontaktperson',
                2: '§ 2 TestV Meldung „erhöhtes Risiko“ durch Corona-Warn-App',
                3: '§ 3 TestV Ausbruchsgeschehen',
                4: '§ 4 Abs. 1 Nr. 1 und 2 TestV Verhütung der Verbreitung',
                6: '§ 4 Abs. 3 TestV Ausland'
            } ),
            coronaAffectedFacility: basicMapper( {
                1: 'Medizinischen Einrichtungen',
                2: 'Pflege- und anderen Wohneinrichtungen',
                3: 'Gemeinschaftseinrichtungen',
                4: 'Sonstigen Einrichtungen'
            } ),
            coronaCommissioning: basicMapper( {
                2: 'Diagnostische Abklärung'
            } ),
            legalBasisOfTesting: basicMapper( {
                1: 'TestV',
                2: 'Regionale Sondervereinbarung',
                3: 'Selbstzahler'
            } ),
            noYes: basicMapper( {
                "0": "Nein",
                "1": "Ja"
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
            } )
        };

        Y.namespace( 'doccirrus.api.xdtVersions.ldt' ).ldt20 = ldt20;

    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
