/**
 * User: do
 * Date: 03/08/17  19:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'kvcmessage-process', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const
            i18n = Y.doccirrus.i18n,
            SUBJECT = i18n( 'kvcmessage-schema.KVCMessage_T.subject.i18n' ),
            MESSAGE_TYPE = i18n( 'kvcmessage-schema.KVCMessage_T.messageType.i18n' ),

            storeAttachments = Y.doccirrus.api.kvcmessage.storeAttachments;

        function setParsedStatus( user, kvcMessageId, data ) {
            if( !kvcMessageId || !data ) {
                Y.log( 'setParsedStatus: called without kvcMessageId or data', 'warn', NAME );
                return;
            }
            data.messageStatus = 'PARSED';
            const
                fields = Object.keys( data );

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'put',
                model: 'kvcmessage',
                query: {_id: kvcMessageId},
                data: Y.doccirrus.filters.cleanDbObject( data ),
                fields: fields
            }, ( err ) => {
                if( err ) {
                    Y.log( `could not set status parsed on kvcmessage with id ${kvcMessageId}: ${err && err.stack || err}`, 'error', NAME );
                } else {
                    Y.log( `successfully prased kvcmessage ${kvcMessageId}`, 'debug', NAME );
                }
            } );
        }

        function setProcessedStatus( args ) {
            const {user, kvcmessage, updateData} = args;
            const kvcMessageId = kvcmessage._id;
            const subject = kvcmessage.subject;

            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'kvcmessage',
                query: {_id: kvcMessageId},
                data: {$set: {...updateData, messageStatus: 'PROCESSED'}}
            } ).then( () => {
                Y.log( `successfully processed kvcmessage ${kvcMessageId}`, 'info', NAME );
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'kvcMessageAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            level: 'SUCCESS',
                            message: i18n( 'kvcmessage-process.message.PROCESSED_MESSAGE', {data: {subject}} )
                        }
                    }
                } );
            } ).catch( err => {
                Y.log( `could not change status to processed on kvcmessage with id ${kvcMessageId}: ${err && err.stack || err}`, 'error', NAME );
            } );

        }

        /**
         * Non business domain errors that occurred during processing.
         *
         * @param {Object}  user
         * @param {String}  kvcMessageId
         * @param {Object}  errors
         * @return {Promise<any>}
         */
        function setErrors( user, kvcMessageId, errors ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'kvcmessage',
                query: {_id: kvcMessageId},
                data: {$set: {_errors: errors}}
            } ).then( () => {
                Y.log( `successfully update _errors on kvcmessage ${kvcMessageId}`, 'debug', NAME );
            } ).catch( err => {
                Y.log( `could not update _errors on kvcmessage with id ${kvcMessageId}: ${err && err.stack || err}`, 'error', NAME );
            } );

        }

        async function checkMessageExistence( user, kvcmessage, callback ) {
            const {messageId} = kvcmessage;

            if( !messageId ) {
                Y.log( `message without messageId saved`, 'warn', NAME );
                callback();
                return;
            }

            if( !kvcmessage.isNew ) {
                Y.log( `message not new: skip checkMessageExistence process`, 'debug', NAME );
                callback();
                return;
            }

            if( 'RECEIVED' !== kvcmessage.messageStatus ) {
                Y.log( `message is in state ${kvcmessage.messageStatus}: skipping parseRawMessage()`, 'debug', NAME );
                callback();
                return;
            }

            let [err, count] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'kvcmessage',
                action: 'count',
                query: {messageId: messageId}
            } ) );

            if( err ) {
                Y.log( `could not check if message already exists: ${err.stack | err}`, 'warn', NAME );
                callback();
                return;
            }

            if( 0 < count ) {
                Y.log( `checkMessageExistence message already saved`, 'warn', NAME );
                return callback( Y.doccirrus.errors.rest( 2112, null, true ) );
            }

            callback( null, kvcmessage );
        }

        async function parseRawMessage( user, kvcmessage, callback ) {
            if( 'RECEIVED' !== kvcmessage.messageStatus ) {
                Y.log( `message is in state ${kvcmessage.messageStatus}: skipping parseRawMessage()`, 'debug', NAME );
                callback();
                return;
            }

            Y.log( `parse raw message: ${kvcmessage._id}`, 'info', NAME );

            const kvcMessageId = kvcmessage._id.toString();
            const username = Y.doccirrus.kvconnectutils.getUserNameFromEmail( kvcmessage.to );
            let err, account;

            if( !username ) {
                return callback( new Error( `no account found for username: ${username}` ) );
            }

            [err, account] = await formatPromiseResult( Y.doccirrus.api.kvcaccount.getAccount( {user, username} ) );

            if( err ) {
                Y.log( `could not get account ${username} before decrypting message ${kvcMessageId}: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            let addresseeCertificate;
            [err, addresseeCertificate] = await formatPromiseResult( Y.doccirrus.kvconnectRestClient.getCertificateByEmail( {
                email: kvcmessage.from,
                auth: {
                    username: account.username,
                    password: account.password
                }
            } ) );

            // TODO: same code in kvconnect.server.js: generalise to function that makes above checks
            if( err && err.statusCode === 404 || (addresseeCertificate && !addresseeCertificate.data) ) {
                return callback( Y.doccirrus.errors.rest( 2109 ) );
            } else if( err ) {
                Y.log( `certificate NOT found addressee ${kvcmessage.from}: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            let decryptedMessage;
            [err, decryptedMessage] = await formatPromiseResult( Y.doccirrus.kvcAccountUtils.decryptAndVerifyMime( {
                user,
                account,
                mime: kvcmessage.rawDataEncrypted,
                addresseeCertificate
            } ) );

            if( err && err.code !== 2115 ) {
                Y.log( `could not verify and decrypt message ${kvcMessageId}: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            if( !err ) {
                kvcmessage.rawData = decryptedMessage;
            }

            // TODO: store all raw data and bigger attachments in gridfs. Already fixed size check when deleting storing attachments.

            try {
                let parsedMail;
                if( !err ) {
                    parsedMail = await Y.doccirrus.kvconnectutils.parseMail( kvcmessage.rawData, kvcmessage.messageType );
                    await storeAttachments( user, kvcMessageId, parsedMail.attachments || [] );
                } else { // only err code 2115 atm
                    parsedMail = {
                        _errors: [{code: err.code, message: Y.doccirrus.errorTable.getMessage( err )}]
                    };
                }

                const updateData = {
                    ...parsedMail,
                    rawData: null, // prevents crash when receiving ldt findings that are to big for audit?
                    rawDataEncrypted: null
                };

                await setParsedStatus( user, kvcMessageId, updateData );
            } catch( err ) {
                Y.log( `could not parse raw kvc message: ${kvcMessageId}:`, 'error', NAME );
                setErrors( user, kvcMessageId, [
                    {
                        code: err.code,
                        message: err.message,
                        technical: true
                    }] ).then( () => callback( null, kvcmessage ) );
            }

            callback( null, kvcmessage );
        }

        function processMessage( user, kvcmessage, callback ) {
            if( 'PARSED' !== kvcmessage.messageStatus ) {
                Y.log( `message is in state ${kvcmessage.messageStatus}: skipping processMessage()`, 'debug', NAME );
                callback();
                return;
            }

            Y.log( `process message: ${kvcmessage._id}`, 'info', NAME );

            const emitErrorToUser = () => {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'kvcMessageAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            level: 'ERROR',
                            message: i18n( 'kvcmessage-process.message.COULD_NOT_PROCESSED_MESSAGE', {data: {subject: kvcmessage.subject}} )
                        }
                    }
                } );
            };

            const hasSigningError = kvcmessage._errors && kvcmessage._errors.length &&
                                    kvcmessage._errors.some( error => error.code === 2115 );

            if( hasSigningError ) {
                Y.log( `processMessage: kvc message ${kvcmessage._id} has signing error`, 'info', NAME );
                setProcessedStatus( {
                    user,
                    kvcmessage,
                    updateData: {}
                } ).then( () => callback() ).catch( err => callback( err ) );
                return;
            }

            if( 'LDT_FINDING' === kvcmessage.kvcServiceType ) {
                Y.log( `trigger processing of kvconnect LDT finding message: ${kvcmessage._id}`, 'info', NAME );
                Y.doccirrus.api.lab.processKvcLdtFindingMessage( {
                    user,
                    params: {message: kvcmessage},
                    callback: ( err, result ) => {
                        const
                            kvcMessageId = kvcmessage._id.toString();
                        let promise;
                        if( err ) {
                            promise = setErrors( user, kvcMessageId, [
                                {
                                    code: err.code,
                                    message: err.message,
                                    technical: true
                                }] ).then( () => {
                                emitErrorToUser();
                            } );
                        } else {
                            promise = setProcessedStatus( {
                                user,
                                kvcmessage,
                                updateData: {
                                    lablogId: result && result._id
                                }
                            } );
                        }
                        promise.then( () => callback() );
                    }
                } );

            } else if( 'ETS' === kvcmessage.kvcServiceType ) {
                Y.doccirrus.kvconnect.service.eTS.processDelivery( {
                    user,
                    message: kvcmessage
                } ).then( result => {
                    let promise;
                    const updateData = {};

                    if( result.status === 'ERROR' ) {
                        updateData._errors = result.errors;
                    }
                    updateData.extra = {...kvcmessage.extra || {}, arrangementCode: result.arrangementCode};

                    promise = setProcessedStatus( {
                        user,
                        kvcmessage,
                        updateData
                    } );

                    promise.then( () => callback() );

                } ).catch( ( err ) => {
                    const
                        kvcMessageId = kvcmessage._id.toString();

                    setErrors( user, kvcMessageId, [
                        {
                            code: err.code,
                            message: err.message,
                            technical: true
                        }] ).then( () => {
                        emitErrorToUser();
                    } ).then( () => callback() );
                } );
            } else {
                Y.log( `trigger processing of kvconnect KVDT message: ${kvcmessage._id}`, 'info', NAME );
                Y.doccirrus.api.kbvlog.processMessage( {
                    user,
                    params: {
                        message: kvcmessage
                    },
                    callback: ( err, result ) => {
                        const
                            kvcMessageId = kvcmessage._id.toString();
                        let promise;
                        if( err && 2029 !== err.code ) {
                            promise = setErrors( user, kvcMessageId, [
                                {
                                    code: err.code,
                                    message: err.message,
                                    technical: true
                                }] ).then( () => {
                                emitErrorToUser();
                            } );
                        } else if( err && 2029 === err.code ) {
                            promise = setErrors( user, kvcMessageId, [
                                {
                                    code: err.code,
                                    message: err.message
                                }] ).then( () => {
                                emitErrorToUser();
                            } );
                        } else {
                            promise = setProcessedStatus( {
                                user,
                                kvcmessage,
                                updateData: {
                                    kbvlogId: result && result._id
                                }
                            } );
                        }
                        promise.then( () => callback() );
                    }
                } );
            }
        }

        function storeSentAttachments( user, kvcmessage, callback ) {

            if( kvcmessage.isNew && 'SENT' === kvcmessage.messageStatus ) {
                return storeAttachments( user, kvcmessage._id, kvcmessage.attachments || [] )
                    .then( () => callback() )
                    .catch( err => callback( err ) ); // should never be called because api methods only logs error
            } else {
                Y.log( `message is in state ${kvcmessage.messageStatus}: skipping storeSentAttachments()`, 'debug', NAME );
                callback();
                return;

            }

        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class kvcmessage-process
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'kvcmessage' ),
                        checkMessageExistence,
                        storeSentAttachments
                    ], forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'kvcmessage' ) //TODOOO kvc remove attachments from gridfs
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        parseRawMessage,
                        processMessage
                    ], forAction: 'write'
                }
            ],
            audit: {
                descrFn: function( data ) {
                    const
                        res = [
                            `Status: "${Y.doccirrus.schemaloader.translateEnumValue( '-de', data.messageStatus, Y.doccirrus.schemas.kvcmessage.types.KVCMessageStatus_E.list, 'n/a' )}"`,
                            `${MESSAGE_TYPE}: "${Y.doccirrus.schemaloader.translateEnumValue( '-de', data.messageType, Y.doccirrus.schemas.kvcmessage.types.KVCMessageType_E.list, 'n/a' )}"`,
                            data.subject ? `${SUBJECT}: "${data.subject}"` : null
                        ].filter( Boolean ).join( ' ' );

                    return res || data._id;
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: ['kvcmessage-schema']}
);
