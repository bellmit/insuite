/**
 * User: rrrw
 * Date: 16/06/15  10:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
//
// -- correct patient records on the DCPRC, so that the
// -- patient email is still there in pat portal
//
// this script was run successfully on PRODVPRC on 18.6.2015.
//
/*global db:true */
"use strict";


// make sure we are in local tenant
db = db.getSiblingDB( "0" );

db.contacts.update({patient:true,"communications.0.type":"EMAILJOB"},{$set:{"communications.0.confirmed":true}},{multi:true});
db.contacts.update({patient:true,"communications.1.type":"EMAILJOB"},{$set:{"communications.1.confirmed":true}},{multi:true});
db.contacts.update({patient:true,"communications.2.type":"EMAILJOB"},{$set:{"communications.2.confirmed":true}},{multi:true});


