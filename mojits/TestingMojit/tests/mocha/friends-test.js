/**
 * User: pi
 * Date: 24/06/2015  15:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, after */

const
    {formatPromiseResult} = require( 'dc-core' ).utils,
    {promisify} = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    {wait} = require( '../utils' ),
    appName = mochaUtils.getAppName(),
    MochaSecret = 'MochaSecret',
    mongoose = require( 'mongoose' ),
    moment = require( 'moment' ),
    dcSDK = require( 'dc-sdk-communications' ),
    patientId = new mongoose.Types.ObjectId().toString(),
    caseFolderId = new mongoose.Types.ObjectId().toString(),
    locationId = new mongoose.Types.ObjectId().toString(),
    // locationId = '000000000000000000000001',
    employeeId = new mongoose.Types.ObjectId().toString(),
    DcServerCommunications = require( 'dc-server-communications' ),
    communication = DcServerCommunications.communication( Y, 'mocha-dc-server-communications' ),
    SocketIOClient = DcServerCommunications.SocketIOClient( Y, 'mocha-SocketIOClient' ),
    practiceData = mochaUtils.getPracticeData(),
    updateAppRegsProm = Y.doccirrus.api.appreg.updateAppRegs,
    checkAndGetSecretForAppProm = promisify( Y.doccirrus.auth._checkAndGetSecretForApp ),
    setSecretsForAppsProm = Y.doccirrus.api.appreg.setSecretsForApps,
    user = Y.doccirrus.auth.getSUForLocal();

/**
 * Tests
 *  app token handling - set/get app secret token
 *  dc-sdk-communication functionality
 *  http requests - without friend token, with friend token, as registered/unregistered app
 *  socket connection - without friend token, with token v1.0(via friend token)/v2.0(via app token)
 *  api to register ui menus
 */
describe( 'Friends test', function() {
    describe( '0. Setup.', function() {
        it( 'Cleans db', function( done ) {
            this.timeout( 10000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Creates case folder', function() {
            this.timeout( 10000 );
            return mochaUtils.createCaseFolder( {
                user,
                patientId,
                caseFolderId,
                locationId,
                employeeId
            } ).should.be.fulfilled;
        } );
        it( 'Inserts practice', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'practice',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true
                }, practiceData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
    } );
    describe( '1. Test DCAuth functionality', function() {
        describe( '1.1. Test _updateAppRegs', function() {
            const
                initialTokenList = [
                    {
                        appName: '1'
                    },
                    {
                        appName: '2'
                    },
                    {
                        appName: '3'
                    },
                    {
                        appName: '4'
                    }
                ],
                tokenList1 = [
                    {
                        appName: '1'
                    },
                    {
                        appName: '3'
                    },
                    {
                        appName: '4'
                    },
                    {
                        appName: '5'
                    },
                    {
                        appName: '6'
                    }
                ],
                tokenList2 = [
                    {
                        appName: '3'
                    },
                    {
                        appName: '5'
                    },
                    {
                        appName: '7'
                    }
                ];
            it( 'Collection appreg should be empty', async function() {
                let error, results;
                [error, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'get',
                        query: {}
                    } )
                );
                should.not.exist( error );
                should.exist( results );
                results.should.be.an( 'array' );
            } );
            it( 'Set initial token list', async function() {
                let [error] = await formatPromiseResult(
                    updateAppRegsProm( {
                        user,
                        appTokens: initialTokenList
                    } )
                );
                should.not.exist( error );
            } );
            it( 'Collection appreg should have 4 items', async function() {
                let error, results;
                [error, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'get',
                        query: {},
                        options: {
                            sort: {appName: 1}
                        }
                    } )
                );
                should.not.exist( error );
                results.should.have.lengthOf( initialTokenList.length );
                results.map( item => item.appName ).should.deep.equal( initialTokenList.map( item => item.appName ) );
            } );
            it( 'Give access for every app token', async function() {
                let error, results;
                [error, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'put',
                        query: {
                            _id: {$exists: true}
                        },
                        fields: ['hasAccess'],
                        data: Y.doccirrus.filters.cleanDbObject( {hasAccess: true, multi_: true} )
                    } )
                );
                should.not.exist( error );
                results.should.have.lengthOf( initialTokenList.length );
            } );
            it( 'Set token list 1', async function() {
                let [error] = await formatPromiseResult(
                    updateAppRegsProm( {
                        user,
                        appTokens: tokenList1
                    } )
                );
                should.not.exist( error );
            } );
            it( 'Collection appreg should have correct number of items (tokenList1.length) ', async function() {
                let error, results;
                [error, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'get',
                        query: {},
                        options: {
                            sort: {appName: 1}
                        }
                    } )
                );
                should.not.exist( error );
                results.should.have.lengthOf( tokenList1.length );
                results.map( item => item.appName ).should.deep.equal( tokenList1.map( item => item.appName ) );
                results[0].hasAccess.should.equal( true );
                results[1].hasAccess.should.equal( true );
                results[2].hasAccess.should.equal( true );
                results[3].hasAccess.should.equal( false );
                results[4].hasAccess.should.equal( false );
            } );
            it( 'Give access for every app token', async function() {
                let error, results;
                [error, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'put',
                        query: {
                            _id: {$exists: true}
                        },
                        fields: ['hasAccess'],
                        data: Y.doccirrus.filters.cleanDbObject( {hasAccess: true, multi_: true} )
                    } )
                );
                should.not.exist( error );
                results.should.have.lengthOf( tokenList1.length );
                await wait( this );
            } );
            it( 'Set token list 2', async function() {
                let [error] = await formatPromiseResult(
                    updateAppRegsProm( {
                        user,
                        appTokens: tokenList2
                    } )
                );
                should.not.exist( error );
            } );
            it( 'Collection appreg should have correct number of items (tokenList2.length)', async function() {
                let error, results;
                [error, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'get',
                        query: {},
                        options: {
                            sort: {appName: 1}
                        }
                    } )
                );
                should.not.exist( error );
                results.should.have.lengthOf( tokenList2.length );
                results.map( item => item.appName ).should.deep.equal( tokenList2.map( item => item.appName ) );
                results[0].hasAccess.should.equal( true );
                results[1].hasAccess.should.equal( true );
                results[2].hasAccess.should.equal( false );
            } );
            it( 'Empty appreg collection', async function() {
                let error, results;
                [error, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'delete',
                        query: {
                            _id: {$exists: true}
                        },
                        options: {
                            override: true
                        }
                    } )
                );
                should.not.exist( error );
                results.should.have.lengthOf( tokenList2.length );
                await wait( this );
            } );
        } );
        describe( '1.2. Test secret keys handling', function() {
            it( 'Checks getJSONWebTokenForWebSocket method', function() {
                const
                    date = '2018-05-04T12:28:59.233Z';

                return dcSDK.auth.getJSONWebTokenForWebSocket( {
                    name: appName,
                    date,
                    secretKey: MochaSecret
                } )
                    .then( token => {
                        token.should.be.equal( 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAxOC0wNS0wNFQxMjoyODo1OS4yMzNaIiwibmFtZSI6Ik1PQ0hBX0FQUCJ9.y_rBoDN0l7WVUJbd7MJFSoUE-q-lvDPPKiaTou54qUk' );
                    } );

            } );
            it( 'Checks getCanonicalRequestString method with x-dc-server', function() {
                const
                    headers = {
                        host: 'mocha.dc',
                        'x-dc-content-sha256': 'content-hash-sha256',
                        'x-dc-date': '2018-01-22T09:28:07.584Z',
                        'x-dc-server': 'MOCHA'
                    },
                    canonicalString = dcSDK.auth.getCanonicalRequestString( {
                        req: {
                            method: 'GET',
                            originalUrl: '/?foo=bar',
                            query: {
                                foo: 'bar'
                            },
                            headers: Object.assign( {}, headers ),
                            body: {
                                version: 'v1.0.16',
                                booleanFlag: true,
                                count: 10
                            }
                        }
                    } );
                canonicalString.should.equal(
                    'GET\n' +
                    '/\n' +
                    'foo=bar\n' +
                    `host:${headers.host}\n` +
                    `x-dc-content-sha256:${headers['x-dc-content-sha256']}\n` +
                    `x-dc-date:${headers['x-dc-date']}\n` +
                    `x-dc-server:${headers['x-dc-server']}\n` +
                    `host;x-dc-content-sha256;x-dc-date;x-dc-server\n` +
                    `a5cfb79b58e3a33d4c77969925afa927eca5423ee77c89450a8a03cebde9e21f`
                );

            } );
            it( 'Checks getCanonicalRequestString method with x-app-name', function() {
                const
                    headers = {
                        host: 'mocha.dc',
                        'x-dc-app-name': appName,
                        'x-dc-content-sha256': 'content-hash-sha256',
                        'x-dc-date': '2018-01-22T09:28:07.584Z'
                    },
                    canonicalString = dcSDK.auth.getCanonicalRequestString( {
                        req: {
                            method: 'GET',
                            originalUrl: '/?foo=bar',
                            query: {
                                foo: 'bar'
                            },
                            headers: Object.assign( {}, headers ),
                            body: {
                                version: 'v1.0.16',
                                booleanFlag: true,
                                count: 10
                            }
                        }
                    } );
                canonicalString.should.equal(
                    'GET\n' +
                    '/\n' +
                    'foo=bar\n' +
                    `host:${headers.host}\n` +
                    `x-dc-app-name:${headers['x-dc-app-name']}\n` +
                    `x-dc-content-sha256:${headers['x-dc-content-sha256']}\n` +
                    `x-dc-date:${headers['x-dc-date']}\n` +
                    `host;x-dc-app-name;x-dc-content-sha256;x-dc-date\n` +
                    `a5cfb79b58e3a33d4c77969925afa927eca5423ee77c89450a8a03cebde9e21f`
                );

            } );
            it( 'Checks _checkAndGetSecretForApp with not existing appName', async function() {
                // interacts with cache and/or db
                let [error, appSecret] = await formatPromiseResult(
                    checkAndGetSecretForAppProm( {appName, user} )
                );
                should.exist( error );
                error.code.should.equal( 401 );
                should.not.exist( appSecret );
            } );
            it( 'Checks _setSecretsForApps', async function() {
                // interacts with cache and/or db
                let [error] = await formatPromiseResult(
                    setSecretsForAppsProm( {
                        appTokens: [
                            {
                                appName,
                                token: MochaSecret
                            }
                        ],
                        user
                    } )
                );
                should.not.exist( error );
                await wait( this );
            } );

            it( 'Checks _checkAndGetSecretForApp with existing appName but no access', async function() {
                // interacts with cache and/or db
                let [error, appSecret] = await formatPromiseResult(
                    checkAndGetSecretForAppProm( {appName, user} )
                );
                should.exist( error );
                error.code.should.equal( 401 );
                should.not.exist( appSecret );
            } );
            it( 'Gives app access', async function() {
                let [error] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'put',
                        query: {
                            appName: appName
                        },
                        data: Y.doccirrus.filters.cleanDbObject( {
                            hasAccess: true
                        } ),
                        fields: ['hasAccess']
                    } )
                );
                should.not.exist( error );
                await wait( this );
            } );
            it( 'Checks _checkAndGetSecretForApp with existing appName with access', async function() {
                let [error, appSecret] = await formatPromiseResult(
                    checkAndGetSecretForAppProm( {appName, user} )
                );

                should.not.exist( error );
                should.exist( appSecret );

                const token = await dcSDK.auth.signObject( {
                    objectToSign: MochaSecret,
                    secretKey: `${practiceData._id.toString()}${practiceData.dcCustomerNo}`
                } );

                appSecret.should.equal( token );
            } );
        } );
    } );

    describe( '2. Test REST calls', function() {
        it( 'Makes http request', function( done ) {
            this.timeout( 10000 );
            Y.doccirrus.https.original.externalPost( `http://localhost:12359/1/test/:echo`, {}, {
                errDataCallback: true,
                serverType: 'PUC',
                headers: {host: 'localhost:12359'}
            }, function( error ) {
                should.exist( error );
                error.code.should.equal( 401 );
                done();
            } );
        } );
        it( 'Makes friend http request with expired token', function( done ) {
            Y.doccirrus.https.original.externalPost( `http://localhost:12359/1/test/:echo`, {}, Object.assign( {
                errDataCallback: true,
                serverType: 'PUC',
                headers: {host: 'localhost:12359', 'X-DC-Date': '2018-01-22T09:28:07.584Z'}
            }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error ) {
                should.exist( error );
                error.code.should.equal( 401 );
                done();
            } );
        } );
        it( 'Makes friend /1 http request', function( done ) {
            Y.doccirrus.https.original.externalPost( `http://localhost:12359/1/test/:echo`, {}, Object.assign( {
                errDataCallback: true,
                serverType: 'PUC',
                headers: {host: 'localhost:12359'}
            }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error, data ) {
                should.not.exist( error );
                should.exist( data );
                data.echo.should.equal( 'echo' );
                done();
            } );
        } );
        it( 'Makes /1 http request with app name', function( done ) {
            Y.doccirrus.https.original.externalPost( `http://localhost:12359/1/test/:echo`, {}, Object.assign( {
                errDataCallback: true,
                appName: appName,
                headers: {host: 'localhost:12359'}
            }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error, data ) {
                should.not.exist( error );
                should.exist( data );
                data.echo.should.equal( 'echo' );
                done();
            } );
        } );
        it( 'Makes /2 http request with app name', function( done ) {
            Y.doccirrus.https.original.externalPost( `http://localhost:12359/2/test/:echo`, {}, Object.assign( {
                errDataCallback: true,
                appName: appName,
                headers: {host: 'localhost:12359'}
            }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error, data ) {
                should.not.exist( error );
                should.exist( data );
                data.echo.should.equal( 'echo' );
                done();
            } );
        } );
        it( 'Makes /1 http request with not registered app name', function( done ) {
            Y.doccirrus.https.original.externalPost( `http://localhost:12359/1/test/:echo`, {}, Object.assign( {
                errDataCallback: true,
                appName: 'NOT_REGISTERED_NAME',
                headers: {host: 'localhost:12359'}
            }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error ) {
                should.exist( error );
                error.code.should.equal( 401 );
                done();
            } );
        } );
        it( 'Makes /2 http request with not registered app name', function( done ) {
            Y.doccirrus.https.original.externalPost( `http://localhost:12359/2/test/:echo`, {}, Object.assign( {
                errDataCallback: true,
                appName: 'NOT_REGISTERED_NAME',
                headers: {host: 'localhost:12359'}
            }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error ) {
                should.exist( error );
                error.code.should.equal( 401 );
                done();
            } );
        } );
    } );

    describe( '3. Test socket connection', function() {

        const
            ioClient = require( 'socket.io-client' ),
            connectionUrl = 'http://localhost:12359',
            calledEvents = {};
        communication.setListenerForNamespace( 'default', 'mocha.test.echo', function( message = {}, callback ) {
            calledEvents[message.event || 'default'] = true;
            callback( {data: 'World'} );
        } );
        communication.setListenerForApp( {
            event: 'mocha.apptest.echo',
            callback: function( message = {}, callback ) {
                calledEvents[message.event || 'default'] = true;
                callback( {data: 'World'} );
            }
        } );
        describe( '3.1. Test socket connection without friend header', function() {
            const
                event = 'noHeader';
            let
                client;
            after( () => {
                client.disconnect();
            } );
            it( 'Makes socket connection', function( done ) {
                this.timeout( 3000 );
                client = ioClient( connectionUrl, {} );
                client.on( 'connect', () => {
                    setTimeout( done, 1000 );
                } );
            } );
            it( 'Emits event', function( done ) {
                client.emit( 'mocha.test.echo', {event}, () => {
                } );
                setTimeout( done, 1000 );
            } );
            it( 'Checks called event', function() {
                should.not.exist( calledEvents[event] );
            } );
        } );
        describe( '3.2. Test socket connection with auth v1.0', function() {
            const
                event = 'withHeader',
                socketClient = new SocketIOClient( {
                    name: 'PUC',
                    targetUrl: connectionUrl,
                    events: {
                        AUTH: 'auth'
                    }
                } );
            let
                client;

            it( 'Init socket connection', function( done ) {
                this.timeout( 5000 );
                socketClient.connectToTarget( ( err, socket ) => {
                    should.not.exist( err );
                    client = socket;
                    socketClient.event.on( 'authorized', () => {
                        done();
                    } );
                } );

            } );
            it( 'Emits event', function( done ) {
                this.timeout( 5000 );
                client.emit( 'mocha.test.echo', {event}, () => {
                    done();
                } );
            } );
            it( 'Checks called event', function() {
                this.timeout( 5000 );
                should.exist( calledEvents[event] );
            } );
        } );
        describe( '3.3. Test socket connection with auth v2.0', function() {
            const
                event = 'withAppHeader';
            let
                client,
                socketClient;

            it( 'init sdk websocket helper', async function() {
                let [error, _secretKey] = await formatPromiseResult(
                    dcSDK.auth.signObject( {
                        objectToSign: MochaSecret,
                        secretKey: `${practiceData._id.toString()}${practiceData.dcCustomerNo}`
                    } )
                );
                should.not.exist( error );
                socketClient = new dcSDK.DCWebSocket( {
                    secretKey: _secretKey,
                    appName
                } );
                await wait( this );
            } );
            it( '_setSecretsForApps', async function() {
                let [error] = await formatPromiseResult(
                    setSecretsForAppsProm( {
                            appTokens: [
                                {
                                    appName,
                                    token: MochaSecret
                                }
                            ], user
                        }
                    ) );
                should.not.exist( error );
                await wait( this );
            } );
            it( 'Checks _checkAndGetSecretForApp with existing appName with access', async function() {
                let [error, appSecret] = await formatPromiseResult(
                    checkAndGetSecretForAppProm( {appName, user} )
                );
                const token = await dcSDK.auth.signObject( {
                    objectToSign: MochaSecret,
                    secretKey: `${practiceData._id.toString()}${practiceData.dcCustomerNo}`
                } );
                should.not.exist( error );
                should.exist( appSecret );
                appSecret.should.equal( token );
            } );
            it( 'Makes socket connection', function( done ) {
                this.timeout( 5000 );
                socketClient.openConnection( {
                    url: connectionUrl
                } )
                    .then( socket => {
                        client = socket;
                        socketClient.event.on( 'authorized', done );
                    } );
            } );
            it( 'Emits event', function( done ) {
                this.timeout( 5000 );
                client.emit( 'mocha.apptest.echo', {event}, () => {
                    done();
                } );
            } );
            it( 'Checks called event', function() {
                should.exist( calledEvents[event] );
            } );
        } );
        describe( '3.4. Test socket communication with app v2.0 but protected event', function() {
            const
                event = 'withAppHeaderProtectedEvent';
            let
                socketClient,
                client,
                secretKey;
            it( 'init sdk websocket helper', function() {
                return dcSDK.auth.signObject( {
                    objectToSign: MochaSecret,
                    secretKey: `${practiceData._id.toString()}${practiceData.dcCustomerNo}`
                } )
                    .then( _secretKey => {
                        secretKey = _secretKey;
                        socketClient = new dcSDK.DCWebSocket( {
                            secretKey: _secretKey,
                            appName
                        } );
                    } )
                    .should.be.fulfilled;
            } );
            it( '_setSecretsForApps', async function() {
                let error, appSecret;
                [error] = await formatPromiseResult(
                    setSecretsForAppsProm( {
                        appTokens: [
                            {
                                appName,
                                token: MochaSecret
                            }
                        ],
                        user
                    } )
                );
                should.not.exist( error );
                [error, appSecret] = await formatPromiseResult(
                    checkAndGetSecretForAppProm( {appName, user} )
                );
                should.not.exist( error );
                should.exist( appSecret );
                appSecret.should.equal( secretKey );
                await wait( this );
            } );

            it( 'Makes socket connection', function( done ) {
                this.timeout( 5000 );
                socketClient.openConnection( {
                    url: connectionUrl
                } )
                    .then( socket => {
                        client = socket;
                        socketClient.event.on( 'authorized', done );
                    } );
            } );
            it( 'Emits event', function( done ) {
                this.timeout( 5000 );
                client.emit( 'mocha.test.echo', {event}, () => {
                } );
                setTimeout( done, 1000 );
            } );
            it( 'Checks called event', function() {
                should.not.exist( calledEvents[event] );
            } );
        } );
        describe( '3.5. Test "token-based" subscription', function() {
            let
                client,
                actTypeSubscription = 'finding',
                postSubscription = 'finding/created',
                putSubscription = 'finding/updated',
                mainSubscription = 'activity',
                createdActivityId,
                activityEvents = [],
                postEvents = [],
                putEvents = [],
                actTypeEvents = [],
                idActTypeEvents = [],
                socketClient;

            function cleanEvents() {
                activityEvents.length = 0;
                actTypeEvents.length = 0;
                postEvents.length = 0;
                putEvents.length = 0;
                idActTypeEvents.length = 0;
            }

            describe( 'Setup', function() {
                it( 'init sdk websocket helper', function() {
                    return dcSDK.auth.signObject( {
                        objectToSign: MochaSecret,
                        secretKey: `${practiceData._id.toString()}${practiceData.dcCustomerNo}`
                    } )
                        .then( _secretKey => {
                            socketClient = new dcSDK.DCWebSocket( {
                                secretKey: _secretKey,
                                appName
                            } );
                        } )
                        .should.be.fulfilled;
                } );
                it( 'Makes socket connection', function( done ) {
                    this.timeout( 5000 );
                    socketClient.openConnection( {
                        url: connectionUrl
                    } )
                        .then( socket => {
                            client = socket;
                            socketClient.event.on( 'authorized', done );
                        } );
                } );

                it( 'Creates Schein', function() {
                    const
                        date = moment( mochaUtils.generateNewDate() ),
                        schein = mochaUtils.getActivityData( {
                            actType: 'SCHEIN',
                            timestamp: date.toISOString(),
                            scheinQuarter: date.get( 'quarter' ),
                            scheinYear: date.get( 'year' ),
                            status: 'VALID',
                            scheinType: '0101',
                            scheinSubgroup: '00',
                            patientId,
                            caseFolderId: caseFolderId,
                            locationId,
                            employeeId
                        } );
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( schein )
                    } ).should.be.fulfilled;
                } );
                it( 'Sets subscriptions', function() {
                    client.on( actTypeSubscription, ( message ) => {
                        actTypeEvents.push( message );
                    } );
                    client.on( mainSubscription, ( message ) => {
                        activityEvents.push( message );
                    } );
                    client.on( postSubscription, ( message ) => {
                        postEvents.push( message );
                    } );
                    client.on( putSubscription, ( message ) => {
                        putEvents.push( message );
                    } );
                } );
            } );

            /**
             * Test general subscription "*" and "actType" subscription
             * "*" should catch all actions
             * "actType" subscription should behave same way as "collection" subscription. Important - "activity" subscription should be triggered as well.
             */
            describe( 'Test ActType "*" subscription (post)', function() {
                it( 'Subscribe for actType', function() {
                    this.timeout( 5000 );
                    client.emit( 'subscribe', {
                        hook: actTypeSubscription
                    } );
                } );
                it( 'Triggers event', async function() {
                    const
                        activityData = mochaUtils.getActivityData( {
                            actType: 'FINDING',
                            employeeId,
                            patientId,
                            caseFolderId,
                            locationId
                        } );
                    let error, results;
                    [error, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( activityData )
                        } )
                    );
                    should.not.exist( error );
                    should.exist( results );
                    createdActivityId = results[0];
                    await wait( this );
                } );
                it( 'Checks events', function() {
                    activityEvents.should.have.lengthOf( 0 );
                    postEvents.should.have.lengthOf( 0 );
                    putEvents.should.have.lengthOf( 0 );
                    actTypeEvents.should.have.lengthOf( 1 );
                    actTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    actTypeEvents[0].payload[0].should.equal( createdActivityId );
                    actTypeEvents[0].action.should.equal( 'created' );
                    cleanEvents();
                } );
            } );
            describe( 'Test Activity "*" subscription (post)', function() {
                it( 'Subscribe for activity changes', function() {
                    client.emit( 'subscribe', {
                        hook: mainSubscription
                    } );
                } );
                it( 'Triggers event', async function() {
                    const
                        activityData = mochaUtils.getActivityData( {
                            actType: 'FINDING',
                            employeeId,
                            patientId,
                            caseFolderId,
                            locationId
                        } );
                    let error, results;
                    [error, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( activityData )
                        } )
                    );
                    createdActivityId = results[0];
                    should.not.exist( error );
                    should.exist( results );
                    [error, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( Object.assign( {}, activityData, {
                                actType: 'HISTORY',
                                _id: undefined
                            } ) )
                        } )
                    );
                    should.not.exist( error );
                    should.exist( results );
                    await wait( this );
                } );
                it( 'Checks events', function() {
                    postEvents.should.have.lengthOf( 0 );
                    putEvents.should.have.lengthOf( 0 );

                    activityEvents.should.have.lengthOf( 2 );
                    activityEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    activityEvents[0].payload[0].should.equal( createdActivityId );
                    activityEvents[0].action.should.equal( 'created' );

                    activityEvents[1].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    activityEvents[1].action.should.equal( 'created' );

                    actTypeEvents.should.have.lengthOf( 1 );
                    actTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    actTypeEvents[0].payload[0].should.equal( createdActivityId );
                    actTypeEvents[0].action.should.equal( 'created' );

                    cleanEvents();
                } );
            } );
            describe( 'Test ActType "created" subscription (post)', function() {
                it( 'Subscribe for actType post db action', function() {
                    client.emit( 'subscribe', {
                        hook: actTypeSubscription,
                        action: 'created'
                    } );
                } );
                it( 'Triggers event', async function() {
                    const
                        activityData = mochaUtils.getActivityData( {
                            actType: 'FINDING',
                            employeeId,
                            locationId,
                            patientId,
                            caseFolderId
                        } );
                    let error, results;
                    [error, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( activityData )
                        } )
                    );
                    should.not.exist( error );
                    createdActivityId = results[0];
                    await wait( this );
                } );
                it( 'Checks events', function() {
                    putEvents.should.have.lengthOf( 0 );

                    activityEvents.should.have.lengthOf( 1 );
                    activityEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    activityEvents[0].payload[0].should.equal( createdActivityId );
                    activityEvents[0].action.should.equal( 'created' );

                    actTypeEvents.should.have.lengthOf( 1 );
                    actTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    actTypeEvents[0].payload[0].should.equal( createdActivityId );
                    actTypeEvents[0].action.should.equal( 'created' );

                    postEvents.should.have.lengthOf( 1 );
                    postEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    postEvents[0].payload[0].should.equal( createdActivityId );
                    postEvents[0].action.should.equal( 'created' );
                    cleanEvents();
                } );
            } );
            describe( 'Test delete action (1 item) for "*" subscription', function() {
                it( 'Triggers event', async function() {
                    let error;
                    [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'delete',
                            query: {
                                _id: createdActivityId
                            }
                        } ) );
                    should.not.exist( error );
                    await wait( this );
                } );
                it( 'Checks events', function() {
                    postEvents.should.have.lengthOf( 0 );
                    putEvents.should.have.lengthOf( 0 );
                    activityEvents.should.have.lengthOf( 1 );
                    activityEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    activityEvents[0].payload[0].should.equal( createdActivityId );
                    activityEvents[0].action.should.equal( 'removed' );

                    actTypeEvents.should.have.lengthOf( 1 );
                    actTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    actTypeEvents[0].payload[0].should.equal( createdActivityId );
                    actTypeEvents[0].action.should.equal( 'removed' );

                    cleanEvents();
                } );
            } );
            describe( 'Test delete action (2+ item) for "*" subscription', function() {
                it( 'Triggers event', async function() {
                    let error;
                    [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'delete',
                            query: {
                                actType: {$ne: 'SCHEIN'}
                            }
                        } )
                    );
                    should.not.exist( error );
                    await wait( this );
                } );
                it( 'Checks events', function() {
                    postEvents.should.have.lengthOf( 0 );
                    putEvents.should.have.lengthOf( 0 );
                    activityEvents.should.have.lengthOf( 1 );
                    activityEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 3 );
                    activityEvents[0].action.should.equal( 'removed' );

                    actTypeEvents.should.have.lengthOf( 1 );
                    actTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 2 );
                    actTypeEvents[0].action.should.equal( 'removed' );

                    cleanEvents();
                } );
            } );
            describe( 'Test put action (1 item) for "*" subscription', function() {
                it( 'Subscribe for actType put db action', function() {
                    client.emit( 'subscribe', {
                        hook: actTypeSubscription,
                        action: 'updated'
                    } );
                } );
                it( 'Insert activities', async function() {
                    const
                        activityData = mochaUtils.getActivityData( {
                            actType: 'FINDING',
                            employeeId,
                            locationId,
                            patientId,
                            caseFolderId
                        } );
                    let error, results;
                    [error, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( activityData )
                        } )
                    );
                    should.not.exist( error );
                    should.exist( results );
                    results.should.be.an( 'array' );
                    createdActivityId = results[0];

                    [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( Object.assign( {}, activityData, {
                                actType: 'HISTORY',
                                _id: undefined
                            } ) )
                        } )
                    );
                    should.not.exist( error );

                    [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( Object.assign( {}, activityData, {
                                actType: 'FINDING',
                                _id: undefined
                            } ) )
                        } )
                    );
                    should.not.exist( error );
                    await wait( this );
                } );
                it( 'Triggers event', async function() {
                    cleanEvents();
                    let [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'put',
                            query: {
                                _id: createdActivityId
                            },
                            fields: ['userContent'],
                            data: Y.doccirrus.filters.cleanDbObject( {
                                userContent: 'userContent_new'
                            } )
                        } )
                    );
                    should.not.exist( error );
                    await wait( this );
                } );
                it( 'Checks events', function() {
                    postEvents.should.have.lengthOf( 0 );

                    activityEvents.should.have.lengthOf( 1 );
                    activityEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    activityEvents[0].payload[0].should.equal( createdActivityId );
                    activityEvents[0].action.should.equal( 'updated' );

                    actTypeEvents.should.have.lengthOf( 1 );
                    actTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    actTypeEvents[0].payload[0].should.equal( createdActivityId );
                    actTypeEvents[0].action.should.equal( 'updated' );

                    putEvents.should.have.lengthOf( 1 );
                    putEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    putEvents[0].payload[0].should.equal( createdActivityId );
                    putEvents[0].action.should.equal( 'updated' );

                    cleanEvents();
                } );
            } );
            describe( 'Test put action (2+ item) for "*" subscription', function() {
                it( 'Triggers event', async function() {
                    let [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'put',
                            query: {
                                actType: {$ne: 'SCHEIN'}
                            },
                            fields: ['userContent'],
                            data: Y.doccirrus.filters.cleanDbObject( {
                                userContent: 'userContent_new',
                                multi_: true
                            } )
                        } )
                    );
                    should.not.exist( error );
                    await wait( this );
                } );

                it( 'Checks events', function() {
                    activityEvents.should.have.lengthOf( 1 );
                    activityEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 3 );
                    activityEvents[0].payload.should.include( createdActivityId );
                    activityEvents[0].action.should.equal( 'updated' );

                    actTypeEvents.should.have.lengthOf( 1 );
                    actTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 2 );
                    actTypeEvents[0].payload.should.include( createdActivityId );
                    actTypeEvents[0].action.should.equal( 'updated' );

                    cleanEvents();
                } );
            } );

            describe( 'Test unsubscribtion', function() {
                it( 'Unsubscribe for activity and actType changes', function() {
                    client.emit( 'unsubscribe', {
                        hook: mainSubscription
                    } );
                    client.emit( 'unsubscribe', {
                        hook: actTypeSubscription
                    } );
                } );
                it( 'Triggers event', async function() {
                    const
                        activityData = mochaUtils.getActivityData( {
                            actType: 'FINDING',
                            employeeId,
                            locationId,
                            patientId,
                            caseFolderId
                        } );
                    let error, results;
                    [error, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( activityData )
                        } ) );
                    should.not.exist( error );
                    should.exist( results );
                    results.should.be.an( 'array' );
                    createdActivityId = results[0];
                    await wait( this );
                } );
                it( 'Checks events', function() {
                    activityEvents.should.have.lengthOf( 0 );
                    actTypeEvents.should.have.lengthOf( 0 );

                    cleanEvents();
                } );
            } );

            describe( 'Test "_id" subscription', function() {
                it( 'Insert activity', function() {
                    const
                        activityData = mochaUtils.getActivityData( {
                            actType: 'FINDING',
                            employeeId,
                            locationId,
                            patientId,
                            caseFolderId
                        } );
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( activityData )
                    } )
                        .then( result => {
                            createdActivityId = result[0];
                            client.on( `${actTypeSubscription}/${createdActivityId}`, ( message ) => {
                                idActTypeEvents.push( message );
                            } );
                        } ).should.be.fulfilled;
                } );

                it( 'Subscribe for actions by _id', function() {
                    client.emit( 'subscribe', {
                        hook: actTypeSubscription,
                        query: {
                            _id: createdActivityId
                        }
                    } );
                } );
                it( 'Triggers event', async function() {
                    let [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'put',
                            query: {
                                _id: createdActivityId
                            },
                            fields: ['userContent'],
                            data: Y.doccirrus.filters.cleanDbObject( {
                                userContent: 'userContent_new'
                            } )
                        } )
                    );
                    should.not.exist( error );

                    [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'delete',
                            query: {
                                _id: createdActivityId
                            }
                        } ) );
                    should.not.exist( error );
                    await wait( this );
                } );

                it( 'Checks events', function() {
                    activityEvents.should.have.lengthOf( 0 );
                    actTypeEvents.should.have.lengthOf( 0 );

                    idActTypeEvents.should.have.lengthOf( 2 );
                    idActTypeEvents[0].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    idActTypeEvents[0].payload[0].should.equal( createdActivityId );
                    idActTypeEvents[0].action.should.equal( 'updated' );
                    idActTypeEvents[1].payload.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    idActTypeEvents[1].payload[0].should.equal( createdActivityId );
                    idActTypeEvents[1].action.should.equal( 'removed' );
                    cleanEvents();
                } );
                it( 'Unsubscribe for actType created action', function() {
                    client.emit( 'unsubscribe', {
                        hook: actTypeSubscription,
                        query: {
                            _id: createdActivityId
                        }
                    } );
                } );
            } );

        } );
    } );
    /**
     * This test needs a re-write taking into account that we are sending the request
     * to the PUC, meaning the PUC DB needs to be set up with an appreg entry to test
     * against. It should be only asserting the correct/incorrect request (and not for
     * the actual functionality of the appreg methods, we have appreg-test for that).
     */
    describe.skip( '4. Test registerUIMenu', function() {
        const
            mochaTargetUrl = 'mochaTargetUrl';
        it( 'Checks "appreg" entry', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'appreg',
                action: 'get',
                query: {
                    appName
                }
            } ).should.be.fulfilled
                .then( results => {
                    results.should.have.lengthOf( 1 );
                    results[0].uiConfiguration.should.have.lengthOf( 0 );
                } );
        } );
        it( 'Makes "registerUIMenu" rest call', function( done ) {
            this.timeout( 5000 );
            const
                url = `http://localhost:12359/1/appreg/:registerUIMenu`,
                data = {
                    uiConfiguration: [
                        {
                            type: Y.doccirrus.schemas.appreg.uiConfigurationTypes.MAIN,
                            targetUrl: mochaTargetUrl
                        }
                    ]
                },
                options = Object.assign(
                    {
                        errDataCallback: true,
                        appName: appName,
                        headers: {host: 'localhost:12359', 'X-DC-App-Name': appName}
                    },
                    Y.doccirrus.auth.setInternalAccessOptions()
                );

            Y.doccirrus.https.original.externalPost( url, data, options, function( error, data ) {
                should.not.exist( error );
                should.exist( data );
                done();
            } );
        } );
        it( 'Checks "appreg" entry', async function() {
            await wait( this );
            const results = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'appreg',
                action: 'get',
                query: {
                    appName
                }
            } );
            results.should.have.lengthOf( 1 );
            results[0].uiConfiguration.should.have.lengthOf( 1 );
            results[0].uiConfiguration[0].type.should.equal( Y.doccirrus.schemas.appreg.uiConfigurationTypes.MAIN );
            results[0].uiConfiguration[0].targetUrl.should.equal( mochaTargetUrl );
        } );
    } );
    /**
     * This test needs a re-write taking into account that we are sending the request
     * to the PUC, meaning the PUC DB needs to be set up with an appreg entry to test
     * against. It should be only asserting the correct/incorrect request (and not for
     * the actual functionality of the appreg methods, we have appreg-test for that).
     */
    describe( '5. Test registerWebHook', function() {
        const
            mochaTargetUrl = 'mochaTargetUrl';

        function mockRegisterWebHookCall( args ) {
            const {_appName = appName, webHooksConfiguration} = args;
            return new Promise( ( resolve, reject ) => {
                const
                    url = `http://localhost:12359/1/appreg/:registerWebHook`,
                    data = {
                        webHooksConfiguration
                    },
                    options = Object.assign(
                        {
                            errDataCallback: true,
                            appName: _appName,
                            headers: {host: 'localhost:12359', 'X-DC-App-Name': _appName}
                        },
                        Y.doccirrus.auth.setInternalAccessOptions()
                    );

                Y.doccirrus.https.original.externalPost( url, data, options, ( error, data ) => {
                    if( error ) {
                        return reject( error );
                    }
                    resolve( data );
                } );
            } );
        }

        it( 'Makes "registerWebHook" rest call and fails because of bad appName', async function() {
            this.timeout( 10000 );
            const webHooksConfiguration = [
                {
                    type: Y.doccirrus.schemas.appreg.webHooksConfigurationTypes.MAIN,
                    targetUrl: mochaTargetUrl
                }
            ];
            /**
             * Error check should check for the error message and be the correct one
             */
            await mockRegisterWebHookCall( {webHooksConfiguration, _appName: 'WRONG_APP_NAME'} ).should.be.rejected;
        } );
    } );

    /**
     * This test needs a re-write taking into account that we are sending the request
     * to the PUC, meaning the PUC DB needs to be set up with an appreg entry to test
     * against. It should be only asserting the correct/incorrect request (and not for
     * the actual functionality of the appreg methods, we have appreg-test for that).
     */
    describe.skip( '6. Test registerRouteOverride', function() {
        const
            data = {
                routeOverrideConfiguration: [
                    {
                        pathMatch: "/TEST",
                        hashMatch: "^#\/TEST\/",
                        pathReplace: "/",
                        hashReplace: "#/TEST",
                        pathStringMatchType: "STRING",
                        hashStringMatchType: "REGEXP",
                        appName: mochaUtils.getAppName(),
                        description: "Patienten-Ansicht",
                        appIcon: "/test-icon.png"
                    }
                ]
            };
        it( 'Checks "appreg" entry', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'appreg',
                action: 'get',
                query: {
                    appName
                }
            } ).should.be.fulfilled
                .then( results => {
                    results.should.have.lengthOf( 1 );
                    results[0].routeOverrideConfiguration.should.have.lengthOf( 0 );
                } );
        } );
        it( 'Makes "registerRouteOverride" rest call', function( done ) {
            const
                url = `http://localhost:12359/1/appreg/:registerRouteOverride`,
                options = Object.assign(
                    {
                        errDataCallback: true,
                        appName: appName,
                        headers: {host: 'localhost:12359'}
                    },
                    Y.doccirrus.auth.setInternalAccessOptions()
                );

            Y.doccirrus.https.original.externalPost( url, data, options, function( error, data ) {
                should.not.exist( error );
                should.exist( data );
                done();
            } );
        } );
        it( 'Checks "appreg" entry', async function() {
            let error, results;
            await wait( this );
            [error, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'appreg',
                    action: 'get',
                    query: {
                        appName
                    }
                } )
            );
            should.not.exist( error );
            results.should.have.lengthOf( 1 );
            results[0].routeOverrideConfiguration.should.have.lengthOf( 1 );
            results[0].routeOverrideConfiguration[0].pathMatch.should.equal( data.routeOverrideConfiguration[0].pathMatch );
            results[0].routeOverrideConfiguration[0].hashMatch.should.equal( data.routeOverrideConfiguration[0].hashMatch );
            results[0].routeOverrideConfiguration[0].pathReplace.should.equal( data.routeOverrideConfiguration[0].pathReplace );
            results[0].routeOverrideConfiguration[0].hashReplace.should.equal( data.routeOverrideConfiguration[0].hashReplace );
            results[0].routeOverrideConfiguration[0].pathStringMatchType.should.equal( data.routeOverrideConfiguration[0].pathStringMatchType );
            results[0].routeOverrideConfiguration[0].hashStringMatchType.should.equal( data.routeOverrideConfiguration[0].hashStringMatchType );
            results[0].routeOverrideConfiguration[0].appName.should.equal( data.routeOverrideConfiguration[0].appName );
            results[0].routeOverrideConfiguration[0].description.should.equal( data.routeOverrideConfiguration[0].description );
            results[0].routeOverrideConfiguration[0].appIcon.should.equal( data.routeOverrideConfiguration[0].appIcon );
        } );
    } );
} );