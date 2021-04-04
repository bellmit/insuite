/**
 * User: do
 * Date: 10/03/15  14:44
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'dckvconnectutils', function( Y, NAME ) {

        const
            ONE_CLICK_TEST_ENTRY = Y.doccirrus.schemas.gkv_deliverysettings.ONE_CLICK_TEST_ENTRY,
            MailComposer = require( 'nodemailer/lib/mail-composer' ),
            simpleParser = require('mailparser').simpleParser,
            Promise = require( 'bluebird' ),
            headerMap = {
                'message-id': 'messageId',
                'in-reply-to': 'inReplyTo',
                'date': 'date',
                'from': 'from',
                'to': 'to',
                'subject': 'subject',
                'x-kvc-dienstkennung': 'kvcServiceId',
                'x-kvc-sendersystem': 'kvcTransmitterSystem'
            };

        async function renderMIME( mailOptions ) {
            const mail = new MailComposer( mailOptions );
            return new Promise( ( resolve, reject ) => {
                mail.compile().build( ( err, message ) => {
                    if( err ) {
                        reject( err );
                    } else {
                        resolve( message );
                    }
                } );
            } );
        }

        function stripRawHeaders( mime ) {
            const headers = Object.keys( headerMap );
            if( typeof mime !== 'string' ) {
                mime = mime.toString();
            }

            return mime.split( '\r\n' ).filter( line => {
                return headers.some( header => {
                    return line.match( new RegExp( `^${header}`, 'i' ) );
                } );
            } ).join( '\r\n' );
        }

        function get1ClickKvcaEntryByKv( user, kv ) {
            var cfg = Y.doccirrus.kvconnect.getConfig(),
                isTest = cfg ? true === cfg.test : true;

            if( isTest ) {
                Y.log( 'kvconnect is in test mode. returning test kvca entry', 'warn', NAME );
                return Promise.resolve( {
                    kv: "99",
                    kvName: "KBV",
                    kvcaType: "1CLICK",
                    // kvcaAddress: "1clickabrechnung.test@kv-safenet.de",
                    kvcaAddress: "abrechnung.test@kv-safenet.de",
                    version: "2",
                    functions: ONE_CLICK_TEST_ENTRY
                } );
            }

            return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: {
                    kv: kv,
                    kvcaType: '1CLICK',
                    key: null
                }
            } ) ).get( 0 );
        }

        async function parseMail( rawMessageData/*, messageType*/ ) {
            const mail = await simpleParser( rawMessageData );
            let errors = [];

            if( mail.attachments && mail.attachments.length ) {
                mail.attachments.forEach( function( attachment ) {
                    var content = attachment.content && attachment.content.toString(),
                        attachmentErrors = attachment.contentType !== 'application/pdf' && content && content.match( /ERROR[^\r\n]*/g );

                    attachment.filename = attachment.filename || attachment.fileName || attachment.generatedFileName;

                    if( attachmentErrors && attachmentErrors.length ) {
                        errors = errors.concat( attachmentErrors.map( errorMessage => {
                            return {
                                message: errorMessage
                            };
                        } ) );
                    }
                } );
            }

            return {
                text: mail.text,
                attachments: mail.attachments,
                _errors: errors
            };

        }

        function getIdentityIdsToInform( user, allowedGroups ) {
            const
                query = {
                    status: 'ACTIVE'
                };

            if( Array.isArray( allowedGroups ) ) {
                query['memberOf.group'] = {$in: allowedGroups};
            }

            return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                query,
                options: {
                    lean: true,
                    select: {
                        _id: 1
                    }
                }
            } ) ).map( identity => {
                return identity._id.toString();
            } );
        }

        function getUserNameFromEmail( email ) {
            return email.split('@')[0];
        }

        Y.namespace( 'doccirrus' ).kvconnectutils = {
            renderMIME,
            parseMail,
            get1ClickKvcaEntryByKv,
            stripRawHeaders,
            getIdentityIdsToInform,
            getUserNameFromEmail
        };

    },
    '0.0.1', {requires: ['dc_kvconnect', 'kvcmessage-schema', 'gkv_deliverysettings-schema']}
);