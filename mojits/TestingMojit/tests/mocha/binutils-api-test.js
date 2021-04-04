/**
 * User: maximilian.kramp
 * Date: 11/5/20  4:04 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, should, expect, describe */

const
    {formatPromiseResult} = require( 'dc-core' ).utils,
    binutilsapi = Y.doccirrus.binutilsapi,
    // notExistingBinUtils = [
    //     'foo',
    //     'bar',
    //     'foobar'
    // ],
    existingBinUtils = [
        'gm',
        'gzip',
        'mongorestore'
    ];

describe( 'Binutils-API Test', () => {
    const binutils = binutilsapi.getBinUtils() || {};

    describe( '1 Check Binutils integrity', () => {
        it( '1.1 Binutils should have data', function() {
            binutils.should.not.be.equal( {} );
        } );
        it( '1.2 Checking for common binutil `gm`', function() {
            should.exist( binutils.gm );
        } );
        it( '1.3 Checking for common binutil `gzip`', function() {
            should.exist( binutils.gzip );
        } );
        it( '1.4 Checking for common binutil `zip`', function() {
            should.exist( binutils.zip );
        } );
        it( '1.5 Checking for common binutil `tar`', function() {
            should.exist( binutils.tar );
        } );
        it( '1.6 Checking for common binutil `file`', function() {
            should.exist( binutils.file );
        } );
        it( '1.7 Checking for common binutil `cat`', function() {
            should.exist( binutils.cat );
        } );
        it( '1.8 Checking for common binutil `gs`', function() {
            should.exist( binutils.gs );
        } );
        it( '1.9 Checking for common binutil `mongorestore`', function() {
            should.exist( binutils.mongorestore );
        } );
        it( '1.10 Checking for common binutil `clamdscan`', function() {
            should.exist( binutils.clamdscan );
        } );
    } );

    describe( '2 Checking Binutils-API functions', () => {
        // describe( '2.1 Checking if not existing binutil throws error', () => {
        //     for( let i = 0; i < notExistingBinUtils.length; i++ ) {
        //         const binutilToCheck = notExistingBinUtils[i];
        //
        //         it( `2.1.${i + 1} '${binutilToCheck}' should throw an error`, function() {
        //             expect( () => binutilsapi.getPathToBinUtil( binutilToCheck ) ).to.throw( `binutil '${binutilToCheck}' not found` );
        //         } );
        //     }
        // } );
        describe( '2.2 Checking if existing binutil returns path', () => {
            for( let i = 0; i < existingBinUtils.length; i++ ) {
                const binutilToCheck = existingBinUtils[i];

                it( `2.2.${i + 1} '${binutilToCheck}' should return path`, function() {
                    expect( () => binutilsapi.getPathToBinUtil( binutilToCheck ) ).not.to.throw();
                } );
            }
        } );
        describe( '2.3 Checking constructShellCommand function', () => {
            it( `2.3.1 constructShellCommand should return shell command as string`, async function() {
                let [err, tmpCommand] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: existingBinUtils[0],
                        shellArgs: [
                            '-foo',
                            'bar',
                            '--boo',
                            'far'
                        ]
                    } )
                );

                should.not.exist( err );
                should.exist( tmpCommand );
            } );
            it( `2.3.2 constructShellCommand should throw an error 'binary not found in arguments'`, async function() {
                let [err, tmpCommand] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        foo: 'bar'
                    } )
                );

                should.exist( err );
                should.not.exist( tmpCommand );
                err.code.should.be.equal( 404 );
                err.message.should.be.equal( `binary not found in arguments` );
            } );
            it( `2.3.3 constructShellCommand should throw an error 'shellArgs not found in arguments'`, async function() {
                let [err, tmpCommand] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: existingBinUtils[0]
                    } )
                );

                should.exist( err );
                should.not.exist( tmpCommand );
                err.code.should.be.equal( 404 );
                err.message.should.be.equal( `shellArgs not found in arguments` );
            } );
            it( `2.3.4 constructShellCommand should throw an error 'shellArgs must be an array'`, async function() {
                let [err, tmpCommand] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: existingBinUtils[0],
                        shellArgs: {}
                    } )
                );

                should.exist( err );
                should.not.exist( tmpCommand );
                err.code.should.be.equal( 400 );
                err.message.should.be.equal( `shellArgs must be an array` );
            } );
            it( `2.3.5 constructShellCommand should throw an error 'shellArgs must have elements'`, async function() {
                let [err, tmpCommand] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: existingBinUtils[0],
                        shellArgs: []
                    } )
                );

                should.exist( err );
                should.not.exist( tmpCommand );
                err.code.should.be.equal( 400 );
                err.message.should.be.equal( `shellArgs must have elements` );
            } );
            it( `2.3.6 constructShellCommand should throw an error 'shellArgs must have non empty elements'`, async function() {
                let [err, tmpCommand] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: existingBinUtils[0],
                        shellArgs: [
                            '',
                            ''
                        ]
                    } )
                );

                should.exist( err );
                should.not.exist( tmpCommand );
                err.code.should.be.equal( 400 );
                err.message.should.be.equal( `shellArgs must have non empty elements` );
            } );
            // it( `2.3.7 constructShellCommand should throw an error 'not found'`, async function() {
            //     let [err, tmpCommand] = await formatPromiseResult(
            //         binutilsapi.constructShellCommand( {
            //             bin: notExistingBinUtils[0],
            //             shellArgs: [
            //                 '-foo',
            //                 'bar',
            //                 '--boo',
            //                 'far'
            //             ]
            //         } )
            //     );
            //
            //     should.exist( err );
            //     should.not.exist( tmpCommand );
            //     err.code.should.be.equal( 404 );
            //     err.message.should.be.equal( `binutil '${notExistingBinUtils[0]}' not found` );
            // } );
        } );
    } );

} );
