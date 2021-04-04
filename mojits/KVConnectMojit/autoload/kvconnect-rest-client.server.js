/**
 * User: do
 * Date: 13.08.19  15:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'kvconnect-rest-client', function( Y, NAME ) {

        /**
         * @module kvconnect-rest-client
         * @description Rest Client for KV Connect Server 2.7.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Spezifikation+KV-Connect+Server+2.7
         */

        const fs = require( 'fs' );
        const util = require( 'util' );
        const path = require( 'path' );
        const rp = require( 'request-promise' );
        // const {formatPromiseResult} = require( 'dc-core' ).utils;
        const getObject = Y.doccirrus.commonutils.getObject;
        const readFileAsync = util.promisify( fs.readFile );
        const XmlParser = require( 'xml2js' ).Parser;
        const xmlParser = new XmlParser();

        let certs = null;
        let baseUrl = null;

        /**
         * Initializes kvconnectRestClient
         * @return {Promise<void>}
         */
        async function init() {
            Y.log( `init kvconnect rest client`, 'info', NAME );

            const kvcConfig = Y.doccirrus.kvconnect.getConfig();
            baseUrl = kvcConfig.baseUrl;
            certs = kvcConfig.certs;

            for( let certName of Object.keys( certs ) ) {
                const certFileName = certs[certName];
                try {
                    const certPath = path.resolve( __dirname, `../assets/certs/${certFileName}` );
                    certs[certName] = {
                        buffer: await readFileAsync( certPath ),
                        filePath: certPath
                    };
                } catch( err ) {
                    Y.log( `could not not read ${certFileName}: ${err.stack || err}`, 'error', NAME );
                    process.kill( 44 );
                }
            }
        }

        async function parseXmlReponse( response ) {
            return new Promise( ( resolve, reject ) => {
                xmlParser.parseString( response, ( err, result ) => {
                    if( err ) {
                        reject( err );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        async function parseAccountResponse( response ) {
            Y.log( `parseAccountResponse: ${response}`, 'debug', NAME );
            let {account} = await parseXmlReponse( response );
            if( !account ) {
                throw Error( 'could not parse account response' );
            }
            let pwdLastChange = getObject( 'passwordLastChange.0', account );
            return {
                uid: getObject( '$.uid', account ),
                email: getObject( 'email.0', account ),
                passwordLastChange: pwdLastChange && new Date( pwdLastChange ) || null,
                passwordChangeNeeded: 'true' === getObject( 'passwordChangeNeeded.0', account )
            };
        }

        async function parseHeaderResponse( response ) {
            let {headers} = await parseXmlReponse( response );
            if( !headers ) {
                return [];
            }
            return headers.header.map( header => {
                return {
                    from: getObject( 'from.0', header ),
                    to: getObject( 'to.0', header ),
                    subject: getObject( 'subject.0', header ),
                    messageId: getObject( 'message-id.0', header ),
                    inReplyTo: getObject( 'in-reply-to.0', header ),
                    date: getObject( 'date.0', header ),
                    kvcTransmitterSystem: getObject( 'x-kvc-sendersystem.0', header ),
                    kvcServiceId: getObject( 'x-kvc-dienstkennung.0', header ),
                    returnPath: getObject( 'return-path.0', header ),
                    dispositionNotificationTo: getObject( 'disposition-notification-to.0', header ),
                    contentType: getObject( 'content-type.0', header )

                };
            } );
        }

        async function parseCertificateResponse( response ) {
            Y.log( `parseCertificateResponse: ${response}`, 'debug', NAME );
            let {certificate} = await parseXmlReponse( response );
            if( !certificate ) {
                throw Error( 'could not parse certificate response' );
            }
            const validFrom = getObject( 'validFrom.0', certificate );
            const validTo = getObject( 'validTo.0', certificate );
            return {
                id: getObject( 'id.0', certificate ),
                email: getObject( 'email.0', certificate ),
                data: getObject( 'body.0', certificate ),
                validFrom: validFrom && new Date( validFrom ),
                validTo: validFrom && new Date( validTo )
            };
        }

        async function parseCsrStatus( response ) {
            Y.log( `parseCsrStatus: ${response}`, 'debug', NAME );
            let csrStatus = await parseXmlReponse( response );
            if( !csrStatus ) {
                throw Error( 'could not parse csrStatus response' );
            }
            return getObject( 'csr-status.status-entries.0.status-entry.0.$.status', csrStatus );
        }

        /**
         * Helper to build options object for request calls.
         * @param {String}          resourceUrl
         * @param {Object}          options
         * @return {{url: string, cert: string, ca: string, followRedirect: boolean}}
         */
        function getRequestOptions( resourceUrl, options = {} ) {
            return {
                url: `${baseUrl}/${resourceUrl}`,
                cert: certs.server.buffer,
                ca: certs.root.buffer,
                followRedirect: false,
                ...options
            };
        }

        /**
         * Returns version of server if available.
         * @comment Used to check if server available. Needs no user credentials.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Versionsnummer+des+Servers+auslesen
         * @return {Promise<*>}
         */
        async function version() {
            return rp.get( getRequestOptions( 'server/version' ) );
        }

        /**
         * If login succeeds forwards to account data of user.
         * @comment Used to get UUID of user for further rest calls.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Login-UID+Mapping
         * @param {Object}      args
         * @param {Object}      args.auth
         * @return {Promise<*>}
         */
        async function login( args ) {
            const {auth} = args;
            let response = await rp.get( getRequestOptions( `login/${auth.username}`, {auth, followRedirect: true} ) );
            return parseAccountResponse( response );
        }

        /**
         * Gets account data of specified account. Auth user must be owner of the account.
         * @comment /login forwards to this route on success.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Abruf+von+Account-Daten
         * @param {Object}      args
         * @return {Promise<*>}
         */
        async function getAccount( args ) {
            const {auth, accountId} = args;
            return rp.get( getRequestOptions( `accounts/${accountId}`, {auth} ) );
        }

        /**
         * Returns all headers from messages on server. Oldest messages come first. If 'from' or 'to' arg can be used to consume mails in
         * smaller chunks to process in order and delete mails before deletion from server.
         * Headers can be shortened by setting short to true.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Abruf+aller+Header
         * @param {Object}      args
         * @param {Object}      args.auth
         * @param {String}      args.accountId
         * @param {Boolean}     args.short
         * @param {Number}      args.from
         * @param {Number}      args.to
         * @return {Promise<*>}
         */
        async function getHeaders( args ) {
            const {auth, accountId, short = false, from, to} = args;
            const response = await rp.get( getRequestOptions( `accounts/${accountId}/${short === true ? 'headers(short)' : 'headers'}`, {
                auth,
                qs: {from, to}
            } ) );

            return parseHeaderResponse( response );
        }

        /**
         * Receive all messages of specified user.
         * @comment does not scale so better use getMessagesHeaders
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Abruf+aller+Mails
         * @param {Object}      args
         * @param {Object}      args.auth
         * @param {String}      args.accountId
         * @return {Promise<*>}
         */
        async function getAllMessages( args ) {
            const {auth, accountId} = args;
            return rp.get( getRequestOptions( `accounts/${accountId}/mails`, {auth} ) );
        }

        /**
         * Get complete message from server.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Abruf+einer+Mail
         * @param {Object}      args
         * @param {Object}      args.auth
         * @param {String}      args.accountId
         * @param {String}      args.messageId
         * @return {Promise<*>}
         */
        async function getMessage( args ) {
            const {auth, accountId, messageId} = args;
            return rp.get( getRequestOptions( `accounts/${accountId}/mails/${messageId}`, {auth} ) );
        }

        /**
         * Deletes message from server.
         * @see https://partnerportal.kv-telematik.de/pages/viewpage.action?pageId=47448248
         * @param {Object}      args
         * @param {Object}      args.auth
         * @param {String}      args.accountId
         * @param {String}      args.messageId
         * @return {Promise<*>}
         */
        async function deleteMessage( args ) {
            const {auth, accountId, messageId} = args;
            return rp.delete( getRequestOptions( `accounts/${accountId}/mails/${messageId}`, {auth} ) );
        }

        /**
         * Fetches the whole address book as zipped json file. Use lastFetchedAt arg to only download when modified.
         * @comment This way we can put everything in our database so we can use KoTable to display.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Abruf+des+Adressbuches
         * @param {Object}          args
         * @param {Object}          args.lastFetchedAt
         * @return {Promise<*>}
         */
        async function getAddressBook( args ) {
            const {lastFetchedAt} = args; // TODO: auth needed here?
            let headersOption;
            if( lastFetchedAt ) {
                // TODO: format date? Must be 'Mon, 12 Aug 2019 02:30:07 GMT'.
                headersOption = {headers: {'If-Modified-Since': lastFetchedAt}};
            }
            return rp.get( getRequestOptions( '/vzd/accounts.json.zip', headersOption ) );
        }

        /**
         * Send Certificate Signing Request to the server.
         * Returns csrId to watch status of CSR.
         * @see https://partnerportal.kv-telematik.de/pages/viewpage.action?pageId=47448258
         * @param {Object}  args
         * @param {Object}  args.auth
         * @param {Object}  args.csr
         * @return {Promise<*>}
         */
        async function sendCSR( args ) {
            const {auth, csr} = args;
            const response = await rp.post( getRequestOptions( `csr`, {
                auth,
                headers: {'Content-Type': 'text/plain'},
                body: csr
            } ) );
            return response.substring( response.lastIndexOf( '/' ) + 1 );
        }

        /**
         * Checks status of specified Certificate Signing Request.
         * Returns information about the status including status code:
         * Status-Code  Bedeutung
         * 100 - 199    Annahme des Zertifikats
         *  100             CSR empfangen
         *  110             Altes Zertifikat als Ressource gelöscht
         *  120             Altes Zertifikat aus CA gelöscht
         * 200 - 299    Bearbeitung durch CA
         *  210             CSR an CA geleitet
         *  299             Zertifikat von CA empfangen
         * 300 - 399    Verzeichnisdienst
         *  399             Zertifikat in Verzeichnisdienst veröffentlicht
         * 900 - 999    Abschluss-Codes
         *  900             Allgemeiner Fehler, z.B. CA nicht erreichbar
         *  901             Durch neuen CSR abgebrochen
         *  902             CSR abgelehnt
         *  903             Falsches Subject
         *  999             CSR erfolgreich bearbeitet
         *
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/CSR+Status
         * @param {Object}          args
         * @return {Promise<*>}
         */
        async function csrStatus( args ) {
            const {auth, csrId} = args;
            const response = await rp.get( getRequestOptions( `csr/${csrId}`, {auth} ) );
            return parseCsrStatus( response );
        }

        /**
         * Gets certificate of specified accountId.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Abruf+eines+Zertifikats+mittels+UID+oder+Email-Adresse
         * @param {Object}          args
         * @param {Object}          args.auth
         * @param {String}          args.accountId
         * @return {Promise<*>}
         */
        async function getCertificateByAccountId( args ) {
            const {auth, accountId} = args;
            const response = await rp.get( getRequestOptions( `certificates`, {auth, qs: {uid: accountId}} ) );
            return parseCertificateResponse( response );
        }

        /**
         * Gets certificate of specified email address.
         * @param {Object}          args
         * @param {Object}          args.auth
         * @param {String}          args.email
         * @return {Promise<*>}
         */
        async function getCertificateByEmail( args ) {
            const {auth, email} = args;
            const response = await rp.get( getRequestOptions( `certificates`, {auth, qs: {email}} ) );
            return parseCertificateResponse( response );
        }

        /**
         * Delete certificate of specified accountId on kvconnect server.
         * @see https://partnerportal.kv-telematik.de/pages/viewpage.action?pageId=47448257
         * @param {Object}          args
         * @param {Object}          args.auth
         * @param {String}          args.accountId
         * @return {Promise<*>}
         */
        async function deleteCertificate( args ) {
            const {auth, accountId} = args;
            return rp.delete( getRequestOptions( `accounts/${accountId}/certificate`, {auth} ) );
        }

        /**
         * Sends SMIME mail to kvconnect server.
         * @see https://partnerportal.kv-telematik.de/display/KVCS27/Senden+einer+Mail?src=contextnavpagetreemode
         * @param {Object}          args
         * @param {Object}          args.auth
         * @param {String | *}      args.message
         * @return {Promise<*>}
         */
        async function sendMessage( args ) {
            const {auth, message} = args;
            return rp.post( getRequestOptions( `mails`, {
                auth,
                headers: {'Content-Type': 'text/plain;charset=UTF-8'},
                body: message
            } ) );
        }

        /**
         * Change account password.
         * @see https://partnerportal.kv-telematik.de/pages/viewpage.action?pageId=47448254
         * @param {Object}  args
         * @param {Object}  args.auth
         * @param {String}  args.password
         * @return {Promise<*>}
         */
        async function changePassword( args ) {
            const {auth, accountId, password} = args;
            return rp.post( getRequestOptions( `accounts/${accountId}/password`, {
                auth,
                headers: {'Content-Type': 'text/plain;charset=UTF-8'},
                body: password
            } ) );
        }

        function getUserCAFilePath() {
            return certs.user.filePath;
        }

        Y.namespace( 'doccirrus' ).kvconnectRestClient = {
            init,
            getUserCAFilePath,
            version,
            login,
            getAccount,
            getHeaders,
            getAllMessages,
            getMessage,
            deleteMessage,
            getAddressBook,
            sendCSR,
            csrStatus,
            getCertificateByAccountId,
            getCertificateByEmail,
            deleteCertificate,
            sendMessage,
            changePassword
        };

    },
    '0.0.1', {requires: ['dccommonutils']}
);