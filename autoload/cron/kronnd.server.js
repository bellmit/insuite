/**
 * User: ad
 * Date: 12.08.2013
 * (c) 2013, Doc Cirrus GmbH, Berlin
 */

/* jshint node:true */
/* global YUI */
'use strict';

YUI.add( 'dckronnd', function( Y, NAME ) {

        const
            fs = require( 'fs' ),
            path = require( 'path' ),
            cluster = require( 'cluster' ),
            {CronJob, time} = require( 'cron' ),
            util = require( 'util' ),
            events = require( 'events' ),
            dcauth = require( 'dc-core' ).auth,
            {formatPromiseResult} = require('dc-core').utils;

        let intervalId,
            jobs = [];

        function Kronnd() {
            if( cluster.isMaster ) {
                events.EventEmitter.call( this );
            }

            this.cache = {
                configuration: {}
            };
        }

        util.inherits( Kronnd, events.EventEmitter );

        /**
         * Start jobs in queue...
         */
        function startJobs() {
            Y.log( 'Mojito is ready - starting jobs.', 'info', NAME );
            jobs.forEach( job => job.start() );
            clearInterval( intervalId );
        }

        function hasHourPart( jobTime ) {
            let parts = jobTime.split( ' ' );

            if( isNaN( parseInt( parts[2], 10 ) ) ) {
                process.exit( 44 );
            }
        }

        function boot( daemon ) {
            const config = require( 'dc-core' ).config.load( process.cwd() + '/cronjobs.json' );

            if( !config || !config.jobs || !config.jobs.length ) {
                return;
            }

            for( const entry of config.jobs ) {
                if( 'CloseDay' === entry.name ) {
                    hasHourPart( entry.time );
                }
                const job = new CronJob( {
                    cronTime: entry.time,
                    onTick: () => {
                        daemon.process( entry );
                    },
                    start: false
                } );

                job.name = entry.name;
                jobs.push( job );
            }
        }

        /*
        * This method just pick's Cron configuration from DB, creates a CronJob instance and adds it to Kronnd Jobs Array before all the jobs are started.
        *
        * Currently, though this method ONLY configures jobName "datasafeBackup" by fetching details from DB, we are still keeping this method name and
        * functionality generic so that in future if similar needs arise, then more jobs can be queried from DB and added to the Jobs array
        * inside this method i.e. Step 3 and so on.
        * */
        async function addUserConfiguredCronJobFromDB(self) { //jshint ignore:line
            let
                err,
                result,
                datasafeBackupJob,
                configuredCronJob;

            if( !Y.doccirrus.api.cli.getDccliSupportedFeatures().backup ){
                Y.log(`addUserConfiguredCronJobFromDB: Skipping as no 'dc-cli' found or 'dc-cli' does not support 'backup' feature`, "info", NAME);
                return;
            }

            try{
                // ----------------------------- 1. Get Cron Details of Job = datasafeBackup from DB -----------------------------
                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        Y.doccirrus.api.admin.getConfiguredDatasafeBackupJob({
                                            user: Y.doccirrus.auth.getSUForLocal()
                                        })
                                      );

                if( err ) {
                    Y.log(`addUserConfiguredCronJobFromDB: Failed to setup cronjob for 'datasafeBackup'`, "warn", NAME);
                    return;
                }

                if(!result || !result.cronJobName || !result.cronTimeHoursInDay) {
                    Y.log(`addUserConfiguredCronJobFromDB: missing cronJobName or cronTimeHoursInDay from the output of getConfiguredDatasafeBackupJob method. Unable to setup cronJob for 'datasafeBackup'`, "warn", NAME);
                    return;
                }

                datasafeBackupJob = result;
                // ----------------------------- 1. END  ------------------------------------------------------------------------------


                // ------------------------------ 2. Instantiate CronJob for JobName datasafeBackup and add it to jobs array-----------
                configuredCronJob = new CronJob( {
                    cronTime: `0 0 ${datasafeBackupJob.cronTimeHoursInDay.join(",")} * * *`,
                    onTick: function onTickProcessing() {
                        self.emit( datasafeBackupJob.cronJobName );
                    },
                    start: false
                } );

                configuredCronJob.name = datasafeBackupJob.cronJobName;
                jobs.push( configuredCronJob );
                // --------------------------------2. END -----------------------------------------------------------------------------

                Y.log(`addUserConfiguredCronJobFromDB: Successfully added user configured cronjob from DB to kronnd jobs`);
            } catch( excep ) {
                Y.log(`addUserConfiguredCronJobFromDB: Exception while creating CronJob. Error: ${excep.stack || excep}`, "error", NAME);
            }
        }

        /**
         * Process a cron job
         *
         * @param {Object} job Configuration of the cron job
         * @return {Promise<void>}
         */
        Kronnd.prototype.process = async function process( job ) {
            let config;

            // NOTE: This could be implemented dynamically to prevent mix-up with configuration data
            if( !['SendMessage', 'AutoEnding', 'Heartbeat', 'syncDispatch', 'RealignSchedules', 'processReceiveQueue'].includes(job.name) ) {
                // NOTE: We are excluding above job names from logging because they are called very frequently, i.e. after every 5, 45 or 59 seconds.
                Y.log( `cronjob: emitting event for cron job name = '${job.name}'`, 'info', NAME );
            }

            try {
                config = await this.load( job );
            } catch ( error ) {
                Y.log( error.message, 'error', NAME );
            }

            this.emit( job.name, config );
        };

        /**
         * Load the configuration of the given cron job
         *
         * @param {Object} job Configuration of the cron job
         * @return {Promise<Object|undefined>}
         */
        Kronnd.prototype.load = async function load( job ) {
            if( !job.config ) {
                return;
            }

            if ( job.config in this.cache.configuration === false ) {
                const file = path.join( process.cwd(), job.config );

                try {
                    await fs.promises.access( file, fs.constants.F_OK );
                } catch ( error ) {
                    throw new Error( `Failed to access cron job configuration ${job.config}: ${JSON.stringify(error)}` );
                }

                try {
                    this.cache.configuration[job.config] = JSON.parse( await fs.promises.readFile( file ) );
                } catch ( error ) {
                    throw new Error( `Failed to parse cron job configuration ${job.config}: ${JSON.stringify(error)}` );
                }
            }

            return this.cache.configuration[job.config];
        };

        /**
         * return the next time the job is expected to be executed
         * @param jobName
         * @returns {Date}
         */
        Kronnd.prototype.nextFireTime = function nextFireTime( jobName ) {

            var
                theJob = Y.Array.find( jobs, function( job ) {
                    return jobName === job.name;
                } );

            if( theJob ) {
                return theJob.cronTime.sendAt();
            }
        };

        /**
         * return the next time the job is expected to be executed
         * @param jobName
         */
        Kronnd.prototype.init = async function() { //jshint ignore:line
            if( Y.doccirrus.auth.isMocha() ) {
                return;
            }
            if( cluster.isMaster ) {
                await formatPromiseResult( addUserConfiguredCronJobFromDB(this) ); //jshint ignore:line

                if( dcauth.isReady ) {
                    startJobs();
                }
                else {
                    dcauth.onReady( startJobs );
                }

                Y.log( '**Starting Kronn Daemon**', 'info', NAME );
            }
        };

        /*
        * Concurrency: Should only be run on MASTER cluster
        *
        * This method is used to change daily job scheduled hours especially for jobName="datasafeBackup" as configured by user
        * from the inBackup UI.
        *
        * @param jobName <String ex. "datasafeBackup">
        * @param hoursArr <[Number] ex. [9, 13, 17]>
        *
        * @return String as below:
        *   NOT_MASTER -> No master cluster
        *   JOB_NOT_FOUND -> If the input jobName is not found in jobs array
        *   FAILED -> Exception while changing job schedule
        *   SUCCESSFUL -> Successfully changed job schedule
        * */
        Kronnd.prototype.changeDailyJobScheduleHours = function( user, jobName, hoursArr ) {
            if( cluster.isMaster ) {
                Y.log(`changeDailyJobScheduleHours: Changing schedule for job: ${jobName} with hours: ${JSON.stringify(hoursArr)}`, "info", NAME);

                let
                    found = false;

                try{
                    for( let job of jobs ) {
                        if( job.name === jobName ) {
                            job.setTime(time(`0 0 ${hoursArr.join(",")} * * *`));
                            job.start();
                            found = true;
                            break;
                        }
                    }

                    if( !found ) {
                        Y.log(`changeDailyJobScheduleHours: jobName: ${jobName} not found in kronnd jobs array`, "warn", "NAME");
                        return "JOB_NOT_FOUND";
                    }

                    Y.log(`changeDailyJobScheduleHours: Successfully changed schedule for job: ${jobName} with daily hours: ${JSON.stringify(hoursArr)}`, "info", NAME);
                    return "SUCCESSFUL";
                } catch(err) {
                    Y.log(`changeDailyJobScheduleHours: Exception while changing schedule of job ${jobName} with pattern: '* * ${hoursArr.join(",")} * * *'. Error: ${err.stack || err}`, "error", NAME);
                    return "FAILED";
                }
            } else {
                Y.log(`changeDailyJobScheduleHours: Attempt to change schedule for job: ${jobName} in child cluster. This operation is allowed only on master cluster`, "warn", NAME);
                return "NOT_MASTER";
            }
        };

        let
            myKronnd = new Kronnd();

            boot( myKronnd );

        //
        //  kronnd  is also an EventEmitter, so it exposes, on(), emit(), etc...
        //
        Y.namespace( 'doccirrus' ).kronnd = myKronnd;

    },
    '0.0.1', { requires: ['dcquarter-transition'] }
);
