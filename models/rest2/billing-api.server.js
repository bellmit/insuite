/**
 * User: rrrw
 * Date: 02/06/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';

YUI.add( 'billing-api', function( Y, NAME ) {
    const
        { formatPromiseResult } = require( 'dc-core' ).utils;

        /**
         * save the billing entry on MVPRC
         *
         * Notice: as of now the PRC route is not tested and not in use
         *
         * @param args
         * @param callback
         */
        function submitBilling( args, callback ) {
            var
                localDBUser = args.user || Y.doccirrus.auth.getSUForLocal(),
                data = args.data || args;
            callback = args.callback || callback;

            if( Y.doccirrus.auth.isPRC() ) {
                Y.log( 'transmitting summary entry to VPRC', 'error', NAME );

                // future feature for type2 radiologist
                Y.doccirrus.https.externalPost(
                    Y.doccirrus.auth.getPUCUrl( '/2/contract/:submitFolderSummary' ),
                    data,
                    null,
                    function( error, httpObj, body ) {
                        if( error ) {
                            Y.log( 'error in POST submitFolderSummary: ' + JSON.stringify( error ), 'error', NAME );
                            callback( error );
                        } else {
                            callback( null, body && body.data );
                        }
                    }
                );

            } else if( Y.doccirrus.auth.isMVPRC() ) {
                if( !data.patientId && !data.timestamp && data._id ) {
                    Y.log( 'Removing Billing entry: ' + JSON.stringify( data._id ), 'info', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user: localDBUser,
                        action: 'delete',
                        model: 'billing',
                        query: {_id: data._id},
                        callback: function( err, result ) {
                            callback( err, result );
                        }
                    } );
                    return;
                }
                data.skipcheck_ = true;
                Y.doccirrus.mongodb.runDb( {
                    user: localDBUser,
                    action: 'upsert',
                    model: 'billing',
                    query: {},
                    data: data,
                    callback: function( err, result ) {
                        callback( err, result );
                    }
                } );
            }
        }

        /**
         * the cron job that updated billings on MVPRC-Admin (local tenant)
         */
        function doBilling() {
            Y.log( 'cron job doBilling called: ' + new Date(), 'debug', NAME );
            var
                migrate = require( 'dc-core' ).migrate;
            migrate.eachTenantParallelLimit( function( dbUser, cb ) {
                if( dbUser.tenantId === Y.doccirrus.auth.getLocalTenantId() ) {
                    cb();
                    return;
                }
                Y.doccirrus.api.invoiceconfiguration.get( {
                    user: dbUser,
                    callback: function( err, result ) {
                        if( !err && result && result[0] && result[0].isMedneoCustomer ) {
                            Y.doccirrus.api.billing.generateBilling( dbUser );
                        } else {
                            Y.log( 'generateBilling is not enabled for tenant: ' + dbUser.tenantId + ' ' + JSON.stringify( err ), 'debug', NAME );
                        }
                        cb();
                    }
                } );
            }, 1, function( err, results ) {
                if( err ) {
                    Y.log( 'could not generateBilling' + err, 'error', NAME );
                    return;
                }
                Y.log( 'generateBilling passed for ' + (results && results.length) + ' tenants', 'debug', NAME );
            } );
        }

        /**
         * reads syncFolder and generates a billing for each entry there (if possible) and
         * at the end deletes the entry.
         * caseFolderId is used as billing._id.
         * an exiting billing will be replaced.
         *
         * @param args
         * @param callback
         */
        function generateBilling( args, callback ) {
            var
                dbUser = args.user || args,
                async = require( 'async' );

            callback = callback || args.callback;
            Y.log( 'generateBilling called for tenant: ' + dbUser.tenantId, 'debug', NAME );

            callback = callback || function( err ) {
                if( err ) {
                    Y.log( 'error in generateBilling: ' + dbUser.tenantId + ' error: ' + JSON.stringify( err ), 'error', NAME );
                }
            };

            Y.log( 'reading syncFolder from ' + dbUser.tenantId, 'debug', NAME );

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                user: dbUser,
                model: 'syncfolder',
                query: {},
                callback: function( err, result ) {
                    if( err || !result || !result.length ) {
                        callback( err );

                    } else {
                        Y.log( 'consuming syncFolder: ' + result.length + ' on tenant: ' + dbUser.tenantId, 'debug', NAME );
                        async.each( result, function( syncEntry, cb ) {
                                // get a summary of the whole folder which will be saved as a billing entry
                                Y.doccirrus.api.contract.getFolderSummary( dbUser, syncEntry._id, function( err1, folderSummary ) {
                                    if( err1 ) {
                                        Y.log( 'error in handling syncFolder item: ' + JSON.stringify( err1 ), 'error', NAME );
                                        cb( err1 );

                                    } else if( folderSummary ) {
                                        submitBilling( folderSummary, function saveCb( err3 ) { // save it on MVPRC-Admin
                                            if( err3 ) {
                                                cb( err3 );
                                            } else {
                                                //mongooselean.remove
                                                Y.doccirrus.mongodb.runDb( {
                                                    user: dbUser,
                                                    action: 'delete',
                                                    model: 'syncfolder',
                                                    query: {
                                                        _id: syncEntry._id
                                                    }
                                                }, function( err, deletedDocuments) {
                                                    cb(err, Array.isArray(deletedDocuments)?deletedDocuments[0]:deletedDocuments);
                                                } );
                                            }
                                        } );
                                    } else { // just delete it
                                        //mongooselean.remove
                                        Y.doccirrus.mongodb.runDb( {
                                            user: dbUser,
                                            action: 'delete',
                                            model: 'syncfolder',
                                            query: {
                                                _id: syncEntry._id
                                            }
                                        }, function( err, deletedDocuments) {
                                            cb(err, Array.isArray(deletedDocuments)?deletedDocuments[0]:deletedDocuments);
                                        } );
                                    }
                                } );
                            },
                            function allDone( err ) {
                                if( err ) {
                                    Y.log( 'error in generateBilling: ' + JSON.stringify( err ), 'error', NAME );
                                    callback( err );
                                    return;
                                }
                                Y.log( 'generateBilling done for ' + dbUser.tenantId + ' and ' + result.length + ' entries', 'debug', NAME );
                                callback();
                            } );
                    }
                }
            } );
        }

        function get( args, callback ) {
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'billing',
                user: args.user,
                query: args.query,
                options: args.options,
                callback: callback || args.callback
            } );
        }

        /**
         * gets the filtered result and converts to csv.
         * returns only a zipId that can be used to download the file by browser.
         *
         * if noZip is set then it only writes the output and returns the output file path
         *
         * @param query filters from data table
         * @param options sort and select parameters from data table
         * @param filePath custom file path (overrides the default naming)
         * @param noZip if true then will just create the file
         */
        function exportDataTable( args ) {
            Y.log('Entering Y.doccirrus.api.billing.exportDataTable', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.billing.exportDataTable');
            }
            var
                converter = require( 'json-2-csv' ),
                user = args.user,
                filePath = args.filePath,
                params = args.data || args,
                query = params.query || args.options,
                options = params.options || args.query,
                callback = args.callback;

            function prepareZipFolder( csv ) {
                var
                    moment = require( 'moment' ),
                    d = moment(),
                    fileName = 'billing-' + user.tenantId + '-' + d.format( 'YYYYMMDD' ) + '.csv',
                    tempName = fileName + '-' + Math.random().toString( 36 ).substring( 8 ),
                    path = filePath || (Y.doccirrus.auth.getTmpDir() + '/' + tempName);

                Y.doccirrus.media.writeFile( path, '', csv, function( err ) { // write temp file
                    if( err || args.noZip ) {
                        return callback( err );
                    }
                    Y.doccirrus.media.zip.create( '', function( err, zipId ) { // creates a folder to be compressed before downloading
                        if( err ) {
                            callback( err );
                        } else {
                            Y.doccirrus.media.zip.addFile( zipId, path, '', fileName, true, function( err ) {
                                callback( err, {zipId: zipId} );
                            } );
                        }
                    } );
                } );
            }

            args.options = options;
            args.query = query;
            get( args, function( err, result ) {

                if( err ) {
                    return callback( err );
                }

                result = result.map( function( b ) {
                    b = b.toObject ? b.toObject() : b;
                    delete b._id;
                    delete b.__v;
                    return b;
                } );
                converter.json2csv( result, function( err, csv ) {
                    if( err || !csv ) {
                        callback( err );
                    } else {
                        prepareZipFolder( csv );
                    }
                }, {
                    "DELIMITER": {
                        "FIELD": ";",
                        "ARRAY": ",",
                        "WRAP": "\"",
                        "EOL": "\n"
                    }
                } );
            } );
        }

        /**
         * send an email to Doc Cirrus with report file as attachment
         * @param args
         */
        function reportBillings( args ) {
            Y.log('Entering Y.doccirrus.api.billing.reportBillings', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.billing.reportBillings');
            }
            var
                moment = require( 'moment' ),
                now = moment(),
                start = moment(),
                MONTHS = 2,
                user = args && args.user || Y.doccirrus.auth.getSUForLocal(),
                callback = function( err, result ) {
                    if( err ) {
                        Y.log( 'error in reportBillings: ' + JSON.stringify( err ), 'error', NAME );
                    }
                    if( args && args.callback ) {
                        args.callback( err, result );
                    }
                },
                fileName, path;

            // note the time. used to detect skipped reports
            function updateTimeTrack() {
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'admin',
                    user: Y.doccirrus.auth.getSUForLocal(),
                    query: {_id: Y.doccirrus.schemas.admin.getClosedayId()},
                    fields: ['lastBillingReport'],
                    data: {lastBillingReport: now.toDate(), skipcheck_: true},
                    callback: function( err ) {
                        Y.log( 'updated lastBillingReport: ' + JSON.stringify( err ), 'debug' );
                        callback( err );
                    }
                } );
            }

            // email to Doc Cirrus
            function sendEmail() {
                var
                    message = {
                        serviceName: 'billingService',
                        subject: 'Monatlicher Bericht Medneo-VPRC',
                        text: 'Billing report from ' + start.format( 'DD.MM.YYYY' ) + ' to ' + now.format( 'DD.MM.YYYY' ) + '\n',
                        attachments: [
                            {path: path, contentType: "application/text", filename: fileName}
                        ]
                    };

                Y.doccirrus.email.sendEmail( { ...message, user }, function( err, result ) {
                    if( err ) {
                        Y.log( "Can't send billing report. Error: " + err, 'error', NAME );
                    }
                    Y.log( 'sent billing report: ' + JSON.stringify( result ) + ' ' + JSON.stringify( result ), 'debug', NAME );
                    Y.doccirrus.media.tempRemove( path, updateTimeTrack );
                } );
            }

            start.add( 'month', -MONTHS );
            fileName = 'billing-' + start.format( 'YYYYMMDD' ) + '-' + now.format( 'YYYYMMDD' ) + '.csv';
            path = Y.doccirrus.auth.getTmpDir() + '/' + fileName;

            // exports as csv to the path
            Y.doccirrus.api.billing.exportDataTable( {
                user: user,
                noZip: true,
                filePath: path,
                query: {timestamp: {$gte: start}},
                options: {select: {totalCost: 0}},
                callback: function( err ) {
                    if( err ) {
                        callback( err );
                    } else {
                        sendEmail();
                    }
                }
            } );
        }

        // works only on master and MVPRC
        function initGlobalBillingService( callback ) {
            callback = callback || function( err ) {
                if( err ) {
                    Y.log( 'error in initializing billing-api: ' + JSON.stringify( err ), 'error', NAME );
                }
            };

            if( !Y.doccirrus.ipc.isMaster() ) {
                return callback();
            }
            if( !Y.doccirrus.auth.isMVPRC() ) {
                return callback();
            }

            Y.doccirrus.kronnd.on( 'doBilling', doBilling );
            Y.doccirrus.kronnd.on( 'reportBillings', reportBillings );

            // check if the report was skipped then execute it now
            function checkReportBillings() {
                var
                    now = new Date(),
                    nextTime = Y.doccirrus.kronnd.nextFireTime( 'reportBillings' ),
                    jobTime = new Date();

                nextTime = nextTime.toDate ? nextTime.toDate() : nextTime;

                // only month and year comes from the current date
                jobTime.setDate( nextTime.getDate() );
                jobTime.setHours( nextTime.getHours() );
                jobTime.setMinutes( nextTime.getMinutes() );
                jobTime.setSeconds( nextTime.getSeconds() );

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'admin',
                    user: Y.doccirrus.auth.getSUForLocal(),
                    query: {_id: Y.doccirrus.schemas.admin.getClosedayId()},
                    options: {limit: 1},
                    callback: function( err, result ) {
                        var
                            lastBillingReport = result && result[0] && result[0].lastBillingReport;
                        if( err ) {
                            callback( err );

                        } else if( !lastBillingReport || (now > jobTime && lastBillingReport < jobTime) ) { // if first time use of the feature or the job was skipped at the expected time
                            Y.log( 'checkReportBillings: job was skipped at ' + jobTime + ' executing the job... lastBillingReport:' + lastBillingReport, 'debug', NAME );
                            reportBillings();
                            callback();

                        } else {
                            Y.log( 'checkReportBillings: job was called on-time at ' + lastBillingReport, 'debug', NAME );
                            callback();
                        }
                    }
                } );
            }

            checkReportBillings();
        }

        Y.namespace( 'doccirrus.api' ).billing = {
            runOnStart: initGlobalBillingService,
            get: get,
            exportDataTable: exportDataTable,
            submitBilling: submitBilling,
            generateBilling: generateBilling,
            reportBillings: reportBillings
        };
    },
    '0.0.1', {
        requires: [
            'dckronnd' , 'billing-schema' , 'contract-api'
        ]
    }
);
