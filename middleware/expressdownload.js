'use strict';
var Y;

/**
 *
 * Route that retrieves a document from the download directory using
 * express download() function.
 *
 */

var
    config = require( 'dc-core' ).config.load( process.cwd() + '/env.json' );

function getHandler( _route ) {
    var myRoute = _route;

    function handle( req, res ) {
        //checking file path for ".." and any control characters  in the range x00-x1f and x80-x9f (source: https://github.com/parshap/node-sanitize-filename)
        // eslint-disable-next-line no-control-regex
        if( -1 < req.params.filename.indexOf( ".." ) || -1 < req.params.filename.search( /([\x00-\x1f\x80-\x9f])/ ) ) {
            Y.log( "forbidden file request string: " + req.params.filename );
        } else {
            //path OK, proceeding...
            let file;
            switch( myRoute ) {
                case '/download-file':
                    file = config.directories.download ? config.directories.download : __dirname + '/assets/downloadable/';
                    if( '/' !== file.slice( -1 ) ) {
                        file += '/';
                    }
                    file += req.params.filename;
                    break;
                case '/imported-file':
                    let importDir = Y.doccirrus.auth.getImportDir();
                    file = importDir + '/' + req.params.filename;
                    break;
            }

            Y.log( 'DOWNLOADING file ' + file, 'info', 'dcmiddleware' );
            res.download( file, req.params.filename, function( err ) {
                if( err ) {
                    Y.log( 'ERROR while downloading: ' + err, 'warning', 'dcmiddleware' );
                }
            } ); // Set disposition and send it.
        }
    }
    return handle;
}

module.exports = function( _Y, _route ) {
    Y = _Y;
    return getHandler( _route );
};