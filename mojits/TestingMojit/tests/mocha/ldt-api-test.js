/**
 * User: maximilian.kramp
 * Date: 11/27/20  1:59 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, it, should, describe, before, after, context, expect */
const
    user = Y.doccirrus.auth.getSUForLocal(),
    util = require( 'util' ),
    fs = require( 'fs' ),
    moment = require( 'moment' ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    mockedTestData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/ldt-api/json/mockedTestData.json`, 'utf8' ) ),
    locationPostP = promisifyArgsCallback( Y.doccirrus.api.location.post ),
    employeePostP = promisifyArgsCallback( Y.doccirrus.api.employee.post ),
    patientPostP = promisifyArgsCallback( Y.doccirrus.api.patient.post ),
    casefolderPostP = promisifyArgsCallback( Y.doccirrus.api.casefolder.post ),
    activityPostP = promisifyArgsCallback( Y.doccirrus.api.activity.post );

describe( 'ldt-api', function mainDescribe() {
    context( 'given location', function contextLocation() {
        const [locationId, employeeId, patientId, casefolderId, scheinId] = mochaUtils.getObjectIds();
        let location, employee, patient;

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
        } );

        after( async function afterLocation() {
            await cleanDb( {
                user: user,
                collections2clean: [
                    'location'
                ]
            } );
        } );

        context( 'given employee', function contextEmployee() {
            before( async function beforeEmployee() {
                await employeePostP( {
                    user: user,
                    data: {
                        employee: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getEmployeeData( {
                                ...mockedTestData.employee,
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
                employee = this.employee[0];
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
                                ...mockedTestData.patient,
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
                    patient = this.patient[0];
                } );

                after( async function afterPatient() {
                    await cleanDb( {
                        user: user,
                        collections2clean: [
                            'patient'
                        ]
                    } );
                } );

                context( 'given public casefolder', function contextPublicCasefolder() {
                    before( async function beforePublicCasefolder() {
                        await casefolderPostP( {
                            user: user,
                            data: Y.doccirrus.filters.cleanDbObject(
                                mochaUtils.getCaseFolderData( {
                                    _id: casefolderId,
                                    patientId: patientId.toString()
                                } )
                            )
                        } );
                    } );

                    after( async function afterPublicCasefolder() {
                        await cleanDb( {
                            user: user,
                            collections2clean: [
                                'casefolder'
                            ]
                        } );
                    } );

                    context( 'given schein', function contextSchein() {
                        before( async function beforeGkvSchein() {
                            await activityPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject(
                                    mochaUtils.getScheinData( {
                                        _id: scheinId,
                                        patientId: patientId.toString(),
                                        employeeId: employeeId.toString(),
                                        caseFolderId: casefolderId.toString(),
                                        locationId: locationId
                                    } )
                                )
                            } );
                            this.resultLDTFile = mockedTestData.ldtFiles[0].replace( /DATE/g, moment().format( 'YYYYMMDD' ) );
                        } );

                        after( async function afterGkvSchein() {
                            await cleanDb( {
                                user: user,
                                collections2clean: [
                                    'activity'
                                ]
                            } );
                        } );

                        it( '.generateLabFAOrder()', async function() {
                            const generateLabFAOrderP = util.promisify( Y.doccirrus.api.ldt.generateLabFAOrder );

                            const data = await generateLabFAOrderP( {
                                ldt: Y.doccirrus.api.xdtTools.getXdtFromPath( 'ldt.ldt20' ),
                                location: location,
                                employee: employee,
                                patient: patient,
                                recordRequestId: 'ce97cjsylwphx',
                                insurance: Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' ),
                                user: user
                            } );

                            should.exist( data );
                            expect( data ).to.be.instanceof( Buffer );
                            should.exist( data.toString() );
                            data.toString().should.equal( this.resultLDTFile );
                        } );

                    } );
                } );

                context( 'given private casefolder', function contextPrivateCasefolder() {
                    before( async function beforePrivateCasefolder() {
                        await casefolderPostP( {
                            user: user,
                            data: Y.doccirrus.filters.cleanDbObject(
                                mochaUtils.getCaseFolderData( {
                                    _id: casefolderId,
                                    patientId: patientId.toString(),
                                    type: 'PRIVATE'
                                } )
                            )
                        } );
                    } );

                    after( async function afterPrivateCasefolder() {
                        await cleanDb( {
                            user: user,
                            collections2clean: [
                                'casefolder'
                            ]
                        } );
                    } );

                    context( 'given pkvschein', function contextSchein() {
                        before( async function beforePkvSchein() {
                            await activityPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject(
                                    mochaUtils.getScheinData( {
                                        _id: scheinId,
                                        patientId: patientId.toString(),
                                        employeeId: employeeId.toString(),
                                        caseFolderId: casefolderId.toString(),
                                        locationId: locationId,
                                        actType: 'PKVSCHEIN'
                                    } )
                                )
                            } );
                            this.resultLDTFile = mockedTestData.ldtFiles[1].replace( /DATE/g, moment().format( 'YYYYMMDD' ) );
                        } );

                        after( async function afterPkvSchein() {
                            await cleanDb( {
                                user: user,
                                collections2clean: [
                                    'activity'
                                ]
                            } );
                        } );

                        it( '.generateLabFAOrder()', async function() {
                            const generateLabFAOrderP = util.promisify( Y.doccirrus.api.ldt.generateLabFAOrder );

                            const data = await generateLabFAOrderP( {
                                ldt: Y.doccirrus.api.xdtTools.getXdtFromPath( 'ldt.ldt20' ),
                                location: location,
                                employee: employee,
                                patient: patient,
                                recordRequestId: 'ce97cjsylwphx',
                                insurance: Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PRIVATE' ),
                                user: user
                            } );

                            should.exist( data );
                            should.should.be.an( 'Object' );
                            should.exist( data.toString() );
                            data.toString().should.equal( this.resultLDTFile );
                        } );

                    } );
                } );

            } );
        } );
    } );
} );
