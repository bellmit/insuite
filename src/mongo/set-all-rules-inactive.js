/**
 * User: rrrw
 * Date: 08/02/2017  12:55 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db */
"use strict";

var ro = [
    { isActive: false },
    { isActive:false, "rules.0.isActive":false },
    { isActive:false, "rules.0.isActive":false, "rules.1.isActive":false },
    { isActive:false, "rules.0.isActive":false, "rules.1.isActive":false, "rules.2.isActive":false },
    { isActive:false, "rules.0.isActive":false, "rules.1.isActive":false, "rules.2.isActive":false, "rules.3.isActive":false },
    { isActive:false, "rules.0.isActive":false, "rules.1.isActive":false, "rules.2.isActive":false, "rules.3.isActive":false, "rules.4.isActive":false },
    { isActive:false, "rules.0.isActive":false, "rules.1.isActive":false, "rules.2.isActive":false, "rules.3.isActive":false, "rules.4.isActive":false, "rules.5.isActive":false }
];
var rs = db.rules.find({ isActive:true, "rules.isActive":true });
rs.forEach( function(item){
    var a;
    if(item.rules) {
        a = item.rules.length;
        db.rules.update({_id:item._id},{$set:ro[a]});
    } else {
        db.rules.update({_id:item._id},{$set:ro[0]});
    }
});