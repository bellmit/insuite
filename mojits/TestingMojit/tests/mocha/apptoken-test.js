/**
 * User: pi
 * Date: 24/06/2015  15:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, before, after */

const
    sinon = require( 'sinon' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    mongodb = Y.doccirrus.mongodb,
    filters = Y.doccirrus.filters,
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal();
/**
 * covers cases when app token is created and changed
 */
describe( 'AppToken test', function() {
    const
        appToken1 = {
            appName: 'appName1',
            token: 'my secret token'
        },
        appToken2 = {
            appName: 'appName2',
            title: 'appName2 title',
            token: 'my secret token'
        },
        companyData = {
            coname: 'MOCHA',
            cotype: 'ARZTPRAXIS',
            customerNo: '666',
            countryMode: [mochaUtils.getCountryMode()],
            systemId: '666',
            systemType: 'APPLIANCE',
            serverType: 'PRC',
            activeState: true,
            centralContact: 'centralContact',
            tenantId: '0',
            dcCustomerNo: '666',
            tenants: [],
            licenseScope: [
                {
                    solutions: [],
                    supportLevel: 'premium',
                    additionalServices: [
                        'inTouch',
                        'inScribe',
                        'inScan',
                        'inSight',
                        'inOut',
                        'inBackup',
                        'inPortPlus'
                    ],
                    baseServices: [
                        'inCase',
                        'inTime',
                        'inForm',
                        'inVoice',
                        'inPort'
                    ],
                    baseSystemLevel: 'enterprise',
                    specialModules: [
                        'care',
                        'doquvide',
                        'cardio',
                        'oculus',
                        'asv',
                        'edmp'
                    ]
                }
            ],
            "addresses": [
                {
                    "kind": 'OFFICIAL',
                    "addon": '',
                    "countryCode": 'D',
                    "country": 'Deutschland',
                    "city": 'Berlin',
                    "zip": '12099',
                    "houseno": '',
                    "street": 'street'
                }
            ],
            "communications": [
                {
                    "type": 'EMAILJOB',
                    "value": 'mocha@doc-cirrus.com',
                    "confirmNeeded": false,
                    "confirmed": false,
                    "signaling": true
                }
            ]
        };

    describe( '0. Setup.', function() {
        it( 'Cleans db', function( done ) {
            this.timeout( 10000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'creates company', function() {
            return mongodb.runDb( {
                user,
                model: 'company',
                action: 'post',
                data: filters.cleanDbObject( companyData )
            } )
                .should.be.fulfilled;
        } );
    } );
    describe( '1. Test app token creation', function() {
        it( 'tries to insert invalid entry', function() {
            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'post',
                data: filters.cleanDbObject( {
                    title: 'title'
                } )
            } )
                .catch( err => {
                    err.name.should.equal( 'ValidationError' );
                    err.errors.should.include.keys( ['appName', 'token'] );
                    throw err;
                } )
                .should.be.rejected;
        } );
        it( 'checks app token collection', function() {
            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'count',
                query: {}
            } )
                .then( result => {
                    result.should.equal( 0 );
                } )
                .should.be.fulfilled;
        } );
        it( 'Inserts app token entry without title', function() {

            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'post',
                data: filters.cleanDbObject( appToken1 )
            } )
                .should.be.fulfilled;
        } );
        it( 'checks new app token entry', function() {
            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'get',
                query: {
                    appName: appToken1.appName
                }
            } )
                .then( results => {
                    results.should.have.lengthOf( 1 );
                    results[0].appName.should.equal( appToken1.appName );
                    results[0].title.should.equal( appToken1.appName );
                    results[0].token.should.equal( appToken1.token );
                } )
                .should.be.fulfilled;
        } );
        it( 'Inserts app token entry without title', function() {

            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'post',
                data: filters.cleanDbObject( appToken2 )
            } )
                .should.be.fulfilled;
        } );
        it( 'checks new app token entry', function() {
            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'get',
                query: {
                    appName: appToken2.appName
                }
            } )
                .then( results => {
                    results.should.have.lengthOf( 1 );
                    results[0].appName.should.equal( appToken2.appName );
                    results[0].title.should.equal( appToken2.title );
                    results[0].token.should.equal( appToken2.token );
                } )
                .should.be.fulfilled;
        } );
    } );

    describe( '2. Test app token update', function() {
        const
            newTitle = 'new title';
        it( `updates company license for dbCustomerNo "${companyData.dcCustomerNo}"`, function() {
            const
                licenseScope = [{...companyData.licenseScope[0]}];
            licenseScope[0].solutions = [appToken1.appName];
            return mongodb.runDb( {
                user,
                model: 'company',
                action: 'put',
                query: {
                    dcCustomerNo: companyData.dcCustomerNo
                },
                fields: ['licenseScope'],
                data: filters.cleanDbObject( {licenseScope} )
            } )
                .should.be.fulfilled;
        } );
        it( `updates not used app token entry for "${appToken2.appName}"`, function() {
            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'put',
                query: {
                    appName: appToken2.appName
                },
                fields: ['title'],
                data: filters.cleanDbObject( {title: newTitle} )
            } )
                .should.be.fulfilled;
        } );
        it( `tries to update used app token entry for "${appToken1.appName}"`, function() {
            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'put',
                query: {
                    appName: appToken1.appName
                },
                fields: ['title'],
                data: filters.cleanDbObject( {title: newTitle} )
            } )
                .should.be.fulfilled;
        } );
        it( 'checks app token entries', function() {
            return mongodb.runDb( {
                user,
                model: 'apptoken',
                action: 'get',
                query: {},
                options: {
                    sort: {
                        _id: 1
                    }
                }
            } )
                .then( results => {
                    results.should.have.lengthOf( 2 );
                    results[0].appName.should.equal( appToken1.appName );
                    results[0].title.should.equal( newTitle );

                    results[1].appName.should.equal( appToken2.appName );
                    results[1].title.should.equal( newTitle );
                } )
                .should.be.fulfilled;
        } );
    } );
    describe( '3. Test Sol Token table creation', function() {
        const
            mockArgs = {
                user: {},
                query: {},
                options: {}
            },
            appTokens = [
                {
                    '_id': '12345',
                    'type': 'LOCAL',
                    'appName': 'infusion',
                    'title': 'infusion',
                    'token': '54321'
                },
                {
                    '_id': '1357',
                    'type': 'LOCAL',
                    'appName': 'klindo',
                    'title': 'klindo',
                    'token': '7531'
                }
            ],
            companies = [
                {
                    _id: Object(),
                    coname: 'Wayne Industries',
                    dcCustomerNo: 1234,
                    appsMetaData: [],
                    licenseScope: [
                        {
                            'supportLevel': 'test',
                            'solutions': [
                                'infusion',
                                'klindo'
                            ]
                        }
                    ]
                },
                {
                    _id: Object(),
                    coname: 'ACME',
                    dcCustomerNo: 4321,
                    appsMetaData: [],
                    licenseScope: [
                        {
                            'supportLevel': 'test',
                            'solutions': [
                                'infusion'
                            ]
                        }
                    ]
                }
            ];
        let error, result;

        before( function() {
            sinon.stub( Y.doccirrus.api.apptoken, 'get' ).returns( Promise.resolve( appTokens ) );
            sinon.stub( Y.doccirrus.mongodb, 'runDb' ).returns( Promise.resolve( companies ) );
        } );

        after( function() {
            Y.doccirrus.api.apptoken.get.restore();
            Y.doccirrus.mongodb.runDb.restore();
        } );

        it( 'Should return data to populate table', async function() {
            [error, result] = await formatPromiseResult( Y.doccirrus.api.apptoken.getPopulatedAppTokensByCompany( mockArgs ) );

            should.not.exist( error );
            result.result.should.have.lengthOf( 3 );
        } );

        it( 'Should return sorted data by appName', async function() {
            [error, result] = await formatPromiseResult( Y.doccirrus.api.apptoken.getPopulatedAppTokensByCompany( {
                ...mockArgs,
                options: {
                    sort: {
                        appName: 1
                    }
                }
            } ) );

            should.not.exist( error );
            result.result.should.have.lengthOf( 3 );
            result.result[0].appName.should.equal( appTokens[0].appName );
            result.result[0].companyData.coname.should.equal( companies[0].coname );
        } );

        it( 'Should return sorted data by appName and filtered by company name', async function() {
            let mockMongoRegex = new Object( '/way/i' );
            mockMongoRegex.__proto__.toJSON = mockMongoRegex.__proto__.toString;

            [error, result] = await formatPromiseResult( Y.doccirrus.api.apptoken.getPopulatedAppTokensByCompany( {
                ...mockArgs,
                options: {
                    sort: {
                        appName: 1
                    }
                },
                query: {
                    companyData: {
                        $regex: mockMongoRegex
                    }
                }
            } ) );

            should.not.exist( error );
            result.result.should.have.lengthOf( 2 );
            result.result[0].appName.should.equal( appTokens[0].appName );
            result.result[0].companyData.coname.should.equal( 'Wayne Industries' );
        } );

    } );
} );