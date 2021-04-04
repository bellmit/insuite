/*global db, print, sleep */

/**
 * Move data from tmp collection with failed data representing gaps in transfer between hancken sol and mpi.
 * Data is picked up and processed by sol flow "Trigger Upon Start".
 *
 * Script waits for the hackendb collection to has no more entries meaning everything is processed. Check if there are
 * still entries if that might can not be processed because data is missing in actual inSuite collection and delete them
 * to go on with moving data.
 *
 * LIMIT could be increased. You can stop script anytime and adjust skip value with this from last log to adjust LIMIT.
 *
 * Start: dc-mongo 0 <script name>
 */

const sol_hanckenDB = db.getSiblingDB( 'sol_hancken' );
const targetCollection = 'hanckendb_test_target'; // hanckendb is actual db
const tmpCollection = 'hanckendb_tmp_pat'; // hanckendb_tmp_act
const WAIT_FOR = 1000 * 10;
const LIMIT = 200;
let skip = 0;

function targetHasZeroEntries() {
    return 0 === sol_hanckenDB[targetCollection].count();
}

function pushEntries() {
    if( !targetHasZeroEntries() ) {
        print( `target db entries to be processesd wait! SKIP: ${skip}` );
        sleep( WAIT_FOR );
        pushEntries();
        return;
    }
    const entries = sol_hanckenDB[tmpCollection].find().sort( {_id: 1} ).skip( skip ).limit( LIMIT ).toArray();
    if( !entries.length ) {
        print( `finished pushing entries to target db SKIP: ${skip}` );
        return;
    }
    print( `pushing ${entries.length} entries at SKIP: ${skip}` );
    sol_hanckenDB[targetCollection].insertMany( entries );
    skip += LIMIT;
    pushEntries();
}

pushEntries();

