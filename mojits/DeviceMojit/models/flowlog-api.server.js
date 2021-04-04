/**
 * User: jm
 * Date: 2017-02-08  17:28
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add(
    'flowlog',
    function( Y, NAME ) {

        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * @module flow-logger
         */

        var maxTimestampsPerEntry = 11;

        /**
         * @method log
         * @param {Object} flowName
         * @param {Object} flowComponentName the component: source/sink/transformer name
         * @param {String} msg
         * @param {String|Object} userOrTenant user object or tenant string
         * @param {Function} callback
         */
        //Y.doccirrus.auth.getSUForTenant( msg.tenant )
        function log( flowName, flowComponentName, msg, userOrTenant, callback = () => {} ) {
            var user = ("string" === typeof userOrTenant) ? Y.doccirrus.auth.getSUForTenant(userOrTenant) : userOrTenant;

            //to get the timestamp for current day at 00:00 : get the current date as JSON string, strip date, create new date from it, convert to hex
            var currentTime = new Date();
            var startOfDay = ( new Date( currentTime.toJSON().slice( 0, 10 ) ).getTime() / 1000 ).toString( 16 );
            var mongoIdStart = startOfDay + "0000000000000000";
            //log message to existing entry 
            
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "flowlog",
                action: "get",
                query: {
                    $and: [
                        { _id: { $gt: mongoIdStart }},
                        { flowName },
                        { flowComponentName },
                        { msg }
                    ]
                },
                options: {
                    lean: true
                }
            }, function( err, res ) {
                if( err ) {
                    Y.log( 'Failed to add flow log: ' + err.message, 'error', NAME );
                }
                if (res && res[0]) {
                    res[0].timesOccurred.unshift(currentTime);
                    while (res[0].timesOccurred.length > maxTimestampsPerEntry) {
                        res[0].timesOccurred.pop();
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: "flowlog",
                        action: 'upsert',
                        fields: ["latestOccurrence", "timesOccurred"],
                        options: { quiet: true },
                        data: {
                            _id: res[0]._id,
                            latestOccurrence: currentTime,
                            timesOccurred: res[0].timesOccurred,
                            skipcheck_: true
                        }
                    }, function( err, res ) {
                        if( err ) {
                            Y.log( 'Failed to update flow log: ' + err.message, 'error', NAME );
                        }
                        callback( err, res );
                    } );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: "flowlog",
                        action: "post",
                        data: {
                            flowName,
                            flowComponentName,
                            msg,
                            latestOccurrence: currentTime,
                            timesOccurred: [currentTime],
                            skipcheck_: true
                        }
                    }, function( err, res ) {
                        if( err ) {
                            Y.log( 'Failed to add flow log: ' + err.message, 'error', NAME );
                        }
                        callback( err, res );
                    } );
                }
            } );
        }

        /**
         * @method PUBLIC
         *
         * FOr GDT import, if a file is already in gdtlogs collection and if the user tries to reimport the same file then
         * 1] gdtlogs-api.server (checkAndCreate) method will return stating that the file already exists in DB
         * 2] flow-api.server will call this method to log all the details of the file in flowlogs collection so the
         *    user can see/download the file from the flowlogs UI
         * 3] flow-api.server will then physically delete the file so this created flowlog will be the only record which will
         *    have all the details of what happened
         *
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.user
         * @param {String} args.data.flowName :REQUIRED: Flow name which triggered this method
         * @param {String} args.data.flowComponentName :REQUIRED: The localised name of source (ex. Quellen)
         * @param {String} args.data.msg :REQUIRED: localised error message
         * @param {String} args.data.deletedFileUrl :REQUIRED: media download URL of file (this would equal to gdtlogs.fileDownloadUrl )
         * @returns {Promise<void>}
         */
        async function logDeletedFileDetails( args ) {
            Y.log('Entering Y.doccirrus.api.flowlog.logDeletedFileDetails', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flowlog.logDeletedFileDetails');
            }
            const
                {user, data = {}} = args,
                {flowName, flowComponentName, msg, fileDownloadUrl} = data,
                currentTime = new Date();

            if( !flowName || !flowComponentName || !msg || !fileDownloadUrl ) {
                throw new Error(`'flowName', 'flowComponentName', 'msg', 'fileDownloadUrl' required`);
            }

            let
                err,
                result;

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        model: 'flowlog',
                                        action: 'post',
                                        user: user,
                                        data: Y.doccirrus.filters.cleanDbObject( {
                                            flowName,
                                            flowComponentName,
                                            msg,
                                            fileDownloadUrl,
                                            latestOccurrence: currentTime,
                                            timesOccurred: [currentTime]
                                        } )
                                    } )
                                  );

            if( err ) {
                Y.log(`logDeletedFileDetails: Error while creating flowlog entry in DB. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`logDeletedFileDetails: Failed to create flowlog entry in DB.`, "error", NAME);
                throw new Error(`Failed to create GDT log entry in DB.`);
            }
        }

        Y.namespace( 'doccirrus.api' ).flowlog = {
            name: NAME,
            log: log,
            logDeletedFileDetails
        };
    },
    '0.0.1', {
        requires: [
            'dcmongodb'
        ]
    }
);
