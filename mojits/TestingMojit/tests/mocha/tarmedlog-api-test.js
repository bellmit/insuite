/**
 * User: dcdev
 * Date: 11/7/19  2:11 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, describe, it, should, expect, before, beforeEach, after, afterEach*/
const
    sinon = require( 'sinon' ),
    moment = require( 'moment' ),
    needle = require( 'needle' ),
    mongoose = require( 'mongoose' ),
    util = require( 'util' ),
    fs = require( 'fs' ),
    _ = require( 'lodash' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    {appCurrentPort} = Y.doccirrus.sumexUtils.getStaticSumexIpAndPort(),
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

function putEntry( model, entryId, data ) {
    return Y.doccirrus.mongodb.runDb( {
        user,
        action: 'put',
        model: model,
        query: {
            _id: entryId
        },
        fields: Object.keys( data ),
        data: {...data, skipcheck_: true}
    } );
}

async function waitForTarmedlogUpdate( self, timeToWait = 4000 ) {
    self.timeout( self.timeout() + timeToWait );
    await new Promise( ( resolve ) => {
        setTimeout( resolve, timeToWait );
    } );
}

async function cleanCollections() {
    await cleanDb( {
        user,
        collections2clean: ['activity', 'casefolder', 'patient', 'location', 'employee', 'catalog']
    } );
}

describe( 'tarmedlog-api', function() {

    let countryMode, tarmedlog;

    before( async function() {
        this.timeout( 10000 );
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

        sinon.restore();

        await cleanCollections();

        this.patientId = new mongoose.Types.ObjectId().toString();
        this.caseFolderId = new mongoose.Types.ObjectId().toString();
        this.employeeId = new mongoose.Types.ObjectId().toString();
        this.locationId = new mongoose.Types.ObjectId().toString();

        const
            catalogTreatments = require( `../catalogData/tarmedCatalogTreatments` ),
            qualiCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'TARMED_DIGNI_QUALI'
            } ), tarmedCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'TARMED'
            } ), tarmedUvgCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'TARMED_UVG_IVG_MVG'
            } ),
            catalogQualiDignities = require( `../catalogData/qualiDignities` ).map( qd => {
                return {...qd, catalog: qualiCatalogDescriptor.fileName};
            } );
        await postEntry( 'catalog', catalogQualiDignities );
        for( let catalogTreatment of catalogTreatments ) {
            await postEntry( 'catalog', Y.doccirrus.filters.cleanDbObject( {
                ...catalogTreatment,
                catalog: catalogTreatment.catalogShort === 'TARMED_UVG_IVG_MVG' ? tarmedUvgCatalogDescriptor.filename : tarmedCatalogDescriptor.filename
            } ) );
        }
        await postEntry( 'location', Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
            _id: this.locationId,
            countryMode: 'CH',
            countryCode: 'CH',
            zip: 1210,
            cantonCode: '3',
            bankIBAN: '01-162-8',
            esrNumber: '010001628',
            zsrNumber: "T277419"
        } ) ) );
        await postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
            _id: this.employeeId,
            countryMode: 'CH',
            zsrNumber: 'T277489',
            locations: [
                {
                    _id: this.locationId,
                    locname: 'Location 1'
                }
            ]
        } ) ) );
        await postEntry( 'patient', Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
            _id: this.patientId,
            countryMode: 'CH',
            cantonCode: '3'
        } ) ) );
        await postEntry( 'casefolder', Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
            type: 'PRIVATE_CH',
            patientId: this.patientId.toString(),
            _id: this.caseFolderId,
            countryMode: 'CH'
        } ) ) );
        await postEntry( 'appreg', Y.doccirrus.filters.cleanDbObject( {
            "hasAccess": true,
            "appName": "sumex",
            "appCurrentPort": appCurrentPort || 9000,
            "appHostType": "LOCAL",
            "title": "Sumex"
        } ) );

        let
            schein = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/schein.json`, 'utf8' ) ),
            treatment = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/tarmed_0510_treatment.json`, 'utf8' ) ),
            medication = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/medication.json`, 'utf8' ) ),
            diagnosis = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/diagnosis.json`, 'utf8' ) );

        const timestamp = moment( new Date() );
        schein = Object.assign( {
            patientId: this.patientId,
            caseFolderId: this.caseFolderId,
            locationId: this.locationId,
            employeeId: this.employeeId,
            timestamp
        }, schein );
        treatment = Object.assign( {
            patientId: this.patientId,
            caseFolderId: this.caseFolderId,
            locationId: this.locationId,
            employeeId: this.employeeId,
            timestamp
        }, treatment );
        medication = Object.assign( {
            patientId: this.patientId,
            caseFolderId: this.caseFolderId,
            locationId: this.locationId,
            employeeId: this.employeeId,
            timestamp
        }, medication );
        diagnosis = Object.assign( {
            patientId: this.patientId,
            caseFolderId: this.caseFolderId,
            locationId: this.locationId,
            employeeId: this.employeeId,
            timestamp
        }, diagnosis );

        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( schein ) );
        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( treatment ) );
        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( medication ) );
        await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( diagnosis ) );

        this.location = await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'location',
            action: 'get',
            query: {_id: this.locationId},
            options: {
                lean: true
            }
        } );
        this.location = this.location[0];
    } );

    describe( 'Compare invoice json with valid one', function() {
        it( 'create tarmedlog', async function() {
            const mockedTarmedlog = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/tarmedlog.json`, 'utf8' ) ),
                today = new Date(),
                yesterday = new Date( Date.now() - 86400000 ),
                createLogSettings = {
                    billerEqualToProvider: true,
                    doNotcheckCatalog: false,
                    employees: [],
                    endDate: today.toISOString(),
                    insuranceTypes: ["SELFPAYER", "PRIVATE_CH", "PRIVATE_CH_UVG", "PRIVATE_CH_IVG", "PRIVATE_CH_MVG", "PRIVATE_CH_VVG"],
                    isTiersGarant: false,
                    isTiersPayant: true,
                    kvgSettingTitle: "Test1",
                    law: "KVG",
                    locations: [this.location],
                    minTotal: 0,
                    startDate: yesterday.toISOString(),
                    useEndDate: true,
                    useStartDate: true
                },
                createLogsPromise = promisifyArgsCallback( Y.doccirrus.api.tarmedlog.createLogs );

            mockedTarmedlog.startDate = yesterday;
            mockedTarmedlog.endDate = today;
            mockedTarmedlog.mainLocationId = this.locationId;

            const tarmedlogs = await createLogsPromise( {
                user,
                originalParams: {settings: createLogSettings}
            } );
            const result = await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'tarmedlog',
                query: {_id: tarmedlogs[0]},
                options: {
                    lean: true
                }
            } );
            tarmedlog = result[0];
            expect( _.omit( tarmedlog, ['created', 'lastUpdate', 'user', '_id'] ) ).to.deep.equalInAnyOrder( mockedTarmedlog );
        } );
    } );
    describe( 'validate', function() {
        const validatePromise = promisifyArgsCallback( Y.doccirrus.api.tarmedlog.validate );
        let needleStub;

        beforeEach( function() {
            needleStub = sinon.stub( needle, 'post' );
        } );
        afterEach( function() {
            needleStub.restore();
        } );

        it( 'should fail dc-insuite validation because no GLN, socialSecurityNo, qualitative Dignität', async function() {
            this.timeout( 5000 );
            needleStub.restore();

            await validatePromise( {
                user,
                originalParams: {id: tarmedlog._id, preValidation: true}
            } );
            await waitForTarmedlogUpdate( this );
            const result = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tarmedlog',
                query: {_id: tarmedlog._id}
            } );
            expect( result[0].output.length ).to.be.equal( 4 );
            expect( result[0].status ).to.be.equal( "INVALID" );
        } );
        describe( 'fix errors 1', function() {
            before( async function() {
                const qualiDignities = ["1200"],
                    errorResponse = JSON.parse( JSON.stringify( require( '../fixtures/sumex-response' ) ) ),
                    addServiceIndex = errorResponse.body.operations.indexOf(
                        errorResponse.body.operations.find( o =>
                            Object.keys( o ).includes( 'AddServiceEx' )
                        )
                    );

                errorResponse.body.operations[addServiceIndex].commandStatus = false;
                errorResponse.body.operations[addServiceIndex].pbstrAbort = "error text";

                needleStub.yields( null, errorResponse );

                await putEntry( 'employee', this.employeeId, {
                    qualiDignities: qualiDignities,
                    glnNumber: '7601000164874'
                } );
                await putEntry( 'patient', this.patientId, {socialSecurityNo: '7569999999502'} );
                await validatePromise( {
                    user,
                    originalParams: {id: tarmedlog._id, preValidation: true}
                } );
            } );
            it( 'fix errors and validate again. should fail from error that comes from Sumex server', async function() {
                await waitForTarmedlogUpdate( this );
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tarmedlog',
                    query: {_id: tarmedlog._id}
                } );
                expect( result[0].output.length ).to.be.equal( 1 );
                expect( result[0].status ).to.be.equal( "INVALID" );
            } );
        } );
        describe( 'fix errors 2', function() {
            before( async function() {
                //something resets the countryMode!
                Y.config.doccirrus.Env.countryMode = ['CH'];
                needleStub.yields( null, require( '../fixtures/sumex-response' ) );

                await putEntry( 'employee', this.employeeId, {qualiDignities: ['5000', '9900', '1100']} );
                await putEntry( 'location', this.locationId, {glnNumber: '7601002135825'} );
            } );

            it( 'fix errors and validate again. should succeed', async function() {
                await validatePromise( {
                    user,
                    originalParams: {id: tarmedlog._id, preValidation: true}
                } );
                await waitForTarmedlogUpdate( this, 10000 );

                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tarmedlog',
                    query: {_id: tarmedlog._id}
                } );
                expect( result[0].output.length ).to.be.equal( 0 );
                expect( result[0].status ).to.be.equal( "VALIDATING" );
            } );
        } );
    } );
    describe( 'generateInvoiceDocuments', function() {
        let invoiceRef;
        let getSumexSolPortStub;
        let needleStub;

        before( function() {
            user.specifiedBy = this.employeeId;
        } );
        after( function() {
            user.specifiedBy = undefined;
        } );

        beforeEach( function() {
            getSumexSolPortStub = sinon.stub( Y.doccirrus.sumexUtils, 'getSumexSolPort' );
            getSumexSolPortStub.resolves( null );

            needleStub = sinon.stub( needle, 'post' );
        } );
        afterEach( function() {
            getSumexSolPortStub.restore();
            needleStub.restore();
        } );

        it( 'valid tarmedlog should generate documents with no errors, invoicedocs should be attached to tarmedlog', async function() {
            this.timeout( 8000 );
            needleStub.yields( null, require( '../fixtures/sumex-response' ) );

            await Y.doccirrus.api.tarmedlog.generateInvoices( {
                user,
                originalParams: {id: tarmedlog._id},
                callback: function() {
                }
            } );

            // await waitForTarmedlogUpdate( this, 6000 );

            const result = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tarmedlog',
                action: 'get',
                query: {_id: tarmedlog._id},
                options: {
                    lean: true
                }
            } );

            const resultTarmedlog = result[0];
            // This check may sometimes fail because tarmedlog is updated after callback execution.
            // Can be fixed by increasing timeout of waitForTarmedlogUpdate()
            should.exist( resultTarmedlog.invoiceDocs[0] );
            should.exist( resultTarmedlog.invoiceDocs[0].copyPdf );
            should.exist( resultTarmedlog.pdfFile );
        } );
        it( 'check INVOICEREF XML', async function() {
            const result = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'get',
                query: {
                    kvglogId: tarmedlog._id.toString(),
                    actType: 'INVOICEREF'
                },
                options: {
                    lean: true
                }
            } );
            invoiceRef = result[0];
            const xml = await Y.doccirrus.api.sumex.getXmlFromInvoice( {
                user, invoice: invoiceRef, warningId: invoiceRef && invoiceRef._id
            } );
            //unable to compare xml, because timestamp is always different
            expect( xml.length ).to.be.equal( 5146 );
        } );
        it( 'invoiceRef should have copy PDF, because schein.docPrinted = true', async function() {
            const pdfs = invoiceRef && invoiceRef.attachedMedia.filter( item => 'PDF' === item.caption && item.mediaId );
            const result = await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'media',
                query: {_id: {$in: pdfs}},
                options: {
                    lean: true
                }
            } );
            const copyPdf = result.filter( media => media.name.endsWith( '-copy' ) || media.name.endsWith( '-copy.pdf' ) );
            should.exist( copyPdf );
        } );
    } );

    after( async function() {
        Y.config.doccirrus.Env.countryMode = countryMode || ['D'];

        sinon.restore();

        await cleanCollections();
    } );
} );