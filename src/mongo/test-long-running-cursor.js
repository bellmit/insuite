/**
 * User: md
 * Date: 6/11/18  1:08 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*eslint-disable no-console */

function testMongoCursor( callback ) {
    const
        mongo = require('mongodb'),
        uri = 'mongodb://localhost:27019/admin',
        options = { poolSize: 25,
            keepAlive: 120,
            socketTimeoutMS: 360000,
            reconnectInterval: 5000,
            autoReconnect: true,
            w: 1
        };


    let client, db, stream, processed = 0, currentExportPromise;

    console.time('cursor');

    function onData( catalog ) {
        stream.pause();
        processed++;
        currentExportPromise = () => {
            return new Promise ( resolve => {
                console.log( processed, catalog );
                setTimeout( resolve, 10 * 1000 );
            });
        };

        currentExportPromise().then( () => {
            stream.resume();
        });
    }

    function onError( err ) {
        console.warn(`onError ${err}`);
        stream.close();
    }

    function onClose() {
        console.timeEnd('cursor');
    }

    mongo.MongoClient.connect(uri , options, (err, mongoClient) => {
        if (err) {
            console.warn( 'Error open mongo connection', err );
            return callback(err);
        }
        client = mongoClient;
        db = mongoClient.db('0');
                                                                                            // add noCursorTimeout fix the issue
        stream = db.collection('catalogs').find({}).project({_id:1, title: 1, catalog: 1}); //.addCursorFlag('noCursorTimeout', true);
        stream.on( 'data', onData ).on( 'error', onError ).on( 'close', onClose );
        callback();

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

testMongoCursor( (err) => {
    if(err){
        console.warn('Error in callback', err);
    }
});