/**
 * User: do
 * Date: 30.12.19  15:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db:true, ObjectId, ISODate, print, printjsononeline */

db.patients.find( {
    _id: {
        $in: ['5d9102187a5e77003eeb76a4', '5d91021d7a5e77003eec45e2', '5d91021b7a5e77003eec09cb', '5d9102227a5e77003eed08ad'].map( function( id ) {
            return ObjectId( id );
        } )
    }
} ).forEach( function( patient ) {
    print( `PAT ${patient._id.str}` );
    if( patient.insuranceStatus.length > 1 ) {
        print( 'STOP more than one insurance' );
        return;
    }

    const hasCdm = patient.insuranceStatus.some( function( insurance ) {
        return Boolean( insurance.cdmVersion );
    } );

    if( hasCdm ) {
        print( 'STOP has cdm' );
        return;
    }

    var result = db.patientversions.update( {
        patientId: patient._id.str,
        'insuranceStatus.0.cdmVersion': null,
        timestamp: {$gt: ISODate( "2019-10-01T02:00:00.000Z" ), $lt: ISODate( "2020-01-01T02:00:00.000Z" )}
    }, {$set: {'insuranceStatus.0.cdmVersion': '5.2.0 ', 'insuranceStatus.0.cardType': 'EGK'}}, {multi: true} );

    print( 'PV UPDATE' );
    printjsononeline( result );

    result = db.patients.update( {
        _id: patient._id
    }, {$set: {'insuranceStatus.0.cdmVersion': '5.2.0 ', 'insuranceStatus.0.cardType': 'EGK'}} );

    print( 'P UPDATE' );
    printjsononeline( result );

    print( '\n\n' );
} );
