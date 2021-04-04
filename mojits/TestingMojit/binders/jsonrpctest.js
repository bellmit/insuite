/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, jQuery, ko, moment */
YUI.add( 'jsonrpctest-binder-index', function( Y, NAME ) {
    'use strict';
    var
        /**
         * @see Y.doccirrus.jsonrpc.reflection
         */
        API = Y.doccirrus.jsonrpc.api;

    Y.namespace( "mojito.binders" )[NAME] = {

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function( node ) {
            this.node = node;

            var
                patient = {
                    "dob": "1991-07-03T11:08:17.357Z",
                    "gender": "MALE",
                    "talk": "MR",
                    "markers": [],
                    "physicians": [],
                    "primaryDoc": "100000000000000000000003",
                    "images": [],
                    "affiliates": [],
                    "insuranceStatus": [
                        {
                            "insuranceId": "R684332426",
                            "insuranceNo": "R684332426",
                            "insuranceGrpId": "25984",
                            "mobileEgkId": "101",
                            "validTo": "2016-07-03T11:08:17.357Z",
                            "feeSchedule": "",
                            "costCarrierBillingGroup": "",
                            "costCarrierBillingSection": "",
                            "fk4110": null
                        }
                    ],
                    "addresses": [],
                    "communications": [
                        {
                            "type": "EMAILJOB",
                            "preferred": false,
                            "value": "qa-patient11@doc-cirrus.com"
                        }
                    ],
                    "prodServices": [],
                    "accounts": [],
                    "lastname": "patient11",
                    "middlename": "",
                    "nameaffix": "",
                    "firstname": "qa11",
                    "title": "Mr."
                },
                viewModel = {
                    log: ko.observable( 'Success:' ),
                    error: ko.observable( 'Error:' ),

                    // trigger single request
                    callOnce: function() {

                        // objComplete: true, // TODO: check "objComplete:true" for create
                        API.patient.create( {
                                data: patient
                            },
                            function success( data ) {
                                viewModel.log( viewModel.log() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' >  Patient.create: ' + JSON.stringify( data ) );
                            },
                            function error( rpcErr ) {
                                viewModel.error( viewModel.error() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' >  Patient.create: ' + JSON.stringify( rpcErr ) );
                            } );

                    },

                    // trigger two requests simultaneously
                    callTwice: function() {

                        // just wrapping those calls to demonstrate some jQuery.Deferred
                        jQuery.when(
                            // first call
                            API.patient.update( {
                                    query: {_id: '10000000000000000000000d'},
                                    data: {
                                        firstname: 'foo' + moment().format( 'HH:mm:ss' ),
                                        lastname: 'baz'
                                    },
                                    fields: ['firstname']
                                },
                                function( data ) {
                                    viewModel.log( viewModel.log() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' > Patient.update:' + JSON.stringify( data ) );
                                },
                                function error( rpcErr ) {
                                    viewModel.error( viewModel.error() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' >  Patient.update: ' + JSON.stringify( rpcErr ) );
                                } )
                                .done( function() {
                                } )
                                .fail( function() {
                                } ),
                            // second call
                            API.patient.read( {
                                    query: {}
                                },
                                function( data ) {
                                    viewModel.log( viewModel.log() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' > Patient.read:' + JSON.stringify( data ) );
                                },
                                function error( rpcErr ) {
                                    viewModel.error( viewModel.error() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' >  Patient.read: ' + JSON.stringify( rpcErr ), 'error' );
                                } )
                                .done( function() {
                                } )
                                .fail( function() {
                                } )
                        ).then( function() {
                                // both succeeded
                            } );
                    },
                    testWarnings: function() {
                        API.test.testWarnings()
                            .done( function( response ) {
                                viewModel.log( viewModel.log() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' > test.testWarning:' + JSON.stringify( Y.doccirrus.errorTable.getWarningsFromResponse( response ) ) );
                                Y.Array.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( response ), 'display' );
                            } )
                            .fail( function( error ) {
                                viewModel.error( viewModel.error() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' >  test.testWarning: ' + JSON.stringify( Y.doccirrus.errorTable.getErrorsFromResponse( error ) ), 'error' );
                            } )
                            .fail( function( response ) {
                                Y.Array.invoke(Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display');
                            } );
                    },
                    testErrors: function(){
                        API.test.testErrorInErrorTable()
                            .fail( function(error){
                                viewModel.error( viewModel.error() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' >  test.testErrorInErrorTable: ' + JSON.stringify( Y.doccirrus.errorTable.getErrorsFromResponse( error ) ), 'error' );
                            })
                            .fail( function( response ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
                            } );
                        API.test.testErrorNotInErrorTable()
                            .fail( function(error){
                                viewModel.error( viewModel.error() + "\n\n" + moment().format( 'HH:mm:ss' ) + ' >  test.testErrorNotInErrorTable: ' + JSON.stringify( Y.doccirrus.errorTable.getErrorsFromResponse( error ) ), 'error' );
                            })
                            .fail( function( response ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
                            } );
                    }
                };

            ko.applyBindings( viewModel, node.getDOMNode() );
        }

    };
}, '0.0.1', {
    requires: [
        'mojito-client',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
