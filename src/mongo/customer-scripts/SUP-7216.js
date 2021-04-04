/**
 * User: rrrw
 * Date: 25/04/2018  14:46
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, sleep*/

var patList = [
    "1104230",
    "1104233",
    "1104236",
    "1104237",
    "1104239",
    "1104240",
    "1104241",
    "1104245",
    "1104248",
    "1104249",
    "1104250",
    "1104253",
    "1104254",
    "1104255",
    "1104257",
    "1104262",
    "1104264",
    "1104265",
    "1104266",
    "1104269",
    "1104272",
    "1104273",
    "1104279",
    "1104280",
    "1104281",
    "1104282",
    "1104287",
    "1104288",
    "1104290",
    "1104292",
    "1104293",
    "1104294",
    "1104296",
    "1104297",
    "1104298",
    "1104330"
];
var conversionMap = {"1104279":"58de6ccecde8245512cd8ddb",
    "1104287":"58de6ccecde8245512cd8e18",
    "1104288":"58de6ccecde8245512cd8e2c",
    "1104290":"58de6ccecde8245512cd8e3b",
    "1104230":"58de6ccecde8245512cd8c82",
    "1104233":"58de6ccecde8245512cd8c8f",
    "1104239":"58de6ccecde8245512cd8cc0",
    "1104240":"58de6ccecde8245512cd8cd2",
    "1104241":"58de6ccecde8245512cd8ce6",
    "1104245":"58de6ccecde8245512cd8d03",
    "1104254":"58de6ccecde8245512cd8d54",
    "1104257":"58de6ccecde8245512cd8d63",
    "1104262":"58de6ccecde8245512cd8d6d",
    "1104264":"58de6ccecde8245512cd8d7d",
    "1104273":"58de6ccecde8245512cd8dcd",
    "1104292":"58de6ccecde8245512cd8e48",
    "1104296":"58de6ccecde8245512cd8e75",
    "1104298":"58de6ccecde8245512cd8e91",
    "1104330":"58de6ccecde8245512cd8ea9",
    "1104272":"58de6ccecde8245512cd8dbd",
    "1104297":"58de6ccecde8245512cd8e81",
    "1104266":"58de6ccecde8245512cd8d9c",
    "1104265":"58de6ccecde8245512cd8d88",
    "1104269":"58de6ccecde8245512cd8da7",
    "1104282":"58de6ccecde8245512cd8e07",
    "1104250":"58de6ccecde8245512cd8d33",
    "1104236":"58de6ccecde8245512cd8ca5",
    "1104281":"58de6ccecde8245512cd8df5",
    "1104293":"58de6ccecde8245512cd8e57",
    "1104294":"58de6ccecde8245512cd8e67",
    "1104253":"58de6ccecde8245512cd8d4a",
    "1104237":"58de6ccecde8245512cd8cb3",
    "1104255":"58de6ccecde8245512cd8d5c",
    "1104248":"58de6ccecde8245512cd8d22",
    "1104280":"58de6ccecde8245512cd8de9",
    "1104249":"58de6ccecde8245512cd8d29"};

db.patients.count({patientNo:{$in: patList}});
db.casefolders.count({patientId:{$in: patList}});
db.activities.count({patientId:{$in: patList}});
db.tasks.count({patientId:{$in: patList}});
db.documents.count({patientId:{$in: patList}});
db.patientversions.count({patientId:{$in: patList}});
db.schedules.count({patient:{$in: patList}});

/*backup*/
db.casefolders.find({patientId:{$in: patList}}).forEach( a=>{
    a.MODELNAME = "casefolders"; db.SUP7216.insert(a);
});
db.activities.find({patientId:{$in: patList}}).forEach( a=>{
    a.MODELNAME = "activities"; db.SUP7216.insert(a);
});
db.patients.find({markers:"__placeholder__"}).forEach(a=>{
    a.MODELNAME = "patients"; db.SUP7216.insert(a);
});

/*convert*/
patList.forEach( patNo => {
    let r1 = db.activities.update( {patientId:patNo },{$set:{patientId:conversionMap[patNo]}},{multi:true} );
    let r2 = db.casefolders.update({patientId:patNo },{$set:{patientId:conversionMap[patNo]}},{multi:true} );
    print(`${patNo} modified a: ${r1 && r1.nModified} cf: ${r2 && r2.nModified}`);
    sleep(5);
});


let r3 = db.patients.update({markers:"__placeholder__"},{$set:{markers:[]}},{multi:true});
print( `Markers updated:  ${r3.nModified}` );

