/**
 * User: dcdev
 * Date: 4/2/20  5:30 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global Y, it, describe, before, after, should, expect */
const
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    mongoose = require( 'mongoose' ),
    user = Y.doccirrus.auth.getSUForLocal(),
    {appCurrentPort} = Y.doccirrus.sumexUtils.getStaticSumexIpAndPort(),
    fs = require( 'fs' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB );

async function postEntry( model, entry ) {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        action: 'post',
        data: {...entry, skipcheck_: true}
    } );
}

async function waitForUpdatedActivities( self, timeToWait = 4000 ) {
    self.timeout( self.timeout() + timeToWait );
    await new Promise( function( resolve ) {
        setTimeout( resolve, timeToWait );
    } );
}

describe( 'warning-api', function() {
    const
        patientId = new mongoose.Types.ObjectId().toString(),
        caseFolderId = new mongoose.Types.ObjectId().toString(),
        employeeId = new mongoose.Types.ObjectId().toString(),
        locationId = new mongoose.Types.ObjectId().toString();

    let oldCountryMode;

    before( async function() {
        await cleanDb( {user, collections2clean: ['activity', 'casefolder', 'patient', 'location', 'employee']} );

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

        oldCountryMode = Y.config.doccirrus.Env.countryMode;
        Y.config.doccirrus.Env.countryMode = ['CH'];

        const sumexAppreg = {
            "hasAccess": true,
            "appName": "sumex",
            "appCurrentPort": appCurrentPort,
            "appHostType": "LOCAL",
            "title": "Sumex"
        };
        let locationData = mochaUtils.getLocationData( {
                _id: locationId,
                countryMode: 'CH',
                countryCode: 'CH',
                zip: 1210,
                cantonCode: '3',
                bankIBAN: '01-162-8',
                esrNumber: '010001628'
            } ),
            employeeData = mochaUtils.getEmployeeData( {_id: employeeId, countryMode: 'CH'} ),
            patientData = mochaUtils.getPatientData( {_id: patientId, countryMode: 'CH', cantonCode: '3'} ),
            caseFolderData = mochaUtils.getCaseFolderData( {
                type: 'PRIVATE_CH',
                patientId: patientId.toString(),
                _id: caseFolderId,
                countryMode: 'CH'
            } );

        await postEntry( 'location', Y.doccirrus.filters.cleanDbObject( locationData ) );
        await postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( employeeData ) );
        await postEntry( 'patient', Y.doccirrus.filters.cleanDbObject( patientData ) );
        await postEntry( 'casefolder', Y.doccirrus.filters.cleanDbObject( caseFolderData ) );
        await postEntry( 'appreg', Y.doccirrus.filters.cleanDbObject( sumexAppreg ) );
    } );
    after( async function() {
        await cleanDb( {user, collections2clean: ['activity', 'casefolder', 'patient', 'location', 'employee']} );

        Y.config.doccirrus.Env.countryMode = oldCountryMode || ['D'];
    } );

    describe( 'api.warning.generateSumexDocuments', function() {
        const invoiceId = new mongoose.Types.ObjectId().toString(),
            warningId = new mongoose.Types.ObjectId().toString(),
            generatePdfPromise = promisifyArgsCallback( Y.doccirrus.api.warning.generateSumexDocuments );

        let warning;
        it( 'Set up invoice', async function() {
            const invoice = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/invoiceRef_REMINDED.json`, 'utf8' ) );

            invoice._id = invoiceId;
            invoice.locationId = locationId;
            invoice.patientId = patientId;
            invoice.employeeId = employeeId;
            invoice.caseFolderId = caseFolderId;

            await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( invoice ) );

            warning = JSON.parse( fs.readFileSync( `${__dirname}/../tarmedInvoices/warning1.json`, 'utf8' ) );
            warning._id = warningId;
            warning.locationId = locationId;
            warning.patientId = patientId;
            warning.employeeId = employeeId;
            warning.caseFolderId = caseFolderId;
            warning.referencedBy = [invoiceId];

            await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( warning ) );
        } );
        it( 'should fail because invoice has no XML', async function() {
            try {
                await generatePdfPromise( {user, originalParams: {warning}} );
            } catch( error ) {
                should.exist( error );
            }
        } );
        it( 'add xml document to invoice', async function() {
            const xml = fs.readFileSync( `${__dirname}/../tarmedInvoices/invoiceRef_REMINDED.xml` );
            let xmlDoc = await Y.doccirrus.tarmedInvoices.createDocumentFromFile( {
                user,
                ownerId: invoiceId,
                fileName: `invoiceRef_REMINDED.xml`,
                fileType: 'xml',
                file: xml
            } );
            const attachments = [xmlDoc.document._id];
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'put',
                model: 'activity',
                query: {
                    _id: invoiceId
                },
                fields: ['attachments'],
                data: {attachments, skipcheck_: true}
            } );
            await waitForUpdatedActivities( this, 1000 );
        } );
        it( 'should generate Sumex documents', async function() {
            this.skip();
            this.timeout( 5000 );
            try {
                await generatePdfPromise( {user, originalParams: {warning}} );
            } catch( e ) {
                should.not.exist( e );
            }
        } );
        it( 'should match mocked xml', async function() {
            this.skip();
            const mockedXml = fs.readFileSync( `${__dirname}/../tarmedInvoices/warning1.xml`, 'utf8' );
            let result = await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'activity',
                query: {_id: warningId}
            } );
            warning = result[0];
            result = await Y.doccirrus.api.sumex.getXmlFromInvoice( {
                user, invoice: warning, warningId
            } );
            expect( mockedXml ).to.be.equal( result );
        } );
    } );
} );