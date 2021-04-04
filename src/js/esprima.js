/**
 * User: pi
 * Date: 02/08/16  17:18
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * This script:
 * 1. reads file
 * 2. finds YUI.add( 'dccommunication-client', function( Y, NAME ) {..
 * 3. extract function content
 * 4. removes expression YUI.add
 * 5. finds Y.namespace( 'doccirrus' ).x = y and replaces it with module.export = y
 * In the end we have file which does not use Y.add, and exports code.
 *
 * Optimized for autoload/communications/communication.client.js
 */

'use strict';

var esprima = require( 'esprima' ),
    estraverse = require( 'estraverse' ),
    escodegen = require( 'escodegen' ),
    fs = require( 'fs' ),
    fakeY = {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "NAME"
                },
                "init": {
                    "type": "Literal",
                    "value": "communication.client.js",
                    "raw": "'communication.client.js'"
                }
            },
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "Y"
                },
                "init": {
                    "type": "ObjectExpression",
                    "properties": [
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "log"
                            },
                            "computed": false,
                            "value": {
                                "type": "FunctionExpression",
                                "id": null,
                                "params": [],
                                "defaults": [],
                                "body": {
                                    "type": "BlockStatement",
                                    "body": []
                                },
                                "generator": false,
                                "expression": false
                            },
                            "kind": "init",
                            "method": true,
                            "shorthand": false
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "doccirrus"
                            },
                            "computed": false,
                            "value": {
                                "type": "ObjectExpression",
                                "properties": [
                                    {
                                        "type": "Property",
                                        "key": {
                                            "type": "Identifier",
                                            "name": "i18n"
                                        },
                                        "computed": false,
                                        "value": {
                                            "type": "FunctionExpression",
                                            "id": null,
                                            "params": [],
                                            "defaults": [],
                                            "body": {
                                                "type": "BlockStatement",
                                                "body": [
                                                    {
                                                        "type": "ReturnStatement",
                                                        "argument": {
                                                            "type": "Literal",
                                                            "value": "",
                                                            "raw": "''"
                                                        }
                                                    }
                                                ]
                                            },
                                            "generator": false,
                                            "expression": false
                                        },
                                        "kind": "init",
                                        "method": true,
                                        "shorthand": false
                                    },
                                    {
                                        "type": "Property",
                                        "key": {
                                            "type": "Identifier",
                                            "name": "comctl"
                                        },
                                        "computed": false,
                                        "value": {
                                            "type": "ObjectExpression",
                                            "properties": [
                                                {
                                                    "type": "Property",
                                                    "key": {
                                                        "type": "Identifier",
                                                        "name": "getRandomString"
                                                    },
                                                    "computed": false,
                                                    "value": {
                                                        "type": "FunctionExpression",
                                                        "id": null,
                                                        "params": [],
                                                        "defaults": [],
                                                        "body": {
                                                            "type": "BlockStatement",
                                                            "body": [
                                                                {
                                                                    "type": "ReturnStatement",
                                                                    "argument": {
                                                                        "type": "Literal",
                                                                        "value": "",
                                                                        "raw": "''"
                                                                    }
                                                                }
                                                            ]
                                                        },
                                                        "generator": false,
                                                        "expression": false
                                                    },
                                                    "kind": "init",
                                                    "method": true,
                                                    "shorthand": false
                                                }
                                            ]
                                        },
                                        "kind": "init",
                                        "method": false,
                                        "shorthand": false
                                    }
                                ]
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": false
                        }
                    ]
                }
            }
        ],
        "kind": "var"
    };

fs.readFile( process.cwd() + '/autoload/communications/communication.client.js', 'utf8', function( err, data ) {
    let
        AST,
        addExpression;

    //special case
    data = data.replace( /Y\.doccirrus\.communication/gi, 'self' );

    AST = esprima.parse( data, { attachComment: false, comment: true, tokens: true, range: true } );
    escodegen.attachComments( AST, AST.comments, AST.tokens );

    addExpression = AST.body.find( function( node ) {
        return 'ExpressionStatement' === node.type && 'CallExpression' === node.expression.type && node.expression.callee &&
               'MemberExpression' === node.expression.callee.type && 'YUI' === node.expression.callee.object.name &&
               'add' === node.expression.callee.property.name;
    } );

    if( addExpression ) {
        let
            addExpressionIndex = AST.body.indexOf( addExpression );
        AST.body.splice( addExpressionIndex, 1, ...addExpression.expression[ 'arguments' ][ 1 ].body.body );
        AST.body.splice( addExpressionIndex, 0, fakeY );
    }

    estraverse.replace( AST, {
        enter: function( node ) {
            if( 'AssignmentExpression' === node.type && 'MemberExpression' === node.left.type && 'CallExpression' === node.left.object.type &&
                'doccirrus' === node.left.object.arguments[ 0 ].value ) {
                node.left.object = {
                    type: "Identifier",
                    name: "module"
                };
                node.left.property = {
                    type: "Identifier",
                    name: "exports"
                };
                return node;
            }

        }
    } );

    fs.writeFileSync( process.cwd() + '/test1.js', JSON.stringify( AST, null, 4 ) );

    fs.writeFileSync( process.cwd() + '/test1.1.js', escodegen.generate( AST, {
        comment: true
    } ) );

} );

