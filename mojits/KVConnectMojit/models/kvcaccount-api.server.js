/**
 * User: do
 * Date: 19.08.19  10:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'kvcaccount-api', function( Y, NAME ) {
        const {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;
        const i18n = Y.doccirrus.i18n;

        async function get( args ) {
            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'kvcaccount',
                query: args.query,
                options: args.options
            } ) );

            // TODO: check if certificate is still valid and rewrite hasValid... flag

            // TODO: do not send password to client
            // (result && result.result || result).forEach( account => {
            //     account.password = '***';
            // } );
            return handleResult( err, result, args.callback );
        }

        /**
         * Returns version of kvconnect server.
         * @param {Object}      args
         * @param {Function}    [args.callback]
         * @return {Promise<*>}
         */
        async function version( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.version', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.version' );
            }
            const {callback} = args;
            let [err, version] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.version() );

            if( err ) {
                Y.log( `could not get kvconnect server version. down?`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, version, callback );
        }

        /**
         * Login to user kvconnect account of user of specified credentials.
         * @param {Object}  args
         * @param {String}  args.originalParams.username
         * @param {String}  args.originalParams.password
         * @return {Promise<*>}
         */
        async function login( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.login', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.login' );
            }

            const {user, originalParams: params = {}, callback} = args;
            const {kvcAccountId, username, password} = params;
            const dateOfLogin = new Date();

            let err, accounts, account, restAccount;

            if( !username || !password ) {
                return handleResult( callback( Y.doccirrus.errors.rest( 400, 'missing credentials' ) ) );
            }

            [err, accounts] = await formatPromiseResult( Y.doccirrus.api.kvcaccount.get( {user, query: {username}} ) );

            if( err ) {
                Y.log( `could not get check if account with username: ${username} is already in db: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            account = accounts[0];
            let accountId = account && account._id && account._id.toString();
            if( kvcAccountId !== accountId ) {
                Y.log( `account with username ${username} already exists with account id ${accountId}`, 'info', NAME );
                return handleResult( callback( Y.doccirrus.errors.rest( 2100 ) ) );
            }

            [err, restAccount] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.login( {
                auth: {
                    username,
                    password
                }
            } ) );

            // only upsert errors if account already exists
            if( err && !account ) {
                Y.log( `could not login with username: ${username} for the first time: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let kvcAccount = {
                ...(account || {}),
                status: err ? 'LOGIN_FAILED' : 'LOGIN_OK',
                statusMessage: err ? (err.error || err.message || 'Ein unbekannter Fehler ist aufgetretten') : 'OK',
                username,
                password
            };

            if( err ) {
                kvcAccount = {
                    ...kvcAccount,
                    ...{passwordLastChange: null, passwordChangeNeeded: null},
                    lastKvcLogin: dateOfLogin
                };
            } else {
                kvcAccount = {
                    ...kvcAccount, ...restAccount,
                    lastKvcLogin: dateOfLogin
                };
            }

            let upsertedKvcAccount;
            [err, upsertedKvcAccount] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'upsert',
                query: {
                    username
                },
                model: 'kvcaccount',
                data: Y.doccirrus.filters.cleanDbObject( kvcAccount ),
                options: {
                    omitQueryId: true
                }
            } ) );

            if( err ) {
                Y.log( `could not upsert kvcaccount with username ${username}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            // TODO: do not send password to client
            // delete upsertedKvcAccount.password;

            return handleResult( null, upsertedKvcAccount, callback );
        }

        /**
         * Helper to get single account by kvcaccount id, username or locationId and handle common errors like no id passed or
         * account not found.
         *
         * @param {Object}          args
         * @param {Object}          args.user
         * @param {String}          args.originalParams.kvcAccountId
         * @param {String}          args.originalParams.username
         * @param {String}          args.originalParams.locationId
         * @param {String}          args.kvcAccountId
         * @param {String}          args.username
         * @param {Function}        args.callback
         * @return {Promise<*>}
         */
        async function getAccount( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.getAccount', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.getAccount' );
            }

            const {user, originalParams, callback} = args;
            const kvcAccountId = originalParams && originalParams.kvcAccountId || args.kvcAccountId;
            const username = originalParams && originalParams.username || args.username;
            const locationId = originalParams && originalParams.locationId || args.locationId;

            if( !kvcAccountId && !username && !locationId ) {
                return handleResult( Y.doccirrus.errors.rest( 400, 'insufficient params' ), undefined, callback );
            }
            const query = {};
            if( kvcAccountId ) {
                query._id = kvcAccountId;
            } else if( username ) {
                query.username = username;
            } else {
                query.locationIds = {$in: [locationId]};
            }
            let accounts = await Y.doccirrus.api.kvcaccount.get( {
                user,
                query,
                options: {
                    limit: 1
                }
            } );

            if( !accounts[0] ) {
                return handleResult( Y.doccirrus.errors.rest( 2101 ), undefined, callback );
            }

            return handleResult( null, accounts[0], callback );
        }

        /**
         * Change password.
         *
         * @param {Object}          args
         * @param {Object}          args.user
         * @param {String}          args.originalParams.kvcAccountId
         * @param {String}          args.originalParams.username
         * @param {String}          args.originalParams.oldPwd
         * @param {String}          args.originalParams.newPwd
         * @param {Function}        args.callback

         *
         * @return {Promise<*>}
         */
        async function changePassword( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.changePassword', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.changePassword' );
            }

            const {user, originalParams, callback} = args;
            const {kvcAccountId, oldPwd, newPwd} = originalParams;

            let [err, account] = await formatPromiseResult( getAccount( {user, kvcAccountId} ) );

            if( err ) {
                Y.log( `could not get kvcaccount with _id ${kvcAccountId}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( account.password !== oldPwd ) {
                return handleResult( callback( Y.doccirrus.errors.rest( 2102 ) ), undefined, callback );
            }

            let response;
            [err, response] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.changePassword( {
                accountId: account.uid,
                password: newPwd,
                auth: {
                    username: account.username,
                    password: account.password
                }
            } ) );

            if( err ) {
                Y.log( `could not change password of account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
            }

            if( err && err.statusCode ) {
                switch( err.statusCode ) {
                    case 400:
                        err = Y.doccirrus.errors.rest( 2103 );
                        break;
                    case 422:
                        err = Y.doccirrus.errors.rest( 2104 );
                        break;
                    default:
                        err = Y.doccirrus.errors.rest( err.statusCode );
                }

            }

            return handleResult( err, response, callback );
        }

        async function changeLocations( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.changeLocations', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.changeLocations' );
            }

            const {user, originalParams, callback} = args;
            const {kvcAccountId, locationIds} = originalParams;

            let [err, updatedAccount] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'put',
                model: 'kvcaccount',
                query: {
                    _id: kvcAccountId
                },
                data: {
                    locationIds,
                    skipcheck_: true
                },
                fields: ['locationIds']
            } ) );

            return handleResult( err, updatedAccount, callback );
        }

        /**
         * Create new certificate.
         *
         * @param {Object}          args
         * @param {Object}          args.user
         * @param {String}          args.originalParams.kvcAccountId
         * @param {String}          args.originalParams.pin
         * @param {Function}        args.callback
         * @return {Promise<*>}
         */
        async function createCertificate( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.createCertificate', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.createCertificate' );
            }

            const {user, originalParams, callback} = args;
            const {kvcAccountId, pin} = originalParams;

            if( !pin ) {
                return handleResult( Y.doccirrus.errors.rest( 2105 ), undefined, callback );
            }

            // Get account

            let [err, account] = await formatPromiseResult( getAccount( {user, kvcAccountId} ) );

            if( err ) {
                Y.log( `could not get kvcaccount with _id ${kvcAccountId}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // Create Certificate Signing Request

            let csrResult;
            [err, csrResult] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.createCSR( {
                user,
                username: account.username,
                pin
            } ) );

            if( err ) {
                Y.log( `could not create CSR for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // send CSR to kv connect server

            let csrId;
            [err, csrId] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.sendCSR( {
                accountId: account.uid,
                csr: csrResult.csrFileBuffer,
                auth: {
                    username: account.username,
                    password: account.password
                }
            } ) );

            if( err ) {
                Y.log( `could not change password of account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // Get status of csr

            let csrStatus;
            [err, csrStatus] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.csrStatus( {
                csrId,
                auth: {
                    username: account.username,
                    password: account.password
                }
            } ) );

            if( err ) {
                Y.log( `could not get csr status for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // Get new certificate if csr already completed

            let certificateResult, certificateFileId;
            if( csrStatus === '999' ) {
                [err, certificateResult] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.getCertificateByAccountId( {
                    accountId: account.uid,
                    auth: {
                        username: account.username,
                        password: account.password
                    }
                } ) );

                if( err ) {
                    Y.log( `certificate NOT found after successful csr for kvconnect account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                [err, certificateFileId] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.storeFile( user, `${account.username}.pem`, Buffer.from( certificateResult.data ) ) );
                if( err ) {
                    Y.log( `could not store certificate file for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            // Store files

            let csrFileId;
            [err, csrFileId] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.storeFile( user, 'req.pem', csrResult.csrFileBuffer ) );
            if( err ) {
                Y.log( `could not store csr file for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let privateKeyFileId;
            [err, privateKeyFileId] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.storeFile( user, 'key.pem', csrResult.privateKeyFileBuffer ) );
            if( err ) {
                Y.log( `could not store private key file for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let publicKeyFileId;
            [err, publicKeyFileId] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.storeFile( user, 'pub.pem', csrResult.publicKeyFileBuffer ) );
            if( err ) {
                Y.log( `could not store public key file for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // Update account

            let updatedAccount;
            [err, updatedAccount] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'put',
                model: 'kvcaccount',
                query: {
                    _id: kvcAccountId
                },
                data: {
                    certificateStatus: certificateResult ? 'VALID' : 'NONE',
                    certificates: [
                        {
                            validTo: certificateResult && certificateResult.validTo || null,
                            validFrom: certificateResult && certificateResult.validFrom || null,
                            signedCertificateFileId: certificateFileId || null,
                            csrStatus: Y.doccirrus.schemas.kvcaccount.isValidCsrStatus( csrStatus ) ? csrStatus : 'SENT',
                            privateKeyFileId,
                            publicKeyFileId,
                            csrFileId,
                            csrId: csrId,
                            pin
                        }
                    ],
                    skipcheck_: true
                },
                fields: ['certificates', 'certificateStatus']
            } ) );

            if( err ) {
                Y.log( `could not update account ${kvcAccountId} after certificate was created: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // Clean files

            Y.doccirrus.kvcAccountUtils.cleanFiles( user, account );

            return handleResult( null, updatedAccount, callback );
        }

        /**
         * Delete certificate.
         *
         * @param {Object}          args
         * @param {Object}          args.user
         * @param {String}          args.originalParams.kvcAccountId
         * @param {Function}        args.callback
         *
         *
         * @return {Promise<*>}
         */
        async function deleteCertificate( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.deleteCertificate', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.deleteCertificate' );
            }

            const {user, originalParams, callback} = args;
            const {kvcAccountId} = originalParams;

            // Get account

            let [err, account] = await formatPromiseResult( getAccount( {user, kvcAccountId} ) );

            if( err ) {
                Y.log( `could not get kvcaccount with _id ${kvcAccountId}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // Call rest route to delete certificate

            [err] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.deleteCertificate( {
                accountId: account.uid,
                auth: {
                    username: account.username,
                    password: account.password
                }
            } ) );

            if( err ) {
                Y.log( `could not delete certificate of account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                if( err.statusCode ) {
                    err = Y.doccirrus.errors.rest( err.statusCode );
                }

                return handleResult( err, undefined, callback );
            }

            // Clean files

            [err] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.cleanFiles( user, account ) );

            if( err ) {
                Y.log( `could not clean account ${kvcAccountId} files after certificate was removed from server: ${err.stack || err}`, 'warn', NAME );
            }

            // Update account

            let result;
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'put',
                model: 'kvcaccount',
                query: {
                    _id: kvcAccountId
                },
                data: {
                    certificates: [],
                    certificateStatus: 'NONE',
                    skipcheck_: true
                },
                fields: ['certificates', 'certificateStatus']
            } ) );

            if( err ) {
                Y.log( `could not update account ${kvcAccountId} after certificate was removed from server: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( err, result, callback );
        }

        /**
         * Refresh csr status.
         *
         *  @param {Object}          args
         * @param {Object}          args.user
         * @param {String}          args.originalParams.kvcAccountId
         * @param {Function}        args.callback
         * @return {Promise<*>}
         */
        async function refreshCsrStatus( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcaccount.refreshCsrStatus', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcaccount.refreshCsrStatus' );
            }

            const {user, originalParams, callback} = args;
            const {kvcAccountId} = originalParams;

            // Get account

            let [err, account] = await formatPromiseResult( getAccount( {user, kvcAccountId} ) );

            if( err ) {
                Y.log( `could not get kvcaccount with _id ${kvcAccountId}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            const certificate = account.certificates[0];
            const csrId = certificate && certificate.csrId;
            if( !csrId ) {
                Y.log( `no csr id for kvcaccount with _id ${kvcAccountId} available`, 'warn', NAME );
                return handleResult( Y.doccirrus.errors.rest( 2106 ), undefined, callback );
            }

            // Get status of csr

            let csrStatus;
            [err, csrStatus] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.csrStatus( {
                csrId: account.csrId,
                auth: {
                    username: account.username,
                    password: account.password
                }
            } ) );

            if( err ) {
                Y.log( `could not get csr status for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // Get new certificate if csr already completed

            let certificateResult, certificateFileId;
            if( csrStatus === '999' ) { // TODO: generalize with same code in createCerts
                [err, certificateResult] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.getCertificateByAccountId( {
                    accountId: account.uid,
                    auth: {
                        username: account.username,
                        password: account.password
                    }
                } ) );

                if( err ) {
                    Y.log( `certificate NOT found after successful csr for kvconnect account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                [err, certificateFileId] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.storeFile( user, `${account.username}.pem`, Buffer.from( certificateResult.data ) ) );
                if( err ) {
                    Y.log( `could not store certificate file for account ${kvcAccountId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            // Update account

            let updatedAccount;
            [err, updatedAccount] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'put',
                model: 'kvcaccount',
                query: {
                    _id: kvcAccountId
                },
                data: {
                    certificateStatus: certificateResult ? 'VALID' : 'NONE',
                    certificates: [
                        {
                            ...certificate,
                            validTo: certificateResult && certificateResult.validTo || null,
                            validFrom: certificateResult && certificateResult.validFrom || null,
                            signedCertificateFileId: certificateFileId || null,
                            csrStatus: Y.doccirrus.schemas.kvcaccount.isValidCsrStatus( csrStatus ) ? csrStatus : 'SENT'
                        }
                    ],
                    skipcheck_: true
                },
                fields: ['certificates', 'certificateStatus']
            } ) );

            if( err ) {
                Y.log( `could not update account ${kvcAccountId} after certificate was created: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, updatedAccount, callback );
        }

        // TODO: hook up in manager

        async function userNeedsNotificationAboutCertificate( args ) {
            const {account} = args;
            const moment = require( 'moment' );

            const DAYS_TO_INFORM_USER = 150;
            const now = moment();
            const certificate = account && account.certificates && account.certificates[0];

            if( !certificate || !certificate.validTo ) {
                throw Y.doccirrus.errors.rest( 2116 );
            }

            const daysUntilExpired = moment( certificate.validTo ).diff( now, 'days' );

            Y.log( `check certification validity of account ${account._id}: certificate was created at ${certificate.validFrom} and will expire in ${daysUntilExpired} on ${certificate.validTo}`, 'debug', NAME );

            if( daysUntilExpired <= DAYS_TO_INFORM_USER ) {
                return {daysUntilExpired, username: account.username};
            }

            return false;
        }

        async function checkCertificateValidityOfAllAccounts( args ) {
            const {user, callback} = args;
            const result = [];

            let [err, accounts] = await formatPromiseResult( Y.doccirrus.api.kvcaccount.get( {
                user,
                query: {certificateStatus: 'VALID'}
            } ) );

            if( err ) {
                Y.log( `could not check validity of kvonnect certificates: could not get kvcaccounts: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            for( let account of accounts ) {
                let needsNotification;
                [err, needsNotification] = await formatPromiseResult( userNeedsNotificationAboutCertificate( {
                    account
                } ) );
                if( err ) {
                    Y.log( `could not check certificate validity of account ${account._id.toString()}: ${err.stack || err}`, 'warn', NAME );
                } else if( needsNotification ) {
                    result.push( needsNotification );
                }
            }

            return handleResult( null, result, callback );
        }

        /**
         * Returns information about account existence and certificate validity.
         * Used by frontend to determine if there is a account for a location which can be used to send something.
         *
         * @param {Object}          args
         * @param {Object}          args.user
         * @param {String}          args.originalParams.kvcAccountId
         * @param {String}          args.originalParams.locationId
         * @param {Function}        args.callback
         *
         * @return {Promise<*>}
         */
        async function accountStatus( args ) {
            const {callback} = args;
            delete args.callback;
            let [err, account] = await formatPromiseResult( getAccount( args ) );
            if( err && err.code !== 2101 ) {
                Y.log( `could not get kvcaccount to check status`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            const status = {
                exists: Boolean( account ),
                certificateStatus: account && account.certificateStatus || null,
                message: null
            };
            if( !status.exists ) {
                status.message = i18n( 'kvcaccount-schema.messages.NO_ACCOUNT' );
            } else if( status.certificateStatus === 'NONE' ) {
                status.message = i18n( 'kvcaccount-schema.messages.NO_CERTIFICATE' );
            } else if( status.certificateStatus === 'EXPIRED' ) {
                status.message = i18n( 'kvcaccount-schema.messages.EXPIRED_CERTIFICATE' );
            }
            if( status.message ) {
                status.message = `${status.message}\n${i18n( 'kvcaccount-schema.messages.GOTO_CONFIG' )}`;
            }
            return handleResult( null, status, callback );
        }

        Y.namespace( 'doccirrus.api' ).kvcaccount = {
            name: NAME,
            version,
            getAccount,
            get,
            login,
            changePassword,
            changeLocations,
            createCertificate,
            refreshCsrStatus,
            deleteCertificate,
            checkCertificateValidityOfAllAccounts,
            accountStatus
        };

    },
    '0.0.1', {
        requires: [
            'kvcaccount-schema',
            'kvconnect-rest-client',
            'kvcaccount-utils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcerror',
            // 'dcfilters',
            // 'dcmongodb',
            // 'kvcaccount-schema',
            // 'kvconnect-rest-client'
        ]
    }
);
