/**
 * User: dcdev
 * Date: 4/26/20  4:18 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, describe, it, should, expect, before, beforeEach, after, afterEach*/

/*
* !!! IMPORTANT !!! These tests require Sumex server running
* */
const
    mongoose = require( 'mongoose' ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    {appCurrentPort} = Y.doccirrus.sumexUtils.getStaticSumexIpAndPort(),
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    fs = require( 'fs' ),
    sinon = require( 'sinon' ),
    needle = require( 'needle' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

async function postEntry( model, entry ) {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
}

async function putEntry( model, entryId, data ) {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        query: {
            ...(entryId ? {_id: entryId} : {})
        },
        action: 'put',
        fields: Object.keys( data ),
        data: Y.doccirrus.filters.cleanDbObject( data )
    } );
}

async function prepareActivityData( schein, activities, catalogShort, ids, factors ) {
    const {locationId, caseFolderId, employeeId, patientId} = ids,
        {technicalScalingFactor, medicalScalingFactor, taxPointValue} = factors,
        allActivities = [],
        allDiagnoses = [],
        referencedBy = [];
    schein.locationId = locationId;
    schein.caseFolderId = caseFolderId.toString();
    schein.employeeId = employeeId.toString();
    schein.patientId = patientId.toString();

    activities.forEach( t => {
        t.locationId = locationId;
        t.caseFolderId = caseFolderId.toString();
        t.employeeId = employeeId.toString();
        t.patientId = patientId.toString();
    } );

    await postEntry( 'activity', schein );

    const mainTreatment = activities.find( a => a.code === '00.0010' );
    let result = await postEntry( 'activity', mainTreatment );
    allActivities.push( result[0] );

    for( let activity of activities ) {
        if( ['TARMED', 'TARMED_UVG_IVG_MVG'].includes(activity.catalogShort) ) {
            activity.medicalScalingFactor = medicalScalingFactor;
            activity.technicalScalingFactor = technicalScalingFactor;
            activity.taxPointValue = taxPointValue;
        }
        if( activity.catalogShort === catalogShort && activity.code !== '00.0010' ) {
            activity.activities = [allActivities[0]];
            result = await postEntry( 'activity', activity );
            referencedBy.push( result[0] );
        }
        if( activity.actType === 'DIAGNOSIS' ) {
            result = await postEntry( 'activity', activity );
            allDiagnoses.push( result[0] );
        }
        else if( activity.code !== '00.0010' ) {
            result = await postEntry( 'activity', activity );
        }
        allActivities.push( result[0] );
    }
    await putEntry( 'activity', allActivities[0], {referencedBy} );

    return {
        activities: allActivities,
        diagnoses: allDiagnoses
    };
}

function checkPrices( invoice, correctPrice ) {
    const roundedPrice = Y.doccirrus.commonutilsCh.roundSwissPrice( correctPrice );
    expect( invoice.totalWithoutExpenses ).to.be.equal( correctPrice );
    expect( invoice.totalDoc ).to.be.equal( correctPrice );
    expect( invoice.beforetax ).to.be.equal( correctPrice );
    expect( invoice.totalOwing ).to.be.equal( correctPrice );
    expect( invoice.total ).to.be.equal( correctPrice );

    expect( invoice.totalReceiptsOutstanding ).to.be.equal( roundedPrice );
    expect( invoice.price ).to.be.equal( roundedPrice );
}

async function cleanCollections() {
    await cleanDb( {
        user,
        collections2clean: ['activity', 'casefolder', 'patient', 'location', 'employee', 'catalog']
    } );
}

describe( 'invoice-api', function() {
    const
        patientId = new mongoose.Types.ObjectId().toString(),
        caseFolderId = new mongoose.Types.ObjectId().toString(),
        employeeId = new mongoose.Types.ObjectId().toString(),
        locationId = new mongoose.Types.ObjectId().toString(),
        generateDocumentsPromise = promisifyArgsCallback( Y.doccirrus.api.invoice.generateSumexDocuments ),
        fsmName = Y.doccirrus.schemas.activity.getFSMName( 'INVOICE' ),
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

    before( async function() {
        this.timeout( 10000 );
        sinon.restore();

        await cleanCollections();
        // must validate for CH countryMode
        if( !Y.config ) {
            Y.config = {};
        }

        if( !Y.config.doccirrus ) {
            Y.config.doccirrus = {};
        }

        if( !Y.config.doccirrus.Env ) {
            Y.config.doccirrus.Env = {};
        }

        countryMode = Y.config.doccirrus.Env.countryMode;
        Y.config.doccirrus.Env.countryMode = ['CH'];

        const catalogTreatments = require( `../catalogData/tarmedCatalogTreatments` ),
            sumexAppreg = {
                "hasAccess": true,
                "appName": "sumex",
                "appCurrentPort": appCurrentPort || 9000,
                "appHostType": "LOCAL",
                "title": "Sumex"
            }, qualiCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'TARMED_DIGNI_QUALI'
            } ), tarmedCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'TARMED'
            } ), tarmedUvgCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'TARMED_UVG_IVG_MVG'
            } );

        location = mochaUtils.getLocationData( {
            _id: locationId,
            countryMode: 'CH',
            countryCode: 'CH',
            zip: 1210,
            cantonCode: '3',
            bankIBAN: '01-162-8',
            esrNumber: '010001628',
            zsrNumber: "T277419",
            glnNumber: '7601000993939'
        } );
        let employeeData = mochaUtils.getEmployeeData( {
                _id: employeeId,
                countryMode: 'CH',
                zsrNumber: 'T277489',
                qualiDignities: ['0500'],
                glnNumber: '7601000164874'
            } ),
            patientData = mochaUtils.getPatientData( {
                _id: patientId, countryMode: 'CH', cantonCode: '3', insuranceStatus: [
                    {
                        "fk4133": null,
                        "fk4110": null,
                        "insuranceKind": "",
                        "costCarrierBillingSection": "",
                        "costCarrierBillingGroup": "",
                        "feeSchedule": "",
                        "fused": false,
                        "unzkv": [],
                        "bgNumber": "",
                        "address1": "Laurstrasse 10",
                        "address2": "",
                        "zipcode": "6002",
                        "city": "Winterthur",
                        "phone": "+41 800 809 809",
                        "insuranceLink": "www.axa.ch",
                        "email": "",
                        "insuranceGLN": "7601003898064",
                        "recipientGLN": "7601003898064",
                        "department": "",
                        "isTiersGarant": false,
                        "isTiersPayant": true,
                        "insuranceId": "7601003898064",
                        "insuranceName": "AXA Health (KVG / LAMal)",
                        "insurancePrintName": "AXA Health",
                        "type": "PRIVATE_CH",
                        "locationId": locationId,
                        "changebillingtypedesc": true,
                        "mediport": true
                    },
                    {
                        "fk4133": null,
                        "fk4110": null,
                        "insuranceKind": "",
                        "costCarrierBillingSection": "",
                        "costCarrierBillingGroup": "",
                        "feeSchedule": "",
                        "fused": false,
                        "unzkv": [],
                        "bgNumber": "",
                        "address1": "Laurstrasse 10",
                        "address2": "",
                        "zipcode": "6002",
                        "city": "Winterthur",
                        "phone": "+41 800 809 809",
                        "insuranceLink": "www.axa.ch",
                        "email": "",
                        "insuranceGLN": "7601003898064",
                        "recipientGLN": "7601003898064",
                        "department": "",
                        "isTiersGarant": false,
                        "isTiersPayant": true,
                        "insuranceId": "7601003898064",
                        "insuranceName": "AXA Health (KVG / LAMal)",
                        "insurancePrintName": "AXA Health",
                        "type": "PRIVATE_CH_IVG",
                        "locationId": locationId,
                        "changebillingtypedesc": true,
                        "mediport": true
                    }]
            } ),
            caseFolderData = mochaUtils.getCaseFolderData( {
                type: 'PRIVATE_CH',
                patientId: patientId.toString(),
                _id: caseFolderId,
                countryMode: 'CH'
            } );
        const catalogQualiDignities = require( `../catalogData/qualiDignities` ).map( qd => {
            return {...qd, catalog: qualiCatalogDescriptor.fileName};
        } );

        for( let dignity of catalogQualiDignities ) {
            await postEntry( 'catalog', dignity );
        }
        for( let catalogTreatment of catalogTreatments ) {
            await postEntry( 'catalog', Y.doccirrus.filters.cleanDbObject( {
                ...catalogTreatment,
                catalog: catalogTreatment.catalogShort === 'TARMED_UVG_IVG_MVG' ? tarmedUvgCatalogDescriptor.filename : tarmedCatalogDescriptor.filename
            } ) );
        }
        await postEntry( 'location', Y.doccirrus.filters.cleanDbObject( location ) );
        await postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( employeeData ) );
        user.specifiedBy = employeeId;
        await postEntry( 'patient', Y.doccirrus.filters.cleanDbObject( patientData ) );
        await postEntry( 'casefolder', Y.doccirrus.filters.cleanDbObject( caseFolderData ) );
        await postEntry( 'appreg', Y.doccirrus.filters.cleanDbObject( sumexAppreg ) );

        let schein = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/schein.json`, 'utf8' ) ),
            treatment = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/tarmed_0510_treatment.json`, 'utf8' ) ),
            medication = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/medication.json`, 'utf8' ) ),
            diagnosis = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/diagnosis.json`, 'utf8' ) );

        const treatmentId = new mongoose.Types.ObjectId().toString(),
            medicationId = new mongoose.Types.ObjectId().toString(),
            diagnosisId = new mongoose.Types.ObjectId().toString();

        invoice = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/invoice_CREATED.json`, 'utf8' ) );
        const timestamp = new Date();
        schein.docPrinted = false;
        schein = Object.assign( {patientId, caseFolderId, locationId, employeeId, timestamp}, schein );
        treatment = Object.assign( {
            _id: treatmentId,
            patientId,
            caseFolderId,
            locationId,
            employeeId,
            timestamp
        }, treatment );
        medication = Object.assign( {
            _id: medicationId,
            patientId,
            caseFolderId,
            locationId,
            employeeId,
            timestamp
        }, medication );
        diagnosis = Object.assign( {
            _id: diagnosis,
            patientId,
            caseFolderId,
            locationId,
            employeeId,
            timestamp
        }, diagnosis );
        invoice = Object.assign( {patientId, caseFolderId, locationId, employeeId, timestamp}, invoice );

        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( schein ) );
        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( treatment ) );
        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( medication ) );
        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( diagnosis ) );
        invoice.activities = [treatmentId, medicationId];
        invoice.icds = [diagnosisId];
    } );
    after( async function() {
        sinon.restore();
        Y.config.doccirrus.Env.countryMode = countryMode || ['D'];

        await cleanCollections();
    } );

    let location, invoice, result, countryMode;
    describe( 'validate invoice', function() {
        let validateStub;

        beforeEach( function() {
            validateStub = sinon.stub( Y.doccirrus.api.sumex, 'generalInvoiceRequest' );
        } );
        afterEach( function() {
            validateStub.restore();
        } );

        it( 'should fail because patient has no social security no.', async function() {
            validateStub.restore();
            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].validate );
            } catch( error ) {
                expect( error.code ).to.be.equal( 'sumex_10' );
            }
        } );
        it( 'should succeed after fixing errors', async function() {
            validateStub.returns( Promise.resolve( {errors: [], warnings: [], priceTotal: 0} ) );
            await putEntry( 'patient', patientId, {socialSecurityNo: '7569999999502'} );
            await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].validate );
            expect( invoice.status ).to.be.equal( 'VALID' );
        } );
    } );
    describe( 'api.invoice.generateSumexDocuments', function() {
        const mockResponse = require( '../fixtures/sumex-response' );
        let getSumexSolPortStub, needleStub;

        beforeEach( function() {
            getSumexSolPortStub = sinon.stub( Y.doccirrus.sumexUtils, 'getSumexSolPort' );
            getSumexSolPortStub.resolves( null );

            needleStub = sinon.stub( needle, 'post' );
        } );
        afterEach( function() {
            getSumexSolPortStub.restore();
            needleStub.restore();
        } );

        it( 'should generate sumex documents', async function() {
            this.timeout( 7000 );
            needleStub.yields( null, mockResponse );
            result = await generateDocumentsPromise( {user, invoice} );
            should.exist( result.fullUrl );
        } );
        it( 'check generated xml', async function() {
            let xml;
            result = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    _id: invoice._id
                }
            } );
            invoice = result[0];
            xml = await Y.doccirrus.api.sumex.getXmlFromInvoice( {
                user, invoice, warningId: invoice._id
            } );
            const mockXml = mockResponse.body.operations.find( op => op.xmlContent );
            expect( xml ).to.be.equal( mockXml.xmlContent );
        } );
    } );
    describe( 'check swiss prices', function() {
        /* Factors that affect price:
         * 1. Doctor's QualiDignity (Praktische Arzt 3000)
         * 2. Location's catnon (AG, BE, etc.)
         * 3. Case folder Type (KVG, IVG, etc.)
         */
        describe( "Doctor's qualiDignity factor: 0.93, caseFolderType: KVG, canton: AR ", function() {
            const
                {schein, treatments} = require( '../tarmedInvoices/invoice-api-test-3.testdata' ),
                mockResponse = require( '../fixtures/sumex-response' ),
                correctPrice = 100.50;

            let
                allActivities = [],
                newInvoice = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/invoice_CREATED.json`, 'utf8' ) );

            before( async function() {
                this.timeout( 5000 );
                this.defaultId1 = new mongoose.Types.ObjectId('000000000000000000000002').toString();
                this.mainLocationId = Y.doccirrus.schemas.location.getMainLocationId();
                this.randomId1 = new mongoose.Types.ObjectId().toString();
                await putEntry( 'employee', employeeId, {qualiDignities: ['3000', '0500', '9999']} );
                await putEntry( 'invoiceconfiguration', null, {
                    tarmedInvoiceFactorValues: [
                        {
                            "caseTypes": [
                                "PRIVATE_CH"
                            ],
                            "qualiDignity": "3000",
                            "factor": 0.93
                        }
                    ],
                    receiptsSchemes: [
                        {
                            _id: this.defaultId1,
                            locationId: this.mainLocationId,
                            name: "Box1",
                            year: "2020B1-",
                            digits: 5,
                            nextNumber: 1
                        }, {
                            _id: this.randomId1,
                            locationId: this.mainLocationId,
                            name: "Box2",
                            year: "2020B2-",
                            digits: 5,
                            nextNumber: 1
                        }]
                } );
                allActivities = await prepareActivityData( schein, treatments, 'TARMED', {
                    locationId, caseFolderId, employeeId, patientId
                }, {
                    medicalScalingFactor: 0.93,
                    technicalScalingFactor: 1,
                    taxPointValue: 0.83
                } );
                this.needleStub = sinon.stub( needle, 'post' );
                newInvoice.locationId = new mongoose.Types.ObjectId( locationId );
                newInvoice.caseFolderId = caseFolderId.toString();
                newInvoice.employeeId = employeeId.toString();
                newInvoice.patientId = patientId.toString();
                newInvoice.timestamp = new Date();
                newInvoice.activities = allActivities.activities;
            } );

            after( function() {
                if( this.needleStub ) {
                    this.needleStub.restore();
                }
            } );

            it( 'Save invoice', async function() {
                this.needleStub.yields( null, mockResponse );
                await fsmStateChangePromise( user, {}, newInvoice, false, Y.doccirrus.fsm[fsmName].validate );
                expect( newInvoice.status ).to.be.equal( 'VALID' );
            } );
            it( 'Generate Invoice', async function() {
                this.timeout( 7000 );
                this.needleStub.yields( null, mockResponse );
                result = await generateDocumentsPromise( {user, invoice: newInvoice} );
                should.exist( result.fullUrl );
            } );
            it( 'Check invoice inSuite price field', async function() {
                result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        _id: newInvoice._id
                    }
                } );
                checkPrices( result[0], correctPrice );
            } );
        } );
        describe( "Doctor's qualiDignity factor: 1, caseFolderType: IVG, canton: BL ", function() {
            const {scheinIvg, treatmentsIvg} = require( '../tarmedInvoices/invoice-api-test-3.testdata' ),
                mockResponse = require( '../fixtures/sumex-response' ),
                ivgInvoice = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/invoice_CREATED.json`, 'utf8' ) ),
                ivgCaseFolderId = new mongoose.Types.ObjectId().toString(),
                ivgCaseFolderData = mochaUtils.getCaseFolderData( {
                    type: 'PRIVATE_CH_IVG',
                    patientId: patientId.toString(),
                    _id: ivgCaseFolderId,
                    countryMode: 'CH'
                } ),
                correctPrice = 105.03,
                newAddresses = [
                    {
                        "street": "Blablabla",
                        "houseno": "131",
                        "zip": "4202",
                        "city": "Duggingen",
                        "country": "Schweiz",
                        "countryCode": "CH",
                        "kind": "OFFICIAL",
                        "cantonCode": "4"
                    },
                    {
                        "street": "Sierenzerstr",
                        "houseno": "32",
                        "zip": "1110",
                        "city": "Morges",
                        "country": "Schweiz",
                        "countryCode": "CH",
                        "title": "the best friend",
                        "firstname": "BBB",
                        "lastname": "ZZZ",
                        "kind": "BILLING",
                        "payerType": "person",
                        "talk": "MR",
                        "cantonCode": "23"
                    }
                ];

            let allActivities;
            before( async function() {
                this.timeout( 5000 );
                await postEntry( 'casefolder', Y.doccirrus.filters.cleanDbObject( ivgCaseFolderData ) );
                await putEntry( 'employee', employeeId, {qualiDignities: ['0500', '9999']} );
                await putEntry( 'patient', patientId, {addresses: newAddresses} );
                await putEntry( 'location', locationId, {cantonCode: '5'} );
                allActivities = await prepareActivityData( scheinIvg, treatmentsIvg, 'TARMED_UVG_IVG_MVG', {
                    locationId, caseFolderId: ivgCaseFolderId, employeeId, patientId
                }, {
                    medicalScalingFactor: 1,
                        technicalScalingFactor: 1,
                        taxPointValue: 0.92
                } );
                this.needleStub = sinon.stub( needle, 'post' );
                ivgInvoice.locationId = locationId;
                ivgInvoice.caseFolderId = ivgCaseFolderId.toString();
                ivgInvoice.employeeId = employeeId.toString();
                ivgInvoice.patientId = patientId.toString();
                ivgInvoice.timestamp = new Date();
                ivgInvoice.activities = allActivities.activities;
            } );

            after( function() {
                this.needleStub.restore();
            } );

            it( 'Save invoice', async function() {
                this.needleStub.yields( null, mockResponse );
                await fsmStateChangePromise( user, {}, ivgInvoice, false, Y.doccirrus.fsm[fsmName].validate );
                expect( ivgInvoice.status ).to.be.equal( 'VALID' );
            } );
            it( 'Generate Invoice', async function() {
                this.timeout( 7000 );
                this.needleStub.yields( null, mockResponse );
                result = await generateDocumentsPromise( {user, invoice: ivgInvoice} );
                should.exist( result.fullUrl );
            } );
            it( 'Check invoice inSuite price field', async function() {
                result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        _id: ivgInvoice._id
                    }
                } );
                checkPrices( result[0], correctPrice );
            } );
        } );
    } );

    describe( 'Check REVOKEWARN (Mahnstop) functionality', function() {
        const
            {schein, treatments} = require( '../tarmedInvoices/invoice-api-test-3.testdata' );

        let
            allActivities = [],
            invoice = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/invoiceRef_REMINDED.json`, 'utf8' ) );
        invoice.actType = 'INVOICEREF';     //to skip unnecessary sumex validations

        before( async function() {
            this.timeout( 5000 );
            this.invoiceId = new mongoose.Types.ObjectId();
            allActivities = await prepareActivityData( schein, treatments, 'TARMED', {
                locationId, caseFolderId, employeeId, patientId
            }, {
                medicalScalingFactor: 0.93,
                technicalScalingFactor: 1,
                taxPointValue: 0.83
            } );
        } );

        beforeEach(async function (  ) {
            invoice._id = this.invoiceId;
            invoice.status = 'BILLED';
            invoice.locationId = new mongoose.Types.ObjectId( locationId );
            invoice.caseFolderId = caseFolderId.toString();
            invoice.employeeId = employeeId.toString();
            invoice.patientId = patientId.toString();
            invoice.timestamp = new Date();
            invoice.activities = allActivities.activities;
            await postEntry( 'activity', invoice );
            invoice.onHold = true;
            invoice.onHoldNotes = 'reason';
            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].validate );
            } catch( error ) {
                should.not.exist( error );
            }
        });

        afterEach( async function() {
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'delete',
                query: {
                    _id: this.invoiceId
                }
            } );
        } );

        it( 'Should change status to ONHOLD', async function() {
            result = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    _id: invoice._id
                }
            } );
            expect( result[0].status ).to.be.equal( 'REVOKEWARN' );
        } );

        it( 'Should not be possible to remind or warn', async function() {
            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].remind );
            } catch( error ) {
                should.exist( error );
            }
            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].warn1 );
            } catch( error ) {
                should.exist( error );
            }
        } );

        it( 'Should restore status which was before putting on hold', async function() {
            invoice.onHold = false;

            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].validate );
            } catch( error ) {
                should.not.exist( error );
            }
            result = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    _id: invoice._id
                }
            } );
            expect( result[0].status ).to.be.equal( 'BILLED' );
        } );

        it( 'Should not be possible to remind or warn billed invoice when schein is on hold', async function() {
            invoice.onHold = false;
            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].validate );
            } catch( error ) {
                should.not.exist( error );
            }
            expect( result[0].status ).to.be.equal( 'BILLED' );
            schein.onHold = true;
            schein.onHoldNotes = 'schein on hold';
            const schienFsm = Y.doccirrus.schemas.activity.getFSMName( schein.actType );

            await fsmStateChangePromise( user, {}, schein, false, Y.doccirrus.fsm[schienFsm].validate );

            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].remind );
            } catch( e ) {
                should.exist(e);
            }
            try {
                await fsmStateChangePromise( user, {}, invoice, false, Y.doccirrus.fsm[fsmName].warn1 );
            } catch( e ) {
                should.exist(e);
            }
        } );
    } );

    describe( 'Test api.invoice.invoiceToInvoiceentry', function() {
        let {schein, treatments, diagnoses} = require( '../tarmedInvoices/invoice-api-test-3.testdata' ),
            invoice = {
                actType: 'INVOICE',
                timestamp: new Date()
            },
        myScheinId = new mongoose.Types.ObjectId(),
        mySchein = {...schein, _id: myScheinId, timestamp: new Date( /*Date.now() - 86400000*/ )},
        myTreatments = treatments.map( t => {
            return {
                ...t,
                timestamp: new Date( /*Date.now() - 8000000*/ )
            };
        } ),
        myDiagnoses = diagnoses.map( d => {
            return {
                ...d,
                timestamp: new Date( /*Date.now() - 8000000*/ )
            };
        } );

        let allActivities = [];
        
        before( async function() {
            this.timeout( 5000 );
            this.invoiceId = new mongoose.Types.ObjectId();

            allActivities = await prepareActivityData( mySchein, myTreatments.concat( myDiagnoses ), 'TARMED', {
                locationId, caseFolderId, employeeId, patientId
            }, {
                medicalScalingFactor: 0.93,
                technicalScalingFactor: 1,
                taxPointValue: 0.83
            } );

            await putEntry( 'activity', mySchein, {continuousIcds: allActivities.diagnoses} );

            invoice.locationId = new mongoose.Types.ObjectId( locationId );
            invoice.caseFolderId = caseFolderId.toString();
            invoice.employeeId = employeeId.toString();
            invoice.patientId = patientId.toString();
            invoice.timestamp = new Date();
            invoice.activities = allActivities.activities;
        } );

        it('Check if continuousDiagnosis would be included into casefolder invoice', async function (  ) {
            const invoiceEntry = await Y.doccirrus.api.invoice.invoiceToInvoiceEntry({
                user,
                invoice
            });
            let billingDiagnosis = myDiagnoses.find( d => d.diagnosisTreatmentRelevance === "TREATMENT_RELEVANT" );
            expect( invoiceEntry.data.continuousDiagnoses.length ).to.be.equal( 1 );
            expect( invoiceEntry.data.continuousDiagnoses[0].comment ).to.to.be.equal( billingDiagnosis.comment );
        });
    } );

} );