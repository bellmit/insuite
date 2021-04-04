/*
 *  Mojit to handle upload, rendering and transformation of attached media
 *
 *  (DOCUMENTME)
 *
 *  Copyright (c) 2013 Doc Cirrus GmbH
 *  Author Richard Strickland
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */
/*global YUI */



YUI.add( 'MediaMojit', function( Y, NAME ) {

        /**
         * The MediaMojit module.
         *
         * @module MediaMojit
         */

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */

        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             *  Method corresponding to the 'index' action.
             *
             *  This is an development/administrative utility to list media in the database
             *
             *  @param {Object} ac The ActionContext that provides access to the Mojito API.
             */
            displayall: function( ac ) {
                ac.done( {
                    status: 'OK',
                    data: 'This is a test action'
                } );
            },

            /**
             *  Required by restcontroller.js for this.get(...) to work
             *  @returns {string}
             */

            getModelName: function() {
                return 'media';
            },

            /**
             *  Check default media shipped on disk against the media collection for this tenant / PRC
             *
             *  @param  ac
             */

            'importdefaultmedia': function(ac) {
                var finish = this._getCallback( ac);
                finish( Y.doccirrus.errors.rest( 'REMOVED: unused, legacy.' ) );
            }

        };
    },
    '0.0.1',
    {
        requires: [

            'mojito',
            'mojito-http-addon',
            'mojito-assets-addon',
            'mojito-params-addon',
            'mojito-models-addon',
            'mojito-intl-addon',

            'dcmedia-store',
            'dcmedia-images',
            'dcmedia-audio',
            'dcmedia-pdf',

            'dcmedia-svg',
            'dcmedia-svg-rasterize'

        ]
    }
);
