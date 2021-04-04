/**
 * User: pi
 * Date: 14/07/16  15:40
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe*/

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'Mongoose middleware check (pre/post hooks)', function() {
    describe( '1. Check pre find activity hook', function() {
        let
            mongoose = require( 'mongoose' ),
            asvTeamNumber = '1231231231',
            patientId = new mongoose.Types.ObjectId().toString(),
            asvCaseFolder = new mongoose.Types.ObjectId().toString(),
            GKVCaseFolder = new mongoose.Types.ObjectId().toString(),
            locationId = new mongoose.Types.ObjectId().toString(),
            employeeId = new mongoose.Types.ObjectId().toString(),
            asvEmployeeId = new mongoose.Types.ObjectId().toString(),
            partnerUser = Y.doccirrus.auth.getSUForTenant( user.tenantId );
        partnerUser.groups.push( {
            group: Y.doccirrus.schemas.employee.userGroups.PARTNER
        } );
        delete partnerUser.superuser;
        describe( '0. Setup.', function() {
            it( 'Cleans db', function( done ) {
                this.timeout( 10000 );
                mochaUtils.cleanDB( {user}, function( err ) {
                    should.not.exist( err );
                    done();
                } );
            } );
        } );
        describe( '1.1. Prepare patient.', function() {
            let
                patientFirstname = 'Arnold',
                patientLastname = 'Schwarzenfegel';

            it( '1.1.1. Insert patient', function( done ) {
                let
                    patientData = mochaUtils.getPatientData( {
                        firstname: patientFirstname,
                        lastname: patientLastname,
                        partnerIds: [
                            {
                                "partnerId": Y.doccirrus.schemas.casefolder.additionalTypes.ASV,
                                "asvTeamNumbers": [
                                    asvTeamNumber
                                ]
                            }
                        ],
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
                    done();
                } );
            } );
            it( '1.1.2. DB should have the patient', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'get',
                    query: {
                        _id: patientId
                    },
                    options: {
                        lean: true
                    }
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    result[0].should.contain.all.keys( {firstname: patientFirstname, lastname: patientLastname} );
                    done();
                } );
            } );
        } );
        describe( '1.2. Prepare casefolders.', function() {

            it( '1.2.1. Insert ASV caseFolders', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        _id: asvCaseFolder,
                        additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ASV,
                        identity: asvTeamNumber,
                        patientId: patientId
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    done();
                } );
            } );
            it( '1.2.2. Insert GKV caseFolders', function( done ) {
                let
                    caseFolderData = mochaUtils.getCaseFolderData( {
                        patientId: patientId,
                        _id: GKVCaseFolder
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    done();
                } );
            } );
            it( '1.1.3. DB should have the case folders', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'get',
                    query: {
                        patientId: patientId
                    },
                    options: {
                        lean: true
                    }
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 2 );
                    done();
                } );
            } );
        } );
        describe( '1.3. Prepare activities', function() {
            it( 'Creates default location', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {_id: locationId} ) )
                } ).should.be.fulfilled;
            } );

            it( '1.3.1. Insert employee', function( done ) {
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
                    done();
                } );
            } );
            it( '1.3.2. Insert employee for partner user', function( done ) {
                let
                    employeeData = mochaUtils.getEmployeeData( {
                        _id: asvEmployeeId,
                        asvTeamNumbers: [asvTeamNumber]
                    } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                }, function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    partnerUser.specifiedBy = asvEmployeeId;
                    done();
                } );
            } );
            it( '1.3.3. Insert activities', function( done ) {
                let
                    async = require( 'async' ),
                    activities = [];
                activities.push( mochaUtils.getActivityData( {
                    employeeId: employeeId,
                    locationId,
                    patientId: patientId,
                    caseFolderId: GKVCaseFolder
                } ) );
                activities.push( mochaUtils.getActivityData( {
                    employeeId: employeeId,
                    locationId,
                    patientId: patientId,
                    caseFolderId: GKVCaseFolder
                } ) );
                activities.push( mochaUtils.getActivityData( {
                    employeeId: employeeId,
                    locationId,
                    patientId: patientId,
                    caseFolderId: GKVCaseFolder
                } ) );
                activities.push( mochaUtils.getActivityData( {
                    employeeId: employeeId,
                    locationId,
                    patientId: patientId,
                    caseFolderId: GKVCaseFolder
                } ) );
                activities.push( mochaUtils.getActivityData( {
                    employeeId: employeeId,
                    locationId,
                    patientId: patientId,
                    caseFolderId: asvCaseFolder
                } ) );
                activities.push( mochaUtils.getActivityData( {
                    employeeId: employeeId,
                    locationId,
                    patientId: patientId,
                    caseFolderId: asvCaseFolder
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
        describe( '1.4. Check Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee (Used in activity pre find)', function() {
            it( '1.4.1. partner user should have PARTNER group', function() {
                let
                    isPartner = partnerUser.groups && partnerUser.groups.some( item => Y.doccirrus.schemas.employee.userGroups.PARTNER === item.group );

                isPartner.should.equal( true );
                should.not.exist( partnerUser.superuser );
                partnerUser.specifiedBy.should.equal( asvEmployeeId );
            } );
            it( '1.4.2. ADMIN user should get all case folders', function( done ) {
                Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee( {
                    user: user,
                    query: {
                        patientId: patientId
                    },
                    data: {
                        employee: {} //assume employee does not have ASV team number
                    },
                    options: {
                        select: {
                            _id: 1
                        }
                    },
                    callback: function( err, result ) {
                        let
                            caseFolderIds = result.map( caseFolder => caseFolder._id.toString() );
                        should.not.exist( err );
                        result.should.be.an( 'array' ).that.has.lengthOf( 2 );
                        caseFolderIds.should.have.members( [asvCaseFolder, GKVCaseFolder] );
                        done();
                    }
                } );
            } );
            it( '1.4.3. PARTNER user should not get any case folders if he is not part of any ASV team', function( done ) {

                Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee( {
                    user: partnerUser,
                    query: {
                        patientId: patientId
                    },
                    data: {
                        employee: {} //assume employee does not have ASV team number
                    },
                    options: {
                        select: {
                            _id: 1
                        }
                    },
                    callback: function( err, result ) {
                        should.not.exist( err );
                        result.should.be.an( 'array' ).that.has.lengthOf( 0 );
                        done();
                    }
                } );
            } );
            it( '1.4.4. PARTNER user should get only his ASV team case folders', function( done ) {

                Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee( {
                    user: partnerUser,
                    query: {
                        patientId: patientId
                    },
                    data: {
                        employee: {
                            asvTeamNumbers: [asvTeamNumber]
                        }
                    },
                    options: {
                        select: {
                            _id: 1
                        }
                    },
                    callback: function( err, result ) {
                        should.not.exist( err );
                        result.should.be.an( 'array' ).that.has.lengthOf( 1 );
                        result[0].should.contain.all.keys( {_id: asvCaseFolder} );
                        done();
                    }
                } );
            } );
            it( '1.4.5. ADMIN user should get all activities', function( done ) {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        patientId: patientId
                    },
                    options: {
                        lean: true,
                        select: {
                            _id: 1
                        }
                    },
                    callback: function( err, result ) {
                        should.not.exist( err );
                        result.should.be.an( 'array' ).that.has.lengthOf( 6 );
                        done();
                    }
                } );
            } );
            it( '1.4.4. PARTNER user should get only his ASV team case folders', function( done ) {

                Y.doccirrus.mongodb.runDb( {
                    user: partnerUser,
                    model: 'activity',
                    action: 'get',
                    query: {
                        patientId: patientId
                    },
                    options: {
                        lean: true,
                        select: {
                            _id: 1
                        }
                    },
                    callback: function( err, result ) {
                        should.not.exist( err );
                        result.should.be.an( 'array' ).that.has.lengthOf( 2 );
                        done();
                    }
                } );
            } );

        } );
        describe( '1.5. Partner can not create case folder.', function() {
            it( '1.5.1. System should return error when user-partner tries to create case folder.', function( done ) {
                let
                    caseFolderData = {
                        patientId,
                        title: 'should not be created',
                        type: 'PUBLIC'
                    };
                Y.doccirrus.mongodb.runDb( {
                    user: partnerUser,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                }, function( err, results ) {
                    should.not.exist( results );
                    should.exist( err );
                    err.code.should.be.equal( 14002 );
                    done();
                } );
            } );
        } );
    } );
} );



