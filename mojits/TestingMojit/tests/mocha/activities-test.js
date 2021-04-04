/**
 * User: pi
 * Date: 13/07/15  12:33
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, before, after, expect */

let
    model = 'activity',
    moment = require( 'moment' ),
    asvTeamNumber = '1231231231',
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    mongoose = require( 'mongoose' ),
    patientId = new mongoose.Types.ObjectId().toString(),
    gkvCaseFolderId = new mongoose.Types.ObjectId().toString(),
    asvCaseFolderId = new mongoose.Types.ObjectId().toString(),
    pkvCaseFolderId = new mongoose.Types.ObjectId().toString(),
    blCaseFolderId = new mongoose.Types.ObjectId().toString(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    asvEmployeeId = new mongoose.Types.ObjectId().toString(),
    mainLocationId = new mongoose.Types.ObjectId().toString(),
    subLocationId = new mongoose.Types.ObjectId().toString(),
    subLocation2Id = new mongoose.Types.ObjectId().toString(),
    separateLocationId = new mongoose.Types.ObjectId().toString(),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;

const user = Y.doccirrus.auth.getSUForLocal();

function getTreatmentData( config = {} ) {
    var
        treatment = {
            actType: 'TREATMENT',
            catalogShort: 'EBM',
            code: '01100',
            patientId,
            status: 'VALID'
        };
    treatment = mochaUtils.getActivityData( Object.assign( treatment, config ) );
    return treatment;
}

function getAssistiveData( config = {} ) {
    var
        assistive = {
            actType: 'ASSISTIVE',
            assDescription: 'assDescription',
            code: 'assDescription',
            patientId,
            status: 'VALID'
        };
    assistive = mochaUtils.getActivityData( Object.assign( assistive, config ) );
    return assistive;
}

function getPresAssistiveData( config = {} ) {
    var
        assistive = {
            actType: 'PRESASSISTIVE',
            icds: [],
            patientId,
            status: 'VALID'
        };
    assistive = mochaUtils.getActivityData( Object.assign( assistive, config ) );
    return assistive;
}

function getDiagnosisData( config = {} ) {
    var
        diagnosis = {
            actType: 'DIAGNOSIS',
            code: 'E00.0',
            patientId,
            status: 'VALID',
            'diagnosisType': 'ACUTE',
            'diagnosisCert': 'CONFIRM'
        };
    diagnosis = mochaUtils.getActivityData( Object.assign( diagnosis, config ) );
    return diagnosis;
}

function getScheinData( config = {} ) {
    var
        date = moment( mochaUtils.generateNewDate() ),
        schein = {
            actType: 'SCHEIN',
            timestamp: date.toISOString(),
            patientId,
            scheinQuarter: date.get( 'quarter' ),
            scheinYear: date.get( 'year' ),
            status: 'VALID',
            scheinType: '0101',
            scheinSubgroup: '00'
        };
    schein = mochaUtils.getActivityData( Object.assign( schein, config ) );
    return schein;
}

function checkEmptyCollection() {
    it( 'Activity collection should be empty.', function( done ) {
        Y.doccirrus.mongodb.runDb( {
            user: user,
            model: model,
            action: 'count'
        }, function( err, result ) {
            should.not.exist( err );
            result.should.equal( 0 );
            done();
        } );
    } );
}

function cleanCaseFolder( caseFolderId ) {
    it( `Clean case folder ${caseFolderId}`, function( done ) {
        Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'delete',
            query: {
                caseFolderId: caseFolderId
            },
            options: {
                override: true
            }
        }, function( err ) {
            should.not.exist( err );
            done();
        } );
    } );
    it( `Check case folder ${caseFolderId} is empty`, function( done ) {
        Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'count',
            query: {
                caseFolderId: caseFolderId
            }
        }, function( err, count ) {
            should.not.exist( err );
            should.exist( count );
            count.should.be.equal( 0 );
            done();
        } );
    } );
}

describe( 'Activities test.', function() {
    let
        mochaUtils = require( '../../server/mochaUtils' )( Y );

    before( function() {
        Y.doccirrus.licmgr.setMochaReturnValue( true );
    } );

    after( function() {
        Y.doccirrus.licmgr.setMochaReturnValue( false );
    } );

    describe( '0. Setup.', function() {
        it( '0.1. clean db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( '0.2. Insert location', function( done ) {
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
        it( '0.3. Insert sub location', function( done ) {
            let
                locationData = mochaUtils.getLocationData( {
                        '_id': subLocationId,
                        'locname': 'Sub location',
                        'commercialNo': '100714100',
                        'kv': '72',
                        'isAdditionalLocation': true,
                        'isOptional': true,
                        'mainLocationId': mainLocationId
                    }
                );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.contain( subLocationId );
                done();
            } );
        } );

        it( '0.4. Insert second sub location', function( done ) {
            let
                locationData = mochaUtils.getLocationData( {
                        '_id': subLocation2Id,
                        'locname': 'Second Sub location',
                        'commercialNo': '100714101',
                        'kv': '72',
                        'isAdditionalLocation': true,
                        'isOptional': true,
                        'mainLocationId': mainLocationId
                    }
                );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.contain( subLocation2Id );
                done();
            } );
        } );

        it( '0.5. Insert separate location', function( done ) {
            let
                locationData = mochaUtils.getLocationData( {
                        '_id': separateLocationId,
                        'locname': 'separate location',
                        'commercialNo': '100714103',
                        'kv': '72'
                    }
                );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.contain( separateLocationId );
                done();
            } );
        } );
        it( '0.6. Insert patient', function( done ) {
            let
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    'insuranceStatus': [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
                            'locationId': mainLocationId,
                            'address2': '10957 Berlin',
                            'address1': 'Wilhelmstraße 1',
                            'bgNumber': '',
                            'unzkv': [],
                            'fused': false,
                            'feeSchedule': '1',
                            'costCarrierBillingGroup': '01',
                            'costCarrierBillingSection': '00',
                            'dmp': '',
                            'persGroup': '',
                            'insuranceKind': '1',
                            'fk4110': null,
                            'fk4133': null
                        },
                        {
                            "fk4133": null,
                            "fk4110": null,
                            "insuranceKind": "",
                            "persGroup": "",
                            "dmp": "",
                            "costCarrierBillingSection": "00",
                            "costCarrierBillingGroup": "00",
                            "feeSchedule": "3",
                            "fused": false,
                            "unzkv": [],
                            "bgNumber": "",
                            "address1": "Berlin-Kölnische Allee 2 - 4",
                            "address2": "50969 Köln",
                            "employeeId": "100000000000000000000003",
                            "cardSwipe": null,
                            "locationId": mainLocationId,
                            "billingFactor": "privatversicherte",
                            "type": "PRIVATE",
                            "insuranceGrpId": "",
                            "insurancePrintName": "ASSTEL",
                            "insuranceName": "ASSTEL",
                            "insuranceId": "168141381"
                        }],
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
        it( '0.7. Insert GKV caseFolder', function( done ) {
            let
                caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId: patientId,
                    _id: gkvCaseFolderId
                } );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.contain( gkvCaseFolderId );
                done();
            } );
        } );
        it( '0.8. Insert employee', function( done ) {
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

    /**
     * covers SCHEIN-TREATMENT-DIAGNOSIS relations
     * e.g. TREATMENT/DIAGNOSIS requires a SCHEIN
     * NBS/HBS cases
     */
    describe( '1. Check Schein, treatment and diagnosis manipulation.', function() {
        let
            diagnosisTimestamp,
            scheinTimestamp,
            scheinId;
        before( function( done ) {
            Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                action: 'delete',
                query: {
                    _id: {
                        $exists: true
                    }
                },
                options: {
                    override: true
                }
            }, done );
        } );
        describe( '1.1. Prepare data.', function() {
            checkEmptyCollection();
        } );

        describe( '1.2. Treatment and diagnosis can not be created without Schein', function() {
            it( '1.2.1. Should not be possible to create treatment without Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: gkvCaseFolderId,
                        locationId: mainLocationId,
                        employeeId
                    } ) )
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );

            it( '1.2.2. Should not be possible to create diagnosis without Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getDiagnosisData( {
                        caseFolderId: gkvCaseFolderId,
                        locationId: mainLocationId,
                        employeeId
                    } ) )
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );
            checkEmptyCollection();
        } );

        describe( '1.3. Treatment and diagnosis creation if there is there is "Schein" with HBS (main location)', function() {
            cleanCaseFolder( gkvCaseFolderId );
            it( '1.3.1. Should be possible to create Schein with HBS.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    scheinId = results[0];
                    scheinTimestamp = schein.timestamp;
                    done();
                } );
            } );
            it( '1.3.2. Should be possible to create diagnosis with HBS if there is Schein with same location.', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    diagnosisTimestamp = diagnosis.timestamp;
                    done();
                } );
            } );
            it( '1.3.3. Should be possible to create treatment with HBS if there is "Schein" with same location.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '1.3.4. Should be possible to create diagnosis with NBS if there is Schein with HBS.', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: subLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    diagnosisTimestamp = diagnosis.timestamp;
                    done();
                } );
            } );
            it( '1.3.5. Should be possible to create treatment with NBS if there is "Schein" with HBS.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: subLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '1.3.6. Should not be possible to create diagnosis with another HBS if there is no Schein for it.', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: separateLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    should.exist( err );
                    should.exist( err.code );
                    should.not.exist( results );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );
            it( '1.3.7. Should not be possible to create treatment  with another HBS if there is no Schein for it.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: separateLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.exist( err );
                    should.exist( err.code );
                    should.not.exist( results );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );
        } );
        describe( '1.4. Treatment and diagnosis with NBS can be created if there is "Schein" with same location', function() {
            cleanCaseFolder( gkvCaseFolderId );
            it( '1.4.1. Should be possible to create Schein with NBS.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: subLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    scheinId = results[0];
                    scheinTimestamp = schein.timestamp;
                    done();
                } );
            } );
            it( '1.4.2. Should be possible to create diagnosis with NBS if there is Schein with same location.', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: subLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    diagnosisTimestamp = diagnosis.timestamp;
                    done();
                } );
            } );
            it( '1.4.3. Should be possible to create treatment with NBS if there is "Schein" with same location.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: subLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '1.4.4. Should be possible to create diagnosis with HBS if there is Schein with NBS (treatment main location === main location of NBS).', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    diagnosisTimestamp = diagnosis.timestamp;
                    done();
                } );
            } );
            it( '1.4.5. Should be possible to create treatment with HBS if there is "Schein" with NBS (treatment main location === main location of NBS).', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '1.4.6. Should be possible to create diagnosis with NBS 2 if there is Schein with NBS (NBS main location === NBS 2 main location).', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: subLocation2Id,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    diagnosisTimestamp = diagnosis.timestamp;
                    done();
                } );
            } );
            it( '1.4.7. Should be possible to create treatment with NBS 2 if there is "Schein" with NBS (NBS main location === NBS 2 main location).', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: subLocation2Id,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '1.4.8. Should not be possible to create diagnosis with another HBS( this main location !== main location of NBS ) if there is no Schein for it.', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: separateLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    should.exist( err );
                    should.exist( err.code );
                    should.not.exist( results );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );
            it( '1.4.9. Should not be possible to create treatment with another HBS( this main location !== main location of NBS ) if there is no Schein for it.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: separateLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.exist( err );
                    should.exist( err.code );
                    should.not.exist( results );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );
        } );
        /**
         * Checks following cases:
         * 1.
         */
        describe( '1.5. Treatment and diagnosis can be created after valid Schein with same(main) location id.', function() {
            cleanCaseFolder( gkvCaseFolderId );
            it( '1.5.1. Should be possible to create Schein.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein ),
                    options: {
                        entireRec: true
                    }
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    scheinId = results[0]._id;
                    scheinTimestamp = results[0].timestamp;
                    done();
                } );
            } );
            it( '1.5.2. Should be possible to create treatment when Schein with same location id  exists.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );

            it( '1.5.3. Should not be possible to create treatment before Schein (treatment date < Schein date).', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId,
                    timestamp: moment( scheinTimestamp ).subtract( 1, 'days' ).toISOString()
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );

            it( '1.5.4. Should be possible to create diagnosis when Schein with same location id exists.', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    diagnosisTimestamp = diagnosis.timestamp;
                    done();
                } );
            } );

            it( '1.5.5. Should not be possible to create diagnosis before Schein (diagnosis date < Schein date).', function( done ) {
                var diagnosis = getDiagnosisData( {
                    caseFolderId: gkvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId,
                    timestamp: moment( scheinTimestamp ).subtract( 1, 'days' ).toISOString()
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( diagnosis )
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );

        } );
        describe( '1.6. Treatment or diagnosis should always have valid Schein with same location id.', function() {
            it( '1.6.1. Should not be possible to move Schein in a quarter if this action will leave some tritments/diagnoses without valid Schein.', function( done ) {
                var
                    timestamp = moment( diagnosisTimestamp ).add( 1, 'ms' ).toISOString();
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'put',
                    fields: ['timestamp'],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        timestamp: timestamp
                    } ),
                    query: {
                        _id: scheinId
                    }
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18001 );
                    done();
                } );
            } );

            it( '1.6.2. Should not be possible to move Schein to another quarter if this action will leave some tritments/diagnoses without valid Schein.', function( done ) {
                var
                    timestamp = moment( diagnosisTimestamp ).subtract( 1, 'quarter' ).toISOString();
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'put',
                    fields: ['timestamp'],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        timestamp: timestamp
                    } ),
                    query: {
                        _id: scheinId
                    }
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18001 );
                    done();
                } );
            } );

            it( '1.6.2. Should not be possible to change Schein location if this action will leave some tritments/diagnoses without valid Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'put',
                    fields: ['locationId'],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        locationId: separateLocationId
                    } ),
                    query: {
                        _id: scheinId
                    }
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18021 );
                    done();
                } );
            } );

            it( '1.6.3. Should not be possible to cancel Schein if this action will leave some tritments/diagnoses without valid Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: model,
                    query: {
                        _id: scheinId
                    },
                    options: {
                        lean: true
                    }
                }, function( err, results ) {
                    should.not.exist( err );
                    var activity = results[0];
                    Y.doccirrus.activityapi.doTransition( user, {}, activity, 'cancel', false, function( err ) {
                        should.exist( err );
                        should.exist( err.code );
                        err.code.should.equal( 18000 );
                        done();
                    } );
                } );
            } );

            it( '1.6.4. Should not be possible to delete Schein if this action will leave some tritments/diagnoses without valid Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: model,
                    query: {
                        _id: scheinId
                    },
                    options: {
                        lean: true
                    }
                }, function( err, results ) {
                    should.not.exist( err );
                    var activity = results[0];
                    Y.doccirrus.activityapi.doTransition( user, {}, activity, 'delete', false, function( err ) {
                        should.exist( err );
                        should.exist( err.code );
                        err.code.should.equal( 18000 );
                        done();
                    } );
                } );
            } );

            it( '1.6.5. Should not be possible to create treatment without valid Schein with same location id.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: gkvCaseFolderId,
                        locationId: separateLocationId,
                        employeeId
                    } ) )
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );

            it( '1.6.6. Should not be possible to create diagnosis without valid Schein with same location id.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getDiagnosisData( {
                        caseFolderId: gkvCaseFolderId,
                        locationId: separateLocationId,
                        employeeId
                    } ) )
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18002 );
                    done();
                } );
            } );
        } );
        describe( '1.7. Check Schein locationId change.', function() {
            let
                additionalScheinId;
            it( 'creates Schein before existing one.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId: gkvCaseFolderId,
                    timestamp: moment( scheinTimestamp ).add( 1, 'm' ).toISOString(),
                    locationId: mainLocationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    additionalScheinId = results[0];
                    done();
                } );
            } );
            it( 'changes Schein location. System should allow to do it, because this action will NOT leave some tritments/diagnoses without valid Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'put',
                    fields: ['locationId'],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        locationId: separateLocationId
                    } ),
                    query: {
                        _id: scheinId
                    }
                }, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( 'changes additional Schein location. System should not allow it, because this action will leave some tritments/diagnoses without valid Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'put',
                    fields: ['locationId'],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        locationId: separateLocationId
                    } ),
                    query: {
                        _id: additionalScheinId
                    }
                }, function( err ) {
                    should.exist( err );
                    should.exist( err.code );
                    err.code.should.equal( 18021 );
                    done();
                } );
            } );
            describe( '1.8. check creation of multiply activity with transition', function() {
                it( '1.8.1. Should be possible to create several treatments with same explanation.', async function() {
                    const
                        testExplanation = 'test explanation',
                        doTransitionPlus = promisifyArgsCallback( Y.doccirrus.api.activity.doTransitionPlus );
                    let
                        //omit _id to force POST on validate transition
                        {_id, ...treatment} = getTreatmentData( { //eslint-disable-line
                            caseFolderId: gkvCaseFolderId,
                            locationId: mainLocationId,
                            employeeId,
                            status: 'CREATED',
                            explanations: testExplanation,
                            numberOfCopies: '3'
                        } );

                    let err, results;
                    [err, results] = await formatPromiseResult(
                        doTransitionPlus( {
                            user,
                            data: {
                                activity: treatment,
                                transition: 'validate',
                                _isTest: 'false'
                            },
                            options: {
                                activityContext: {
                                    _skipTriggerRules: true,
                                    _skipTriggerSecondary: true
                                }
                            }
                        } )
                    );
                    should.not.exist( err );
                    should.exist( results );

                    //wait a bit for creating additional activities
                    await new Promise( resolve => setTimeout( resolve, 100 ) );

                    [err, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'count',
                            model: 'activity',
                            query: {explanations: testExplanation}
                        } )
                    );
                    should.not.exist( err );
                    results.should.be.equal( 3 );
                } );
                it( '1.8.2. Should be possible to create several treatments with splitted explanation.', async function() {
                    const
                        testExplanation = 'test1 #   test2 # test3',
                        splittedExplanations = testExplanation.split( '#' ).map( el => el.trim() ),
                        doTransitionPlus = promisifyArgsCallback( Y.doccirrus.api.activity.doTransitionPlus );
                    let
                        //omit _id to force POST on validate transition
                        {_id, ...treatment} = getTreatmentData( { //eslint-disable-line
                            caseFolderId: gkvCaseFolderId,
                            locationId: mainLocationId,
                            employeeId,
                            status: 'CREATED',
                            explanations: testExplanation,
                            numberOfCopies: '3'
                        } );

                    let err, results;
                    [err, results] = await formatPromiseResult(
                        doTransitionPlus( {
                            user,
                            data: {
                                activity: treatment,
                                transition: 'validate',
                                _isTest: 'false'
                            },
                            options: {
                                activityContext: {
                                    _skipTriggerRules: true,
                                    _skipTriggerSecondary: true
                                }
                            }
                        } )
                    );
                    should.not.exist( err );
                    should.exist( results );

                    //wait a bit for creating additional activities
                    await new Promise( resolve => setTimeout( resolve, 100 ) );

                    [err, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'activity',
                            query: {explanations: {$in: splittedExplanations}},
                            options: {
                                select: {explanations: 1}
                            }
                        } )
                    );
                    should.not.exist( err );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 3 );
                    expect( results.map( el => el.explanations ) ).to.include.members( splittedExplanations );
                } );
            } );
        } );
    } );
    /**
     * covers SCHEIN-TREATMENT-DIAGNOSIS relations in ASV casefolder
     */
    describe( '2. Check Schein, treatment and diagnosis in ASV case folder', function() {
        describe( '2.1. Prepare data.', function() {

            it( '2.1.1. Insert ASV employee', function( done ) {
                let
                    employeeData = mochaUtils.getEmployeeData( {
                        _id: asvEmployeeId,
                        asvTeamNumbers: [asvTeamNumber],
                        locations: [
                            {
                                _id: subLocationId,
                                "locname": "Sub location"
                            },
                            {
                                _id: mainLocationId,
                                "locname": "main location"
                            },
                            {
                                _id: separateLocationId,
                                "locname": "separate location"
                            }
                        ]
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( asvEmployeeId );
                    done();
                } );
            } );
            it( '2.1.2. Insert ASV caseFolders', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        patientId: patientId,
                        _id: asvCaseFolderId,
                        additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ASV,
                        identity: asvTeamNumber
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( asvCaseFolderId );
                    done();
                } );
            } );
        } );
        describe( '2.2. Insert Schein', function() {
            it( '2.2.1. Should be possible to create Schein.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId: asvCaseFolderId,
                    employeeId: asvEmployeeId,
                    locationId: mainLocationId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    done();
                } );
            } );
            it( '2.2.2. 2 Schein should be created.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'count',
                    query: {
                        actType: 'SCHEIN',
                        patientId,
                        caseFolderId: asvCaseFolderId
                    }
                }, function( err, count ) {
                    should.not.exist( err );
                    should.exist( count );
                    count.should.equal( 1 ); // only one Schein should be created
                    done();
                } );
            } );
        } );
        describe( '2.3. Insert Treatment with main location and sub location', function() {
            it( '2.3.2. Should be possible to create Treatment with mainLocation.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: asvCaseFolderId,
                    locationId: mainLocationId,
                    employeeId: asvEmployeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '2.3.3. Should be possible to create Treatment with sub location.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: asvCaseFolderId,
                    locationId: subLocationId,
                    employeeId: asvEmployeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '2.3.4. Should not be possible to create Treatment with separate location.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: asvCaseFolderId,
                    locationId: separateLocationId,
                    employeeId: asvEmployeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.exist( err );
                    err.code.should.equal( 18002 );
                    should.not.exist( results );
                    done();
                } );
            } );
            it( '2.3.5. ASV case folder should have 3 activities (schein + 2 treatments).', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'count',
                    query: {
                        caseFolderId: asvCaseFolderId,
                        patientId,
                        employeeId: asvEmployeeId
                    }
                }, function( err, count ) {
                    should.not.exist( err );
                    should.exist( count );
                    count.should.equal( 3 );
                    done();
                } );
            } );
        } );
        describe( '2.4. Insert Treatment with separate location', function() {
            it( '2.4.1. Should be possible to create Schein with separate location.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId: asvCaseFolderId,
                    employeeId: asvEmployeeId,
                    locationId: separateLocationId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    done();
                } );
            } );
            it( '2.4.2. ASV case folder should have 2 Schein.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'count',
                    query: {
                        employeeId: asvEmployeeId,
                        patientId,
                        caseFolderId: asvCaseFolderId,
                        actType: 'SCHEIN'
                    }
                }, function( err, count ) {
                    should.not.exist( err );
                    should.exist( count );
                    count.should.equal( 2 );
                    done();
                } );
            } );
            it( '2.4.3. Should be possible to create Treatment with separate location.', function( done ) {
                var treatment = getTreatmentData( {
                    caseFolderId: asvCaseFolderId,
                    locationId: separateLocationId,
                    employeeId: asvEmployeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
            it( '2.4.4. ASV case folder should have 5 activities (2 schein + 3 treatments).', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'count',
                    query: {
                        caseFolderId: asvCaseFolderId,
                        patientId,
                        employeeId: asvEmployeeId
                    }
                }, function( err, count ) {
                    should.not.exist( err );
                    should.exist( count );
                    count.should.equal( 5 );
                    done();
                } );
            } );
        } );

    } );
    /**
     * Covers simple cases of BL counting
     */
    describe( '3. Check BL.', function() {
        let
            caseFolderId = blCaseFolderId,
            scheinId,
            blCode = "40100M",
            code = "40100",
            blTreatmentId = new mongoose.Types.ObjectId(),
            locationId = mainLocationId;
        describe( '3.1. Prepare data.', function() {
            it( '3.1.1. Insert BL caseFolders', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        patientId,
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
        } );
        describe( '3.2. Insert BL Schein', function() {
            it( '3.2.1. Create BL Schein.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId,
                    employeeId: employeeId,
                    locationId,
                    fk4234: true,
                    fk4235Set: [
                        {
                            fk4252: 10,
                            fk4244Set: [
                                {
                                    fk4246: 10,
                                    fk4244: blCode
                                }
                            ],
                            fk4247: null,
                            fk4235: moment( '2016-07-31T22:00:00.000Z' ).toISOString()
                        }
                    ]
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    scheinId = results[0];
                    done();
                } );
            } );
            it( '3.2.1. Create regular Schein with different location id.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId,
                    employeeId: employeeId,
                    locationId: separateLocationId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    done();
                } );
            } );
            it( '3.2.2. 2 Schein should be created.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'count',
                    query: {
                        actType: 'SCHEIN',
                        patientId,
                        caseFolderId
                    }
                }, function( err, count ) {
                    should.not.exist( err );
                    should.exist( count );
                    count.should.equal( 2 ); // We have 1 sub location and 2 main locations - only 2 schein is required
                    done();
                } );
            } );
        } );
        describe( '3.3. Insert treatment with bl code and same location id', function() {
            it( '3.3.1. Should be possible to create 3 treatments with bl code and 2 treatments with not bl code (all have same location as "Schein" has).', function( done ) {
                let
                    async = require( 'async' ),
                    activities = [];
                this.timeout( 20000 );
                activities.push( getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: blCode
                } ) );
                activities.push( getTreatmentData( {
                    _id: blTreatmentId,
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: blCode
                } ) );
                activities.push( getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: blCode
                } ) );
                activities.push( getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code
                } ) );
                activities.push( getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code
                } ) );
                async.eachSeries( activities, function( activity, callback ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( activity )
                    }, callback );
                }, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );

            it( '3.3.2. Case folder should have correct number of activities', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'count',
                    query: {
                        patientId,
                        caseFolderId
                    }
                }, function( err, count ) {
                    should.not.exist( err );
                    should.exist( count );
                    count.should.equal( 7 ); // 2 Schein and 5 treatments
                    done();
                } );
            } );

            it( '3.3.3. BL Schein should have correct number of created treatments with bl codes', function( done ) {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'get',
                    query: {
                        _id: scheinId
                    },
                    options: {
                        lean: true,
                        select: {
                            fk4235Set: 1
                        }
                    }
                }, function( err, results ) {
                    let
                        [schein] = results;
                    should.not.exist( err );
                    should.exist( schein );
                    schein.fk4235Set[0].fk4244Set[0].fk4246.should.equal( '3' );
                    done();
                } );
            } );

            it( '3.3.4. Should be possible to delete one of bl treatment', function( done ) {
                let
                    async = require( 'async' );
                async.waterfall( [
                    function( next ) {

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: model,
                            action: 'get',
                            query: {
                                _id: blTreatmentId
                            },
                            options: {
                                lean: true
                            }
                        }, function( err, results ) {
                            let
                                [treatment] = results;
                            should.not.exist( err );
                            should.exist( treatment );
                            next( null, treatment );
                        } );
                    },
                    function( treatment, next ) {
                        Y.doccirrus.api.activity.doTransition( {
                            user: user,
                            data: {
                                activity: treatment,
                                transition: 'delete',
                                _isTest: 'false'
                            },
                            callback: function( err, results ) {
                                should.not.exist( err );
                                should.exist( results );
                                next();
                            }
                        } );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: model,
                            action: 'count',
                            query: {
                                _id: blTreatmentId
                            }
                        }, function( err, count ) {
                            should.not.exist( err );
                            should.exist( count );
                            count.should.equal( 0 );
                            next();
                        } );
                    }
                ], function() {
                    done();
                } );
            } );
            it( 'delay', function( done ) {
                setTimeout( function() {
                    done();
                }, 300 );
            } );
            it( '3.3.5. BL Schein should have correct number of created treatments with bl codes', function( done ) {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'get',
                    query: {
                        _id: scheinId
                    },
                    options: {
                        lean: true,
                        select: {
                            fk4235Set: 1
                        }
                    }
                }, function( err, results ) {
                    let
                        [schein] = results;
                    should.not.exist( err );
                    should.exist( schein );
                    schein.fk4235Set[0].fk4244Set[0].fk4246.should.equal( '2' );
                    done();
                } );
            } );

        } );
        describe( '3.4. Insert Treatment with bl code but different location id', function() {
            it( '3.4.1. Should be possible to create treatments with bl code but for regular Schein.', function( done ) {
                let
                    treatment = getTreatmentData( {
                        caseFolderId,
                        locationId: separateLocationId,
                        employeeId,
                        code: blCode
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    done();
                } );
            } );

            it( '3.4.2. BL Schein should have correct number of created treatments with bl codes', function( done ) {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'get',
                    query: {
                        _id: scheinId
                    },
                    options: {
                        lean: true,
                        select: {
                            fk4235Set: 1
                        }
                    }
                }, function( err, results ) {
                    let
                        [schein] = results;
                    should.not.exist( err );
                    should.exist( schein );
                    schein.fk4235Set[0].fk4244Set[0].fk4246.should.equal( '2' );
                    done();
                } );
            } );

        } );

        describe( 'System should not allow to have 2 open schein with different set of bl codes', function() {
            let
                createdScheinId,
                createdSchein;
            it( 'Inserts schein with different set of bl codes', function() {
                const schein = getScheinData( {
                    caseFolderId,
                    employeeId: employeeId,
                    locationId,
                    fk4234: true,
                    fk4235Set: [
                        {
                            fk4252: 10,
                            fk4244Set: [
                                {
                                    fk4246: 10,
                                    fk4244: "20210"
                                }
                            ],
                            fk4247: null,
                            fk4235: moment( '2016-07-31T22:00:00.000Z' ).toISOString()
                        }
                    ],
                    skipcheck_: true
                } );
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'post',
                    data: schein
                } )
                    .should.be.fulfilled
                    .then( data => {
                        createdScheinId = data[0];
                    } );
            } );
            it( 'Gets created schein', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: createdScheinId
                    }
                } )
                    .should.be.fulfilled
                    .then( data => {
                        createdSchein = data[0];
                    } );
            } );
            it( 'Checks created schein', function() {
                should.exist( createdSchein );
                createdSchein.caseFolderId.should.not.equal( blCaseFolderId );
            } );
        } );
        describe( 'System should allow to have 2 open schein with different set of bl codes if there is no "opened" Schein', function() {
            let
                createdScheinId,
                createdSchein;
            it( 'Updates status of existing schein to billed', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    query: {
                        _id: scheinId
                    },
                    data: {
                        status: 'BILLED'
                    }
                } ).should.be.fulfilled;
            } );
            it( 'Inserts schein with different set of bl codes', function() {
                const schein = getScheinData( {
                    caseFolderId,
                    employeeId: employeeId,
                    locationId,
                    fk4234: true,
                    fk4235Set: [
                        {
                            fk4252: 10,
                            fk4244Set: [
                                {
                                    fk4246: 10,
                                    fk4244: "20210"
                                }
                            ],
                            fk4247: null,
                            fk4235: moment( '2016-07-31T22:00:00.000Z' ).toISOString()
                        }
                    ],
                    skipcheck_: true
                } );
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'post',
                    data: schein
                } )
                    .should.be.fulfilled
                    .then( data => {
                        createdScheinId = data[0];
                    } );
            } );
            it( 'Gets created schein', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: createdScheinId
                    }
                } )
                    .should.be.fulfilled
                    .then( data => {
                        createdSchein = data[0];
                    } );
            } );
            it( 'Checks created schein', function() {
                should.exist( createdSchein );
                createdSchein.caseFolderId.should.equal( blCaseFolderId );
            } );
        } );
    } );
    describe( '4. Check PRESASSISTIVE.', function() {
        let
            caseFolderId = gkvCaseFolderId,
            locationId = mainLocationId,
            assistiveWithoutAssId1 = new mongoose.Types.ObjectId(),
            assistiveWithoutAssId2 = new mongoose.Types.ObjectId(),
            assistiveWithAssId = new mongoose.Types.ObjectId();
        describe( '4.1. Insert activities with type ASSISTIVE (2 without assId and one with assId).', function() {
            it( '4.1.1. Should be possible to create 3 activities with type ASSISTIVE.', function( done ) {
                let
                    async = require( 'async' ),
                    activities = [];
                activities.push( getAssistiveData( {
                    _id: assistiveWithoutAssId1,
                    caseFolderId,
                    locationId,
                    employeeId
                } ) );
                activities.push( getAssistiveData( {
                    _id: assistiveWithoutAssId2,
                    caseFolderId,
                    locationId,
                    employeeId
                } ) );
                activities.push( getAssistiveData( {
                    _id: assistiveWithAssId,
                    assId: '12.24.05.0',
                    caseFolderId,
                    locationId,
                    employeeId
                } ) );
                async.eachSeries( activities, function( activity, callback ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( activity )
                    }, callback );
                }, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );

        } );

        describe( '4.2. Insert activity with type PRESASSISTIVE.', function() {
            it( '4.2.1. Should be possible to create PRESASSISTIVE with ASSISTIVE and without DIAGNOSIS if every ASSISTIVE does not have "assId".', function( done ) {
                let
                    presassistive = getPresAssistiveData( {
                        caseFolderId,
                        locationId: separateLocationId,
                        employeeId,
                        activities: [assistiveWithoutAssId1, assistiveWithoutAssId2]
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( presassistive )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    done();
                } );
            } );
            it( '4.2.2. Should be possible to create PRESASSISTIVE with ASSISTIVE and without DIAGNOSIS if  atleast one ASSISTIVE has "assId".', function( done ) {
                let
                    presassistive = getPresAssistiveData( {
                        caseFolderId,
                        locationId: separateLocationId,
                        employeeId,
                        activities: [assistiveWithoutAssId1, assistiveWithoutAssId2, assistiveWithAssId]
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( presassistive )
                }, function( err, results ) {
                    should.exist( err );
                    err.code.should.equal( 18009 );
                    should.not.exist( results );
                    done();
                } );
            } );

        } );
    } );

    /**
     * Covers catalogusage entry creation
     */
    describe( '5. Test createActivitiesFromCatalogusage activity api.', function() {
        let
            caseFolderId = pkvCaseFolderId,
            locationId = mainLocationId,
            baseTreatmentId = new mongoose.Types.ObjectId().toString();
        describe( '5.1. Prepare use case.', function() {
            it( '5.1.1. Insert PKV caseFolder', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        patientId,
                        _id: caseFolderId,
                        type: 'PRIVATE'
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

            it( '5.1.2. Create PKV Schein.', function( done ) {
                var
                    schein = getScheinData( {
                        caseFolderId,
                        locationId,
                        employeeId
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );
        } );
        describe( '5.2. Create base treatment', function() {
            let
                catalogData,
                treatment = getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    _id: baseTreatmentId
                } ),
                {filename: catalogName, short: catalogShort} = Y.doccirrus.api.catalog.getCatalogDescriptors().TREATMENT.cat.find( desc => 'GOÄ' === desc.short );

            it( 'setup catalog', function( done ) {
                const catalogData = {
                    "seq": "200",
                    "unifiedSeq": "000000200",
                    "title": "Verband - ausgenommen Schnell- und Sprühverbände, Augen-, Ohrenklappen oder Dreiecktücher",
                    "value": "45",
                    "unit": "Punkte",
                    "catalog": catalogName
                };
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalog',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( catalogData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    done();
                } );
            } );
            it( '5.2.1. Get original catalog data for GOAE with code 200.', function( done ) {
                treatment.catalogRef = catalogName;
                treatment.catalogShort = catalogShort;
                treatment.code = '200';
                Y.doccirrus.api.catalog.get( {
                    user: user,
                    query: {
                        catalog: catalogName,
                        seq: '200'
                    },
                    options: {
                        lean: true,
                        limit: 1
                    },
                    callback: function( err, results ) {
                        should.not.exist( err );
                        should.exist( results );
                        results.should.have.lengthOf( 1 );
                        catalogData = results[0];
                        done();
                    }
                } );
            } );
            it( '5.2.2. Get activity data via schemas.activity._setActivityData.', function( done ) {
                Y.doccirrus.schemas.activity._setActivityData( {
                    initData: treatment,
                    entry: catalogData,
                    user: user
                }, function( err, newActivityData ) {
                    should.not.exist( err );
                    should.exist( newActivityData );
                    Object.assign( treatment, newActivityData );
                    done();
                } );
            } );
            it( '5.2.3. Insert base treatment.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( treatment )
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    done();
                } );
            } );
            it( 'delay', function( done ) {
                setTimeout( done, 800 );
            } );
        } );
        describe( '5.3. create activity from catalog usage code', function() {
            let
                baseTreatment,
                catalogUsageId;
            it( '5.3.1. Get base activity', function( done ) {
                Y.doccirrus.api.activity.get( {
                    user,
                    query: {
                        _id: baseTreatmentId
                    },
                    options: {
                        lean: true
                    },
                    callback: function( err, results ) {
                        should.not.exist( err );
                        should.exist( results );
                        results.should.have.lengthOf( 1 );
                        baseTreatment = results[0];
                        done();
                    }
                } );
            } );
            it( '5.3.2. Get catalogusage id.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'catalogusage',
                    action: 'get',
                    query: {
                        seq: '200'
                    },
                    options: {
                        lean: true,
                        select: {
                            _id: 1
                        }
                    }
                }, function( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    results.should.have.lengthOf( 1 );
                    catalogUsageId = results[0]._id.toString();
                    done();
                } );
            } );
            it( '5.3.3. Make api call api.activity.createActivitiesFromCatalogusage', function( done ) {
                let
                    oldActivity = Object.assign( {}, baseTreatment );
                delete oldActivity._id;
                Y.doccirrus.api.activity.createActivitiesFromCatalogusage( {
                    originalParams: {
                        oldActivity,
                        catalogusageIds: [catalogUsageId]
                    },
                    user,
                    callback: function( err ) {
                        should.not.exist( err );
                        done();
                    }
                } );
            } );
            it( '5.3.4. Case folder should have 3 activities (SCHEIN, 2x TREATMENT)', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'count',
                    query: {
                        caseFolderId
                    },
                    model: 'activity'
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.equal( 3 );
                    done();
                } );
            } );

        } );
        describe( '5.4. both treatments should be equal', function() {
            var
                treatments;
            it( '5.4.1. Get both treatments', function( done ) {
                Y.doccirrus.api.activity.get( {
                    user,
                    query: {
                        caseFolderId,
                        actType: 'TREATMENT'
                    },
                    options: {
                        lean: true,
                        sort: {_id: -1}
                    },
                    callback: function( err, activities ) {
                        should.not.exist( err );
                        should.exist( activities );
                        activities.should.have.lengthOf( 2 );
                        treatments = activities;
                        done();
                    }
                } );
            } );
            it( '5.4.2. actualPrice should be the same', function() {
                should.exist( treatments[0].actualPrice );
                treatments[0].actualPrice.should.equal( 45 );
                treatments[0].actualPrice.should.equal( treatments[1].actualPrice );
            } );
        } );
        describe( '5.5. test copy Activity', function() {
            var
                treatments;
            it( '5.5.1. Get treatments', function( done ) {
                Y.doccirrus.api.activity.get( {
                    user,
                    query: {
                        caseFolderId,
                        actType: 'TREATMENT'
                    },
                    options: {
                        lean: true,
                        sort: {_id: -1}
                    },
                    callback: function( err, activities ) {
                        should.not.exist( err );
                        should.exist( activities );
                        activities.should.have.lengthOf( 2 );
                        treatments = activities;
                        done();
                    }
                } );
            } );
            it( '5.5.2. test copeActivity', function() {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.activity.copeActivity( {
                        user,
                        data: {
                            activityId: treatments[0]._id,
                            currentDate: true
                        },
                        callback: function( err ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve();
                        }
                    } );
                } ).should.be.fulfilled;
            } );
            it( '5.5.3. Get all treatments', function( done ) {
                Y.doccirrus.api.activity.get( {
                    user,
                    query: {
                        caseFolderId,
                        actType: 'TREATMENT'
                    },
                    options: {
                        lean: true,
                        sort: {_id: -1}
                    },
                    callback: function( err, activities ) {
                        should.not.exist( err );
                        should.exist( activities );
                        activities.should.have.lengthOf( 3 );
                        done();
                    }
                } );
            } );
            it( '5.5.4. apkState should be the default', function() {
                should.exist( treatments[0].apkState );
                treatments[0].apkState.should.equal( 'IN_PROGRESS' );
            } );
        } );
    } );

    describe( '6. Check CONTINUOUS DIAGNOSIS.', function() {
        let
            caseFolderId = gkvCaseFolderId,
            locationId = mainLocationId,
            timestampSchein = moment( mochaUtils.generateNewDate() ),
            timestampTR1 = timestampSchein.add( 1, 'hours' ).toISOString(),
            timestampTR2 = timestampSchein.add( 1, 'days' ).toISOString(),
            timestampI1 = timestampSchein.add( 2, 'days' ).toISOString(),
            timestampI1BetweenTR1TR2 = timestampSchein.add( 1, 'days' ).subtract( 1, 'hours' ).toISOString(),
            diagnosisTR1 = new mongoose.Types.ObjectId(),
            diagnosisTR2 = new mongoose.Types.ObjectId(),
            diagnosisI1 = new mongoose.Types.ObjectId();

        describe( '6.1. Insert continuous diagnoses (2x TREATMENT_RELEVANT, 1x INVALIDATING).', function() {
            cleanCaseFolder( caseFolderId );
            it( '6.1.1. Should be possible to create Schein.', function( done ) {
                var schein = getScheinData( {
                    caseFolderId,
                    locationId,
                    employeeId
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein ),
                    options: {
                        entireRec: true
                    }
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    done();
                } );
            } );

            it( '6.1.2. Should be possible to create 2x TREATMENT_RELEVANT diagnoses', function( done ) {
                let
                    async = require( 'async' ),
                    activities = [];
                activities.push( getDiagnosisData( {
                    _id: diagnosisTR1,
                    caseFolderId,
                    locationId,
                    employeeId,
                    diagnosisType: "CONTINUOUS",
                    diagnosisTreatmentRelevance: "TREATMENT_RELEVANT",
                    timestamp: timestampTR1
                } ) );
                activities.push( getDiagnosisData( {
                    _id: diagnosisTR2,
                    caseFolderId,
                    locationId,
                    employeeId,
                    diagnosisType: "CONTINUOUS",
                    diagnosisTreatmentRelevance: "TREATMENT_RELEVANT",
                    timestamp: timestampTR2
                } ) );
                async.eachSeries( activities, function( activity, callback ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( activity )
                    }, callback );
                }, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );

            it( '6.1.3. Should be possible to add an INVALIDATING diagnosis', function( done ) {
                let
                    async = require( 'async' ),
                    activities = [];
                activities.push( getDiagnosisData( {
                    _id: diagnosisI1,
                    caseFolderId,
                    locationId,
                    employeeId,
                    diagnosisType: "CONTINUOUS",
                    diagnosisTreatmentRelevance: "INVALIDATING",
                    timestamp: timestampI1
                } ) );
                async.eachSeries( activities, function( activity, callback ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( activity )
                    }, callback );
                }, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );
        } );

        describe( '6.2. Check, if invalidating diagnoses invalidate the previous ones.', function() {
            it( '6.2.1. Check, if the first 2 CONTINUOUS diagnoses have a diagnosisInvalidationDate', function( done ) {
                Y.doccirrus.api.activity.get( {
                    user,
                    query: {
                        caseFolderId,
                        actType: 'DIAGNOSIS',
                        diagnosisType: "CONTINUOUS"
                    },
                    options: {
                        lean: true,
                        sort: {timestamp: -1}
                    },
                    callback: function( err, activities ) {
                        should.not.exist( err );
                        should.exist( activities );
                        activities.should.have.lengthOf( 3 );

                        activities.forEach(
                            function( activity ) {
                                switch( activity._id ) {
                                    case diagnosisTR1:
                                        should.exist( activity.diagnosisInvalidationDate );
                                        activity.diagnosisInvalidationDate.should.be.an( "Date" );
                                        break;
                                    case diagnosisTR2:
                                        should.exist( activity.diagnosisInvalidationDate );
                                        activity.diagnosisInvalidationDate.should.be.an( "Date" );
                                        break;
                                    case diagnosisI1:
                                        should.not.exist( activity.diagnosisInvalidationDate );
                                        break;
                                }
                            }
                        );

                        done();
                    }
                } );
            } );

            it( '6.2.2. Check, if it is possible to move the INVALIDATING diagnosis between the 2 TREATMENT_RELEVANT CONTINUOUS diagnoses', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'activity',
                    query: {
                        _id: diagnosisI1
                    },
                    data: {
                        timestamp: timestampI1BetweenTR1TR2,
                        skipcheck_: true
                    },
                    fields: ["timestamp"]
                }, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );

            it( '6.2.3. Check, if just the first CONTINUOUS diagnosis has a diagnosisInvalidationDate', function( done ) {
                Y.doccirrus.api.activity.get( {
                    user,
                    query: {
                        caseFolderId,
                        actType: 'DIAGNOSIS',
                        diagnosisType: "CONTINUOUS"
                    },
                    options: {
                        lean: true,
                        sort: {timestamp: -1}
                    },
                    callback: function( err, activities ) {
                        should.not.exist( err );
                        should.exist( activities );
                        activities.should.have.lengthOf( 3 );

                        activities.forEach(
                            function( activity ) {
                                switch( activity._id ) {
                                    case diagnosisTR1:
                                        should.exist( activity.diagnosisInvalidationDate );
                                        activity.diagnosisInvalidationDate.should.be.an( "Date" );
                                        break;
                                    case diagnosisTR2:
                                        should.not.exist( activity.diagnosisInvalidationDate );
                                        break;
                                    case diagnosisI1:
                                        should.not.exist( activity.diagnosisInvalidationDate );
                                        break;
                                }
                            }
                        );
                        done();
                    }
                } );
            } );

            it( '6.2.4. Delete the INVALIDATING diagnosis', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'delete',
                    model: 'activity',
                    query: {
                        _id: diagnosisI1
                    }
                }, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );

            it( '6.2.5. Check, if none of the CONTINUOUS diagnoses has a diagnosisInvalidationDate', function( done ) {
                Y.doccirrus.api.activity.get( {
                    user,
                    query: {
                        caseFolderId,
                        actType: 'DIAGNOSIS',
                        diagnosisType: "CONTINUOUS"
                    },
                    options: {
                        lean: true,
                        sort: {timestamp: -1}
                    },
                    callback: function( err, activities ) {
                        should.not.exist( err );
                        should.exist( activities );
                        activities.should.have.lengthOf( 2 );

                        activities.forEach(
                            function( activity ) {
                                switch( activity._id ) {
                                    case diagnosisTR1:
                                        should.not.exist( activity.diagnosisInvalidationDate );
                                        break;
                                    case diagnosisTR2:
                                        should.not.exist( activity.diagnosisInvalidationDate );
                                        break;
                                }
                            }
                        );
                        done();
                    }
                } );
            } );
        } );
    } );
} );