/*
 @author: rw
 @date: 2013 May
 */

/**
 * Library of Queueing functions specifically for separate calendar queues for doctors.
 *
 * Also used for scheduled deletion of files in the media collection
 *
 * Used by the scheduling library.
 *
 * Uses the YUI namespace.
 */



/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

const
    async = require( 'async' ),
    fs = require( 'fs' ),
    promisify = require( 'util' ).promisify,
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    moment = require( 'moment' ),
    path = require( 'path' );

YUI.add( 'dcschedulerevent', function( Y, NAME ) {

        var reportingApi = Y.doccirrus.api.reporting;

        var
            failureCounter = 0,
            mySchedEventQ,
            companies,
            whitelist = {},
            blacklist = {};

        /**
         * Constructor for the module class.
         *
         * @class DCCalQueue
         * @private
         */
        function DCSchedulerEventQueue() {
            var
                myLicMgr = Y.doccirrus.licmgr;

            function moveToBlacklist( tenantid, company ) {
                blacklist[tenantid] = company;
                delete whitelist[tenantid];
            }

            function reorganizeBlackAndWhiteList( companies ) {
                var servers = [];
                if( !companies ) {
                    return [];
                }
                //-> reorganize black & white list
                companies.forEach( function( company ) {
                    var
                        tenId = company.tenantId;

                    if( company.deleted ) {
                        moveToBlacklist( tenId, company );
                    }

                    if( undefined === blacklist[tenId] ) {
                        whitelist[tenId] = whitelist[tenId] || company;
                        whitelist[tenId].status = whitelist[tenId].status || 0;

                        switch( whitelist[tenId].status ) { // tenant is in whitelist
                            case 0: // connection ok
                            case 1: // 1 of 3 connection trials
                            case 2: // 2 of 3 connection trials
                                servers.push( tenId ); // check this server (hostname originates from tenant id
                                break;

                            case 3: // 3 of 3 connection trials, move to blacklist
                                moveToBlacklist( tenId, company );
                                break;

                            default: //move to blacklist
                                moveToBlacklist( tenId, company );
                                break;
                        }
                    }
                } );
                return servers;
            }

            /**
             *  Generic black and white list updater for use with the black and white server lists
             *  being maintained by this dc-server.
             *
             *  Use: just hang it into your processing chain, i.e. send the result of your server
             *  query to this function, and get it to call your callback. This automatically maintains
             *  the black and white lists.
             *
             * @param descr
             * @param server
             * @param callback (optional)
             * @returns {Function}
             */
            function getBlackAndWhiteListUpdater( descr, server, callback ) {
                var
                    cb = callback,
                    myServer = server,
                    myDescr = descr;

                return function processBWResult( err, result ) {
                    if( err ) {

                        Y.log( 'Cannot send ' + myDescr + ' -- ' + err + ' for host: ' + myServer, 'warn', NAME );
                        if( whitelist[server] ) {
                            whitelist[server].status += 1;
                        }
                    }
                    //                    else {
                    //                        Y.log( 'Successfully sent ' + myDescr + ' to ' + myServer );
                    //                    }
                    if( 'function' === typeof cb ) {
                        Y.log( 'sent ' + myDescr + ' -- ' + err + ' for host: ' + myServer, 'info', NAME );
                        return cb( err, result );
                    }
                };

            }

            /**
             * Queues a request to the server to send out patient alerts.
             * Patient alerts depend on the realign signal, because they
             * are only invoked when there is movement in the events in
             * the calendar -- i.e. when realign occurs.
             *
             * Further: we do not need to maintain server lists, etc.
             *
             * @param server  if empty, sends the request directly in to the
             *        LOCAL_TENANT DB, no REST. Otherwise sends to the server
             *        via getExternal call.
             */
            function queuePatientAlert( server ) {
                var
                    updater = getBlackAndWhiteListUpdater( 'Patient Alert', server ),
                    user;

                // reepeat immediately, because we are hitting the same DB as on the previous call.
                if( server ) {
                    user = Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getTenantFromHost( server ) );
                    Y.doccirrus.patalert.alertPatients( user, updater );

                } else {
                    // send result to /dev/null
                    Y.doccirrus.patalert.alertPatients( Y.doccirrus.auth.getSUForLocal(), function( err ) {
                        if( err ) {
                            Y.log( 'Cron unable to alert patients: ' + err, 'warn', NAME );
                        }
                    } );
                }

            }

            function onRealignSchedules() {
                var
                    user = Y.doccirrus.auth.getSUForLocal();

                function getRealignTenantJob( server ) {
                    return function() {
                        var
                            updater = getBlackAndWhiteListUpdater( 'Realign', server );
                        queuePatientAlert( server );
                        Y.doccirrus.scheduling.doRealign( Y.doccirrus.auth.getSUForTenant( server ), updater );
                    };
                }

                function doCompanies() {
                    var
                        REALIGN_WINDOW_MS = 20000,
                        servers = [],
                        realignWait,
                        i;

                    if( undefined === companies ) {
                        Y.log( 'RealignSchedules: Companies not available - quitting', 'info', NAME );
                        return;
                    }

                    servers = reorganizeBlackAndWhiteList( companies );

                    // how long can we afford to wait between realigns
                    realignWait = REALIGN_WINDOW_MS / servers.length;

                    // MOJ-935: filter out tenant 0 here
                    if( Array.isArray( servers ) && servers.length ) {
                        servers = servers.filter( function( elm ) {
                            return (elm !== '0');
                        } );
                    }

                    //->VPRC : realign all
                    for( i = 0; i < servers.length; i++ ) {
                        // realign in a staggered manner (MOJ-722)
                        setTimeout( getRealignTenantJob( servers[i] ), realignWait * i );
                    }
                }

                //VPRC or PRC-A?
                if( Y.doccirrus.auth.isVPRC() ) {

                    if( undefined === myLicMgr ) {
                        Y.log( 'RealignSchedules: License Manager not available - quitting', 'error', NAME );
                        return;
                    }

                    companies = myLicMgr.getActiveCustomers();
                    doCompanies();

                } else {
                    //->PRC-A : realign
                    queuePatientAlert();
                    Y.doccirrus.scheduling.doRealign( user, function( err ) {
                        if( err ) {
                            Y.log( 'Cron unable to RealignSchedules: ' + err, 'warn', NAME );
                            failureCounter++;
                            if( 3 < failureCounter ) {
                                failureCounter = 0;
                                // hard override locks, at some point this will work.
                                Y.doccirrus.schemas.sysnum.resetSemaphores( user );
                            }
                        }
                    } );
                }
            }

            function onUpgradePRCS() {
                var user = Y.doccirrus.auth.getSUForLocal(),
                    moment = require( 'moment' ),
                    randomNumber = Math.floor(Math.random() * 14400 ) + 1;

                function updateSoftware( data ) {
                    return function(){
                        Y.doccirrus.api.cli.softwareUpdate( data );
                    };
                }

                Y.log( `onUpgradePRCS: got signal`, 'info', NAME );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'admin',
                    action: 'get',
                    query: {
                        _id: Y.doccirrus.schemas.admin.getLicenseId()
                    }}, ( err, result )=>{
                    if( err ){
                        Y.log( `onUpgradePRCS: Admin not available - quitting - ${JSON.stringify(err)}`, 'error', NAME );
                        return;
                    }
                    if ( result && result[0] && result[0].licenseScope && result[0].licenseScope[0].upgrade ) {
                        Y.log( `onUpgradePRCS: got result ${result[0].licenseScope[0].upgrade}`, 'info', NAME );
                        if( moment( result[0].licenseScope[0].upgrade, 'DD.MM.YYYY' ).isBefore( moment() ) ) {
                            setTimeout( updateSoftware( { user: user, callback: ()=>{return;} } ), randomNumber * 1000 );
                        } else {
                            return;
                        }
                    } else {
                        Y.log( `onUpgradePRCS: no result`, 'info', NAME );
                        return;
                    }
                });
            }

            /**
             * Handles CloseDay event.
             */
            function onCloseDay() {

                var
                    servers = [];

                //VPRC or PRC-A?
                if( Y.doccirrus.auth.isVPRC() ) {
                    if( undefined === myLicMgr ) {
                        Y.log( 'CloseDay: License Manager not available - quitting', 'error', NAME );
                        return;
                    }
                    //->VPRC : get all companies
                    companies = myLicMgr.getActiveCustomers();

                    if( undefined === companies ) {
                        Y.log( 'CloseDay: Companies not available - quitting', 'info', NAME );
                        return;
                    }

                    servers = reorganizeBlackAndWhiteList( companies );

                    //->VPRC :
                    async.mapLimit( servers, 5, function( server, _cb ) {
                        function updateBWList( err ) {
                            if( err ) {
                                Y.log(`onCloseDay (cron job = 'CloseDay'): Failed to successfully finish 'CloseDay' cron job for tenantId: ${server}. Error: ${err.stack || err}`, "warn", NAME);
                                if( whitelist[server] ) {
                                    whitelist[server].status += 1;
                                }
                            }
                            setImmediate( _cb );
                        }

                        var
                            tenantSU = Y.doccirrus.auth.getSUForTenant( server );

                        Y.doccirrus.scheduling.doCloseDay( tenantSU, updateBWList );

                    }, function final() {
                        Y.log( 'CloseDay: Completed', 'info', NAME );
                    } );

                    Y.doccirrus.monitoring.vprcTrialReport();

                } else {

                    let suForLocal = Y.doccirrus.auth.getSUForLocal();

                    //->PRC-A : get scheduler
                    Y.doccirrus.scheduling.doCloseDay( suForLocal, function( err ) {
                        if( err ) {
                            Y.log(`onCloseDay (cron job = 'CloseDay'): Failed to successfully finish 'CloseDay' cron job. Error: ${err.stack || err}. There are`, "warn", NAME);
                        }
                    } );

                }
            }

            function dailyQueueProcessing() {
                Y.log( 'Start NightQueueProcessing', 'info', NAME );
                var user = Y.doccirrus.auth.getSUForLocal();

                if( Y.doccirrus.auth.isVPRC() ) {
                    Y.doccirrus.api.company.getActiveTenants( {
                        user: user,
                        callback: function( err, activeTenants ) {
                            if( err ) {
                                Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                            } else {

                                let activeTenantList = activeTenants.map( doc => doc.tenantId ),
                                    tenantSU = null;

                                activeTenantList.forEach( function( tenantId ) {
                                    tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );
                                    Y.doccirrus.api.tag.queuedProcessingTag( tenantSU, () => {
                                        Y.log( 'Finished processing subTypes on ' + tenantId.toString(), 'info', NAME );
                                    } );
                                } );

                            }
                        }
                    } );

                } else if( Y.doccirrus.auth.isPRC() ) {
                    Y.doccirrus.api.tag.queuedProcessingTag( user, () => {
                        Y.log( 'Finished processing subTypes on PRC on ' + user.tenantId.toString(), 'info', NAME );
                    } );
                }

            }

            function dailyReportingsUpdate( aux ) {
                var user = Y.doccirrus.auth.getSUForLocal();

                if( Y.doccirrus.auth.isVPRC() ) {
                    Y.doccirrus.api.company.getActiveTenants( {
                        user: user,
                        callback: function( err, activeTenants ) {
                            if( err ) {
                                Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                            } else {

                                let activeTenantList = activeTenants.map( doc => doc.tenantId ),
                                    tenantSU = null;

                                activeTenantList.forEach( function( tenantId ) {
                                    tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );
                                    if( !aux ) {
                                        reportingApi.dailyReportingsUpdate( tenantSU );
                                    } else {
                                        reportingApi.dailyReportingsAuxUpdate( tenantSU );
                                    }
                                } );

                            }
                        }
                    } );

                } else if( Y.doccirrus.auth.isPRC() ) {
                    if( !aux ) {
                        reportingApi.dailyReportingsUpdate( user );
                    } else {
                        reportingApi.dailyReportingsAuxUpdate( user );
                    }
                }

            }

            function setInPacsLastLogLine() {

                const user = Y.doccirrus.auth.getSUForLocal();

                if( !Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inPacs' ) ) {
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsconfiguration',
                    action: 'get',
                    useCache: false
                }, ( err, res ) => {
                    if( err ) {
                        Y.log( "Can not set lastLogLine to 0. Error: " + JSON.stringify( err ), "error", NAME );
                    }
                    else if( res && res.length && res[0] ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'inpacsconfiguration',
                            action: 'put',
                            query: {
                                _id: res[0]._id
                            },
                            data: {'lastLogLine' : 0, skipcheck_: true},
                            fields: ['lastLogLine']

                        }, function( err ) {
                            if( err ) {
                                Y.log( "Failed inpacsconfiguration db request. Error: " + JSON.stringify( err ), "error", NAME );
                            }
                        } );
                    }
                } );
            }

            /**
             * Perform scheduled deletion of expired items in media collection (media.deleteAfter < now)
             *
             * This is used to clean out uploaded or generated files which are unlinked or have no further use, such
             * as a download which has expired or an uploaded file on an activity which was never saved.
             */

            function onCleanupTempFiles() {
                var
                    servers = [];

                function onCleanupComplete( err ) {
                    if( err ) {
                        Y.log( 'Problem cleaning up expired media: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                }

                // Context is VPRC or PRC-A?
                if( Y.doccirrus.auth.isVPRC() ) {

                    // Cleanup media for all VPRC tenants:
                    companies = myLicMgr.getActiveCustomers();

                    if( undefined === companies || !companies ) {
                        onCleanupComplete( new Error( 'CleanupTempFiles: Companies not available - quitting' ) );
                        return;
                    }

                    servers = reorganizeBlackAndWhiteList( companies );

                    async.mapLimit( servers, 3, function( server, _cb ) {
                        function updateBWList( err ) {
                            if( err ) {
                                if( whitelist[server] ) {
                                    whitelist[server].status += 1;
                                }
                            }
                            setImmediate( _cb );
                        }

                        var
                            tenantSU = Y.doccirrus.auth.getSUForTenant( server );

                        Y.doccirrus.api.media.cleanupExpiredMedia( { 'user': tenantSU, 'callback': updateBWList } );

                    }, function final() {
                        Y.log( 'Media Cleanup: Completed', 'info', NAME );
                        onCleanupComplete();
                    } );
                    //servers.forEach( function( server ) {
                    //    var tenantSU = Y.doccirrus.auth.getSUForTenant( server );
                    //    Y.doccirrus.api.media.cleanupExpiredMedia( { 'user':tenantSU, 'callback': onCleanupComplete });
                    //} );

                } else {
                    // Cleanup media for single PRC tenant:
                    Y.doccirrus.api.media.cleanupExpiredMedia( {
                        'user': Y.doccirrus.auth.getSUForLocal(),
                        'callback': onCleanupComplete
                    } );
                }

            }

            /**
             * Alerts hot tasks
             */
            function checkTasks() {
                Y.doccirrus.utils.getActiveSUForAllTenants( function( err, superUsers ) {
                    if( err || !superUsers ) {
                        return;
                    }
                    superUsers.forEach( function( user ) {
                        Y.doccirrus.api.task.alertHotTasks( {
                            user: user,
                            callback: function( err ) {
                                if( err ) {
                                    Y.log( 'Can not alert hot tasks. Info: ' + JSON.stringify( err ), 'info', NAME );
                                }
                            }
                        } );
                    } );
                } );
            }

            /**
             * Initializes "hot" conferences.
             */
            function checkConferences() {
                Y.doccirrus.utils.getActiveSUForAllTenants( ( err, superUsers ) => {
                    if( err ) {
                        Y.log( `checkConferences. Could not get SU for all tenants. Error: ${JSON.stringify( err )}`, 'error', NAME );
                        return;
                    }
                    async.eachSeries( superUsers, ( user, next ) => {
                            Y.doccirrus.api.conference.initializeConferences( {
                                user,
                                callback: function( err ) {
                                    if( err ) {
                                        Y.log( `Can not initialize conference. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                                    }
                                    next();
                                }
                            } );
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `Can not check conferences. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                            }
                        }
                    );
                } );
            }

            /**
             * Executes cleanUnconfirmedConsultations function for all active tenants of VPRC, for PRC and ISD
             *
             * @returns {Promise<void>}
             */
            async function checkForUnconfirmedConsultations() {
                const
                    getActiveSUForAllTenantsP = promisify( Y.doccirrus.utils.getActiveSUForAllTenants ),
                    cleanUnconfirmedConsultationsP = promisifyArgsCallback( Y.doccirrus.api.conference.cleanUnconfirmedConsultations );

                let err, superUsers;

                [err, superUsers] = await formatPromiseResult( getActiveSUForAllTenantsP() );

                if( err ) {
                    Y.log( `checkForUnconfirmedConsultations: Can not get users. Error: ${err.stack || err}`, 'error', NAME );
                    return;
                }

                for( let user of superUsers ) {
                    [err] = await formatPromiseResult( cleanUnconfirmedConsultationsP( {user} ) );
                    if( err ) {
                        Y.log( `checkForUnconfirmedConsultations: Error when executing cleanUnconfirmedConsultationsP: ${err.stack || err}`, 'error', NAME );
                    }
                }
            }

            function checkFinishing() {

                Y.doccirrus.utils.getActiveSUForAllTenants( function( err, superUsers ) {
                    if( err ) {
                        Y.log( 'Can not get users for auto ending schedules. Error: ' + JSON.stringify( err ), 'error', NAME );
                    }
                    superUsers.forEach( function( user ) {
                        Y.doccirrus.scheduling.checkEndOfSchedule( user, ( err, result ) => {
                            if( err ) {
                                Y.log( 'Can not update schedules. Error: ' + JSON.stringify( err ), 'error', NAME );
                            }
                            else {
                                if( result.nModified > 0 ) {
                                    Y.log( 'Updated scheduled in ' + JSON.stringify( result ), 'debug', NAME );
                                }
                            }
                        } );
                    } );

                } );

            }

            function cleanWorklistsDirectories() {

                if( !Y.doccirrus.licmgr.hasAdditionalService( Y.doccirrus.auth.getSUForLocal().tenantId, 'inPacs' ) ) {
                    return;
                }

                const
                    WL = '.wl',
                    TXT = '.txt';

                function cleanDirectory( directoryPath, extension ) {
                    fs.readdir( directoryPath, ( err, files ) => {
                        if( err ) {
                            Y.log( " Can not empty worklists directory. " + JSON.stringify( err ), "error", NAME );
                        }
                        if( files ) {
                            files.forEach( function( file ) {
                                if( extension === file.substring( file.length - extension.length, file.length ) ) {
                                    fs.unlink( path.join( directoryPath, file ), err => {
                                        if( err ) {
                                            Y.log( "Error during deleting wl file. " + JSON.stringify( err ), "error", NAME );
                                        }
                                    } );
                                }
                            } );
                        }
                    } );
                }

                if( Y.doccirrus.auth.isPRC() ) {
                    Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig ) => {
                        if( err ) {
                            Y.log( "Failed to clean worklists directories. Error: " + JSON.stringify( err ) );
                        }
                        else {
                            const
                                wlPath = path.join( Y.doccirrus.auth.getTmpDir(), Y.doccirrus.api.inpacsconfiguration.WORK_LIST_TMP_DIR_NAME ),
                                wlDbPath = Y.doccirrus.api.inpacsconfiguration.getWorkListsPath( inpacsConfig );

                            if( wlPath && fs.existsSync( wlPath ) ) {
                                Y.log( " Cleaning worklists' directory: " + wlPath, "debug", NAME );
                                cleanDirectory( wlPath, TXT );
                                cleanDirectory( wlPath, WL );
                            }
                            else {
                                Y.log( " Can not empty worklists directory. Path: " + wlPath, "error", NAME );
                            }
                            if( wlDbPath && fs.existsSync( wlDbPath ) ) {
                                Y.log( " Cleaning worklists database directory: " + wlDbPath, "debug", NAME );
                                cleanDirectory( wlDbPath, WL );
                            }
                            else {
                                Y.log( " Can not empty worklists database directory. Path: " + wlDbPath, "error", NAME );
                            }
                        }
                    } );

                }
            }

            function syncDispatch() {
                var user = Y.doccirrus.auth.getSUForLocal();

                if( Y.doccirrus.auth.isVPRC() ) {
                    Y.doccirrus.api.company.getActiveTenants( {
                        user: user,
                        callback: function( err, activeTenants ) {
                            if( err ) {
                                Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                                return;
                            }

                            let activeTenantList = activeTenants.map( doc => doc.tenantId );
                            activeTenantList.forEach( function( tenantId ) {
                                Y.doccirrus.api.dispatch.processQueue( Y.doccirrus.auth.getSUForTenant( tenantId ) );
                            } );
                        }
                    } );

                } else if( Y.doccirrus.auth.isPRC() ) {
                    Y.doccirrus.api.dispatch.processQueue( user );
                }
            }

            function processReceiveQueue() {
                var user = Y.doccirrus.auth.getSUForLocal();

                if( Y.doccirrus.auth.isVPRC() ) {
                    Y.doccirrus.api.company.getActiveTenants( {
                        user: user,
                        callback: function( err, activeTenants ) {
                            if( err ) {
                                Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                                return;
                            }

                            let activeTenantList = activeTenants.map( doc => doc.tenantId );
                            activeTenantList.forEach( function( tenantId ) {
                                Y.doccirrus.api.dispatch.processReceiveQueue( Y.doccirrus.auth.getSUForTenant( tenantId ) );
                            } );
                        }
                    } );

                } else if( Y.doccirrus.auth.isPRC() ) {
                    Y.doccirrus.api.dispatch.processReceiveQueue( user );
                }
            }

            function onHeartbeat() {
                Y.doccirrus.dctime.sendHeartbeat();
            }

            async function checkSupportRequests() {
                var user = Y.doccirrus.auth.getSUForLocal(),
                    err, result,
                    idsToUpdate = [];

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'supportrequest',
                        action: 'get',
                        query: {
                            status: Y.doccirrus.schemas.supportrequest.statuses.ACTIVE
                        }
                    } )
                );
                if( err ) {
                    Y.log( `Could not get supportrequests. Error: ${ err.stack || err }`, 'warn', NAME );
                    throw err;
                }
                if( !result.length ) {
                    Y.log( 'checkSupportRequests. There are no support requests', 'debug', NAME );
                    return;
                }
                result.forEach( ( item ) => {
                    let requestTimestamp = item.timestamp,
                        requestDuration = item.supportDuration,
                        requestExpiredAt = moment( requestTimestamp ).add( requestDuration, 'hours' ),
                        now = moment();

                    if( requestExpiredAt.isBefore( now ) ) {
                        idsToUpdate.push( item._id );
                    }
                    return;
                } );
                if( idsToUpdate && idsToUpdate.length ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'supportrequest',
                            action: 'update',
                            query: {
                                _id: { $in: idsToUpdate }
                            },
                            data: {
                                $set: { status: Y.doccirrus.schemas.supportrequest.statuses.EXPIRED }
                            },
                            options: {
                                multi: true
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `Could not update supportrequests. Error: ${ err.stack || err }`, 'warn', NAME );
                        throw err;
                    }
                }
                return;
            }

            /**
             *  For each tenant, regenerate reporting entries for the past day according to the audit log
             *  @return {Promise<void>}
             */

            async function regenerateReportingFromAuditLog() {
                const
                    getActiveTenantsP = promisifyArgsCallback( Y.doccirrus.api.company.getActiveTenants ),
                    localSuperUser = Y.doccirrus.auth.getSUForLocal(),

                    startDate = moment().subtract( 24, 'hours' ).startOf( 'day' ).toDate(),
                    endDate = moment().toDate();

                let
                    tenants,
                    tenant,
                    tenantSuperUser,
                    err;

                //  for local database, for single tenant systems
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.insight2.regenerate.regenerateFromAuditLog( localSuperUser, startDate, endDate )
                );

                if ( err ) {
                    Y.log( `regenerateReportingFromAuditLog: Could not regenerate reporting for tenant 0: ${err.stack||err}`, 'error', NAME );
                    return;
                }

                //  if not VPRC then we do not need to look up tenants
                if ( !Y.doccirrus.auth.isVPRC() ) {
                    Y.log( `regenerateReportingFromAuditLog: Completed regenerating reporting for single tenant.`, 'info', NAME );
                    return;
                }

                [ err, tenants] = await formatPromiseResult( getActiveTenantsP( { 'user': localSuperUser } ) );

                if ( err ) {
                    Y.log( `regenerateReportingFromAuditLog: Cron job could not list tenants to regenerate reporting for them: ${err.stack||err}`, 'error', NAME );
                    return;
                }

                //  regenerate for all tenant audit logs
                for ( tenant of tenants ) {
                    Y.log( `regenerateReportingFromAuditLog: regenerating for tenant ${tenant.tenantId}`, 'info', NAME );

                    tenantSuperUser = Y.doccirrus.auth.getSUForTenant( tenant.tenantId );
                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.insight2.regenerate.regenerateFromAuditLog( tenantSuperUser, startDate, endDate )
                    );

                    if ( err ) {
                        Y.log( `regenerateReportingFromAuditLog: Problem regenerating reporting: ${err.stack||err}`, 'error', NAME );
                        //  continue with next tenant, best effort
                    }
                }

                Y.log( `regenerateReportingFromAuditLog: Completed regenerating reporting for all ${tenants.length} tenants.`, 'info', NAME );
            }

            // The following test must be positive,
            // because we can have a server that is more than
            // one type of server. VPRC && DCPRC.
            //
            // i.e. this code is for Doctor's Practices...
            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isISD() ) {

                // Keep events up to date with what is happening in the practice.
                Y.doccirrus.kronnd.on( 'RealignSchedules', onRealignSchedules );
                Y.doccirrus.kronnd.on( 'RealignSchedules', checkTasks );
                Y.doccirrus.kronnd.on( 'RealignSchedules', checkConferences );
                Y.doccirrus.kronnd.on( 'RealignSchedules', checkForUnconfirmedConsultations );
                Y.doccirrus.kronnd.on( 'AutoEnding', checkFinishing );
                Y.doccirrus.kronnd.on( 'UpgradePRCS', onUpgradePRCS );


                // Close the calendar for the day.
                Y.doccirrus.kronnd.on( 'CloseDay', onCloseDay );

                //daily reporting update
                Y.doccirrus.kronnd.on( 'CloseDay', () => {
                    setTimeout( dailyReportingsUpdate, 15 * 60 * 1000 );
                } );
                Y.doccirrus.kronnd.on( 'CloseDay', () => {
                    setTimeout( () => {
                        dailyReportingsUpdate( true );
                    }, 30 * 60 * 1000 ); //Aux
                } );
                Y.doccirrus.kronnd.on( 'CloseDay', () => {
                    setTimeout( setInPacsLastLogLine, 45 * 60 * 1000 );
                } );

                Y.doccirrus.kronnd.on( 'NightQueueProcessing', dailyQueueProcessing );

                // Clean up temp files from folder and media collection
                Y.doccirrus.kronnd.on( 'CleanupTempFiles', onCleanupTempFiles );
                Y.doccirrus.kronnd.on( 'CleanupTempFiles', cleanWorklistsDirectories );

                Y.doccirrus.kronnd.on( 'syncDispatch', syncDispatch );
                Y.doccirrus.kronnd.on( 'processReceiveQueue', processReceiveQueue );

                // Regenerate reporting from the audit log
                Y.doccirrus.kronnd.on( 'regenerateReportingFromAuditLog', regenerateReportingFromAuditLog );


                // Send heartbeat socketIO event to the client
                Y.doccirrus.kronnd.on( 'Heartbeat', onHeartbeat );
            }

            if(  Y.doccirrus.auth.isDCPRC() ) {
                Y.doccirrus.kronnd.on( 'RealignSchedules', checkSupportRequests );
            }
        }

        mySchedEventQ = new DCSchedulerEventQueue();
        //ruleImportApi.makeImportDir();
        Y.namespace( 'doccirrus' ).schedEventQ = mySchedEventQ;

    },
    '0.0.1', {
        requires: [
            'dckronnd',
            'dcscheduling',
            'dclicmgr',
            'dcauth',
            'dcpatalert',
            'mojito',
            'DCPRCSMgr',
            'DCJawboneManager',
            'media-api',
            'dctrialreport',
            'dcutils',
            'DCMemoryChecker',
            'reporting-api',
            'inpacsconfiguration-api'
        ]
    }
);