/**
 * User: pi
 * Date: 10/08/16  11:50
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, expect, before, after,it, describe*/

/**
 * covers  creation and usage of following "Kette"
 * a(invoice)                       b(finding)       c(invoice)         d(AU)
 * |                                                    |               |
 * e(treatment) --- f(diagnosis)                     f(diagnosis)        g(Diagnosis)
 * |
 * h(diagnosis)
 */
const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    fs = require( 'fs' ),
    moment = require( 'moment' ),
    util = require( 'util' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

function addCleanUp() {
    before( function( done ) {
        Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'delete',
            query: {
                actType: {$ne: 'SCHEIN'}
            },
            options: {override: true}
        }, done );
    } );
}

describe( 'Activity sequence ("Kette") test', function() {
    let
        mongoose = require( 'mongoose' ),
        [ patientId, caseFolderId, employeeId, activityAId, activityBId, activityCId, activityDId,
            activityEId, activityFId, activityGId, activityHId ] = mochaUtils.getObjectIds(),
        locationId = new mongoose.Types.ObjectId( '000000000000000000000001' ).toString(),
        activitySequenceId;

    before( async function() {
        this.timeout( 10000 );
        await cleanDb( {user} );

        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'location',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                _id: locationId
            } ) )
        } );
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'patient',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                firstname: 'test',
                lastname: 'patient',
                _id: patientId
            } ) )
        } );
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'casefolder',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                patientId: patientId,
                _id: caseFolderId,
                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION
            } ) )
        } );

        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'employee',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
                _id: employeeId
            } ) )
        } );
        let activities = [];
        activities.push( mochaUtils.getActivityData( {
            "scheinSubgroup": "00",
            "scheinType": "0101",
            "scheinBillingArea": "00",
            "scheinYear": "2016",
            "scheinQuarter": "1",
            "isChiefPhysician": false,
            "includesBSK": false,
            actType: 'SCHEIN',
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityHId,
            actType: 'DIAGNOSIS',
            catalogRef: 'DC-ICD-10-D,A-1436201054624.json',
            catalogShort: 'ICD-10',
            "code": "K00.1",
            "diagnosisCert": "CONFIRM",
            "catalog": true,
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityEId,
            actType: 'TREATMENT',
            "code": "12210",
            "price": 32,
            "actualPrice": 80,
            "unit": "Euro",
            "actualUnit": "Punkte",
            "billingFactorValue": "0.4",
            "areTreatmentDiagnosesBillable": "1",
            "icds": [activityHId],
            "catalogRef": "DC-EBM-D-1468578008561.json",
            "catalogShort": "EBM",
            "catalog": true,
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityFId,
            actType: 'DIAGNOSIS',
            catalogRef: 'DC-ICD-10-D,A-1436201054624.json',
            catalogShort: 'ICD-10',
            "code": "T00.1",
            "diagnosisCert": "CONFIRM",
            "catalog": true,
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityAId,
            "actType": "INVOICE",
            "totalVat": 0,
            "total": 148.8,
            "totalBHB": 0,
            "totalAHB": 0,
            "totalDoc": 148.8,
            "totalASK": 0,
            "totalBSK": 0,
            "price": 148.8,
            "activities": [
                activityEId
            ],
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityBId,
            actType: 'FINDING',
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityCId,
            "actType": "INVOICE",
            "totalVat": 0,
            "total": 148.8,
            "totalBHB": 0,
            "totalAHB": 0,
            "totalDoc": 148.8,
            "totalASK": 0,
            "totalBSK": 0,
            "price": 148.8,
            "activities": [
                activityFId
            ],
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityGId,
            actType: 'DIAGNOSIS',
            catalogRef: 'DC-ICD-10-D,A-1436201054624.json',
            catalogShort: 'ICD-10',
            "code": "T00.0",
            "diagnosisCert": "CONFIRM",
            "catalog": true,
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );
        activities.push( mochaUtils.getActivityData( {
            _id: activityDId,
            actType: 'AU',
            "icds": [activityGId],
            employeeId: employeeId,
            patientId: patientId,
            caseFolderId: caseFolderId,
            locationId: locationId
        } ) );

        for( const activity of activities ) {
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( activity )
            } );
        }
    } );
    after( async function() {
        await cleanDb( {user} );
    } );

    describe( 'Insert activity sequence case A.', function() {
        let
            updateSequencesResult;
        it( 'Y.doccirrus.api.activitysequence.updateSequences should create activity sequence if _id is undefined', function( done ) {
            let
                data = {
                    title: 'case A',
                    prevOrder: 1000000000,
                    activitiesId: [activityAId, activityBId, activityCId, activityDId, activityEId, activityFId, activityGId, activityHId]
                };
            should.not.exist( data._id );
            this.timeout( 20000 );
            Y.doccirrus.api.activitysequence.updateSequences( {
                user,
                query: {
                    sequences: [data]
                },
                callback: function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.contain.all.keys( 'createdSequences' );
                    updateSequencesResult = result;
                    done();
                }
            } );
        } );
        it( 'Y.doccirrus.api.activitysequence.updateSequences should return info object', function() {
            should.exist( updateSequencesResult );
            updateSequencesResult.should.be.an( 'object' );
            updateSequencesResult.should.have.all.keys( 'mappedSequences', 'createdSequences', 'updatedSequences', 'deletedSequences' );
            updateSequencesResult.createdSequences.should.be.an( 'array' ).that.has.lengthOf( 1 );
            activitySequenceId = updateSequencesResult.createdSequences[0];
        } );
        it( 'System should have activity sequence for case A', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activitysequence',
                action: 'count',
                query: {
                    _id: activitySequenceId
                }
            }, function( err, count ) {
                should.not.exist( err );
                should.exist( count );
                count.should.be.equal( 1 );
                done();
            } );
        } );
        it( 'Remove all activities except "Schein"', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'delete',
                query: {
                    actType: {$ne: 'SCHEIN'}
                },
                options: {
                    override: true
                }
            }, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Check amount of activity', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'count',
                query: {
                    caseFolderId: caseFolderId,
                    patientId: patientId
                }
            }, function( err, count ) {
                should.not.exist( err );
                should.exist( count );
                count.should.equal( 1 ); // 'Schein' only
                done();
            } );
        } );
    } );

    describe( 'Check activity sequence case A.', function() {
        let
            ac,
            caseFolder,
            tree,
            completeActivityMap;
        it( 'get activity sequence case A', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activitysequence',
                action: 'get',
                query: {
                    _id: activitySequenceId
                },
                options: {
                    lean: true
                }
            }, function( err, results ) {
                should.not.exist( err );
                should.exist( results );
                results.should.have.lengthOf( 1 );
                ac = results[0];
                done();
            } );
        } );
        it( 'get case folder', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                action: 'get',
                query: {
                    _id: caseFolderId
                },
                options: {
                    lean: true
                }
            }, function( err, results ) {
                should.not.exist( err );
                should.exist( results );
                results.should.have.lengthOf( 1 );
                caseFolder = results[0];
                done();
            } );
        } );

        it( 'Y.doccirrus.api.activitysequence.getActivityTree should return { tree, completeActivityMap }', function( done ) {
            let
                moment = require( 'moment' );
            Y.doccirrus.api.activitysequence.getActivityTree( {
                user,
                data: {
                    newActivity: {
                        patientId,
                        employeeId,
                        locationId: locationId,
                        timestamp: moment().toISOString()
                    },
                    caseFolder,
                    activities: ac.activities
                },
                callback( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.have.all.keys( 'completeActivityMap', 'tree' );
                    completeActivityMap = result.completeActivityMap;
                    tree = result.tree;
                    done();
                }
            } );
        } );
        it( 'completeActivityMap should be an object and contain all activities', function() {
            completeActivityMap.should.be.an( 'object' );
            completeActivityMap.should.have.all.keys( activityAId, activityBId, activityCId, activityDId, activityEId, activityFId, activityGId, activityHId );
        } );
        describe( 'tree should be an array and have correct structure', function() {
            let
                activityA,
                activityB,
                activityC,
                activityD,
                activityE,
                activityF,
                activityG,
                activityH;
            it( 'tree should have 4 main activities - A,B,C,D', function() {
                tree.should.be.an( 'array' );
                [activityA, activityB, activityC, activityD] = tree;

                should.exist( activityA );
                activityA.should.be.an( 'object' ).that.has.all.keys( '_id', 'dependencies' );
                activityA._id.should.be.equal( activityAId );

                should.exist( activityB );
                activityB.should.be.an( 'object' ).that.has.all.keys( '_id', 'dependencies' );
                activityB._id.should.be.equal( activityBId );

                should.exist( activityC );
                activityC.should.be.an( 'object' ).that.has.all.keys( '_id', 'dependencies' );
                activityC._id.should.be.equal( activityCId );

                should.exist( activityD );
                activityD.should.be.an( 'object' ).that.has.all.keys( '_id', 'dependencies' );
                activityD._id.should.be.equal( activityDId );

            } );

            it( 'activity A should contain activity E', function() {
                activityA.dependencies.should.be.an( 'array' ).that.has.lengthOf( 1 );
                [activityE] = activityA.dependencies;

                should.exist( activityE );
                activityE.should.be.an( 'object' ).that.has.all.keys( '_id', 'dependencies' );
                activityE._id.should.be.equal( activityEId );
            } );

            it( 'activity B should not contain any activities', function() {
                activityB.dependencies.should.be.an( 'array' ).that.has.lengthOf( 0 );
            } );

            it( 'activity C should contain activity F', function() {
                activityC.dependencies.should.be.an( 'array' ).that.has.all.keys( {0: activityF} );
            } );
            it( 'activity D should contain activity G', function() {
                activityD.dependencies.should.be.an( 'array' ).that.has.lengthOf( 1 );
                [activityG] = activityD.dependencies;
                should.exist( activityG );
                activityG.should.be.an( 'object' ).that.has.all.keys( '_id', 'dependencies' );
                activityG._id.should.be.equal( activityGId );
            } );
            it( 'activity E should contain activity H', function() {
                activityE.dependencies.should.be.an( 'array' ).that.has.lengthOf( 1 );
                [activityH] = activityE.dependencies;
                should.exist( activityH );
                activityH.should.be.an( 'object' ).that.has.all.keys( '_id', 'dependencies' );
                activityH._id.should.be.equal( activityHId );
            } );
            it( 'activity G should not contain any activities', function() {
                activityG.dependencies.should.be.an( 'array' ).that.has.lengthOf( 0 );
            } );
            it( 'activity H should not contain any activities', function() {
                activityH.dependencies.should.be.an( 'array' ).that.has.lengthOf( 0 );
            } );
        } );

    } );

    describe( 'Apply activity sequence case A.', function() {
        describe( 'Apply full activity sequence', function() {
            addCleanUp();

            it( 'Y.doccirrus.api.activitysequence.applySequence should apply activity sequence', function( done ) {
                let
                    moment = require( 'moment' );
                this.timeout( 20000 );
                Y.doccirrus.api.activitysequence.applySequence( {
                    user,
                    query: {
                        _id: activitySequenceId,
                        employeeId,
                        timestamp: moment().toISOString(),
                        locationId: locationId,
                        patientId,
                        caseFolderId,
                        caseFolderType: 'public',
                        caseFolderAdditionalType: Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION
                    },
                    data: {
                        activitiesData: [activityAId, activityBId, activityCId, activityDId, activityEId, activityFId, activityGId, activityHId].map( item => ({
                            _id: item
                        }) )
                    },
                    callback( err, result ) {
                        should.not.exist( err );
                        should.exist( result );
                    },
                    onActivitiesPosted( err ) {
                        should.not.exist( err );
                        done();
                    }
                } );
            } );
            it( 'All activities from activity sequence should be applied', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId: caseFolderId,
                        patientId: patientId
                    }
                }, function( err, results ) {
                    let
                        diagnoses;
                    should.not.exist( err );
                    should.exist( results );
                    diagnoses = results.filter( activity => 'DIAGNOSIS' === activity.actType );
                    diagnoses.map( activity => activity.code ).should.have.lengthOf( 3 ).and.contain.all.members( ['T00.0', 'T00.1', 'K00.1'] );
                    results.should.be.an( 'array' ).which.has.lengthOf( 9 ); // 8 activities from activity sequence case A + 1 'Schein'
                    done();
                } );
            } );
        } );
        describe( 'Apply activity sequence partly', function() {
            addCleanUp();
            it( 'Y.doccirrus.api.activitysequence.applySequence should apply activity sequence', function( done ) {
                this.timeout( 20000 );
                let
                    moment = require( 'moment' );
                Y.doccirrus.api.activitysequence.applySequence( {
                    user,
                    query: {
                        _id: activitySequenceId,
                        employeeId,
                        timestamp: moment().toISOString(),
                        locationId: locationId,
                        patientId,
                        caseFolderId,
                        caseFolderType: 'public',
                        caseFolderAdditionalType: Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION
                    },
                    data: {
                        activitiesData: [activityAId, activityCId, activityDId, activityEId, activityFId, activityGId].map( item => ({
                            _id: item
                        }) )
                    },
                    callback( err, result ) {
                        should.not.exist( err );
                        should.exist( result );
                    },
                    onActivitiesPosted( err ) {
                        should.not.exist( err );
                        done();
                    }
                } );
            } );
            it( 'Part of activities from activity sequence should be applied', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        caseFolderId: caseFolderId,
                        patientId: patientId
                    }
                }, function( err, count ) {
                    should.not.exist( err );
                    should.exist( count );
                    count.should.equal( 7 ); // 6 activities from activity sequence case A + 1 'Schein'
                    done();
                } );
            } );
        } );

    } );

    describe( 'Batch update activity sequences', function() {
        const
            SEQUENCES_COUNT = 500,
            sequenceTemplate = { //not for applying
                "activities": [
                    {
                        "status": "VALID",
                        "actType": "HISTORY"
                    }
                ],
                "description": "",
                "useOriginalValues": true,
                "sequenceGroups": [],
                "title": "",
                "order": 0,
                "orderInGroup": {}
            },
            batchUpdate = promisifyArgsCallback( Y.doccirrus.api.activitysequence.batchUpdate );

        let sequences = [];

        it( 'post activity sequences', async function() {
            this.timeout( 20000 ); // in 2000ms posted ~290 entries
            for( let i = 0; i < SEQUENCES_COUNT; i++ ) {
                sequences.push( {
                    ...sequenceTemplate,
                    order: i,
                    title: `new_${i}`,
                    description: `some description ${i}`
                } );
            }

            for( let sequence of sequences ) {
                let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    action: 'post',
                    data: {...sequence, skipcheck_: true}
                } ) );
                should.not.exist( err );
                result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                sequence._id = result[0];
            }
        } );

        it( 'should response with error on not provided sequence data', async function() {
            let [err] = await formatPromiseResult( batchUpdate( {
                user,
                data: {
                    sequence: []
                }
            } ) );
            err.code.should.be.equal( 400 );
            should.exist( err );
        } );

        it( 'should update some fields in sequences and keep other untouched', async function() {
            let [err] = await formatPromiseResult( batchUpdate( {
                user,
                data: {
                    sequence: sequences.map( el => {
                        return {_id: el._id, order: el.order + 10, title: el.title + '_updated'};
                    } )
                }
            } ) );
            should.not.exist( err );

            //check updated entries
            let results;
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activitysequence',
                action: 'get',
                query: {_id: {$in: sequences.map( el => el._id )}}
            } ) );
            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( SEQUENCES_COUNT );

            for( let entry of results ) {
                let sequence = sequences.find( el => el._id === entry._id.toString() );
                entry.order.should.be.equal( sequence.order + 10 );
                entry.title.should.be.equal( `${sequence.title}_updated` );
                entry.description.should.be.equal( sequence.description );
            }
        } );

        it( 'remove posted activity sequences', async function() {
            let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activitysequence',
                action: 'delete',
                query: {_id: {$in: sequences.map( el => el._id )}},
                options: {
                    override: true
                }
            } ) );
            should.not.exist( err );
        } );
    } );

    describe( '6. Form gender set on server side', function() {
        const
            suiteData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/activity-sequence/gender-form.json`, 'utf8' ) ),
            [ formPatientId, formLocationId, formCaseFolderId, formEmployeeId,
              formId, oldDocumentId, oldActivityId, formActivitySequenceId, practiceId ] = mochaUtils.getObjectIds();

        const
            PATIENT_FIRST_NAME = 'testFName',
            PATIENT_LAST_NAME = 'testLName';

        const
            postData = ( model, data ) => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    action: 'post',
                    data: {...data, skipcheck_: true}
                } );
            },
            putData = ( model, query, data ) => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    action: 'put',
                    query,
                    fields: Object.keys( data ),
                    data: {...data, skipcheck_: true}
                } );
            },
            getData = ( model, query, options ) => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    action: 'get',
                    query,
                    options
                } );
            },
            applySequence = () => {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.activitysequence.applySequence( {
                        user,
                        query: {
                            _id: formActivitySequenceId,
                            employeeId: formEmployeeId,
                            timestamp: moment().toISOString(),
                            locationId: formLocationId,
                            patientId: formPatientId,
                            caseFolderId: formCaseFolderId,
                            caseFolderType: 'PUBLIC',
                            useOriginalValues: true
                        },
                        data: {
                            activitiesData: [
                                {
                                    _id: oldActivityId
                                }
                            ]
                        },
                        callback( err ) {
                            if( err ) {
                                return reject( err );
                            }
                        },
                        onActivitiesPosted( err, result ) {
                            if( err ) {
                                return reject( err );
                            }

                            //this function can be called twice??? first time with empty array as result
                            if( result.length ) {
                                resolve( result );
                            }

                        }
                    } );
                } );
            },
            verifyResult = async ( results, expectedFormState ) => {
                results.should.be.an( 'array' ).which.has.lengthOf( 1 );

                let createdActivityId = results[0]._id,
                    createdFormDocumentData = await getData( 'document', {activityId: createdActivityId}, {
                        select: {
                            formId: 1,
                            formState: 1
                        }
                    } );

                createdFormDocumentData.should.be.an( 'array' ).which.has.lengthOf( 1 );
                expect( createdFormDocumentData[0].formId ).to.be.equal( formId );
                expect( createdFormDocumentData[0].formState ).to.deep.equalInAnyOrder( expectedFormState );
            };

        let useFormTranslationOrg, incaseConfigurationId;

        before( async function() {
            this.timeout( 5000 );
            //setup general data
            await postData( 'location', mochaUtils.getLocationData( {
                _id: formLocationId,
                commercialNo: '4564645612'
            } ) );
            await postData( 'patient', mochaUtils.getPatientData( {
                _id: formPatientId,
                firstname: PATIENT_FIRST_NAME,
                lastname: PATIENT_LAST_NAME
            } ) );
            await postData( 'casefolder', mochaUtils.getCaseFolderData( {
                patientId: formPatientId,
                _id: formCaseFolderId,
                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION
            } ) );
            await postData( 'employee', mochaUtils.getEmployeeData( {_id: formEmployeeId} ) );

            //setup test specific data initial data
            let formTemplateData = {...suiteData.formTemplate, _id: formId, formId};
            formTemplateData.jsonTemplate.formId = formId;
            await postData( 'formtemplate', formTemplateData );

            await postData( 'document', {
                ...suiteData.document,
                _id: oldDocumentId,
                formId,
                activityId: oldActivityId,
                attachedTo: oldActivityId
            } );
            await postData( 'practice', {...suiteData.practice, _id: practiceId} );

            let activitySequenceData = {...suiteData.activitySequence, _id: formActivitySequenceId};
            activitySequenceData.activities[0]._id = oldActivityId;
            activitySequenceData.activities[0].attachments[0] = oldDocumentId;
            activitySequenceData.activities[0].formId = formId;
            activitySequenceData.activities[0].timestamp = moment().startOf( 'day' ).toISOString();
            activitySequenceData.activities[0].locationId = formLocationId;
            await postData( 'activitysequence', activitySequenceData );

            //revert changed settings after suite execution
            await getData( 'incaseconfiguration', {}, {select: {useFormTranslation: 1}} ).then( result => {
                incaseConfigurationId = result[0]._id;
                useFormTranslationOrg = result[0].useFormTranslation || false;
            } );
        } );

        after( async function() {
            //revert configuration setting to not inpact (to be sure) followed tests/suites
            await putData( 'incaseconfiguration', {_id: incaseConfigurationId}, {useFormTranslation: useFormTranslationOrg} );
        } );

        it( `useFormTranslation is OFF
        apply sequence on male patient
        should not translate`, async function() {
            this.timeout( 20000 );
            //ensure incaseconfiguration settings
            await putData( 'incaseconfiguration', {_id: incaseConfigurationId}, {useFormTranslation: false} );
            //ensure patient gender
            await putData( 'patient', {_id: formPatientId}, {gender: 'MALE'} );

            await applySequence().then( results => verifyResult( results, {
                contentType: 'dc/form',
                formName: 'Test Genderisierung',
                label13043: `ds ds${PATIENT_FIRST_NAME} ${PATIENT_LAST_NAME}${PATIENT_LAST_NAME}, ${PATIENT_FIRST_NAME}Herr    ${PATIENT_FIRST_NAME} ${PATIENT_LAST_NAME}`,
                label53413: 'Frau',
                label32504: 'Not Translated'
            } ) ).catch( err => {
                throw err;
            } );
        } );

        it( `useFormTranslation is ON
        apply sequence on male patient
        should translate gender related fields to male template`, async function() {
            this.timeout( 20000 );
            //ensure incaseconfiguration settings
            await putData( 'incaseconfiguration', {_id: incaseConfigurationId}, {useFormTranslation: true} );
            //ensure patient gender
            await putData( 'patient', {_id: formPatientId}, {gender: 'MALE'} );

            await applySequence().then( results => verifyResult( results, {
                contentType: 'dc/form',
                formName: 'Test Genderisierung',
                label13043: `m${PATIENT_FIRST_NAME} ${PATIENT_LAST_NAME}`,
                label53413: 'Man',
                label32504: 'Not Translated'
            } ) ).catch( err => {
                throw err;
            } );
        } );

        it( `useFormTranslation is ON
        apply sequence on female patient
        should translate gender related fields to female template`, async function() {
            this.timeout( 20000 );
            //ensure incaseconfiguration settings
            await putData( 'incaseconfiguration', {_id: incaseConfigurationId}, {useFormTranslation: true} );
            //ensure patient gender
            await putData( 'patient', {_id: formPatientId}, {gender: 'FEMALE'} );

            await applySequence().then( results => verifyResult( results, {
                contentType: 'dc/form',
                formName: 'Test Genderisierung',
                label13043: `w${PATIENT_FIRST_NAME} ${PATIENT_LAST_NAME}`,
                label53413: 'Frau',
                label32504: 'Not Translated'
            } ) ).catch( err => {
                throw err;
            } );
        } );

        it( `useFormTranslation is ON
        apply sequence on patient with other gender (neither male nor female)
        should translate gender related fields to common German template`, async function() {
            this.timeout( 20000 );
            //ensure incaseconfiguration settings
            await putData( 'incaseconfiguration', {_id: incaseConfigurationId}, {useFormTranslation: true} );
            //ensure patient gender
            await putData( 'patient', {_id: formPatientId}, {gender: 'VARIOUS'} );

            await applySequence().then( results => verifyResult( results, {
                contentType: 'dc/form',
                formName: 'Test Genderisierung',
                label13043: `ds ds${PATIENT_FIRST_NAME} ${PATIENT_LAST_NAME}${PATIENT_LAST_NAME}, ${PATIENT_FIRST_NAME}Herr    ${PATIENT_FIRST_NAME} ${PATIENT_LAST_NAME}`,
                label53413: 'deGender',
                label32504: 'Not Translated'
            } ) ).catch( err => {
                throw err;
            } );
        } );
    } );

} );



