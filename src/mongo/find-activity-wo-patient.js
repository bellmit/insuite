/**
 * User: rrrw
 * Date: 18/08/2016  2:51 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ObjectId, printjson */
"use strict";

var rs = db.activities.find( {} ), p = {}, rs2, rec;
while( rs.hasNext() ) {
    rec = rs.next();
    if( p[rec.patientId] > 0 ) {
        p[rec.patientId]++;
    } else if ( !p[rec.patientId] ) {
        rs2 = db.patients.find( {_id:ObjectId( rec.patientId )});
        if( rs2.hasNext() ) {
            p[rec.patientId] = -1;
        } else {
            p[rec.patientId] = 1;
        }
        rs2 = undefined;
    }
    rec = undefined;
}
// output diagnostics
Object.keys( p ).forEach(function out(key) {
    var item = p[key];
    if( item > 0 ) { printjson( key ); print( item ); }
});
