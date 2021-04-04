/**
 * User: mahmoud
 * Date: 15/06/15  15:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

let
    chai = require( 'chai' ),
    userName = 'admin',
    secret = '3b6c09fc17bb27cae1270824b7a0650ecb15a6dab200514ab3200d1966d6d274094fbfe6c1085fc8a11d1169b3d3ac3da769b2ef453f285004e3c5856c054aa7',
    BASE_URL = 'http://1111111111.dev.dc',
    restify = require( 'restify-clients' ),
    client,
    countryMode;

global.should = chai.should();
global.expect = chai.expect;
global.assert = chai.assert;
let
    i = process.argv.indexOf( '--dcurl' );

if( i > -1 && process.argv[i + 1] ) {
    BASE_URL = process.argv[i + 1];
}

i = process.argv.indexOf( '--dcuser' );
if( i > -1 && process.argv[i + 1] ) {
    userName = process.argv[i + 1];
}

i = process.argv.indexOf( '--dcpassword' );
if( i > -1 && process.argv[i + 1] ) {
    secret = process.argv[i + 1];
}

i = process.argv.indexOf( '--countryMode' );
if( i > -1 && process.argv[i + 1] ) {
    countryMode = process.argv[i + 1];
}

//console.warn( 'testing against: ', BASE_URL );
client = restify.createJsonClient( {
    rejectUnauthorized: false,
    url: BASE_URL,
    headers: {
        "x-dc-friend": true
    }
} );


client.basicAuth( userName, secret );

function toQueryString( obj ) {
    let
        params = [];

    Object.keys( obj ).forEach( function( key ) {
        params.push( key + '=' + obj[key] );
    } );
    return params.join( '&' );
}

function addQuery( path, query ) {
    query = JSON.parse( JSON.stringify( query ) );

    if( query && Object.keys( query ).length ) {
        if( query._id ) {
            path += '/' + query._id;
            query._id = null;
        } else {
            path += '?' + toQueryString( query );
        }
    }
    return path;
}

function _get( model, query, callback ) {
    let
        path = '/2/' + model;

    path = addQuery( path, query );

    client.get( path, function( err, req, res, body ) {
        if( err ) {
            //console.warn( 'Error ' + (res && res.statusCode) + ': ' + JSON.stringify( err ) + ' GET ' + path, ' body:', body );
            callback( err );
        } else {
            callback( null, body );
        }
    } );
}

function _post( model, data, callback ) {
    let
        path = '/2/' + model;

    client.post( path, data, function( err, req, res, body ) {
        if( err ) {
            //console.warn( 'Error ' + (res && res.statusCode) + ': ' + JSON.stringify( err ) + ' POST ' + path, ' body:', body );
            callback( err );
        } else {
            callback( null, body );
        }
    } );
}

/**
 *
 * @param model
 * @param query object or string
 * @param data
 * @param callback
 * @private
 */
function _put( model, query, data, callback ) {
    model.should.be.a( 'string' );
    let
        path = '/2/' + model;

    if( 'string' === typeof query ) {
        path += query; // should start with slash
    } else {
        path = addQuery( path, query );
    }

    client.put( path, data, function( err, req, res, body ) {
        if( err ) {
            //console.warn( 'Error ' + (res && res.statusCode) + ': ' + JSON.stringify( err ) + ' PUT ' + path, ' body:', body );
            callback( err );
        } else {
            callback( null, body );
        }
    } );
}

function _delete( model, query, callback ) {
    let
        path = '/2/' + model;

    path = addQuery( path, query );

    client.del( path, function( err, req, res, body ) {
        if( err ) {
            //console.warn( 'Error ' + (res && res.statusCode) + ': ' + JSON.stringify( err ) + ' DELETE ' + path, ' body:', res.body );
            callback( err );
        } else {
            callback( null, body );
        }
    } );
}

function loadTestModule( apiName ) {
    return getTestData( apiName + '-test-data' );
}

function getTestData( fileName ) {
    if(countryMode){
        if(/de|ch/i.test(countryMode)){
            countryMode = countryMode.toLowerCase();
        } else {
            countryMode = 'de';
        }
    }
    let dataModule;
    try {
        if (fileName.includes('de/')){
            dataModule = require( './samples/' + fileName );
        }
        if (fileName.includes('ch/')){
            dataModule = require( './samples/' + fileName );
        }
        dataModule = require( `./samples/${countryMode || 'de'}/` + fileName );
    } catch( e ) {
        //console.error( 'error requiring data module', e ); // eslint-disable-line no-console
    }
    return dataModule;
}

function clone( obj ) {
    return JSON.parse( JSON.stringify( obj ) );
}

module.exports = {
    getPseudoMongooseId: () => {
        // generate a mongodb id compatible string, without mongoose. this can be done even better
        // by using unix time (seconds since 1970-01-01, instead of milliseconds).
        return (Date.now().toString(16) + (Math.random(16) * 10e16).toString(16).padStart(16, '0')).substr(0, 24);
    },
    formatPromiseResult: function formatPromiseResult( prom ) {
        // copied from dc-core to minimise dependencies in tests.
        return prom
            .then((result) => {
                return [null, result];
            })
            .catch( (err) => {
                return [err];
            } );
    },
    countryMode: countryMode,
    clone: clone,
    get: _get,
    post: _post,
    put: _put,
    delete: _delete,
    loadTestModule: loadTestModule,
    getTestData: getTestData,
    makeAPICall: function( apiCall, query, data, model ) {
        return new Promise( function( resolve, reject ) {
            apiCall( model, query || data, function( err, resp ) {
                if( err ) {
                    return reject( err );
                }
                return resolve( resp );
            } );
        } );
    }
};