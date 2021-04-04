/*global db, ObjectId, print, printjsononeline, ISODate */
"use strict";

/**
 * Collect changed data in specific time range and save as hanckendb failed data in tmp collection.
 *
 * Start: dc-mongo 0 <script name>
 *
 * Use sol_hancken_push_to_hancken_db.js to safely move data to actual hanckendb where it is processed.
 */

const sol_hanckenDB = db.getSiblingDB( 'sol_hancken' );
const actTypeTopicMap = {
    FINDING: 'simple_activity',
    CAVE: 'simple_activity',
    DOCLETTER: 'simple_activity',
    LABDATA: 'labdata',
    PUBPRESCR: 'simple_activity',
    PRIVPRESCR: 'simple_activity',
    CONTACT: 'simple_activity',
    FORM: 'simple_activity',
    DIAGNOSIS: 'diagnosis'
};
const wantedActTypes = Object.keys( actTypeTopicMap );

const timeRanges = [
    [ISODate( "2019-05-01T02:00:00.001Z" ), ISODate( "2019-05-06T11:30:00.001Z" )]
];

const timestampQueries = timeRanges.map( timeRange => {
    return {
        timestamp: {$gte: timeRange[0], $lte: timeRange[1]}
    };
} );

db.audits.aggregate( [
    {$match: {model: 'activity', $or: timestampQueries}},
    {$group: {_id: '$objId', actions: {$addToSet: '$action'}}}
] ).forEach( result => {
    let actType;
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

    if( action === 'removed' ) {
        const auditEntry = db.audits.find( {
            objId: result._id,
            model: 'activity',
            'diff.actType.newValue': {$in: wantedActTypes}
        } ).sort( {timestamp: -1} ).limit( 1 ).toArray()[0];
        actType = auditEntry && auditEntry.diff.actType.newValue;
    } else {
        let oId;
        try {
            oId = ObjectId( result._id );
            const activity = db.activities.findOne( {actType: {$in: wantedActTypes}, _id: oId} );
            actType = activity && activity.actType;
        } catch( err ) {
            print( `error _id: ${result._id}: ${err.stack || err}` );
        }

    }

    if( actType && actTypeTopicMap[actType] ) {
        const solDoc = {
            payload: result._id,
            action,
            status: 'failed',
            topic: actTypeTopicMap[actType],
            from_MOJ_11326: true
        };
        printjsononeline( solDoc );
        print( sol_hanckenDB.hanckendb_test.insert( solDoc ) );
        print( '' );
    }
} );