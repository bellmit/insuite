/**
 * User: rrrw
 * Date: 17/07/15  16:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

var

    EMP_LOOKUP = {
        "rad-stobgi01": "558a86dc7b19fbec3897fa82",
        "rad-knobfl01": "558a86f78a1fe3ee38ce9f56",
        "rad-ziegad01": "558a87108a1fe3ee38ce9fe4",
        "rad-bodeme01": "558a820ccab944e638fdcd7f",
        "rad-dieksu01": "558a82436135a1e438acb6bb",
        "rad-fahmdi01": "558a825f9b279aea38e97caa",
        "rad-feliro01": "558a836c7b19fbec3897f125",
        "rad-fiscma01": "558a839d8a1fe3ee38ce91d3",
        "rad-gierda01": "558a844dd47afde8387b0f03",
        "rad-glutka01": "558a849c8a1fe3ee38ce94a9",
        "rad-hahnga01": "558a84fd9b279aea38e98171",
        "rad-heinga01": "558a85388a1fe3ee38ce96cc",
        "rad-hierjo01": "558a855d8a1fe3ee38ce9707",
        "rad-huelra01": "558a85868a1fe3ee38ce9805",
        "rad-jahnru01": "558a859f9b279aea38e98395",
        "rad-krugla01": "558a85b77827b6f0386b5dc9",
        "rad-laasch01": "558a85cc7b19fbec3897f6e1",
        "rad-laukut01": "558a85e67b19fbec3897f76a",
        "rad-luenme01": "558a85fe7b19fbec3897f7ec",
        "rad-maeuju01": "558a861a7827b6f0386b5e2d",
        "rad-mohrma01": "558a86338a1fe3ee38ce9b09",
        "rad-moscan01": "558a86569b279aea38e98544",
        "rad-noltmi01": "558a86909b279aea38e98591",
        "rad-schisi01": "558a86a77827b6f0386b5ebf",
        "rad-schrjo01": "558a86c29b279aea38e98637"
    },
    ORDERLOOKUP = {
        PUBLICPOL: "EBM",
        EHCPOL: "GOÄ",
        BG: "UVGOÄ",
        INT_SZ: "GOÄ",
        JVA_BERLIN: "GOÄ",
        CONTRACT: "GOÄ",
        GKV_AOKNORDOST_KINDER: "EBM",
        GKV_SZ: "GOÄ",
        EHCPOLBASE: "GOÄ",
        GKV_AOKNORDOST_NARKOSE: "EBM"
    },
    headerLine = 'dcTenantID;dcPatientID;dcContractID;mPatientID;mOrderID;order accounting;order date;physician_username;billingcode_code;billingcode_factor;billingcode_amount;billingcode_amount_total;billingcode_description\r',
    fs = require( 'fs' ),
    util = require( 'util' ),
    filename = process.argv[2],
    file = fs.readFileSync( filename, {encoding: 'utf-8'} ),
    linearray = file.split( '\n' ),
    i, k, line, str;

console.log( linearray[0] );
console.log( linearray.length );

if( headerLine === linearray[0] ) {
    for( i=1; i< linearray.length; i++ ) {
        line = linearray[i].trim().split( ';' );
        /*jshint multistr:true*/
        str = '\n\
print( "%s" + " entering.");\n\
db = db.getSiblingDB( "%s" );\n\
\n\
result = db.activities.find({ _id: ObjectId("%s") }); // from 2\n\
result = result.next();\n\
\n\
var newDateObj = new Date(result.timestamp.getTime() + 50*60000);\n\
\n\
db.activities.insert({\n\
    patientId:"%s", \n\
    timestamp: newDateObj, // get from schein\n\
    employeeId:"%s", // EMPLOOKUP from 7\n\
    caseFolderId: result.caseFolderId, // get from schein\n\
    locationId: result.locationId, // get from schein\n\
    code:"%s",  \n\
    userContent:"%s", \n\
    catalog:false, \n\
    "unit" : "Euro", \n\
    "actualUnit" : "Euro", \n\
    "billingFactorType":"privatversicherte",\n\
    "vat" : 0, \n\
    "medneoImport" : true, \n\
    "catalogShort" : "%s", // ORDERLOOKUP from 5\n\
    actualPrice:%s, \n\
    price:%s,  \n\
    billingFactorValue : "%s", \n\
    "u_extra":{"rechnungsfaktor" : { "pkv_basis" : "1.20", "pkv_student" : "1.70", "knappschaft" : "1.95", "pkv_standard" : "1.80", "entschaedigungsamt_berlin" : "1.30", "bundeswehr_stationär" : "2.20", "bundeswehr_ambulant" : "1.70", "bundespolizei_stationär" : "2.30", "bundespolizei_ambulant" : "2.20", "postbeamte_unfall" : "1.85", "postbeamte_b" : "1.90", "bahnbeamte_unfall" : "1.85", "bahnbeamte_1-3" : "2.20", "privatversicherte" : "%s" }},\n\
    actType:"TREATMENT", \n\
    status:"VALID"\n\
});';
        k = util.format( str, line[0],
            line[0],
            line[2],
            line[1],
            EMP_LOOKUP[line[7]],
            line[8],
            line[12],
            ORDERLOOKUP[line[5]],
          line[10],
            line[11],
            line[9],
            line[9]
        );
        console.log( k );
    }
} else {
    console.log( ' build failed!  header line does not match expected input: \n', headerLine );
}

