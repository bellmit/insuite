/**
 * User: rrrw
 * Date: 03/01/2018  08:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db: true, ObjectId*/
/*
1. create CSV for external use
   suggest   dc-mongo --quiet 0 /var/lib/prc/src/mongo/customer-scripts/export-mongofiles-csv.js > manifest.csv

2. drive mongofiles dump from CSV
   # the following 1-line script works on Mac and on CentOS.
   # DEV version
   cat manifest.csv | cut -f 2 -d '"' | sed 's%\(.*\)/\(.*\)%mkdir \1;mongofiles -d 0 --port 27023 -l \1/\2 get \2%g' | xargs -L 1 -I JJJ bash -c 'JJJ'
   # PROD version
   PROP_ADMIN_PASSWORD="admin.password"
   adminPassword=$(dc-mongo-property get "$PROP_ADMIN_PASSWORD")
   export PASSWD=$adminPassword
   cat manifest.csv | cut -f 2 -d '"' | sed 's%\(.*\)/\(.*\)%mkdir -p \1;mongofiles -d 0 -u admin -p $PASSWD --authenticationDatabase admin -l \1/\2 get \2%g' | xargs -L 1 -I JJJ bash -c 'JJJ'

 */
'use strict';

var r = ( s => (s && s.replace(/"/g,'\\"')));

var cnt=1, i=0, failures=0; /*eslint-disable-line*/
var manifestcsv = "",log=""; /*eslint-disable-line*/
var docs = db.documents.find({activityId:{$exists:true},mediaId:{$exists:true},"formState.neverSaved" : {$ne: true }, createdOn: {$ne:null}}).sort({createdOn:1});
docs.forEach((doc) => {
    var actRS;
    var patId;
    var patRS;
    var pat;
    var nextLine;
    try {
        actRS = db.activities.find({_id: ObjectId(doc.activityId)});
        patId = actRS.hasNext() ? actRS.next().patientId : null;
        if (!patId) {/*print('a/' + doc._id.str);*/
            failures++;
            return;
        }
        patRS = db.patients.find({_id: ObjectId(patId)});
        pat = patRS.hasNext() ? patRS.next() : null;
    } catch (e) {
        log += `${e} - doc._id: ${doc._id}`;
        return;
    }
    if (!pat) {/*print('p/' + patId);*/
        failures++;
        return;
    }
    nextLine = `"${doc.activityId}",`;
    nextLine += `"${cnt}/${doc.mediaId}",${pat.patientNumber},"${r(pat.lastname)}","${r(pat.firstname)}",${r(pat.kbvDob)},`;
    nextLine += `"${r(doc.caption)}","${r(doc.contentType)}",${doc.createdOn.toISOString()}`;
    nextLine = nextLine.replace('<br/>',';','g');
    manifestcsv += `${nextLine.replace('\n',';','g')}\r\n`;
    i++;
    if (i > 500) {
        cnt++;
        i = 0;
    }
});
print(manifestcsv);