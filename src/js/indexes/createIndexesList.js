#!/usr/bin/env node

/* eslint-disable */

/**
 * User: do
 * Date: 08.10.18  17:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

const strip = require( 'strip-comments' );
const {readFileSync, writeFileSync, unlinkSync} = require( 'fs' );
const {join} = require( 'path' );
const escodegen = require( 'escodegen' );
const utils = require( 'esprima-ast-utils' );

const getIndexesOfFile = filePath => {
    const st = utils.parse( strip( readFileSync( filePath ).toString() ), false );

    const result = utils.filter( st, node => {
        if( node.type === 'Property' && node.key && node.key.name === 'indexes' ) {
            return true;
        } else if( node.type === 'AssignmentExpression' && node.left.type === 'Identifier' && node.left.name === 'indexes' ) {
            return true;
        }
        return false;
    } );

    const indexesProp = result && result[0];
    let code;
    if( indexesProp && indexesProp.value && Array.isArray( indexesProp.value.elements ) ) {
        code = escodegen.generate( indexesProp );
        code = `/*${filePath}*/ module.exports = {${code}};`;
        console.log( `debug code 1`, code );
    } else if( indexesProp && indexesProp.right ) {

        code = escodegen.generate( indexesProp.right );

        code = `/*${filePath}*/ module.exports = {indexes: ${code}};`;
    } else {
        return;
    }

    const tmpFileName = `tmp.${Date.now()}.js`;
    const cwd = process.cwd();

    writeFileSync( tmpFileName, code );

    const _module = require( join( cwd, tmpFileName ) );
    if( !_module.indexes ) {
        console.log( `indexes not found in generated code ${JSON.stringify( _module )}` );
        return;
    }
    const indexes = _module.indexes;
    unlinkSync( tmpFileName );

    if( !indexes ) {
        console.log( `no indexes property in tmp module ${code}\n` );
        return;
    }
    console.log( `do debug found ${indexes.length} indexes\n` );
    return indexes;

};

const stdin = process.openStdin();

let data = '';

stdin.on( 'data', function( chunk ) {
    data += chunk;
} );

stdin.on( 'end', function() {
    const filePaths = data.split( '\n' );
    const files = filePaths.filter( Boolean ).map( filePath => ({
        filePath,
        indexes: getIndexesOfFile( filePath )
    }) ).filter( result => Array.isArray( result.indexes ) );
    console.log( `found ${files.length}
    ` );
    const json = JSON.stringify( files, null, '  ' );
    console.log( json );
    // writeFileSync( `indexes.${Date.now()}.json`, json );
} );

