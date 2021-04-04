/**
 * User: rrrw
 * Date: 2/23/2013  09:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'message-api', function( Y, NAME ) {

        /**
         * The DC Message API
         *
         * This is the server code that implements the external Interfaces
         * of REST for the message API. (Similar to the scheduler API in
         * functionality, but the scheduler API still needs to be restructured
         * and renamed from the old pattern)
         *
         * @class message-api
         */

        /**
         * Insert or upsert message into local tenant.
         * If message has contentId and sendAt => system will try to do upsert operation
         * @method messagePatient
         * @param {Object} args
         * @param {Object} args.data
         * @param {Array} args.data.message
         * @param {Function} args.callback
         */
        function messagePatient( args ){
            var
                { callback, data:{ messages } = {} } = args,
                user = Y.doccirrus.auth.getSUForLocal(),
                crypto = require( 'crypto' ),
                Prom = require( 'bluebird' ),
                query,
                existingMessagesMap = new Map();
            if( Y.doccirrus.auth.isPUC() ) {
                user = Y.doccirrus.auth.getSUForPUC();
            }

            function processMessages() {
                let
                    response = [];
                return Prom.map( messages, ( message ) => {
                    return new Promise( ( resolve, reject ) => {
                        //message = JSON.parse( JSON.stringify( messages ) ); //dependency injection not working properly (without this you get "Method hasOwnProperty not found")
                        if( !existingMessagesMap.has( messages._id ) ) { //yeah, write it down!
                            let
                                messageFields = Object.keys(message);

                            if(message.phone) {
                                message.phone  = formatMobileNumber(message.phone);
                            }

                            message = Y.doccirrus.filters.cleanDbObject( message );
                            Y.log( `message not sent before: ${JSON.stringify( message )}`, 'debug', NAME );
                            if( message.contentId && message.sendAt ) {
                                Y.doccirrus.mongodb.runDb( {
                                    action: 'upsert',
                                    user: user,
                                    model: 'message',
                                    fields: messageFields,
                                    data: message,
                                    query: {
                                        channel: message.channel,
                                        state: 'NEW',
                                        contentId: message.contentId
                                    },
                                    options: {
                                        omitQueryId: true
                                    }
                                }, ( err, result ) => {
                                    if( err ) {
                                        Y.log( `message upserted with error: ${err}`, 'debug', NAME );
                                        return reject( err );
                                    }
                                    Y.log( `message upserted successfully: ${result && result._id}`, 'debug', NAME );
                                    resolve();
                                } );
                            } else {
                                Y.doccirrus.mongodb.runDb( {
                                    action: 'post',
                                    user: user,
                                    model: 'message',
                                    data: message,
                                    options: {}
                                }, ( err, result ) => {
                                    if( err ) {
                                        Y.log( `message written with error: ${err}`, 'debug', NAME );
                                        return reject( err );
                                    }
                                    Y.log( `message written successfully: ${result}`, 'debug', NAME );
                                    resolve();
                                } );
                            }
                        } else { //oops, already have one message
                            Y.log( `message already sent: ${JSON.stringify( message )}`, 'debug', NAME );
                            response.push( {
                                type: 'ERROR',
                                text: 'message already sent',
                                messageId: message.messageId
                            } );
                        }
                    } );
                } ).then( () => {
                    return response;
                } );
            }

            /*
            * As websms always sends/receive message in the format <country_code><number> ex. 49xxxxxxxxxxxx else it throws error.
            * Its better that we format the number this way before saving to messages collection in PUC db
            * */
            function formatMobileNumber(phonenumber) {
                phonenumber = phonenumber.replace(/[^+0-9]/g,'');

                if( !phonenumber.match( /(?:\+|00)\d+/ ) && !phonenumber.match( /^49.*/ ) ) { // if no country code is attached in any way, then attach it.
                    const code = 49;

                    if( '0' === phonenumber[ 0 ] ) {
                        phonenumber = phonenumber.slice( 1 ); // remove the beginning zero
                    }

                    phonenumber = code + phonenumber;
                }
                return phonenumber.replace( '+', '' );
            }

            function errorHandler( error ) {
                callback( error );
            }

            //#1 extract messages
            //#2 iterate over messages & check for duplicates -> write with state "NEW"
            //#3 generate check ids
            if( messages && Array.isArray( messages ) ) {
                Prom.map( messages, ( message ) => {
                    return new Prom( ( resolve, reject ) => {
                        let
                            hash;
                        // Potential security leak here...
                        Y.log( `Received Messages: [DEBUG] ${JSON.stringify( messages )}`, 'debug', NAME );
                        hash = crypto.createHash( 'md5' ).update( JSON.stringify( message.content ) ).digest( 'hex' );

                        query = {
                            '$or': [
                                { messageId: message.messageId },
                                { messageHash: hash }
                            ]
                        };
                        message.messageHash = hash;
                        message.content = JSON.stringify( message.content );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'message',
                            query: query,
                            options: {}
                        }, ( err, results ) => {
                            if( err ) {
                                return reject( err );
                            }
                            if( results[ 0 ] ) {
                                existingMessagesMap.set( results[ 0 ]._id.toString(), true );
                            }
                            resolve();
                        } );
                    } );
                } )
                    .then( ()=>{
                        return processMessages();
                    })
                    .then( ( response ) => {
                        callback( null, response );
                    } )
                    .catch( errorHandler );
            } else {
                callback( null, [
                    {type: 'ERROR', text: 'data has to be an array of messages'}
                ] );
            }

        }

        Y.namespace( 'doccirrus.api' ).message = {

            name: NAME,

            messagePatient( args ){
                Y.log('Entering Y.doccirrus.api.message.messagePatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.message.messagePatient');
                }
                messagePatient( args );
            },

            getMessage: function getMessage( ac, callback ) {
                callback( null, [
                    {
                        messageId: '734782',
                        practiceId: '9999999',
                        practiceName: 'TEST',
                        content: 'test message',
                        contentUrl: '/admin#/location/'+ Y.doccirrus.schemas.location.getMainLocationId(),
                        state: 'NEW',
                        channel: 'WEB',
                        level: 'WARNING',
                        patientId: '4726348e72e3a4890001'
                    }
                ] );
            },

            /**
             * encrypt the message content and store it to be picked and send later (by kronn job)
             * @param args
             */
            handlesms: function( args ) {
                Y.log('Entering Y.doccirrus.api.message.handlesms', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.message.handlesms');
                }
                var
                    user = args.user,
                    callback = args.callback,
                    message = args.data && args.data.message,
                    content,
                    crypto = require( 'crypto' ),
                    hash;

                if( 'string' === typeof message ) {
                    message = JSON.parse( message );
                }

                if( !message.content ) {
                    Y.log( 'invalid message content, exit here.', 'error', NAME );
                    callback( Y.doccirrus.errors.rest( 400, 'invalid message content' ) );
                    return;
                } else {
                    content = message.content;
                }

                try {
                    hash = crypto.createHash( 'md5' ).update( JSON.stringify( content ) ).digest( 'hex' );
                } catch( e ) {
                    Y.log( 'Failed creating content hash.', 'info', NAME );
                }

                message.hash = hash;
                message.content = JSON.stringify( content );
                message = Y.doccirrus.filters.cleanDbObject( message );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'message',
                    data: message,
                    callback: callback
                } );

            }

        };

    },
    '0.0.1', {requires: ['message-schema']}
);
