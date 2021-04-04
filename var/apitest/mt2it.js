'use strict';

var
    request = require( 'superagent'),
    assert = require( 'assert' ),
    should = require( 'should' ),

    URL = 'http://prcs.dev.dc/r/mt2it/',
    payloads = {
        addWoundPatient: {
            action: 'AddWoundPatient',
            talk: 'MS',
            title: '',
            firstname: 'Benasir',
            lastname: 'Delir',
            primaryDoc: -1,
            dob: '2001-07-05T00:00:00.000Z',
            gender: 'FEMALE',
            alternativeId: '0123456789'
        },
        addWoundPatientData: {
            action: 'AddWoundPatientData',
            alternativeId: '0123456789',
            caseNo: '9876543210',
            findings:
                [ {
                    "type": "OTHER",
                    "content": "xyz",
                    "contentType": "PNG/IMAGE",
                    "docId": "0123456789-012345-ABCDEFGH"
                },
                {
                    "type": "OTHER",
                    "content": "xyz",
                    "contentType": "PNG/IMAGE",
                    "docId": "0123456789-012346-ABCDEFGH"
                } ]
        },
        getWoundPatient: {
            action: 'GetWoundPatient'
        },
        getWoundPatientData: {
            action: 'GetWoundPatientData',
            alternativeId: '0123456789',
            caseNo: '9876543210'
        }
    };

describe('request', function() { //open describe #1
    describe('persistent agent', function() { //open describe #2
        var agent = request.agent();

        it('should gain a session on POST', function(done) {
            agent
                .post('http://localhost:4000/signin')
                .end(function(err, res) {
                    should.not.exist(err);
                    res.should.have.status(200);
                    should.not.exist(res.headers['set-cookie']);
                    res.text.should.include('dashboard');
                    done();
                });
        });
    } ); //close describe #2
} ); //close describe #1


request
    .post( URL )
    .send( payloads.addWoundPatient )
    .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
    .set( 'X-Requested-With', 'XMLHttpRequest' )
    .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
    .end( function( error, res ){

        if ( error ) {
            console.log( 'AddWoundPatient: ' + + error );
        }

        var obj = JSON.parse( res.text || '{}' );
        console.log( 'AddWoundPatient: ' );
        //console.dir( obj );
        console.log( 'AddWoundPatient: ' +
            ( obj ? 'Data set was entered successfully!' : 'No response for AddWoundPatient' ) );

    });

request
    .post( URL )
    .send( payloads.addWoundPatientData )
    .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
    .set( 'X-Requested-With', 'XMLHttpRequest' )
    .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
    .end( function( error, res ){

        if ( error ) {
            console.log( 'AddWoundPatientData: ' + error );
        }

        var obj = JSON.parse( res.text || '{}' );
        console.log( 'AddWoundPatientData: ' );
        //console.dir( obj );
        console.log( 'AddWoundPatientData: ' +
            ( 2 === obj.length && 'fulfilled' === obj[0].state && 'fulfilled' === obj[1].state ?
                'Activity was added.' : 'Activity NOT added.' ) );
    });


request
    .post( URL )
    .send( payloads.getWoundPatientData )
    .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
    .set( 'X-Requested-With', 'XMLHttpRequest' )
    .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
    .end( function( error, res ){

        if ( error ) {
            console.log( 'GetWoundPatientData: ' + error );
        }

        var obj = JSON.parse( res.text || '{}' );
        console.log( 'GetWoundPatientData: ' );
        console.dir( obj );

    });

/*
request
    .post( URL )
    .send( { action: 'GetWoundPatients' })
    .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
    .set( 'X-Requested-With', 'XMLHttpRequest' )
    .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
    .end( function( error, res ){

        console.log( error );
        console.log( res );

    });
*/