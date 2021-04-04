/**
 *  Node script to process redis slow logs into a more readable format
 *
 *  To get the slow log from redis: 
 *
 *      $   redis-cli -s /var/run/redis/redis.sock
 *      >   slowlog get 1024
 *  
 *  Then run this script
 *
 *      $   /var/lib/prc/runtime/bin/node redis-slow-log.js yourlogfile.txt
 */
 
 /* eslint no-console: 0 */

"use strict";

let fileName = process.argv[2];

const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream( fileName );

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
  
    let ts, elapsed, query, date;

    for await (const line of rl) {
        // Each line in input.txt will be successively available here as `line`.
        //console.log(`Line from file: ${line}`);

        if ( -1 !== line.indexOf( '2) (integer) ' ) ) {
            ts = parseInt( line.substr( 19 ), 10 );
            date = new Date( ts * 1000 );            
        }  

        if ( -1 !== line.indexOf( '2) "' ) ) {
            query = line.substr( 12 );
        }
    
        if ( -1 !== line.indexOf( '3) (integer)' ) ) {
            elapsed = line.substr( 19 );
            console.log( `${date} ${Math.floor(elapsed/1000)} ms ${query}` );
        }
    
    }
  

  
    console.log( fileName );
}

processLineByLine();
