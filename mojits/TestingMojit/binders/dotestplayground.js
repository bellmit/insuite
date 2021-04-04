
/*jslint anon:true, sloppy:true, nomen:true, latedef:false , moment:true*/

YUI.add('DoTestPlaygroundMojitBinder', function(Y, NAME) {
        /**
         * The DoTestPlaygroundMojitBinder module.
         *
         * @module DoTestPlaygroundMojitBinder
         */

        'use strict';


        /**
         * Constructor for the DoTestPlaygroundMojitBinder class.
         *
         * @class testingMojitBinderMedsDBTest
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *    The binder method, invoked to allow the mojit to attach DOM event
             *    handlers.
             *
             *    @param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function() {
/*
                var BTM = '546213a1cfcd67580a9d36f3';
                var BTM2 = '54623c998d97030a10c929a6';
                var OTC = '5460f8f1aa40b87b1654d341';
                var NOMED = '5460f816aa40b87b1654d33b';
                var OTX = '54623e859e1023ea11e87892';
                var NORMAL = '546240d86b40864b12c8be02';

                var LIST = [BTM, BTM2];
                //var LIST = [OTC];
                //var LIST = [OTX]; // advice
                //var LIST = [NOMED];
                //var LIST = [NOMED, OTC];
                //var LIST = [NORMAL, NORMAL];
                //var LIST = [NORMAL, OTX];


                //var LIST = [BTM, OTX];

                Y.doccirrus.jsonrpc.api.activity.getPrescriptionTypes({
                    query: {
                        medications: LIST
                    }
                } ).done( function( response ) {
                    var data = response && response.data;
                });



                Y.doccirrus.jsonrpc.api.mmi.getCompareableMedications({
                    query: {
                        prescId: '54662a1fd40582d7118bd712',
                        insuranceIknr: '107877506',
                        patientDob: moment("1987-12-11T23:00:00.000Z"),
                        bsnr: '580104302',
                        lanr: '388231567'
                    }
                } ).done( function( response ) {
                    var data = response && response.data;
                } );
 */

            }
        };
    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dccommonutils',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);
