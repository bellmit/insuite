/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */



YUI.add( 'bdt_tests', function( Y ) {

        var bdt_tests = {//invalid
            test1:  "01380000020[CR][LF]" +
                    "014810000039[CR][LF]" +
                    "0189100000000000[CR][LF]" +
                    "017910307012015[CR][LF]" +
                    "0129105001[CR][LF]" +
                    "01091062[CR][LF]" +
    
                    "01380000022[CR][LF]" +
                    "014810000000[CR][LF]" +
                    "014921010//93[CR][LF]" +
                    "014921302//94[CR][LF]" +
                    "01096001[CR][LF]" +
                    "02596010107201502072015[CR][LF]" +
                    "017960212001513[CR][LF]" +
    
                    "01380000010[CR][LF]" +
                    "01081000[CR][LF]" +
                    "0150101000000[CR][LF]" +
                    "0240102Doc Cirrus GmbH[CR][LF]" +
                    "0160103inSuite[CR][LF]" +
                    "0200104MacBook Pro[CR][LF]" +
                    "0180201000000000[CR][LF]" +
                    "01002023[CR][LF]" +
                    "0160203Asd Qwe[CR][LF]" +
                    "0160204Grupe 1[CR][LF]" +
                    "0240205Bessemerstr. 82[CR][LF]" +
                    "021020612345 Berlin[CR][LF]" +
                    "0210208493011111111[CR][LF]" +
                    "01002254[CR][LF]" +
    
                    "01380000023[CR][LF]" +
                    "014810000000[CR][LF]" +
                    "0129202123[CR][LF]" +
                    "01092031[CR][LF]" +
    
                    "01380000021[CR][LF]" +
                    "014810000027[CR][LF]"
        };

        Y.namespace( 'doccirrus.api.xdtTests' ).bdt = bdt_tests;

    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
