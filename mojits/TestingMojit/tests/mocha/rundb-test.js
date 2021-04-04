/**
 * User: pi
 * Date: 04/05/17  09:00
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it*/

const
    moment = require( 'moment' ),
    mongoose = require( 'mongoose' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    patientId = new mongoose.Types.ObjectId().toString(),
    caseFolderId = new mongoose.Types.ObjectId().toString(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    mainLocationId = new mongoose.Types.ObjectId().toString(),
    user = Y.doccirrus.auth.getSUForLocal();

function getScheinData( config = {} ) {
    let
        date = moment( mochaUtils.generateNewDate() ),
        schein = {
            actType: 'SCHEIN',
            timestamp: date.toISOString(),
            patientId,
            scheinQuarter: date.get( 'quarter' ),
            scheinYear: date.get( 'year' ),
            status: 'VALID',
            scheinType: '0101',
            scheinSubgroup: '00',
            caseFolderId,
            locationId: mainLocationId,
            employeeId
        };
    schein = mochaUtils.getActivityData( Object.assign( schein, config ) );
    return schein;
}

describe( 'mongodb.runDb tests', function() {
    describe( '1. Checks basic functionality of runDb', function() {
        let
            id,
            getResult;
        const
            newText = "testGoatest",
            newText2 = "another text",
            newText3 = 432123;
        describe( '1.0. action "post"', function() {
            it( 'cleans db', function( done ) {
                this.timeout( 20000 );
                mochaUtils.cleanDB( {user}, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Does post action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'post',
                    data: {
                        title: "testGoa",
                        type: "CATALOG",
                        catalogShort: "GOÄ",
                        skipcheck_: true
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    result.should.have.lengthOf( 1 );
                    id = result[0];
                    done();
                } );
            } );
            it( 'Checks id', function() {
                should.exist( id );
                id.should.be.a( 'string' );
            } );
        } );
        describe( '1.1. action "mongoUpdate"', function() {
            it( 'Does mongoUpdate action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'mongoUpdate',
                    query: {
                        _id: new mongoose.Types.ObjectId( id )
                    },
                    data: {
                        $set: {title: newText}
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.result.nModified.should.equal( 1 );
                    result.result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does get action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'get',
                    query: {
                        _id: id
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    result[0].title.should.equal( newText );
                    done();
                } );
            } );
            it( 'Does mongoUpdate action without query and data', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'mongoUpdate'
                }, ( err, result ) => {
                    should.exist( err );
                    should.not.exist( result );
                    done();
                } );
            } );
            it( 'Does mongoUpdate action with empty query and without "multi" flag', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'mongoUpdate',
                    query: {},
                    data: {
                        $set: {title: newText}
                    }
                }, ( err, result ) => {
                    should.exist( err );
                    should.not.exist( result );
                    done();
                } );
            } );
            it( 'Does mongoUpdate action with empty query and "multi" flag', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'mongoUpdate',
                    query: {},
                    data: {
                        $set: {title: newText2}
                    },
                    options: {
                        multi: true
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.result.nModified.should.equal( 1 );
                    result.result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does mongoUpdate action. Number is passed to string prop. "title".', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'mongoUpdate',
                    query: {
                        _id: new mongoose.Types.ObjectId( id )
                    },
                    data: {
                        $set: {title: newText3}
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.result.nModified.should.equal( 1 );
                    result.result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does get action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'get',
                    query: {
                        _id: id
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    getResult = result[0].title;
                    done();
                } );
            } );
            it( 'Checks that $set data was not casted', function() {
                getResult.should.be.a( 'number' );
                getResult.should.equal( newText3 );
            } );
        } );
        describe( '1.2. action "update"', function() {
            it( 'Does update action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'update',
                    query: {
                        _id: id
                    },
                    data: {
                        $set: {title: newText}
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.nModified.should.equal( 1 );
                    result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does get action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'get',
                    query: {
                        _id: id
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    result[0].title.should.equal( newText );
                    done();
                } );
            } );
            it( 'Does update action without query and data', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'update'
                }, ( err, result ) => {
                    should.exist( err );
                    should.not.exist( result );
                    done();
                } );
            } );
            it( 'Does update action with empty query and without "multi" flag', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'update',
                    query: {},
                    data: {
                        $set: {title: newText}
                    }
                }, ( err, result ) => {
                    should.exist( err );
                    should.not.exist( result );
                    done();
                } );
            } );
            it( 'Does update action with empty query and "multi" flag', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'update',
                    query: {},
                    data: {
                        $set: {title: newText2}
                    },
                    options: {
                        multi: true
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.nModified.should.equal( 1 );
                    result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does update action by string _id. Number is passed to string prop. "title".', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'update',
                    query: {
                        _id: id
                    },
                    data: {
                        $set: {title: newText3}
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.nModified.should.equal( 1 );
                    result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does get action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'get',
                    query: {
                        _id: id
                    }
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    getResult = result[0].title;
                    done();
                } );
            } );
            it( 'Check that $set data was casted', function() {
                getResult.should.be.a( 'string' );
                getResult.should.equal( newText3.toString() );
            } );
        } );
    } );
    describe( '2. Check discriminators', function() {
        describe( '2.0. Setup.', function() {
            it( 'clean db', function( done ) {
                this.timeout( 20000 );
                mochaUtils.cleanDB( {user}, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'Insert location', function( done ) {
                let
                    locationData = mochaUtils.getLocationData( {
                        _id: mainLocationId
                    } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( locationData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( mainLocationId );
                    done();
                } );
            } );
            it( 'Insert patient', function( done ) {
                let
                    patientData = mochaUtils.getPatientData( {
                        firstname: 'test',
                        lastname: 'patient',
                        _id: patientId
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( patientId );
                    done();
                } );
            } );
            it( 'Insert GKV caseFolder', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        patientId: patientId,
                        _id: caseFolderId
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( caseFolderId );
                    done();
                } );
            } );
            it( 'Insert employee', function( done ) {
                let
                    employeeData = mochaUtils.getEmployeeData( {
                        _id: employeeId
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( employeeId );
                    done();
                } );
            } );

        } );
        describe( '2.1. Test activity update/mongoUpdate operations', function() {
            let
                scheinId,
                firstUpdate = {
                    untersArt: 'untersArt'
                },
                secondUpdate = {
                    auBis: 'auBis'
                },
                getResult;
            it( 'Posts activity', function( done ) {
                let schein = getScheinData( {} );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    should.not.exist( err );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    scheinId = results[0];
                    done();
                } );
            } );
            it( 'Does activity "update"', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'update',
                    query: {
                        _id: scheinId
                    },
                    data: firstUpdate
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.nModified.should.equal( 1 );
                    result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does activity "get"', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: scheinId
                    }
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    getResult = result[0];
                    done();
                } );
            } );
            it( 'Checks get result', function() {
                should.exist( getResult );
                should.exist( getResult.untersArt );
                getResult.untersArt.should.equal( firstUpdate.untersArt );
            } );

            it( 'Does activity "mongoUpdate"', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'mongoUpdate',
                    query: {
                        _id: new mongoose.Types.ObjectId( scheinId )
                    },
                    data: secondUpdate
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'object' );
                    result.result.nModified.should.equal( 1 );
                    result.result.ok.should.equal( 1 );
                    done();
                } );
            } );
            it( 'Does activity "get"', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: scheinId
                    }
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    getResult = result[0];
                    done();
                } );
            } );
            it( 'Checks get result', function() {
                should.exist( getResult );
                should.exist( getResult.auBis );
                getResult.auBis.should.equal( secondUpdate.auBis );
            } );
        } );
        describe( '3.1. Test activity mongoInsertOne operations', function() {
            let
                insertOneResult,
                insertOneActivityData = {
                    test: 'insertOneActivityData',
                    actType: 'TEST'
                },
                insertOneActivity;
            it( 'Does "mongoInsertOne" action activity', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'mongoInsertOne',
                    data: insertOneActivityData
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    insertOneResult = result;
                    done();
                } );
            } );
            it( 'Checks "mongoInsertOne" action result', function() {
                insertOneResult.should.be.an( 'Object' );
                insertOneResult.insertedCount.should.equal( 1 );
                insertOneResult.insertedId.should.be.an( 'object' );
            } );
            it( 'Gets inserted activity via "mongoInsertOne"', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: insertOneResult.insertedId
                    }
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    insertOneActivity = result[0];
                    done();
                } );
            } );
            it( 'Checks inserted activity via "mongoInsertOne"', function() {
                insertOneActivity.should.be.an( 'Object' );
                insertOneActivity.test.should.equal( insertOneActivityData.test );
                insertOneActivity.actType.should.equal( insertOneActivityData.actType );
                insertOneActivity.__t.should.equal( insertOneActivityData.actType );
            } );
            it( 'Tries to insert array via "mongoInsertOne" action', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'mongoInsertOne',
                    data: [insertOneActivityData]
                }, function( err, result ) {
                    should.exist( err );
                    err.name.should.equal( 'MongoError' );
                    err.message.should.equal( 'doc parameter must be an object' );
                    should.not.exist( result );
                    done();
                } );
            } );
        } );

        describe( '3.2. Test activity mongoInsertMany operations', function() {
            let
                insertManyResult,
                insertManyActivityData = [
                    {
                        test: 'insertManyActivityData 1',
                        actType: 'TEST 1'
                    }, {
                        test: 'insertManyActivityData 2',
                        actType: 'TEST 2'
                    }],
                insertManyActivities;
            it( 'Does "mongoInsertMany" action activity', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'mongoInsertMany',
                    data: insertManyActivityData
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    insertManyResult = result;
                    done();
                } );
            } );
            it( 'Checks "mongoInsertOne" action result', function() {
                insertManyResult.should.be.an( 'Object' );
                insertManyResult.insertedCount.should.equal( 2 );
                insertManyResult.insertedIds.should.be.an( 'Object' ).which.has.all.keys( '0', '1' );
            } );
            it( 'Gets inserted activity via "mongoInsertMany"', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: {$in: Object.keys( insertManyResult.insertedIds ).map( key => insertManyResult.insertedIds[key] )}
                    }
                }, function( err, result ) {
                    setImmediate( () => {
                        should.not.exist( err );
                        should.exist( result );
                        result.should.be.an( 'array' );
                        insertManyActivities = result;
                        done();
                    } );
                } );
            } );
            it( 'Checks inserted activity via "mongoInsertMany"', function() {
                insertManyActivities.forEach( ( activity, index ) => {
                    activity.should.be.an( 'Object' );
                    activity.test.should.equal( insertManyActivityData[index].test );
                    activity.actType.should.equal( insertManyActivityData[index].actType );
                    activity.__t.should.equal( insertManyActivityData[index].actType );
                } );

            } );
            it( 'Negative test for "mongoInsertMany" action activity', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'mongoInsertMany',
                    data: insertManyActivityData[0]
                }, function( err, result ) {
                    should.exist( err );
                    err.name.should.equal( 'MongoError' );
                    err.message.should.equal( 'docs parameter must be an array of documents' );
                    should.not.exist( result );
                    done();
                } );
            } );
        } );
    } );
} );



