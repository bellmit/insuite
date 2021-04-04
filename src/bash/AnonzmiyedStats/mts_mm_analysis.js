var dbs;db = db.getSiblingDB( "admin" );dbs = db.runCommand( {"listDatabases": 1} ).databases;
function runCmd() {
    var p = db.practices.find({},{coname:1,dcCustomerNo:1,tenantId:1}).next();
    var e = db.employees.count({type:"PHYSICIAN", "status" : "ACTIVE"}); var l = db.locations.count();
    var pat = db.patients.count();
    print(`"${p.coname}", ${p.dcCustomerNo}, ${p.tenantId}, ${e}, ${l}, ${pat}`);
}
dbs.forEach( function( database ) {
    if(/^([\da-f]){8,15}$|^0$/.exec(database.name)) {
        db = db.getSiblingDB( database.name );
        runCmd();
    }
} );

