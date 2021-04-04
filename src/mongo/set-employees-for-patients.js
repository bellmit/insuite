/**
 * User: dcdev
 * Date: 4/12/18  12:44 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*globals db, ObjectId*/

"use strict";

var activitiesCursor = db.activities.aggregate( [
        {
            $group: {
                _id: '$patientId',
                employees: {$addToSet: '$employeeId'}
            }
        }
    ] ),
    result,
    employeesId = [];

while( activitiesCursor.hasNext() ) {
    /*jshint loopfunc:true*/
    result = activitiesCursor.next(),
        employeesId = result.employees.map( function( item ) {
            return ObjectId( item );
        } ); // jshint ignore:line

    db.patients.update( {_id: ObjectId( result._id ), employees: {$exists: false}}, {
        $set: {
            employees: employeesId
        }
    } );
}