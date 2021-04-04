/**
 * User: LG
 * Date: 15/05/14  13:27
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
/* eslint-disable valid-jsdoc*/


YUI.add( 'cli-api', function( Y, NAME ) {

        const
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,

            async = require( 'async' ),
            ObjectID = require( 'mongodb' ).ObjectID,
            _ = require( 'lodash' ),
            dcauth = require( 'dc-core' ).auth,
            crypto = require( 'crypto' ),
            os = require( 'os' ),
            childProcess = require( 'child_process' ),
            moment = require( 'moment' ),
            fs = require( 'fs' ),
            util = require( 'util' ),
            CLICOMMAND = 'dc-cli',
            SUDOCOMMAND = 'sudo',

            CRON_EMAIL_JADE = './mojits/UserMgmtMojit/views/backupemail.jade.html',

            BACKUP_SUBJECT_SUCCESS = i18n( 'UserMgmtMojit.cli-apiJS.email.BACKUP_SUBJECT_SUCCESS' ),
            // backup email currently disbled, see MOJ-7508
            // BACKUP_SUCCESS = i18n( 'UserMgmtMojit.cli-apiJS.email.BACKUP_SUCCESS' ),
            BACKUP_SUBJECT_FAIL = i18n( 'UserMgmtMojit.cli-apiJS.email.BACKUP_SUBJECT_FAIL' ),
            BACKUP_FAIL = i18n( 'UserMgmtMojit.cli-apiJS.email.BACKUP_FAIL' ),
            CLOUD_BACKUP_LIST_FAIL_REASON_NO_DATA = i18n( 'UserMgmtMojit.cli-apiJS.email.CLOUD_BACKUP_LIST_FAIL_REASON_NO_DATA' ),
            CLOUD_BACKUP_LIST_FAIL_REASON_NO_MODEL = i18n( 'UserMgmtMojit.cli-apiJS.email.CLOUD_BACKUP_LIST_FAIL_REASON_NO_MODEL' ),
            CLOUD_BACKUP_LIST_FAIL = i18n( 'UserMgmtMojit.cli-apiJS.email.CLOUD_BACKUP_LIST_FAIL' ),
            MANAGE_BACKUP_DEVICES = i18n( 'InBackupMojit.InBackupViewModel.message.MANAGE_BACKUP_DEVICES' ),

            //  broadcast from master when features change or are requested by worker
            IPC_SUPPORTED_FEATURES_UPDATED = 'IPC_SUPPORTED_FEATURES_UPDATED',
            //  worker requests dccliSupportedFeatures from master
            IPC_SUPPORTED_FEATURES_REQUEST = 'IPC_SUPPORTED_FEATURES_REQUEST',

            //  broadcast from master when cups status changes or are requested by worker
            IPC_CUPS_STATUS_UPDATED = 'IPC_CUPS_STATUS_UPDATED',
            //  worker requests dccliSupportedFeatures from master
            IPC_CUPS_STATUS_REQUEST = 'IPC_CUPS_STATUS_REQUEST';

        let
            dccliSupportedFeatures = {
                cups: false,
                backup: false,
                update: false,
                reboot: false,
                replication: false,
                ups: false,
                raid: false,
                customX509: false,
                network: false,
                shutdown: false,
                sols: false
            },
            dccliCupsStatus = {
                "enabled" : true
            },
            isDcCliAvailable,
            cachedProxyConfig = {
                isQueried: false,
                proxy: undefined
            },
            systemId;

        var
            COMMANDS = {
                hasDCcli: function() {
                    // to prevent the risk of a blocking call we should use `sudo -v` before this
                    // but instead of doing this again and again we need an abstraction for this
                    // see LAM-745
                    return new Command( {command: SUDOCOMMAND, params: ["-n", "-l", CLICOMMAND]} );
                },
                supportedFeatures() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--features"]} );
                },
                // ---------------------------------- Get/Set Proxy commands -----------------------------------------
                getProxyConfig() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--proxy-config"]} );
                },
                setProxyConfig() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "-proxy-config-set"]} );
                },
                resetProxyConfig() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--proxy-config-reset"]} );
                },
                applyProxyConfig() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--proxy-config-apply"]} );
                },
                // ---------------------------------- Get/Set Proxy commands (END) -----------------------------------
                getStatus: function() {
                    var cmd = new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--status"]} );
                    return cmd;
                },
                getCupsStatus: function() {
                    var cmd = new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--cups-status"]} );
                    Y.log( 'getting cups status...', 'info', NAME );
                    return cmd;
                },
                reboot: function() {
                    var cmd = new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--reboot"]} );
                    Y.log( 'rebooting...', 'info', NAME );
                    return cmd;
                },
                updateCheck: function() {
                    var cmd = new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--update-check"]} );
                    Y.log( 'checking for update...', 'info', NAME );
                    return cmd;
                },
                update: function() {
                    var cmd = new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, "--syslog", "--update-reboot"]} );
                    Y.log( 'updating...', 'info', NAME );
                    return cmd;
                },
                // Backup commands
                getBackupState() {
                    // unused - Backup is not initialized.
                    // unknown - Maybe the storage partition is not mounted, so its not possible to determine the current backup state.
                    // idle - No backup operation in progress.
                    // sync - Backup repository is synced to/from an external device
                    // backup - backup operation in progress
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--b2-state']} );
                },
                initBackup() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', '--b2-init']} );
                },
                destroyBackup() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--b2-destroy']} );
                },
                createBackup() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', '--b2-create']} );
                },
                createBackupWait() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', '--b2-create-wait']} );
                },
                createBackupOnIdle() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', '--b2-create-onidle']} );
                },
                getBackupInfo() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--b2-info']} );
                },
                // Backlup devices commands
                listBackupDevices() {
                    // <id> Usually the usb device id, "samba" or "cloud".
                    // freeSize is -1 in case its not possible to determine how much space is left on the device.
                    // raw - device is uninitialize
                    // idle - initialized and ready to be used
                    // sync - synchronization is in progress
                    // blocked - device is blocked by an unspecific operation
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--b2-devices']} );
                },
                initBackupDevice() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', `--b2-device-init`]} );
                },
                checkBackupDevice() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', `--b2-device-check`]} );
                },
                checkBackupDeviceFull() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', `--b2-device-check-full`]} );
                },
                infoBackupDevice() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, `--b2-device-info`]} );
                },
                importBackupDevice() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, `--b2-device-import`]} );
                },
                exportBackupDevice() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, '--syslog', `--b2-device-export`]} );
                },
                exportBackupDeviceWait() {
                    return new Command( {command: SUDOCOMMAND, params: [CLICOMMAND, `--b2-device-export-wait`]} );
                }
            },
            communication = Y.doccirrus.communication,
            tempSubDir = `${Y.doccirrus.auth.getTmpDir() }/doNotDeleteMe`,
            updateErrorFile = `${tempSubDir}/update_error.txt`,
            updateOutputFile = `${tempSubDir}/update_result.txt`,
            smbParamsMap = {
                backupSmbPort: '--smb-port',
                backupSmbPath: '--smb-path',
                backupSmbPassword: '--smb-password',
                backupSmbLogin: '--smb-user',
                backupSmbHost: '--smb-host',
                backupSmbDomain: '--smb-domain'
            },
            smbDefaults = {
                backupSmbPort: '445',
                backupSmbPath: '/',
                backupSmbPassword: ' ',
                backupSmbLogin: 'guest'
            },
            smbFields = ['backupSmbHost', 'backupSmbPort', 'backupSmbPath', 'backupSmbLogin', 'backupSmbPassword', 'backupSmbDomain'];

        // -------- Getter/Setter for 'isDcCliAvailable' ---------
        /**
         * @method PRIVATE
         * @returns {Boolean | undefined}
         */
        function getIsDcCliAvailable() {
            return isDcCliAvailable;
        }

        /**
         * @method PRIVATE
         * @param {Boolean} bool
         *
         * @returns undefined
         */
        function setIsDcCliAvailable( bool ) {
            isDcCliAvailable = bool;
        }

        /**
         * @method PUBLIC
         *
         * NOTE: Should be only used with mocha tests.
         * This method resets isDcCliAvailable from the cache so that mocha tests
         * can run the tests properly using stubs
         *
         * @returns undefined
         */
        function resetIsDcCliAvailable() {
            isDcCliAvailable = undefined;
        }
        // ----------------------- END --------------------------

        // -------- Getter/Setter for 'cachedProxyConfig' ---------
        function getCachedProxyConfig() {
            return cachedProxyConfig;
        }

        function setCachedProxyConfig( proxy ) {
            cachedProxyConfig.isQueried = true;
            cachedProxyConfig.proxy = proxy;
        }
        // ----------------------- END --------------------------

        function Command( opt ) {
            this.command = opt.command;
            this.params = opt.params;
        }

        Command.prototype.addParam = function( _param ) {
            this.params.push( _param );
        };

        Command.prototype.checkAndAddSyslog = function() {
            if( Array.isArray(this.params) && !this.params.includes("--syslog") && this.params[0] === CLICOMMAND ) {
                // Add --syslog param just after CLICOMMAND path so there is no mismatch of arguments
                this.params.splice( 1, 0, '--syslog' );
            }
        };

        /**
         * spawnOptions: https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
         * @param {Object} cmd
         * @param {Function} callback
         * @param {Object} options
         * @param {String} options.smbConf
         * @param {String} options deviceId
         * @param {String} options.backupKey
         */
        function run_cmd( cmd, callback, options ) {
            options = options || {};
            let
                spawn = childProcess.spawn,
                child,
                resp = "",
                error,
                output,
                callbackCalled = false,
                deviceId = options.deviceId,
                smbConf = options.smbConf,
                backupKey = options.backupKey,
                spawnOptions = Object.assign( {}, options.spawnOptions ),
                fullCommandString;

            if( deviceId ) {
                cmd.addParam( deviceId );
            }

            if( deviceId && 'samba' === deviceId.toLowerCase() ) {
                Object.keys( smbConf ).forEach( key => {
                    if( smbConf[key] && smbParamsMap[key] ) {
                        cmd.addParam( `${smbParamsMap[key]}=${smbConf[key]}` );
                    }
                } );
            }

            if( backupKey ) {
                spawnOptions.env = Object.assign( {}, process.env, {B2_KEY: backupKey} );
            }

            if( Y.config.logLevel === "debug" ) {
                cmd.checkAndAddSyslog();
            }

            // Allow everything except user typed smb password
            const commandParams = (cmd.params || []).filter( paramStr => !paramStr.includes("--smb-password") );
            fullCommandString = `${cmd.command} ${commandParams.join(' ')}`;

            Y.log(`run_cmd: Executing command (NOTE: '--smb-password' key is not shown in this log for security) = "${fullCommandString}"`, "debug", NAME);

            child = spawn( cmd.command, cmd.params, spawnOptions || {} );

            child.unref();
            if( !child.stdout ) {
                callback( null, child.pid );
                return;
            }

            child.stdout.on( 'data', function( buffer ) {
                resp += buffer.toString();
            } );

            child.stderr.on( 'data', function( data ) {
                var err = data.toString();
                error = Y.doccirrus.errors.rest( 500, err, true );
                if( !callbackCalled ) {
                    callbackCalled = true;
                    Y.log( `run_cmd ( child.stderr.on('data') ): For command = "${fullCommandString}" Error invoking dc-cli:${err}`, 'error', NAME );
                    return callback( error, output );
                }
            } );

            child.stdout.on( 'end', function( data ) {
                if( data ) {
                    resp += data;
                }

                output = resp;

                if( resp && 'object' !== typeof resp && !options.noJson ) {
                    try {
                        output = JSON.parse( resp );
                    } catch( parseErr ) {
                        if( !callbackCalled ) {
                            callbackCalled = true;
                            Y.log( `run_cmd ( child.stdout.on('end') event ): For command: "${fullCommandString}" received invalid response . Response is: ${resp} and Error: ${parseErr.stack || parseErr}`, 'warn', NAME );
                            return callback( Y.doccirrus.errors.rest('userMgmtMojit_02', Y.doccirrus.errorTable.getMessage({code: 'userMgmtMojit_02'}), true) );
                        }
                    }
                }
            } );

            child.stdout.on( 'exit', function( code ) {
                Y.log( `run_cmd ( child.stdout.on('exit') event ): EXIT RUN_CMD CODE:  ${ code }  for command:\n${ JSON.stringify( cmd, 2 )}`, 'info', NAME );
            } );

            child.on( 'close', function() {
                if( output.error ) {
                    error = Y.doccirrus.errors.rest( 8000 + parseFloat( output.error ), Y.doccirrus.errorTable.getMessages( {code: 8000 + parseFloat( output.error )} ), true );
                }

                if( !callbackCalled ) {
                    callbackCalled = true;

                    if( error ) {
                        Y.log(`run_cmd ( child.on('close') event ): Received error on executing command: "${fullCommandString}". Error: ${error} `, "error", NAME);
                    } else {
                        Y.log(`run_cmd ( child.on('close') event ): Successfully executed command: "${fullCommandString}"`, "debug", NAME);
                    }

                    return callback( error, output );
                }
            } );

        }

        /**
         * @method PRIVATE
         *
         * Should only be run by master, during startup and then at regular intervals
         *
         * This method executes 'dc-cli --features' to get all supported features from dc-cli.
         * Example output response by 'dc-cli --features' is as below:
         *
         * {
         *  "error" : 0,
         *  "data" : [ {
         *      "backup" : false,
         *      "update" : true,
         *      "reboot" : true,
         *      "replication" : true,
         *      "ups" : true,
         *      "raid" : true,
         *      "customX509" : true,
         *      "network" : true,
         *      "shutdown" : true
         *   } ]
         * }
         *
         * The in-memory variable 'dccliSupportedFeatures' MUST be initialized on ALL clusters and this method does that.
         * Once 'dccliSupportedFeatures' is initialized then this method starts listeners for 'backup' related cron jobs on master cluster
         *
         * @returns {Promise<undefined>}
         */
        async function queryAndCacheSupportedDcCliFeatures() {
            let
                err,
                result,
                queriedSupportedFeatures,
                featuresChanged = false;

            // ---------------- 1. Check if 'dc-cli' utility is present in server environment -------------------------------------------------
            [err, result] = await formatPromiseResult( hasDCcli() );

            if( err ) {
                Y.log(`queryAndCacheSupportedDcCliFeatures: Error in hasDccli. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !result.hasDCcli ) {
                Y.log(`queryAndCacheSupportedDcCliFeatures: 'dc-cli' not present. Nothing to do...`, "info", NAME);
                return;
            }
            // ------------------------------------------- 1. END -----------------------------------------------------------------------------


            // ------------------ 2. Get the supported features by 'dc-cli' ------------------------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        run_cmd( COMMANDS.supportedFeatures(), function( cliError, res ) {
                                            if( cliError ) {
                                                reject( cliError );
                                            } else {
                                                resolve(res);
                                            }
                                        } );
                                    })
                                  );

            if( err ) {
                Y.log(`queryAndCacheSupportedDcCliFeatures: Error while querying supported features by 'dc-cli'. Error: ${err.stack || err}, stringified error = ${JSON.stringify(err)}`, "error", NAME);
                throw err;
            }

            if( !result || !result.data || !Array.isArray(result.data) || !result.data[0] ) {
                Y.log(`queryAndCacheSupportedDcCliFeatures: Failed to get valid response from 'dc-cli'. Got response: ${JSON.stringify(result)}`, "error", NAME);
                throw new Error(`Failed to get valid response from 'dc-cli'. Got response: ${JSON.stringify(result)}`);
            }

            queriedSupportedFeatures = result.data[0];
            Y.log(`queryAndCacheSupportedDcCliFeatures: Supported features by 'dc-cli' are: ${JSON.stringify(result)}`, "info", NAME);
            // ----------------------------------- 2. END ------------------------------------------------------------------------------------


            // ------------------ 3. Cache supported features in global variable -------------------------------------------------------------
            for( const key of Object.keys(dccliSupportedFeatures) ) { // eslint-disable-line
                if ( dccliSupportedFeatures[key] !== queriedSupportedFeatures[key] ) {
                    featuresChanged = true;
                }
                dccliSupportedFeatures[key] = (typeof queriedSupportedFeatures[key] === "boolean") ? queriedSupportedFeatures[key] : false;
            }

            Y.log(`queryAndCacheSupportedDcCliFeatures: Cached supported features as: ${JSON.stringify(dccliSupportedFeatures)}`, "info", NAME);
            // ------------------------------------------ 3. END ------------------------------------------------------------------------------


            // ------------------ 4. If supported features have changed since last check, inform workers by IPC -------------------------------------------------------------

            if ( featuresChanged ) {
                Y.doccirrus.ipc.send( IPC_SUPPORTED_FEATURES_UPDATED, dccliSupportedFeatures, false, false );
            }
            // ------------------------------------------ 4. END ------------------------------------------------------------------------------
        }



        /**
         * Regularly check if CUPS is enabled in dc-cli
         *
         * @method PRIVATE
         *
         *
         * @returns {Promise<undefined>}
         */
        async function queryAndCacheCupsStatus() {
            let
                err,
                result,
                queriedCupsStatus,
                statusChanged = false;

            // ---------------- 1. Check if 'dc-cli' utility is present in server environment -------------------------------------------------
            [err, result] = await formatPromiseResult( hasDCcli() );

            if( err ) {
                Y.log(`queryAndCacheCupsStatus: Error in hasDccli. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !result.hasDCcli ) {
                Y.log(`queryAndCacheCupsStatus: 'dc-cli' not present. Nothing to do...`, "info", NAME);
                return;
            }
            // ------------------------------------------- 1. END -----------------------------------------------------------------------------


            // ------------------ 2. Get the supported features by 'dc-cli' ------------------------------------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise((resolve, reject) => {
                    run_cmd( COMMANDS.getCupsStatus(), function( cliError, res ) {
                        if( cliError ) {
                            reject( cliError );
                        } else {
                            resolve(res);
                        }
                    } );
                })
            );

            if( err ) {
                Y.log(`queryAndCacheCupsStatus: Error while querying CUPS status by 'dc-cli'. Error: ${err.stack || err}, stringified error = ${JSON.stringify(err)}`, "error", NAME);
                throw err;
            }

            if( !result || !result.data || !Array.isArray(result.data) || !result.data[0] ) {
                Y.log(`queryAndCacheCupsStatus: Failed to get valid response from 'dc-cli'. Got response: ${JSON.stringify(result)}`, "error", NAME);
                throw new Error(`Failed to get valid response from 'dc-cli'. Got response: ${JSON.stringify(result)}`);
            }

            queriedCupsStatus = result.data[0];

            Y.log(`queryAndCacheCupsStatus: CUPS status by 'dc-cli' are: ${JSON.stringify(result)}`, "info", NAME);
            // ----------------------------------- 2. END ------------------------------------------------------------------------------------


            // ------------------ 3. Cache supported features in global variable -------------------------------------------------------------
            for( const key of Object.keys(queriedCupsStatus) ) {   // eslint-disable-line
                if ( dccliCupsStatus[key] !== queriedCupsStatus[key] ) {
                    statusChanged = true;
                }
                dccliCupsStatus[key] = (typeof queriedCupsStatus[key] === "boolean") ? queriedCupsStatus[key] : false;
            }

            Y.log(`queryAndCacheCupsStatus: Cached CUPS status as: ${JSON.stringify(dccliCupsStatus)}`, "info", NAME);
            // ------------------------------------------ 3. END ------------------------------------------------------------------------------


            // ------------------ 4. If supported features have changed since last check, inform workers by IPC -------------------------------------------------------------

            if ( statusChanged ) {
                Y.doccirrus.ipc.send( IPC_CUPS_STATUS_UPDATED, dccliCupsStatus, false, false );
            }

            Y.config.doccirrus.Env.cupsEnabled = dccliCupsStatus.enabled;

            // ------------------------------------------ 4. END ------------------------------------------------------------------------------
        }


        /**
         * @method PUBLIC
         *
         * @JsonRpcApi
         *
         * This methods fetches proxy configuration from dc-cli.
         * The command from COMMANDS.getProxyConfig() responds as below:
         *   {
         *      "error" : 0,
         *      "data" : [ {
         *          "proxyUrl" : "http://squid.intra.doc-cirrus.com:3128"   ---> Present only if proxy is configured else key "proxyUrl" is absent
         *      } ]
         *  }
         *
         * @param {Object} args :OPTIONAL: Present only if called from UI
         * @param {Function} args.callback :OPTIONAL: Present only if called from UI and responds as:
         *                  args.callback(err, {Proxy: String})
         *
         * @returns {Promise<{proxy: String}>} If callback is not passed
         */
        async function getProxyConfig( args = {} ) {
            Y.log('Entering Y.doccirrus.api.cli.getProxyConfig', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.getProxyConfig');
            }
            const
                {callback} = args,
                {isQueried, proxy} = getCachedProxyConfig();

            let
                err,
                result;

            // ----------------------- 1. If proxy was already cached from dc-cli then return the cached value -------------
            if(isQueried) {
                return handleResult( null, {proxy},  callback);
            }
            // ---------------------------------------------------- 1. END -------------------------------------------------


            // ---------------- 2. Check if 'dc-cli' utility is present in server environment -------------------------------
            /**
             * We dont expect any errors or even the function 'hasDCcli' to execute a cli command because it must have been done for ALL
             * clusters at the server startup but the method 'hasDCcli' can be and should be called any number of times and it will return
             * result from the cache if present else will check whether the cli is present and store the result in in-memory cache
             */
            [err, result] = await formatPromiseResult( hasDCcli() );

            if( !result.hasDCcli ) {
                Y.log(`getProxyConfig: 'dc-cli' not present. Nothing to do...`, "info", NAME);
                return handleResult( Y.doccirrus.errors.rest('userMgmtMojit_01'), undefined,  callback);
            }
            // ------------------------------------------- 2. END ------------------------------------------------------------


            // ------------------------------------------- 3. Get proxy configuration ------------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        run_cmd( COMMANDS.getProxyConfig(), function( cliError, res ) {
                                            if( cliError ) {
                                                reject( cliError );
                                            } else {
                                                resolve(res);
                                            }
                                        } );
                                    })
                                  );

            if( err ) {
                Y.log(`getProxyConfig: Error while fetching proxy configuration via 'dc-cli'. Error data: ${err.data}. Error: ${err.stack || err}`, "warn", NAME );
                return handleResult( err, undefined,  callback);
            }

            if( !result || !result.data || !Array.isArray(result.data) || !result.data[0] ) {
                Y.log(`getProxyConfig: Failed to get valid response from 'dc-cli'. Got response: ${JSON.stringify(result)}`, "error", NAME);
                return handleResult( Y.doccirrus.errors.rest('userMgmtMojit_03'), undefined,  callback);
            }
            // ------------------------------------------------------- 3. END ------------------------------------------------------------

            setCachedProxyConfig( result.data[0].proxyUrl );

            return handleResult( null, {proxy: result.data[0].proxyUrl}, callback);
        }

        /**
         * @method PUBLIC
         *
         * @JsonRpcApi
         *
         * This method sets the proxy on the datensafe via dc-cli and the dc-cli method will restart the datensafe
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.data :REQUIRED:
         * @param {String} args.data.proxy :OPTIONAL: The proxy URL to set/reset on the datensafe via dc-cli
         * @returns {Promise<{Proxy: String}>}
         */
        async function setProxyConfig( args ) {
            Y.log('Entering Y.doccirrus.api.cli.setProxyConfig', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.setProxyConfig');
            }
            const
                {callback, data = {}} = args,
                {proxy} = data,
                proxyValidator = Y.doccirrus.validations.common.Admin_T_proxy[ 0 ];

            let
                err,
                result,
                setProxyCommand;

            // ---------------- 1. Check if 'dc-cli' utility is present in server environment -------------------------------
            [err, result] = await formatPromiseResult( hasDCcli() );

            if( !result.hasDCcli ) {
                Y.log(`setProxyConfig: 'dc-cli' not present. Nothing to do...`, "info", NAME);
                return handleResult( Y.doccirrus.errors.rest('userMgmtMojit_01'), undefined, callback );
            }
            // ------------------------------------------- 1. END ------------------------------------------------------------


            // --------------------------- 2. If 'proxy' present then set else reset proxy via dc-cli -------------------------
            if( proxy ) {
                if(!proxyValidator.validator(proxy)) {
                    return handleResult( Y.doccirrus.errors.rest('userMgmtMojit_04'), undefined, callback );
                }

                setProxyCommand = COMMANDS.setProxyConfig();
                setProxyCommand.addParam( proxy );

                [err] = await formatPromiseResult(
                                        new Promise( ( resolve, reject ) => {
                                            run_cmd( setProxyCommand, function( cliError, res ) {
                                                if( cliError ) {
                                                    reject( cliError );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                        } )
                                      );

                if( err ) {
                    Y.log( `setProxyConfig: Error while setting proxy: ${proxy} via dc-cli. Error data: ${err.data}. Error: ${err.stack || err}`, "warn", NAME );
                    return handleResult( err, undefined, callback );
                }
            } else {
                [err] = await formatPromiseResult(
                                        new Promise( ( resolve, reject ) => {
                                            run_cmd( COMMANDS.resetProxyConfig(), function( cliError, res ) {
                                                if( cliError ) {
                                                    reject( cliError );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                        } )
                                      );

                if( err ) {
                    Y.log( `setProxyConfig: Error while resetting proxy via dc-cli. Error data: ${err.data}. Error: ${err.stack || err}.`, "warn", NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            setCachedProxyConfig( proxy || "" );
            // -------------------------------------------- 2. END -----------------------------------------------------------


            // --------------------------- 3. apply proxy config to the datensafe (which will restart the server) ------------
            applyProxyConfig(proxy);
            // -------------------------------------------------- 3. END -----------------------------------------------------

            return handleResult( null, {proxy}, callback );
        }

        /**
         * @method PRIVATE
         *
         * This method calls dc-cli apply proxy method which will apply the set proxy on datensafe and restart it.
         *
         * @param {String} proxy :REQUIRED: proxy which is ALREADY set. This is just used for logging purpose.
         * @returns {Promise<void>}
         */
        async function applyProxyConfig( proxy ) {
            let
                err;

            // ------ 1. Notify UI about restarting the server and apply 'proxy' via 'dc-cli' (this will restart the server) --------------
            await new Promise( resolve => setTimeout(resolve, 1000));

            Y.doccirrus.communication.emitEventForAll( {
                event: 'message',
                msg: {data: i18n( 'communications.message.RESTART_SERVER' )}
            } );
            // -------------------------------------------------- 1. END ------------------------------------------------------------------


            // ---- 2. Apply proxy config to datensafe, which will restart the server (NOTE: cli takes around 3 minutes to restart the insuite server)--------
            [err] = await formatPromiseResult(
                            new Promise((resolve, reject) => {
                                run_cmd( COMMANDS.applyProxyConfig(), function( cliError, res ) {
                                    if( cliError ) {
                                        reject( cliError );
                                    } else {
                                        resolve(res);
                                    }
                                } );
                            })
                          );

            if( err ) {
                Y.log(`applyProxyConfig: Error while applying proxy: ${proxy} to the datensafe. Error data: ${err.data}. Error: ${err.stack || err}`, "warn", NAME);
            }
            // --------------------------------------------- 2. END -----------------------------------------------------------------------
        }

        /**
         * @method PUBLIC
         *
         * This method checks whether 'dc-cli' command is available in the environment
         *
         * @param {Object} args :OPTIONAL:
         * @param {Function} args.callback :OPTIONAL: If present then result will be sent via callback
         *
         * @returns {Promise<{hasDCcli: Boolean}>}
         */
        async function hasDCcli( args = {} ) {
            Y.log('Entering Y.doccirrus.api.cli.hasDCcli', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.hasDCcli');
            }
            const
                {callback} = args;

            let
                err,
                cliPath;

            // ---------- 1. If 'dc-cli' was previously checked then no need to check again and respond the status of in-memory variable ------
            if( typeof getIsDcCliAvailable() === "boolean" ) {
                return handleResult( undefined, {hasDCcli: getIsDcCliAvailable()}, callback );
            }
            // ----------------------------------------------------- 1. END -------------------------------------------------------------------


            // ------------------------------ 2. Check if 'dc-cli' is present --------------------------------------------------------
            [err, cliPath] = await formatPromiseResult(
                                      new Promise((resolve, reject) => {
                                          run_cmd(
                                              COMMANDS.hasDCcli(),
                                              (cliError, res) => {
                                                  if(cliError) {
                                                      reject(cliError);
                                                  } else {
                                                      resolve(res);
                                                  }
                                              },
                                              {noJson: true}
                                          );
                                      })
                                   );

            if( err ) {
                Y.log(`hasDCcli: Error while checking if 'dc-cli' command is present. Error data: ${err.data}`, "warn", NAME);
            }

            // only check if there is a executable called `dc-cli`
            setIsDcCliAvailable( !!cliPath );
            // ---------------------------------------- 2. END ------------------------------------------------------------------------

            return handleResult( undefined, {hasDCcli: getIsDcCliAvailable()}, callback );
        }

        function getStatus( args ) {
            run_cmd( COMMANDS.getStatus(), function( err, data ) {
                if( err ) {
                    return args.callback( err );
                }
                args.callback( err, data && data.data );
            } );
        }

        /*
        function getCupsStatus( args ) {
            run_cmd( COMMANDS.getCupsStatus(), function( err, data ) {
                if( err ) {
                    return args.callback( err );
                }
                args.callback( err, data && data.data );
            } );
        } */

        function reboot( args ) {
            if( !Y.doccirrus.auth.isAdminUser( args.user ) || (args.user.tenantId !== Y.doccirrus.auth.getLocalTenantId()) || !dccliSupportedFeatures.reboot) {
                args.callback( Y.doccirrus.errors.rest( 401 ) );
                return;
            }

            args.callback();
            Y.doccirrus.api.audit.auditCli( args.user, {action: 'reboot', what: 'system'} );

            run_cmd( COMMANDS.reboot(), function( err, output ) {
                if(err){
                    Y.doccirrus.api.audit.auditCli( args.user, {action: 'reboot', what: 'system', error: err} );
                    communication.emitEventForSession( {
                        sessionId: args.user.sessionId,
                        event: 'cliError',
                        msg: {
                            data: {
                                command: 'reboot',
                                code: err.code,
                                data: err.data,
                                output
                            }
                        }
                    } );
                }
            } );
        }

        //commands mapping, same as on client
        const backupCommands = {

            listCloudDevices( args, callback ) {
                const {user} = args;

                if( Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inBackup' ) ) {
                    run_cmd( COMMANDS.infoBackupDevice(), function( err, cloudBackupList ) {
                        if( err && 8033 !== Number( err.code ) ) {
                            return callback( err );
                        }

                        cloudBackupList = cloudBackupList ? cloudBackupList : {};
                        cloudBackupList.data = cloudBackupList.data ? cloudBackupList.data : [];

                        args.body = cloudBackupList.data;
                        callback();

                    }, {deviceId: 's3'} );
                } else {
                    Y.log( 'inbackup licence is not active', 'info', NAME );
                    return callback();
                }
            },
            /**
             * Collect all devices (usb, samba) and creates an array for the client.
             * @param {Object} args
             * @param {Function} callback
             */
            listBackupDevices( args, callback ) {

                const {user} = args;

                async.parallel( {

                    usbList: ( cb ) => {

                        run_cmd( COMMANDS.listBackupDevices(), function( err, data ) {
                            if( err && 8033 !== Number( err.code ) ) {
                                return cb( err );
                            }
                            cb( null, data );
                        } );

                    },

                    smbList: ( cb ) => {

                        Y.doccirrus.mongodb.runDb( {
                            model: 'admin',
                            action: 'get',
                            user,
                            query: {_id: new ObjectID( '000000000000000000000002' )},
                            options: {
                                fields: {
                                    backupSmbHost: 1,
                                    backupSmbPort: 1,
                                    backupSmbPath: 1,
                                    backupSmbLogin: 1,
                                    backupSmbPassword: 1,
                                    backupSmbDomain: 1
                                }
                            }
                        }, function( err, [smbConf] ) {
                            if( err ) {
                                return cb( err );
                            }

                            if( !smbConf || !smbConf.backupSmbHost || !smbConf.backupSmbPort || !smbConf.backupSmbPath ) {
                                return cb();
                            }

                            const conf = Object.assign( {}, smbDefaults, _.pick( smbConf, smbFields ) );

                            run_cmd( COMMANDS.infoBackupDevice(), function( err, data ) {
                                if( err && 8033 !== Number( err.code ) ) {
                                    return cb( err );
                                }

                                cb( null, data );

                            }, {deviceId: 'samba', user, smbConf: conf} );

                        } );

                    }

                }, function( err, {usbList, smbList} ) {
                    if( err ) {
                        return callback( err );
                    }

                    //  in case of no USB devices
                    usbList = usbList ? usbList : {};
                    usbList.data = usbList.data ? usbList.data : [];

                    //  in case of no SMB backup locations
                    smbList = smbList ? smbList : {};
                    smbList.data = smbList.data ? smbList.data : [];

                    args.body = usbList.data.concat( smbList && smbList.data || [] );
                    callback();

                } );

            },

            /**
             * Get info for an device. First with backup points, if secret key is false, then try w/o points.
             * @param {Object} args
             * @param {Function} callback
             */
            infoBackupDevice( args, callback ) {
                const {deviceId, smbConf} = args.query;
                const {user} = args;

                if( !deviceId ) {
                    return callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessages( {code: 8002} ), true ) );
                }

                run_cmd( COMMANDS.getBackupInfo(), function( err, data ) {
                    if( err && ![8033, 8027].includes( Number( err.code ) ) ) {
                        return callback( err );
                    }

                    var backupKey = data && data.data && data.data[ 0 ] && data.data[ 0 ].backupKey || null;

                    backupKey = ( ( backupKey && backupKey.backupKey ) ? backupKey.backupKey : backupKey );

                    run_cmd( COMMANDS.infoBackupDevice(), function( err, data ) {
                        if( err && 8036 !== err.code ) {
                            return callback( err );
                        }

                        if( err && 8036 === err.code ) {
                            return run_cmd( COMMANDS.infoBackupDevice(), function( err, data ) {
                                if( err ) {
                                    return callback( err );
                                }
                                args.body = data.data;
                                callback();
                            }, {deviceId, user, smbConf} );
                        }

                        args.body = data.data;
                        callback();

                    }, {deviceId, user, smbConf, backupKey} );

                } );

            },

            /**
             * Get backup repository state
             * @param {Object} args
             * @param {Function} callback
             */
            getBackupState( args, callback ) {

                run_cmd( COMMANDS.getBackupState(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                } );
            },

            /**
             * Get backup repository info
             * @param {Object} args
             * @param {Function} callback
             */
            getBackupInfo( args, callback ) {

                run_cmd( COMMANDS.getBackupInfo(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                } );
            },

            /**
             * Creates pdf with secret backup key to downloanding.
             * will remove pdf in 5 min.
             * @param {Object} args
             * @param {Function} callback
             */
            showKey( args, callback ) {
                const {user} = args;
                const name = `${crypto.randomBytes( 20 ).toString( 'hex' ) }.pdf`;
                const path = Y.doccirrus.media.getCacheDir() + name;

                run_cmd( COMMANDS.getBackupInfo(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }

                    if( !data || !data.data || !data.data[0] || !data.data[0].backupKey || !data.data[0].backupKey.backupKey ) {
                        return callback();
                    }

                    const {backupKey} = data.data[0].backupKey;

                    const options = Object.assign( {}, args.originalParams || {}, {
                        user,
                        role: 'inbackup-secret-key',
                        tableDataSource: 'client',
                        formData: {
                            dataTable: [],
                            backupSecret: backupKey
                        },
                        activityId: 'backup',
                        saveTo: 'temp',
                        filePath: path,
                        fileName: name,
                        callback: function( err, res ) {
                            if( err ) {
                                return callback( err );
                            }

                            args.body = res;
                            callback();
                        }
                    } );

                    Y.doccirrus.forms.renderOnServer.koTableToPDF( options );

                    setTimeout( () => {
                        fs.unlink( path, function( err ) {
                            if( err && 'ENOENT' !== err.code ) {
                                console.error( err, 'Can\'t remove backup key', path ); //eslint-disable-line no-console
                            }
                        } );
                    }, 5 * 60 * 1000 ); // 5 min

                } );

            },

            /**
             * Get full backup state for client, w/o secret key.
             * @param {Object} args
             * @param {Function} callback
             */
            getFullState( args, callback ) {

                const res = {};

                run_cmd( COMMANDS.getBackupInfo(), function( err, data ) {
                    if( err && ![8033, 8027].includes( Number( err.code ) ) ) {
                        return callback( err );
                    }
                    res.info = data && data.data;

                    if( res.info ) {
                        res.info.forEach( item => {
                            if( item.backupKey ) {
                                item.backupKey = null;
                            }
                        } );
                    }

                    run_cmd( COMMANDS.getBackupState(), function( err, data ) {
                        if( err && ![8033, 8027].includes( Number( err.code ) ) ) {
                            return callback( err );
                        }
                        res.state = data && data.data;
                        args.body = res;
                        callback();
                    } );
                } );

            },

            /**
             * Initialize backup repository.
             * @param {Object} args
             * @param {Function} callback
             */
            initBackup( args, callback ) {

                run_cmd( COMMANDS.initBackup(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                } );
            },

            /**
             * Destroy backup repository.
             * @param {Object} args
             * @param {Function} callback
             */
            destroyBackup( args, callback ) {

                run_cmd( COMMANDS.destroyBackup(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                } );
            },

            /**
             * Reinitialize backup repository.
             * @param {Object} args
             * @param {Function} callback
             */
            reInitBackup( args, callback ) {

                backupCommands.destroyBackup( args, function( err ) {
                    if( err ) {
                        return callback( err );
                    }

                    backupCommands.initBackup( args, callback );

                } );

            },

            /**
             * initialize backup device.
             * @param {Object} args
             * @param {Function} callback
             */
            initBackupDevice( args, callback ) {
                const {deviceId, smbConf} = args.query;
                const {user} = args;

                if( !deviceId ) {
                    return callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessages( {code: 8002} ), true ) );
                }

                run_cmd( COMMANDS.initBackupDevice(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }

                    args.body = data.data;
                    callback();
                }, {deviceId, user, smbConf} );
            },

            /**
             * Creates an backup.
             * @param {Object} args
             * @param {Function} callback
             */
            createBackup( args, callback ) {

                run_cmd( COMMANDS.createBackup(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;

                    callback();
                } );
            },

            /**
             * Creates an backup waits for finish of blocking operations.
             * @param {Object} args
             * @param {Function} callback
             */
            createBackupWait( args, callback ) {

                run_cmd( COMMANDS.createBackupWait(), function( err, data ) {
                    if( err ) {
                        // currently disabled, see MOJ-7508
                        //sendCronEmail( BACKUP_SUBJECT_FAIL, BACKUP_FAIL.replace( '{device}', JSON.stringify( err ) ) + '<br/>' );
                        return callback( err );
                    }

                    var messageBody = i18n( 'InBackupMojit.InBackupViewModel.message.MANUAL_BACKUP_COMPLETE' ) + args.user.U;
                    sendCronEmail( BACKUP_SUBJECT_SUCCESS, messageBody );
                    args.body = data.data;
                    callback();
                } );
            },

            /**
             * Creates an backup when backup state is idle.
             * @param {Object} args
             * @param {Function} callback
             */
            createBackupOnIdle( args, callback ) {

                run_cmd( COMMANDS.createBackupOnIdle(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                } );
            },

            /**
             * Checks the backup device. Performs fast checks.
             * @param {Object} args
             * @param {Function} callback
             */
            checkBackupDevice( args, callback ) {
                const {deviceId, smbConf} = args.query;
                const {user} = args;

                if( !deviceId ) {
                    return args.callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessages( {code: 8002} ), true ) );
                }

                run_cmd( COMMANDS.checkBackupDevice(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }

                    args.body = data.data;
                    callback();
                }, {deviceId, user, smbConf} );

            },

            /**
             * Checks the backup device.
             * @param {Object} args
             * @param {Function} callback
             */
            checkBackupDeviceFull( args, callback ) {
                const {deviceId, smbConf} = args.query;
                const {user} = args;

                if( !deviceId ) {
                    return callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessages( {code: 8002} ), true ) );
                }

                run_cmd( COMMANDS.checkBackupDeviceFull(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                }, {deviceId, user, smbConf} );
            },

            /**
             * Import backup repository from device to datensafe.
             * @param {Object} args
             * @param {Function} callback
             */
            importBackupDevice( args, callback ) {
                const {deviceId, smbConf} = args.query;
                const {user} = args;

                if( !deviceId ) {
                    return callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessages( {code: 8002} ), true ) );
                }

                run_cmd( COMMANDS.importBackupDevice(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                }, {deviceId, user, smbConf} );
            },

            /**
             * Export backup repository from datensafe to device.
             * @param {Object} args
             * @param {Function} callback
             */
            exportBackupDevice( args, callback ) {
                const {deviceId, smbConf} = args.query;
                const {user} = args;

                if( !deviceId ) {
                    return callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessages( {code: 8002} ), true ) );
                }

                run_cmd( COMMANDS.exportBackupDevice(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                }, {deviceId, user, smbConf} );
            },

            /**
             * Export backup repository from datensafe to device. Waits for finish of blocking operations.
             * @param {Object} args
             * @param {Function} callback
             */
            exportBackupDeviceWait( args, callback ) {
                const {deviceId, smbConf} = args.query;
                const {user} = args;

                if( !deviceId ) {
                    return callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessages( {code: 8002} ), true ) );
                }

                run_cmd( COMMANDS.exportBackupDeviceWait(), function( err, data ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = data.data;
                    callback();
                }, {deviceId, user, smbConf} );

            },

            /**
             * First checks whether checkBackupDevice command is successful only then adds smb config to DB.
             * @param {Object} args
             * @param {Function} callback
             */
            addSmbConfig( args, callback ) {
                const {data, user} = args;
                const deviceId = "samba";

                run_cmd( COMMANDS.checkBackupDevice(), function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    insertSmbConfig();
                }, {deviceId, user, smbConf:data} );

                function insertSmbConfig() {
                    Y.doccirrus.mongodb.runDb( {
                        model: 'admin',
                        action: 'put',
                        user,
                        query: {_id: new ObjectID( '000000000000000000000002' )},
                        data: Y.doccirrus.filters.cleanDbObject( data ),
                        fields: smbFields,
                        options: {
                            fields: {
                                backupSmbHost: 1,
                                backupSmbPort: 1,
                                backupSmbPath: 1,
                                backupSmbLogin: 1,
                                backupSmbPassword: 1,
                                backupSmbDomain: 1
                            }
                        }
                    }, function( err, res ) {
                        if( err ) {
                            return callback( err );
                        }
                        args.body = _.pick( res, smbFields );
                        callback();
                    } );
                }
            },

            /**
             * Get smb config from DB.
             * @param {Object} args
             * @param {Function} callback
             */
            getSmbConfig( args, callback ) {
                const {user} = args;

                Y.doccirrus.mongodb.runDb( {
                    model: 'admin',
                    action: 'get',
                    user,
                    query: {_id: new ObjectID( '000000000000000000000002' )},
                    options: {
                        fields: {
                            backupSmbHost: 1,
                            backupSmbPort: 1,
                            backupSmbPath: 1,
                            backupSmbLogin: 1,
                            backupSmbPassword: 1,
                            backupSmbDomain: 1
                        }
                    }
                }, function( err, res ) {
                    if( err ) {
                        return callback( err );
                    }
                    args.body = res;
                    callback();
                } );
            },

            /**
             * Remove smb config from DB.
             * @param {Object} args
             * @param {Function} callback
             */
            removeSmbConfig( args, callback ) {

                const {user} = args;

                Y.doccirrus.mongodb.runDb( {
                    model: 'admin',
                    action: 'put',
                    user,
                    query: {_id: new ObjectID( '000000000000000000000002' )},
                    data: Y.doccirrus.filters.cleanDbObject( {
                        backupSmbHost: null,
                        backupSmbPort: null,
                        backupSmbPath: null,
                        backupSmbLogin: null,
                        backupSmbPassword: null,
                        backupSmbDomain: null
                    } ),
                    fields: smbFields
                }, function( err ) {
                    if( err ) {
                        return callback( err );
                    }

                    args.body = [];
                    callback();
                } );

            }

        };

        function getEmployeeEmail( user, callback ) {

            Y.doccirrus.api.employee.getEmployeeForUsername( {
                user: user,
                originalParams: {
                    username: user && user.id
                },
                callback: function( err, employee ) {
                    var obj;
                    if( err ) {
                        Y.log( `Can not get email for backup: ${ err}`, 'warn', NAME );
                        return callback( err );
                    }
                    obj = ( employee && Y.doccirrus.schemas.simpleperson.getEmail( employee.communications ) ) || {};
                    if( !obj.value ) {
                        Y.log( `Email address is missing: ${ JSON.stringify( employee )}`, 'warn', NAME );
                    }

                    callback( err, obj.value );
                }
            } );
        }

        /**
         * @method PUBLIC
         *
         * This method queries systemId from dc-cli
         *
         * @param {Object} [args] :OPTIONAL:
         * @param {Function} [args.callback] :OPTIONAL:
         * @returns {Promise<String|undefined>} If callback is present then args.callback(err, <String, systemId>)
         */
        async function getPRCHost( args = {} ) {
            Y.log('Entering Y.doccirrus.api.cli.getPRCHost', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.getPRCHost');
            }

            const
                {callback} = args;

            let
                err,
                result,
                prcsId;

            // ------------------ 1. If systemId is already cached then return immediately ---------------
            if( systemId ) {
                return handleResult( null, systemId, callback );
            }
            // ------------------------------------------ 1. END -----------------------------------------


            // -------------------- 2. Check if datensafe has dc-cli executable --------------------------
            [, result] = await formatPromiseResult( hasDCcli() ); //Note: we do not care about error

            if( !result || !result.hasDCcli ) {
                Y.log(`getPRCHost: 'dc-cli' not present. Nothing to do...`, "info", NAME);
                return handleResult( Y.doccirrus.errors.rest('userMgmtMojit_01'), undefined,  callback);
            }
            // -------------------------------------- 2. END ---------------------------------------------


            // ------------------- 3. dc-cli is present so go ahead and query systemId ------------------------------
            [err, result] = await formatPromiseResult(
                                    new Promise( (resolve, reject) => {
                                        run_cmd( COMMANDS.getStatus(), ( cliError, cliResult ) =>  {
                                            if( cliError ) {
                                                reject( cliError );
                                            } else {
                                                resolve( cliResult );
                                            }
                                        } );
                                    } )
                                  );

            if( err ) {
                return handleResult( err, undefined, callback );
            }

            prcsId = result && result.data && result.data[0] && result.data[0].prcs && result.data[0].prcs.id;

            if( prcsId ) {
                systemId = prcsId;
            }

            return handleResult( null, prcsId, callback );
            // ---------------------------------------- 3. END ------------------------------------------------------
        }

        /**
         * get local IP of this server
         * @param args
         */
        function getPRCIP( args ) {
            var
                ips;
            run_cmd( COMMANDS.getStatus(), function getPRCFromStatus( err, result ) {
                var data = result && result.data && result.data[0];
                if( data && data.os ) {
                    ips = data.os.addresses || data.os.ips; //CLI does return address but still keeping original ips just for safety
                }
                args.callback( err, ips && ips[0] );
            } );
        }

        // check if any update is available
        function updateCheck( args ) {
            Y.log('Entering Y.doccirrus.api.cli.updateCheck', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.updateCheck');
            }
            var
                callback = args.callback;

            if( !Y.doccirrus.auth.isAdminUser( args.user ) || (args.user.tenantId !== Y.doccirrus.auth.getLocalTenantId()) || !dccliSupportedFeatures.update) {
                callback( Y.doccirrus.errors.rest( 401 ) );
                return;
            }

            run_cmd( COMMANDS.updateCheck(), function( err, result ) {
                if( err || !result || !result.data ) {
                    Y.doccirrus.api.audit.auditCli( args.user, {
                        action: 'update',
                        what: 'system',
                        error: err,
                        text: 'altualisierung nicht erfolgreich'
                    } );
                    return callback( Y.doccirrus.errors.rest( 500, 'update check failed' ) );

                } else if( result.data.length ) {
                    return callback( null, {needUpdate: true} );
                } else {
                    Y.doccirrus.api.audit.auditCli( args.user, {
                        action: 'update',
                        what: 'system',
                        text: 'bereits aktualisiert'
                    }, callback );
                }
            } );
        }

        /**
         * log update result
         * @param user
         * @param error
         * @param result
         * @param callback
         */
        function logUpdateResult( user, error, result, updateEmail, callback ) {
            var
                AUDIT_SUCCESS = 'System aktualisiert',
                AUDIT_FAIL = 'altualisierung nicht erfolgreich';

            callback = callback || function() {
                };
            if( error ) {
                Y.log( `software update failed: ${ JSON.stringify( error )}`, 'error', NAME );
                Y.doccirrus.api.audit.auditCli( user, {
                    action: 'update',
                    what: 'system',
                    error: error,
                    text: AUDIT_FAIL
                }, callback );
            } else {
                Y.log( `software update finished: ${ JSON.stringify( result )}`, 'debug', NAME );
                Y.doccirrus.api.audit.auditCli( user, {action: 'update', what: 'system', text: AUDIT_SUCCESS}, callback );
            }

        }

        // checks and logs the result then informs the user by email
        function onUpdateFinished( user, updateEmail ) {

            function sendUpdateEmail( error ) {
                var
                    SUCCESS_SUBJECT = 'Aktualisierung Datensafe abgeschlossen', // Datensafe update finished
                    SUCCESS_BODY = 'Die Aktualisierung des Datensafes ist abgeschlossen.<br>' +
                                   '<br>' +
                                   'Neue Version: {version}.', // Datensafe update finished.
                    FAIL_SUBJECT = 'Aktualisierung Datensafe fehlgeschlagen',// Datensafe update failed
                    FAIL_BODY = 'Aktualisierung des Datensafes fehlgeschlagen.<br>' +
                                '<br>'+
                                'Version: {version}.<br>' +
                                '<br>'+
                                'Fehler:<br>' +
                                '{error}',// Datensafe update failed.
                    emailOptions = {
                        serviceName: 'prcService',
                        to: '',
                        user: user,
                        subject: error ? FAIL_SUBJECT : SUCCESS_SUBJECT,
                        text: error ? FAIL_BODY : SUCCESS_BODY
                    },
                    myEmail;

                emailOptions.to = updateEmail;
                if( emailOptions.to && 'NO EMAIL SENT' !== emailOptions.to ) {
                    if( error ) {
                        emailOptions.text = Y.Lang.sub( emailOptions.text, {
                            version: Y.config.insuite && Y.config.insuite.version,
                            error: error
                        } );
                    } else {
                        emailOptions.text = Y.Lang.sub( emailOptions.text, {
                            version: Y.config.insuite && Y.config.insuite.version
                        } );
                    }
                    myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                    Y.doccirrus.email.sendEmail( { ...myEmail, user }, ( err ) => {
                        if( err ) {
                            Y.log( `sendUpdateEmail. could not send email. ErrorL ${JSON.stringify( err )}`, 'error', NAME );
                        }
                    } );
                } else {
                    Y.log( 'sendUpdateEmail: no email provided', 'debug', NAME );
                }
            }

            function cleanUp() {
                Y.doccirrus.fileutils.cleanDirSync( tempSubDir, true );
            }

            return function checkResult() {
                var
                    su = Y.doccirrus.auth.getSUForLocal(),
                    fs = require( 'fs' ),
                    callback = function( err ) {
                        if( err ) {
                            Y.log( `error in onUpdateFinished: ${ JSON.stringify( err )}`, 'error', NAME );
                        }
                    };

                fs.readFile( updateErrorFile, 'utf-8', function( err, stderrData ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( stderrData ) {
                        sendUpdateEmail( stderrData );
                        logUpdateResult( su, stderrData, null, updateEmail, callback ); // update failed
                        cleanUp();

                    } else {
                        fs.readFile( updateOutputFile, 'utf-8', function( err1, stdoutData ) {
                            if( err1 ) {
                                return callback( err1 );
                            }
                            sendUpdateEmail();
                            logUpdateResult( su, null, stdoutData, updateEmail, callback ); // update finished without error
                            cleanUp();
                        } );
                    }
                } );

                // forget the pid
                Y.doccirrus.mongodb.runDb( {
                    user: su,
                    model: 'admin',
                    action: 'delete',
                    options: {},
                    query: {_id: Y.doccirrus.schemas.admin.getUpdateId()},
                    callback: callback // second call back, but ok
                } );
            };
        }

        // call back once the process is gone
        function monitorUpdateProcess( pid, callback ) {
            var
                DELAY = 30000,
                exec = childProcess.exec,
                count_cmd = `ps -ef | grep ${ pid } | grep -v "grep" | wc -l`;

            if( !pid ) {
                Y.log( 'monitorUpdateProgress: no pid', 'error', NAME );
                return;
            }

            Y.log( `monitorUpdateProcess: ${ count_cmd}`, 'debug', NAME );
            exec( count_cmd,
                function( error, stdout, stderr ) {
                    stdout = stdout && stdout.trim();
                    if( error || stderr || !stdout ) {
                        Y.log( `monitorUpdateProgress failed: ${ JSON.stringify( error || stderr || 'empty output' )}`, 'error', NAME );

                    } else if( stdout.length && 0 < parseInt( stdout ) ) { //eslint-disable-line radix
                        Y.log( `monitorUpdateProgress: update process is still running => ${ stdout}`, 'debug', NAME );
                        setTimeout( function() {
                            monitorUpdateProcess( pid, callback );
                        }, DELAY );

                    } else { // the process terminated
                        Y.log( 'monitorUpdateProcess: process is not running', 'debug', NAME );
                        return callback();
                    }
                } );
        }

        // trigger update, will send an email to the user when finished
        function softwareUpdate( args ) {
            Y.log('Entering Y.doccirrus.api.cli.softwareUpdate', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.softwareUpdate');
            }
            var
                fs = require( 'fs' ),
                AUDIT_START = 'gestartet System aktualisieren',
                user = args.user,
                callback = args.callback;

            if( !Y.doccirrus.auth.isAdminUser( user ) || (user.tenantId !== Y.doccirrus.auth.getLocalTenantId()) || !dccliSupportedFeatures.update) {
                callback( Y.doccirrus.errors.rest( 401 ) );
                return;
            }

            function notePID( pid, updateEmail ) {
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'admin',
                    action: 'post',
                    options: {},
                    data: {
                        _id: Y.doccirrus.schemas.admin.getUpdateId(),
                        updatePID: pid,
                        updateEmail: updateEmail,
                        skipcheck_: true
                    },
                    callback: function( err ) {
                        Y.log( `update pid posted: ${ err}`, 'debug', NAME );
                    }
                } );
            }

            function runUpdate( updateEmail ) {
                Y.log( `runUpdate: ${ Y.doccirrus.ipc.whoAmI()}`, 'debug', NAME );
                //Y.doccirrus.server.closeServer();
                run_cmd( COMMANDS.update(), function( err, pid ) {
                        Y.log( `softwareUpdate began: ${ JSON.stringify( err || pid ) }, updateEmail: ${ updateEmail}`, 'debug', NAME );
                        if( err ) {
                            Y.log( `error in softwareUpdate: ${ JSON.stringify( err )}`, 'error', NAME );
                            logUpdateResult( user, err, null, updateEmail );
                            return callback( Y.doccirrus.errors.rest( 500, 'update failed' ) );

                        } else {
                            Y.log( 'softwareUpdate started', 'debug', NAME );
                            notePID( pid, updateEmail );
                            monitorUpdateProcess( pid, onUpdateFinished( user, updateEmail ) );
                            Y.doccirrus.api.audit.auditCli( user, {
                                action: 'update',
                                what: 'system',
                                text: AUDIT_START
                            }, callback );
                        }
                    },
                    {
                        spawnOptions: { // child spawn options
                            detached: true,
                            stdio: [
                                'ignore', // stdin
                                fs.openSync( updateOutputFile, "w" ), // direct child's stdout to file
                                fs.openSync( updateErrorFile, "w" ) // direct child's stderr to a file
                            ]
                        }
                    }
                );
                //Y.doccirrus.server.openServer();

            }

            if( !fs.existsSync( tempSubDir ) ) {
                Y.doccirrus.fileutils.mkdirpSync( tempSubDir );
            }
            getEmployeeEmail( user, function( err, email ) {
                if( err || !email ) {
                    email = 'NO EMAIL SENT';
                }
                runUpdate( email );
            } );
        }

        function initDccliService( callback ) {
            if( !Y.doccirrus.ipc.isMaster() ) {
                callback();
                return;
            }
            Y.log( 'init cli-api on master', 'debug', NAME );
            // resume monitoring update process

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'admin',
                action: 'get',
                options: {},
                query: {_id: Y.doccirrus.schemas.admin.getUpdateId()},
                callback: function( err, result ) {
                    if( err || !result || !result[0] ) {
                        return callback( err );
                    }
                    monitorUpdateProcess( result[0].updatePID, onUpdateFinished( Y.doccirrus.auth.getSUForLocal(), result[0].updateEmail ) );
                    callback();
                }
            } );

            if( dccliSupportedFeatures.backup ) {
                // As the 'runCliCommand' event is used just by inbackup UI which is shown only if dccliSupportedFeatures.backup === true
                checkAndRunUnfinishedCloudBackup();

                // Main listener for client SIO commands
                communication.setListenerForNamespace( '/', 'runCliCommand', function( message, callback ) {
                    Y.log(`runCliCommand called with param: ${JSON.stringify(message && message.params)} and data: ${JSON.stringify(message && message.data)}`, "info", NAME);
                    const
                        socket = this,
                        user = socket.user;
                    if( !user || !Y.doccirrus.auth.isAdminUser( user ) ) {
                        return;
                    }

                    // If the current server is MTS Appliance then the user must belong to master (0) database else do not allow to execute
                    if( user.tenantId !== Y.doccirrus.auth.getLocalTenantId() ) {
                        Y.log(`runCliCommandNotMTSMasterUser: Attempt to execute CLI command by user not belonging to master DB. Blocking operation`, "warn", NAME);
                        return;
                    }

                    return Y.doccirrus.api.cli.runCliCommand( {
                        user: user,
                        query: message.params,
                        data: message.data,
                        callback: callback
                    } );
                } );
            }
        }

        /**
         * @method PRIVATE
         *
         * This method attaches listeners to various backup related cron jobs only for master cluster and if
         * dc-cli supports backup feature
         *
         * Should be called after initial check of dccliSupportedFeatures
         *
         * @returns undefined
         */
        function startCronJobsListenersForBackup() {
            if( dccliSupportedFeatures.backup && Y.doccirrus.ipc.isMaster() ) {
                // Cron jobs to do some stuff with backup
                Y.doccirrus.kronnd.on( 'checkBackup', checkBackup );
                Y.doccirrus.kronnd.on( 'exportBackup', exportBackup );
                Y.doccirrus.kronnd.on( 'checkDiskFreeSize', checkDiskFreeSize );
                Y.doccirrus.kronnd.on( 'datasafeBackup', createDatasafeBackup);
            }
        }

        /**
         * Check backup repository daily at 07.00.
         * If last backup point is older than 1 day, then notify admins.
         * @return {undefined}
         */
        function checkBackup() {

            run_cmd( COMMANDS.getBackupState(), function( err, data ) {
                if( err ) {
                    return;
                }

                const state = data && data.data && data.data[0] && data.data[0].state;

                if( !state || 'idle' !== state ) {
                    return;
                }

                run_cmd( COMMANDS.getBackupInfo(), function( err, data ) {
                    if( err ) {
                        return;
                    }

                    let points = data && data.data && data.data[0] && data.data[0].points;

                    if( !points || !points.length ) {
                        return;
                    }

                    points = points.sort( function( a, b ) {
                        return new Date( b.date ) - new Date( a.date );
                    } );

                    const latestPoint = points[0] && points[0].date || null;

                    if( !latestPoint ) {
                        return;
                    }

                    const diff = moment().diff( latestPoint, 'days' );

                    if( 1 >= diff ) {
                        return;
                    }

                    notifyAdmins( {
                        subject: i18n( 'UserMgmtMojit.cli-apiJS.email.BACKUP_SUBJECT_FAIL' ),
                        jadeParams: {
                            text: i18n( 'InBackupMojit.InBackupViewModel.message.BACKUP_NOT_CREATED' )
                        },
                        jadePath: './mojits/UserMgmtMojit/views/backupemail.jade.html'
                    } );

                } );

            } );

        }

        /**
         * Export backup repository to all devices daily at 05.00.
         * @returns {undefined}
         */
        async function exportBackup() {
            const
                user = Y.doccirrus.auth.getSUForLocal(),
                translateProps = {
                    id: i18n( 'InBackupMojit.InBackupViewModel.deviceProps.id' ),
                    totalSize: i18n( 'InBackupMojit.InBackupViewModel.deviceProps.totalSize' ),
                    freeSize: i18n( 'InBackupMojit.InBackupViewModel.deviceProps.freeSize' ),
                    model: i18n( 'InBackupMojit.InBackupViewModel.deviceProps.model' ),
                    state: i18n( 'InBackupMojit.InBackupViewModel.deviceProps.state' ),
                    points: i18n( 'InBackupMojit.InBackupViewModel.deviceProps.points' )
                };

            let
                ctx = {user},
                devicesList = [],
                err,
                devicesText = '<br>\n<br/>\n';

            Y.log(`exportBackup: Entering exportBackup method`, "info", NAME);

            // --------------- 1. Call backup to cloud device independently (Note. Subject to inBackup Plus license) ------
            checkAndScheduleBackupToCloud({user});
            // ------------------------------------------------ 1. END ----------------------------------------------------


            // ------------------------------------ 2. Get all backup devices list -------------------------------
            [err] = await formatPromiseResult(
                            new Promise( (resolve, reject) => {
                                backupCommands.listBackupDevices( ctx, (error) => {
                                    if( error ) {
                                        reject(error);
                                    } else {
                                        resolve();
                                    }
                                } );
                            } )
                          );

            if( err ) {
                Y.log( `exportBackup: Error while fetching list of all backup devices. Error: ${JSON.stringify( err )} `, 'warn', NAME );
                return;
            }

            if( !ctx.body || !ctx.body.length ) {
                Y.log(`exportBackup: No devices found to backup. Nothing to do all good...`, "info", NAME);
                return;
            }
            // --------------------------------------------- 2. END ---------------------------------------------


            // --------------------------------- 3. Save backup of insuite DB on each device -----------------------------------------------
            for( const device of ctx.body ) {  // eslint-disable-line
                const backupStartTime = moment();

                devicesList.push( device );
                Y.log(`exportBackup: Starting to export backup on disk to deviceId = ${device.id} at: ${backupStartTime.toDate()}`, "info", NAME);

                [err] = await formatPromiseResult(
                                new Promise( (resolve, reject) => {
                                    runCliCommand( {
                                        user,
                                        query: {
                                            deviceId: device.id,
                                            command: 'exportBackupDevice'
                                        },
                                        callback( error ) {
                                            if(error) {
                                                reject(error);
                                            } else {
                                                resolve();
                                            }
                                        }
                                    } );
                                } )
                              );

                if( err ) {
                    // It will always be 8035 error but just for extra safety also checking 35 error code
                    if( 35 === +err.code || +err.code === 8035 ){
                        Y.log(`exportBackup: Backup is not exported to deviceId = ${device.id} because a backup on this device is already in progress. Error: ${err}. Backup was started at: ${backupStartTime.toDate()} and gave error at: ${moment().toDate()}`, 'warn', NAME);
                    } else {
                        Y.log( `exportBackup: Error on automatic backup export on deviceId = ${device.id}. Sending email to notify users about this backup failure. Error: ${JSON.stringify( err )}. Backup was started at: ${backupStartTime.toDate()} and gave error at: ${moment().toDate()}`, 'error', NAME );
                        sendCronEmail( BACKUP_SUBJECT_FAIL, BACKUP_FAIL.replace( '{device}', `${device.id} : ${JSON.stringify( err )}` ) );
                    }
                } else {
                    Y.log(`exportBackup: Backup on deviceId = ${device.id} which was started at: ${backupStartTime.toDate()} was successfully completed at: ${moment().toDate()}`, 'info', NAME);
                }
            }
            // ------------------------------------------------ 3. END ---------------------------------------------------------------------


            // ------------------------------------ 4. Send email of backed-up devices to concerned users ----------------------------------
            for( const [index, device] of devicesList.entries() ) { // eslint-disable-line
                devicesText = `${devicesText}<b>Backup device ${index}</b><br/>\n`;

                for( const key in device ) { // eslint-disable-line
                    if ( device.hasOwnProperty( key ) ) {
                        const label = translateProps.hasOwnProperty( key ) ? translateProps[key] : key;
                        devicesText = `${devicesText}${label}: ${device[key]}<br/>\n`;
                    }
                }

                devicesText = `${devicesText}<br/>\n`;
            }

            // currently disabled, see MOJ-7508
            //sendCronEmail( BACKUP_SUBJECT_SUCCESS, BACKUP_SUCCESS.replace( '{device}', devicesText ) );
            // --------------------------------------------------------- 4. END ------------------------------------------------------------

            Y.log(`exportBackup: Exiting exportBackup method`, "info", NAME);
        }

        /**
         * Get mongoose model
         * @param {Object} user User
         * @param {String} modelName Model name
         * @returns {Promise}
         */
        function getModel( user, modelName ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.mongodb.getModel( user, modelName, true, ( err, model ) => {
                    if( err ) {
                        Y.log( `Error, can't get model ${modelName} Error: ${err}`, 'error', NAME );
                        reject( err );
                    } else {
                        resolve( model );
                    }
                } );
            } );
        }

        /**
         * Get lastCloudBackupTimeInMs from admin collection
         * @param {Object} args input arguments
         * @param {Object} args.user user object
         * @returns {Promise}
         */
        function getLastCloudBackupTime( args ) {
            const {user} = args;

            return getModel( user, 'admin' )
                .then( (model) => {
                    return model.mongoose.findOne( {
                        _id: Y.doccirrus.schemas.admin.getCloudBackupTimeId()
                    } ).exec().then( ( res ) => {
                        return (res && res.lastCloudBackupTimeInMs) || null;
                    }, ( err ) => {
                        Y.log( 'getLastCloudBackupTime: Error while getting LastCloudBackupTime from admins collection. Error: ' + JSON.stringify( err ), 'error', NAME );
                        throw err;
                    } );
                } );
        }

        /**
         * Save lastCloudBackupTimeInMs into admin collection
         * @param {Object} args input arguments
         * @param {Object} args.user user object
         * @param {Number} args.backupTimeInMs scheduled time in MS
         * @returns {undefined}
         */
        function saveCloudBackupScheduleInDb( args ) {
            const {user, backupTimeInMs} = args;

            getModel( user, 'admin' )
            .then( (model) => {
                return model.mongoose.findOneAndUpdate( {
                            _id: Y.doccirrus.schemas.admin.getCloudBackupTimeId()
                       }, {
                           lastCloudBackupTimeInMs: backupTimeInMs
                       }, {
                           upsert: true
                       } );
            } )
            .then( () => {
                Y.log(`checkAndScheduleBackupToCloud: Successfully updated lastCloudBackupTimeInMs in DB`, 'info', NAME);
            } )
            .catch( (err) => {
                Y.log( 'checkAndScheduleBackupToCloud: Error while updating lastCloudBackupTimeInMs in DB. Error: ' + JSON.stringify( err ), 'error', NAME );
            } );
        }

        /*
        * Convert milliseconds to hours
        *
        * @param milliseconds Number
        * @return number/undefined Number represents hours
        * */
        function getHoursFromMilliSeconds( milliseconds ) {
            if( milliseconds && typeof milliseconds === "number" && milliseconds > 0 ) {
                return (((milliseconds/1000)/60)/60).toFixed(2);
            }
        }

        /*
        * As per cronjobs(-dev).json (exportBackup), this method should be called at 05:00 Everyday.
        *
        * We want to schedule cloud backup everyday between 22:00 Hours to 02:00 Hours the next day.
        * This method works as below:
        * 1] Get the current date (should be 05:00 or more)
        * 2] Create rangeStart from 22:00 of current date.
        * 3] Create rangeEnd by adding 4 hours to rangeStart. (which will make it 02:00 Hours the next day)
        * 4] Just for extra security calculate max date between current and rangeStart (rangeStart should always be maximum)
        * 5] Calculate randomTimeInMs between rangeStart and rangeEnd
        * 6] Calculate timeFromNowInMs from currentDate in milliseconds and return
        *
        * @return {Object} e.x.{
        *                         randomTimeInMs: <Number Random time represented in Milliseconds>
        *                         timeFromNowInMs: <Number Time difference between current time and random time>
        *                      }
        * */
        function getCloudBackupTimeOutValueInMs() {
            const
                START_HOUR = 22,
                HOURS_RANGE = 4;

            let
                currentDate = moment(),
                rangeStart = currentDate.clone().hours(START_HOUR).minutes(0).seconds(0).milliseconds(0), //Do not mutate currentDate
                rangeEnd = rangeStart.clone().add(HOURS_RANGE, "hours"), //Do not mutate rangeStart
                randomTimeInMs,
                timeFromNowInMs;

            /*
            * currentDate (05:00 hours or above) should always be less than rangeStart (22:00 hours same day) but for
            * extra security we still compute which one is maximum and assign to rangeStart
            * */
            rangeStart = moment.max(currentDate, rangeStart);

            randomTimeInMs = Y.doccirrus.commonutils.getRandomIntBetweenRange( rangeStart.valueOf(), rangeEnd.valueOf() );
            timeFromNowInMs = randomTimeInMs - currentDate.valueOf();

            return {
                randomTimeInMs,
                timeFromNowInMs
            };
        }

        /*
        * Check, schedule and execute automated cloud backup
        *
        * 1] Checks whether inBackup Plus license is active
        * 2] Get a random time between 22:00 to 02:00 (next day) and schedule backup at that time
        * 3] Execute backup
        * */
        function checkAndScheduleBackupToCloud( args ) {
            const {user, newTimeoutValue} = args;

            let
                timeoutObject,
                timeoutValue,
                ctx = {user},
                cloudModel="Cloud",
                backupStartTime;

            function exportBackupToCloud() {
                //Ensure again, before actually executing backup, if the license is not turned off in between
                if( Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inBackup' ) ) {
                    //1] Get Cloud device information
                    backupCommands.listCloudDevices(ctx, function listCloudDevicesCallback( err ) {
                        if( err ) {
                            Y.log( 'checkAndScheduleBackupToCloud: Error on listCloudDevices command : ' + JSON.stringify( err ), 'warn', NAME );
                            sendCronEmail( BACKUP_SUBJECT_FAIL, CLOUD_BACKUP_LIST_FAIL.replace( '{reason}', JSON.stringify( err ) ) );
                            return;
                        } else if( !ctx.body || !Array.isArray(ctx.body)|| !ctx.body.length ) {
                            Y.log( 'checkAndScheduleBackupToCloud: No data found in listCloudDevices command', 'warn', NAME );
                            sendCronEmail( BACKUP_SUBJECT_FAIL, CLOUD_BACKUP_LIST_FAIL.replace( '{reason}', CLOUD_BACKUP_LIST_FAIL_REASON_NO_DATA ) );
                            return;
                        } else if( !ctx.body[0].model ) {
                            Y.log( `checkAndScheduleBackupToCloud: No model found in output of listCloudDevices command: ${JSON.stringify(ctx.body)}`, 'warn', NAME );
                            sendCronEmail( BACKUP_SUBJECT_FAIL, CLOUD_BACKUP_LIST_FAIL.replace( '{reason}', CLOUD_BACKUP_LIST_FAIL_REASON_NO_MODEL ) );
                            return;
                        } else {
                            cloudModel = ctx.body[0].model;
                        }

                        //2] Start the automated cloud backup now
                        backupStartTime = moment();
                        Y.log(`checkAndScheduleBackupToCloud: Cloud backup started at: ${backupStartTime.toDate()}`, 'info', NAME);

                        runCliCommand( {
                            user,
                            query: {
                                deviceId: "s3",
                                command: 'exportBackupDevice'
                            },
                            callback( err ){
                                if( err ) {
                                    // It will always be 8035 error but just for extra safety also checking 35 error code
                                    if( 35 === +err.code || +err.code === 8035 ) {
                                        Y.log(`checkAndScheduleBackupToCloud: Sync backup data to cloud is not executed, because sync is already in progress. Error: ${err}. Backup was started on: ${backupStartTime.toDate()} and gave error on: ${moment().toDate()}`, 'warn', NAME);
                                    } else {
                                        Y.log( `checkAndScheduleBackupToCloud: Error on automatic backup export. Sending email to notify users about this backup failure. Error: ${JSON.stringify( err )}. Backup was started at: ${backupStartTime.toDate()} and gave error at: ${moment().toDate()}`, 'error', NAME );
                                        sendCronEmail( BACKUP_SUBJECT_FAIL, BACKUP_FAIL.replace( '{device}', `${cloudModel} : ${JSON.stringify( err )}` ) );
                                    }
                                } else {
                                    Y.log(`checkAndScheduleBackupToCloud: Backup which was started on: ${backupStartTime.toDate()} was successfully completed on: ${moment().toDate()}`, 'info', NAME);
                                    // sendCronEmail( BACKUP_SUBJECT_SUCCESS, BACKUP_SUCCESS.replace( '{device}', `${cloudModel}` ) );
                                }
                            }
                        } );
                    });
                } else {
                    Y.log(`checkAndScheduleBackupToCloud: Stopping as inBackup Plus license is deactivated`, 'warn', NAME);
                }
            }

            //First check if the user has required license
            if( Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inBackup' ) ) {
                if( newTimeoutValue ) {
                    timeoutValue = newTimeoutValue; //Means the server must have restarted and so we are setting timeOut based on previously computed time
                } else {
                    timeoutObject = getCloudBackupTimeOutValueInMs();

                    if( !timeoutObject.timeFromNowInMs || typeof timeoutObject.timeFromNowInMs !== "number" || timeoutObject.timeFromNowInMs <= 0 ) {
                        //Should ideally never come here
                        Y.log(`checkAndScheduleBackupToCloud: Invalid timeout value received: ${timeoutObject.timeFromNowInMs}. Starting cloud backup in 5 Minutes...`, 'warn', NAME);
                        timeoutValue = 5 * 60 * 1000;
                    } else {
                        timeoutValue = timeoutObject.timeFromNowInMs;

                        Y.log(`checkAndScheduleBackupToCloud: Scheduled for backup at: ${moment(timeoutObject.randomTimeInMs).toDate()}`, 'info', NAME);
                        Y.log(`checkAndScheduleBackupToCloud: Backup to cloud will start in ${timeoutObject.timeFromNowInMs} Milliseconds i.e. ${getHoursFromMilliSeconds(timeoutObject.timeFromNowInMs)} Hours from Now: (${moment().toDate()})`, 'info', NAME);

                        //Record the computed random time in db
                        saveCloudBackupScheduleInDb({
                            user,
                            backupTimeInMs: timeoutObject.randomTimeInMs
                        });
                    }
                }

                setTimeout( ()=> {
                    exportBackupToCloud();
                }, timeoutValue );
            }
        }

        function checkAndRunUnfinishedCloudBackup() {
            const user = Y.doccirrus.auth.getSUForLocal();

            if( Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inBackup' ) ) {
                getLastCloudBackupTime({user})
                    .then( (scheduledTimeInMs) => {
                        if( scheduledTimeInMs ) {
                            let currentTimeInMs = moment().valueOf();

                            if( scheduledTimeInMs > currentTimeInMs ) {
                                Y.log(`checkAndScheduleBackupToCloud: Found unfinished cloud backup schedule in DB. Scheduling again for: ${moment(scheduledTimeInMs).toDate()}`, 'info', NAME);
                                checkAndScheduleBackupToCloud({
                                    user,
                                    newTimeoutValue: ( scheduledTimeInMs - currentTimeInMs )
                                });
                            }
                        }
                    } )
                    .catch( (err) => {
                        Y.log( `checkAndScheduleBackupToCloud: Error in operation checkAndRunUnfinishedCloudBackup: ${err}`, 'error', NAME );
                    } );
            }
        }

        function sendCronEmail( subject, body ) {
            Y.log( 'Emailing admins after scheduled backup: ' + subject, 'debug', NAME );

            //var inBackupUrl = Y.doccirrus.auth.getPRCUrl( '/inbackup#/' );
            var inBackupUrl = dcauth.getServerIP();
            body = body + '<br/><a href="https://' + inBackupUrl + '/inbackup#/' + '">' + MANAGE_BACKUP_DEVICES + '</a><hr/>';

            notifyAdmins( {
                'subject': subject,
                'jadeParams': { text: body },
                'jadePath': CRON_EMAIL_JADE
            } );
        }

        /*
        * This method will be called daily (as configured by user) from Cron job configured in kronnd.server.js. The job configured
        * in kronnd.server.js for datasafeBackup is jobName = "datasafeBackup" and the daily hours for this can be found in admins
        * collection with _id = "000000000000000000000015"
        * */
        async function createDatasafeBackup(){ //jshint ignore:line
            let
                err,
                result, //eslint-disable-line
                currDate = moment();

            Y.log(`createDatasafeBackup: Starting datasafeBackup at: ${currDate.toDate()}`, "info", NAME);

            [err, result] = await formatPromiseResult( // eslint-disable-line
                                    new Promise((resolve, reject) => {
                                        run_cmd( COMMANDS.createBackupWait(), function( err, data ) {
                                            if( err ) {
                                                reject(err);
                                            } else {
                                                resolve(data);
                                            }
                                        } );
                                    })
                                  );

            if(err) {
                Y.log(`createDatasafeBackup: Error while creating backup started on: ${currDate.toDate()} and gave error on: ${moment().toDate()}. Error: ${err}`, "error", NAME);
            } else {
                Y.log(`createDatasafeBackup: Backup which was started on: ${currDate.toDate()} was successfully completed on: ${moment().toDate()}`, "info", NAME);
            }
        }

        /**
         * Check HDD size daily at 04.00.
         * If free space is less than 20%, notify admins.
         * @return {undefined}
         */
        function checkDiskFreeSize() {

            childProcess.execFile( 'df', ['-h'], function( err, stdout ) {
                if( err ) {
                    Y.log( 'Error on checking disk size: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                const disk = stdout
                    .split( os.EOL )
                    .map( i => i.replace( /\s\s+/g, ' ' ) )
                    .map( i => i.split( ' ' ) )
                    .map( i => ({
                        filesystem: i[0],
                        size: i[1],
                        used: i[2],
                        available: i[3],
                        usedPercent: i[4],
                        mountedOn: i[5]
                    }) )
                    .find( i => i.mountedOn && i.mountedOn.startsWith( '/mnt/dc-storage' ) );

                if( !disk || !disk.usedPercent ) {
                    return;
                }

                if( 95 > parseInt( disk.usedPercent, 10 ) ) {
                    return;
                }

                notifyAdmins( {
                    subject: i18n( 'UserMgmtMojit.cli-apiJS.email.BACKUP_SUBJECT_SIZE' ),
                    jadeParams: {
                        text: i18n( 'InBackupMojit.InBackupViewModel.message.BACKUP_FREE_SPACE' )
                    },
                    jadePath: './mojits/UserMgmtMojit/views/backupemail.jade.html'
                } );

            } );

        }

        /**
         * Main command handler, that creates middleware layer, to do some common processing and run command.
         * @param {Object} args
         * @return {undefined}
         */
        function runCliCommand( args ) {
            const {command, deviceId} = args.query;
            // args.query.command
            // args.query.deviceId
            // args.data
            // args.user
            // args.callback

            //console.log( 'START COMMAND', `|${command}|` );

            async.applyEachSeries( [
                writeAuditLog,
                appendSmbParams,
                executeBackupCommand
            ], args, function( err ) {

                Y.doccirrus.api.audit.auditCli( args.user, {
                    action: 'finish',
                    what: 'backup',
                    command: command,
                    deviceId: deviceId,
                    error: err
                } );

                if( err ) {
                    console.log( 'ERROR COMMAND', `|${command}|`, err ); //eslint-disable-line no-console
                    return args.callback( err );
                }

                args.body = args.body || null;
                //console.log( 'SUCCESS COMMAND', `|${command}|`, args.body );
                args.callback( null, args.body );

            } );

        }

        /**
         * Backup command Middleware. Write backup command to auditlog.
         * @param {Object} args
         * @param {Function} callback
         */
        function writeAuditLog( args, callback ) {
            const {command, deviceId} = args.query;

            Y.doccirrus.api.audit.auditCli( args.user, {
                action: 'start',
                what: 'backup',
                command: command,
                deviceId: deviceId
            } );

            callback();
        }

        /**
         * Backup command Middleware. Add smb config to context if need it.
         * @param {Object} args
         * @param {Function} callback
         */
        function appendSmbParams( args, callback ) {
            const {deviceId} = args.query;
            const {user} = args;

            if( !deviceId || 'samba' !== deviceId.toLowerCase() ) {
                return callback();
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'admin',
                action: 'get',
                user,
                query: {_id: new ObjectID( '000000000000000000000002' )},
                options: {
                    fields: {
                        backupSmbHost: 1,
                        backupSmbPort: 1,
                        backupSmbPath: 1,
                        backupSmbLogin: 1,
                        backupSmbPassword: 1,
                        backupSmbDomain: 1
                    }
                }
            }, function( err, [smbConf] ) {
                if( err ) {
                    return callback( err );
                }

                if( !smbConf ) {
                    return callback( new Error( 'Can\'t find backup smb config' ) );
                }

                if( !smbConf.backupSmbHost || !smbConf.backupSmbPort || !smbConf.backupSmbPath ) {
                    return callback( new Error( 'Bad smb config' ) );
                }

                args.query.smbConf = _.pick( smbConf, smbFields );

                callback();

            } );

        }

        /**
         * Send email to datensafe admins.
         * @param {Object} params
         * @param {String} params.subject
         * @param {Object} params.jadeParams jade variables
         * @param {String} params.jadePath path to jade template
         * @param {String} callback
         * @return {undefined}
         */
        function notifyAdmins( {subject, jadeParams, jadePath} ) {

            const user = Y.doccirrus.auth.getSUForLocal();

            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'employee',
                query: {
                    'memberOf.group': 'ADMIN',
                    status: 'ACTIVE'
                },
                options: { lean: true },
                callback: onEmployeesLoaded
            } );

            function onEmployeesLoaded( err, admins ) {
                if( err ) {
                    Y.log( 'Error listing admins for email notification: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                if( !admins || !admins.length ) {
                    return;
                }

                const mails = admins
                    .filter( a => a.communications.length && a.communications.filter( c => c && c.value ).length )
                    .map( a => {
                        const job = a.communications.find( c => 'EMAILJOB' === c.type );
                        const priv = a.communications.find( c => 'EMAILPRIV' === c.type );
                        return job && job.value || priv && priv.value;
                    } )
                    .filter( Boolean );

                if( !mails || !mails.length ) {
                    return;
                }

                const emailOptions = {
                    serviceName: 'prcService',
                    to: mails,
                    user: user,
                    subject,
                    jadeParams,
                    jadePath
                };

                const email = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                Y.doccirrus.email.sendEmail( { ...email, user }, ( err ) => {
                    if( err ) {
                        Y.log( `notifyAdmins. could not send email. ErrorL ${JSON.stringify( err )}`, 'error', NAME );
                    }
                } );

            }

        }

        /**
         * Execute command from map
         * @param {Object} args
         * @param {Function} callback
         * @return {undefined}
         */
        function executeBackupCommand( args, callback ) {
            const {command} = args.query;
            backupCommands[command]( args, callback );
        }

        /*
        * Supposed to be called on startup through DCDB.registerInitializer
        * Trigger setting up the auth PRC hostname, once cli is loaded
        */

        async function setHostAndPort() {
            if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isISD() && !Y.doccirrus.auth.isMTSAppliance() ) {
                return;
            }

            let err, result; //eslint-disable-line

            [err, result] = await formatPromiseResult( Y.doccirrus.auth.resetPRCHost() ); // eslint-disable-line

            if( err ) { throw err; }
        }

        /**
         * @method PUBLIC
         *
         * This method returns 'dccliSupportedFeatures' in-memory initialized variable.
         *
         * @returns {Object}
         */
        function getDccliSupportedFeatures() {
            return {...dccliSupportedFeatures};
        }

        /**
         * @method PUBLIC
         *
         * This method returns 'dccliCupsStatus', cached from queries to dc-cli if present
         *
         * @return {{enabled: boolean}}
         */

        function getDccliCupsStatus() {
            return {...dccliCupsStatus};
        }

        /**
         *  Called on dcdb startup via runOnStart
         *
         *  Check supported features by master and broadcast result to workers by IPC when they request it
         *
         *  @param callback
         *  @return {Promise<void>}
         */

        async function setupFeaturesCheck() {
            let err;
            Y.log( `Setup dc-cli supported features check and IPC on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );

            if ( Y.doccirrus.ipc.isMaster() ) {
                //  master should check features on startup
                [ err ] = await formatPromiseResult( queryAndCacheSupportedDcCliFeatures() );

                //  master should listen for IPC requests from (re)started workers for supported features
                Y.doccirrus.ipc.subscribeNamed( IPC_SUPPORTED_FEATURES_REQUEST, NAME, true, onFeaturesRequested );

            } else {
                //  workers should listen for IPC event, and request latest values when they start
                Y.doccirrus.ipc.subscribeNamed( IPC_SUPPORTED_FEATURES_UPDATED, NAME, true, onFeaturesUpdated );
                Y.doccirrus.ipc.send( IPC_SUPPORTED_FEATURES_REQUEST, {}, false, true );
            }

            //  IPC handler, raised on worker when master broadcasts updated set of supported features
            function onFeaturesUpdated( newFeatures ) {
                Y.log( `Received updated dc-cli supported features on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );
                dccliSupportedFeatures = newFeatures;
            }

            //  IPC handler, raised on master when worker requests the current state of supported features
            function onFeaturesRequested() {
                Y.log( `Received IPC request for dc-cli supported features on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );
                Y.doccirrus.ipc.send( IPC_SUPPORTED_FEATURES_UPDATED, dccliSupportedFeatures, false, false );
            }

            if ( err ) { throw err; }
        }

        /**
         *  Called on dcdb startup via runOnStart
         *
         *  Check cups status by master broadcast result to workers by IPC
         *
         *  @param callback
         *  @return {Promise<void>}
         */

        async function setupCupsEnabledCheck() {
            let err;

            Y.log( `Setup dc-cli cups status check and IPC on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );

            if ( Y.doccirrus.ipc.isMaster() ) {
                //  master should check if CUPS is enabled on startup
                [ err ] = await formatPromiseResult( queryAndCacheCupsStatus() );

                //  master should listen for IPC requests from (re)started workers
                Y.doccirrus.ipc.subscribeNamed( IPC_CUPS_STATUS_REQUEST, NAME, true, onCupsStatusRequested );

            } else {
                //  workers should listen for IPC event, and request latest values when they start
                Y.doccirrus.ipc.subscribeNamed( IPC_CUPS_STATUS_UPDATED, NAME, true, onCupsStatusUpdated );
                Y.doccirrus.ipc.send( IPC_CUPS_STATUS_REQUEST, {}, false, true );
            }

            //  IPC handler, raised on worker when master broadcasts a change to CUPS status
            function onCupsStatusUpdated( newStatus ) {
                Y.log( `Received updated dc-cli CUPS status on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );
                dccliCupsStatus = newStatus;
            }

            //  IPC handler, raised on master when worker requests the current CUPS status
            function onCupsStatusRequested() {
                Y.log( `Received IPC request for dc-cli CUPS status on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );
                Y.doccirrus.ipc.send( IPC_CUPS_STATUS_UPDATED, dccliCupsStatus, false, false );
            }

            if ( err ) { throw err; }
        }

        /**
         *  Run dc-cli startup methods in correct sequence
         *
         *  @param callback
         *  @return {Promise<void>}
         */

        async function runOnStart( callback ) {
            Y.log( 'cli.runOnStart: Entering Y.doccirrus.api.cli.runOnStart', 'info', NAME );

            const initDccliServiceP = util.promisify( initDccliService );
            let err;

            [ err ] = await formatPromiseResult( setupFeaturesCheck() );
            if ( err ) {
                Y.log( `cli.runOnStart: Could not set up check for dc-cli features: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            [ err ] = await formatPromiseResult( setupCupsEnabledCheck() );
            if ( err ) {
                Y.log( `cli.runOnStart: Could not set up check for cups status: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            //  needs supported features to be checked first
            [ err ] = await formatPromiseResult( initDccliServiceP() );
            if ( err ) {
                Y.log( `cli.runOnStart: Could not initialize dc-cli service: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            //  needs CLI service
            [ err ] = await formatPromiseResult( setHostAndPort() );
            if ( err ) {
                Y.log( `cli.runOnStart: Could not set host and port from dc-cli service: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            //  needs supported features to be checked first
            startCronJobsListenersForBackup();

            Y.log( 'cli.runOnStart: Exiting Y.doccirrus.api.cli.runOnStart', 'info', NAME );
            callback();
        }

        Y.namespace( 'doccirrus.api' ).cli = {
            name: NAME,

            // ------------------ DCDB STARTUP ---------------------
            runOnStart,

            // ------------------ JSONRPC ---------------------
            getProxyConfig,
            setProxyConfig,
            // ------------------ END -------------------------

            // --------- For mocha test ---------
            resetIsDcCliAvailable,
            // ------------ END ----------------

            getDccliSupportedFeatures,
            getDccliCupsStatus,
            getPRCHost,
            /**
             * This method load list of available devices
             *
             * @method devices
             * @param   params          {Object}
             * @param   callback        {Function}
             */
            hasDCcli: hasDCcli,
            getStatus: function( args ) {
                Y.log('Entering Y.doccirrus.api.cli.getStatus', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.getStatus');
                }
                getStatus( args );
            },
            getPRCIP: function( args ) {
                Y.log('Entering Y.doccirrus.api.cli.getPRCIP', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.getPRCIP');
                }
                getPRCIP( args );
            },
            reboot: function( args ) {
                Y.log('Entering Y.doccirrus.api.cli.reboot', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.reboot');
                }
                reboot( args );
            },
            updateCheck: updateCheck,
            softwareUpdate: softwareUpdate,

            sendTestCronEmail: function( args ) {
                Y.log('Entering Y.doccirrus.api.cli.sendTestCronEmail', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.sendTestCronEmail');
                }
                sendCronEmail( 'Hello world', 'This is a test of automated backup email delivery' );
                args.callback( null, { 'status': 'testing admin notification' } );
            },

            manualStartOfCronBackup: function( args ) {
                Y.log('Entering Y.doccirrus.api.cli.manualStartOfCronBackup', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cli.manualStartOfCronBackup');
                }
                exportBackup();
                args.callback( null, { 'status': 'manual trigger of scheduled backup' } );
            },

            runCliCommand
        };
    },
    '0.0.1', {
        requires: [
            'dcerror',
            'dccommunication',
            'dcerrortable',
            'doccirrus',
            'dcauth',
            'dccommonutils',
            'admin-schema'
        ]
    }
);