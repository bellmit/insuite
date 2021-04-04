import sinon from "sinon";
import core from "dc-core";
import path from "path";
import mongoose from "mongoose";

/**
 * User: nicolas.pettican
 * Date: 25.03.21  09:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

describe( 'appLicenseSerials-api', function() {
    const
        fixtures = {
            mockedCompanies: [
                {systemId: 'system1', licenseScope: [{solutions: ['appName1']}]},
                {systemId: 'system2', licenseScope: [{solutions: ['appName1', 'appName2']}]}
            ],
            mockedAppLicenseSerialsToken: '0596517742',
            wrongMockedAppLicenseSerialsToken: 'WRONG_0596517742',
            mockedCorrectResponse: {
                appName1: ['system1', 'system2'],
                appName2: ['system2']
            }
        },
        self = this;
    let
        coreStub,
        isDCPRCStub,
        runDbStub,
        adminId;

    beforeEach( async function() {
        /* TODO: temporary, needs to be changed in the future */
        coreStub = sinon.stub( core.config, 'load' )
            .callsFake( ( file ) => ( {
                env: {
                    // required by dcauth
                    directories: {
                        tmp: 'foo'
                    },
                    // required by
                    binutils: {}
                },
                db: {
                    mongoDb: {}
                },
                email: {}
            }[path.parse( file ).name] ) );

        await import( './appLicenseSerials-api.server.yui' );

        Y.doccirrus.i18n = sinon.stub().callsFake( ( key ) => key );

        // if we try to load directly or indirectly `dcmongodb` it crashes so for now we create the namespace manually
        const namespace = Y.namespace( 'doccirrus.mongodb' );
        // which also includes to create a dummy method
        namespace.runDb = async () => false;

        this.now = new Date();
        self.stubs = [coreStub];

        adminId = Y.doccirrus.schemas.admin.getDCPRCAppLicenseSerialsId();
    } );

    afterEach( function() {
        self.stubs.forEach( ( stub ) => stub.restore() );

        Y = null;

        for( const model of Object.keys( mongoose.connection.models ) ) {
            delete mongoose.connection.models[model];
        }
    } );

    describe( 'appLicenseSerials.get', function() {

        beforeEach( function() {
            runDbStub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );

            runDbStub.withArgs( sinon.match( {
                action: 'get',
                model: 'company'
            } ) ).resolves( fixtures.mockedCompanies );

            runDbStub.withArgs( sinon.match( {
                action: 'count',
                model: 'admin',
                query: {
                    _id: adminId,
                    appLicenseSerialsToken: fixtures.mockedAppLicenseSerialsToken
                }
            } ) ).resolves( 1 );

            runDbStub.withArgs( sinon.match( {
                action: 'count',
                model: 'admin',
                query: {
                    _id: adminId,
                    appLicenseSerialsToken: fixtures.wrongMockedAppLicenseSerialsToken
                }
            } ) ).resolves( 0 );

            self.stubs.push( runDbStub );
        } );

        context( 'given the correct token and to the correct system type', function() {

            beforeEach( async function() {
                isDCPRCStub = sinon.stub( Y.doccirrus.auth, 'isDCPRC' );
                isDCPRCStub.returns( true );
                self.stubs.push( isDCPRCStub );
            } );

            it( 'should return object with key:value -> appName:[systemId]', async function() {
                const result = await Y.doccirrus.api.appLicenseSerials.get( {
                    query: {token: fixtures.mockedAppLicenseSerialsToken}
                } );
                expect( result ).to.be.an( 'object' );
                expect( result ).to.deep.equal( fixtures.mockedCorrectResponse );
            } );

        } );

        context( 'given the correct token and to the incorrect system type', function() {

            beforeEach( async function() {
                isDCPRCStub = sinon.stub( Y.doccirrus.auth, 'isDCPRC' );
                isDCPRCStub.returns( false );
                self.stubs.push( isDCPRCStub );
            } );

            it( 'should return an empty array', async function() {
                const result = await Y.doccirrus.api.appLicenseSerials.get( {
                    query: {token: fixtures.mockedAppLicenseSerialsToken}
                } );
                expect( result ).to.be.an( 'array' );
                expect( result ).to.be.an( 'array' ).that.has.lengthOf( 0 );
            } );
        } );

        context( 'given the wrong token and to the correct system type', function() {

            beforeEach( async function() {
                isDCPRCStub = sinon.stub( Y.doccirrus.auth, 'isDCPRC' );
                isDCPRCStub.returns( true );
                self.stubs.push( isDCPRCStub );
            } );

            it( 'should reject the call with error 403', async function() {
                await expect( Y.doccirrus.api.appLicenseSerials.get( {
                    query: {token: fixtures.wrongMockedAppLicenseSerialsToken}
                } ) ).to.be.rejected.and.eventually.include( {code: 403} );
            } );
        } );
    } );
} );
