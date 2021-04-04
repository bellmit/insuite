#!/usr/bin/env node
'use strict';

/**
 * User: do
 * Date: 17/08/17  19:11
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


    // Problems with regex:
    // - self.shortDescription = i18n( "InSuiteAdminMojit.insuiteadmin.basesystemdesc." + licenseType ); will be matched as "InSuiteAdminMojit.insuiteadmin.basesystemdesc."
    // - refine regex to work with ' and "

let nGlobalFound = 0;
const
    Moment = require( 'moment' ),
    startDate = new Date(),
    DC_ENV = process.env.DC_ENV,
    Path = require( 'path' ),
    FS = require( 'fs' ),
    results = [],
    distinctResults = [],
    source = [
        'autoload',
        'models',
        'mojits'

    ].map( relativePath => {
        return Path.join( DC_ENV, 'dc-insuite', relativePath );
    } ),
    target = 'i18n_usages.json',
    distinctListTarget = 'i18n_usages_distinct.json',
    quit = ( msg, code = 1 ) => {
        console.log( msg );
        process.exit( code );
    },
    toJSON = ( data ) => JSON.stringify( data, null, '  ' ),
    regexSingleQutoes = /i18n\(\s*'\s*(\S*)\s*'\s*/mg,
    regexDopubleQuotes = /i18n\(\s*"\s*(\S*)\s*"\s*/mg,
    regexList = [regexSingleQutoes, regexDopubleQuotes],
    scanFile = ( filePath ) => {

        console.log( `Scanning file ${filePath}:` );

        const
            data = FS.readFileSync( filePath ).toString(),
            result = {
                nUsagesFound: 0,
                absolutePath: filePath,
                path: Path.relative( DC_ENV, filePath ),
                usages: []
            };

        regexList.forEach( regex => {
            let m;

            while( (m = regex.exec( data )) !== null ) {
                // This is necessary to avoid infinite loops with zero-width matches
                if( m.index === regex.lastIndex ) {
                    regex.lastIndex++;
                }
                let i18n = m[1];
                if( !distinctResults.includes( i18n ) ) {
                    distinctResults.push( i18n );
                }
                result.usages.push( {match: m[0], i18n: i18n} );
            }
        } );

        result.nUsagesFound = result.usages.length;
        nGlobalFound += result.nUsagesFound;

        console.log( `\tFound: ${result.nUsagesFound} usages` );

        results.push( result );
    },
    scanDir = ( path ) => {
        const files = FS.readdirSync( path );
        files.forEach( filename => {
            const
                filePath = Path.join( path, filename ),
                stats = FS.statSync( filePath );
            if( stats.isFile() ) {
                scanFile( filePath );
            } else if( stats.isDirectory() ) {
                scanDir( filePath );
            }
        } );
    };

if( !DC_ENV ) {
    quit( '$DC_ENV not set' );
}

source.forEach( scanDir );
const
    nFilesScanned = results.length,
    endDate = new Date(),
    duration = Moment( endDate ).diff( startDate, 'milliseconds', true ),
    durationInSeconds = Moment( endDate ).diff( startDate, 'seconds', true );
console.log( `\nScanned ${nFilesScanned} files in ${durationInSeconds}s` );
console.log( `Found ${nGlobalFound} usages of i18n function\n` );

console.log( `Writing file ${target}...` );
FS.writeFileSync( target, toJSON( {
    startDate,
    endDate,
    duration,
    nUsagesFound: nGlobalFound,
    nFilesScanned,
    results
} ) );

console.log( '\ndone writing file\n' );


console.log( `Found ${distinctResults.length} distinct i18n keys\n` );
console.log( `Writing file ${distinctListTarget}...` );

FS.writeFileSync( distinctListTarget, toJSON( {i18nList: distinctResults} ) );


console.log( '\ndone\n' );


