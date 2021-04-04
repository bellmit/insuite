

/*global YUI*/
/*jshint latedef:false */

/**
 * Facade for barcode generation
 */
YUI.add( 'dcmedia-barcode', function( Y, NAME ) {

        const util = require( 'util' ),
            path = require( 'path' ),
            crypto = require( 'crypto' ),
            fs = require( 'fs' ),
            bwipjs = require( 'bwip-js' );

        const types = [
                'ean2',
                'ean5',
                'ean8',
                'upca',
                'upce',
                'code128',
                'gs1-128',
                'ean13',
                'sscc18',
                'code39',
                'code39ext',
                'code32',
                'pzn',
                'code93',
                'code93ext',
                'interleaved2of5',
                'itf14',
                'identcode',
                'leitcode',
                'databaromni',
                'databarstacked',
                'databarstackedomni',
                'databartruncated',
                'databarlimited',
                'databarexpanded',
                'databarexpandedstacked',
                'pharmacode',
                'pharmacode2',
                'code2of5',
                'code11',
                'bc412',
                'rationalizedCodabar',
                'onecode',
                'postnet',
                'planet',
                'royalmail',
                'auspost',
                'kix',
                'japanpost',
                'msi',
                'plessey',
                'telepen',
                'posicode',
                'codablockf',
                'code16k',
                'code49',
                'channelcode',
                'flattermarken',
                'raw',
                'daft',
                'symbol',
                'pdf417',
                'micropdf417',
                'datamatrix',
                'qrcode',
                'maxicode',
                'azteccode',
                'codeone',
                'gs1-cc',
                'ean13composite',
                'ean8composite',
                'upcacomposite',
                'upcecomposite',
                'databaromnicomposite',
                'databarstackedcomposite',
                'databarstackedomnicomposite',
                'databartruncatedcomposite',
                'databarlimitedcomposite',
                'databarexpandedcomposite',
                'databarexpandedstackedcomposite',
                'gs1-128composite',
                'gs1datamatrix',
                'hibccode39',
                'hibccode128',
                'hibcdatamatrix',
                'hibcpdf417',
                'hibcmicropdf417',
                'hibcqrcode',
                'hibccodablockf',
                'isbn',
                'ismn',
                'issm'
            ],
            errorImageFile = process.cwd() + '/mojits/MediaMojit/assets/images/barcode-invalid.png';

        let errorImage = '';

        function _hash( options ) {
            return crypto.createHash( 'sha1' ).update( options.data + options.type + options.width + options.height + options.extra ).digest( 'hex' );
        }

        /**
         *  @param {String} extra
         *  @returns {Object}
         *  @private
         *  @see https://github.com/metafloor/bwip-js
         */
        function _parse( extra ) {
            const tokens = extra.split(' ');
            const result = {};

            for ( const token of tokens.filter(Boolean) ) {
                Y.log( `Parsing barcode renderer option ${token}`, 'debug', NAME );

                const parts = token.split( '=', 2 );

                if ( parts.length === 1 ) {
                    result[token] = true;
                } else if ( parts.length === 2 ) {
                    switch (parts[1].toLowerCase()) {
                        case 'true':
                            result[parts[0]] = true;
                            break;
                        case 'false':
                            result[parts[0]] = false;
                            break;
                        default:
                            result[parts[0]] = parts[1];
                    }
                }
            }

            return result;
        }

        /**
         * @private
         * @see MOJ-7769
         * @param {Object}    options
         */
        function _sanitize( options ) {
            if ( !types.includes( options.type ) ) {
                throw new Error( `Unrecognized barcode type ${options.type}. Allowed ${JSON.stringify( types )}` );
            }

            if ( !options.data ) {
                options.data = '0';
            }

            if ( !options.scale ) {
                options.scale = {
                    x: 3,
                    y: 3
                };
            }

            options.extra = _parse( options.extra || '' );

            if ( options.type === 'datamatrix' && !Object.keys( options.extra ).length ) {
                options.extra.version = '26x26';
            }

            if ( options.type === 'pdf417' ) {
                // there were problems with the readability on site of the KBV
                // this ratio seems to produce the best results for them
                options.scale.y = parseInt( options.scale.x * 2 / 3, 10 );

                if ( !Object.keys( options.extra ).length ) {
                    options.extra.columns = 7;
                    options.extra.eclevel = 4;
                }
            }
        }

        /**
         * Converts PNG to JPEG
         *
         * The `imagesCanvas` component is currently not able to produce better results
         * the reasons seems to be the background color (alpha vs. white) and the missing
         * option to set the background of the canvas (fill) combined with HPDF. Allowing
         * HPDF making this converting leads to PDF file which are too large.
         *
         * @private
         * @deprecated
         *
         * @param {Object} resource
         * @param {Object} options
         * @todo Fill style should be integrated into the `imagesCanvas` component
         */
        async function _convert( resource, options ) {
            if ( resource.mime !== 'IMAGE_PNG' || options.mime !== 'IMAGE_JPEG' ) {
                return resource;
            }

            let mode = 'default';
            let { Canvas, Image } = require( 'canvas' );

            if ( !Canvas ) {
                // only for CentOS 6
                mode = 'legacy';
                Canvas = require( 'canvas' );
            }

            const canvas = new Canvas( resource.width, resource.height );
            const context = canvas.getContext( '2d' );
            const image = new Image();

            image.src = resource.source;

            context.canvas.getContext( '2d' );
            context.fillStyle = 'white';
            context.fillRect( 0, 0, resource.width, resource.height );
            context.drawImage( image, 0, 0 );

            return {
                source: mode === 'legacy' ? await ( util.promisify( canvas.toDataURL.bind( canvas ) )( 'image/jpeg' ) ) : canvas.toDataURL( 'image/jpeg' ),
                mime: 'IMAGE_JPEG'
            };
        }

        /**
         * Resample seems to be broken
         * @param {Object}      resource
         * @param {Number}      height
         * @param {Numper}      width
         * @return {Promise<*>}
         * @private
         */
        async function _resample( resource, { height, width } ) {
            if ( resource.height === height && resource.width === width ) {
                return;
            }

            const resample = util.promisify( Y.doccirrus.imagesCanvas.resample );

            return await resample( resource, width, height, false, resource.mime );
        }

        function _scale( resource, width ) {
            const ratio = resource.width / resource.height;

            return {
                height: parseInt( width / ratio, 10 ),
                width
            };
        }

        /**
         * @private
         * @deprecated
         * @param {Object}  resource
         *
         * @todo Should be part of the client which uses this component
         */
        async function _cache( resource ) {
            const writeFile = util.promisify( Y.doccirrus.media.writeFile );
            const cacheStore = util.promisify( Y.doccirrus.media.cacheStore );

            const directory = Y.doccirrus.media.getTempDir();
            const buffer = Y.doccirrus.media.dataUriToBuffer( resource.source );

            resource._diskFile = Y.doccirrus.media.getTempFileName( resource );
            resource._tempFiles = [ resource._diskFile ];

            await writeFile( resource._diskFile, directory, buffer );
            resource._cacheFile = await cacheStore( resource );

            Y.doccirrus.media.cleanTempFiles( resource );

            Y.log( `Added barcode to media cache ${resource._cacheFile}`, 'debug', NAME );

            return path.basename( resource._cacheFile );
        }

        async function _generate( options = {} ) {
            let resource = {
                _id: options._id,
                transform: 'resize',
                mime: 'IMAGE_PNG',
                source: errorImage,
                mimeType: 'image/png'
            };

            Y.log( `Generating barcode using ${JSON.stringify( options )}`, 'debug', NAME );

            _sanitize( options );

            Y.log( `Creating barcode of type ${options.type} for ${options.data}`, 'info', NAME );

            try {
                const buffer = await bwipjs.toBuffer( {
                    bcid: options.type,
                    text: options.data,
                    scaleX: options.scale.x,
                    scaleY: options.scale.y,
                    includetext: false,
                    ...{
                        backgroundcolor: 'FFFFFF',
                        ...options.extra
                    }
                } );

                resource = {
                    ...resource,
                    ...{
                        source: `data:image/png;base64,${buffer.toString( 'base64' )}`,
                        height: buffer.readUInt32BE( 20 ),
                        width: buffer.readUInt32BE( 16 )
                    }
                };
            } catch( error ) {
                Y.log( `Barcode rendering failed with ${error.stack || error}`, 'error', NAME );

                throw error;
            }

            resource = {
                ...resource,
                ...await _convert( resource, options )
            };

            try {
                const dimensions = _scale( resource, options.width );

                return await _cache( {
                    ...resource,
                    ...await _resample( resource, dimensions )
                } );
            } catch ( error ) {
                Y.log( `Barcode resampling failed with ${error.stack || error}`, 'error', NAME );

                throw error;
            }
        }

        async function _embed( element, hpdf, document, page ) {
            const marker = '{{form.pageNo}}',
                options = {
                    type: element.barcodeType || 'pdf417',
                    data: element.barcode || '0',
                    width: element.width,
                    extra: element.barcodeExtra || '',
                    mime: 'IMAGE_JPEG'
                };

            if ( options.data.includes( marker ) ) {
                options.data = options.data.replace( marker, element.pageIdx );
            }

            _sanitize( options );

            let resource = {
                _id: _hash( options ),
                transform: 'resize',
                mime: 'IMAGE_PNG'
            };

            Y.log( `Generating barcode using ${JSON.stringify( options )}`, 'debug', NAME );

            try {
                const buffer = await bwipjs.toBuffer( {
                    bcid: options.type,
                    text: options.data,
                    scaleX: options.scale.x,
                    scaleY: options.scale.y,
                    includetext: false,
                    ...options.extra
                } );

                resource = {
                    ...resource,
                    ...{
                        source: `data:image/png;base64,${buffer.toString( 'base64' )}`,
                        height: buffer.readUInt32BE( 20 ),
                        width: buffer.readUInt32BE( 16 )
                    }
                };
            } catch ( error ) {
                Y.log( `Could not generate barcode ${JSON.stringify( error.stack || error )}`, 'debug', NAME );
                throw error;
            }

            resource = {
                ...resource,
                ...await _convert( resource, options )
            };

            try {
                const file = await _cache( resource );

                const image = hpdf.loadJpegImageFromFile( document, Y.doccirrus.media.getCacheDir() + file );
                const dimensions = _scale( resource, options.width );

                hpdf.page_DrawImage(
                    page,
                    image,
                    element.left,
                    hpdf.page_GetHeight( page ) - ( element.top + dimensions.height ),
                    dimensions.width,
                    dimensions.height
                );
            } catch ( error ) {
                Y.log( `Could not load barcode into PDF ${error.stack || error}`, 'warn', NAME );
                throw error;
            } finally {
                Y.doccirrus.media.cleanTempFiles( resource );
            }
        }

           function initialized() {
            // sequence is important
            return Y.doccirrus.media.initialized();
        }

        /**
         *  Create a barcode image and cache it in the media store
         *
         *  Generated barcodes are identified by the sha1 hash of their data and type to prevent server-side
         *  includes, this is a security measure to prevent user-supplied data from being used in filenames.
         *
         *  The 'transform' property of media store objects refers to the size at which a barcode is rendered,
         *  there may be many transforms (render sizes) for the same barcode type and data.
         *
         *  Properties of the 'options' parameter may be:
         *
         *  @param {Object}     options Generator options for bwip-js NPM module
         *  @param {String}     options._id Hash which uniquely identifies this barcode in media cache
         *  @param {Number}     options.width Pixels
         *  @param {String}     options.data Value to encode
         *  @param {String}     options.type {String}
         *  @param {String}     options.extra Type specific options
         *  @param {Function}   callback Of the form fn(err, cacheFileName )
         */
        function generate( options, callback ) {
            _generate( options ).then(
                (file) => callback( null, file )
            ).catch(
                (error) => callback( error, errorImageFile )
            );
        }

        /**
         *  Create a unique string to identify this barcode in the media cache
         *
         *  @param  {Object}        options
         *  @param  {String}        options.data Value to be encoded
         *  @param  {Number}        options.width Pixels
         *  @param  {String}        options.type Name of barcode format
         *  @param  {String}        options.extra Type specific barcode options
         *  @returns {String} SHA1 hash
         */
        function hash( options ) {
            return 'xbc' + _hash( options );
        }

        /**
         *  Embed barcode element into the given PDF page
         *
         *  @param  {Object}        element A page element which specifies an image
         *  @param  {Object}        hpdf libharu Reference to libharu binding
         *  @param  {Object}        document (Object} HPDF document object
         *  @param  {Object}        page HPDF page object
         *  @param  {Function}      callback Of the form fn(err, tempFileName)
         */
        function embed( element, hpdf, document, page, callback ) {
            _embed( element, hpdf, document, page ).then(
                () => callback()
            ).catch(
                (error) => callback( error )
            );
        }

        fs.readFile( errorImageFile, ( error, data ) => {
            errorImage = error ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAABxCAIAAADzih5iAAAACXBIWXMAAAsTAAALEwEAmpwYAA' +
                 'AAB3RJTUUH3wQDAi46BgYJhAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAABRSURBVHja7cEBAQAAAI' +
                 'Ig/69uSEABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwa7s0AAd' +
                 '4bBYkAAAAASUVORK5CYII=' : data + '';
        } );

        Y.namespace( 'doccirrus.media' ).barcode = {
            initialized,
            hash,
            generate,
            embed
        };

    },
    '0.0.1', { requires: [ 'dcforms-canvas-utils' ] }
);