/**
 * User: mahmoud
 * Date: 24/06/15  16:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, describe, it, afterEach, should*/

var genericUtils = Y.dcforms.mapper.genericUtils;
describe( 'genericmapper-util', function() {
    afterEach( function() {
        genericUtils.removeAllFormMappers();
    } );

    describe( 'addFormMapper', function() {
        var mappers,
            fn1 = function() {
            },
            fn2 = function() {
            };
        genericUtils.addFormMapper( {name: 'test2', group: ['test2foobar'], deps: ['test1'], fn: fn1} );
        genericUtils.addFormMapper( {name: 'test1', group: ['test1foo', 'test2foo'], fn: fn2} );

        it( 'should add form mappers', function() {

            mappers = genericUtils.getAllFormMappers();
            mappers.should.have.length( 2 );
            mappers[0].name.should.equal( 'test2' );
            mappers[0].group.should.deep.equal( ['test2foobar'] );
            mappers[0].deps.should.deep.equal( ['test1'] );
            mappers[0].fn.should.equal( fn1 );
            mappers[1].name.should.equal( 'test1' );
            mappers[1].group.should.deep.equal( ['test1foo', 'test2foo'] );
            mappers[1].deps.should.deep.equal( [] );
            mappers[1].fn.should.equal( fn2 );

        } );

    } );

    describe( 'removeAllFormMappers', function() {
        it( 'should remove two form mappers', function() {

            var mappers,
                fn1 = function() {
                },
                fn2 = function() {
                };
            genericUtils.addFormMapper( {name: 'test2', group: ['test2foobar'], deps: ['test1'], fn: fn1} );
            genericUtils.addFormMapper( {name: 'test1', group: ['test1foo', 'test2foo'], fn: fn2} );

            mappers = genericUtils.getAllFormMappers();
            mappers.should.have.length( 2 );
            genericUtils.removeAllFormMappers();
            mappers = genericUtils.getAllFormMappers();
            mappers.should.have.length( 0 );

        } );
    } );

    describe( 'getFormDataByTemplate', function() {

        it( 'should construct formData', function( done ) {

            genericUtils.addFormMapper( {
                name: 'test2', group: ['test2foobar'], deps: ['test1'], fn: function( formData, config, callback ) {
                    formData.test2foobar = formData.test1foo + formData.test1bar;
                    callback();
                }
            } );

            genericUtils.addFormMapper( {
                name: 'test1', group: ['test1foo', 'test2foo'], fn: function( formData, config, callback ) {
                    formData.test1foo = 'foo';
                    formData.test1bar = 'bar';
                    callback();
                }
            } );

            genericUtils.addFormMapper( {
                name: 'test3', group: ['test3hello'], deps: ['test2'], fn: function( formData, config, callback ) {
                    formData.test3hello = 'hello ' + formData.test2foobar;
                    callback();
                }
            } );

            var testTemplate = {
                pages: [
                    {
                        elements: [
                            {
                                schemaMember: 'test2foobar'
                            },
                            {
                                schemaMember: 'test1foo'
                            },
                            {
                                schemaMember: 'test3hello'
                            }

                        ]
                    }
                ]
            };

            genericUtils.getFormDataByTemplate( testTemplate, {/*context obj*/}, function( err, formData ) {
                should.not.exist( err );
                formData.should.deep.equal( {
                    test1foo: 'foo',
                    test1bar: 'bar',
                    test2foobar: 'foobar',
                    test3hello: 'hello foobar'
                } );
                done();
            } );
        } );

        it( 'should call back with circular dependency error', function( done ) {

            genericUtils.addFormMapper( {
                name: 'test2', group: ['test2foobar'], deps: ['test1'], fn: function( formData, config, callback ) {
                    formData.test2foobar = formData.test1foo + formData.test1bar;
                    callback();
                }
            } );

            genericUtils.addFormMapper( {
                name: 'test1',
                group: ['test1foo', 'test2foo'],
                deps: ['test2'],
                fn: function( formData, config, callback ) {
                    formData.test1foo = 'foo';
                    formData.test1bar = 'bar';
                    callback();
                }
            } );

            genericUtils.addFormMapper( {
                name: 'test3', group: ['test3hello'], deps: ['test2'], fn: function( formData, config, callback ) {
                    formData.test3hello = 'hello ' + formData.test2foobar;
                    callback();
                }
            } );

            var testTemplate = {
                pages: [
                    {
                        elements: [
                            {
                                schemaMember: 'test2foobar'
                            },
                            {
                                schemaMember: 'test1foo'
                            },
                            {
                                schemaMember: 'test3hello'
                            }

                        ]
                    }
                ]
            };

            genericUtils.getFormDataByTemplate( testTemplate, {/*context obj*/}, function( err ) {
                err.should.be.an.instanceof( Error );
                done();
            } );
        } );

    } );

} );
