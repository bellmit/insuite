/**
 * User: md
 * Date: 6/27/18  1:08 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*eslint-disable no-console */

const socketTimeoutMS = 100000; //360000;

function testMongoQuery( callback ) {
    const
        mongo = require('mongodb'),
        uri = 'mongodb://localhost:27019/admin',
        options = { poolSize: 25,
            keepAlive: 120,
            socketTimeoutMS: socketTimeoutMS,
            reconnectInterval: 5000,
            autoReconnect: true,
            w: 1
        };


    let client, db, dba;

    console.time('query');

    mongo.MongoClient.connect(uri , options, (err, mongoClient) => {
        if (err) {
            console.warn( 'Error open mongo connection', err );
            return callback(err);
        }
        client = mongoClient;
        db = mongoClient.db('0');
        dba = db.admin();

        db.command( {
            profile: 1,
            slowms: (socketTimeoutMS - 100)
        }).then( result => {
            console.warn(result);

            let count = db.collection('catalogs').find({
                $where: 'function() {var d = new Date((new Date()).getTime() + 1*10);while (d > (new Date())) { }; return true;}'
            }).project({_id:1, title: 1, catalog: 1}).count();

            count.then( result => {
                console.warn( 'result: ', result );
                client.close( true, ( err ) => {
                    if(err){
                        console.warn( 'Caught Error on close: ', + err );
                    }
                    console.timeEnd('query');
                    callback();
                });

            } ).catch( err => {
                console.timeEnd('query');
                console.warn('catched error:', err);

                db.collection('system.profile').find({}).toArray( (err, items) => {
                    if(err){
                        console.error('Error on getting profile', err);
                    }
                    console.warn('\n\n  p:', JSON.stringify(items));
                });

                //db.currentOp()
                dba.command({ currentOp: 1 }).then( result => {
                    let longOps = (result && result.inprog || []).filter( el => el.secs_running > 60 );
                    console.warn('\n\n  result:', longOps);
                    longOps.forEach( op => {
                        dba.command( { killOp: 1, op: op.opid } ).then( result => console.log( ' r:', result ) );
                    });
                    setTimeout( () => { process.exit(0); }, 1000 );
                });

            } );

        } );

        db.on( 'error', (err) => {
            console.warn('Error on DB', err );
            client.close( true, ( err ) => {
                console.warn( 'Error on DB close', err);
            });
        });

        db.on( 'close', ( arg ) => {
            console.log( 'DB closed', arg );
        });
    } );

}

testMongoQuery( (err) => {
    if(err){
        console.warn('Error in callback', err);
    }
    process.exit(0);
});


/*
 // add noCursorTimeout fix the issue
 const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
 //'function() {var d = new Date((new Date()).getTime() + 1*1000);while (d > (new Date())) { }; return true;}'
 //' async function(){await seep(10); return true;}'


 (function (sec) {db.currentOp()['inprog'].forEach(function (query) {
 if (query.op !== 'command') { return; }
 if (query.secs_running < sec) { return; }

 print(['Killing query:', query.opid,
 'which was running:', query.secs_running, 'sec.'].join(' '));
 db.killOp(query.opid);
 })})(120 /* The maximum execution time!* /);

 */