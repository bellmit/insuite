/*
 * Copyright (c) 2014 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  This is a stub for an audio processing module
 */

/*global YUI*/
/*jshint latedef:false */



YUI.add( 'dcmedia-audio', function( Y /*, NAME */ ) {

        //  node modules
        //var shellexec = require( 'child_process' ).exec;

        /**
         *  For unit testing mostly, return true if this object initialized right
         *
         *  @returns    {Boolean}   Which isn't wildly informative.
         */

        function initialized() {
            return Y.doccirrus.media.initialized();
        }

        /**
         *  Stub for function to normalize uploaded PDF documents
         *
         *  @param document
         *  @param callback
         */

        function normalize(document, callback) {

            //  nothing yet done
            callback(null, document);
        }

        /*
         *  Export interface for use by mojits
         */

        Y.namespace( 'doccirrus.media' ).audio = {
            'initialized': initialized,
            'normalize': normalize
        };

    },
    '0.0.1', {requires: [] }
);