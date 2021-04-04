/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, user, should, describe, it*/

(function() {
    describe( '1. Socket controller functionality', function() {
        let
            message = {
                api: 'activity.read',
                user: user,
                data: {},
                query: {
                    patientId: "563c6d1f293e784703bb219a",
                    caseFolderId: "56ab816a78de3ed905f93d0a"
                },
                options: {
                    fields: { code: 1, patientId: 1, employeeName: 1 },
                    sort: { "timestamp": -1 },
                    page: 1,
                    itemsPerPage: 1
                }
            },
            messageWithData = {
                api: 'test.testSocketApiCall',
                user: user,
                data: {
                    someData: 'someData'
                },
                query: {
                    someQuery: 'value'
                },
                options: {
                    fields: { code: 1, patientId: 1, employeeName: 1 }
                }

            };
        it( '1.1. User object should be set', function() {
            should.exist( user );
            user.should.have.property( 'tenantId' );
        } );

        it( '1.2. Request handler should return correct structure', function( done ) {
            Y.doccirrus.socketIOController.handleRequest( message, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.be.an( 'object' );
                result.should.have.property( 'meta' )
                    .that.is.a( 'object' );
                result.should.have.property( 'data' )
                    .that.is.a( 'array' );
                done();
            } );
        } );

        it( '1.3. Request handler should be able to provide data, query, options to api', function( done ) {
            Y.doccirrus.socketIOController.handleRequest( messageWithData, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.be.an( 'object' );
                result.should.have.property( 'meta' )
                    .that.is.a( 'object' );
                result.should.have.property( 'data' )
                    .that.is.an( 'object' ).that.has.all.key( [ 'field', 'field2' ] );
                done();
            } );
        } );

        it( '1.4. Response handler should parse success answer correctly', function() {
            let
                response = {
                    meta: {
                        errors: [],
                        warnings: [],
                        query: { patientId: { $exists: true } },
                        itemsPerPage: 1,
                        totalItems: 6,
                        page: 1,
                        replyCode: 200
                    },
                    data: [
                        {
                            _id: '56c1e12c4cf8f4c90d3ef827',
                            employeeName: 'Sparrow, Jack',
                            timestamp: '2016-02-15T14:31:08.130Z',
                            patientId: '563c6d1f293e784703bb219a'
                        } ]
                };

            Y.doccirrus.socketIOController.handleResponse( response, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.be.an( 'array' );
                should.exist( result[ 0 ] );
                result[ 0 ].should.be.an( 'object' );
                result[ 0 ].should.have.all.keys( [ '_id', 'employeeName', 'timestamp', 'patientId' ] );
            } );
        } );
        it( '1.5. Response handler should parse answer with native error correctly', function() {
            let
                response = {
                    errors: [
                        {
                            message: 'Cast to ObjectId failed for value "blabla" at path "_id"',
                            name: 'CastError',
                            kind: 'ObjectId',
                            value: 'blabla',
                            path: '_id'
                        } ],
                    warnings: [],
                    query: null,
                    itemsPerPage: 1,
                    page: 1,
                    replyCode: 200
                };

            Y.doccirrus.socketIOController.handleResponse( response, function( err, result ) {
                should.exist( err );
                err.should.be.an( 'error' );
                err.should.have.property( 'message', 'Cast to ObjectId failed for value "blabla" at path "_id"' );
                should.not.exist( result );
            } );
        } );
        it( '1.6. Response handler should parse answer with dc error correctly', function() {
            let
                response = {
                    errors: [ { code: 7201, data: 'data is missing' } ],
                    warnings: [],
                    query: null,
                    itemsPerPage: null,
                    page: null,
                    replyCode: 200
                };

            Y.doccirrus.socketIOController.handleResponse( response, function( err, result ) {
                should.exist( err );
                err.should.be.an.instanceOf( Y.doccirrus.commonerrors.DCError );
                err.should.have.property( 'message', 'Sie können nur eine Einstellung pro Betriebsstätte vornehmen.' );
                should.not.exist( result );
            } );
        } );

    } );
    describe( '2. call external api functionality', function() {
        let
            publicKey = '5sgyy+GiMJpzOGYy1p1BmgU0CO6IxEbck9OopnxgdXy7LEUVTXYSlEFOIB8KGaNj8mPFwm9eMpzALfZfWIk3OA==';
        describe( '2.1. Check call to another tenant. Using public key.', function() {

            it( '2.1.1. public key should be set by TESTER', function() {
                should.exist( publicKey );
                publicKey.should.be.a( 'string' );
                publicKey.should.not.equal( '' );
            } );

            it( '2.1.2. Call should be able to pass data, query, options', function( done ) {
                Y.doccirrus.socketIOPRC.callExternalApi( {
                    targetPublicKey: publicKey,
                    api: 'test.testSocketApiCall',
                    user: user,
                    query: {
                        someQuery: { $exists: true }
                    },
                    options: {
                        fields: [ 'field1' ]
                    },
                    data: {
                        someData: [ '10311' ]
                    },
                    callback: function( err, data ) {
                        should.not.exist( err );
                        should.exist( data );
                        data.should.be.an( 'object' ).that.has.all.key( [ 'field', 'field2' ] );
                        done();
                    }
                } );
            } );
            it( '2.1.3. Successful call should pass data as second callback argument.', function( done ) {
                Y.doccirrus.socketIOPRC.callExternalApi( {
                    targetPublicKey: publicKey,
                    api: 'activity.read',
                    user: user,
                    query: {
                        patientId: { $exists: true }
                    },
                    options: {
                        fields: { timestamp: 1, patientId: 1, employeeName: 1 },
                        sort: { "timestamp": -1 },
                        page: 1,
                        itemsPerPage: 1,
                        pureLog: true
                    },
                    data: {
                        someField: 'true'
                    },
                    callback: function( err, data ) {
                        should.not.exist( err );
                        should.exist( data );
                        data.should.be.an( 'array' );
                        should.exist( data[ 0 ] );
                        data[ 0 ].should.have.all.keys( [ '_id', 'timestamp', 'patientId', 'employeeName' ] );
                        done();
                    }
                } );
            } );

            it( '2.1.4. Call that causes mongoose error should call callback with javascript Error', function( done ) {
                Y.doccirrus.socketIOPRC.callExternalApi( {
                    targetPublicKey: publicKey,
                    api: 'activity.read',
                    user: user,

                    query: {
                        _id: 'blabla',
                        patientId: { $exists: true }
                    },
                    options: {
                        fields: { timestamp: 1, patientId: 1, employeeName: 1 },
                        sort: { "timestamp": -1 },
                        page: 1,
                        itemsPerPage: 1,
                        pureLog: true
                    },
                    data: {
                        someField: 'true'
                    },
                    callback: function( err, data ) {
                        should.exist( err );
                        err.should.be.an( 'error' );
                        should.not.exist( data );
                        done();
                    }
                } );
            } );

            it( '2.1.5. Call that causes validation error should call callback with DCError error', function( done ) {
                Y.doccirrus.socketIOPRC.callExternalApi( {
                    targetPublicKey: publicKey,
                    api: 'test.testSocketApiCall',
                    user: user,
                    query: {
                        patientId: { $exists: true }
                    },
                    options: {},
                    data: {},
                    callback: function( err, data ) {
                        should.exist( err );
                        err.should.be.an.instanceOf( Y.doccirrus.commonerrors.DCError );
                        err.should.contain.all.key( [ 'code' ] );
                        should.not.exist( data );
                        done();
                    }
                } );
            } );

            it( '2.1.5. Invalid call should call callback with DCError error', function( done ) {
                Y.doccirrus.socketIOPRC.callExternalApi( {
                    targetPublicKey: publicKey,
                    user: user,
                    callback: function( err, data ) {
                        should.exist( err );
                        err.should.be.an.instanceOf( Y.doccirrus.commonerrors.DCError );
                        err.should.contain.all.key( [ 'code' ] );
                        should.not.exist( data );
                        done();
                    }
                } );
            } );

            it( '2.1.6. Call should call callback with DCError with code 503 if target system is not online', function( done ) {
                Y.doccirrus.socketIOPRC.callExternalApi( {
                    targetPublicKey: 'D9PJuNgFRa/s+/1f/iSPpN091PLvXukACBbRWHXR+tA06fItLpXmbSBKqzqBU1YZ8Nohs/QctSZL4/M1v1zWng==1',
                    api: 'test.testSocketApiCall',
                    user: user,
                    query: {
                        someQuery: { $exists: true }
                    },
                    options: {
                        fields: [ 'field1' ]
                    },
                    data: {
                        someData: [ '10311' ]
                    },
                    callback: function( err, data ) {
                        should.exist( err );
                        err.should.have.property( 'code', 503 );
                        err.should.be.an.instanceOf( Y.doccirrus.commonerrors.DCError );
                        should.not.exist( data );
                        done();
                    }
                } );
            } );

            it( '2.1.6. Call should not be possible to make external call without target public key', function( done ) {
                Y.doccirrus.socketIOPRC.callExternalApi( {
                    api: 'test.testSocketApiCall',
                    user: user,
                    query: {
                        someQuery: { $exists: true }
                    },
                    options: {
                        fields: [ 'field1' ]
                    },
                    data: {
                        someData: [ '10311' ]
                    },
                    callback: function( err, data ) {
                        should.exist( err );
                        err.should.have.property( 'code', 400 );
                        err.should.be.an.instanceOf( Y.doccirrus.commonerrors.DCError );
                        should.not.exist( data );
                        done();
                    }
                } );
            } );

            it( '2.1.7 It should be possible to make external call by dcCustomerNo', function( done ) {
                Y.doccirrus.communication.callExternalApiByCustomerNo( {
                    api: 'test.testSocketApiCall',
                    dcCustomerNo: '1001',
                    user: user,
                    query: {
                        someQuery: { $exists: true }
                    },
                    options: {
                        fields: [ 'field1' ]
                    },
                    data: {
                        someData: [ '10311' ]
                    },
                    callback: function( err, data ) {
                        should.not.exist( err );
                        should.exist( data );
                        data.should.be.an( 'object' ).that.has.all.key( [ 'field', 'field2' ] );
                        done();
                    }
                } );
            } );

            it( '2.1.7 It should be possible to make external call by system subtype( using "INCARE" )', function( done ) {
                Y.doccirrus.communication.callExternalApiBySystemType( {
                    api: 'test.testSocketApiCall',
                    systemType: Y.doccirrus.dispatchUtils.getModuleSystemType( user.tenantId, Y.doccirrus.schemas.company.systemTypes.INCARE ),
                    user: user,
                    query: {
                        someQuery: { $exists: true }
                    },
                    options: {
                        fields: [ 'field1' ]
                    },
                    data: {
                        someData: [ '10311' ]
                    },
                    callback: function( err, data ) {
                        should.not.exist( err );
                        should.exist( data );
                        data.should.be.an( 'object' ).that.has.all.key( [ 'field', 'field2' ] );
                        done();
                    }
                } );
            } );

        } );

    } );
    describe( '3. (V)PRC - PUC functionality', function() {
        it( '3.1. It should be possible to make PUC call from (V)PRC', function( done ) {
            Y.doccirrus.socketIOPRC.callPUCAction( {
                    action: 'getOnlineSystemList'
                },
                function( err, data ) {
                    should.not.exist( err );
                    should.exist( data );
                    data.should.be.an( 'array' );
                    done();
                } );
        } );
    } );

})();
