/*global Y, describe, it, beforeEach, expect*/

const
    fs = require( 'fs' ),
    path = require( 'path' ),
    sinon = require( 'sinon' );

describe( 'BarcodeMiddleware', () => {

    describe( 'handle', () => {
        const request = {connection: {remoteAddress: 'baz'}};
        const response = {};

        beforeEach( () => {
            ['status', 'send', 'writeHead', 'on', 'once', 'emit', 'onend'].forEach(
                // eslint-disable-next-line no-return-assign
                ( method ) => response[method] = sinon.stub().returns( response )
            );
        } );

        describe( 'given type `PDF417`', () => {

            beforeEach( () => {
                request.url = '?type=pdf417';
            } );

            describe( 'given fixed width, dynamic height and code', () => {

                beforeEach( () => {
                    request.url += '&width=752&code=Foo%20Bar%20Baz%20Qux%20%C3%84%C3%BC%C3%B6&height=-1';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/pdf417-default.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 2884
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );

                describe( 'given mime IMAGE_JPG', () => {

                    beforeEach( () => {
                        request.url += '&mime=IMAGE_JPEG';
                    } );

                    it( 'should return barcode as JPEG image', async () => {
                        const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/pdf417.jpeg' ) );
                        const subject = require( '../../../../middleware/dcbarcode' )( Y );
                        const chunks = [];

                        response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                        const promise = new Promise( ( resolve ) => {
                            response.end = sinon.stub().callsFake( () => {
                                expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                                expect( response.writeHead ).has.been.calledWith( 200, {
                                    'Content-Type': 'image/jpeg',
                                    'Content-Length': 9292
                                } );

                                resolve();
                            } );
                        } );

                        await subject( request, response );
                        await promise;
                    } );
                } );
            } );

            describe( 'given fixed width, dynamic height, code and version', () => {

                beforeEach( () => {
                    request.url += '&extra=columns=2%20eclevel=3&code=Foo%20Bar%20Baz%20Qux&width=412&height=-1';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/pdf417.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 2928
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );
        } );

        describe( 'given type `DataMatrix`', () => {

            beforeEach( () => {
                request.url = '?type=datamatrix';
            } );

            describe( 'given fixed width, fixed height and code', () => {

                beforeEach( () => {
                    request.url += '&width=208&code=Foo%20Bar%20Baz%20Qux&height=208';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/datamatrix-default.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 2881
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );

            describe( 'given fixed width, dynamic height, code and extra', () => {

                beforeEach( () => {
                    request.url += '&extra=version=48x48&code=Foo%20Bar%20Baz%20Qux&width=480&height=-1';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/datamatrix.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 10300
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );
        } );

        describe( 'given type `EAN-13`', () => {

            beforeEach( () => {
                request.url = '?type=ean13';
            } );

            describe( 'given fixed width, dynamic height and code', () => {

                beforeEach( () => {
                    request.url += '&width=192&height=-1&code=123456789012';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/ean13-default.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 868
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );

            describe( 'given fixed width, dynamic height, code and extra', () => {

                beforeEach( () => {
                    request.url += '&extra=guardwhitespace=true&code=123456789012&width=480&height=-1';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/ean13.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 4813
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );
        } );

        describe( 'given type `QR Code`', () => {

            beforeEach( () => {
                request.url = '?type=qrcode';
            } );

            describe( 'given fixed width, dynamic height and code', () => {

                beforeEach( () => {
                    request.url += '&width=256&code=https%3A%2F%2Ffoo%2Fbar%3Fqux%3Dbaz%26bar&height=-1';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/qrcode-default.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            //to test if image works, just open a new browser tab and enter this data:
                            //data:image/png;base64,<BASE64STRING>
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 9055
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );

            describe( 'given fixed width, dynamic height, code and extra', () => {

                beforeEach( () => {
                    request.url += '&width=128&code=https%3A%2F%2Ffoo%2Fbar%3Fqux%3Dbaz%26bar&height=-1&extra=eclevel=H';
                } );

                it( 'should return barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/qrcode.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 5991
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );
        } );

        describe( 'given no type', () => {

            describe( 'given fixed width, dynamic height and code', () => {

                beforeEach( () => {
                    request.url = '?width=752&code=Foo%20Bar%20Baz%20Qux%20%C3%84%C3%BC%C3%B6&height=-1';
                } );

                it( 'should return PDF417 barcode as PNG image', async () => {
                    const expected = await fs.promises.readFile( path.join( __dirname, '..', 'fixtures/barcode/pdf417-default.png' ) );
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( Buffer.concat( chunks ).toString( 'base64' ) ).to.be.equal( expected.toString( 'base64' ) );
                            expect( response.writeHead ).has.been.calledWith( 200, {
                                'Content-Type': 'image/png',
                                'Content-Length': 2884
                            } );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );
        } );

        describe( 'given unknown type', () => {

            beforeEach( () => {
                request.url = '?type=foo';
            } );

            describe( 'given fixed width, dynamic height and code', () => {

                beforeEach( () => {
                    request.url += '&width=752&code=Foo%20Bar%20Baz%20Qux%20%C3%84%C3%BC%C3%B6&height=-1';
                } );

                it( 'should return an error', async () => {
                    const subject = require( '../../../../middleware/dcbarcode' )( Y );
                    const chunks = [];

                    // TODO we should return an HTTP 400 here instead

                    response.write = sinon.stub().callsFake( ( chunk ) => chunks.push( chunk ) );

                    const promise = new Promise( ( resolve ) => {
                        response.end = sinon.stub().callsFake( () => {
                            expect( response.writeHead ).has.been.calledWith( 500 );

                            resolve();
                        } );
                    } );

                    await subject( request, response );
                    await promise;
                } );
            } );
        } );
    } );
} );