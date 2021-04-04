/**
 * User: strix
 * Date: 13/09/2018
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db*/

function checkTaskPatientId( taskObj ) {
    const ID_LENGTH = 24;
    let temp;

    if ( taskObj.patientId && taskObj.patientId.length && ID_LENGTH !== taskObj.patientId.length ) {
        print( `Checking patient id on task ${taskObj._id}: ${taskObj.patientId}` );

        temp = taskObj.patientId.split( '_id:' )[1];
        if ( !temp ) { return badString( taskObj._id, taskObj.patientId ); }

        temp = temp.split( ',' )[0];
        if ( !temp ) { return badString( taskObj._id, taskObj.patientId ); }

        temp = temp.trim();
        if ( temp.length !== ID_LENGTH ) { return badString( taskObj._id, taskObj.patientId ); }

        print( `Correcting task ${taskObj._id}, patientId => ${temp}` );

        db.tasks.update( { _id: taskObj._id }, { $set: { patientId: temp } } );
    }

    function badString( _id, str) {
        print( `Could not correct task ${_id}: ${str}` );
    }
}

db.tasks.find().forEach( checkTaskPatientId );