/**
 * Created by fudge
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */





/*global YUI */

/**
 * @module kv_connect
 * Communicates with kvconnect server.
 */
YUI.add( 'dc_kvconnect', function( Y, NAME ) {
    let
        globalConfig,
        activated = false;

    const i18n = Y.doccirrus.i18n;
    const uuid = require( 'node-uuid' );
    const {formatPromiseResult} = require( 'dc-core' ).utils;

    /**
     * Initalize kv_connect module
     * Store base config in memory of master and all workers.
     */
    async function initKvConnect() {
        const dcCore = require( 'dc-core' );
        const kvconnect = dcCore.config.load( process.cwd() + '/kvconnect.json' ) || {};
        if( !kvconnect ) {
            throw new Error( 'kvconnect: config not there!' );
        }

        Y.log( '*** kv_connect init ***', 'debug', NAME );
        if( kvconnect && kvconnect.activate === true ) {
            if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() ) {
                globalConfig = kvconnect;
                activated = true;
                await Y.doccirrus.kvconnectRestClient.init();
                Y.log( 'kvconnect activated, read global config: ' + JSON.stringify( globalConfig ), 'debug', NAME );
            } else {
                Y.log( 'kvconnect activated but ignored', 'warn', NAME );
            }
        } else {
            Y.log( 'kvconnect not activated', 'warn', NAME );
        }

    }

    /**
     * Returns kvconnect config
     * @param {String}          key         if set returns only value of specified key
     * @returns {config|value}
     */
    function getConfig( key ) {
        if( !globalConfig ) {
            Y.log( 'kvconnect config not loaded', 'warn', NAME );
            return null;
        }
        if( key ) {
            return globalConfig[key];
        }
        return globalConfig;
    }

    /**
     * @returns {Boolean} depending on kv_connect activated for this server
     */
    function getActivatedState() {
        return activated;
    }

    function getTransmitterSystemName() {
        return `inSuite;${Y.config.insuite.version}`;
    }

    function getSender( args ) {
        return `${args.username}@${globalConfig.emailDomain}`;
    }

    function getMessageId() {
        return `<${uuid.v1()}@${globalConfig.emailDomain}>`;
    }

    function renderMDN( params ) {
        const moment = require( 'moment' );
        const raw = `Content-Type: multipart/report; report-type=disposition-notification; boundary="MDN-de05bf7615c73cc5"
X-Kvc-Dienstkennung: ${params.kvcServiceId}
X-Kvc-Sendersystem: ${params.kvcTransmitterSystem}
From: ${params.from}
To: ${params.addressee}
In-Reply-To: <${params.inReplyTo}>
Subject: ${params.subject}
Message-ID: ${getMessageId()}
Date: ${moment( params.sentAt ).format( 'ddd, DD MMM YYYY HH:mm:ss ZZ' )}
MIME-Version: 1.0

--MDN-de05bf7615c73cc5
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 8bit

Dies ist eine Eingangsbestaetigung fuer eine Nachricht, die Sie an folgenden Empfaenger gesendet haben: ${params.from} Beachten Sie: Diese Eingangsbestaetigung sagt nur aus, dass die Nachricht vom System des Empfaengers abgeholt wurde. Es gibt keine Garantie, dass der Empfaenger die Nachrichteninhalte gelesen hat.

--MDN-de05bf7615c73cc5
Content-Type: message/disposition-notification
Content-Disposition: inline
Content-Transfer-Encoding: 7bit
Original-Message-ID: <${params.inReplyTo}>
Disposition: automatic-action/MDN-sent-automatically;displayed
--MDN-de05bf7615c73cc5--
`;
        return raw.replace( /\n/g, '\r\n' );
    }

    /**
     * Generic function to send messages to kvconnect client.
     * @param {Object}          args
     */
    async function send( args ) {
        Y.log( `send kvc mail`, 'debug', NAME );
        const {user} = args;
        let err;

        if( !args.kvcServiceId ) {
            throw Error( `missing param kvcServiceId` );
        }

        if( !args.username ) {
            throw Error( `missing param username` );
        }

        if( !args.addressee ) {
            throw Error( `missing param addressee` );
        }

        if( !args.subject ) {
            throw Error( `missing param subject` );
        }

        const account = await Y.doccirrus.api.kvcaccount.getAccount( {
            user,
            username: args.username
        } );

        let addresseeCertificate;
        [err, addresseeCertificate] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.getCertificateByEmail( {
            email: args.addressee,
            auth: {
                username: account.username,
                password: account.password
            }
        } ) );


        if( err && err.statusCode === 404 || (addresseeCertificate && !addresseeCertificate.data) ) {
            throw  Y.doccirrus.errors.rest( 2109 );
        } else if( err ) {
            Y.log( `certificate NOT found addressee ${args.addressee}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        let email;

        if( args.messageType === 'MDN' ) {
            Object.assign( args, {
                messageId: getMessageId(),
                sentAt: new Date(),
                kvcTransmitterSystem: getTransmitterSystemName(),
                from: getSender( args )
            } );

            email = {
                envelope: {
                    from: getSender( args ),
                    to: [args.addressee]
                },
                raw: renderMDN( args )
            };
        } else {
            email = {
                headers: {
                    'X-KVC-Dienstkennung': args.kvcServiceId,
                    'X-KVC-Sendersystem': getTransmitterSystemName()
                },
                messageId: getMessageId(),
                from: getSender( args ),
                to: args.addressee,
                subject: args.subject,
                text: args.text || ''
            };

            if( args.inReplyTo ) {
                email.inReplyTo = args.inReplyTo;
            }

            Y.log( `kvc mail w/o attachments ${JSON.stringify( email )}`, 'debug', NAME );

            if( args.attachments && args.attachments.length ) {
                email.attachments = args.attachments;
            }
        }

        let mime;
        [err, mime] = await formatPromiseResult( Y.doccirrus.kvconnectutils.renderMIME( email ) );

        if( err ) {
            Y.log( `could not render mime: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        // TODO: create ticket for: Hack because nodemailer module does not allow to change content type of body text and telematik expects utf char set for certification despite it works
        mime = Buffer.from( mime.toString().replace( /^Content-Type: text\/plain$/igm, 'Content-Type: text/plain; charset="utf-8"' ) );

        let smime;
        [err, smime] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.signAndEncryptMime( {
            user,
            account,
            mime,
            addresseeCertificate
        } ) );

        if( err ) {
            Y.log( `could not sign or encrypt mime: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        let sendResult;
        [err, sendResult] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.sendMessage( {
            message: smime,
            auth: {
                username: account.username,
                password: account.password
            }
        } ) );

        if( err ) {
            Y.log( `could not send message: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        Y.log( `sent message from ${account._id.toString()} to kvconnect server: ${sendResult}`, 'info', NAME );

        let refinedMail;

        if( args.messageType === 'MDN' ) {
            refinedMail = {
                from: args.from,
                to: args.addressee,
                subject: args.subject,
                text: args.text || '',
                kbvlogId: args.kbvlogId,
                lablogId: args.lablogId,
                messageType: 'MDN',
                messageId: email.messageId,
                sentAt: args.sentAt,
                rawData: mime, // TODO
                messageStatus: 'SENT'
            };
        } else {
            refinedMail = {
                ...email,
                kbvlogId: args.kbvlogId,
                lablogId: args.lablogId,
                messageType: args.messageType || 'UNKNOWN',
                sentAt: new Date(),
                rawData: mime, // TODO
                messageStatus: 'SENT'
            };

        }

        return Y.doccirrus.api.kvcmessage.storeMessages( args.user, [refinedMail] ).then( messages => messages[0] );
    }

    /**
     * Fetch new messages from kvconnect server.
     *
     * @param {Object}  args
     * @param {Object}  args.user
     * @param {Object}  args.options
     * @param {Array}   args.options.onlyServiceTypes            Only fetch messages of specified service type.
     * @return {Promise<void>}
     */
    async function fetchNewMessages( args ) {
        const {user, options={}} = args;
        const onProgress = args.onProgress || (() => {
        });

        let nNewMessages = 0;

        // Lock fetching new messages

        let [err, getLock] = await formatPromiseResult(
            Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                key: 'fetchingKvConnectMessages',
                data: `${user.U}|${(new Date()).getTime()}|0`
            } )
        );
        if( err ) {
            Y.log( `fetchNewMessages: Error acquiring lock: ${err.stack || err}`, 'error', NAME );
        }

        if( !getLock || !getLock.length || 1 !== getLock[0] ) {
            throw  Y.doccirrus.errors.rest( 2111 );
        }

        // Get all accounts

        let accounts;
        [err, accounts] = await formatPromiseResult( Y.doccirrus.api.kvcaccount.get( {
            user,
            query: {status: 'LOGIN_OK'}
        } ) );

        if( err ) {
            Y.log( `could not fetch new messages from kvconnect server: error while getting all logged in kvcaccounts: ${err.stack || err}`, 'warn', NAME );
            Y.doccirrus.cacheUtils.dataCache.releaseLock( {key: 'fetchingKvConnectMessages'} );
            throw err;
        }

        for( let account of accounts ) {

            let currentMessageHeaderIndex = 0;
            let nMessageHeaders;

            // Get mail headers

            let headers;
            [err, headers] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.getHeaders( {
                accountId: account.uid,
                auth: {
                    username: account.username,
                    password: account.password
                }
            } ) );

            if( err ) {
                Y.log( `could not get all headers from kvconnect server: ${err.stack || err}`, 'warn', NAME );
                continue;
            }

            /**
             * For testing Telematik  provides an account that has an certificate signed by untrusted party.
             * We can send any message of any service (not eArztbrief) but sadly it only returns KVDT invoice validation
             * protocol (Prüfprotokol) message.
             * Here you can override message headers to different service when testing or preparing documents for
             * Telematik certification.
             *
             */
            const isSigningTest = false;
            if( isSigningTest ) {
                headers.forEach( header => {
                    if( header.from === 'signatur.test@kv-safenet.de' ) {
                        header.kvcServiceId = 'eTS;Vermittlungscode-Lieferung-Muster06;V2.0';
                    }
                } );
            }

            if( Array.isArray( options.onlyServiceTypes ) ) {
                Y.log( `Attempt to fetch only ${options.onlyServiceTypes} messages for account ${account._id} from kvconnect server`, 'info', NAME );
                headers = headers.filter( header => {
                    return options.onlyServiceTypes.includes( Y.doccirrus.schemas.kvcmessage.getkvcServiceTypeByServiceId( header.kvcServiceId ) );
                } );
            }

            nMessageHeaders = headers.length;

            Y.log( `Attempt to fetch ${headers.length} messages for account ${account._id} from kvconnect server`, 'info', NAME );

            for( let header of headers ) {
                currentMessageHeaderIndex += 1;
                const progress = {
                    type: 'progress',
                    kvcUsername: account.username,
                    nMessageHeaders,
                    currentMessageHeaderIndex,
                    percentage: Math.round( currentMessageHeaderIndex / nMessageHeaders * 100 ) + '%'
                };

                const messageId = header.messageId;

                Y.log( `Attempt to fetch message ${messageId} for account ${account._id} from kvconnect server`, 'info', NAME );

                // Get complete message from kvconnect server

                let message;
                [err, message] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.getMessage( {
                    accountId: account.uid,
                    messageId,
                    auth: {
                        username: account.username,
                        password: account.password
                    }
                } ) );

                if( err ) {
                    Y.log( `could not get message ${messageId} for account ${account._id} from kvconnect server: ${err.stack || err}`, 'warn', NAME );
                    onProgress( progress );
                    continue;
                }

                // Store message in database

                let storeResult;
                [err, storeResult] = await formatPromiseResult( Y.doccirrus.api.kvcmessage.storeRawMessages( user, [
                    {
                        header,
                        rawData: message
                    }] ) );

                let messageExists = false;

                if( err ) {
                    if( err.code === 2112 ) {
                        Y.log( `message already saved`, 'info', NAME );
                        messageExists = true;
                    } else {
                        Y.log( `could not store raw message ${messageId} for account ${account._id} from kvconnect server: ${err.stack || err}`, 'warn', NAME );
                        onProgress( progress );
                        continue;
                    }
                } else {
                    nNewMessages++;
                }

                if( !messageExists ) {
                    Y.log( `stored new raw message ${messageId} for account ${account._id}: ${storeResult}`, 'info', NAME );
                }

                // Remove message from kvconnect server

                let removeMessageResult;
                [err, removeMessageResult] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.deleteMessage( {
                    accountId: account.uid,
                    messageId,
                    auth: {
                        username: account.username,
                        password: account.password
                    }
                } ) );

                if( err ) {
                    Y.log( `could not delete message ${messageId} for account ${account._id} on kvconnect server: ${err.stack || err}`, 'warn', NAME );
                    onProgress( {
                        type: 'error',
                        message: i18n( 'kvcmessage-api.message.KVC_MESSAGE_COULD_NOT_BE_REMOVED_FROM_SERVER', {
                            data: {
                                username: account.username,
                                subject: header.subject
                            }
                        } )
                    } );
                } else {
                    Y.log( `removed new message ${messageId} for account ${account._id} from kvconnect server: ${removeMessageResult}`, 'info', NAME );
                }

                // Set server status of message

                let setServerStatusResult;
                [err, setServerStatusResult] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'kvcmessage',
                    query: {messageId: messageId},
                    data: {$set: {serverStatus: err ? 'OK' : 'DELETED'}}
                } ) );

                if( err ) {
                    Y.log( `could not set server status of message ${messageId} for account ${account._id}: ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( `set serverStatus attempt to remove message from kvconnect server; ${setServerStatusResult}`, 'debug', NAME );
                }

                onProgress( progress );
            }

        }

        onProgress( {
            type: 'stats',
            nNewMessages
        } );

        Y.doccirrus.cacheUtils.dataCache.releaseLock( {key: 'fetchingKvConnectMessages'} );

    }

    /**
     * @class kvconnect
     * @namespace doccirrus
     */
    Y.namespace( 'doccirrus' ).kvconnect = {
        init: initKvConnect,
        getConfig,
        send,
        activated: getActivatedState,
        fetchNewMessages
    };
}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-config-addon',
        'mojito-params-addon',
        'mojito-meta-addon',
        'kvcmessage-schema',
        'kvcaccount-api',
        'kvconnect-rest-client',
        'dckvconnectutils',
        'gkv_deliverysettings-api'
    ]
} );
