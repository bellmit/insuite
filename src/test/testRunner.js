/**
 * User: dcdev
 * Date: 5/15/17  2:30 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*
 please follow this structure to run tests:
 node testRunner.js TEST_TYPE(rest-api/mocha) ACTION(run/calc/'') NUMBER_OF_TESTS(default 20) CLEAN_REDIS_CACHE(true/false)

 to run rest-api tests: "node testRunner.js rest-api run"
 to calculate top15 slowest rest-api tests: "node testRunner.js rest-api calc"
 both: "node testRunner.js rest-api"

 to run mocha tests: "node testRunner.js mocha run"
 to calculate top15 slowest mocha tests: "node testRunner.js mocha calc"
 both: "node testRunner.js mocha"
 */



const exec = require( 'child_process' ).exec,
    async = require( 'async' ),
    fs = require( 'fs' ),
    path = require( 'path' ),
    REST_API_TEST_TYPE = 'rest-api',
    MOCHA_TEST_TYPE = 'mocha',
    test_type = process.argv[2],
    RUNS = process.argv[4] || 20,
    RUN_CMD = "run",
    CALCULATE = "calc",
    FLUSHDB = process.argv[5],
    param = process.argv[3];

let RESULTS_DIR, SORTED_DIR, cmd, redisClient;

//this function only for testing, please don'to do like that anywhere else
function createRedisClient() {
    const
        config = {
            "port": 6379,
            "host": "localhost"
        },
        redis = require( 'redis' );
    redisClient = redis.createClient( config );

    redisClient.on( 'connect', () => {
        console.log( 'Connected to redis server' );
        if( 'true' === FLUSHDB ) {
            redisClient.flushdb( function( err, succeeded ) {
                if( err ) {
                    console.warn( `Error while clearing current redis db: ${err}\n Please do it manually` );
                }
                console.log( `Clear current redis db: ${succeeded}` ); // will be true if successfull
            } );
        }
    } );
    redisClient.on( 'error', ( err ) => {
        console.log( `Redis connection error: ${JSON.stringify( err )}` );
    } );

}

function isClientConnected( redisClient ) {
    let
        client = redisClient;
    return Boolean( client && client.connected );
}

if( !isClientConnected( redisClient ) ) {
    createRedisClient();
}

// choose appropriate command for run and folders for saving results due to the test type
switch( test_type ) {
    case REST_API_TEST_TYPE:
        RESULTS_DIR = path.join( __dirname, 'results_api_tests' );
        SORTED_DIR = path.join( RESULTS_DIR, 'sorted_top15' );
        cmd = "mocha test/api2 --recursive --reporter json-stream --prof --dcurl http://2222222222.dev.dc --dcuser admin --dcpassword 123456";
        break;
    case MOCHA_TEST_TYPE:
        RESULTS_DIR = path.join( __dirname, 'results_mocha_tests' );
        SORTED_DIR = path.join( RESULTS_DIR, 'sorted_top15' );
        cmd = `node server.js start 12358 --mocha --reporter json-stream --server-type vprc --nofork --skipJadeCache --useSuiteList`;
        break;
    default:
        console.log( 'Second parameter must be type of tests to run.("mocha"/"rest-api")' );
        process.exit( 0 );
}

if( !fs.existsSync( RESULTS_DIR ) ) {
    fs.mkdir( RESULTS_DIR, ( err ) => {
        if( err ) {
            console.log( `Error while creating new folder for results: ${  JSON.stringify( err )}` );
            process.exit( 0 );
        }
    } );
}

if( !fs.existsSync( SORTED_DIR ) ) {
    fs.mkdir( SORTED_DIR, ( err ) => {
        if( err ) {
            console.log( `Error while creating new folder for sorted results: ${  JSON.stringify( err )}` );
            process.exit( 0 );
        }
    } );
}

function run( next ) {

    console.log( `Running test for ${test_type}.` );
    const
        result = [];

    //create array with empty results
    for( let i = 0; i < RUNS; i++ ) {
        result.push( {duration: '', number: i} );
    }

    //create valid array of arrays from result output of json-stream reporter
    function validateJSON( str ) {
        const almostValidJSON = str.split( ']' ).join( '],' );
        return almostValidJSON.substring( 0, almostValidJSON.length - 1 );
    }

    function cbForApi( err, res, item, done ) {

        if( err ) {
            console.log( "Error while execution test rest api cmd: ", JSON.stringify( err ) ); //tests errors
        }
        if( res ) {
            const validJSON = validateJSON( res ),
                resObj = JSON.parse( `[${validJSON}]` ),
                end = resObj[resObj.length - 1];

            fs.writeFile( path.join( RESULTS_DIR, item.number.toString() ), JSON.stringify( resObj ), () => {
                if( end ) {
                    item.duration = end[1].duration;
                    return done();
                } else {
                    return done();
                }
            } );

        }
    }

    function cbForMocha( err, res, item, done ) {
        if( err ) {
            console.log( "Error while execution test mocha cmd: ", JSON.stringify( err ) ); //tests errors
        }
        if( res ) {
            const indexStart = res.indexOf( '["start",' ),
                indexEnd = res.indexOf( '["end",' ),
                end = JSON.parse( `${res.substring( indexEnd )}` );

            res = validateJSON( res.substring( indexStart ) );
            res = `[${res}]`;
            fs.writeFile( path.join( RESULTS_DIR, item.number.toString() ), res, () => {
                setTimeout( function() {
                    if( end ) {
                        item.duration = end[1].duration;
                        return done();
                    } else {
                        return done();
                    }
                }, 2000 );
            } );
        }
    }

    //all tests are running from here
    async.mapSeries( result, ( item, done ) => {
        console.log( `executing ${test_type} cmd`, item.number );
        if( MOCHA_TEST_TYPE === test_type ) {
            exec( cmd, {
                cwd: path.join( process.env.DC_ENV, 'dc-insuite' )
            }, ( err, res ) => {
                cbForMocha( err, res, item, done );
            } );
        }
        else {
            exec( cmd, {
                cwd: path.join( process.env.DC_ENV, 'dc-insuite' )
            }, ( err, res ) => {
                cbForApi( err, res, item, done );
            } );
        }

    }, ( err ) => {
        if( err ) {
            console.log( "Result error: ", err );
            return next( err );
        }
        console.log( "Result: " );
        let avg = 0;
        result.forEach( ( item ) => {
            console.log( `${item.number}: ${item.duration}` );
            avg += item.duration;
        } );
        avg = avg / result.length;
        console.log( "Avg: ", avg );
        return next( null );
    } );

}

function calculateLongestTest( next ) {
    let filePathes = [];

    //generate array with paths of result files
    for( let i = 0; i < RUNS; i++ ) {
        filePathes.push( path.join( RESULTS_DIR, i.toString() ) );
    }
    async.eachSeries( filePathes, function( filePath, done ) {
        var fileObj, top15 = [], filtered = [];
        fs.readFile( filePath, 'utf-8', ( err, file ) => {//jshint ignore:line
            if( err ) {
                console.log( `Error while reading file: ${filePath}. Error: ${JSON.stringify( err )}` );
                return done( err );
            }

            try {
                fileObj = JSON.parse( file );
            }
            catch( e ) {
                console.log( `Error while calculating longest tests: ${  JSON.stringify( e )}` );
                return done( e );
            }
            if( fileObj ) {
                //get tests which have duration anf ignore 'end' element
                filtered = fileObj.filter( ( test ) => {
                    if( test[1].duration && 'end' !== test[0] ) {
                        return test;
                    }
                } );
                //sort in descending order
                filtered.sort( ( a, b ) => {
                    if( a[1].duration > b[1].duration ) {
                        return -1;
                    }
                    else if( a[1].duration < b[1].duration ) {
                        return 1;
                    }
                    else if( a[1].duration === b[1].duration ) {
                        return 0;
                    } else {
                        return -1;
                    }
                } );

                async.each( filtered, function( item, innerDone ) {

                    //push in result array which will be written in the file
                    top15.push( `${JSON.stringify( {
                            name: item[1].fullTitle,
                            duration: item[1].duration
                        } )  }\n` );
                    //try to get hash value: if exists then increment, if not then set
                    redisClient.hget( 'testhash', item[1].fullTitle, ( err, data ) => {
                            if( err ) {
                                return innerDone( err );
                            }
                            var redisData = JSON.parse( data );
                            if( !redisData ) {
                                redisClient.hset(
                                    'testhash',
                                    item[1].fullTitle,
                                    item[1].duration,
                                    function( err ) {
                                        if( err ) {
                                            return innerDone( err );
                                        }
                                        return innerDone();
                                    } );
                            } else {
                                redisClient.hincrby(
                                    'testhash',
                                    item[1].fullTitle,
                                    item[1].duration,
                                    function( err ) {
                                        if( err ) {
                                            return innerDone( err );
                                        }
                                        return innerDone();
                                    }
                                );
                            }
                        }
                    );
                }, function( error ) {
                    if( error ) {
                        return done( error );
                    }

                    fs.writeFile( path.join( path.dirname( filePath ), 'sorted_top15', path.basename( filePath ) ), `[\n${top15}]`, ( err ) => {
                        if( err ) {
                            console.log( `Error while writing to file. Error: ${JSON.stringify( err )}` );
                            return done( err );
                        }

                        return done();
                    } );

                } );

            } else {
                return done();
            }
        } );
    }, function( err ) {
        if( err ) {
            return next( err );
        }

        //get final hash value with all test results from redis cache and write it into the file
        redisClient.hgetall(
            'testhash', function( err, res ) {
                if( err ) {
                    throw err;
                }
                let fields = Object.keys( res ),
                    after = {};
                fields.sort( ( a, b ) => {
                    if( +res[a] > +res[b] ) {
                        return -1;
                    }
                    else if( +res[a] < +res[b] ) {
                        return 1;
                    }
                    else if( +res[a] === +res[b] ) {
                        return 0;
                    } else {
                        return -1;
                    }
                } );

                async.each( fields, function( field, cb ) {
                    after[field] = res[field] / RUNS;
                    return cb();
                }, function( err ) {
                    if( err ) {
                        return next( err );
                    }
                    fs.writeFile( path.join( SORTED_DIR, 'redis_cache' ), `${JSON.stringify( after )}`, ( err ) => {
                        if( err ) {
                            console.log( `Error while writing to file. Error: ${JSON.stringify( err )}` );
                            return next( err );
                        }

                        return next();
                    } );
                } );
            } );
    } );
}

// define set of functions to run due to the params in executed command
switch( param ) {
    case "test":
        break;
    case RUN_CMD:
        run( () => {
        } );
        break;
    case CALCULATE:
        calculateLongestTest( () => {
        } );
        break;
    default:
        async.waterfall(
            [
                run,
                calculateLongestTest
            ],
            ( err ) => {
                if( err ) {
                    console.log( `Error: ${JSON.stringify( err )}` );
                }
            }
        );
}




