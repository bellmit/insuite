/**
 * User: dmitrii.solovev
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, expect, beforeEach, afterEach, describe, it*/

const
    sTypes = ['puc', 'vprc', 'prc', 'isd', 'dcprc'],
    migrateInstance = Y.doccirrus.migrate,
    DCCoreMigrate = require( 'dc-core' ).migrate,
    packageJson = require( '../../../../package.json' ),
    semver = require( 'semver' ),
    util = require( 'util' ),
    bumpDbVersionP = util.promisify( migrateInstance.bumpDbVersion ),
    user = Y.doccirrus.auth.getSUForLocal();

let availableMigrationPathSteps = {
    '2.12': {},
    '2.13': {},
    '2.14': {},
    '2.15': {},
    '2.16': {},
    '2.17': {},
    '2.18': {},
    '2.19': {},
    '3.0': {},
    '3.1': {},
    '3.2': {}
};

Object.keys( availableMigrationPathSteps ).forEach( key => {
    availableMigrationPathSteps[key] = {
        puc: [fakeMigration( key, 'puc' )],
        vprc: [fakeMigration( key, 'vprc' )],
        prc: [fakeMigration( key, 'prc' )],
        dcprc: [fakeMigration( key, 'dcprc' )],
        isd: [fakeMigration( key, 'isd' )]
    };
} );

const minorPath = {from: '2.12', to: '2.15'};
const majorPath = {from: '2.12', to: '3.0'};
const minorAndMajorPath = {from: '2.12', to: '3.2'};

const minorPathCase = [
    {ver: '2.12', sTypes: sTypes},
    {ver: '2.13', sTypes: sTypes},
    {ver: '2.14', sTypes: sTypes}
];

const majorPathCase = minorPathCase.concat( [
    {ver: '2.15', sTypes: sTypes},
    {ver: '2.16', sTypes: sTypes},
    {ver: '2.17', sTypes: sTypes},
    {ver: '2.18', sTypes: sTypes},
    {ver: '2.19', sTypes: sTypes}
] );

const minorAndMajorPathCase = majorPathCase.concat( [
    {ver: '3.0', sTypes: sTypes},
    {ver: '3.1', sTypes: sTypes}
] );

function fakeMigration() {
    return ( user, cb ) => {
        Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'dummy',
            action: 'post',
            data: getDummyDoc()
        }, cb );
    };
}

let dummyCount = 0;

function getDummyDoc() {
    dummyCount++;
    return {
        firstname: `MyName is ${dummyCount}`,
        lastname: `MyLastname is ${dummyCount}`,
        age: dummyCount,
        skipcheck_: true,
        emails: [
            {email: `admin${dummyCount}@doc-cirrus.com`}
        ]
    };
}

describe( 'Migration Tests', function() {
    describe( 'Should return migration chain', function() {
        it( 'Minor version', function() {
            let chain = migrateInstance.initChain( minorPath, availableMigrationPathSteps, sTypes );
            expect( chain ).to.deep.equal( minorPathCase );
        } );
        it( 'Major version', function() {
            let chain = migrateInstance.initChain( majorPath, availableMigrationPathSteps, sTypes );
            expect( chain ).to.deep.equal( majorPathCase );
        } );
        it( 'Major and minor version', function() {
            let chain = migrateInstance.initChain( minorAndMajorPath, availableMigrationPathSteps, sTypes );
            expect( chain ).to.deep.equal( minorAndMajorPathCase );
        } );
    } );
    describe( 'Should bump Db version', function() {
        beforeEach( async function() {
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                action: 'post',
                data: {
                    _id: Y.doccirrus.schemas.admin.getId(),
                    dbVersion: minorPath.from,
                    skipcheck_: true
                }
            } );
        } );
        afterEach( async function() {
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                action: 'delete',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                }
            } );
        } );
        it( 'Minor version', async function() {
            await bumpDbVersionP( minorPath.to, user );

            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                action: 'get',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                }
            } );
            expect( result[0].dbVersion ).to.equal( minorPath.to );
        } );
        it( 'Major version', async function() {
            await bumpDbVersionP( majorPath.to, user );

            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                action: 'get',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                }
            } );
            expect( result[0].dbVersion ).to.equal( majorPath.to );
        } );
        it( 'Major and minor version', async function() {
            await bumpDbVersionP( minorAndMajorPath.to, user );

            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                action: 'get',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                }
            } );
            expect( result[0].dbVersion ).to.equal( minorAndMajorPath.to );
        } );
    } );
    describe( 'Chain Executor', function() { // executes 1 step e.g (2.12 -> 2.13), for all servers in step
        beforeEach( async function() {
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'dummy',
                action: 'delete',
                query: {
                    _id: {$exists: true}
                },
                options: {override: true}
            } );
        } );
        for( let i = 0; i < sTypes.length; i++ ) {
            it( `Should execute one step for ${sTypes[i]} server`, async function() {
                let fn = migrateInstance.getMigrateFnChainExecutor( minorPath.from, sTypes[i], availableMigrationPathSteps );
                const fnP = util.promisify( fn );

                await fnP( user );
                const actual = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'dummy',
                    action: 'get',
                    query: {
                        _id: {$exists: true}
                    }
                } );
                expect( actual.length ).to.equal( 1 );
            } );
        }
    } );
    describe( 'Migration Path', function() {
        it( 'Should return correct migration path from JSON', async function() {
            const getMigratePathP = util.promisify( DCCoreMigrate.getMigratePath );
            const path = await getMigratePathP();
            const ver = `${semver.major( packageJson.version )}.${semver.minor( packageJson.version )}`;
            expect( ver ).to.equal( path.to );
        } );
    } );
} );