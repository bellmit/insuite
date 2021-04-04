'use strict';
var Y;

/**
 * Route that retrieves an mmi binary data by code of biunary data type and code. Starts download of the attribute specified by path parameter.
 */


function handle( req, res ) {
    var mmiConnect = require( require( 'path' ).join( __dirname, '../', '/mmiconnect.json' ) ),
        credential = mmiConnect && mmiConnect.credential,
        needle = require( 'needle' ),
        params = req.params || {},
        SAMPLEUSERNAME = credential && credential.username,
        SAMPLEKEY = credential && credential.key,
        url = 'http://localhost:7777/GetBinary?binarytypecode=' +
              encodeURIComponent( params.typecode ) + '&binarycode=' +
              encodeURIComponent( params.code ) + '&username=' +
              SAMPLEUSERNAME + '&licensekey=' +
              SAMPLEKEY;
    Y.log( 'send getBinary request to mmi API, url: ' + url, 'debug', 'mmi-download' );
    needle.get( url, {timeout: 20000}, function( err, response ) {
        if( err || !response.body || !response.body.length ) {
            Y.log( 'Download file not found', 'info', 'mmi-download' );
            res.send( 404 );
        } else {
            switch (params.typecode){
                case 'TH':
                    res.type( 'application/pdf' );
                    break;
                case 'IDENTA':
                    res.type( 'image/bmp' );
                    break;
                case 'ICON':
                    res.type( 'image/png' );
                    break;
            }
            res.write( response.body, 'binary' );
            res.end();
        }
    } );
}

module.exports = function( _Y ) {
    Y = _Y;
    return handle;
};