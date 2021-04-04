/**
 * User: do
 * Date: 29.01.21  09:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, it, describe, before, after, expect */
const user = Y.doccirrus.auth.getSUForLocal();
const mochaUtils = require( '../../server/mochaUtils' )( Y );
const sinon = require( 'sinon' );
const mongoose = require( 'mongoose' );
const {promisify} = require( 'util' );
const cleanDb = promisify( mochaUtils.cleanDB );
const eDocLetterFormData = require( '../fixtures/qes/docletter-formdata' );

describe( 'qes-api', function mainDescribe() {
    describe( 'signDocuments()', function() {
        describe( 'try to sign activity without matching attached media', async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.patientId = mongoose.Types.ObjectId().toString();
                this.caseFolderId = mongoose.Types.ObjectId().toString();

                const practiceData = await mochaUtils.getPracticeData();
                practiceData.dcCustomerNo = '1337';

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( practiceData )
                } );

                let locationData = mochaUtils.getLocationData( {
                    _id: this.locationId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( locationData )
                } );
                let employeeData = mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } );

                let patientData = mochaUtils.getPatientData( {
                    _id: this.patientId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } );

                let caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId: this.patientId,
                    _id: this.caseFolderId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                } );

                let schein = mochaUtils.getScheinData( {
                    patientId: this.patientId,
                    caseFolderId: this.caseFolderId,
                    locationId: this.locationId,
                    employeeId: this.employeeId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                } );

                let docLetterData = eDocLetterFormData.getDocLetter( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                docLetterData.status = 'APPROVED';

                let [docLetterId] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } );

                let formData = eDocLetterFormData.getAdditionalFormData( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                for( let modelName of Object.keys( formData ) ) {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data: formData[modelName]
                    } );
                }

                this.result = await Y.doccirrus.api.tiQES.signDocuments( {
                    user,
                    originalParams: {
                        activityIds: [docLetterId],
                        cardHandle: 'SOME CARD HANDLE',
                        context: {}
                    }
                } );

            } );

            after( async function() {
                await cleanDb( {user} );
            } );

            it( `should set processing status to false`, async function() {
                expect( this.result.data.processing ).to.equal( false );
            } );

            it( `should should add a warning with code "11411"`, async function() {
                expect( this.result.warnings[0].code ).to.equal( '11411' );
            } );

        } );

        describe( `sign a docletter pdf`, async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.patientId = mongoose.Types.ObjectId().toString();
                this.caseFolderId = mongoose.Types.ObjectId().toString();

                const practiceData = await mochaUtils.getPracticeData();
                practiceData.dcCustomerNo = '1337';

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( practiceData )
                } );

                let locationData = mochaUtils.getLocationData( {
                    _id: this.locationId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( locationData )
                } );
                let employeeData = mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } );

                let patientData = mochaUtils.getPatientData( {
                    _id: this.patientId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } );

                let caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId: this.patientId,
                    _id: this.caseFolderId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                } );

                let schein = mochaUtils.getScheinData( {
                    patientId: this.patientId,
                    caseFolderId: this.caseFolderId,
                    locationId: this.locationId,
                    employeeId: this.employeeId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                } );

                let docLetterData = eDocLetterFormData.getDocLetter( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                let docLetterData2 = eDocLetterFormData.getDocLetter( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                docLetterData.status = 'APPROVED';
                docLetterData2.status = 'APPROVED';
                this.docLetterId = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } ))[0];

                this.docLetter2Id = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData2 )
                } ))[0];

                let formData = eDocLetterFormData.getAdditionalFormData( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                for( let modelName of Object.keys( formData ) ) {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data: formData[modelName]
                    } );
                }

                await (new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.formtemplate.makepdf( {
                        user,
                        originalParams: {
                            mapObject: this.docLetterId,
                            mapCollection: 'activity',
                            formId: docLetterData.formId,
                            formVersionId: docLetterData.formVersionId
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        }
                    } );
                } ));

                let [docLetter] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {_id: this.docLetterId}
                } );

                const mediaId = docLetter.attachedMedia.find( media => media.contentType === 'application/pdf' ).mediaId;
                const qesMock = {
                    async getJobNumber() {
                        return 'AA-123';
                    },
                    async signDocument() {
                        await (new Promise( resolve => setTimeout( resolve, 2000 ) ));
                        return [
                            {
                                attributes: {RequestID: mediaId},
                                Status: {Result: 'OK'},
                                SignatureObject: {Base64Signature: {'$value': Buffer.from( 'some pdfs content' ).toString( 'base64' )}}
                            }
                        ];
                    }
                };

                this.qesStub = sinon.stub( Y.doccirrus.dcTi, 'createQES' ).returns( Promise.resolve( qesMock ) );

                this.fsFilesBefore = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'fs.files',
                    query: {filename: mediaId}
                } );

                this.result = await Y.doccirrus.api.tiQES.signDocuments( {
                    user,
                    originalParams: {
                        activityIds: [this.docLetterId, this.docLetter2Id],
                        cardHandle: 'SOME CARD HANDLE',
                        context: {}
                    }
                } );

                this.finishedSignDocumentEvent = await (new Promise( ( resolve ) => {
                    Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                        resolve( params );
                    } );
                } ));

                this.processedDocLetter = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {_id: this.docLetterId}
                } ))[0];

                this.fsFilesAfter = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'fs.files',
                    query: {filename: mediaId}
                } );

                this.auditLogEntries = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'audit',
                    query: {
                        objId: {$in: [this.docLetterId, this.docLetter2Id].map( id => id.toString() )},
                        action: 'sign'
                    }
                } );
            } );

            after( async function() {
                await cleanDb( {user} );
                this.qesStub.restore();
            } );

            it( `should set processing status to true`, async function() {
                expect( this.result.data.processing ).to.equal( true );
            } );

            it( `should return have matching job number`, async function() {
                expect( this.finishedSignDocumentEvent.msg.data.jobNumber ).to.equal( this.result.data.jobNumber );
            } );

            it( `should return sign request with status ok and no errors but 1 warning about missing media`, async function() {
                expect( this.finishedSignDocumentEvent.msg.data.processedResults[0].status ).to.equal( 'OK' );
                expect( this.finishedSignDocumentEvent.msg.data.processedResults[0].errors ).have.lengthOf( 0 );
                expect( this.finishedSignDocumentEvent.msg.data.warnings[0].code ).to.equal( '11411' );
            } );

            it( `should update related docletter`, async function() {
                expect( this.processedDocLetter.kimState ).to.equal( 'SIGNED' );
                expect( this.processedDocLetter.kimSignedBy ).have.lengthOf( 1 );
            } );

            it( `should exchange fs.files entry of media`, async function() {
                expect( this.fsFilesBefore ).have.lengthOf( 1 );
                expect( this.fsFilesAfter ).have.lengthOf( 1 );
                expect( this.fsFilesBefore[0]._id.toString() ).to.not.equal( this.fsFilesAfter[0]._id.toString() );
            } );

            it( 'should create two audit log entries', function() {
                expect( this.auditLogEntries ).to.have.lengthOf( 2 );
            } );
        } );

        describe( `sign a docletter pdf two times`, async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.patientId = mongoose.Types.ObjectId().toString();
                this.caseFolderId = mongoose.Types.ObjectId().toString();

                const practiceData = await mochaUtils.getPracticeData();
                practiceData.dcCustomerNo = '1337';

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( practiceData )
                } );

                let locationData = mochaUtils.getLocationData( {
                    _id: this.locationId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( locationData )
                } );
                let employeeData = mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } );

                let patientData = mochaUtils.getPatientData( {
                    _id: this.patientId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } );

                let caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId: this.patientId,
                    _id: this.caseFolderId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                } );

                let schein = mochaUtils.getScheinData( {
                    patientId: this.patientId,
                    caseFolderId: this.caseFolderId,
                    locationId: this.locationId,
                    employeeId: this.employeeId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                } );

                let docLetterData = eDocLetterFormData.getDocLetter( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                docLetterData.status = 'APPROVED';

                let [docLetterId] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } );

                let formData = eDocLetterFormData.getAdditionalFormData( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                for( let modelName of Object.keys( formData ) ) {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data: formData[modelName]
                    } );
                }

                await (new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.formtemplate.makepdf( {
                        user,
                        originalParams: {
                            mapObject: docLetterId,
                            mapCollection: 'activity',
                            formId: docLetterData.formId,
                            formVersionId: docLetterData.formVersionId
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        }
                    } );
                } ));

                let [docLetter] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {_id: docLetterId}
                } );

                const mediaId = docLetter.attachedMedia.find( media => media.contentType === 'application/pdf' ).mediaId;
                const qesMock = {
                    async getJobNumber() {
                        return 'AA-123';
                    },
                    async signDocument() {
                        await (new Promise( resolve => setTimeout( resolve, 2000 ) ));
                        return [
                            {
                                attributes: {RequestID: mediaId},
                                Status: {Result: 'OK'},
                                SignatureObject: {Base64Signature: {'$value': Buffer.from( 'some pdfs content' ).toString( 'base64' )}}
                            }
                        ];
                    }
                };

                this.qesStub = sinon.stub( Y.doccirrus.dcTi, 'createQES' ).returns( Promise.resolve( qesMock ) );

                await Y.doccirrus.api.tiQES.signDocuments( {
                    user,
                    originalParams: {
                        activityIds: [docLetterId],
                        cardHandle: 'SOME CARD HANDLE',
                        context: {}
                    }
                } );

                await (new Promise( ( resolve ) => {
                    Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                        resolve( params );
                    } );
                } ));

                await Y.doccirrus.api.tiQES.signDocuments( {
                    user,
                    originalParams: {
                        activityIds: [docLetterId],
                        cardHandle: 'SOME CARD HANDLE',
                        context: {}
                    }
                } );

                await (new Promise( ( resolve ) => {
                    Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                        resolve( params );
                    } );
                } ));

                this.processedDocLetter = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {_id: docLetterId}
                } ))[0];

            } );

            after( async function() {
                await cleanDb( {user} );
                this.qesStub.restore();
            } );

            it( `should add two signedBy entries`, async function() {
                expect( this.processedDocLetter.kimSignedBy ).have.lengthOf( 2 );
            } );

        } );
    } );

    describe( 'verifyDocument()', function() {
        describe( `rejects unsigned docletter`, async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.patientId = mongoose.Types.ObjectId().toString();
                this.caseFolderId = mongoose.Types.ObjectId().toString();

                let locationData = mochaUtils.getLocationData( {
                    _id: this.locationId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( locationData )
                } );
                let employeeData = mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } );

                let patientData = mochaUtils.getPatientData( {
                    _id: this.patientId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } );

                let caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId: this.patientId,
                    _id: this.caseFolderId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                } );

                let schein = mochaUtils.getScheinData( {
                    patientId: this.patientId,
                    caseFolderId: this.caseFolderId,
                    locationId: this.locationId,
                    employeeId: this.employeeId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                } );

                let docLetterData = eDocLetterFormData.getDocLetter( this.patientId, this.employeeId, this.locationId, this.caseFolderId );

                this.docLetterId = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } ))[0];

                let formData = eDocLetterFormData.getAdditionalFormData( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                for( let modelName of Object.keys( formData ) ) {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data: formData[modelName]
                    } );
                }

                await (new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.formtemplate.makepdf( {
                        user,
                        originalParams: {
                            mapObject: this.docLetterId,
                            mapCollection: 'activity',
                            formId: docLetterData.formId,
                            formVersionId: docLetterData.formVersionId
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        }
                    } );
                } ));

                const qesMock = {
                    async verifyDocument() {
                        await (new Promise( resolve => setTimeout( resolve, 2000 ) ));
                        return {
                            Status: {Result: 'OK'},
                            VerificationResult: {
                                HighLevelResult: 'VALID',
                                TimestampType: 'SYSTEM_TIMESTAMP',
                                Timestamp: new Date( '2021-02-05T07:46:01.175Z' )
                            }
                        };
                    }
                };

                this.qesStub = sinon.stub( Y.doccirrus.dcTi, 'createQES' ).returns( Promise.resolve( qesMock ) );
            } );

            after( async function() {
                await cleanDb( {user} );
                this.qesStub.restore();
            } );

            it( `should reject verification`, async function() {
                expect( Y.doccirrus.api.tiQES.verifyDocument( {
                    user,
                    originalParams: {
                        activityId: this.docLetterId,
                        tiContext: {}
                    }
                } ) ).to.be.rejectedWith();
            } );

        } );

        describe( `verify a docletter pdf`, async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.patientId = mongoose.Types.ObjectId().toString();
                this.caseFolderId = mongoose.Types.ObjectId().toString();

                let locationData = mochaUtils.getLocationData( {
                    _id: this.locationId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( locationData )
                } );
                let employeeData = mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } );

                let patientData = mochaUtils.getPatientData( {
                    _id: this.patientId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } );

                let caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId: this.patientId,
                    _id: this.caseFolderId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                } );

                let schein = mochaUtils.getScheinData( {
                    patientId: this.patientId,
                    caseFolderId: this.caseFolderId,
                    locationId: this.locationId,
                    employeeId: this.employeeId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                } );

                let docLetterData = eDocLetterFormData.getDocLetter( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                docLetterData.kimState = 'SIGNED';

                this.docLetterId = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } ))[0];

                let formData = eDocLetterFormData.getAdditionalFormData( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                for( let modelName of Object.keys( formData ) ) {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data: formData[modelName]
                    } );
                }

                await (new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.formtemplate.makepdf( {
                        user,
                        originalParams: {
                            mapObject: this.docLetterId,
                            mapCollection: 'activity',
                            formId: docLetterData.formId,
                            formVersionId: docLetterData.formVersionId
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        }
                    } );
                } ));

                const qesMock = {
                    async verifyDocument() {
                        await (new Promise( resolve => setTimeout( resolve, 2000 ) ));
                        return {
                            Status: {Result: 'OK'},
                            VerificationResult: {
                                HighLevelResult: 'VALID',
                                TimestampType: 'SYSTEM_TIMESTAMP',
                                Timestamp: new Date( '2021-02-05T07:46:01.175Z' )
                            }
                        };
                    }
                };

                this.qesStub = sinon.stub( Y.doccirrus.dcTi, 'createQES' ).returns( Promise.resolve( qesMock ) );

                this.result = await Y.doccirrus.api.tiQES.verifyDocument( {
                    user,
                    originalParams: {
                        activityId: this.docLetterId,
                        tiContext: {}
                    }
                } );

            } );

            after( async function() {
                await cleanDb( {user} );
                this.qesStub.restore();
            } );

            it( `should verify docletter`, async function() {
                expect( this.result.VerificationResult.HighLevelResult ).to.equal( 'VALID' );
            } );

        } );

        describe( `verify a attached media pdf`, async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.patientId = mongoose.Types.ObjectId().toString();
                this.caseFolderId = mongoose.Types.ObjectId().toString();

                let locationData = mochaUtils.getLocationData( {
                    _id: this.locationId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( locationData )
                } );
                let employeeData = mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } );

                let patientData = mochaUtils.getPatientData( {
                    _id: this.patientId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } );

                let caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId: this.patientId,
                    _id: this.caseFolderId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                } );

                let schein = mochaUtils.getScheinData( {
                    patientId: this.patientId,
                    caseFolderId: this.caseFolderId,
                    locationId: this.locationId,
                    employeeId: this.employeeId
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( schein )
                } );

                let docLetterData = eDocLetterFormData.getDocLetter( this.patientId, this.employeeId, this.locationId, this.caseFolderId );

                this.docLetterId = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } ))[0];

                let formData = eDocLetterFormData.getAdditionalFormData( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                for( let modelName of Object.keys( formData ) ) {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data: formData[modelName]
                    } );
                }

                await (new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.formtemplate.makepdf( {
                        user,
                        originalParams: {
                            mapObject: this.docLetterId,
                            mapCollection: 'activity',
                            formId: docLetterData.formId,
                            formVersionId: docLetterData.formVersionId
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        }
                    } );
                } ));

                const qesMock = {
                    async verifyDocument() {
                        await (new Promise( resolve => setTimeout( resolve, 2000 ) ));
                        return {
                            Status: {Result: 'OK'},
                            VerificationResult: {
                                HighLevelResult: 'VALID',
                                TimestampType: 'SYSTEM_TIMESTAMP',
                                Timestamp: new Date( '2021-02-05T07:46:01.175Z' )
                            }
                        };
                    }
                };

                this.docLetter = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {_id: this.docLetterId}
                } ))[0];

                this.attachedMedia = this.docLetter.attachedMedia[0];

                this.qesStub = sinon.stub( Y.doccirrus.dcTi, 'createQES' ).returns( Promise.resolve( qesMock ) );

                this.result = await Y.doccirrus.api.tiQES.verifyDocument( {
                    user,
                    originalParams: {
                        attachedMedia: this.attachedMedia,
                        tiContext: {}
                    }
                } );

            } );

            after( async function() {
                await cleanDb( {user} );
                this.qesStub.restore();
            } );

            it( `should verify attached media`, async function() {
                expect( this.result.VerificationResult.HighLevelResult ).to.equal( 'VALID' );
            } );

        } );

    } );
} );