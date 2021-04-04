/**
 * User: rrrw
 * Date: 02/02/17  14:36
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

'use strict';

var globalY = console;
var NAME = 'dbMonitor';
var cluster = require( 'cluster' );

function monitorDb() {
    if( !globalY.doccirrus.auth.isPRC() ||
      !cluster.isMaster ) {
        globalY.log( 'dbMonitor stopping.', 'info', NAME );
        return;
    }

    var dbConfig,
        dbUtils = require( 'dc-core' ).utils,
        DB = require( 'dc-core' ).db,
        configFile = DB.loadDbConfig();

    dbConfig = configFile && configFile.mongoDb;

    var mongo = require('mongodb');
    var options = JSON.parse(  JSON.stringify(DB.checkAndGetMongoClientOptions(configFile)) ); //Do not mutate the options
    var uri, client, db, admin;

    uri = dbUtils.getDBUri('admin', dbConfig);
    delete options.useMongoClient;

    var intervalHandle;

    function stopMonitor( err ) {
        globalY.log( 'dbMonitor, Caught Error ' + err, 'warn', NAME );
        client.close( true, ( err ) => {
            globalY.log( 'dbMonitor, Caught Error on close: ' + err, 'warn', NAME );
        });
        clearInterval( intervalHandle );
    }

    mongo.MongoClient.connect(uri , options, (err, mongoClient) => {
        if (err) {
            globalY.log( 'dbMonitor error starting.' + err.stack, 'error', NAME );
            //callback(err);
            return;
        }
        client = mongoClient;
        db = mongoClient.db('0');
        admin = db.admin();
        setTimeout( run, 60000 );


        function run() {
            intervalHandle = setInterval( () => {
                admin.command({currentOp:1})
                    .then( result => {
                        if( result && result.inprog ) {
                            result.inprog.forEach( item =>
                            {
                                if( item && item.secs_running &&
                                    item.secs_running > 45 &&
                                    /^0\.reportings/.exec(item.ns) &&
                                                        // only kill things running on the 0 namespace,
                                                        // because the replSets have long running
                                                        // mongoDB processes
                                    ( (item.query && item.query.aggregate) ||
                                      (item.command && item.command.aggregate) ||
                                      (item.query && item.query.count ) ||
                                      'query' === item.op
                                    )
                                ) {
                                    globalY.log('dbMonitor Killing Op', 'warn', NAME );
                                    globalY.log( JSON.stringify(item), 'debug', NAME );
                                    admin.command( {killOp: 1, op: item.opid} );
                                }
                            });
                        }
                    } )
                    .catch( err => {
                        globalY.log('dbMonitor interval problem:' + err.stack, 'info', NAME );
                        stopMonitor( err );
                    } );
            }, 5000);
        }

        globalY.log( 'dbMonitor starting.', 'info', NAME );

        db.on( 'error', (err) => {
            stopMonitor( err );
        });

        db.on( 'close', () => {
            globalY.log( 'dbMonitor, Caught Error on closed. ', 'info', NAME );
            clearInterval( intervalHandle );
        });
    });
}

function initDbMonitor( Y ) {
    globalY = Y;
    Y.log( 'dbMonitor initialized.', 'info', NAME );
    return monitorDb;
}

module.exports = {
    initDbMonitor
};