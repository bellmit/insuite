/*global Mongo, printjson */

// start: upload to datasafe and run mongo find-duplicates-patients.js

var DB_ = '0';
var conn = new Mongo( 'localhost' );
var db = conn.getDB( DB_ );

printjson( db.patients.aggregate( [
    {
        $group: {
            _id: {firstname: '$firstname', lastname: '$lastname', kbvDob: '$kbvDob'},
            count: {$sum: 1}
        }
    }, {$match: {_id: {$ne: null}, count: {$gt: 1}}}, {
        $project: {
            firstname: '$_id.firstname',
            lastname: '$_id.lastname',
            kbvDob: '$_id.kbvDob',
            _id: 0
        }
    }] ).toArray() );
