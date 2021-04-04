/**
 * User: do
 * Date: 13/02/18  14:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
"use strict";
YUI.add( 'InvoiceLogManager', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            CronJob = require( 'cron' ).CronJob,
            migrate = require( 'dc-core' ).migrate,
            cronJobs = {};

        /**
         * Read auto validation times from database and initialize cron jobs
         */
        function init() {
            if( !require( 'cluster' ).isMaster ) {
                return;
            }

            migrate.eachTenantParallelLimit( initTenant, 1, initalized );
        }

        function initalized( err, results ) {
            if( err ) {
                Y.log( `could not initalize at least one tenant: ${err}`, 'error', NAME );
            }
            let resultStr = '';
            results.filter( result => {
                return result.gkv || result.pvs;
            } ).forEach( result => {
                resultStr += `Tenant ${result.tenantId}: GKV="${result.gkv}" PVS="${result.pvs}"\n`;
            } );
            Y.log( `initalized auto validation of invoice logs:\n${resultStr}`, 'info', NAME );
        }

        function initTenant( user, callback ) {
            Y.log( `initTenant: ${user.tenantId}`, 'debug', NAME );
            const result = {
                tenantId: user.tenantId,
                gkv: null,
                pvs: null
            };
            getConfig( user ).then( config => {
                if( config.gkvAutoValidationAt ) {
                    result.gkv = setCronJob( user, 'gkv', config.gkvAutoValidationAt );
                }
                // MOJ-9555: for now disable pvs auto validation due to less restrictions of pvslog creation
                // if( config.pvsAutoValidationAt ) {
                //     result.pvs = setCronJob( user, 'pvs', config.pvsAutoValidationAt );
                // }
                callback( null, result );
            } ).catch( err => {
                Y.log( `could not init auto validation for tenant ${user.tenantId}: ${err}`, 'error', NAME );
                callback( err );
            } );
        }

        function getConfig( user ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'invoiceconfiguration',
                query: {
                    $or: [
                        {gkvAutoValidationAt: {$ne: null}},
                        {pvsAutoValidationAt: {$ne: null}}
                    ]
                },
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

        function setCronJob( user, type, date ) {
            const
                id = `${user.tenantId}-${type}-invoicelog-autovalidation`;
            Y.log( `setCronJob: ${id}: ${date}`, 'debug', NAME );

            if( cronJobs[id] ) {
                Y.log( `setCronJob: stopping existing cron job for ${id} `, 'debug', NAME );
                cronJobs[id].stop();
            }
            let momentDate = moment( date ),
                minutes = momentDate.minutes(),
                hours = momentDate.hours(),
                cronTime = `00 ${minutes} ${hours} * * 1-5`;

            if( !date ) {
                Y.log( `setCronJob: no new time to set up cron job for ${id}`, 'debug', NAME );
                return;
            }

            Y.log( `setCronJob: set up cron job for ${id}`, 'info', NAME );
            cronJobs[id] = new CronJob( {
                cronTime: cronTime,
                onTick: function onTickProcessing() {
                    triggerValidation( user, type );
                },
                start: false/*, works only with "time" node module
                         timeZone: "Europe/Berlin"*/
            } );

            cronJobs[id].start();
            return cronTime;
        }

        function triggerValidation( user, type ) {
            Y.log( `triggering auto validation on tenant ${user.tenantId} of type ${type}`, 'info', NAME );
            Y.doccirrus.api.invoicelog.server.autoValidate( {
                user: Y.doccirrus.auth.getSUForTenant( user.tenantId ),
                invoiceLogType: type.toUpperCase()
            } ).catch( err => {
                Y.log( `an error occurred while triggering auto validation ${err}`, 'error', NAME );
            } );
        }

        /**
         * Update cron jobs for auto validation
         */
        function setAutoValidation( user, invoiceConfigObj ) {
            if( !invoiceConfigObj ) {
                return;
            }
            if( invoiceConfigObj.gkvAutoValidationAt ) {
                setCronJob( user, 'gkv', invoiceConfigObj.gkvAutoValidationAt );
            }
            // MOJ-9555: for now disable pvs auto validation due to less restrictions of pvslog creation
            // if( invoiceConfigObj.pvsAutoValidationAt ) {
            //     setCronJob( user, 'pvs', invoiceConfigObj.pvsAutoValidationAt );
            // }
        }

        Y.doccirrus.auth.onReady( function() {
            // MOJ-2445
            setTimeout( init, 8000 );
        } );

        Y.namespace( 'doccirrus' ).invoicelogManager = {
            setAutoValidation
        };
    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'dckronnd',
            'invoiceconfiguration-api',
            'invoicelog-api'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth'
        ]
    }
);


