/**
 * User: mahmoud
 * Date: 20/03/15  16:32
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
/*global YUI, JSON */

/**
 * transfer of patient data
 */
YUI.add( 'communication-api', function( Y, NAME ) {
        const
            ONLINE = 1,
            OFFLINE = 0;
        const
            util = require('util'),
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            i18n = Y.doccirrus.i18n;

        var pucStatus = ONLINE,
            speedTestString = Y.doccirrus.comctl.getRandomString( 20480 );

        /**
         * on PUC, receive and handle transfer data
         */
        function receiveFromPRC( args ) {
            Y.log('Entering Y.doccirrus.api.communication.receiveFromPRC', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.receiveFromPRC');
            }
            var
                user = args.user,
                data = args.data,
                message = data.message,
                content = message && message.content,
                callback = args.callback;

            if( 'string' === typeof content ) {
                content = JSON.parse( content );
            }
            message.content = content;
            Y.doccirrus.communication.relayToPRC( user, message, callback );
        }

        function speedTest( args ) {
            args.callback( null, [speedTestString] );
        }

        /**
         * @method sendLicenseEmail
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.licenseType
         * @param {String} args.data.title
         * @param {String} args.data.emailContent
         * @param {Function} args.callback
         */
        function sendLicenseEmail( args ) {
            let
                user = args.user,
                data = args.data || {},
                callback = args.callback,
                emailOptions,
                myEmail,
                text = `User: ${user.id}, asks about ${data.licenseType} license <br>`,
                async = require( 'async' );
            async.parallel( {
                practice: function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'practice',
                        options: {
                            lean: true,
                            limit: 1,
                            select: {
                                dcCustomerNo: 1
                            }
                        }
                    }, function( err, result ) {
                        if( err ) {
                            return done( err );
                        }
                        if( result && result[ 0 ] ) {
                            return done( null, result && result[ 0 ] );
                        }
                        done( Y.doccirrus.errors.rest( 500, 'practice not found', true ) );

                    } );
                },
                employee: function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'employee',
                        query: {
                            _id: user.specifiedBy,
                            status: { $ne: "INACTIVE" }
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, function( err, result ) {
                        if( err ) {
                            return done( err );
                        }
                        if( result && result[ 0 ] ) {
                            done( null, result && result[ 0 ] );
                        } else {
                            done( Y.doccirrus.errors.rest( 500, 'employee not found', true ) );
                        }
                    } );
                }
            }, function( err, result ) {
                if( err ) {
                    return callback( err );
                }
                text += `practice dcCustomerNo: ${result.practice.dcCustomerNo} <br>`;
                if( result.employee.locations && result.employee.locations.length ) {
                    text += `location name: ${result.employee.locations[ 0 ].locname} <br>`;
                }
                text += `User comment: <br> ${data.emailContent}`;
                emailOptions = {
                    serviceName: 'dcInfoService_sales',
                    subject: data.title,
                    user: user,
                    jadeParams: {
                        text: text
                    },
                    jadePath: './mojits/UserMgmtMojit/views/license_email.jade.html'
                };
                myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                Y.doccirrus.email.sendEmail( { ...myEmail, user }, callback );
            } );

        }

        /**
         * @method sendSupportEmail
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.title
         * @param {String} args.data.emailContent
         * @param {Function} args.callback
         */
        function sendSupportEmail( args ) {
            let
                user = args.user,
                data = args.data || {},
                callback = args.callback,
                emailOptions,
                licenses = data.info.licenses && JSON.parse( JSON.stringify( data.info.licenses ) ),
                attachments = [],
                support,
                rows = [],
                serialNumber,
                text = `${data.description || ''}\n`,
                async = require( 'async' );

            serialNumber = Y.doccirrus.auth.getSerialNumber( Y.doccirrus.auth.getGeneralExternalUrl( user ) );

            if( serialNumber ) {
                data.info['s/n'] = serialNumber;
                data.info.metricsLink = `https://server-metrics.intra.doc-cirrus.com/d/000000001/appliance-metrics?var-serial=${serialNumber.toUpperCase()}`;
            }

            async.parallel( {
                practice: function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'practice',
                        options: {
                            lean: true,
                            limit: 1,
                            select: {
                                customerNo: 1,
                                supportContact: 1
                            }
                        }
                    }, function( err, result ) {
                        if( err ) {
                            return done( err );
                        }
                        if( result && result[0] ) {
                            return done( null, result && result[0] );
                        }
                        done( Y.doccirrus.errors.rest( 500, 'practice not found', true ) );

                    } );
                }
            }, function( err, result ) {
                if( err ) {
                    return callback( err );
                }
                if( result.practice.supportContact && result.practice.supportContact.communications[0] ) {
                    support = result.practice.supportContact.communications.find( function( item ) {
                        return 'EMAILJOB' === item.type;
                    } );
                }
                data.info.customerNo = result.practice.customerNo;
                delete data.info.licenses;

                Object.keys( data.info ).forEach( function( item ) {
                    rows.push( '| ' + item + ' | ' + data.info[item] + ' |\n' );
                } );

                if( licenses ){
                    Object.keys( licenses ).forEach( function( item ) {
                        rows.push( '| ' + item + ' | ' + JSON.stringify( licenses[item] ) + ' |\n' );
                    } );
                }

                emailOptions = {
                    serviceName: support && support.value ? '' : 'supportService',
                    to: support && support.value || 'support@doc-cirrus.com',
                    from: data.email,
                    replyTo: data.email,
                    cc: data.cc_email,
                    subject: data.title,
                    text: '{emailText}\n\n { rows }'
                };
                emailOptions.text = Y.Lang.sub( emailOptions.text, {
                    emailText: text || '',
                    rows: rows.join( '' )
                } );

                emailOptions.jadeParams = { emailBody: emailOptions.text };

                if( data.attachments && data.attachments.length ) {
                    async.eachSeries( data.attachments, function( attachment, done ) {
                        function onBufferLoaded( err, res ) {
                            if( err ) {
                                return done( err );
                            }

                            attachments.push( {
                                content: res,
                                filename: attachment.caption
                            } );
                            return done();
                        }
                        Y.doccirrus.media.gridfs.exportBuffer( user, attachment.mediaId, false, onBufferLoaded );
                    }, ( err ) => {
                        if( err ) {
                            return callback( err );
                        }
                        emailOptions.attachments = attachments;
                        return Y.doccirrus.email.sendEmail( {...emailOptions, user}, callback );
                    } );
                } else {
                    return Y.doccirrus.email.sendEmail( { ...emailOptions, user }, callback );
                }
            } );
        }

        function initPUCConnectionListeners( callback ) {
            var auditData = {
                status: pucStatus,
                model: 'pucconnection'
            };
            if( !Y.doccirrus.ipc.isMaster() || Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ) {
                callback();
                return;
            }
            // setup call listeners for PRC, VPRC
            Y.doccirrus.communication.onPUCConnection( true, () => {
                //save connected status
                auditData.status = ONLINE;
                Y.doccirrus.api.audit.auditConnection( Y.doccirrus.auth.getSUForLocal(), auditData, ( err ) => {
                    if( err ) {
                        Y.log( `Could not auditLog ${auditData.model} with status ${auditData.status}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                } );
            } );

            Y.doccirrus.communication.onPUCDisconnected( () => {
                //save disconnected status
                auditData.status = OFFLINE;
                Y.doccirrus.api.audit.auditConnection( Y.doccirrus.auth.getSUForLocal(), auditData, ( err ) => {
                    if( err ) {
                        Y.log( `Could not auditLog ${auditData.model} with status ${auditData.status}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                } );
            } );
            callback();
        }

        function getUser( args ) {
            Y.log('Entering Y.doccirrus.api.communication.getUser', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.getUser');
            }
            const { user, callback } = args;
            return callback( null, user );
        }

        async function getAllSockets( args ) {
            Y.log('Entering Y.doccirrus.api.communication.getAllSockets', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.getAllSockets');
            }
            const {callback} = args;
            const namespaceList = ['default', 'cardreader', 'serial-to-ethernet', 'x-terminal'];
            let sockets = [];
            let err, result;

            for( let i = 0; i < namespaceList.length; i++ ) {
                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.communication.getConnectedSockets( {nsp: namespaceList[i]}, ( err, namespaceSockets ) => {
                        return err ? reject( err ) : resolve( namespaceSockets );
                    } );
                } ) );

                if( err ) {
                    callback( err );
                    break;
                }
                sockets = [...sockets, ...result];
            }

            return callback( null, sockets );
        }

        async function getClientEventHandlers( args ) {
            Y.log('Entering Y.doccirrus.api.communication.getClientEventHandlers', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.getClientEventHandlers');
            }
            const {callback} = args;

            Y.doccirrus.communication.getClientEventHandlers();
            return callback( null );
        }

        function emitSocketTestEvents( args ) {
            Y.log('Entering Y.doccirrus.api.communication.emitSocketTestEvents', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.emitSocketTestEvents');
            }
            const {originalParams: {activeSocketId, sockets}, callback} = args;
            const identityIds = new Set();
            const sessionIds = new Set();

            sockets.forEach( socket => {
                if( socket && socket.user && socket.user.identityId ) {
                    identityIds.add( socket.user.identityId );
                }
                if( socket && socket.sessionId ) {
                    sessionIds.add( socket.sessionId );
                }
            } );

            sockets.forEach( socket => {
                Y.doccirrus.communication.emitEventForRoom( {
                    room: socket && socket.id,
                    event: 'emitEventForRoom-Test',
                    doNotChangeData: true,
                    msg: {
                        data: {
                            activeSocketId,
                            test: "TEST"
                        }
                    }
                } );
            } );

            identityIds.forEach( identityId => {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: identityId,
                    event: 'emitEventForUser-Test',
                    msg: {
                        data: {
                            activeSocketId,
                            test: "TEST"
                        }
                    }
                } );
            } );

            sessionIds.forEach( sessionId => {
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: sessionId,
                    event: 'emitEventForSession-Test',
                    msg: {
                        data: {
                            activeSocketId,
                            test: "TEST"
                        }
                    }
                } );
            } );
            Y.doccirrus.communication.emitEventForAll( {
                event: 'emitEventForAll-Test',
                msg: {
                    data: {
                        activeSocketId,
                        test: "TEST"
                    }
                }
            } );
            Y.doccirrus.communication.emitNamespaceEvent( {
                event: 'emitNamespaceEvent-Test',
                nsp: 'default',
                msg: {
                    data: {
                        activeSocketId,
                        test: "TEST"
                    }
                }
            } );

            return callback( null );
        }

        /**
         * @method PUBLIC
         *
         * @JsonRpcApi
         *
         * This method tests whether the proxy which the user is trying to configure is valid or not.
         *
         * @param {Object} args :OPTIONAL:
         * @param {Object} args.data :OPTIONAL:
         * @param {String} args.data.proxyUrl :OPTIONAL: The proxy configuration to test
         * @param {Function} args.callback :OPTIONAL: Respond via callback
         *
         * @returns undefined
         */
        async function testProxyUrl( args = {} ) {
            const
                { data = {}, callback } = args,
                {proxyUrl} = data,
                DCPRC_URL = Y.doccirrus.auth.getDCPRCUrl( '/1/calendar/:gettime' ),
                PUC_URL = Y.doccirrus.auth.getPUCUrl( '/1/calendar/:gettime' ),
                proxyValidator = Y.doccirrus.validations.common.Admin_T_proxy[ 0 ],
                externalGetProm = util.promisify(Y.doccirrus.https.externalGet);


            let
                err,
                result,
                proxyAgent;

            // ------------------------ 1. Validate input proxy if present --------------------------------
            if( proxyUrl && !proxyValidator.validator(proxyUrl) ) {
                return handleResult( Y.doccirrus.errors.rest('userMgmtMojit_04'), undefined, callback );
            }
            // -------------------------------- 1. END ----------------------------------------------------


            // ------------------------------ 2. Check communication to DCPRC/PUC via proxy -------------------------------
            if( proxyUrl ) {
                // Meaning the user is trying to remove proxy and testing connection without proxyUrl
                proxyAgent = Y.doccirrus.https.getProxyAgent(proxyUrl);
            }

            [err, result] = await formatPromiseResult(
                                    Promise.all([
                                        externalGetProm(DCPRC_URL, {agent: proxyAgent || undefined, errDataCallback: true} ),
                                        externalGetProm(PUC_URL, {agent: proxyAgent || undefined, errDataCallback: true} )
                                    ])
                                  );

            if( err ) {
                return handleResult( Y.doccirrus.errors.rest('communication_01'), undefined,  callback);
            }

            if( !Array.isArray(result) || !result.filter(Boolean).length || !result[0].time || !result[1].time ) {
                return handleResult( Y.doccirrus.errors.rest('communication_01'), undefined,  callback);
            }
            // ---------------------------------------- 2. END ------------------------------------------------------------

            return handleResult( undefined, undefined,  callback);
        }

        /**
         * @method REST/2
         * This method is exposed via REST/2, to send email from Doc Cirrus Datensafe to any given emailId
         *
         * @param {Object} args.data ( required ) - All email options
         * @param {String} args.data.emailTo ( required ) - "to" email address
         * @param {String} args.data.subject ( required ) - subject of the email
         * @param {String} args.data.text ( required ) - body text of the email
         * @param {Function} args.callback
         *
         * @returns undefined
         */
        function sendSolMsgViaEmail( args ) {
            let
                {user, callback, data: {emailTo, subject, text} = {}} = args || {},
                emailOptions,
                myEmail;

            if( !args || !args.data || !Object.keys( args.data ).length || !emailTo || !subject || !text ) {
                return callback( i18n( 'communications.message.PROVIDE_EMAIL_PARAMS' ) );
            }

            try {
                emailOptions = {
                    to: emailTo,
                    from: "Doc Cirrus Datensafe <dev-noreply@doc-cirrus.com>",
                    subject,
                    jadeParams: {text},
                    jadePath: './mojits/UserMgmtMojit/views/license_email.jade.html',
                    user
                };

                myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                Y.doccirrus.email.sendEmail( {...myEmail, user}, callback );
            } catch( err ) {
                Y.log( `Error occurred while sending email: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
        }

        Y.namespace( 'doccirrus.api' ).communication = {
            runOnStart: initPUCConnectionListeners,
            receiveFromPRC: receiveFromPRC,

            // --------------- JSONRPC API'S ------------
            speedTest: function( args ) {
                Y.log('Entering Y.doccirrus.api.communication.speedTest', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.speedTest');
                }
                speedTest( args );
            },
            sendLicenseEmail: function( args ) {
                Y.log('Entering Y.doccirrus.api.communication.sendLicenseEmail', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.sendLicenseEmail');
                }
                sendLicenseEmail( args );
            },
            sendSupportEmail: function( args ) {
                Y.log('Entering Y.doccirrus.api.communication.sendSupportEmail', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.sendSupportEmail');
                }
                sendSupportEmail( args );
            },
            getUser,
            getAllSockets,
            emitSocketTestEvents,
            getClientEventHandlers,
            testProxyUrl,
            post: function ( args ){
                Y.log('Entering Y.doccirrus.api.communication.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.communication.post');
                }
                sendSolMsgViaEmail( args);
            }
            // ------------------- END ------------------
        };
    },
    '0.0.1', {requires: [ 'dccommunication', 'v_communication-schema' ]}
);


