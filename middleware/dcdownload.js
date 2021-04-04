'use strict';
var Y;

/**
 * Middleware that allows clients to download files from gridfs by id.
 * URL: /download/<file_id>
 */

function handle( req, res ) {

    function gridfsCb( err, result ) {

        if( err || !result || !result.data ) {
            Y.log( 'Download file not found', 'info', 'dcdownload' );
            return res.send( 404 );
        }

        var filename = result.filename || 'download',
            contentType = result.contentType || 'application/octet-stream',
            charset = result.metadata && result.metadata.charset || 'UTF-8';

        res.setHeader( 'Content-disposition', 'attachment; filename=' + filename );
        res.setHeader( 'Content-type', contentType+'; charset="'+charset+'"' );
        res.write( result.data );
        res.end();
    }

    Y.doccirrus.gridfs.get(req.user, req.params.id, gridfsCb);
}

module.exports = function( _Y ) {
    Y = _Y;
    return handle;
};