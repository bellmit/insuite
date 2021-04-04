/*
 * Copyright (c) 2014 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 *
 */

/**
 *  This is a stub video module to allow addition of .mov and .mp4 video
 */

/*global YUI*/
/*jshint latedef:false */



YUI.add( 'dcmedia-video', function( Y ) {

        /**
         *  Check and convert an uploaded video to .mp4 using ffmpeg
         *
         *  @param  video
         *  @param  callback
         */

        function normalize(video, callback) {
            //  stub, may use ffmpeg in future - presently testing unmodified quicktime in HTML5 video
            video.transform = 'original';
            callback(null, video);
        }
    
        /*
         *  Export interface for use by mojits
         */

        Y.namespace( 'doccirrus.media' ).video = {
            'normalize': normalize
        };

    },
    '0.0.1', { requires: [] }
);