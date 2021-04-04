/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'testKoViewModel-binder-index', function( Y, NAME ) {
    'use strict';

    var
        testNs = Y.doccirrus.test,
        TestModule = testNs.getTestModule();

    Y.namespace( "mojito.binders" )[NAME] = {

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;

            console.warn( NAME, {
                arguments: arguments,
                this: this,
                Y: Y
            } );

        },

        bind: function( node ) {
            this.node = node;

            var
                applyBindings = {
                    runTests: function() {
                        //run the tests
                        TestModule.TestRunner.run();
                    },
                    clearTests: function() {
                        applyBindings.tests.removeAll();
                    },
                    tests: ko.observableArray(),
                    testCreateAsync: function() {
                        // constructor creation
                        function MyModel( config ) {
                            MyModel.superclass.constructor.call( this, config );
                        }
                        // extending the base class
                        Y.extend( MyModel, Y.doccirrus.KoViewModel.getBase(), {
                            initializer: function() {
                            },
                            destructor: function() {
                            },
                            _initSubscriptions: function() {
                                MyModel.superclass._initSubscriptions.apply( this, arguments );
                                var
                                    self = this;

                                self._initSubscriptionLocation();
                            },
                            _initSubscriptionLocation: function() {
                                var
                                    self = this;

                                self.locations = Y.doccirrus.KoViewModel.utils.createAsync( {
                                    cache: MyModel,
                                    initialValue: [],
                                    jsonrpc: Y.doccirrus.jsonrpc.api.location.read,
                                    converter: function( data ) {
                                        return Y.Object.owns( data, 'data' ) ? data.data : [];
                                    }
                                } );
                            }
                        }, {
                            // defining static properties
                            schemaName: 'patient', // required, but could be overwritten or provided at instantiation level
                            NAME: 'MyModel' // required, this is the name we are registering for
                        } );
                        // registering the NAME for a constructor
                        Y.doccirrus.KoViewModel.registerConstructor( MyModel );

                        var
                            aMyModel = Y.doccirrus.KoViewModel.createViewModel( { NAME: 'MyModel' } );

                        console.warn( '[testKoViewModel.js] applyBindings.testCreateAsync :', MyModel, aMyModel );
                        ko.computed( function() {
                            console.warn( '[testKoViewModel.js] applyBindings.testCreateAsync : [locations]', aMyModel.locations() );
                        } );
                    }
                };

            console.warn( '[testKoViewModel.js] applyBindings :', applyBindings );

            ko.applyBindings( applyBindings, node.getDOMNode() );

            testNs.utils.createSubscribeForArray( applyBindings.tests );

        }

    };
}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel-tests',

        'mojito-client',
        'JsonRpcReflection-doccirrus',
        'dcutils-uam'
    ]
} );
