/**
 * User: rrrw
 * Date: 16/06/15  10:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
//
// -- iterate through companies, update them and delete the relevant databases --
// this script was run successfully on PRODVPRC on 18.6.2015.
//
/*global db:true, ObjectId, ISODate */
"use strict";

// make sure we are in local tenant
db = db.getSiblingDB( "0" );

var
    whitelisted = [
        "1012",
        "1017",
        "1125",
        "1250",
        "1290",
        "1325",
        "1335",
        "1346",
        "1349",
        "1363",
        "1364",
        "1415",
        "1416",
        "1438",
        "1497",
        "1498",
        "1512",
        "1513",
        "1530",
        "1544",
        "1582",
        "1598",
        "1606",
        "1607",
        "1614",
        "1648",
        "1663",
        "1664",
        "1668",
        "1692",
        "1708",
        "1709",
        "1766",
        "1801",
        "1803",
        "1821",
        "1832",
        "1835",
        "1878",
        "1880",
        "1885",
        "1887",
        "1901",
        "1920",
        "1957",
        "1960",
        "1961",
        "1971"];

whitelisted.forEach( function fixCompanyEntry( cN ) {
    var rs = db.companies.find( {dcCustomerNo: cN} );
    if( rs.hasNext() ) {
        print( '____' + rs.next().tenantId );
        db.companies.update( {dcCustomerNo: cN}, {$set: { prodServices: [
            {
                "to" : new ISODate("2021-06-30T21:59:59.999Z"),
                "from" : new ISODate("2016-07-01T09:02:24.791Z"),
                "ps" : "INTIMECONNECT",
                "_id" : new ObjectId("5776316e24b10b476c8a6742"),
                "config" : [ ]
            },
            {
                "ps" : "NEWSLETTER",
                "_id" : new ObjectId("5776316e24b10b476c8a6741"),
                "config" : [ ]
            }
        ]}} );
        db.companies.update( {dcCustomerNo: cN}, {$set: {activeState: true, serverType: "PRC", tenantId: 0, prcFlag:true}} );
    }
} );

/*  Result was noted in MOJ-6292, see ticket.
 */
