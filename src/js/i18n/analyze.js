#!/usr/bin/env node
'use strict';


/**
 * User: do
 * Date: 18/08/17  15:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


const
    DC_ENV = process.env.DC_ENV,
    Path = require( 'path' ),
    usageList = require( Path.join( DC_ENV, 'dc-insuite/src/js/i18n/i18n_usages_distinct.json' ) ).i18nList,
    toJSON = ( data ) => JSON.stringify( data, null, '  ' ),
    lookupTables = ['src/js/i18n/doccirrus_de.lookup.json', 'src/js/i18n/doccirrus_en.lookup.json', 'src/js/i18n/doccirrus_de-ch.lookup.json'].map( path => {
        return require( Path.join( DC_ENV, 'dc-insuite', path ) );
    } ),
    usageNotFound = {
        en: [],
        de: []
    };

usageList.forEach( i18n => {
    lookupTables.forEach( lookupTable => {
        const
            lang = lookupTable['meta.lang'];
        if( !lookupTable[i18n] ) {
            usageNotFound[lang].push( i18n );
        }
    } );
} );

console.log(toJSON(usageNotFound)); //eslint-disable-line no-console