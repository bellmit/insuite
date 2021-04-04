/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global should, expect, describe, it, after*/



var
    POST_PROCESS_WAIT = 500,
    WRITE_WAIT = 1000,
    utils = require( './testUtils' );

/**
 * clean up mongo collections from well known Ids
 * using /1/ api
 */
function cleanUpWellKnownIds() {
    it( 'clean up API call', function( done ) {
        this.timeout( 4000 );
        utils.post( 'test/:removeWellKnownTestData',
            {
                "models": [
                    {"activity": [{patientId: "54be764fc404c1d77a286d4d"}]},
                    {"casefolder": [{patientId: "54be764fc404c1d77a286d4d"}, {patientId: "577b78a6f3d92d6f3435b14b"}]},
                    {"patient": [{_id: "54be764fc404c1d77a286d4d"}, {_id: "577b78a6f3d92d6f3435b14b"}]},
                    {"location": [{_id: "54eb41b878382da863181d3b"}]},
                    {"basecontact": [{_id: "535e0c283da3b7eb3fac9de7"}]},
                    {"employee": [{_id: "56f5382c37644678aa923d92"}]},
                    {"rule": [{_id: "5774fe73741b60d660fe2b43"}, {_id: "588228e3ff0e589015c671c2"}]},
                    {"identity": [{specifiedBy: "56f5382c37644678aa923d92"}]},
                    {"mirroractivity": [{patientId: "54be764fc404c1d77a286d4d"}]},
                    {"mirrorcasefolder": [{patientId: "54be764fc404c1d77a286d4d"}]},
                    {"mirrorpatient": [{_id: "54be764fc404c1d77a286d4d"}]}
                ]
            }, function( error, body ) {

                should.not.exist( error );
                body.data.should.be.equal( "cleanup finished" );
                done();
            } );
    } );

    it( 'set noCrossLocationAccess to false', function( done ) {
        utils.post( 'test/:setNoCrossLocationAccessToFalse',
            {}, function( error, body ) {
                should.not.exist( error );
                body.data.should.be.equal( "noCrossLocationAccess set to false" );
                done();
            } );
    } );
}

/**
 * set/revert system wide isMocha state to mitigate license checking and switch off rule-engine triggering
 * using /2/test api
 */
function changeMochaState( revert = false ) {
    it( 'set isMocha ', function( done ) {
        utils.post( 'test/:setIsMocha',
            { revert }, function( error ) {
                should.not.exist( error );
                done();
            } );
    } );
}

/**
 * general checks concerning structure of response and meta properties
 * @param {object} params should contain body and error
 * @param {object} options
 */
function insertCommonChecks( params, options ) {
    options = options || {};
    it( 'check error' + (options.negate ? ' (expects ' + (options.errorCode || 'error') + ')' : ''), function() {
        var
            error = params.error,
            errorCode = error && (error.statusCode || error.code);

        if( error && errorCode ) {
            if( options.negate ) {
                (options.errorCode === errorCode || -1 < [400, 500, 403, 404].indexOf( errorCode )).should.equal( true );
            } else {
                // forcing mocha to print error details
                (error && error.message || '').should.be.empty();
                errorCode.should.be.equal( 200 );
            }
        }
        if( options.negate ) {
            should.exist( error );
        } else {
            should.not.exist( error, `error should not exist: ${error && error.message}` );
        }
    } );

    if( !options.negate ) {
        it( 'should contain meta and data', function() {
            var
                body = params.body;

            should.exist( body );
            body.should.be.an( 'object' );
            body.should.contain.keys( ['meta', 'data'] );
            body.meta.should.contain.keys( ['errors', 'warnings', 'query', 'itemsPerPage', 'totalItems', 'page', 'replyCode', 'model'] );
            body.meta.totalItems.should.be.a( 'number' );
        } );
    }
}

/**
 *
 * @param {object} modelName
 * @param {object} testData
 * @param {object} options
 * @param {function} callback
 */
function insertGETSuite( modelName, testData, options, callback ) {
    options = options || {};
    var
        description = options.description ? options.description : ('GET ' + modelName );

    describe( description, function() {
        var
            myData = {};

        after( function() {
            if( callback ) {
                return callback( myData.error, myData.body );
            }
        } );

        it( 'sending GET request', function( done ) {
            var
                query = options.query || {};
            query.itemsPerPage = 500;
            utils.get( modelName, query, function( error, body ) {
                myData.body = body;
                myData.error = error;
                done();
            } );
        } );

        insertCommonChecks( myData, options );
    } );
}

/**
 * callback can be used to chain different suites
 * @param {object} modelName
 * @param {object} testData
 * @param {object} options
 * @param {function} callback called when the suite is done
 */
function insertPOSTSuite( modelName, testData, options, callback ) {
    options = options || {};

    describe( options.description ? options.description : ('POST ' + modelName), function() {
        var
            modelData = ( testData.getData && testData.getData()) || testData,
            myData = {};

        after( function() {
            if( callback ) {
                return callback( myData.error, myData.body );
            }
        } );

        it( 'sending POST request', function( done ) {
            if( modelData.hasOwnProperty('caseFolderId') && !modelData.caseFolderId && options.caseFolderQueryId ){
                modelData.caseFolderId = options.caseFolderQueryId._id;
            }

            modelData.dummyField_ = 'this will be not pass filter';
            utils.post( modelName, modelData, function( error, body ) {
                myData.body = body;
                myData.error = error;
                //modelData._id = body && body.data[0];

                if (body && ('string' === typeof body.data[0]) ) {
                    myData.body = body;
                    modelData._id = body.data[0];
                }

                //in some cases instead of array of Ids whole objects are returned
                if (body && ('object' === typeof body.data[0]) ) {
                    modelData._id = body.data[0]._id;
                    myData.body.data = body.data.map((el) => {
                        return options.simplePost ? el : el._id;
                    });
                }

                done();
            } );
        } );

        insertCommonChecks( myData, options );

        if( options.negate || options.simplePost ) {
            return;
        }

        it( 'result should be an array containing only one string', function( done ) {
            myData.body.data.should.be.instanceof( Array ).and.contain.lengthOf( 1 );
            myData.body.data[0].should.be.a( 'string' );
            done();
        } );

        it( 'GET with id', function( done ) { // checking if the POST was successful
            setTimeout( function() {
                utils.get( modelName, {_id: modelData._id}, function( error, body ) {
                    should.not.exist( error, `error should not exist: ${error && error.message}` );
                    should.exist( body );
                    body.should.be.an( 'object' );
                    should.exist(body.data);
                    body.data.should.be.an( 'array' );
                    body.data[0].should.be.an( 'object' );
                    body.data[0].should.not.contain.keys( ['dummyField_'] );
                    if( modelData.dummyField_ ) {
                        delete modelData.dummyField_;
                    }
                    body.data[0].should.contain.all.keys( Object.keys( ( testData.getPostResult && testData.getPostResult() ) || testData.getParams || modelData ) );

                    done();
                } );
            }, WRITE_WAIT );
        } );
    } );
}

function insertPUTSuite( modelName, testData, options, callback ) {
    options = options || {};

    describe( options.description ? options.description : ('PUT ' + modelName), function() {
        var
            modelData = ( testData.getData && testData.getData()) || testData,
            putData = testData.putParams && testData.putParams.data || testData,
            query,
            myData = {};

        after( function() {
            if( callback ) {
                return callback( myData.error, myData.body );
            }
        } );

        it( 'sending PUT request', function( done ) {
            query = options.query || {_id: modelData._id};
            utils.put( modelName, query, putData, function( error, body ) {
                myData.body = body;
                myData.error = error;
                done();
            } );
        } );

        insertCommonChecks( myData, options );

        if( options.negate ) { // negative test doesn't need checking body
            return;
        }

        it( 'result should be the updated ' + modelName + ' and an array', function( done ) {
            myData.body.data[0].should.be.an( 'object' );
            myData.body.data[0].should.contain.all.keys( Object.keys( ( testData.getPutResult && testData.getPutResult() ) || testData.getParams || modelData ) );
            done();
        } );

    } );
}

/**
 * automates test for DELETE
 * customisable via options
 * @param {object} modelName
 * @param {object} testData
 * @param {object} options
 * @param {function} callback
 */
function insertDELETESuite( modelName, testData, options, callback ) {
    options = options || {};
    var

        modelData = (testData && testData.getData && testData.getData()) || testData;

    describe( options.description ? options.description : ('DELETE ' + modelName), function() {
        var
            query,
            myData = {
                body:{}
            };

        after( function() {
            if( callback ) {
                return callback( myData.error, myData.body );
            }
        } );

        it( 'sending DELETE request', function( done ) {
            query = options.query || {};
            query = (Object.keys(query).length === 0 && query.constructor === Object) ? {_id: modelData._id} : query;

            utils.delete( modelName, query, function( error, body ) {
                myData.body.data = body && body.data;
                myData.body.meta = body && body.meta;
                myData.error = error;
                done();
            } );
        } );

        insertCommonChecks( myData, options );

        if( options.negate ) { // negative test doesn't need checking body
            return;
        }

        if(!options.skipAutoCreated){
            it( 'body.data should contain the deleted ' + modelName + ' within an array', function() {
                myData.body.data[0].should.be.an( 'object' );
                myData.body.data[0].should.contain.all.keys( Object.keys( ( testData.getDeleteResult && testData.getDeleteResult() ) || options.deleteUpsertResult || testData.getParams || modelData ) );
            } );
        }

        if( options.notWhiteListedGet ) { // not white listed gets returns 403 instead of 404
            return;
        }

        it( 'GET the deleted item should return 404', function( done ) { // checking if the DELETE was successful
            // add a small delay for fast systems
            setTimeout( function() {
                utils.get( modelName, query, function( error ) {
                    should.exist( error );
                    error.statusCode.should.be.equal( 404 ); // not found
                    done();
                } );
            }, POST_PROCESS_WAIT );
        } );

    } );
}

/**
 * sends two PUT requests with upsert=true, then deletes the entry
 * expected:
 * first upsert inserts
 * second upsert updates
 *
 * @param {object} modelName
 * @param {object} testData
 * @param {object} options
 * @param {function} callback
 */
function insertUPSERTSuite( modelName, testData, options, callback ) {

    describe( `${modelName} upsert test${( options.negate ? '' : ' (3 attempts)' )}`, function() {
        var
            modelData = testData.getData(),
            myData = {};

        after( function() {
            if( callback ) {
                return callback( myData.error, myData.body );
            }
        } );

        it( 'PUT (1) with upsert=true, _id in data', function( done ) {
            if( modelData.hasOwnProperty('caseFolderId') && !modelData.caseFolderId && options.caseFolderQueryId ){
                modelData.caseFolderId = options.caseFolderQueryId._id;
            }
            utils.put( modelName, {upsert: true}, modelData, function( error, body ) {
                modelData._id = body && body.data && body.data[0] && body.data[0]._id;
                myData.error = error;
                myData.body = body;
                done();
            } );
        } );

        if( options.negate ) { // negative test only need to try once
            insertCommonChecks( myData, options );

            return;
        }

        insertCommonChecks( myData, {} );

        it( 'PUT (2) with upsert=true, _id in data', function( done ) {
            utils.put( modelName, {upsert: true}, modelData, function( error, body ) {
                myData.error = error;
                myData.body = body;
                done();
            } );
        } );

        insertCommonChecks( myData, {} );

        it( 'PUT (3) with upsert=true, _id in query', function( done ) {
            utils.put( modelName, {upsert: true, _id: modelData._id}, modelData, function( error, body ) {
                myData.error = error;
                myData.body = body;
                done();
            } );
        } );

        insertCommonChecks( myData, {} );

        it( 'should have updated the same data', function() {
            var
                data = myData.body.data[0];
            data._id.should.equal( modelData._id );
        } );

        insertDELETESuite( modelName, modelData, {description: 'DELETE the ' + modelName + ' that was just upserted', deleteUpsertResult: ( testData.getDeleteUpsertResult && testData.getDeleteUpsertResult() )} );
    } );
}

/**
 * test all operations that must be supported by any API
 * @param {object} modelName
 * @param {object} testData
 * @param {object} options
 */
function insertCommonSuites( modelName, testData, options ) {
    options = options || {};
    var
        _describe;
    _describe = options.only ? describe.only : describe;
    _describe = options.skip ? describe.skip : describe;

    _describe( options.description || modelName + ' CRUD test' + (options.negate ? ' (error expected)' : ''), function() {

        describe( 'self checks', function() {

            it( 'check test data', function( done ) {
                should.exist( testData );
                testData.should.contain.all.keys( ['getData', 'putParams'] );
                testData.putParams.should.contain.keys( ['data'] );

                // this timeout gives the DB a bit of time to complete post-processes
                // for dev systems
                setTimeout( function() {
                        //console.log( 'cooling down' );
                        done();
                    },
                    POST_PROCESS_WAIT );
            } );
        } );

        options.description = undefined; // already consumed
        insertGETSuite( modelName, testData, options );
        insertPOSTSuite( modelName, testData, options, function afterCb( error, body ) {
            options.query = options.query || {};
            if ( !options.negate ) {
                options.query._id = body.data[0];
            }
        } );
        insertPUTSuite( modelName, testData, options );
        insertDELETESuite( modelName, testData, options );
        insertUPSERTSuite( modelName, testData, options );

    } );
}

function insertCRUDSuites( modelName, testData, options ) {
    options = options || {};
    var
        _describe;
    _describe = options.only ? describe.only : describe;
    _describe = options.skip ? describe.skip : describe;

    _describe( options.description || modelName + ' CRUD test' + (options.negate ? ' (error expected)' : ''), function() {

        describe( 'self checks', function() {

            it( 'check test data', function( done ) {
                should.exist( testData );
                testData.should.contain.all.keys( ['getData', 'putParams'] );
                testData.putParams.should.contain.keys( ['data'] );

                // this timeout gives the DB a bit of time to complete post-processes
                // for dev systems
                setTimeout( function() {
                        //console.log( 'cooling down' );
                        done();
                    },
                    POST_PROCESS_WAIT );
            } );
        } );

        options.description = undefined; // already consumed
        insertGETSuite( modelName, testData, options );
        insertPOSTSuite( modelName, testData, options, function afterCb( error, body ) {
            options.query = options.query || {};
            options.query._id = body.data[0];
        } );
        insertPUTSuite( modelName, testData, options );
        insertDELETESuite( modelName, testData, options );
    } );
}

function insertCommonActivitySuite( modelName, testData, options ) {
    var testData2 = ( ( options.caseFolderType && options.caseFolderType === 'pkv' || utils.countryMode === 'ch' ) ?
            utils.getTestData( 'contract-pkv-test-data' ) :
            utils.getTestData( 'contract-gkv0102-test-data' ) ),
        patientTestData = utils.getTestData( 'patient-test-data' ),
        employeeTestData = utils.getTestData( 'user-test-data' ),
        locationTestData = utils.getTestData( 'location-test-data' );

    describe( modelName + ' Test (Activity Suite)', function() {
        var
            myParams = {
                contract: testData2.getData(),
                patientQuery: {_id: patientTestData.getData()._id},
                employeeQuery: {},
                contractQuery: {},
                caseFolderQuery: {},
                caseFolderQueryId: {},
                diagnosisQuery: {},
                locationQuery: {}
            };
        this.timeout( 16000 );

        // kludgy - should have more sample files!
        myParams.contract.scheinRemittor = '934770004';
        myParams.contract.scheinEstablishment = '700100200';

        cleanUpWellKnownIds();

        // -- SETUP ---
        insertPOSTSuite( 'location', locationTestData, {}, function successCb( error, body ) {
            var locationId = body.data[0];
            myParams.locationQuery._id = locationId;
        } );

        insertPOSTSuite( 'user', employeeTestData, {}, function successCb( error, body ) {
            var employeeId = body.data[0];
            myParams.employeeQuery._id = employeeId;
        } );

        insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
            var patientId = body.data[0];
            myParams.patientQuery._id = patientId;
            myParams.contract.patientId = patientId;
            myParams.contract.timestamp = Date.now();
        } );

        insertPOSTSuite( 'contract', {
            getData(){
                return myParams.contract;
            },
            getPostResult: testData2.getPostResult
        }, {},
        function successCb( error, body ) {
            myParams.contractQuery._id = body.data[0];
        } );

        insertGETSuite( 'contract', {}, {query: myParams.contractQuery}, function successCb( error, body ) {
            var td = testData.putParams.data;
            myParams.caseFolderId = body.data[0].caseFolderId;
            myParams.caseFolderQuery.caseFolderId = body.data[0].caseFolderId;
            myParams.caseFolderQueryId._id = body.data[0].caseFolderId;
            td.patientId = myParams.patientQuery._id;
            td.caseFolderId = body.data[0].caseFolderId;
            td.timestamp = Date.now();
        } );

        // -- The actual test ---
        insertCommonSuites( modelName, testData, {...options, caseFolderQueryId: myParams.caseFolderQueryId} );

        // -- TEAR DOWN ---
        insertDELETESuite( 'contract', {
            getData(){
                return myParams.contract;
            },
            getDeleteResult: testData2.getDeleteResult
        }, {query: myParams.contractQuery} );

        // to speed up further patient deleting
        insertDELETESuite( 'casefolder', {}, { query: myParams.caseFolderQueryId, skipAutoCreated: true } );

        insertDELETESuite( 'patient', patientTestData, {query: myParams.patientQuery} );
        insertDELETESuite( 'user', employeeTestData, {query: myParams.employeeQuery} );
        insertDELETESuite( 'location', locationTestData, {query: myParams.locationQuery} );
    } );
}

/*function insertCommonActivitySuite( modelName, testData, options ) {
    var
        patientTestData = utils.getTestData( 'patient-test-data' ),
        employeeTestData = utils.getTestData( 'user-test-data' );

    // decide if we are doing private or public insurance
    if( options.pkv ) {
        utils.addTestData( testData, 'contract-pkv-test-data' );
    } else {
        utils.addTestData( testData, 'contract-gkv0102-test-data' );
    }

    describe( modelName + ' Test (Activity Suite)', function() {
        // -- Setup the test ---
        insertPOSTSuite( 'user', employeeTestData, {}, function successCb( error, body ) {
            processIdsForNextStep( body, testData );
        } );

        insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
            processIdsForNextStep( body, testData );
        } );

        insertPOSTSuite( 'contract', testData.contract, {}, function successCb( error, body ) {
            processIdsForNextStep( body, testData );
        } );

        insertGETSuite( 'contract', {}, {query: getContractIdQuery()}, function successCb( error, body ) {
            processCaseFolderData( body, testData );
        } );

        // -- The actual test of all CRUD functions for the model ---
        insertCommonSuites( modelName, testData, options );

        insertDELETESuite( 'contract', {}, {query: getContractIdQuery()});
        insertDELETESuite( 'patient', patientTestData );
        insertDELETESuite( 'user', employeeTestData );
    } );
}*/

/**
 * Deep check that the data and testData properties are same type
 *
 * @param {String} modelName
 * @param {Object} data
 * @param {Object} testData
 */
function matchDataPropertiesTypes( modelName, data, testData ) {
    // Deep check all testData properties and its type
    Object.keys( data ).forEach( function ( key ) {
        switch ( true ) {
            case Array.isArray( data[ key ] ):
                it(`${ modelName } => should contain ${key} property and it must be an array`, function() {
                    should.exist(data[key]);
                    testData[key].should.be.an('array');
                });

                data[ key ].forEach( function ( dataArrayItem, index ) {
                    var arrayItemKeyName = `${key}_${index}`;

                    matchDataPropertiesTypes(
                        `${modelName}_${key}`,
                        {
                            [ arrayItemKeyName ]: dataArrayItem
                        },
                        {
                            [ arrayItemKeyName ]: testData[ key ][ index ]
                        }
                    );
                } );

                break;
            case Object.prototype.toString.call( data[ key ] ) === "[object Object]":
                it(`${ modelName } => should contain ${key} property and it must be an object`, function() {
                    should.exist(data[key]);
                    testData[key].should.be.an('object');
                });

                matchDataPropertiesTypes( `${modelName}_${key}`, data[ key ], testData[ key ] );
                break;
            case typeof data[ key ] === 'string':
                it(`${ modelName } => should contain ${key} property and it must be string`, function() {
                    testData[key].should.be.an('string');
                });
                break;
            case typeof data[ key ] === 'number':
                it(`${ modelName } => should contain ${key} property and it must be number`, function() {
                    testData[key].should.be.an('string');
                });
                break;
            case Object.prototype.toString.call( data[ key ] ) === "[object Null]":
                it(`${ modelName } => should contain ${key} property and it must be null`, function() {
                    expect( testData[key] ).to.equal( null );
                });
                break;
        }
    } );
}


module.exports = {
    insertCommonSuites,
    insertCRUDSuites,
    insertGETSuite,
    insertPOSTSuite,
    insertPUTSuite,
    insertDELETESuite,
    insertCommonActivitySuite,
    insertCommonChecks,
    cleanUpWellKnownIds,
    changeMochaState,
    matchDataPropertiesTypes
};