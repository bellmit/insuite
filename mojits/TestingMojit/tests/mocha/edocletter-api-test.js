/**
 * User: do
 * Date: 29.01.21  09:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, it, describe, before, after, expect */
const user = Y.doccirrus.auth.getSUForLocal();
const mochaUtils = require( '../../server/mochaUtils' )( Y );
const mongoose = require( 'mongoose' );
const {promisify} = require( 'util' );
const fs = require( 'fs' );
const uuid = require( 'node-uuid' );
const cleanDb = promisify( mochaUtils.cleanDB );
const eDocLetterFormData = require( '../fixtures/qes/docletter-formdata' );
const fixtures = require( '../fixtures/edocletter/fixtures' );
const xml1 = require( '../fixtures/edocletter/xml-1' );

const getFileBuffer = ( user, fileId ) => {
    return new Promise( function( resolve, reject ) {
        Y.doccirrus.gridfs.get( user, fileId, function( err, result ) {
            if( err ) {
                reject( err );
                return;
            }
            resolve( result );
        } );
    } );
};

const getAttachedFileByMediaId = async ( user, mediaId ) => {
    let [fileDoc] = await Y.doccirrus.mongodb.runDb( {
        user: user,
        model: 'fs.files',
        query: {
            filename: mediaId
        }
    } );

    return await getFileBuffer( user, fileDoc._id );
};

function getFixtureData( fileName ) {
    return JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/qes/${fileName}`, 'utf8'));
}

describe( 'edocletter-api', function mainDescribe() {
    before( async function() {

        const dbData = getFixtureData( '/treatment_basecontact.json' );

        let result = await Y.doccirrus.api.catalog.getCatalogDescriptor({
            actType: 'TREATMENT',
            short: 'EBM72'
        });

        for (let activity of dbData.catalogEntries) {
            if(activity.seq === "86901" || activity.seq === "86900") {
                activity.catalog = result.filename;
            }
        }

        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'catalog',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( dbData.catalogEntries )
        } );
    } );
    after( async function() {
        await cleanDb( {user} );
    } );

    describe( 'createTreatmentForSentDocLetter()', function() {
        describe( 'does not craete treatment if incaseconfigurations do not allow', async function() {
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
                    timestamp: new Date(),
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

                let [docletter] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } );

                this.result = await Y.doccirrus.api.edocletter.createTreatmentForSentDocLetter( {
                    user,
                    docletter
                } );

            } );

            after( async function() {
                await cleanDb( {user} );
            } );

            it( `should return code 11500`, async function() {
                expect( this.result.code ).to.equal( '11500' );
            } );

        } );
        describe( 'creates treatment if creation is allowed and locations are empty', async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                const inCaseConfig = {
                    kimTreatmentAutoCreationOnEDocLetterSent: true,
                    kimTreatmentAutoCreationOnEDocLetterSentLocation: [],
                    kimMessagePollingLasttime: null
                };

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'incaseconfiguration',
                    fields: Object.keys( inCaseConfig ),
                    query: {_id: Y.doccirrus.schemas.incaseconfiguration.getDefaultData()._id},
                    data: Y.doccirrus.filters.cleanDbObject( inCaseConfig )
                } );

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
                    timestamp: new Date(),
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

                let [docletter] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } );

                this.result = await Y.doccirrus.api.edocletter.createTreatmentForSentDocLetter( {
                    user,
                    docletter
                } );

                this.docletter = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } ))[0];

                this.createdTreatment = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        patientId: this.patientId,
                        actType: 'TREATMENT'
                    }
                } ))[0];

            } );

            after( async function() {
                await cleanDb( {user} );
            } );

            it( `should return code 0 and createdTreatment ID`, async function() {
                expect( this.result.code ).to.equal( 0 );
                expect( this.result.createdTreatment[0] ).to.be.a( 'string' );
            } );

            it( 'should link treatment to docletter', function() {
                expect( this.docletter.flatFeeTreatmentId ).to.equal( this.createdTreatment._id.toString() );
            } );

            it( 'should reject a second creation of the flat fee treatment', async function() {
                const secondTry = await Y.doccirrus.api.edocletter.createTreatmentForSentDocLetter( {
                    user,
                    docletter: this.docletter
                } );
                expect( secondTry.code ).to.equal( '11502' );
            } );

        } );

        describe( 'creates treatment if creation is allowed and locations are empty in an error case folder on error', async function() {
            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                const inCaseConfig = {
                    kimTreatmentAutoCreationOnEDocLetterSent: true,
                    kimTreatmentAutoCreationOnEDocLetterSentLocation: [],
                    kimMessagePollingLasttime: null
                };

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'incaseconfiguration',
                    fields: Object.keys( inCaseConfig ),
                    query: {_id: Y.doccirrus.schemas.incaseconfiguration.getDefaultData()._id},
                    data: Y.doccirrus.filters.cleanDbObject( inCaseConfig )
                } );

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
                    // --
                    // -- produces an no schein found error
                    // --
                    // timestamp: new Date(),
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

                let [docletter] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } );

                this.result = await Y.doccirrus.api.edocletter.createTreatmentForSentDocLetter( {
                    user,
                    docletter
                } );

                this.docletter = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } ))[0];

                this.errorCaseFolder = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    query: {
                        patientId: this.patientId,
                        additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR
                    }
                } ))[0];

                this.createdTreatment = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        patientId: this.patientId,
                        actType: 'TREATMENT'
                    }
                } ))[0];

            } );

            after( async function() {
                await cleanDb( {user} );
            } );

            it( `should return code 0 and createdTreatment ID`, async function() {
                expect( this.result.code ).to.equal( 0 );
                expect( this.result.createdTreatment[0] ).to.be.a( 'string' );
            } );

            it( 'should add treatment to an error casefolder', function() {
                expect( this.errorCaseFolder ).to.be.an( 'object' );
                expect( this.errorCaseFolder._id.toString() ).to.equal( this.createdTreatment.caseFolderId );
            } );

            it( 'should link treatment to docletter', function() {
                expect( this.docletter.flatFeeTreatmentId ).to.equal( this.createdTreatment._id.toString() );
            } );

        } );

    } );

    describe( 'parseAndMapDocLetterXml()', function() {

        describe( `parse and map patient from docletter xml`, async function() {

            before( async function() {
                const xmlString = xml1.get( {
                    docLetterId: mongoose.Types.ObjectId().toString(),
                    patientId: mongoose.Types.ObjectId().toString(),
                    docLetterTimestamp: new Date(),
                    signer1Timestamp: new Date(),
                    signer2Timestamp: new Date(),
                    xmlSetId: uuid.v4()
                } );

                this.result = await Y.doccirrus.api.edocletter.parseAndMapDocLetterXml( {
                    xmlString
                } );
            } );

            after( async function() {
                this.result = null;
            } );

            it( `should create patient object`, async function() {
                expect( this.result.patient ).to.be.an( 'object' );
            } );

            it( `should map all relevant patient fields`, async function() {
                expect( this.result.patient.firstname ).to.be.equal( 'Test' );
                expect( this.result.patient.lastname ).to.be.equal( 'Patient' );
                expect( this.result.patient.title ).to.be.equal( 'Dr.' );
                expect( this.result.patient.nameaffix ).to.be.equal( 'von' );
                expect( this.result.patient.dob.toString() ).to.be.equal( (new Date( '1989-12-31T23:00:00.000Z' ).toString()) );
                expect( this.result.patient.kbvDob ).to.be.equal( '01.01.1990' );
                expect( this.result.patient.gender ).to.be.equal( 'MALE' );
                expect( this.result.patient.addresses[0].kind ).to.be.equal( 'OFFICIAL' );
                expect( this.result.patient.addresses[0].street ).to.be.equal( '23' );
                expect( this.result.patient.addresses[0].houseno ).to.be.equal( '123' );
                expect( this.result.patient.addresses[0].zip ).to.be.equal( '12099' );
                expect( this.result.patient.addresses[0].city ).to.be.equal( 'Berlin' );
                expect( this.result.patient.addresses[0].countryCode ).to.be.equal( 'D' );
                expect( this.result.patient.addresses[0].country ).to.be.equal( 'Deutschland' );
                expect( this.result.patient.communications[0].type ).to.be.equal( 'PHONEPRIV' );
                expect( this.result.patient.communications[0].value ).to.be.equal( '+000' );
                expect( this.result.patient.communications[1].type ).to.be.equal( 'EMAILPRIV' );
                expect( this.result.patient.communications[1].value ).to.be.equal( 'mocha-test-patient@doc-cirrus.com' );
                expect( this.result.patient.insuranceStatus[0].type ).to.be.equal( 'PUBLIC' );
                expect( this.result.patient.insuranceStatus[0].insuranceNo ).to.be.equal( 'A123456789' );
                expect( this.result.patient.insuranceStatus[0].insuranceId ).to.be.equal( '109519005' );
                expect( this.result.patient.insuranceStatus[0].insuranceGrpId ).to.be.equal( '72101' );
            } );

        } );

    } );

    describe( 'generateDocLetterXML()', function() {

        describe( 'creates an xml attachment', async function() {

            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                const dbData = getFixtureData( '/treatment_basecontact.json' );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.employee2Id = mongoose.Types.ObjectId().toString();
                this.familyDoctorId = mongoose.Types.ObjectId().toString();
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

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'basecontact',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        ...dbData.familyDoctor,
                        _id: this.familyDoctorId
                    } )
                } );

                let employee2Data = mochaUtils.getEmployeeData( {
                    _id: this.employee2Id,
                    firstname: 'Foo',
                    lastname: 'Bar',
                    officialNo: '999999900',
                    title: 'Dr.',
                    nameaffix: 'von'
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employee2Data )
                } );

                let patientData = mochaUtils.getPatientData( {
                    _id: this.patientId,
                    title: 'Dr.',
                    nameaffix: 'von',
                    familyDoctor: this.familyDoctorId.toString()
                } );

                patientData.insuranceStatus[0].insuranceNo = 'A123456789';

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
                    timestamp: new Date(),
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

                docLetterData.timestamp = new Date();
                const signer1Timestamp = new Date();
                const signer2Timestamp = new Date();

                docLetterData.kimSignedBy = [
                    {
                        "timestamp": signer1Timestamp,
                        "name": "Test Bar",
                        "employeeId": this.employeeId.toString()
                    },
                    {
                        "timestamp": signer2Timestamp,
                        "name": "Foo Bar",
                        "employeeId": this.employee2Id.toString()
                    }
                ];
                let [docLetterId] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } );

                let [docletter] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } );

                this.result = await Y.doccirrus.api.edocletter.generateDocLetterXML( {
                    user,
                    docletter
                } );

                this.docletter = (await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } ))[0];

                this.xmlAttachedMedia = this.docletter.attachedMedia.find( attachedMedia => attachedMedia.contentType === 'application/xml' );
                this.xmlFixture = xml1.get( {
                    docLetterId: docLetterId.toString(),
                    patientId: this.patientId.toString(),
                    docLetterTimestamp: docLetterData.timestamp,
                    signer1Timestamp,
                    signer2Timestamp,
                    xmlSetId: this.docletter.xmlSetId
                } );
                this.writtenXmlFile = await getAttachedFileByMediaId( user, this.xmlAttachedMedia.mediaId );
            } );

            after( async function() {
                await cleanDb( {user} );
            } );

            it( `should create an attachedMedia entry with the xml file`, async function() {
                expect( this.xmlAttachedMedia ).to.be.an( 'object' );
            } );

            it( `should create a valid xml file`, async function() {
                expect( this.writtenXmlFile.data.toString() ).to.be.equal( this.xmlFixture );
            } );

        } );

    } );

    describe( 'activity.revertKIMActivity() / removeRelatedTreatments()', function() {

        describe( 'removes all related activities', async function() {

            before( async function() {
                this.timeout( 30000 );
                await cleanDb( {user} );

                this.locationId = mongoose.Types.ObjectId().toString();
                this.employeeId = mongoose.Types.ObjectId().toString();
                this.employee2Id = mongoose.Types.ObjectId().toString();
                this.patientId = mongoose.Types.ObjectId().toString();
                this.caseFolderId = mongoose.Types.ObjectId().toString();
                this.patientTransferId = mongoose.Types.ObjectId().toString();
                this.flatFeeId = mongoose.Types.ObjectId().toString();

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
                    timestamp: new Date(),
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

                docLetterData.flatFeeTreatmentId = this.flatFeeId;
                docLetterData.timestamp = new Date();

                let formData = eDocLetterFormData.getAdditionalFormData( this.patientId, this.employeeId, this.locationId, this.caseFolderId );
                for( let modelName of Object.keys( formData ) ) {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data: formData[modelName]
                    } );
                }

                let [docLetterId] = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( docLetterData )
                } );

                const patientTransfer = fixtures.getPatientTransfer( this.patientTransferId, this.patientId, this.employeeId, this.locationId, this.caseFolderId, [docLetterId.toString()] );

                const patientTransferModel = await (new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'patienttransfer', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } ));

                await patientTransferModel.mongoose.insertMany( [patientTransfer] );

                const flatFee = fixtures.getFlatFee( this.flatFeeId, this.patientId, this.employeeId, this.locationId, this.caseFolderId );

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( flatFee )
                } );

                await Y.doccirrus.api.activity.revertKIMActivity( {
                    user,
                    data: {
                        patientTransferId: this.patientTransferId
                    }
                } );

                this.docletters = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docLetterId
                    }
                } );

                this.flatFees = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: this.flatFeeId
                    }
                } );

                this.patientTransfers = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patienttransfer',
                    query: {
                        _id: this.patientTransferId
                    }
                } );

            } );

            after( async function() {
                await cleanDb( {user} );
            } );

            it( `shoud remove all docletters`, async function() {
                expect( this.docletters ).to.be.an( 'array' ).with.lengthOf( 0 );
            } );
            it( `shoud remove flat fee treatment`, async function() {
                expect( this.flatFees ).to.be.an( 'array' ).with.lengthOf( 0 );
            } );
            it( `shoud update patienttransfer`, async function() {
                expect( this.patientTransfers ).to.be.an( 'array' ).with.lengthOf( 1 );
                expect( this.patientTransfers[0].patientId ).to.eql( null );
                expect( this.patientTransfers[0].patientName ).to.eql( '' );
                expect( this.patientTransfers[0].activityIds ).to.be.an( 'array' ).with.lengthOf( 0 );
            } );

        } );

    } );

} );