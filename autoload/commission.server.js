/**
 * User: do
 * Date: 07.11.18  17:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* eslint no-console:1 */

const cluster = require( 'cluster' );
const {promisify} = require( 'util' );
const {exec} = require( 'child_process' );
const {access} = require( 'fs' );
const moment = require( 'moment' );
const {formatPromiseResult} = require( 'dc-core' ).utils;
const resolvePath = require( 'path' ).resolve;
const ENTER_COMMISSION_KEY_FILE_PATH = resolvePath( __dirname, '../client/commission/enter_commission_key.html' );
const ENTER_COMMISSION_KEY_ERROR_FILE_PATH = resolvePath( __dirname, '../client/commission/enter_commission_key_error.html' );
const PROCESSING_COMMISSION_KEY_FILE_PATH = resolvePath( __dirname, '../client/commission/processing_commission_key.html' );
let receivedKey = false;

async function getMongoClient() {
    const mongo = require( 'mongodb' );
    const configFile = require( 'dc-core' ).db.loadDbConfig();
    const dbUtils = require( 'dc-core' ).utils;
    const dbConfig = configFile && configFile.mongoDb;
    const dbOptions = Object.assign( {}, dbConfig.server );
    const uri = dbUtils.getDBUri( '0', dbConfig );
    return mongo.MongoClient.connect( uri, dbOptions );
}

async function getCollections() {
    let collections;
    let [err, mongoClient] = await formatPromiseResult( getMongoClient() );
    if( err ) {
        console.log( `could not connect to database ${err.stack || err}` );
        throw err;
    }
    [err, collections] = await formatPromiseResult( mongoClient.db( '0' ).listCollections().toArray() );
    if( err ) {
        console.log( `could not get collections of database ${err.stack || err}` );
        throw err;
    }

    [err] = await formatPromiseResult( mongoClient.close() );
    if( err ) {
        console.error( `error occurred while closing mongo client ${err.stack || err}` );
    }

    return collections;
}

async function getSystemId() {
    // no dc-cli on dev so uncomment to test:
    // return 'TEST-SN';

    const cmds = ['/usr/bin/sudo', '/usr/bin/dc-cli'];
    const cmd = `${cmds[0]} ${cmds[1]} --status`;
    const cmdsLength = cmds.length;
    for( let i = 0; i < cmdsLength; i++ ) {
        let [err] = await formatPromiseResult( promisify( access )( cmds[i] ) );
        if( err ) {
            throw err;
        }
    }

    let [err, result] = await formatPromiseResult( promisify( exec )( cmd ) );
    if( err ) {
        throw err;
    }
    if( result && result.stdout ) {
        result = JSON.parse( result.stdout );
    } else {
        throw Error( `no data passed by dc-cli to stdout. stderrs="${result.stderr}"` );
    }
    if( result && result.error !== 0 ) {
        throw Error( 'dc-cli returned with error' );
    }

    const systemId = result && result.data && result.data[0] && result.data[0].prcs &&
                     result.data[0].prcs.certificate && result.data[0].prcs.certificate.CN;
    return systemId;
}

async function encryptData( args ) {
    const {commissionKey, data} = args;
    const crypto = require( 'crypto' );
    const dataStr = (typeof data !== 'string') ? JSON.stringify( data ) : data;

    const cipher = crypto.createCipher( 'aes192', commissionKey );
    let encryptedData = cipher.update( dataStr, 'utf-8', 'base64' );
    encryptedData += cipher.final( 'base64' );
    return encryptedData;
}

function getCommissionKeyUrl() {
    const dcauth = require( 'dc-core' ).auth;
    return dcauth.getDCPRCUrl( '/3/commission/:getCommission' );
}

async function sendSystemId( args ) {
    const {systemId, commissionKey} = args;
    const rp = require( 'request-promise' );
    const url = getCommissionKeyUrl();
    console.log( `send commission key to`, url );

    let [err, encryptedData] = await formatPromiseResult( encryptData( {
        commissionKey,
        data: systemId
    } ) );

    if( err ) {
        console.log( `could encrypt system id`, err );
        throw err;
    }

    return rp( {
        method: 'POST',
        rejectUnauthorized: false,
        uri: url,
        body: {data: encryptedData},
        json: true
    } );

}

function decryptInitialData( commissionKey, encryptedInitialData ) {
    console.log( `Decrypt initial data` );
    const crypto = require( 'crypto' );
    const decipher = crypto.createDecipher( 'aes192', commissionKey );
    let json = decipher.update( encryptedInitialData, 'base64', 'utf8' );
    json += decipher.final( 'utf8' );
    return json;
}

function isDate( value ) {
    return moment( value, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true ).isValid();
}

async function createDatabase( initialDataJson ) {
    console.log( `Create database from initial data` );
    const {ObjectId} = require( 'mongodb' );
    const collections = ['practices', 'employees', 'identities', 'locations', 'admins'];
    const checkInitialData = ( data ) => {
        collections.forEach( collection => {
            if( !data[collection] || !data[collection][0] ) {
                throw Error( `initial data of ${collection} is missing` );
            }
        } );
    };

    const data = JSON.parse( initialDataJson, ( key, value ) => {
        switch( key ) {
            case '_id':
                break;
        }
        if( key === '_id' ) {
            value = ObjectId( value );
        }
        else if( typeof value === 'string' && isDate( value ) ) {
            value = new Date( value );
        }
        return value;
    } );

    const initialData = data.initialData;

    checkInitialData( initialData );

    let [err, mongoClient] = await formatPromiseResult( getMongoClient() );
    if( err ) {
        console.log( `could not get mongoClient to create database:  ${err.stack || err}` );
        throw err;
    }

    // set employee id before insertion and link with its identity
    const employeeObjectId = ObjectId();
    initialData.employees[0]._id = employeeObjectId;
    initialData.identities[0].specifiedBy = employeeObjectId.toString();

    const db = mongoClient.db( '0' );
    for( let collectionName of collections ) {
        let results;
        [err, results] = await formatPromiseResult( db.collection( collectionName ).insertOne( initialData[collectionName][0] ) );
        if( err ) {
            console.log( `could not get collections of database ${err.stack || err}` );
            throw err;
        }
        console.log( `Inserted initial data of ${collectionName}`, results && results.result );
    }

    [err] = await formatPromiseResult( mongoClient.close() );
    if( err ) {
        console.error( `error occurred while closing mongo client ${err.stack || err}` );
    }

}

async function processCommission( args ) {
    console.log( `Process commission response`, );
    const {commissionKey, response} = args;
    const encryptedData = response && response.data && response.data[0] && response.data[0].encryptedData;
    if( !encryptedData ) {
        throw Error( 'no encrypted data received' );
    }
    let decryptedData;
    try {
        decryptedData = decryptInitialData( commissionKey, encryptedData );
    } catch( err ) {
        console.log( `could not decrypt initial data ${err.stack || err}` );
        throw err;
    }

    // TODO: EXTMOJ-1710 check timestamp if stale like written in ticket?

    let [err] = await(formatPromiseResult( createDatabase( decryptedData ) ));
    if( err ) {
        console.log( `could not create initial database ${err.stack || err}` );
    }
}

function validateCommissionKey( commissionKey ) {
    const regex = /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/;
    if( typeof commissionKey !== 'string' ) {
        return false;
    }
    return commissionKey.match( regex ) !== null;
}

async function requestCommissionKey( options ) {
    return new Promise( ( resolve/*, reject*/ ) => {
        console.log( 'Request commission key' );
        if( receivedKey ) {
            throw Error( 'already received commission key' );
        }
        let server;
        const express = require( 'express' );
        const app = express();
        const bodyParser = require( 'body-parser' );

        app.use( bodyParser.urlencoded( {extended: true} ) );
        app.set( 'port', options.port );
        app.disable( 'x-powered-by' );
        app.get( '*', ( req, res ) => {
            if( receivedKey ) {
                res.sendFile( PROCESSING_COMMISSION_KEY_FILE_PATH );
                return;
            }
            res.sendFile( ENTER_COMMISSION_KEY_FILE_PATH );
        } );
        app.post( '*', async function( req, res ) {
            // do not send key twice
            if( receivedKey ) {
                res.sendFile( PROCESSING_COMMISSION_KEY_FILE_PATH );
                return;
            }
            const commissionKey = req.body.commissionKey;

            if( !validateCommissionKey( commissionKey ) ) {
                console.log( `Commission key validation failed. Testet value was "${commissionKey}".` );
                res.sendFile( ENTER_COMMISSION_KEY_ERROR_FILE_PATH );
                return;
            }

            receivedKey = true;

            let [err, result] = await formatPromiseResult( sendSystemId( {
                systemId: options.systemId,
                commissionKey
            } ) );

            err = err || result && result.meta && result.meta.errors && result.meta.errors.length && result.meta.errors;

            if( err ) {
                console.log( 'Could send commission key to dcprc', err );
                res.sendFile( ENTER_COMMISSION_KEY_ERROR_FILE_PATH );
                receivedKey = false;
                return;
            }

            [err, result] = await formatPromiseResult( processCommission( {commissionKey, response: result} ) );
            if( err ) {
                console.log( 'Could process commission from dcprc', err );
                res.sendFile( ENTER_COMMISSION_KEY_ERROR_FILE_PATH );
                receivedKey = false;
                return;
            }

            res.sendFile( PROCESSING_COMMISSION_KEY_FILE_PATH );

            console.log( `Attempting to close commission key server` );
            server.close( () => {
                console.log( 'Closed request commission key server' );
                resolve();
            } );
        } );

        server = require( 'http' ).Server( app ); // eslint-disable-line new-cap

        server.listen( app.get( 'port' ), '127.0.0.1', function() {
            console.log( `Commission Key Request Server listening on port ${app.get( 'port' )}` );
        } );
    } );
}

async function checkIfCommissionIsNeeded( options ) {
    if( !cluster.isMaster ) {
        console.log( 'Skip check if system is already commissioned on non prc systems' );
        return;
    }

    console.log( 'Check if system is already commissioned', options );
    let err, result;
    [err, result] = await formatPromiseResult( getCollections() );
    if( err ) {
        console.log( `could not get collection names: ${err.stack || err}` );
        throw err;
    }
    const nColls = result.length;
    console.log( `Database contains ${nColls} collections` );

    if( nColls ) {
        console.log( 'Database is not empty no need to request commission key' );
        return;
    }

    [err, result] = await formatPromiseResult( getSystemId() );
    if( err ) {
        console.log( 'Could not get system id of datasafe', err );
        throw err;
    }

    options.systemId = result;

    [err, result] = await formatPromiseResult( requestCommissionKey( options ) );
    if( err ) {
        console.log( 'Could not request commission key' );
        throw err;
    }
    console.log( `Finished commission of the system. Starting...` );
}

module.exports = {
    checkIfCommissionIsNeeded,
    encryptData
};