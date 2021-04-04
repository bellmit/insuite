/**
 * User: pi
 * Date: 22/02/2017  09:45 PM
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global db */
"use strict";

var ac = db.activities.find({ actType:'MEDDATA', 'medData': {$elemMatch: {type: 'HEIGHT', value: {$lt: 0.1}}} }, {patientId: 1, medData: 1, content:1});
ac.forEach( function(item){
    var
        correctHeightValue,
        medData = item.medData,
        heightData,
        pc;
    medData.some( function(data){
        if( 'HEIGHT' !== data.type){
            return false;
        }
        print( 'Height: ' + data.value + ' activity id: ' + item._id + ' patient id: ' + item.patientId );
        heightData = data;
        return true;
    });
    pc = db.patientversions.find( {patientId: item.patientId, height: {$exists: true} }, { height: 1}).sort({_id: -1}).limit(1);
    if( pc.hasNext() && heightData ){
        correctHeightValue = pc.next().height;
        item.content = item.content.replace( 'Körpergrösse: ' + heightData.value.toString().replace( '.', ',' ), 'Körpergrösse: ' + correctHeightValue.toString().replace( '.', ',' ) );
        heightData.value = correctHeightValue;
    } else {
        if( !pc.hasNext() ) {
            print('CRITICAL: height data without patientversion! ' + item.patientId );
        }
        return;
    }
    db.activities.update({_id: item._id}, {$set: {medData: medData, content: item.content }});
});