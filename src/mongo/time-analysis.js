/**
 * User: rrrw
 * Date: 18/09/15  12:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db */
/**
 *
 * Quick script to analyse when a certain set of records was
 * created.
 *
 * Returns the number of records per 24 hours period, starting now().
 *
 */
"use strict";

function analyseIDTimes() {
    var id, rec, start, end, cnt = 0, diff = 24 * 3600 * 1000, k = 0;
    //
    //  Adjust the following query to give the recordset to be analysed back
    var rs = db.patientversions.find( {"patientId": "54b3fb7dfd1a19d940f6f7a3"}, {_id: 1} ).sort( {_id: -1} );
    //
    //
    while( rs.hasNext() && k < 100 ) {
        rec = rs.next();
        id = rec._id.str;
        if( !start ) {
            start = parseInt( id.substring( 0, 8 ), 16 ) * 1000;
            print( new Date( start ) );
            k++;
            end = start -1;
        } else {
            end = parseInt( id.substring( 0, 8 ), 16 ) * 1000;
            cnt++;
        }

        if( start - end > diff ) {
            start = undefined;
            print( cnt );
            cnt = 0;
        }
    }

    print( cnt );
    cnt = 0;
}

analyseIDTimes();