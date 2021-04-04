'use strict';

const fs = require( 'fs' );
const url = require( 'url' );
const util = require( 'util' );
const path = require( 'path' );

let Y;

/**
 *  Middleware to manage barcode generation and caching
 *
 *  Usage:
 *
 *      /barcode/?
 *          type    -   rescode renderer name, default is 'pdf417',
 *          width   -   Pixels, default is 200
 *          height  -   Pixels, default is -1 (use same aspect as rescode)
 *          code    -   Default is '00000000000',
 *          extra   -   Default is '',
 */
class BarcodeMiddleware {

    constructor() {
        this.generator = {
            generate: util.promisify( Y.doccirrus.media.barcode.generate )
        };
        this.cache = {
            has: util.promisify( Y.doccirrus.media.cacheHas ),
            get: util.promisify( Y.doccirrus.media.getCacheFileName ),
            size: async ( media ) => {
                const status = await fs.promises.stat( media._diskFile );
                return status.size;
            },
            path: ( media ) => {
                return path.join( Y.doccirrus.media.getCacheDir(), media._cacheFile );
            }
        };
    }

    /**
     *  Interpret a request passed to this component
     *
     *  @param  req     {Object}    Express request object
     *  @returns        {Object}
     */
    parse( query ) {
        query = url.parse( query, true ).query;

        const media = {
            method: 'download',
            transform: 'original',
            mime: query.mime || 'IMAGE_PNG',
            type: query.type || 'pdf417',
            extra: query.extra || '',
            width: query.width || 200,
            height: query.height || -1,
            data: Array.isArray( query.code ) ? query.code.join( '' ) : query.code || '00000000000',
            _ext: '',
            _fixAspect: false,
            _toDataUri: false,
            _cacheFile: '',
            _inCache: false,
            _category: ''
        };

        media._id = Y.doccirrus.media.barcode.hash( media );
        media.ext = Y.doccirrus.media.getExt( media.mime );
        media._cacheFile = media._id + '_' + media.width + 'x' + media.height + '.' + media.mime + '.' + media.ext;

        return media;
    }

    /**
     *  Middleware components must either respond to the request or call next() to pass to next component
     *
     *  @param  req     {Object}    Express request
     *  @param  res     {Object}    Express response
     *  @param  next    {Function}  Pass control to next component
     */
    // eslint-disable-next-line no-unused-vars
    async handle( req, res, next ) {
        const media = this.parse( req.url );

        try {
            if( await this.cache.has( media ) ) {
                Y.log( `Cache hit for ${JSON.stringify( media )}`, 'debug', this.constructor.name );

                media._inCache = true;
                //  rebuild the filename for security and validation
                media._cacheFile = this.cache.get( media, false );
            } else {
                media._cacheFile = await this.generator.generate( media );
                media._inCache = true;
            }

            media._diskFile = this.cache.path( media );
            media._contentLength = await this.cache.size( media );
        } catch ( error ) {
            Y.log( `Generating barcode failed ${JSON.stringify( error.stack || error )}`, 'error', this.constructor.name );

            res.writeHead( 500, { 'Content-type': 'text/plain' } );
            res.write( 'Generating barcode failed' );
            res.end();

            return;
        }

        const stream = fs.createReadStream( media._diskFile );
        const headers = {
            'Content-Type': Y.doccirrus.media.getMimeType( media.mime ),
            'Content-Length': media._contentLength
        };

        Y.log( `Piping media to client ${media._diskFile}`, 'debug', this.constructor.name );

        res.writeHead( 200, headers );

        stream.pipe( res );
    }
}

module.exports = function( _Y ) {
    Y = _Y;

    const handler = new BarcodeMiddleware();
    return handler.handle.bind(handler);
};