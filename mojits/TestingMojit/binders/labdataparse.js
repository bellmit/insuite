/*
 *  Binder to inspect bulk labdata
 *
 *  Used to look for edge cases / unrecognized labdata entries
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, $ */

'use strict';

YUI.add('TestingMojitBinderLabdataParse', function(Y, NAME) {

        /**
         * The TestingMojitBinderLabdataParse module.
         *
         * @module TestingMojitBinderLabdataParse
         */

        Y.log('YUI.add TestingMojitBinderLabdataParse with NAMEs ' + NAME, 'info');

        /**
         * Constructor for the TestingMojitBinderLabdataParse class.
         *
         * @class TestingMojitBinderLabdataParse
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            //  Cached jQuery selectors
            jq: null,

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {
                var self = this;

                self.jq = {
                    txtLDTJSON: $( '#txtLDTJSON' ),
                    divLabadataValue: $( '#divLabadataValue' ),
                    btnUpdate: $( '#btnUpdate' )
                };

                self.jq.btnUpdate.on( 'click', function() { self.update(); } );

                this.node = node;
            },

            update: function() {
                var
                    self = this,
                    jsonObj = JSON.parse( self.jq.txtLDTJSON.val() ),
                    l_extra = {
                        "recordType": "8203",
                        "labReqReceived": "2015-07-31T22:00:00.000Z",
                        "reportDate": "2015-07-31T22:00:00.000Z",
                        "patientName": "Patient",
                        "patientForename": "TEST",
                        "patientDob": "1970-01-02T23:00:00.000Z",
                        "findingKind": "E",
                        "billingType": "K",
                        "feeSchedule": 1,
                        testId: [ jsonObj ]
                    },
                    resultFields = Y.doccirrus.forms.labdata.expandSingleTestResult( l_extra, jsonObj );

                self.jq.divLabadataValue.html( '<pre>' + JSON.stringify( resultFields, undefined, 2 ) + '</pre>' );
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'JsonRpcReflection-doccirrus',
            'dcutils',
            'labdata-finding-utils',
            'dcforms-labdata-mapping-helper'
        ]
    }
);