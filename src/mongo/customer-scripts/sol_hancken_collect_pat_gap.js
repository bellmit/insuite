/*global db, print, printjsononeline, ISODate */

/**
 * Collect changed data in specific time range and save as hanckendb failed data in tmp collection.
 *
 * Start: dc-mongo 0 <script name>
 *
 * Use sol_hancken_push_to_hancken_db.js to safely move data to actual hanckendb where it is processed.
 */

const sol_hanckenDB = db.getSiblingDB( 'sol_hancken' );
const timeRanges = [
    [ISODate( "2019-05-01T02:00:00.000Z" ), ISODate( "2019-05-06T11:30:00.000Z" )]
];
const timestampQueries = timeRanges.map( timeRange => {
    return {
        timestamp: {$gte: timeRange[0], $lte: timeRange[1]}
    };
} );

db.audits.aggregate( [
    {$match: {model: 'patient', $or: timestampQueries}},
    {$group: {_id: '$objId', actions: {$addToSet: '$action'}}}
] ).forEach( result => {
    let action;

    if( !result._id ) {
        return;
    }

    if( result.actions.includes( 'delete' ) ) {
        action = 'removed';
    } else if( result.actions.includes( 'post' ) ) {
        action = 'created';
    } else {
        action = 'updated';
    }
    const solDoc = {payload: result._id, action, status: 'failed', topic: 'patient', from_MOJ_11326: true};
    printjsononeline( solDoc );
    print( sol_hanckenDB.hanckendb_tmp_patients.insert( solDoc ) );
    print( '' );
} );