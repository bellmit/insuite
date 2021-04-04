/**
 * User: abhijit.baldawa
 * Date: 18.06.18  14:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * This module manages all the CRUD operations on 'gdtlogs' collection and is a single point of communication to manage gdtlogs data.
 */

/*global YUI*/
YUI.add( 'gdtlog-api', function( Y, NAME ) {

        const
            crypto = require( 'crypto' ),
            path = require( 'path' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * In-memory variable to record 'md5' hash of all the incoming GDT files.
         * The 'fileHashSet' will be used and has meaning only on master cluster
         * @type {Set<String>}
         */
        let
            fileHashSet = new Set();

        /**
         * @method PUBLIC
         *
         * This method, if invoked, sends system notification. This method should be called if duplicate GDT file is received as flow import
         *
         * @param {Object} user :REQUIRED:
         * @param {String} message :REQUIRED: message to be displayed as system message
         */
        function sendDuplicateGdtSystemNotification( user, message ){
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
         * Given a Buffer or String as input provides a md5 hash of the input
         *
         * @param {Buffer | String} buffOrStr
         * @return {String} hash ex: '6ebfc4a3d8bf53b825e45eeeba5872b1' --> md5 Hash
         */
        function getHashFromBufferOrString( buffOrStr ) {
            if( typeof buffOrStr === 'object' && buffOrStr.type && buffOrStr.type === 'Buffer' ) {
                buffOrStr = Buffer.from( buffOrStr ).toString();
            }
            return crypto
                    .createHash('md5')
                    .update(buffOrStr, 'utf8')
                    .digest('hex');
        }

        /**
         * @method PRIVATE
         *
         * This method is used to unclaim all gdtLogs which belong the the provided activityId except the gdtLog provided by ignoreGdtLogId.
         * This basically would prevent obsolete/multiple/invalid gdtlogs from remaining assigned to single activityId and maintain 1:1
         * mapping between gdtLog and activity
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED
         * @param {object} args.data REQUIRED
         * @param {string} args.data.activityId :REQUIRED:
         * @param {string} args.data.ignoreGdtLogId :REQUIRED: the gdtLog ID to ignore while querying
         * @returns {Promise<void>} If successful promise resolves with no result or rejects with error.
         */
        async function unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId( args ) {
            const
                {user, data} = args,
                {activityId, ignoreGdtLogId} = data;

            let
                err,
                result,
                gdtLogToUnclaimObj,
                gdtLogsToUnclaimArr;

            Y.log(`unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId: Starting to unclaim obsolete gdtlogs from activityId: ${activityId}`, "info", NAME);

            if( !activityId || !ignoreGdtLogId ) {
                Y.log(`unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId: missing activityId and/or ignoreGdtLogId`, "info", NAME);
                throw `activityId and ignoreGdtLogId are required`;
            }

            // ---------------------- 1. Query all gdtLog(s) except ignoreGdtLogId ----------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'get',
                                        query: {
                                            activityId,
                                            _id: {$ne: ignoreGdtLogId}
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId: Error while querying gdtLogs. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId: No gdt log found. Nothing to do all good....`, "info", NAME);
                return;
            }

            gdtLogsToUnclaimArr = result;
            // ------------------------ 1. END -----------------------------------------------------------


            // --------------------------- 2. Unclaim each gdtLog ----------------------------------------
            for( gdtLogToUnclaimObj of gdtLogsToUnclaimArr ) {
                Y.log(`unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId: Unclaiming gdtLogId: ${gdtLogToUnclaimObj._id.toString()} from activityId: ${activityId}`, "info", NAME);

                [err, result] = await formatPromiseResult(
                                        unClaimGdtLogEntryByGdtLogId({
                                            user,
                                            data: {
                                                gdtLogId: gdtLogToUnclaimObj._id.toString()
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId: Error unclaiming gdtLogId: ${gdtLogToUnclaimObj._id.toString()} from activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                } else {
                    Y.log(`unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId: Successfully unclaimed gdtLogId: ${gdtLogToUnclaimObj._id.toString()} from activityId: ${activityId}`, "info", NAME);
                }
            }
            // -------------------------- 2. END ---------------------------------------------------------
        }

        /**
         * @method PRIVATE
         *
         * This method, as the name suggests, unclaims gdtLog by provided gdtLogId
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED
         * @param {object} args.data REQUIRED
         * @param {string} args.data.gdtLogId :REQUIRED: gdtLogId to uncclaim
         * @returns {Promise<void>} If successful promise resolves with no result or rejects with error.
         */
        async function unClaimGdtLogEntryByGdtLogId( args ) {
            const
                {user, data} = args,
                {gdtLogId} = data;

            let
                err,
                result,
                setData = {},
                unsetData = { activityId: 1, patientId: 1 };

            if( !gdtLogId ) {
                throw `missing gdtLogId`;
            }

            //Update the user who did this action
            setData.user = user.id !== 'su' && user.U || "";

            //Update the timestamp
            setData.timestamp = new Date();

            //Reset the status of document
            setData.status = "UNPROCESSED";

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        action: 'update',
                                        model: 'gdtlog',
                                        query: { _id: gdtLogId },
                                        data: { $set: setData, $unset: unsetData }
                                    })
                                  );

            if( err ) {
                throw err;
            }

            if( !result || !result.n ) {
                throw `Failed to unclaim gdtLog Id: ${gdtLogId}`;
            }
        }

        /**
         * @method PUBLIC
         *
         * This method will be triggered from GDT flow after reading the source file and before executing any transformer.
         * If the incoming GDT file's hash does not exist in gdtLogs collection then a new GDT log is created as below and its gdtLogId
         * is returned.
         *
         * This method creates gdtLog DB entry as below:
         * {
         *       timestamp: <Date, currentDate>,
         *       created: <Date, currentDate>,
         *       status: <String, 'UNPROCESSED'>, ---> Status is always 'UNPROCESSED' for this method
         *       user: <String, user name>,
         *       fileSourceType: <String, 'INCOMING' OR 'OUTGOING'>,
         *       fileHash: <String, ex: 'c26a323f61996a3b901f906d7dd9e6a5'>,
         *       fileName: <String, ex: <originalFileName>.gdt>,
         *       fileDownloadUrl: <String, ex: "/1/media/:download?_id=5b3384b803716e1fff4760d2&mime=application/gdt&from=casefile">
         *       flowTitle: <String, title of the flow which triggered the process>
         *   }
         *
         *   If the file's hash is FOUND in the database then the function throws "EXISTS" (thus rejecting promise)
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED: User object to use for performing DB operation
         * @param {object} args.data REQUIRED: Input Data for this method to check and create GDT log entry
         * @param {buffer} args.data.buffer REQUIRED: This is the buffer of entire GDT file. MUST be present
         * @param {string} args.data.filePath REQUIRED: This is the full file path of GDT file ex. '/path/to/my/gdtfile.gdt'
         * @param {string} args.data.flowTitle REQUIRED: This is the title of flow which has triggered this operation
         * @param {string} args.data.fileSourceType REQUIRED: Possible values are "INCOMING or OUTGOING". This represents whether a GDT file is
         *                 either consumed by the flow or generated by the flow using dc-insuite data
         * @returns {Promise} Promise resolves to below:
         *          If Successful resolves to below:
         *              "gdtLogId" -> If GDT log is created in the DB then returns Database ID of gdtLog
         *          If Failed then the promise is rejected with error (or {fileHash: <String>, filePath: <String>, fileDownloadUrl: <String>, customMessage: "EXISTS" or "SKIP_DUPLICATE"} if file hash is found in DB
         *          so this is not error scenario)
         */
        async function checkAndCreate(args) {
            Y.log('Entering Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);

            const
                {user, data} = args,
                {buffer, filePath, flowTitle, fileSourceType} = data;

            let
                fileHash,
                currentDate,
                gdtLogRecord,
                fileName,
                gdtLogId,
                err,
                result;

            Y.log(`checkAndCreate: Checking and creating GDT log for flowName: ${flowTitle} and filePath: ${filePath}`, "info", NAME);
            // ------------------------------ 1. Input Validations ----------------------------------------
            if( !flowTitle ) {
                Y.log(`checkAndCreate: Missing 'flowTitle'`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw new Error(`Missing 'flowTitle'`);
            }

            if( !buffer || !filePath || typeof filePath !== "string" ) {
                Y.log(`checkAndCreate: Missing input Buffer and/or filePath`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw new Error(`Missing input Buffer and/or filePath`);
            }

            if( !fileSourceType || (fileSourceType !== "INCOMING" && fileSourceType !== "OUTGOING") ) {
                Y.log(`checkAndCreate: fileSourceType either 'INCOMING OR 'OUTGOING' is required`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw new Error(`fileSourceType must be either 'INCOMING OR 'OUTGOING'.`);
            }

            fileName = path.win32.basename(filePath).trim();

            if( !fileName ) {
                Y.log(`checkAndCreate: No file name present in the input filePath`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw new Error(`No file name present in the input filePath`);
            }
            // ------------------------------ 1. END -----------------------------------------------------


            // ------------------------------ 2. Generate file hash ----------------------------------------
            fileHash = getHashFromBufferOrString(buffer);

            if( !fileHash ) {
                Y.log(`checkAndCreate: Failed to compute file hash`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw new Error(`Failed to computing file hash`);
            }
            // ------------------------------ 2. END -------------------------------------------------------


            // -------------- 3. Check if this file is already stored in DB by its hash ---------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'get',
                                        query: { fileHash }
                                    } )
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error while querying gdtlog for fileHash = ${fileHash}. Error: ${err.stack || err}`, "error", NAME );
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw err;
            }

            if( result && Array.isArray(result) && result.length ) {
                //Means this file is already saved in the DB. No need to proceed further ...
                Y.log(`checkAndCreate: GDT log entry already exists for file: '${filePath}' with hash: '${fileHash}' triggered by flowName: '${flowTitle}'. Skipping this file from flow execution`, "info", NAME);
                // We need to send fileHash and fileName for logging and identifying the file

                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw {fileHash, filePath, fileDownloadUrl: result[0].fileDownloadUrl, customMessage: "EXISTS"};
            }

            if( Y.doccirrus.ipc.isMaster() ) {
                /**
                 * We are keeping this check because if the GDT files are read from device server then sometimes this method is called instantly with same file and
                 * because of that, due to parallel async operation, during the fileHash check the file is not found and then created thus same file ends up in multiple
                 * gdtlogs which defeats the purpose of having one GDT log per file. This happens when the GDT flow is triggered automatically thus executing on master
                 * cluster. For JSONRPC calls this mechanism is not used. So the focus is clearly on automatic GDT Import flows.
                 */
                if( fileHashSet.has(fileHash) ) {
                    Y.log(`checkAndCreate: Received duplicate file with fileHash: '${fileHash}', name: '${filePath}'. Skipping this file`, "warn", NAME);
                    Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                    throw {customMessage: "SKIP_DUPLICATE"};
                }

                fileHashSet.add(fileHash);
            }
            // ------------------------- 3. END -----------------------------------------------------------------


            // -------------- 4. Now that the file does not exists in the DB, create a GDT log entry ------------
            currentDate = new Date();

            gdtLogRecord = {
                timestamp: currentDate,
                created: currentDate,
                status: 'UNPROCESSED',
                user: "",
                fileSourceType,
                fileHash,
                fileName,
                flowTitle
            };

            if(user.id !== 'su' && user.U) {
                gdtLogRecord.user = user.U;
            }

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'post',
                                        data: Y.doccirrus.filters.cleanDbObject( gdtLogRecord )
                                    } )
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error while creating GDT log entry in DB. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`checkAndCreate: Failed to create GDT log entry in DB.`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
                throw new Error(`Failed to create GDT log entry in DB.`);
            }

            gdtLogId = result[0];
            // ---------------------- 4. END ------------------------------------------------------------------------

            Y.log(`checkAndCreate: Successfully created GDT log Id: ${gdtLogId} for flowName: ${flowTitle} and fileName: ${fileName} with hash: ${fileHash} in the DB.`, "info", NAME);
            Y.log('Exiting Y.doccirrus.api.gdtlog.checkAndCreate', 'info', NAME);
            return gdtLogId;
        }

        /**
         * @method PUBLIC
         *
         * This method is called after flow's transformer phase if there is an error in the GDT flow. This method updates below fields:
         *
         * {
         *    gdtResult: <String> --> WILL BE UPDATED
         *    timestamp: <Date> --> WILL BE UPDATED
         *    user: <String> --> WILL BE UPDATED
         *    patientName: <String> --> OPTIONAL
         * }
         *
         * If 'gdtResult' already is set (should never happen) then rejects promise with error.
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED
         * @param {object} args.data REQUIRED
         * @param {string} args.data.errorMessage :REQUIRED: could be one of keys Y.doccirrus.schemas.gdtlog.gdtResultMessageObj
         * @param {string} args.data.gdtLogId :REQUIRED: _id of gdtLog collection record to update
         * @param {string} args.data.firstName :OPTIONAL: First name of the patient
         * @param {string} args.data.lastName :OPTIONAL: Last name of the patient
         * @returns {Promise} If record is updated then resolves to 'SUCCESSFUL' or else rejects to error
         */
        async function updateGdtLogErrorStatus( args ) {
            Y.log('Entering Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);

            const
                {user, data} = args,
                {errorMessage, gdtLogId, firstName, lastName} = data;

            let
                err,
                result,
                gdtLog,
                patientFullName,
                updatedGdtLog;

            Y.log(`updateGdtLogErrorStatus: Updating 'gdtResult' with: ${errorMessage} for gdtLogId: ${gdtLogId}`, "info", NAME);

            if( !errorMessage || !gdtLogId || typeof errorMessage !== "string" || typeof gdtLogId !== "string" ) {
                Y.log(`updateGdtLogErrorStatus: Invalid input`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);
                throw new Error(`INVALID_INPUT`);
            }

            if( !Y.doccirrus.schemas.gdtlog.gdtResultMessageObj[errorMessage] ) {
                Y.log(`updateGdtLogErrorStatus: Invalid errorMessage passed`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);
                throw new Error(`INVALID_ERROR_MESSAGE`);
            }

            // ------------------------ 1. Check if GDT log exists ------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'get',
                                        query: {
                                            _id: gdtLogId
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`updateGdtLogErrorStatus: Error while querying gdtlog ID: ${gdtLogId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`updateGdtLogErrorStatus: No GDT log found for ID: ${gdtLogId}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);
                throw new Error(`No GDT log found for ID: ${gdtLogId}`);
            }

            gdtLog = result[0];
            // --------------------- 1. END ----------------------------------------------------------------------


            // --------------------------- 2. Validate -----------------------------------------------------------------
            if( gdtLog.gdtResult ) {
                Y.log(`updateGdtLogErrorStatus: gdtResult = ${gdtLog.gdtResult} is already set for GDT Log ID: ${gdtLogId}. Cannot set to: ${errorMessage}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);
                throw new Error(`gdtResult = ${gdtLog.gdtResult} is already set for GDT Log ID: ${gdtLogId}. Cannot set to: ${errorMessage}`);
            }
            // ------------------------- 2. END ----------------------------------------------------------------------


            // -------------------------- 3. Update gdtResult with errorMessage -------------------------------------
            updatedGdtLog = {
                gdtResult: errorMessage,
                timestamp: new Date(),
                user: user.id !== 'su' && user.U || ""
            };

            if( lastName ) {
                patientFullName = lastName;
            }

            if( firstName ) {
                patientFullName = patientFullName ? `${patientFullName} ${firstName}`: firstName;
            }

            if( patientFullName ) {
                updatedGdtLog.patientName = patientFullName;
            }

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'put',
                                        query: {
                                            _id: gdtLogId
                                        },
                                        data: Y.doccirrus.filters.cleanDbObject( updatedGdtLog),
                                        fields: Object.keys(updatedGdtLog)
                                    })
                                  );

            if( err ) {
                Y.log(`updateGdtLogErrorStatus: Error while updating 'gdtResult' to ${errorMessage} for gdtLog with ID = ${gdtLogId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);
                throw err;
            }
            // ------------------------ 2. END ---------------------------------------------------------------------

            Y.log(`updateGdtLogErrorStatus: Successfully updated 'gdtResult' = ${errorMessage} for gdtLogId = ${gdtLogId}`, "info", NAME);
            Y.log('Exiting Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus', 'info', NAME);
            return "SUCCESSFUL";
        }

        /**
         * @method PUBLIC
         *
         * This method is called if the GDT file is successfully parsed in flow transformer and an activity is created/updated for this GDT file.
         * This method updates below fields in the gdtLog record based on gdtLogId:
         * {
         *    patientId: <String>, --> optional, but should always be filled from activity
         *    patientName: <String>, --> optional, but should always be filled from activity
         *    activityId: <String> --> WILL BE UPDATED
         *    status: <String, 'PROCESSED'>, --> WILL BE UPDATED
         *    gdtResult: <String, 'SUCCESSFUL'> --> WILL BE UPDATED
         *    timestamp: <new Date()> --> WILL BE UPDATED,
         *    user: <String> --> WILL BE UPDATED
         * }
         *
         * Once the gdtLog is claimed by an activityId then other obsolete gdtLogs which are pointed to the same activityId are unclaimed
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED
         * @param {object} args.data REQUIRED
         * @param {string} args.data.activityId :REQUIRED: _id of activityId
         * @param {string} args.data.gdtLogId :REQUIRED: _id of gdtLog
         * @returns {Promise} If claim is successful then 'SUCCESSFUL' else error
         */
        async function claimGdtLogEntry( args ) {
            Y.log('Entering Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);

            const
                {user, data} = args,
                {activityId, gdtLogId} = data;

            let
                err,
                result,
                activity,
                gdtLogUpdateObj = {};

            Y.log(`claimGdtLogEntry: Claiming gdtLog entry for gdtLogId = ${gdtLogId}`, "info", NAME);
            // --------------------------------------- 1. Validation ----------------------------------------------
            if( !gdtLogId || typeof gdtLogId !== "string" ) {
                Y.log(`claimGdtLogEntry: Missing gdtLogId`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                throw new Error(`Missing gdtLogId`);
            }

            if( !activityId || typeof activityId !== "string" ) {
                Y.log(`claimGdtLogEntry: Missing activityId`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                throw new Error(`Missing activityId`);
            }
            // --------------------------------------- 1. END-----------------------------------------------------


            // ------------------------ 2. Check if GDT log exists ------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'get',
                                        query: {
                                            _id: gdtLogId
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`claimGdtLogEntry: Error while querying gdtlog ID: ${gdtLogId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`claimGdtLogEntry: No GDT log found for ID: ${gdtLogId}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                throw new Error(`No GDT log found for ID: ${gdtLogId}`);
            }

            if( result[0].activityId === activityId && result[0].status === "PROCESSED" ) {
                //Means gdtLog is already claimed by the same activityId so no need to proceed further;
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                return "ALREADY_CLAIMED";
            }

            // --------------------- 2. END ----------------------------------------------------------------------


            // ------------------------------- 3. Check if activity with 'activityId' exists ---------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'activity',
                                        action: 'get',
                                        query: {
                                            _id: activityId
                                        },
                                        options: {
                                            select: {
                                                patientId: 1,
                                                patientLastName: 1,
                                                patientFirstName: 1,
                                                actType: 1,
                                                subType: 1
                                            }
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`claimGdtLogEntry: Error while querying activity with ID: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`claimGdtLogEntry: No activity found for ID: ${activityId}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                throw new Error(`No activity found for ID: ${activityId}`);
            }

            activity = result[0];
            // -------------------------------- 3. END -----------------------------------------------------------


            // --------------- 4. Claim GDT log entry and mark it PROCESSED ---------------
            if( activity.patientId ) {
                gdtLogUpdateObj.patientId = activity.patientId;
            }

            if( activity.patientLastName ) {
                gdtLogUpdateObj.patientName = activity.patientLastName;
            }

            if( activity.patientFirstName ) {
                gdtLogUpdateObj.patientName = gdtLogUpdateObj.patientName ? `${gdtLogUpdateObj.patientName} ${activity.patientFirstName}` : activity.patientFirstName;
            }

            gdtLogUpdateObj.activityId = activityId;
            gdtLogUpdateObj.status = "PROCESSED";
            gdtLogUpdateObj.gdtResult = Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.SUCCESSFUL;
            gdtLogUpdateObj.timestamp = new Date();
            gdtLogUpdateObj.user = user.id !== 'su' && user.U || "";

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'put',
                                        query: {
                                            _id: gdtLogId
                                        },
                                        data: Y.doccirrus.filters.cleanDbObject( gdtLogUpdateObj ),
                                        fields: Object.keys(gdtLogUpdateObj)
                                    })
                                  );

            if( err ) {
                Y.log(`claimGdtLogEntry: Error while claiming gdt log entry for gdtLogId: ${gdtLogId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
                throw err;
            }
            // ------------------------------------- 4. END ------------------------------------------------------


            // -- 5. At this point we have successfully claimed the gdtLog. Now unclaim all those gdtLogs who belong to this activityId except the claimedGdtLog ----
            await formatPromiseResult(
                    unClaimAllGdtLogsByActivityIdExceptCurrentGdtLogId({
                        user,
                        data: {
                            activityId,
                            ignoreGdtLogId: gdtLogId
                        }
                    })
                  );
            // -------------------- 5. END --------------------------------------------------------------------------------------------

            Y.log(`claimGdtLogEntry: Successfully claimed gdtLogId = ${gdtLogId} with activityId: ${activityId}`, "info", NAME);
            Y.log('Exiting Y.doccirrus.api.gdtlog.claimGdtLogEntry', 'info', NAME);
            return "SUCCESSFUL";
        }

        /**
         * @method PUBLIC
         *
         * This method will be called from DELETE activity post process only and once called will un-claim gdtLog as below:
         * {
         *    activityId -> will be DELETED from record
         *    patientId -> will be DELETED from record
         *    timestamp -> will be SET to new Date()
         *    status -> will be SET to "UNPROCESSED"
         *    user -> will be SET to the user who is responsible for this action
         * }
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED
         * @param {object} args.data REQUIRED
         * @param {string} args.data.activityId :REQUIRED: the activityId using which gdtLogs are to be unclaimed
         * @returns {Promise<string>} Promise resolves to 'SUCCESSFUL' or 'NOT_FOUND' else rejects with error
         */
        async function unClaimGdtLogEntry( args ) {
            Y.log('Entering Y.doccirrus.api.gdtlog.unClaimGdtLogEntry', 'info', NAME);

            const
                {user, data} = args,
                {activityId} = data;

            let
                err,
                result,
                gdtLogObj,
                gdtLogsArr;

            Y.log(`unClaimGdtLogEntry: Unclaiming any relevant gdtlog for activityId: ${activityId}...`, 'info', NAME);

            if( !activityId ) {
                Y.log( `unClaimGdtLogEntry: Missing activityId`, 'warn', NAME );
                Y.log('Exiting Y.doccirrus.api.gdtlog.unClaimGdtLogEntry', 'info', NAME);
                throw new Error(`Missing activityId`);
            }

            // ------------------------- 1. query all GDT logs by activityId ---------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtlog',
                                        action: 'get',
                                        query: {
                                            activityId
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`unClaimGdtLogEntry: Error while querying gdtLog using activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.unClaimGdtLogEntry', 'info', NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ){
                Y.log(`unClaimGdtLogEntry: No GDT log entry found for activityId: ${activityId}.`, "info", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtlog.unClaimGdtLogEntry', 'info', NAME);
                return `NOT_FOUND`;
            }

            if( result.length > 1 ) {
                Y.log(`unClaimGdtLogEntry: more than 1 gdtLog matched activityId: ${activityId}. Expected only 1. Unclaiming all matching gdtLogs`, "warn", NAME);
            }

            gdtLogsArr = result;
            // ------------------------- 1. END ---------------------------------------------------------------------------------


            // -------------- 2. Unclaim each gdt log --------------------------------------------------------------------------
            for( gdtLogObj of gdtLogsArr ) {
                Y.log(`unClaimGdtLogEntry: Unclaiming gdtLogId: ${gdtLogObj._id.toString()} from activityId: ${activityId}`, "info", NAME);

                [err, result] = await formatPromiseResult(
                                        unClaimGdtLogEntryByGdtLogId({
                                            user,
                                            data: {
                                                gdtLogId: gdtLogObj._id.toString()
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`unClaimGdtLogEntry: Error unclaiming gdtLogId: ${gdtLogObj._id.toString()} from activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                    Y.log('Exiting Y.doccirrus.api.gdtlog.unClaimGdtLogEntry', 'info', NAME);
                    throw err;
                }

                Y.log(`unClaimGdtLogEntry: Successfully unclaimed gdtLogId: ${gdtLogObj._id.toString()} from activityId: ${activityId}`, "info", NAME);
            }
            // ------------------------------------ 2. END -----------------------------------------------------------------------

            Y.log('Exiting Y.doccirrus.api.gdtlog.unClaimGdtLogEntry', 'info', NAME);
            return "SUCCESSFUL";
        }

        /**
         * @class gdtlog
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).gdtlog = {
            /**
             * @property name
             * @type {String}
             * @default gdtlog-api
             * @protected
             */
            name: NAME,
            checkAndCreate,
            claimGdtLogEntry,
            updateGdtLogErrorStatus,
            unClaimGdtLogEntry,
            getHashFromBufferOrString,
            sendDuplicateGdtSystemNotification
        };

    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'gdtlog-schema',
            'employee-schema',
            'activity-schema',
            'activity-api',
            'dcauth'
        ]
    }
);