/**
 * User: do
 * Date: 09.07.20  08:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

const START_CON0 = 'con0';
const START_BESA = 'besa';
const START_RVSA = 'rvsa';
const START_ADT0 = 'adt0';
const START_ADT9 = 'adt9';
const START_CON9 = 'con9';
const blockNameRegex = /^\d\d\d8000([a-z0-9]+)/gm;
const getBlockName = ( line ) => {
    const match = blockNameRegex.exec( line.toString() );
    const blockName = match && match[1];
    return blockName;
};

// full paths to con files
const files = [];

const util = require( 'util' );
const fs = require( 'fs' );
const appendFile = util.promisify( fs.appendFile );

const eachLine = function( path, iterator ) {
    let pending = false;
    return new Promise( ( resolve, reject ) => {
        let buff = Buffer.concat( [] );
        const readStream = fs.createReadStream( path );

        async function getLines() {
            let indexLineSeparator = buff.indexOf( Buffer.from( '\r\n' ) );
            if( indexLineSeparator >= 0 ) {
                indexLineSeparator += 2;
                const lineBuffer = Buffer.allocUnsafe( indexLineSeparator );
                const tmp = Buffer.allocUnsafe( buff.length - indexLineSeparator );
                buff.copy( lineBuffer, 0, 0, indexLineSeparator );
                buff.copy( tmp, 0, indexLineSeparator );
                buff = tmp;
                await iterator( lineBuffer );
                return getLines();
            }
        }

        function endStream() {
            if( pending ) {
                setTimeout( endStream, 1000 );
            } else {
                resolve();
            }
        }

        readStream.on( 'data', async function( data ) {
            pending = true;
            this.pause();
            buff = Buffer.concat( [buff, data] );
            await getLines();
            this.resume();
            pending = false;
        } );

        readStream.on( 'end', endStream );
        readStream.on( 'error', function( err ) {
            reject( err );
        } );
    } );
};

async function writeLine( originalFilePath, mode, line ) {
    const targetFilePath = `${originalFilePath}.${mode}`;
    return appendFile( targetFilePath, line );
}

async function splitFile( filePath ) {
    let MODE = null;
    return eachLine( filePath, async function( line ) {
        const blockName = getBlockName( line );

        if( ['0101', '0102', '0103', '0104'].includes( blockName ) && MODE === START_ADT0 ) {
            MODE = 'schein';
        }

        switch( blockName ) {
            case START_CON0:
            case START_BESA:
            case START_RVSA:
            case START_ADT0:
            case START_ADT9:
            case START_CON9:
                MODE = blockName;
                break;
            default:
                return writeLine( filePath, MODE, line );
        }
    } );
}

async function main() {
    for( let file of files ) {
        await splitFile( file );
    }
    await appendFile( 'new.con', '0138000con0\r\n' );
    await eachLine( `${files[0]}.${START_CON0}`, async function( line ) {
        await appendFile( 'new.con', line );
    } );
    await appendFile( 'new.con', '0138000besa\r\n' );
    for( let file of files ) {
        await eachLine( `${file}.${START_BESA}`, async function( line ) {
            await appendFile( 'new.con', line );
        } );
    }
    await appendFile( 'new.con', '0138000rvsa\r\n' );
    for( let file of files ) {
        await eachLine( `${file}.${START_RVSA}`, async function( line ) {
            await appendFile( 'new.con', line );
        } );
    }
    await appendFile( 'new.con', '0138000adt0\r\n' );
    await eachLine( `${files[0]}.${START_ADT0}`, async function( line ) {
        await appendFile( 'new.con', line );
    } );
    for( let file of files ) {
        await eachLine( `${file}.schein`, async function( line ) {
            await appendFile( 'new.con', line );
        } );
    }
    await appendFile( 'new.con', '0138000adt9\r\n0138000con9\r\n' );
}

main();
