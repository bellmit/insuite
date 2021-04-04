/**
 * User: rrrw
 * Date: 17/07/15  16:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

var
    feeSchedLookup = require("./selIKNRS.json"),
    //was 'mPatientID,dcPatientID,dcTenantID,iknr,vknr,insurance,order_accounting,order_date\r',
    headerLine =  'mPatientID,dcPatientID,dcTenantID,iknr,vknr,invoice_insurance_name,invoice_order_accounting,order accounting,order date,ktab\r',
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
        line = linearray[i].trim().split( ',' );
        /*jshint multistr:true*/
        str = '\n\
print( "%s" + " entering.");\n\
db = db.getSiblingDB( "%s" );\n\
print( "patient %s " + db.patients.find({_id:ObjectId("%s")},{}).next().insuranceStatus[0].type ); \n\
\n\
db.patients.update({_id:ObjectId("%s")},\n\
    {$set:{ "insuranceStatus.0.insuranceId": "%s",\n\
            "insuranceStatus.0.insuranceName" : "%s",\n\
            "insuranceStatus.0.insurancePrintName" : "%s",\n\
            "insuranceStatus.0.insuranceGrpId" : "%s",\n\
            "insuranceStatus.0.feeSchedule" : "%s",\n\
            "insuranceStatus.0.costCarrierBillingSection" : "00",\n\
            "insuranceStatus.0.dmp" : "",\n\
            "insuranceStatus.0.insuranceKind" : "1",\n\
            "insuranceStatus.0.scheinBillingArea" : "00"\n\
    }\n\
} );\n';

        k = util.format( str,
            line[2],
            line[2],
            line[1],
            line[1],
            line[1],
            line[3],
            line[5],
            line[5],
            line[4],
            feeSchedLookup[line[3]] || 1
        );
        console.log( k );
    }
} else {
    console.log( ' build failed!  header line does not match expected input: \n', headerLine );
}

