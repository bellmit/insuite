/**
 * User: pi
 * Date: 25.10.17  17:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ObjectId, print */
"use strict";
function run() {
    var lablog = db.lablogs.find( { fileName: 'Z01TH0UZ.LDT' }, { flags: 1, associatedPatients: 1 } )[ 0 ];
    var labDataIds = [];
    lablog.associatedPatients.forEach( ( patientId, index ) => {
        if( patientId ) {
            labDataIds.push( { patientId, activityId: lablog.flags[ index ] } );
        }
    } );
    var labDataActivities = [];
    var treatmentsCond = [];

    function fillTreatments( l_extra, patientId, timestamp ) {
        l_extra.testId.forEach( testObj => {
            if( !testObj.gnr ) {
                return;
            }
            treatmentsCond.push( ...testObj.gnr.map( codeObj => {
                return {
                    patientId,
                    code: codeObj.head,
                    timestamp,
                    locImportId: { $exists: false }
                };
            } ) );
        } );
    }

    labDataIds.forEach( item => {
        let ac = db.activities.find( {
                _id: ObjectId( item.activityId ),
                patientId: item.patientId
            }, { 'l_extra.testId.gnr': 1, timestamp: 1, patientId: 1 } ),
            activity = ac.hasNext() && ac.next();
        if( activity ) {
            labDataActivities.push( activity );
            if( Array.isArray( activity.l_extra ) ) {
                activity.l_extra.forEach( l_extra => {
                    fillTreatments( l_extra, activity.patientId, activity.timestamp );
                } );
            } else {
                fillTreatments( activity.l_extra, activity.patientId, activity.timestamp );
            }
        } else {
            print( `could not find labdata activity for item: ${ JSON.stringify( item )}` );
        }
    } );
    var treatments = [];
    treatmentsCond.forEach( cond => {
        var tc = db.activities.find( cond, { timestamp: 1, patientId: 1, code: 1 } ),
            treatment = tc.hasNext() && tc.next();
        if( treatment ) {
            treatments.push( treatment );
        } else {
            print( `Can not find treatment for condition: ${JSON.stringify( cond )}` );
        }
    } );
    // delete treatments, labDataActivities, lablog


    // var oldTreatments = [];
    // var newTreatments = [];
    // treatments.forEach( item => {
    //     if(item.timestamp.toJSON() < '2017-01-01T00:00:00.000Z'){
    //         if(!oldTreatments.includes(item._id.valueOf())){
    //             oldTreatments.push(item._id.valueOf());
    //         }
    //     } else {
    //         if(!newTreatments.includes(item._id.valueOf())){
    //             newTreatments.push(item._id.valueOf());
    //         }
    //     }
    //
    // });
    //
    // var oldLabData = [];
    // var newLabData = [];
    //
    // labDataActivities.forEach( item => {
    //     if(item.timestamp.toJSON() < '2017-01-01T00:00:00.000Z'){
    //         if(!oldLabData.includes(item._id.valueOf())){
    //             oldLabData.push(item._id.valueOf());
    //         }
    //     } else {
    //         if(!newLabData.includes(item._id.valueOf())){
    //             newLabData.push(item._id.valueOf());
    //         }
    //     }
    //
    // });

}
run();