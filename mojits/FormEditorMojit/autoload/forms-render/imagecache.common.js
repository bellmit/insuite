/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  Holds images loaded from server as dataURI, invalidated when image, dimensions os language are changed
 *
 *  Used pages and elements for their background images, and may be extended for barcodes and other media types
 *
 *
 *  NOTE: the patientRegId property has been overloaded to hold the 'user; object when run on the server
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-imagecache',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createImageCache = function( user, patientRegId ) {
            var
                self,
                ServerCanvas = null,
                ServerImage = null;

            if ( user ) {
                ServerCanvas = require('canvas');
                ServerImage = ServerCanvas.Image;
            }

            self = {
                'user': user,
                'patientRegId': patientRegId,
                'mediaId': '',
                'dataUrl': '',
                'imgObj': null,
                'width': -1,
                'height': -1,
                'lang': '',
                'loading': false,
                'loaded': false,
                'retries': 0
            };

            /**
             *  Image not present or invalidated, fetch a new one from the server
             *
             *  @param mediaId
             *  @param lang
             *  @param width
             *  @param height
             *  @param callback
             */

            self.load = function( mediaId, lang, width, height, callback ) {

                var
                    imageUrl,
                    calledBack = false;

                //Y.log('Loading image into cache: ' + mediaId + ' (' + lang + ' ' + width + 'x' + height + ')', 'info', NAME);
                //  callback may fire twice in some cirumstances, ignore second

                function callbackOnce(err) {
                    if (false === calledBack) {
                        calledBack = true;
                        return callback( err );
                    } else {
                        Y.log('Image load called back more than once: ' + mediaId, 'warn', NAME);
                    }
                }

                function onImageLoaded( err ) {
                    if ( Y.dcforms.isOnServer && err ) {
                        Y.log('Could not cache image ' + mediaId + ' for forms: ' + JSON.stringify(err), 'warn', NAME);
                        callbackOnce( err );
                        return;
                    }

                    //  in some browsers and circumstances the image load may be synchronous

                    if (self.imgObj.height && self.imgObj.height > 0) {
                        //Y.log('Loaded image synchronously: ' + self.imgObj.width + 'x' + self.imgObj.height, 'debug', NAME);
                        self.loading = false;
                        self.loaded = true;

                        self.height = self.imgObj.height;

                        Y.log( 'Loaded image: ' + self.imgObj.width + 'x' + self.imgObj.height, 'debug', NAME );
                    }

                    //  callback regardless of broken image (don't let it break the rest of form render)
                    callbackOnce( null );
                }

                width = parseInt(width, 10);
                height = parseInt(height, 10);

                self.loaded = false;
                self.loading = true;

                self.mediaId = mediaId;
                self.lang = lang;
                self.width = width;
                self.height = height;

                //  Special case of packed form
                if ( Y.dcforms.usePackage ) {
                    Y.doccirrus.forms.package.getPackedImage( mediaId, width, height, function onDataURIReady(err, dataURI ) {
                        self.imgObj = new Image();
                        self.imgObj.addEventListener( 'load', onImageLoaded );
                        self.imgObj.addEventListener( 'error', onImageLoaded );
                        self.imgObj.src = dataURI;
                    } );
                    return;
                }

                if ( self.user ) {
                    //  Previously, raster images were not loaded on the server, but as of MOJ-7819 we need their
                    //  dimensions for text flow around user images - for that we don't actually draw them, but get the
                    //  width and height from the meta object in the media collection
                    return self.loadServer( mediaId, lang, width, height, callback );

                } else {

                    imageUrl = '/media/' + mediaId + '_' + width + 'x' + height + '.IMAGE_JPEG.jpg';

                    //  if running on patient portal we need to use the media proxy
                    if ( patientRegId && '' !== patientRegId ) {
                        imageUrl = '/1/metaprac/:mediaproxy' +
                            '?id=' + mediaId +
                            '&transform=' + width + 'x' + height +
                            '&mime=IMAGE_JPEG' +
                            '&metaregid=' + patientRegId;
                    } else {
                        imageUrl = Y.doccirrus.infras.getPrivateURL( imageUrl );
                    }

                    //  we're on the client and can use the browser's image
                    self.imgObj = new Image();
                    self.imgObj.addEventListener( 'load', onImageLoaded );
                    self.imgObj.addEventListener( 'error', onImageLoaded );

                    //  always use .jpg images for forms on the client
                    self.imgObj.src = imageUrl;
                }

            };

            /**
             *  Load stub image object on server for laying out pages (not drawn on server canvas, but size and aspect
             *  are needed for layout)
             *
             *  @param  mediaId     {String}
             *  @param  lang
             *  @param  width
             *  @param  height
             *  @param  callback    {Function}  Of the form fn( err )
             */

            self.loadServer = function( mediaId, lang, width, height, callback ) {

                Y.log( 'Loading image ' + mediaId + ' on server...', 'debug', NAME );

                self.imgObj = {
                    'width': width,
                    'height': height,
                    'stub': true
                };

                if ( !mediaId || '' === mediaId ) {
                    Y.log( 'Could not load image, no _id given.', 'warn', NAME );
                    return callback( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': self.user,
                    'model': 'media',
                    'query': { _id: mediaId },
                    'options': { lean: true },
                    'callback': onMediaLoaded
                } );

                function onMediaLoaded( err, result ) {

                    if ( !err && !result[0] ) {
                        Y.log( 'Missing media for form layout: ' + JSON.stringify( err ), 'warn', NAME );
                        //  missing image, call back with stub image of requested dimensions - best effort to render PDF
                        return callback( null, self.imgObj );
                    }

                    if ( err ) {
                        Y.log( 'Error loading media for form layout: ' + JSON.stringify( err ), 'warn', NAME );
                        //  call back with stub image of requested dimensions - best effort to render PDF
                        return callback( null, self.imgObj);
                    }

                    var data = result[0];
                    self.imgObj = {
                        'width': data.widthPx || 1,
                        'height': data.heightPx || 1,
                        'stub': true
                    };

                    self.loading = false;
                    self.loaded = true;
                    self.height = self.imgObj.height;

                    callback( null, self.imgObj );
                }
            };

            self.clear = function() {
                self.loaded = false;
                self.imgObj = null;
                self.dataUrl = '';
                self.mediaId = '';
            };

            self.dataUrlToBuffer = function(dataUrl) {
                var bin, parts;
                //Y.log('Converting dataUrl to buffer: ' + dataUrl, 'debug', NAME);
                parts = dataUrl.split(',', 2);
                bin = Buffer.from(parts[1], 'base64');
                return bin;
            };

            /**
             *  Confirm that the current image in the cache matches these parameters
             *
             *  If not, the image will be reloaded before calling back
             *
             *  @param  mediaId     {String}    Database location of image to use
             *  @param  lang        {String}    Current user language
             *  @param  width       {Number}    Image pixels
             *  @param  height      {Number}    Image pixels
             *  @param  callback    {Function}  Of the form fn(err)
             */

            self.check = function(mediaId, lang, width, height, callback) {
                var allOK = true;

                function onReload(err) {
                    //Y.log('Image has changed, sreloaded ' + mediaId, 'debug', NAME);
                    callback(err);
                }

                width = parseInt(width, 10);
                height = parseInt(height, 10);
                
                if (self.mediaId !== mediaId) { allOK = false; }
                if (self.lang !== lang) { allOK = false; }
                if (self.width !== width) { allOK = false; }
                if (self.height !== height) { allOK = false; }

                if (true === allOK) {
                    callback(null);
                    return;
                }

                self.load(
                    mediaId,
                    lang,
                    width, height,
                    Y.dcforms.checkSingleCB(
                        onReload,
                        'imagecache.common.js::check() ' + mediaId + ' '  + width + 'x' + height
                    )
                );
            };

            /**
             *  Paint this to a canvas
             *
             *  @param  cnv         {Object}    HTML5 canvas element
             *  @param  left        {Number}    Canvas pixels
             *  @param  top         {Number}    Canvas pixels
             *  @param  width       {Number}    Canvas pixels
             *  @param  height      {Number}    Canvas pixels
             *  @param  callback    {Function}  Of the form fn(err)
             */

            self.paintToCanvas = function(cnv, left, top, width, height, callback) {

                if (!self.loaded || !self.imgObj.width || self.imgObj.width === 0) {
                    callback('Image not yet loaded');
                    return;
                }

                var
                    ctx = cnv.getContext('2d');

                left = parseInt(left, 10);
                top = parseInt(top, 10);
                width = parseInt(width, 10);
                height = parseInt(height, 10);

                /*
                console.log({                                                                       //jslint ignore:line
                    'left': left,
                    'top': top,
                    'width': width,
                    'height': height,
                    'img.width': self.imgObj.width,
                    'img.height': self.imgObj.height,
                    'src': self.imgObj.src
                });
                */

                try {
                    ctx.drawImage(self.imgObj, 0, 0, self.imgObj.width, self.imgObj.height, left, top, width, height);
                } catch(drawErr) {
                    Y.log('Could not draw image to canvas: ' + JSON.stringify(drawErr), 'warn', NAME);
                    callback(drawErr);
                    return;
                }

                callback(null);
            };

            return self;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);