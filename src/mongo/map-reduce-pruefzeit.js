/**
 * User: rrrw
 * Date: 13/03/15  11:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

"use strict";

/*global db, emit */


///**
// *  map a single document to give the result of what we want to see.
// */
var m = function m() {
    function getQuarter( d ) {
        d = d || new Date();
        var m = Math.floor( d.getMonth() / 3 ) + 1;
        return m > 4 ? m - 4 : m;
    }

    var
        quarter = getQuarter( this.timestamp ),
        day = this.timestamp,
        ue = this.u_extra || {},
        pz = ue.pruefzeit || null,
        resultD, resultQ;

    day.setHours( 0, 0, 0, 0 );

    if( !pz ) {
        return;
    }

    if( pz.tag ) {
        resultD = {
            employeeId: this.employeeId,
            day: day,
            quarter: quarter,
            pzq: 0,
            pzt: pz.tag,
            code: this.code,
            codes: {},
            pztsum: pz.tag,
            pzqsum: 0
        };
        resultD.codes[this.code] = 1;
    } else {
        resultD = null;
    }

    if( pz.quartal ) {
        resultQ = {
            employeeId: this.employeeId,
            day: day,
            quarter: quarter,
            pzq: pz.quartal,
            pzt: 0,
            code: this.code,
            codes: {},
            pztsum: 0,
            pzqsum: pz.quartal
        };
        resultQ.codes[this.code] = 1;
    } else {
        resultQ = null;
    }
    if( resultD ) {
        emit( {e: this.employeeId, d: day}, resultD );
    }
    if( resultQ ) {
        emit( {e: this.employeeId, q: quarter}, resultQ );
    }
};

///**
// * Go through results that have several values and compact these
// * values, in to a single result.
// *
// * Assumes that it won't be called with a single value.
// *
// * @param key
// * @param values Array of results
// * @return a single result
// */
var r = function r( key, values ) {
    var
        code,
        isQ,
        result,
        i;

    i = values.length;
    i--;
    result = values[i];
    isQ = (result.day === 0);
    while( i ) {
        i--;
        if( isQ ) {
            result.pzqsum += values[i].pzqsum;
        } else {
            result.pztsum += values[i].pztsum;
        }
        code = values[i].code;
        if( result.codes[code] ) {
            result.codes[code]++;
        } else {
            result.codes[code] = 1;
        }
    }
    return result;
};

var f = function f( key, value ) {
    //delete value.codes;
    return value;
};

db.runCommand(
    {
        mapReduce: 'activities',
        map: m,
        reduce: r,
        finalize: f,
        out: { replace: '_pruefzeit' },
        query: {
            actType: "TREATMENT",
            "u_extra.pruefzeit": {$exists: true}
        },
        sort: {"_id.employeeId": -1}
    }
);

