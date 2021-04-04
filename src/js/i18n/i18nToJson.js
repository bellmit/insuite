#!/usr/bin/env node
'use strict';
/**
 * User: do
 * Date: 17/08/17  17:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Converts doc cirrus i18n modules to plain json data.
 * Overrides already existing json files!
 */


const
    DC_ENV = process.env.DC_ENV,
    Path = require( 'path' ),
    FS = require( 'fs' ),
    results = [],
    Y = {
        Intl: {
            add: function( name, lang, data ) {
                results.push( {name, lang, data} );
            }
        }
    },
    i18nPaths = [
        'lang/doccirrus_de.common.js',
        'lang/doccirrus_en.common.js',
        'lang/doccirrus_de-ch.common.js'
    ].map( relativePath => {
        return Path.join( DC_ENV, 'dc-insuite', relativePath );
    } ),
    quit = ( msg, code = 1 ) => {
        console.log( msg ); //eslint-disable-line no-console
        process.exit( code );
    },
    makeFileName = ( name, lang ) => `${name}_${lang}.json`,
    toJSON = ( data ) => JSON.stringify( data, null, '  ' );

if( !DC_ENV ) {
    quit( '$DC_ENV not set' );
}

global.YUI = {
    add: ( moduleName, fn ) => {
        fn( Y );
    }
};

console.log( `\nconverting files to json: \n${i18nPaths.join( '\n' )}\n\n` ); //eslint-disable-line no-console

i18nPaths.forEach( path => {
    require( path );
} );

results.forEach( result => {
    const
        jsonFileName = makeFileName( result.name, result.lang );
    console.log( `writing file ${jsonFileName}` ); //eslint-disable-line no-console
    FS.writeFileSync( jsonFileName, toJSON( result.data ) );
} );

console.log( '\n\ndone\n' ); //eslint-disable-line no-console