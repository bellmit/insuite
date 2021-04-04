/**
 * User: rrrw
 * Date: 23/04/2019  21:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*
How to use this script:

0. the customer MUST provide the mongoDB patientIds.  That is the deal we made with them.

1. The "old" patient is the source patient that now has the activities.  The "new" is the target.

2. Insert these IDs in the p varialbe and run the __search__ section

3. Identify the casefolder ids through the search and run the check.

4. do backup and conversion
*/

/*eslint-disable*/
///tab/casefile_browser/casefolder/59720f268f1e0422b479600c
var p =
    {
        patOld: ObjectId("595902d618e22d4aeb65cac2"),
        patNew: ObjectId("5958f71676de72332b11843c")
    };

/*// search*/
db.casefolders.find({imported:true,patientId:p.patOld.str});
db.casefolders.find({imported:true,patientId:p.patNew.str});
/*check*/
var cfOld = "595e34f49c1feb216e5719b2";
var cfNew = "595e32ac9c1feb216e56d3bb";
var nOld = db.activities.find( {caseFolderId: cfOld, actType:"EXTERNAL",content:/IMPORT-OBJ/}).count();
var nNew = db.activities.find( {caseFolderId: cfNew, actType:"EXTERNAL",content:/IMPORT-OBJ/}).count();
if( nOld < 1 || nNew !== 0 ) {
    throw new Error("STOPPING - report to customer, needs additional checking, cannot automate the change.");
} else {
    print(`${nOld} records will be moved.`)
}
/*backup*/
db.activities.find( {caseFolderId: cfOld, actType:"EXTERNAL",content:/IMPORT-OBJ/}).forEach( a=> {
    db.SUP12838_DEL0620_2.insert(a);
})
db.SUP12838_DEL0620_2.count();
db.activities.update({caseFolderId:cfOld,actType:"EXTERNAL",content:/IMPORT-OBJ/},{
    $set:{patientId:p.patNew.str, caseFolderId:cfNew}
},{multi:true})
