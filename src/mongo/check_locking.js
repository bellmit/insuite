/* globals db */
/*  give stats on locking

Maximal lock object - attrs might be missing

run as: dc-mongo --quiet 0 /var/lib/prc/src/mongo/check-locking.js

{
    "r" : NumberLong(602154565),
    "w" : NumberLong(15795810),
    "R" : NumberLong(21),
    "W" : NumberLong(38)
} */

const attrs = ["r", "R", "w", "W"];
const status = db.serverStatus(); //eslint-disable-line
const dssl = status.locks; //eslint-disable-line

function getCollisions( acquire, acquireWait ) {
    return attrs.map( a=>{ return ( acquire[a] && acquireWait[a] ) ? ( acquireWait[a] / acquire[a] )*100 : 0; });
}
function getWaitTimes( acquireWait, waitTimes ) {
    return attrs.map( a=>{ return waitTimes[a] && acquireWait[a] ? waitTimes[a] / (1000* acquireWait[a]) : 0; });
}
function getTotalWaitTime(waitTimes) {
    return attrs.reduce( (sum, a) => ((waitTimes[a]?waitTimes[a]:0)+sum), 0 );
}

function printStatsForArea( area, locks ) {
    const { acquireCount, acquireWaitCount, timeAcquiringMicros } = locks;

    let collisions = getCollisions( acquireCount, acquireWaitCount );

    let waitTimes = getWaitTimes( acquireWaitCount, timeAcquiringMicros );

    print( `${area}  :   Number of Acquires   "r" ${acquireCount.r+0||0} | "R" ${acquireCount.R+0||0} | "w" ${acquireCount.w+0||0} | "W" ${acquireCount.W+0||0}` );

    print( `Collision %: "r" ${collisions[0]}% | "R" ${collisions[1]}% | "w" ${collisions[2]}% | "W" ${collisions[3]}%` );

    print( `Wait times (ms): "r" ${waitTimes[0]}ms | "R" ${waitTimes[1]}ms | "w" ${waitTimes[2]}ms | "W" ${waitTimes[3]}ms` );

}

var totalWait = 0;
var a = "Collection";
printStatsForArea(  a, dssl[a] || {} );
totalWait += getTotalWaitTime( dssl[a].timeAcquiringMicros );

a = "Database";
printStatsForArea(  a, dssl[a] || {} );
totalWait += getTotalWaitTime( dssl[a].timeAcquiringMicros );

a = "MMAPV1Journal";
printStatsForArea(  a, dssl[a] || {} );
totalWait += getTotalWaitTime( dssl[a].timeAcquiringMicros );

a = "Global";
printStatsForArea(  a, dssl[a] || {} );
totalWait += getTotalWaitTime( dssl[a].timeAcquiringMicros );

var uptimeHours = status.uptime/3600;
print( `\nUptime (h): ${uptimeHours}` );
print(`\nTotal locking wait time (s): ${totalWait/1000000}`);
print(`\nLocking Wait Time per Uptime on all cores (s/h): ${(totalWait/1000000)/uptimeHours}`);