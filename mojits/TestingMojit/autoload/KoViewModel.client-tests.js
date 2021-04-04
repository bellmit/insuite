/*global YUI, ko */
YUI.add( 'KoViewModel-tests', function( Y, NAME ) {
    
    var
        testNs = Y.doccirrus.test,
        TestModule = testNs.getTestModule(),
        suite = new TestModule.TestSuite( NAME ),
        A = TestModule.Assert,
        Namespace = null;

    /**
     * KoViewModel namespace tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'KoViewModel tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.KoViewModel;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test Namespace': function() {
            A.isObject( Namespace, 'Namespace available' );
            A.isObject( Namespace.utils, 'Namespace utils available' );
        },
        'test Namespace static': function() {
            A.isObject( Namespace.utils.createAsync, 'Namespace utils.createAsync available' );
        },
        'test Namespace Instantiation': function() {
            var
                aKoViewModel = Namespace.createViewModel( { schemaName: 'patient' } );

            A.isInstanceOf( Namespace.getBase(), aKoViewModel, 'instantiation' );
            aKoViewModel.set( 'data', {
                firstname: 'foo',
                addresses: [
                    { street: 'bar' }
                ]
            } );
            A.areEqual( false, Y.Object.owns( aKoViewModel.get( 'data' ), 'lastname' ), 'simple data patient.lastname test' );
            A.areEqual( true, Y.Object.owns( aKoViewModel.toJSON(), 'lastname' ), 'simple schema patient.lastname test' );
            A.areEqual( false, Y.Object.owns( aKoViewModel.get( 'data.addresses.0' ), 'city' ), 'simple data patient.addresses.city test' );
            A.areEqual( true, Y.Object.owns( Y.Object.getValue( aKoViewModel.toJSON(), ['addresses', '0'] ), 'city' ), 'simple schema patient.addresses.city test' );
            A.isString( JSON.stringify( aKoViewModel ), 'stringify' );
        },
        'test createAsync JsonRpc': function() {
            var
                self = this,
                cache = {},
                createAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
                    cache: cache,
                    initialValue: [],
                    jsonrpc: {
                        fn: Y.doccirrus.jsonrpc.api.patient.read,
                        params: {}
                    },
                    converter: function( data ) {
                        return Y.Object.owns( data, 'data' ) ? data.data : [];
                    }
                } );

            A.areEqual( true, ko.isObservable( createAsync ), 'isObservable' );
            A.isInstanceOf( Array, createAsync.peek(), 'initialValue' );
            A.areEqual( true, Y.Object.owns( cache, 'async' ), 'Cache namespace available' );
            A.areEqual( true, Y.Object.owns( cache.async, '{"d":{"namespace":"patient","method":"read","server":"prc"},"p":{}}' ), 'Cache key available' );

            self.waitFor( function() {
                return Boolean( createAsync.peek().length );
            }, function() {
                A.isInstanceOf( Array, createAsync.peek(), 'results' );
            }, 2000, 10 );
        },
        'test createAsync JsonRpc config.jsonrpc = function': function() {
            var
                self = this,
                cache = {},
                createAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
                    cache: cache,
                    initialValue: [],
                    jsonrpc: Y.doccirrus.jsonrpc.api.patient.read,
                    converter: function( data ) {
                        return Y.Object.owns( data, 'data' ) ? data.data : [];
                    }
                } );

            A.areEqual( true, ko.isObservable( createAsync ), 'isObservable' );
            A.isInstanceOf( Array, createAsync.peek(), 'initialValue' );
            A.areEqual( true, Y.Object.owns( cache, 'async' ), 'Cache namespace available' );
            A.areEqual( true, Y.Object.owns( cache.async, '{"d":{"namespace":"patient","method":"read","server":"prc"},"p":{}}' ), 'Cache key available' );

            self.waitFor( function() {
                return Boolean( createAsync.peek().length );
            }, function() {
                A.isInstanceOf( Array, createAsync.peek(), 'results' );
            }, 2000, 10 );
        },
        'test createAsync JsonRpc config.cacheTimeout': function() {
            var
                self = this,
                createAsync,
                cache = {},
                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * check cache key
                     */
                        function() {
                        stack.shift();

                        createAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
                            cache: cache,
                            cacheTimeout: 400,
                            initialValue: [],
                            jsonrpc: Y.doccirrus.jsonrpc.api.patient.read,
                            converter: function( data ) {
                                return Y.Object.owns( data, 'data' ) ? data.data : [];
                            }
                        } );

                        A.areEqual( true, Y.Object.owns( cache, 'async' ), 'Cache namespace available' );
                        A.areEqual( true, Y.Object.owns( cache.async, '{"d":{"namespace":"patient","method":"read","server":"prc"},"p":{}}' ), 'Cache key available' );

                        self.wait( next, 500 );
                    },
                    /**
                     * check cache key unavailable
                     */
                        function() {
                        stack.shift();

                        A.areEqual( true, Y.Object.owns( cache, 'async' ), 'Cache namespace unavailable' );
                        A.areEqual( false, Y.Object.owns( cache.async, '{"d":{"namespace":"patient","method":"read","server":"prc"},"p":{}}' ), 'Cache key unavailable' );

                        createAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
                            cache: cache,
                            cacheTimeout: 400,
                            initialValue: [],
                            jsonrpc: Y.doccirrus.jsonrpc.api.patient.read,
                            converter: function( data ) {
                                return Y.Object.owns( data, 'data' ) ? data.data : [];
                            }
                        } );

                        self.wait( next, 200 );
                    },
                    /**
                     * check cached result
                     */
                        function() {
                        stack.shift();
                        var
                            instantCallback = false;

                        A.areEqual( true, Y.Object.owns( cache, 'async' ), 'Cache namespace available' );
                        A.areEqual( true, Y.Object.owns( cache.async, '{"d":{"namespace":"patient","method":"read","server":"prc"},"p":{}}' ), 'Cache key available' );

                        createAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
                            cache: cache,
                            cacheTimeout: 400,
                            initialValue: [],
                            jsonrpc: Y.doccirrus.jsonrpc.api.patient.read,
                            converter: function( data ) {
                                instantCallback = true;
                                return Y.Object.owns( data, 'data' ) ? data.data : [];
                            }
                        } );

                        A.areEqual( true, instantCallback, 'Cached call' );

                        self.wait( next, 500 );
                    },
                    /**
                     * check cache key unavailable
                     */
                        function() {
                        stack.shift();
                        var
                            instantCallback = false;

                        A.areEqual( true, Y.Object.owns( cache, 'async' ), 'Cache namespace unavailable' );
                        A.areEqual( false, Y.Object.owns( cache.async, '{"d":{"namespace":"patient","method":"read","server":"prc"},"p":{}}' ), 'Cache key unavailable' );

                        createAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
                            cache: cache,
                            cacheTimeout: 400,
                            initialValue: [],
                            jsonrpc: Y.doccirrus.jsonrpc.api.patient.read,
                            converter: function( data ) {
                                instantCallback = true;
                                return Y.Object.owns( data, 'data' ) ? data.data : [];
                            }
                        } );

                        A.areEqual( false, instantCallback, 'Cached call' );

                    }
                ];
            stack[0]();
        },
        'test createAsync Ajax': function() {
            var
                self = this,
                cache = {},
                url = Y.doccirrus.infras.getPrivateURL( '/1/patient' ),
                createAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
                    cache: cache,
                    initialValue: [],
                    ajax: {
                        url: url
                    },
                    converter: function( body ) {
                        return body && body.data ? body.data : [];
                    }
                } );

            A.areEqual( true, ko.isObservable( createAsync ), 'isObservable' );
            A.isInstanceOf( Array, createAsync.peek(), 'initialValue' );
            A.areEqual( true, Y.Object.owns( cache, 'async' ), 'Cache namespace available' );
            A.areEqual( true, Y.Object.owns( cache.async, '{"u":"'+url+'"}' ), 'Cache key available' );

            self.waitFor( function() {
                return Boolean( createAsync.peek().length );
            }, function() {
                A.isInstanceOf( Array, createAsync.peek(), 'results' );
            }, 2000, 10 );
        },
        'test complex schema pure KoViewModel': function() {
            var
                self = this,
                data = {
                    firstname: 'firstname',
                    lastname: 'lastname',
                    sub1: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}],
                    sub2: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}]
                },
                getValueObservable = Namespace.getValueObservable,
                aKoViewModel = Namespace.createViewModel( {
                    schemaName: 'KoViewModelTest',
                    config: {
                        data: data,
                        validatable: true
                    }
                } ),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * initial check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.getBase(), aKoViewModel, 'instantiation' );
                        A.areEqual( JSON.stringify( data ), JSON.stringify( aKoViewModel ), 'config data equals stringify for KoViewModel' );
                        A.areEqual( false, aKoViewModel.isModified(), 'initial data not modified' );

                        self.wait( next, 500 );
                    },
                    /**
                     * initial valid check
                     */
                        function() {
                        stack.shift();

                        A.areEqual( true, aKoViewModel._isValid(), 'initial data is valid' );
                        aKoViewModel.set( 'data.sub1.0.subsub.0.subsubsub.0.value', '' );
                        A.areNotEqual( JSON.stringify( data ), JSON.stringify( aKoViewModel ), 'config data equals not stringify for KoViewModel' );
                        A.areEqual( true, aKoViewModel.isModified(), 'initial data modified' );
                        A.areEqual( true, aKoViewModel._isValid(), 'initial data is still valid, because of async' );

                        self.wait( next, 500 );
                    },
                    /**
                     * setNotModified check
                     */
                        function() {
                        stack.shift();

                        aKoViewModel.setNotModified();
                        A.areEqual( false, aKoViewModel.isModified(), 'not modified after setNotModified' );
                        getValueObservable( aKoViewModel, 'sub1.0.subsub.0.subsubsub.0.value' )('otherValue');
                        A.areEqual( true, aKoViewModel.isModified(), 'modified after setNotModified' );
                        A.areNotEqual(
                            aKoViewModel.get( 'data.sub1.0.subsub.0.subsubsub.0.value'),
                            getValueObservable( aKoViewModel, 'sub1.0.subsub.0.subsubsub.0.value' )(),
                            'data not equals KoViewModel for sub1.0.subsub.0.subsubsub.0.value'
                        );

                        self.wait( next, 500 );
                    },
                    /**
                     * destroy check
                     */
                        function() {
                        stack.shift();

                        A.areEqual( true, aKoViewModel._isValid(), 'modified data is valid again, because of async' );

                        aKoViewModel.destroy();

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test complex schema pure KoViewModel ignoreModificationsOn': function() {
            var
                self = this,
                data = {
                    firstname: 'firstname',
                    lastname: 'lastname',
                    sub1: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}],
                    sub2: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}]
                },
                getValueObservable = Namespace.getValueObservable,
                aKoViewModel = Namespace.createViewModel( {
                    schemaName: 'KoViewModelTest',
                    config: {
                        data: data,
                        validatable: true,
                        ignoreModificationsOn: ['lastname']
                    }
                } ),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * initial check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.getBase(), aKoViewModel, 'instantiation' );
                        A.areEqual( JSON.stringify( data ), JSON.stringify( aKoViewModel ), 'config data equals stringify for KoViewModel' );
                        A.areEqual( false, aKoViewModel.isModified(), 'initial data not modified' );

                        self.wait( next, 500 );
                    },
                    /**
                     * initial valid check
                     */
                        function() {
                        stack.shift();

                        A.areEqual( true, aKoViewModel._isValid(), 'initial data is valid' );
                        aKoViewModel.set( 'data.lastname', 'other_lastname' );
                        A.areNotEqual( JSON.stringify( data ), JSON.stringify( aKoViewModel ), 'config data equals not stringify for KoViewModel' );
                        A.areEqual( false, aKoViewModel.isModified(), 'initial data modified' );
                        A.areEqual( true, aKoViewModel._isValid(), 'initial data is still valid, because of async' );

                        self.wait( next, 500 );
                    },
                    /**
                     * setNotModified check
                     */
                        function() {
                        stack.shift();

                        aKoViewModel.setNotModified();
                        A.areEqual( false, aKoViewModel.isModified(), 'not modified after setNotModified' );
                        getValueObservable( aKoViewModel, 'sub1.0.subsub.0.subsubsub.0.value' )('otherValue');
                        A.areEqual( true, aKoViewModel.isModified(), 'modified after setNotModified' );
                        A.areNotEqual(
                            aKoViewModel.get( 'data.sub1.0.subsub.0.subsubsub.0.value'),
                            getValueObservable( aKoViewModel, 'sub1.0.subsub.0.subsubsub.0.value' )(),
                            'data not equals KoViewModel for sub1.0.subsub.0.subsubsub.0.value'
                        );

                        self.wait( next, 500 );
                    },
                    /**
                     * destroy check
                     */
                        function() {
                        stack.shift();

                        A.areEqual( true, aKoViewModel._isValid(), 'modified data is valid again, because of async' );

                        aKoViewModel.destroy();

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test complex schema extended KoViewModel': function() {

            // constructor creation
            function KoViewModelTest( config ) {
                KoViewModelTest.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( KoViewModelTest, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoViewModelTest', // required, but could be overwritten or provided at instantiation level
                NAME: 'KoViewModelTest' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( KoViewModelTest );

            // constructor creation
            function SubModel( config ) {
                SubModel.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( SubModel, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoSubViewModelTest', // required, but could be overwritten or provided at instantiation level
                NAME: 'SubModel' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( SubModel );

            // constructor creation
            function SubSpecialModel( config ) {
                SubSpecialModel.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( SubSpecialModel, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoSubViewModelTest', // required, but could be overwritten or provided at instantiation level
                NAME: 'SubSpecialModel' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( SubSpecialModel );

            // constructor creation
            function SubsubsubSpecialModel( config ) {
                SubsubsubSpecialModel.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( SubsubsubSpecialModel, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoSubViewModelTest.subsub.subsubsub', // required, but could be overwritten or provided at instantiation level
                NAME: 'SubsubsubSpecialModel' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( SubsubsubSpecialModel );

            var
                data = {
                    firstname: 'firstname',
                    lastname: 'lastname',
                    sub1: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}],
                    sub2: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}]
                },
                getValueObservable = Namespace.getValueObservable,
                aKoViewModel = Namespace.createViewModel( {
                    NAME: 'KoViewModelTest',
                    config: {
                        data: data,
                        getTypeName: function( typeName, propertyName, schemaFullPath ) {
                            if( 'sub2' === propertyName && 'KoViewModelTest' === schemaFullPath ) {
                                return 'SubSpecialModel';
                            }
                            if( 'KoViewModelTest.sub1.subsub' === schemaFullPath ) {
                                return 'SubsubsubSpecialModel';
                            }
                            return false;
                        }
                    }
                } );

            A.areEqual( JSON.stringify( data ), JSON.stringify( aKoViewModel ), 'config data equals stringify for KoViewModelTest' );

            A.areEqual( 'SubModel', getValueObservable( aKoViewModel, 'sub1' )._arrayOf, 'sub1 _arrayOf SubModel' );
            A.areEqual( SubModel, getValueObservable( aKoViewModel, 'sub1.0' ).constructor, 'sub1 model constructor = SubModel' );
            A.areEqual( 'SubsubModel', getValueObservable( aKoViewModel, 'sub1.0.subsub' )._arrayOf, 'sub1.0.subsub _arrayOf SubsubModel' );
            A.areEqual( Namespace.getBase(), getValueObservable( aKoViewModel, 'sub1.0.subsub.0' ).constructor, 'sub1.0.subsub.0 model constructor = KoViewModel' );
            A.areEqual( 'SubsubsubSpecialModel', getValueObservable( aKoViewModel, 'sub1.0.subsub.0.subsubsub' )._arrayOf, 'sub1.0.subsub.0.subsubsub _arrayOf SubsubsubSpecialModel' );
            A.areEqual( SubsubsubSpecialModel, getValueObservable( aKoViewModel, 'sub1.0.subsub.0.subsubsub.0' ).constructor, 'sub1.0.subsub.0.subsubsub.0 constructor = SubsubsubSpecialModel' );

            A.areEqual( 'SubSpecialModel', getValueObservable( aKoViewModel, 'sub2' )._arrayOf, 'sub2 _arrayOf SubSpecialModel' );
            A.areEqual( SubSpecialModel, getValueObservable( aKoViewModel, 'sub2.0' ).constructor, 'sub2.0 constructor = SubSpecialModel' );
            A.areEqual( 'SubsubModel', getValueObservable( aKoViewModel, 'sub2.0.subsub' )._arrayOf, 'sub2.0.subsub _arrayOf SubsubModel' );
            A.areEqual( Namespace.getBase(), getValueObservable( aKoViewModel, 'sub2.0.subsub.0' ).constructor, 'sub2.0.subsub.0 constructor = KoViewModel' );
            A.areEqual( 'SubsubsubModel', getValueObservable( aKoViewModel, 'sub2.0.subsub.0.subsubsub' )._arrayOf, 'sub2.0.subsub.0.subsubsub _arrayOf SubsubsubModel' );
            A.areEqual( Namespace.getBase(), getValueObservable( aKoViewModel, 'sub2.0.subsub.0.subsubsub.0' ).constructor, 'sub2.0.subsub.0.subsubsub.0 constructor = KoViewModel' );

        },
        'test complex schema extended polymorphic KoViewModel ': function() {

            // constructor creation
            function KoViewModelTest( config ) {
                KoViewModelTest.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( KoViewModelTest, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                },
                getPolyTypeName: function() {
                    var result = KoViewModelTest.superclass.getPolyTypeName.apply( this, arguments );
                    switch( result ) {
                        case 'SubKoSubSubBatmanViewModelTestModel':
                            result = 'SubBatmanModel';
                            break;
                    }
                    return result;
                }
            }, {
                // defining static properties
                schemaName: 'KoViewModelTest', // required, but could be overwritten or provided at instantiation level
                NAME: 'KoViewModelTest' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( KoViewModelTest );

            // constructor creation
            function SubBatmanModel( config ) {
                SubModel.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( SubBatmanModel, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoSubSubBatmanViewModelTest', // required, but could be overwritten or provided at instantiation level
                NAME: 'SubBatmanModel' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( SubBatmanModel );

            // constructor creation
            function SubModel( config ) {
                SubModel.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( SubModel, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoSubViewModelTest', // required, but could be overwritten or provided at instantiation level
                NAME: 'SubModel' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( SubModel );

            // constructor creation
            function SubSpecialModel( config ) {
                SubSpecialModel.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( SubSpecialModel, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoSubViewModelTest', // required, but could be overwritten or provided at instantiation level
                NAME: 'SubSpecialModel' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( SubSpecialModel );

            // constructor creation
            function SubsubsubSpecialModel( config ) {
                SubsubsubSpecialModel.superclass.constructor.call( this, config );
            }

            // extending the base class
            Y.extend( SubsubsubSpecialModel, Y.doccirrus.KoViewModel.getBase(), {
                initializer: function() {
                },
                destructor: function() {
                }
            }, {
                // defining static properties
                schemaName: 'KoSubViewModelTest.subsub.subsubsub', // required, but could be overwritten or provided at instantiation level
                NAME: 'SubsubsubSpecialModel' // required, this is the name we are registering for
            } );
            // registering the NAME for a constructor
            Y.doccirrus.KoViewModel.registerConstructor( SubsubsubSpecialModel );

            var
                data = {
                    firstname: 'firstname',
                    lastname: 'lastname',
                    sub1: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false, __polytype: 'KoSubSubBatmanViewModelTest'}],
                    sub2: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}]
                },
                expectedData = {
                    firstname: 'firstname',
                    lastname: 'lastname',
                    sub1: [{name:'',age:'',superpower:false, __polytype: 'KoSubSubBatmanViewModelTest'}],
                    sub2: [{field: 'field', subsub: [{entry: 'entry', subsubsub: [{value: 'value'}]}], name:'',age:'',superpower:false}]
                },
                getValueObservable = Namespace.getValueObservable,
                aKoViewModel = Namespace.createViewModel( {
                    NAME: 'KoViewModelTest',
                    config: {
                        data: data,
                        getTypeName: function( typeName, propertyName, schemaFullPath ) {
                            if( 'sub2' === propertyName && 'KoViewModelTest' === schemaFullPath ) {
                                return 'SubSpecialModel';
                            }
                            if( 'KoViewModelTest.sub1.subsub' === schemaFullPath ) {
                                return 'SubsubsubSpecialModel';
                            }
                            return false;
                        }
                    }
                } );

            A.areEqual( JSON.stringify( expectedData ), JSON.stringify( aKoViewModel ), 'config data equals stringify for KoViewModelTest' );

            A.areEqual( 'SubModel', getValueObservable( aKoViewModel, 'sub1' )._arrayOf, 'sub1 _arrayOf SubModel' );
            A.areEqual( SubBatmanModel, getValueObservable( aKoViewModel, 'sub1.0' ).constructor, 'sub1 model constructor = SubModel' );
            A.areEqual( undefined, getValueObservable( aKoViewModel, 'sub1.0.subsub' ), 'sub1.0.subsub undefined' );

            A.areEqual( 'SubSpecialModel', getValueObservable( aKoViewModel, 'sub2' )._arrayOf, 'sub2 _arrayOf SubSpecialModel' );
            A.areEqual( SubSpecialModel, getValueObservable( aKoViewModel, 'sub2.0' ).constructor, 'sub2.0 constructor = SubSpecialModel' );
            A.areEqual( 'SubsubModel', getValueObservable( aKoViewModel, 'sub2.0.subsub' )._arrayOf, 'sub2.0.subsub _arrayOf SubsubModel' );
            A.areEqual( Namespace.getBase(), getValueObservable( aKoViewModel, 'sub2.0.subsub.0' ).constructor, 'sub2.0.subsub.0 constructor = KoViewModel' );
            A.areEqual( 'SubsubsubModel', getValueObservable( aKoViewModel, 'sub2.0.subsub.0.subsubsub' )._arrayOf, 'sub2.0.subsub.0.subsubsub _arrayOf SubsubsubModel' );
            A.areEqual( Namespace.getBase(), getValueObservable( aKoViewModel, 'sub2.0.subsub.0.subsubsub.0' ).constructor, 'sub2.0.subsub.0.subsubsub.0 constructor = KoViewModel' );

        }
    } ) );

    TestModule.TestRunner.add( suite );

}, '0.0.1', {
    requires: [
        'oop',
        'dc-client-test',
        'KoViewModel',
        'KoViewModelTest-schema'
    ]
} );
