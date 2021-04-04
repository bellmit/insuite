/**
 * User: as
 * Date: 30.05.18  10:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

module.exports = function() {
    const
        proxy = require( 'http-proxy-middleware' ),
        pathRewriteRegExp = new RegExp( 'shop' ),
        zlib = require( 'zlib' );

    function isResGzipped( res ) {
        return res.headers['content-encoding'] === 'gzip';
    }

    function isCss( res ){

        return res.headers['content-type'] === 'text/css';
    }

    function chunkLength( chunks ) {
        return chunks.reduce( function( len, buf ) {
            return len + buf.length;
        }, 0 );
    }

    function zipOrUnzip( method ) {
        return function( rspData, res ) {
            return (isResGzipped( res )) ? zlib[method]( rspData ) : rspData;
        };
    }

    var maybeUnzipResponse = zipOrUnzip( 'gunzipSync' );
    var maybeZipResponse = zipOrUnzip( 'gzipSync' );
    
    const middlewareProxy = proxy( {
        target: `https://shop.doc-cirrus.com/`,
        changeOrigin: true,
        pathRewrite: ( path ) => {
            return path.replace( pathRewriteRegExp, '' );
        },
        onProxyRes( proxyRes, req, res ) {
            var _write = res.write.bind( res );
            var body = "";
            var chunks = [];

            proxyRes.on( 'data', function( data ) {
                chunks.push( data );
            } );
            proxyRes.on( 'end', function() {
                const finalBuffer = Buffer.concat( chunks, chunkLength( chunks ) );
                // if( !isCss( proxyRes ) ) {
                body = maybeUnzipResponse( finalBuffer, proxyRes ).toString();
                if( !isCss( proxyRes ) ) {
                body = body.replace( new RegExp( 'href="/themes', 'gi' ), 'href="/shop/themes' );
                body = body.replace( new RegExp( 'href="/web', 'gi' ), 'href="/shop/web' );
                body = body.replace( new RegExp( 'src="/web', 'gi' ), 'src="/shop/web' );
                body = body.replace( new RegExp( '/widgets', 'gi' ), '/shop/widgets' );
                body = body.replace( new RegExp( '/csrftoken', 'gi' ), '/shop/csrftoken' );
            } else {
                    body = body.replace( 'address', 'assredd' );
                }
                    return _write( maybeZipResponse( body, proxyRes ) );
                // }

                //_write( finalBuffer );

            } );
            res.write = function() {
            };
        },
        secure: false
    } );

    return ( req, res, next ) => {
        middlewareProxy( req, res, next );
    };
};