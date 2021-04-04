/*global YUI */

/**
 * This Api handles the communication for KIM account configuration, KIM account persistance and pre-configuration for
 * communication with KIM. The KIM-Account-API manages creating deleting and updating the KIM account configuration.
 * Check validation of user credentials and provides formatting of user information. Its also provides functions to
 * send receive emails via KIM. In addition it manages the email attachments to store and read it from collections.
 */
YUI.add( 'kimaccount-api', function( Y, NAME ) {
        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            runDb = Y.doccirrus.mongodb.runDb,
            i18n = Y.doccirrus.i18n,
            util = require( 'util' ),
            fs = require( 'fs' ).promises,
            path = require( 'path' ),
            _ = require( 'lodash' ),
            moment = require( 'moment' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            importMediaFromFileAsync = util.promisify( Y.doccirrus.media.importMediaFromFile ),
            loginStates = {loginAccept: 'success', loginDenied: 'denied', loginError: 'failed'},
            emailProtocol = {emailPOP3: 'POP3', emailSMTP: 'SMTP'};

        /**
         * This method updates or creates KIM account configuration in the database. If a account already exists in
         * the database it gets updated with the new account information. If not it get created. Unique parameter
         * to identify accounts is kimUsername.
         * @param args.user: inSuite user
         * @param args.originalParams.kimAccountRowsData: All accounts from the TableView.
         * @param args.originalParams.model: The schema-model.
         * @returns {Promise<Object>}
         */
        async function updateKimAccountConfiguration( args ) {
            Y.log( 'Entering Y.doccirrus.api.kimAccount-api.updateKimAccountConfiguration', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount-api.updateKimAccountConfiguration' );
            }
            const
                {user, originalParams, model, callback} = args,
                {kimAccountRowsData} = originalParams;
            let
                databaseResult = [],
                result,
                err;

            for (let kimAccount of kimAccountRowsData) {

                if (!kimAccount._id) {
                    kimAccount._id = ObjectId();
                }

                [err, result] = await formatPromiseResult( runDb( {
                    action: 'upsert',
                    model: model,
                    user: user,
                    query: {_id: kimAccount._id},
                    data: Y.doccirrus.filters.cleanDbObject( kimAccount ),
                    fields: [
                        '_id', 'kimPassword', 'kimUsername', 'authorisedUsers', 'loginStatus', 'tiContext', 'serverAddressPOP',
                        'serverAddressSMTP'
                    ]
                } ) );

                if( err ) {
                    Y.log( `#updateKimAccountConfiguration(): Unable to create new KIM account configuration in database. : ${err && err.stack || err}`, 'error', NAME );
                    return handleResult( err, result, callback );
                }

                databaseResult.push(result);
            }

            return handleResult( err, databaseResult, callback );
        }

        /**
         * Deletes a KIM account from the database. In the given query its should be the kimUsername as unique key.
         * @param args.user: inSuite user.
         * @returns {Promise<Object>}
         */
        async function deleteKimAccount( args ) {
            Y.log( 'Entering Y.doccirrus.api.kimAccount-api.deleteKimAccount', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount-api.deleteKimAccount' );
            }

            let
                {user, callback, query} = args,
                result,
                err;

            [err, result] = await formatPromiseResult( runDb( {
                action: 'delete',
                model: 'kimaccount',
                user: user,
                query: query,
                options: {}
            } ) );

            if( err ) {
                Y.log( `#deleteKimAccount(): Unable to delete KIM account configuration from collection. : ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, result, callback );
            }

            return handleResult( err, result, callback );
        }

        /**
         * Sends an email per KIM. It uses dcTi libary for it. It gets the media data from collection to attach it to the
         * emails.
         * @param args: the email with subject, reviever, send, body.
         * @returns {Promise<void>}
         */
        async function sendEmail( args ) {

            Y.log( 'Entering Y.doccirrus.api.kimAccount-api.sendEmailToKim', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimAccount-api.sendEmailToKim' );
            }
            let
                kim = Y.doccirrus.dcTi.getKim(),
                {originalParams, user, callback} = args,
                originalAttachmentData = originalParams.attachments,
                activityIds = originalParams.activityIds,
                emailInformation,
                attachments,
                mediaIds = [],
                kimAccounts,
                senderAccount,
                kimUsernameForAuthentication,
                kimSenderInformation,
                patientTransferIds,
                activityUpdate,
                result,
                errKIM,
                err;

            [err, kimAccounts] = await formatPromiseResult( getKimAccountConfiguration( {user} ) );

            if( err ) {
                Y.log( `#sendEmail(): Unable to get KIM account information from database collection: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            for( let kimAccount of kimAccounts ) {
                if( kimAccount.kimUsername === originalParams.sender.username && kimAccount.loginStatus === loginStates.loginAccept ) {
                    senderAccount = kimAccount;
                }
            }

            kimSenderInformation = _getKimUsernameForClientModul( senderAccount, emailProtocol.emailSMTP );
            emailInformation = _getStructuredEmailInformationForSending( originalParams );

            [err, kimUsernameForAuthentication] = await formatPromiseResult( kim.buildUserNameForKIMUsageWithContext( kimSenderInformation ) );

            if( err ) {
                Y.log( `#sendEmail(): Unable to build KIM user configuration by using dcTi-KIM: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            for( let attachment of originalAttachmentData ) {
                mediaIds.push( attachment.mediaId );
            }

            [err, attachments] = await formatPromiseResult( _getAttachmentData( user, mediaIds ) );

            if( err ) {
                Y.log( `#sendEmail(): Unable to get attachment data from database: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [errKIM, result] = await formatPromiseResult( kim.sendEmail( kimSenderInformation.server, {
                user: kimUsernameForAuthentication,
                password: kimSenderInformation.login.password
            }, emailInformation.fields, attachments ) );

            if( errKIM ) {
                Y.log( `#sendEmail(): Unable to send emails with dcTi-KIM: ${err && err.stack || err}`, 'error', NAME );
                if( errKIM.code === 'EAUTH' ) {
                    errKIM.message = i18n( 'PatientTransferMojit.KimEmailService.kimInvalidAccountLoginMessage' );
                } else if( errKIM.code === 'ESOCKET' ) {
                    errKIM.message = i18n( 'PatientTransferMojit.KimEmailService.kimInvalidMailServerKonfiguration' );
                }
                return handleResult( errKIM, result, callback );
            }

            [err, patientTransferIds] = await formatPromiseResult( _storeSendEmailsIntoDatabase( {
                user,
                emailInformation,
                originalAttachmentData,
                originalParams
            } ) );

            if( err ) {
                Y.log( `#sendEmail(): Unable to store send emails into database collection: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            _postMessageChangesToAuditLog(user, patientTransferIds[0], emailProtocol.emailSMTP, errKIM);

            if( activityIds && originalParams.subject === 'Arztbrief') {

                [err, activityUpdate] = await formatPromiseResult( Y.doccirrus.api.edocletter.updateActivityStatus( {
                    user: user,
                    activityId: activityIds[0]
                } ) );

                if( err ) {
                    Y.log( `#sendEmail(): Unable to to change activity status or add flat fee treatment : ${err && err.stack || err}`, 'error', NAME );
                    return handleResult( err, result, callback );
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'refreshCaseFolder',
                    msg: {
                        data: {
                            caseFolderId: activityUpdate.activity[0].caseFolderId
                        }
                    }
                } );
            }

            return handleResult( err, {patientTransferIds: patientTransferIds, activityIds: activityIds, activityUpdate: activityUpdate}, callback );
        }

        /**
         * This method gets all Emails from from KIM email server via dc/ti-KIM. Gets emails from all configured and
         * valid KIM accounts. For each KIM Account it get the mails with the KIM libary, checks if email already exists
         * in patientTransfer collection, save not existing emails in collection with authorised users for reading
         * permission. it fetches the attachments and write it to db collection.
         * @param args.server: server information host and port.
         * @param args.login: login information for mail server.
         * @returns {Promise<Object[]>}
         */
        async function receiveEmails( args ) {
            // TODO: Spec Wann müssen Emails gelöscht werden auf dem Client-Modul (KOPS),

            Y.log( 'Entering Y.doccirrus.api.kimaccount-api.recieveEmailsFromKIM', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount-api.recieveEmailsFromKIM' );
            }

            let
                kim = Y.doccirrus.dcTi.getKim(),
                {user, originalParams, callback} = args,
                date = moment(),
                validKimAccounts,
                kimSenderInformation,
                kimUsernameForAuthentication,
                emails,
                emailInformation = [],
                combinedResult = [],
                result,
                errKIM,
                err;

            [err, validKimAccounts] = await formatPromiseResult( getKimAccountConfiguration( {user, originalParams} ) );

            if( err ) {
                Y.log( `#receiveEmails(): Unable to get KIM account information from database collection: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            for( let kimAccount of validKimAccounts ) {
                if( kimAccount.loginStatus === loginStates.loginAccept ) {
                    kimSenderInformation = _getKimUsernameForClientModul( kimAccount, emailProtocol.emailPOP3 );

                    [err, kimUsernameForAuthentication] = await formatPromiseResult( kim.buildUserNameForKIMUsageWithContext( kimSenderInformation ) );

                    if( err ) {
                        Y.log( `#receiveEmails(): Unable to build KIM user configuration by using dcTi-KIM with account ${kimAccount.kimUsername}: ${err && err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    [errKIM, emails] = await formatPromiseResult( kim.receiveEmails( kimSenderInformation.server, {
                        user: kimUsernameForAuthentication,
                        password: kimSenderInformation.login.password
                    } ) );

                    if( err ) {
                        Y.log( `#receiveEmails(): Unable to send emails with dcTi-KIM with account ${kimAccount.kimUsername}: ${err && err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    [err, emails] = await formatPromiseResult( _checkForAlreadyDownloadedEmails( user, emails ) );

                    if( err ) {
                        Y.log( `#receiveEmails(): Unable to check for downloaded emails with account ${kimAccount.kimUsername}: ${err && err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    [err, emailInformation] = await formatPromiseResult( _getStructuredEmailInformationForDatabaseWrite( user, emails, kimAccount ) );

                    if( err ) {
                        Y.log( `#receiveEmails(): Unable to structure email data with account ${kimAccount.kimUsername}: ${err && err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    [err, result] = await formatPromiseResult( _storeReceivedEmailsIntoDatabase( user, emailInformation ) );

                    if( err ) {
                        Y.log( `#receiveEmails(): Unable to store received emails into database with account ${kimAccount.kimUsername}: ${err && err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    for (let storedPatientTransfers of result) {
                        _postMessageChangesToAuditLog(user, storedPatientTransfers, emailProtocol.emailPOP3, errKIM);
                    }

                    combinedResult.push( result );
                }
            }

            _setKimMessagePollingLasttime(user, date);

            return handleResult( err, combinedResult, callback );
        }

        // Todo: documentation; put it to the private methodes at the end
        // Todo: In kimaccount-api.test.js an error occurs here.
        async function _setKimMessagePollingLasttime(user, date){
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'incaseconfiguration',
                    fields: ['kimMessagePollingLasttime'],
                    query: {_id: Y.doccirrus.schemas.incaseconfiguration.getDefaultData()._id},
                    data: Y.doccirrus.filters.cleanDbObject( {kimMessagePollingLasttime: date} )
                } )
            );
            if( err ) {
                Y.log( `kimAccount-api: kimMessagePollingLasttime: could not save kimMessagePollingLasttime to incaseConfiguration. Error: ${err.stack || err}`, 'warn', NAME );
                // Todo: handle error result
            }
        }

        /**
         * Api-function to get valid KIM accounts for sending emails with KIM.
         * @param args
         * @returns {Promise<Object|undefined>}
         */
        async function getValidKimAccounts( args ) {

            Y.log( 'Entering Y.doccirrus.api.kimAccount-api.getValidKimAccounts', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount-api.getValidKimAccounts' );
            }

            let
                {user, originalParams, callback} = args,
                validKimAccounts = [],
                result,
                err;

            [err, result] = await formatPromiseResult( getKimAccountConfiguration( {user, originalParams} ) );

            if( err ) {
                Y.log( `#getValidKimAccounts(): Unable to get KIM account configuration from collection. : ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, result, callback );
            }

            for( let account of result ) {
                if( account.loginStatus === loginStates.loginAccept ) {
                    validKimAccounts.push( account );
                }
            }

            validKimAccounts = validKimAccounts.map( function( validAccount ) {
                return {
                    id: validAccount._id,
                    username: validAccount.kimUsername,
                    authorisedUsers: validAccount.authorisedUsers
                };
            } );

            return handleResult( err, validKimAccounts, callback );
        }

        /**
         * This method provides the initial account configuration from the database collection. Chekcs if the tiContext
         * has changed, if so it deletes the tiContext from the KIM account. Checks if the KIM account configuration
         * from collection is still valid.
         * @param args.user: InSuite user
         * @returns {Promise<Object>}
         */
        async function getKimAccountConfiguration( args ) {
            Y.log( 'Entering Y.doccirrus.api.kimAccount-api.getKimAccountConfiguration', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount-api.getKimAccountConfiguration' );
            }

            const
                {user, originalParams, callback} = args;

            let
                {onlyAuthorisedUsers} = originalParams || false,
                query = {},
                kimAccounts,
                err;

            if( onlyAuthorisedUsers ) {
                query = {
                    authorisedUsers: {
                        $in: user.specifiedBy
                    }
                };
            }

            [err, kimAccounts] = await formatPromiseResult( runDb( {
                action: 'get',
                model: 'kimaccount',
                user: user,
                query: query,
                options: {}
            } ) );

            if( err ) {
                Y.log( `#getKimAccountConfiguration(): Unable to get KIM account configuration from collection. : ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, kimAccounts, callback );
            }

            [err, kimAccounts] = await formatPromiseResult( _checkIfTiConfigurationHasChanged( user, kimAccounts ) );

            if( err ) {
                Y.log( `#getKimAccountConfiguration(): Unable to check kimAccount for valid tiContext: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, kimAccounts, callback );
            }

            [err, kimAccounts] = await formatPromiseResult( _checkKimAccountCredentials( kimAccounts ) );

            if( err ) {
                Y.log( `#getKimAccountConfiguration(): Unable to check if kimAccounts are valid: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, kimAccounts, callback );
            }

            return handleResult( err, kimAccounts, callback );
        }

        /**
         * This method checks if the tiContext for the saved KIM account is still valid, if not it flags the account.
         * @param user: inSuite user
         * @param kimAccounts: kimAccount from kimaccount-collection
         * @returns {Promise<[]>}
         * @private
         */
        async function _checkIfTiConfigurationHasChanged( user, kimAccounts ) {

            let
                validKimAccounts = [],
                tiContext,
                err;

            [err, tiContext] = await formatPromiseResult( Y.doccirrus.api.ticontext.getConfigurationParameters( {user} ) );

            if( err ) {
                Y.log( `#_checkIfTiConfigurationHasChanged(): Unable to get tiContext configuration from api. : ${err && err.stack || err}`, 'error', NAME );
                throw err;
            }

            tiContext.forEach( function( tiContext ) {
                tiContext.id = tiContext.context.MandantId + '#' +
                               tiContext.context.ClientSystemId + '#' +
                               tiContext.context.WorkplaceId + '#';
            } );

            for( let account of kimAccounts ) {
                if( _contextExists( account, tiContext ) ) {
                    validKimAccounts.push( account );
                } else {
                    account.tiContext = '';
                    validKimAccounts.push( account );
                }
            }

            return validKimAccounts;
        }

        /**
         * Initial checking for the configured KIM account if the credentials successfully login into KIM. On startup
         * make a call with the stores credentials to KIM. If credentials are right it flags the account with success
         * otherwise with denied.
         * Checks each KIM account configuration.
         * @param args
         * @returns {Promise<String>}
         */
        async function _checkKimAccountCredentials( kimAccounts ) {
            let
                kim = Y.doccirrus.dcTi.getKim(),
                kimUsername,
                result,
                err;

            for( let kimAccount of kimAccounts ) {
                let
                    {server, login, tiContext} = _getKimUsernameForClientModul( kimAccount, emailProtocol.emailPOP3 );

                    [err, kimUsername] = await formatPromiseResult( kim.buildUserNameForKIMUsageWithContext( {
                        server,
                        login,
                        tiContext
                    } ) );

                if( err ) {
                    Y.log( `#_checkKimAccountCredentials(): Unable to build KIM user configuration. : ${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }

                [err, result] = await formatPromiseResult( kim.isUserLoginValid( {
                    server: server,
                    login: {user: kimUsername, password: login.password}
                } ) );

                if( err ) {
                    Y.log( `#_checkKimAccountCredentials(): Unable to check KIM account credentials. : ${err && err.stack || err}`, 'error', NAME );
                    kimAccount.loginStatus = loginStates.loginError;
                    throw err;
                }

                if( result ) {
                    kimAccount.loginStatus = loginStates.loginAccept;
                } else {
                    kimAccount.loginStatus = loginStates.loginDenied;
                }
            }
            return kimAccounts;
        }

        /**
         * Check if account has valid tiContext.
         * @param account: KIM account configuration
         * @param tiContext: ti context
         * @returns {boolean}: If account tiContext is valid tiContext it returns true.
         * @private
         */
        function _contextExists( account, tiContext ) {
            return tiContext.some( function( context ) {
                return context.id === account.tiContext;
            } );
        }

        /**
         * Builds the user and server information for KIM usage.
         * @param kimAccount: KIM account configuration
         * @returns {{server: {port: *, host: *, tls: boolean, secure: boolean}, tiContext: (*|string), login: {password: string|number|*, username: string|*}}}
         * @private
         */
        function _getKimUsernameForClientModul( kimAccount, protocol ) {
            let
                serverAddress,
                secure = false,
                tls = false;

            if( protocol === emailProtocol.emailPOP3 ) {
                if( kimAccount.serverAddressPOP ) {
                    serverAddress = kimAccount.serverAddressPOP.split( ':' );
                }
                if(serverAddress[1] === '10995') {
                    tls = true;
                }
            } else if( protocol === emailProtocol.emailSMTP ) {
                if( kimAccount.serverAddressSMTP ) {
                    serverAddress = kimAccount.serverAddressSMTP.split( ':' );
                }
                if(serverAddress[1] === '10465') {
                    secure = true;
                }
            }

            const
                server = {
                    host: serverAddress[0] || '',
                    port: serverAddress[1] || '',
                    secure: secure,
                    tls: tls
                },
                login = {
                    username: kimAccount.kimUsername,
                    password: kimAccount.kimPassword
                },
                tiContext = kimAccount.tiContext;

            return {server, login, tiContext};
        }

        /**
         * Structure the raw email data to a structure that is uses by dcTi-KIM.
         * @param originalParams
         * @returns {{fields: {receiver, sender, subject, body}, Attachments}}
         * @private
         */
        function _getStructuredEmailInformationForSending( args ) {
            const
                {sender, receiver, subject, body, patientId} = args;

            let
                allReceiver = [];

            for( let rec of receiver ) {
                for( let mail of rec.mail ) {
                    allReceiver.push( mail );
                }
            }

            return {
                fields: {
                    subject: subject || '',
                    receiver: allReceiver,
                    sender: sender.username || '',
                    body: body || '',
                    patient: patientId || ''
                }
            };
        }

        /**
         * Get all needed attachment data from media and fs.files collection and uses this to get the media buffer of
         * email content.
         * @param {Object} user: inSuite user.
         * @param {Array} mediaIds: IDs of media data we want to read.
         * @returns {Promise<[]>}
         * @private
         */
        async function _getAttachmentData( user, mediaIds ) {
            let
                media = [],
                files = [],
                buffers = [],
                attachmentData = [],
                err;

            [err, media] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'media',
                query: {
                    _id: {
                        $in: mediaIds
                    }
                }
            } ) );

            if( err ) {
                Y.log( `#_getAttachmentData() Unable to get data from media collection : ${err && err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err, files] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'fs.files',
                query: {
                    filename: {
                        $in: mediaIds
                    }
                }
            } ) );

            if( err ) {
                Y.log( `#_getAttachmentData() Unable to get data from file collection: ${err && err.stack || err}`, 'error', NAME );
                throw err;
            }

            for( let file of files ) {
                let buffer;

                [err, buffer] = await formatPromiseResult( _getMediaBuffer( user, file._id ) );

                if( err ) {
                    Y.log( `#_getAttachmentData() Unable to get attachment data as buffer from collection : ${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }
                buffers.push( buffer );
            }

            // Todo: change mime media type in media collection from APPLICATION_pdf to application/pdf -> Gematik certification
            // Todo: look here if the right data matches together in every case or need to double check it!
            if( media.length === files.length && files.length === buffers.length ) {
                for( let i = 0; i < media.length; i++ ) {
                    attachmentData.push( {
                        filename: path.basename( media[i].name ),
                        contentType: media[i].mime === 'APPLICATION_PDF' ? 'application/pdf' : media[i].mime,
                        size: files[i].length,
                        content: buffers[i].data
                    } );
                }
            }

            return attachmentData;
        }

        /**
         * Get the mediabuffer by gridfs for a given fs.files collection entry.
         * @param {Object} user: inSuite user
         * @param {String} fileId: Id of files collection entry.
         * @returns {Object}
         * @private
         */
        function _getMediaBuffer( user, fileId ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.gridfs.get( user, fileId, function( err, result ) {
                    if( err ) {
                        reject( err );
                        return;
                    }
                    resolve( result );
                } );
            } );
        }

        /**
         * Stores the send email into database collection to persist it.
         * @param args: email information to store into database.
         * @returns {Promise<Object|Error>}
         * @private
         */
        async function _storeSendEmailsIntoDatabase( args ) {
            let
                {user, originalAttachmentData, originalParams, emailInformation} = args,
                patientTransferEmailData,
                combinedResult = [],
                result,
                err;

            for( let receiver of emailInformation.fields.receiver ) {

                patientTransferEmailData = {
                    status: "SENT",
                    doctorName: user.U,
                    attachedMedia: originalAttachmentData || [],
                    subject: emailInformation.fields.subject,
                    textContent: emailInformation.fields.body,
                    patientId: emailInformation.fields.patient,
                    activityIds: originalParams.activityIds,
                    created: new Date(),
                    timestamp: new Date(),
                    kimRecipient: [
                        {
                            mail: receiver,
                            accountType: 'KIM'
                        }
                    ]
                };

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'post',
                    model: 'patienttransfer',
                    data: Y.doccirrus.filters.cleanDbObject( patientTransferEmailData ),
                    fields: ['status', 'doctorName', 'textContent', 'attachedMedia', 'subject', 'created', 'timestamp',
                            'kimRecipient', 'patientId', 'acitvityIds']

                } ) );

                if( err ) {
                    Y.log( `#sendEmailToKIM(): Unable to pass email entry to db: ${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }
                combinedResult.push(result[0]);
            }

            return combinedResult;
        }

        /**
         * Structure the raw email data to a structure that is uses by database collection. Also save the attachments
         * into media collection and link the patienttransfer item to it.
         * @param originalParams
         * @returns {{fields: {receiver, sender, subject, body}, Attachments}}
         * @private
         */
        async function _getStructuredEmailInformationForDatabaseWrite( user, emails, kimAccount ) {

            let
                emailsGrouped,
                patientTransferEntries = [],
                tempDir,
                media,
                result,
                err;

            emailsGrouped = _.groupBy( emails, function( email ) {
                return email.messageId;
            } );

            for( let emailsWithSameID of Object.keys( emailsGrouped ) ) {

                for( let [i, email] of emailsGrouped[emailsWithSameID].entries() ) {
                    let
                        attachedMedia = [];

                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'tiDirectoryService',
                        user,
                        query: {
                            mail: {
                                $in: email.from.value[0].address
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `#_getStructuredEmailInformationForDatabaseWrite(): Unable to update database with KIM VZD data. : ${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    [err, tempDir] = await formatPromiseResult( Y.doccirrus.tempFileManager.get( user, 'kimTempDir' ) );

                    if( err ) {
                        Y.log( `#_getStructuredEmailInformationForDatabaseWrite(): Unable to update database with KIM VZD data. : ${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    for( let attachment of email.attachments ) {
                        const filename = path.basename( attachment.filename );

                        [err] = await formatPromiseResult( fs.writeFile( path.join( tempDir.path, filename ), attachment.content ) );

                        if( err ) {
                            Y.log( `#_getStructuredEmailInformationForDatabaseWrite(): Unable to write file in tempDir : ${err && err.stack || err}`, 'error', NAME );
                            throw err;
                        }

                        [err, media] = await formatPromiseResult( importMediaFromFileAsync(
                            user,
                            path.join( tempDir.path, filename ),
                            'patienttransfer',
                            '',
                            filename,
                            'user',
                            'OTHER'
                        ) );

                        if( err ) {
                            Y.log( `#_getStructuredEmailInformationForDatabaseWrite(): Unable to import media from filesystem: ${err && err.stack || err}`, 'error', NAME );
                            throw err;
                        }

                        let titleAndCaption;
                        if( email.subject === 'Arztbrief' && media.mimeType === 'application/pdf' ) {
                            titleAndCaption = 'Arztbrief'; // no extension to look-a-like sent attachments
                        } else if( email.subject === 'Arztbrief' && media.mimeType === 'application/xml' ) {
                            titleAndCaption = 'Arztbrief.xml';
                        } else {
                            titleAndCaption = media.name;
                        }

                        attachedMedia.push( {
                            mediaId: media._id,
                            contentType: media.mimeType,
                            caption:  titleAndCaption,
                            title: titleAndCaption
                        } );
                    }

                    let patientTransferEntry = {
                        status: "NEW",
                        doctorName: email.from.text || '',
                        practiceName: result.length > 0 ? result[0].organization : '',
                        practiceCity: result.length > 0 ? result[0].localityName : '',
                        attachedMedia: attachedMedia,
                        subject: email.subject || '',
                        textContent: email.text || '',
                        created: new Date(),
                        partners: [],
                        timestamp: new Date(),
                        emailType: 'KIM',
                        kimAccount: kimAccount._id || '',
                        kimReceiverEmail: email.to.value[i].address || '',
                        messageID: email.messageId || ''
                    };

                    patientTransferEntries.push( patientTransferEntry );
                }
            }

            return patientTransferEntries;
        }

        /**
         * Stores the received emails into datbase collection to persist it.
         * @param {Object} user: inSuite user
         * @param {Object} patientTransferEmailData: email entries for collection
         * @returns {Promise<Array|Error>}
         * @private
         */
        async function _storeReceivedEmailsIntoDatabase( user, patientTransferEmailData ) {

            let
                combinedResult = [],
                result,
                err;

            for( let patientTransfer of patientTransferEmailData ) {

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'patienttransfer',
                    data: Y.doccirrus.filters.cleanDbObject( patientTransfer ),
                    fields: [
                        'status', 'doctorName', 'practiceName', 'practiceCity', 'subject', 'textContent', 'created',
                        'attachedMedia', 'partners', 'timestamp', 'emailType', 'messageID', 'kimReceipient', 'kimReceiverEmail',
                        'kimAccount'
                    ]
                } ) );

                if( err ) {
                    Y.log( `#_storeReceivedEmailsIntoDatabase(): Unable to pass email entry to db: ${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }

                combinedResult.push( result );
            }

            return combinedResult;
        }

        /**
         * Check if emails already existing in patienttransfer collection. Its check by Gematik email id.
         * @param {Object} user: inSuite user
         * @param {Array} emails: downloaded emails.
         * @returns {Promise<Array|Error>}
         * @private
         */
        async function _checkForAlreadyDownloadedEmails( user, emails ) {
            // Todo: maybe refactor to get all ids in collection and filter it with downloaded emails.
            var
                newEmails = [],
                result,
                err;

            for( let email of emails ) {
                [err, result] = await formatPromiseResult( runDb( {
                    action: 'get',
                    model: 'patienttransfer',
                    user: user,
                    query: {
                        messageID: email.messageId
                    },
                    options: {}
                } ) );

                if( err ) {
                    Y.log( `#_checkForAlreadyDownloadedEmails(): Unable to get patienttransfer entry from db: ${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }

                if( result.length === 0 ) {
                    newEmails.push( email );
                }
            }

            return newEmails;
        }

        function _postMessageChangesToAuditLog( user, patienttransferId, option, err) {
            Y.doccirrus.api.audit.postKIMMessageUpdate( user, 'patienttransfer', patienttransferId, option, err);
        }

        /**
         * @class kimAccount
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).kimaccount = {
            name: NAME,
            updateKimAccountConfiguration,
            getKimAccountConfiguration,
            deleteKimAccount,
            sendEmail,
            receiveEmails,
            getValidKimAccounts

        };
    },
    '0.0.1', {
        requires: [
            'JsonRpc',
            'kimaccount-schema',
            'ticontext-api',
            'dcTi',
            'tempdir-manager',
            'edocletter-api'
        ]
    }
);