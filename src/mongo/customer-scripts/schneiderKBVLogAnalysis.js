/**
 * User: rrrw
 * Date: 30/06/2017  15:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, ObjectId, printjson */
"use strict";

var INVOICE_LOG_ID = "59082bc0d8479adb67cdc553";
var result = [];


db.invoiceentries.aggregate(
    [
        {$match: {
            invoiceLogId: INVOICE_LOG_ID
        }},
        {$project: {tms: "$data.treatments", schein:"$data._id"}},
        {$unwind: "$tms"    },
        {$project: {code: "$tms.code", lanr: "$tms._lanr"}},
        {$group: {_id: {"code":"$code","lanr":"$lanr"}, N:{$sum:1}}},
        {$project:{code:"$_id.code",lanr:"$_id.lanr",N:1,_id:0}},
        {$sort:{lanr:1,code:1}}
    ] ).forEach( function( i ) {
    var rs = db.catalogs.find({seq:i.code},{"u_extra.leistungsgruppe":1,"value":1,"title":1}).limit(1);
    if( rs.hasNext()) {
        var rec = rs.next();
        if( !result[i.lanr] ) {
            result[i.lanr] = { data: [], totalValue:0 };
        }
        i.punkte = rec.value * i.N;
        i.titel = rec.title;
        i.lg = rec.u_extra.leistungsgruppe;
        result[i.lanr].totalValue += i.N;
        result[i.lanr].data.push(i);
    }
} );
db.invoiceentries.distinct("data.employeeId",{invoiceLogId:INVOICE_LOG_ID}).forEach(function(empId){
    var e = db.employees.find({_id:ObjectId(empId)}).next();
    var total=0;
    if(e.officialNo) {
        total = db.invoiceentries.count({invoiceLogId:INVOICE_LOG_ID, "data.employeeId":empId});
        result[e.officialNo].total = total;
    }
});
result.forEach(function(lanr){
    if( lanr.total ) {
        lanr.data.forEach( function( line ) {
            line.NperS = line.N / lanr.total;
            line.total = lanr.total;
            printjson( line );
        } );
    }
});

/*

 lg,code,lanr,titel,punkte,N,NperS,total

 */

var result = [], total = 0;
db.invoiceentries.aggregate(
    [
        {$match: {
            invoiceLogId: INVOICE_LOG_ID
        }},
        {$project: {tms: "$data.treatments",schein:"$data._id",scheinType:"$data.scheinType",dob:"$data.patient.kbvDob",ikind:"$data.patient.insuranceStatus.insuranceKind",gender:"$data.patient.gender"}},
        {$unwind: "$tms"    },
        {$group: {  _id: "$schein",  points: {$sum: "$tms.actualPrice"},  scheinType: {$first: "$scheinType"},  dob: {$first: "$dob"},  ikind: {$first: "$ikind"},  gender: {$first: "$gender"}}}
     ]).forEach(
    function( i ) {
        result.push( i );
        total += i.points;
    } );

// get the 4 kinds of statistic:

function printanalysis( list ) {
    var analysis = [];
    Object.keys(list).forEach(function( k ) {
        analysis.push([k, list[k].cnt, list[k].pts, (list[k].cnt/result.length)*100, (list[k].pts / list[k].cnt) ]);
    });
    printjson(analysis);
}

/* 1 - gender: */
printanalysis( result.reduce( function( red, item ) {
    if( !red[item.gender] ) {
        red[item.gender] = {pts: item.points, cnt: 1};
    } else {
        red[item.gender].pts += item.points;
        red[item.gender].cnt += 1;
    }
    return red;
}, {} ) );

// 2 - insuranceKind:

// 3 - age: needs scheinDate to calculate age

// 4 - scheinType



