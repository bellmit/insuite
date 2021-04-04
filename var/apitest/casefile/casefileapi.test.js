'use strict';

var
    request = require( 'superagent'),
    should = require( 'should' ),

    _URL = 'http://prcs.dev.dc/1/patient/',

    payloads = {
        addPatient: {
            talk: 'MS',
            title: '',
            firstname: 'Benasir',
            lastname: 'Delir',
            primaryDoc: -1,
            dob: '2001-07-05T00:00:00.000Z',
            gender: 'FEMALE',
            alternativeId: '0123456789'
        }
    };

/**
 * superagent differentiates between error on communication and application level
 * @param testError
 * @param applicationError
 */
function testOnErrors( testError, applicationError ) {
    //appicationError is false if no error exists OR contains the error message
    return testError || ( !applicationError ? undefined : applicationError );
}

describe('request', function() { //open describe #1
    describe('persistent agent', function() { //open describe #2
        var agent = request.agent();

        it('should receive a (maybe empty) list of patients', function(done) {
            agent
                .get( _URL )
                .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
                .set( 'X-Requested-With', 'XMLHttpRequest' )
                .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
                .end( function( err, res ) {
                    should.not.exist( testOnErrors( err, res.error ) );
                    res.should.have.status( 200 );
                    done();
                });
        });

        //should change primaryDoc from -1 to a physician´s id
        it('should create a new patient', function(done) {
            agent
                .post( _URL )
                .send( payloads.addPatient )
                .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
                .set( 'X-Requested-With', 'XMLHttpRequest' )
                .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
                .end( function( err, res ) {
                    var
                        body, result;
                    should.not.exist( testOnErrors( err, res.error ) );
                    res.should.have.status( 200 );

                    body = JSON.parse( res.text );
                    result = body.data;
                    result.should.have.property( '_id' );
                    result.should.have.property( 'primaryDoc' );
                    result.primaryDoc.should.not.equal( '-1' );
                    result.primaryDoc.should.match( /^[a-z0-9]*$/ );
                    payloads.addPatient._id = result._id;

                    done();
                });
        });

        it('should GET all documents for a patient', function(done) {
            agent
                .post( _URL )
                .send( payloads.addPatient )
                .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
                .set( 'X-Requested-With', 'XMLHttpRequest' )
                .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
                .end( function( err, res ) {
                    var
                        body, result;
                    should.not.exist( testOnErrors( err, res.error ) );
                    res.should.have.status( 200 );

                    body = JSON.parse( res.text );
                    result = body.data;
                    result.should.have.property( '_id' );
                    result.should.have.property( 'primaryDoc' );
                    result.primaryDoc.should.not.equal( '-1' );
                    result.primaryDoc.should.match( /^[a-z0-9]*$/ );
                    payloads.addPatient._id = result._id;

                    done();
                });
        });
    } ); //close describe #2
} ); //close describe #1