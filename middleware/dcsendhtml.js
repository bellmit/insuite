/**
 * User: pi
 * Date: 20/09/16  09:05
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/**
 *  Middleware to manage html
 */

"use strict";
var
    Y,
    type;

function handle( req, res, next ) {
    let
        path = require( 'path' );
    switch( type ) {
        case 'asv':
            res.sendFile( 'asv-splitter.html', { root: path.join( process.cwd(), 'mojits/PfITASVSplitterMojit/assets' ) } );
            break;
        default:
            next();
    }
}

module.exports = function( _Y, _type ) {
    Y = _Y;
    type = _type;
    return handle;
};