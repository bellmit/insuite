
/*global Y, context, expect, it, describe, before, beforeEach, afterEach */
const child = require( 'child_process' );
const events = require( 'events' );

const sinon = require( 'sinon' );

// TODO LAM-745
describe( 'Y.doccirrus.api.cli', function() {

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

        this.stub = sinon.stub( child, 'spawn' );

        this.stub.callsFake( () => this.emit( '', 127 ) );
    } );

    afterEach( function() {
        child.spawn.restore();
    } );

    describe( '.hasDCcli()', function() {

        context( 'given user which is allowed to execute `dc-cli` as super user', function() {

            beforeEach( function() {
                this.stub.withArgs(
                    'sudo',
                    sinon.match.array.startsWith( ['-n', '-l'] ),
                    sinon.match.any
                ).callsFake( () => this.emit( '/bin/dc-cli', 0 ) );
            } );

            it( 'returns object with positive status flag', async function() {
                const actual = await Y.doccirrus.api.cli.hasDCcli();

                expect( actual ).to.deep.equal( {hasDCcli: true} );
            } );

            context( 'with callback', function() {
                it( 'calls callback with object having the positive status flag', async function() {
                    const result = await new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.cli.hasDCcli( {
                            callback: ( error, result ) => {
                                if ( error ) {
                                    return reject( error );
                                }
                                return resolve( result );
                            }
                        } );
                    } );

                    expect( result ).to.deep.equal( {hasDCcli: true} );
                } );
            } );
        } );

        context( 'given user which is not allowed to execute `dc-cli` as super user', function() {

            describe( '.hasDCcli()', function() {

                before( function() {
                    this.stub.withArgs(
                        'sudo',
                        sinon.match.array.startsWith( ['-n', '-l'] ),
                        sinon.match.any
                    ).callsFake( () => this.emit( '', 1 ) );
                } );

                it( 'returns object with negative status flag', async function() {
                    const actual = await Y.doccirrus.api.cli.hasDCcli();

                    expect( actual ).to.deep.equal( {hasDCcli: false} );
                } );
            } );
        } );
    } );
} );
