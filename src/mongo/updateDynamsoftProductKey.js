/**
 * User: rrrw
 * Date: 01/08/2017  13:07
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, printjson*/
"use strict";
db.settings.find( {"dynamsoft.useWebTwain": true} ).forEach( function( setting ) {
    setting.dynamsoft = setting.dynamsoft.map( function( dynamsoft ) {
        dynamsoft.productKey = "f0068WQAAAG88xXgUE60ER4ZMrwNrFNxE+gCaspBSMp98KXrXBbDXAlwBXqdqtKyEWgcuGNmV9KtLb3Nke4j9JFuVT8I4RgI=";
        return dynamsoft;
    } );
    printjson(setting);
    db.settings.update({_id:setting._id},setting);
} );
