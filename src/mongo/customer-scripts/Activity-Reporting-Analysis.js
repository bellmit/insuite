/**
 * User: rrrw
 * Date: 22/08/2018  15:33
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global ISODate, db*/

var qry = [
    {$gt:ISODate("2018-07-02T00:00:00.000Z"),$lt:ISODate("2018-07-02T23:59:00.000Z")},
    {$gt:ISODate("2018-07-03T00:00:00.000Z"),$lt:ISODate("2018-07-03T23:59:00.000Z")},
    {$gt:ISODate("2018-07-04T00:00:00.000Z"),$lt:ISODate("2018-07-04T23:59:00.000Z")},
    {$gt:ISODate("2018-07-05T00:00:00.000Z"),$lt:ISODate("2018-07-05T23:59:00.000Z")},
    {$gt:ISODate("2018-07-06T00:00:00.000Z"),$lt:ISODate("2018-07-06T23:59:00.000Z")},
    {$gt:ISODate("2018-07-07T00:00:00.000Z"),$lt:ISODate("2018-07-07T23:59:00.000Z")},
    {$gt:ISODate("2018-07-08T00:00:00.000Z"),$lt:ISODate("2018-07-08T23:59:00.000Z")},
    {$gt:ISODate("2018-07-09T00:00:00.000Z"),$lt:ISODate("2018-07-09T23:59:00.000Z")},
    {$gt:ISODate("2018-07-10T00:00:00.000Z"),$lt:ISODate("2018-07-10T23:59:00.000Z")},
    {$gt:ISODate("2018-07-11T00:00:00.000Z"),$lt:ISODate("2018-07-11T23:59:00.000Z")},
    {$gt:ISODate("2018-08-11T00:00:00.000Z"),$lt:ISODate("2018-08-11T23:59:00.000Z")},
    {$gt:ISODate("2018-08-12T00:00:00.000Z"),$lt:ISODate("2018-08-12T23:59:00.000Z")},
    {$gt:ISODate("2018-08-13T00:00:00.000Z"),$lt:ISODate("2018-08-13T23:59:00.000Z")},
    {$gt:ISODate("2018-08-14T00:00:00.000Z"),$lt:ISODate("2018-08-14T23:59:00.000Z")},
    {$gt:ISODate("2018-08-15T00:00:00.000Z"),$lt:ISODate("2018-08-15T23:59:00.000Z")},
    {$gt:ISODate("2018-08-16T00:00:00.000Z"),$lt:ISODate("2018-08-16T23:59:00.000Z")},
    {$gt:ISODate("2018-08-17T00:00:00.000Z"),$lt:ISODate("2018-08-17T23:59:00.000Z")},
    {$gt:ISODate("2018-08-18T00:00:00.000Z"),$lt:ISODate("2018-08-18T23:59:00.000Z")},
    {$gt:ISODate("2018-08-19T00:00:00.000Z"),$lt:ISODate("2018-08-19T23:59:00.000Z")},
    {$gt:ISODate("2018-08-20T00:00:00.000Z"),$lt:ISODate("2018-08-20T23:59:00.000Z")},
    {$gt:ISODate("2018-08-21T00:00:00.000Z"),$lt:ISODate("2018-08-21T23:59:00.000Z")}
];
for(let i=0; i<qry.length;i++) {
    print( `${qry[i].$gt} A ${db.activities.distinct( "patientId", {timestamp: qry[i], actType:"TREATMENT"} ).length}`);
    print( `${qry[i].$gt} R ${db.reportings.distinct( "patientId", {timestampDate: qry[i], actType:"TREATMENT"} ).length}`);
}