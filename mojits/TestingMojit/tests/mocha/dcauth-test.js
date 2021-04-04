
/*global Y, context, expect, it, describe, before, beforeEach, afterEach */

const child = require( 'child_process' );
const events = require( 'events' );

const sinon = require( 'sinon' );

const core = require( 'dc-core' );

// TODO LAM-745
describe( 'Y.doccirrus.auth', function() {

    before( function() {
        // emits a spawn response
        this.emit = ( message, code ) => {
            const event = new events.EventEmitter();

            event.unref = () => {};

            for (const key of ['stdout', 'stderr', 'stdin']) {
                event[key] = new events.EventEmitter();
            }

            setImmediate( () => {
                event.stdout.emit( 'end', message );
                event.emit( 'close' );
                event.emit( 'exit', code );
            } );

            return event;
        };
    } );

    beforeEach( function() {
        // we MUST NOT provide an api for tests
        Y.doccirrus.api.cli.resetIsDcCliAvailable();

        // this api needs a cleaned up
        sinon.stub( Y.doccirrus.auth, 'isPRC' ).returns( false );
        sinon.stub( Y.doccirrus.auth, 'isISD' ).returns( true );

        sinon.stub( core.auth, 'getPUCHost' ).returns( 'puc.example.com' );

        this.stub = sinon.stub( child, 'spawn' );

        this.stub.callsFake( () => this.emit( '', 127 ) );
    } );

    afterEach( function() {
        child.spawn.restore();

        // this api must be cleaned up
        Y.doccirrus.auth.isPRC.restore();
        Y.doccirrus.auth.isISD.restore();

        core.auth.getPUCHost.restore();
    } );

    context( 'given an ISD', function() {

        beforeEach( function() {
            // we MUST NOT provide an api for tests
            Y.doccirrus.api.cli.resetIsDcCliAvailable();
            Y.doccirrus.auth.resetHasDCcli();

            this.stub.withArgs(
                'sudo',
                sinon.match.array.contains( ['dc-cli', '--status'] ),
                sinon.match.any
            ).callsFake( () => this.emit( JSON.stringify( {
                data: [{
                    os: {
                        ips: [ '1.1.1.1' ]
                    },
                    prcs: {
                        id: 'sts'
                    }
                }]
            }, 0 ) ) );

            this.stub.callThrough();
        } );

        describe( '.getMyHost()', function() {

            context( 'given user which is allowed to execute `dc-cli` as super user', function() {

                beforeEach( async function() {
                    this.stub.withArgs(
                        'sudo',
                        sinon.match.array.startsWith( ['-n', '-l'] ),
                        sinon.match.any
                    ).callsFake( () => this.emit( '/bin/dc-cli', 0 ) );
                    // we MUST NOT provide an api for tests
                    await Y.doccirrus.auth.resetPRCHost();
                } );

                it( 'returns the full qualified host name', async function() {
                    const actual = Y.doccirrus.auth.getMyHost();
                    expect( actual ).to.equal( 'sts.hub.example.com' );
                } );

                context( 'given cached positive availability status of `dc-cli`', function() {

                    it( 'returns the host name', async function() {
                        const actual = Y.doccirrus.auth.getMyHost();
                        expect( actual ).to.equal( 'sts.hub.example.com' );
                    } );
                } );
            } );

            context( 'given user which is not allowed to execute `dc-cli` as super user', function() {

                beforeEach( async function() {
                    this.stub.withArgs(
                        'sudo',
                        sinon.match.array.startsWith( ['-n', '-l'] ),
                        sinon.match.any
                    ).callsFake( () => this.emit( '', 1 ) );
                    // we MUST NOT provide an api for tests
                    await Y.doccirrus.auth.resetPRCHost();
                } );

                it( 'returns the local host name', async function() {
                    const actual = Y.doccirrus.auth.getMyHost();

                    expect( actual ).to.not.equal( 'sts.hub.example.com' );
                } );
            } );
        } );
    } );
} );
