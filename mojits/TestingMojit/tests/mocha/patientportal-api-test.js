/**
 * User: pi
 * Date: 05.12.17  08:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, should, it, describe, after, before */

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    mongoose = require( 'mongoose' ),
    moment = require( 'moment' ),
    patientRegId = new mongoose.Types.ObjectId().toString(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    //depending on this ID
    locationId = new mongoose.Types.ObjectId( '000000000000000000000001' ).toString(),
    scheduleId = new mongoose.Types.ObjectId().toString(),
    scheduletypeId = new mongoose.Types.ObjectId( '100000000000000000000008' ).toString(),
    calendarId = new mongoose.Types.ObjectId( '515ae9604013671c12c1c900' ).toString(),
    user = Y.doccirrus.auth.getSUForLocal(),
    patientData = {
        lastname: 'patientLastName',
        firstname: 'patientFirstName',
        dob: '1990-06-30T22:00:00.000Z',
        pw: '123',
        customerId: '1234',
        email: 'patientTestEmail@doc-cirrus.com',
        talk: 'MR'
    },
    patientPRC = {
        _id: '5a2124870d79dc0d77472ed4',
        countryMode: [mochaUtils.getCountryMode()],
        patientNo: '000013',
        dob: '1989-12-31T23:00:00.000Z',
        kbvDob: '01.01.1990',
        patientNumber: 13,
        sendPatientReceipt: false,
        gender: 'MALE',
        talk: 'MR',
        communications: [
            {
                type: 'EMAILJOB',
                value: 'test+mocha@doc-cirrus.com',
                confirmNeeded: true,
                confirmed: true,
                signaling: true
            }
        ],
        lastname: 'MochaLastName',
        middlename: '',
        nameaffix: '',
        firstname: 'MochaFirstName',
        title: '',
        careDegree: 'NO',
        crmCatalogShort: 'GOÄ',
        accessPRC: true,
        createPlanned: true,
        devices: [
            {
                key: 'gEACjAWmPerswbffMXMNGrngS3wwV/gReooRpQ34rwCm15fBI1mkFdh7tNvweTkq/1gyj6936jwHFo0oZXXCOg==',
                timestamp: new Date( '2017-12-05T10:22:05.376Z' ),
                browser: 'Chrome'
            },
            {
                key: 'r9a0BnnGSXF3+ACJURDzChOsA+QV/43tQovjUo+JHRY2cVpWkia1CLac4Pcxo8q0SMV3UysZibjW8OC0R3kg4g==',
                timestamp: new Date( '2017-12-05T10:35:15.462Z' ),
                browser: 'Chrome'
            },
            {
                key: 'nfwNgETAttRfNitKKOyMWsuxuX/S4c97k0aLUCHbqmTt74rZEaMKDkaHJtKT0eUNyHmilsGghJ3s6wUM8TkF1Q==',
                timestamp: new Date( '2017-12-05T10:37:58.810Z' ),
                browser: 'Chrome'
            }
        ]
    },
    partnerId = 'UVITA',
    metapracEntry = {
        host: 'http://isd.dev.dc',
        systemType: 'INCARE',
        systemId: '599e82e6749f0f0805e80168',
        customerIdPrac: '1234',
        pubKey: 'LjSWFUfYw6U6KqJR4N7J5v2hsYQxP3oGpLoZx3kAoF7wJzL4uK+6kw9cs5eemj+0dLlqvs+6dYkVMlmYmBFuIg==',
        invitations: []
    },
    patientContact = {
        firstname: 'patientFirstName',
        lastname: 'patientLastName',
        dob: '1990-06-30T22:00:00.000Z',
        confirmed: true,
        talk: 'MR',
        email: 'patientTestEmail@doc-cirrus.com',
        phone: undefined,
        partnerIds: [{partnerId: 'UVITA'}]
    },
    identityData = {
        _id: '5a1800945fd3d410501499a1',
        username: 'mochaTest',
        firstname: 'Tester',
        lastname: 'Mocha',
        specifiedBy: '5a1800945fd3d410501499a0',
        status: 'ACTIVE',
        memberOf: [
            {group: 'ADMIN'}
        ],
        pw: '$2$rwt9ab354myo6076345de24d4c9c75c5d878c88c750ba1278409a2502cb4655c50777da561d4dbfecf9300d2a2ee380a92492fd6af586a8c6c87f90566983b816aeab2de0672'
    },
    calendarEntry = {
        _id: calendarId,
        color: "#17bfbc",
        name: "Arztkalender",
        type: "PATIENTS",
        isPublic: true,
        employee: employeeId,
        locationId: locationId,
        consultTimes: [
            {
                "privateInsurance": true,
                "publicInsurance": true,
                "_id": "54e1bd4e6af0fd620fd6cb04",
                "end": [
                    22,
                    0
                ],
                "start": [
                    9,
                    0
                ],
                "colorOfConsults": "#cf4444",
                "days": [
                    1,
                    2,
                    5,
                    3,
                    4
                ]
            }
        ],
        isRandomMode: true,
        isShared: false
    },
    scheduleType = {
        _id: scheduletypeId,
        duration: 15,
        durationUnit: "MINUTES",
        isPublic: true,
        name: "Standard",
        calendarRefs: [
            {
                "calendarId": calendarId
            }
        ],
        capacity: 0,
        numberOfSuggestedAppointments: 10,
        info: "",
        isPreconfigured: false
    },
    patientKeys = {
        publicKey: "eD19TjKibPChL9daewQAEOpx1CnULzLTlaOJsg/oCFEEqP5nZJ6x5bbH0XigXqYuhhBC9czcQIShPvIFGGlwiw==",
        secret: "Is0JCuh5/ImJ2UrDnQaEwZI9Chdhv+HZhWu3hMTv8Sg="
    },
    dcEncDec = require( '../uvita/encdec' );

let mediaId,
    slot;

function generatePin() {
    let
        ppToken,
        generatedAt,
        pin,
        fp,
        pinHash,
        sharedSecret,
        prcPackage;
    ppToken = Y.doccirrus.utils.generateSecureToken(); // one of the patient authentication factors
    generatedAt = new Date();// the time token was generated
    ppToken = generatedAt.toJSON() + ppToken;
    fp = Y.doccirrus.authpub.generateHash( metapracEntry.pubKey );
    pin = Y.doccirrus.api.patientreg.generatePatientPin( ppToken, fp, null );

    sharedSecret = Y.doccirrus.authpub.getSharedSecret( patientKeys.secret, metapracEntry.pubKey );
    prcPackage = {patientPin: pin};
    prcPackage = Y.doccirrus.authpub.encJSON( sharedSecret, prcPackage );
    pinHash = Y.doccirrus.authpub.generateHash( pin );

    return {
        pin,
        generatedAt,
        ppToken,
        prcPackage,
        pinHash,
        sharedSecret
    };
}

/**
 * Test checks that all api endpoints which are used by patient portal and by partners (UVITA) are working correctly.
 * It also checks which was sent to dcprc/prc during an api call.
 */
describe( 'Test patient portal api', function() {
    let
        pinData;
    describe( '0. Setup', function() {
        it( 'Cleans db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Creates default location', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {_id: locationId} ) )
            } ).should.be.fulfilled;
        } );
        it( 'Generates prc keys', function( done ) {
            Y.doccirrus.auth.generateKeys( user, ( err, result ) => {
                should.not.exist( err );
                metapracEntry.pubKey = result.publicKey;
                pinData = generatePin();
                done();
            } );
        } );
        it( 'Inserts metaprac', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                action: 'post',
                data: Object.assign( {skipcheck_: true}, metapracEntry )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
        it( 'Inserts patient', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true,
                    generatedAt: pinData.generatedAt,
                    pin: pinData.pin
                }, patientPRC )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
        it( 'Inserts calendar', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'calendar',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true
                }, calendarEntry )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
        it( 'Inserts scheduletype', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'scheduletype',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true
                }, scheduleType )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
    } );
    describe( '1. Test "register"', function() {
        const
            emails = [],
            dcprcToData = [];
        let
            identity,
            patientreg;
        before( function() {
            Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                emails.push( _mailOptions );
            } );
            Y.doccirrus.utils.event.on( 'onDcprcSetPatientAsContact', ( data ) => {
                dcprcToData.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
            Y.doccirrus.utils.event.removeAllListeners( 'onDcprcSetPatientAsContact' );
        } );
        it( 'Makes api.patientportal.register call ', function( done ) {
            Y.doccirrus.api.patientportal.register( {
                user,
                data: patientData,
                httpRequest: {
                    friendData: {
                        serverType: partnerId,
                        appName: partnerId
                    }
                },
                callback( err, results ) {
                    should.not.exist( err );
                    should.exist( results );
                    done();
                }
            } );
        } );

        it( 'Gets identity', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'identity',
                action: 'get'
            } ).should.be.fulfilled.then( ( results ) => {
                should.exist( results );
                results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                identity = results[0];
            } );
        } );
        it( 'Gets patientreg', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patientreg',
                action: 'get'
            } ).should.be.fulfilled.then( ( results ) => {
                should.exist( results );
                results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                patientreg = results[0];
            } );
        } );
        it( 'Checks identity and patientreg', function() {
            patientreg.identityId.should.equal( identity._id.toString() );
            should.exist( patientreg.customerIdPat );
            identity.username.should.equal( patientData.email );
            identity.partnerIds.should.be.an( 'array' ).which.has.lengthOf( 1 );
            identity.partnerIds[0].partnerId.should.equal( partnerId );
        } );
        it( 'Checks emails', function() {
            emails.should.have.lengthOf( 1 );
            emails[0].subject.should.equal( 'Herzlich Willkommen $fullname$.' );
        } );
        it( 'Checks data which was sent to dcprc', function() {
            dcprcToData.should.have.lengthOf( 1 );
            dcprcToData[0].should.deep.equal( patientContact );
        } );
    } );
    describe( '2. Test partnerId of patient contact', function() {
        const
            dcprcContact = {
                dob: new Date( '1990-06-30T22:00:00.000Z' ),
                confirmed: true,
                patient: true,
                partnerIds: [{partnerId: 'UVITA'}],
                talk: 'MR',
                addresses: [],
                communications:
                    [
                        {
                            type: 'EMAILJOB',
                            value: 'patientTestEmail@doc-cirrus.com',
                            confirmNeeded: false,
                            confirmed: false,
                            signaling: true
                        }],
                accounts: [],
                lastname: 'patientLastName',
                fk3120: '',
                middlename: '',
                nameaffix: '',
                title: '',
                firstname: 'patientFirstName'
            },
            dcprcContactData = {
                firstname: 'patientFirstName',
                lastname: 'patientLastName',
                dob: '1990-06-30T22:00:00.000Z',
                confirmed: true,
                patient: true,
                talk: 'MR',
                email: 'patientTestEmail@doc-cirrus.com',
                phone: undefined,
                partnerIds: [{partnerId: 'UVITA'}],
                communications: [
                    {
                        type: 'EMAILJOB',
                        value: patientContact.email,
                        confirmed: false
                    }]
            };
        let
            contact;
        it( 'Inserts contact with partnerId', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'contact',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true
                }, dcprcContactData )
            } ).should.be.fulfilled;
        } );
        it( 'Gets contact', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'contact',
                action: 'get'
            } ).should.be.fulfilled.then( ( results ) => {
                should.exist( results );
                results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                contact = results[0];
            } );
        } );
        it( 'Checks patient contact', function() {
            delete contact._id;
            contact.communications.should.be.an( 'array' ).which.has.lengthOf( 1 );
            delete contact.communications[0]._id;
            contact.partnerIds.should.be.an( 'array' ).which.has.lengthOf( 1 );
            delete contact.partnerIds[0]._id;
            contact.should.deep.equal( dcprcContact );
        } );

    } );
    describe( '3. Test getPatientInfo', function() {
        it( 'Inserts identity', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'post',
                data: Object.assign( {skipcheck_: true}, identityData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
        it( 'inserts patientreg entry', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patientreg',
                action: 'post',
                data: {
                    _id: patientRegId,
                    customerIdPat: "59ef43399dce3f06a7c71ff6",
                    identityId: identityData._id,
                    prcKey: metapracEntry.pubKey,
                    createPlanned: true,
                    accessPRC: true,
                    confirmed: true,
                    patientId: patientPRC._id,
                    customerIdPrac: metapracEntry.customerIdPrac,
                    skipcheck_: true
                }
            } ).should.be.fulfilled;
        } );
        it( 'Makes getPatientInfo call with wrong user', function() {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.getPatientInfo( {
                    user,
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } )
                .catch( err => {
                    err.code.should.equal( 500 );
                    throw err;
                } )
                .should.be.rejected;
        } );
        it( 'Makes getPatientInfo call with correct user', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} ),
                result = {
                    identityId: '5a1800945fd3d410501499a1',
                    prcInfo:
                        [
                            {
                                customerIdPrac: metapracEntry.customerIdPrac,
                                registeredKeys: patientPRC.devices,
                                createPlanned: true,
                                accessPRC: true
                            }]
                };
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.getPatientInfo( {
                    user: _user,
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled
                .then( data => {
                    data.should.be.an( 'object' );
                    data.prcInfo[0].registeredKeys.forEach( item => delete item._id );
                    data.should.deep.equal( result );
                } );

        } );
    } );
    describe( '4. Test registerPatientKey', function() {
        it( 'Update patientreg entry (set ppToken)', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patientreg',
                action: 'put',
                query: {
                    _id: patientRegId
                },
                fields: ['ppToken'],
                data: {
                    ppToken: pinData.ppToken,
                    skipcheck_: true
                }
            } ).should.be.fulfilled;
        } );

        it( 'Makes registerPatientKey call ', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.registerPatientKey( {
                    user: _user,
                    data: {
                        customerIdPrac: metapracEntry.customerIdPrac,
                        prcPackage: pinData.prcPackage,
                        prcKey: metapracEntry.pubKey,
                        patientPublicKey: patientKeys.publicKey,
                        pinHash: pinData.pinHash,
                        browser: 'MochaTest'
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled;
        } );

        it( 'Makes getPatientInfo call', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.getPatientInfo( {
                    user: _user,
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled
                .then( data => {
                    data.should.be.an( 'object' );
                    data.prcInfo[0].registeredKeys.should.be.an( 'array' ).which.has.lengthOf( 4 );
                    data.prcInfo[0].registeredKeys[3].browser.should.equal( 'MochaTest' );
                    data.prcInfo[0].registeredKeys[3].key.should.equal( patientKeys.publicKey );
                } );

        } );
    } );
    describe( '5. Test postMedia', function() {
        const
            content = {
                dataURI: 'data:image/jpeg;base64,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',
                docType: 'MEDIMAGE',
                caption: 'testDocument'
            };

        let postMedia = [],
            encryptedContent;
        before( function() {
            Y.doccirrus.https.event.on( 'onExternalPost', ( data ) => {
                postMedia.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.https.event.removeAllListeners( 'onExternalPost' );
        } );

        it( 'Makes postMedia call', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );

            encryptedContent = dcEncDec.encryptDCJson( pinData.sharedSecret, content );

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.postMedia( {
                    user: _user,
                    originalParams: {
                        identityId: identityData._id,
                        customerIdPrac: metapracEntry.customerIdPrac,
                        sha1KeyHash: dcEncDec.sha1hash( patientKeys.publicKey ),
                        content: encryptedContent
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled;
        } );

        it( 'Checks media post request', function() {

            let remoteUrl = metapracEntry.host + '/1/media/:saveDataURIAsActivity' +
                            '?pid=' + patientPRC._id +
                            '&pubKeyHash_=' + dcEncDec.sha1hash( patientKeys.publicKey ) +
                            '&source_=' + 'patient' +
                            '&id_=' + patientPRC._id;

            postMedia.should.have.lengthOf( 1 );
            postMedia[0].should.deep.equal( {
                url: remoteUrl,
                data: {
                    'content_': encryptedContent,
                    'pubKeyHash_': dcEncDec.sha1hash( patientKeys.publicKey ),
                    'id_': patientPRC._id
                },
                options: {friend: true}
            } );
        } );

        it( 'Call saveDataURIAsActivity to store media', function() {

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.media.saveDataURIAsActivity( {
                    user,
                    originalParams: {
                        dataURI: content.dataURI,
                        docType: content.docType,
                        caption: content.caption,
                        pid: patientPRC._id,
                        employeeId: employeeId,
                        browser: 'MochaTest'
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled
                .then( data => {
                    data.should.be.an( 'object' );
                    data.caption.should.equal( content.caption );
                    data.patientId.should.equal( patientPRC._id );
                    data.type.should.equal( content.docType );
                    mediaId = data.mediaId;
                } );
        } );

    } );
    describe( '6. Test getMedia', function() {

        let getMedia = [],
            content = {
                mediaId: mediaId
            },
            encryptedContent;
        before( function() {
            Y.doccirrus.https.event.on( 'onExternalPost', ( data ) => {
                getMedia.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.https.event.removeAllListeners( 'onExternalPost' );
        } );

        it( 'Makes getMedia call', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );
            encryptedContent = dcEncDec.encryptDCJson( pinData.sharedSecret, content );

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.getMedia( {
                    user: _user,
                    originalParams: {
                        identityId: identityData._id,
                        customerIdPrac: metapracEntry.customerIdPrac,
                        sha1KeyHash: dcEncDec.sha1hash( patientKeys.publicKey ),
                        content: encryptedContent
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled;
        } );

        it( 'Checks media get request', function() {

            let remoteUrl = metapracEntry.host + '/1/media/:loadDataURI' +
                            '?pid=' + patientPRC._id +
                            '&pubKeyHash_=' + dcEncDec.sha1hash( patientKeys.publicKey ) +
                            '&source_=' + 'patient' +
                            '&id_=' + patientPRC._id;

            getMedia.should.have.lengthOf( 1 );
            getMedia[0].should.deep.equal( {
                url: remoteUrl,
                data: {
                    'content_': encryptedContent,
                    'pubKeyHash_': dcEncDec.sha1hash( patientKeys.publicKey )
                },
                options: {friend: true}
            } );
        } );

        it( 'Call loadDataURI to get media', function() {

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.media.loadDataURI( {
                    user,
                    originalParams: {
                        mediaId: mediaId
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled
                .then( data => {
                    data.should.be.an( 'object' );
                    data._id.should.equal( mediaId );
                    data.ownerCollection.should.equal( 'activity' );
                    data.docType.should.equal( 'MEDIMAGE' );
                } );
        } );

    } );
    describe( '7. Test listMedia', function() {

        let listMedia = [];
        before( function() {
            Y.doccirrus.https.event.on( 'onExternalGet', ( data ) => {
                listMedia.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.https.event.removeAllListeners( 'onExternalGet' );
        } );

        it( 'Makes listMedia call', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.listMedia( {
                    user: _user,
                    originalParams: {
                        identityId: identityData._id,
                        customerIdPrac: metapracEntry.customerIdPrac,
                        sha1KeyHash: dcEncDec.sha1hash( patientKeys.publicKey )
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled;
        } );

        it( 'Checks media list request', function() {

            let remoteUrl = metapracEntry.host + '/1/document/:patientMediaDocuments' +
                            '?pid=' + patientPRC._id +
                            '&pubKeyHash_=' + dcEncDec.sha1hash( patientKeys.publicKey ) +
                            '&source_=' + 'patient' +
                            '&id_=' + patientPRC._id;

            listMedia.should.have.lengthOf( 1 );
            listMedia[0].should.deep.equal( {
                url: remoteUrl,
                options: {friend: true}
            } );
        } );

        it( 'Call patientMediaDocuments to get media documents', function() {

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.document.patientMediaDocuments( {
                    user,
                    query: {
                        pid: patientPRC._id
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled
                .then( data => {
                    data.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    data[0].mediaId.should.equal( mediaId );
                    data[0].patientId.should.equal( patientPRC._id );
                    data[0].type.should.equal( 'MEDIMAGE' );
                } );
        } );

    } );
    describe( '8. Test getPracticeAppointmentTypes', function() {

        let scheduleTypes = [];
        before( function() {
            Y.doccirrus.https.event.on( 'onExternalGet', ( data ) => {
                scheduleTypes.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.https.event.removeAllListeners( 'onExternalGet' );
        } );

        it( 'Makes getPracticeAppointmentTypes call', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.getPracticeAppointmentTypes( {
                    user: _user,
                    query: {
                        identityId: identityData._id,
                        customerIdPrac: metapracEntry.customerIdPrac,
                        browser: 'MochaTest'
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled;
        } );

        it( 'Checks shedule types request', function() {

            let url1 = '/r/scheduletype/?query=isPublic,true',
                remoteUrl = metapracEntry.host + url1;

            scheduleTypes.should.have.lengthOf( 1 );
            scheduleTypes[0].should.deep.equal( {
                url: remoteUrl,
                options: {friend: true}
            } );
        } );

        it( 'Call scheduletype "get" to get scheduletype for appointment', function() {

            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'scheduletype',
                action: 'get',
                query: {}
            } ).should.be.fulfilled.then( ( result ) => {
                result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                result[0]._id.toString().should.equal( scheduletypeId );
            } );
        } );

    } );
    describe( '9. Test getFreeAppointments', function() {

        let freeAppointments = [],
            datetime = new Date().toISOString();
        before( function() {
            Y.doccirrus.https.event.on( 'onExternalGet', ( data ) => {
                freeAppointments.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.https.event.removeAllListeners( 'onExternalGet' );
        } );

        it( 'Makes getFreeAppointments call', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.getFreeAppointments( {
                    user: _user,
                    query: {
                        datetime: datetime,
                        calendarId: calendarId,
                        appointmentType: scheduletypeId,
                        duration: scheduleType.duration,
                        customerIdPrac: metapracEntry.customerIdPrac,
                        browser: 'MochaTest'
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled;
        } );

        it( 'Checks free appointment request', function() {

            let url1 = '/r/calculateschedule/?action=calculateschedule&subaction=NEXT_3RND&calendar=' + calendarId +
                       '&scheduleType=' + scheduletypeId + '&isPreconfigured=undefined' +
                       '&isRandomMode=undefined&patientId=' + patientPRC._id,
                url2 = '&auth=&start=' + moment( datetime ).utc().toJSON() + '&duration=' + scheduleType.duration,
                remoteUrl = metapracEntry.host + url1 + url2;

            freeAppointments.should.have.lengthOf( 1 );
            freeAppointments[0].should.deep.equal( {
                url: remoteUrl,
                options: {friend: true}
            } );
        } );

        it( 'Call calculateSchedule to get free slots', function() {

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.calevent.calculateSchedule( {
                    user,
                    data: {
                        action: 'calculateschedule',
                        subaction: 'NEXT_3RND',
                        calendar: calendarId,
                        scheduleType: scheduletypeId,
                        patientId: patientPRC._id,
                        duration: scheduleType.duration,
                        start: moment( datetime ).utc().toJSON()
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled
                .then( data => {
                    data.should.be.an( 'array' ).which.has.lengthOf( 3 );
                    slot = data[0];
                } );
        } );

    } );
    describe( '10. Test makeAppointment', function() {

        let makeAppointments = [],
            end;
        before( function() {
            Y.doccirrus.https.event.on( 'onExternalPost', ( data ) => {
                makeAppointments.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.https.event.removeAllListeners( 'onExternalPost' );
        } );

        it( 'Makes makeAppointment call', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patientportal.makeAppointment( {
                    user: _user,
                    query: {customerIdPrac: metapracEntry.customerIdPrac},
                    data: {
                        start: slot.start,
                        end: end,
                        duration: scheduleType.duration,
                        plannedDuration: scheduleType.duration,
                        calendar: slot.calendar,
                        type: 'BOOKED',
                        adhoc: false,
                        allDay: false,
                        isFromPortal: true,
                        title: '',
                        details: '',
                        patient: patientPRC._id,
                        scheduletype: scheduletypeId
                    },
                    callback( err, data ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( data );
                    }
                } );
            } ).should.be.fulfilled;
        } );

        it( 'Checks makeAppointment request', function() {

            let url1 = '/1/calevent',
                remoteUrl = metapracEntry.host + url1;

            makeAppointments.should.have.lengthOf( 1 );
            makeAppointments[0].should.deep.equal( {
                url: remoteUrl,
                options: {friend: true},
                data: {
                    start: slot.start,
                    end: end,
                    duration: scheduleType.duration,
                    plannedDuration: scheduleType.duration,
                    calendar: slot.calendar,
                    type: 'BOOKED',
                    adhoc: false,
                    allDay: false,
                    isFromPortal: true,
                    title: '',
                    details: '',
                    patient: patientPRC._id,
                    scheduletype: scheduletypeId
                }
            } );
        } );

        it( 'Call calevent post to create schedule', function() {
            const
                _user = Object.assign( {}, user, {identityId: identityData._id} );

            end = new Date( Date.parse( slot.start ) + scheduleType.duration * 60 * 1000 ).toISOString();

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.calevent.post( {
                    user: _user,
                    data: {
                        _id: scheduleId,
                        start: slot.start,
                        end: end,
                        scheduletype: scheduletypeId,
                        duration: scheduleType.duration,
                        plannedDuration: scheduleType.duration,
                        calendar: calendarId,
                        type: 'BOOKED',
                        details: '',
                        adhoc: false,
                        allDay: false,
                        title: '',
                        patient: patientPRC._id,
                        isFromPortal: true,
                        skipcheck_: true
                    },
                    callback: function( err, result ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( result );
                    }
                } );
            } ).should.be.fulfilled
                .then( data => {
                    data.should.be.an( 'object' );
                    data.scheduleId.toString().should.equal( scheduleId );
                } );
        } );
    } );
} );
