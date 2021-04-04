/**
 * User: do
 * Date: 22.08.19  09:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'kvcaccount-utils', function( Y, NAME ) {

        const getTmpDir = Y.doccirrus.tempFileManager.get;
        const {promisify} = require( 'util' );
        const {join: joinPath} = require( 'path' );
        const fs = require( 'fs' );
        const readFileAsync = promisify( fs.readFile );
        const writeFileAsync = promisify( fs.writeFile );
        const {exec} = require( 'child_process' );
        const execAsync = promisify( exec );
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        function storeFile( user, fileName, buffer ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.gridfs.store( user, fileName, {
                    content_type: 'application/octet-stream'
                }, buffer, ( err, id ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( id );
                } );
            } );
        }

        function getFile( user, id ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.gridfs.get( user, id, ( err, id ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( id );
                } );
            } );
        }

        function deleteFile( user, id ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.gridfs.delete( user, id, ( err, id ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( id );
                } );
            } );
        }

        async function cleanFiles( user, account ) {
            Y.log( `clean files of old certificate`, 'info', NAME );
            const fileIds = [];
            account.certificates.forEach( cert => {
                if( cert.signedCertificateFileId ) {
                    fileIds.push( cert.signedCertificateFileId );
                }
                if( cert.csrFileId ) {
                    fileIds.push( cert.csrFileId );
                }
                if( cert.privateKeyFileId ) {
                    fileIds.push( cert.privateKeyFileId );
                }
                if( cert.publicKeyFileId ) {
                    fileIds.push( cert.publicKeyFileId );
                }
            } );
            for( let fileId of fileIds ) {
                let [err, result] = await formatPromiseResult( deleteFile( user, fileId ) );
                if( err ) {
                    Y.log( `could not delete kvcaccount certificate file ${fileId} of account ${account._id}: ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( `deleted kvcaccount certificate file ${fileId} of account ${account._id}: ${result}`, 'debug', NAME );
                }
            }
        }

        async function execOpenSSL( cwd, cmd ) {
            Y.log( `exec openssel in ${cwd}`, 'info', NAME );
            return execAsync( `openssl ${cmd}`, {cwd, shell: true} );
        }

        async function createCSR( args ) {
            const {user, username, pin} = args;
            const reqFileName = 'req.pem';
            const privateKeyFileName = 'key.pem';
            const publicKeyFileName = 'pub.pem';

            let [err, tmpDir] = await formatPromiseResult( getTmpDir( user, 'kvcaccount' ) );

            if( err ) {
                Y.log( `could not get temp dir to create CSR`, 'warn', NAME );
                throw err;
            }

            const cleanTempDir = () => tmpDir.done().catch( err => Y.log( `could not remove tmp folder: ${err.stack || err}`, 'warn', NAME ) );
            const cmd = `req -batch -newkey rsa:2048 -keyout ${privateKeyFileName} -out ${reqFileName} -subj "/x500UniqueIdentifier=${username}" -passout 'pass:${pin}'`;

            Y.log( `create CSR with cmd ${cmd} in cwd ${tmpDir.path}`, 'debug', NAME );

            let result;
            [err, result] = await formatPromiseResult( execOpenSSL( tmpDir.path, cmd ) );

            if( err ) {
                Y.log( `could not create CSR with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            Y.log( `csr result: ${JSON.stringify( result )}`, 'debug', NAME );

            const getPubKeyCmd = `rsa  -in ${privateKeyFileName}  -passin 'pass:${pin}'  -pubout > ${publicKeyFileName}`;

            Y.log( `Get public key with cmd ${cmd} in cwd ${tmpDir.path}`, 'debug', NAME );

            [err, result] = await formatPromiseResult( execOpenSSL( tmpDir.path, getPubKeyCmd ) );

            if( err ) {
                Y.log( `could not create CSR with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            let csrFileBuffer, privateKeyFileBuffer, publicKeyFileBuffer;

            try {
                csrFileBuffer = await readFileAsync( joinPath( tmpDir.path, reqFileName ) );
                privateKeyFileBuffer = await readFileAsync( joinPath( tmpDir.path, privateKeyFileName ) );
                publicKeyFileBuffer = await readFileAsync( joinPath( tmpDir.path, publicKeyFileName ) );
            } catch( error ) {
                Y.log( `coud not read private/public key or csr file: ${error.stack || error}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            cleanTempDir();
            return {csrFileBuffer, privateKeyFileBuffer, publicKeyFileBuffer};
        }

        async function writeCertificateFilesToDisk( args ) {
            const {user, certificate, path} = args;

            if( !certificate.privateKeyFileId ) {
                throw Y.doccirrus.errors.rest( 2108 );
            }

            if( !certificate.signedCertificateFileId ) {
                throw Y.doccirrus.errors.rest( 2107 );
            }

            const privateKeyFile = await getFile( user, certificate.privateKeyFileId );
            await writeFileAsync( joinPath( path, 'priv.pem' ), privateKeyFile.data );

            // TODO: kvc do not write this file
            const publicKeyFile = await getFile( user, certificate.publicKeyFileId );
            await writeFileAsync( joinPath( path, 'pub.pem' ), publicKeyFile.data );

            const signedCertificateFile = await getFile( user, certificate.signedCertificateFileId );
            await writeFileAsync( joinPath( path, 'cert.pem' ), signedCertificateFile.data );

        }

        async function signAndEncryptMime( args ) {
            const {user, account, mime, addresseeCertificate} = args;
            const certificate = account.certificates && account.certificates[0];

            // Check account

            if( !certificate || account.certificateStatus === 'NONE') {
                throw Y.doccirrus.errors.rest( 2116 );
            }

            if( !certificate || account.certificateStatus === 'EXPIRED') {
                throw Y.doccirrus.errors.rest( 2117 );
            }

            // Get temp dir

            let [err, tmpDir] = await formatPromiseResult( getTmpDir( user, 'kvcaccount' ) );

            if( err ) {
                Y.log( `could not get temp dir to sign and decrypt mime`, 'warn', NAME );
                throw err;
            }

            const cleanTempDir = () => {
                tmpDir.done().catch( err => Y.log( `could not remove tmp folder: ${err.stack || err}`, 'warn', NAME ) );
            };

            // Get files and write files to disk

            let result;
            [err, result] = await formatPromiseResult( writeCertificateFilesToDisk( {
                user,
                certificate,
                path: tmpDir.path
            } ) );

            if( err ) {
                Y.log( `could not write certificate files to disk for account ${account._id}: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            Y.log( `signed and encrypted message: ${result}`, 'debug', NAME );

            // write mime file and certificate of addressee

            await writeFileAsync( joinPath( tmpDir.path, 'mime.txt' ), mime );
            await writeFileAsync( joinPath( tmpDir.path, 'addressee.pem' ), addresseeCertificate.data );

            // Sign message

            const signCmd = `smime -sign -in mime.txt -out mail.msg -signer cert.pem  -md sha256 -inkey priv.pem -passin 'pass:${certificate.pin}'`;

            [err, result] = await formatPromiseResult( execOpenSSL( tmpDir.path, signCmd ) );

            if( err ) {
                Y.log( `could not sign message with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            // Encrypt message

            const encryptCmd = `smime -encrypt -aes256 -in mail.msg -out encrypted_mail.msg cert.pem addressee.pem`;

            [err, result] = await formatPromiseResult( execOpenSSL( tmpDir.path, encryptCmd ) );

            if( err ) {
                Y.log( `could not encrypt message with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            // Read smime from disk

            let smimeFileBuffer;
            [err, smimeFileBuffer] = await formatPromiseResult( readFileAsync( joinPath( tmpDir.path, 'encrypted_mail.msg' ) ) );
            if( err ) {
                Y.log( `could not read smime from disk: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            cleanTempDir();

            // Add original headers

            const originalHeaders = Y.doccirrus.kvconnectutils.stripRawHeaders( mime );

            return Buffer.concat( [Buffer.from( originalHeaders ), smimeFileBuffer] );
        }

        async function decryptAndVerifyMime( args ) {
            const {user, account, mime, addresseeCertificate} = args;
            const certificate = account.certificates && account.certificates[0];

            // Check user certificate

            if( !certificate || account.certificateStatus === 'NONE') {
                throw Y.doccirrus.errors.rest( 2116 );
            }

            if( !certificate || account.certificateStatus === 'EXPIRED') {
                throw Y.doccirrus.errors.rest( 2117 );
            }

            // TODO: kvc check validTo after send data!? https://partnerportal.kv-telematik.de/display/WIS/Umgang+mit+Benutzerzertifikaten
            if( !addresseeCertificate || !addresseeCertificate.data ) {
                throw Y.doccirrus.errors.rest( 2109 );
            }

            // Get temp dir

            let [err, tmpDir] = await formatPromiseResult( getTmpDir( user, 'kvcaccount' ) );

            if( err ) {
                Y.log( `could not get temp dir to decrypt and verify mime`, 'warn', NAME );
                throw err;
            }

            const cleanTempDir = () => tmpDir.done().catch( err => Y.log( `could not remove tmp folder: ${err.stack || err}`, 'warn', NAME ) );

            // Write certificates

            let writeResults;
            [err, writeResults] = await formatPromiseResult( writeCertificateFilesToDisk( {
                user,
                certificate,
                path: tmpDir.path
            } ) );

            if( err ) {
                Y.log( `could not write certificate files to disk for account ${account._id}: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            Y.log( `wrote certificates to disk: ${writeResults}`, 'debug', NAME );

            // write mime file

            await writeFileAsync( joinPath( tmpDir.path, 'mail.msg' ), mime );
            await writeFileAsync( joinPath( tmpDir.path, 'addressee.pem' ), addresseeCertificate.data );

            // Decrypt message

            const decryptCmd = `smime -decrypt -aes256 -in mail.msg -out decrypted_mail.msg -recip cert.pem -inkey priv.pem -passin 'pass:${certificate.pin}'`;
            [err] = await formatPromiseResult( execOpenSSL( tmpDir.path, decryptCmd ) );

            if( err ) {
                Y.log( `could not encrypt message with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            // Verify message

            const verifyCmd = `smime -verify -in decrypted_mail.msg -signer addressee.pem -out signedtext.txt -noverify`;
            let verifyResult;
            [err, verifyResult] = await formatPromiseResult( execOpenSSL( tmpDir.path, verifyCmd ) );

            if( err ) {
                Y.log( `could not verify message with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            // Read mime from disk

            let mimeFileBuffer;
            [err, mimeFileBuffer] = await formatPromiseResult( readFileAsync( joinPath( tmpDir.path, 'signedtext.txt' ) ) );
            if( err ) {
                Y.log( `could not read mime from disk: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            Y.log( `verified mime: ${verifyResult}`, 'debug', NAME );

            // Check if certificate is from right issuer
            // See: https://partnerportal.kv-telematik.de/pages/viewpage.action?pageId=34177977
            const getKeyIdCmd = `x509 -in addressee.pem -noout -text | grep -A 1 "X509v3 Authority Key Identifier" | grep keyid`;

            let getKeyIdResult;
            [err, getKeyIdResult] = await formatPromiseResult( execOpenSSL( tmpDir.path, getKeyIdCmd ) );

            if( err ) {
                Y.log( `could not get key id from  message with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            if( !getKeyIdResult || !getKeyIdResult.stdout || !getKeyIdResult.stdout ) {
                Y.log( `could not get key id from message with openssl: no key found in stdout`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            const extractKeyIdRegex = /keyid:([a-zA-Z:0-9]*)/gm;
            const keyIdMatch = extractKeyIdRegex.exec( getKeyIdResult.stdout );

            if( !keyIdMatch || !keyIdMatch[1] ) {
                Y.log( `could not get key id from message with openssl: could not parse key id from stdout`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            const keyIdAddresseeCert = keyIdMatch[1];
            const userCAFilePath = Y.doccirrus.kvconnectRestClient.getUserCAFilePath();

            const createUserCADerFileCmd = `x509 -in ${userCAFilePath} -pubkey | openssl asn1parse -strparse 19 -out UserCA2_pub.der`;
            let createUserCADerFileCmdResult;
            [err, createUserCADerFileCmdResult] = await formatPromiseResult( execOpenSSL( tmpDir.path, createUserCADerFileCmd ) );

            if( err ) {
                Y.log( `could not create UserCA public key in DER format with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            Y.log( `decryptAndVerifyMime: createUserCADerFileCmdResult ${createUserCADerFileCmdResult}`, 'debug', NAME );

            const getKeyIdFromUserCAPubDerCmd = `dgst -c -sha1 UserCA2_pub.der`;
            let getKeyIdFromUserCAPubDerCmdResult;
            [err, getKeyIdFromUserCAPubDerCmdResult] = await formatPromiseResult( execOpenSSL( tmpDir.path, getKeyIdFromUserCAPubDerCmd ) );

            if( err ) {
                Y.log( `could not get key id from UserCA public key in DER format with openssl: ${err.stack || err}`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            Y.log( `decryptAndVerifyMime: getKeyIdFromUserCAPubDerCmdResult ${getKeyIdFromUserCAPubDerCmdResult}`, 'debug', NAME );

            if( !getKeyIdFromUserCAPubDerCmdResult || !getKeyIdFromUserCAPubDerCmdResult.stdout ) {
                Y.log( `could not get key id from user ca with openssl: no key found in stdout`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            const extractKeyIdUserCARegex = /= ([a-zA-Z:0-9]*)/gm;
            const keyIdUserCAMatch = extractKeyIdUserCARegex.exec( getKeyIdFromUserCAPubDerCmdResult.stdout );

            if( !keyIdUserCAMatch || !keyIdUserCAMatch[1] ) {
                Y.log( `could not get key id from message with openssl: could not parse key id from stdout`, 'warn', NAME );
                cleanTempDir();
                throw err;
            }

            cleanTempDir();

            const keyIdUserCACert = keyIdUserCAMatch[1];

            if( keyIdUserCACert.toLowerCase() !== keyIdAddresseeCert.toLowerCase() ) {
                throw Y.doccirrus.errors.rest( 2115 );
            }

            return mimeFileBuffer;
        }

        Y.namespace( 'doccirrus' ).kvcAccountUtils = {
            cleanFiles,
            storeFile,
            getFile,
            deleteFile,
            createCSR,
            signAndEncryptMime,
            decryptAndVerifyMime
        };

    },
    '0.0.1', {requires: ['tempdir-manager']}
);