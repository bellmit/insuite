/**
 * User: pi
 * Date: 13/07/15  12:33
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, context, should, it, expect, describe, before, after */

const
    moment = require( 'moment' ),
    mongoose = require( 'mongoose' ),
    sinon = require( 'sinon' ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    getActivityDataForPatient = promisifyArgsCallback( Y.doccirrus.api.activity.getActivityDataForPatient ),
    createCommunicationFromMediport = promisifyArgsCallback( Y.doccirrus.api.activity.createCommunicationFromMediport ),
    fs = require( 'fs' ),
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    testData = JSON.parse( fs.readFileSync( `${__dirname}/../mediportXmlAnswers/testData.json`, 'utf8' ) ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal(),
    calculateActivityMedicalScalingFactorP = promisifyArgsCallback(
        Y.doccirrus.api.activity.calculateActivityMedicalScalingFactor
    ),
    getModelProm = util.promisify( Y.doccirrus.mongodb.getModel ),
    tarmedInvoiceFactorValues = [
        {
            "caseTypes": [
                "PRIVATE_CH"
            ],
            "qualiDignity": "3000",
            "factor": 0.93
        }
    ],
    catalogTreatments = require( `../catalogData/tarmedCatalogTreatments` ).filter( t => t.catalogShort === 'TARMED' ),
    swissPKVschein = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/schein.json`, 'utf8' ) ),
    qualiCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
        actType: '_CUSTOM',
        short: 'TARMED_DIGNI_QUALI'
    } ),
    catalogQualiDignities = require( `../catalogData/qualiDignities` ).map( qd => {
        return {...qd, catalog: qualiCatalogDescriptor.fileName};
    } ),
    filterWhiteListed = mochaUtils.filterWhitelisted,
    fsmStateChangePromise = function( user, options, activity, isTest, stateChangeFn ) {
        return new Promise( function( resolve, reject ) {
            const callback = function( err, result ) {
                if( err ) {
                    return reject( err );
                }
                resolve( result );
            };
            stateChangeFn( user, options, activity, isTest, callback );
        } );
    };

function expectToInclude(original, sub, path) {
    expect( filterWhiteListed( original, path || [], Object.keys( sub ) ) ).to.deep.equalInAnyOrder( sub );
}

async function checkInvoiceStatus( invoiceId, status ) {
    let res = await Y.doccirrus.mongodb.runDb( {
        user,
        model: 'activity',
        action: 'get',
        query: {
            _id: invoiceId
        },
        options: {
            lean: true
        }
    } );
    expect( res && Array.isArray( res ) && res.length && res[0].status ).to.equal( status );
}

function getActivityData( config = {} ) {
    let history = {
        actType: 'HISTORY',
        status: 'VALID'
    };
    return mochaUtils.getActivityData( Object.assign( history, config ) );
}

function getScheinData( config = {} ) {
    let
        date = moment( mochaUtils.generateNewDate() ),
        schein = {
            actType: 'SCHEIN',
            timestamp: date.toISOString(),
            scheinQuarter: date.get( 'quarter' ),
            scheinYear: date.get( 'year' ),
            status: 'VALID',
            scheinType: '0101',
            scheinSubgroup: '00'
        };
    return mochaUtils.getActivityData( Object.assign( config, schein ) );
}

function postEntry( model, entry ) {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
}

async function genericNegativeTester( testCases, func ) {
    for( let {input, expectedErrorMessage} of testCases ) {
        try {
            await func( input );
        } catch( error ) {
            expect( error.message.message || error.message ).equal( expectedErrorMessage );
        }
    }
}

async function genericPositiveTester( testCases, func ) {
    for( const [, {input, expectedOutput}] of testCases.entries() ) {
        /*console.log( `\ttesting case #${index}` );*/

        const result = await func( input );

        if( Array.isArray( expectedOutput ) ) {
            expect( Array.isArray( result ) ).to.equal( true );
            expect( result.length ).to.equal( expectedOutput.length );
            for( let [index, resultObj] of result.entries() ) {
                expect( expectedOutput[index] ).to.deep.equal( resultObj );
            }
        }

        if( typeof expectedOutput === 'string' ) {
            expect( result ).to.equal( expectedOutput );
            continue;
        }

        if( typeof expectedOutput === 'function' ) {
            expect( expectedOutput( result ) ).to.equal( true );
            continue;
        }

        expect( result ).to.deep.equal( expectedOutput );
    }
}

describe( 'activity-api', function() {
    let
        mochaUtils = require( '../../server/mochaUtils' )( Y ),
        countryMode;

    before( async function() {
        await cleanDb( {user} );
    } );
    after( async function() {
        await cleanDb( {user} );
    } );

    context( 'de', function() {
        before( async function() {
            this.patientId = new mongoose.Types.ObjectId().toString();
            this.caseFolder1Id = new mongoose.Types.ObjectId().toString();
            this.caseFolder2Id = new mongoose.Types.ObjectId().toString();
            this.caseFolder3Id = new mongoose.Types.ObjectId().toString();
            this.caseFolder4Id = new mongoose.Types.ObjectId().toString();
            this.employeeId = new mongoose.Types.ObjectId().toString();
            this.employee2Id = new mongoose.Types.ObjectId().toString();
            this.mainLocationId = new mongoose.Types.ObjectId().toString();
            this.anotherLocationId = new mongoose.Types.ObjectId().toString();
            this.activeCaseFolderId = this.caseFolder1Id;
            this.lastPublicCaseFolder = this.caseFolder3Id;
            this.lastPrivateCaseFolder = this.caseFolder4Id;

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: this.mainLocationId
                } ) )
            } );

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: this.anotherLocationId,
                    commercialNo: '100714103'
                } ) )
            } );

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } ) )
            } );

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
                    _id: this.employee2Id
                } ) )
            } );

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    _id: this.patientId,
                    activeCaseFolderId: this.activeCaseFolderId,
                    insuranceStatus: [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
                            'locationId': this.mainLocationId,
                            'employeeId': this.employeeId,
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
                            "insuranceId": "168141381",
                            "insuranceName": "ASSTEL",
                            "insurancePrintName": "ASSTEL",
                            "insuranceGrpId": "",
                            "type": "PRIVATE",
                            "billingFactor": "privatversicherte",
                            "locationId": this.anotherLocationId,
                            "cardSwipe": null,
                            "employeeId": this.employee2Id,
                            "address2": "50969 Köln",
                            "address1": "Berlin-Kölnische Allee 2 - 4",
                            "bgNumber": "",
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
                    ]
                } ) )
            } );
        } );
        after( async function() {
            await cleanDb( {user} );
        } );

        /**
         * covers Y.doccirrus.api.activity.getActivityDataForPatient usage
         */
        describe( 'Check api.activity.getActivityDataForPatient', function() {
            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
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
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                        patientId: this.patientId,
                        _id: this.caseFolder1Id
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                        patientId: this.patientId,
                        type: 'PRIVATE',
                        _id: this.caseFolder2Id
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                        patientId: this.patientId,
                        type: 'PUBLIC',
                        _id: this.caseFolder3Id
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                        patientId: this.patientId,
                        type: 'PRIVATE',
                        _id: this.caseFolder4Id
                    } ) )
                } );
                let result = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getScheinData( {
                        caseFolderId: this.caseFolder1Id,
                        locationId: this.mainLocationId,
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                this.scheinId = result[0];
                this.scheinLocationId = this.mainLocationId;
                this.scheinEmployeeId = this.employeeId;
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getActivityData( {
                        caseFolderId: this.caseFolder1Id,
                        locationId: this.mainLocationId,
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getActivityData( {
                        caseFolderId: this.caseFolder1Id,
                        locationId: this.anotherLocationId,
                        employeeId: this.employee2Id,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getActivityData( {
                        caseFolderId: this.caseFolder3Id,
                        locationId: this.anotherLocationId,
                        employeeId: this.employee2Id,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getActivityData( {
                        caseFolderId: this.caseFolder2Id,
                        locationId: this.mainLocationId,
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
            } );

            describe( 'call api.activity.getActivityDataForPatient. only patient Id.', function() {
                it( 'only patient Id is passed.', async function() {
                    /**
                     * case folder is taken from activeCaseFolderId, employee and location ids are taken from Schein
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                patientId: this.patientId
                            }
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder1Id );
                    result.locationId.should.equal( this.scheinLocationId );
                    result.employeeId.should.equal( this.scheinEmployeeId );
                } );
                it( 'patient Id and caseFolderType (PRIVATE) are passed. ', async function() {
                    /**
                     * case folder should be last inserted (private) patient case folder.
                     * employee and location id is taken from insurance, because case folder is empty.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                patientId: this.patientId
                            },
                            caseFolderType: 'PRIVATE'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.lastPrivateCaseFolder );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );
                it( 'patient Id and caseFolderType (PUBLIC) are passed. ', async function() {
                    /**
                     * case folder should be last inserted (public) patient case folder.
                     * employee and location id is taken from last activity - another location and second employee.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                patientId: this.patientId
                            },
                            caseFolderType: 'PUBLIC'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.lastPublicCaseFolder );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );
            } );
            describe( 'call api.activity.getActivityDataForPatient. patient Id and case folder id', function() {
                it( 'patient and case folder id are passed.', async function() {
                    /**
                     * employee and location are taken from Schein
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                patientId: this.patientId,
                                caseFolderId: this.caseFolder1Id
                            }
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder1Id );
                    result.locationId.should.equal( this.scheinLocationId );
                    result.employeeId.should.equal( this.scheinEmployeeId );
                } );
                it( 'patient, case folder Id and caseFolderType (PRIVATE) are passed.', async function() {
                    /**
                     * case folder should be caseFolder3Id.
                     * employee and location id is taken from last activity.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                patientId: this.patientId,
                                caseFolderId: this.caseFolder3Id
                            },
                            caseFolderType: 'PRIVATE'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder3Id );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );
                it( 'patient, case folder Id and caseFolderType (PUBLIC) are passed.', async function() {
                    /**
                     * case folder should be caseFolder3Id.
                     * employee and location id is taken from insurance.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                patientId: this.patientId,
                                caseFolderId: this.caseFolder4Id
                            },
                            caseFolderType: 'PUBLIC'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder4Id );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );
            } );
            describe( 'call api.activity.getActivityDataForPatient. provide entire patient.', function() {
                let
                    patient;

                before( async function() {
                    let result = await Y.doccirrus.mongodb.runDb( {
                        model: 'patient',
                        user,
                        query: {
                            _id: this.patientId
                        },
                        options: {
                            lean: true
                        }
                    } );
                    patient = result[0];
                    patient._id = patient._id.toString();
                } );
                it( 'only patient is passed.', async function() {
                    /**
                     * case folder is taken from activeCaseFolderId, employee and location ids are taken from Schein
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {},
                            patient
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder1Id );
                    result.locationId.should.equal( this.scheinLocationId );
                    result.employeeId.should.equal( this.scheinEmployeeId );
                } );
                it( 'patient and caseFolderType (PRIVATE) are passed. ', async function() {
                    /**
                     * case folder should be last inserted (private) patient case folder.
                     * employee and location id is taken from insurance, because case folder is empty.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            patient,
                            caseFolderType: 'PRIVATE'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.lastPrivateCaseFolder );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );
                it( 'patient and caseFolderType (PUBLIC) are passed. ', async function() {
                    /**
                     * case folder should be last inserted (public) patient case folder.
                     * employee and location id is taken from last activity - another location and second employee.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            patient,
                            caseFolderType: 'PUBLIC'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.lastPublicCaseFolder );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );

                it( 'patient and case folder id are passed.', async function() {
                    /**
                     * employee and location are taken from Schein
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                caseFolderId: this.caseFolder1Id
                            },
                            patient
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder1Id );
                    result.locationId.should.equal( this.scheinLocationId );
                    result.employeeId.should.equal( this.scheinEmployeeId );
                } );
                it( 'patient, case folder Id and caseFolderType (PRIVATE) are passed.', async function() {
                    /**
                     * case folder should be caseFolder3Id.
                     * employee and location id is taken from last activity.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                caseFolderId: this.caseFolder3Id
                            },
                            patient,
                            caseFolderType: 'PRIVATE'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder3Id );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );
                it( 'patient, case folder Id and caseFolderType (PUBLIC) are passed.', async function() {
                    /**
                     * case folder should be caseFolder3Id.
                     * employee and location id is taken from insurance.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                caseFolderId: this.caseFolder4Id
                            },
                            patient,
                            caseFolderType: 'PUBLIC'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder4Id );
                    result.locationId.should.equal( this.anotherLocationId );
                    result.employeeId.should.equal( this.employee2Id );
                } );
            } );
            describe( 'call api.activity.getActivityDataForPatient. provide entire casefolder.', function() {
                let
                    patient,
                    caseFolder;

                before( async function() {
                    let result = await Y.doccirrus.mongodb.runDb( {
                        model: 'patient',
                        user,
                        action: 'get',
                        query: {
                            _id: this.patientId
                        },
                        options: {
                            lean: true
                        }
                    } );
                    patient = result[0];
                    patient._id = patient._id.toString();

                    result = await Y.doccirrus.mongodb.runDb( {
                        model: 'casefolder',
                        user,
                        action: 'get',
                        query: {
                            _id: this.caseFolder2Id
                        },
                        options: {
                            lean: true
                        }
                    } );
                    caseFolder = result[0];
                    caseFolder._id = caseFolder._id.toString();
                } );

                it( 'only caseFolder is passed.', async function() {
                    /**
                     * employee and location ids are taken from last activity
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            activity: {
                                patientId: this.patientId
                            },
                            caseFolder
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder2Id );
                    result.locationId.should.equal( this.mainLocationId );
                    result.employeeId.should.equal( this.employeeId );
                } );
                it( 'patient and caseFolder are passed. ', async function() {
                    /**
                     * case folder should be last inserted (private) patient case folder.
                     * employee and location id is taken from insurance, because case folder is empty.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            patient,
                            caseFolder
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder2Id );
                    result.locationId.should.equal( this.mainLocationId );
                    result.employeeId.should.equal( this.employeeId );
                } );
                it( 'patient, caseFolder and caseFolderType (PRIVATE) are passed. ', async function() {
                    /**
                     * case folder should be last inserted (private) patient case folder.
                     * employee and location id is taken from insurance, because case folder is empty.
                     */
                    let result = await getActivityDataForPatient( {
                        user,
                        data: {
                            patient,
                            caseFolder,
                            caseFolderType: 'PUBLIC'
                        }
                    } );
                    result.should.be.an( 'object' );
                    result.patientId.should.equal( this.patientId );
                    result.caseFolderId.should.equal( this.caseFolder2Id );
                    result.locationId.should.equal( this.mainLocationId );
                    result.employeeId.should.equal( this.employeeId );
                } );
            } );
            describe( 'call api.activity.getActivityDataForPatient. provide no case folder data.', function() {
                describe( 'Check if case folder of last schein is caught.', function() {
                    let
                        data;

                    before( async function() {
                        await Y.doccirrus.mongodb.runDb( {
                            model: 'patient',
                            user,
                            action: 'put',
                            query: {
                                _id: this.patientId
                            },
                            fields: ['activeCaseFolderId'],
                            data: {
                                activeCaseFolderId: this.caseFolder3Id,
                                skipcheck_: true
                            }
                        } );
                    } );

                    it( 'Makes api call', async function() {
                        /**
                         * casefolder are taken from last activity
                         */
                        let result = await getActivityDataForPatient( {
                            user,
                            data: {
                                activity: {
                                    patientId: this.patientId
                                }
                            }
                        } );
                        result.should.be.an( 'object' );
                        data = result;
                    } );
                    it( 'Checks case folder id', function() {
                        data.caseFolderId.should.equal( this.caseFolder1Id );
                    } );
                    it( 'Checks patient id', function() {
                        data.patientId.should.equal( this.patientId );
                    } );
                    it( 'Checks location id', function() {
                        data.locationId.should.equal( this.mainLocationId );
                    } );
                    it( 'Checks employee id', function() {
                        data.employeeId.should.equal( this.employeeId );
                    } );
                } );
                describe( 'Check if case folder of last schein is caught.', function() {
                    let
                        data;

                    before( async function() {
                        await Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'delete',
                            query: {
                                _id: this.scheinId
                            }
                        } );
                    } );

                    it( 'Makes api call', async function() {
                        /**
                         * casefolder are taken from last activity
                         */
                        let result = await getActivityDataForPatient( {
                            user,
                            data: {
                                activity: {
                                    patientId: this.patientId
                                }
                            }
                        } );
                        result.should.be.an( 'object' );
                        data = result;
                    } );
                    it( 'Checks case folder id', function() {
                        data.caseFolderId.should.equal( this.caseFolder3Id );
                    } );
                    it( 'Checks patient id', function() {
                        data.patientId.should.equal( this.patientId );
                    } );
                    it( 'Checks location id', function() {
                        data.locationId.should.equal( this.anotherLocationId );
                    } );
                    it( 'Checks employee id', function() {
                        data.employeeId.should.equal( this.employee2Id );
                    } );
                } );
                describe( 'Check if case folder of last activity is caught.', function() {
                    let
                        data;

                    before( async function() {
                        await Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( getActivityData( {
                                caseFolderId: this.caseFolder3Id,
                                locationId: this.anotherLocationId,
                                employeeId: this.employeeId,
                                patientId: this.patientId
                            } ) )
                        } );
                    } );

                    it( 'Makes api call', async function() {
                        /**
                         * casefolder are taken from last activity
                         */
                        let result = await getActivityDataForPatient( {
                            user,
                            data: {
                                activity: {
                                    patientId: this.patientId
                                }
                            }
                        } );
                        result.should.be.an( 'object' );
                        data = result;
                    } );
                    it( 'Checks case folder id', function() {
                        data.caseFolderId.should.equal( this.caseFolder3Id );
                    } );
                    it( 'Checks patient id', function() {
                        data.patientId.should.equal( this.patientId );
                    } );
                    it( 'Checks location id', function() {
                        data.locationId.should.equal( this.anotherLocationId );
                    } );
                    it( 'Checks employee id', function() {
                        data.employeeId.should.equal( this.employeeId );
                    } );
                } );

                describe( 'Check if patient is "empty".', function() {
                    let
                        data;

                    before( async function() {
                        await Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'delete',
                            query: {
                                _id: {$exists: true}
                            },
                            options: {
                                override: true
                            }
                        } );
                        await Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'casefolder',
                            action: 'delete',
                            query: {
                                _id: {$exists: true}
                            },
                            options: {
                                override: true
                            }
                        } );
                    } );

                    it( 'Makes api call', async function() {
                        /**
                         * casefolder are taken from last activity
                         */
                        let result = await getActivityDataForPatient( {
                            user,
                            data: {
                                activity: {
                                    patientId: this.patientId
                                }
                            }
                        } );
                        result.should.be.an( 'object' );
                        data = result;
                    } );
                    it( 'Checks case folder id', function() {
                        should.not.exist( data.caseFolderId );
                    } );
                    it( 'Checks patient id', function() {
                        data.patientId.should.equal( this.patientId );
                    } );
                    it( 'Checks location id', function() {
                        should.not.exist( data.locationId );
                    } );
                    it( 'Checks employee id', function() {
                        should.not.exist( data.employeeId );
                    } );
                } );
                describe( 'Check if patient is "empty", but caseFolderType is set.', function() {
                    let
                        data;
                    it( 'Makes api call', async function() {
                        /**
                         * casefolder are taken from last activity
                         */
                        let result = await getActivityDataForPatient( {
                            user,
                            data: {
                                activity: {
                                    patientId: this.patientId
                                },
                                caseFolderType: 'PRIVATE'
                            }
                        } );
                        result.should.be.an( 'object' );
                        data = result;
                    } );
                    it( 'Checks case folder id', function() {
                        should.not.exist( data.caseFolderId );
                    } );
                    it( 'Checks patient id', function() {
                        data.patientId.should.equal( this.patientId );
                    } );
                    it( 'Checks location id', function() {
                        data.locationId.should.equal( this.anotherLocationId );
                    } );
                    it( 'Checks employee id', function() {
                        data.employeeId.should.equal( this.employee2Id );
                    } );
                } );
            } );
        } );
        describe( 'Check api.activity.getNextTimestamp', function() {
            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
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
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                        patientId: this.patientId,
                        _id: this.caseFolder1Id
                    } ) )
                } );
            } );

            describe( 'functionality check', function() {
                const currentTimestamp = moment().subtract( 10, 'minutes' ).toDate();
                it( 'function call on empty data', async function() {
                    let newTimestamp = await Y.doccirrus.api.activity.getNextTimestamp( {
                        user,
                        activity: { //only few data is needed here
                            timestamp: currentTimestamp,
                            caseFolderId: this.caseFolder1Id
                        },
                        options: {
                            setTimestamp: currentTimestamp,
                            currentDate: false
                        }
                    } );
                    should.exist( newTimestamp );

                    let diff = moment( newTimestamp ).diff( moment( currentTimestamp ) ) / 1000 * 2; //expected result in seconds

                    diff.should.be.equal( 55 );
                } );
                it( 'currentDate = true, should return current date', async function() {
                    let newTimestamp = await Y.doccirrus.api.activity.getNextTimestamp( {
                        user,
                        activity: { //only few data is needed here
                            timestamp: currentTimestamp,
                            caseFolderId: this.caseFolder1Id
                        },
                        options: {
                            setTimestamp: currentTimestamp,
                            currentDate: true
                        }
                    } );
                    should.exist( newTimestamp );

                    //new Timestamp should be close to now
                    let diff = moment( newTimestamp ).diff( moment() ) / 1000;
                    expect( diff ).to.be.at.most( 0.003 );
                } );
                it( 'function returns timestamp after latest activity', async function() {
                    const
                        activityTimestamp = moment().subtract( 3, 'minutes' ).toDate();

                    let results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'post',
                        data: {
                            actType: 'HISTORY',
                            patientId: this.patientId,
                            caseFolderId: this.caseFolder1Id,
                            locationId: this.mainLocationId,
                            employeeId: this.employeeId,
                            timestamp: activityTimestamp,
                            skipcheck_: true
                        }
                    } );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );

                    let newTimestamp = await Y.doccirrus.api.activity.getNextTimestamp( {
                        user,
                        activity: { //only few data is needed here
                            timestamp: currentTimestamp,
                            caseFolderId: this.caseFolder1Id
                        },
                        options: {
                            setTimestamp: currentTimestamp,
                            currentDate: false
                        }
                    } );
                    should.exist( newTimestamp );

                    let diff = moment( newTimestamp ).diff( moment( activityTimestamp ) ) / 1000 * 2; //expected result in seconds

                    diff.should.be.equal( 55 );
                } );
            } );

        } );
        describe( 'Create simple activity', async function() {
            const
                requiredFields = ['timestamp', 'patientId', 'caseFolderId', 'locationId'],
                checkForHexRegExp = /^[a-f\d]{24}$/i;

            before( function() {
                this.lastScheinStub = sinon.stub( Y.doccirrus.api.patient, 'lastSchein' ).callsFake( function( {
                                                                                                                   callback,
                                                                                                                   query
                                                                                                               } ) {
                    if( !Object.keys( query ).every( ( key ) => requiredFields.includes( key ) ) ||
                        !Object.values( query ).every( Boolean ) ) {
                        return callback( new Error( `Missing required param from ${requiredFields.join( ', ' )}` ) );
                    }
                    callback( null, [{employeeId: this.employeeId}] );
                } );
            } );

            after( function() {
                this.lastScheinStub.restore();
            } );

            it( 'should throw errors when a required parameter is missing', async function() {
                const testCases = [
                    {
                        input: {
                            user,
                            originalParams: {
                                activityData: {
                                    caseFolderId: this.activeCaseFolderId,
                                    timestamp: moment(),
                                    userContent: '',
                                    status: 'CREATED',
                                    actType: 'EXTERNAL',
                                    locationId: this.mainLocationId,
                                    employeeId: this.employeeId
                                }
                            }
                        },
                        expectedErrorMessage: 'createSimpleActivity: patientId not found in activityData'
                    },
                    {
                        input: {
                            user,
                            originalParams: {
                                activityData: {
                                    patientId: this.patientId,
                                    timestamp: moment(),
                                    userContent: '',
                                    status: 'CREATED',
                                    actType: 'EXTERNAL'
                                }
                            }
                        },
                        expectedErrorMessage: `Missing required param from ${requiredFields.join( ', ' )}`
                    }
                ];

                await genericNegativeTester( testCases, Y.doccirrus.api.activity.createSimpleActivity );
                // eslint-disable-next-line no-unused-expressions
                this.lastScheinStub.should.have.been.calledOnce;
            } );

            it( 'should return an activity ID', async function() {
                const testCases = [
                    {
                        input: {
                            user,
                            originalParams: {
                                activityData: {
                                    patientId: this.patientId,
                                    caseFolderId: this.activeCaseFolderId,
                                    timestamp: moment(),
                                    userContent: '',
                                    status: 'CREATED',
                                    actType: 'EXTERNAL',
                                    locationId: this.mainLocationId,
                                    employeeId: this.employeeId
                                }
                            }
                        },
                        expectedOutput: ( result ) => checkForHexRegExp.test( result )
                    },
                    {
                        input: {
                            user,
                            originalParams: {
                                activityData: {
                                    patientId: this.patientId,
                                    caseFolderId: this.activeCaseFolderId,
                                    timestamp: moment(),
                                    userContent: '',
                                    status: 'CREATED',
                                    actType: 'EXTERNAL',
                                    employeeId: this.employeeId
                                }
                            }
                        },
                        expectedOutput: ( result ) => checkForHexRegExp.test( result )
                    },
                    {
                        input: {
                            user,
                            originalParams: {
                                activityData: {
                                    patientId: this.patientId,
                                    caseFolderId: this.activeCaseFolderId,
                                    timestamp: moment(),
                                    userContent: '',
                                    status: 'CREATED',
                                    actType: 'EXTERNAL',
                                    locationId: this.mainLocationId,
                                    employeeId: this.employeeId
                                }
                            }
                        },
                        expectedOutput: ( result ) => checkForHexRegExp.test( result )
                    }
                ];

                await genericPositiveTester( testCases, Y.doccirrus.api.activity.createSimpleActivity );
                // eslint-disable-next-line no-unused-expressions
                this.lastScheinStub.should.have.been.called;
            } );
        } );
    } );

    context( 'ch', function() {
        before( async function() {
            countryMode = Y.config.doccirrus.Env.countryMode;
            Y.config.doccirrus.Env.countryMode = ['CH'];

            this.patientId = new mongoose.Types.ObjectId().toString();
            this.caseFolderId = new mongoose.Types.ObjectId().toString();
            this.employeeId = new mongoose.Types.ObjectId().toString();
            this.locationId = new mongoose.Types.ObjectId().toString();
            this.scheinId = new mongoose.Types.ObjectId().toString();
            this.location = mochaUtils.getLocationData( {
                _id: this.locationId,
                commercialNo: '198212401',
                countryMode: 'CH',
                countryCode: 'CH',
                zip: 1210,
                cantonCode: '3',
                bankIBAN: '01-162-8',
                esrNumber: '010001628',
                zsrNumber: "T277419"
            } );
            this.employeeData = mochaUtils.getEmployeeData( {
                _id: this.employeeId,
                countryMode: 'CH',
                zsrNumber: 'T277489',
                qualiDignities: ['0000', '9999']
            } );
            this.patientData = mochaUtils.getPatientData( {_id: this.patientId, countryMode: 'CH', cantonCode: '3'} );
            this.caseFolderData = mochaUtils.getCaseFolderData( {
                type: 'PRIVATE_CH',
                patientId: this.patientId.toString(),
                _id: this.caseFolderId, countryMode: 'CH'
            } );
            this.tarmedCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'TARMED'
            } );
            this.scheinData = {
                ...swissPKVschein,
                _id: mongoose.Types.ObjectId(this.scheinId),
                locationId: mongoose.Types.ObjectId(this.locationId),
                patientId: this.patientId.toString(),
                employeeId: this.employeeId.toString(),
                caseFolderId: this.caseFolderId.toString(),
                timestamp: new Date( '2021-01-30T23:00:00.000Z' ).toISOString()
            };

            let catalogModel;
            catalogModel = await getModelProm( user, 'catalog', true );
            await postEntry( 'catalog', catalogQualiDignities );
            await postEntry( 'location', Y.doccirrus.filters.cleanDbObject( this.location ) );
            await postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( this.employeeData ) );
            // user.specifiedBy = this.employeeId;
            await postEntry( 'patient', Y.doccirrus.filters.cleanDbObject( this.patientData ) );
            await postEntry( 'casefolder', Y.doccirrus.filters.cleanDbObject( this.caseFolderData ) );
            await postEntry( 'activity', this.scheinData );

            for( let catalogTreatment of catalogTreatments ) {      // eslint-disable-line no-unused-vars
                await catalogModel.mongoose.collection.insert( {
                    ...catalogTreatment,
                    catalog: this.tarmedCatalogDescriptor.filename
                } );
            }

            this.treatment_0010 = undefined;

            this.swissPatientId = new mongoose.Types.ObjectId();
            this.swissCaseFolderId = new mongoose.Types.ObjectId();
            this.invoiceRefId = new mongoose.Types.ObjectId();
            this.invoiceId = new mongoose.Types.ObjectId();
            this.INVOICE = {
                ...testData.INVOICE,
                locationId: this.locationId.toString(),
                employeeId: this.employeeId.toString(),
                caseFolderId: this.swissCaseFolderId.toString(),
                patientId: this.swissPatientId.toString()
            };
            this.INVOICEREF = {
                ...testData.INVOICEREF,
                locationId: this.locationId.toString(),
                employeeId: this.employeeId.toString(),
                caseFolderId: this.swissCaseFolderId.toString(),
                patientId: this.swissPatientId.toString()
            };

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'post',
                data: {
                    ...mochaUtils.getPatientData( {_id: this.swissPatientId, countryMode: 'CH'} ),
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'post',
                data: {
                    ...mochaUtils.getCaseFolderData( {
                        _id: this.swissCaseFolderId,
                        patientId: this.swissPatientId.toString(),
                        type: 'PRIVATE_CH'
                    } ),
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: {
                    _id: this.invoiceId,
                    ...this.INVOICE,
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: {
                    _id: this.invoiceRefId,
                    ...this.INVOICEREF,
                    skipcheck_: true
                }
            } );
        } );
        after( async function() {
            await cleanDb( {user} );
            Y.config.doccirrus.Env.countryMode = countryMode || ['D'];
        } );
        describe( 'Check api.activity.createCommunicationFromMediport: ', function() {
            it( 'Accepted response', async function() {
                const {acceptedCommunication, savedAcceptedCommunication} = testData;
                acceptedCommunication.locationId = this.locationId;
                acceptedCommunication.employeeId = this.employeeId.toString();
                acceptedCommunication.caseFolderId = this.swissCaseFolderId.toString();
                savedAcceptedCommunication.locationId = new mongoose.Types.ObjectId( this.locationId );
                savedAcceptedCommunication.employeeId = this.employeeId.toString();
                savedAcceptedCommunication.caseFolderId = this.swissCaseFolderId.toString();
                savedAcceptedCommunication.patientId = this.swissPatientId.toString();

                const data = {
                    communication: acceptedCommunication,
                    invoiceRef: {
                        _id: this.invoiceRefId,
                        ...this.INVOICEREF
                    },
                    documents: [],
                    status: 'ACCEPTED'
                };
                let res = await createCommunicationFromMediport( {
                    user,
                    data,
                    query: {_id: this.swissPatientId.toString()}
                } );
                // savedAcceptedCommunication.referencedBy = [this.invoiceRefId.toString()];
                res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: res
                    },
                    options: {
                        lean: true
                    }
                } );
                const savedCommunication = res[0];
                expectToInclude(savedCommunication, savedAcceptedCommunication);
                await checkInvoiceStatus( this.invoiceRefId.toString(), 'MEDIDATAREJECTED' );
            } );
            it( 'Pending response', async function() {
                const {pendingCommunication, savedPeindingCommunication, pendingTask} = testData;
                pendingCommunication.locationId = this.mainLocationId;
                pendingCommunication.employeeId = this.employeeId.toString();
                pendingCommunication.caseFolderId = this.swissCaseFolderId.toString();
                savedPeindingCommunication.locationId = new mongoose.Types.ObjectId( this.locationId );
                savedPeindingCommunication.employeeId = this.employeeId.toString();
                savedPeindingCommunication.caseFolderId = this.swissCaseFolderId.toString();
                savedPeindingCommunication.patientId = this.swissPatientId.toString();

                pendingTask.employeeId = this.employeeId.toString();
                pendingTask.patientId = this.swissPatientId.toString();
                pendingTask.candidates = [this.employeeId.toString()];
                const data = {
                    communication: pendingCommunication,
                    invoiceRef: {
                        _id: this.invoiceId,
                        ...this.INVOICE
                    },
                    documents: [],
                    status: 'INCOMPLETE'
                };
                let res = await createCommunicationFromMediport( {
                    user,
                    data,
                    query: {_id: this.swissPatientId.toString()}
                } );
                savedPeindingCommunication.referencedBy = [this.invoiceId.toString()];
                res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: res
                    },
                    options: {
                        lean: true
                    }
                } );
                pendingTask.activityId = res[0]._id.toString();
                const savedCommunication = res[0];
                expectToInclude(savedCommunication, savedPeindingCommunication);
                res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {
                        roles: [Y.doccirrus.schemas.role.ROLES.INVOICE]
                    },
                    options: {
                        sort: {
                            _id: -1
                        },
                        lean: true
                    }
                } );
                const task = res[0];
                expectToInclude(task, pendingTask);
                await checkInvoiceStatus( this.invoiceId.toString(), 'APPROVED' );
            } );
            it( 'Rejected response', async function() {
                // this.skip();
                const {rejectedCommunication, savedRejectedCommunication = {}, rejectedTask = {}} = testData;
                rejectedCommunication.locationId = this.locationId;
                rejectedCommunication.employeeId = this.employeeId.toString();
                rejectedCommunication.caseFolderId = this.swissCaseFolderId.toString();
                savedRejectedCommunication.locationId = new mongoose.Types.ObjectId( this.locationId );
                savedRejectedCommunication.employeeId = this.employeeId.toString();
                savedRejectedCommunication.caseFolderId = this.swissCaseFolderId.toString();
                savedRejectedCommunication.patientId = this.swissPatientId.toString();

                rejectedTask.employeeId = this.employeeId.toString();
                rejectedTask.patientId = this.swissPatientId.toString();
                rejectedTask.candidates = [this.employeeId.toString()];
                const data = {
                    communication: rejectedCommunication,
                    invoiceRef: {
                        _id: this.invoiceRefId,
                        ...this.INVOICEREF
                    },
                    documents: [],
                    status: 'CANCELLED'
                };
                let res = await createCommunicationFromMediport( {
                    user,
                    data,
                    query: {_id: this.swissPatientId.toString()}
                } );

                res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: res
                    },
                    options: {
                        lean: true
                    }
                } );
                // rejectedTask.activityId = res[0]._id.toString();
                const savedCommunication = res[0];
                expectToInclude(savedCommunication, savedRejectedCommunication);
                res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {
                        roles: [Y.doccirrus.schemas.role.ROLES.INVOICE]
                    },
                    options: {
                        sort: {
                            _id: -1
                        },
                        lean: true
                    }
                } );
                const task = res[0];
                expectToInclude(task, rejectedTask);

                //communication should be linked to invoiceRef
                expect( savedCommunication.referencedBy ).to.include( this.invoiceRefId.toString() );
                await checkInvoiceStatus( this.invoiceRefId.toString(), 'MEDIDATAREJECTED' );
            } );
        } );
        describe( 'Check api.activity.calculateActivityMedicalScalingFactor', function() {
            it( 'should return catalog value if doctor\'s dignity doesn\'t match tarmedInvoiceFactorValues', async function() {
                let newMedicalScalingFactor;
                this.treatment_0010 = catalogTreatments.find( t => t.seq === '00.0010' );
                this.treatment_0010.medicalScalingFactor = 0.93;
                this.treatment_0010.code = this.treatment_0010.seq;
                this.treatment_0010.caseFolderId = this.caseFolderId;
                this.treatment_0010.employeeId = this.employeeId;
                this.treatment_0010.locationId = this.locationId;

                newMedicalScalingFactor = await calculateActivityMedicalScalingFactorP( {
                    user,
                    originalParams: {
                        activityData: this.treatment_0010,
                        tarmedInvoiceFactorValues
                    }
                } );

                newMedicalScalingFactor.should.be.equal( 1 );
            } );

            it( 'should return dignity scaling factor if doctor\'s dignity match tarmedInvoiceFactorValues ', async function() {
                let newMedicalScalingFactor;
                this.treatment_0010.medicalScalingFactor = 1;

                newMedicalScalingFactor = await calculateActivityMedicalScalingFactorP( {
                    user,
                    originalParams: {
                        activityData: this.treatment_0010,
                        employeeDignities: ['3000'],
                        tarmedInvoiceFactorValues
                    }
                } );

                newMedicalScalingFactor.should.be.equal( 0.93 );
            } );

            it( 'Should return catalog value when employeeId or caseFolderId missing', async function() {
                let newMedicalScalingFactor;
                this.treatment_0010.medicalScalingFactor = 1;
                this.treatment_0010.employeeId = undefined;
                this.treatment_0010.caseFolderId = undefined;

                newMedicalScalingFactor = await calculateActivityMedicalScalingFactorP( {
                    user,
                    originalParams: {
                        activityData: this.treatment_0010,
                        employeeDignities: ['3000'],
                        tarmedInvoiceFactorValues
                    }
                } );

                newMedicalScalingFactor.should.be.equal( 1 );
            } );

            it( 'Should return catalog value when doctor\'s dignity matched with tarmedInvoiceFactorValues but catalog value is not 0 or 1', async function() {
                let newMedicalScalingFactor;
                const treatment = catalogTreatments.find( t => t.seq === '00.2550' );

                treatment.code = treatment.seq;
                treatment.employeeId = this.employeeId;
                treatment.caseFolderId = this.caseFolderId;
                treatment.locationId = this.locationId;

                newMedicalScalingFactor = await calculateActivityMedicalScalingFactorP( {
                    user,
                    originalParams: {
                        activityData: treatment,
                        employeeDignities: ['3000'],
                        tarmedInvoiceFactorValues
                    }
                } );

                newMedicalScalingFactor.should.be.equal( 0.5 );
            } );
        } );

        before(async function (  ) {
            let treatmentTime = 1612188000000;   // 2021-02-01T14:00:00.000Z
            for( let catalogTreatment of catalogTreatments ) {      // eslint-disable-line no-unused-vars
                await postEntry( 'activity', {
                    ...catalogTreatment,
                    catalog: true,
                    actType: 'TREATMENT',
                    catalogShort: 'TARMED',
                    locationId: this.locationId,
                    patientId: this.patientId.toString(),
                    employeeId: this.employeeId.toString(),
                    caseFolderId: this.caseFolderId.toString(),
                    timestamp: new Date( treatmentTime ).toISOString()
                } );
                treatmentTime += 300000;    // plus 5 min
            }
        });

        describe( 'getOnHoldActivities', function() {
            const getOnHoldActivitiesP = promisifyArgsCallback(Y.doccirrus.api.activity.getOnHoldActivities);
            it( 'Should return empty array when there is no schien on hold', async function(  ) {
                const result = await getOnHoldActivitiesP({
                    user,
                    query: {
                        caseFolderId: this.caseFolderId
                    }
                });

                expect(JSON.stringify(result)).to.be.equal('[]');
            });
            it( 'Should return on hold activities', async function(  ) {
                const schein = this.scheinData;
                schein._id = this.scheinId.toString();
                schein.onHold = true;
                schein.onHoldNotes = 'notes';
                const schienFsm = Y.doccirrus.schemas.activity.getFSMName( schein.actType );

                await fsmStateChangePromise(user, {}, schein, false, Y.doccirrus.fsm[schienFsm].validate);
                const result = await getOnHoldActivitiesP({
                    user,
                    query: {
                        caseFolderId: this.caseFolderId
                    }
                });
                expect(result.length).to.be.equal(6);
            } );
        });
    } );
} );
