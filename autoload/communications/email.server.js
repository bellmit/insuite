/**
 * User: rw
 * Date: 04.11.13  08:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Send Emails sanely.
 */

/*global YUI*/



YUI.add( 'dcemail', function( Y, NAME ) {

        var
            myEmail,
            i18n = Y.doccirrus.i18n;

        /** local globals to prevent scoping problems. */
        let emailJsonConfig,
            defaultConfig,
            hasDefaultConfig;

        /**
         * Constructor for the module class.
         * Singleton class
         *
         * @class DCEmail
         * @private
         */
        class DCEmail {
            constructor() {
                const cfgRaw = require( 'dc-core' ).config.load( process.cwd() + '/email.json' );
                const jsonConfig = cfgRaw.config || {};

                emailJsonConfig = jsonConfig;

                defaultConfig = {
                    isDefaultSmtpConfig: true,
                    port: jsonConfig.port || 25,
                    host: jsonConfig.host,
                    secure: jsonConfig.ssl || false,
                    user: jsonConfig.user,
                    password: jsonConfig.password
                };

                if( defaultConfig.host ) {
                    hasDefaultConfig = true;
                } else {
                    Y.log( 'Mailer not configured in email.json. Cannot send emails from this server.', 'warn', NAME );
                }
            }

            /**
             * This method is used to verify whether provided SMTP configuration is valid or not.
             * We do that by using provided configuration and trying to send it to a dummy email address
             * as ther is no verify method on this version of nodemailer
             *
             * @param smtpConfig SMTP config object
             * @param callback
             *
             * @example smtpConfig = {
                smtpHost: <string>,
                smtpPort: <number>,
                smtpUsername: <string>
                smtpPassword: <string>
                smtpSsl: <boolean>
               }
             * */
            verifySmtpConfiguration( smtpConfig, loggedInUserEmailAddress, testInitiator, callback ) {
                const nodemailer = require( 'nodemailer' );
                let configObj = this._getTransportConfig( {
                    host: smtpConfig.smtpHost,
                    secure: smtpConfig.smtpSsl,
                    port: smtpConfig.smtpPort,
                    user: smtpConfig.smtpUserName,
                    password: smtpConfig.smtpPassword
                } );
                let localTransporter = nodemailer.createTransport( configObj );
                let dummyMailOptions = {
                    from: smtpConfig.smtpUserName,
                    to: loggedInUserEmailAddress,
                    subject: i18n( 'InSuiteAdminMojit.tab_locations.text.SMTP_TEST_EMAIL_SUBJECT' ),
                    text: Y.Lang.sub( i18n( 'InSuiteAdminMojit.tab_locations.text.SMTP_TEST_EMAIL_TEXT' ), {
                        name: testInitiator
                    } )
                };

                this._sendEmail( {
                    transporter: localTransporter,
                    options: dummyMailOptions
                }, ( err ) => {
                    if( err ) {
                        Y.log(`verifySmtpConfiguration, __sendEmail ${err.stack || err}`, 'error', NAME);
                        return callback( { error: err, from: dummyMailOptions.from, to: dummyMailOptions.to } );
                    }
                    return callback( null, { from: dummyMailOptions.from, to: dummyMailOptions.to } );
                } );
            }

            /**
             * @param {Object} params
             * @param {String} params.host
             * @param {String} params.port
             * @param {String} params.user
             * @param {String} params.password
             * @param {Boolean} params.secure
             * @private
             */
            _getTransportConfig( params ) {
                const { host, port, secure, user, password } = params;
                let configObj = {
                    host,
                    port,
                    secure,
                    xMailer: false,
                    tls: {
                        rejectUnauthorized: false
                    },
                    connectionTimeout: 10000
                };

                Y.log( `Using SMTP configuration ${JSON.stringify( configObj )}`, 'info', NAME );

                if( user && password ) {
                    Y.log( `SMTP configuration uses auth`, 'info', NAME );
                    configObj.auth = {
                        user,
                        pass: password
                    };
                }
                return configObj;
            }

            /**
             * Returns a SMTP transporter based on provided configuration
             * @param {Object} smtpConfig
             * @param {String} smtpConfig.host
             * @param {String} smtpConfig.port
             * @param {String} smtpConfig.user
             * @param {String} smtpConfig.password
             * @param {Boolean} smtpConfig.secure
             */
            configureSmtpTransporter( smtpConfig ) {
                const htmlToText = require( 'nodemailer-html-to-text' ).htmlToText;
                const nodemailer = require( 'nodemailer' );
                const configObj = this._getTransportConfig( smtpConfig );
                const smtpTransport = nodemailer.createTransport( configObj );

                smtpTransport.use( 'compile', function( mail, callback ) {
                    if( mail && mail.data && mail.data.generateTextFromHTML && 'function' === typeof htmlToText ) {
                        return (htmlToText())( mail, callback );
                    }
                    callback();

                } );
                return smtpTransport;
            }

            /**
             * Send an email message using nodemailer.
             *
             * mailOptions basic parameters:
             *
             * {
                text: plaintext body
                html: html body
                to: list of receivers
                subject: Subject line
                from:  --> if left empty is filled with default value.
                bcc: --> if left empty is filled with default values.
                }
             *
             * other parameters:
             *
             * {
                attachments: [{filename: , path:, cid:},...] => cid is optional, see nodemailer docs
                serviceName: preconfigured services, e.g. supportService
                forceEmbeddedImages: set to true to convert images in the HTML to embedded images automatically
             * }
             *
             * @method sendEmail
             * @param {Object} params message params as per nodemailer
             * @param {Object} params.user
             * @param {String} params.from
             * @param {String} params.serviceName
             * @param {Function} callback
             * @see nodemailer docs for full params list
             */
            async sendEmail( params = {}, callback ) {
                const { user, from, serviceName } = params;
                const { formatPromiseResult } = require( 'dc-core' ).utils;
                let mailOptions = { ...params };
                let myCc = emailJsonConfig.bcc || '';
                let
                    err,
                    smtpConfig,
                    myFrom,
                    userLocation;
                if( !Y.doccirrus.auth.isPUC() && !Y.doccirrus.auth.isDCPRC() && !Y.doccirrus.auth.isVPRCAdmin( user ) ) {
                    if( !user ) {
                        throw new Y.doccirrus.commonerrors.DCError( 400, { message: 'user is missing' } );
                    } else {
                        [ err, smtpConfig ] = await formatPromiseResult( this.findSmtpConfiguration( { user } ) );

                        if( smtpConfig && smtpConfig.locname ) {
                            mailOptions.template = mailOptions.template || {};
                            mailOptions.template.locationMail = smtpConfig.email;
                            mailOptions.template.locationName = smtpConfig.locname;
                        } else {
                            [ err, userLocation ] = await formatPromiseResult( this.getLocationForUser( { user } ) );

                            if( err ) {
                                Y.log( `sendEmail. Could not get location info. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }

                            if( userLocation ) {
                                mailOptions.template = mailOptions.template || {};
                                mailOptions.template.locationMail = userLocation.email;
                                mailOptions.template.locationName = userLocation.locname;
                            }
                        }

                        smtpConfig = {
                            port: smtpConfig.smtpPort || smtpConfig.port,
                            host: smtpConfig.smtpHost || smtpConfig.host,
                            secure: smtpConfig.smtpSsl || smtpConfig.secure,
                            user: smtpConfig.smtpUserName || smtpConfig.user,
                            password: smtpConfig.smtpPassword || smtpConfig.password,
                            isDefaultSmtpConfig: smtpConfig.isDefaultSmtpConfig
                        };
                    }
                } else {
                    // for DC infrastructure (PUC, DCPRC) send the message from DC.
                    smtpConfig = defaultConfig;
                }

                if( err ) {
                    Y.log( `sendEmail. Could not get smtp config. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }

                let transporter = this.configureSmtpTransporter( smtpConfig );
                //if( !from ) {
                    [ err, myFrom ] = await formatPromiseResult( this.findEmailFromConfiguration( { user } ) );
                //}
                if( err ) {
                    Y.log( `sendEmail. Could not get "from" smtp  config. Default will be used. Error: ${JSON.stringify( err )}`, 'error', NAME );
                }
                // if a known service name has been provided then overwrite those fields that are pre-specified for that specific service
                if( serviceName && emailJsonConfig.hasOwnProperty( serviceName ) ) {
                    let myService = emailJsonConfig[ serviceName ];
                    mailOptions = { ...myService, ...mailOptions };
                }

                if( !mailOptions.noBcc ) {
                    mailOptions.bcc = mailOptions.bcc || myCc;
                }
                delete mailOptions.noBcc;
                // here we should set 'from' in such priority order
                // 1. the custom mail settings of the current location
                // 2. value from service from email.json
                // 3. sometimes 'from' are passed from outside of sendEmail() (mainly with value from email.json as well)
                mailOptions.from = myFrom || mailOptions.from || from;

                Y.log( `Email before replacing templates: ${JSON.stringify( mailOptions )}`, 'info', NAME );

                myEmail.replaceTemplates( mailOptions, smtpConfig.isDefaultSmtpConfig );

                Y.log( `Sending Email: ${JSON.stringify( mailOptions )}`, 'info', NAME );

                this._sendEmail( {
                    transporter,
                    options: mailOptions
                }, ( err, response ) => {
                    if( err ) {
                        Y.log( `Could not send email. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    } else {
                        Y.log( `Email sent: ${response.messageId} | ${response.response}`, 'info', NAME );
                    }
                    if( callback ) {
                        callback( err, response );
                    }
                } );
            }

            _sendEmail( params, callback ) {
                const { transporter, options } = params;
                transporter.sendMail( options, callback );
            }

            async getSmtpConfiguration( params ) {
                const { user, query } = params;
                const { formatPromiseResult } = require( 'dc-core' ).utils;
                const userLocations = user.locations || [];
                let
                    err,
                    results,
                    smtpSettings;

                [ err, results ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'get',
                    query: {
                        _id: { $in: userLocations.map( item => item._id ).concat( Y.doccirrus.schemas.location.getMainLocationId() ) },
                        ...query
                    },
                    options: {
                        sort: {
                            _id: -1
                        },
                        limit: 2 // it is enough to get one "good" location of user and main location
                    }
                } ) );
                if( err ) {
                    Y.log( `getSmtpConfiguration. Can not get locations from db. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    throw err;
                }
                if( results.length ) {
                    smtpSettings = results.find( item => userLocations.includes( item._id.toString() ) ) || results[ 0 ];
                }
                // since we disable custom smtp configuration in general settings we skip this step
                /*if( !smtpSettings ) {
                    [ err, results ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'settings',
                        action: 'get',
                        query
                    } ) );
                    if( err ) {
                        Y.log( `getSmtpConfiguration. Can not get settings from db. Error: ${JSON.stringify( err )}`, 'error', NAME );
                        throw err;
                    }
                    if( results[ 0 ] ) {
                        smtpSettings = results[ 0 ];
                    }
                }*/
                return smtpSettings;
            }

            async getLocationForUser( params ) {
                const { user } = params;
                const { formatPromiseResult } = require( 'dc-core' ).utils;
                const userLocations = user.locations || [];
                let
                    err,
                    results;

                [ err, results ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'get',
                    query: {
                        _id: { $in: userLocations.map( item => item._id ).concat( Y.doccirrus.schemas.location.getMainLocationId() ) }
                    },
                    options: {
                        sort: {
                            _id: -1
                        },
                        limit: 2 // it is enough to get one "good" location of user and main location
                    }
                } ) );
                if( err ) {
                    Y.log( `getLocationForUser. Can not get locations from db. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    throw err;
                }
                if( results.length ) {
                    results = results.find( item => userLocations.includes( item._id.toString() ) ) || results[ 0 ];
                }
                return results;
            }

            async findSmtpConfiguration( params ) {
                const { user } = params;
                const { formatPromiseResult } = require( 'dc-core' ).utils;
                const query = {
                    smtpHost: {
                        $exists: true,
                        $nin: [ "", null ]
                    }
                };
                let
                    err,
                    smtpSettings;
                [ err, smtpSettings ] = await formatPromiseResult( this.getSmtpConfiguration( { user, query } ) );
                if( err ) {
                    throw err;
                }
                if( !smtpSettings && user.tenantId !== Y.doccirrus.auth.getLocalTenantId() ) {
                    [ err, smtpSettings ] = await formatPromiseResult( this.getSmtpConfiguration( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        query
                    } ) );
                    if( err ) {
                        throw err;
                    }
                }
                if( !smtpSettings ) {
                    smtpSettings = defaultConfig;
                }
                if( !smtpSettings ) {
                    throw new Error( 'No stmp config found' );
                }

                return smtpSettings;

            }

            async findEmailFromConfiguration( params ) {
                const { user } = params;
                const { formatPromiseResult } = require( 'dc-core' ).utils;
                const query = {
                    smtpEmailFrom: {
                        $exists: true,
                        $nin: [ "", null ]
                    }
                };
                let
                    err,
                    smtpSettings;
                [ err, smtpSettings ] = await formatPromiseResult( this.getSmtpConfiguration( { user, query } ) );
                if( err ) {
                    throw err;
                }
                if( !smtpSettings && user.tenantId !== Y.doccirrus.auth.getLocalTenantId() ) {
                    [ err, smtpSettings ] = await formatPromiseResult( this.getSmtpConfiguration( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        query
                    } ) );
                    if( err ) {
                        throw err;
                    }
                }

                return smtpSettings && smtpSettings.smtpEmailFrom;

            }

            /**
             * @method preventBccToDC
             * @param message  message will be sent only to recipient and explicit cc / bcc.
             */
            replaceTemplates( message, isDefaultSmtpConfig ) {
                if( message.from && message.from.indexOf( "$locationName" ) > -1 ) {
                    if( message.template && message.template.locationName ) {
                        message.from = message.from.replace( "$locationName", message.template.locationName );
                        if( message.template.locationMail && !isDefaultSmtpConfig ) {
                            message.from = message.from.replace( "dev-noreply@doc-cirrus.com", message.template.locationMail );
                            message.from = message.from.replace( "noreply@doc-cirrus.com", message.template.locationMail );
                        }
                    } else {
                        message.from = message.from.replace( "$locationName", "Doc Cirrus" );
                    }
                }

                if( message.replyTo && message.template ) {
                    if( message.replyTo.indexOf( "$locationName" ) > -1 ) {
                        message.replyTo = message.replyTo.replace( "$locationName", message.template.locationName || "Doc Cirrus" );
                    }
                    if( message.replyTo.indexOf( "$locationMail" ) > -1 && message.template.locationMail ) {
                        message.replyTo = message.replyTo.replace( "$locationMail", message.template.locationMail );
                    } else {
                        if( !message.isReplyToSetExplicitly ) {
                            delete message.replyTo;
                        }
                    }
                }
            }

            /**
             * Prevents that a blind copy is sent to Doc Cirrus fo this message.
             * Automatically DC is bcc'ed in all messages sent through this system.
             * This suppresses that functionality, for the given message.
             *
             * @method preventBccToDC
             * @param message  message will be sent only to recipient and explicit cc / bcc.
             */
            preventBccToDC( message ) {
                message.noBcc = true;
            }

            /**
             * Tells the caller if the email service has default config.
             * @returns {boolean}
             */
            isReady() {
                return hasDefaultConfig;
            }

            /**
             * Create a message object that contains both text and html versions of an email.
             * If serviceName is provided then address might get override.
             *
             *
             * @param  {Object} (optional) jadeParams  all the parameters that is required by the jade template
             * @param {string} (optional) jadePath path to jade template file
             * @param {string} subject  email subject
             * @param {function} (optional) textBuilder  a function that returns the text for email body (used for the text version of the email)
             * @param {string} serviceName if the email belongs to a known process/service then the serviceName must be provided (see email.json)
             * @return {Object} an email message object ready to send
             */
            createHtmlEmailMessage( options ) {
                const
                    jade = require( 'pug' );
                let myObj = { // just to make the object structure explicit for both readers and JSHint
                        jadeParams: options.jadeParams,
                        jadePath: options.jadePath,
                        textBuilder: options.textBuilder,
                        text: options.text || '',
                        generateTextFromHTML: options.generateTextFromHTML,
                        isReplyToSetExplicitly: options.isReplyToSetExplicitly,
                        serviceName: options.serviceName,
                        attachments: options.attachments,
                        subject: options.subject,
                        from: options.from,
                        to: options.to,
                        replyTo: options.replyTo,
                        template: options.template,
                        cc: options.cc,
                        bcc: options.bcc
                    },
                    user = options.user || Y.doccirrus.auth.getSUForLocal(),
                    serialNumber = Y.doccirrus.auth.getSerialNumber( Y.doccirrus.auth.getGeneralExternalUrl( user ) ),
                    fileName,
                    filePath,
                    html,
                    mailOptions;

                if( myObj.jadeParams && !myObj.jadePath ) {
                    Y.log( 'createHtmlEmailMessage: insufficient parameters (1)', 'error', NAME );
                    throw new Error( 'createHtmlEmailMessage: insufficient parameters (1)' );
                }

                if( !myObj.serviceName && !(myObj.from && myObj.to) ) {
                    Y.log( 'createHtmlEmailMessage: insufficient parameters (2)', 'error', NAME );
                    throw new Error( 'createHtmlEmailMessage: insufficient parameters (2)' );
                }

                // if we have a textBuilder then set "generateTextFromHTML" to false unless it already has a value
                if( myObj.textBuilder && 'function' === typeof myObj.textBuilder ) {
                    myObj.generateTextFromHTML = myObj.generateTextFromHTML || false;
                    myObj.text = myObj.textBuilder();
                }

                if( !myObj.jadePath ) {
                    myObj.jadePath = './mojits/DocCirrus/views/email_layout.pug';
                    myObj.jadeParams = { emailBody: myObj.text };
                }

                if( 'string' === typeof options.serialNumber ) {
                    myObj.jadeParams.serialNumber = options.serialNumber;
                } else {
                    myObj.jadeParams.serialNumber = serialNumber;
                }

                if( myObj.template && myObj.template.filename && myObj.template.filePath ) {
                    fileName = myObj.template.filename;
                    filePath = myObj.template.filePath;
                    myObj.jadeParams.hasLogo = true;
                    myObj.jadeParams.logoName = fileName;
                    myObj.jadeParams.text = myObj.jadeParams.text.replace( "DocCirrus", "" );
                }

                if( myObj.template && myObj.template.emailFooter && myObj.template.emailFooter ) {
                    myObj.jadeParams.emailFooter = myObj.template.emailFooter;
                    myObj.jadeParams.text = myObj.jadeParams.text.replace( "DocCirrus", "" );
                }

                html = jade.renderFile( myObj.jadePath, {
                    params: myObj.jadeParams
                } );
                mailOptions = {
                    from: myObj.from,
                    to: myObj.to,
                    replyTo: myObj.replyTo,
                    template: myObj.template,
                    subject: myObj.subject,
                    text: myObj.text,
                    attachments: [],
                    generateTextFromHTML: myObj.generateTextFromHTML,
                    isReplyToSetExplicitly: myObj.isReplyToSetExplicitly,
                    html: html
                };

                if(
                    myObj.jadeParams.hasLogo ||
                    ( !myObj.jadeParams.hasLogo && !myObj.jadeParams.emailFooter && !myObj.jadeParams.docCirrusSign )
                ) {
                    mailOptions.attachments = [
                        {
                            filename: fileName || 'doccirrus-logo.png',
                            path: filePath || process.cwd() + "/mojits/DocCirrus/assets/images/logo200x85.png",
                            cid: "logo"
                        }
                    ];
                }

                if( myObj.attachments && myObj.attachments[ 0 ] && 'NO_LOGO' === myObj.attachments[ 0 ] ) {
                    myObj.attachments.shift();
                    mailOptions.attachments = [
                        {
                            filename: 'doccirrus-logo.png',
                            path: process.cwd() + "/mojits/DocCirrus/assets/images/logo200x85.png",
                            cid: "logo"
                        }
                    ];
                }

                if( myObj.cc ) {
                    mailOptions.cc = myObj.cc;
                }
                if( myObj.bcc ) {
                    mailOptions.bcc = myObj.bcc;
                }

                // if a known service name has been provided then overwrite those fields that are pre-specified for that specific service
                if( emailJsonConfig.hasOwnProperty( myObj.serviceName ) ) {
                    let myService = emailJsonConfig[ myObj.serviceName ];

                    mailOptions.to = myService.to || mailOptions.to;
                    mailOptions.from = myService.from || mailOptions.from;
                    mailOptions.replyTo = myService.replyTo || mailOptions.replyTo;
                    mailOptions.cc = myService.cc || mailOptions.cc;
                    mailOptions.bcc = myService.bcc || mailOptions.bcc;
                }

                if( myObj.attachments && myObj.attachments[ 0 ] ) { // add custom attachments
                    mailOptions.attachments = mailOptions.attachments.concat( myObj.attachments );
                }

                return mailOptions;
            }

            /**
             *
             * @param serviceName
             * @returns {}
             */
            getServiceConf( serviceName ) {
                if( emailJsonConfig.hasOwnProperty( serviceName ) ) {
                    return emailJsonConfig[ serviceName ];
                }
            }
        }

        function sendMessages() {
            const
                user = Y.doccirrus.auth.getSUForPUC(),
                ObjectId = require( 'mongodb' ).ObjectID,
                moment = require( 'moment' ),
                startDateOfMonth = moment().subtract( 1, 'months' ).startOf( 'month' ).toDate(),
                endDateOfMonth = moment().subtract( 1, 'months' ).endOf( 'month' ).toDate();

            let text = `Kunde,Anzahl SMS <br>`,
                emailOptions,
                smsStatsemail,
                startId = new ObjectId( Math.floor( startDateOfMonth.valueOf() / 1000 ).toString( 16 ) + "0000000000000000" ),
                endId = new ObjectId( Math.floor( endDateOfMonth.valueOf() / 1000 ).toString( 16 ) + "0000000000000000" );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'aggregate',
                model: 'message',
                pipeline: [
                    { $match: { _id: { $gte: startId, $lte: endId }, state: "SENT" } },
                    { $group: { _id: "$practiceId", cnt: { $sum: 1 }, practiceName: { $first: "$practiceName" } } }
                ]
            } )
                .then( ( smsStatsArr ) => {
                    if( smsStatsArr && smsStatsArr.result && smsStatsArr.result.length ) {
                        smsStatsArr.result.forEach( function( res ) {
                            text += `${res.practiceName},${res.cnt}<br>`;
                        } );
                        emailOptions = {
                            serviceName: 'dcInfoService_sales',
                            subject: 'SMS Statistik',
                            user: user,
                            jadeParams: {
                                text: text
                            },
                            jadePath: '././mojits/UserMgmtMojit/views/license_email.jade.html'
                        };
                        smsStatsemail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                        return new Promise( ( resolve, reject ) => {
                            Y.doccirrus.email.sendEmail( { ...smsStatsemail, user }, ( err ) => {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve();
                            } );
                        } );
                    } else {
                        Y.log( `emailMonthlySmsStats:sendMessages No SMS sent for this month`, 'info', NAME );
                    }
                } )
                .catch( ( err ) => {
                    Y.log( `emailMonthlySmsStats:sendMessages Error while sending sms stats via email: ${err && err.stack || err} `, 'error', NAME );
                } );
        }

        if( Y.doccirrus.auth.isPUC() ) {
            Y.log( 'Registering for monthly SMS stats event: emailMonthlySmsStats', 'info', NAME );
            Y.doccirrus.kronnd.on( 'emailMonthlySmsStats', function onSendMonthlyMessage() {
                Y.log( 'Querying and sending sent SMS stats', 'info', NAME );
                sendMessages();
            } );
        }

        myEmail = new DCEmail();

        Y.namespace( 'doccirrus' ).email = myEmail;
    },
    '0.0.1', { requires: [ 'dckronnd', 'dccommonerrors' ] }
);