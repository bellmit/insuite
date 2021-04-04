/**
 * User: rrrw
 * Date: 14/09/2017  11:20
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global ObjectId, db */
"use strict";

function getStats() {
    /* ignore timezone for now, close enough. */
    var startDate = new Date( "2017-12-01T00:00:00.000Z" );
    var startId = ObjectId((startDate.valueOf() / 1000).toString( 16 ) + "0000000000000000");
    var endDate = new Date( "2018-01-01T00:00:00.000Z" );
    var endId = ObjectId((endDate.valueOf() / 1000).toString( 16 ) + "0000000000000000");
    print('Kunde;Anzahl SMS');
    db.messages.aggregate([{$match:{_id:{$gt:startId,$lt:endId}}},{$group:{_id: "$practiceId",cnt:{$sum:1}, practiceName:{$first:"$practiceName"}}}]).forEach(function(customer){ print(customer.practiceName + ';' + customer.cnt);});
}

getStats();