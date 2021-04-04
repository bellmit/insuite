/**
 * User: michael.kleinert
 * Date: 6/16/20  10:20 AM
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */
/*global Y, expect, it, describe, before, after, afterEach */
describe( 'dcRouteOverride and DCRouteOverrideCollection test.', () => {
    const
        DCRouteOverride = Y.doccirrus.DCRouteOverride,
        DCRouteOverrideCollection = Y.doccirrus.DCRouteOverrideCollection,
        configPathAndHashMatch = {
            pathMatch: "/incase",
            hashMatch: "^#/patient/",
            pathReplace: "/",
            hashReplace: "#/solName/patient/",
            pathStringMatchType: "STRING",
            hashStringMatchType: "REGEXP",
            appName: "solName",
            description: "description of the target",
            appIcon: "/testPath/image.png"
        },
        configPathMatch = {
            pathMatch: "/incase",
            hashMatch: null,
            pathReplace: "/",
            hashReplace: "#/solName/patient/",
            pathStringMatchType: "STRING",
            hashStringMatchType: "REGEXP",
            appName: "solName",
            description: "description of the target",
            appIcon: "/testPath/image.png"
        },
        configHashMatch = {
            pathMatch: null,
            hashMatch: "^#\/patient\/",
            pathReplace: "/",
            hashReplace: "#/solName/patient/",
            pathStringMatchType: "STRING",
            hashStringMatchType: "REGEXP",
            appName: "solName",
            description: "description of the target",
            appIcon: "/testPath/image.png"
        },
        overridePathAndHashMatch = new DCRouteOverride( configPathAndHashMatch ),
        overridePathMatch = new DCRouteOverride( configPathMatch ),
        overrideHashMatch = new DCRouteOverride( configHashMatch );

    let globalWindowCreated = false;
    before( () => {
        if( !Object.prototype.hasOwnProperty.call( global, "window" ) ) {
            // noinspection JSConstantReassignment
            global.window = {};
            globalWindowCreated = true;
        }
        // eslint-disable-next-line no-undef
        if( !Object.prototype.hasOwnProperty.call( window, "location" ) ) {
            global.window.location = {};
        }
        // eslint-disable-next-line no-undef
        if( !Object.prototype.hasOwnProperty.call( window.location, "href" ) ) {
            global.window.location.href = "test";
        }
    } );
    after( () => {
        if( globalWindowCreated ) {
            // noinspection JSConstantReassignment
            delete global.window;
        }
    } );

    describe( 'class: DCRouteOverride', () => {

        it( 'DCRouteOverride.checkMatchType returns true for the correct types', () => {
            expect( DCRouteOverride.checkMatchType( "test" ) ).to.equal( true );
            expect( DCRouteOverride.checkMatchType( /test/ ) ).to.equal( true );
            expect( DCRouteOverride.checkMatchType( () => {
            } ) ).to.equal( true );
            expect( DCRouteOverride.checkMatchType( null ) ).to.equal( true );
            expect( DCRouteOverride.checkMatchType( 0 ) ).to.equal( false );
            expect( DCRouteOverride.checkMatchType( Object.create( null ) ) ).to.equal( false );
        } );

        it( 'DCRouteOverride.checkReplaceType returns true for the correct types', () => {
            expect( DCRouteOverride.checkReplaceType( "test" ) ).to.equal( true );
            expect( DCRouteOverride.checkReplaceType( /test/ ) ).to.equal( true );
            expect( DCRouteOverride.checkReplaceType( null ) ).to.equal( true );
            expect( DCRouteOverride.checkReplaceType( 0 ) ).to.equal( false );
            expect( DCRouteOverride.checkReplaceType( Object.create( null ) ) ).to.equal( false );
            expect( DCRouteOverride.checkReplaceType( () => {
            } ) ).to.equal( false );
        } );

        it( 'DCRouteOverride constructor should create a new object with given parameters', () => {
            expect( overridePathAndHashMatch.pathMatch ).to.equal( configPathAndHashMatch.pathMatch );
            expect( overridePathAndHashMatch.hashMatch ).to.equal( configPathAndHashMatch.hashMatch );
            expect( overridePathAndHashMatch.pathReplace ).to.equal( configPathAndHashMatch.pathReplace );
            expect( overridePathAndHashMatch.hashReplace ).to.equal( configPathAndHashMatch.hashReplace );
            expect( overridePathAndHashMatch.pathStringMatchType ).to.equal( configPathAndHashMatch.pathStringMatchType );
            expect( overridePathAndHashMatch.hashStringMatchType ).to.equal( configPathAndHashMatch.hashStringMatchType );
            expect( overridePathAndHashMatch.appName ).to.equal( configPathAndHashMatch.appName );
            expect( overridePathAndHashMatch.description ).to.equal( configPathAndHashMatch.description );
            expect( overridePathAndHashMatch.appIcon ).to.equal( configPathAndHashMatch.appIcon );
        } );

        describe( 'DCRouteOverride.prototype._hasMatch', () => {
            it( 'returns true for string STRING match', () => {
                expect( overridePathAndHashMatch._hasMatch( configPathAndHashMatch.pathMatch, configPathAndHashMatch.pathMatch, "STRING" ) ).to.equal( true );
            } );
            it( 'returns false for string STRING mismatch', () => {
                expect( overridePathAndHashMatch._hasMatch( "TEST", configPathAndHashMatch.pathMatch, "STRING" ) ).to.equal( false );
            } );
            it( 'returns true for string REGEXP match', () => {
                expect( overridePathAndHashMatch._hasMatch( configPathAndHashMatch.pathMatch, configPathAndHashMatch.pathMatch, "REGEXP" ) ).to.equal( true );
            } );
            it( 'returns false for string REGEXP mismatch', () => {
                expect( overridePathAndHashMatch._hasMatch( "TEST", configPathAndHashMatch.pathMatch, "REGEXP" ) ).to.equal( false );
            } );
            it( 'returns true for RegExp match', () => {
                expect( overridePathAndHashMatch._hasMatch( "TEST", /^TEST/, "REGEXP" ) ).to.equal( true );
            } );
            it( 'returns false for RegExp mismatch', () => {
                expect( overridePathAndHashMatch._hasMatch( "fTEST", /^TEST/, "REGEXP" ) ).to.equal( false );
            } );
        } );

        describe( 'DCRouteOverride.prototype.getSolPath', () => {
            it( 'returns /sol/+appName', () => {
                expect( overridePathAndHashMatch.getSolPath() ).to.equal( `/sol/${overridePathAndHashMatch.appName}` );
            } );
        } );

        describe( 'DCRouteOverride.prototype.getSolIconPath', () => {
            it( 'returns getSolPath + appIcon', () => {
                let localOverride = new DCRouteOverride( overridePathAndHashMatch );
                expect( localOverride.getSolIconPath() ).to.equal( `${localOverride.getSolPath()}${localOverride.appIcon}` );
                localOverride.appIcon = "testPath/image.png";
                expect( localOverride.getSolIconPath() ).to.equal( `${localOverride.getSolPath()}/${localOverride.appIcon}` );
            } );
        } );

        describe( 'DCRouteOverride.prototype.isAllowedPath', () => {
            it( 'returns false if path is not allowed', () => {
                expect( overridePathAndHashMatch.isAllowedPath( "/testNotAllowed", "source" ), '/testNotAllowed => source' ).to.equal( false );
                expect( overridePathAndHashMatch.isAllowedPath( "/testNotAllowed", "target" ), '/testNotAllowed => target' ).to.equal( false );
                expect( overridePathAndHashMatch.isAllowedPath( "/", "source" ), '/ => source' ).to.equal( false );
            } );
            it( 'returns true if path is allowed', () => {
                expect( overridePathAndHashMatch.isAllowedPath( "/incase", "source" ), '/incase => target' ).to.equal( true );
                expect( overridePathAndHashMatch.isAllowedPath( overridePathAndHashMatch.getSolPath(), "source" ), 'solPath => source' ).to.equal( true );
                expect( overridePathAndHashMatch.isAllowedPath( overridePathAndHashMatch.getSolPath(), "target" ), 'solPath => target' ).to.equal( true );
                expect( overridePathAndHashMatch.isAllowedPath( "/", "target" ), '/ => target' ).to.equal( true );
            } );
        } );

        describe( 'DCRouteOverride.prototype.match', () => {
            it( 'hash and path match returns false if no match is given', () => {
                expect( overridePathAndHashMatch.match( "https://prc.dev.dc/incase#/patientbrowser" ), 'https://prc.dev.dc/incase#/patientbrowser' ).to.equal( false );
            } );
            it( 'hash and path match returns true if a match', () => {
                expect( overridePathAndHashMatch.match( "https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser" ), 'https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser' ).to.equal( true );
            } );
            it( 'path match returns false if no match is given', () => {
                expect( overridePathMatch.match( "https://prc.dev.dc/otherpath#/patientbrowser" ), 'https://prc.dev.dc/otherpath#/patientbrowser' ).to.equal( false );
            } );
            it( 'path match returns true if a match', () => {
                expect( overridePathMatch.match( "https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser" ), 'https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser' ).to.equal( true );
            } );
            it( 'hash match returns false if no match is given', () => {
                expect( overrideHashMatch.match( "https://prc.dev.dc/incase#/patientbrowser" ), 'https://prc.dev.dc/incase#/patientbrowser' ).to.equal( false );
            } );
            it( 'hash match returns true if a match', () => {
                expect( overrideHashMatch.match( "https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser" ), 'https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser' ).to.equal( true );
            } );
        } );

        describe( 'DCRouteOverride.prototype.getOverrideURL', () => {
            it( 'targetURL matches overrideURL', () => {
                let
                    sourceURL = "https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser",
                    shouldBeURL = "https://prc.dev.dc/?overriddenRoute=true#/solName/patient/5e008238c204984c0d6733bb/tab/casefile_browser",
                    overrideURL = overridePathAndHashMatch.getOverrideURL( sourceURL );
                expect( overrideURL.toString() ).to.equal( shouldBeURL );
            } );
        } );

        describe( 'DCRouteOverride.prototype.redirectBasedOnSourceURL', () => {
            afterEach( () => {
                // eslint-disable-next-line no-undef
                window.location.href = "UNDEFINED";
            } );

            it( 'routes window.location.href to the correct path', () => {
                let
                    sourceURL = "https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser",
                    targetURL = overridePathAndHashMatch.getOverrideURL( sourceURL );
                overridePathAndHashMatch.redirectBasedOnSourceURL( sourceURL );
                // eslint-disable-next-line no-undef
                expect( window.location.href ).to.equal( targetURL.toString() );
            } );
        } );
    } );

    describe( 'class: DCRouteOverrideCollection', () => {
        let collection = new DCRouteOverrideCollection( [overridePathAndHashMatch, overridePathAndHashMatch] );

        it( 'constructor adds an override', () => {
            expect( collection._items ).to.have.lengthOf( 1 );
            expect( collection._items ).to.contain.deep.members( [overridePathAndHashMatch] );
        } );

        describe( 'DCRouteOverrideCollection.prototype.push', () => {
            it( 'does not add the same override twice', () => {
                collection.push( overridePathAndHashMatch );
                expect( collection._items ).to.have.lengthOf( 1 );
                expect( collection._items ).to.contain.deep.members( [overridePathAndHashMatch] );
            } );
            it( 'but adds another override', () => {
                collection.push( overridePathMatch );
                expect( collection._items ).to.have.lengthOf( 2 );
                expect( collection._items ).to.contain.deep.members( [overridePathAndHashMatch, overridePathMatch] );
            } );
        } );

        describe( 'DCRouteOverrideCollection.prototype.match', () => {
            it( 'returns true if a match is given', () => {
                expect( collection.match( "https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser" ) ).to.have.lengthOf( 2 );
            } );
        } );

        describe( 'DCRouteOverrideCollection.prototype.process', () => {

            afterEach( () => {
                // eslint-disable-next-line no-undef
                window.location.href = "UNDEFINED";
            } );

            it( 'redirects to the correct page for a single result', () => {
                let
                    sourceURL = "https://prc.dev.dc/incase#/patient/5e008238c204984c0d6733bb/tab/casefile_browser",
                    shouldBeURL = "https://prc.dev.dc/?overriddenRoute=true#/solName/patient/5e008238c204984c0d6733bb/tab/casefile_browser";

                collection = new DCRouteOverrideCollection( [overridePathAndHashMatch] );
                collection.process( sourceURL );

                // eslint-disable-next-line no-undef
                expect( window.location.href ).to.equal( shouldBeURL );
            } );
        } );

    } );
} );