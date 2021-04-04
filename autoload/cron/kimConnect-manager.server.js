/**
 * User: florian
 * Date: 08.02.21  11:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
"use strict";
YUI.add( 'kimManager', function( Y, NAME ) {

        const
            CronJob = require( 'cron' ).CronJob,
            migrate = require( 'dc-core' ).migrate,
            cronJobs = {};

        /**
         * Initalizes the cronjobs for tiDirectoryService and email pop3 polling.
         */
        function init() {
            if( !require( 'cluster' ).isMaster ) {
                return;
            }

            migrate.eachTenantParallelLimit( initTenantEmail, 1, initalized );
            migrate.eachTenantParallelLimit( initTenantTiDirectoryService, 1, initalized );
        }

        /**
         * Logs the result for activating the cronjobs on tenants.
         * @param {Error} err: error for each tenant for cronjob startup.
         * @param {Array} results: result for each tenant for cronjob startup.
         */
        function initalized( err, results ) {
            if( err ) {
                Y.log( `Could not initalize at least one tenant: ${err}`, 'error', NAME );
            }

            let resultStr = '';
            results.filter( result => {
                return result;
            } ).forEach( result => {
                resultStr += `Tenant ${result.tenantId}: job: ${result.job} with cronTime="${result.time}\n`;
            } );
            Y.log( `Initalized email collect for KIM accounts:\n${resultStr}`, 'info', NAME );
        }

        /**
         * Get the confiuration for email pollling and return the cronjob id the cronjob.
         * @param {Object} user: inSuite user.
         * @param {Object|Error} callback: returns the tenant and job id or error.
         */
        function initTenantEmail( user, callback ) {
            Y.log( `initTenant: ${user.tenantId}`, 'debug', NAME );
            const result = {
                tenantId: user.tenantId,
                job: {}
            };
            getConfig( user ).then( incaseConfig => {
                result.time = setCronJobEmails( user, incaseConfig.kimMessagePollingIntervalHours, incaseConfig.kimMessagePollingIntervalEnabled );
                result.job = 'Email polling from KIM server.';
                callback( null, result );
            } ).catch( err => {
                Y.log( `could not init email collect for tenant ${user.tenantId}: ${err}`, 'error', NAME );
                callback( err );
            } );
        }

        /**
         * Calls the cronjob start method save the job id for tenant.
         * @param {Object} user: inSuite user.
         * @param {Object|Error} callback: returns the tenant and job id or error.
         */
        function initTenantTiDirectoryService( user, callback ) {
            Y.log( `initTenant: ${user.tenantId}`, 'debug', NAME );

            const result = {
                tenantId: user.tenantId,
                job: {}
            };

            result.time = setCronJobDirectoryService( user );
            result.job = 'KIM-DirectoryService';
            Y.log( `Initalized TiDirectoryService for ${user.tenantId}`, 'info', NAME );
            callback( null, result );
        }

        /**
         * Get coniguration for email polling.
         * @param {Object} user: inSuite user.
         * @returns {Promise<unknown>}: incase configuration or error.
         */
        function getConfig( user ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'incaseconfiguration',
                query: {},
                options: {
                    limit: 1,
                    lean: true
                }
            } ).then( results => {
                return results && results[0] || {};
            } ).catch( err => {
                Y.log( `could not get config for tenant ${user.tenantId}: ${err}`, 'error', NAME );
                throw err;
            } );
        }

        /**
         * Sets up the cronjo by defining the interval when the emails get polled from the server. If there is an old
         * cronjob it gets stop by the job id and a new one under the same id starts.
         * @param {Object} user: inSuite user
         * @param {string} interval: polling interval in hours.
         * @param {Boolean} isEnabled: determinates if polling is enabled
         * @returns {string}: the cronjob time.
         */
        function setCronJobEmails( user, interval, isEnabled ) {
            const
                id = `${user.tenantId}-KIM-CollectEmailsFromMailServer`;
            Y.log( `setCronJobEmails(): ${id}`, 'debug', NAME );

            if( cronJobs[id] ) {
                Y.log( `setCronJobEmails(): stopping existing cron job for ${id} `, 'debug', NAME );
                cronJobs[id].stop();
            }

            if( !isEnabled ) {
                Y.log( `setCronJobEmails(): Emails cronJob disable, therefore no cron is set.`, 'debug', NAME );
                return;
            }

            let cronTime = `00 */${interval} * * 1-5`;

            if( !interval ) {
                Y.log( `setCronJobEmails: no interval to set cron job. ${id}`, 'debug', NAME );
                return;
            }

            Y.log( `setCronJobEmails: set up cron job for ${id}`, 'info', NAME );

            cronJobs[id] = new CronJob( {
                cronTime: cronTime,
                onTick: function onTickProcessing() {
                    triggerEmails( user );
                },
                start: false
            } );

            cronJobs[id].start();
            return cronTime;
        }

        /**
         * Set the cronjob for retrieving the "Verzeichnisdienst" VZD entries.
         * @param {Object} user: inSuite user.
         * @returns {string}: the cronjob time.
         */
        function setCronJobDirectoryService( user ) {
            const
                id = `${user.tenantId}-KIM-TiDirectoryService`;
            Y.log( `setCronJobDirectoryService(): ${id}`, 'debug', NAME );

            if( cronJobs[id] ) {
                Y.log( `setCronJobDirectoryService(): stopping existing cron job for ${id} `, 'debug', NAME );
                cronJobs[id].stop();
            }

            let cronTime = `00 3 * * 1-5`;

            Y.log( `setCronJobEmails: set up cron job for ${id}`, 'info', NAME );

            cronJobs[id] = new CronJob( {
                cronTime: cronTime,
                onTick: function onTickProcessing() {
                    triggerTiDirectoryService( user );
                },
                start: false
            } );

            cronJobs[id].start();
            return cronTime;
        }

        /**
         * Defines the function which is call at the cronjob time. It calls email polling from kimaccount-api.
         * @param {Object} user: inSuite user.
         */
        function triggerEmails( user ) {
            Y.log( `triggering collect KIM emails from server on tenant ${user.tenantId}`, 'info', NAME );
            Y.doccirrus.api.kimaccount.receiveEmails( {
                user: Y.doccirrus.auth.getSUForTenant( user.tenantId ),
                onlyAuthorisedUsers: false
            } ).catch( err => {
                Y.log( `an error occurred while triggering email collect from KIM ${err}`, 'error', NAME );
            } );
        }

        /**
         * Defines the function which is call at the cronjob time. It retrieves the VZD data.
         * @param {Object} user: inSuite user.
         */
        function triggerTiDirectoryService( user ) {
            Y.log( `triggering collect directoryService data from VZD on tenant ${user.tenantId}`, 'info', NAME );
            Y.doccirrus.api.tiDirectoryService.getDirectoryServiceData( {
                user: Y.doccirrus.auth.getSUForTenant( user.tenantId )
            } ).catch( err => {
                Y.log( `an error occurred while triggering TiDirectoryService. ${err}`, 'error', NAME );
            } );
        }

        /**
         * Api function to set up a new cronjob for email polling in a given interval (hours).
         * @param {user} user: inSuite user.
         * @param {Object} incaseConfigObj: configuration for inCase
         */
        function setAutomatedEmailCollect( user, incaseConfigObj ) {
            if( !incaseConfigObj ) {
                return;
            }
            setCronJobEmails( user, incaseConfigObj.kimMessagePollingIntervalHours, incaseConfigObj.kimMessagePollingIntervalEnabled );
        }

        Y.doccirrus.auth.onReady( function() {
            setTimeout( init, 8000 );
        } );

        Y.namespace( 'doccirrus' ).kimManager = {
            setAutomatedEmailCollect
        };
    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'dckronnd',
            'incaseconfiguration-api',
            'kimaccount-api',
            'tiDirectoryService-api'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth'
        ]
    }
);


