/**
 * User: abhijit.baldawa
 * Date: 17.07.18  10:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * This module manages all the CRUD operations on 'gdtexportlogs' collection and is a single point of communication to manage
 * gdtexportlogs
 */

/*global YUI*/
YUI.add( 'gdtexportlog-api', function( Y, NAME ) {

        const
            fs = require( 'fs' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * @method PRIVATE
         *
         * This method, as the name suggests, unclaims gdtExportLog by provided gdtExportLogId
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED
         * @param {object} args.data REQUIRED
         * @param {string} args.data.gdtExportLogId :REQUIRED: gdtExportLogId to unclaim
         * @returns {Promise<void>} If successful promise resolves with no result or rejects with error.
         */
        async function unClaimGdtExportLogEntryById( args ) {
            const
                {user, data} = args,
                {gdtExportLogId} = data;

            let
                err,
                result,
                setData = {},
                unsetData = { activityId: 1, patientId: 1 };

            if( !gdtExportLogId ) {
                throw `missing gdtExportLogId`;
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
                                        model: 'gdtexportlog',
                                        query: { _id: gdtExportLogId },
                                        data: { $set: setData, $unset: unsetData }
                                    })
                                  );

            if( err ) {
                throw err;
            }

            if( !result || !result.n ) {
                throw `Failed to unclaim gdtExportLog Id: ${gdtExportLogId}`;
            }
        }

        /**
         * @method PUBLIC
         *
         * This method will be called when GDT file is exported via a flow. To be precise it will be called when either one of the below
         * transformer is called and successfully returns a buffer of file data:
         * 1] GDTSTUDY
         * 2] GDTPATIENT
         * 3] GDTVIEW
         *
         * Once called this method will create a gdtExportLog in 'gdtexportlogs' collection based on the uniqueness of the file and return gdtExportLogId.
         * If the gdtExportLog already exists in the DB then this method will just update the timestamp and user information and return the
         * gdtExportLogId.
         *
         * @param {object} args REQUIRED
         * @param {object} args.user REQUIRED
         * @param {object} args.data REQUIRED
         * @param {Buffer} args.data.buffer REQUIRED file data buffer which needs to be stored in file
         * @param {string} args.data.flowTitle REQUIRED The title of the flow responsible for GDT export
         * @param {object} args.data.patient OPTIONAL Patient object whose data would be there in gdt file
         * @param {object} args.data.activity OPTIONAL Activity object whose data would be there in gdt file
         * @param {string} args.data.transformerType The name of transformer who created the Buffer for file
         * @returns {Promise} If successful then returns gdtExportLogId else rejects with error
         */
        async function checkAndCreate( args ) {
            Y.log('Entering Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);

            const
                {user, data} = args,
                {buffer, flowTitle, patient, activity, transformerType} = data;

            let
                fileHash,
                currentDate,
                gdtExportLogRecord,
                gdtExportLogId,
                err,
                result;

            Y.log(`checkAndCreate: Checking and creating GDT export log for flowName: ${flowTitle}`, "info", NAME);
            // ------------------------------ 1. Input Validations ----------------------------------------
            if( !flowTitle ) {
                Y.log(`checkAndCreate: Missing 'flowTitle'`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw new Error(`Missing 'flowTitle'`);
            }

            if( !buffer ) {
                Y.log(`checkAndCreate: Missing input Buffer`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw new Error(`Missing input Buffer`);
            }

            if( !patient && !activity ) {
                Y.log(`checkAndCreate: 'patient' and 'activity' are both missing. Required at-least one`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw new Error(`'patient' and 'activity' are both missing. Required at-least one`);
            }

            if( !transformerType ) {
                Y.log(`checkAndCreate: 'transformerType' name is required`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw new Error(`'transformerType' name is required`);
            }
            // ------------------------------ 1. END -----------------------------------------------------


            // ------------------------------ 2. Generate file hash ----------------------------------------
            fileHash = Y.doccirrus.api.gdtlog.getHashFromBufferOrString(buffer);

            if( !fileHash ) {
                Y.log(`checkAndCreate: Failed to compute file hash`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw new Error(`Failed to computing file hash`);
            }
            // ------------------------------ 2. END -------------------------------------------------------


            // -------------- 3. Check if this file is already stored in DB by its hash ---------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtexportlog',
                                        action: 'get',
                                        query: { fileHash }
                                    } )
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error while querying 'gdtexportlog' for fileHash = ${fileHash}. Error: ${err.stack || err}`, "error", NAME );
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw err;
            }

            if( result && Array.isArray(result) && result.length ) {
                gdtExportLogId = result[0]._id.toString();

                //Means this file is already saved in the DB
                Y.log(`checkAndCreate: GDT export log entry already exists for fileHash: ${fileHash} triggered by flowName: ${flowTitle}. Updating timestamp and user details for gdtExportLogId: ${gdtExportLogId}`, "warn", NAME);

                // ------------------ 3a. Update timestamp and user properties in 'gdtexportlog' for 'gdtExportLogId' and return -------------
                [err, result] = await formatPromiseResult(
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            action: 'update',
                                            model: 'gdtexportlog',
                                            query: { _id: gdtExportLogId },
                                            data: {
                                                $set: {
                                                    timestamp: new Date(),
                                                    user: user.id !== 'su' && user.U || "",
                                                    flowTitle
                                                }
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`checkAndCreate: Error while updating existing gdtExportLogId: ${gdtExportLogId}. Error: ${err.stack || err}`, "error", NAME);
                    Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                    throw err;
                }

                if( !result || !result.n ) {
                    Y.log(`checkAndCreate: Failed to update existing gdtExportLogId: ${gdtExportLogId}`, "error", NAME);
                    Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                    throw new Error(`Failed to update existing gdtExportLogId: ${gdtExportLogId}`);
                }

                return gdtExportLogId;
                // ---------------------- 3a. END -----------------------------------------------------------------------
            }
            // ------------------------- 3. END -----------------------------------------------------------------


            // -------------- 4. Now that the file does not exists in the DB, create a GDT export log entry ------------
            currentDate = new Date();

            gdtExportLogRecord = {
                timestamp: currentDate,
                created: currentDate,
                status: 'UNPROCESSED',
                user: "",
                fileHash,
                flowTitle,
                transformerType
            };

            if(user.id !== 'su' && user.U) {
                gdtExportLogRecord.user = user.U;
            }

            if( patient && patient._id ) {
                gdtExportLogRecord.patientId = patient._id.toString();

                if( patient.lastname ) {
                    gdtExportLogRecord.patientName = patient.lastname;
                }

                if( patient.firstname ) {
                    gdtExportLogRecord.patientName = gdtExportLogRecord.patientName ? `${gdtExportLogRecord.patientName} ${patient.firstname}` : patient.firstname;
                }

                if( activity && activity._id ) {
                    gdtExportLogRecord.activityId = activity._id.toString();
                }

                gdtExportLogRecord.status = "PROCESSED";
            } else if( activity && activity._id ) {
                gdtExportLogRecord.activityId = activity._id.toString();

                if( activity.patientId ) {
                    gdtExportLogRecord.patientId = activity.patientId;
                }

                if( activity.patientLastName ) {
                    gdtExportLogRecord.patientName = activity.patientLastName;
                }

                if( activity.patientFirstName ) {
                    gdtExportLogRecord.patientName = gdtExportLogRecord.patientName ? `${gdtExportLogRecord.patientName} ${activity.patientFirstName}` : activity.patientFirstName;
                }

                gdtExportLogRecord.status = "PROCESSED";
            }

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtexportlog',
                                        action: 'post',
                                        data: Y.doccirrus.filters.cleanDbObject( gdtExportLogRecord )
                                    } )
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error while creating GDT export log entry in DB. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`checkAndCreate: Failed to create GDT export log entry in DB.`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw new Error(`Failed to create GDT export log entry in DB.`);
            }

            gdtExportLogId = result[0];
            // ---------------------- 4. END ------------------------------------------------------------------------


            // ----------------------- 5. Save the file in the temp directory and do a media import in DB ----------
            const tempFilePath = `${Y.doccirrus.media.getTempDir()}${Math.random().toString(36).slice(2)}.gdt`;

            [err, result] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        fs.writeFile(tempFilePath, buffer, (err) => {
                                            if(err) {
                                                reject(err);
                                            } else {
                                                resolve();
                                            }
                                        });
                                    })
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error while writing GDT export file to a temporary directory for importing purpose. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw err;
            }

            [err, result] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        Y.doccirrus.media.importMediaFromFile( user, tempFilePath, 'gdtexportlog', gdtExportLogId, "untitled.gdt", 'user', 'OTHER', (err, mediaRes) => {
                                            if( err ) {
                                                reject(err);
                                            } else {
                                                resolve( mediaRes );
                                            }
                                        } );
                                    })
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error saving GDT export file in the database via importMediaFromFile routine. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw err;
            }

            if( !result || !result._id ) {
                Y.log(`checkAndCreate: Failed to save GDT export file to database via importMediaFromFile routine`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw new Error(`Failed to save GDT export file to database via importMediaFromFile routine.`);
            }
            // -------------------------- 5. END --------------------------------------------------------------------


            // -------------------------- 6. Save the URL of file in the 'gdtexportlog' collection ------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtexportlog',
                                        action: 'put',
                                        query: {
                                            _id: gdtExportLogId
                                        },
                                        data: Y.doccirrus.filters.cleanDbObject( {fileDownloadUrl: `/1/media/:download?_id=${result._id.toString()}&mime=${result.mimeType}&from=casefile`} ),
                                        fields: [ 'fileDownloadUrl' ]
                                    })
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error while adding 'fileDownloadUrl' field to gdtExportLog with ID = ${gdtExportLogId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
                throw err;
            }
            // ------------------------ 6. END ---------------------------------------------------------------------


            // ---------------------------- 7. Cleanup temporary file which was created ----------------------------
            [err, result] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        fs.unlink( tempFilePath, (err) => {
                                            if(err) {
                                                reject(err);
                                            } else {
                                                resolve();
                                            }
                                        });
                                    })
                                  );

            if( err ) {
                Y.log(`checkAndCreate: Error while cleaning up temp GDT export file. Error: ${err.stack || err}`, "warn", NAME);
            }
            // ----------------------------- 7. END ----------------------------------------------------------------

            Y.log(`checkAndCreate: Successfully created GDT export log Id: ${gdtExportLogId} for flowName: ${flowTitle} and file with hash: ${fileHash} in the DB.`, "info", NAME);
            Y.log('Exiting Y.doccirrus.api.gdtexportlog.checkAndCreate', 'info', NAME);
            return gdtExportLogId;
        }

        /**
         * @method PUBLIC
         *
         * This method will be called from DELETE activity post process only and once called will un-claim gdtExportLog as below:
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
         * @param {string} args.data.activityId :REQUIRED: the activityId using which gdtExportLogs are to be unclaimed
         * @returns {Promise<string>} Promise resolves to 'SUCCESSFUL' or 'NOT_FOUND' else rejects with error
         */
        async function unClaimGdtExportLogEntry( args ) {
            Y.log('Entering Y.doccirrus.api.gdtexportlog.unClaimGdtExportLogEntry', 'info', NAME);

            const
                {user, data} = args,
                {activityId} = data;

            let
                err,
                result,
                gdtExportLogsArr;

            Y.log(`unClaimGdtExportLogEntry: Unclaiming any relevant gdtExportLog for activityId: ${activityId}...`, 'info', NAME);

            if( !activityId ) {
                Y.log( `unClaimGdtExportLogEntry: Missing activityId`, 'warn', NAME );
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.unClaimGdtExportLogEntry', 'info', NAME);
                throw new Error(`Missing activityId`);
            }

            // ------------------------- 1. query all GDT logs by activityId ---------------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'gdtexportlog',
                                        action: 'get',
                                        query: {
                                            activityId
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`unClaimGdtExportLogEntry: Error while querying gdtExportLog using activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.unClaimGdtExportLogEntry', 'info', NAME);
                throw err;
            }

            if( !result || !Array.isArray(result) || !result.length ){
                Y.log(`unClaimGdtExportLogEntry: No GDT export log entry found for activityId: ${activityId}.`, "info", NAME);
                Y.log('Exiting Y.doccirrus.api.gdtexportlog.unClaimGdtExportLogEntry', 'info', NAME);
                return `NOT_FOUND`;
            }

            if( result.length > 1 ) {
                Y.log(`unClaimGdtExportLogEntry: more than 1 gdtExportLog matched activityId: ${activityId}. Expected only 1. Unclaiming all matching gdtExportLogs`, "warn", NAME);
            }

            gdtExportLogsArr = result;
            // ------------------------- 1. END ---------------------------------------------------------------------------------


            // -------------- 2. Unclaim each gdt log --------------------------------------------------------------------------
            for( let gdtExportLogObj of gdtExportLogsArr ) {
                Y.log(`unClaimGdtExportLogEntry: Unclaiming gdtExportLogId: ${gdtExportLogObj._id.toString()} from activityId: ${activityId}`, "info", NAME);

                [err, result] = await formatPromiseResult(
                                        unClaimGdtExportLogEntryById({
                                            user,
                                            data: {
                                                gdtExportLogId: gdtExportLogObj._id.toString()
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`unClaimGdtExportLogEntry: Error unclaiming gdtExportLogId: ${gdtExportLogObj._id.toString()} from activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                    Y.log('Exiting Y.doccirrus.api.gdtexportlog.unClaimGdtExportLogEntry', 'info', NAME);
                    throw err;
                }

                Y.log(`unClaimGdtExportLogEntry: Successfully unclaimed gdtExportLogId: ${gdtExportLogObj._id.toString()} from activityId: ${activityId}`, "info", NAME);
            }
            // ------------------------------------ 2. END -----------------------------------------------------------------------

            Y.log('Exiting Y.doccirrus.api.gdtexportlog.unClaimGdtExportLogEntry', 'info', NAME);
            return "SUCCESSFUL";
        }

        /**
         * @class gdtexportlog
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).gdtexportlog = {
            /**
             * @property name
             * @type {String}
             * @default gdtexportlog-api
             * @protected
             */
            name: NAME,
            checkAndCreate,
            unClaimGdtExportLogEntry
        };

    },
    '0.0.1', {
        requires: [
            'gdtlog-api'
        ]
    }
);