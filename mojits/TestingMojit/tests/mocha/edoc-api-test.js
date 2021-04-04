/**
 * User: sabine.gottfried
 * Date: 22.03.21  10:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, it, should, describe, before, after, context */
const
    user = Y.doccirrus.auth.getSUForLocal(),
    util = require( 'util' ),
    fs = require( 'fs' ),
    mongoose = require( 'mongoose' ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    mockedTestData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/edoc-api/mockedTestData.json`, 'utf8' ) ),
    locationPostP = promisifyArgsCallback( Y.doccirrus.api.location.post ),
    employeePostP = promisifyArgsCallback( Y.doccirrus.api.employee.post ),
    patientPostP = promisifyArgsCallback( Y.doccirrus.api.patient.post ),
    casefolderPostP = promisifyArgsCallback( Y.doccirrus.api.casefolder.post ),
    activityPostP = promisifyArgsCallback( Y.doccirrus.api.activity.post ),
    edocBuildFile = promisifyArgsCallback( Y.doccirrus.api.edoc.buildFile );

describe( 'edoc-api', function mainDescribe() {
    context( 'given location', function contextLocation() {
        const [locationId, employeeId, patientId, casefolderId] = mochaUtils.getObjectIds();

        before( async function beforeLocation() {
            await locationPostP( {
                user: user,
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId,
                    commercialNo: '100714102'
                } ) )
            } );
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
                this.timeout( 5000 );
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
                    this.timeout( 5000 );
                    await patientPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getPatientData( {
                                ...mockedTestData.patient,
                                _id: patientId
                            } )
                        )
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

                context( 'given public casefolder', function contextPublicCasefolder() {
                    before( async function beforePublicCasefolder() {
                        this.timeout( 5000 );
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

                    context( 'given valid qdocu', function contextQDocu() {
                        before( async function beforeQDocuActivity() {
                            this.timeout( 5000 );
                            let qdocu = mockedTestData.qdocu;
                            const _id = new mongoose.Types.ObjectId().toString();
                            const _qdocu = {
                                '_id': _id,
                                'locationId': locationId,
                                'employeeId': employeeId,
                                'patientId': patientId,
                                'caseFolderId': casefolderId
                            };
                            qdocu = Object.assign( {}, qdocu, _qdocu );

                            await activityPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject(
                                    qdocu
                                )
                            } );

                            this.qdocu = await Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: {
                                    _id: _id
                                },
                                options: {
                                    lean: true
                                }
                            } );
                        } );

                        after( async function afterGkvSchein() {
                            await cleanDb( {
                                user: user,
                                collections2clean: [
                                    'activity'
                                ]
                            } );
                        } );

                        it( '.buildFile()', async function() {
                            this.timeout( 5000 );
                            const qdocu = this.qdocu[0];
                            let response = await edocBuildFile( {
                                user: user,
                                activity: qdocu
                            } );

                            should.exist( response );
                            Boolean( response.isValid ).should.equal( true );
                            should.exist( response.updateData.dmpFileId );

                        } );

                    } );

                    context( 'given invalid qdocu', function contextQDocu() {
                        before( async function beforeQDocuActivity() {
                            this.timeout( 5000 );
                            let qdocu = mockedTestData.qdocu;
                            const _id = new mongoose.Types.ObjectId().toString();
                            const _qdocu = {
                                '_id': _id,
                                'locationId': locationId,
                                'employeeId': employeeId,
                                'patientId': patientId,
                                'caseFolderId': casefolderId
                            };
                            qdocu.versichertenidneu = "1234567890";
                            const invalidQdocu = Object.assign( {}, qdocu, _qdocu );

                            await activityPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject(
                                    invalidQdocu
                                )
                            } );

                            this.invalidQdocu = await Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: {
                                    _id: _id
                                },
                                options: {
                                    lean: true
                                }
                            } );
                        } );

                        after( async function afterGkvSchein() {
                            await cleanDb( {
                                user: user,
                                collections2clean: [
                                    'activity'
                                ]
                            } );
                        } );

                        it( '.buildFile()', async function() {
                            this.timeout( 5000 );
                            const invalidQdocu = this.invalidQdocu[0];
                            let response = await edocBuildFile( {
                                user: user,
                                activity: invalidQdocu
                            } );

                            should.exist( response );
                            should.exist( response.updateData );
                            Boolean( response.isValid ).should.equal( false );
                            should.exist( response.updateData.dmpErrors );
                            should.exist( response.updateData.dmpErrors.nErrors );
                            response.updateData.dmpErrors.nErrors.should.equal( 1 );
                            should.exist( response.updateData.dmpErrors.errors );
                            response.updateData.dmpErrors.errors.group[0].text.should.equal( 'Die "Versichertennummer der neuen Versichertenkarte (eGK)" entspricht nicht dem vorgegebenen Format.' );
                        } );
                    } );
                } );
            } );
        } );
    } );
} );
