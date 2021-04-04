/**
 * User: abhijit.baldawa
 * Date: 26.10.17  14:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */



/*global YUI */
YUI.add( 'inpacslog-api', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            async = require( 'async' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        function createInpacslogEntry( args ) {
            const
                { user, data } = args,
                {studyMetaData, g_extra, external, activityId, patientId } = data;

            if(!studyMetaData || !studyMetaData.ID || !studyMetaData.ParentPatient ) {
                throw "Invalid input study data";
            }

            if( typeof external !== "boolean" ) {
                throw "Missing external boolean flag from data object";
            }

            let
                currentDate = new Date(),
                inpacsLogRecord = {
                    timestamp: currentDate,
                    created: currentDate,
                    orthancStudyUId: studyMetaData.ID,
                    status: 'UNPROCESSED',
                    user: "",
                    g_extra,
                    external
                };


            if(studyMetaData.PatientMainDicomTags) {
                if(studyMetaData.PatientMainDicomTags.PatientName) {
                    inpacsLogRecord.patientName = studyMetaData.PatientMainDicomTags.PatientName.replace(/\^/g, " ");
                }

                if(studyMetaData.PatientMainDicomTags.PatientBirthDate) {
                    const dob = moment.utc(studyMetaData.PatientMainDicomTags.PatientBirthDate, "YYYYMMDD");

                    if(dob.isValid()) {
                        inpacsLogRecord.patientDob = dob.toDate();
                    }
                }

                if(studyMetaData.PatientMainDicomTags.PatientSex) {
                    if(studyMetaData.PatientMainDicomTags.PatientSex.toLowerCase() === "m") {
                        inpacsLogRecord.patientGender = "MALE";
                    } else if(studyMetaData.PatientMainDicomTags.PatientSex.toLowerCase() === "f" || studyMetaData.PatientMainDicomTags.PatientSex.toLowerCase() === "w" ){
                        inpacsLogRecord.patientGender = "FEMALE";
                    } else {
                        inpacsLogRecord.patientGender = "UNKNOWN";
                    }
                } else {
                    inpacsLogRecord.patientGender = "UNKNOWN";
                }
            }

            //If external === false
            // It means this study was created via insuite worklist approach from casefolder, then claim inpacsLog already
            if( !external && activityId && patientId) {
                inpacsLogRecord.status = "PROCESSED";
                inpacsLogRecord.activityId = activityId;
                inpacsLogRecord.patientId = patientId;

                if(user.id !== 'su' && user.U) {
                    inpacsLogRecord.user = user.U;
                }
            }

            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'inpacslog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( inpacsLogRecord )
            } );

        }

        function checkAndCreate( args ) {
            Y.log('Entering Y.doccirrus.api.inpacslog.checkAndCreate', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.checkAndCreate');
            }
            const
                { user, callback, data } = args,
                {studyMetaData} = data,
                orthancStudyUId = studyMetaData.ID;

            if(!orthancStudyUId) {
                return callback(`No orthancStudyUId present`);
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'inpacslog',
                action: 'get',
                query: { orthancStudyUId: orthancStudyUId }
            } )
            .then( (inpacsLogsArr) => {
                if(inpacsLogsArr && Array.isArray(inpacsLogsArr) && inpacsLogsArr.length) {
                    return "EXISTS";
                } else {
                    return createInpacslogEntry( args );
                }
            } )
            .then( (result) => {
                if(result !== 'EXISTS') {
                    Y.log( `checkAndCreate: Inpacslog record created for studyId: ${orthancStudyUId}`, 'info', NAME );
                }
                callback( null, result );
            } )
            .catch( (err) => {
                Y.log( `checkAndCreate: Error while performing operation for studyId: ${orthancStudyUId}`, 'error', NAME );
                callback(err);
            } );
        }

        /*
        * @concurrency Can be executed on multi cluster environment
        *
        * This method is called by REST call. Basically this method does below:
        * 1] Check if the selected patient exists
        * 2] Check if selected activity exists and is not assigned to other studyId
        * 3] Check and modify Dicom Instances:
        *     a] If "modifyDicom" = true, then update ALL DICOM instances of study with patient details in dc-insuite
        *     b] If "modifyDicom" = false, then jump to next step
        * 4] Update Activity(actType = "FINDING" ) with Study details of Orthanc
        * 5] Update InpacsLogEntry document and mark it processed and if "modifyDicom" = true, then also update its studyid and g_extra fields
        *
        * @args {
        *           user: <object>
        *           data: {
        *               patientId: <string>,
        *               activityId: <string>,
        *               inpacsLogEntry: <object selected document of inpacslog collection>,
        *               modifyDicom: <boolean>
        *           }
        *           callback: <function will be called with either error or "null">
        *       }
        * */
        function assignInpacsEntryToActivity( args ) {
            Y.log('Entering Y.doccirrus.api.inpacslog.assignInpacsEntryToActivity', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.assignInpacsEntryToActivity');
            }
            const
                { user, callback, data } = args,
                {patientId, activityId, inpacsLogEntry, modifyDicom} = data;

            let
                selectedPatient,
                selectedActivity;

            if(!patientId || !activityId || !inpacsLogEntry || !inpacsLogEntry.orthancStudyUId) {
                Y.log( `assignInpacsEntryToActivity. Data is missing. data:  ${JSON.stringify( data )}` , 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid input', true ) );
            }
            
            async.waterfall([
                function checkIfPatientExists( waterfallCb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        query: {
                            _id: patientId
                        }
                    }, ( err, patientsArr ) => {
                        if(err) {
                            Y.log(`Error querying patient ID: ${patientId}`, 'error', NAME);
                            waterfallCb( err );
                        } else if(!patientsArr || !Array.isArray(patientsArr) || !patientsArr.length) {
                            Y.log(`Patient Not found for patientId: ${patientId}`, 'warn', NAME);
                            waterfallCb( `Patient Not found for patientId: ${patientId}` );
                        } else {
                            waterfallCb( null, patientsArr[0] );
                        }
                    } );
                },

                function checkIfActivityExists( patient, waterfallCb ) {
                    selectedPatient = patient;

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: {
                            _id: activityId
                        }
                    }, ( err, activityArr ) => {
                        if(err) {
                            Y.log(`Error querying activity ID: ${activityId}`, 'error', NAME);
                            waterfallCb( err );
                        } else if(!activityArr || !Array.isArray(activityArr) || !activityArr.length) {
                            Y.log(`Activity Not found for activityId: ${activityId}`, 'warn', NAME);
                            waterfallCb( `Activity Not found for activityId: ${activityId}` );
                        } else if( activityArr[0].studyId ) {
                            Y.log(`Activity already assigned to studyId: ${activityArr[0].studyId}`, 'warn', NAME);
                            waterfallCb( `Activity already assigned to studyId: ${activityArr[0].studyId}` );
                        } else {
                            waterfallCb( null, activityArr[0] );
                        }
                    } );
                },

                function checkAndModifyDicom( activity, waterfallCb ) {
                    selectedActivity = activity;

                    if( modifyDicom ) {
                        let
                            replace = {
                                AccessionNumber: "modifiedByDcInsuite"
                            },
                            patientDob;

                        //1] Set PatientName
                        if(selectedPatient.lastname) {
                            replace.PatientName = selectedPatient.lastname.toUpperCase();
                        }

                        if(selectedPatient.firstname) {
                            replace.PatientName = replace.PatientName + "^" + selectedPatient.firstname.toUpperCase() + (selectedPatient.middlename ? ( " "+ selectedPatient.middlename.toUpperCase() ) : "");
                        }

                        //2] Set PatientID
                        if(selectedPatient.patientNo) {
                            replace.PatientID = selectedPatient.patientNo;
                        }

                        //3] Set PatientSex
                        if(selectedPatient.gender === "MALE") {
                            replace.PatientSex = "M";
                        } else if(selectedPatient.gender === "FEMALE") {
                            replace.PatientSex = "W";
                        } else {
                            replace.PatientSex = "O";
                        }

                        //4] Set PatientBirthDate
                        patientDob = moment.utc( selectedPatient.kbvDob, "DD.MM.YYYY" );

                        if( patientDob.isValid() ) {
                            //YYYYMMDD
                            replace.PatientBirthDate = `${patientDob.get("year")}` +
                                               ( `${patientDob.get("month") +1}`.length === 1 ? `0${patientDob.get("month") +1}`: `${patientDob.get("month") +1}` ) +
                                               ( `${patientDob.get("date")}`.length === 1 ? `0${patientDob.get("date")}`: `${patientDob.get("date")}` );

                            //57Y
                            replace.PatientAge = moment().diff(patientDob, "years") + "Y";

                        }

                        Y.doccirrus.api.inpacs.modifyStudy({
                            oldStudyId: inpacsLogEntry.orthancStudyUId,
                            replace: replace,
                            callback: waterfallCb
                        });
                    } else {
                        waterfallCb( null, inpacsLogEntry.orthancStudyUId, inpacsLogEntry.g_extra );
                    }
                },

                async function fetchAndSaveKeyImagesToDb(orthancStudyUId, g_extra, waterfallCb) {
                    let
                        activityAttachmentArr = selectedActivity.attachments || [];

                    const [err, result] = await formatPromiseResult(
                                                    Y.doccirrus.api.inpacs.fetchAndSaveKeyImagesToDb({user, orthancStudyUId})
                                                );

                    if( err ) {
                        /**
                         * In error scenario for key image fetching, we just log it as the study is already modified and so we would
                         * update activity with new study details without key images.
                         */
                        Y.log(`assignInpacsEntryToActivity: Error in fetchAndSaveKeyImagesToDb. Error: ${err.stack || err}`, "warn", NAME);
                    } else if( result && result.createdDocumentIdArr.length ) {
                        activityAttachmentArr = [...activityAttachmentArr, ...result.createdDocumentIdArr];
                    }

                    waterfallCb( null, orthancStudyUId, g_extra, activityAttachmentArr);
                },

                function updateActivityWithOrthancStudy( orthancStudyUId, g_extra, attachments, waterfallCb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'put',
                        fields: [ 'studyId', 'g_extra', 'attachments'],
                        query: {
                            _id: activityId
                        },
                        data: Y.doccirrus.filters.cleanDbObject( { studyId: orthancStudyUId, g_extra: g_extra, attachments } )
                    }, function( err ) {
                        if( err ) {
                            Y.log(`Error updating activityId ${activityId} with orthanc studyId: ${orthancStudyUId}`, 'error', NAME);
                            waterfallCb( err );
                        } else {
                            waterfallCb( null, orthancStudyUId, g_extra );
                        }
                    } );
                },

                function updateInpacsLogEntry( orthancStudyUId, g_extra, waterfallCb ) {
                    let
                        putData = {},
                        fields = ['status', 'timestamp', 'activityId', 'patientId'];

                    putData.status = "PROCESSED";
                    putData.timestamp = new Date();
                    putData.activityId = activityId;
                    putData.patientId = patientId;

                    if(user.id !== 'su' && user.U) {
                        putData.user = user.U;
                        fields.push('user');
                    }

                    if( modifyDicom ) {
                        let
                            patientDob;

                        //Set patientName
                        putData.patientName = ( selectedPatient.lastname ? selectedPatient.lastname.toUpperCase() +" " : "" ) +
                                              ( selectedPatient.firstname ? selectedPatient.firstname.toUpperCase() : "" ) +
                                              (selectedPatient.middlename ? ( " "+ selectedPatient.middlename.toUpperCase() ) : "");
                        fields.push('patientName');

                        //Set patientGender
                        fields.push('patientGender');
                        if( selectedPatient.gender && (selectedPatient.gender === "MALE" || selectedPatient.gender === "FEMALE") ) {
                            putData.patientGender = selectedPatient.gender;
                        } else {
                            putData.patientGender = 'UNKNOWN';
                        }

                        //Set patientDob
                        patientDob = moment.utc( selectedPatient.kbvDob, "DD.MM.YYYY" );

                        if( patientDob.isValid() ) {
                            putData.patientDob = patientDob.toDate();
                            fields.push('patientDob');
                        }

                        //Set orthancStudyUId
                        putData.orthancStudyUId = orthancStudyUId;
                        fields.push('orthancStudyUId');

                        //Set g_extra
                        putData.g_extra = g_extra;
                        fields.push('g_extra');
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'inpacslog',
                        action: 'put',
                        query: {
                            _id: inpacsLogEntry._id
                        },
                        data: Y.doccirrus.filters.cleanDbObject( putData ),
                        fields: fields
                    }, ( err ) => {
                        if( err ) {
                            Y.log(`Error while updating inpacslog entry for Id: ${inpacsLogEntry._id}`, 'error', NAME);
                            waterfallCb( err );
                        } else {
                            waterfallCb();
                        }
                    } );
                }
            ], function finalCallback( err ){
                if( err ) {
                    Y.log(`assignInpacsEntryToActivity: Error in operation for Inpacs Log entry Id: ${inpacsLogEntry._id} and orthancStudy Id: ${inpacsLogEntry.orthancStudyUId}`, 'error', NAME);
                    return callback( err );
                }
                callback(  );
            });
        }

        /*
        * Will be called from front end via REST call
        *
        * 1] checkIfInpacsLogExists -> check if it is valid inpacsLog entry
        * 2] checkIfActivityExists -> checks if inpacsLog entry is pointing to correct activity
        * 3] Delete the activity from the database and return success via REST call
        * */
        function revertInpacsEntryFromActivity( args ) {
            Y.log('Entering Y.doccirrus.api.inpacslog.revertInpacsEntryFromActivity', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.revertInpacsEntryFromActivity');
            }
            const
                { user, callback, data } = args,
                {inpacsLogId} = data;

            if( !inpacsLogId ) {
                Y.log('Missing inpacsLogId', 'warn', NAME);
                return callback( Y.doccirrus.errors.rest( 400, 'Missing inpacsLogId', true ) );
            }

            async.waterfall([
                function checkIfInpacsLogExists( waterfallCb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'inpacslog',
                        query: {
                            _id: inpacsLogId
                        }
                    }, ( err, inpacsLogArr ) => {
                        if(err) {
                            Y.log(`Error querying inpacsLogID: ${inpacsLogId}`, 'error', NAME);
                            waterfallCb( err );
                        } else if(!inpacsLogArr || !Array.isArray(inpacsLogArr) || !inpacsLogArr.length) {
                            Y.log(`Inpacslog with ID: ${inpacsLogId} Not found in database`, 'warn', NAME);
                            waterfallCb( `Inpacslog with ID: ${inpacsLogId} Not found in database` );
                        } else if( inpacsLogArr[0].status !== "PROCESSED" || !inpacsLogArr[0].activityId) {
                            Y.log(`Inpacslog with ID: ${inpacsLogId} is not assigned to any activity`, 'warn', NAME);
                            waterfallCb( `Inpacslog with ID: ${inpacsLogId} is not assigned to any activity` );
                        } else if( !inpacsLogArr[0].g_extra ) {
                            Y.log(`Inpacslog with ID: ${inpacsLogId} is missing g_extra metadata`, 'warn', NAME);
                            waterfallCb( `Inpacslog with ID: ${inpacsLogId} is missing g_extra metadata` );
                        } else {
                            waterfallCb( null, inpacsLogArr[0] );
                        }
                    } );
                },

                function checkIfActivityExists( inpacsLog, waterfallCb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: {
                            _id: inpacsLog.activityId
                        }
                    }, ( err, activityArr ) => {
                        if(err) {
                            Y.log(`Error querying activity ID: ${inpacsLog.activityId}`, 'error', NAME);
                            waterfallCb( err );
                        } else if(!activityArr || !Array.isArray(activityArr) || !activityArr.length) {
                            Y.log(`Activity Not found for activityId: ${inpacsLog.activityId}. Unclaiming InpacsLog Id: ${inpacsLog._id.toString()}`, 'warn', NAME);
                            waterfallCb( null, inpacsLog, false );
                        } else if( activityArr[0].actType !== "FINDING" ) {
                            Y.log(`Cannot delete activity of type ${activityArr[0].actType} for activityId: ${inpacsLog.activityId}`, 'warn', NAME);
                            waterfallCb( `Cannot delete activity of type ${activityArr[0].actType} for activityId: ${inpacsLog.activityId}` );
                        } else if( !activityArr[0].studyId ) {
                            Y.log(`ActivityId: ${inpacsLog.activityId} is not assigned to any inpacs study`, 'warn', NAME);
                            waterfallCb( `ActivityId: ${inpacsLog.activityId} is not assigned to any inpacs study` );
                        } else if( activityArr[0].studyId !== inpacsLog.orthancStudyUId && activityArr[0].studyId !== inpacsLog.g_extra.AccessionNumber ) {
                            Y.log(`Activity is assigned to different studyId: ${activityArr[0].studyId}`, 'warn', NAME);
                            waterfallCb( `Activity is assigned to different studyId: ${activityArr[0].studyId}` );
                        } else if( activityArr[0].status !== "VALID" ) {
                            Y.log(`Cannot delete ActivityId: ${inpacsLog.activityId} with status: ${activityArr[0].status}`, 'warn', NAME);
                            waterfallCb( `Cannot delete ActivityId: ${inpacsLog.activityId} with status: ${activityArr[0].status}` );
                        } else {
                            waterfallCb( null, inpacsLog, true );
                        }
                    } );
                },

                function deleteActivityFromDb( inpacsLog, activityFound,  waterfallCb ) {
                    if( activityFound ) {
                        Y.doccirrus.api.activity.delete({
                            user,
                            query: { _id: inpacsLog.activityId },
                            callback: ( err, result ) => {
                                if(err) {
                                    Y.log(`Error deleting activity with Id: ${inpacsLog.activityId}`, 'error', NAME);
                                    waterfallCb( err );
                                } else if( !result || !result[0] || !result[0].data ) {
                                    Y.log(`Failed to delete activity with Id: ${inpacsLog.activityId}`, 'error', NAME);
                                    waterfallCb( `Failed to delete activity with Id: ${inpacsLog.activityId}` );
                                } else {
                                    waterfallCb( null, inpacsLog, activityFound );
                                }
                            }
                        });
                    } else {
                        waterfallCb( null, inpacsLog, activityFound );
                    }
                },

                function unclaimInpacsLog( inpacsLog, activityFound, waterfallCb ) {
                    if( !activityFound ) {
                        let
                            setData = {},
                            unsetData = { activityId: 1, patientId: 1 };

                        //Update the user who did this action
                        if(user.id !== 'su' && user.U) {
                            setData.user = user.U;
                        }

                        //Update the timestamp
                        setData.timestamp = new Date();

                        //Reset the status of document
                        setData.status = "UNPROCESSED";

                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'inpacslog',
                            query: { _id: inpacsLog._id.toString() },
                            data: { $set: setData, $unset: unsetData }
                        }, ( err, result ) => {
                            if( err ) {
                                Y.log(`Error updating inpacsLog with Id: ${inpacsLog._id.toString()}`, 'error', NAME);
                                waterfallCb( err );
                            } else if( !result || !result.n ) {
                                Y.log(`Failed to unclaim inpacsLog Id: ${inpacsLog._id.toString()}`, "error", NAME);
                                waterfallCb( `Failed to unclaim inpacsLog Id: ${inpacsLog._id.toString()}` );
                            } else {
                                waterfallCb( null, "RELOAD" );
                            }
                        } );
                    } else {
                        waterfallCb( null, "DO_NOT_RELOAD");
                    }
                }

            ], function finalCallback( err, result ) {
                if(err) {
                    Y.log(`revertInpacsEntryFromActivity: Error reverting inpacsLogId: ${inpacsLogId} Error: ${err}`, 'error', NAME);
                    return callback( err );
                }
                Y.log(`revertInpacsEntryFromActivity: Successfully reverted inpacsLogId: ${inpacsLogId}`, 'info', NAME);
                callback( null, result );
            });
        }

        /*
        * Will be called from DELETE post process of activity
        * */
        function unclaimInpacsLogEntry( args ) {
            Y.log('Entering Y.doccirrus.api.inpacslog.unclaimInpacsLogEntry', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.unclaimInpacsLogEntry');
            }
            const
                { user, callback, data } = args,
                {activityId} = data;

            if( !activityId ) {
                Y.log( `Missing activityId`, 'warn', NAME );
                return callback( `Missing activityId` );
            }

            Y.log(`unclaimInpacsLogEntry: Unclaiming any relevant inpacsLog for activityId: ${activityId}...`, 'info', NAME);

            async.waterfall([
                function queryInpacsLogEntry( waterfallCb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'inpacslog',
                        query: {
                            activityId: activityId
                        }
                    }, ( err, inpacsLogArr ) => {
                        if(err) {
                            Y.log(`Error querying inpacsLog with activityId: ${activityId}`, 'error', NAME);
                            waterfallCb( err );
                        } else if(!inpacsLogArr || !Array.isArray(inpacsLogArr) || !inpacsLogArr.length) {
                            Y.log(`No inpacsLog entry found for activityId: ${activityId}`, 'info', NAME);
                            waterfallCb( 'NOT_FOUND' );
                        } else if( inpacsLogArr.length > 1 ) {
                            Y.log(`Multiple inpacsLog entries found in DB for activityId: ${activityId} Expected just 1`, 'error', NAME);
                            waterfallCb( `Multiple inpacsLog entries found in DB for activityId: ${activityId} Expected just 1` );
                        }  else {
                            waterfallCb( null, inpacsLogArr[0] );
                        }
                    } );
                },

                function unclaimInpacsLog( inpacsLog, waterfallCb ) {
                    let
                        setData = {},
                        unsetData = { activityId: 1, patientId: 1 };

                    //Update the user who did this action
                    if(user.id !== 'su' && user.U) {
                        setData.user = user.U;
                    }

                    //Update the timestamp
                    setData.timestamp = new Date();

                    //Reset the status of document
                    setData.status = "UNPROCESSED";

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'inpacslog',
                        query: { _id: inpacsLog._id.toString() },
                        data: { $set: setData, $unset: unsetData }
                    }, ( err, result ) => {
                        if( err ) {
                            Y.log(`Error updating inpacsLog with Id: ${inpacsLog._id.toString()}`, 'error', NAME);
                            waterfallCb( err );
                        } else if( !result || !result.n ) {
                            Y.log(`Failed to unclaim inpacsLog Id: ${inpacsLog._id.toString()}`, "error", NAME);
                            waterfallCb( `Failed to unclaim inpacsLog Id: ${inpacsLog._id.toString()}` );
                        } else {
                            waterfallCb( null, result );
                        }
                    } );
                }

            ], function finalCallback( err, result ) {
                if( err === "NOT_FOUND" ) {
                    return callback( null, "NOT_FOUND" ); //Just reply not found
                }
                if( err ) {
                    Y.log(`unclaimInpacsLogEntry: Error in operation: ${err}`, 'error', NAME);
                    return callback( err );
                }
                Y.log( `unclaimInpacsLogEntry: Successfully unclaimed inpacsLog record from activityId: ${activityId} `, 'info', NAME );
                callback( null, result );
            });
        }

        /*
        * Expected to be called from Websocket because in case if it takes long time for reading too many study entries from Orthanc
        * then we do not want the request to timeout and call itself again (mojito calls the API again if it is not served in 45 seconds)
        * */
        function getDataFromOrthanc( args ) {
            Y.log('Entering Y.doccirrus.api.inpacslog.getDataFromOrthanc', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.getDataFromOrthanc');
            }
            const
                { user, callback } = args;

            /*
            * 1] getAllStudiesFromOrthanc -> query all the studyIds from Orthanc as insuite befund = study of Orthanc
            * 2] checkStudiesAndCreateInpacsLogEntries -> If inpacs log is not created for a study then create one in DB
            * */
            async.waterfall([

                function getAllStudiesFromOrthanc( waterfallCb ) {
                    Y.doccirrus.api.inpacs.getAllStudiesFromOrthanc( waterfallCb );
                },

                function checkStudiesAndCreateInpacsLogEntries( studiesUIDArr, waterfallCb ) {
                    /*
                    * Process each study
                    * */
                    async.eachSeries( studiesUIDArr, function processSingleStudy( studyUID, eachCb ) {
                        /*
                        * 1] checkIfInpacsLogExistsForStudy -> If inpacslogs collection has this study then skip else process
                        * 2] getStudyMetaFromOrthanc -> Query study METADATA from Orthanc via REST call
                        * 3] checkIfActivityExistsForStudy -> Determine if this study is external or not
                        * 4] getGExtraForStudyId -> Get simplified tags for one of the instance of study from Orthan via REST call
                        * 5] checkAndCreateInpacsLogEntry -> Create inpacslog entry in DB based on previous queried information
                        *      if study is already in activities collection then mark inpacslog as external false and status as processed
                        *      else create inpacslog entry in db as external true and mark the status as unprocessed
                        * */
                        async.waterfall( [
                            function checkIfInpacsLogExistsForStudy( studyCb ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'inpacslog',
                                    query: {
                                        orthancStudyUId: studyUID
                                    }
                                }, ( err, inpacsLogArr ) => {
                                    if(err) {
                                        Y.log(`getDataFromOrthanc: Error querying inpacsLog with orthancStudyUId: ${studyUID}. Error: ${err.stack || err}`, 'error', NAME);
                                        studyCb( err );
                                    } else if( inpacsLogArr && Array.isArray(inpacsLogArr) && inpacsLogArr.length) {
                                        studyCb( "INPACSLOG_FOUND" ); //Everything is recorded in DB, can skip this
                                    }  else {
                                        Y.log(`Inpacslog with orthancStudyUId: ${studyUID} Not found in database. Need to create one...`, 'info', NAME);
                                        studyCb();
                                    }
                                } );
                            },

                            function getStudyMetaFromOrthanc( studyCb ) {
                                Y.doccirrus.api.inpacs.getStudyMetaFromStudyId( studyUID, studyCb );
                            },

                            function checkIfActivityExistsForStudy( studyMetaData, studyCb ) {
                                let
                                    studyIdArr = [ studyMetaData.ID ];

                                if( studyMetaData.MainDicomTags && studyMetaData.MainDicomTags.AccessionNumber ) {
                                    studyIdArr.push( studyMetaData.MainDicomTags.AccessionNumber );
                                }

                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'activity',
                                    action: 'get',
                                    query: { studyId: {$in: studyIdArr} },
                                    options: {
                                        sort: {
                                            _id: 1
                                        }
                                    }
                                }, ( err, activityArr ) => {
                                    if(err) {
                                        Y.log(`getDataFromOrthanc: Error querying activity for query: ${JSON.stringify(studyIdArr)} Error: ${err.stack || err}`, 'error', NAME);
                                        studyCb( err );
                                    } else if(!activityArr || !Array.isArray(activityArr) || !activityArr.length) {
                                        Y.log(`Activity Not found for query: ${JSON.stringify(studyIdArr)}`, 'info', NAME);
                                        studyCb( null, "NO_ACTIVITY_FOUND", studyMetaData );
                                    }  else {
                                        studyCb( null, activityArr, studyMetaData );
                                    }
                                } );
                            },

                            function getGExtraForStudyId( activityArr, studyMetaData, studyCb ) {
                                Y.doccirrus.api.inpacs.getGExtraForStudyId( studyUID, studyMetaData.ParentPatient, ( err,  g_extra) => {
                                    if( err ) {
                                        studyCb( err );
                                    } else if( !g_extra ) {
                                        studyCb( "NO_INSTANCE_FOUND" );
                                    } else {
                                        studyCb( null, activityArr, studyMetaData, g_extra );
                                    }
                                } );
                            },

                            function checkAndCreateInpacsLogEntry( activityArr, studyMetaData, g_extra, studyCb ) {
                                Promise.resolve()
                                .then( () => {
                                    if( activityArr === "NO_ACTIVITY_FOUND" ) {
                                        return createInpacslogEntry( {
                                                    user,
                                                    data: {
                                                        studyMetaData,
                                                        g_extra,
                                                        external: true
                                                    }
                                                } );
                                    } else {
                                        let
                                            inpacsLogData = {studyMetaData, g_extra, external: false},
                                            foundActivity;

                                        if( activityArr.length === 1 ) {
                                            foundActivity = activityArr[0];
                                        } else {
                                            //Should ideally never come here in this condition
                                            let
                                                correctActivity = activityArr.filter( (item) => {
                                                    if( item.g_extra && item.g_extra.orthancStudyUId ) {
                                                        if( item.g_extra.orthancStudyUId === g_extra.orthancStudyUId ) {
                                                            return true;
                                                        } else {
                                                            return false;
                                                        }
                                                    } else if( item.g_extra && item.g_extra.StudyInstanceUID === g_extra.StudyInstanceUID ) {
                                                        return true;
                                                    } else {
                                                        return false;
                                                    }
                                                } );

                                            if( correctActivity.length === 1 ) {
                                                foundActivity = correctActivity[0];
                                            } else if( correctActivity.length > 1 ) {
                                                //Should ideally never come here in this condition
                                                Y.log(`getDataFromOrthanc: Multiple activities found for orthancStudyUId: ${g_extra.orthancStudyUId} Expected only 1. Picking oldest one..`, "warn", NAME);

                                                //Pick the oldest (which could possibly be original one which was later copied) one in case the activity was copied
                                                foundActivity = correctActivity[0];
                                            } else {
                                                //Should ideally never come here in this condition
                                                Y.log(`getDataFromOrthanc: No activity matched "g_extra.orthancStudyUId" = ${g_extra.orthancStudyUId}`, "warn", NAME);
                                                // inpacsLogData.external = true;
                                            }
                                        }

                                        if( foundActivity && foundActivity.g_extra && foundActivity.g_extra.orthancStudyUId ) {
                                            if( foundActivity.g_extra.orthancStudyUId === g_extra.orthancStudyUId ) {
                                                inpacsLogData.activityId = foundActivity._id.toString();
                                                inpacsLogData.patientId = foundActivity.patientId;
                                            }
                                        } else if( foundActivity && foundActivity.g_extra && (foundActivity.g_extra.StudyInstanceUID === g_extra.StudyInstanceUID) ) {
                                            inpacsLogData.activityId = foundActivity._id.toString();
                                            inpacsLogData.patientId = foundActivity.patientId;
                                        }

                                        return createInpacslogEntry( {
                                            user,
                                            data: inpacsLogData
                                        } );
                                    }
                                } )
                                .then( () => {
                                    Y.log(`checkAndCreateInpacsLogEntry: InpacsLogEntry Created for orthancStudyUID: ${studyUID}`, 'info', NAME);
                                    studyCb();
                                } )
                                .catch( (err) => {
                                    Y.log(`checkAndCreateInpacsLogEntry: Error creating InpacsLogEntry for orthancStudyUID: ${studyUID} Error: ${err} `, 'error', NAME);
                                    studyCb( err );
                                } );
                            }
                        ], ( err ) => {
                            if( err === "INPACSLOG_FOUND" ) {
                                Y.log( `getDataFromOrthanc: InpacsLogFound for orthancStudyUId: ${studyUID} Skipping....`, 'info', NAME );
                                eachCb();
                            } else if( err === "NO_INSTANCE_FOUND" ) {
                                Y.log(`getDataFromOrthanc: orthancStudyUId: ${studyUID} does not have any instances Skipping...`, 'warn', NAME);
                                eachCb();
                            } else if( err ) {
                                eachCb( err );
                            } else {
                                Y.log( `getDataFromOrthanc: Created InpacsLogEntry for orthancStudyUId: ${studyUID}`, 'info', NAME );
                                eachCb();
                            }
                        } );
                    }, waterfallCb );
                }

            ], function finalCallback( err ) {
                if( err ) {
                    Y.log( `getDataFromOrthanc: Error in operation. Error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                Y.log(`getDataFromOrthanc: Successfully queried all data from orthanc`);
                callback();
            });
        }

        function GET( args ) {
            if( args.query && args.query['g_extra.StudyDate'] && args.query['g_extra.StudyDate'].$regex && args.query['g_extra.StudyDate'].$regex.source) {
                try{
                    /* g_extra.StudyDate is a String with format YYYYMMDD. on UI the user will type date as DD.MM.YYYY
                    *  So precisely we do below:
                    *  1] Source.replace(/[^0-9.]/g, "") -> this would remove everything except number and "." ex: 12\.22\.1999 = 12.22.1999
                    *  2] split(".").reverse().join("") -> this would split on "." and then we just reverse the array and join. ex 19992212
                    *  3] We create RegExp out of this ex. /19992212/i
                    * */
                    let
                        formattedTextDate = args.query['g_extra.StudyDate'].$regex.source.replace(/[^0-9.]/g, "").split(".").reverse().join("");

                    args.query['g_extra.StudyDate'].$regex = new RegExp(formattedTextDate, "i");
                } catch( err ) {
                    //We do nothing and allow the operation to proceed
                    Y.log('Error formating input text to orthanc accepted text string', 'debug', NAME);
                }
            }

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: args.model,
                user: args.user,
                query: args.query,
                options: args.options
            }, args.callback );
        }
    async function checkAndFixPatientNoInOrthanc(args) {//jshint ignore:line
            Y.log('Entering Y.doccirrus.api.inpacslog.checkAndFixPatientNoInOrthanc', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.checkAndFixPatientNoInOrthanc');
            }

            const
                {user, callback, data} = args,
                showChanges = data && data.showChanges,
                ObjectId = require('mongoose').Types.ObjectId;

            callback(null, "API Started. Please look for key='checkAndFixPatientNoInOrthanc' in the logs to monitor progress of the API"); //eslint-disable-line callback-return

            if( !showChanges ) {
                console.time("checkAndFixPatientNoInOrthanc -> time taken"); //eslint-disable-line no-console
                Y.log(`checkAndFixPatientNoInOrthanc: MIGRATION started`, "info", NAME);
            }

            let
                err,
                result,
                studiesUIDArr,
                patIdWithZeroToStudyId = {},
                activityModel,
                finalResult = { totalStudiesUpdated: 0, incorrectAssignment: [] },
                changesResult = { changesInCsvFormat: ["PatientNo", "LastName", "FirstName", "DOB", "totalDicomInstances"].join(",")+"\n", patient: {} },
                regex = /^[0]{1,}/;

            try{
                //------- 1. get all studyUID's from Orthanc ----------------
                [err, result] =  await formatPromiseResult(  //jshint ignore:line
                                         new Promise( (resolve, reject) =>{
                                            Y.doccirrus.api.inpacs.getAllStudiesFromOrthanc( ( err, res ) => {
                                                if( err ) {
                                                    reject( err );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                         })
                                       );

                if( err ) {
                    Y.log( `checkAndFixPatientNoInOrthanc: Error getting all study IDs from orthanc ${err}`, 'error', NAME );
                    throw "IGNORE";
                }

                studiesUIDArr = result;

                if( !studiesUIDArr || !Array.isArray( studiesUIDArr ) || !studiesUIDArr.length ) {
                    Y.log( `checkAndFixPatientNoInOrthanc: No study found in Orthanc DB. Nothing to do...`, 'info', NAME );
                    return;
                }

                //------------ 2. Get activity model so that we can use it later to update activity -----------------
                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        new Promise((resolve, reject) => {
                                            Y.doccirrus.mongodb.getModel( user, 'activity', (err, model) => {
                                                if( err ) {
                                                    reject(err);
                                                } else {
                                                    resolve(model);
                                                }
                                            } );
                                        })
                                      );

                if( err ) {
                    Y.log(`checkAndFixPatientNoInOrthanc: Error getting activity collection model. Error: ${err}`, "error", NAME);
                    throw "IGNORE";
                }

                activityModel = result;

                /*
                * ----------- 3. Populate patIdWithZeroToStudyId with below structure:
                * {
                *   <patientNoWithZero "000022"> : [ -> this means a patient number as keys and all its orthanc study UID's (paired with AccessionNumber)
                *       [ orthancStudyUID, AccessionNumber ],
                *       [ orthancStudyUID, AccessionNumber ]
                *       ...
                *   ],
                *   <patientNoWithZero "000001"> : [
                *       [ orthancStudyUID, AccessionNumber ],
                *       [ orthancStudyUID, AccessionNumber ]
                *       ...
                *   ]
                *   ...
                * }
                */
                /* jshint -W083 */
                for( let studyId of studiesUIDArr ) {
                    [err, result] = await formatPromiseResult(  //jshint ignore:line
                                            new Promise( (resolve, reject) => {
                                                Y.doccirrus.api.inpacs.getStudyMetaFromStudyId( studyId, ( err, res ) => {
                                                    if( err ) {
                                                        reject( err );
                                                    } else {
                                                        resolve( res );
                                                    }
                                                } );
                                            } )
                                          );

                    if( err ) {
                        Y.log(`checkAndFixPatientNoInOrthanc: Error getting metaData of studyId: ${studyId}. Error: ${err}`, 'error', NAME);
                        throw "IGNORE";
                    }

                    if( result && result.PatientMainDicomTags && result.PatientMainDicomTags.PatientID && !isNaN(result.PatientMainDicomTags.PatientID) ) {
                        if( result.PatientMainDicomTags.PatientID.match(regex) ) {
                            // means this patientID is with leading 0
                            if( patIdWithZeroToStudyId[result.PatientMainDicomTags.PatientID] ) {
                                patIdWithZeroToStudyId[result.PatientMainDicomTags.PatientID].push([result.ID, result.MainDicomTags && result.MainDicomTags.AccessionNumber ].filter(Boolean));
                            } else {
                                patIdWithZeroToStudyId[result.PatientMainDicomTags.PatientID] = [ [result.ID, result.MainDicomTags && result.MainDicomTags.AccessionNumber ].filter(Boolean) ]; // result.ID == studyId
                            }
                        }
                    }
                }

                // -------------------------- 4. Process each patientID key under patIdWithZeroToStudyId-----------
                for( let PatientID of Object.keys(patIdWithZeroToStudyId) ) {
                    let
                        studyQueryArr = patIdWithZeroToStudyId[PatientID];

                    if( !showChanges ) {
                        Y.log( `checkAndFixPatientNoInOrthanc: Processing Orthanc PatientID: ${PatientID} with ${studyQueryArr.length} Studies`, "info", NAME );
                    }
                    // ---------------------- 5. Process each study of patient from Orthanc. studyQuery = [orthancStudyID, AccessionNumber]------------
                    for( let studyQuery of studyQueryArr ) {
                        let
                            activity,
                            inpacsLog,
                            patient,
                            studyUID = studyQuery[0],
                            replaceDicom = {
                                AccessionNumber: "modifiedByDcInsuite"
                            },
                            newOrthancStudyUID,
                            new_g_extra;

                        // --------------------- 6. Query and save inpacsLog for Orthanc studyUID for later use --------
                        [err, result] = await formatPromiseResult( //jshint ignore:line
                                                Y.doccirrus.mongodb.runDb( {
                                                    user: user,
                                                    model: 'inpacslog',
                                                    action: 'get',
                                                    query: { orthancStudyUId: studyUID }
                                                } )
                                              );

                        if( err ) {
                            Y.log( `checkAndFixPatientNoInOrthanc: Error querying inpacsLog for orthancStudyUId: ${studyUID}. Error: ${err}`, 'error', NAME );
                            throw "IGNORE";
                        }

                        if( !result || !Array.isArray(result) || !result.length ) {
                            Y.log( `checkAndFixPatientNoInOrthanc: inpacsLog not found in DB for orthancStudyUId: ${studyUID}. Skipping..`, 'info', NAME );
                            continue;
                        }

                        if( !result[0].activityId ) {
                            Y.log(`checkAndFixPatientNoInOrthanc: inpacsLogId: ${result[0]._id.toString()} with orthancStudyUId: ${studyUID} is NOT assigned to any activity. Skipping...`,"info", NAME);
                            continue;
                        }

                        inpacsLog = result[0];

                        // ------------------ 7. Query activity ------------------------------------------
                        [err, result] = await formatPromiseResult( //jshint ignore:line
                                                Y.doccirrus.mongodb.runDb( {
                                                    user: user,
                                                    model: 'activity',
                                                    action: 'get',
                                                    query: { _id: inpacsLog.activityId }
                                                } )
                                              );

                        if( result && Array.isArray(result) && result.length ) {
                            activity = result[0];
                        } else {
                            Y.log(`checkAndFixPatientNoInOrthanc: activity with _id: ${inpacsLog.activityId} pointed by inpacsLogId: ${inpacsLog._id.toString()} DOES NOT EXIST`,"warn", NAME);
                        }

                        // If activity does not exist then no need to process because the study itself is unassigned
                        if( activity ) {
                            // ---------------- 8. Query patient to which activity is pointing to ----------------
                            [err, result] = await formatPromiseResult( //jshint ignore:line
                                                    Y.doccirrus.mongodb.runDb( {
                                                        user: user,
                                                        model: 'patient',
                                                        action: 'get',
                                                        query: {
                                                            _id: activity.patientId
                                                        }
                                                    })
                                                  );

                            if( err ) {
                                Y.log( `checkAndFixPatientNoInOrthanc: Error querying patient ID: ${activity.patientId}. Error: ${err}`, "error", NAME );
                                throw "IGNORE";
                            }

                            if( result && Array.isArray(result) && result.length ) {
                                patient = result[0]; // We expect patient always
                            } else {
                                //should never come here
                                Y.log(`checkAndFixPatientNoInOrthanc: Patient ID: ${activity.patientId} not found in DB. OrthancStudyId: ${studyUID}. ActivityId: ${activity._id.toString()}`, "warn", NAME);
                            }

                            // -------------------- 9. Process only if Orthanc PatientId !== patientNo of dc-insuite
                            if( patient && patient.patientNo && patient.patientNo !== PatientID ) {
                                if( PatientID.replace(regex,"") !== patient.patientNo ) {
                                    //Means even after removing leading zeros if no match then DICOM instances were not overridden with correct patient details at the time of assignment to activity via inPacsBuch
                                    finalResult.incorrectAssignment.push({insuitePatientNo: patient.patientNo, orthancPatientId: PatientID, dbPatientId: patient._id.toString(), activityId: activity._id.toString()});
                                    Y.log(`checkAndFixPatientNoInOrthanc: dc-insuite PATIENT NO: ${patient.patientNo} !== Orthanc patientId ${PatientID} even without leading zeros. StudyId: ${studyUID}. PatientId: ${patient._id.toString()}. ActivityId: ${activity._id.toString()}`,"warn", NAME);
                                    continue;
                                }

                                if( showChanges ) {
                                    let
                                        noOfInstances;

                                    //Means we only want to log what could change without actually changing anything
                                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                                            new Promise((resolve, reject) => {
                                                                Y.doccirrus.api.inpacs.getAllInstancesByStudyId( studyUID, (err, res) => {
                                                                    if(err) {
                                                                        reject(err);
                                                                    } else {
                                                                        resolve(res);
                                                                    }
                                                                } );
                                                            })
                                                          );

                                    if( err ) {
                                        Y.log(`checkAndFixPatientNoInOrthanc: Error in getAllInstancesByStudyId for studyUID: ${studyUID}. Error: ${err} `, "error", NAME);
                                        throw "IGNORE";
                                    }

                                    if( changesResult.patient[PatientID] ) {
                                        changesResult.patient[PatientID].noOfInstances = changesResult.patient[PatientID].noOfInstances + result.length;
                                    } else {
                                        noOfInstances = result.length;

                                        [err, result] = await formatPromiseResult(  //jshint ignore:line
                                                                new Promise( (resolve, reject) => {
                                                                    Y.doccirrus.api.inpacs.getStudyMetaFromStudyId( studyUID, ( err, res ) => {
                                                                        if( err ) {
                                                                            reject( err );
                                                                        } else {
                                                                            resolve( res );
                                                                        }
                                                                    } );
                                                                } )
                                                              );

                                        if( err ) {
                                            Y.log(`checkAndFixPatientNoInOrthanc: Error in getStudyMetaFromStudyId for studyUID: ${studyUID}. Error: ${err} `, "error", NAME);
                                            throw "IGNORE";
                                        }

                                        changesResult.patient[PatientID] = {PatientID: PatientID};

                                        if( result && result.PatientMainDicomTags ) {
                                            if( result.PatientMainDicomTags.PatientName ) {
                                                changesResult.patient[PatientID].lastName = result.PatientMainDicomTags.PatientName.split("^")[0] ? result.PatientMainDicomTags.PatientName.split("^")[0] : "" ;
                                                changesResult.patient[PatientID].firstName = result.PatientMainDicomTags.PatientName.split("^")[1] ? result.PatientMainDicomTags.PatientName.split("^")[1] : "" ;
                                            } else {
                                                changesResult.patient[PatientID].lastName = "";
                                                changesResult.patient[PatientID].firstName = "";
                                            }

                                            changesResult.patient[PatientID].dob =  result.PatientMainDicomTags.PatientBirthDate ? result.PatientMainDicomTags.PatientBirthDate : "" ;
                                            changesResult.patient[PatientID].noOfInstances = noOfInstances;
                                        } else {
                                            changesResult.patient[PatientID].lastName = "";
                                            changesResult.patient[PatientID].firstName = "";
                                            changesResult.patient[PatientID].dob = "";
                                            changesResult.patient[PatientID].noOfInstances = noOfInstances;
                                        }
                                    }

                                    continue;
                                }

                                //Means if patient number is changed i.e. leading zeros removed
                                replaceDicom.PatientID = patient.patientNo;

                                // --------------------- 10. Modify all DICOM instances of current Orthanc study with upated "PatientID" (leading zeros removed)
                                [err, result] = await formatPromiseResult( //jshint ignore:line
                                                        new Promise( (resolve, reject) => {
                                                            Y.doccirrus.api.inpacs.modifyStudy({
                                                                oldStudyId: studyUID,
                                                                replace: replaceDicom,
                                                                callback( err, newOrthancStudyUID, new_g_extra ) {
                                                                    if( err ) {
                                                                        reject(err);
                                                                    } else {
                                                                        resolve({newOrthancStudyUID, new_g_extra});
                                                                    }
                                                                }
                                                            });
                                                        } )
                                                      );

                                if( err ) {
                                    Y.log(`checkAndFixPatientNoInOrthanc: Error while modifying DICOM with studyId: ${studyUID}. Error: ${err}`, "error", NAME);
                                    throw "IGNORE";
                                }

                                newOrthancStudyUID = result.newOrthancStudyUID;
                                new_g_extra = result.new_g_extra;

                                //-------------- 11. Update ACTIVITY via using native mongodb node.js driver api so that pre/post processes are not called
                                [err, result] = await formatPromiseResult( //jshint ignore: line
                                                        activityModel.mongoose.collection.updateOne({_id: ObjectId(activity._id.toString())}, {$set: {studyId : newOrthancStudyUID, g_extra: new_g_extra} })
                                                      );

                                if( err ) {
                                    Y.log(`checkAndFixPatientNoInOrthanc: Error while updating activityId: ${activity._id.toString()} with new with orthanc studyId: ${newOrthancStudyUID}. Error: ${err}`, 'error', NAME);
                                    throw "IGNORE";
                                } else if( !result || !result.result || result.result.n !== 1 ) {
                                    Y.log(`checkAndFixPatientNoInOrthanc: Failed to update activityId: ${activity._id.toString()} with new with orthanc studyId: ${newOrthancStudyUID} and g_extra`, 'error', NAME);
                                    throw "IGNORE";
                                }

                                // --------------------- CHECK AND UPDATE any copied BEFUND with new study details-----------
                                // We are checking whether BEFUND was copied. If yes then we updated those references with new study details
                                [err, result] = await formatPromiseResult( //jshint ignore:line
                                                        activityModel.mongoose.collection.updateMany({"g_extra.orthancStudyUId": studyUID}, {$set: {studyId : newOrthancStudyUID, g_extra: new_g_extra} })
                                                      );

                                if( err ) {
                                    Y.log(`checkAndFixPatientNoInOrthanc: Error while checking and updating new Orthanc study details to any copied BEFUND for g_extra.orthancStudyUId: ${studyUID}. Error: ${err.stack || err}`, 'error', NAME);
                                    throw "IGNORE";
                                }

                                // --------------- 12. Update inpacsLog entry with newOrthancStudyUID and new_g_extra---------
                                [err, result] = await formatPromiseResult( //jshint ignore:line
                                                        Y.doccirrus.mongodb.runDb( {
                                                            user: user,
                                                            model: 'inpacslog',
                                                            action: 'put',
                                                            query: {
                                                                _id: inpacsLog._id.toString()
                                                            },
                                                            data: Y.doccirrus.filters.cleanDbObject( {orthancStudyUId: newOrthancStudyUID, g_extra: new_g_extra} ),
                                                            fields: [ 'orthancStudyUId', 'g_extra']
                                                        })
                                                      );

                                if( err ) {
                                    Y.log(`checkAndFixPatientNoInOrthanc: Error while updating inpacslogID: ${inpacsLog._id.toString()} with new with orthanc studyId: ${newOrthancStudyUID}. Old StudyId: ${studyUID} Error: ${err}`, 'error', NAME);
                                    throw "IGNORE";
                                }

                                // ---------------- 13. Record results -------------------------------------
                                finalResult.totalStudiesUpdated = finalResult.totalStudiesUpdated + 1;
                                if( finalResult[PatientID] ) {
                                    finalResult[PatientID].push( {newPatientNo: patient.patientNo, oldStudyUID: studyUID, newStuddyUID: newOrthancStudyUID } );
                                } else {
                                    finalResult[PatientID] = [ {newPatientNo: patient.patientNo, oldStudyUID: studyUID, newStuddyUID: newOrthancStudyUID } ];
                                }

                                Y.log(`checkAndFixPatientNoInOrthanc: UPDATED DICOM -> PatientNo: ${PatientID} to ${patient.patientNo} and oldStudyId: ${studyUID} to newStudyId: ${newOrthancStudyUID}`, "info", NAME);

                                // ------------- 14. Add a delay of 5 seconds to allow Orthanc to cool down------
                                await new Promise((resolve)=>{ //jshint ignore:line
                                    setTimeout(()=>{
                                        resolve();
                                    }, 5000);
                                });
                            }
                        }
                    }

                    if( !showChanges ) {
                        Y.log(`checkAndFixPatientNoInOrthanc: Processing COMPLETED for Orthanc PatientID: ${PatientID}. ${finalResult[PatientID] ? finalResult[PatientID].length : 0} studies updated`, "info", NAME);
                    }
                }

                finalResult.operationCompleted = true;
            } catch( err ) {
                if( err === "IGNORE" ) {
                    Y.log(`checkAndFixPatientNoInOrthanc: Operation interrupted`, 'error', NAME);
                } else {
                    Y.log(`checkAndFixPatientNoInOrthanc: Exception in operation. ${err}`, 'error', NAME);
                }

                finalResult.operationCompleted = false;
            }

            if( showChanges ) {
                for( let patId of Object.keys(changesResult.patient) ) {
                    changesResult.changesInCsvFormat = changesResult.changesInCsvFormat + changesResult.patient[patId].PatientID + "," + changesResult.patient[patId].lastName + "," + changesResult.patient[patId].firstName + "," + changesResult.patient[patId].dob + "," + changesResult.patient[patId].noOfInstances + "\n";
                }
                console.log(`checkAndFixPatientNoInOrthanc: changes in CSV format are as below: \n${changesResult.changesInCsvFormat}`); //eslint-disable-line no-console
            } else {
                Y.log(`checkAndFixPatientNoInOrthanc: OPERATION result. Total of ${finalResult.totalStudiesUpdated} studies migrated. Details below..`, "info", NAME);
                console.log("checkAndFixPatientNoInOrthanc: Stats: ", JSON.stringify(finalResult, null, 2)); //eslint-disable-line no-console
                Y.log(`checkAndFixPatientNoInOrthanc: MIGRATION ended..`, "info", NAME);
                console.timeEnd("checkAndFixPatientNoInOrthanc -> time taken"); //eslint-disable-line no-console
            }
        }
    async function getPatientsInstanceCount(args) {
            Y.log('Entering Y.doccirrus.api.inpacslog.getPatientsInstanceCount', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.getPatientsInstanceCount');
            }

            const
                {callback, data} = args;

            let
                err,
                result,
                patientNo = data && data.patientNo,
                finalResult = ["PatientNo", "LastName", "FirstName", "DOB", "totalDicomInstances"].join(",")+"\n",
                patientsUIDArr;
            [err, result] = await formatPromiseResult( //jshint ignore: line
                                    new Promise((resolve, reject) => {
                                        Y.doccirrus.api.inpacs.getAllPatientsFromOrthanc( ( err, res ) => {
                                            if( err ) {
                                                reject( err );
                                            } else {
                                                resolve( res );
                                            }
                                        } );
                                    })
                                  );

            if(err) {
                Y.log(`getPatientsInstanceCount: Error while getting ALL patientUIDs from Orthanc: ${err}`, "error", NAME);
                if( callback ) {
                    return callback(err);
                } else {
                    throw err;
                }
            }

            patientsUIDArr = result;

            if( !patientsUIDArr || !Array.isArray( patientsUIDArr ) || !patientsUIDArr.length ) {
                Y.log( `getPatientsInstanceCount: No patient found in Orthanc DB. Nothing to do...`, 'info', NAME );
                if(callback) {
                    return callback( null, "No patient found in Orthanc DB. Nothing to do..." );
                } else {
                    return "PATIENT_NOT_FOUND";
                }
            }

            /* jshint -W083 */
            for( let patientUID of patientsUIDArr ) {
                let
                    patientDetails;

                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        new Promise((resolve, reject) => {
                                            Y.doccirrus.api.inpacs.getPatientMetaFromPatientId( patientUID, ( err, res ) => {
                                                if( err ) {
                                                    reject( err );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                        })
                                      );

                if(err) {
                    Y.log(`getPatientsInstanceCount: Error getting metadata of PatientUId: ${patientUID}. Error: ${err}`, "error", NAME);
                    if( callback ) {
                        return callback(err);
                    } else {
                        throw err;
                    }
                } else if( !result ) {
                    Y.log(`getPatientsInstanceCount: Got empty metadata for PatientUID: ${patientUID}`, "error", NAME);
                    if( callback ) {
                        return callback(`getPatientsInstanceCount: Got empty metadata for PatientUID: ${patientUID}`);
                    } else {
                        throw `getPatientsInstanceCount: Got empty metadata for PatientUID: ${patientUID}`;
                    }
                }

                patientDetails = result;

                if( patientNo ) {
                    if( patientDetails.MainDicomTags && patientDetails.MainDicomTags.PatientID === patientNo ) {
                        [err, result] = await formatPromiseResult( //jshint ignore: line
                                                getCSVPatientDetails( patientDetails )
                                              );

                        if( err ) {
                            Y.log(`getPatientsInstanceCount: Error in getCSVPatientDetails. Error: ${err}`, "error", NAME);
                            if( callback ) {
                                return callback(err);
                            } else {
                                throw err;
                            }
                        }

                        finalResult = finalResult + result;
                        break;
                    }
                } else {
                    [err, result] = await formatPromiseResult( //jshint ignore: line
                                            getCSVPatientDetails( patientDetails )
                                          );

                    if( err ) {
                        Y.log(`getPatientsInstanceCount: Error in getCSVPatientDetails. Error: ${err}`, "error", NAME);
                        if( callback ) {
                            return callback(err);
                        } else {
                            throw err;
                        }
                    }

                    finalResult = finalResult + result;
                }
            }

            if( !callback ) {
                return finalResult;
            }
            callback( null, finalResult );
        }

        async function getCSVPatientDetails( orthancPatientObj ) { //jshint ignore: line
            let
                err,
                result,
                patientDetailsArr = [],
                totalInstances = 0;

            if( !orthancPatientObj ) {
                throw "orthancPatientObj required";
            }

            [err, result] = await formatPromiseResult( //jshint ignore: line
                                    new Promise((resolve, reject) => {
                                        Y.doccirrus.api.inpacs.getAllInstancesByPatientId( orthancPatientObj.ID, ( err, res ) => {
                                            if( err ) {
                                                reject( err );
                                            } else {
                                                resolve( res );
                                            }
                                        } );
                                    })
                                  );

            if( err ) {
                Y.log(`getCSVPatientDetails: Error while querying getAllInstancesByPatientId of ID: ${orthancPatientObj.ID}`, "error", NAME);
                throw err;
            } else if( result && Array.isArray(result) ) {
                totalInstances =  result.length;
            }

            if( orthancPatientObj.MainDicomTags ) {
                patientDetailsArr.push( orthancPatientObj.MainDicomTags.PatientID ? orthancPatientObj.MainDicomTags.PatientID : "" );

                if( orthancPatientObj.MainDicomTags.PatientName ) {
                    patientDetailsArr.push( orthancPatientObj.MainDicomTags.PatientName.split("^")[0] ? orthancPatientObj.MainDicomTags.PatientName.split("^")[0] : "" );
                    patientDetailsArr.push( orthancPatientObj.MainDicomTags.PatientName.split("^")[1] ? orthancPatientObj.MainDicomTags.PatientName.split("^")[1] : "" );
                } else {
                    patientDetailsArr.push("");
                    patientDetailsArr.push("");
                }

                patientDetailsArr.push( orthancPatientObj.MainDicomTags.PatientBirthDate ? orthancPatientObj.MainDicomTags.PatientBirthDate : "" );
                patientDetailsArr.push(totalInstances);
            } else {
                patientDetailsArr.push("");
                patientDetailsArr.push("");
                patientDetailsArr.push("");
                patientDetailsArr.push("");
                patientDetailsArr.push("");
            }

            return patientDetailsArr.join(",")+"\n";
        }
    async function checkAndAssignOrthancStudyIdToActivities(args) {//jshint ignore:line
            Y.log('Entering Y.doccirrus.api.inpacslog.checkAndAssignOrthancStudyIdToActivities', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.checkAndAssignOrthancStudyIdToActivities');
            }

            const
                {user, callback} = args;

            let
                err,
                result,
                activitiesArrToModify,
                totalActivitiesUpdated = 0;

            callback(null, "API Started. Please look for key='checkAndAssignOrthancStudyIdToActivities' in the logs to monitor progress of the API"); //eslint-disable-line callback-return

            Y.log(`checkAndAssignOrthancStudyIdToActivities: Operation started`, "info", NAME);
            try{
                // --------------------- 1. Get all the activities which does not have "g_extra.orthancStudyUId" -----------------
                Y.log(`checkAndAssignOrthancStudyIdToActivities: Querying all activities with missing g_extra.orthancStudyUId`, "info", NAME);

                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            model: 'activity',
                                            action: 'get',
                                            query: {
                                                'g_extra.orthancStudyUId': {$exists:false},
                                                'g_extra.SeriesId': {$exists:true}
                                            },
                                            options : {
                                                fields: {
                                                    _id: 1,
                                                    g_extra: 1
                                                }
                                            }
                                        } )
                                      );

                if( err ) {
                    Y.log(`checkAndAssignOrthancStudyIdToActivities: Error while getting all activities without g_extra.orthancStudyUId. Error: ${err.stack || err}`, "error", NAME);
                    throw "IGNORE";
                }

                if( !result || !Array.isArray(result) || !result.length) {
                    Y.log(`checkAndAssignOrthancStudyIdToActivities: No activities with missing g_extra.orthancStudyUId found. Nothing to do. All good...`, "info", NAME);
                    return;
                }

                activitiesArrToModify = result.filter( (item) => {
                    if( item.g_extra.SeriesId && !item.g_extra.orthancStudyUId ) {
                        return true;
                    } else {
                        return false;
                    }
                } );
                // ----------------------------- 1. END -------------------------------------------



                // ---------------------------- 2. Update each activity g_extra with missing "orthancStudyUId" --------------------
                Y.log(`checkAndAssignOrthancStudyIdToActivities: Total of ${activitiesArrToModify.length} activities to process`, "info", NAME);

                /* jshint -W083 */
                for( let currentActivity of activitiesArrToModify ) {

                    // ------------------------ Get study Metada from SeriesId via Orthanc------------------------
                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                            new Promise( (resolve, reject) => {
                                                Y.doccirrus.api.inpacs.getStudyMetaFromSeriesId( currentActivity.g_extra.SeriesId, (err, res) => {
                                                    if( err ) {
                                                        reject(err);
                                                    } else {
                                                        resolve(res);
                                                    }
                                                } );
                                            } )
                                          );

                    if( err ) {
                        if( err === "UNSUCCESSFUL_RESPONSE" ) {
                            Y.log(`checkAndAssignOrthancStudyIdToActivities: unsuccessful response from orthanc while getting StudyMeta from SeriesId: ${currentActivity.g_extra.SeriesId}. Activity Id: ${currentActivity._id}. Skipping...`, "warn", NAME);
                            continue;
                        } else {
                            Y.log(`checkAndAssignOrthancStudyIdToActivities: Error while querying Orthanc to get StudyMeta from SeriesId: ${currentActivity.g_extra.SeriesId} for ActivityId: ${currentActivity._id}. Error: ${err.stack || err}`, "error", NAME);
                            throw "IGNORE";
                        }
                    }

                    if( !result || !result.MainDicomTags || !result.ID ) {
                        Y.log(`checkAndAssignOrthancStudyIdToActivities: MainDicomTags/ID NOT FOUND in getStudyMetaFromSeriesId for SeriesId: ${currentActivity.g_extra.SeriesId}. Activity Id: ${currentActivity._id}. Skipping ...`, "warn", NAME);
                        continue;
                    }

                    currentActivity.g_extra.orthancStudyUId = result.ID;
                    currentActivity.g_extra.orthancPatientUID = result.ParentPatient;
                    // ------------------------- End. -------------------------------------


                    // -------------------------- Update currentActivity with g_extra.orthancStudyUId -----------------------------
                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                            Y.doccirrus.mongodb.runDb( {
                                                user,
                                                action: 'mongoUpdate',
                                                model: 'activity',
                                                query: {
                                                    _id: currentActivity._id
                                                },
                                                data: {
                                                    $set: {
                                                        'g_extra': currentActivity.g_extra
                                                    }
                                                }
                                            } )
                                          );

                    if( err ) {
                        Y.log(`checkAndAssignOrthancStudyIdToActivities: Error while updating activityId: ${currentActivity._id} with updated g_extra. Error: ${err.stack || err}`, "error", NAME);
                        throw "IGNORE";
                    }

                    if( !result || !result.result || !result.result.n ) {
                        Y.log(`checkAndAssignOrthancStudyIdToActivities: Failed to updated g_extra for activityId: ${currentActivity._id}`, "error", NAME);
                        throw "IGNORE";
                    }

                    totalActivitiesUpdated = totalActivitiesUpdated + 1;
                    Y.log(`checkAndAssignOrthancStudyIdToActivities: Successfully updated activity with Id: ${currentActivity._id} with updated g_extra`, "info", NAME);
                    // --------------------------- END.----------------------------------------
                }

                Y.log(`checkAndAssignOrthancStudyIdToActivities: Operation Ended successfully`, "info", NAME);
                // ---------------------------- 2. END ---------------------------------

            } catch( err ) {
                if( err === "IGNORE" ) {
                    Y.log(`checkAndAssignOrthancStudyIdToActivities: Operation interrupted`, "error", NAME);
                } else {
                    //we do not expect the code to come here
                    Y.log(`checkAndAssignOrthancStudyIdToActivities: Exception in operation. Error: ${err.stack || err}`, 'error', NAME);
                }
            }

            Y.log(`checkAndAssignOrthancStudyIdToActivities: Total of ${totalActivitiesUpdated} activities updated with orthancStudyUId in g_extra`, "info", NAME);
        }

        /*
        * On DEV, once ALL the DICOM instances inside a Study are moved to a NEW Study then the old Study and its Series are also deleted by Orthanc automatically.
        * Moreover, if the moved Study was the only/last study inside a patient, then, the Patient was also deleted which is correct behaviour.
        *
        * BUT in PRODUCTION, even if ALL the DICOM instances inside a Study are moved to new Study, the old Study, its series, and possibly a dangling patient are still
        * in Orthanc DB without any instance inside them and it shows on the UI which confuses the users.
        *
        * The reason for this cleanup method is to rectify just that and remove every Patient, Study and Series IF IT DOES NOT have a single DICOM instance inside them
        *
        * This method flows as below:
        * a] Patients cleanup
        *     1] Query all the PatientUID array from Orthanc via REST call
        *     2] For every Patient, if the patient does not have a single DICOM instance inside it then DELETE that patient
        *     3] If the Patient has atleast 1 DICOM instance then DO NOT DO ANYTHING
        *
        * b] Studies cleanup
        *     1] Query all the StudyUID array from Orthanc via REST call
        *     2] For every Study, if the study does not have a single DICOM instance inside it then DELETE that study
        *     3] If the Study has atleast 1 DICOM instance then DO NOT DO ANYTHING
        *
        * b] Series cleanup
        *     1] Query all the SeriesUID array from Orthanc via REST call
        *     2] For every Series, if the series does not have a single DICOM instance inside it then DELETE that series
        *     3] If the Series has atleast 1 DICOM instance then DO NOT DO ANYTHING
        * */
    async function cleanEmptyRecordsFromOrthanc(args) {//jshint ignore:line
            Y.log('Entering Y.doccirrus.api.inpacslog.cleanEmptyRecordsFromOrthanc', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacslog.cleanEmptyRecordsFromOrthanc');
            }

            const
                {callback} = args;

            let
                err,
                result,
                patientsUIDArr = [],
                studiesUIDArr = [],
                seriesUIDArr = [],
                finalResult = {deletedPatientIdArr:[], deletedStudyIdArr:[], deletedSeriesIdArr:[], totalDeletions: 0};

            callback(null, "API cleanEmptyRecordsFromOrthanc Started. Please look for key='cleanEmptyRecordsFromOrthanc' in the logs to monitor progress of the API"); //eslint-disable-line callback-return

            Y.log(`cleanEmptyRecordsFromOrthanc: Cleanup of empty records in Orthanc has started`, "info", NAME);
            try{
                // =============================== A] PATIENT'S CLEANUP START ===================================================================
                // --------------------------- 1. Get ALL patients UID from Orthanc -------------------------------------
                [err, result] = await formatPromiseResult( //jshint ignore: line
                                        new Promise((resolve, reject) => {
                                            Y.doccirrus.api.inpacs.getAllPatientsFromOrthanc( ( err, res ) => {
                                                if( err ) {
                                                    reject( err );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                        })
                                      );

                if(err) {
                    Y.log(`cleanEmptyRecordsFromOrthanc: Error while getting ALL patientUIDs from Orthanc: ${err.stack || err}`, "error", NAME);
                    throw "IGNORE";
                }

                if( !result || !Array.isArray(result) || !result.length ) {
                    Y.log(`cleanEmptyRecordsFromOrthanc: No patients found in Orthanc DB. All good. Nothing to do...`, "info", NAME);
                    return;
                }

                patientsUIDArr = result;
                // -------------------------------- 1. END -----------------------------------------------------------------


                // -------------- 2. For each patientUID, if there is no DICOM instance for a patient then delete that patient -------
                /*jshint -W083*/
                for( let patientUID of patientsUIDArr ) {
                    // ------------------- Get ALL instances of patient by patientUID -----------------------------------------
                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                            new Promise((resolve, reject) => {
                                                Y.doccirrus.api.inpacs.getAllInstancesByPatientId( patientUID, ( err, res ) => {
                                                    if( err ) {
                                                        reject( err );
                                                    } else {
                                                        resolve( res );
                                                    }
                                                } );
                                            })
                                          );

                    if( err ) {
                        Y.log(`cleanEmptyRecordsFromOrthanc: Error querying ALL instances inside Patient Id: ${patientUID} from Orthanc. Error: ${err.stack || err}. Skipping and continuing to next patient...`, "error", NAME);
                        continue;
                    }
                    // ------------------- END ----------------------------------------------------------------------


                    // --------------- If result is a empty Array then DELETE that patient from Orthanc -------------------------
                    if( result && Array.isArray(result) && result.length === 0 ) {
                        [err, result] = await formatPromiseResult( //jshint ignore:line
                                                new Promise( (resolve, reject) => {
                                                    Y.doccirrus.api.inpacs.deletePatientById( patientUID, (err, res) => {
                                                        if( err ) {
                                                            reject( err );
                                                        } else {
                                                            resolve( res );
                                                        }
                                                    } );
                                                } )
                                              );

                        if( err ) {
                            Y.log(`cleanEmptyRecordsFromOrthanc: Error while deleting empty patient with ID: ${patientUID} from Orthanc. Error: ${err.stack || err}. Continuing...`, "error", NAME);
                        } else {
                            finalResult.deletedPatientIdArr.push(patientUID);
                        }
                    }
                    // ---------------------- END --------------------------------------------------------------------------
                }
                // ----------------------------- 2. END --------------------------------------------------
                // ===================================== A] PATIENT'S CLEANUP END ===========================================================


                // ================================== B] STUDIES CLEANUP START ==============================================================
                // ----------------------------- 1. Get ALL studies UID's from Orthanc ----------------------------------------
                [err, result] =  await formatPromiseResult(  //jshint ignore:line
                                         new Promise( (resolve, reject) =>{
                                            Y.doccirrus.api.inpacs.getAllStudiesFromOrthanc( ( err, res ) => {
                                                if( err ) {
                                                    reject( err );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                         })
                                       );

                if( err ) {
                    Y.log(`cleanEmptyRecordsFromOrthanc: Error while querying ALL studies from Orthanc. Error: ${err.stack || err}`, "error", NAME);
                    throw "IGNORE";
                }

                if( !result || !Array.isArray(result) || !result.length ) {
                    // Should never come in here
                    Y.log(`cleanEmptyRecordsFromOrthanc: No studies found in Orthanc DB.`, "info", NAME);
                } else {
                    studiesUIDArr = result;
                }
                // ---------------------------- 1. END ---------------------------------------------------------------------


                // --------- 2. For each studyUID, if there is not a single DICOM instance inside them, then delete that study -----------
                for( let studyUID of studiesUIDArr ) {
                    // -------------- Get ALL instances of study by studyUID -----------------
                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                            new Promise((resolve, reject) => {
                                                Y.doccirrus.api.inpacs.getAllInstancesByStudyId( studyUID, (err, res) => {
                                                    if(err) {
                                                        reject(err);
                                                    } else {
                                                        resolve(res);
                                                    }
                                                } );
                                            })
                                          );

                    if( err ) {
                        Y.log(`cleanEmptyRecordsFromOrthanc: Error while getting ALL instances by StudyID: ${studyUID}. Error: ${err.stack || err}. Skipping and continuing to next study...`, "error", NAME);
                        continue;
                    }
                    // ---------------- END --------------------------------


                    // ----------------- If result is empty Array then DELETE that study from Orthanc -------------
                    if( result && Array.isArray(result) && result.length === 0 ) {
                        [err, result] = await formatPromiseResult( //jshint ignore:line
                                                new Promise( (resolve, reject) => {
                                                    Y.doccirrus.api.inpacs.deleteStudyById( studyUID, (err, res) => {
                                                        if( err ) {
                                                            reject( err );
                                                        } else {
                                                            resolve( res );
                                                        }
                                                    } );
                                                } )
                                              );

                        if( err ) {
                            Y.log(`cleanEmptyRecordsFromOrthanc: Error while deleting empty study with ID: ${studyUID} from Orthanc. Error: ${err.stack || err}. Continuing...`, "error", NAME);
                        } else {
                            finalResult.deletedStudyIdArr.push(studyUID);
                        }
                    }
                    // -------------------- END --------------------------------------
                }
                // --------------------------------- 2. END ----------------------------------------
                // ================================== B] STUDIES CLEANUP END ==============================================================


                // ================================== C] SERIES CLEANUP START ==============================================================
                // ----------------------------- 1. Get ALL series UID's from Orthanc ----------------------------------------
                [err, result] =  await formatPromiseResult(  //jshint ignore:line
                                         new Promise( (resolve, reject) =>{
                                            Y.doccirrus.api.inpacs.getAllSeriesFromOrthanc( ( err, res ) => {
                                                if( err ) {
                                                    reject( err );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                         })
                                       );

                if( err ) {
                    Y.log(`cleanEmptyRecordsFromOrthanc: Error while querying ALL series UID's from Orthanc. Error: ${err.stack || err}`, "error", NAME);
                    throw "IGNORE";
                }

                if( !result || !Array.isArray(result) || !result.length ) {
                    // Should never come in here
                    Y.log(`cleanEmptyRecordsFromOrthanc: No series found in Orthanc DB.`, "info", NAME);
                } else {
                    seriesUIDArr = result;
                }
                // ---------------------------- 1. END ---------------------------------------------------------------------


                // ----- 2. For each series UID, if there is not a single DICOM instance inside it, then delete that series from Orthanc ------
                for( let seriesUID of seriesUIDArr ) {
                    // -------------- Get ALL instances of series by studyUID -----------------
                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                            new Promise((resolve, reject) => {
                                                Y.doccirrus.api.inpacs.getAllInstancesBySeriesId( seriesUID, (err, res) => {
                                                    if(err) {
                                                        reject(err);
                                                    } else {
                                                        resolve(res);
                                                    }
                                                } );
                                            })
                                          );

                    if( err ) {
                        Y.log(`cleanEmptyRecordsFromOrthanc: Error while getting ALL instances by SeriesId: ${seriesUID}. Error: ${err.stack || err}. Skipping and continuing to next series...`, "error", NAME);
                        continue;
                    }
                    // ---------------- END --------------------------------


                    // ----------------- If result is empty Array then DELETE that series from Orthanc -------------
                    if( result && Array.isArray(result) && result.length === 0 ) {
                        [err, result] = await formatPromiseResult( //jshint ignore:line
                                                new Promise( (resolve, reject) => {
                                                    Y.doccirrus.api.inpacs.deleteSeriesById( seriesUID, (err, res) => {
                                                        if( err ) {
                                                            reject( err );
                                                        } else {
                                                            resolve( res );
                                                        }
                                                    } );
                                                } )
                                              );

                        if( err ) {
                            Y.log(`cleanEmptyRecordsFromOrthanc: Error while deleting empty series with ID: ${seriesUID} from Orthanc. Error: ${err.stack || err}. Continuing...`, "error", NAME);
                        } else {
                            finalResult.deletedSeriesIdArr.push(seriesUID);
                        }
                    }
                    // -------------------- END ------------------------------------------------
                }
                // ----------------------- 2. END -----------------------------------------------------
                // ================================== C] SERIES CLEANUP END ==============================================================

                finalResult.operationCompleted = true;
                finalResult.totalDeletions = finalResult.deletedPatientIdArr.length + finalResult.deletedStudyIdArr.length + finalResult.deletedSeriesIdArr.length;

                console.log(`cleanEmptyRecordsFromOrthanc: Stats: `, JSON.stringify(finalResult, null, 2)); //eslint-disable-line no-console
                Y.log(`cleanEmptyRecordsFromOrthanc: Cleanup successfully completed.`, "info", NAME);

            } catch( err ) {
                if( err === "IGNORE" ) {
                    Y.log(`cleanEmptyRecordsFromOrthanc: Operation interrupted`, "error", NAME);
                } else {
                    //we do not expect the code to come here
                    Y.log(`cleanEmptyRecordsFromOrthanc: Exception in operation. Error: ${err.stack || err}`, 'error', NAME);
                }
                finalResult.operationCompleted = false;
                finalResult.totalDeletions = finalResult.deletedPatientIdArr.length + finalResult.deletedStudyIdArr.length + finalResult.deletedSeriesIdArr.length;

                console.log(`cleanEmptyRecordsFromOrthanc: Stats: `, JSON.stringify(finalResult, null, 2)); //eslint-disable-line no-console
                Y.log(`cleanEmptyRecordsFromOrthanc: Cleanup was not fully completed`, "warn", NAME);
            }
        }

        /**
         * @class inpacslog
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).inpacslog = {
            /**
             * @property name
             * @type {String}
             * @default inpacslog-api
             * @protected
             */
            name: NAME,
            checkAndCreate,
            assignInpacsEntryToActivity,
            revertInpacsEntryFromActivity,
            getDataFromOrthanc,
            unclaimInpacsLogEntry,
            checkAndFixPatientNoInOrthanc,
            getPatientsInstanceCount,
            checkAndAssignOrthancStudyIdToActivities,
            cleanEmptyRecordsFromOrthanc,
            get: GET
        };

    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'inpacslog-schema',
            'employee-schema',
            'activity-schema',
            'activity-api',
            'dcauth'
        ]
    }
);