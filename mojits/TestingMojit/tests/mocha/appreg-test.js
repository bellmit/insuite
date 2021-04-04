/**
 * User: pi
 * Date: 24/06/2015  15:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, before, after, beforeEach, afterEach */

const
    sinon = require( 'sinon' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    appUtils = Y.doccirrus.appUtils,
    DB = require( 'dc-core' ).db,
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal(),

    DEFAULT_TIMEOUT = 5000,
    LONG_TIMEOUT = 10000,

    defaultAppReg = {
        appName: 'batsol',
        appVersion: "0.0.5"
    },
    defaultAppTokenEntry = {
        appName: 'batsol',
        title: 'BatSol',
        description: 'BatSol description',
        token: 'batsol.token',
        type: 'LOCAL'
    };

//clean up previous stubs/spys as cautionary measure
before( function() {
    sinon.restore();
} );

/**
 * covers app token sync functionality, api's to give/deny app access
 */
describe( 'AppReg test', function() {
    const
        appReg1 = {...defaultAppReg},
        appToken1 = {...defaultAppTokenEntry};

    describe( '0. Setup.', function() {
        it( 'Cleans db', function( done ) {
            this.timeout( LONG_TIMEOUT );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Inserts practice', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'practice',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true
                }, mochaUtils.getPracticeData() )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
    } );
    describe( '1. Test app reg get populated', function() {

        it( 'writes app reg', function( done ) {
            Y.doccirrus.api.appreg.updateAppRegs( {
                user,
                appTokens: [appToken1]
            }, ( err ) => {
                setImmediate( () => {
                    should.not.exist( err );
                    done();
                } );
            } );
        } );

        it( 'sets token for app', async function() {
            await Y.doccirrus.api.appreg.setSecretsForApps( {
                appTokens: [
                    appToken1
                ], user
            } );
        } );

        it( 'appreg entry should contain tokens', async function() {
            const appreg = await Y.doccirrus.api.appreg.getSecretForApp( {
                appName: appReg1.appName,
                user
            } );

            appreg.should.include.all.keys( ['inSuiteToken', 'solToken', 'hasAccess', 'appName'] );
        } );

        it( 'get populated app reg entry', function() {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.appreg.getPopulated( {
                    user,
                    query: {
                        appName: appReg1.appName
                    },
                    callback( err, results ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( results );
                    }
                } );
            } )
                .should.be.fulfilled
                .then( results => {
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    results[0].appName = appReg1.appName;
                    results[0].hasAccess = false;
                    results[0].title = appToken1.title;
                    results[0].type = appToken1.type;
                    results[0].description = appToken1.description;
                    appReg1.solToken = results[0].solToken;
                } );
        } );
    } );

    describe( '2. Test app giveAccess', function() {
        const
            onWriteConfigFile = [],
            onExecuteEnableCommand = [],
            onExecuteRestartCommand = [],
            onExecuteDisableCommand = [],
            solsConfig = Y.doccirrus.api.appreg._getSolsConfig();
        let
            appRegEntry;
        before( function() {
            Y.doccirrus.api.appreg.event.on( 'onWriteConfigFile', ( params ) => {
                onWriteConfigFile.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteEnableCommand', ( params ) => {
                onExecuteEnableCommand.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteRestartCommand', ( params ) => {
                onExecuteRestartCommand.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteDisableCommand', ( params ) => {
                onExecuteDisableCommand.push( params );
            } );
        } );
        after( function() {
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onWriteConfigFile' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteEnableCommand' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteRestartCommand' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteDisableCommand' );
        } );
        it( 'gives access to app', async function() {
            this.timeout( DEFAULT_TIMEOUT );
            const [error] = await formatPromiseResult(
                Y.doccirrus.api.appreg.giveAccess( {
                    user,
                    query: {
                        appName: appReg1.appName
                    }
                } )
            );
            should.not.exist( error );
        } );
        it( 'check app reg entry', function() {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.appreg.get( {
                    query: {
                        appName: appReg1.appName
                    },
                    callback( err, results ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( results );
                    }
                } );
            } )
                .should.be.fulfilled
                .then( results => {
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    appRegEntry = results[0];
                } );
        } );
        it( 'checks appCurrentPort', function() {
            parseInt( appRegEntry.appCurrentPort, 10 ).should.be.within( solsConfig.minLocalPort, solsConfig.maxLocalPort );
        } );
        it( 'check db user', function() {
            this.timeout( DEFAULT_TIMEOUT );
            return new Promise( ( resolve, reject ) => {
                DB.getDbUser( {
                    userName: appReg1.appName,
                    dbName: appUtils.getAppDbName( appReg1.appName )
                }, ( err, results = [] ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( results );
                } );
            } )
                .should.be.fulfilled
                .then( results => {
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    results[0].user = appReg1.appName;
                    results[0].db = appUtils.getAppDbName( appReg1.appName );
                } );
        } );
        it( 'checks onExecuteDisableCommand', function() {
            onExecuteDisableCommand.should.have.lengthOf( 0 );
        } );
        it( 'checks onExecuteEnableCommand', function() {
            onExecuteEnableCommand.should.have.lengthOf( 0 );
        } );
        it( 'checks onWriteConfigFile', function() {
            let configStr = [
                `ISTOKEN=${appToken1.inSuiteToken}`,
                `SOLNAME=${appReg1.appName}`,
                `SOLPORT=${appRegEntry.appCurrentPort}`,
                `SOLURL=sol/${appReg1.appName}`,
                `ISHOST=${solsConfig.inSuiteHost}`,
                `ISPORT=${solsConfig.inSuitePort}`,
                `SOLTOKEN=${appReg1.solToken}`,
                `DBHOST=${solsConfig.mongoDBHost}`,
                `DBPORT=${solsConfig.mongoDBPort}`,
                `DBAUTH=admin`,
                `DBNAME=${appUtils.getAppDbName( appReg1.appName )}`
            ];

            if( !Y.doccirrus.auth.isDevServer() ) {
                onWriteConfigFile[0].configFileName.should.equal( appReg1.appName );

                configStr = [
                    ...configStr,
                    `DBUSER=${appReg1.appName}`,
                    `DBPASS=${appRegEntry.dbPassword}`
                ];
            }

            configStr = configStr.join( "\n" );

            onWriteConfigFile.should.have.lengthOf( 1 );
            onWriteConfigFile[0].configBaseDir.should.equal( solsConfig.configBaseDir );
            onWriteConfigFile[0].configString.should.equal( configStr );
        } );
        it( 'checks onExecuteRestartCommand', function() {
            if( Y.doccirrus.auth.isDevServer() ) {
                onExecuteRestartCommand.should.have.lengthOf( 0 );
                return;
            }
            onExecuteRestartCommand.should.have.lengthOf( 1 );
            onExecuteRestartCommand[0].appName.should.equal( appReg1.appName );
        } );
    } );
    describe( '3. Test app denyAccess', function() {
        const
            onWriteConfigFile = [],
            onExecuteEnableCommand = [],
            onExecuteRestartCommand = [],
            onExecuteDisableCommand = [];
        before( function() {
            Y.doccirrus.api.appreg.event.on( 'onWriteConfigFile', ( params ) => {
                onWriteConfigFile.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteEnableCommand', ( params ) => {
                onExecuteEnableCommand.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteRestartCommand', ( params ) => {
                onExecuteRestartCommand.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteDisableCommand', ( params ) => {
                onExecuteDisableCommand.push( params );
            } );
        } );
        after( function() {
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onWriteConfigFile' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteEnableCommand' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteRestartCommand' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteDisableCommand' );
        } );
        it( 'deny access to app', async function() {
            this.timeout( DEFAULT_TIMEOUT );
            const [error] = await formatPromiseResult(
                Y.doccirrus.api.appreg.denyAccess( {
                    user,
                    query: {
                        appName: appReg1.appName
                    }
                } )
            );

            should.not.exist( error );
        } );
        it( 'check app reg entry', function() {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.appreg.get( {
                    query: {
                        appName: appReg1.appName
                    },
                    callback( err, results ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( results );
                    }
                } );
            } )
                .should.be.fulfilled
                .then( results => {
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    should.not.exist( results[0].dbPassword );
                    should.not.exist( results[0].appCurrentPort );
                } );
        } );
        it( 'check db user', function() {
            return new Promise( ( resolve, reject ) => {
                DB.getDbUser( {
                    userName: appReg1.appName,
                    dbName: appUtils.getAppDbName( appReg1.appName )
                }, ( err, results = [] ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( results );
                } );
            } )
                .should.be.fulfilled
                .then( results => {
                    results.should.be.an( 'array' ).which.has.lengthOf( 0 );
                } );
        } );
        it( 'checks onExecuteEnableCommand', function() {
            onExecuteEnableCommand.should.have.lengthOf( 0 );
        } );
        it( 'checks onExecuteDisableCommand', function() {
            onExecuteDisableCommand.should.have.lengthOf( 1 );
            onExecuteDisableCommand[0].appName.should.equal( appReg1.appName );
        } );
        it( 'checks onWriteConfigFile', function() {
            onWriteConfigFile.should.have.lengthOf( 1 );
            onWriteConfigFile[0].deleteConfig.should.eql(true);
        } );
        it( 'checks onExecuteRestartCommand', function() {
            onExecuteRestartCommand.should.have.lengthOf( 0 );
        } );
    } );

    describe( '4. Test app registerWebHook', function() {
        const
            mockTargetUrl = '/mocha',
            mockTargetUrl2 = '/mocha2',
            correctWebHookConfig = {
                targetUrl: mockTargetUrl,
                type: Y.doccirrus.schemas.appreg.webHooksConfigurationTypes.MAIN
            },
            correctWebHookConfig2 = {
                targetUrl: mockTargetUrl2,
                type: Y.doccirrus.schemas.appreg.webHooksConfigurationTypes.MAIN
            },
            wrongWebHookConfig = {},
            correctMockParams = {
                user: {
                    U: defaultAppReg.appName
                },
                data: {
                    webHooksConfiguration: [correctWebHookConfig]
                }
            },
            correctMockParams2 = {
                user: {
                    U: defaultAppReg.appName
                },
                data: {
                    webHooksConfiguration: [
                        correctWebHookConfig,
                        correctWebHookConfig2
                    ]
                }
            },
            wrongMockParams = {
                ...correctMockParams,
                data: {
                    ...correctMockParams,
                    webHooksConfiguration: [wrongWebHookConfig]
                }
            };

        before( async function() {
            await Y.doccirrus.api.appreg.setSecretsForApps( {
                appTokens: [
                    defaultAppTokenEntry
                ],
                user
            } );
        } );

        it( 'should update the appreg db entry', async function() {
            this.timeout( LONG_TIMEOUT );

            await Y.doccirrus.api.appreg.registerWebHook( correctMockParams );

            const _appReg = await Y.doccirrus.api.appreg.get( {
                query: {
                    appName: defaultAppReg.appName
                }
            } );

            delete _appReg[0].webHooksConfiguration[0]._id;
            _appReg[0].webHooksConfiguration.should.have.lengthOf( 1 );
            _appReg[0].webHooksConfiguration[0].should.deep.equal( correctWebHookConfig );
            _appReg[0].webHooksConfiguration[0].targetUrl.should.equal( mockTargetUrl );
        } );

        it( 'should update the webHoosConfiguration in the appreg db entry', async function() {
            this.timeout( LONG_TIMEOUT );

            await Y.doccirrus.api.appreg.registerWebHook( correctMockParams2 );

            const _appReg = await Y.doccirrus.api.appreg.get( {
                query: {
                    appName: defaultAppReg.appName
                }
            } );

            _appReg[0].webHooksConfiguration.should.have.lengthOf( 2 );

            delete _appReg[0].webHooksConfiguration[1]._id;
            _appReg[0].webHooksConfiguration[1].should.deep.equal( correctWebHookConfig2 );
            _appReg[0].webHooksConfiguration[1].targetUrl.should.equal( mockTargetUrl2 );
            _appReg[0].webHooksConfiguration[1].type.should.equal( Y.doccirrus.schemas.appreg.webHooksConfigurationTypes.MAIN );
            _appReg[0].webHooksConfiguration[1].targetUrl.should.equal( mockTargetUrl2 );

        } );

        it( 'should have added the webHooksConfiguration to cache', async function() {
            const webHooksConfiguration = await Y.doccirrus.api.appreg.getWebHooksConfigFromCache( defaultAppReg.appName );

            webHooksConfiguration.should.have.lengthOf( 2 );
            webHooksConfiguration[1].targetUrl.should.equal( mockTargetUrl2 );
        } );

        it( `should fail because it's missing appName`, async function() {
            this.timeout( LONG_TIMEOUT );

            await Y.doccirrus.api.appreg.registerWebHook( {} ).should.be.rejected;
        } );

        it( `should fail because the webHook config is incorrect`, async function() {
            this.timeout( 100000 );

            await Y.doccirrus.api.appreg.registerWebHook( wrongMockParams ).should.be.rejected;
        } );
    } );

    describe( '5. Test FS functions', function() {
        const
            mockSolManifest = '# static values\nSOLNAME=BatSol\nSOLVENDOR=Wayne Industries\n# version is maintained inside config file\nSOLVERSION=0.0.6\nBASEIMAGE=doc-cirrus/sols-base-js\nBUILDIMAGE=doc-cirrus/sols-builder-js\n\n',
            readFile = async ( _path ) => {
                switch( _path ) {
                    case 'batsol/sol.manifest':
                        return mockSolManifest;
                    default:
                        return '';
                }
            };

        it( 'getDataFromSolManifest: should return the sol.manifest as object', async function() {
            const solManifest = await Y.doccirrus.api.appreg.getDataFromSolManifest( {solPath: 'batsol/', readFile} );

            solManifest.should.include.all.keys( ['SOLNAME', 'SOLVENDOR', 'SOLVERSION', 'BASEIMAGE', 'BUILDIMAGE'] );
        } );

        it( 'getSolVersionFromFS: should return the SOLVERSION in an object', async function() {
            const solVersion = await Y.doccirrus.api.appreg.getSolVersionFromFS( {solPath: 'batsol/', readFile} );

            solVersion.should.equal( '0.0.6' );
        } );
    } );

    describe( '6. Test removing unlicensed apps', function() {

        const
            onExecuteRemoveCommand = [],
            removeUnlicensedApps = Y.doccirrus.api.appreg.removeUnlicensedApps,
            appsWithAppReg = [
                {appName: 'csvexport', name: 'csvexport'},
                {appName: 'rescan', name: 'rescan'},
                {appName: 'klindo', name: 'klindo'},
                {appName: 'inreha', name: 'inreha'}
            ],
            appsInstalled = [...appsWithAppReg, {name: 'drflex'}, {name: 'hancken'}];
        let
            stubGetSolsListData, stubRunDb, appsToRemoveCount;

        before( function() {
            Y.doccirrus.api.appreg.event.on( 'onExecuteRemoveCommand', ( params ) => {
                onExecuteRemoveCommand.push( params );
            } );
        } );

        after( function() {
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteRemoveCommand' );
        } );

        beforeEach( function() {
            stubRunDb = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
            stubGetSolsListData = sinon.stub( Y.doccirrus.api.appreg, 'getSolsListData' );
        } );

        afterEach( function() {
            stubRunDb.restore();
            stubGetSolsListData.restore();
        } );

        it( 'should be called for each app that is installed but not licensed', async function() {

            stubRunDb.resolves( appsWithAppReg );
            stubGetSolsListData.resolves( appsInstalled );

            const result = await removeUnlicensedApps( {user: {}} );

            should.not.exist( result );

            // eslint-disable-next-line no-unused-expressions
            stubGetSolsListData.should.have.been.calledOnce;
            // eslint-disable-next-line no-unused-expressions
            stubRunDb.should.have.been.calledOnce;

            const appsToRemove = appsInstalled.filter( app => !appsWithAppReg.includes( app ) );
            const appsRemoved = onExecuteRemoveCommand.map( ( item ) => item.appName );
            appsToRemoveCount = appsToRemove.length;

            appsRemoved.length.should.equal( appsToRemove.length );
            onExecuteRemoveCommand.should.have.lengthOf( appsToRemoveCount );

            for( const app of appsToRemove ) {
                appsRemoved.should.include( app.name );
            }
        } );

        it( 'should throw an error if database can\'t be reached', async function() {

            stubRunDb.rejects();
            stubGetSolsListData.resolves( appsInstalled );

            await removeUnlicensedApps( {user: {}} ).should.be.rejected;

            onExecuteRemoveCommand.should.have.lengthOf( appsToRemoveCount );
        } );

        it( 'should not execute the removeCommand when the list of installed app contains no unlicensed app', async function() {

            stubRunDb.resolves( appsWithAppReg );
            stubGetSolsListData.resolves( [{appName: 'csvexport', name: 'csvexport'}] );

            const result = await removeUnlicensedApps( {user: {}} );

            should.not.exist( result );

            onExecuteRemoveCommand.should.have.lengthOf( appsToRemoveCount );
        } );

    } );

    describe( '7. Managing the versions of Sols', () => {
        const
            onWriteConfigFile = [],
            onExecuteRemoveCommand = [],
            onExecuteRestartCommand = [],
            onExecuteInstallCommand = [],
            onExecuteListUpdatesCommand = [],
            appReg = {...defaultAppReg, appHostType: 'LOCAL', hasAccess: true},
            appToken = {...defaultAppTokenEntry};
        let
            isDevStub;

        before( async function() {
            Y.doccirrus.api.appreg.event.on( 'onWriteConfigFile', ( params ) => {
                onWriteConfigFile.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteRemoveCommand', ( params ) => {
                onExecuteRemoveCommand.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteRestartCommand', ( params ) => {
                onExecuteRestartCommand.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteInstallCommand', ( params ) => {
                onExecuteInstallCommand.push( params );
            } );
            Y.doccirrus.api.appreg.event.on( 'onExecuteListUpdatesCommand', ( params ) => {
                onExecuteListUpdatesCommand.push( params );
            } );

            isDevStub = sinon.stub( Y.doccirrus.auth, 'isDevServer' );
            isDevStub.returns( false );

            await Y.doccirrus.api.appreg.setSecretsForApps( {
                user,
                appTokens: [appToken]
            } );

            await Y.doccirrus.api.appreg.put( {
                user,
                query: {
                    appName: appReg.appName
                },
                data: {...appReg}
            } );
        } );

        after( function() {
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onWriteConfigFile' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteRemoveCommand' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteRestartCommand' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteDisableCommand' );
            Y.doccirrus.api.appreg.event.removeAllListeners( 'onExecuteListUpdatesCommand' );

            isDevStub.restore();
        } );

        it( '1. Should check for new app versions and update the appreg.storeVersion', async () => {
            await Y.doccirrus.api.appreg.checkForNewAppVersionsInStore();
            onExecuteListUpdatesCommand.should.have.lengthOf( 1 );
        } );

        it( '1.2 Should have updated the app version in the appreg', async () => {
            const _appReg = await Y.doccirrus.api.appreg.get( {
                query: {
                    appName: appReg.appName
                }
            } );

            _appReg[0].appName.should.equal( defaultAppReg.appName );
            _appReg[0].storeVersion.should.equal( '2.0.0' );
        } );

        it( '2. Should return the number of outdated apps', async () => {
            const outdatedAppsCount = await Y.doccirrus.api.appreg.getOutdatedAppsCount({});

            outdatedAppsCount.should.equal( 1 );
        } );

        it( '3. Should return the rows to populate the Sol version update table', async () => {
            const appRegs = await Y.doccirrus.api.appreg.populateVersionUpdateTable({});

            appRegs.should.have.lengthOf( 1 );
        } );

        it( '4. Should update the app version by installing the app again', async () => {
            await Y.doccirrus.api.appreg.updateAppVersion( {query: appReg} );

            onExecuteRemoveCommand.should.have.lengthOf( 1 );
            onExecuteRemoveCommand[0].appName.should.equal( defaultAppReg.appName );
            onExecuteInstallCommand.should.have.lengthOf( 1 );
        } );

        it( '4.2. Should have triggered the restart command', () => {
            onExecuteRestartCommand.should.have.lengthOf( 1 );
            onExecuteRestartCommand[0].appName.should.equal( defaultAppReg.appName );
        } );
    } );
} );