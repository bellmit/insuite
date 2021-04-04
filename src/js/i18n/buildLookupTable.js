#!/usr/bin/env node
'use strict';

/**
 * User: do
 * Date: 17/08/17  20:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


const
    DC_ENV = process.env.DC_ENV,
    Path = require( 'path' ),
    FS = require( 'fs' ),
    results = {},
    source = [
        'src/js/i18n/doccirrus_de.json',
        'src/js/i18n/doccirrus_en.json',
        'src/js/i18n/doccirrus_de-ch.json'

    ].map( relativePath => {
        return Path.join( DC_ENV, 'dc-insuite', relativePath );
    } ),
    toJSON = ( data ) => JSON.stringify( data, null, '  ' ),
    itObj = ( obj, path ) => {
        Object.keys( obj ).forEach( ( key ) => {
            const
                val = obj[key],
                curPath = ('' === path ? key : `${path}.${key}`);

            if( 'object' === typeof val && !Array.isArray( val ) ) {
                itObj( val, curPath );
            } else {
                results[curPath] = val;
            }
        } );
    };

source.forEach( path => {
    const
        obj = require( path );
    itObj( obj, '' );

    let lookFileName = Path.basename( path, '.json' ) + '.lookup.json';

    console.log( `build ${Object.keys( results ).length} indexes for file ${path}` ); //eslint-disable-line no-console
    console.log( `writing file ${lookFileName}` ); //eslint-disable-line no-console
    FS.writeFileSync( lookFileName, toJSON( results ) );
    console.log( `done writing file ${lookFileName}` ); //eslint-disable-line no-console
} );

console.log( '\ndone\n' ); //eslint-disable-line no-console



