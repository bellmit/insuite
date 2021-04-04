/**
 * User: do
 * Date: 21/06/16  11:02
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Date: 31/03/14  17:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global fun:true */

fun = function _fn( Y, NAME ) {
    'use strict';

    var Actor = Y.doccirrus.actors.Actor;

    return {
        registerNode: function( node ) {
            var rootNode = node.getDOMNode();
            Actor.create( null, 'edmp', {node: rootNode} ).then( function( address ) {
                Y.log( 'init finished edmp: address:', address );
            } ).catch( function( err ) {
                Y.log( 'could not create edmp browser actors: ' + (err && err.stack || err), 'error', NAME );
            } );
        }
    };
};