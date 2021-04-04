import path from 'path';

import core from 'dc-core';

import mongoose from 'mongoose';

describe( 'loginmojit-controller', function() {

    beforeEach( async function() {

        this.stubs = [
            sinon.stub( core.config, 'load' ).callsFake( ( file ) => ( {
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
            }[path.parse( file ).name] ) )
        ];

        await import( './controller.server.yui' );

        // if we try to load directly or indirectly `dcmongodb` it crashes so for now we create the namespace manually
        const namespace = Y.namespace( 'doccirrus.mongodb' );
        // which also includes to create a dummy method
        namespace.isMultitenant = () => false;
        namespace.runDb = async() => false;
    } );

    afterEach( function() {
        this.stubs.forEach( ( stub ) => stub.restore() );
        Y = null;

        for( const model of Object.keys( mongoose.connection.models ) ) {
            delete mongoose.connection.models[model];
        }
    } );

    describe( 'Y.mojito.controllers.LoginMojit', function() {
        describe( '.browsercheck()', function() {
            beforeEach( function() {
                this.stub = {
                    http: {
                        getRequest: () => true
                    }
                };
            } );

            it( 'throws if no user agent is given', function() {
                expect( () => Y.mojito.controllers.LoginMojit.browsercheck( {} ) ).to.throw( TypeError );
            } );
            context( 'given a supported user agent', function() {
                before( function() {
                    this.fixtures = [
                        // Chrome
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                        // Safari
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
                        // Firefox
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0",
                        "Mozilla/5.0 (Android 4.4; Mobile; rv:86.0) Gecko/86.0 Firefox/86.0",
                        // Edge
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36 Edg/80.0.361.69"
                    ];
                } );
                it( 'returns true if an valid user agent with exact or higher version is given', function() {
                    for( const fixture of this.fixtures ) {
                        let stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( { headers: { "user-agent": fixture } } );
                        const actual = Y.mojito.controllers.LoginMojit.browsercheck( this.stub );
                        expect( actual ).to.be.true;
                        stub.restore();
                    }
                } );
            } );
            context( 'given an unsupported user agent', function() {
                before( function() {
                    this.fixtures = [
                        // Chrome
                        "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36",
                        // Samsung Internet
                        "Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.1 Chrome/79.0.3945.136 Mobile Safari/537.36",
                        // Safari
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/10 Safari/605.1.15",
                        // Firefox
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/59.0",
                        "Mozilla/5.0 (Android 4.4; Mobile; rv:86.0) Gecko/86.0 Firefox/59.0",
                        // Edge
                        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10122"
                    ];
                } );
                it( 'returns false if an valid user agent with lower version than required is given', function() {
                    for( const fixture of this.fixtures ) {
                        let stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( { headers: { "user-agent": fixture } } );
                        const actual = Y.mojito.controllers.LoginMojit.browsercheck( this.stub );
                        expect( actual ).to.be.false;
                        stub.restore();
                    }
                } );
            } );
            context( 'given invalid user agent', function() {
                beforeEach( function() {
                    this.fixtures = [
                        "foo"
                    ];
                } );
                it( 'return false if an invalid user agent is given', function() {
                    sinon.stub( this.stub.http, 'getRequest' ).returns( { headers: this.fixtures[0] } );
                    const actual = Y.mojito.controllers.LoginMojit.browsercheck( this.stub );
                    expect( actual ).to.be.false;
                    this.stub.http.getRequest.restore();
                } );
            } );
            context( 'given VPRC', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isVPRC' );
                    stub.returns( true );
                    this.stubs.push( stub );

                    this.fixtures = [
                        "Mozilla/4.0 (compatible; ms-office)"
                    ];
                } );
                it( 'returns true for ms office user agent (medneo shortcut)', function() {
                    for( let i = 0; i < this.fixtures.length; i++ ) {
                        let stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( { headers: { "user-agent": this.fixtures[i] } } );
                        const actual = Y.mojito.controllers.LoginMojit.browsercheck( this.stub );
                        expect( actual ).to.be.true;
                        stub.restore();
                    }
                } );
            } );
        } );
        describe( '.getMinimalVersions()', function() {
            it( 'returns an object with browser names and their minimum version', function() {
                const actual = Y.doccirrus.browsersinfo.getMinimalVersions();
                expect( Object.keys( actual ) ).to.include.all( 'chrome', 'ff', 'safari', 'safariMobile', 'android', 'microsoftEdgeVersion', 'samsungInternet' );
            } );
        } );
        describe( '.wrongbrowser()', function() {
            beforeEach( function() {
                this.stub = {
                    ac: {
                        done: () => true
                    }
                };
                this.fixtures = {
                    calledWith: {
                        "url": "/login?browserOk=true",
                        "chromeVersion": 80,
                        "ffVersion": 72,
                        "safariVersion": 12,
                        "microsoftEdgeVersion": 80,
                        "labelNoteI18n": "Please Note",
                        "text1I18n": "For using our services, you need a current browser with HTML5 support.",
                        "text2I18n": "Your browser does not seem to support this. You can use our services, but we offer no support then!",
                        "installNowI18n": "Install now",
                        "buttonNextI18n": "Next"
                    }
                };
            } );
            it( 'responds with success', function() {
                const spy = sinon.spy( this.stub.ac, 'done' );
                Y.mojito.controllers.LoginMojit.wrongbrowser( this.stub.ac );

                expect( spy.called ).to.be.true;
                expect( spy.calledWith( this.fixtures.calledWith ) ).to.be.true;
                spy.restore();
            } );
            context( 'given PUC', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isPUC' );
                    stub.returns( true );
                    this.stubs.push( stub );

                    this.fixtures = {
                        calledWith: {
                            "url": "/intime?browserOk=true",
                            "chromeVersion": 80,
                            "ffVersion": 72,
                            "safariVersion": 12,
                            "microsoftEdgeVersion": 80,
                            "labelNoteI18n": "Please Note",
                            "text1I18n": "For using our services, you need a current browser with HTML5 support.",
                            "text2I18n": "Your browser does not seem to support this. You can use our services, but we offer no support then!",
                            "installNowI18n": "Install now",
                            "buttonNextI18n": "Next"
                        }
                    };
                } );
                it( '.done() should be called', function() {
                    const spy = sinon.spy( this.stub.ac, 'done' );
                    Y.mojito.controllers.LoginMojit.wrongbrowser( this.stub.ac );

                    expect( spy.called ).to.be.true;
                    expect( spy.calledWith( this.fixtures.calledWith ) ).to.be.true;
                    spy.restore();
                } );
            } );
        } );
        describe( '.supportlogin()', function() {
            beforeEach( function() {
                this.stub = {
                    ac: {
                        done: () => true
                    }
                };
                let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                stub.returns( true );
                this.stubs.push( stub );
            } );
            // new context given prc
            it( '.done() should be called', function() {
                const spy = sinon.spy( Y.doccirrus.utils, 'redirect' );
                Y.mojito.controllers.LoginMojit.supportlogin( this.stub.ac );

                expect( spy.called ).to.be.true;
                spy.restore();
            } );
            context( 'given no PRC', function() {
                beforeEach( function() {
                    this.stubs.find( ( stub ) => stub.displayName === 'isPRC' ).restore();
                    let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                    stub.returns( false );
                    this.stubs.push( stub );
                } );
                it( '.done() should be called', function() {
                    const spy = sinon.spy( this.stub.ac, 'done' );
                    Y.mojito.controllers.LoginMojit.supportlogin( this.stub.ac );

                    expect( spy.called ).to.be.true;
                    expect( spy.calledWith( {}, { http: {} } ) ).to.be.true;
                    spy.restore();
                } );
            } );
        } );
        describe( '.login()', function() {
            beforeEach( function() {
                this.stub = {
                    http: {
                        getRequest: () => true,
                        getResponse: () => true,
                        addHeader: () => true
                    },
                    params: {
                        getFromUrl: () => true
                    },
                    done: () => true
                };
            } );
            it( 'throws if no ActionContext is given', function() {
                expect( () => Y.mojito.controllers.LoginMojit.login( {} ) ).to.throw( TypeError );
            } );
            it( 'throws TypeError with browserOk set to false and invalid user agent and no host', function() {
                const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                let stub = sinon.stub( this.stub.http, 'getRequest' );
                stub.returns( {
                    headers: {
                        "user-agent": "foo"
                    }
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.http, 'getResponse' );
                stub.returns( {
                    setHeader: () => true,
                    redirect: () => true
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.params, 'getFromUrl' );
                stub.returns( {
                    browserOk: false,
                    ref: ''
                } );
                this.stubs.push( stub );

                expect( () => Y.mojito.controllers.LoginMojit.login( this.stub ) ).to.throw( TypeError );
                expect( addHeaderSpy.calledThrice );
                addHeaderSpy.restore();
            } );
            it( 'returns undefined with browserOk set to false and invalid user agent and given host', function() {
                const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                let stub = sinon.stub( this.stub.http, 'getRequest' );
                stub.returns( {
                    headers: {
                        "user-agent": "foo",
                        "host": "bar"
                    }
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.http, 'getResponse' );
                stub.returns( {
                    setHeader: () => true,
                    redirect: () => true
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.params, 'getFromUrl' );
                stub.returns( {
                    browserOk: false,
                    ref: ''
                } );
                this.stubs.push( stub );

                const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                expect( actual ).to.be.undefined;

                expect( addHeaderSpy.calledThrice );
                addHeaderSpy.restore();
            } );
            it( 'returns undefined with browserOk set to false and invalid user agent and given host with correct syntax', function() {
                const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                let stub = sinon.stub( this.stub.http, 'getRequest' );
                stub.returns( {
                    headers: {
                        "user-agent": "foo",
                        "host": "bar.qux"
                    }
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.http, 'getResponse' );
                stub.returns( {
                    setHeader: () => true,
                    redirect: () => true
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.params, 'getFromUrl' );
                stub.returns( {
                    browserOk: false,
                    ref: ''
                } );
                this.stubs.push( stub );

                const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                expect( actual ).to.be.undefined;

                expect( addHeaderSpy.calledThrice );
                addHeaderSpy.restore();
            } );
            it( 'returns undefined with browserOk set to true and trial set to true and valid user agent and unauthenticated request', function() {
                const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                let stub = sinon.stub( this.stub.http, 'getRequest' );
                stub.returns( {
                    headers: {
                        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                        "host": "bar"
                    },
                    context: {
                        lang: "foo"
                    },
                    isAuthenticated: () => false
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.http, 'getResponse' );
                stub.returns( {
                    setHeader: () => true,
                    redirect: () => true
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.params, 'getFromUrl' );
                stub.returns( {
                    browserOk: true,
                    ref: '',
                    trial: true
                } );
                this.stubs.push( stub );

                const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                expect( actual ).to.be.undefined;

                expect( addHeaderSpy.calledThrice ).to.be.true;
                addHeaderSpy.restore();
            } );
            it( 'returns undefined with browserOk set to true and valid user agent and unauthenticated request', function() {
                const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                let stub = sinon.stub( this.stub.http, 'getRequest' );
                stub.returns( {
                    headers: {
                        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                        "host": "bar"
                    },
                    context: {
                        lang: "foo"
                    },
                    isAuthenticated: () => false
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.http, 'getResponse' );
                stub.returns( {
                    setHeader: () => true,
                    redirect: () => true
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.params, 'getFromUrl' );
                stub.returns( {
                    browserOk: true,
                    ref: ''
                } );
                this.stubs.push( stub );

                const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                expect( actual ).to.be.undefined;

                expect( addHeaderSpy.calledThrice ).to.be.true;
                addHeaderSpy.restore();
            } );
            it( 'returns undefined with browserOk set to true and valid user agent and authenticated request', function() {
                const redirectSpy = sinon.spy( Y.doccirrus.utils, 'redirect' );
                const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                let stub = sinon.stub( this.stub.http, 'getRequest' );
                stub.returns( {
                    headers: {
                        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                        "host": "bar"
                    },
                    context: {
                        lang: "foo"
                    },
                    isAuthenticated: () => true
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.http, 'getResponse' );
                stub.returns( {
                    setHeader: () => true,
                    redirect: () => true
                } );
                this.stubs.push( stub );

                stub = sinon.stub( this.stub.params, 'getFromUrl' );
                stub.returns( {
                    browserOk: true,
                    ref: ''
                } );
                this.stubs.push( stub );

                const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                expect( actual ).to.be.undefined;

                expect( addHeaderSpy.calledThrice );
                addHeaderSpy.restore();
                expect( redirectSpy.called ).to.be.true;
                expect( redirectSpy.calledOnce ).to.be.true;
                expect( redirectSpy.calledOnceWithExactly( '/', this.stub ) ).to.be.true;
                redirectSpy.restore();
            } );
            context( 'given PUC', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isPUC' );
                    stub.returns( true );
                    this.stubs.push( stub );

                    this.fixtures = {
                        calledWith: "/intime/patient"
                    };
                } );
                it( 'redirects to /intime/patient', function() {
                    const redirectSpy = sinon.spy( Y.doccirrus.utils, 'redirect' );

                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        headers: {
                            "user-agent": "foo",
                            "host": "bar"
                        }
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.http, 'getResponse' );
                    stub.returns( {
                        setHeader: () => true,
                        redirect: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.params, 'getFromUrl' );
                    stub.returns( {
                        browserOk: false
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                    expect( actual ).to.be.undefined;

                    expect( redirectSpy.calledOnce ).to.be.true;
                    expect( redirectSpy.calledOnceWithExactly( this.fixtures.calledWith, this.stub ) ).to.be.true;
                    redirectSpy.restore();
                } );
            } );
            context( 'given MTS system', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.mongodb, 'isMultitenant' );
                    stub.returns( true );
                    this.stubs.push( stub );

                    stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                    stub.returns( false );
                    this.stubs.push( stub );
                } );
                it( 'login and redirect to /', function() {
                    const redirectSpy = sinon.spy( Y.doccirrus.utils, 'redirect' );
                    const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        headers: {
                            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                            "host": "bar"
                        },
                        context: {
                            lang: "foo"
                        },
                        isAuthenticated: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.http, 'getResponse' );
                    stub.returns( {
                        setHeader: () => true,
                        redirect: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.params, 'getFromUrl' );
                    stub.returns( {
                        browserOk: true,
                        ref: 'logout'
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                    expect( actual ).to.be.undefined;

                    expect( addHeaderSpy.calledThrice );
                    addHeaderSpy.restore();
                    expect( redirectSpy.called ).to.be.true;
                    expect( redirectSpy.calledOnce ).to.be.true;
                    expect( redirectSpy.calledOnceWithExactly( '/', this.stub ) ).to.be.true;
                    redirectSpy.restore();
                } );
            } );
            context( 'given PRC', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                    stub.returns( true );
                    this.stubs.push( stub );
                } );
                it( 'login and redirect to /', function() {
                    const redirectSpy = sinon.spy( Y.doccirrus.utils, 'redirect' );
                    const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        headers: {
                            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                            "host": "bar"
                        },
                        context: {
                            lang: "foo"
                        },
                        isAuthenticated: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.http, 'getResponse' );
                    stub.returns( {
                        setHeader: () => true,
                        redirect: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.params, 'getFromUrl' );
                    stub.returns( {
                        browserOk: true,
                        ref: 'logout'
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                    expect( actual ).to.be.undefined;

                    expect( addHeaderSpy.calledThrice );
                    addHeaderSpy.restore();
                    expect( redirectSpy.called ).to.be.true;
                    expect( redirectSpy.calledOnce ).to.be.true;
                    expect( redirectSpy.calledOnceWithExactly( '/', this.stub ) ).to.be.true;
                    redirectSpy.restore();
                } );
            } );
            context( 'given DCPRCRealm', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isDCPRCRealm' );
                    stub.returns( true );
                    this.stubs.push( stub );
                } );
                it( 'login and redirect to /', function() {
                    const redirectSpy = sinon.spy( Y.doccirrus.utils, 'redirect' );
                    const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        headers: {
                            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                            "host": "bar"
                        },
                        context: {
                            lang: "foo"
                        },
                        isAuthenticated: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.http, 'getResponse' );
                    stub.returns( {
                        setHeader: () => true,
                        redirect: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.params, 'getFromUrl' );
                    stub.returns( {
                        browserOk: true,
                        ref: 'logout'
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                    expect( actual ).to.be.undefined;

                    expect( addHeaderSpy.calledThrice );
                    addHeaderSpy.restore();
                    expect( redirectSpy.called ).to.be.true;
                    expect( redirectSpy.calledOnce ).to.be.true;
                    expect( redirectSpy.calledOnceWithExactly( '/', this.stub ) ).to.be.true;
                    redirectSpy.restore();
                } );
            } );
            context( 'given VPRC and main (0) tenant', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isVPRCAdmin' );
                    stub.returns( true );
                    this.stubs.push( stub );
                } );
                it( 'login and redirect to /', function() {
                    const redirectSpy = sinon.spy( Y.doccirrus.utils, 'redirect' );
                    const addHeaderSpy = sinon.spy( this.stub.http, 'addHeader' );

                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        headers: {
                            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36",
                            "host": "bar"
                        },
                        context: {
                            lang: "foo"
                        },
                        isAuthenticated: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.http, 'getResponse' );
                    stub.returns( {
                        setHeader: () => true,
                        redirect: () => true
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.params, 'getFromUrl' );
                    stub.returns( {
                        browserOk: true,
                        ref: 'logout'
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.login( this.stub );
                    expect( actual ).to.be.undefined;

                    expect( addHeaderSpy.calledThrice );
                    addHeaderSpy.restore();
                    expect( redirectSpy.called ).to.be.true;
                    expect( redirectSpy.calledOnce ).to.be.true;
                    expect( redirectSpy.calledOnceWithExactly( '/', this.stub ) ).to.be.true;
                    redirectSpy.restore();
                } );
            } );
        } );
        describe( '.firstLogin()', function() {
            beforeEach( function() {
                this.stub = {
                    http: {
                        getRequest: () => true,
                        getResponse: () => true,
                        addHeader: () => true
                    },
                    params: {
                        getFromUrl: () => true
                    },
                    done: () => true
                };
                let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                stub.yieldsTo( 'callback', undefined, true );
                this.stubs.push( stub );
            } );
            it( 'throws if no ActionContext is given', function() {
                expect( () => Y.mojito.controllers.LoginMojit.firstLogin( {} ) ).to.throw( TypeError );
            } );
            context( 'given no PRC', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                    stub.returns( false );
                    this.stubs.push( stub );

                    stub = sinon.stub( Y.doccirrus.auth, 'isISD' );
                    stub.returns( true );
                    this.stubs.push( stub );

                    stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                    stub.returns( true );
                    this.stubs.push( stub );
                } );
                it( 'returns undefined', function() {
                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        host: ''
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.firstLogin( this.stub );
                    expect( actual ).to.be.undefined;
                } );
                context( 'given correct host data', function() {
                    beforeEach( function() {
                        this.stubs.find( ( stub ) => stub.displayName === 'isHexTenantId' ).restore();
                        let stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                        stub.returns( false );
                        this.stubs.push( stub );

                        stub = sinon.stub( Y.doccirrus.auth, 'isDCPRCRealm' );
                        stub.returns( true );
                        this.stubs.push( stub );

                        stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( {
                            host: 'foo.bar'
                        } );
                        this.stubs.push( stub );
                    } );
                    it( 'returns undefined', function() {
                        const actual = Y.mojito.controllers.LoginMojit.firstLogin( this.stub );
                        expect( actual ).to.be.undefined;
                    } );
                } );
            } );
            context( 'given no ISD', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                    stub.returns( true );
                    this.stubs.push( stub );

                    stub = sinon.stub( Y.doccirrus.auth, 'isISD' );
                    stub.returns( false );
                    this.stubs.push( stub );
                } );
                it( 'returns undefined', function() {
                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        host: ''
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.firstLogin( this.stub );
                    expect( actual ).to.be.undefined;
                } );
                // silly test, will never occur
                context( 'tenantId is undefined', function() {
                    beforeEach( function() {
                        let stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                        stub.returns( true );
                        this.stubs.push( stub );

                        this.host = String( 'a' );
                    } );
                    it( 'responds with error 404 tenant not found and returns undefined', function() {
                        const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                        let stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( {
                            host: this.host
                        } );
                        this.stubs.push( stub );

                        // eslint-disable-next-line no-proto
                        stub = sinon.stub( this.host.__proto__, 'split' );
                        stub.returns( [undefined, undefined] );
                        this.stubs.push( stub );

                        const actual = Y.mojito.controllers.LoginMojit.firstLogin( this.stub );
                        expect( actual ).to.be.undefined;
                        expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 404, 'Tenant not Found' ) ).to.be.true;
                        reportErrorJSONSpy.restore();
                    } );
                } );
            } );
            context( 'given faulty database connection', function() {
                beforeEach( function() {
                    let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                    stub.returns( true );
                    this.stubs.push( stub );

                    stub = sinon.stub( Y.doccirrus.auth, 'isISD' );
                    stub.returns( false );
                    this.stubs.push( stub );

                    this.stubs.find( ( stub ) => stub.displayName === 'runDb' ).restore();
                    stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                    stub.yieldsTo( 'callback', true, undefined );
                    this.stubs.push( stub );
                } );
                it( 'returns undefined', function() {
                    const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        host: ''
                    } );
                    this.stubs.push( stub );

                    const actual = Y.mojito.controllers.LoginMojit.firstLogin( this.stub );
                    expect( actual ).to.be.undefined;
                    expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 500, 'server error' ) ).to.be.true;
                    reportErrorJSONSpy.restore();
                } );
            } );
        } );
        describe( '.regfirstlogin()', function() {
            beforeEach( function() {
                this.stub = {
                    http: {
                        getRequest: () => true,
                        getResponse: () => true
                    },
                    params: {
                        getFromMerged: () => true,
                        getFromUrl: () => true
                    },
                    done: () => true
                };
                let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                stub.yieldsTo( 'callback', undefined, true );
                this.stubs.push( stub );
            } );
            it( 'throws if no ActionContext is given', function() {
                expect( () => Y.mojito.controllers.LoginMojit.regfirstlogin( {} ) ).to.throw( TypeError );
            } );
            context( 'given host', function() {
                context( 'given no PRC', function() {
                    beforeEach( function() {
                        let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                        stub.returns( false );
                        this.stubs.push( stub );

                        stub = sinon.stub( Y.doccirrus.auth, 'isISD' );
                        stub.returns( true );
                        this.stubs.push( stub );

                        stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                        stub.returns( true );
                        this.stubs.push( stub );

                        stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( {
                            host: ''
                        } );
                        this.stubs.push( stub );
                    } );
                    it( 'calls reportErrorJSON with 400 Invalid parameters and returns undefined', function() {
                        const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                        const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                        expect( actual ).to.be.undefined;

                        expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                        reportErrorJSONSpy.restore();
                    } );
                    context( 'given token', function() {
                        beforeEach( function() {
                            this.stubs.find( ( stub ) => stub.displayName === 'isHexTenantId' ).restore();
                            let stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                            stub.returns( false );
                            this.stubs.push( stub );

                            stub = sinon.stub( Y.doccirrus.auth, 'isDCPRCRealm' );
                            stub.returns( true );
                            this.stubs.push( stub );
                        } );
                        it( 'calls reportErrorJSON with 400 Invalid parameters and returns undefined', function() {
                            let stub = sinon.stub( this.stub.params, 'getFromMerged' );
                            stub.returns( {
                                token: 'a'
                            } );
                            this.stubs.push( stub );

                            const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                            const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                            expect( actual ).to.be.undefined;

                            expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                            reportErrorJSONSpy.restore();
                        } );
                        context( 'given too long token', function() {
                            it( 'calls reportErrorJSON with 400 Invalid parameters and returns undefined', function() {
                                let stub = sinon.stub( this.stub.params, 'getFromMerged' );
                                stub.returns( {
                                    token: 'foobarquxquzasdf1234567890',
                                    password: 'bar'
                                } );
                                this.stubs.push( stub );

                                const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                                expect( actual ).to.be.undefined;

                                expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                                reportErrorJSONSpy.restore();
                            } );
                        } );
                        context( 'given password', function() {
                            beforeEach( function() {
                                let stub = sinon.stub( this.stub.params, 'getFromMerged' );
                                stub.returns( {
                                    token: 'foo',
                                    password: 'bar'
                                } );
                                this.stubs.push( stub );
                            } );
                            context( 'given id', function() {
                                beforeEach( function() {
                                    this.stubs.find( ( stub ) => stub.displayName === 'getFromMerged' ).restore();

                                    let stub = sinon.stub( this.stub.params, 'getFromMerged' );
                                    stub.returns( {
                                        token: 'foo',
                                        password: 'bar',
                                        id: 'qux'
                                    } );
                                    this.stubs.push( stub );
                                } );
                                it( 'calls reportErrorJSON with 400 Invalid parameters and returns undefined', function() {
                                    const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                    const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                                    expect( actual ).to.be.undefined;

                                    expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                                    reportErrorJSONSpy.restore();
                                } );
                            } );
                            it( 'calls reportErrorJSON with 400 Invalid parameters and returns undefined', function() {
                                const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                                expect( actual ).to.be.undefined;

                                expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                                reportErrorJSONSpy.restore();
                            } );
                            context( 'given mocked runDb', function() {
                                beforeEach( function() {
                                    this.ReferenceErrors = [
                                        {
                                            error: undefined,
                                            result: undefined
                                        }
                                    ];
                                    this.runDbFixtures = [
                                        {
                                            error: undefined,
                                            result: []
                                        },
                                        {
                                            error: undefined,
                                            result: [{}]
                                        },
                                        {
                                            error: undefined,
                                            result: [
                                                {
                                                    pwResetToken: undefined
                                                }]
                                        },
                                        {
                                            error: undefined,
                                            result: [
                                                {
                                                    pwResetToken: 'foo'
                                                }]
                                        }
                                    ];

                                    this.stubs.find( ( stub ) => stub.displayName === 'runDb' ).restore();
                                } );
                                it( 'throws TypeError', function() {
                                    for( const fixture of this.ReferenceErrors ) {
                                        let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                                        stub.yieldsTo( 'callback', fixture.error, fixture.result );

                                        // eslint-disable-next-line no-loop-func
                                        expect( () => Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub ) ).to.throw( TypeError );
                                        stub.restore();
                                    }
                                } );
                                context( 'given no password reset tokens', function() {
                                    beforeEach( function() {
                                        this.fixture = {
                                            error: undefined,
                                            result: []
                                        };
                                        let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                                        stub.yieldsTo( 'callback', this.fixture.error, this.fixture.result );
                                        this.stubs.push( stub );
                                    } );
                                    it( 'calls reportErrorJSON with 400 Invalid parameters and returns undefined', function() {
                                        const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                        // eslint-disable-next-line no-loop-func
                                        const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );

                                        expect( actual ).to.be.undefined;
                                        expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                                        reportErrorJSONSpy.restore();
                                    } );
                                } );
                                context( 'given empty data', function() {
                                    beforeEach( function() {
                                        this.fixture = {
                                            error: undefined,
                                            result: [{}]
                                        };

                                        let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                                        stub.yieldsTo( 'callback', this.fixture.error, this.fixture.result );
                                        this.stubs.push( stub );
                                    } );
                                    it( 'calls reportErrorJSON with 403 Already set password and returns undefined', function() {
                                        const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                        // eslint-disable-next-line no-loop-func
                                        const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );

                                        expect( actual ).to.be.undefined;
                                        expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 403, 'Already Set Password' ) ).to.be.true;
                                        reportErrorJSONSpy.restore();
                                    } );
                                } );
                                context( 'given undefined password reset token', function() {
                                    beforeEach( function() {
                                        this.fixture = {
                                            error: undefined,
                                            result: [
                                                {
                                                    pwResetToken: undefined
                                                }]
                                        };

                                        let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                                        stub.yieldsTo( 'callback', this.fixture.error, this.fixture.result );
                                        this.stubs.push( stub );
                                    } );
                                    it( 'calls reportErrorJSON with 403 Already set password and returns undefined', function() {
                                        const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                        // eslint-disable-next-line no-loop-func
                                        const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );

                                        expect( actual ).to.be.undefined;
                                        expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 403, 'Already Set Password' ) ).to.be.true;
                                        reportErrorJSONSpy.restore();
                                    } );
                                } );
                                context( 'given password reset token set as something different than required', function() {
                                    beforeEach( function() {
                                        this.fixture = {
                                            error: undefined,
                                            result: [
                                                {
                                                    pwResetToken: 'bar'
                                                }]
                                        };

                                        let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                                        stub.yieldsTo( 'callback', this.fixture.error, this.fixture.result );
                                        this.stubs.push( stub );
                                    } );
                                    it( 'calls reportErrorJSON with 400 Invalid Token and returns undefined', function() {
                                        const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                        // eslint-disable-next-line no-loop-func
                                        const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );

                                        expect( actual ).to.be.undefined;
                                        expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid Token' ) ).to.be.true;
                                        reportErrorJSONSpy.restore();
                                    } );
                                } );
                                context( 'given password reset token set to the same value as the token', function() {
                                    beforeEach( function() {
                                        this.fixture = {
                                            error: undefined,
                                            // eslint-disable-next-line max-lines
                                            result: [
                                                {
                                                    pwResetToken: 'foo'
                                                }]
                                        };

                                        let stub = sinon.stub( this.stub.http, 'getResponse' );
                                        stub.returns( {
                                            setHeader: () => true,
                                            redirect: () => true
                                        } );
                                        this.stubs.push( stub );

                                        this.stubbedMongoDb = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                                        this.stubbedMongoDb.withArgs( sinon.match( {
                                            action: 'get',
                                            model: 'identity'
                                        } ) ).yieldsTo( 'callback', this.fixture.error, this.fixture.result );
                                        this.stubs.push( this.stubbedMongoDb );
                                    } );
                                    it( 'redirect to /login and return undefined', function() {
                                        this.stubbedMongoDb.withArgs( sinon.match( {
                                            action: 'put',
                                            model: 'identity'
                                        } ) ).callsArgWith( 1, true, undefined );
                                        const redirectSpy = sinon.spy( Y.doccirrus.utils, 'redirect' );

                                        // eslint-disable-next-line no-loop-func
                                        const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );

                                        expect( actual ).to.be.undefined;
                                        expect( redirectSpy.calledOnceWithExactly( '/login', this.stub ) ).to.be.true;
                                        redirectSpy.restore();
                                    } );
                                } );
                            } );
                        } );
                    } );
                } );
                context( 'given no ISD', function() {
                    beforeEach( function() {
                        let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                        stub.returns( true );
                        this.stubs.push( stub );

                        stub = sinon.stub( Y.doccirrus.auth, 'isISD' );
                        stub.returns( false );
                        this.stubs.push( stub );

                        stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( {
                            host: ''
                        } );
                        this.stubs.push( stub );
                    } );
                    it( 'calls reportErrorJSON with 400 invalid parameters and returns undefined', function() {
                        const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                        const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                        expect( actual ).to.be.undefined;

                        expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                        reportErrorJSONSpy.restore();
                    } );
                    context( 'tenantId is undefined', function() {
                        beforeEach( function() {
                            let stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                            stub.returns( true );
                            this.stubs.push( stub );

                            this.stubs.find( ( stub ) => stub.displayName === 'getRequest' ).restore();

                            this.host = String( 'a' );
                        } );
                        it( 'calls reportErrorJSON with 404 tenant not found and returns undefined', function() {
                            const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                            let stub = sinon.stub( this.stub.http, 'getRequest' );
                            stub.returns( {
                                host: this.host
                            } );
                            this.stubs.push( stub );

                            // eslint-disable-next-line no-proto
                            stub = sinon.stub( this.host.__proto__, 'split' );
                            stub.returns( [undefined, undefined] );
                            this.stubs.push( stub );

                            const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                            expect( actual ).to.be.undefined;
                            expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 404, 'Tenant not Found' ) ).to.be.true;
                            reportErrorJSONSpy.restore();
                        } );
                    } );
                    context( 'given token', function() {
                        beforeEach( function() {
                            let stub = sinon.stub( Y.doccirrus.auth, 'isHexTenantId' );
                            stub.returns( false );
                            this.stubs.push( stub );

                            stub = sinon.stub( Y.doccirrus.auth, 'isDCPRCRealm' );
                            stub.returns( true );
                            this.stubs.push( stub );

                            this.token = 'a';
                        } );
                        context( 'given password', function() {
                            it( 'calls reportErrorJSON with 400 invalid parameters and returns undefined', function() {
                                let stub = sinon.stub( this.stub.params, 'getFromMerged' );
                                stub.returns( {
                                    token: this.token,
                                    password: 'bar'
                                } );
                                this.stubs.push( stub );

                                const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                                const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                                expect( actual ).to.be.undefined;

                                expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                                reportErrorJSONSpy.restore();
                            } );
                        } );
                    } );
                } );
                context( 'given PRC', function() {
                    beforeEach( function() {
                        let stub = sinon.stub( Y.doccirrus.auth, 'isPRC' );
                        stub.returns( true );
                        this.stubs.push( stub );

                        stub = sinon.stub( this.stub.http, 'getRequest' );
                        stub.returns( {
                            host: ''
                        } );
                        this.stubs.push( stub );
                    } );
                    context( 'given token and password', function() {
                        it( 'calls reportErrorJSON and returns undefined', function() {
                            let stub = sinon.stub( this.stub.params, 'getFromMerged' );
                            stub.returns( {
                                token: 'foo',
                                password: 'bar'
                            } );
                            this.stubs.push( stub );

                            const reportErrorJSONSpy = sinon.spy( Y.doccirrus.utils, 'reportErrorJSON' );

                            const actual = Y.mojito.controllers.LoginMojit.regfirstlogin( this.stub );
                            expect( actual ).to.be.undefined;

                            expect( reportErrorJSONSpy.calledOnceWithExactly( this.stub, 400, 'Invalid parameters' ) ).to.be.true;
                            reportErrorJSONSpy.restore();
                        } );
                    } );
                } );
            } );
        } );
        describe( '.readContact()', function() {
            beforeEach( function() {
                this.stub = {
                    http: {
                        getRequest: () => true
                    },
                    params: {
                        getFromUrl: () => true
                    },
                    done: () => true
                };
                let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                stub.yieldsTo( 'callback', undefined, true );
                this.stubs.push( stub );
            } );
            it( 'throws a TypeError if no ActionContext is given', function() {
                expect( () => Y.mojito.controllers.LoginMojit.readContact( {} ) ).to.throw( TypeError );
            } );
            context( 'invalid ActionContext', function() {
                it( 'throws an Error no valid request is given', function() {
                    expect( () => Y.mojito.controllers.LoginMojit.readContact( this.stub ) ).to.throw( Error );
                } );
                it( 'throws an Error no valid params is given', function() {
                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        cid: 'foo'
                    } );
                    this.stubs.push( stub );
                    expect( () => Y.mojito.controllers.LoginMojit.readContact( this.stub ) ).to.throw( Error );
                } );
            } );
            context( 'valid ActionContext', function() {
                beforeEach( function() {
                    let stub = sinon.stub( this.stub.http, 'getRequest' );
                    stub.returns( {
                        cid: 'foo'
                    } );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.stub.params, 'getFromUrl' );
                    stub.returns( {
                        cid: 'foo'
                    } );
                    this.stubs.push( stub );
                } );
                it( 'throws an Error', function() {
                    expect( () => Y.mojito.controllers.LoginMojit.readContact( this.stub ) ).to.throw( Error );
                } );
                context( 'given Y.doccirrus.mongodb.getModel returns data', function() {
                    beforeEach( function() {
                        this.stubbedModel = {
                            get: () => true
                        };

                        let stub = sinon.stub( this.stubbedModel, 'get' );
                        stub.yields( true, undefined );
                        this.stubs.push( stub );

                        Y.doccirrus.mongodb.getModel = () => false;
                        stub = sinon.stub( Y.doccirrus.mongodb, 'getModel' );
                        stub.yields( undefined, this.stubbedModel );
                        this.stubs.push( stub );
                    } );
                    it( 'calls identityModelCb and returns undefined', function() {
                        const actual = Y.mojito.controllers.LoginMojit.readContact( this.stub );
                        expect( actual ).to.be.undefined;
                    } );
                } );
            } );

        } );
    } );
} );
