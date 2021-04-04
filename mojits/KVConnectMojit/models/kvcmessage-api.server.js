/**
 * User: do
 * Date: 31/08/17  15:32
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'kvcmessage-api', function( Y, NAME ) {
        const
            getMessageTypeByServiceId = Y.doccirrus.schemas.kvcmessage.getMessageTypeByServiceId,
            getkvcServiceTypeByServiceId = Y.doccirrus.schemas.kvcmessage.getkvcServiceTypeByServiceId,
            ObjectId = new require( 'mongoose' ).Types.ObjectId,
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            storeFile = Promise.promisify( Y.doccirrus.invoicelogutils.storeFile );

        function GET( args ) {
            const
                {user, query, callback} = args,
                options = args.options || {};

            // this removes ability to include paths anyway, so override for now
            options.select = {
                rawData: 0
            };

            runDb( {
                user,
                model: 'kvcmessage',
                query: {
                    $and: [{messageType: {$ne: null}}, query] // excludes deprecated kvcmessage state document;
                },
                options
            } ).then( response => {
                // do not send raw data or attachment content to client
                return Promise.each( response.result || response, kvcmessage => {
                    // TODOOO kvc find better way
                    (kvcmessage.attachments || []).forEach( function( attachment ) {
                        try {
                            attachment.content = attachment.content && attachment.content.toString();
                        } catch( err ) {
                            Y.log( `could not convert attachment.content to string; ignore it! ${err}`, 'warn', NAME );
                        }
                    } );
                } ).then( () => response );
            } ).then( results => {
                callback( null, results );
            } ).catch( err => {
                Y.log( `could not get kvcmessages ${err}`, 'error', NAME );
                callback( err );
            } );

        }

        async function storeMessages( user, messages ) {
            if( !messages || !messages.length ) {
                return;
            }
            messages.skipcheck_ = true;
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kvcmessage',
                action: 'post',
                data: messages,
                options: {entireRec: true}
            } );
        }

        async function storeRawMessages( user, rawMessages ) {
            if( !rawMessages || !rawMessages.length ) {
                Y.log( 'storeRawMessages: no rawMessages passed', 'debug', NAME );
                return rawMessages;
            }
            const
                receivedAt = new Date(),
                messages = rawMessages.map( rawMessage => {
                    const header = rawMessage && rawMessage.header;
                    return {
                        receivedAt,
                        rawDataEncrypted: rawMessage.rawData,
                        from: header && header.from,
                        to: header && header.to,
                        dispositionNotificationTo: header && header.dispositionNotificationTo,
                        contentType: header && header.contentType,
                        returnPath: header && header.returnPath,
                        sentAt: header && header.date,
                        originalMessageId: header && header.inReplyTo,
                        messageId: header && header.messageId,
                        messageStatus: 'RECEIVED',
                        messageType: getMessageTypeByServiceId( header && header.kvcServiceId ),
                        kvcServiceType: getkvcServiceTypeByServiceId( header && header.kvcServiceId ),
                        kvcServiceId: header && header.kvcServiceId,
                        kvcTransmitterSystem: header && header.kvcTransmitterSystem,
                        serverStatus: 'OK',
                        subject: header && header.subject
                    };

                } );
            messages.skipcheck_ = true;
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kvcmessage',
                action: 'post',
                data: messages
            } );
        }


        function storeAttachments( user, kvcMessageId, attachments ) {
            return Promise.each( attachments, attachment => {

                if( !attachment.content ) {
                    return;
                }

                return storeFile( user, attachment.fileName || attachment.filename, {
                    content_type: attachment.contentType,
                    metadata: {charset: attachment.charset, kvcMessageId} // TODOOO kvc check charset?
                }, (Buffer.isBuffer( attachment.content ) ? attachment.content : Buffer.from( attachment.content )) ).then( fileId => {
                    // keep raw content if file cant be saved
                    attachment.contentFileId = fileId.toString();
                    // keep content of small text based attachments
                    if( (attachment.contentType && !['text/plain', 'text/html', 'application/xml; charset=utf-8', 'application/xml'].includes( attachment.contentType )) || 1024 < attachment.size ) {
                        attachment.content = null;
                    }
                    Y.log( `stored attachment ${attachment} in gridfs with id ${fileId}`, 'debug', NAME );
                } ).catch( err => {
                    Y.log( `could not store attachment ${attachment} in gridfs ${err}`, 'warn', NAME );
                } );

            } ).catch( err => {
                Y.log( `could not store attachments kvcMessageId: ${kvcMessageId} in gridfs ${err}`, 'warn', NAME );
            } );

        }

        function confirm( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcmessage.confirm', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcmessage.confirm' );
            }
            const
                {user, originalParams, callback} = args,
                kvcMessageIds = originalParams.kvcMessageIds;

            if( !kvcMessageIds || !kvcMessageIds.length ) {
                callback();
                return;
            }

            runDb( {
                user,
                action: 'update',
                model: 'kvcmessage',
                query: {_id: {$in: kvcMessageIds.map( id => (new ObjectId( id )) )}},
                data: {$set: {confirmed: true}}
            } ).then( results => {
                Y.log( `confirmed kvc messages with ids ${kvcMessageIds}: ${results}`, 'debug', NAME );
                callback();
            } ).catch( err => {
                Y.log( `could not confirm kvc messages with ids ${kvcMessageIds}`, 'error', NAME );
                callback( err );
            } );

        }

        function fetchNewMessages( args ) {
            Y.log( 'Entering Y.doccirrus.api.kvcmessage.fetchNewMessages', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kvcmessage.fetchNewMessages' );
            }
            const onProgress = ( progress ) => {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: args.user.identityId,
                    event: 'fetchKvcMessagesProgress',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                    msg: {
                        data: progress
                    }
                } );
            };

            args.callback();

            Y.doccirrus.kvconnect.fetchNewMessages( {
                ...args,
                onProgress
            } ).catch( err => {
                Y.log( `could not fetch new kvconnect messages from server: ${err.stack || err}`, 'warn', NAME );
                Y.doccirrus.cacheUtils.dataCache.releaseLock( {key: 'fetchingKvConnectMessages'} );
            } );
        }

        Y.namespace( 'doccirrus.api' ).kvcmessage = {

            name: NAME,
            get: GET,
            storeMessages,
            storeRawMessages,
            storeAttachments,
            confirm,
            fetchNewMessages
        };

    },
    '0.0.1', {requires: ['dcgridfs', 'kvcmessage-schema']}
);
