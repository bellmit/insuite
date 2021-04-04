/**
 * User: florian
 * Date: 26.11.20  13:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

/**
 * This service uses the dc-ti libary to get contact data from the VZD "Verzeichnisdienst" and stores it into a
 * database collection. Therefore tiDirectoryService-schema is used. This service is uses to cache the contact
 * VSD data and update it in a given time interval.
 * @returns {Promise<void>}
 */
YUI.add( 'tiDirectoryService-api', function( Y, NAME ) {

    const
        {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
        url = require('url');

    /**
     * It provides the database collection entries to use it in the frontend for example.
     * @param {Object} args: standard parameter to make db call.
     */
    function get( args ) {
        var
            {user, query} = args;

        Y.doccirrus.mongodb.runDb( {
            model: 'tiDirectoryService',
            query: query,
            user: user,
            options: args.options,
            callback: args.callback
        } );
    }

    /**
     * Provides a test call functionality to test the ldap server, if its possible to get data from it.
     * @param {Object} args
     * @returns {Promise<Object|undefined>}
     */
    async function testLdapConnection(args) {

        Y.log( 'Entering Y.doccirrus.api.kimaccount.testLdapConnection', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount.testLdapConnection' );
        }

        let
            kim = Y.doccirrus.dcTi.getKim(),
            {user, originalParams, callback} = args,
            {attributes, filter} = originalParams,
            ldapURL,
            server,
            pagingSize = 5,
            result,
            err;

        [err, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
            action: 'get',
            model: 'tisettings',
            user: user,
            query: {},
            options: {}
        }));

        if( err ) {
            Y.log( `#testLdapConnection(): Unable to get ldapFQDN from database: ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, result, callback );
        }

        try {
            ldapURL = new url.URL(result[0].ldapFQDN);
        } catch(err) {
            Y.log( `#testLdapConnection(): Unable to parse URL: ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, ldapURL, callback );
        }

        server = {
            host: ldapURL.hostname,
            port: ldapURL.port
        };

        [err, result] = await formatPromiseResult(kim.collectVZDContacts( server, pagingSize, attributes, filter, function() {
            Y.log( `#testLdapConnection(): LDAP Verzeichnisdienst wurde erfolgreich getestet.` , 'info', NAME );
        }));

        if( err ) {
            Y.log( `#testLdapConnection(): Unable to get ldapFQDN from KIM: ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, result, callback );
        }

        return handleResult( err, result, callback );
    }

    /**
     * Get the current VZD "Verzeichnisdienst" entries and store it into database.
     * @returns {Promise<void>}
     */
    async function getDirectoryServiceData(args) {
        Y.log( 'Entering Y.doccirrus.api.kimaccount.getDirectoryServiceData', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount.getDirectoryServiceData' );
        }

        let
            {user, callback} = args,
            result,
            err;

        [err,result] = await formatPromiseResult(retrieveDataFromVZD({user}));

        if( err ) {
            Y.log( `#getDirectoryServiceData(): Unable to get ldap data from "Verzeichnisdienst" (VZD).: ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, result, callback );
        }

        return handleResult( err, result, callback );
    }

    /**
     * Manages the the workflow for getting contacts from LDAP and writing it into a database collection. The current
     * Entries were downloaded and written in the db-collection. Then the old entries will be deleted and the new entries
     * were flagged as published.
     * @param args.user: the logged in User in inSuite.
     * @param args.server: server address for VZD.
     * @param args.port: server port for VZD.
     * @returns {Promise<void>}
     */
    async function retrieveDataFromVZD( args) {

        Y.log( 'Entering Y.doccirrus.api.kimaccount.retrieveDataFromVZD', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kimaccount.retrieveDataFromVZD' );
        }

        let
            url,
            {/*originalParams, */user, callback} = args,
            connectionData = {
                user: user,
                server: {}
            };

        let [err, tiSetting] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            action: 'get',
            model: 'tisettings',
            user: user,
            query: {},
            options: {}
        }));

        if( err ) {
            Y.log( `#retrieveDataFromVZD(): Unable to get ldapFQDN from database: ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, null, callback );
        }

        try {
            url = new URL(tiSetting[0].ldapFQDN);
            connectionData.server.host = url.hostname;
            connectionData.server.port = url.port;
        } catch(err) {
            Y.log( `#retrieveDataFromVZD(): Unable to parse URL: ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, url, callback );
        }

        [err] = await formatPromiseResult( _getEntriesFromVZDByPage( connectionData ) );

        if( err ) {
            Y.log( `#retrieveDataFromVZD(): Unable to get Entries from "Verzeichnisdienst" (VZD) with address: ${connectionData.server.host}:
            ${connectionData.server.port} : ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, null, callback );
        }

        [err] = await formatPromiseResult( _deleteOldDatabaseEntries( connectionData ) );

        if( err ) {
            Y.log( `#retrieveDataFromVZD(): Unable to delete old contacts from database tiDirectoryService : ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, null, callback );
        }

        [err] = await formatPromiseResult( _updateDatabaseEntries( connectionData ) );

        if( err ) {
            Y.log( `#retrieveDataFromVZD(): Unable to update contacts in database: tiDirectoryService : ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, null, callback );
        }
        return handleResult( null, null, callback );
    }

    /**
     * Makes paged calls for LDAP VZD data. Everytime the paging limit is reached, the new entries were written in
     * the collection. After that the next entries are called and written to db till the last page. KIM libary is used
     * here.
     * @param args.server: VZD server address.
     * @param.args.data: placeholder for collected VZD data.
     * @returns {Promise<void>}
     */
    async function _getEntriesFromVZDByPage( args ) {

        let kim = Y.doccirrus.dcTi.getKim();

        let [err] = await formatPromiseResult( kim.collectVZDContacts( args.server, 10, [],'uid=*', async function( result ) {
            args.data = result;
            await _writeVZDContactsIntoDatabase( args );
        } ) );

        if( err ) {
            Y.log( `#_getEntriesFromVZDByPage(): Unable to read "Verzeichnisdienst" (VZD) data. : ${err && err.stack || err}`, 'error', NAME );
            throw err;
        }
    }

    /**
     * Writes the VZD data into database collection for caching reasons. Adds a flag to each entry to show if its a new
     * entry or an old one.
     * @param args.data: VZD entries to write in the collection.
     * @returns {Promise<Error>}
     */
    async function _writeVZDContactsIntoDatabase( args ) {
        let
            err,
            cleanedEntries,
            {user, data = {}, options = {}} = args;

        for (let item of data) {
            item.published = false;
            item.mail = typeof item.mail === 'string' ? [item.mail] : item.mail;

            cleanedEntries = Y.doccirrus.filters.cleanDbObject( item );

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'tiDirectoryService',
                user,
                data: cleanedEntries,
                options
            } ) );

            if( err ) {
                Y.log( `#_writeVZDContactsIntoDatabase(): Unable to update database with KIM VZD data. : ${err && err.stack || err}`, 'error', NAME );
                throw err;
            }
        }
    }

    /**
     * Deletes the old entries from the collection.
     * @param args.user: logged in user in InSuite
     * @returns {Promise<Error>}
     */
    async function _deleteOldDatabaseEntries( args ) {

        let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            action: 'delete',
            model: 'tiDirectoryService',
            user: args.user,
            query: {
                published: true
            },
            options: {
                override: true
            }
        } ) );

        if( err ) {
            Y.log( `#_deleteOldDatabaseEntries(): Unable to delete published Entries from database: tiDirectoryService : ${err && err.stack || err}`, 'error', NAME );
            throw err;
        }
    }

    /**
     * Updates the collection by setting all entries to published.
     * @param args.user: logged in user in InSuite
     * @returns {Promise<Error>}
     */
    async function _updateDatabaseEntries( args ) {

        let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            action: 'update',
            model: 'tiDirectoryService',
            user: args.user,
            query: {},
            data: {
                $set: {
                    published: true
                }
            },
            options: {
                multi: true
            }
        } ) );

        if( err ) {
            Y.log( `#_updateDatabaseEntries(): Unable to delete published Entries from database: tiDirectoryService : ${err && err.stack || err}`, 'error', NAME );
            throw err;
        }
    }

    Y.namespace( 'doccirrus.api' ).tiDirectoryService = {
        /**
         * @property name
         * @type {String}
         * @default tiDirectoryService
         * @protected
         */
        name: NAME,
        get,
        retrieveDataFromVZD,
        testLdapConnection,
        getDirectoryServiceData

    };
}, '0.0.1', {
    requires: [
        'JsonRpc',
        'tiDirectoryService-schema',
        'dcTi'
    ]
} );


