/**
 * User: abhijit.baldawa
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * This module manages all the CRUD operations on 'devicelogs' (Mediabuch) collection and is a single point of communication
 * to manage devicelogs data.
 */

/*global YUI */
YUI.add( 'devicelog-api', function( Y, NAME ) {

        const
            util = require('util'),
            fs = require('fs'),
            path = require('path'),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            {formatPromiseResult, handleResult} = require('dc-core').utils,
            {getHashFromBufferOrString} = Y.doccirrus.api.gdtlog;

        /**
         * In-memory variable to record 'md5' hash of all the incoming media files.
         * The 'fileHashSet' will be used and has meaning only on master cluster
         * @type {Set<String>}
         */
        let
            fileHashSet = new Set();

        function checkPatientIsExist( user, patientId ) {
            return Y.doccirrus.mongodb.runDb( {
                model: 'patient',
                user: user,
                action: 'count',
                query: {
                    _id: patientId || new ObjectId( -1 )
                }
            } );
        }

        /**
         * @method PRIVATE
         *
         * This method checks if the provided 'fileHash' already exists in the DB.
         * If yes
         *      returns {fileDownloadUrl: String}
         * else
         *      returns undefined
         *
         * @param {Object} user
         * @param {String} fileHash :REQUIRED: check whether the fileHash exists in the DB or not
         * @returns {Promise<undefined | {fileDownloadUrl: String}>}
         */
        async function checkIfDeviceLogExistsByFileHash( user, fileHash ) {
            let
                err,
                result,
                deviceLogObj,
                documentObj;

            // -------------------------------------------- 1. Validations --------------------------------------------------------------------
            if( !fileHash || !user ) {
                throw new Error(`checkIfDeviceLogExistsByFileHash: 'fileHash' and 'user' are required`);
            }
            // ------------------------------------------------- 1. END ------------------------------------------------------------------------


            // -------------------------------- 2. Check if deviceLog exists for the 'fileHash' ------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'devicelog',
                                        action: 'get',
                                        query: { fileHash }
                                    } )
                                  );

            if(err) {
                Y.log(`checkIfDeviceLogExistsByFileHash: Error while querying deviceLog by fileHash: ${fileHash}. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                // Not found. All good no need to proceed
                return;
            }

            if( !result[0].attachments || !result[0].attachments[0] ) {
                Y.log(`checkIfDeviceLogExistsByFileHash: Found duplicate deviceLogId: ${result[0]._id} for fileHash: ${fileHash} does not have any 'attachments'`, "error", NAME);
                throw new Error(`Found duplicate deviceLogId: ${result[0]._id} for fileHash: ${fileHash} does not have any 'attachments'`);
            }

            deviceLogObj = result[0];
            // ------------------------------------------------- 2. END ------------------------------------------------------------------------


            // --------------------- 3. Query the referred document and get the URL of the file so that it can be downloaded form the flow log UI ---------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'document',
                                        action: 'get',
                                        query: {
                                            _id: deviceLogObj.attachments[0]
                                        }
                                    } )
                                  );

            if(err) {
                Y.log(`checkIfDeviceLogExistsByFileHash: Error while querying document _id: ${deviceLogObj.attachments[0]}. Error: ${err.stack || err}`);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                // Should never happen
                Y.log(`checkIfDeviceLogExistsByFileHash: Document _id: ${deviceLogObj.attachments[0]} referred by deviceLogId: ${deviceLogObj._id} not found in the DB.`, "error", NAME);
                throw new Error(`Document _id: ${deviceLogObj.attachments[0]} referred by deviceLogId: ${deviceLogObj._id} not found in the DB.`);
            }

            if( !result[0].url ) {
                Y.log(`checkIfDeviceLogExistsByFileHash: Document _id: ${deviceLogObj.attachments[0]} referred by deviceLogId: ${deviceLogObj._id} does not have 'url' key`, "error", NAME);
                throw new Error(`Document _id: ${deviceLogObj.attachments[0]} referred by deviceLogId: ${deviceLogObj._id} does not have 'url' key`);
            }

            documentObj = result[0];
            // -------------------------------------------------------------- 3. END --------------------------------------------------------------------------------------------------------

            return { fileDownloadUrl: documentObj.url };
        }

        /**
         * @method PUBLIC
         *
         * This method, if invoked, sends system notification. This method should be called if duplicate media file is received as media-import
         *
         * @param {Object} user :REQUIRED:
         * @param {String} message :REQUIRED: message to be displayed as system message
         */
        function sendDuplicateMediaReceivedSystemNotification( user, message ){
            if( !user || !message ) {
                return;
            }

            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'message',
                msg: {
                    data: message
                }
            } );
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * This method is to claim the existing deviceLogEntryId and does below:
         * 1] Makes sure deviceLogEntryID Id exists and is 'UNPROCESSED'
         * 2] checks if 'attachments' pointed by deviceLogEntry EXISTS in DB
         * 3] checks if the 'attachedMedia' pointed by deviceLogEntry exists in DB
         * 4] Checks if passed-in 'patientId' exists in DB
         * 5] If 'activityId' is present then checks if it exists in DB
         * 6] Create or update activity with 'attachments' and 'attachedMedia', uses 'caseFolderId', 'actType' if creating new activity
         * 7] Claim deviceLogEntry by 'activityId' (updated or created) and 'patientId'
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operation
         * @param {Object} args.data :REQUIRED: Input Data for this method
         * @param {Function} args.callback :OPTIONAL: callback function for responding
         * @param {String} args.data.patientId :REQUIRED: patient id inside which to update/create a activity with attachments
         * @param {[{
         *           caption: <String ex. 'Aufnahme'>
         *           contentType: <String ex. image/jpeg>
         *           mediaId: <String>
         *           _id: <String>
         *        }]} args.data.attachedMedia :REQUIRED:
         * @param {Array[<String, "Document _id">]} args.data.attachments :REQUIRED: attachments array
         * @param {String} args.data.deviceLogEntryId :REQUIRED: deviceLogId to claim be new/updated activity and passed in patientId
         * @param {Boolean} args.data.createNew :OPTIONAL:  If 'true' then creates a new (actType || 'OBSERVATION') Activity containing
         *                                                 'attachments' and 'attachedMedia' in caseFolder by caseFolderId else updates existing activity by 'activityId' or
         *                                                 by computed pastId (4h)
         * @param {String} args.data.activityId :OPTIONAL: If 'creatNew' is true then absent else can be present
         * @param {Boolean} args.data.reloadCaseFileOnUI :OPTIONAL: If set to true then notify UI to reload case file to reflect changes else will not notify
         *                                                          DEFAULT VALUE: true
         * @param {String} args.data.caseFolderId :OPTIONAL if 'createNew' is true use for define case folder for new activity
         * @param {String} args.data.actType : OPTIONAL if 'createNew' is true then uses for setting action type
         * @returns {Promise<Void | String (_id of updated/created activity)>}
         *          If 'callback' is provided then return response in callback as below:
         *                           Error name = <error code>
         *             1] Errors -> Invalid input = '115001'
         *                          Devicelog not found = '115002'
         *                          Devicelog already assigned = '115003'
         *                          Devicelog does not have any attachment = '115004' --> highly unlikely but still keeping the check
         *                          Devicelog attachment is not found in DB = '115005'
         *                          Devicelog media object is not found in DB = '115011'
         *                          User selected patient not found = '115006'
         *                          User selected activity not found = '115007',
         *                          User selected activity cannot be changed = '115027'
         *                          Error creating/updating activity = '115008',
         *                          Error claiming devicelog = '115009',
         *                          Database error = '115000'
         *
         *             2] Successful -> _id of updated/created activity)
         */
        async function claimDeviceLogEntry( args ) {
            Y.log('Entering Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry');
            }
            const
                {user, data = {}, callback} = args,
                {patientId, deviceLogEntryId, attachedMedia, createNew, activityId, attachments, reloadCaseFileOnUI = true, caseFolderId, actType} = data;
            let
                err,
                result,
                deviceLogEntry,
                patientCount,
                createdOrUpdatedActivityId;

            // ------------------------------ 1. Validations ------------------------------------------------------
            if( !patientId || !deviceLogEntryId || !attachedMedia || !attachments || !attachedMedia.length || !attachments.length) {
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115001' ) ); // Callback has different error than throw because we want to show proper error on UI
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    // If callback is not present means it is called from 'claimAllUnclaimedDeviceLogs' locally
                    throw new Error(`claimDeviceLogEntry: 'patientId', 'deviceLogEntryId', 'attachedMedia' and 'attachments' are required`);
                }
            }

            if( createNew && ( !caseFolderId || !actType ) ) {
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115001' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    // If callback is not present means it is called from 'claimAllUnclaimedDeviceLogs' locally
                    throw new Error(`claimDeviceLogEntry: If 'createNew' is true then 'caseFolderId' and 'actType' are required`);
                }
            }
            // ------------------------------------ 1. END --------------------------------------------------------


            // ---------------------- 2. Get deviceLogEntry by Id and make sure it is 'UNPROCESSED' -----------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb({
                                        model: 'devicelog',
                                        action: 'get',
                                        user: user,
                                        query: {_id: deviceLogEntryId}
                                    })
                                  );

            if( err ) {
                Y.log(`claimDeviceLogEntry: Error while querying deviceLogId: ${deviceLogEntryId}. Error: ${err.stack || err}`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115000' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw err;
                }
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`claimDeviceLogEntry: deviceLogEntry not found for Id: ${deviceLogEntryId}`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115002' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw new Error(`deviceLogEntry not found for Id: ${deviceLogEntryId}`);
                }
            }

            if( result[0].status !== "UNPROCESSED" ) {
                Y.log(`claimDeviceLogEntry: deviceLogId: ${deviceLogEntryId} is already claimed`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115003' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw new Error(`deviceLogId: ${deviceLogEntryId} is already claimed`);
                }
            }

            if( !result[0].attachments || !result[0].attachedMedia || !result[0].attachments.length || !result[0].attachedMedia.length ) {
                Y.log(`claimDeviceLogEntry: No attachments found for deviceLogId: ${deviceLogEntryId}`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115004' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw new Error(`No attachments found for deviceLogId: ${deviceLogEntryId}`);
                }
            }

            deviceLogEntry = result[0];
            // ------------------------------------------------ 2. END ------------------------------------------------------------------


            // ------------------------ 3. Check if attachments exists in DB ------------------------------------------------------------
            /**
             * This check is important because previously when activities were deleted then its associated Documents and Medias were also
             * deleted from DB but deviceLog were kept hanging as it is. So with the rollout of this feature many deviceLogEntries could
             * be pointing to non existing documents and we want to handle this case
             */
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb({
                                        model: 'document',
                                        action: 'get',
                                        user: user,
                                        query: {
                                            _id: { $in: deviceLogEntry.attachments }
                                        }
                                    })
                                  );

            if( err ) {
                Y.log(`claimDeviceLogEntry: Error while querying attachments: ${deviceLogEntry.attachments}. Error: ${err.stack || err}`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115000' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw err;
                }
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`claimDeviceLogEntry: attachments with ID's : ${deviceLogEntry.attachments} not found in DB`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115005' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw new Error(`attachments with ID's : ${deviceLogEntry.attachments} not found in DB`);
                }
            }
            // ---------------------------------------- 3. END ---------------------------------------------------------------------------


            // -------------------------- 4. Check if 'deviceLogEntry.attachedMedia[0].mediaId' exists in the DB -----------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb({
                                        model: 'media',
                                        action: 'get',
                                        user: user,
                                        query: {
                                            _id: deviceLogEntry.attachedMedia[0].mediaId
                                        }
                                    })
                                  );

            if( err ) {
                Y.log(`claimDeviceLogEntry: Error while querying mediaId: ${deviceLogEntry.attachedMedia[0].mediaId}. Error: ${err.stack || err}`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115000' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw err;
                }
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`claimDeviceLogEntry: media with ID's : ${deviceLogEntry.attachedMedia[0].mediaId} not found in DB`, "error", NAME);
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115011' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw new Error(`media with ID's : ${deviceLogEntry.attachedMedia[0].mediaId} not found in DB`);
                }
            }
            // -------------------------------------------------------- 4. END ---------------------------------------------------------------


            // ----------------------------- 4. Check if patient exists for the provided patient ID -------------------------------------------------
            [err, patientCount] = await formatPromiseResult( checkPatientIsExist( user, patientId ) );

            if( err ) {
                Y.log(`claimDeviceLogEntry: Error while querying patient by ID: ${patientId}. Error: ${err.stack || err}`, "error", NAME );

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115000' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw err;
                }
            }

            if( !patientCount ) {
                Y.log(`claimDeviceLogEntry: patient with ID: ${patientId} not found in DB`, "info", NAME);

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115006' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw new Error(`patient with ID: ${patientId} not found in DB`);
                }
            }
            // ------------------------------------------ 4. END ------------------------------------------------------------------------------------


            // ------------------------------ 5. If 'activityId' is present then check if it exists in the DB ---------------------------------
            if( activityId ) {
                [err, result] = await formatPromiseResult(
                                        Y.doccirrus.mongodb.runDb({
                                            model: 'activity',
                                            action: 'get',
                                            user: user,
                                            query: {
                                                _id: activityId
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`claimDeviceLogEntry: Error while querying activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                    if( callback ) {
                        return callback( Y.doccirrus.errors.rest( '115000' ) );
                    } else {
                        Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                        throw err;
                    }
                }

                if( !result || !Array.isArray(result) || !result.length ) {
                    Y.log(`claimDeviceLogEntry: activityId: ${activityId} not found in DB`, "error", NAME);
                    if( callback ) {
                        return callback( Y.doccirrus.errors.rest( '115007' ) );
                    } else {
                        Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                        throw new Error(`activityId: ${activityId} not found in DB`);
                    }
                }

                if( result[0].status !== "VALID" && result[0].status !== "INVALID" && result[0].status !== "CREATED" ) {
                    if( callback ) {
                        return callback( Y.doccirrus.errors.rest( '115027', {$status: Y.doccirrus.i18n(`activity-schema.ActStatus_E.${result[0].status}`)} ) );
                    } else {
                        Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                        throw new Error(`Cannot assign the deviceLog entry to selected activity because its status is ${result[0].status}`);
                    }
                }
            }
            // ------------------------------------------------ 5. END ------------------------------------------------------------------------


            // ----------------------------- 6. Create or update activity ----------------------------------------------------------------------------
            [err, createdOrUpdatedActivityId] = await formatPromiseResult(
                                                        createOrUpdateActivity({
                                                            user,
                                                            data: {
                                                                patientId,
                                                                createNew,
                                                                activityId,
                                                                attachedMedia: deviceLogEntry.attachedMedia,
                                                                attachments: deviceLogEntry.attachments,
                                                                actType,
                                                                caseFolderId
                                                            }
                                                        })
                                                      );

            if( err ) {
                Y.log(`claimDeviceLogEntry: Error in createOrUpdateActivity. ${err.stack || err}`, "error", NAME);

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115008' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw err;
                }
            }
            // ---------------------------------------- 6. END ---------------------------------------------------------------------------------------


            // ----------------------------- 7. Claim deviceLog entry in DB ----------------------------------------------------------------------------
            [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                model: 'devicelog',
                                action: 'put',
                                user: user,
                                query: {_id: deviceLogEntryId},
                                data: Y.doccirrus.filters.cleanDbObject( {
                                    status: 'PROCESSED',
                                    patientId: patientId,
                                    activityId: createdOrUpdatedActivityId
                                } ),
                                fields: ['status', 'patientId', 'activityId']
                            } )
                          );

            if( err ) {
                Y.log(`claimDeviceLogEntry: Error while claiming deviceLog ID: ${deviceLogEntryId} by patientId: ${patientId} and activityId: ${createdOrUpdatedActivityId}. ${err.stack || err}`, "error", NAME);

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115009' ) );
                } else {
                    Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                    throw err;
                }
            }
            // ---------------------------------------- 7. END ---------------------------------------------------------------------------------------


            // ---------------------- 8. If 'reloadCaseFileOnUI' is set to true then notify the UI to reload activities table ------------------------
            if( reloadCaseFileOnUI && createdOrUpdatedActivityId ) {
                await formatPromiseResult( notifyUIToReloadActivitiesTable(user, createdOrUpdatedActivityId) );
            }
            // ----------------------------------------------------- 8. END --------------------------------------------------------------------------

            if( callback ) {
                callback( null, createdOrUpdatedActivityId );
            } else {
                Y.log('Exiting Y.doccirrus.api.devicelog.claimDeviceLogEntry', 'info', NAME);
                return createdOrUpdatedActivityId;
            }
        }

        /**
         * @method PRIVATE
         *
         * This method creates a new activity or updates an existing activity with 'attachments' and 'attachedMedia' so that the activity
         * contains the provided attachment and attachedMedia
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operation
         * @param {Object} args.data :REQUIRED: Input Data for this method
         * @param {String} args.data.patientId :REQUIRED: patient id inside which to update/create a activity with attachments
         * @param {[{
         *           caption: <String ex. 'Aufnahme'>
         *           contentType: <String ex. image/jpeg>
         *           mediaId: <String>
         *           _id: <String>
         *        }]} args.data.attachedMedia :REQUIRED:
         * @param {Array[<String, "Document _id">]} args.data.attachments :REQUIRED: attachments array
         * @param {Boolean} args.data.createNew :OPTIONAL: If 'true' then creates a new (actType || 'OBSERVATION') Activity containing
         *                                                 'attachments' and 'attachedMedia' in caseFolder by caseFolderId else updates existing activity by 'activityId' or
         *                                                 by computed pastId (4h)
         * @param {String} args.data.activityId :OPTIONAL: If 'creatNew' is true then absent else can be present
         * @param {String} args.data.caseFolderId :OPTIONAL if 'createNew' is true then use for define case folder for new activity
         * @param {String} args.data.actType : OPTIONAL if 'createNew' is true then uses for setting action type
         * @returns {Promise<String>} If successful resolves to created or updated activityId else rejects with error
         */
        async function createOrUpdateActivity( args ) {
            const
                {user, data = {}} = args,
                {patientId, attachedMedia = [], createNew, activityId, attachments = [], caseFolderId, actType} = data;

            let
                err,
                activityIdArr,
                pastId;

            pastId = Math.floor( Date.now() / 1000 ) - (60 * 60 * 4); // 4h
            pastId = pastId.toString( 16 );
            while( pastId.length < 24 ) {
                pastId += '0';
            }

            // ------------------------------- 1. Validations --------------------------------------------------------
            if( !patientId ) {
                throw `createOrUpdateActivity: 'Missing patientId'`;
            }
            // ------------------------------------ 1. END -----------------------------------------------------------

            // ----------------------------------------- 2. Create/Update activity based on 'createNew' ----------------------------------------------------------
            [err, activityIdArr] = await formatPromiseResult(
                                            new Promise( (resolve, reject) => {
                                                Y.doccirrus.api.activity.createActivityForPatient( {
                                                    user: user,
                                                    query: {_id: patientId},
                                                    action: { UPDATE_OR_CREATE_ATTACHMENTS: createNew ? {_id: new ObjectId( -1 )} : {_id: activityId || {$gte: pastId}} },
                                                    data: {
                                                        // Search or create activity by actType only in case creating new or updating the last observation
                                                        actType: (createNew || !activityId) ? (actType || 'OBSERVATION') : null,
                                                        attachments,
                                                        caseFolderId : createNew ? caseFolderId : null,
                                                        attachedMedia
                                                    },
                                                    callback: ( err, result ) => {
                                                        if( err ) {
                                                            reject( err );
                                                        } else {
                                                            resolve(result);
                                                        }
                                                    }
                                                } );
                                            } )
                                         );

            if( err ) {
                Y.log(`createOrUpdateActivity: Error in createActivityForPatient. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !activityIdArr || !Array.isArray(activityIdArr) || !activityIdArr.length ) {
                Y.log(`createOrUpdateActivity: Failed to create/update activity in createActivityForPatient`);
                throw `createOrUpdateActivity: Failed to create/update activity in createActivityForPatient`;
            }
            // --------------------------------------------------- 2. END -----------------------------------------------------------------------------------------------

            return activityIdArr[0];
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * Given 'activityId' and 'patientId',  all 'UNPROCESSED' deviceLogs are claimed by activityId and attachments
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Function} args.callback :REQUIRED: response function
         * @param {Object} args.data :REQUIRED: input data
         * @param {String} args.data.patientId :REQUIRED: patientId the activity is pointing to
         * @param {String} args.data.activityId :REQUIRED: activity Id which will claim all 'UNPROCESSED' deviceLogs
         *
         * @callback args.callback(err, {errorCount: <Number>, successCount: <Number>, totalCount: <Number>})
         *              Errors with error code are as below:
         *              1] Invalid input = '115001',
         *              2] Database query error = '115000',
         *              3] no unassigned device log found = '115010'
         *
         * @returns {Promise<Void>}
         */
        async function claimAllUnclaimedDeviceLogs( args ) {
            Y.log('Entering Y.doccirrus.api.devicelog.claimAllUnclaimedDeviceLogs', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.devicelog.claimAllUnclaimedDeviceLogs');
            }
            const
                {user, data = {}, callback} = args,
                {patientId, activityId} = data;

            let
                err,
                deviceLogArr,
                response = {errorCount: 0, successCount: 0, totalCount: 0};

            Y.log( `claimAllUnclaimedDeviceLogs: Attaching all 'UNPROCESSED' device logs to activityId: ${activityId}`, 'debug', NAME );


            // ---------------------------- 1. Validation ---------------------------------------------------------------------------
            if( !patientId || !activityId ) {
                Y.log(`claimAllUnclaimedDeviceLogs: Missing 'patientId' and/or 'activityId'. Stopping`, "warn", NAME);
                return callback( Y.doccirrus.errors.rest( '115001' ) );
            }
            // --------------------------------- 1. END -----------------------------------------------------------------------------


            // ------------------------------ 2. Get all 'UNPROCESSED' deviceLog entries from DB ------------------------------------
            [err, deviceLogArr] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb( {
                                                model: 'devicelog',
                                                action: 'get',
                                                user: user,
                                                query: {
                                                    status: 'UNPROCESSED'
                                                }
                                            } )
                                        );

            if( err ) {
                Y.log(`claimAllUnclaimedDeviceLogs: Error while querying all 'UNPROCESSED' device log from the DB. Error: ${err.stack || err}`, "error", NAME);
                return callback( Y.doccirrus.errors.rest( '115000' ) );
            }

            if( !deviceLogArr || !Array.isArray(deviceLogArr) || !deviceLogArr.length ) {
                Y.log(`claimAllUnclaimedDeviceLogs: No 'UNPROCESSED' deviceLog found. All good. Nothing to do...`, "info", NAME);
                return callback( Y.doccirrus.errors.rest( '115010' ) );
            }
            // --------------------------------------- 2. END -----------------------------------------------------------------------


            // ------------- 3. Claim each deviceLog entry by 'activityId' and connect the 'attachments' and 'attachedMedia' of deviceLog to activityId ----------
            for( let deviceLog of deviceLogArr ) { //eslint-disable-line no-unused-vars
                [err] = await formatPromiseResult(
                                claimDeviceLogEntry({
                                    user,
                                    data: {
                                        patientId,
                                        activityId,
                                        deviceLogEntryId: deviceLog._id,
                                        attachedMedia: deviceLog.attachedMedia,
                                        attachments: deviceLog.attachments,
                                        reloadCaseFileOnUI: false
                                    }
                                })
                              );

                if( err ) {
                    Y.log(`claimAllUnclaimedDeviceLogs: Error while claiming deviceLogId: ${deviceLog._id} by activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                    response.errorCount++;
                } else {
                    response.successCount++;
                }
            }
            // --------------------------------------------------- 3. END -----------------------------------------------------------------------------------------

            response.totalCount = response.errorCount + response.successCount;

            Y.log( `claimAllUnclaimedDeviceLogs: Ended attaching all 'UNPROCESSED' deviceLogs to activityId: ${activityId}. Stats: ${JSON.stringify(response)}`, 'info', NAME );
            callback( null, response );
        }

        /**
         * @method PRIVATE
         *
         * This method first saves the file on temporary location, then imports it into database and then deletes the temporary file.
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operation
         * @param {String} args.fileName :REQUIRED: The name of the file ex. name.png
         * @param {Buffer} args.fileData :required: File data buffer to write
         * @param {String} args.caption :OPTIONAL: this will be saved in the document collection record
         * @param {Object} args.documentDetails :OPTIONAL: document metadata to be stored in document collection record
         * @param {String} args.documentDetails.fileSource :OPTIONAL: Process responsible for the input file record
         * @param {String} args.documentDetails.docType :OPTIONAL: 'type' key in 'document' schema
         * @param {Date} args.documentDetails.createdOn :OPTIONAL: date on which this document was created
         * @param {[String]} args.documentDetails.tags :OPTIONAL: 'tags' key in 'document' schema
         * @param {string} [args.patientId = null] :OPTIONAL: If patient ID is passed then sets it else default is null
         * @param {string} [args.activityId] :OPTIONAL: if present set this ID as reference Id in media
         *
         * @returns {Promise<{documentIdArr: [String], mediaObj: Object}>}
         */
        async function createAttachment( args ) {
            const
                { user, fileName, caption, documentDetails = {}, patientId = null, activityId } = args,
                { fileSource = "Flow Import", docType = "OTHER", type, createdOn, tags = [] } = documentDetails;
            let { fileData } = args;

            // ------------------------------------ validations ----------------------------------------------------
            if( !user || !fileName || !fileData ) {
                throw new Error(`createAttachment: Missing input. Expected 'user', 'fileName', 'fileData'`);
            }

            if( typeof user !== "object" || typeof fileName !== "string" ) {
                throw new Error(`createAttachment: Typeof 'user' must be 'object' and 'fileName' must be 'string'`);
            }

            if( tags && (!Array.isArray(tags) || (tags.length && !tags.every(tag => typeof tag === "string")) ) ) {
                throw new Error(`createAttachment: documentDetails.tags must be array of strings`);
            }

            if( createdOn && createdOn.constructor !== Date ) {
                throw new Error(`createAttachment: documentDetails.createdOn must be 'Date' instance`);
            }
            // ---------------------------------------- END --------------------------------------------------------

            // ------------------------------------ corrections ----------------------------------------------------
            if( typeof fileData === 'object' && fileData.type && fileData.type === 'Buffer' ) {
                fileData = Buffer.from( fileData ).toString();
            }
            // ------------------------------------ END ----------------------------------------------------

            const
                writeFileProm = util.promisify(fs.writeFile),
                unlinkProm = util.promisify(fs.unlink),
                importMediaFromFileProm = util.promisify(Y.doccirrus.media.importMediaFromFile),
                tempFilePath = `${Y.doccirrus.media.getTempDir()}${Math.random().toString(36).slice(2)}`;

            let
                err,
                documentIdArr,
                mediaObj;

            // ---------------------------- 1. Write file to a temporary location ----------------------------------------------------------------------------------------
            [err] = await formatPromiseResult( writeFileProm(tempFilePath, fileData) );

            if( err ) {
                Y.log(`createAttachment: Error while writing buffer of file name: ${fileName} at: ${tempFilePath} for importing purpose. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // ----------------------------------- 1. END -----------------------------------------------------------------------------------------------------------------


            // ---------------------------- 2. Import media from temporary location -------------------------------------------
            [err, mediaObj] = await formatPromiseResult(
                importMediaFromFileProm( user, tempFilePath, activityId ? 'activity':'', activityId ? activityId:'', fileName, 'user', 'OTHER' )
            );

            if( err ) {
                Y.log(`createAttachment: Error saving file buffer in the database via importMediaFromFile routine. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !mediaObj || !mediaObj._id ) {
                Y.log(`createAttachment: Failed to save file buffer to database via importMediaFromFile routine`, "error", NAME);
                throw new Error(`createAttachment: Failed to save file buffer to database via importMediaFromFile routine.`);
            }
            // ----------------------------------------- 2. END ----------------------------------------------------------------


            // --------------------------- 3. Delete the file from temporary location -----------------------------------------
            [err] = await formatPromiseResult( unlinkProm(tempFilePath) );

            if( err ) {
                // No need to throw error here as the failure of this operation does not have any side effects
                Y.log(`createAttachment: Error while cleaning up temp image file: ${tempFilePath}. Error: ${err.stack || err}`, "warn", NAME);
            }
            // ---------------------------------- 3. END ----------------------------------------------------------------------


            // ----------------------- 4. Create a Document in the DB pointing to above imported media ------------------------------
            [err, documentIdArr] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb( {
                                                model: 'document',
                                                action: 'post',
                                                user: user,
                                                data: Y.doccirrus.filters.cleanDbObject( {
                                                    type,
                                                    docType,
                                                    url: `/1/media/:download?_id=${mediaObj._id.toString()}&mime=${mediaObj.mimeType}&from=casefile`,
                                                    publisher: fileSource,
                                                    contentType: mediaObj.mimeType,
                                                    attachedTo: "000000000000000000000000",      //  deprecated, see MOJ-9190
                                                    activityId: "000000000000000000000000",
                                                    locationId: "000000000000000000000001",
                                                    patientId,
                                                    isEditable: false,
                                                    caption,
                                                    tags,
                                                    createdOn: createdOn || new Date(),
                                                    mediaId: mediaObj._id.toString(),
                                                    accessBy: []
                                                } )
                                            } )
                                         );

            if( err ){
                Y.log(`createAttachment: Error while creating document in DB for media ID: ${mediaObj._id.toString()}. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // ------------------------------------------ 4. END ------------------------------------------------------------------------

            return { documentIdArr, mediaObj };
        }

        /**
         * @method PRIVATE
         *
         * This method creates deviceLog entry in the database
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Object} args.mediaObj :REQUIRED:
         * @param {String} args.caption :REQUIRED:
         * @param {Array} args.attachments :REQUIRED:
         * @param {String} args.patientId :OPTIONAL:
         * @param {String} args.activityId :OPTIONAL:
         * @param {String} args.deviceId :REQUIRED:
         * @param {String} args.fileName :REQUIRED:
         * @param {String} args.fileHash :REQUIRED:
         * @returns {Promise<Void>}
         */
        async function postInDeviceLog( args ) {
            const
                {user, mediaObj, caption, attachments, patientId, activityId, deviceId, fileName, fileHash} = args,
                currentTime = new Date();

            let
                err,
                deviceLogIdArr;

            // --------------------------- Create deviceLog in DB --------------------------------------------------------------------------------
            [err, deviceLogIdArr] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb( {
                                                model: 'devicelog',
                                                action: 'post',
                                                user: user,
                                                data: Y.doccirrus.filters.cleanDbObject( {
                                                    activityId,
                                                    patientId,
                                                    deviceId,
                                                    attachments,
                                                    fileName,
                                                    fileHash,
                                                    user : [],
                                                    created : currentTime,
                                                    timestamp : currentTime,
                                                    status: patientId ? "PROCESSED":"UNPROCESSED",
                                                    attachedMedia : [{
                                                        caption,
                                                        contentType : mediaObj.mimeType,
                                                        mediaId : mediaObj._id
                                                    }]
                                                } )
                                            } )
                                          );

            if( err ) {
                Y.log(`postInDeviceLog: Error while creating deviceLog record. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !deviceLogIdArr || !Array.isArray(deviceLogIdArr) || !deviceLogIdArr.length ) {
                Y.log(`postInDeviceLog: Failed to create deviceLog in DB`);
                throw `Failed to create deviceLog in DB`;
            }
            // ---------------------------------------- END ----------------------------------------------------------------------------------------
        }

        /**
         * @method PUBLIC
         *
         * This method does below
         * a] if calledFromMediaImportTransformer === true then
         *    1] checks if deviceLog exists in the DB for the media Hash
         *    2] If yes then ends the function and calls the callback with duplicate file details JSON. We do this because we DO NOT WANT TO ALLOW
         *       duplicate files to be saved in device logs ONLY IF it is coming from media import transformer. If media file is coming from other
         *       places then duplicates are allowed
         *
         * b] If 'args.overwrite.activityId' exists then:
         *      1] Query and check if the activityId exists
         *      2] Import the input file in to DB and create Document record in 'documents' collection
         *      3] Attach above created media/documents to 'args.overwrite.activityId' and update 'activityId', 'locationId' and 'attachedTo' of the document
         *         in document (in 'documents' collection) created in step 2
         *      4] Create deviceLog entry in DB and claim it by input activityId i.e args.overwrite.activityId
         *
         * b] If 'args.overwrite.activityId' DOES NOT EXIST then:
         *      1] If passed in 'patientQuery' has keys then query patient
         *      2] Import the media file in the database and also create document in the 'documents' collection
         *      3] If patient is found in step 1 then prepare 'data', 'action' and update or create activity for foundPatient and attach the attachments
         *         to the activity
         *      4] Create deviceLog entry in DB and if patient is found in step 1 and step 3 successfully creates or updates activity then claim the deviceLog
         *         else mark it 'UNPROCESSED' i.e unclaimed deviceLog
         *
         * @param {Object} args
         * @param {Object} args.patientQuery
         * @param {String} args.caption
         * @param {Object} args.action
         * @param {Object} args.file
         * @param {Buffer} args.file.data
         * @param {String} args.file.path
         * @param {Number} args.hours time until a new activity is created
         * @param {String} args.deviceId
         * @param {Object} args.actData
         * @param {Object} args.overwrite
         * @param {Object} args.user
         * @param {Date} args.timestamp for the activity that is potentially created
         * @param {Boolean} args.getOnlyInsuranceCaseFolder
         * @param {Object} args.activityResult
         * @param {Boolean} args.calledFromMediaImportTransformer :OPTIONAL: If true then will prevent duplicate media file from getting saved in DB. This must be true
         *                                                                   only if this method is called from media import transformer. For other use cases it is false
         * @param {{
         *           fileSource: <String>,
         *           docType: <String>,
         *           createdOn: <Date>,
         *           tags: [String]
         *        }} args.documentDetails :OPTIONAL: Meta data for details to be saved in 'document' collection when new document is created
         * @param {String} args.documentDetails :OPTIONAL: Details for 'document' record to be saved when creating a new 'document' in DB
         *
         * @param {Function} args.callback :OPTIONAL: If present response will be as below:
         *                                            args.callback( <Object | null>, <undefined | {query: <Object>, action: <Object>, data: {}, mediaObj: <Object>, documentIdArr: [String]}> )
         *
         * @returns {Promise<undefined | {query: <Object>, action: <Object>, data: {}, mediaObj: <Object>, documentIdArr: [String]}>}
         */
        async function matchPatientAndCreateAttachment( args ) {
            Y.log('Entering Y.doccirrus.api.devicelog.matchPatientAndCreateAttachment', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.devicelog.matchPatientAndCreateAttachment');
            }
            const
                {patientQuery = {}, caption, file = {}, hours, deviceId, actData = {}, action = {}, overwrite = {}, user, callback,
                    getOnlyInsuranceCaseFolder, timestamp, activityResult, calledFromMediaImportTransformer, documentDetails = {} } = args,
                {activityId} = overwrite,
                captionMapping = {
                    "image/png": "PNG",
                    "image/jpg" : "JPG",
                    "image/jpeg" : "JPG",
                    "application/pdf" : "PDF"
                };

            let
                err,
                result,
                foundPatientObj,
                activityObj,
                mediaObj,
                documentIdArr,
                createdOrUpdatedActivityIdArr,
                fileHash,
                fileName;

            /**
             * Manages 'activityResult' object if passed. Structure of passed in activityResult object is as below:
             *
             * {
             *    errorMessage: null,  | --> need to fill errorMessage
             *    activityId: null     | -->  or activityId
             * }
             * @param {String}      errorMsg
             * @param {String}      activityId
             */
            function updateActivityResultIfPresent( errorMsg, activityId) {
                if( activityResult ) {
                    if( errorMsg ) {
                        // Only set if previously not set to prevent any loss of errors
                        if( !activityResult.errorMessage ) {
                            activityResult.errorMessage = errorMsg;
                        }
                    } else if( activityId ) {
                        activityResult.activityId = activityId;
                    }
                }
            }

            // -------------------------------- Validations -------------------------------------------------------------
            if( !file.data || !file.path || typeof file.path !== "string" ) {
                return handleResult( Y.doccirrus.errors.rest( 400, `'file.data' and 'file.path' are required`, true ), undefined, callback );
            }

            fileName = path.win32.basename(file.path).trim();

            if( !fileName ) {
                Y.log(`matchPatientAndCreateAttachment: No file name present in the input 'file.path'`, "error", NAME);
                return handleResult( Y.doccirrus.errors.rest( 400, `No file name present in the input 'file.path'`, true ), undefined, callback );
            }
            // ----------------------------------------- END -------------------------------------------------------------


            // ------------------------------ Generate file hash ----------------------------------------
            fileHash = getHashFromBufferOrString(file.data);

            if( !fileHash ) {
                Y.log(`matchPatientAndCreateAttachment: Failed to compute file hash`, "error", NAME);
                return handleResult( Y.doccirrus.errors.rest( 400, `Failed to compute file hash for file: ${file.path}`, true ), undefined, callback );
            }
            // ------------------------------ END -------------------------------------------------------


            // --------------  If calledFromMediaImportTransformer = true then check and stop if this file is already stored in DB ---------------------
            if( calledFromMediaImportTransformer ) {
                [err, result] = await formatPromiseResult( checkIfDeviceLogExistsByFileHash(user, fileHash) );

                if( err ) {
                    Y.log(`matchPatientAndCreateAttachment: Error in 'checkIfDeviceLogExistsByFileHash'. Error: ${err.stack || err}`, "error", NAME );
                    return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                }

                if( result ) {
                    //Means this media file is already saved in the DB. No need to proceed further ...
                    Y.log(`matchPatientAndCreateAttachment: deviceLog entry already exists for file: '${file.path}' with hash: '${fileHash}' triggered by flowName: '${deviceId}'. Skipping this file from flow execution`, "info", NAME);
                    return handleResult( {
                        fileHash,
                        filePath: file.path,
                        fileDownloadUrl: result.fileDownloadUrl,
                        customMessage: "EXISTS"
                    }, undefined, callback );
                }

                if( Y.doccirrus.ipc.isMaster() ) {
                    /**
                     * We are keeping this check because if the media files are read from device server then sometimes this method is called instantly with same file and
                     * because of that, due to parallel async operation, during the fileHash DB check the file is not found and then same file ends up in multiple
                     * devicelogs which defeats the purpose of having one device log per media ONLY FOR FLOW IMPORT. This happens when the media import flow is triggered automatically
                     * thus executing on master cluster. For JSONRPC calls this mechanism is not used. So the focus is clearly on automatic media import flows.
                     */
                    if( fileHashSet.has(fileHash) ) {
                        Y.log(`matchPatientAndCreateAttachment: Received duplicate file with fileHash: '${fileHash}', path: '${file.path}'. Skipping this file`, "warn", NAME);
                        return handleResult( undefined, undefined, callback );
                    }

                    fileHashSet.add(fileHash);
                }
            }
            // ------------------------------------------------------------- END ----------------------------------------------------------------------


            if (activityId) {

                // ------------------------------- 1. If 'activityId' is present then query the activityId -------------------------------------------------------
                if( activityId !== "NEW" ) {
                    // as per latest code 'activityId' will never be "NEW" but still keeping this check as legacy incase it is used somewhere
                    [err, result] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb( {
                                                model: 'activity',
                                                user: user,
                                                query: {_id: activityId}
                                            } )
                                          );

                    if( err ) {
                        Y.log(`matchPatientAndCreateAttachment: Error while querying activity Id: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                        return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                    }

                    if( !result || !Array.isArray(result) || !result.length ) {
                        Y.log(`matchPatientAndCreateAttachment: activity Id: ${activityId} not found in DB`, "error", NAME);
                        return handleResult( Y.doccirrus.errors.rest( 400, `activity Id: ${activityId} not found in DB`, true ), undefined, callback );
                    }

                    activityObj = result[0];
                }
                // -------------------------------------------- 1. END --------------------------------------------------------------------------------------------


                // ---------------------- 2. Import the media file in to DB and create Document record in 'documents' collection ----------------------------------
                [err, {documentIdArr, mediaObj} = {}] = await formatPromiseResult(
                    createAttachment( {
                        fileName,
                        caption,
                        user,
                        documentDetails,
                        fileData: file.data,
                        patientId: patientQuery._id,
                        activityId
                    } )
                );

                if( err ) {
                    Y.log(`matchPatientAndCreateAttachment: Error in createAttachment. Error: ${err.stack || err}` , 'error', NAME );
                    return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                }

                if( activityId === "NEW" ) {
                    // This should never be the case
                    return handleResult( null, {mediaObj}, callback );
                }

                if( !documentIdArr || !documentIdArr.length ) {
                    Y.log(`matchPatientAndCreateAttachment: No attachments created` , 'warn', NAME );
                    return handleResult( Y.doccirrus.errors.rest( 400, `Failed to create attachments`, true ), undefined, callback );
                }
                // ------------------------------------------------ 2. END ---------------------------------------------------------------------------------------


                // ----- 3. attach media/documents to 'activityId' and update 'activityId', 'locationId' and 'attachedTo' of the document in documentIdArr -------
                [err, createdOrUpdatedActivityIdArr] = await formatPromiseResult(
                                                                new Promise( (resolve, reject) => {
                                                                    Y.doccirrus.api.activity.createActivityForPatient({
                                                                        user,
                                                                        query: { _id: activityObj.patientId },
                                                                        action: {UPDATE_OR_CREATE_ATTACHMENTS: {_id: activityId}},
                                                                        data: {
                                                                            ...actData,
                                                                            attachments: documentIdArr,
                                                                            attachedMedia: [{
                                                                                caption : captionMapping[mediaObj.mimeType] || "---",
                                                                                contentType : mediaObj.mimeType,
                                                                                mediaId : mediaObj._id
                                                                            }]
                                                                        },
                                                                        callback(err, result) {
                                                                            if(err) {
                                                                                reject(err);
                                                                            } else {
                                                                                resolve(result);
                                                                            }
                                                                        }
                                                                    });
                                                                } )
                                                             );

                if( err ) {
                    Y.log(`matchPatientAndCreateAttachment: Error in createActivityForPatient. Error: ${err.stack || err}`, "error", NAME);
                    return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                }

                if( !createdOrUpdatedActivityIdArr || !Array.isArray(createdOrUpdatedActivityIdArr) || !createdOrUpdatedActivityIdArr.length ) {
                    Y.log(`matchPatientAndCreateAttachment: Failed to update attachment details for activity ID: ${activityId} in createActivityForPatient`, "error", NAME);
                    return handleResult( Y.doccirrus.errors.rest( 400, `Failed to update attachment details for activity ID: ${activityId}`, true ), undefined, callback );
                }
                // ------------------------------------------------- 3. END ---------------------------------------------------------------------------------------


                // --------- 4. Create deviceLog entry in DB and claim it by input activityId (which should be same as createdOrUpdatedActivityIdArr[0]) ----------
                [err] = await formatPromiseResult(
                                postInDeviceLog({
                                    user,
                                    mediaObj,
                                    fileName,
                                    fileHash,
                                    caption,
                                    deviceId,
                                    attachments: documentIdArr,
                                    patientId: activityObj.patientId,
                                    activityId: createdOrUpdatedActivityIdArr[0]
                                })
                              );

                if( err ) {
                    Y.log(`matchPatientAndCreateAttachment: Error while creating deviceLog in DB. Error: ${err.stack || err}`, "error", NAME);
                    return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                }
                // --------------------------------------------------- 4. END -------------------------------------------------------------------------------------

                return handleResult( null, { query: patientQuery, action: {IGNORE: true}, data: {}, mediaObj, documentIdArr }, callback);

            } else {

                // ------------------------------- 1. If passed in 'patientQuery' has keys then query patient -----------------------------------------------------
                if( Object.keys(patientQuery).length > 0 ) {
                    // We expect 'patientQuery' to have keys almost always
                    [err, result] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb({
                                                user: user,
                                                action: 'get',
                                                model: 'patient',
                                                query: patientQuery,
                                                options: {
                                                    limit: 1,
                                                    sort: {
                                                        _id: -1
                                                    }
                                                }
                                            })
                                          );

                    if( err ) {
                        Y.log(`matchPatientAndCreateAttachment: Error querying patient by query: ${JSON.stringify(patientQuery)}. Error: ${err.stack || err}`, "error", NAME);
                        updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.DATABASE_ERROR);
                        return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                    }

                    if( !result || !Array.isArray(result) || !result.length ) {
                        // If patient not found
                        updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.PATIENT_NOT_FOUND);
                    } else {
                        foundPatientObj = result[0];
                    }
                } else {
                    // this condition should never happen
                    updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.PATIENT_NOT_FOUND);
                }
                // -------------------------------------------------- 1. END --------------------------------------------------------------------------------------


                let newActivityId = new ObjectId();
                // ------------------ 2. Import the media file in the database and also create document in the 'documents' collection -----------------------------
                [err, {documentIdArr, mediaObj} = {}] = await formatPromiseResult( createAttachment({fileName, caption, user, documentDetails, fileData: file.data, patientId: patientQuery._id,
                    activityId: newActivityId}) );

                if( err ) {
                    Y.log(`matchPatientAndCreateAttachment: Error creating attachment. Error: ${err.stack || err}` , 'error', NAME );
                    updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.ERROR_CREATING_ATTACHMENT);
                    return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                }

                if( !documentIdArr || !documentIdArr.length ) {
                    Y.log(`matchPatientAndCreateAttachment: Failed to create attachments via import routine` , 'warn', NAME );
                    updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.INVALID_ATTACHMENT);
                    return handleResult( Y.doccirrus.errors.rest( 400, `Failed to create attachments`, true ), undefined, callback );
                }
                // -------------------------------------------- 2. END --------------------------------------------------------------------------------------------


                // --- 3. If 'foundPatientObj' then prepare 'data', 'action' and update or create activity for foundPatientObj and attach the attachments to it ---
                if( foundPatientObj ) {
                    // -------------------------------- 3a. Prepare 'data' and 'action' object ----------------------------------------------------
                    let
                        UPDATE_OR_CREATE_ATTACHMENTS,
                        _data = {
                            ...actData,
                            attachments: documentIdArr,
                            attachedMedia: [ {
                                "caption" : captionMapping[mediaObj.mimeType] || "---",
                                "contentType" : mediaObj.mimeType,
                                "mediaId" : mediaObj._id
                            } ]
                        };

                    if ( action.UPDATE_OR_CREATE_ATTACHMENTS ) {
                        UPDATE_OR_CREATE_ATTACHMENTS = action.UPDATE_OR_CREATE_ATTACHMENTS;
                    } else if ( timestamp ) {
                        _data.timestamp = timestamp;

                        UPDATE_OR_CREATE_ATTACHMENTS = {
                            patientId: foundPatientObj._id.toString(),
                            timestamp: timestamp
                        };
                    } else {
                        let pastId = Math.floor(Date.now()/1000)-(60*60*(hours||4)); // 4h
                        pastId = pastId.toString( 16 );

                        while ( pastId.length < 24 ) {
                            pastId+="0";
                        }

                        UPDATE_OR_CREATE_ATTACHMENTS = {
                            patientId: foundPatientObj._id.toString(),
                            _id: { $gte: pastId }
                        };
                    }
                    // ---------------------------------------------- 3a. END ----------------------------------------------------------------------


                    // --------- 3b. Update or create activity for 'foundPatientObj' and attach 'attachments' and 'attachedMedia' to it -------------
                    [err, createdOrUpdatedActivityIdArr] = await formatPromiseResult(
                                                                    new Promise( (resolve, reject) => {
                                                                        Y.doccirrus.api.activity.createActivityForPatient({
                                                                            user,
                                                                            query: {_id: foundPatientObj._id.toString()},
                                                                            data: { ..._data, _id: newActivityId },
                                                                            action: {...action, UPDATE_OR_CREATE_ATTACHMENTS},
                                                                            getOnlyInsuranceCaseFolder,
                                                                            callback: (err, res) => {
                                                                                if(err) {
                                                                                    reject(err);
                                                                                } else {
                                                                                    resolve( res );
                                                                                }
                                                                            }
                                                                        });
                                                                    } )
                                                                 );

                    if( err ) {
                        Y.log(`matchPatientAndCreateAttachment: Error in method createActivityForPatient. Error: ${err.stack || err}`, "error", NAME);

                        if( err.code === 400 && err.data === "Patient wurde nicht gefunden." ) {
                            // We never expect this condition to happen because the patient is already found but still keeping this check
                            updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.PATIENT_NOT_FOUND);
                        } else {
                            updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.ERROR_CREATING_ACTIVITY);
                        }

                        return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                    }

                    if( !createdOrUpdatedActivityIdArr || !Array.isArray(createdOrUpdatedActivityIdArr) || !createdOrUpdatedActivityIdArr.length ) {
                        Y.log(`matchPatientAndCreateAttachment: Failed in 'createActivityForPatient' as no activityId array was returned`, "warn", NAME);
                        updateActivityResultIfPresent(Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.ERROR_CREATING_ACTIVITY);

                        return handleResult( Y.doccirrus.errors.rest( 400, `Failed to create or update activity`, true ), undefined, callback );
                    }

                    updateActivityResultIfPresent( null, createdOrUpdatedActivityIdArr[0] );
                    // -------------------------------------------- 3b. END -------------------------------------------------------------------------
                }
                // ----------------------------------------------- 3. END ------------------------------------------------------------------------------------------


                // -- 4. Create deviceLog entry in DB and if 'foundPatientObj' and 'createOrUpdatedActivityArr[0]' EXISTS then claim the deviceLog else mark it 'UNPROCESSED'---
                [err] = await formatPromiseResult(
                                postInDeviceLog({
                                    user,
                                    mediaObj,
                                    fileName,
                                    fileHash,
                                    caption,
                                    deviceId,
                                    attachments: documentIdArr,
                                    patientId: foundPatientObj && foundPatientObj._id.toString(),
                                    activityId: createdOrUpdatedActivityIdArr && createdOrUpdatedActivityIdArr[0]
                                })
                              );

                if( err ) {
                    Y.log(`matchPatientAndCreateAttachment: Error while creating deviceLog in DB. Error: ${err.stack || err}`, "error", NAME);
                    return handleResult( Y.doccirrus.errors.rest( 400, err.message || err, true ), undefined, callback );
                }
                // ------------------------------------------------- 4. END ----------------------------------------------------------------------------------------------------

                return handleResult( null, { query: patientQuery, action: {IGNORE: true}, data: {}, mediaObj, documentIdArr }, callback);
            }
        }

        /**
         * @method PRIVATE
         *
         * This method builds user object based on passed in 'user' and 'deviceLogUserArr' as below:
         * [
         *    {
         *        _id: <Object, If passed in with 'deviceLogUserArr' will be retained or else will be undefined>
         *        name: <String>,
         *        employeeNo: <String>
         *    }
         * ]
         *
         * @param {Object} user
         * @param {[{}]} deviceLogUserArr
         * @returns {Promise<{name: string, employeeNo: string}[]>}
         */
        async function buildUserObjectArr( user, deviceLogUserArr ) {
            if( !user ) {
                throw `Missing 'user' object as first argument`;
            }

            if( !deviceLogUserArr || !Array.isArray(deviceLogUserArr) || !deviceLogUserArr[0] ) {
                deviceLogUserArr = [{}];
            }

            let
                err,
                result,
                identityObj,
                employeeObj,
                userArr = [{...deviceLogUserArr[0], name: "", employeeNo: ""}]; // we want to preserve _id (not sure why but still) if it was there

            // If user is not super user then query user identity and employee details from the DB
            if( 'su' !== user.id ) {

                // ---------------------------------- 1. Query identity by 'user.identityId' -------------------------------------------------
                [err, result] = await formatPromiseResult(
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'identity',
                                            action: 'get',
                                            query: {
                                                _id: user.identityId
                                            }
                                        } )
                                      );

                if( err ) {
                    Y.log(`buildUserObjectArr: error while querying user identityId: ${user.identityId} from DB. Error: ${err.stack || err}`, "error", NAME);
                    throw err;
                }

                if( !result || !Array.isArray(result) || !result.length ) {
                    Y.log(`buildUserObjectArr: user identityId: ${user.identityId} not found in DB`, "error", NAME);
                    throw `buildUserObjectArr: user identityId: ${user.identityId} not found in DB`;
                }

                identityObj = result[0];
                // ---------------------------------------------------- 1. END --------------------------------------------------------------


                // ---------------------------------- 2. Query employee by 'identityObj.specifiedBy' ----------------------------------------
                [err, result] = await formatPromiseResult(
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'employee',
                                            action: 'get',
                                            query: {
                                                _id: identityObj.specifiedBy
                                            }
                                        } )
                                      );

                if( err ) {
                    Y.log(`buildUserObjectArr: Error querying employee ID: ${identityObj.specifiedBy}. Error: ${err.stack || err}`, "error", NAME);
                    throw err;
                }

                if( !result || !Array.isArray(result) || !result.length ) {
                    Y.log(`buildUserObjectArr: Employee Id: ${identityObj.specifiedBy} not found in DB`, "error", NAME);
                    throw `buildUserObjectArr: Employee Id: ${identityObj.specifiedBy} not found in DB`;
                }

                employeeObj = result[0];
                // ------------------------------------------------ 2. END ----------------------------------------------------------------

                userArr = [{
                    ...deviceLogUserArr[0],
                    name: Y.doccirrus.schemas.person.personDisplay( employeeObj ),
                    employeeNo: user.identityId
                }];
            }

            return userArr;
        }

        /**
         * @method PRIVATE
         *
         * This method un-claims deviceLog entry
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Object} args.data :REQUIRED:
         * @param {Object} args.data.deviceLogObj :REQUIRED: database deviceLog record which needs to be unclaimed
         * @returns {Promise<void>}
         */
        async function unclaimDeviceLogObject( args ) {
            const
                {user, data = {} } = args,
                {deviceLogObj} = data;

            if( !deviceLogObj ) {
                throw `Missing 'deviceLogObj'`;
            }

            let
                err,
                result,
                setData = {status: 'UNPROCESSED', timestamp: new Date()},
                unsetData = {activityId: 1, patientId: 1};

            // --------------------------------------- 1. Build user object array ----------------------------------------------
            [err, setData.user] = await formatPromiseResult( buildUserObjectArr(user, deviceLogObj.user) );

            if( err ) {
                Y.log(`unclaimDeviceLogObject: Error in buildUserObjectArr: Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // ----------------------------------------------- 1. END ----------------------------------------------------------


            // -------------------- 2. unclaim deviceLogEntry ------------------------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        action: 'update',
                                        model: 'devicelog',
                                        query: { _id: deviceLogObj._id.toString() },
                                        data: { $set: setData, $unset: unsetData }
                                    })
                                  );

            if( err ) {
                throw err;
            }

            if( !result || !result.n ) {
                throw `unclaimDeviceLogObject: Failed to unclaim deviceLog Id: ${deviceLogObj._id.toString()}`;
            }
            // -------------------------------------------- 2. END -------------------------------------------------------------
        }

        /**
         * @method PUBLIC
         *
         * This method:
         * 1] Checks if 'deviceLog' is found for the passed in 'attachment'.
         * 2] If deviceLog is found then runs a range of validations just to make sure everything is correct before proceeding
         * 3] If 'shouldUpdateActivity' is true then queries the activity which found deviceLog is pointing to
         * 4] Calls the 'unclaimDeviceLogObject' to unclaim found deviceLog entry and its status is also marked "UNPROCESSED"
         * 5] Unclaims the 'attachment' i.e sets its keys 'attachedTo', 'activityId' and 'locationId' to "" (empty string) in DB
         * 6] Unclaims the mediaId (deviceLog.attachedMedia[0].mediaId) i.e. sets keys "ownerId" and "ownerCollection" to "" (empty string) in DB
         * 7] If 'shouldUpdateActivity' is true then updates the activity (_id = deviceLog.activityId ) byt removing attachment and media from 'attachment' and
         *    'attachedMedia' from activity and save the updated activity in DB.
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.data :REQUIRED:
         * @param {String} args.data.attachment :REQUIRED: document _id which is to be un-claimed or deleted from activity (If user deletes the attachment from UI)
         * @param {Boolean} args.data.shouldUpdateActivity :REQUIRED: If passed then activity's 'attachment' and 'attachedMedia' key are updated such that
         *                                                            'attachment' is removed from the activity
         *
         * @param {Boolean} args.data.unclaimEvenIfActivityDoesNotExist :OPTIONAL: If set to true then it means even if activity = deviceLog.activityId is not found in the DB
         *                                                                         then don't consider this as error scenario and unclaim device log, document and media
         *                                                                         without trying to update activity. If activityId is found then normal operation will follow
         * @returns {Promise<String ("NOT_FOUND") | [String]>}
         */
        async function unclaimDeviceLogEntry( args ) {
            Y.log('Entering Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);

            const
                {user, data = {} } = args,
                {attachment, shouldUpdateActivity, unclaimEvenIfActivityDoesNotExist} = data;

            let
                err,
                result,
                activityObj,
                deviceLogObj,
                attachmentsToUpdateArr = [],
                attachedMediaToUpdateArr = [],
                mediaIdToUnclaimArr = []; // We expect only one mediaId i.e. 1 deviceLogEntry  contains -> 1 unique mediaId

            // -------------------------------- 1. Validations -------------------------------------------------------------
            if( !attachment ) {
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                throw Y.doccirrus.errors.rest( '115021' );
            }
            // ---------------------------------------------- 1. END ---------------------------------------------------------


            // ----- 2. Check if the device log exists and has status =='PROCESSED' for passed in 'attachment' along with other validation --------
            Y.log(`unclaimDeviceLogEntry: Un-claiming any device log containing attachment: ${attachment}`, "info", NAME);

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb({
                                        model: 'devicelog',
                                        action: 'get',
                                        user: user,
                                        query: {
                                            attachments : {$in: [attachment]}
                                        }
                                    })
                                  );

            if( err ) {
                Y.log(`unclaimDeviceLogEntry: Error while querying device log by attachment: ${attachment}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                throw Y.doccirrus.errors.rest( '115012' );
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`unclaimDeviceLogEntry: No device log found for attachment: ${attachment}. Nothing to do.`, "info", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                return "NOT_FOUND";
            }

            if( result.length > 1 ) {
                // Should never happen but still keeping this check for extra safety
                Y.log(`unclaimDeviceLogEntry: Multiple deviceLog entries found for attachment: ${attachment}. Expected only 1. Stopping`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                throw Y.doccirrus.errors.rest( '115013' );
            }

            if( result[0].attachedMedia && Array.isArray( result[0].attachedMedia ) && result[0].attachedMedia.length ) {
                // We always expect this and attachedMedia array should ONLY contain 1 media object
                result[0].attachedMedia.forEach( attachedMedia => {
                    mediaIdToUnclaimArr.push( attachedMedia.mediaId);
                } );
            } else {
                // Note: We are just logging it in case it happens because the user should be able to unclaim it anyway but we need a record of what happened
                Y.log(`unclaimDeviceLogEntry: missing 'attachedMedia' from deviceLogId: ${result[0]._id.toString()}. Still continuing...`, "error", NAME);
            }

            if( result[0].status !== "PROCESSED" ) {
                // This can happen if the user has opened many tabs and then on a browser tab tries to delete an attachment which was already deleted on other tab
                Y.log(`unclaimDeviceLogEntry: deviceLogId: ${result[0]._id.toString()} containing attachment: ${attachment} is already unassigned. Nothing to do...`, "info", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                return mediaIdToUnclaimArr;
            }

            if( shouldUpdateActivity && !result[0].activityId ) {
                // Should never happen
                Y.log(`unclaimDeviceLogEntry: deviceLogId: ${result[0]._id.toString()} has status = 'PROCESSED' but does not have 'activityId'`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                throw Y.doccirrus.errors.rest( '115014', {$deviceLogId: result[0]._id.toString()} );
            }

            deviceLogObj = result[0];
            // ------------------------------------------------------------- 2. END ------------------------------------------------------------------------


            // ----------------------- 3. If 'shouldUpdateActivity' is true then query activity which has claimed deviceLogObj -----------------------------
            if( shouldUpdateActivity ) {
                [err, result] = await formatPromiseResult(
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'activity',
                                            action: 'get',
                                            query: {
                                                _id: deviceLogObj.activityId
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`unclaimDeviceLogEntry: Error while querying activityId: ${deviceLogObj.activityId}. Error: ${err.stack || err}`, "error", NAME);
                    Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                    throw Y.doccirrus.errors.rest( '115015' );
                }

                if( !result || !Array.isArray(result) || !result.length ) {
                    if( !unclaimEvenIfActivityDoesNotExist ) {
                        Y.log( `unclaimDeviceLogEntry: activityId: ${deviceLogObj.activityId}, which has claimed deviceLogId: ${deviceLogObj._id.toString()} not found`, "error", NAME );
                        Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                        throw Y.doccirrus.errors.rest( '115016', {$activityId: deviceLogObj.activityId} );
                    }
                } else {
                    activityObj = result[0];
                }

                if(activityObj && activityObj.status !== "VALID" && activityObj.status !== "INVALID" && activityObj.status !== "CREATED" ) {
                    Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                    throw Y.doccirrus.errors.rest( '115028', {$status: Y.doccirrus.i18n(`activity-schema.ActStatus_E.${result[0].status}`)} );
                }
            }
            // ------------------------------------------------ 3. END ------------------------------------------------------------------------------------


            // ---------------------------------------------------- 4. Un-claim deviceLogObj ---------------------------------------------------------------
            Y.log(`unclaimDeviceLogEntry: un-claiming deviceLogId: ${deviceLogObj._id.toString()} containing attachment: ${attachment}`, "info", NAME);

            [err] = await formatPromiseResult(
                            unclaimDeviceLogObject({
                                user,
                                data: {deviceLogObj}
                            })
                          );

            if( err ) {
                Y.log(`unclaimDeviceLogEntry: Error while un-claiming deviceLogId: ${deviceLogObj._id.toString()} containing attachment: ${attachment}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                throw Y.doccirrus.errors.rest( '115017' );
            }

            Y.log(`unclaimDeviceLogEntry: Successfully unclaimed deviceLogId: ${deviceLogObj._id.toString()} from activityId: ${deviceLogObj.activityId} containing attachment: ${attachment}`, "info", NAME);
            // --------------------------------------------------------- 4. END --------------------------------------------------------------------------------


            // -------------------------- 5. un-claim Document (attachment) ------------------------------------------------------------------------------------
            Y.log(`unclaimDeviceLogEntry: Unclaiming documentId: ${attachment}`, "info", NAME);

            [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'document',
                                action: 'put',
                                query: {
                                    _id: attachment
                                },
                                data: Y.doccirrus.filters.cleanDbObject( { attachedTo: "", activityId: "", locationId: ""} ),
                                fields: [ 'attachedTo', 'activityId', 'locationId']
                            })
                          );

            if( err ) {
                Y.log(`unclaimDeviceLogEntry: Error unclaiming attachment: ${attachment}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                throw Y.doccirrus.errors.rest( '115018' );
            }

            Y.log(`unclaimDeviceLogEntry: Successfully un-claimed documentId: ${attachment}`, "info", NAME);
            // ------------------------------------------------ 5. END -----------------------------------------------------------------------------------------


            // ----------------------------- 6. Unclaim all (we expect only 1) media in 'mediaIdToUnclaimArr' --------------------------------------------------
            for( let mediaId of mediaIdToUnclaimArr ) { //eslint-disable-line no-unused-vars
                Y.log(`unclaimDeviceLogEntry: Unclaiming mediaId: ${mediaId} for attachment context: ${attachment}`, "info", NAME);

                [err] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'media',
                                    action: 'put',
                                    query: {
                                        _id: mediaId
                                    },
                                    data: Y.doccirrus.filters.cleanDbObject( {ownerCollection: "", ownerId: ""} ),
                                    fields: ['ownerCollection', 'ownerId']
                                } )
                              );

                if( err ) {
                    Y.log(`unclaimDeviceLogEntry: Error while un-claiming mediaId: ${mediaId} for attachment context: ${attachment}. Error: ${err.stack || err}`, "error", NAME);
                    Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                    throw Y.doccirrus.errors.rest( '115019', {$mediaId: mediaId} );
                }

                Y.log(`unclaimDeviceLogEntry: Successfully unclaimed mediaId: ${mediaId} for attachment context: ${attachment}`, "info", NAME);
            }
            // ------------------------------------------- 6. END ---------------------------------------------------------------------------------------------


            // --------------------- 7. If activityObj exists then remove 'attachment' and 'mediaIdToUnclaimArr' from activity -------------------
            if( activityObj ) {
                Y.log(`unclaimDeviceLogEntry: Updating activityId: ${activityObj._id.toString()} by removing 'attachment' = ${attachment} and attachmeMediaId = ${mediaIdToUnclaimArr} from 'attachments' and 'attachedMedia' keys`, "info", NAME);

                if( activityObj.attachments && Array.isArray(activityObj.attachments) ) {
                    attachmentsToUpdateArr = activityObj.attachments.filter( attachmentId => {
                                                if( attachmentId !== attachment ) {
                                                    return true;
                                                }
                                             } );
                }

                if( activityObj.attachedMedia && Array.isArray(activityObj.attachedMedia) ) {
                    attachedMediaToUpdateArr = activityObj.attachedMedia.filter( mediaObj => {
                                                  if( mediaIdToUnclaimArr.indexOf(mediaObj.mediaId) === -1 ) {
                                                      return true;
                                                  }
                                               } );
                }

                [err] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'activity',
                                    action: 'put',
                                    fields: [ 'attachments', 'attachedMedia'],
                                    query: {
                                        _id: activityObj._id.toString()
                                    },
                                    data: Y.doccirrus.filters.cleanDbObject( { attachments: attachmentsToUpdateArr, attachedMedia: attachedMediaToUpdateArr } )
                                })
                              );

                if( err ) {
                    Y.log(`unclaimDeviceLogEntry: Error while removing 'attachment' = ${attachment} and attachmeMediaId = ${mediaIdToUnclaimArr} from activityId: ${activityObj._id.toString()} 'attachments' and 'attachedMedia' keys. Error: ${err.stack || err}`, "error", NAME);
                    Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
                    throw Y.doccirrus.errors.rest( '115020' );
                }

                Y.log(`unclaimDeviceLogEntry: Successfully updated activityId: ${activityObj._id.toString()} by removing 'attachment' = ${attachment} and attachmeMediaId = ${mediaIdToUnclaimArr} from 'attachments' and 'attachedMedia' keys`, "info", NAME);
            }
            // ------------------------------------------------------- 7. END ----------------------------------------------------------------------------------

            Y.log('Exiting Y.doccirrus.api.devicelog.unclaimDeviceLogEntry', 'info', NAME);
            return mediaIdToUnclaimArr;
        }

        /**
         * @method PUBLIC
         *
         * This method checks if provided 'mediaId' is contained by devicelog. If yes then this method returns found deviceLogs (we expect only 1) else
         * this method returns "NOT_FOUND"
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Object} args.data :REQUIRED:
         * @param {String} args.data.mediaId :REQUIRED: mediaId to check if it contained by device log
         * @returns {Promise<String | [deviceLog]>}
         */
        async function checkIfDeviceLogContainsMediaId( args ) {
            Y.log('Entering Y.doccirrus.api.devicelog.checkIfDeviceLogContainsMediaId', 'info', NAME);

            const
                {user, data = {} } = args,
                {mediaId} = data;

            let
                err,
                deviceLogsArr;

            if( !mediaId ) {
                Y.log('Exiting Y.doccirrus.api.devicelog.checkIfDeviceLogContainsMediaId', 'info', NAME);
                throw new Error(`Missing 'mediaId'`);
            }

            [err, deviceLogsArr] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb({
                                                model: 'devicelog',
                                                action: 'get',
                                                user: user,
                                                query: {
                                                    'attachedMedia.mediaId': mediaId
                                                }
                                            })
                                         );

            if( err ) {
                Y.log(`checkIfDeviceLogContainsMediaId: Error querying devicelog for query -> 'attachedMedia.mediaId': ${mediaId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.devicelog.checkIfDeviceLogContainsMediaId', 'info', NAME);
                throw err;
            }

            if( !deviceLogsArr || !Array.isArray(deviceLogsArr) || !deviceLogsArr.length ) {
                Y.log('Exiting Y.doccirrus.api.devicelog.checkIfDeviceLogContainsMediaId', 'info', NAME);
                return "NOT_FOUND";
            }

            Y.log('Exiting Y.doccirrus.api.devicelog.checkIfDeviceLogContainsMediaId', 'info', NAME);
            return deviceLogsArr;
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * This method unclaims provided 'deviceLogId' from the activity which has claimed it. If the activity which has claimed this deviceLog is found in the DB
         * then its 'attachments' and "attachedMedia" keys are also updated by removing the references to this deviceLog.attachments and deviceLog.attachedMedia
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Object} args.data :REQUIRED:
         * @param {String} args.data.deviceLogId :REQUIRED: deviceLogId to revert
         * @param {Function} args.callback :REQUIRED:
         *
         * @callback args.callback(err | null, "SUCCESSFUL" | undefined)
         */
        async function revertDeviceLogEntryFromActivity( args ) {
            Y.log('Entering Y.doccirrus.api.devicelog.revertDeviceLogEntryFromActivity', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.devicelog.revertDeviceLogEntryFromActivity');
            }
            const
                { user, callback, data = {} } = args,
                {deviceLogId} = data;

            let
                err,
                result,
                deviceLog;

            // -------------------------------- 1. Validations -------------------------------------------------------------
            if( !deviceLogId ) {
                return callback(Y.doccirrus.errors.rest( '115025' ));
            }
            // ---------------------------------------------- 1. END ---------------------------------------------------------


            // ---------------------- 2. Query deviceLogId from the DB --------------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb({
                                        model: 'devicelog',
                                        action: 'get',
                                        user: user,
                                        query: {
                                            _id : deviceLogId
                                        }
                                    })
                                  );

            if(err) {
                Y.log(`revertDeviceLogEntryFromActivity: Error while querying deviceLogId: ${deviceLogId} from DB. Error: ${err.stack || err}`, "error", NAME);
                return callback( Y.doccirrus.errors.rest( '115022' ) );
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`revertDeviceLogEntryFromActivity: deviceLogId: ${deviceLogId} not found in the DB`, "error", NAME);
                return callback( Y.doccirrus.errors.rest( '115002' ) );
            }

            if( !result[0].attachments || !result[0].attachments[0] ) {
                // Should never come here
                Y.log(`revertDeviceLogEntryFromActivity: deviceLogId: ${deviceLogId} does not have any attachment in 'attachments' key`, "error", NAME);
                return callback( Y.doccirrus.errors.rest( '115023' ) );
            }

            if( result[0].attachments.length > 1 ) {
                // Should never come here
                Y.log(`revertDeviceLogEntryFromActivity: deviceLogId: ${deviceLogId} does have more than one attachment in 'attachments' key. attachments: ${result[0].attachments}`, "error", NAME);
                return callback( Y.doccirrus.errors.rest( '115024' ) );
            }

            deviceLog = result[0];
            // ------------------------------------------ 2. END ---------------------------------------------------------------


            // ----------------------------- 3. Unclaim deviceLogEntry by attachment -------------------------------------------
            [err, result] = await formatPromiseResult(
                                    unclaimDeviceLogEntry({
                                        user,
                                        data: {
                                            attachment: deviceLog.attachments[0],
                                            shouldUpdateActivity: true,
                                            unclaimEvenIfActivityDoesNotExist: true
                                        }
                                    })
                                  );

            if( err ) {
                Y.log(`revertDeviceLogEntryFromActivity: Error in 'unclaimDeviceLogEntry' for deviceLogId: ${deviceLog._id.toString()} containing attachment: ${deviceLog.attachments[0]}. Error: ${err.stack || err}. ErrorMessage: ${Y.doccirrus.errorTable.getMessage( {...err, locale: '-en'} )}`, "error", NAME);
                return callback(err);
            }
            // --------------------------------------- 3. END ------------------------------------------------------------------


            // --------------- 4. If 'deviceLog.activityId' exists then notify UI to reload casefolder for that activity to reflect changes -------------
            if( deviceLog.activityId ) {
                await formatPromiseResult( notifyUIToReloadActivitiesTable(user, deviceLog.activityId) );
            }
            // ---------------------------------------------- 4. END ------------------------------------------------------------------------------------

            return callback( null, "SUCCESSFUL" );
        }

        /**
         * @method PUBLIC
         *
         * This method notifies deviceLog UI binder to reload updated devices logs from the DB
         *
         * @param {Object} user :REQUIRED:
         */
        function notifyUIToReloadDeviceLogTable( user ) {
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.RELOAD_DEVICE_LOG_TABLE',
                msg: {
                    data: {}
                }
            } );
        }

        /**
         * @method PRIVATE
         *
         * Given the activityId, query its casefolderId and notify UI to reload activities table under that casefolder
         *
         * @param {Object} user
         * @param {String} activityId :REQUIRED: activity Id whose case folder is needs to be reloaded on the UI
         * @returns {Promise<void>}
         */
        async function notifyUIToReloadActivitiesTable( user, activityId ) {
            let
                err,
                activityArr;

            // -------------------------------- 1. Query the activity from the DB ------------------------------------------------------------------------------
            [err, activityArr] = await formatPromiseResult(
                                         Y.doccirrus.mongodb.runDb({
                                             model: 'activity',
                                             action: 'get',
                                             user: user,
                                             query: {
                                                 _id: activityId
                                             }
                                          })
                                        );

            if( err ) {
                Y.log(`notifyUIToReloadActivitiesTable: Error while querying activityId: ${activityId} from the DB. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !activityArr || !Array.isArray(activityArr) || !activityArr.length ) {
                Y.log(`notifyUIToReloadActivitiesTable: activityId: ${activityId} not found in the DB`, "warn", NAME);
                throw `activityId: ${activityId} not found in the DB`;
            }

            if( !activityArr[0].caseFolderId ) {
                Y.log(`notifyUIToReloadActivitiesTable: casefolderId is not present for activityId: ${activityId}`, "warn", NAME);
                throw `casefolderId is not present for activityId: ${activityId}`;
            }
            // -------------------------------------------------------- 1. END ----------------------------------------------------------------------------------


            // ------------------------------------ 2. Notify UI to reload case file for activityArr[0].casefolderId --------------------------------------------------
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: activityArr[0].caseFolderId
                }
            } );
            // ---------------------------------------------------------------- 2. END --------------------------------------------------------------------------
        }

        /**
         * @class devicelog
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).devicelog = {
            /**
             * @property name
             * @type {String}
             * @default devicelog-api
             * @protected
             */
            name: NAME,
            // --------------- JSONRPC Methods -------------
            claimDeviceLogEntry,
            claimAllUnclaimedDeviceLogs,
            revertDeviceLogEntryFromActivity,
            // ---------------- END ------------------------

            matchPatientAndCreateAttachment,
            unclaimDeviceLogEntry,
            notifyUIToReloadDeviceLogTable,
            sendDuplicateMediaReceivedSystemNotification,
            checkIfDeviceLogContainsMediaId
        };

    },

    '0.0.1', {
        requires: [
            'dccommunication',
            'employee-schema',
            'activity-schema',
            'activity-api',
            'gdtlog-api',
            'dcauth'
        ]
    }
);
