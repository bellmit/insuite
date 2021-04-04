/**
 * User: mahmoud
 * Date: 24/06/15  16:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global describe, it, Y, user, should, expect*/

var
    contract = {
        "_id": "54be764fc404c1d77a111111",
        "actType": "BGSCHEIN",
        "timestamp": "2015-06-05T08:56:45.712Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "111ae9604013671c12c1c111",
        "locationId": "000000000000000000000001",
        "treatmentType": "AMBULANT",
        "fk4217": "",
        "fk4241": "",
        "fk4236": false,
        "fk4206": null,
        "fk4123": "",
        "fk4125to": null,
        fk4235: new Date(),
        "fk4125from": null,
        "fk4126": "",
        "fk4124": "",
        "scheinSlipMedicalTreatment": "",
        "scheinSubgroup": "",
        "scheinType": "",
        "scheinBillingArea": "00",
        "scheinYear": "",
        "scheinQuarter": "",
        "fk4219": "",
        "scheinNotes": "Blabla",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "explanations": "",
        "comment": "PO-Number 3",
        "userContent": ""
    },
    patient = {
        "_id": "54be764fc404c1d77a222222",
        "patientNo": null,
        "patientNumber": "211",
        "kbvDob": "04.04.1970",
        "jobTitle": "QA Tester",
        "careDegree": "NO",
        "dob": "2008-04-03T22:00:00.000Z",
        "primaryDoc": "111ae9604013671c12c1c111",
        "sendPatientReceipt": false,
        "gender": "FEMALE",
        "talk": "MS",
        "markers": [],
        "physicians": ["54be2294c404c1d77a286c6f"],
        "insuranceStatus": [
            {
                "insuranceNo": "M987654321",
                "insuranceId": "107277500",
                "insuranceName": "Techniker-Krankenkasse",
                "insurancePrintName": "Techniker Krankenkasse",
                "insuranceGrpId": "95605",
                "type": "PUBLIC",
                "billingFactor": "privatversicherte",
                "kv": "98",
                "locationId": "000000000000000000000001",
                "_id": "54be764fc404c1d77a286d4e",
                "cardSwipe": null,
                "address2": "",
                "address1": "",
                "bgNumber": "",
                "unzkv": [],
                "fused": false,
                "feeSchedule": "2",
                "costCarrierBillingGroup": "11",
                "costCarrierBillingSection": "00",
                "dmp": "1",
                "persGroup": "",
                "insuranceKind": "1",
                "fk4110": "2015-12-30T23:00:00.000Z",
                "fk4133": null
            },
            {
                "insuranceId": "120390466",
                "insuranceName": "BG Energie Textil Elektro Medienerzeugnisse",
                "insurancePrintName": "BG Energie Textil Elektro Medienerzeugnisse",
                "insuranceGrpId": "",
                "type": "BG",
                "billingFactor": "privatversicherte",
                "notes": "Test test",
                "locationId": "000000000000000000000001",
                "_id": "553f59a22b1941713a33144b",
                "address2": "38100 Braunschweig",
                "address1": "Lessingplatz 13",
                "bgNumber": "9435788349",
                "unzkv": [],
                "fused": false,
                "feeSchedule": "3",
                "costCarrierBillingGroup": "00",
                "costCarrierBillingSection": "00",
                "dmp": "",
                "persGroup": "",
                "insuranceKind": "",
                "fk4110": null,
                "fk4133": null
            }
        ],
        "addresses": [
            {
                "kind": "OFFICIAL",
                "_id": "54be764fc404c1d77a286d4f",
                "addon": "",
                "countryCode": "D",
                "country": "Deutschland",
                "city": "Berlin",
                "zip": "12103",
                "houseno": "82",
                "street": "Bessemerstr"
            }
        ],
        "communications": [
            {"type": "PHONEJOB", "value": "030-1234567890", "_id": "54be764fc404c1d77a286d51"},
            {"type": "EMAILJOB", "value": "qa-patient1@doc-cirrus.com", "_id": "54be764fc404c1d77a286d50"}
        ],
        "lastname": "A001-v2.1.2 (Ron)",
        "fk3120": "",
        "middlename": "",
        "nameaffix": "",
        "firstname": "A001-v2.1.2",
        "title": ""
    };

function checkResult( err, result ) {
    if( err ) {
        err = expect( err ).to.be.empty;
    }
    should.exist( result );
    result.should.be.an( 'Array' );
    expect( result ).to.have.length.of.at.least( 1 );
}

describe.only( 'testing billing generation', function() {
    var
        shared = {};
    it( 'ensure isMedneoCustomer set to true', function( done ) {
        this.timeout = 20000; // give the test more time to complete.

        Y.doccirrus.mongodb.getModel(
            user,
            'invoiceconfiguration',
            function( err, model ) {
                if( model ) {
                    model.mongoose.update( {}, {$set: {isMedneoCustomer: true}}, {multi: true}, function( err, result ) {
                        should.not.exist( err );
                        should.exist( result );
                        should.exist( result.nModified );
                        done();
                    } );
                } else {
                    checkResult( err );
                    done();
                }
            }
        );
    } );

    it( 'POST a new patient', function( done ) {
        contract.skipcheck_ = true;
        Y.doccirrus.api.patient.post( {
            user: user,
            action: 'upsert',
            model: 'patient',
            data: patient,
            callback: function( err, result ) {
                checkResult( err, result );
                shared.patientId = result[0];
                done();
            }
        } );
    } );

    it( 'POST a new contract', function( done ) {
        contract.skipcheck_ = true;
        contract.patientId = shared.patientId;
        Y.doccirrus.api.contract.post( {
            user: user,
            model: 'contract',
            data: contract,
            options: {entireRec: true},
            callback: function( err, result ) {
                checkResult( err, result );
                shared.activity = result[0];
                setTimeout( done, 200 ); // callback in post activity is called too soon!
            }
        } );
    } );

    it( 'check caseFolderId of the activity', function( done ) {
        should.exist( shared.activity );
        shared.activity.should.have.property( 'caseFolderId' );
        shared.activity.caseFolderId.should.be.a( 'string' );
        done();
    } );

    it( 'calling generateBilling()', function( done ) {
        Y.doccirrus.api.billing.generateBilling( user, function( err ) {
            should.not.exist( err );
            done();
        } );
    } );

    it( 'get the billing entry', function( done ) {
        var
            localDBUser = Y.doccirrus.auth.getSUForLocal();

        Y.doccirrus.mongodb.runDb( {
            user: localDBUser,
            action: 'get',
            model: 'billing',
            query: {_id: shared.activity.caseFolderId},
            callback: function( err, result ) {
                checkResult( err, result );
                expect( result ).to.have.length( 1 );
                result[0].remove( done );
            }
        } );
    } );

    it( 'cleaning up...', function( done ) {
        Y.doccirrus.api.patient.delete( {
            user: user,
            query: {_id: patient._id},
            callback: function( err, result ) {
                checkResult( err, result );
                done();
            }
        } );
    } );

} );
