/**
 * User: rrrw
 * Date: 16/06/15  10:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


// -------------- Quarterly Invoice for Medneo  ------------
// NEW ALGO
/*eslint-disable*/
var dbs; db = db.getSiblingDB("admin"); dbs = db.runCommand({"listDatabases": 1}).databases;
var a1 = ["5158", "5163", "5166", "5169", "5401", "5403", "5410", "5415", "5416", "5420", "5421", "5423", "5424", "5425",
    "5426", "5428", "5430", "5431", "5440", "5441", "5455", "5456", "5461", "5462", "5465", "5466", "5474", "5484", "5486",
    "5487", "5488", "5489", "5600", "5602", "5603", "5604", "5605", "5607", "5700", "5705", "5715", "5720", "5721", "5729",
    "5730", "5731", "5735", "5806", "5831", "5833", "5840", "5841", "5846", "5851", "5853", "5854", "5855"];
var a2 = ["34223", "34235", "34248", "34251", "34252", "34257", "34271", "34283", "34284", "34286", "34290", "34291", "34292",
    "34293", "34296", "34297", "34310", "34311", "34320", "34321", "34322", "34330", "34340", "34341", "34342", "34410",
    "34411", "34420", "34421", "34422", "34430", "34431", "34440", "34441", "34442", "34450", "34451", "34460", "34470",
    "34475", "34480", "34485", "34486", "34489", "34490", "34500", "34501", "34503", "34504", "34505", "34700", "34701",
    "34702", "34703"];
var a3 = ["5158", "5163", "5166", "5169", "5300", "5306", "5309", "5315", "5316", "5324", "5325", "5329", "5345", "5348",
    "5353", "5355", "5356", "5357", "5358", "5359", "5360", "5361", "5369", "5370", "5371", "5372", "5373", "5374", "5375",
    "5378", "5382", "5383", "5401", "5403", "5410", "5415", "5416", "5420", "5421", "5423", "5424", "5425", "5426", "5428",
    "5430", "5431", "5440", "5441", "5455", "5456", "5461", "5462", "5465", "5466", "5474", "5484", "5486", "5487", "5488",
    "5489", "5600", "5602", "5603", "5604", "5605", "5607", "5700", "5705", "5715", "5720", "5721", "5729", "5730", "5731",
    "5735", "5806", "5831", "5833", "5840", "5841", "5846", "5851", "5853", "5854", "5855"];
var codes = [...a1, ...a2, ...a3];
var quarters = {
    /*"Q1_17": {$gt: ISODate("2016-12-31T23:00:00Z"), $lt: ISODate("2017-03-31T23:00:00Z")},
    "Q2_17": {$gt: ISODate("2017-03-31T23:00:00Z"), $lt: ISODate("2017-06-30T23:00:00Z")},
    "Q3_17": {$gt: ISODate("2017-06-30T23:00:00Z"), $lt: ISODate("2017-09-30T23:00:00Z")},
    "Q4_17": {$gt: ISODate("2017-09-30T23:00:00Z"), $lt: ISODate("2017-12-31T23:00:00Z")},
    "Q1_18": {$gt: ISODate("2017-12-31T23:00:00Z"), $lt: ISODate("2018-03-31T23:00:00Z")},
    "Q2_18": {$gt: ISODate("2018-03-31T23:00:00Z"), $lt: ISODate("2018-06-30T23:00:00Z")},
    "Q3_18": {$gt: ISODate("2018-06-30T23:00:00Z"), $lt: ISODate("2018-09-30T23:00:00Z")},
    "Q4_18": {$gt: ISODate("2018-09-30T23:00:00Z"), $lt: ISODate("2018-12-31T23:00:00Z")},
    "Q1_19": {$gt: ISODate("2018-12-31T23:00:00Z"), $lt: ISODate("2019-03-31T23:00:00Z")},
    "Q2_19": {$gt: ISODate("2019-03-31T22:00:00Z"), $lt: ISODate("2019-06-30T22:00:00Z")} */
    "Q4_19": {$gt: ISODate("2019-09-31T22:00:00Z"), $lt: ISODate("2019-12-31T23:00:00Z")}
};
var status = ['BILLED', 'APPROVED', 'PAID', 'VALID'];
var statusQry = {$in: status};

function getSum(d, t) {
    return d.activities.find({"timestamp": t, code: {$in: codes}, actType: "TREATMENT", status: statusQry}, {
        code: 1,
        price: 1
    }).count();
}

function getSumForAllDbs(t) {
    let i = 0;
    dbs.forEach(function (database) {
        if (/^([\da-f]){8,15}$/.exec(database.name)) {
            db = db.getSiblingDB(database.name);
            i += getSum(db, t);
        }
    });
    return i;
}

for (q in quarters) {
    let result = getSumForAllDbs(quarters[q]);
    print(`${q} ${result}`);
}


//
// -- iterate through tenants and do something on a VPRC --
//           OLD ALGO
//
// /*global db:true, ISODate*/
// "use strict";
// var dbs, kbv = 0, pvs = 0, invoices = 0;
// db = db.getSiblingDB( "admin" );
// dbs = db.runCommand( {"listDatabases": 1} ).databases;
// dbs.forEach( function( database ) {
//     var
//         i,
//         rec,
//         rs;
//     if(/^([\da-f]){8,15}$|^0$/.exec(database.name)) {
//         db = db.getSiblingDB( database.name );
//         rs = db.kbvlogs.find({ quarter: 3, year: 2018});
//         if( rs.hasNext() ) {
//             rec = rs.next();
//             print( database.name + " kbv " + rec.totalItems );
//             i = /\/(.*)\//.exec( rec.totalItems );
//             if( i && i[1] && parseInt( i[1], 10 )) {
//                 kbv += parseInt( i[1], 10 );
//             }
//         }
//         rs = db.pvslogs.find({ "startDate" : {$gt: ISODate("2018-06-30T23:00:00Z") }});
//         if( rs.hasNext() ) {
//             rec = rs.next();
//             print( database.name + " pvs  " + rec.totalItems );
//             if( rec.totalItems && parseInt( rec.totalItems, 10 )) {
//                 pvs += parseInt( rec.totalItems, 10 );
//             }
//         }
//         rs = db.activities.find({actType:"INVOICE",status:"BILLED",timestamp:{$gte:new ISODate("2018-06-30T23:00:00.000Z"),$lt:new ISODate("2018-09-30T23:00:00.000Z")}});
//         if( rs.hasNext() ) {
//             print( database.name + " invoices " + rs.count() );
//             invoices += rs.count();
//         }
//
//     } else {
//         print( database.name + ' not processing.');
//     }
// } );
// print(kbv);print(pvs);print(invoices);