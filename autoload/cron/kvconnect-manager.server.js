/**
 * User: do
 * Date: 03/08/17  16:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
"use strict";
YUI.add( 'KVConnectManager', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const

            i18n = Y.doccirrus.i18n,
            getIdentityIdsToInform = Y.doccirrus.kvconnectutils.getIdentityIdsToInform,
            KVC_CERTIFICATES_EXPIRE_SOON = i18n( 'kvcmessage-api.message.KVC_CERTIFICATES_EXPIRE_SOON' ),
            KVC_CERTIFICATES_EXPIRE_SOON_HOW_TO_CREATE_NEW = i18n( 'kvcmessage-api.message.KVC_CERTIFICATES_EXPIRE_SOON_HOW_TO_CREATE_NEW' ),
            migrate = require( 'dc-core' ).migrate;
        let isFetching = false;

        function finalCb( err, count ) {
            isFetching = false;
            // TODOOO kvc create task on err?
            if( err && 2030 !== err.code ) {
                Y.log( 'an error occured while getting all kvconnect message on all tenants: ' + (err), 'error', NAME );
                return;
            }

            Y.log( `successfily got kvconnect messages on all tenants (${count})`, 'debug', NAME );
        }

        /**
         *
         * @param user
         * @param callback
         * @returns {*}
         */
        async function getKVCMessagesForTenant( user, callback ) {
            Y.log( `get kvcmessages in tenant ${user.tenantId}`, 'info', NAME );
            await Y.doccirrus.kvconnect.fetchNewMessages( {user} );
            callback();
        }

        function getKVCMessagesForAllTenants() {
            if( !isFetching && Y.doccirrus.kvconnect.activated() ) {
                Y.log( `cron job triggered kvconnect message retrieval on all tenantsat ${new Date()}`, 'info', NAME );
                isFetching = true;
                migrate.eachTenantParallelLimit( getKVCMessagesForTenant, 1, finalCb );
            } else {
                Y.log( `cron job triggered kvconnect message retrieval on all tenants: ${Y.doccirrus.kvconnect.activated() ? 'kvconnect is deactivated' : 'kvc is already fetching messages for all tenants'}`, 'debug', NAME );
            }
        }

        /**
         * Only called during initializing phase on master.
         * @param callback
         */
        async function initKvConnectManager( callback ) {
            if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() ) {
                callback();
                return;
            }
            Y.log( 'initializing kvconnect manager', 'info', NAME );
            await Y.doccirrus.kvconnect.init();

            if( !require( 'cluster' ).isMaster ) {
                callback();
                return;
            }
            const activated = Y.doccirrus.kvconnect.activated();
            if( activated ) {
                // cron jobs are only executed so no need to check
                Y.doccirrus.kronnd.on( 'everyHour', getKVCMessagesForAllTenants );
                Y.doccirrus.kronnd.on( 'checkKVConnectCertificates', checkCertValidity );
            }
            callback();
        }

        function informUser( user, message ) {

            const
                messageIdPrefix = 'CONFIRM_SOON_EXPIRING_CERT',
                userGroupsToInform = [ // TODOOO kvc check with pm
                    'SUPERUSER',
                    'ADMIN',
                    'CONTROLLER',
                    'PHYSICIAN'
                ];

            getIdentityIdsToInform( user, userGroupsToInform ).each( identityId => {

                Y.log( `inform user with identityId ${identityId} about soon expiring kvc certificates`, 'info', NAME );

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: identityId,
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM,
                    event: 'message',
                    messageId: `${messageIdPrefix}_${identityId}`,
                    msg: {
                        data: message
                    }
                } );
            } ).catch( err => {
                Y.log( `could not inform users about kbv certificates about to  expire: ${err}`, 'debug', NAME );
                throw err;
            } );

        }

        /**
         * KVC certificates are valid for 2 years.
         * System must start to inform users weekly about expiring certificates starting 150 days before it expires.
         *
         * System will inform all admins, controllers, ?
         *
         * @param user
         */
        async function checkCertValidity() {
            migrate.eachTenantParallelLimit( async function( user, callback ) {

                let [err, accounts] = await formatPromiseResult( Y.doccirrus.api.kvcaccount.checkCertificateValidityOfAllAccounts( {user} ) );

                if( err ) {
                    Y.log( `could not check certificate validity of all kvc accounts`, 'warn', NAME );
                    callback( err );
                    return;
                }

                Y.log( `inform user about ${accounts.length} certificates that expire soon!`, 'info', NAME );

                if( accounts.length ) {
                    informUser( user, KVC_CERTIFICATES_EXPIRE_SOON + '\n' + accounts.map( oneClickSetting => {
                        return i18n( 'kvcmessage-api.message.KVC_CERTIFICATE_EXPIRE_SOON', {
                            data: {
                                username: oneClickSetting.username,
                                daysUntilExpired: oneClickSetting.daysUntilExpired
                            }
                        } );
                    } ).join( '\n' ) + '\n' + KVC_CERTIFICATES_EXPIRE_SOON_HOW_TO_CREATE_NEW );
                }

                callback();

            }, 1, ( err ) => {
                if( err ) {
                    Y.log( `error while checking kvconnect certificates ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( `checked kvconnect certificates`, 'info', NAME );
                }
            } );

        }

        Y.namespace( 'doccirrus' ).kvconnectManager = {
            init: initKvConnectManager,
            checkCertValidity
        };
    },
    '0.0.1', {requires: ['dckronnd', 'dc_kvconnect', 'kvcaccount-api']}
);


