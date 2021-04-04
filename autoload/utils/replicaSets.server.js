/**
 * User: rrrw
 * Date: 26/01/16  14:36
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

'use strict';
/*eslint-disable no-console*/

var
    childProcess = require( 'child_process' ),
    moment = require( 'moment' ),
    SUDOCOMMAND = 'sudo',
    DCCLIPATH = 'dc-cli',
    COMMANDS = {
        update: function() {
            var cmd = new Command( {command: SUDOCOMMAND, params: [DCCLIPATH, "--syslog", "--update-reboot"]} );
            return cmd;
        }
    };

function Command( opt ) {
    this.command = opt.command;
    this.params = opt.params;
}

function run_cmd( cmd, callback, options ){
    let
        spawn = childProcess.spawn,
        child,
        resp = "",
        error,
        output,
        callbackCalled = false,
        spawnOptions = Object.assign( {}, options.spawnOptions );

    child = spawn( cmd.command, cmd.params, spawnOptions || {} );
    console.log(`called: ${cmd.command} ${cmd.params.join(' ')}`);
    child.unref();
    if( !child.stdout ) {
        callback( null, child.pid );
        return;
    }

    child.stdout.on( 'data', function( buffer ) {
        resp += buffer.toString();
    } );

    child.stderr.on( 'data', function( data ) {
        var err = data.toString();
        console.warn( 'Error invoking dc-cli: ' + err );
        if( !callbackCalled ) {
            callbackCalled = true;
            return callback( new Error( err ), output );
        }
    } );

    child.stdout.on( 'end', function( data ) {
        if( data ) {
            resp += data;
        }

        output = resp;

        if( resp && 'object' !== typeof resp && !options.noJson ) {
            try {
                output = JSON.parse( resp );
            } catch( parseErr ) {
                console.warn( 'Received invalid response: ' + resp );
                console.warn( parseErr.stack );

                if( !callbackCalled ) {
                    callbackCalled = true;
                    return callback( parseErr, child.pid );
                }
            }
        }
    } );

    child.stdout.on( 'exit', function( code ) {
        console.log( `EXIT RUN_CMD CODE:  ${ code }  for command:\n${ JSON.stringify( cmd, 2 )}` );
    } );

    child.on( 'close', function() {
        if( output.error ) {
            console.warn( `CLOSE RUN_CMD CODE:  ${ output.error }  for command:\n${ JSON.stringify( cmd, 2 )}` );
            error = new Error( output.error );
        }
        if( !callbackCalled ) {
            callbackCalled = true;
            return callback( error, child.pid );
        }
    } );
}

function getMinutes( momentDateTime ){
    return momentDateTime.hours() * 60 + momentDateTime.minutes();
}

const
    startMinutes = getMinutes( moment("04:00:00", "HH:mm:ss") ),
    endMinutes = getMinutes( moment("04:15:00", "HH:mm:ss") );

function testForSecondaryRepl(callback, retryCount, lastUpdate ) {
    var dbConfig,
        dbUtils = require( 'dc-core' ).utils,
        DB = require( 'dc-core' ).db,
        configFile = DB.loadDbConfig();

    dbConfig = configFile && configFile.mongoDb;
    if( lastUpdate < new Date() ) {
        lastUpdate = new Date();
    }

    var mongo = require('mongodb');
    var options =  JSON.parse(  JSON.stringify(DB.checkAndGetMongoClientOptions(configFile)) ); //Do not mutate the options
    var uri, db, admin, client;

    uri = dbUtils.getDBUri('admin', Object.assign({}, dbConfig, {allDBs: true}));
    delete options.useMongoClient;
    mongo.MongoClient.connect(uri , options, (err, mongoClient) => {
        if (err || !mongoClient) {
            return callback( (err || true), null, lastUpdate);
        }
        client = mongoClient;
        db = mongoClient.db('0');
        admin = db.admin();
        checkForSecondary();
    });


    function checkForSecondary() {
        admin.command({replSetGetStatus:1},{},function(err,res) {
            if( !err && 1 === res.ok && 1 !== res.myState ){
                if( 0 === ( ( retryCount || 0 ) % 20) ){
                    let lastUpdateDateTime = moment(lastUpdate),
                        lastUpdateMinutes = getMinutes( lastUpdateDateTime );
                    console.log(`REPLICA: times: ${lastUpdate}`, startMinutes, endMinutes, lastUpdateMinutes );
                    if( lastUpdateMinutes >= startMinutes && lastUpdateMinutes < endMinutes ){
                        lastUpdate = lastUpdateDateTime.add(20, 'm').toDate();
                        console.log(`REPLICA: lastUpdate: ${lastUpdate}`);
                        db.stats().then(function(stats) {console.log( "REPLICA: ", stats);});

                        let
                            practicesCollection = db.collection('practices');

                        practicesCollection.find( {}, {readPreference: mongo.ReadPreference.SECONDARY_PREFERRED} ).toArray( (err, items) => {

                            if( err ){
                                console.warn('REPLICA: Error in loading license on replica ', err.message);
                            } else {
                                console.log(items[0]);
                                let licenseScope = items && items[0] && items[0].licenseScope || {},
                                    keys = Object.keys( licenseScope),
                                    firstLicense = licenseScope[ keys && keys[0] ] || {},
                                    upgradeDate = firstLicense.upgrade;

                                console.log( 'License Scope and Upgrade Date: ', firstLicense, upgradeDate );
                                // sanity check upgradeDate is a date in the past.
                                if( upgradeDate && moment( upgradeDate, 'DD.MM.YYYY' ).isBefore( moment() ) ){
                                    console.log( 'REPLICA: START SOFTWARE UPGRADE' );

                                    run_cmd( COMMANDS.update(), function( err, pid ) {
                                        console.log( `REPLICA: SOFTWARE UPGRADE  started on ${pid}` );
                                        if( err ) {
                                            console.warn( `REPLICA: error in software upgrade: ${ JSON.stringify( err )}` );
                                        }
                                    }, {
                                        spawnOptions: { // child spawn options
                                            detached: true,
                                            stdio: [
                                                'ignore'
                                            ]
                                        }
                                    } );
                                }
                            }
                        });

                    }
                }

                client.close();
                return callback(null, true, lastUpdate);
            }
            if( err && 0 === err.ok && 76 === err.code ){
                client.close();
                return callback(); // skip for 'not running with --replSet'
            }
            client.close();
            return callback( err );
        });
    }

}

module.exports =  {
    testForSecondaryRepl
};