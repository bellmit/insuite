/**
 * User: dcdev
 * Date: 5/17/17  9:17 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * This script:
 * 1. gets all .js files in project
 * 2. finds all Y.log( and it's variations: e.g. logger, globalY, YY
 * 3. removes all Y.log statements except "error" level
 * 5. regenerate files without Y.log
 */

'use strict';

var esprima = require( 'esprima' ),
    estraverse = require( 'estraverse' ),
    escodegen = require( 'escodegen' ),
    path = require( 'path' ),
    async = require( 'async' ),
    fs = require( 'fs' );

function readDirRecursive( dir, done ) {
    var results = [];
    fs.readdir( dir, function( err, list ) {
        if( err ) {
            return done( err );
        }

        var pending = list.length;
        if( !pending ) {
            return done( null, results );
        }
        list.forEach( function( file ) {
            file = path.resolve( dir, file );
            fs.stat( file, function( err, stat ) {
                if( err ) {
                    return done( err );
                }
                if( stat && stat.isDirectory() ) {
                    readDirRecursive( file, function( err, res ) {
                        results = results.concat( res );
                        if( !--pending ) {
                            return done( null, results );
                        }
                    } );
                } else {
                    if( file.endsWith( '.js' ) ) {
                        results.push( file );
                    }
                    if( !--pending ) {
                        return done( null, results );
                    }
                }
            } );
        } );
    } );
}

function work( files ) {
    //let testFile = ['/home/dcdev/doccirrus/dc-insuite/middleware/dcmedia.js'];
    async.eachSeries( files, function( file, done ) {

        if( !file ) {
            return done();
        }
        if( 'hpdf.js' === path.basename( file ) ) {
            return done();
        }
        if( 'transport.js' === path.basename( file ) ) {
            return done();
        }

        console.log( "File:", file );
        try {
            fs.readFile( file, 'utf8', function( err, data ) {
                let
                    AST,
                    isChanged = false;
                try {
                    AST = esprima.parse( data, {attachComment: false, comment: true, tokens: true, range: true} );
                    escodegen.attachComments( AST, AST.comments, AST.tokens );
                } catch( e ) {
                    console.warn( "Error while parsing", e );
                    return done();
                }
                estraverse.replace( AST, {
                    enter: function( node ) {

                        if( node.expression && node.expression.callee &&
                            'MemberExpression' === node.expression.callee.type &&
                            ('Y' === node.expression.callee.object.name ||
                             'YY' === node.expression.callee.object.name || 'globalY' === node.expression.callee.object.name ||
                             'logger' === node.expression.callee.object.name || 'myY' === node.expression.callee.object.name /*||
                             'modelLogger' === node.expression.callee.object.name*/ ) &&
                            'log' === node.expression.callee.property.name &&
                            ( node.expression.arguments && node.expression.arguments.some( arg => 'Literal' === arg.type &&
                            'error' === arg.value
                            ) ) ) {
                            return node;
                        } else if( node.expression && node.expression.callee &&
                                   'MemberExpression' === node.expression.callee.type &&
                                   ('Y' === node.expression.callee.object.name ||
                                    'YY' === node.expression.callee.object.name || 'globalY' === node.expression.callee.object.name ||
                                    'logger' === node.expression.callee.object.name || 'myY' === node.expression.callee.object.name /*||
                                    'modelLogger' === node.expression.callee.object.name*/ ) &&
                                   'log' === node.expression.callee.property.name ) {
                            isChanged = true;
                            return this.remove();
                        } else {
                            return node;
                        }
                    }
                } );
                if( isChanged ) {
                    fs.writeFileSync( file, escodegen.generate( AST, {
                        comment: true
                    } ) );
                }
                done();

            } );
        } catch( e ) {
            console.warn( "Error while reading file:", e );
            return done();
        }

    }, function( err ) {
        if( err ) {
            throw err;
        }
        console.log( "DONE" );
    } );
}

readDirRecursive( process.cwd(), function( err, results ) {
    if( err ) {
        throw err;
    }
    work( results );
} );


