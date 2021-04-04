/**
 * User: rrrw
 * Date: 16/06/15  10:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
//
// -- iterate through tenants and update the userContent and content --
//
//  needs to be updated according to new requirements from 27.10.
//
/*global db:true, printjson, ISODate*/
"use strict";

var
    drugs = {
        list:[
            "Adenosin10ml",
            "Adenosin2ml",
            "Bupivacain",
            "Buscopan_20mg",
            "Diazepam",
            "Feinnadel_CT",
            "Feinnadel_MRT",
            "KM_Dot15",
            "KM_Dot20",
            "KM_Dot60",
            "KM_Gado15",
            "KM_Gado7.5",
            "KM_Imeron100_pot",
            "KM_Imeron75_med",
            "KM_Imeron75_pot",
            "KM_Primov 10ml",
            "KM_Unilux 75 ml",
            "Lidocain",
            "Triam_40_mg",
            "Xylonest"
        ],
        str: "MEDIKAMENTE::",
        oldstr: "DRUGS:: "
    },
    material = {
        list:[
            "CDV",
            "Dreiwegehahn (ALTA)",
            "Kanülenfixierung (ALTA)",
            "KMSchlauch (ALTA)",
            "KM_Kit",
            "Perfusor_Kit"
        ],
        str: "MATERIAL:: ",
        oldstr: "MATERIAL:: "
    };

var dbs; db = db.getSiblingDB( "admin" ); dbs = db.runCommand( {"listDatabases": 1} ).databases;

// Iterate through each database and get its collections.
dbs.forEach( function( database ) {
    var
        rs;
    if(/^([\da-f]){8,15}$|^0$/.exec(database.name)) {
        print( database.name + ' entering.');
        db = db.getSiblingDB( database.name );
        // e.g. iterate through all tenants' settings and switch a setting
        rs = db.activities.find( {timestamp:{$gt:ISODate("2016-07-01T00:00:00.000Z")},
            actType:"TREATMENT",
            code:{$in:drugs.list}}
        );
        rs.forEach( function updateCont(item) {
            if( item.userContent && item.userContent.startsWith(drugs.oldstr) ) {
                printjson( db.activities.update( {_id: item._id}, {
                    $set: {
                        content: (drugs.str + item.content),
                        userContent: (drugs.str + item.userContent)
                    }
                }, {multi: true} ) );
            } else if( item.userContent && item.userContent.startsWith(drugs.str) ) {
                // do nothing
                print( '.' );
            } else {
                printjson( db.activities.update( {_id: item._id}, {
                    $set: {
                        content: (drugs.str + item.content),
                        userContent: (drugs.str + item.userContent)
                    }
                }, {multi: true} ) );
            }
        });
        rs = db.activities.find( {timestamp:{$gt:ISODate("2016-07-01T00:00:00.000Z")},
            actType:"TREATMENT",
            code:{$in:material.list}}
        );
        rs.forEach( function updateCont(item) {
            printjson( db.activities.update({_id:item._id},{$set:{
                content: (material.str + item.content),
                userContent: (material.str + item.userContent)
            }}, {multi:true}) );
        });
    } else {
        print( database.name + ' not processing.');
    }
} );



/*   QUICK CHANGE...

var dbs;
var str = "MEDIKAMENTE::",
    oldstr = "DRUGS::";
db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;
dbs.forEach( function( database ) {
    var
        rs;
    if( /^([\da-f]){8,15}$/.exec( database.name ) ) {
        db = db.getSiblingDB( database.name );

        rs = db.activities.find({actType:"TREATMENT",userContent:new RegExp("^"+oldstr)});
        print( database.name + "  doing " + rs.count() );
        rs.forEach(function(item){
            var ouc = item.userContent;
            item.userContent = item.userContent.replace(oldstr, str);
            item.content = item.content.replace(oldstr, str);
            //db.activities.update({_id:item._id},item);
            print("'" + item._id + "','" + ouc + "','" + item.userContent + "'" );
        });

    } else {
        print( database.name + ' not processing.' );
    }
} );
*/

