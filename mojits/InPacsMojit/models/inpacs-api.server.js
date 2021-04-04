/*global YUI */


YUI.add( 'inpacs-api', function( Y, NAME ) {

        const
            async = require( 'async' ),
            moment = require( 'moment' ),
            http = require( 'http' ),
            url = require( 'url' ),
            sanitize = require( 'sanitize-filename' ),
            fs = require( 'fs' ),
            util = require('util'),
            request = require('request'),
            instancesUrl = 'instances',
            modalitiesUrl = 'modalities',
            toolsLookupUrl = '/tools/lookup',
            dcauth = require( 'dc-core' ).auth,
            dicomImageQueue = {isRunning: false, instanceArr : []},
            SAVE_DICOM_IMAGE_EVENT = "saveAllImagesFromDicom",
            {formatPromiseResult} = require( 'dc-core' ).utils,
            MAX_IMAGES_FROM_MANUAL_ASSIGNMENT = 100;

        let
            orthanUrl = '',
            orthanScheme = '//',
            orthanHost = 'localhost',
            orthanPort = '8042',
            inpacsConfig;

        try {
            inpacsConfig = require( 'dc-core' ).config.load( process.cwd() + '/inpacs.json' );
        } catch( e ) {
            inpacsConfig = null;
        }

        if( inpacsConfig ) {
            orthanScheme = 'http';
            orthanPort = inpacsConfig.httpPort;
            orthanHost = inpacsConfig.host || 'localhost';
        }

        orthanUrl = orthanScheme + '://' + orthanHost + ':' + orthanPort;
        Y.log( 'Created orthanUrl with scheme ' + orthanScheme + ': ' + orthanUrl );

        if(Y.doccirrus.ipc.isMaster()) {
            Y.doccirrus.ipc.subscribeNamed( SAVE_DICOM_IMAGE_EVENT, NAME, true, function( paramsObj, callback ) {
                Y.log( `Worker called ${SAVE_DICOM_IMAGE_EVENT} for instanceId: ${paramsObj.instanceId}. Handling request...`, 'info', NAME);

                let args = {
                    paramsObj,
                    callback
                };

                if(dicomImageQueue.isRunning) {
                    dicomImageQueue.instanceArr.push(args);
                } else {
                    callAttachDicomPreview(args);
                }
            } );
        }

        /**
         * Get sanitized id from url query param
         * @protected
         * @param {Object} query URL query
         * @returns {String} Sanitized param or empty string
         */
        function getId( query ) {
            if( query && query.id ) {
                return sanitize( query.id );
            }
            else {
                return '';
            }
        }

        /*
        * @concurrency Recommended to be executed via websocket on Master process as it could take more than 45 seconds
        *
        * This method modifies ALL Dicom instances inside a study in orthanc with the updated patient data
        * from dc-insuite and creates an exact study-> series-> instances tree as before updating with new IDs
        *
        * @replace object is as below:
        *   {
        *        PatientName: <string>,
        *        PatientID: <string>,
        *        AccessionNumber: "modifiedByDcInsuite", --> this is important so that we can ignore them when it comes via LUA REST call
        *        PatientSex: <"M" or "F" or "O">,
        *        PatientBirthDate: <String in YYYYMMD>,
        *        PatientAge: <string ex. 35Y>
        *   }
        *  @oldStudyId Study Id whose instances are to be modified
        *  @callback ideally would be called with (err, newOrthancStudyUID, new_g_extra)
        * */
        function modifyStudy( args ) {
            Y.log('Entering Y.doccirrus.api.inpacs.modifyStudy', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacs.modifyStudy');
            }

            let
                { oldStudyId, replace, callback } = args,
                newOrthancStudyUID, newOrthancPatientUID, new_g_extra;

            if( !oldStudyId || !replace ) {
                Y.log(`Invalid input. Expected oldStudyId and replace object`, 'error', NAME );
                return callback( 'Invalid input. Expected oldStudyId and replace object' );
            }

            Y.log( `modifyStudy: Updating all Dicom instances of studyId: ${oldStudyId} with data: ${JSON.stringify(replace)}`, 'info', NAME );

            async.waterfall([
                (waterfallCb) => {
                    request.get({
                        url: `${orthanUrl}/studies/${oldStudyId}/instances`,
                        json:true
                    }, (err, response, body) => {
                        if(err) {
                            Y.log( `Error getting all instances for oldStudy at URL: ${orthanUrl}/studies/${oldStudyId}/instances Error: ${err}`, 'error', NAME );
                            waterfallCb( err );
                        } else if( response.statusCode !== 200 ) {
                            Y.log( `Unsuccessful response while querying all instances of oldStudy at URL: ${orthanUrl}/studies/${oldStudyId}/instances statusCode: ${response.statusCode}`, 'error', NAME );
                            waterfallCb( `Unsuccessful response while querying oldStudy at URL: /studies/${oldStudyId}/instances` );
                        } else {
                            waterfallCb(null, body);
                        }
                    });
                },

                (instancesArr, waterfallCb) => {
                    let identifiers = {};

                    async.eachSeries(instancesArr, (instance, eachCb) => {
                        let
                            originalSeriesUID,
                            originalStudyUID,
                            toPostReplace = Object.assign({}, replace); //Do not pollute the original object

                        async.waterfall([
                            (instanceCb) => {
                                request.get({
                                    url: `${orthanUrl}/instances/${instance.ID}/content/SeriesInstanceUID`,
                                    json:true
                                }, (err, response, seriesUID) => {
                                    if(err) {
                                        Y.log( `Error querying original SeriesInstanceUID at URL: ${orthanUrl}/instances/${instance.ID}/content/SeriesInstanceUID Error: ${err}`, 'error', NAME );
                                        instanceCb( err );
                                    } else if( response.statusCode !== 200 ) {
                                        Y.log( `Unsuccessful response while querying original SeriesInstanceUID at URL: ${orthanUrl}/instances/${instance.ID}/content/SeriesInstanceUID statusCode: ${response.statusCode}`, 'error', NAME );
                                        instanceCb( `Unsuccessful response while querying original SeriesInstanceUID URL: /instances/${instance.ID}/content/SeriesInstanceUID` );
                                    } else {
                                        originalSeriesUID = seriesUID;

                                        if(identifiers[seriesUID]) {
                                            toPostReplace.SeriesInstanceUID = identifiers[seriesUID];
                                        }
                                        instanceCb();
                                    }
                                });
                            },

                            (instanceCb) => {
                                request.get({
                                    url: `${orthanUrl}/instances/${instance.ID}/content/StudyInstanceUID`,
                                    json:true
                                }, (err, response, studyUID) => {
                                    if(err) {
                                        Y.log( `Error querying original StudyInstanceUID at URL: ${orthanUrl}/instances/${instance.ID}/content/StudyInstanceUID Error: ${err}`, 'error', NAME );
                                        instanceCb( err );
                                    } else if( response.statusCode !== 200 ) {
                                        Y.log( `Unsuccessful response while querying original StudyInstanceUID at URL: ${orthanUrl}/instances/${instance.ID}/content/StudyInstanceUID statusCode: ${response.statusCode}`, 'error', NAME );
                                        instanceCb( `Unsuccessful response while querying URL: /instances/${instance.ID}/content/StudyInstanceUID` );
                                    } else {
                                        originalStudyUID = studyUID;

                                        if(identifiers[studyUID]) {
                                            toPostReplace.StudyInstanceUID = identifiers[studyUID];
                                        }
                                        instanceCb();
                                    }
                                });
                            },

                            (instanceCb) => {
                                request.post({
                                    url: `${orthanUrl}/instances/${instance.ID}/modify`,
                                    body: {
                                        Replace: toPostReplace,
                                        Force: true
                                    },
                                    json:true,
                                    encoding:null
                                }, ( err, response, body ) => {
                                    if(err) {
                                        Y.log( `Error modifying dicom instance at URL: ${orthanUrl}/instances/${instance.ID}/modify Error: ${err}`, 'error', NAME );
                                        instanceCb( err );
                                    } else if( response.statusCode !== 200 ) {
                                        Y.log( `Unsuccessful response modifying dicom instance at URL: ${orthanUrl}/instances/${instance.ID}/modify statusCode: ${response.statusCode}`, 'error', NAME );
                                        instanceCb( `Unsuccessful response modifying dicom instance at URL: /instances/${instance.ID}/modify` );
                                    } else {
                                        instanceCb(null, body);
                                    }
                                });
                            },


                            (modifiedDicom, instanceCb) => {
                                request.post({
                                    url:`${orthanUrl}/instances`,
                                    formData: {
                                        my_buffer: modifiedDicom
                                    }
                                }, (err, response, body) => {
                                    if(err) {
                                        Y.log( `Error uploading modified dicom file: ${orthanUrl}/instances Error: ${err}`, 'error', NAME );
                                        instanceCb( err );
                                    } else if( response.statusCode !== 200 ) {
                                        Y.log( `Unsuccessful response modifying dicom instance URL: ${orthanUrl}/instances statusCode: ${response.statusCode}`, 'error', NAME );
                                        instanceCb( `Unsuccessful response modifying dicom instance URL: /instances` );
                                    } else {
                                        let jsonBody;

                                        try{
                                            jsonBody = JSON.parse(body);
                                        } catch(e) {
                                            Y.log(`After upload DICOM file error parsing response: ${body} Error: ${e}`,'error', NAME);
                                            return instanceCb(`Error parsing response after upload DICOM file URL: /instances`);
                                        }

                                        instanceCb(null, jsonBody.ID);
                                    }
                                });
                            },

                            (modifiedInstanceId, instanceCb) => {
                                request.delete({
                                    url: `${orthanUrl}/instances/${instance.ID}`,
                                    json:true
                                }, ( err, response /*, body*/ ) => {
                                    if(err) {
                                        Y.log( `Error deleting old Dicom instance at URL: ${orthanUrl}/instances/${instance.ID} Error: ${err}`, 'error', NAME );
                                        instanceCb( err );
                                    } else if( response.statusCode !== 200 ) {
                                        Y.log( `Unsuccessful response deleting old dicom instance at URL: ${orthanUrl}/instances/${instance.ID} statusCode: ${response.statusCode}`, 'error', NAME );
                                        instanceCb( `Unsuccessful response deleting old dicom instance at URL: /instances/${instance.ID}` );
                                    } else {
                                        instanceCb(null, modifiedInstanceId);
                                    }
                                });
                            },

                            (modifiedInstanceId, instanceCb) => {
                                request.get({
                                    url: `${orthanUrl}/instances/${modifiedInstanceId}/content/SeriesInstanceUID`,
                                    json:true
                                }, (err, response, seriesUID) => {
                                    if(err) {
                                        Y.log( `Error querying SeriesInstanceUID for modified instance at URL: ${orthanUrl}/instances/${modifiedInstanceId}/content/SeriesInstanceUID Error: ${err}`, 'error', NAME );
                                        instanceCb( err );
                                    } else if( response.statusCode !== 200 ) {
                                        Y.log( `Unsuccessful response while querying SeriesInstanceUID for modified instance at URL: ${orthanUrl}/instances/${modifiedInstanceId}/content/SeriesInstanceUID statusCode: ${response.statusCode}`, 'error', NAME );
                                        instanceCb( `Unsuccessful response while querying SeriesInstanceUID for modified instance at URL: /instances/${modifiedInstanceId}/content/SeriesInstanceUID` );
                                    } else {
                                        identifiers[originalSeriesUID] = seriesUID;
                                        instanceCb(null, modifiedInstanceId);
                                    }
                                });
                            },

                            (modifiedInstanceId, instanceCb) => {
                                request.get({
                                    url: `${orthanUrl}/instances/${modifiedInstanceId}/content/StudyInstanceUID`,
                                    json:true
                                }, (err, response, studyUID) => {
                                    if(err) {
                                        Y.log( `Error querying StudyInstanceUID for modified instance at URL: ${orthanUrl}/instances/${modifiedInstanceId}/content/StudyInstanceUID Error: ${err}`, 'error', NAME );
                                        instanceCb( err );
                                    } else if( response.statusCode !== 200 ) {
                                        Y.log( `Unsuccessful response while querying StudyInstanceUID for modified instance at URL: ${orthanUrl}/instances/${modifiedInstanceId}/content/StudyInstanceUID statusCode: ${response.statusCode}`, 'error', NAME );
                                        instanceCb( `Unsuccessful response while querying StudyInstanceUID for modified instance at URL: /instances/${modifiedInstanceId}/content/StudyInstanceUID` );
                                    } else {
                                        identifiers[originalStudyUID] = studyUID;
                                        instanceCb(null, modifiedInstanceId);
                                    }
                                });
                            },

                            (modifiedInstanceId, instanceCb) => {
                                if(!newOrthancStudyUID) {
                                    request.get({
                                        url: `${orthanUrl}/instances/${modifiedInstanceId}/study`,
                                        json:true
                                    }, (err, response, newStudy) => {
                                        if(err) {
                                            Y.log( `Error getting new Study details for modifiedInstanceId at URL: ${orthanUrl}/instances/${modifiedInstanceId}/study Error: ${err}`, 'error', NAME );
                                            instanceCb( err );
                                        } else if( response.statusCode !== 200 ) {
                                            Y.log( `Unsuccessful response while querying new study details for modifiedInstanceId at URL: ${orthanUrl}/instances/${modifiedInstanceId}/study statusCode: ${response.statusCode}`, 'error', NAME );
                                            instanceCb( `Unsuccessful response while querying new study details for modifiedInstanceId at URL: /instances/${modifiedInstanceId}/study` );
                                        } else {
                                            newOrthancStudyUID = newStudy.ID;
                                            newOrthancPatientUID = newStudy.ParentPatient;
                                            instanceCb(null, modifiedInstanceId);
                                        }
                                    });
                                } else {
                                    instanceCb(null, modifiedInstanceId);
                                }
                            },

                            (modifiedInstanceId, instanceCb) => {
                                if(!new_g_extra) {
                                    request.get({
                                        url: `${orthanUrl}/instances/${modifiedInstanceId}/simplified-tags`,
                                        json:true
                                    }, (err, response, g_extra_tags) => {
                                        if(err) {
                                            Y.log( `Error getting new g_extra details for modifiedInstanceId at URL: ${orthanUrl}/instances/${modifiedInstanceId}/simplified-tags Error: ${err}`, 'error', NAME );
                                            instanceCb( err );
                                        } else if( response.statusCode !== 200 ) {
                                            Y.log( `Unsuccessful response while querying new g_extra details for modifiedInstanceId at URL: ${orthanUrl}/instances/${modifiedInstanceId}/simplified-tags statusCode: ${response.statusCode}`, 'error', NAME );
                                            instanceCb( `Unsuccessful response while querying new g_extra details for modifiedInstanceId at URL: /instances/${modifiedInstanceId}/simplified-tags` );
                                        } else {
                                            new_g_extra = g_extra_tags;
                                            new_g_extra.orthancStudyUId = newOrthancStudyUID;
                                            new_g_extra.orthancPatientUID = newOrthancPatientUID;

                                            instanceCb(null, modifiedInstanceId);
                                        }
                                    });
                                } else {
                                    instanceCb(null, modifiedInstanceId);
                                }
                            }

                        ],eachCb);
                    }, waterfallCb);
                }
            ], async ( err ) => {
                if(err) {
                    Y.log(`modifyStudy: Error while modifying oldStudyId: ${oldStudyId} Error: ${err}`, 'error', NAME);
                    return callback( err );
                }
                if( !newOrthancStudyUID || !new_g_extra ) {
                    Y.log(`modifyStudy: Failed to get new Study ID or g_extra: newOrthancStudyUID-> ${newOrthancStudyUID}`, 'error', NAME);
                    return callback( `modifyStudy: Failed to get new Study ID or g_extra` );
                }
                await formatPromiseResult( cleanupStudy(oldStudyId) );
                return callback( null, newOrthancStudyUID, new_g_extra);
            });
        }

        /*
        * If all the DICOM instances inside a study has been deleted, then by default Orthanc does delete the entire Study (and its series).
        * Also, if the deleted study was the only study, or in simple terms, if a Patient does not have a single DICOM instance, then Orthanc
        * also deletes the dangling patient.
        *
        * This default behaviors works perfectly fine in DEV environment but for some reason in PRODUCTION, Orthanc, in-spite of deleting all
        * DICOM instance inside a study, still keeps the study and corresponding Series metadata in its database even if they do not have any
        * DICOM instance. It also keeps the Patient metadata even if it does not have a single DICOM instance.
        *
        * The purpose of this method is to keep this default behaviour of Orthanc even in production as in, it does below:
        *
        * 1] Get the patient information from the provided studyUID (which is supposed to have zero DICOM instance).
        * 2] Delete the study, pointed by StudyUID, from Orthanc DB incase if it has not been deleted
        * 3] If via step 1 we got a patientObj, then get ALL the DICOM instances inside that patient from Orthanc.
        * 4] If via step 4 we got the DICOM instances list, and the list has 0 length, then it means the patient is empty so we delete the patient
        * */
        async function cleanupStudy( studyUID ) {
            let
                err,
                result,
                patientObj;

            // ------------------- 1. Get the PatientObject from Orthanc before deleting studyUID ------------
            [err, result] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        getPatientFromStudyId( studyUID, (err, res) => {
                                            if( err ) {
                                                reject(err);
                                            } else {
                                                resolve(res);
                                            }
                                        } );
                                    })
                                  );

            // We are not concerned with error handling here
            if( result && result.MainDicomTags && result.ID ) {
                patientObj = result;
            }
            // ------------------------- 1. END ----------------------------------------------------------------


            // ------------------------- 2. DELETE the actual studyUID now -------------------------------------
            [err, result] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        deleteStudyById( studyUID, (err, res) => {
                                            if( err ) {
                                                reject(err);
                                            } else {
                                                resolve(res);
                                            }
                                        } );
                                    })
                                  );

            if( err ) {
                if( err === "NOT_FOUND" ) {
                    Y.log(`cleanupStudy: StudyUID: ${studyUID} was already deleted by orthanc. All good...`, "info", NAME);
                } else {
                    Y.log(`cleanupStudy: Error while deleting studyUID: ${studyUID} from Orthanc. Error: ${err.stack || err}`, "warn", NAME);
                }
            }

            if( result === "SUCCESS" ) {
                Y.log(`cleanupStudy: StudyUID: ${studyUID} was successfully deleted from Orthanc`, "info", NAME);
            }
            // ------------------------- 2. END ---------------------------------------------------------------


            if( !patientObj ) {
                return;
            }

            // ------------------------- 3. Check if Patient have any instances inside it. If yes then DELETE it from Orthanc-----------------
            [err, result] = await formatPromiseResult(
                                    new Promise( (resolve, reject) => {
                                        getAllInstancesByPatientId( patientObj.ID, ( err, res ) => {
                                            if( err ) {
                                                reject( err );
                                            } else {
                                                resolve( res );
                                            }
                                        } );
                                    } )
                                  );

            if( result && Array.isArray(result) && result.length === 0 ) {
                [err, result] = await formatPromiseResult(
                                        new Promise( (resolve, reject) => {
                                            deletePatientById( patientObj.ID, (err, res) => {
                                                if( err ) {
                                                    reject( err );
                                                } else {
                                                    resolve( res );
                                                }
                                            } );
                                        } )
                                      );

                if( err ) {
                    if( err === "NOT_FOUND" ) {
                        Y.log(`cleanupStudy: Empty PatientUID: ${patientObj.ID}, of Old Study ID: ${studyUID}, was already deleted. All good...`, "info", NAME);
                    } else {
                        Y.log(`cleanupStudy: Error while deleting empty PatientUID: ${patientObj.ID}, of Old Study ID: ${studyUID}, from Orthanc. Error: ${err.stack || err}`, "warn", NAME);
                    }
                }

                if( result === "SUCCESS" ) {
                    Y.log(`cleanupStudy: Empty PatientUID: ${patientObj.ID}, of Old Study ID: ${studyUID}, was successfully deleted from Orthanc`, "info", NAME);
                }
            }
            // ------------------------ 3. END ---------------------------------------------------------------
        }

        function getPatientFromStudyId( studyId, callback ) {
            if( !studyId ) {
                return callback( `Missing StudyID` );
            }

            request.get({
                url: `${orthanUrl}/studies/${studyId}/patient`,
                json:true
            }, (err, response, patientObj) => {
                if(err) {
                    return callback( err );
                }
                if( response.statusCode === 404 ) {
                    return callback( `NOT_FOUND` );
                }
                if( response.statusCode !== 200 ) {
                    return callback( `Unsuccessful response in getPatientFromStudyId at URL: /studies/${studyId}/patient` );
                }
                callback( null, patientObj );
            });
        }

        function getAllStudiesFromOrthanc( callback ) {
            request.get({
                url: `${orthanUrl}/studies`,
                json:true
            }, (err, response, studiesUIDArr) => {
                if(err) {
                    Y.log( `Error getting all study IDs from orthanc at URL: ${orthanUrl}/studies Error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying all study IDs from orthanc at URL: ${orthanUrl}/studies , statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `Unsuccessful response while querying all study IDs from orthanc at URL: /studies , statusCode: ${response.statusCode}` );
                }
                callback( null, studiesUIDArr );
            });
        }

        function getAllPatientsFromOrthanc( callback ) {
            request.get({
                url: `${orthanUrl}/patients`,
                json:true
            }, (err, response, patientsUIDArr) => {
                if(err) {
                    Y.log( `Error getting all patient IDs from orthanc at URL: ${orthanUrl}/patients Error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying all patient IDs from orthanc at URL: ${orthanUrl}/patients , statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `Unsuccessful response while querying all patient IDs from orthanc at URL: /patients , statusCode: ${response.statusCode}` );
                }
                callback( null, patientsUIDArr );
            });
        }

        function getAllSeriesFromOrthanc( callback ) {
            request.get({
                url: `${orthanUrl}/series`,
                json:true
            }, (err, response, seriesUIDArr) => {
                if(err) {
                    Y.log( `Error getting all series IDs from orthanc at URL: ${orthanUrl}/series Error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying all series IDs from orthanc at URL: ${orthanUrl}/series , statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `Unsuccessful response while querying all series IDs from orthanc at URL: /series , statusCode: ${response.statusCode}` );
                }
                callback( null, seriesUIDArr );
            });
        }

        function getPatientMetaFromPatientId( ID, callback ) {
            if(!ID) {
                return callback( `Missing Patient UID` );
            }

            request.get({
                url: `${orthanUrl}/patients/${ID}`,
                json:true
            }, (err, response, patientMetaData) => {
                if(err) {
                    Y.log( `Error getting patient meta data from orthanc at URL: ${orthanUrl}/patients/${ID} Error: ${err}`, 'error', NAME );
                    return callback( err );
                }if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying patient meta data for URL: ${orthanUrl}/patients/${ID} , statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `Unsuccessful response while querying patient meta data for URL: /patients/${ID} , statusCode: ${response.statusCode}` );
                }
                callback( null, patientMetaData );
            });
        }

        function getAllInstancesByPatientId( ID, callback ) {
            if(!ID) {
                return callback( `Missing Patient UID` );
            }

            request.get({
                url: `${orthanUrl}/patients/${ID}/instances`,
                json:true
            }, (err, response, instanceObjArr) => {
                if(err) {
                    return callback( err );
                } if( response.statusCode !== 200 ) {
                    return callback( `Unsuccessful response while querying all instances by patientId URL: /patients/${ID}/instances, statusCode: ${response.statusCode}` );
                }
                callback( null, instanceObjArr );
            });
        }

        function getAllInstancesByStudyId( ID, callback ) {
            if(!ID) {
                return callback( `Missing Study UID` );
            }

            request.get({
                url: `${orthanUrl}/studies/${ID}/instances`,
                json:true
            }, (err, response, instanceObjArr) => {
                if(err) {
                    Y.log( `Error getting all instances of study at URL: ${orthanUrl}/studies/${ID}/instances Error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying all instances of study at URL: ${orthanUrl}/studies/${ID}/instances , statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `Unsuccessful response while querying all instances of study at URL: /studies/${ID}/instances , statusCode: ${response.statusCode}` );
                }
                if( !instanceObjArr || !Array.isArray(instanceObjArr) ) {
                    Y.log(`No instance found for studyId: ${ID}`, "error", NAME);
                    return callback( `NO_INSTANCE_FOUND` ); //Should ideally never happen
                }
                callback( null, instanceObjArr );
            });
        }

        function getAllInstancesBySeriesId( ID, callback ) {
            if(!ID) {
                return callback( `Missing Series UID` );
            }

            request.get({
                url: `${orthanUrl}/series/${ID}/instances`,
                json:true
            }, (err, response, instanceObjArr) => {
                if(err) {
                    Y.log( `Error getting all instances by seriesId from orthanc at URL: ${orthanUrl}/series/${ID}/instances Error: ${err}`, 'error', NAME );
                    return callback( err );
                } if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying all instances by seriesId for URL: ${orthanUrl}/series/${ID}/instances, statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `Unsuccessful response while querying all instances by seriesId URL: /series/${ID}/instances, statusCode: ${response.statusCode}` );
                }
                callback( null, instanceObjArr );
            });
        }

        function getStudyMetaFromStudyId( ID, callback ) {
            if(!ID) {
                return callback( `Missing Study UID` );
            }

            request.get({
                url: `${orthanUrl}/studies/${ID}`,
                json:true
            }, (err, response, studyMetaData) => {
                if(err) {
                    Y.log( `Error getting study meta data from orthanc at URL: ${orthanUrl}/studies/${ID} Error: ${err}`, 'error', NAME );
                    return callback( err );
                } if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying study meta data for URL: ${orthanUrl}/studies/${ID} , statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `Unsuccessful response while querying study meta data for URL: /studies/${ID} , statusCode: ${response.statusCode}` );
                }
                callback( null, studyMetaData );
            });
        }

        function getStudyMetaFromSeriesId( ID, callback ) {
            if(!ID) {
                return callback( `Missing SeriesID` );
            }

            request.get({
                url: `${orthanUrl}/series/${ID}/study`,
                json:true
            }, (err, response, studyMetaData) => {
                if(err) {
                    Y.log( `Error getting study meta data from seriesId via orthanc at URL: ${orthanUrl}/series/${ID}/study Error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                if( response.statusCode !== 200 ) {
                    Y.log( `Unsuccessful response while querying study meta data from SeriesId for URL: ${orthanUrl}/series/${ID}/study , statusCode: ${response.statusCode}`, 'error', NAME );
                    return callback( `UNSUCCESSFUL_RESPONSE` );
                }
                callback( null, studyMetaData );
            });
        }

        /**
         * @method PUBLIC
         *
         * This method returns list of series objects for a study based on provided orthanc studyId
         *
         * @param {string} studyId :REQUIRED: Study ID whose series list is to be fetched.
         * @returns {Promise<{}[]>} If successful resolves with seriesList array or else error.
         *          Example output is:
         *          [
         *              {
         *                  "ExpectedNumberOfInstances" : <Number || null>,
         *                  "ID" : "af35c5ca-a1d33ec0-df0d01d6-ff37bbb3-f58d644d",
         *                  "Instances" :  [ "c21444ce-08bd90dd-685eb072-4675c85a-1357d845" ],
         *                  "IsStable" : true,
         *                  "LastUpdate" : "20180912T160259",
         *                  "MainDicomTags" : {
         *                      "Modality" : "KO",
         *                      "SeriesDate" : "20180912",
         *                      "SeriesDescription" : "**Fast STIR",
         *                      "SeriesInstanceUID" : "1.2.276.0.7230010.3.1.3.0.40756.1536760979.423798",
         *                      "SeriesTime" : "160259.000000"
         *                  },
         *                  "ParentStudy" : "44639a38-8d5d8cee-930c7612-b46ca6e4-906db544",
         *                  "Status" : "Unknown",
         *                  "Type" : "Series"
         *              },
         *              ...
         *          ]
         */
        function getSeriesListFromStudyId( studyId ) {
            return new Promise( (resolve, reject) => {
                if( !studyId || typeof studyId !== "string" ) {
                    return reject( `Missing/invalid 'studyId'` );
                }

                request.get({
                    url: `${orthanUrl}/studies/${studyId}/series`,
                    json:true
                }, (err, response, seriesList) => {
                    if(err) {
                        return reject( err );
                    } else if( response.statusCode !== 200 ) {
                        return reject( `Unsuccessful response while fetching all series for StudyId at URL: /studies/${studyId}/series , statusCode: ${response.statusCode}` );
                    } else if( !seriesList || !Array.isArray(seriesList) ){
                        return reject( `No series found for studyId: ${studyId} in Orthanc DB` ); //Should never happen
                    } else {
                        resolve(seriesList);
                    }
                });
            } );
        }

        function getGExtraForStudyId( orthancStudyUId, orthancPatientUID, callback ) {
            if(!orthancStudyUId || !orthancPatientUID) {
                return callback( `Missing Study/patient UID` );
            }

            async.waterfall([
                function getOneStudyInstance( waterfallCb ) {
                    request.get({
                        url: `${orthanUrl}/studies/${orthancStudyUId}/instances`,
                        json:true
                    }, (err, response, instanceObjArr) => {
                        if(err) {
                            Y.log( `Error getting all instances of study at URL: ${orthanUrl}/studies/${orthancStudyUId}/instances Error: ${err}`, 'error', NAME );
                            waterfallCb( err );
                        } else if( response.statusCode !== 200 ) {
                            Y.log( `Unsuccessful response while querying all instances of study at URL: ${orthanUrl}/studies/${orthancStudyUId}/instances , statusCode: ${response.statusCode}`, 'error', NAME );
                            waterfallCb( `Unsuccessful response while querying all instances of study at URL: /studies/${orthancStudyUId}/instances , statusCode: ${response.statusCode}` );
                        } else if( !instanceObjArr || !Array.isArray(instanceObjArr) || !instanceObjArr.length ) {
                            waterfallCb( "NO_INSTANCE_FOUND" ); //Should ideally never happen
                        } else {
                            waterfallCb( null, instanceObjArr[0].ID ); //Just pick the first one as study details are same for all instances
                        }
                    });
                },

                function queryInstanceSimplifiedTags( instanceId, waterfallCb ) {
                    request.get({
                        url: `${orthanUrl}/instances/${instanceId}/simplified-tags`,
                        json:true
                    }, (err, response, g_extra) => {
                        if(err) {
                            Y.log( `Error getting g_extra details for instance at URL: ${orthanUrl}/instances/${instanceId}/simplified-tags Error: ${err}`, 'error', NAME );
                            waterfallCb( err );
                        } else if( response.statusCode !== 200 ) {
                            Y.log( `Unsuccessful response while querying g_extra details for instance at URL: ${orthanUrl}/instances/${instanceId}/simplified-tags statusCode: ${response.statusCode}`, 'error', NAME );
                            waterfallCb( `Unsuccessful response while querying g_extra details for instance at URL: /instances/${instanceId}/simplified-tags` );
                        } else {
                            g_extra.orthancStudyUId = orthancStudyUId;
                            g_extra.orthancPatientUID = orthancPatientUID;

                            waterfallCb(null, g_extra);
                        }
                    });
                }
            ], function finalCallback( err, g_extra ) {
                if( err === "NO_INSTANCE_FOUND" ) {
                    return callback(); // No need to pass anything
                } if( err ) {
                    return callback( err );
                }
                callback( null, g_extra );
            });
        }

        function deletePatientById( ID, callback ) {
            if(!ID) {
                return callback( `Missing Patient UID` );
            }

            request.delete({
                url: `${orthanUrl}/patients/${ID}`,
                json:true
            }, ( err, response /*, body*/ ) => {
                if(err) {
                    return callback( err );
                }
                if( response.statusCode === 404 ) {
                    return callback( "NOT_FOUND" );
                }
                if( response.statusCode !== 200 ) {
                    return callback( `Unsuccessful response while deleting patient at URL: DELETE /patients/${ID} statusCode: ${response.statusCode}` );
                }
                callback(null, "SUCCESS");
            });
        }

        function deleteStudyById( ID, callback ) {
            if(!ID) {
                return callback( `Missing Study UID` );
            }

            request.delete({
                url: `${orthanUrl}/studies/${ID}`,
                json:true
            }, ( err, response /*, body*/ ) => {
                if(err) {
                    return callback( err );
                }
                if( response.statusCode === 404 ) {
                    return callback( "NOT_FOUND" );
                }
                if( response.statusCode !== 200 ) {
                    return callback( `Unsuccessful response while deleting study at URL: DELETE /studies/${ID} statusCode: ${response.statusCode}` );
                }
                callback(null, "SUCCESS");
            });
        }

        function deleteSeriesById( ID, callback ) {
            if(!ID) {
                return callback( `Missing Series UID` );
            }

            request.delete({
                url: `${orthanUrl}/series/${ID}`,
                json:true
            }, ( err, response /*, body*/ ) => {
                if(err) {
                    return callback( err );
                }
                if( response.statusCode === 404 ) {
                    return callback( "NOT_FOUND" );
                }
                if( response.statusCode !== 200 ) {
                    return callback( `Unsuccessful response while deleting series at URL: DELETE /series/${ID} statusCode: ${response.statusCode}` );
                }
                callback(null, "SUCCESS");
            });
        }

        /**
         * Return preview image of dcm for instance id
         * @protected
         * @param {String} instanceId instance id
         * @param {Function} callback return buffer with an image
         */
        function getInstanceImage( instanceId, callback ) {

            const urlToInstanceImage = `${orthanUrl}/${instancesUrl}/${instanceId}/preview`;

            http.get( url.parse( urlToInstanceImage ), ( response ) => {

                const statusCode = response.statusCode;
                let imageChunks = [];

                if( statusCode !== 200 ) {
                    Y.log( `Error requesting instance image: ${urlToInstanceImage}, Status Code: ${statusCode} `, 'error', NAME );
                    return callback( new Error( `Error requesting instance image: ${urlToInstanceImage}, Status Code: ${statusCode}` ) );
                }

                response
                    .on( 'data', ( data ) => imageChunks.push( data ) )
                    .on( 'end', () => callback( null, Buffer.concat( imageChunks ) ) );

            } ).on( 'error', ( err ) => {
                Y.log( `Error requesting instance image: ${urlToInstanceImage}, ${err} `, 'error', NAME );
                return callback( err );
            } );
        }

        /**
         * Get dcm metadata
         * @protected
         * @param {String} instanceId instance id
         * @param {Function} callback return json object with metadata
         */
        function getSimplifiedTags( instanceId, callback ) {
            const urlToSimplifiedTags = `${orthanUrl}/${instancesUrl}/${instanceId}/simplified-tags`;

            http.get( url.parse( urlToSimplifiedTags ), ( response ) => {

                const statusCode = response.statusCode;
                let rawData = '';

                if( statusCode !== 200 ) {
                    Y.log( `Error getting the instance tags: ${urlToSimplifiedTags}, Status Code: ${statusCode} `, 'error', NAME );
                    return callback( new Error( `Error getting the instance tags: ${urlToSimplifiedTags}, Status Code: ${statusCode}` ) );
                }

                response.setEncoding( 'utf8' );

                response
                    .on( 'data', ( chunk ) => {
                        rawData += chunk;
                    } )
                    .on( 'end', () => {
                        try {
                            let parsedData = JSON.parse( rawData );
                            return callback( null, parsedData );
                        } catch( e ) {
                            return callback( e );
                        }
                    } );

            } ).on( 'error', ( err ) => {
                Y.log( `Error getting the instance tags: ${urlToSimplifiedTags}, ${err} `, 'error', NAME );
                return callback( err );
            } );
        }

        function getInstanceAndSeriesInformation(user, instanceId, callback) {
            let
                inpacsConfiguration,
                imgMetaObj,
                numberOfImages;

            Y.log( `getting InstanceAndSeriesInformation`, 'info', NAME );

            async.waterfall([
                (next) => {
                    Y.doccirrus.api.inpacsconfiguration.getInpacsConfiguration({
                        user
                    }, (confErr, confRes) => {
                        if(confErr) {
                            Y.log( `Error getting inpacsconfiguration from db. ${JSON.stringify(confErr)}`, "error", NAME );
                            return next( confErr );
                        }
                        if( !confRes || !Array.isArray(confRes) || !confRes[0] ) {
                            Y.log( `No inpacsconfiguration found in db.`, "error", NAME );
                            return next( `No inpacsconfiguration found in db.` );
                        }
                        Y.log(`getInstanceAndSeriesInformation: inpacsconfiguration found`, 'info', NAME);
                        next( null, confRes[0]);
                    });
                },
                (result, next) => {
                    inpacsConfiguration = result;
                    getSimplifiedTags( instanceId, next );
                },
                (imgMetadata, next) => {
                    Y.log(`getInstanceAndSeriesInformation: simplifiedTags queried successfully...`, 'info', NAME);
                    imgMetaObj = imgMetadata;

                    let
                        dbModality,
                        instanceModality = imgMetadata && imgMetadata.Modality && imgMetadata.Modality.toLowerCase();

                    dbModality = inpacsConfiguration.modalities.find( (modalityObj) => {
                        return modalityObj.type.toLowerCase() === instanceModality;
                    } );

                    if(dbModality) {
                        numberOfImages = dbModality.numberOfImages;
                    } else if( instanceModality === "ko" ) {
                        /**
                         * Modality= "KO" (key objects), as per DICOM standard is for instances which are key images created by user. If user creates key image from
                         * Osimis viewer then we want to allow any number of key images the user creates and so it is not subject to "numberOfImages" configuration
                         */
                        numberOfImages = 9999999999999;
                    } else {
                        numberOfImages = 5; // Default the number of key images to 5 if it is coming from unknown modality
                    }

                    let tempNumberOfImages = parseInt(numberOfImages, 10);

                    if(Number.isNaN(tempNumberOfImages)) { //means the user has somehow set incorrect 'numberOfImages' value from UI
                        numberOfImages = 1;
                    }

                    Y.log(`getInstanceAndSeriesInformation: numberOfImages value is: ${numberOfImages} and Modality is ${dbModality && dbModality.type}`, 'info', NAME);
                    next();
                }
            ], ( err ) => {
                if(err) {
                    return callback(err);
                }
                callback(null, {
                    imgMetadata: imgMetaObj,
                    numberOfImages
                });
            });
        }

        /**
         * @method PUBLIC
         *
         * This method:
         *   1] Gets All series for 'orthancStudyUId' from Orthanc DB
         *   2] Processes only those series whose Modality = "KO" (key objects as per DICOM standard)
         *      2a] If series found then fetches its instance image buffer from Orthanc
         *      2b] Import the image buffer in DB via importMediaFromFile routine
         *      2c] Creates a Document in the DB pointing to imported media in step (2b) and caches documentId in createdDocumentIdArr
         *   3] Once step 2 is completed then returns below object:
         *   {
         *       totalKeyImagesFound: <Number, total number of key images found>,
         *       failedKeyImgInstanceIdArr: <Array[String], instance Id's of key images which failed>,
         *       createdDocumentIdArr: <Array[string], Document ID's of saved key image instances in the DB>
         *   }
         *
         * @param {object} args :REQUIRED:
         * @param {object} args.user :REQUIRED: User object
         * @param {string} args.orthancStudyUId :REQUIRED: Study for which key images medata data is to be fetched
         * @returns {Promise<{totalKeyImagesFound: number, failedKeyImgInstanceIdArr: Array, createdDocumentIdArr: Array}>}
         */
        async function fetchAndSaveKeyImagesToDb( args ) {
            Y.log('Entering Y.doccirrus.api.inpacs.fetchAndSaveKeyImagesToDb', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacs.fetchAndSaveKeyImagesToDb');
            }
            const
                {user, orthancStudyUId} = args;

            if( !orthancStudyUId || typeof orthancStudyUId !== "string" ) {
                throw `Missing/Invalid orthancStudyUId`;
            }

            let
                err,
                result,
                failedKeyImgInstanceIdArr = [],
                createdDocumentIdArr = [],
                seriesList;

            Y.log(`fetchAndSaveKeyImagesToDb: Saving any existing key images of studyId: ${orthancStudyUId} in DB`, "info", NAME);

            // ---------------------- 1. Get All series for this study ID from Orthanc -------------------------------------
            [err, seriesList] = await formatPromiseResult( getSeriesListFromStudyId(orthancStudyUId) );

            if( err ) {
                Y.log(`fetchAndSaveKeyImagesToDb: Error getting series list for studyId: ${orthancStudyUId}. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( seriesList.length === 0 ) {
                // Should never come here
                Y.log(`fetchAndSaveKeyImagesToDb: No series found.`, "warn", NAME);
                throw `No series found.`;
            }
            // ----------------------------------- 1. END ------------------------------------------------------------------


            // --------------------- 2. Only process those series whose Modality !== "" --------------------------------------------------------
            let processedImages = 0;
            for( let seriesObj of seriesList ) {
                if( processedImages >= MAX_IMAGES_FROM_MANUAL_ASSIGNMENT ){
                    break;
                }
                if( !seriesObj || !seriesObj.MainDicomTags || seriesObj.MainDicomTags.Modality === "" || !Array.isArray( seriesObj.Instances ) || !seriesObj.Instances.length ) {
                    continue;
                }

                /**
                 * If code has reached here means this series has key image instance. Generally every instance with modality="KO" is wrapped in one series
                 * but we would still use for loop because seriesObj.Instances = ["instanceId of key image"] though it is bound to
                 * have only one instance ID as per behaviour of osimis/orthanc
                 */
                for( let keyImageInstanceId of seriesObj.Instances ) {
                    let
                        instanceImageBuffer,
                        mediaObject;

                    // --------------------------- 2a. Fetch Instance image buffer from Orthanc ---------------------------------
                    [err, instanceImageBuffer] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            getInstanceImage( keyImageInstanceId, ( error, res ) => {
                                if( error ) {
                                    reject( error );
                                } else {
                                    resolve( res );
                                }
                            } );
                        } )
                    );

                    if( err ) {
                        Y.log( `fetchAndSaveKeyImagesToDb: Error while fetching image buffer from Orthanc for instance Id: ${keyImageInstanceId} belonging to studyId: ${orthancStudyUId}. Error: ${err.stack || err}` );
                        failedKeyImgInstanceIdArr.push( keyImageInstanceId );
                        continue;
                    }

                    if( !instanceImageBuffer ) {
                        // Should never come here
                        Y.log( `fetchAndSaveKeyImagesToDb: No image buffer returned from Orthanc for instance ID: ${keyImageInstanceId} belonging to studyId: ${orthancStudyUId}`, "error", NAME );
                        failedKeyImgInstanceIdArr.push( keyImageInstanceId );
                        continue;
                    }
                    // ------------------------------- 2a. END --------------------------------------------------------------------

                    // --------------------------------- 2b. Import key image buffer to DB --------------------------------------------------
                    [err, mediaObject] = await formatPromiseResult( importMedia( user, `${keyImageInstanceId}.png`, instanceImageBuffer ) );

                    if( err ) {
                        Y.log( `fetchAndSaveKeyImagesToDb: Error while importing key image to DB for instance ID: ${keyImageInstanceId} belonging to studyId: ${orthancStudyUId}: Error: ${err.stack || err}`, "error", NAME );
                        failedKeyImgInstanceIdArr.push( keyImageInstanceId );
                        continue;
                    }
                    // ----------------------------------------- 2b. END ---------------------------------------------------------------------

                    // ----------------------- 2c. Create a Document in the DB pointing to above imported media ------------------------------
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            model: 'document',
                            action: 'post',
                            user: user,
                            data: Y.doccirrus.filters.cleanDbObject( {
                                type: 'OTHER',
                                contentType: mediaObject.mimeType,
                                createdOn: moment().utc().toJSON(),
                                isEditable: false,
                                accessBy: [],
                                url: `/1/media/:download?_id=${mediaObject._id.toString()}&mime=${mediaObject.mimeType}&from=casefile`,
                                mediaId: mediaObject._id.toString(),
                                caption: `${keyImageInstanceId}.png`
                            } ),
                            options: {entireRec: true}
                        } )
                    );

                    if( err ) {
                        Y.log( `fetchAndSaveKeyImagesToDb: Error while creating document in DB for instance ID: ${keyImageInstanceId} belonging to studyId: ${orthancStudyUId}. Error: ${err.stack || err}`, "error", NAME );
                        failedKeyImgInstanceIdArr.push( keyImageInstanceId );
                        continue;
                    }

                    if( !result || !result.length ) {
                        Y.log( `fetchAndSaveKeyImagesToDb: Failed to create document in DB for instance ID: ${keyImageInstanceId} belonging to studyId: ${orthancStudyUId}`, "error", NAME );
                        failedKeyImgInstanceIdArr.push( keyImageInstanceId );
                        continue;
                    }

                    createdDocumentIdArr.push( result[0]._id.toString() );
                    processedImages++;
                    // ------------------------------------------ 2c. END ------------------------------------------------------------------------
                }
            }
            // ------------------ 2. END ---------------------------------------------------------------------------------------------------------

            Y.log(`fetchAndSaveKeyImagesToDb: Completed for studyId: ${orthancStudyUId}. totalKeyImagesFound: ${createdDocumentIdArr.length + failedKeyImgInstanceIdArr.length}, failedKeyImgInstances: ${failedKeyImgInstanceIdArr.length ? failedKeyImgInstanceIdArr: 0} and total saved images: ${createdDocumentIdArr.length}`, "info", NAME);

            return {
                totalKeyImagesFound: createdDocumentIdArr.length + failedKeyImgInstanceIdArr.length,
                failedKeyImgInstanceIdArr,
                createdDocumentIdArr
            };
        }

        function callAttachDicomPreview( args ) {
            Y.log(`callAttachDicomPreview: Executing attachDicomPreview method for imageInstanceId: ${args.paramsObj.instanceId}`, 'info', NAME);

            dicomImageQueue.isRunning = true;

            attachDicomPreview( {
                user: args.paramsObj.user,
                data: {
                    instanceId: args.paramsObj.instanceId,
                    imgMetadata: args.paramsObj.imgMetadata,
                    numberOfImages: args.paramsObj.numberOfImages
                },
                callback: ( err, data ) => {
                    Y.log(`callAttachDicomPreview: attachDicomPreview executed for imageInstanceId: ${args.paramsObj.instanceId}. Sending response back to worker`, 'info', NAME);
                    args.callback(err, data); //eslint-disable-line callback-return

                    //  process next image in the queue from IPC events
                    if(dicomImageQueue.instanceArr.length) {
                        callAttachDicomPreview(dicomImageQueue.instanceArr.shift());
                    } else {
                        dicomImageQueue.isRunning = false;
                    }
                }
            } );
        }

        /**
         * All it do it's calling the attachDicomPreview
         * @param {Object} args object
         * @param {String} args.id instance id
         */
        function getInstanceDcm( args ) {
            Y.log('Entering Y.doccirrus.api.inpacs.getInstanceDcm', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacs.getInstanceDcm');
            }

            const
                id = getId( args.httpRequest.query ),
                cb = args.callback,
                user = Y.doccirrus.auth.getSUForTenant( dcauth.sanitizeTenantId( dcauth.getTenantFromHost( args.httpRequest.headers.host ) ) );

            cb( null ); // eslint-disable-line callback-return

            if(!id) {
                return;
            }

            Y.log( `Entering getInstanceDcm, instance id is: ${id}`, 'info', NAME );

            function onAttachPreview(err,data) {
                if(err) {
                    Y.log(`getInstanceDcm: Error executing attachDicomPreview on master for imageInstanceId: ${id}`, 'warn', NAME);
                } else {
                    Y.log( `getInstanceDcm: got response from master for attachDicomPreview method for imageInstanceId: ${id}`, 'info', NAME );

                    if( data && data.skip ) {
                        Y.log( `getInstanceDcm: Skipping instance Id : ${id}`, 'info', NAME );
                        return;
                    }

                    Y.doccirrus.communication.emitEventForAll( {
                        event: 'updateActivityAttachmentsInPacs',
                        msg: {
                            data: Object.assign( {}, data )
                        }
                    } );
                }
            }

            async.waterfall([
                (next) => {
                    getInstanceAndSeriesInformation( user, id, next);
                },
                (result, next) => {
                    if(result.imgMetadata.AccessionNumber === "modifiedByDcInsuite") {
                        return next();
                    }

                    if(!Y.doccirrus.ipc.isMaster()) {
                        Y.doccirrus.ipc.sendAsync( SAVE_DICOM_IMAGE_EVENT, {
                            instanceId: id,
                            imgMetadata: result.imgMetadata,
                            numberOfImages: result.numberOfImages,
                            user
                        }, onAttachPreview);
                    } else {
                        attachDicomPreview( {
                            user: user,
                            data: {
                                instanceId: id,
                                imgMetadata: result.imgMetadata,
                                numberOfImages: result.numberOfImages
                            },
                            callback: onAttachPreview
                        } );
                    }
                    next();
                }
            ], (err) => {
                if(err) {
                    Y.log( `getInstanceDcm: Error on getInstanceAndSeriesInformation method: ${JSON.stringify(err)}`, 'error', NAME );
                }
            });
        }


        /**
         * @method PRIVATE
         *
         * This method first saves the file on temporary location, then imports it into database and then deletes the temporary file.
         *
         * @param {object} user :REQUIRED: User object to use for performing DB operation
         * @param {string} fileName The name of the file ex. name.png
         * @param {buffer} fileBuffer File data buffer to write
         * @returns {Promise<{Object>} If successful then resolves to media object;
         */
        async function importMedia( user, fileName, fileBuffer ) {
            if( !user || !fileName || !fileBuffer ) {
                throw `importMedia: Missing input. Expected 'user', 'fileName', fileBuffer`;
            }

            if( typeof user !== "object" || typeof fileName !== "string" ) {
                throw `importMedia: Typeof 'user' == 'object' and 'fileName' == 'string' is required`;
            }

            const
                writeFileProm = util.promisify(fs.writeFile),
                unlinkProm = util.promisify(fs.unlink),
                importMediaFromFileProm = util.promisify(Y.doccirrus.media.importMediaFromFile),
                tempFilePath = `${Y.doccirrus.media.getTempDir()}${fileName}`;

            let
                err,
                mediaObj;

            // ---------------------------- 1. Write file to a temporary location --------------------------------------
            [err] = await formatPromiseResult( writeFileProm(tempFilePath, fileBuffer) );

            if( err ) {
                Y.log(`importMedia: Error while writing image buffer of file name: ${fileName} at: ${tempFilePath} for importing purpose. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // ----------------------------------- 1. END --------------------------------------------------------------


            // ---------------------------- 2. Import media from temporary location -------------------------------------------
            [err, mediaObj] = await formatPromiseResult(importMediaFromFileProm( user, tempFilePath, '', '', fileName, 'user', 'OTHER' ) );

            if( err ) {
                Y.log(`importMedia: Error saving image file in the database via importMediaFromFile routine. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !mediaObj || !mediaObj._id ) {
                Y.log(`importMedia: Failed to save image file to database via importMediaFromFile routine`, "error", NAME);
                throw `importMedia: Failed to save image file to database via importMediaFromFile routine.`;
            }
            // ----------------------------------------- 2. END ----------------------------------------------------------------


            // --------------------------- 3. Delete the file from temporary location -----------------------------------------
            [err] = await formatPromiseResult( unlinkProm(tempFilePath) );

            if( err ) {
                // No need to throw error here as the failure of this operation does not have any side effects
                Y.log(`importMedia: Error while cleaning up temp image file: ${tempFilePath}. Error: ${err.stack || err}`, "warn", NAME);
            }
            // ---------------------------------- 3. END ----------------------------------------------------------------------

            return mediaObj;
        }

        /**
         * Get image preview and metadata and attach it to activity
         * @param {Object} args object
         * @param {String} args.data.instanceId instance id
         */
        function attachDicomPreview( args ) {
            const
                { user, callback, data } = args,
                { instanceId, imgMetadata} = data,
                KEYS = "keys",
                SKIP = "skip";

            let
                numberOfImages = data.numberOfImages,
                foundActivity,
                g_extra,
                base_filename = instanceId + '.png',
                mediaId,
                studyIdArr = [],
                studyMetaData,
                studyId,
                imageBuffer,
                content;


            async.waterfall( [
                ( next ) => {
                    getInstanceImage( instanceId, ( err, result ) => {
                        if( err ) {
                            return next( err );
                        }
                        return next( null, result );
                    } );
                },
                ( imgBuf, next ) => {
                    imageBuffer = imgBuf;

                    Y.doccirrus.api.inpacsrest.getInstanceStudies({
                        httpRequest: {
                            query: {
                                id: instanceId
                            }
                        },
                        callback: next
                    });
                },
                ( studyMeta, next ) => {
                    if( imgMetadata.SeriesDescription === KEYS ) {
                        numberOfImages = 999999; //As per the previous expectation
                    }

                    studyMetaData = studyMeta;

                    g_extra = imgMetadata;
                    // g_extra.InstanceId = instanceId;
                    // g_extra.SeriesId = parentSeriesId;
                    g_extra.orthancStudyUId = studyMetaData.ID;
                    g_extra.orthancPatientUID = studyMetaData.ParentPatient;

                    // studyId = g_extra.AccessionNumber;

                    if(g_extra.AccessionNumber) {
                        studyIdArr.push(g_extra.AccessionNumber);
                    }

                    if(studyMetaData.ID) {
                        studyIdArr.push(studyMetaData.ID); //should be always present
                    }

                    if(!studyIdArr.length) {
                        return next( SKIP ); //there is nothing to query
                    }

                    if( imgMetadata && imgMetadata.ContentSequence ) {
                        content = imgMetadata.ContentSequence.map( ( item ) => `${item.ConceptNameCodeSequence[0].CodeMeaning} = "${item.TextValue || ''}"` ).join( '\n' );
                    }

                    Y.log( `Querying activity for Study IdArr: ${JSON.stringify(studyIdArr)}`, 'info', NAME );

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
                    }, next );
                },
                ( activities, next ) => {
                    if( activities && activities.length ) {
                        let
                            inpacsLogData = {studyMetaData, g_extra, external: false};

                        if( activities.length === 1 ) {
                            foundActivity = activities[0];
                            studyId = foundActivity.studyId;
                        } else {
                            //Should ideally never come here in this condition
                            let
                                correctActivity = activities.filter( (item) => {
                                    if( item.g_extra && item.g_extra.orthancStudyUId === g_extra.orthancStudyUId ) {
                                        return true;
                                    } else {
                                        return false;
                                    }
                                } );

                            if( correctActivity.length === 1 ) {
                                foundActivity = correctActivity[0];
                                studyId = foundActivity.studyId;
                            } else if( correctActivity.length > 1 ) {
                                //Should ideally never come here in this condition
                                Y.log(`attachDicomPreview: Multiple activities found for studyIdArr: ${JSON.stringify(studyIdArr)} and even "g_extra.orthancStudyUId" = ${g_extra.orthancStudyUId} Expected only 1. Picking the oldest`, "warn", NAME);

                                //Pick the oldest (which could possibly be original one which was later copied) one in case the activity was copied
                                foundActivity = correctActivity[0];
                                studyId = foundActivity.studyId;
                            } else {
                                //Should ideally never come here in this condition
                                Y.log(`attachDicomPreview: No activity matched "g_extra.orthancStudyUId" = ${g_extra.orthancStudyUId} but multiple activities found for studyIdArr: ${JSON.stringify(studyIdArr)} Expected only 1`, "warn", NAME);
                                // inpacsLogData.external = true;
                            }
                        }

                        if( foundActivity && (!foundActivity.g_extra || (foundActivity.g_extra.orthancStudyUId === g_extra.orthancStudyUId) ) ) {
                            inpacsLogData.activityId = foundActivity._id.toString();
                            inpacsLogData.patientId = foundActivity.patientId;
                        }

                        Y.doccirrus.api.inpacslog.checkAndCreate( {
                            user,
                            data: inpacsLogData,
                            callback: ( inpacsLogErr ) => {
                                if( inpacsLogErr ) {
                                    Y.log( `attachDicomPreview: Error in inpacslog.checkAndCreate method for OrthancStudyUId: ${studyMetaData.ID}. Error: ${inpacsLogErr}`, 'warn', NAME );
                                }

                                if( !inpacsLogData.activityId ) {
                                    return next( SKIP );
                                }

                                if( numberOfImages === 0 && !foundActivity.g_extra ) {
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'activity',
                                        action: 'put',
                                        fields: [ 'g_extra'],
                                        query: {
                                            _id: foundActivity._id.toString()
                                        },
                                        data: Y.doccirrus.filters.cleanDbObject( { g_extra: g_extra } )
                                    }, function( err ) {
                                        if( err ) {
                                            Y.log(`Error updating activityId ${foundActivity._id.toString()} with JUST g_extra as numberOfImages = ${numberOfImages}. Error: ${err.stack || err}`, 'error', NAME);
                                            return next( err );
                                        }
                                        next( "ONLY_G_EXTRA" );
                                    } );
                                    return;
                                }

                                if(foundActivity.attachedMedia && Array.isArray(foundActivity.attachedMedia) && foundActivity.attachedMedia.length >= numberOfImages) {
                                    return next( SKIP );
                                } else {
                                    return next();
                                }
                            }
                        } );
                    } else {
                        Y.doccirrus.api.inpacslog.checkAndCreate({
                            user,
                            data: {studyMetaData, g_extra, external: true},
                            callback: ( inpacsLogErr ) => {
                                if( inpacsLogErr ) {
                                    Y.log( `attachDicomPreview: Error in inpacslog.checkAndCreate method for external request with OrthancStudyUID: ${studyMetaData.ID} Error: ${inpacsLogErr}`, 'warn', NAME );
                                }
                                next( SKIP );
                            }
                        });
                    }
                },
                async ( next ) => {
                    if( !foundActivity ) {
                        return next( {} );
                    }
                    if( !imageBuffer ) {
                        return next( null, null );
                    }
                    next(...await formatPromiseResult( importMedia( user, base_filename, imageBuffer ) ));
                },
                ( mediaObjects, next ) => {

                    if( !foundActivity ) {
                        return next( {} );
                    }

                    if( !imageBuffer ) {
                        return next( null, null );
                    }
                    mediaId = mediaObjects._id;

                    let data = {
                        type: 'OTHER',
                        contentType: mediaObjects.mimeType,
                        createdOn: moment().utc().toJSON(),
                        isEditable: false,
                        accessBy: [],
                        url: `/1/media/:download?_id=${mediaId.toString()}&mime=${mediaObjects.mimeType}&from=casefile`,
                        mediaId: mediaId,
                        caption: base_filename
                    };

                    data = Y.doccirrus.filters.cleanDbObject( data );
                    Y.doccirrus.mongodb.runDb( {
                        model: 'document',
                        action: 'post',
                        user: user,
                        data: data,
                        options: {entireRec: true}
                    }, next );
                },
                ( document, next ) => {

                    if( !foundActivity ) {
                        return next();
                    }

                    let
                        attachments = foundActivity.attachments || [],
                        insertedDocument;

                    if( document && document.length ) {
                        attachments.push( document[0]._id.toString() );
                        insertedDocument = document[0];
                    }

                    let
                        putData = {
                            'fields_': ['attachments', 'g_extra'],
                            'attachments': attachments,
                            'g_extra': g_extra
                        };

                    putData = Y.doccirrus.filters.cleanDbObject( putData );

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'activity',
                        'action': 'put',
                        'query': { _id: foundActivity._id.toString() },
                        'data': putData,
                        'callback': ( err ) => next( err, Object.assign( {}, putData, {
                            studyId: studyId,
                            userContent: content,
                            insertedDocument: insertedDocument,
                            _id: foundActivity._id.toString()
                        } ) )
                    } );
                }
            ], ( err, activityUpdateData ) => {
                if( err ) {
                    if( err === SKIP ) {
                        return callback(null, {
                            skip:true
                        });
                    }
                    if( err === "ONLY_G_EXTRA" ) {
                        return callback(null, {
                            activity:{
                                _id: foundActivity._id.toString(),
                                userContent: content,
                                studyId: studyId,
                                g_extra: g_extra,
                                ONLY_G_EXTRA: "ONLY_G_EXTRA"
                            }
                        });
                    }
                    Y.log( 'Error on processing DICOM image ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
                callback(null, {
                    activity:activityUpdateData
                });
            } );
        }

        function buildXmlRpc( method, inputParams ) {

            //complete builder implementation
            let xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';

            if( 'string' !== typeof method ) {
                throw "invalid method: method name is not a string";
            }
            if( inputParams && !Array.isArray( inputParams ) ) {
                throw "given params are not an array";
            }

            inputParams = inputParams || [];

            function methodCall( method, inputParams ) {
                return '<methodCall>' + methodName( method ) + params( inputParams ) + '</methodCall>';
            }

            function methodName( method ) {
                return '<methodName>' + method + '</methodName>';
            }

            function name( n ) {
                return '<name>' + n + '</name>';
            }

            function params( inputParams ) {
                return '<params>' + inputParams.map( val => param( val ) ).join( "" ) + '</params>';
            }

            function param( val ) {
                return '<param>' + value( val ) + '</param>';
            }

            function value( val ) {
                let ret = "";
                switch( typeof val ) {
                    case 'undefined':
                        ret = nil();
                        break;
                    case 'boolean':
                        ret = boolean( val );
                        break;
                    case 'number':
                        if( Number.isNaN( val ) ) {
                            throw "invalid number value: NaN";
                        } else if( Number.POSITIVE_INFINITY === val || Number.NEGATIVE_INFINITY === val ) {
                            throw "invalid number value: Infinity";
                        } else if( Number.isInteger( val ) ) {
                            ret = int( val );
                        } else {
                            ret = double( val );
                        }
                        break;
                    case 'string':
                        ret = string( val );
                        break;
                    case 'object':
                        if( null === val ) {
                            ret = nil();
                        } else if( Array.isArray( val ) ) {
                            ret = array( val );
                        } else if( val instanceof Date ) {
                            if( 'Invalid Date' === val.toString() ) {
                                throw "invalid Date";
                            } else {
                                ret = dateTime( val );
                            }
                        } else if( val instanceof ArrayBuffer ) {
                            ret = base64( Buffer.from( val ) );
                        } else if( Buffer.isBuffer( val ) ) {
                            ret = base64( val );
                        } else {
                            ret = struct( val );
                        }
                }
                if( !ret ) {
                    throw "unrecognized value: " + val;
                }
                if( Array.isArray( val ) ) {
                    ret = array( val );
                }
                return "<value>" + ret + "</value>";
            }

            function nil() {
                return "<nil></nil>";
            }

            function boolean( val ) {
                return "<boolean>" + (!!val ? 1 : 0) + "</boolean>";
            }

            function int( val ) {
                return "<int>" + val + "</int>";
            }

            function double( val ) {
                return "<double>" + val + "</double>";
            }

            function string( val ) {
                return "<string>" + val + "</string>";
            }

            function array( val ) {
                return "<array><data>" + val.map( val => value( val ) ).join( "" ) + "</data></array>";
            }

            function dateTime( val ) {
                return "<dateTime.iso8601>" + val.toISOString() + "</dateTime.iso8601>";
            }

            function base64( val ) {
                return "<base64>" + val.toString( 'base64' ) + "</base64>";
            }

            function struct( val ) {
                return "<struct>" + Object.keys( val ).map( key => member( key, val[key] ) ).join( "" ) + "</struct>";
            }

            function member( key, val ) {
                return "<member>" + name( key ) + value( val ) + "</member>";
            }

            return xmlHeader + methodCall( method, inputParams );
        }

        function parseXmlRpc( msg ) {
            //strip out newlines and indent
            msg = msg.replace( /\n */g, "" );

            let ret = {};
            let msgTags = [];
            let tempStr = "";

            function splitTopTags( msg ) {
                let ret = [];
                let depth = 0;
                let pos = 0;
                let tag = "";

                for( let i = 0; i < msg.length; i++ ) {
                    if( !tag ) {
                        if( msg[i][0] !== "<" || msg[i][msg[i].length - 1] !== ">" ) {
                            throw "not a tag: " + msg[i];
                        }
                        tag = msg[i].slice( 1, -1 );
                    }
                    if( msg[i] === "<" + tag + ">" ) {
                        depth++;
                    }
                    if( msg[i] === "</" + tag + ">" ) {
                        depth--;
                        if( depth < 1 ) {
                            depth = 0;
                            tag = "";
                            ret.push( msg.slice( pos, i + 1 ) );
                            pos = i + 1;
                        }
                    }
                }
                return ret;
            }

            function isSurroundedBy( msg, tag ) {
                return "<" + tag + ">" === msg[0] && "</" + tag + ">" === msg[msg.length - 1];
            }

            function parseHeader( msg ) {
                if( 0 === msg[0].indexOf( "<?xml" ) ) {
                    parseBody( splitTopTags( msg.slice( 1 ) ) );
                } else {
                    throw "xml header missing";
                }
            }

            function parseBody( msg ) {
                if( msg.length > 1 ) {
                    throw "unexpected method description shape: more than one top-level element";
                }
                switch( msg[0][0] ) {
                    case "<methodCall>":
                        parseMethodCall( splitTopTags( msg[0].slice( 1, -1 ) ) );
                        break;
                    case "<methodResponse>":
                        parseMethodResponse( splitTopTags( msg[0].slice( 1, -1 ) ) );
                        break;
                    default:
                        throw "method tag not recognized: " + msg[0][0];
                }
            }

            function parseMethodCall( msg ) {
                for( let i = 0; i < msg.length; i++ ) {
                    if( isSurroundedBy( msg[i], "methodName" ) ) {
                        parseMethodName( msg[i].slice( 1, -1 ) );
                    }
                    if( isSurroundedBy( msg[i], "params" ) ) {
                        parseParams( splitTopTags( msg[i].slice( 1, -1 ) ) );
                    }
                }
            }

            function parseMethodResponse( msg ) {
                for( let i = 0; i < msg.length; i++ ) {
                    if( isSurroundedBy( msg[i], "params" ) ) {
                        return parseParams( splitTopTags( msg[i].slice( 1, -1 ) ) );
                    }
                }
            }

            function parseMethodName( msg ) {
                if( msg.join ) {
                    ret.methodName = msg.join( "" );
                } else {
                    ret.methodName = msg;
                }
            }

            function parseParams( msg ) {
                ret.params = msg.map( p => {
                    if( isSurroundedBy( p, "param" ) && isSurroundedBy( p.slice( 1, -1 ), "value" ) ) {
                        return parseValue( p.slice( 2, -2 ) );
                    } else {
                        throw "invalid param shape: " + p;
                    }
                } );
            }

            function parseValue( msg ) {
                if( isSurroundedBy( msg, "nil" ) ) {
                    return parseNil( msg.slice( 1, -1 ) );
                }
                if( isSurroundedBy( msg, "boolean" ) ) {
                    return parseBoolean( msg.slice( 1, -1 ) );
                }
                if( isSurroundedBy( msg, "int" ) || isSurroundedBy( msg, "i4" ) || isSurroundedBy( msg, "i8" ) || isSurroundedBy( msg, "i16" ) || isSurroundedBy( msg, "double" ) ) {
                    return parseNumber( msg.slice( 1, -1 ) );
                }
                if( isSurroundedBy( msg, "string" ) ) {
                    return parseString( msg.slice( 1, -1 ) );
                }
                if( isSurroundedBy( msg, "dateTime.iso8601" ) ) {
                    return parseDate( msg.slice( 1, -1 ) );
                }
                if( isSurroundedBy( msg, "base64" ) ) {
                    return parseBase64( msg.slice( 1, -1 ) );
                }
                if( isSurroundedBy( msg, "array" ) && isSurroundedBy( msg.slice( 1, -1 ), "data" ) ) {
                    return parseArray( splitTopTags( msg.slice( 2, -2 ) ) );
                }
                if( isSurroundedBy( msg, "struct" ) ) {
                    return parseStruct( splitTopTags( msg.slice( 1, -1 ) ) );
                }

                return msg.join( "" );
            }

            function parseNil() {
                return null;
            }

            function parseNumber( msg ) {
                if( msg.length > 1 ) {
                    throw "invalid number data: " + msg;
                }
                return Number.parseFloat( msg[0] );
            }

            function parseBoolean( msg ) {
                if( msg.length > 1 ) {
                    throw "invalid number data: " + msg;
                }
                return !!Number.parseInt( msg[0] );  // eslint-disable-line
            }

            function parseString( msg ) {
                if( msg.length > 1 ) {
                    throw "invalid number data: " + msg;
                }
                return msg[0];
            }

            function parseDate( msg ) {
                if( msg.length > 1 ) {
                    throw "invalid number data: " + msg;
                }
                return new Date( msg[0] );
            }

            function parseBase64( msg ) {
                if( msg.length > 1 ) {
                    throw "invalid number data: " + msg;
                }
                return Buffer.from( msg[0], 'base64' );
            }

            function parseArray( msg ) {
                return msg.map( p => {
                    if( isSurroundedBy( p, "value" ) ) {
                        return parseValue( p.slice( 1, -1 ) );
                    } else {
                        throw "invalid array element shape: " + p;
                    }
                } );
            }

            function parseStruct( msg ) {
                let ret = {};
                msg.forEach( m => {
                    if( isSurroundedBy( m, "member" ) ) {
                        m = splitTopTags( m.slice( 1, -1 ) );
                        let key = "";
                        let value = null;
                        m.forEach( nv => {
                            if( isSurroundedBy( nv, "name" ) ) {
                                key = nv.slice( 1, -1 ).join( "" );
                            }
                            if( isSurroundedBy( nv, "value" ) ) {
                                value = parseValue( nv.slice( 1, -1 ) );
                            }
                        } );
                        if( key && value ) {
                            ret[key] = value;
                        }
                    } else {
                        throw "invalid array element shape: " + m;
                    }
                } );
                return ret;
            }

            for( let i = 0; i < msg.length; i++ ) {
                if( "<" === msg[i] && tempStr ) {
                    msgTags.push( tempStr );
                    tempStr = "";
                }
                tempStr += msg[i];
                if( ">" === msg[i] ) {
                    msgTags.push( tempStr );
                    tempStr = "";
                }
            }

            parseHeader( msgTags );

            return ret;
        }

        function postXmlRpc( method, inputParams, hostname, port, cb ) {
            let xml = "";
            try {
                xml = buildXmlRpc( method, inputParams );
            } catch( err ) {
                return cb( err );
            }
            postData( hostname, port, "/", xml, ( err, res, req ) => {
                if( err ) {
                    return cb( err );
                }
                try {
                    let response = parseXmlRpc( res );
                    return cb( null, 1 === response.params.length ? response.params[0] : response.params, req, req.res );
                } catch( err ) {
                    return cb( err, null, req, req.res );
                }
            } );
        }

        function postData( hostname, port, path, data, callback ) {
            data = data.toString();
            let opt = {
                hostname,
                port,
                path,
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": data.length
                }
            };
            let chunks = "";
            let req = http.request( opt, res => {
                res.on( 'data', chunk => chunks += chunk );  // eslint-disable-line
                res.on( 'end', () => {
                    callback( null, chunks, req );
                } );
            } );

            req.on( 'error', err => {
                callback( err, chunks, req );
            } );

            req.write( data );
            req.end();
        }

        function getData( hostname, port, path, callback ) {
            let opt = {
                hostname,
                port,
                path,
                method: "GET"
            };
            let chunks = "";
            let req = http.request( opt, res => {
                res.on( 'data', chunk => chunks += chunk );  // eslint-disable-line
                res.on( 'end', () => {
                    callback( null, chunks, req );
                } );
            } );

            req.on( 'error', err => {
                callback( err, chunks, req );
            } );

            req.end();
        }

        function postDataToOrthanc( path, data, callback ) {
            Y.log( "postDataToOrthanc: " + path + "::" + data, 'info', NAME );
            postData( orthanHost, orthanPort, path, data, ( err, res, req ) => {
                if( err || !res ) {
                    Y.log( err, 'info', NAME );
                    return callback( err || ( req.res && req.res.statusCode ) || "NO_DATA", null, req );
                }
                try {
                    res = JSON.parse( res );
                    return callback( null, res, req );
                } catch( err ) {
                    return callback( null, res, req );
                }
            } );
        }

        function getFromOrthanc( path, callback ) {
            Y.log( "getFromOrthanc: " + path, 'info', NAME );
            getData( orthanHost, orthanPort, path, ( err, res, req ) => {
                if( err || !res ) {
                    Y.log( err, 'info', NAME );
                    return callback( err || ( req.res && req.res.statusCode ) || "NO_DATA", null, req );
                }
                try {
                    res = JSON.parse( res );
                    return callback( null, res, req );
                } catch( err ) {
                    return callback( null, res, req );
                }
            } );
        }

        function openInOsirix( user, studyInstanceUID, osirixInstance, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'inpacsmodality',
                query: {
                    name: osirixInstance
                }
            }, ( err, res ) => {
                if( err || !res[0] || !res[0].ip ) {
                    return callback( err || Y.doccirrus.errors.rest( 41002, null, true ) );
                }

                postXmlRpc( "DisplayStudy", [{ studyInstanceUID }], res[0].ip, 8080, ( err, params, req, res ) => {
                    callback( err, params, req, res );
                } );
            } );
        }

        function tryOpeningInOsirixWhenFound( user, studyInstanceUID, osirixInstance, callback ) {
            postDataToOrthanc( "/modalities/" + osirixInstance + "/query", '{"Level":"Study", "Query":{"StudyInstanceUID":"' + studyInstanceUID + '"}}', ( err, res ) => {
                if( !res ) {
                    return callback( err || "broken query" );
                }
                getFromOrthanc( res.Path + "/answers", ( err, res ) => {
                    if( err || !res ) {
                        return callback( err || "Orthanc GET empty" );
                    }
                    //res will be an array of available answers, ['0', '1',...] that can be used to call /answers/[number]/ etc.
                    if( res.length > 0 ) {
                        openInOsirix( user, studyInstanceUID, osirixInstance, callback );
                    } else {
                        setTimeout( () => {
                            tryOpeningInOsirixWhenFound( user, studyInstanceUID, osirixInstance, callback );
                        }, 1000 );
                    }
                } );
            } );
        }

        function sendStudyAndOpen( user, studyInstanceUID, osirixInstance, callback ) {
            Y.log( "sendSeriesAndOpen: " + studyInstanceUID + " to " + osirixInstance, 'info', NAME );

            let storeUrl = `/${modalitiesUrl}/${osirixInstance}/store`;

            postDataToOrthanc( toolsLookupUrl, studyInstanceUID, ( err, studyData ) => {
                if( err || !studyData[0] ) {
                    Y.log( err, 'info', NAME );
                    if( err.toString().indexOf( "ECONNREFUSED" ) > -1 ) {
                        return callback( Y.doccirrus.errors.rest( 41001, null, true ) );
                    } else {
                        return callback( err || "no study found" );
                    }
                }
                Y.log( "sendSeriesAndOpen: got internal ID: " + studyData[0].ID, 'info', NAME );
                postDataToOrthanc( storeUrl, studyData[0].ID, ( err, res ) => {
                    if( err || !res ) {
                        if( err.toString() === "500" ) {
                            return callback( Y.doccirrus.errors.rest( 41003, null, true ) );
                        }
                        Y.log( err, 'info', NAME );
                        return callback( err || "unknown error" );
                    }
                    if( Object.keys( res ).length < 1 ) {
                        tryOpeningInOsirixWhenFound( user, studyInstanceUID, osirixInstance, callback );
                    }
                } );
            } );
        }

        Y.namespace( 'doccirrus.api' ).inpacs = {
            name: NAME,
            getInstanceDcm,
            sendStudyAndOpen,
            openInOsirix,
            fetchAndSaveKeyImagesToDb,
            modifyStudy,
            getAllPatientsFromOrthanc,
            getAllStudiesFromOrthanc,
            getAllSeriesFromOrthanc,
            getAllInstancesByPatientId,
            getAllInstancesByStudyId,
            getAllInstancesBySeriesId,
            getPatientMetaFromPatientId,
            getStudyMetaFromStudyId,
            getStudyMetaFromSeriesId,
            getSeriesListFromStudyId,
            getGExtraForStudyId,
            deletePatientById,
            deleteStudyById,
            deleteSeriesById
        };
    },

    '0.0.1', {
        requires: [
            'inpacsrest-api',
            'inpacslog-api'
        ]
    }
);
