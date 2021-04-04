/*
 *  Binder for batch PDF testing page
 *
 *  This is to test rendering of activities directly to PDF in a downloadable zip archive
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, ko */

YUI.add('TestingMojitBinderMedsDBTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderMedsDBTest module.
         *
         * @module TestingMojitBinderMedsDBTest
         */

        'use strict';
        var methods = {

            'getCatalogs': [],
            'getCatalogEntries': ['name'],
            'getCompanies': [],
            'getInsuranceCompanyGroups': [],
            'getMolecules': [],
            'getPackages': [],
            'getProducts': [],
            'getDocuments': [],
            'getMetaData': [],
            'getTexts': [],
            'getARV': [],
            'getAMR': [],
            'getRegulations': []



        };

        var SAMPLEKEY = 'X2FM-VVYM-UGFK-Q2ZN';
        var SAMPLEUSERNAME = 'DOCCIRRUS20150202';

        function sendRequest( method, params, cb ) {
            console.log("params", params);
            if(!params){
                params = '{}';
            }
            params = encodeURIComponent(JSON.stringify(JSON.parse(params)));


            var url = 'http://localhost:7777/rest/pharmindexv2/'+method+'/'+SAMPLEKEY+'/'+SAMPLEUSERNAME+'/'+params;
            console.log("URL", url);
            $.ajax( {
                type: 'GET',
                url: url,
                success: function( res ) {
                    console.log("SUCCES", res);
                    cb(null, res);
                },
                error: function( res ) {
                    console.log("ERROR", res);
                    cb(res);
                }
            } );

        }
        
        function RestCall() {
            var self = this;
            self.method  = ko.observable();
            self.params = ko.observable('');
            self.result = ko.observable('');
            self._methodList = ko.observable(Object.keys(methods));
            self._disabled = ko.observable(false);
            
            self._send = function() {
                console.log("SEND REQUEST");
                self._disabled(true);
                sendRequest(self.method(), self.params(), function( err, results ) {
                    console.warn("sendRequest", err, results);
                    if(!err){

                        self.result(results);
                    } else {
                        self.result = ko.observable('');
                    }
                    self._disabled(false);
                });
            };
            
            self._showResult = ko.computed(function() {
                var result  = self.result();
                if(result){
                    return JSON.stringify(result, null, 2);
                }
            });

        }


        /**
         * Constructor for the TestingMojitBinderMedsDBTest class.
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

            bind: function( node ) {


                this.node = node;

                ko.applyBindings(new RestCall(), document.querySelector( '#medstest' ));

            }
        };
    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib'
        ]
    }
);
