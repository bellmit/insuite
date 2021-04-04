/**
 * User: rrrw
 * Date: 21/07/2017  12:59 PM
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/* Script to move all customer created entries out of imported casefolders.
*  requires some preparation.  You must first find the last import _id,
*  which makes sure that no bad records are moved out.
*/

/*global db, ObjectId */
"use strict";

var LAST_IMPORT_ID = "587c574149459e5d649d995b";
var currCF = db.activities.distinct("caseFolderId",{ "_id" : {$gt:ObjectId(LAST_IMPORT_ID)} }).map(function(i){return ObjectId(i);});

/* to test replace the following line with this one, and insert a valid imported patient ID*/ var impCF =  db.casefolders.find( {imported:true,patientId:"587c571649459e5d649b9edc"});

var impCF =  db.casefolders.find( {imported:true, _id:{$in:currCF}});
var mutPatients = [];
impCF.forEach(function(cf) {
    var cfOld = cf._id.str;
    delete cf.imported;
    cf._id = new ObjectId();
    cf.title = (cf.type === "PUBLIC" ? "GKV aus Importiert" : "PKV aus Importiert");
    /*reinsert as imported false*/  db.casefolders.insert( cf );
    db.activities.update({ "_id" : {$gt:ObjectId(LAST_IMPORT_ID)},caseFolderId: cfOld }, {$set:{ caseFolderId: cf._id.str }},{multi:true});
    mutPatients.push(cf.patientId);
});