/*global Y, it, describe, should, context, before, after, expect */

const
    dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, //the date format of JSON
    util = require( 'util' ),
    fs = require( 'fs' ),
    moment = require( 'moment' ),
    mongoose = require( 'mongoose' ),
    path = require( 'path' ),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal(),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    patientId1 = new mongoose.Types.ObjectId().toString(),
    caseFolderId1 = new mongoose.Types.ObjectId().toString(),
    caseFolderId2 = new mongoose.Types.ObjectId().toString(),
    employeeId1 = new mongoose.Types.ObjectId().toString(),
    employeeId2 = new mongoose.Types.ObjectId().toString(),
    employeeId3 = new mongoose.Types.ObjectId().toString(),
    employeeId4 = new mongoose.Types.ObjectId().toString(),
    locationId1 = new mongoose.Types.ObjectId( '000000000000000000000005' ).toString(),
    locationId2 = new mongoose.Types.ObjectId( '000000000000000000000002' ).toString(),
    locationId3 = new mongoose.Types.ObjectId( '000000000000000000000003' ).toString(),
    locationId4 = new mongoose.Types.ObjectId( '000000000000000000000004' ).toString(),
    readFile = util.promisify( fs.readFile ),
    gdtToFinding = util.promisify( Y.doccirrus.api.gdt.gdtToFinding ),
    generatePatientData21 = util.promisify( Y.doccirrus.api.gdt.generatePatientData ),
    gdtFilesPath = `${process.cwd()}/mojits/TestingMojit/tests/gdtFiles/`,
    validParsedDataPath = `${process.cwd()}/mojits/TestingMojit/tests/validParsed/gdt/`,
    files = ["MOJ-9009_NOFILE", "MOJ-9009_FILE", "KalthoffGdt", "GDT3_untersuchungsdaten"],
    specifiedBy = new mongoose.Types.ObjectId().toString(),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    locationPostP = promisifyArgsCallback( Y.doccirrus.api.location.post ),
    employeePostP = promisifyArgsCallback( Y.doccirrus.api.employee.post ),
    patientPostP = promisifyArgsCallback( Y.doccirrus.api.patient.post ),
    casefolderPostP = promisifyArgsCallback( Y.doccirrus.api.casefolder.post ),
    activityPostP = promisifyArgsCallback( Y.doccirrus.api.activity.post );

let
    scheinId1,
    scheinId2,
    createdActivities1 = [],
    createdActivities2 = [];

//convert date from string to object
function reviverGDT2( key, value ) {
    if( typeof value === "string" && dateFormat.test( value ) ) {
        return new Date( value );
    }

    return value;
}

function reviverGDT3( key, value ) {
    if( typeof value === "string" && dateFormat.test( value ) ) {
        // return new Date(value);
        const newDate = new Date( value );
        if( key === 'collDate' ) {
            const currentDate = new moment();
            newDate.setFullYear( currentDate.year() );
            newDate.setMonth( currentDate.month() );
            newDate.setDate( currentDate.date() );
        }
        return newDate;
    }
    return value;
}

function getScheinData( config = {} ) {
    let
        date = moment( mochaUtils.generateNewDate() ),
        schein = {
            scheinQuarter: date.get( 'quarter' ),
            scheinYear: date.get( 'year' ),
            status: 'VALID',
            scheinType: '0101',
            scheinSubgroup: '00'
        };
    schein = mochaUtils.getActivityData( Object.assign( config, schein ) );
    return schein;
}

async function parseGDTFile( args ) {
    const {
        data,
        softValidation
    } = args;

    return new Promise( function( resolve, reject ) {
        Y.doccirrus.api.xdtParser.parse( {
            data: data,
            xdt: "gdt",
            softValidation: softValidation,
            callback: ( err, gdtJson ) => {
                if( err ) {
                    return reject( err );
                }
                return resolve( {
                    gdtJson: gdtJson,
                    version: gdtJson.versionUsed.name
                } );
            }
        } );
    } );
}

/**
 *
 * @param {String} pathToFile
 * @return {Promise<Buffer>}
 */
async function sanitizeXDTFile( pathToFile ) {
    let stringData;
    const pathToLoadXdtFile = path.resolve( pathToFile );

    let data = await readFile( pathToLoadXdtFile );

    //Sanitize LF/CR to CRLF for the xDT parser
    stringData = data && data.toString();
    const indexOfCRLF = stringData && stringData.indexOf( '\r\n', 1 );
    if( indexOfCRLF === -1 ) {
        if( stringData.indexOf( '\r' ) === -1 ) {
            //LF
            stringData = stringData.replace( /\n/gm, "\r\n" );
        } else {
            //CR
            stringData = stringData.replace( /\r/gm, "\r\n" );
        }
        data = new Buffer( stringData );
    }
    return data;
}

describe( 'gdt-api', function() {
    describe( 'GDT-API Import Test', function() {

        describe( '0 Setup Data', function() {
            it( '0.1 Insert employee1', function( done ) {
                let
                    employeeData = mochaUtils.getEmployeeData( {
                        _id: employeeId1
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( employeeId1 );
                    done();
                } );
            } );
            it( '0.2 Insert employee2', function( done ) {
                let
                    employeeData = mochaUtils.getEmployeeData( {
                        _id: employeeId2
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( employeeId2 );
                    done();
                } );
            } );
            it( '0.3 Insert location1', async function() {
                const locationData = mochaUtils.getLocationData( {
                    _id: locationId1,
                    commercialNo: '100714102'
                } );

                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: locationId1
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                should.not.exist( err );
                if( !(result && result.length) ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( locationData )
                        } )
                    );

                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( locationId1 );
                }
            } );
            it( '0.4 Insert location2', async function() {
                const locationData = mochaUtils.getLocationData( {
                    _id: locationId2,
                    commercialNo: '100714103'
                } );

                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: locationId2
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                should.not.exist( err );
                if( !(result && result.length) ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( locationData )
                        } )
                    );

                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( locationId2 );
                }
            } );
            it( '0.5 Should insert Testpatient 1 to DB', function( done ) {
                let
                    patientData = mochaUtils.getPatientData( {
                        firstname: 'Test1',
                        lastname: 'Test1',
                        _id: patientId1,
                        activeCaseFolderId: caseFolderId1,
                        patientNo: "1446",
                        patientNumber: 1446,
                        kbvDob: '01.01.1990',
                        dob: moment( '1989-12-31T23:00:00.000Z' ).toISOString(),
                        insuranceStatus: [
                            {
                                insuranceId: '109519005',
                                insuranceName: 'AOK Nordost - Die Gesundheitskasse',
                                insurancePrintName: 'AOK Nordost',
                                insuranceGrpId: '72101',
                                type: 'PUBLIC',
                                kv: '72',
                                locationId: locationId1,
                                employeeId: employeeId1,
                                address2: '10957 Berlin',
                                address1: 'Wilhelmstraße 1',
                                bgNumber: '',
                                unzkv: [],
                                fused: false,
                                feeSchedule: '1',
                                costCarrierBillingGroup: '01',
                                costCarrierBillingSection: '00',
                                dmp: '',
                                persGroup: '',
                                insuranceKind: '1',
                                fk4110: null,
                                fk4133: null
                            }
                        ]
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( patientId1 );
                    done();
                } );
            } );
            it( '0.6 Should insert CaseFolder for Testpatient 1 to DB', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        patientId: patientId1,
                        _id: caseFolderId1,
                        type: 'PUBLIC'
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( caseFolderId1 );
                    done();
                } );
            } );
            it( '0.7 Should insert SCHEIN1 for Testpatient 1 to DB', function( done ) {
                var schein = getScheinData( {
                    timestamp: moment( '01.04.2020', 'DD.MM.YYYY' ).toISOString(),
                    caseFolderId: caseFolderId1,
                    locationId: locationId1,
                    patientId: patientId1,
                    actType: 'SCHEIN',
                    employeeId: employeeId1
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    scheinId1 = results[0];
                    done();
                } );
            } );
            it( '0.8 Should insert SCHEIN2 for Testpatient 1 to DB', function( done ) {
                var schein = getScheinData( {
                    timestamp: moment( '02.04.2020', 'DD.MM.YYYY' ).toISOString(),
                    caseFolderId: caseFolderId1,
                    locationId: locationId2,
                    patientId: patientId1,
                    actType: 'SCHEIN',
                    employeeId: employeeId2
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    scheinId2 = results[0];
                    done();
                } );
            } );
        } );

        describe( '1 GDT Parser', function() {
            for( const file of files ) {
                const
                    pathToLoadGdtFile = path.resolve( `${gdtFilesPath}${file}.gdt` ),
                    pathToLoadValidJSON = path.resolve( `${validParsedDataPath}${file}.json` );

                it( `1.${files.indexOf( file ) + 1} GDT Parser - File: ${file}`, async function() {
                    let [err, data] = await formatPromiseResult(
                        readFile( pathToLoadGdtFile )
                    );

                    should.not.exist( err );
                    should.exist( data );

                    let validData;
                    [err, validData] = await formatPromiseResult(
                        readFile( pathToLoadValidJSON )
                    );
                    should.not.exist( err );
                    should.exist( validData );

                    let parsedGDTFile;
                    [err, parsedGDTFile] = await formatPromiseResult(
                        parseGDTFile( {
                            softValidation: true,
                            data: data
                        } )
                    );
                    should.not.exist( err );
                    should.exist( parsedGDTFile );

                    // console.log( 'parsedGDTFile', JSON.stringify( parsedGDTFile.gdtJson ) );

                    if( parsedGDTFile.version.includes( 'gdt2' ) ) {
                        return parsedGDTFile.gdtJson.should.deep.equal( JSON.parse( validData, reviverGDT2 ) );
                    } else if( parsedGDTFile.version.includes( 'gdt3' ) ) {
                        return parsedGDTFile.gdtJson.should.deep.equal( JSON.parse( validData, reviverGDT3 ) );
                    }

                } );
            }
        } );

        describe( '2 Additional GDT Fields Test', function() {
            it( `2.1 Calling gdtToFinding`, async function() {
                let [err, data] = await formatPromiseResult(
                    readFile( `${gdtFilesPath}additionalGdtFields.gdt` )
                );

                should.not.exist( err );
                should.exist( data );

                let gdtToFindingResult;
                [err, gdtToFindingResult] = await formatPromiseResult(
                    gdtToFinding( {
                        user,
                        xdt: 'gdt.gdt21',
                        softValidation: true,
                        mapSubtype: undefined,
                        subtypeToMap: undefined,
                        deleteAttachments: false,
                        sourceFlowName: 'GDT Import Test',
                        buffer: data,
                        getOnlyInsuranceCaseFolder: true,
                        forceCreateNewActivity: true,
                        gdtMappingsForUnknownFields: [
                            {
                                _id: '5ebc05556cdf14683d647d2f',
                                gdtFieldNumber: '9000',
                                gdtMappingRegexString: '{treatmentCode}',
                                gdtMappingAction: 'createTreatment'
                            },
                            {
                                _id: '5eb9251acc98143d0a8917c1',
                                gdtFieldNumber: '9001',
                                gdtMappingRegexString: '{icdDescription}\\ \\(G\\+{icd10}\\)',
                                gdtMappingAction: 'createDiagnosis'
                            }
                        ],
                        title: 'GDT Import Test'
                    } )
                );

                should.not.exist( err );
                should.exist( gdtToFindingResult );
            } );
            it( `2.2 Checking if FINDING exists`, async function() {
                let [err, finding] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'FINDING',
                            patientId: patientId1,
                            locationId: locationId2,
                            caseFolderId: caseFolderId1,
                            employeeId: employeeId2,
                            patientLastName: 'Test1',
                            patientFirstName: 'Test1'
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( finding );
                finding.should.be.an( 'Array' );
                finding.should.have.length( 1 );
                createdActivities1.push( finding[0]._id.toString() );
            } );
            it( `2.3 Checking if DIAGNOSIS exists`, async function() {
                let [err, diagnosis] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'DIAGNOSIS',
                            patientId: patientId1,
                            locationId: locationId2,
                            caseFolderId: caseFolderId1,
                            employeeId: employeeId2,
                            patientLastName: 'Test1',
                            patientFirstName: 'Test1'
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( diagnosis );
                diagnosis.should.be.an( 'Array' );
                diagnosis.should.have.length( 1 );
                createdActivities1.push( diagnosis[0]._id.toString() );
            } );
        } );

        describe( '3 Delete setup data', function() {
            it( '3.1 Delete all created Activities', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        _id: {$in: createdActivities1}
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.2 Deletes SCHEIN1 from Testpatient 1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        _id: scheinId1
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.3 Deletes SCHEIN2 from Testpatient 1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        _id: scheinId2
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.4 Deletes caseFolder from Testpatient 1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'delete',
                    query: {
                        _id: caseFolderId1
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.5 Deletes patient from Testpatient 1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'delete',
                    query: {
                        _id: patientId1
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.6 Deletes employee1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'delete',
                    query: {
                        _id: employeeId1
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.7 Deletes employee2', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'delete',
                    query: {
                        _id: employeeId2
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.8 Deletes location1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'delete',
                    query: {
                        _id: locationId1
                    }
                } ).should.be.fulfilled;
            } );
            it( '3.9 Deletes location2', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'delete',
                    query: {
                        _id: locationId2
                    }
                } ).should.be.fulfilled;
            } );
        } );
    } );
    describe( 'GDT-API Export Test', function() {
        let user = Y.doccirrus.auth.getSUForLocal();
        user.specifiedBy = specifiedBy;

        describe( '0 Setup Data', function() {
            it( '0.1 Insert location3', async function() {
                const locationData = mochaUtils.getLocationData( {
                    _id: locationId3,
                    commercialNo: '140100000'
                } );

                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: locationId3
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                should.not.exist( err );
                if( !(result && result.length) ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( locationData )
                        } )
                    );

                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( locationId3 );
                }
            } );
            it( '0.2 Insert location4', async function() {
                const locationData = mochaUtils.getLocationData( {
                    _id: locationId4,
                    commercialNo: '100714104'
                } );

                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: locationId4
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                should.not.exist( err );
                if( !(result && result.length) ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( locationData )
                        } )
                    );

                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( locationId4 );
                }
            } );
            it( '0.3 Insert employee1', function( done ) {
                let
                    employeeData = mochaUtils.getEmployeeData( {
                        _id: employeeId3
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( employeeId3 );
                    done();
                } );
            } );
            it( '0.4 Insert employee2', function( done ) {
                let
                    employeeData = mochaUtils.getEmployeeData( {
                        _id: employeeId4
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( employeeId4 );
                    done();
                } );
            } );
            it( '0.5 Should insert Testpatient 1 to DB', function( done ) {
                let
                    patientData = mochaUtils.getPatientData( {
                        firstname: 'Test1',
                        lastname: 'Test1',
                        _id: patientId1,
                        activeCaseFolderId: caseFolderId2,
                        patientNo: "Z-1446",
                        patientNumber: 1446,
                        insuranceStatus: [
                            {
                                'fk4133': null,
                                'fk4110': null,
                                'insuranceKind': '3',
                                'costCarrierBillingSection': '',
                                'costCarrierBillingGroup': '',
                                'feeSchedule': '3',
                                'fused': false,
                                'unzkv': [],
                                'bgNumber': '',
                                'address1': '',
                                'address2': '',
                                'billingFactor': 'privatversicherte',
                                'dmp': '',
                                'fk4108': '',
                                'insuranceGrpId': '',
                                'insuranceId': '',
                                'insuranceName': 'Privat',
                                'insurancePrintName': 'Privat',
                                'kv': '',
                                'locationId': locationId3,
                                'persGroup': '',
                                'type': 'PRIVATE',
                                'policyHolder': ''
                            }
                        ]
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain( patientId1 );
                    done();
                } );
            } );
            it( '0.6 Should insert CaseFolder for Testpatient 1 to DB', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        patientId: patientId1,
                        _id: caseFolderId2,
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
                    result.should.contain( caseFolderId2 );
                    done();
                } );
            } );
            it( '0.7 Should insert SCHEIN1 for Testpatient 1 to DB', function( done ) {
                var schein = getScheinData( {
                    timestamp: moment( '01.03.2020', 'DD.MM.YYYY' ).toISOString(),
                    caseFolderId: caseFolderId2,
                    locationId: locationId3,
                    patientId: patientId1,
                    actType: 'PKVSCHEIN',
                    employeeId: employeeId3
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    createdActivities2.push( results[0] );
                    done();
                } );
            } );
            it( '0.8 Should insert SCHEIN2 for Testpatient 1 to DB', function( done ) {
                var schein = getScheinData( {
                    timestamp: moment( '02.03.2020', 'DD.MM.YYYY' ).toISOString(),
                    caseFolderId: caseFolderId2,
                    locationId: locationId4,
                    patientId: patientId1,
                    actType: 'PKVSCHEIN',
                    employeeId: employeeId4
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                }, function( err, results ) {
                    Boolean( err ).should.equal( false );
                    results.should.be.an( 'Array' );
                    results.should.have.length( 1 );
                    createdActivities2.push( results[0] );
                    done();
                } );
            } );
        } );

        describe( '1 GDT Patient Export', async function() {
            let
                err,
                patient,
                selectedActivity,
                lastSchein,
                customEmployee,
                customEmployee2,
                customLocation,
                customLocation2,
                generatedData;

            it( '1.1 generatePatientData21 with selected activities', async function() {
                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: patientId1
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( patient );
                patient.should.be.an( 'Array' );
                patient.should.have.length( 1 );

                [err, selectedActivity] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: createdActivities2[0]
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( selectedActivity );
                selectedActivity.should.be.an( 'Array' );
                selectedActivity.should.have.length( 1 );

                [err, customEmployee] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: employeeId3
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( customEmployee );
                customEmployee.should.be.an( 'Array' );
                customEmployee.should.have.length( 1 );

                [err, customLocation] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: locationId3
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( customLocation );
                customLocation.should.be.an( 'Array' );
                customLocation.should.have.length( 1 );

                [err, generatedData] = await formatPromiseResult(
                    generatePatientData21( {
                        encoding: "ISO 8859-15",
                        ignoreLen: true,
                        options: {
                            exportMedData: true,
                            mapBSNR: true,
                            mapBSNRTo: '0201',
                            mapCaseFolderId: true,
                            mapCaseFolderIdTo: '8310',
                            mapEmployeeId: true,
                            mapEmployeeIdTo: '8491',
                            mapResponsibleDoctor: true,
                            mapResponsibleDoctorTo: '8990'
                        },
                        patient: patient[0],
                        receiver: '',
                        sender: '',
                        selectedActivities: selectedActivity,
                        showOriginalId: false,
                        user: user,
                        customEmployee: customEmployee[0],
                        customLocation: customLocation[0]
                    } )
                );
                should.not.exist( err );
                should.exist( generatedData );

                const arrayOfFields = generatedData.toString().split( '\r\n' );

                const bsnrField = arrayOfFields.find( elem => elem.includes( '0180201' ) );
                const caseFolderField = arrayOfFields.find( elem => elem.includes( 'DCcaseFolderId' ) );
                const doctorField = arrayOfFields.find( elem => elem.includes( 'DCdoctorId' ) );
                const employeeField = arrayOfFields.find( elem => elem.includes( 'DCemployeeId' ) );

                should.exist( bsnrField );
                should.exist( caseFolderField );
                should.exist( doctorField );
                should.exist( employeeField );

                bsnrField.split( '0180201' )[1].should.equal( customLocation[0].commercialNo );
                caseFolderField.split( ' ' )[1].should.equal( caseFolderId2 );
                doctorField.split( ' ' )[1].should.equal( employeeId3 );
                employeeField.split( ' ' )[1].should.equal( specifiedBy );
            } );
            it( '1.2 generatePatientData21 without selected activities', async function() {
                [err, customEmployee2] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: employeeId4
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( customEmployee2 );
                customEmployee2.should.be.an( 'Array' );
                customEmployee2.should.have.length( 1 );

                [err, customLocation2] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: locationId4
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( customLocation2 );
                customLocation2.should.be.an( 'Array' );
                customLocation2.should.have.length( 1 );

                [err, lastSchein] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: createdActivities2[1]
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                should.not.exist( err );
                should.exist( lastSchein );
                lastSchein.should.be.an( 'Array' );
                lastSchein.should.have.length( 1 );

                [err, generatedData] = await formatPromiseResult(
                    generatePatientData21( {
                        encoding: "ISO 8859-15",
                        ignoreLen: true,
                        options: {
                            exportMedData: true,
                            mapBSNR: true,
                            mapBSNRTo: '0201',
                            mapCaseFolderId: true,
                            mapCaseFolderIdTo: '8310',
                            mapEmployeeId: true,
                            mapEmployeeIdTo: '8491',
                            mapResponsibleDoctor: true,
                            mapResponsibleDoctorTo: '8990'
                        },
                        patient: patient[0],
                        receiver: '',
                        sender: '',
                        selectedActivities: [],
                        showOriginalId: false,
                        user: user,
                        customEmployee: customEmployee2[0],
                        customLocation: customLocation2[0],
                        lastSchein: lastSchein[0]
                    } )
                );
                should.not.exist( err );
                should.exist( generatedData );

                const arrayOfFields = generatedData.toString().split( '\r\n' );

                const bsnrField = arrayOfFields.find( elem => elem.includes( '0180201' ) );
                const caseFolderField = arrayOfFields.find( elem => elem.includes( 'DCcaseFolderId' ) );
                const doctorField = arrayOfFields.find( elem => elem.includes( 'DCdoctorId' ) );
                const employeeField = arrayOfFields.find( elem => elem.includes( 'DCemployeeId' ) );

                should.exist( bsnrField );
                should.exist( caseFolderField );
                should.exist( doctorField );
                should.exist( employeeField );

                bsnrField.split( '0180201' )[1].should.equal( customLocation2[0].commercialNo );
                caseFolderField.split( ' ' )[1].should.equal( caseFolderId2 );
                doctorField.split( ' ' )[1].should.equal( employeeId4 );
                employeeField.split( ' ' )[1].should.equal( specifiedBy );
            } );
        } );

        describe( 'Delete setup data', function() {
            it( `Delete all created Activities`, function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        _id: {$in: createdActivities2}
                    }
                } ).should.be.fulfilled;
            } );
            it( 'Deletes caseFolder from Testpatient 1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'delete',
                    query: {
                        _id: caseFolderId2
                    }
                } ).should.be.fulfilled;
            } );
            it( 'Deletes Testpatient 1', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'delete',
                    query: {
                        _id: patientId1
                    }
                } ).should.be.fulfilled;
            } );
        } );
    } );

    context( 'given location', function contextLocation() {
        const [locationId, employeeId, patientId, publicCasefolderId, privateCasefolderId, publicScheinId, privateScheinId] = mochaUtils.getObjectIds();
        let location;

        before( async function beforeLocation() {
            await locationPostP( {
                user: user,
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId,
                    commercialNo: '100714102'
                } ) )
            } );
            this.location = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'get',
                query: {
                    _id: locationId
                },
                options: {
                    lean: true
                }
            } );
            location = this.location[0];
            this.gdtData = await sanitizeXDTFile( path.resolve( `${gdtFilesPath}LAM-2004.gdt` ) );
        } );

        after( async function afterLocation() {
            await cleanDb( {
                user: user,
                collections2clean: [
                    'location'
                ]
            } );
        } );

        context( 'given employees', function contextEmployee() {
            before( async function beforeEmployee() {
                await employeePostP( {
                    user: user,
                    data: {
                        employee: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getEmployeeData( {
                                countryMode: 'D',
                                locations: [
                                    {
                                        _id: locationId,
                                        locname: location.locname
                                    }
                                ],
                                _id: employeeId
                            } )
                        ),
                        identity: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getIdentityData( {
                                _id: undefined,
                                specifiedBy: employeeId,
                                username: 'randomUsername'
                            } )
                        )
                    }
                } );
                this.employee = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        _id: employeeId
                    },
                    options: {
                        lean: true
                    }
                } );
            } );

            after( async function afterEmployee() {
                await cleanDb( {
                    user: user,
                    collections2clean: [
                        'employee'
                    ]
                } );
            } );

            context( 'given patient', function contextPatient() {
                before( async function beforePatient() {
                    await patientPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getPatientData( {
                                countryMode: 'D',
                                insuranceStatus: [
                                    {
                                        insuranceId: '109519005',
                                        insuranceName: 'AOK Nordost - Die Gesundheitskasse',
                                        insurancePrintName: 'AOK Nordost',
                                        insuranceGrpId: '72101',
                                        type: 'PUBLIC',
                                        kv: '72',
                                        locationId: '000000000000000000000001',
                                        address2: '10957 Berlin',
                                        address1: 'Wilhelmstraße 1',
                                        bgNumber: '',
                                        unzkv: [],
                                        fused: false,
                                        feeSchedule: '1',
                                        costCarrierBillingGroup: '01',
                                        costCarrierBillingSection: '00',
                                        dmp: '',
                                        persGroup: '',
                                        insuranceKind: '1',
                                        fk4110: null,
                                        fk4133: null
                                    },
                                    {
                                        fk4133: null,
                                        fk4110: null,
                                        insuranceKind: "",
                                        costCarrierBillingSection: "00",
                                        costCarrierBillingGroup: "",
                                        feeSchedule: "3",
                                        fused: false,
                                        unzkv: [],
                                        bgNumber: "",
                                        address1: "Theodor-Heuss-Straße 96",
                                        address2: "49377 Vechta",
                                        zipcode: "",
                                        city: "",
                                        phone: "",
                                        insuranceLink: "",
                                        email: "",
                                        insuranceGLN: "",
                                        recipientGLN: "",
                                        department: "",
                                        isTiersGarant: false,
                                        isTiersPayant: true,
                                        insuranceNo: "222222",
                                        insuranceId: "168141427",
                                        insuranceName: "ALTE OLDENBURGER Krankenversicherung AG",
                                        insurancePrintName: "ALTE OLDENBURGER",
                                        type: "PRIVATE",
                                        billingFactor: "privatversicherte"
                                    }
                                ],
                                patientNumber: 53,
                                patientNo: '53',
                                _id: patientId
                            } )
                        )
                    } );
                    this.patient = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: patientId
                        },
                        options: {
                            lean: true
                        }
                    } );
                } );

                after( async function afterPatient() {
                    await cleanDb( {
                        user: user,
                        collections2clean: [
                            'patient'
                        ]
                    } );
                } );

                context( '.GDT_JSON()', function() {
                    context( 'given public and private casefolder', function() {
                        before( async function() {
                            await casefolderPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject(
                                    mochaUtils.getCaseFolderData( {
                                        _id: publicCasefolderId,
                                        patientId: patientId.toString()
                                    } )
                                )
                            } );
                            await casefolderPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject(
                                    mochaUtils.getCaseFolderData( {
                                        _id: privateCasefolderId,
                                        patientId: patientId.toString(),
                                        type: 'PRIVATE'
                                    } )
                                )
                            } );
                        } );

                        after( async function() {
                            await cleanDb( {
                                user: user,
                                collections2clean: [
                                    'casefolder'
                                ]
                            } );
                        } );

                        context( 'given newer GKV and older PKV schein', function() {
                            before( async function() {
                                await activityPostP( {
                                    user: user,
                                    data: Y.doccirrus.filters.cleanDbObject(
                                        mochaUtils.getScheinData( {
                                            _id: privateScheinId,
                                            patientId: patientId.toString(),
                                            employeeId: employeeId.toString(),
                                            caseFolderId: privateCasefolderId.toString(),
                                            locationId: locationId,
                                            actType: 'PKVSCHEIN'
                                        } )
                                    )
                                } );
                                await activityPostP( {
                                    user: user,
                                    data: Y.doccirrus.filters.cleanDbObject(
                                        mochaUtils.getScheinData( {
                                            _id: publicScheinId,
                                            patientId: patientId.toString(),
                                            employeeId: employeeId.toString(),
                                            caseFolderId: publicCasefolderId.toString(),
                                            locationId: locationId
                                        } )
                                    )
                                } );
                            } );

                            after( async function() {
                                await cleanDb( {
                                    user: user,
                                    collections2clean: [
                                        'activity',
                                        'gdtlog'
                                    ]
                                } );
                            } );

                            it( 'should pass running the GDT_JSON transformer', async function() {
                                const GDT_JSON_P = util.promisify( Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.GDT_JSON] );

                                await GDT_JSON_P(
                                    {
                                        transformer: {
                                            xdt: 'gdt.gdt20',
                                            softValidation: true,
                                            deleteAttachments: false,
                                            forceCreateNewActivity: true,
                                            gdtUseLastChangedActivity: true
                                        },
                                        input: {
                                            basePath: 'tmpPath',
                                            deviceServer: 'Test Device Server',
                                            data: this.gdtData,
                                            path: 'tmpPath'
                                        },
                                        title: 'asdf'
                                    },
                                    user
                                );
                            } );
                            it( 'FINDING should have public caseFolder set', async function() {
                                const finding = await Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'activity',
                                    action: 'get',
                                    query: {
                                        actType: 'FINDING',
                                        patientId: patientId,
                                        caseFolderId: publicCasefolderId,
                                        employeeId: employeeId,
                                        locationId: locationId
                                    }
                                } );
                                should.exist( finding );
                                finding.should.be.an( 'Array' ).of.length( 1 );
                            } );
                        } );
                        context( 'given older GKV and newer PKV schein', function() {
                            before( async function() {
                                await activityPostP( {
                                    user: user,
                                    data: Y.doccirrus.filters.cleanDbObject(
                                        mochaUtils.getScheinData( {
                                            _id: publicScheinId,
                                            patientId: patientId.toString(),
                                            employeeId: employeeId.toString(),
                                            caseFolderId: publicCasefolderId.toString(),
                                            locationId: locationId
                                        } )
                                    )
                                } );
                                await activityPostP( {
                                    user: user,
                                    data: Y.doccirrus.filters.cleanDbObject(
                                        mochaUtils.getScheinData( {
                                            _id: privateScheinId,
                                            patientId: patientId.toString(),
                                            employeeId: employeeId.toString(),
                                            caseFolderId: privateCasefolderId.toString(),
                                            locationId: locationId,
                                            actType: 'PKVSCHEIN'
                                        } )
                                    )
                                } );
                            } );

                            after( async function() {
                                await cleanDb( {
                                    user: user,
                                    collections2clean: [
                                        'activity',
                                        'gdtlog'
                                    ]
                                } );
                            } );

                            it( 'should pass running the GDT_JSON transformer', async function() {
                                const GDT_JSON_P = util.promisify( Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.GDT_JSON] );

                                await GDT_JSON_P(
                                    {
                                        transformer: {
                                            xdt: 'gdt.gdt20',
                                            softValidation: true,
                                            deleteAttachments: false,
                                            forceCreateNewActivity: true,
                                            gdtUseLastChangedActivity: true
                                        },
                                        input: {
                                            basePath: 'tmpPath',
                                            deviceServer: 'Test Device Server',
                                            data: this.gdtData,
                                            path: 'tmpPath'
                                        },
                                        title: 'asdf'
                                    },
                                    user
                                );
                            } );
                            it( 'FINDING should have private caseFolder set', async function() {
                                const finding = await Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'activity',
                                    action: 'get',
                                    query: {
                                        actType: 'FINDING',
                                        patientId: patientId,
                                        caseFolderId: privateCasefolderId,
                                        employeeId: employeeId,
                                        locationId: locationId
                                    }
                                } );
                                should.exist( finding );
                                finding.should.be.an( 'Array' ).of.length( 1 );
                            } );
                        } );
                        context( 'given no activity', function() {
                            after( async function() {
                                await cleanDb( {
                                    user: user,
                                    collections2clean: [
                                        'gdtlog'
                                    ]
                                } );
                            } );

                            it( 'should be rejected', async function() {
                                const GDT_JSON_P = util.promisify( Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.GDT_JSON] );

                                await expect( GDT_JSON_P(
                                    {
                                        transformer: {
                                            xdt: 'gdt.gdt20',
                                            softValidation: true,
                                            deleteAttachments: false,
                                            forceCreateNewActivity: true,
                                            gdtUseLastChangedActivity: true
                                        },
                                        input: {
                                            basePath: 'tmpPath',
                                            deviceServer: 'Test Device Server',
                                            data: this.gdtData,
                                            path: 'tmpPath'
                                        },
                                        title: 'asdf'
                                    },
                                    user
                                ) ).to.be.rejected;
                            } );
                        } );
                    } );
                    context( 'given NO casefolder', function() {
                        it( 'should be rejected gdtUseLastChangedActivity = true', async function() {
                            const GDT_JSON_P = util.promisify( Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.GDT_JSON] );

                            await expect( GDT_JSON_P(
                                {
                                    transformer: {
                                        xdt: 'gdt.gdt20',
                                        softValidation: true,
                                        deleteAttachments: false,
                                        forceCreateNewActivity: true,
                                        gdtUseLastChangedActivity: true
                                    },
                                    input: {
                                        basePath: 'tmpPath',
                                        deviceServer: 'Test Device Server',
                                        data: this.gdtData,
                                        path: 'tmpPath'
                                    },
                                    title: 'asdf'
                                },
                                user
                            ) ).to.be.rejected;
                        } );

                        it( 'should should create FINDING with populated caseFolderId if gdtUseLastChangedActivity = false', async function() {
                            const GDT_JSON_P = util.promisify( Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.GDT_JSON] );

                            await expect( GDT_JSON_P(
                                {
                                    transformer: {
                                        xdt: 'gdt.gdt20',
                                        softValidation: true,
                                        deleteAttachments: false,
                                        forceCreateNewActivity: true,
                                        gdtUseLastChangedActivity: false
                                    },
                                    input: {
                                        basePath: 'tmpPath',
                                        deviceServer: 'Test Device Server',
                                        data: this.gdtData,
                                        path: 'tmpPath'
                                    },
                                    title: 'asdf'
                                },
                                user
                            ) ).to.be.fulfilled;

                            const finding = await Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: {
                                    actType: 'FINDING',
                                    patientId: patientId
                                }
                            } );
                            finding.should.be.an( 'array' ).which.has.lengthOf( 1 );
                            should.exist( finding[0].caseFolderId );
                        } );
                    } );
                } );
            } );
        } );
    } );
} );