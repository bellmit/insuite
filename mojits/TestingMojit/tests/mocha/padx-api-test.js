/**
 * User: md
 * Date: 29/12/2020  19:00
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, before, after,it, describe, expect*/

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    fs = require( 'fs' ),
    util = require( 'util' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'padX api testing', function() {
    describe( 'createXMLs', function() {
        const
            suiteData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/padx/participant-settings.json`, 'utf8' ) ),
            [ employeeId ] = mochaUtils.getObjectIds(),
            employeeData = mochaUtils.getEmployeeData( {
                _id: employeeId
            } );

        let forEachInvoiceEntry_Org;

        before( async function(){
            this.timeout( 10000 );
            await cleanDb( {user} );

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'employee',
                action: 'post',
                data: {
                    ...employeeData,
                    skipcheck_: true
                }
            } );

            forEachInvoiceEntry_Org = Y.doccirrus.invoiceprocess.forEachInvoiceEntry;
            Y.doccirrus.invoiceprocess.forEachInvoiceEntry = async function( params ){
                let { iterator } = params;
                let entries = suiteData.invoiceEntries.map( entry => {
                    if( entry.data && entry.data.employeeId ){
                        entry.data.employeeId = employeeId;
                    }
                    return entry;
                } );

                for( let entryData of entries ){
                    iterator( entryData );
                }
            };

            suiteData.expectedResults.percent.auftragsXML = suiteData.expectedResults.percent.auftragsXML.replace( /4\.17\.0/g, Y.config.insuite.version );
            suiteData.expectedResults.total.auftragsXML = suiteData.expectedResults.total.auftragsXML.replace( /4\.17\.0/g, Y.config.insuite.version );
        } );

        after( function(){
            Y.doccirrus.invoiceprocess.forEachInvoiceEntry = forEachInvoiceEntry_Org;
        });


        describe( 'validate processing of participant settings', function() {

            it( 'should return generated XMLs with participant type percent', async function() {
                let [err, result] = await formatPromiseResult( Y.doccirrus.api.padx.createXMLs( {
                    ...suiteData.baseConfig,
                    participantValue: 33.3,
                    participantValueType: 'percent'
                }, { user } ) );

                should.not.exist( err );

                //change generated data to same values
                result.nutzdatenXML = result.nutzdatenXML.replace( /aisid=".+?"/gm, 'aisid="SomeIdHere"' );
                result.auftragsXML = result.auftragsXML.replace( /pruefsumme=".+?"/gm, 'pruefsumme="someHashHere"' );

                expect( result.nutzdatenXML ).to.be.equal( suiteData.expectedResults.percent.nutzdatenXML );
                expect( result.auftragsXML ).to.be.equal( suiteData.expectedResults.percent.auftragsXML );
            } );

            it( 'should return generated XMLs with participant type total', async function() {
                let [err, result] = await formatPromiseResult( Y.doccirrus.api.padx.createXMLs( {
                    ...suiteData.baseConfig,
                    participantValue: 25.1,
                    participantValueType: 'total'
                }, {user} ) );

                should.not.exist( err );

                //change generated data to same values
                result.nutzdatenXML = result.nutzdatenXML.replace( /aisid=".+?"/gm, 'aisid="SomeIdHere"' );
                result.auftragsXML = result.auftragsXML.replace( /pruefsumme=".+?"/gm, 'pruefsumme="someHashHere"' );

                expect( result.nutzdatenXML ).to.be.equal( suiteData.expectedResults.total.nutzdatenXML );
                expect( result.auftragsXML ).to.be.equal( suiteData.expectedResults.total.auftragsXML );
            } );
        } );

        describe( 'validate AIS related settingss', function() {
            it( 'should include both aisrechnungsnr and aisendbetrag', async function() {
                let [err, result] = await formatPromiseResult( Y.doccirrus.api.padx.createXMLs( {
                    ...suiteData.baseConfig,
                    AISInvoiceNumber : true,
                    AISAmount : true
                }, {user} ) );

                should.not.exist( err );
                expect( result.nutzdatenXML ).contains( 'aisrechnungsnr' ).and.contains( 'aisendbetrag' );
            } );
            it( 'should include only aisrechnungsnr but not aisendbetrag', async function() {
                let [err, result] = await formatPromiseResult( Y.doccirrus.api.padx.createXMLs( {
                    ...suiteData.baseConfig,
                    AISInvoiceNumber : true,
                    AISAmount : false
                }, {user} ) );

                should.not.exist( err );
                expect( result.nutzdatenXML ).contains( 'aisrechnungsnr' ).and.not.contains( 'aisendbetrag' );
            } );
            it( 'should not include aisrechnungsnr but include aisendbetrag', async function() {
                let [err, result] = await formatPromiseResult( Y.doccirrus.api.padx.createXMLs( {
                    ...suiteData.baseConfig,
                    AISInvoiceNumber : false,
                    AISAmount : true
                }, {user} ) );

                should.not.exist( err );
                expect( result.nutzdatenXML ).contains( 'aisendbetrag' ).and.not.contains( 'aisrechnungsnr' );
            } );
            it( 'should not include neither aisrechnungsnr nor aisendbetrag', async function() {
                let [err, result] = await formatPromiseResult( Y.doccirrus.api.padx.createXMLs( {
                    ...suiteData.baseConfig,
                    AISInvoiceNumber : false,
                    AISAmount : false
                }, {user} ) );

                should.not.exist( err );
                expect( result.nutzdatenXML ).not.contains( 'aisendbetrag' ).and.contains( 'aisrechnungsnr' );
            } );
        } );
    } );
} );



