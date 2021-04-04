/**
 *  Unpack a form's dependencies into a single object
 *
 *  @author: strix
 *  @date: 2016 August
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/

'use strict';

YUI.add( 'dcforms-packageutils', function( Y , NAME ) {

        /**
         *  Resize an image on the client
         *
         *  @param  mediaId     {String}    Database _id of a media object
         *  @param  width       {Number}    pixels
         *  @param  height      {Number}    pixels, -1 to match source aspect
         *  @param  callback    {Function}  Of the form fn( err, dataURI )
         */

        function getPackedImage( mediaId, width, height, callback ) {

            var
                fullSizeImage = new Image(),
                mimeType,
                originalFile;

            Y.log( 'Scaling image from package for form: ' + mediaId + ' ' + width + 'x' + height, 'debug', NAME );

            if ( !Y.dcforms.package.media.hasOwnProperty( mediaId ) ) {
                return callback( 'Image not packed.' );
            }

            originalFile = Y.dcforms.package.files[mediaId];
            fullSizeImage.addEventListener( 'load', onFullSizeImageLoaded );
            fullSizeImage.addEventListener( 'error', onFullSizeImageLoaded );

            mimeType = Y.doccirrus.media.getMimeType( Y.dcforms.package.media[mediaId].mime );

            //console.log( 'Original media file: ', originalFile );

            fullSizeImage.src = 'data:' + mimeType + ';base64,' + originalFile;

            //console.log( 'Image source: ', fullSizeImage.src );

            function onFullSizeImageLoaded() {
                var
                    cnv = document.createElement( 'canvas' ),
                    ctx,
                    aspectSrc,
                    dataURI;

                //TODO: add error image here

                //  correct constant aspect here
                if ( !height || -1 === height || '-1' === height ) {
                    aspectSrc = fullSizeImage.width / fullSizeImage.height;
                    height = parseInt( ( width / aspectSrc ), 10 );
                }

                cnv.width = width;
                cnv.height = height;
                ctx = cnv.getContext( '2d' );
                ctx.drawImage( fullSizeImage, 0, 0, fullSizeImage.width, fullSizeImage.height, 0, 0, width, height );

                dataURI = cnv.toDataURL( 'image/jpeg' );
                callback( null, dataURI );
            }

        }

        Y.namespace( 'doccirrus.forms' ).package = {
            getPackedImage: getPackedImage
        };

    },
    '0.0.1', { requires: [] }
);