/**
 * User: sabine.gottfried
 * Date: 03.03.21  14:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global Y, before, after, it, describe, should, context */

const
    fs = require( 'fs' ),
    path = require( 'path' ),
    sinon = require( 'sinon' ),
    flow1 = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/flow-api/json/flow1.json` ) ),
    flow2 = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/flow-api/json/flow1.json` ) ),
    hl7FilesPath = `${__dirname}/../fixtures/lab-api/hl7/`,
    testDir = `${__dirname}/../fixtures/flow-api/json/`,
    hl7Files = [
        'hl7Example'
    ],
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    util = require( 'util' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal();

async function postEntry( model, action, data ) {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        action: action,
        data: Y.doccirrus.filters.cleanDbObject( data )
    } );
}

describe( 'flow-api tests', function() {
    context( 'Given two flows', async function() {
        before( async function beforeFlowApiTest() {
            this.timeout( 5000 );
            this.fileName = hl7Files[0];
            flow1.sources[0].filePath = testDir;
            flow2.sources[0].filePath = hl7FilesPath;
            this.pathHL7File = path.resolve( `${hl7FilesPath}${this.fileName}.hl7` );
            this.resultFlow1 = await postEntry( 'flow', 'post', flow1 );
            this.resultFlow2 = await postEntry( 'flow', 'post', flow2 );
            this.file = fs.readFileSync( this.pathHL7File );
            this.execute = promisifyArgsCallback( Y.doccirrus.api.flow.execute );
        } );

        after( async function() {
            this.timeout( 5000 );
            await cleanDb( {
                user: user,
                collections2clean: [
                    'flow'
                ]
            } );
        } );

        describe( 'executing a correctly setup flow ', function() {
            it( `should pass without errors`, async function() {
                await this.execute( {
                    user: user,
                    query: {flowType: flow1.flowType},
                    data: flow1
                } );
            } );
        } );

        describe( 'execute() should return a result with an error, when an error is thrown in the flows transformer', function() {
            it( `should return response with a "Test Error"`, async function( ) {
                this.stub = sinon.stub( Y.doccirrus.api.flow_sources, 'FILE' );
                this.stub.callsFake( ( config, data, user, callback ) => {
                    const res = {
                        data: this.file,
                        path: hl7FilesPath,
                        deviceServer: "Device Server",
                        basePath: hl7FilesPath
                    };
                    callback( null, res );
                } );
                this.transformerStub = sinon.stub( Y.doccirrus.api.flow_transformers, 'HL7_LDT_JSON' );
                this.transformerStub.throws( "Test Error" );
                const res = await this.execute( {
                    user: user,
                    query: {flowType: flow2.flowType},
                    data: flow2
                });

                should.exist( res );
                should.exist( res[0].error );
                should.exist( res[0].error.data );
                const regex = new RegExp( 'Test Error' );
                const testResult = regex.test( res[0].error.data );
                testResult.should.equal( true );
            } );
        } );
    } );
} );