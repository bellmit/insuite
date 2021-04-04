/**
 * User: pi
 * Date: 04/05/17  09:00
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it*/

/**
 * Tests basic functionality of mongoDbCache, htmlCache, dataCache redis helpers.
 */
describe( 'Redis tests', function() {
    const
        mongoDbCache = Y.doccirrus.cacheUtils.mongoDbCache,
        htmlCache = Y.doccirrus.cacheUtils.htmlCache,
        dataCache = Y.doccirrus.cacheUtils.dataCache,
        adapter = Y.doccirrus.cacheUtils.adapter,
        moment = require( 'moment' ),
        mongoose = require( 'mongoose' ),
        model = 'testModel',
        additionalModel = 'additionalTestModel',
        crypto = require( 'crypto' ),
        hash = crypto.createHash( 'md5' ),
        user = Y.doccirrus.auth.getSUForLocal(),
        userHash = hash.update( JSON.stringify( user ) ).digest( 'hex' );
    describe( '1. Check basic functionality of mongoDbCache', function() {
        const
            date = moment(),
            isoDate = date.toISOString(),
            mongoDbCachePrefix = mongoDbCache.getPrefix(),
            query = {
                caseFolderDisabled: {$ne: true},
                patientId: '1221212121',
                actType: 'TREATMENT',
                caseFolderId: '3333333333333',
                timestamp: {
                    $lt_iso: isoDate,
                    $lt_date: date.toDate()
                }
            },
            data = [
                {
                    "_id": new mongoose.Types.ObjectId( "58176b0a4e60b8080fad166b" ),
                    timestamp: moment().toISOString(),
                    "title": "testGoa",
                    "type": "CATALOG",
                    "catalogShort": "GOÄ",
                    "__v": 0
                },
                {
                    "_id": new mongoose.Types.ObjectId( "58176b0a4e60b8080fad166c" ),
                    "title": "common",
                    object: {
                        some: 'data',
                        foo: 'bar'
                    },
                    "type": "CATALOG",
                    "catalogShort": "GOÄ",
                    "__v": 0
                },
                {
                    "_id": new mongoose.Types.ObjectId( "58176b0a4e60b8080fad166d" ),
                    "title": "anotherGoa",
                    "type": "CATALOG",
                    "catalogShort": "GOÄ",
                    array: [1, 2, 3, '44444444'],
                    "__v": 0
                },
                {
                    "_id": new mongoose.Types.ObjectId( "58176b0a4e60b8080fad166f" ),
                    "title": "common",
                    "type": "CATALOG",
                    arrayOfObjects: [
                        {
                            timestamp: moment().toISOString(),
                            "title": "testGoa",
                            "type": "CATALOG",
                            "catalogShort": "GOÄ",
                            "__v": 0
                        },
                        {
                            timestamp: moment().toISOString(),
                            "title": "testGoa",
                            "type": "CATALOG",
                            "catalogShort": "GOÄ",
                            "__v": 0
                        }
                    ],
                    "catalogShort": "EBM",
                    "__v": 0
                }];
        let
            getResult;

        describe( '1.1. basic functionality', function() {
            it( 'Checks properties sorting', function() {
                const
                    templateObject = {
                        c: 'c',
                        d: {},
                        a: [],
                        e: 5,
                        b: true
                    };
                let
                    result = mongoDbCache.sortProperties( templateObject ),
                    keys = Object.keys( result );
                keys.should.have.lengthOf( 5 );
                keys[0].should.equal( 'a' );
                keys[1].should.equal( 'b' );
                keys[2].should.equal( 'c' );
                keys[3].should.equal( 'd' );
                keys[4].should.equal( 'e' );
            } );
            it( 'Checks query key generation (full)', function() {
                let
                    result = mongoDbCache.generateQueryKey( {
                        user,
                        query,
                        model
                    } );
                result.should.equal( `${mongoDbCachePrefix}:1213141513Mocha:000:${userHash}:testModel:\{"actType":"TREATMENT","caseFolderDisabled":\{"$ne":true},"caseFolderId":"3333333333333","patientId":"1221212121","timestamp":\{"$lt_iso":"${isoDate}","$lt_date":"${isoDate}"}}` );
            } );
            it( 'Checks query key generation (model level)', function() {
                let
                    result = mongoDbCache.generateQueryKey( {
                        user,
                        model
                    } );
                result.should.equal( `${mongoDbCachePrefix}:1213141513Mocha:000:${userHash}:testModel:*` );
            } );
            it( 'Checks query key generation (user level)', function() {
                let
                    result = mongoDbCache.generateQueryKey( {
                        user
                    } );
                result.should.equal( `${mongoDbCachePrefix}:1213141513Mocha:000:${userHash}:*:*` );
            } );
            it( 'Checks query key generation (tenant level)', function() {
                let
                    result = mongoDbCache.generateQueryKey( {
                        tenantId: user.tenantId
                    } );
                result.should.equal( `${mongoDbCachePrefix}:1213141513Mocha:*:*:*:*` );
            } );
            it( 'Checks query key generation (mix)', function() {
                let
                    result = mongoDbCache.generateQueryKey( {
                        tenantId: user.tenantId,
                        model
                    } );
                result.should.equal( `${mongoDbCachePrefix}:1213141513Mocha:*:*:testModel:*` );
            } );
            it( 'Checks query key generation ("q" level)', function() {
                let
                    result = mongoDbCache.generateQueryKey( {} );
                result.should.equal( `${mongoDbCachePrefix}:*:*:*:*:*` );
            } );
            it( 'Redis client should be connected', function() {
                should.exist( mongoDbCache.isClientConnected() );
            } );
        } );
        describe( '1.2. set get query', function() {
            it( 'Checks setQuery', function( done ) {
                this.timeout( 20000 );
                mongoDbCache.setQuery( {
                        user,
                        model,
                        query,
                        data
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Checks getQuery', function( done ) {
                this.timeout( 20000 );
                mongoDbCache.getQuery( {
                        user,
                        model,
                        query
                    }, ( err, result ) => {
                        should.not.exist( err );
                        getResult = result;
                        done();
                    }
                );
            } );
            it( 'Checks original data and received from redis', function() {
                let
                    complexKeys = ['_id'];
                should.exist( getResult );
                getResult.should.be.an( 'array' );
                getResult.should.have.lengthOf( data.length );
                for( let i = 0; i < data.length; i++ ) {
                    let
                        original = data[i],
                        fromRedis = getResult[i];
                    should.exist( fromRedis );
                    Object.keys( fromRedis ).should.have.lengthOf( Object.keys( original ).length );
                    Object.keys( original ).forEach( key => { // jshint ignore:line
                        if( complexKeys.includes( key ) ) {
                            fromRedis[key].should.equal( original[key].toJSON() );
                        }
                        if( 'object' === typeof original[key] ) {
                            JSON.stringify( fromRedis[key] ).should.equal( JSON.stringify( original[key] ) );
                        } else {
                            fromRedis[key].should.equal( original[key] );
                        }

                    } );
                }
            } );
        } );
        describe( '1.3. remove cache functionality', function() {
            it( 'Removes all keys for test tenant', function( done ) {
                mongoDbCache.removeCache( {
                    tenantId: user.tenantId
                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Checks redis keys for current tenant', function( done ) {
                const
                    key = mongoDbCache.generateQueryKey( {
                        tenantId: user.tenantId
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 0 );
                    done();
                } );
            } );
            it( 'Sets query for model', function( done ) {
                this.timeout( 20000 );
                mongoDbCache.setQuery( {
                        user,
                        model,
                        query,
                        data
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Sets second query for model', function( done ) {
                this.timeout( 20000 );
                mongoDbCache.setQuery( {
                        user,
                        model,
                        query: Object.assign( {newQuery: true}, query ),
                        data
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Sets query for additional model', function( done ) {
                this.timeout( 20000 );
                mongoDbCache.setQuery( {
                        user,
                        model: additionalModel,
                        query,
                        data
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Sets second query for additional model', function( done ) {
                this.timeout( 20000 );
                mongoDbCache.setQuery( {
                        user,
                        model: additionalModel,
                        query: Object.assign( {newQuery: true}, query ),
                        data
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Removes all model keys for test tenant', function( done ) {
                mongoDbCache.removeCache( {
                    tenantId: user.tenantId,
                    model
                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Checks redis keys for current tenant', function( done ) {
                const
                    key = mongoDbCache.generateQueryKey( {
                        tenantId: user.tenantId
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 2 );
                    done();
                } );
            } );
            it( 'Checks redis model keys for current tenant', function( done ) {
                const
                    key = mongoDbCache.generateQueryKey( {
                        tenantId: user.tenantId,
                        model
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 0 );
                    done();
                } );
            } );
            it( 'Checks redis additional model keys for current tenant', function( done ) {
                const
                    key = mongoDbCache.generateQueryKey( {
                        tenantId: user.tenantId,
                        model: additionalModel
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 2 );
                    done();
                } );
            } );
            it( 'Removes all keys for test tenant', function( done ) {
                mongoDbCache.removeCache( {
                    tenantId: user.tenantId
                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
        } );

    } );
    describe( '2. Check basic functionality of htmlCache', function() {
        const
            fakeIdentityId = 123,
            htmlCachePrefix = htmlCache.getPrefix(),
            url = '/testUrl',
            additionalUrl = '/testUrl_New',
            htmlObject = {
                data: {
                    child: 'text'
                },
                meta: {
                    children: {
                        child: 'child',
                        JadeLoaderMojit: {}
                    },
                    common: {}
                }

            };
        let
            getResult;

        describe( '2.1. basic functionality', function() {
            it( 'Checks html key generation (full)', function() {
                let
                    result = htmlCache.generateHtmlKey( {
                        user,
                        url
                    } );
                result.should.equal( `${htmlCachePrefix}:1213141513Mocha:000:${userHash}:/testUrl` );
            } );
            it( 'Checks html key generation (model level)', function() {
                let
                    result = htmlCache.generateHtmlKey( {
                        user
                    } );
                result.should.equal( `${htmlCachePrefix}:1213141513Mocha:000:${userHash}:*` );
            } );
            it( 'Checks html key generation (tenant level)', function() {
                let
                    result = htmlCache.generateHtmlKey( {
                        tenantId: user.tenantId
                    } );
                result.should.equal( `${htmlCachePrefix}:1213141513Mocha:*:*:*` );
            } );
            it( 'Checks html key generation (mix)', function() {
                let
                    result = htmlCache.generateHtmlKey( {
                        tenantId: user.tenantId,
                        url
                    } );
                result.should.equal( `${htmlCachePrefix}:1213141513Mocha:*:*:/testUrl` );
            } );
            it( 'Checks html key generation ("q" level)', function() {
                let
                    result = htmlCache.generateHtmlKey( {} );
                result.should.equal( `${htmlCachePrefix}:*:*:*:*` );
            } );
            it( 'Redis client should be connected', function() {
                should.exist( htmlCache.isClientConnected() );
            } );
        } );
        describe( '2.2. set get html', function() {
            it( 'Checks setHtml', function( done ) {
                this.timeout( 20000 );
                htmlCache.setHtml( {
                        user,
                        url,
                        data: htmlObject
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Checks getHtml', function( done ) {
                this.timeout( 20000 );
                htmlCache.getHtml( {
                        user,
                        url
                    }, ( err, result ) => {
                        should.not.exist( err );
                        getResult = result;
                        done();
                    }
                );
            } );
            it( 'Checks original data and received from redis', function() {
                should.exist( getResult );
                getResult.should.be.an( 'object' );
                getResult.should.include.all.keys( ['data', 'meta'] );
                getResult.data.should.include.all.keys( 'child' );
                getResult.data.child.should.equal( 'text' );
                getResult.meta.should.include.all.keys( ['children', 'common'] );
                getResult.meta.common.should.be.an( 'object' );
                Object.keys( getResult.meta.common ).should.have.lengthOf( 0 );
                getResult.meta.children.should.be.an( 'object' );
                getResult.meta.children.should.include.all.keys( ['child', 'JadeLoaderMojit'] );
                getResult.meta.children.child.should.equal( 'child' );
                getResult.meta.children.JadeLoaderMojit.should.be.an( 'object' );
                Object.keys( getResult.meta.children.JadeLoaderMojit ).should.have.lengthOf( 0 );
            } );
        } );
        describe( '2.3. remove cache functionality', function() {
            it( 'Removes all keys for test tenant', function( done ) {
                htmlCache.removeCache( {
                    tenantId: user.tenantId
                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Checks redis keys for current tenant', function( done ) {
                const
                    key = htmlCache.generateHtmlKey( {
                        tenantId: user.tenantId
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 0 );
                    done();
                } );
            } );
            it( 'Sets html cache', function( done ) {
                this.timeout( 20000 );
                htmlCache.setHtml( {
                        user,
                        url,
                        data: htmlObject
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Sets second html cache', function( done ) {
                this.timeout( 20000 );
                htmlCache.setHtml( {
                        user,
                        url: additionalUrl,
                        data: htmlObject
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Sets third html cache for different user', function( done ) {
                this.timeout( 20000 );
                htmlCache.setHtml( {
                        tenantId: user.tenantId,
                        identityId: fakeIdentityId,
                        user,
                        url: additionalUrl,
                        data: htmlObject
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Checks redis keys for current tenant', function( done ) {
                const
                    key = htmlCache.generateHtmlKey( {
                        tenantId: user.tenantId
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 3 );
                    done();
                } );
            } );

            it( 'Removes all keys for test user', function( done ) {
                htmlCache.removeCache( {
                    user
                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Checks redis html keys for current tenant', function( done ) {
                const
                    key = htmlCache.generateHtmlKey( {
                        tenantId: user.tenantId
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 1 );
                    done();
                } );
            } );
            it( 'Removes all keys for test tenant', function( done ) {
                htmlCache.removeCache( {
                    tenantId: user.tenantId
                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Checks redis html keys for current tenant', function( done ) {
                const
                    key = htmlCache.generateHtmlKey( {
                        tenantId: user.tenantId
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 0 );
                    done();
                } );
            } );
        } );

    } );
    describe( '3. Check basic functionality of dataCache', function() {
        const
            _key = 'myKeyForData',
            dataCachePrefix = dataCache.getPrefix(),
            dataObject = {
                data: {
                    child: 'text'
                },
                meta: {
                    children: {
                        child: 'child',
                        JadeLoaderMojit: {}
                    },
                    common: {}
                }

            };
        let
            getResult;

        describe( '3.1. basic functionality', function() {
            it( 'Checks data key generation (full level)', function() {
                let
                    result = dataCache.generateDataKey( {
                        key: _key
                    } );
                result.should.equal( `${dataCachePrefix}:tenantId:identityId:*:${_key}` );
            } );
            it( 'Checks data key generation ("d" level)', function() {
                let
                    result = dataCache.generateDataKey( {} );
                result.should.equal( `${dataCachePrefix}:tenantId:identityId:*:*` );
            } );
            it( 'Redis client should be connected', function() {
                should.exist( dataCache.isClientConnected() );
            } );
        } );
        describe( '3.2. set get data', function() {
            it( 'Checks setData', function( done ) {
                this.timeout( 20000 );
                dataCache.setData( {
                        key: _key,
                        data: dataObject
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Checks getHtml', function( done ) {
                this.timeout( 20000 );
                dataCache.getData( {
                        key: _key
                    }, ( err, result ) => {
                        should.not.exist( err );
                        getResult = result;
                        done();
                    }
                );
            } );
            it( 'Checks original data and received from redis', function() {
                should.exist( getResult );
                getResult.should.be.an( 'object' );
                getResult.should.include.all.keys( ['data', 'meta'] );
                getResult.data.should.include.all.keys( 'child' );
                getResult.data.child.should.equal( 'text' );
                getResult.meta.should.include.all.keys( ['children', 'common'] );
                getResult.meta.common.should.be.an( 'object' );
                Object.keys( getResult.meta.common ).should.have.lengthOf( 0 );
                getResult.meta.children.should.be.an( 'object' );
                getResult.meta.children.should.include.all.keys( ['child', 'JadeLoaderMojit'] );
                getResult.meta.children.child.should.equal( 'child' );
                getResult.meta.children.JadeLoaderMojit.should.be.an( 'object' );
                Object.keys( getResult.meta.children.JadeLoaderMojit ).should.have.lengthOf( 0 );
            } );
        } );
        describe( '3.3. remove cache functionality', function() {
            it( 'Removes by key', function( done ) {
                dataCache.removeCache( {
                    key: _key
                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Checks redis keys for current key', function( done ) {
                const
                    key = dataCache.generateDataKey( {
                        key: _key
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 0 );
                    done();
                } );
            } );
            it( 'Sets html cache', function( done ) {
                this.timeout( 20000 );
                dataCache.setData( {
                        key: _key,
                        data: dataObject
                    }, ( err, result ) => {
                        should.not.exist( err );
                        result.should.equal( 'OK' );
                        done();
                    }
                );
            } );
            it( 'Checks redis keys for current key', function( done ) {
                const
                    key = dataCache.generateDataKey( {
                        key: _key
                    } );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 1 );
                    done();
                } );
            } );

            it( 'Removes all keys of data cache', function( done ) {
                dataCache.removeCache( {}, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Checks redis data keys for current tenant', function( done ) {
                const
                    key = dataCache.generateDataKey( {} );
                adapter.keys( {key: `${key}*`}, ( err, data ) => {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    data.should.have.lengthOf( 0 );
                    done();
                } );
            } );
        } );

    } );
} );



