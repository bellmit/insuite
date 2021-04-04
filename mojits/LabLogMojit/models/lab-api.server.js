/**
 *  Library for lab-related actions
 *
 *  @author: jm
 *  @date: 2015-07-15
 */

/*global YUI */

YUI.add( 'lab-api', function( Y, NAME ) {

        const
            runDb = Y.doccirrus.mongodb.runDb,
            i18n = Y.doccirrus.i18n,
            gridfs = Y.doccirrus.gridfs,
            forms = Y.doccirrus.forms,
            inCaseUtils = Y.doccirrus.inCaseUtils,
            lablogSchema = Y.doccirrus.schemas.lablog,
            labdata = Y.doccirrus.labdata,
            util = require( 'util' ),
            moment = require( 'moment' ),
            fs = require( 'fs' ),
            {formatPromiseResult, handleResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            {logEnter, logExit} = require( `../../../server/utils/logWrapping` )( Y, NAME ),
            UNKNOWN = i18n( 'LabLogMojit.labLog.UNKNOWN' ),
            NAMEfileLog = `${NAME}:file`,
            readFile = util.promisify( fs.readFile ),
            getLastScheinPromise = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein ),
            checkCaseFolderPromise = promisifyArgsCallback( Y.doccirrus.api.casefolder.checkCaseFolder ),
            getDefaultUserContentPromise = util.promisify( Y.doccirrus.api.activitysettings.getDefaultUserContent ),
            headersAndFooters = ['0020', '8220', '8230', '8231', '8221', '0021'], // headers/footers
            feeScheduleMap = { //this maps EGO to EBM
                '1': 'EBM',
                '2': 'EBM',
                '3': 'GOÄ',
                '4': 'UVGOÄ',
                '90': 'EAL'  //Swiss
            },
            feeScheduleMapToCaseFolderType = {
                1: 'PUBLIC',
                2: 'PUBLIC',
                3: {$in: ['PRIVATE', 'SELFPAYER']},
                4: 'BG'
            },
            actTypeFromFeeSchedule = {
                'EBM': 'SCHEIN',
                'GOÄ': 'PKVSCHEIN',
                'GebüH': 'PKVSCHEIN',
                'UVGOÄ': 'BGSCHEIN',
                'EAL': 'PKVSCHEIN' //Swiss
            },
            recordRequestField = '8310',
            labRequestField = '8311',
            patientIdField = '8405',
            patientNameField = 'nameDob',
            wildcardFields = Object.freeze( {
                caseFolderId: 'dccasefolderid',
                employeeName: 'dcemployeename'
            } ),
            EVENTS = Object.freeze( {
                triggerLabProcessEvent: 'triggerLabProcessEvent',
                submitLDTEvent: 'submitLDTEvent'
            } );

        /**
         * @typedef {Object} activityDetails
         * @property {module:patientSchema.patient} patient
         * @property {ObjectId} caseFolderId
         * @property {ObjectId} locationId
         * @property {ObjectId} employeeId
         * @property {String} assignmentField
         * @property {String} assignmentValue
         */

        /**
         * @typedef {Object} triggerLabLogResponse
         * @property {Number} unassignedEntries
         * @property {Number} newlyAssigned
         */

        /**
         * creates and handles labdata objects
         * @class Lab
         */

            //  MOJ-10176 - keep list of file hashes in memory, to prevent multiple concurrent imports of the same
            //  file.

        let knownLdtFileHashes = [];

        let Lab = {};
        Lab.name = NAME;

        /**
         * REST function for LDT upload
         * @method submitLDT
         * @param {Object} args standard REST args that require a POST-based attachment
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.data - Config Object.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Function} returns Frontend Callback.
         */
        async function submitLDT( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.submitLDT' );
            const {
                data: cfg = {},
                user
            } = args;
            let {
                callback,
                ldtFile: ldtFileFromArgs
            } = args;
            const {
                respondimmediately = false,
                ignoreHashExists = false,
                skipParsingLdt = false,
                flow = ''
            } = cfg;

            //respond immediately to frontend, because ldt files > 1mb take long to parse/process
            if( respondimmediately ) {
                // eslint-disable-next-line callback-return
                callback();

                callback = function finalResponse( errResp, successResp ) {
                    logExit( timer );
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: EVENTS.submitLDTEvent,
                        msg: {
                            data: {
                                result: successResp,
                                error: errResp
                            }
                        }
                    } );
                };
            }

            //read file from browser
            let [err, ldtFile] = await formatPromiseResult(
                readLDTFile( {
                    args: args
                } )
            );

            if( err ) {
                Y.log( `submitLDT: failed to read LDTFile ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                return handleError( {
                    err: err,
                    callback: callback,
                    code: err.code || 19005
                } );
            }

            //check lablog db for existing entries
            let ldtFileAfterDuplicateChecking;
            [err, ldtFileAfterDuplicateChecking] = await formatPromiseResult(
                checkLabLogForDuplicateImport( {
                    data: ldtFile.data,
                    ldtFile: ldtFile.ldtFile,
                    ignoreHashExists: ignoreHashExists,
                    user: user
                } )
            );

            if( err ) {
                Y.log( `submitLDT: failed to checkLabLogForDuplicateImport ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                return handleError( {
                    err: err,
                    callback: callback,
                    code: err.code || 19006
                } );
            }

            //parse LDT
            let parsedLDTFile;
            if( !skipParsingLdt ) {
                [err, parsedLDTFile] = await formatPromiseResult(
                    parseLDTFile( {
                        cfg: cfg,
                        data: ldtFileAfterDuplicateChecking.data,
                        ldtFile: ldtFileAfterDuplicateChecking.ldtFile,
                        user: user
                    } )
                );

                if( err ) {
                    Y.log( `submitLDT: failed to parseLDTFile ${err.stack || err}`, 'error', NAME );
                    logExit( timer );
                    return handleError( {
                        err: err,
                        callback: callback,
                        code: err.code || 19007
                    } );
                }
            } else {
                parsedLDTFile = ldtFileFromArgs;
            }

            //save LDT File with gridfs
            let savedLDTFile;
            [err, savedLDTFile] = await formatPromiseResult(
                saveLDTFileOnDisk( {
                    data: ldtFileAfterDuplicateChecking.data,
                    ldtFile: ldtFileAfterDuplicateChecking.ldtFile,
                    ldtJson: parsedLDTFile.ldtJson,
                    user: args.user
                } )
            );

            if( err ) {
                Y.log( `submitLDT: failed to saveLDTFileOnDisk ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                return handleError( {
                    err: err,
                    callback: callback,
                    code: err.code || 19008
                } );
            }

            // fetches metadata like doc ID and location ID
            let metaData;
            [err, metaData] = await formatPromiseResult(
                getMetaData( {
                    ldtJson: parsedLDTFile.ldtJson
                } )
            );

            if( err ) {
                logExit( timer );
                return handleError( {
                    err: err,
                    callback: callback,
                    code: err.code || 19009
                } );
            }

            let initialLabLogData;
            [err, initialLabLogData] = await formatPromiseResult(
                getInitialLabLogDataFromLDT( {
                    cfg: cfg,
                    dateOfCreation: metaData.dateOfCreation,
                    flow: flow,
                    labName: metaData.labName,
                    ldtFile: ldtFileAfterDuplicateChecking.ldtFile,
                    ldtJson: parsedLDTFile.ldtJson,
                    pmResults: parsedLDTFile.pmResults,
                    savedLDTFile: savedLDTFile,
                    user: args.user
                } )
            );

            if( err ) {
                Y.log( `getInitialLabLogDataFromLDT err: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                return handleError( {
                    err: err,
                    callback: callback,
                    code: err.code || 19010
                } );
            }
            if( !initialLabLogData || !initialLabLogData.length ) {
                logExit( timer );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'no initialLabLogData'} ), null, callback );
            }

            let labLogs;
            [err, labLogs] = await formatPromiseResult(
                writeInitialLabLogs( {
                    dataToInsert: initialLabLogData,
                    user: args.user
                } )
            );

            if( err ) {
                Y.log( `submitLDT: writeInitialLabLogs err: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                return handleResult( err, null, callback );
            }

            let listOfChecksToDo = [];
            for( let entry of labLogs ) {
                listOfChecksToDo.push(
                    redundancyCheck( {
                            ldtJson: entry.l_data,
                            user: args.user
                        }
                    )
                );
            }

            [err] = await formatPromiseResult(
                Promise.all( listOfChecksToDo )
            );

            if( err ) {
                Y.log( `submitLDT: redundancyCheck err: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                return handleResult( err, null, callback );
            }

            for( let labLog of labLogs ) {
                labLog.status = 'IMPORTED';

                let processedLabLog;
                [err, processedLabLog = labLog] = await formatPromiseResult(
                    processLabLog( {
                        user: user,
                        labLog: labLog,
                        cfg: cfg,
                        metaData: metaData,
                        savedLDTFile: savedLDTFile
                    } )
                );
                if( err ) {
                    if( processedLabLog.errs && Array.isArray( processedLabLog.errs ) ) {
                        processedLabLog.errs.push( err );
                    } else {
                        processedLabLog.errs = [err];
                    }
                }

                //update lablog entries
                [err] = await formatPromiseResult(
                    updateLabLogs( {
                        dbData: processedLabLog,
                        user: user
                    } )
                );

                if( err ) {
                    Y.log( `submitLDT: updateLabLogs err: ${err.stack || err}`, 'warn', NAME );
                    logExit( timer );
                    return handleResult( err, null, callback );
                }
            }

            logExit( timer );
            return handleResult( null, labLogs, callback );
        }

        /**
         * REST function to check and create missing Treatments from Labdata
         * @method checkAndCreateMissingTreatmentsFromLabdata
         * @param {Object} args
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.data - Config Object.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Function} returns Frontend Callback.
         */
        async function checkAndCreateMissingTreatmentsFromLabdata( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.checkAndCreateMissingTreatmentsFromLabdata' );
            let {
                httpRequest: {
                    query: {
                        billingFlag,
                        disallowGkvBilling,
                        allowGkvBilling,
                        defaultBehaviour
                    } = {}
                } = {},
                callback,
                user
            } = args;

            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.checkAndCreateMissingTreatmentsFromLabdata' );
            }

            defaultBehaviour = defaultBehaviour === 'true';
            if( !defaultBehaviour && (billingFlag === undefined || disallowGkvBilling === undefined || allowGkvBilling === undefined) ) {
                return handleResult( null, Y.doccirrus.errors.http( 500, `Missing Params!` ), callback );
            }
            if( defaultBehaviour ) {
                billingFlag = true;
                disallowGkvBilling = false;
                allowGkvBilling = false;
            } else {
                billingFlag = billingFlag === 'true';
                disallowGkvBilling = disallowGkvBilling === 'true';
                allowGkvBilling = allowGkvBilling === 'true';
            }

            if( !billingFlag ) {
                return handleResult( null, Y.doccirrus.errors.http( 200, `No Treatments to create.` ), callback );
            }

            const localFeeScheduleMap = {
                'PUBLIC': 'EBM',
                'PRIVATE': 'GOÄ',
                'BG': 'UVGOÄ'
            };

            let [err, labdataActivities] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        actType: 'LABDATA',
                        l_extra: {$exists: true},
                        labRequestId: {$exists: true},
                        timestamp: {$gte: moment( '01.01.2020 00:00:00', 'DD.MM.YYYY HH:mm:ss' ).toISOString()}
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `checkAndCreateMissingTreatmentsFromLabdata: can not query LABDATA activities, err: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, null, args.callback );
            }

            let
                treatmentsToCheck = [],
                treatmentsToCreate = [];

            for( let labData of labdataActivities ) {
                let [err, caseFolder] = await formatPromiseResult(
                    runDb( {
                        model: 'casefolder',
                        user: user,
                        action: 'get',
                        query: {
                            _id: labData.caseFolderId
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `checkAndCreateMissingTreatmentsFromLabdata: can not query casefolder with id: ${labData.caseFolderId}, err: ${err.stack || err}`, 'warn', NAME );
                    continue;
                }

                if( disallowGkvBilling && caseFolder && caseFolder.type === 'PUBLIC' ) {
                    Y.log( 'checkAndCreateMissingTreatmentsFromLabdata: skipping creation of tests, because disallowGkvBilling is set and caseFolder is PUBLIC', 'info', NAME );
                    continue;
                }

                let
                    allLabDataTests = [],
                    allTestsWithGnrFromLabData = [],
                    feeSchedule = caseFolder && Array.isArray( caseFolder ) && caseFolder.length &&
                                  localFeeScheduleMap[caseFolder[0].type],
                    catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'TREATMENT',
                        short: feeSchedule
                    } );

                if( Array.isArray( labData.l_extra ) ) {
                    for( let i = 0; i < labData.l_extra.length; i++ ) {
                        allLabDataTests = allLabDataTests.concat( lablogSchema.getRecordTests( labData.l_extra[i] ) );
                    }
                } else {
                    allLabDataTests = allLabDataTests.concat( lablogSchema.getRecordTests( labData.l_extra ) );
                }
                allTestsWithGnrFromLabData = allLabDataTests.filter( test => lablogSchema.getTestGnr( test ) );

                for( let test of allTestsWithGnrFromLabData ) {
                    const areTreatmentDiagnosesBillable = (caseFolder.type === 'PUBLIC' && !allowGkvBilling) ? '0' : '1';
                    let recGnr = lablogSchema.getTestGnr( test ) || [];
                    let [err, treatments] = await formatPromiseResult(
                        getAllTreatmentsFromTest( {
                            areTreatmentDiagnosesBillable: areTreatmentDiagnosesBillable,
                            catalogDescriptor: catalogDescriptor,
                            feeSchedule: 'GOÄ',
                            recGnr: recGnr,
                            test: test,
                            version: labData.l_version.name
                        } )
                    );
                    if( err ) {
                        Y.log( `checkAndCreateMissingTreatmentsFromLabdata: getAllTreatmentsFromTest err: ${err.stack || err}`, 'warn', NAME );
                    }

                    if( treatments && treatments.length ) {
                        for( let i = 0; i < treatments.length; i++ ) {
                            if( !treatments[i] ) {
                                Y.log( `checkAndCreateMissingTreatmentsFromLabdata: malformed treatment... continue`, 'info', NAME );
                                continue;
                            }

                            let activityDataFromTreatment;
                            [err, activityDataFromTreatment] = await formatPromiseResult(
                                evaluateTreatment( {
                                    billable: treatments[i].billable,
                                    caseFolderId: labData.caseFolderId,
                                    catalogDescriptor: treatments[i].catalogDescriptor,
                                    cost: treatments[i].cost,
                                    employeeId: labData.employeeId,
                                    factor: treatments[i].factor,
                                    feeSchedule: lablogSchema.getTestFeeSchedule( treatments[i] ),
                                    gnr: lablogSchema.getTestGnr( treatments[i] ),
                                    labReqId: labData.labRequestId,
                                    locationId: labData.locationId,
                                    patientId: labData.patientId,
                                    test: treatments[i].test,
                                    timestamp: labData.timestamp,
                                    user: args.user
                                } )
                            );

                            if( err ) {
                                Y.log( `checkAndCreateMissingTreatmentsFromLabdata: evaluateTreatment err: ${err.stack || err}`, 'warn', NAME );
                                continue;
                            }

                            if( activityDataFromTreatment ) {
                                treatmentsToCheck.push( activityDataFromTreatment );
                            }
                        }
                    }
                }
            }

            for( let treatment of treatmentsToCheck ) {
                let [err, treatmentActivity] = await formatPromiseResult(
                    runDb( {
                        model: 'activity',
                        user: user,
                        action: 'get',
                        query: {
                            code: treatment.code,
                            patientId: treatment.patientId,
                            caseFolderId: treatment.caseFolderId,
                            locationId: treatment.locationId,
                            timestamp: treatment.timestamp
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `checkAndCreateMissingTreatmentsFromLabdata: treatment, err: ${err.stack || err}`, 'warn', NAME );
                } else if( treatmentActivity && Array.isArray( treatmentActivity ) && treatmentActivity.length ) {
                    Y.log( `checkAndCreateMissingTreatmentsFromLabdata: treatment {code: ${treatmentActivity[0].code}, patientId: ${treatmentActivity[0].patientId}, caseFolderId: ${treatmentActivity[0].caseFolderId}, userContent: ${treatmentActivity[0].userContent}} already exists.`, 'info', NAME );
                } else {
                    if( !treatmentsToCreate.find( treatmnt =>
                        treatmnt.code === treatment.code &&
                        treatmnt.patientId === treatment.patientId &&
                        treatmnt.timestamp === treatment.timestamp &&
                        treatmnt.caseFolderId === treatment.caseFolderId &&
                        treatmnt.employeeId === treatment.employeeId )
                    ) {
                        treatmentsToCreate.push( treatment );
                    }
                }
            }

            let postedActivities = [];
            let inBoxActivities = [];

            if( treatmentsToCreate.length > 0 ) {
                let err;
                for( let i = 0; i < treatmentsToCreate.length; i++ ) {
                    [err, postedActivities] = await formatPromiseResult(
                        postActivity( {
                            activityData: treatmentsToCreate[i],
                            user: args.user
                        } )
                    );

                    if( err ) {
                        Y.log( `checkAndCreateMissingTreatmentsFromLabdata: failed to save treatment ${err.stack || err}`, 'warn', NAME );
                        Y.log( `checkAndCreateMissingTreatmentsFromLabdata: INSERTING into INBOX`, 'warn', NAME );
                        let inboxCaseFolderId = await Y.doccirrus.api.casefolder.getInBoxCaseFolderId( {
                            user: user,
                            data: {patientId: treatmentsToCreate[i].patientId}
                        } );
                        let inBoxAct = treatmentsToCreate[i];
                        inBoxAct.caseFolderId = inboxCaseFolderId;
                        inBoxActivities.push( inBoxAct );
                    } else if( postedActivities ) {
                        Y.log( `checkAndCreateMissingTreatmentsFromLabdata: created Treatment: ${postedActivities}`, 'info', NAME );
                    }
                }
                for( let i = 0; i < inBoxActivities.length; i++ ) {
                    let [err, postedInBoxActivity] = await formatPromiseResult(
                        postActivity( {
                            activityData: inBoxActivities[i],
                            user: args.user
                        } )
                    );
                    if( err ) {
                        Y.log( `checkAndCreateMissingTreatmentsFromLabdata: failed to save treatment into INBOX ${err.stack || err}`, 'warn', NAME );
                    } else if( postedInBoxActivity ) {
                        Y.log( `checkAndCreateMissingTreatmentsFromLabdata: created Treatment in INBOX: ${postedInBoxActivity}`, 'info', NAME );
                    }
                }
            }

            //TODO: link created activities to LABLOG entry
            logExit( timer );
            return callback( null, 'done' );
        }

        /**
         * REST function to regenerate labEntries of all LABDATA activities
         * @method regenerateAllLabEntries
         * @param {Object} args
         * @param {Function} args.callback - callback.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Function} returns Frontend Callback.
         */
        async function regenerateAllLabEntries( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.regenerateAllLabEntries' );
            let {
                callback,
                user
            } = args;

            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.regenerateAllLabEntries' );
            }

            let [err, labdataActivities] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        actType: 'LABDATA',
                        l_extra: {$exists: true},
                        labEntries: {$exists: true}
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `regenerateAllLabEntries: can not query LABDATA activities, err: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, null, args.callback );
            }

            for( let labDataActivity of labdataActivities ) {
                [err] = await formatPromiseResult(
                    runDb( {
                        user: user,
                        model: 'activity',
                        action: 'put',
                        query: {
                            _id: labDataActivity._id
                        },
                        data: {
                            labEntries: [],
                            skipcheck_: true
                        },
                        fields: ['labEntries']
                    } )
                );

                if( err ) {
                    Y.log( `regenerateAllLabEntries: could not update labEntries of activity with id: ${labDataActivity._id}, err: ${err.stack || err}`, 'warn', NAME );
                }
            }

            logExit( timer );
            return callback( null, 'done' );
        }

        /**
         * @method getDescriptionFromRecord
         *
         * @param {Object} errorArgs - Object of arguments.
         * @param {Object} errorArgs.err - Error Object.
         * @param {Function} errorArgs.callback - Frontend Callback.
         * @param {Object} [errorArgs.code] - Error Code for DCError.
         *
         * @return {Function} returns Frontend Callback.
         */
        function handleError( errorArgs ) {
            const {
                err,
                callback,
                code
            } = errorArgs;

            if( err ) {
                // Y.log( err, 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( err.code ? err.code : code, !err.code ? {message: err} : {} ), null, callback );
            }
        }

        /**
         * @method getDescriptionFromRecord
         *
         * @param {Object} descriptionArgs - Object of arguments.
         * @param {String} descriptionArgs.assignmentField - Assignment Field from LDT Matching.
         * @param {Object|String} descriptionArgs.assignmentValue - Assignment Value from LDT Matching.
         *
         * @return {String} returns Description of the Record given.
         */
        function getDescriptionFromRecord( descriptionArgs ) {
            const {
                assignmentField,
                assignmentValue
            } = descriptionArgs;

            switch( assignmentField ) {
                case recordRequestField:
                    return i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestId', {
                        data: {
                            requestId: assignmentValue
                        }
                    } );
                case labRequestField:
                    return i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestLabId', {
                        data: {
                            requestId: assignmentValue
                        }
                    } );
                case patientIdField:
                    return i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestPatientAddInfo', {
                        data: {
                            requestId: assignmentValue
                        }
                    } );
                case patientNameField:
                    return typeof assignmentValue === "object" && i18n( 'LabLogMojit.tab_file.fileTable.column.value.nameDobCombination', {
                        data: {
                            name: assignmentValue.lastname,
                            firstname: assignmentValue.firstname,
                            dob: assignmentValue.kbvDob
                        }
                    } );
                default:
                    return '';
            }
        }

        /**
         * @method gridFsStore
         *
         * @param {Object} args - Object of arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.data - Data to save.
         * @param {Object} args.encoding - encoding.
         * @param {String} args.originalname - Name of the File.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {String} returns Description of the Record given.
         */
        async function gridFsStore( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.gridFsStore' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.gridFsStore' );
            }

            const {
                data,
                encoding,
                originalname,
                user
            } = args;

            logExit( timer );
            return new Promise( ( resolve, reject ) =>
                gridfs.store(
                    user,
                    originalname,
                    {
                        contentType: 'application/ldt',
                        metadata: {
                            charset: encoding || 'ISO-8859-1'
                        }
                    },
                    data,
                    ( err, result ) => err ? reject( err ) : resolve( result )
                ) );
        }

        /**
         * @method getCatalog
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {String} args.fileName - File name of Catalog.
         * @param {Number} args.gnr - Gebuehrennummer of Catalog.
         *
         * @return {Object} ...
         */
        async function getCatalog( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getCatalog' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getCatalog' );
            }
            const getCatalogP = promisifyArgsCallback( Y.doccirrus.api.catalog.get );
            let err, result;

            const {
                fileName,
                gnr,
                callback
            } = args;

            dbg( 'getCatalog', `getCatalog ARGS: ${util.inspect( args )}` );

            // dbg( 'getCatalog', `searching for catalog entry: ${util.inspect( query )}` );
            [err, result] = await formatPromiseResult(
                getCatalogP( {
                    query: {
                        catalog: fileName,
                        seq: gnr
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `getCatalog: failed to get catalog ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            result = (result && result.length > 0 && result[0]) || {};

            logExit( timer );
            return handleResult( null, result, callback );
        }

        /**
         * @method evaluateTreatment
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {String} args.billable - Are treatments billable.
         * @param {String} args.caseFolderId - CaseFolderId.
         * @param {Object} args.catalogDescriptor - Information about the Catalog.
         * @param {Number} [args.cost] - Cost of Test.
         * @param {String} args.employeeId - employeeId.
         * @param {Object} args.factor - Factor of Test.
         * @param {String} args.feeSchedule - Fee schedule of Record.
         * @param {String} args.gnr - Information about the Gebuehrennummer.
         * @param {String} args.index - Index of gnr.
         * @param {String} args.labReqId - labReqId.
         * @param {String} args.locationId - locationId.
         * @param {Object} args.patientId - patientId.
         * @param {Object} args.test - Test Object of Record.
         * @param {Date} args.timestamp - timestamp.
         * @param {module:authSchema.auth} args.user - user.
         *
         * @return {Object} ...
         */
        async function evaluateTreatment( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.evaluateTreatment' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.evaluateTreatment' );
            }

            const {
                billable,
                caseFolderId,
                catalogDescriptor,
                cost,
                employeeId,
                factor,
                feeSchedule,
                index,
                labReqId,
                locationId,
                patientId,
                test,
                timestamp,
                user
            } = args;
            let {
                gnr
            } = args;

            let activityData;

            // let testId = getTestId( test );
            //duplicate checking
            // if( gnr && !(lib[testId] && getTestGnr( lib[testId] )) ) {
            if( gnr ) {
                if( catalogDescriptor && catalogDescriptor.short !== 'EAL' ) {
                    // TODO: these are manual, customer-specific workarounds; make configurable?
                    gnr = gnr.replace( /\./g, '' );
                    gnr = gnr.replace( /^A4069$/g, '4069' );
                }

                dbg( 'evaluateTreatment', `has Gebührennummer, can proceed: ${util.inspect( gnr )}` );
                dbg( 'evaluateTreatment', util.inspect( catalogDescriptor, {
                    depth: 10,
                    colors: true
                } ) );

                let [err, catalog] = await formatPromiseResult(
                    getCatalog( {
                        fileName: catalogDescriptor && catalogDescriptor.filename,
                        gnr: gnr
                    } )
                );
                if( err ) {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: `error while getting catalog data, err: ${err.stack || err}`} );
                }
                if( Object.keys( catalog ).length === 0 ) {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: `catalog is empty Object`} );
                }

                [err, activityData] = await formatPromiseResult(
                    createActivityDataFromTreatment( {
                        billable: billable,
                        caseFolderId: caseFolderId,
                        catalog: catalog,
                        cost: cost,
                        employeeId: employeeId,
                        factor: factor,
                        feeSchedule: feeSchedule,
                        gnr: gnr,
                        index: index,
                        labReqId: labReqId,
                        locationId: locationId,
                        patientId: patientId,
                        test: test,
                        timestamp: timestamp,
                        user: user
                    } )
                );

                if( err ) {
                    Y.log( `evaluate treatment, err: ${err.stack || err}`, 'warn', NAME );
                }

            } else {
                if( gnr ) {
                    dbg( 'evaluateTreatment', 'skipping treatment creation because a previous test under this ID already exists' );
                }
            }

            logExit( timer );
            return activityData;
        }

        /**
         * @method getNewestScheinFromPatientMatchingFeeSchedule
         *
         * @param {Object} args - Object of Arguments.
         * @param {String} args.caseFolderId - CaseFolder ID for Activity.
         * @param {Function} [args.callback] - callback.
         * @param {String} args.feeSchedule - Fee schedule of Record.
         * @param {String} args.patientId - Patient ID.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Object} ...
         */
        async function getNewestScheinFromPatientMatchingFeeSchedule( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getNewestScheinFromPatientMatchingFeeSchedule' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getNewestScheinFromPatientMatchingFeeSchedule' );
            }

            const {
                caseFolderId,
                feeSchedule,
                patientId,
                user
            } = args;

            const [err, schein] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        patientId: patientId,
                        caseFolderId: caseFolderId,
                        actType: actTypeFromFeeSchedule[feeSchedule],
                        importId: {$exists: false}
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        sort: {
                            timestamp: -1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `getNewestScheinFromPatientMatchingFeeSchedule, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( schein && Array.isArray( schein ) && schein.length > 0 ) {
                logExit( timer );
                return schein;
            }
            logExit( timer );
            return {};
        }

        /**
         * @method setAndGetTreatmentData
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.entry - Catalog Object.
         * @param {Object} args.initData - Treatment Object.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Promise<Object>} ...
         */
        async function setAndGetTreatmentData( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.setAndGetTreatmentData' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.setAndGetTreatmentData' );
            }

            const {
                entry,
                initData,
                user
            } = args;

            logExit( timer );
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.schemas.activity._setActivityData( {
                        initData: initData,
                        entry: entry,
                        user: user
                    }, ( err, result ) => {
                        if( result ) {
                            return resolve( result );
                        }
                        return reject( err || {} );
                    }
                );
            } );
        }

        /**
         * @method createActivityDataFromTreatment
         *
         * @param {Object} args - Object of Arguments.
         * @param {String} args.billable - Are treatments billable.
         * @param {String} args.caseFolderId - CaseFolder ID for Activity.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.catalog - Catalog from DB.
         * @param {Number} args.cost - Cost of Test.
         * @param {String} args.employeeId - Employee of Patient.
         * @param {Object} args.factor - Factor of Test.
         * @param {String} args.feeSchedule - Fee schedule of Record.
         * @param {String} args.gnr - Information about the Gebuehrennummer.
         * @param {String} args.index - Index of gnr.
         * @param {String} args.labReqId - Lab Request ID of Record.
         * @param {String} args.locationId - Location ID.
         * @param {Object} args.patientId - PatientId.
         * @param {Object} args.test - Test Object of Record.
         * @param {Date} args.timestamp - Timestamp for Treatment.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:v_treatmentSchema.v_treatment} v_treatment
         */
        async function createActivityDataFromTreatment( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.createActivityDataFromTreatment' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.createActivityDataFromTreatment' );
            }

            const {
                billable,
                caseFolderId,
                catalog,
                employeeId,
                factor,
                feeSchedule,
                gnr,
                index,
                labReqId,
                locationId,
                patientId,
                test,
                timestamp,
                user
            } = args;
            let {
                cost
            } = args;

            dbg( 'createActivityDataFromTreatment', `catalogFound?: ${!!catalog}` );

            let
                initData = {
                    actType: 'TREATMENT',
                    catalogShort: feeSchedule || 'GOÄ',
                    u_extra: catalog && catalog.u_extra,
                    billingFactorType: '',
                    billingFactorValue: 1,
                    apkState: 'IN_PROGRESS',         //  MOJ-10325 new medical documentation,
                    code: gnr,
                    status: 'CREATED',
                    areTreatmentDiagnosesBillable: billable,
                    employeeId: employeeId && employeeId.toString(),
                    locationId: locationId && locationId.toString(),
                    timestamp: timestamp,
                    patientId: patientId,
                    labRequestRef: labReqId,
                    skipcheck_: true
                },
                baseActivity;

            if( index && test && test.gnr && Array.isArray( test.gnr ) && test.gnr.length && index < test.gnr.length ) {
                initData.fk5002 = test.gnr[index].inspectionKind || '';
            }

            if( catalog ) {
                /*
                 Hack fix for MOJ-9350: practically reverts to the behaviour in 3.9.16
                 for Treatments where the catalog entry is missing.
                 All this logic including finding catalog info needs to be done in activity api.
                 */

                if( catalog.title ) {
                    initData.content = catalog.title;
                    initData.userContent = catalog.title;
                }

                if( initData.catalogShort === 'GOÄ' ) {
                    if( !initData.billingFactorValue || catalog.catalog ) {
                        if( !initData.billingFactorType ) {
                            initData.billingFactorType = 'privatversicherte';
                        }
                        initData.billingFactorValue = (catalog.u_extra && catalog.u_extra.rechnungsfaktor && catalog.u_extra.rechnungsfaktor.privatversicherte) || '1';
                    }
                    if( 'bewertung_liste' === catalog.unit && initData.u_extra && initData.u_extra.bewertung_liste && initData.u_extra.bewertung_liste[0] ) {
                        initData.actualUnit = initData.u_extra.bewertung_liste[0].unit;
                    } else {
                        initData.actualUnit = catalog.unit;
                    }
                    initData.unit = 'Euro';

                    if( !cost ) {
                        Y.log( `Error: Malformed LDT Treatment without cost.  Ignoring. Test was ${JSON.stringify( test )}`, 'warn', NAME );
                        cost = 0;
                    }

                    if( 'bewertung_liste' === catalog.value && initData.u_extra && initData.u_extra.bewertung_liste && initData.u_extra.bewertung_liste[0] ) {
                        initData.actualPrice = initData.u_extra.bewertung_liste[0].value || 0;
                        initData.price = Y.doccirrus.schemas.activity.toPrice( cost / 100, initData.billingFactorValue );
                    } else {
                        initData.actualPrice = catalog.value || 0;
                        initData.price = Y.doccirrus.schemas.activity.toPrice( cost / 100, initData.billingFactorValue );
                    }
                } else if( feeSchedule === 'EAL' && catalog && catalog.taxPoints ) {
                    initData.price = catalog.taxPoints;
                } else if( cost ) {
                    initData.price = Y.doccirrus.schemas.activity.toPrice( cost / 100, initData.billingFactorValue );
                } else if( catalog && catalog.value ) {
                    initData.price = catalog.value;
                }
            }

            if( isNaN( initData.price ) ) {
                Y.log( `Error: Price was NaN. Setting to zero. Test was ${JSON.stringify( test )}`, 'warn', NAME );
                initData.price = 0;
            }

            if( feeSchedule === 'UVGOÄ' ) {
                initData.uvGoaeType = 'bg_ahb';
            }

            let [err, schein] = await formatPromiseResult(
                getNewestScheinFromPatientMatchingFeeSchedule( {
                    patientId: patientId,
                    caseFolderId: caseFolderId,
                    feeSchedule: feeSchedule,
                    user: user
                } )
            );

            if( err ) {
                Y.log( `error while getting last schein, err: ${err.stack || err}`, 'warn', NAME );
            }

            if( schein && schein[0] ) {
                dbg( 'createActivityDataFromTreatment', 'got Schein:', schein );

                if( !initData.employeeId ) {
                    initData.employeeId = schein[0].employeeId;
                }
                if( !initData.locationId ) {
                    initData.locationId = schein[0].locationId && schein[0].locationId.toString();
                }
                if( !initData.caseFolderId ) {
                    initData.caseFolderId = schein[0].caseFolderId;
                }
                // successCFID = schein[0].caseFolderId;
                if( catalog ) {
                    dbg( 'createActivityDataFromTreatment', 'catalog path...' );
                    initData.catalog = true;
                    initData.catalogRef = catalog.catalog;

                    let err;
                    [err, baseActivity] = await formatPromiseResult(
                        setAndGetTreatmentData( {
                            initData: initData,
                            entry: catalog,
                            user: user
                        } )
                    );

                    if( err ) {
                        Y.log( `got the following error from _setActivityData, err: ${err.stack || err}`, 'warn', NAME );
                        initData.status = 'VALID';
                        if( schein && schein[0] && schein[0].scheinBillingFactorValue ) {
                            initData.billingFactorValue = schein[0].scheinBillingFactorValue;
                        }
                    } else if( baseActivity ) {
                        dbg( 'createActivityDataFromTreatment', 'got activityData:', baseActivity );
                        baseActivity.status = 'VALID';
                        if( factor ) {
                            baseActivity.fk5005 = factor;
                        }
                        if( initData.employeeId ) {
                            baseActivity.employeeId = initData.employeeId;
                        }
                        if( initData.caseFolderId ) {
                            baseActivity.caseFolderId = initData.caseFolderId;
                        }
                        if( schein && schein[0] && schein[0].scheinBillingFactorValue ) {
                            baseActivity.billingFactorValue = schein[0].scheinBillingFactorValue;
                        }
                        if( !baseActivity.apkState && initData.apkState ) {
                            baseActivity.apkState = initData.apkState;
                        }
                        if( !baseActivity.catalogRef && initData.catalogRef ) {
                            baseActivity.catalogRef = initData.catalogRef;
                        }
                        if( !baseActivity.labRequestRef && initData.labRequestRef ) {
                            baseActivity.labRequestRef = initData.labRequestRef;
                        }
                        if( !baseActivity.patientId && initData.patientId ) {
                            baseActivity.patientId = initData.patientId;
                        }
                        if( !baseActivity.timestamp && initData.timestamp ) {
                            baseActivity.timestamp = initData.timestamp;
                        }
                        //merge objects
                        initData = {...initData, ...baseActivity};
                    }
                }
            } else {
                Y.log( `createActivityDataFromTreatment: moving activity into inBox`, 'info', NAME );
                let [err, inBoxCaseFolderId] = await formatPromiseResult(
                    Y.doccirrus.api.casefolder.getInBoxCaseFolderId( {
                        user: user,
                        data: {
                            patientId: patientId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `createActivityDataFromTreatment: could not get inbox casefolder for patient: ${patientId}, err: ${err.stack || err}`, 'warn', NAME );
                } else if( inBoxCaseFolderId ) {
                    initData.caseFolderId = inBoxCaseFolderId;
                }
            }

            if( !initData.content && initData.userContent ) {
                initData.content = initData.userContent;
            }
            logExit( timer );
            return initData;
        }

        /**
         * @method getAllTreatmentsFromTest
         *
         * @param {Object} args - Object of Arguments.
         * @param {String} args.areTreatmentDiagnosesBillable - Are treatments billable.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.catalogDescriptor - Information about the Catalog.
         * @param {String} args.feeSchedule - Fee schedule of Record.
         * @param {Object} args.recGnr - .
         * @param {Object} args.test - Test Object of Record.
         * @param {String} args.version - LDT Version.
         *
         * @return {Array<Object>} treatmentsFromTest
         */
        async function getAllTreatmentsFromTest( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getAllTreatmentsFromTest' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getAllTreatmentsFromTest' );
            }

            const {
                areTreatmentDiagnosesBillable,
                recGnr,
                test,
                version
            } = args;
            let {
                catalogDescriptor,
                feeSchedule
            } = args;

            let stuffToDo = [];

            for( const gnr of recGnr ) {
                stuffToDo.push( getTreatmentFromTest( {
                    areTreatmentDiagnosesBillable: areTreatmentDiagnosesBillable,
                    catalogDescriptor: catalogDescriptor,
                    feeSchedule: feeSchedule,
                    gnr: gnr,
                    test: test,
                    version: version
                } ) );
            }
            let [err, treatmentsFromTest] = await formatPromiseResult(
                Promise.all( stuffToDo )
            );

            if( err ) {
                Y.log( `getAllTreatmentsFromTest, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            logExit( timer );
            return treatmentsFromTest;
        }

        /**
         * @method getTreatmentFromTest
         *
         * @param {Object} args - Object of Arguments.
         * @param {String} args.areTreatmentDiagnosesBillable - Are treatments billable.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.catalogDescriptor - Information about the Catalog.
         * @param {String} args.feeSchedule - Fee schedule of Record.
         * @param {Number} args.gnr - Information about the Gebuehrennummer.
         * @param {Object} args.test - Test Object of Record.
         * @param {String} args.version - LDT Version.
         *
         * @return {Object} test
         */
        async function getTreatmentFromTest( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getTreatmentFromTest' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getTreatmentFromTest' );
            }

            const {
                areTreatmentDiagnosesBillable,
                gnr,
                test,
                version
            } = args;
            let {
                catalogDescriptor,
                feeSchedule
            } = args;

            const
                cost = gnr.cost,
                factor = gnr.factor;
            let billable;
            if( version && version.startsWith( 'ldt3' ) ) {
                let tmpFeeschedule = lablogSchema.getTestFeeSchedule( test );
                feeSchedule = tmpFeeschedule && feeScheduleMap[tmpFeeschedule];
                catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: feeSchedule
                } );
                billable = gnr.billingAlreadyDone ? '0' : '1';
            } else {
                billable = areTreatmentDiagnosesBillable;
                if( '1' === areTreatmentDiagnosesBillable && gnr.BillingDoneBy < 2 ) {
                    billable = gnr.BillingDoneBy;
                }
            }
            logExit( timer );
            return {
                gnr: gnr.head,
                feeSchedule,
                catalogDescriptor,
                billable,
                factor,
                cost,
                test
            };
        }

        /**
         * @method getVerifiedActivityData
         *
         * @param {Object} args - Object of Arguments.
         * @param {Object} args.activityData - Activity Data for Lab Data.
         * @param {Function} [args.callback] - callback.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:v_treatmentSchema.v_treatment} v_treatment
         */
        async function getVerifiedActivityData( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getVerifiedActivityData' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getVerifiedActivityData' );
            }

            const {
                activityData,
                user
            } = args;

            let
                mergingIsRequired = false,
                prev_id,
                previousLabdata;

            if( !activityData.timestamp ) {
                activityData.timestamp = new Date();
            }
            activityData.skipcheck_ = true;
            if( !activityData.content && activityData.userContent ) {
                activityData.content = activityData.userContent;
            }
            if( 'CREATED' === activityData.status || !activityData.caseFolderId ) {
                activityData.status = 'CREATED';
                const [err, casefolder] = await formatPromiseResult(
                    checkCaseFolderPromise( {
                        user: user,
                        query: {
                            patientId: activityData.patientId,
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR
                        },
                        data: {
                            patientId: activityData.patientId,
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR,
                            start: new Date(),
                            title: i18n( 'casefolder-schema.additionalCaseFolderTypes.ERROR' ),
                            skipcheck_: true
                        }
                    } )
                );

                if( err || !casefolder ) {
                    throw err || new Y.doccirrus.commonerrors.DCError( 400, {message: 'err_no_error_casefolder'} );
                }
                activityData.caseFolderId = casefolder._id;
            }

            if( !activityData.employeeId || !activityData.locationId || !activityData.caseFolderId ) {
                let query = {
                    patientId: activityData.patientId,
                    timestamp: new Date()
                };
                let options = {};
                if( activityData.caseFolderId ) {
                    query.caseFolderId = activityData.caseFolderId;
                } else {
                    options.doNotQueryCaseFolder = true;
                }
                const [err, lastSchein] = await formatPromiseResult(
                    getLastScheinPromise( {
                        user,
                        query,
                        options
                    } )
                );

                if( err ) {
                    Y.log( `could not get last schein, err: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                if( lastSchein && lastSchein[0] ) {
                    if( !activityData.employeeId ) {
                        activityData.employeeId = lastSchein[0].employeeId;
                        activityData.employeeName = lastSchein[0].employeeName;
                    }
                    if( !activityData.locationId ) {
                        activityData.locationId = lastSchein[0].locationId;
                    }
                    if( !activityData.caseFolderId ) {
                        activityData.caseFolderId = lastSchein[0].caseFolderId;
                    }
                }
            }

            if( activityData.labRequestId && activityData.l_extra && activityData.l_extra.findingKind ) {
                Y.log( 'checking if old data can be merged...', 'info', NAME );
                const [err, activity] = await formatPromiseResult(
                    runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            labRequestId: activityData.labRequestId,
                            'l_extra.findingKind': {$exists: 1},
                            patientId: activityData.patientId
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( 'could not get activity', 'info', NAME );
                    throw err;
                }
                if( activity[0] ) {
                    Y.log( 'merging old data into new entry...', 'info', NAME );
                    previousLabdata = activity[0];
                    prev_id = previousLabdata._id && previousLabdata._id.toString();
                    let prevL_extra = previousLabdata.l_extra;
                    let prevLabText = previousLabdata.labText;

                    //l_extra can be an object if
                    // the migration was skipped,
                    // but concat() doesn't mind
                    if( Array.isArray( prevL_extra ) ) {
                        activityData.l_extra = prevL_extra.concat( activityData.l_extra );
                    } else {
                        activityData.l_extra = [prevL_extra].concat( activityData.l_extra );
                    }

                    //merging of HL7 specific treatments
                    if( previousLabdata.u_extra ) {
                        if( previousLabdata.u_extra.treatments && Array.isArray( previousLabdata.u_extra.treatments ) ) {
                            activityData.u_extra.treatments = activityData.u_extra.treatments.concat( previousLabdata.u_extra.treatments );
                        }
                    }

                    activityData.labText = `${activityData.labText}\n${prevLabText}`;

                    activityData.timestamp = previousLabdata.timestamp;
                    activityData.patientId = previousLabdata.patientId;
                    activityData.caseFolderId = previousLabdata.caseFolderId;
                    activityData.locationId = previousLabdata.locationId;

                    //  when merging data into an existing entry, APK state must be set to IN_PROGRESS
                    //  since this is new medical documentation which has not yet been reviewed
                    //  see: MOJ-10325

                    activityData.apkState = 'IN_PROGRESS';

                    const [err] = await formatPromiseResult(
                        runDb( {
                            user: user,
                            model: 'activity',
                            action: 'delete',
                            query: {
                                _id: prev_id
                            }
                        } )
                    );

                    if( err ) {
                        throw err;
                    } else {
                        mergingIsRequired = true;
                    }
                }
            }

            logExit( timer );
            return {
                activityData: activityData,
                previousLabdata: previousLabdata,
                mergingIsRequired: mergingIsRequired
            };
        }

        /**
         * @method postActivity
         *
         * @param {Object} args - Object of Arguments.
         * @param {Object} args.activityData - Object to insert into Activity Collection.
         * @param {Function} [args.callback] - callback.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:activitySchema.activity} activity
         */
        async function postActivity( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.postActivity' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.postActivity' );
            }

            const {
                activityData,
                user
            } = args;

            return new Promise( async ( resolve, reject ) => {
                const useActType = (activityData && activityData.actType) ? activityData.actType : '';

                const [err, defaultUserContent] = await formatPromiseResult(
                    getDefaultUserContentPromise( user, useActType )
                );

                if( err ) {
                    Y.log( `postActivity err: ${err.stack || err}`, 'warn', NAME );
                }
                if( defaultUserContent ) {
                    activityData.userContent = defaultUserContent;
                }

                const activityToPost = {
                    model: 'activity',
                    user: user,
                    data: activityData,
                    options: {},
                    callback: onActivityPost
                };

                function onActivityPost( err, res ) {
                    if( err ) {
                        return reject( err );
                    } else if( res ) {
                        return resolve( res[0] );
                    }
                }

                logExit( timer );
                Y.doccirrus.api.activity.post( activityToPost );
            } );
        }

        /**
         * @method getEmployeeShortFromEmployee
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Object} EmployeeShort
         */
        async function getEmployeeShortFromUser( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getEmployeeShortFromUser' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getEmployeeShortFromEmployee' );
            }

            const {
                user
            } = args;

            if( user && user.superuser ) {
                logExit( timer );
                return {
                    name: user.U
                };
            } else {
                const [err, employee] = await formatPromiseResult(
                    Y.doccirrus.utils.getEmployeeFromUser( user )
                );
                if( err ) {
                    throw err;
                }

                logExit( timer );
                return {
                    name: `${employee[0].firstname} ${employee[0].lastname}`,
                    employeeNo: employee[0].employeeNo,
                    initials: employee[0].initials
                };
            }
        }

        /**
         * @method getInitialActivityData
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {String} args.caseFolderId - CaseFolder ID for Activity.
         * @param {Object} args.dbData - Database Data for LabData.
         * @param {String} args.employeeId - Employee of Patient.
         * @param {String} args.labName - Name of the Laboratory.
         * @param {Object} args.ldtJson - Parsed LDT Object.
         * @param {String} args.locationId - Location ID.
         * @param {Date} args.timestamp - Timestamp for Activity.
         *
         * @return {module:v_treatmentSchema.v_treatment|module:v_labdataSchema.v_labdata} activity
         */
        async function getInitialActivityData( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getInitialActivityData' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getInitialActivityData' );
            }

            const {
                caseFolderId,
                dbData,
                employeeId,
                labName,
                ldtJson,
                locationId,
                timestamp
            } = args;

            const
                record = dbData.l_data.records[dbData.l_data.records.length > 3 ? 2 : 1],
                textToCompare = Y.doccirrus.api.xdtTools.prettyText(
                    {
                        records: [record],
                        versionUsed: ldtJson.versionUsed
                    },
                    false,
                    false,
                    false
                );

            let postData = {
                timestamp: timestamp,
                patientId: dbData.assignedPatient.patientId,
                employeeId: employeeId,
                locationId: locationId,
                l_extra: record,
                l_version: ldtJson.versionUsed,
                labRequestId: lablogSchema.getLabReqId( record ) || lablogSchema.getRecordRequestId( record ) || '',
                caseFolderId: caseFolderId,
                content: labName + lablogSchema.stringMapFindingKind( record, {l_data: ldtJson} ),
                userContent: labName + lablogSchema.stringMapFindingKind( record, {l_data: ldtJson} ),
                labText: textToCompare,
                status: 'VALID',
                apkState: 'IN_PROGRESS',
                u_extra: dbData.u_extra,
                labLogTimestamp: dbData.timestamp
            };

            // if( cfg.useAddInfoForId && cfg.useAddInfoForIdFK === '8311' ) {
            //     postData.labRequestId = labReqId;
            // }

            let recordType = lablogSchema.getRecordType( record );
            if( lablogSchema.isRequest( record ) ) {
                postData.actType = 'LABREQUEST';
                postData.content = 'Labor-Auftrag';
                let recReqId = lablogSchema.getRecordRequestId( record );
                if( recReqId ) {
                    postData.content += ` (${recReqId})`;
                }
                // postData.userContent = postData.content;
                postData.labRequestType = lablogSchema.labRequestTypes[recordType];
                if( record.refBSNR && record.refLANR ) {
                    postData.scheinEstablishment = record.refBSNR;
                    postData.scheinRemittor = record.refLANR;
                }
                postData.scheinSlipMedicalTreatment = record.treatmentType || '1';

                if( record.accident_consequences ) {
                    postData.fk4202 = record.accident_consequences;
                }
                if( record.treatmentAccordingToSGBV ) {
                    postData.fk4204 = record.treatmentAccordingToSGBV;
                }
                if( record.followUpOfKnownInfection ) {
                    postData.kontrollunters = record.followUpOfKnownInfection;
                }
                if( record.sampleColDate ) {
                    postData.timestamp = record.sampleColDate;
                }
                if( record.order ) {
                    postData.auftrag = record.order.join ? record.order.join( '\n' ) : record.order;

                    //max length of auftrag text is 60*4=240
                    postData.auftrag = (postData.auftrag.length > 240) ? postData.auftrag.substring( 0, 240 ) : postData.auftrag;
                }
                postData.testDescriptions = (record.testId && record.testId.length) ?
                    record.testId.map( ( test, idx, arr ) => {
                        return (idx === 5 && arr.length > 6 ? '{{...}}' : '') + test.testLabel;
                    } ).join( '\n' ) : '';
            } else {
                postData.actType = 'LABDATA';
            }

            dbg( 'getInitialActivityData', `POSTDATA GENERATED: `, postData );

            if( record.wildcardField ) {
                let tmp;
                record.wildcardField.forEach( field => {
                    if( field.toUpperCase().startsWith( wildcardFields.caseFolderId.toUpperCase() ) ) {
                        tmp = field.substring( wildcardFields.caseFolderId.length ).replace( /[^a-zA-Z0-9]/g, '' );
                        if( tmp && Y.doccirrus.comctl.isObjectId( tmp ) ) {
                            postData.caseFolderId = tmp;
                        }
                    }
                    if( field.toUpperCase().startsWith( wildcardFields.employeeName.toUpperCase() ) ) {
                        tmp = field.substring( wildcardFields.employeeName.length ).replace( /[^a-zA-Z0-9 ]/g, '' ).trim();
                        if( tmp ) {
                            let initials = tmp.split( '' ).map( w => w && Array.isArray( w ) && w[0] ).join( '' );
                            postData.editor = [
                                {
                                    'name': tmp,
                                    'employeeNo': '',
                                    'initials': initials
                                }
                            ];
                        }
                    }
                } );
            }
            logExit( timer );
            return postData;
        }

        /**
         * @method getInitialLabLogDataFromLDT
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {module:flowSchema.transformersObj} args.cfg - Frontend Config Object.
         * @param {Boolean} args.cfg.billingFlag - .
         * @param {String} args.cfg.ldtBillingFlag - .
         * @param {Boolean} args.cfg.allowGkvBilling - .
         * @param {String} args.cfg.ldtAllowGkvBilling - .
         * @param {String} args.cfg.disallowGkvBilling - .
         * @param {Boolean} args.cfg.checkFileWithLdkPm - .
         * @param {String} args.cfg.checkFilesWithLdkPm - .
         * @param {Boolean/String} args.cfg.useAddInfoForId - .
         * @param {String} args.cfg.useAddInfoForIdFK - .
         * @param {String} args.cfg.useDataFromLabrequestIfPresent - .
         * @param {Object} args.dateOfCreation - Date of Creation from LDT File.
         * @param {Object} args.flow - Flowname.
         * @param {Object} args.labName - Name of the Laboratory.
         * @param {Object} args.ldtFile - LDT File Object.
         * @param {Object} args.ldtJson - Parsed LDT Object.
         * @param {Object} args.pmResults - Results of the LDT Pruefmodul.
         * @param {Object} args.savedLDTFile - .
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:lablogSchema.lablog} lablog
         */
        async function getInitialLabLogDataFromLDT( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getInitialLabLogDataFromLDT' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getInitialLabLogDataFromLDT' );
            }

            const {
                cfg,
                dateOfCreation,
                flow,
                labName,
                ldtFile,
                ldtJson,
                pmResults,
                savedLDTFile,
                user
            } = args;

            let
                [, dataHeader] = await formatPromiseResult(
                    getRecordTypeFromLDT( {
                        records: ldtJson.records,
                        reverse: false,
                        type: headersAndFooters[0]
                    } ) ),
                [, lHeader] = await formatPromiseResult(
                    getRecordTypeFromLDT( {
                        records: ldtJson.records,
                        reverse: false,
                        type: headersAndFooters[1]
                    } ) ),
                [, pHeader] = await formatPromiseResult(
                    getRecordTypeFromLDT( {
                        records: ldtJson.records,
                        reverse: false,
                        type: headersAndFooters[2]
                    } ) ),
                [, pFooter] = await formatPromiseResult(
                    getRecordTypeFromLDT( {
                        records: ldtJson.records,
                        reverse: true,
                        type: headersAndFooters[3]
                    } ) ),
                [, lFooter] = await formatPromiseResult(
                    getRecordTypeFromLDT( {
                        records: ldtJson.records,
                        reverse: true,
                        type: headersAndFooters[4]
                    } ) ),
                [, dataFooter] = await formatPromiseResult(
                    getRecordTypeFromLDT( {
                        records: ldtJson.records,
                        reverse: true,
                        type: headersAndFooters[5]
                    } ) );

            let initialData = [];

            let i = ((pHeader && pHeader.position) || (lHeader && lHeader.position) || (dataHeader && dataHeader.position)) || 0;
            const max = ((dataFooter && dataFooter.position) || (pFooter && pFooter.position) || (lFooter && lFooter.position)) || ldtJson.records.length;

            for( i; i < max; i++ ) {
                if( headersAndFooters.includes( lablogSchema.getRecordType( ldtJson.records[i] ) ) ) {
                    continue;
                }
                let labData = {
                    versionUsed: ldtJson.versionUsed,
                    records: []
                };

                if( dataHeader ) {
                    labData.records.push( dataHeader.record );
                }
                if( lHeader ) {
                    labData.records.push( lHeader.record );
                }
                if( pHeader ) {
                    labData.records.push( pHeader.record );
                }
                labData.records.push( ldtJson.records[i] );
                if( pFooter ) {
                    labData.records.push( pFooter.record );
                }
                if( lFooter ) {
                    labData.records.push( lFooter.record );
                }
                if( dataFooter ) {
                    labData.records.push( dataFooter.record );
                }

                let flags = [];

                const [err, employee] = await formatPromiseResult(
                    getEmployeeShortFromUser( {
                        user: user
                    } )
                );
                if( err ) {
                    throw err;
                }

                let dbData = {
                    timestamp: new Date(),
                    created: dateOfCreation,
                    source: labName,
                    status: 'PROCESSING',
                    description: '',
                    type: i18n( `lablog-schema.recTypes.${lablogSchema.getRecordType( ldtJson.records[i] )}` ),
                    user: employee,
                    fileName: ldtFile.originalname,
                    fileHash: ldtFile.fileHash,
                    fileDatabaseId: savedLDTFile.fileDatabaseId && savedLDTFile.fileDatabaseId._id && savedLDTFile.fileDatabaseId._id.toString(),
                    configuration: {
                        pre: {
                            billingFlag: cfg.billingFlag || (cfg.ldtBillingFlag === 'on') || false,
                            gkvBillingFlag: cfg.allowGkvBilling || (cfg.ldtAllowGkvBilling === 'on') || false,
                            disallowGkvBilling: cfg.disallowGkvBilling || false,
                            checkFileWithLdkPm: cfg.checkFileWithLdkPm || (cfg.checkFilesWithLdkPm === 'on') || false,
                            useCustomAssignment: cfg.useAddInfoForId === true || cfg.useAddInfoForId === 'on' || false,
                            customAssignmentField: cfg.useAddInfoForIdFK || '8310',
                            useDataFromLabrequestIfPresent: cfg.useDataFromLabrequestIfPresent || false
                        },
                        assignment: {
                            assignmentField: '',
                            assignmentValue: ''
                        }
                    },
                    linkedActivities: [],
                    assignedPatient: {
                        patientId: '',
                        patientName: '',
                        patientFirstname: ''
                    },
                    patientLabLogId: '',
                    l_data: labData,
                    flow: flow || '',
                    flags: flags,
                    errs: [],
                    pmResults: pmResults,
                    sourceFileType: cfg.sourceFileType,
                    u_extra: cfg.u_extra
                };
                if( lablogSchema.getRecordFindingKind( ldtJson.records[i] ) ) {
                    dbData.type += ` (${lablogSchema.stringMapFindingKind( ldtJson.records[i], {l_data: ldtJson} )[1]})`;
                }
                initialData.push( dbData );
            }
            logExit( timer );
            return initialData;
        }

        /**
         * @method getRecordTypeFromLDT
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Array} args.records - Array of LDT Records.
         * @param {Boolean} args.reverse - Reverse lookup.
         * @param {String} args.type - Type of Record to look for.
         *
         * @return {Object}
         */
        async function getRecordTypeFromLDT( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getRecordTypeFromLDT' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getRecordTypeFromLDT' );
            }

            const {
                records,
                reverse,
                type
            } = args;

            if( Array.isArray( records ) && records.length > 0 ) {
                if( reverse ) {
                    for( let i = records.length - 1; i > 0; i-- ) {
                        if( lablogSchema.getRecordType( records[i] ) === type ) {
                            logExit( timer );
                            return {
                                record: records[i],
                                position: i
                            };
                        }
                    }
                } else {
                    for( const [iterator, record] of records.entries() ) {
                        if( lablogSchema.getRecordType( record ) === type ) {
                            logExit( timer );
                            return {
                                record: record,
                                position: iterator
                            };
                        }
                    }
                }
            }
            logExit( timer );
            return undefined;
        }

        /**
         * @method redundancyCheck
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.ldtJson - Parsed LDT Object.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Object}
         */
        async function redundancyCheck( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.redundancyCheck' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.redundancyCheck' );
            }

            const {
                ldtJson,
                user
            } = args;

            const
                record = ldtJson && ldtJson.records && ldtJson.records.length && ldtJson.records[ldtJson.records.length > 3 ? 2 : 1],
                textToCompare = Y.doccirrus.api.xdtTools.prettyText(
                    {
                        records: [record],
                        versionUsed: ldtJson.versionUsed
                    },
                    false,
                    false,
                    false
                );

            const [err] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        actType: 'LABDATA',
                        labText: textToCompare
                    },
                    options: {
                        limit: 1,
                        lean: true
                    }
                } )
            );
            if( err ) {
                Y.log( `redundancyCheck - redundancyCheck failed, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            logExit( timer );
            return {
                textToCompare: textToCompare
            };
        }

        /**
         * @method findMatchMethod
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} [args.cfg] - Frontend Config Object.
         * @param {Object} args.cfg.useAddInfoForId - .
         * @param {Object} args.cfg.useAddInfoForIdFK - .
         * @param {Object} args.ldtJson - Parsed LDT Object.
         * @param {Array} args.ldtJson.records - .
         *
         * @returns {Object} returnObject - .
         * @returns {Date} returnObject.timestamp - .
         * @returns {String} returnObject.assignmentField - .
         * @returns {String} returnObject.assignmentValue - .
         * @returns {String} returnObject.patientName - .
         * @returns {String} returnObject.patientFirstname - .
         * @returns {Date} returnObject.patientDob - .
         * @returns {String} returnObject.patientInsuranceId - .
         * @returns {String} returnObject.patientInsuranceNo - .
         * @returns {String} returnObject.locationIdFromLDT - .
         * @returns {String} returnObject.recordRequestId - .
         * @returns {String} returnObject.labReqId - .
         */
        async function findMatchMethod( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.findMatchMethod' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.findMatchMethod' );
            }

            const {
                cfg,
                ldtJson
            } = args;

            const
                record = ldtJson && ldtJson.records && ldtJson.records.length && ldtJson.records[ldtJson.records.length > 3 ? 2 : 1],
                timestamp = lablogSchema.getRecordTimestamp( record ),
                //AnforderungsIdent
                recordRequestId = lablogSchema.getRecordRequestId( record ),
                //Labornummer
                labReqId = lablogSchema.getLabReqId( record ),
                //PatientId
                patientId = lablogSchema.getRecordPatientId( record ),
                //Patienten Nachname
                patientName = lablogSchema.getRecordPatientLastName( record ),
                //Vorname
                patientFirstname = lablogSchema.getRecordPatientFirstName( record ),
                //Geb
                patientDob = lablogSchema.getRecordPatientDoB( record ),
                //
                patientInsuranceId = lablogSchema.getRecordPatientInsuranceId( record ),
                //
                patientInsuranceNo = lablogSchema.getRecordPatientInsuranceNo( record ),
                //BSNR
                locationIdFromLDT = lablogSchema.getHeaderBSNR( record );
            // patientSKT = getRecordPatientSKT (record ),

            let
                assignmentField,
                assignmentValue;

            if( lablogSchema.isRequest( record ) ) {
                if( patientId ) {
                    assignmentField = patientIdField;
                    assignmentValue = parseInt( patientId, 10 ) || '';
                } else if( (patientName && patientFirstname && patientDob) /*|| args.patientId || specialMatchConfig*/ ) {
                    assignmentField = patientNameField;
                    assignmentValue = patientNameField;
                } else {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'no patient data available'} );
                }
            } else {
                if( cfg && cfg.useAddInfoForId ) {
                    Y.log( `config has useAddInfoForId set to: ${cfg.useAddInfoForId}`, 'info', NAME );
                    if( cfg.useAddInfoForIdFK === recordRequestField ) {
                        Y.log( `config has 8310 set as match method`, 'info', NAME );
                        assignmentField = recordRequestField;
                        assignmentValue = recordRequestId;
                    } else if( cfg.useAddInfoForIdFK === labRequestField ) {
                        Y.log( `config has 8311 set as match method`, 'info', NAME );
                        assignmentField = labRequestField;
                        assignmentValue = labReqId;
                    } else if( cfg.useAddInfoForIdFK === patientIdField ) {
                        Y.log( `config has 8405 set as match method`, 'info', NAME );
                        assignmentField = labRequestField;
                        assignmentValue = parseInt( patientId, 10 ) || '';
                    } else {
                        Y.log( `no matching method found`, 'warn', NAME );
                        Y.log( `trying to find patient via name and dob`, 'info', NAME );
                        assignmentField = patientNameField;
                        assignmentValue = patientNameField;
                    }
                } else {
                    if( recordRequestId /*&& !args.userAssigned && !specialMatchConfig*/ ) {
                        assignmentField = recordRequestField;
                        assignmentValue = recordRequestId;
                    } else if( labReqId /*&& !args.userAssigned && !specialMatchConfig*/ ) {
                        assignmentField = labRequestField;
                        assignmentValue = labReqId;
                    } else if( patientId ) {
                        assignmentField = patientIdField;
                        assignmentValue = parseInt( patientId, 10 ) || '';
                    } else if( (patientName && patientFirstname && patientDob) /*|| args.patientId || specialMatchConfig*/ ) {
                        assignmentField = patientNameField;
                        assignmentValue = patientNameField;
                    } else {
                        throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'no patient data available'} );
                    }
                }
            }
            if( assignmentField === '' && assignmentValue === '' ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'err'} );
            }
            logExit( timer );
            return {
                timestamp: timestamp,
                assignmentField: assignmentField,
                assignmentValue: assignmentValue,
                patientName: patientName,
                patientFirstname: patientFirstname,
                patientDob: patientDob,
                patientInsuranceId: patientInsuranceId,
                patientInsuranceNo: patientInsuranceNo,
                locationIdFromLDT: locationIdFromLDT,
                recordRequestId: recordRequestId,
                labReqId: labReqId
            };
        }

        /**
         * @method getPatientsFromPatientIds
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {String|Array} args.patientIdsFromActivities - Array of Patient IDs.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Array<module:patientSchema.patient>}
         */
        async function getPatientsFromPatientIds( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getPatientsFromPatientIds' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getPatientsFromPatientIds' );
            }

            const {
                patientIdsFromActivities,
                user
            } = args;

            let [err, patients] = await formatPromiseResult(
                runDb( {
                    model: 'patient',
                    user: user,
                    action: 'get',
                    query: {
                        _id: {$in: patientIdsFromActivities}
                    }
                } ) );

            if( err ) {
                Y.log( `getPatientsFromPatientIds - error in querying patients from patientIds, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            logExit( timer );
            return patients;
        }

        /**
         * @method queryPatients
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.query - .
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Array<module:patientSchema.patient>}
         */
        async function queryPatients( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.queryPatients' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.queryPatients' );
            }

            const {
                query,
                user
            } = args;

            let [err, patients] = await formatPromiseResult(
                runDb( {
                    model: 'patient',
                    user: user,
                    action: 'get',
                    query: query,
                    options: {
                        lean: true
                    }
                } ) );

            if( err ) {
                dbg( 'queryPatients', `query: `, query );
                Y.log( `queryPatients - error in querying patients, err: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                return [];
            }
            logExit( timer );
            return patients;
        }

        /**
         * @method findCaseFolderForPatient
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Number} args.feeSchedule - Fee schedule of Record.
         * @param {Object} args.patient - Associated Patient Object.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:casefolderSchema.casefolder|''}
         */
        async function findCaseFolderForPatient( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.findCaseFolderForPatient' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.findCaseFolderForPatient' );
            }

            const {
                feeSchedule,
                patient,
                user
            } = args;

            if( patient.activeCaseFolderId && feeSchedule ) {
                Y.log( `patient has an active casefolder: ${patient.activeCaseFolderId}`, 'info', NAME );
                let [err, caseFolderFromCaseFolderId] = await formatPromiseResult(
                    runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'get',
                        query: {
                            _id: patient.activeCaseFolderId,
                            type: feeScheduleMapToCaseFolderType[feeSchedule],
                            $or: [
                                {additionalType: null},
                                {additionalType: 'ASV'}
                            ],
                            imported: {$ne: true}
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                if( err ) {
                    Y.log( `findCaseFolderForPatient - findCaseFolderForPatient err: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                if( caseFolderFromCaseFolderId && caseFolderFromCaseFolderId.length > 0 ) {
                    Y.log( `findCaseFolderForPatient - patients last active casefolder matches the type needed from LDT file && matching`, 'info', NAME );
                    logExit( timer );
                    return caseFolderFromCaseFolderId[0];
                } else {
                    let [err, newestCaseFolder] = await formatPromiseResult(
                        findNewestCaseFolderForPatient( {
                            user: user,
                            patient: patient,
                            feeSchedule: feeSchedule
                        } )
                    );

                    if( err ) {
                        Y.log( `findCaseFolderForPatient - err: ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    } else if( newestCaseFolder ) {
                        logExit( timer );
                        return newestCaseFolder;
                    } else {
                        logExit( timer );
                        return '';
                    }
                }
            } else {
                Y.log( `patient has no last active caseFolder`, 'info', NAME );
                let [err, newestCaseFolder] = await formatPromiseResult(
                    findNewestCaseFolderForPatient( {
                        user: user,
                        patient: patient,
                        feeSchedule: feeSchedule
                    } ) );

                if( err ) {
                    Y.log( `findCaseFolderForPatient - err: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                logExit( timer );
                return newestCaseFolder;
            }
        }

        /**
         * @method findNewestCaseFolderForPatient
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Number} args.feeSchedule - Fee schedule of Record.
         * @param {Object} args.patient - Associated Patient Object.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:casefolderSchema.casefolder|Object}
         */
        async function findNewestCaseFolderForPatient( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.findNewestCaseFolderForPatient' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.findNewestCaseFolderForPatient' );
            }

            const {
                feeSchedule,
                patient,
                user
            } = args;

            let queryForCaseFolder;
            if( feeSchedule === 3 ) {
                queryForCaseFolder = {
                    patientId: patient && patient._id && patient._id.toString(),
                    type: {$in: ['PRIVATE', 'SELFPAYER']},
                    additionalType: null,
                    imported: {$ne: true}
                };
            } else {
                queryForCaseFolder = {
                    patientId: patient && patient._id && patient._id.toString(),
                    $or: [
                        {additionalType: null},
                        {additionalType: 'ASV'}
                    ],
                    imported: {$ne: true}
                };
                if( feeSchedule ) {
                    queryForCaseFolder.type = feeScheduleMapToCaseFolderType[feeSchedule];
                }
            }

            Y.log( `findNewestCaseFolderForPatient - queryForCaseFolder: ${JSON.stringify( queryForCaseFolder )}`, 'debug', NAME );

            let [err, caseFolderFromPatient] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'get',
                    query: queryForCaseFolder,
                    options: {
                        lean: true
                    }
                } ) );

            if( err ) {
                Y.log( `findNewestCaseFolderForPatient - error: could not get caseFolderFromPatient, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            if( caseFolderFromPatient && caseFolderFromPatient.length > 0 ) {
                Y.log( `checking for newest activities from caseFolders to find the 'newest' caseFolder`, 'info', NAME );
                const caseFolderIdsFromPatient = caseFolderFromPatient.map( caseFolder => caseFolder._id && caseFolder._id.toString() );

                let latestActivityFromCaseFolderIdAndPatientId;
                [err, latestActivityFromCaseFolderIdAndPatientId] = await formatPromiseResult(
                    runDb( {
                        model: 'activity',
                        user: user,
                        action: 'get',
                        query: {
                            caseFolderId: {$in: caseFolderIdsFromPatient},
                            patientId: patient && patient._id && patient._id.toString()
                        },
                        options: {
                            sort: {
                                timestamp: -1
                            },
                            limit: 1
                        }
                    } ) );

                if( err ) {
                    Y.log( `findNewestCaseFolderForPatient - matching error, err: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }

                if( latestActivityFromCaseFolderIdAndPatientId && latestActivityFromCaseFolderIdAndPatientId.length === 1 ) {
                    Y.log( `found 'newest' caseFolder for patient`, 'info', NAME );
                    Y.log( `findNewestCaseFolderForPatient - newest caseFolderId: ${latestActivityFromCaseFolderIdAndPatientId[0].caseFolderId}`, 'debug', NAME );
                    logExit( timer );
                    return caseFolderFromPatient.find( caseFolder => (caseFolder._id && caseFolder._id.toString()) === latestActivityFromCaseFolderIdAndPatientId[0].caseFolderId );
                } else {
                    Y.log( `no activities for caseFolders from patient found`, 'warn', NAME );
                    Y.log( `inserting ACTIVITY into inBox`, 'info', NAME );
                    logExit( timer );
                    return {};
                }
            } else {
                Y.log( `inserting ACTIVITY into inBox`, 'info', NAME );
                logExit( timer );
                return {};
            }
        }

        /**
         * @method getDetailsForLDTMatching
         *
         * @param {Object} args - Object of Arguments.
         * @param {String} args.assignmentField - Assignment Field from LDT Matching.
         * @param {String} args.assignmentValue - Assignment Value from LDT Matching.
         * @param {Function} [args.callback] - callback.
         * @param {Object} [args.cfg] - Frontend Config Object.
         * @param {Object} args.matchMethod - Match Method return Value.
         * @param {Object} args.ldtJson - Parsed LDT Object.
         * @param {String} args.patientDob - Patient Date of Birth.
         * @param {String} args.patientFirstname - Patient Firstname.
         * @param {String} args.patientInsuranceId - Insurance ID of Patient.
         * @param {String} args.patientInsuranceNo - Insurance Number of Patient.
         * @param {String} args.patientName - Patient Lastname.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Object}
         */
        async function getDetailsForLDTMatching( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getDetailsForLDTMatching' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getDetailsForLDTMatching' );
            }

            const {
                assignmentField,
                assignmentValue,
                cfg,
                matchMethod,
                ldtJson,
                patientDob,
                patientFirstname,
                patientInsuranceId,
                patientInsuranceNo,
                patientName,
                user
            } = args;

            let query = {};

            dbg( 'getDetailsForLDTMatching', 'getDetailsForLDTMatching...' );

            if( !assignmentField ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'assignmentField missing'} );
            }

            if( assignmentField === recordRequestField || assignmentField === labRequestField ) {
                if( assignmentField === recordRequestField && (matchMethod && matchMethod.labReqId) ) {
                    query = {
                        actType: 'LABREQUEST',
                        $or: [
                            {labRequestId: assignmentValue},
                            {labRequestId: matchMethod.labReqId}
                        ]
                    };
                } else {
                    query = {
                        actType: 'LABREQUEST',
                        labRequestId: assignmentValue
                    };
                }

                let [err, activities] = await formatPromiseResult(
                    runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: query,
                        options: {
                            sort: {
                                timestamp: -1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `getDetailsForLDTMatching - err: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }

                dbg( 'getDetailsForLDTMatching', `activities: ${util.inspect( activities )}` );
                if( 0 !== activities.length ) {
                    const uniquePatientIdsFromActivities = [...new Set( activities.map( activity => activity.patientId ) )];
                    if( 0 === uniquePatientIdsFromActivities.length ) {
                        throw new Y.doccirrus.commonerrors.DCError( 400, {message: `matching error: no uniquePatientIdsFromActivities in findMatchMethodWithAdvancedOptions`} );
                    }

                    const [patientsErr, patients] = await formatPromiseResult(
                        getPatientsFromPatientIds( {
                            user: user,
                            patientIdsFromActivities: uniquePatientIdsFromActivities
                        } )
                    );
                    if( patientsErr ) {
                        throw patientsErr;
                    }

                    dbg( 'getDetailsForLDTMatching', `patients: ${util.inspect( patients )}` );
                    if( 1 === uniquePatientIdsFromActivities.length ) {
                        if( patientFirstname && patientName && patientDob ) {
                            const patientFromPatientList = patients.find( patient => patient.firstname.match( new RegExp( `${patientFirstname}$`, 'i' ) ) && patient.lastname.match( new RegExp( `${patientName}$`, 'i' ) ) && patient.kbvDob === moment( patientDob ).format( 'DD.MM.YYYY' ) );

                            dbg( 'getDetailsForLDTMatching', `patientFromPatientList: ${util.inspect( patientFromPatientList )}` );
                            if( patientFromPatientList ) {
                                if( activities[0].caseFolderId ) {
                                    Y.log( `there is only 1 patient for the given activity && name+dob matches && matching into casefolder from activity.`, 'info', NAME );
                                    return {
                                        patient: patientFromPatientList,
                                        caseFolderId: activities[0].caseFolderId,
                                        locationId: activities[0].locationId && activities[0].locationId.toString(),
                                        employeeId: activities[0].employeeId && activities[0].employeeId.toString()
                                    };
                                } else if( patientFromPatientList.activeCaseFolderId ) {
                                    Y.log( `there is only 1 patient for the given activity && name+dob matches && matching into activeCaseFolderId from patient.`, 'info', NAME );
                                    logExit( timer );
                                    return {
                                        patient: patientFromPatientList,
                                        caseFolderId: activities[0].activeCaseFolderId,
                                        locationId: activities[0].locationId && activities[0].locationId.toString(),
                                        employeeId: activities[0].employeeId && activities[0].employeeId.toString()
                                    };
                                } else {
                                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: `there is only 1 patient for the given activity && name+dob matches && NO matching, because no casefolder in activity and patient has no activeCaseFolderId.`} );
                                }
                            } else {
                                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `there is only 1 patient for the given activity && NO matching, because name+dob dont match.`} );
                            }
                        } else {
                            const activitiesFromPatient = activities.find( act => act.patientId === uniquePatientIdsFromActivities[0] );
                            Y.log( `there is only 1 patient for the given activity && NO name+dob given && matching.`, 'info', NAME );
                            logExit( timer );
                            return {
                                patient: patients[0],
                                caseFolderId: activitiesFromPatient && activitiesFromPatient.caseFolderId,
                                locationId: activitiesFromPatient && activitiesFromPatient.locationId,
                                employeeId: activitiesFromPatient && activitiesFromPatient.employeeId && activitiesFromPatient.employeeId.toString()
                            };
                        }
                    } else {
                        Y.log( `PatientIdsFromActivities: ${uniquePatientIdsFromActivities}`, 'info', NAME );
                        if( patients.length === 1 ) {
                            const activitiesFromPatient = activities.filter( activity => (activity.patientId === (patients[0]._id && patients[0]._id.toString())) );
                            Y.log( `there is only 1 patient for the given activity && matching.`, 'info', NAME );
                            logExit( timer );
                            return {
                                patient: patients[0],
                                caseFolderId: activitiesFromPatient[0].caseFolderId,
                                locationId: activitiesFromPatient[0].locationId && activitiesFromPatient[0].locationId.toString(),
                                employeeId: activitiesFromPatient[0].employeeId && activitiesFromPatient[0].employeeId.toString()
                            };
                        } else if( patients.length > 1 ) {
                            const days = parseInt( cfg && cfg.timeRangeDays, 10 );
                            if( patientFirstname && patientName && patientDob ) {
                                const patientFromPatientList = patients.find( patient => patient.firstname.match( new RegExp( `${patientFirstname}$`, 'i' ) ) && patient.lastname.match( new RegExp( `${patientName}$`, 'i' ) ) && patient.kbvDob === moment( patientDob ).format( 'DD.MM.YYYY' ) );
                                if( patientFromPatientList ) {
                                    Y.log( `patientFromPatientList: ${patientFromPatientList}`, 'info', NAME );
                                    const activitiesFromPatient = activities.find( activity => (activity.patientId === (patientFromPatientList._id && patientFromPatientList._id.toString()) && activity.actType === 'LABREQUEST') );
                                    if( activitiesFromPatient ) {
                                        if( activitiesFromPatient.caseFolderId ) {
                                            Y.log( `multiple matching patients && name+dob given && matching, because patient has a LABREQUEST && patients name+dob combo matches.`, 'info', NAME );
                                            logExit( timer );
                                            return {
                                                patient: patientFromPatientList,
                                                caseFolderId: activitiesFromPatient.caseFolderId,
                                                locationId: activitiesFromPatient.locationId && activitiesFromPatient.locationId.toString(),
                                                employeeId: activitiesFromPatient.employeeId && activitiesFromPatient.employeeId.toString()
                                            };
                                        } else if( patientFromPatientList.activeCaseFolderId ) {
                                            Y.log( `multiple matching patients && name+dob given && matching, because patient has activeCaseFolderId && patients name+dob combo matches.`, 'info', NAME );
                                            logExit( timer );
                                            return {
                                                patient: patientFromPatientList,
                                                caseFolderId: patientFromPatientList.activeCaseFolderId,
                                                locationId: activitiesFromPatient.locationId && activitiesFromPatient.locationId.toString(),
                                                employeeId: activitiesFromPatient.employeeId && activitiesFromPatient.employeeId.toString()
                                            };
                                        }
                                    } else {
                                        throw new Y.doccirrus.commonerrors.DCError( 400, {message: `matching error: no matching name+dob combo for patient: ${patientFirstname}, ${patientName}, ${patientDob}`} );
                                    }
                                } else {
                                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: `matching error: no matching patient found for name+dob combo: ${patientFirstname}, ${patientName}, ${patientDob}`} );
                                }
                            } else if( cfg && cfg.timeRange && assignmentField === '8310' && assignmentValue && !isNaN( days ) ) {
                                const [err, activitiesInTimeRange] = await formatPromiseResult(
                                    runDb( {
                                        model: 'activity',
                                        user: user,
                                        action: 'get',
                                        query: {
                                            timestamp: {
                                                '$gte': moment().subtract( days, 'days' ).startOf( 'day' ).toISOString()
                                            },
                                            labRequestId: assignmentValue
                                        },
                                        options: {
                                            sort: {
                                                timestamp: -1
                                            }
                                        }
                                    } )
                                );

                                if( err ) {
                                    Y.log( `getDetailsForLDTMatching - error in getting activities in time range, err: ${err.stack || err}`, 'warn', NAME );
                                    throw err;
                                } else if( activitiesInTimeRange && activitiesInTimeRange.length > 0 ) {
                                    Y.log( `Matching patient via activity and give time range.`, 'info', NAME );
                                    const [patientErr, patient] = await formatPromiseResult(
                                        getPatientsFromPatientIds( {
                                            user: user,
                                            patientIdsFromActivities: activitiesInTimeRange[0].patientId
                                        } )
                                    );
                                    if( patientErr ) {
                                        throw patientErr;
                                    }

                                    logExit( timer );
                                    return {
                                        patient: patient && patient.length > 0 && patient[0],
                                        caseFolderId: activitiesInTimeRange[0].caseFolderId,
                                        locationId: activitiesInTimeRange[0].locationId && activitiesInTimeRange[0].locationId.toString(),
                                        employeeId: activitiesInTimeRange[0].employeeId && activitiesInTimeRange[0].employeeId.toString()
                                    };
                                } else {
                                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: `error: didnt find any activities in time range from ${moment().subtract( days, 'days' ).startOf( 'day' ).toISOString()} to ${moment().toISOString()}`} );
                                }
                            } else {
                                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `matching error: cant match, because multiple patients && NO time range give && no name+dob combo`} );
                            }
                        } else {
                            throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'err_no_matching_patient_request'} );
                        }
                    }
                } else {
                    let [err, details] = await formatPromiseResult(
                        getActivityDetailsFromLDTMatching( {
                            assignmentField: assignmentField,
                            assignmentValue: assignmentValue,
                            ldtJson: ldtJson,
                            patientFirstname: patientFirstname,
                            patientName: patientName,
                            patientDob: patientDob,
                            patientInsuranceId: patientInsuranceId,
                            patientInsuranceNo: patientInsuranceNo,
                            user: user
                        } )
                    );

                    if( err ) {
                        throw err;
                    }
                    logExit( timer );
                    return details;
                }
            } else {
                let [err, details] = await formatPromiseResult(
                    getActivityDetailsFromLDTMatching( {
                        assignmentField: assignmentField,
                        assignmentValue: assignmentValue,
                        ldtJson: ldtJson,
                        patientFirstname: patientFirstname,
                        patientName: patientName,
                        patientDob: patientDob,
                        patientInsuranceId: patientInsuranceId,
                        patientInsuranceNo: patientInsuranceNo,
                        user: user
                    } )
                );

                if( err ) {
                    throw err;
                }
                logExit( timer );
                return details;
            }
        }

        /**
         * @method writeInitialLabLogs
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.dataToInsert - .
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Array<module:lablogSchema.lablog>}
         */
        async function writeInitialLabLogs( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.writeInitialLabLogs' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.writeInitialLabLogs' );
            }

            const {
                dataToInsert,
                user
            } = args;

            const [err, res] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'lablog',
                    action: 'mongoInsertMany',
                    data: dataToInsert,
                    options: {
                        entireRec: true
                    }
                } )
            );

            if( err ) {
                Y.log( `writeInitialLabLogs - err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( res ) {
                logExit( timer );
                return res.ops;
            }
        }

        /**
         * @method getActivityDetailsFromLDTMatching
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {String} args.assignmentField - .
         * @param {String} args.assignmentValue - .
         * @param {Object} args.ldtJson - .
         * @param {String} args.patientFirstname - .
         * @param {String} args.patientName - .
         * @param {Date} args.patientDob - .
         * @param {String} args.patientInsuranceId - .
         * @param {String} args.patientInsuranceNo - .
         * @param {module:authSchema.auth} args.user - User Object.
         * @return {activityDetails} details
         */
        async function getActivityDetailsFromLDTMatching( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getActivityDetailsFromLDTMatching' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.writeInitialLabLogs' );
            }

            const {
                assignmentField,
                assignmentValue,
                ldtJson,
                patientFirstname,
                patientName,
                patientDob,
                patientInsuranceId,
                patientInsuranceNo,
                user
            } = args;

            let query;

            if( assignmentField === patientIdField && assignmentValue ) {
                //patientId
                query = {
                    patientNo: assignmentValue
                };
            } else if( patientFirstname && patientName && patientDob ) {
                //patient name combo
                query = {
                    firstname: new RegExp( `${patientFirstname}$`, 'i' ),
                    lastname: new RegExp( `${patientName}$`, 'i' ),
                    kbvDob: moment( patientDob ).format( 'DD.MM.YYYY' )
                };
                if( (ldtJson && ldtJson.versionUsed && ldtJson.versionUsed.name && ldtJson.versionUsed.name.startsWith( 'ldt3' )) && (patientInsuranceId || patientInsuranceNo) ) {
                    query = {
                        ...query,
                        'insuranceStatus.insuranceNo': patientInsuranceId
                    };
                }
            } else {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `matching error: NO patient data in LDT`} );
            }

            let [err, patients] = await formatPromiseResult(
                queryPatients( {
                    user: user,
                    query: query
                } ) );

            dbg( 'getActivityDetailsFromLDTMatching', `queried patients: `, query );
            if( err ) {
                Y.log( `getDetailsForLDTMatching - err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( patients && patients.length > 0 ) {
                const record = ldtJson && ldtJson.records && ldtJson.records.length && ldtJson.records[ldtJson.records.length > 3 ? 2 : 1];
                const feeSchedule = lablogSchema.getRecordFeeSchedule( record );
                let [err, caseFolder] = await formatPromiseResult(
                    findCaseFolderForPatient( {
                        user: user,
                        patient: patients[0],
                        feeSchedule: feeSchedule
                    } )
                );

                if( err ) {
                    Y.log( `getDetailsForLDTMatching - err: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                logExit( timer );
                return {
                    patient: patients[0],
                    caseFolderId: caseFolder && caseFolder._id && caseFolder._id.toString(),
                    locationId: patients[0].locationId,
                    employeeId: patients[0].employees && Array.isArray( patients[0].employees ) && patients[0].employees[0] && patients[0].employees[0].toString(),
                    assignmentField: patientNameField,
                    assignmentValue: patients[0]
                };
            } else {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `matching error: could not get patient via query: ${util.inspect( query )}`} );
            }
        }

        /**
         * @method getInitialPatientLabLogDataFromLabLogEntries
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Array} args.initialLabLogs - .
         *
         * @return {Object} initialPatientLabLogData
         */
        async function getInitialPatientLabLogDataFromLabLogEntries( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getInitialPatientLabLogDataFromLabLogEntries' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getInitialPatientLabLogDataFromLabLogEntries' );
            }

            const {
                initialLabLogs
            } = args;

            let initialData = [];

            for( let labLog of initialLabLogs ) {
                let dbData = {
                    timestamp: labLog.timestamp || new Date(),
                    status: 'OPEN',
                    type: labLog.type || '',
                    description: '',
                    assignedPatient: labLog.assignedPatient || {},
                    configuration: labLog.configuration || {},
                    l_data: labLog.l_data || {},
                    linkedActivities: [],
                    errs: [],
                    pmResults: labLog.pmResults || undefined
                };

                initialData.push( dbData );
            }

            logExit( timer );
            return initialData;
        }

        /**
         * @method updateLabLogs
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {module:lablogSchema.lablog} args.dbData - Database Data for LabData.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Boolean}
         */
        async function updateLabLogs( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.updateLabLogs' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.updateLabLogs' );
            }

            const {
                dbData,
                user
            } = args;

            const labLogId = dbData._id && dbData._id.toString();
            if( typeof dbData._id === 'string' ) {
                delete dbData._id;
            }

            // Remove unwanted/needed error fields that may contain mongo unfriendly fields like $message
            dbData.errs = (dbData.errs || []).map( err => {
                const {code, type, message} = err;
                return {code, type, message};
            } );

            const [err, updatedLablogs] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'lablog',
                    action: 'update',
                    query: {
                        _id: labLogId
                    },
                    data: Y.doccirrus.filters.cleanDbObject( dbData )
                } )
            );

            if( err ) {
                Y.log( `updateLabLogs - err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            } else if( updatedLablogs ) {
                logExit( timer );
                return true;
            }
        }

        /**
         * fetches metadata like labName and dateOfCreation
         * @method getMetaData
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.ldtJson - Parsed LDT Object.
         *
         * @returns {Object} metaData - Meta Data Object.
         * @returns {String} metaData.labName - Name of the Laboratory.
         * @returns {Date} metaData.dateOfCreation - Date of Creation from LDT File.
         */
        async function getMetaData( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getMetaData' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getMetaData' );
            }

            const {
                ldtJson
            } = args;

            let header = lablogSchema.getHeader( ldtJson );

            if( header ) {
                logExit( timer );
                return {
                    labName: lablogSchema.getHeaderLabName( header ) || lablogSchema.getHeaderSenderName( header ) || UNKNOWN,
                    dateOfCreation: lablogSchema.getHeaderDateOfCreation( header ) || new Date(),
                    typeOfLab: lablogSchema.getHeaderTypeOfLab( header ) || Y.doccirrus.schemas.flow.types.InternalExternalLabTreatmentsMapping_E.default
                };
            } else {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `Invalid file: header/LANR missing. header is: ${util.inspect( header, {depth: 10} )}`} );
            }
        }

        /**
         *
         * @method saveLDTFileOnDisk
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.ldtFile - LDT File Object.
         * @param {module:authSchema.auth} args.user - User Object.
         * @param {Object} args.data - Raw LDT File Data.
         *
         * @return {Object}
         */
        async function saveLDTFileOnDisk( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.saveLDTFileOnDisk' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.saveLDTFileOnDisk' );
            }

            const {
                data,
                ldtFile,
                ldtJson,
                user
            } = args;

            const
                lHeader = await getRecordTypeFromLDT( {
                    records: ldtJson.records,
                    reverse: false,
                    type: headersAndFooters[1]
                } ),
                pHeader = await getRecordTypeFromLDT( {
                    records: ldtJson.records,
                    reverse: false,
                    type: headersAndFooters[2]
                } );

            const encoding = (lHeader && lHeader.record && lHeader.record.encoding) || (pHeader && pHeader.record && pHeader.record.encoding);

            const [err, res] = await formatPromiseResult(
                gridFsStore( {
                    data: data,
                    encoding: encoding,
                    originalname: ldtFile.originalname,
                    user: user
                } )
            );

            if( err ) {
                Y.log( `saveLDTFileOnDisk - err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            } else {
                logExit( timer );
                return {
                    fileDatabaseId: res
                };
            }
        }

        /**
         *
         * @method readLDTFile
         *
         * @param {Object} readFileArgs - Object of Arguments.
         * @param {Function} [readFileArgs.callback] - callback.
         * @param {Object} readFileArgs.args - Arguments passed on by Frontend.
         *
         * @return {Object}
         */
        async function readLDTFile( readFileArgs ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.readLDTFile' );
            if( readFileArgs.callback ) {
                readFileArgs.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( readFileArgs.callback, 'Exiting Y.doccirrus.api.lab.readLDTFile' );
            }

            const {
                args
            } = readFileArgs;

            if( args && args.httpRequest && args.httpRequest.files && args.httpRequest.files.ldtFile && args.httpRequest.files.ldtFile.originalname ) {
                let ldtFile = args.httpRequest.files.ldtFile;

                const [err, data] = await formatPromiseResult(
                    readFile( args.httpRequest.files.ldtFile.path )
                );

                if( err ) {
                    Y.log( `readLDTFile - readfile err: ${err.stack || err}`, 'warn', NAME );
                    throw Y.doccirrus.errors.rest( 19005 );
                } else {
                    logExit( timer );
                    return {
                        data: data,
                        ldtFile: ldtFile
                    };
                }
            } else if( args.ldtFile && args.ldtFile.path && args.ldtFile.originalname && args.ldtFile.data ) {
                let ldtFile = args.ldtFile;
                let data = ldtFile.data;
                dbg( 'readLDTFile', `file: `, ldtFile );

                logExit( timer );
                return {
                    data: data,
                    ldtFile: ldtFile
                };
            } else {
                Y.log( `readLDTFile - err: ${Y.doccirrus.errors.rest( 19002 )}`, 'warn', NAME );
                throw Y.doccirrus.errors.rest( 19002 );
            }
        }

        /**
         *
         * @method checkLabLogForDuplicateImport
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.data - Raw LDT File Data.
         * @param {Object} args.ignoreHashExists - Boolean to check, if Import of duplicates is allowed.
         * @param {Object} args.ldtFile - LDT File Object.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Object}
         */
        async function checkLabLogForDuplicateImport( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.checkLabLogForDuplicateImport' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.checkLabLogForDuplicateImport' );
            }

            const {
                data,
                ignoreHashExists,
                ldtFile,
                user
            } = args;

            let fileName = ldtFile && ldtFile.originalname;
            ldtFile.fileHash = Y.doccirrus.api.xdtTools.fastHash( data ).toString( 16 );

            Y.log( `checkLabLogForDuplicateImport - File hash is: ${ldtFile.fileHash} ( ${fileName} )`, 'debug', NAME );

            if( -1 !== knownLdtFileHashes.indexOf( ldtFile.fileHash ) ) {
                //  file already known to this instance, blocking duplicate
                if( !ignoreHashExists ) {
                    Y.log( `checkLabLogForDuplicateImport - LDT file hash ${ldtFile.fileHash} found in memory, preventing duplicate import.`, 'warn', NAME );
                    throw Y.doccirrus.errors.rest( 19000 );
                }

                Y.log( `checkLabLogForDuplicateImport - LDT file hash ${ldtFile.fileHash} found in memory, option set to allow import anyway.`, 'warn', NAME );
            } else {
                //  file not yet received by this instance, note it
                Y.log( `checkLabLogForDuplicateImport - Recording LDT hash to prevent parallel uploads: ${ldtFile.fileHash}`, 'debug', NAME );
                knownLdtFileHashes.push( ldtFile.fileHash );
            }

            let [err, res] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'lablog',
                    action: 'get',
                    query: {
                        fileHash: ldtFile.fileHash
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( err, 'warn', NAME );
                throw Y.doccirrus.errors.rest( 19001 );
            }
            if( res.length > 0 && !ignoreHashExists ) {
                Y.log( 'checkLabLogForDuplicateImport - LDT file hash found in database, preventing duplicate import.', 'warn', NAME );
                throw Y.doccirrus.errors.rest( 19000 );
            } else {
                dbg( 'checkLabLogForDuplicateImport', `extension: ${fileName.substring( fileName.length - 4 )}` );

                if( '.xkm' === fileName.substring( fileName.length - 4 ).toLowerCase() ) {
                    dbg( 'checkLabLogForDuplicateImport', 'checkLabLogForDuplicateImport - got encrypted LDT file, decrypting...' );

                    const [decryptErr, decryptRes] = await formatPromiseResult(
                        decryptPromise( {
                            fileBinary: data,
                            fileName: fileName,
                            user: user
                        } )
                    );

                    if( decryptErr ) {
                        Y.log( `checkLabLogForDuplicateImport - decrypt ERR: ${util.inspect( decryptErr )}`, 'warn', NAME );
                        throw Y.doccirrus.errors.rest( 19001 );
                        // throw err;
                    }
                    if( decryptRes ) {
                        logExit( timer );
                        return {
                            data: decryptRes.fileBinary,
                            ldtFile: ldtFile
                        };
                    }
                } else {
                    dbg( 'checkLabLogForDuplicateImport', 'checkLabLogForDuplicateImport - got unencrypted LDT file...' );
                    logExit( timer );
                    return {
                        data: data,
                        ldtFile: ldtFile
                    };
                }
            }
        }

        /**
         *
         * @method decryptPromise
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.fileBinary - fileBinary.
         * @param {Object} args.fileName - fileName.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Object}
         */
        async function decryptPromise( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.decryptPromise' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.checkLabLogForDuplicateImport' );
            }

            const {
                fileBinary,
                fileName,
                user
            } = args;

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.xkm.decrypt( {
                    user: user,
                    mode: 'ldt_entschluesselung',
                    query: {
                        fileName: fileName,
                        fileBinary: fileBinary
                    },
                    callback: ( err, res ) => {
                        if( err ) {
                            logExit( timer );
                            return reject( err );
                        }
                        if( res ) {
                            logExit( timer );
                            return resolve( res );
                        }
                    }
                } );
            } );
        }

        /**
         *
         * @method parseLDTFile
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - callback.
         * @param {Buffer} args.data - Raw LDT File Data.
         * @param {Object} args.cfg - Frontend Config Object.
         * @param {Boolean} args.cfg.checkFileWithLdkPm - Check File with LDK Pruefmodul set by Flow.
         * @param {String} args.cfg.checkFilesWithLdkPm - Check File with LDK Pruefmodul set by LabBook.
         * @param {Boolean} args.cfg.softValidation - Simple LDT File Validation.
         * @param {Object} args.ldtFile - LDT File Object.
         * @param {String} args.ldtFile.originalname - Name of the File.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Object}
         */
        async function parseLDTFile( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.parseLDTFile' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.parseLDTFile' );
            }
            const {
                cfg: {
                    checkFileWithLdkPm,
                    checkFilesWithLdkPm,
                    softValidation
                },
                data,
                ldtFile,
                user
            } = args;

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.xdtParser.parse( {
                    data: data,
                    xdt: 'ldt',
                    softValidation: softValidation,
                    callback: async ( err, ldtJson ) => {
                        if( err ) {
                            Y.log( `parse err: ${util.inspect( err )}`, 'warn', NAME );
                            logExit( timer );
                            return reject( err );
                        }
                        if( ldtJson ) {
                            if( ldtJson.versionUsed && ldtJson.versionUsed.name && 'ldt20' === ldtJson.versionUsed.name ) {
                                //  SUP-13150 Replace static labRequestId / Anforderungs-ident
                                ldtJson = Y.doccirrus.labutils.replaceBadLabRequestId( ldtJson );
                            }

                            if( checkFilesWithLdkPm === 'on' || checkFileWithLdkPm ) {
                                const [ldtErr, ldkResult] = await formatPromiseResult(
                                    Y.doccirrus.labutils.checkLdtFile( {
                                        user: user,
                                        fileName: ldtFile.originalname,
                                        fileBuffer: data
                                    } )
                                );
                                if( ldtErr ) {
                                    Y.log( `could not execute ldk pm ${err}: go on anyway`, 'warn', NAME );
                                    logExit( timer );
                                    return resolve( {
                                        ldtJson: ldtJson,
                                        pmResults: null
                                    } );
                                }
                                Y.log( `ldk pm returns ${JSON.stringify( ldkResult )}`, 'debug', NAME );
                                logExit( timer );
                                return resolve( {
                                    ldtJson: ldtJson,
                                    pmResults: ldkResult
                                } );
                            } else {
                                logExit( timer );
                                return resolve( {
                                    ldtJson: ldtJson,
                                    pmResults: null
                                } );
                            }
                        } else {
                            logExit( timer );
                            return reject( 'no LDT JSON' );
                        }
                    }
                } );
            } );
        }

        /**
         * REST function to get an array of prettyfied strings of xdt records
         * @method getStringified
         * @param {Object} args - standard REST args that require a POST-based attachment
         * @param {Function} [args.callback] - callback.
         * @param {module:authSchema.auth} args.user - user.
         * @param {Object} args.originalParams - .
         * @param {String} args.originalParams.id - id of the lablog entry to use
         *
         * @return {Array<String>}
         */
        async function getStringified( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getStringified' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getStringified' );
            }

            const {
                originalParams: {
                    id
                },
                user
            } = args;
            dbg( 'getStringified', `with Id: `, id );

            const [err, labLogEntry] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'lablog',
                    action: 'get',
                    query: {
                        _id: id
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                dbg( 'getStringified', `err: `, err );
                logExit( timer );
                return args.callback( err );
            }
            if( !labLogEntry || !Array.isArray( labLogEntry ) || !labLogEntry.length ) {
                return args.callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'lablog entry not found.'} ) );
            }

            dbg( 'getStringified', `res: `, labLogEntry );
            const labData = labLogEntry[0].l_data || labLogEntry[0].labData;
            let ret = [];
            for( let i = 0; i < labData.records.length; i++ ) {
                Y.log( `stringification index: ${i}`, 'debug', NAMEfileLog );
                let text = Y.doccirrus.api.xdtTools.prettyText( {
                    versionUsed: labData.versionUsed,
                    records: [labData.records[i]]
                }, true, false, true );
                Y.log( text, 'debug', NAMEfileLog );
                ret.push( text );
            }

            logExit( timer );
            return args.callback( null, ret );
        }

        /**
         * @method getLabRequest
         *
         * @param {Object} args - Object of arguments.
         * @param {String} args.caseFolderId - caseFolderId.
         * @param {String} args.labRequestId - labRequestId.
         * @param {String} args.patientId - patientId.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:v_labrequestSchema.v_labrequest}
         */
        async function getLabRequest( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getLabRequest' );
            const {
                caseFolderId,
                labRequestId,
                patientId,
                user
            } = args;

            const [err, lastLabRequest] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        actType: 'LABREQUEST',
                        patientId: patientId,
                        labRequestId: labRequestId,
                        caseFolderId: caseFolderId
                    },
                    options: {
                        sort: {
                            timestamp: -1
                        },
                        limit: 1,
                        lean: true
                    }
                } )
            );

            if( err ) {
                throw err;
            }
            logExit( timer );
            return lastLabRequest;
        }

        /**
         * @method getCaseFolderById
         *
         * @param {Object} args - Object of arguments.
         * @param {String} args.caseFolderId - caseFolderId.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Array<module:casefolderSchema.casefolder>}
         */
        async function getCaseFolderById( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getCaseFolderById' );
            const {
                caseFolderId,
                user
            } = args;

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.casefolder.getCaseFolderById( user, caseFolderId, ( err, result ) => {
                    if( err ) {
                        logExit( timer );
                        return reject( err );
                    } else {
                        logExit( timer );
                        return resolve( result );
                    }
                } );
            } );
        }

        /**
         * @method getInsuranceForPatient
         *
         * @param {Object} args - Object of arguments.
         * @param {String} args.caseFolderId - caseFolderId.
         * @param {String} args.patientId - patientId.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {module:patientSchema.insuranceStatusObj}
         */
        async function getInsuranceForPatient( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getInsuranceForPatient' );
            const {
                caseFolderId,
                patientId,
                user
            } = args;

            let [err, patient] = await formatPromiseResult(
                getPatientsFromPatientIds( {
                    user: user,
                    patientIdsFromActivities: patientId
                } )
            );
            if( err ) {
                Y.log( `could not get patient by patientId, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( !patient || patient.length === 0 ) {
                Y.log( `could not find patient by patientId: ${patientId}`, 'warn', NAME );
                return;
            }
            let caseFolder;
            [err, caseFolder] = await formatPromiseResult(
                getCaseFolderById( {
                    caseFolderId: caseFolderId,
                    user: user
                } )
            );
            if( err ) {
                Y.log( `could not get caseFolderById, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( !caseFolder || caseFolder.length === 0 ) {
                Y.log( `could not find caseFolderById: ${caseFolderId}`, 'warn', NAME );
                return;
            }
            logExit( timer );
            return Y.doccirrus.schemas.patient.getInsuranceByType( patient[0], caseFolder[0].type );
        }

        /**
         * @method getEmployeeIdForPatient
         *
         * @param {Object} args - Object of arguments.
         * @param {String} args.caseFolderId - caseFolderId.
         * @param {String} args.labRequestId - labRequestId.
         * @param {String} args.patientId - patientId.
         * @param {Date} args.timestamp - Timestamp.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {String}
         */
        async function getEmployeeIdForPatient( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getEmployeeIdForPatient' );
            const {
                caseFolderId,
                labRequestId,
                patientId,
                timestamp,
                user
            } = args;

            //1
            if( labRequestId ) {
                let [err, lastLabRequest] = await formatPromiseResult(
                    getLabRequest( {
                        caseFolderId: caseFolderId,
                        labRequestId: labRequestId,
                        patientId: patientId,
                        user: user
                    } )
                );
                if( err ) {
                    Y.log( `could not get last labrequest activity, err: ${err.stack || err}`, 'info', NAME );
                }
                if( lastLabRequest && lastLabRequest.length === 1 ) {
                    logExit( timer );
                    return lastLabRequest[0].employeeId;
                }
            }

            //2
            let [err, lastSchein] = await formatPromiseResult(
                getLastScheinPromise( {
                    user: user,
                    query: {
                        patientId: patientId,
                        caseFolderId: caseFolderId,
                        timestamp: timestamp || new Date()
                    },
                    options: {}
                } )
            );
            if( err ) {
                Y.log( `could not get last schein activity, err: ${err.stack || err}`, 'warn', NAME );
            }
            if( lastSchein && lastSchein.length > 0 ) {
                logExit( timer );
                return lastSchein[0].employeeId;
            }

            //3
            let insurance;
            [err, insurance] = await formatPromiseResult(
                getInsuranceForPatient( {
                    caseFolderId: caseFolderId,
                    patientId: patientId,
                    user: user
                } )
            );
            if( err ) {
                Y.log( `could not get insurance for patient, err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( !insurance ) {
                Y.log( `could not find insurance for patient: ${patientId}, caseFolderId: ${caseFolderId}`, 'warn', NAME );
            }
            logExit( timer );
            return insurance && insurance.employeeId;
        }

        /**
         * @method assignLabLog
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - Callback.
         * @param {Object} args.data - Data Object.
         * @param {Boolean} args.data.allowGkvBilling - GKV Billing Flag.
         * @param {Boolean} args.data.billingFlag - Billing Flag.
         * @param {module:casefolderSchema.casefolder} args.data.caseFolder - CaseFolder.
         * @param {Boolean} args.data.disallowGkvBilling - disallowGkvBilling.
         * @param {Boolean} args.data.useDataFromLabrequestIfPresent - useDataFromLabrequestIfPresent.
         * @param {module:lablogSchema.lablog} args.data.labLog - LabLog Object.
         * @param {String} args.data.patientId - PatientId.
         * @param {Object} [args.user] - User Object.
         *
         * @return {module:lablogSchema.lablog}
         */
        async function assignLabLog( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.assignLabLog' );
            let {
                data: {
                    allowGkvBilling,
                    billingFlag,
                    caseFolder,
                    disallowGkvBilling,
                    useDataFromLabrequestIfPresent,
                    labLog,
                    patientId
                },
                user,
                callback
            } = args;

            labLog.timestamp = new Date();
            labLog.configuration.pre.billingFlag = billingFlag;
            labLog.configuration.pre.gkvBillingFlag = allowGkvBilling;
            labLog.configuration.pre.useDataFromLabrequestIfPresent = useDataFromLabrequestIfPresent;

            let [err, patient] = await formatPromiseResult(
                getPatientsFromPatientIds( {
                    user: user,
                    patientIdsFromActivities: patientId
                } )
            );
            if( err ) {
                Y.log( `assignLabLog: Failed to get patient from patients ids ${err.stack || err}`, 'error', NAME );
                labLog.errs.push( err );
            }
            patient = patient[0];

            let employee;
            [err, employee] = await formatPromiseResult(
                getEmployeeShortFromUser( {
                    user: user
                } )
            );
            if( err ) {
                Y.log( `assignLabLog: Failed to get EmployeeShortFromUser: ${err.stack || err} `, 'error', NAME );
                labLog.errs.push( err );
            }
            labLog.user[0] = employee;

            let metaData;
            [err, metaData] = await formatPromiseResult(
                getMetaData( {
                    ldtJson: labLog.l_data
                } )
            );
            if( err ) {
                return handleResult( err, undefined, callback );
            }

            let processedLabLog;
            [err, processedLabLog] = await formatPromiseResult(
                processLabLog( {
                    user: user,
                    labLog: labLog,
                    cfg: {
                        ...labLog.configuration.pre,
                        allowGkvBilling,
                        billingFlag,
                        disallowGkvBilling,
                        useDataFromLabrequestIfPresent
                    },
                    metaData: metaData,
                    savedLDTFile: {
                        fileDatabaseId: labLog.fileDatabaseId
                    },
                    overrides: {
                        detailsForLDTMatching: {
                            patient: patient,
                            caseFolderId: caseFolder && caseFolder._id && caseFolder._id.toString(),
                            assignmentField: patientNameField,
                            assignmentValue: patient
                        }
                    }
                } )
            );
            if( err ) {
                return handleResult( err, undefined, callback );
            }

            //update lablog entries
            [err] = await formatPromiseResult(
                updateLabLogs( {
                    dbData: processedLabLog,
                    user: user
                } )
            );

            if( err ) {
                Y.log( `assignLabLog: updateLabLogs, err: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                return handleResult( err, null, callback );
            }

            updateCaseFolder( caseFolder && caseFolder._id );

            logExit( timer );
            return handleResult( null, labLog, callback );
        }

        /**
         * @method assignOldLabLog
         *
         * @param {Object} args - Object of Arguments.
         * @param {Function} [args.callback] - Callback.
         * @param {Object} args.data - Data Object.
         * @param {Boolean} args.data.allowGkvBilling - GKV Billing Flag.
         * @param {Boolean} args.data.billingFlag - Billing Flag.
         * @param {module:casefolderSchema.casefolder} [args.data.caseFolder] - CaseFolder.
         * @param {String} args.data.disallowGkvBilling - disallowGkvBilling.
         * @param {module:lablogSchema.lablog} args.data.labLog - LabLog Object.
         * @param {String} args.data.patientId - PatientId.
         * @param {Object} [args.user] - User Object.
         *
         * @return {module:lablogSchema.lablog}
         */
        async function assignOldLabLog( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.assignOldLabLog' );
            let {
                data: {
                    allowGkvBilling,
                    billingFlag,
                    caseFolder,
                    disallowGkvBilling,
                    labLog,
                    patientId
                },
                user
            } = args;

            let
                oldLabLog = labLog,
                index = oldLabLog.index;

            let [err, patient] = await formatPromiseResult(
                getPatientsFromPatientIds( {
                    user: user,
                    patientIdsFromActivities: patientId
                } )
            );
            if( err ) {
                Y.log( `assignOldLabLog: Failed to get patient from patients ids ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            // fetches metadata like doc ID and location ID
            let metaData;
            [err, metaData] = await formatPromiseResult(
                getMetaData( {
                    ldtJson: labLog.l_data
                } )
            );

            if( err ) {
                return handleError( {
                    err: err,
                    callback: args.callback,
                    code: err.code || 19009
                } );
            }

            let initialLabLogData;
            [err, initialLabLogData] = await formatPromiseResult(
                getInitialLabLogDataFromLDT( {
                    cfg: {
                        billingFlag: billingFlag,
                        allowGkvBilling: allowGkvBilling,
                        disallowGkvBilling: disallowGkvBilling
                    },
                    dateOfCreation: metaData.dateOfCreation,
                    flow: '',
                    labName: metaData.labName,
                    ldtFile: {
                        originalname: labLog.fileName,
                        fileHash: labLog.fileHash
                    },
                    ldtJson: labLog.l_data,
                    pmResults: labLog.pmResults,
                    savedLDTFile: {
                        fileDatabaseId: {
                            _id: labLog.fileDatabaseId
                        }
                    },
                    user: args.user
                } )
            );
            if( !initialLabLogData || !initialLabLogData.length ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'no initialLabLogData'} ), null, args.callback );
            }
            labLog = initialLabLogData[index - 1];

            let matchMethod;
            [err, matchMethod] = await formatPromiseResult(
                findMatchMethod( {
                    ldtJson: labLog.l_data
                } )
            );

            if( err ) {
                Y.log( `assignOldLabLog: findMatchMethod err: ${err.stack || err}`, 'warn', NAME );
                labLog.errs.push( err );
            }

            let employee;
            [err, employee] = await formatPromiseResult(
                getEmployeeShortFromUser( {
                    user: user
                } )
            );
            if( err ) {
                labLog.errs.push( err );
                Y.log( `assignOldLabLog: Failed to get EmployeeShortFromUser  ${err.stack || err} `, 'error', NAME );
            }

            labLog.configuration.pre.billingFlag = billingFlag || false;
            labLog.configuration.pre.gkvBillingFlag = allowGkvBilling || false;
            labLog.configuration.pre.disallowGkvBilling = disallowGkvBilling || false;
            labLog.assignedPatient.patientId = patientId;
            labLog.assignedPatient.patientName = Y.doccirrus.schemas.person.personDisplay( patient[0] );
            labLog.description = getDescriptionFromRecord( {
                assignmentField: patientNameField,
                assignmentValue: patientId
            } );
            if( employee ) {
                labLog.user[0] = employee;
            }

            const textToCompare = Y.doccirrus.api.xdtTools.prettyText(
                {
                    records: labLog.l_data.records,
                    versionUsed: labLog.l_data.versionUsed
                },
                false,
                false,
                false
            );

            let
                employeeIdForPatient,
                locationId;
            if( matchMethod ) {
                [err, employeeIdForPatient] = await formatPromiseResult(
                    getEmployeeIdForPatient( {
                        caseFolderId: caseFolder && caseFolder._id,
                        labRequestId: matchMethod.labReqId,
                        patientId: patientId,
                        timestamp: matchMethod.timestamp,
                        user: user
                    } )
                );
                if( err ) {
                    Y.log( `assignOldLabLog: getEmployeeIdForPatient err: ${err.stack || err}`, 'warn', NAME );
                    labLog.errs.push( err );
                }

                //file
                locationId = matchMethod.locationIdFromLDT;
                if( !locationId ) {
                    Y.log( `assignOldLabLog: LDT File has no LocationId`, 'info', NAME );
                    //schein
                    let query = {
                        patientId: patientId,
                        timestamp: new Date()
                    };

                    let options = {};
                    if( caseFolder && caseFolder._id ) {
                        query.caseFolderId = caseFolder && caseFolder._id;
                    } else {
                        options.doNotQueryCaseFolder = true;
                    }

                    const [err, schein] = await formatPromiseResult(
                        getLastScheinPromise( {
                            user: args.user,
                            query: query,
                            options: options
                        } )
                    );

                    if( err ) {
                        Y.log( `assignOldLabLog: could not get last schein, err: ${err.stack || err}`, 'warn', NAME );
                        labLog.errs.push( err );
                    } else if( schein && schein.length > 0 ) {
                        locationId = schein[0].locationId && schein[0].locationId.toString();
                        Y.log( `assignOldLabLog: Patient has a Schein with LocationId: ${locationId}`, 'info', NAME );
                    }
                    if( !locationId ) {
                        Y.log( `assignOldLabLog: Didnt find a Schein for Patient: ${query.patientId}`, 'warn', NAME );
                        let [err, insurance] = await formatPromiseResult(
                            getInsuranceForPatient( {
                                caseFolderId: caseFolder && caseFolder._id,
                                patientId: patientId,
                                user: user
                            } )
                        );
                        if( err ) {
                            Y.log( `assignOldLabLog: could not get insurance for patient, err: ${err.stack || err}`, 'warn', NAME );
                        } else if( insurance ) {
                            locationId = insurance.locationId;
                        }
                        if( !locationId ) {
                            locationId = Y.doccirrus.schemas.location.getMainLocationId();
                            Y.log( `assignOldLabLog: Setting LocationId to main LocationId: ${locationId}`, 'info', NAME );
                        }
                    }
                } else {
                    Y.log( `assignOldLabLog: LDT File has a LocationId: ${locationId}`, 'info', NAME );
                }
            }

            let initialActivityData;
            [err, initialActivityData] = await formatPromiseResult(
                getInitialActivityData( {
                    caseFolderId: caseFolder && caseFolder._id,
                    dbData: labLog,
                    employeeId: employeeIdForPatient,
                    labName: labLog.source,
                    ldtJson: labLog.l_data,
                    locationId: locationId,
                    textToCompare: textToCompare,
                    timestamp: matchMethod.timestamp
                } )
            );

            if( err ) {
                Y.log( `assignOldLabLog: getInitialActivityData, err: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, null, args.callback );
            }

            let verifiedActivityData;
            [err, verifiedActivityData] = await formatPromiseResult(
                getVerifiedActivityData( {
                    activityData: initialActivityData,
                    user: user
                } )
            );
            if( err ) {
                Y.log( `assignOldLabLog: getVerifiedActivityData, err: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, null, args.callback );
            }
            if( !verifiedActivityData ) {
                return handleResult( 'could not verify activity data', null, args.callback );
            }

            let postedActivity;
            [err, postedActivity] = await formatPromiseResult(
                postActivity( {
                    activityData: verifiedActivityData.activityData,
                    user: user
                } )
            );
            if( err ) {
                Y.log( `assignOldLabLog: postActivity, err: ${err.stack || err}`, 'warn', NAME );
                labLog.errs.push( err );
            } else if( postedActivity ) {
                dbg( 'assignOldLabLog', `created activity, id: ${postedActivity} , data: `, verifiedActivityData.activityData );
                labLog.linkedActivities.splice( 0, 0, postedActivity );
            }

            if( labLog.configuration.pre.disallowGkvBilling && caseFolder && caseFolder.type === 'PUBLIC' ) {
                Y.log( 'assignOldLabLog: skipping creation of tests, because disallowGkvBilling is set', 'info', NAME );
            } else if( labLog.configuration.pre.billingFlag ) {
                dbg( 'assignOldLabLog', 'creating billing data...' );
                const
                    record = labLog.l_data && labLog.l_data.records && labLog.l_data.records.length && labLog.l_data.records[labLog.l_data.records.length > 3 ? 2 : 1],
                    areTreatmentDiagnosesBillable = ('K' === lablogSchema.getRecordBillingType( record ) && !labLog.configuration.pre.gkvBillingFlag) ? '0' : '1';

                let
                    tests = lablogSchema.getRecordTests( record ),
                    tmpFeeSchedule = lablogSchema.getRecordFeeSchedule( record ),
                    feeSchedule = tmpFeeSchedule && feeScheduleMap[tmpFeeSchedule],
                    catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'TREATMENT',
                        short: feeSchedule
                    } ),
                    lib = {};

                if( !lablogSchema.isRequest( record ) && tests && tests.length > 0 ) {
                    if( labLog.l_data.versionUsed.name && labLog.l_data.versionUsed.name.startsWith( 'ldt3' ) ) {
                        dbg( 'assignOldLabLog', `got feeSchedule?: `, feeSchedule );
                        dbg( 'assignOldLabLog', `got catalogDescriptor?: `, catalogDescriptor );
                        let l_requestId = lablogSchema.getRecordRequestId( record );

                        if( l_requestId ) {
                            runDb( {
                                user: user,
                                model: 'lablog',
                                action: 'get',
                                query: {
                                    'l_data.records.recordRequestId': l_requestId,
                                    _id: {$ne: labLog.fileDatabaseId}
                                },
                                options: {
                                    lean: true
                                },
                                callback: function( err, res ) {
                                    if( err ) {
                                        Y.log( `assignOldLabLog: error while checking for existing lablog ${err}`, 'warn', NAME );
                                    }
                                    if( res ) {
                                        res.forEach( ( {l_data, flags} ) => {
                                            if( l_data.records ) {
                                                l_data.records.forEach( ( record, i ) => {
                                                    let curTests = lablogSchema.getRecordTests( record );
                                                    let r_requestId = lablogSchema.getRecordRequestId( record );
                                                    if( curTests && r_requestId === l_requestId && 'NOMATCH' !== flags[i] ) {
                                                        curTests.forEach( test => {
                                                            let testId = lablogSchema.getTestId( test );
                                                            if( testId ) {
                                                                lib[testId] = test;
                                                            }
                                                        } );
                                                    }
                                                } );
                                            }
                                        } );
                                    }
                                }
                            } );
                        }
                    } else {
                        if( verifiedActivityData.mergingIsRequired && verifiedActivityData.previousLabdata ) {
                            let allLabDataTests = [];
                            if( Array.isArray( verifiedActivityData.previousLabdata.l_extra ) ) {
                                for( let i = 0; i < verifiedActivityData.previousLabdata.l_extra.length; i++ ) {
                                    allLabDataTests = allLabDataTests.concat( lablogSchema.getRecordTests( verifiedActivityData.previousLabdata.l_extra[i] ) );
                                }
                            } else {
                                allLabDataTests = allLabDataTests.concat( lablogSchema.getRecordTests( verifiedActivityData.previousLabdata.l_extra ) );
                            }
                            const newTests = tests.filter( test => !allLabDataTests.find( aTest => aTest && aTest.head === lablogSchema.getTestId( test ) ) );
                            tests = tests && Array.isArray( tests ) && tests.filter( test => allLabDataTests.find( aTest => aTest && aTest.head === lablogSchema.getTestId( test ) && JSON.stringify( aTest.gnr ) !== JSON.stringify( lablogSchema.getTestGnr( test ) ) ) );
                            tests = tests.concat( newTests );
                        }
                    }
                } else {
                    dbg( 'assignOldLabLog', 'no tests...' );
                }

                if( tests ) {
                    let treatmentsToCreate = [];

                    for( let test of tests ) {
                        dbg( 'assignOldLabLog', `trying to create data for: `, test );
                        let recGnr = lablogSchema.getTestGnr( test ) || [];
                        dbg( 'assignOldLabLog', `creating ${recGnr.length} treatments...` );
                        let [err, treatments] = await formatPromiseResult(
                            getAllTreatmentsFromTest( {
                                areTreatmentDiagnosesBillable: areTreatmentDiagnosesBillable,
                                catalogDescriptor: catalogDescriptor,
                                feeSchedule: feeSchedule,
                                recGnr: recGnr,
                                test: test,
                                version: labLog.l_data.versionUsed.name
                            } )
                        );
                        if( err ) {
                            Y.log( err, 'warn', NAME );
                        }

                        if( treatments && treatments.length ) {
                            for( let i = 0; i < treatments.length; i++ ) {
                                if( !treatments[i] ) {
                                    Y.log( `assignOldLabLog: malformed treatment... continue`, 'info', NAME );
                                    continue;
                                }

                                let activityDataFromTreatment;
                                [err, activityDataFromTreatment] = await formatPromiseResult(
                                    evaluateTreatment( {
                                        billable: treatments[i].billable,
                                        caseFolderId: caseFolder && caseFolder._id,
                                        catalogDescriptor: treatments[i].catalogDescriptor,
                                        cost: treatments[i].cost,
                                        employeeId: employeeIdForPatient,
                                        factor: treatments[i].factor,
                                        feeSchedule: lablogSchema.getTestFeeSchedule( treatments[i] ),
                                        gnr: lablogSchema.getTestGnr( treatments[i] ),
                                        labReqId: matchMethod.labReqId,
                                        locationId: locationId,
                                        patientId: patientId,
                                        test: treatments[i].test,
                                        timestamp: matchMethod.timestamp,
                                        user: user
                                    } )
                                );

                                if( err ) {
                                    Y.log( `assignOldLabLog: treatment, err: ${err.stack || err}`, 'warn', NAME );
                                    continue;
                                }

                                if( activityDataFromTreatment ) {
                                    treatmentsToCreate.push( activityDataFromTreatment );
                                }
                            }
                        }
                    }

                    if( treatmentsToCreate.length > 0 ) {
                        let treatmentsToCreatePromises = [];
                        for( let i = 0; i < treatmentsToCreate.length; i++ ) {
                            treatmentsToCreatePromises.push(
                                postActivity( {
                                    activityData: treatmentsToCreate[i],
                                    user: args.user
                                } )
                            );
                        }

                        let [err, postedActivities] = await formatPromiseResult(
                            Promise.all( treatmentsToCreatePromises )
                        );

                        if( err ) {
                            Y.log( `assignOldLabLog: failed to save treatments ${err.stack || err}`, 'warn', NAME );
                            labLog.errs.push( err );
                            [err, postedActivities] = await formatPromiseResult(
                                _pushTreatmentsToInBoxCaseFolder( args.user, patientId, treatmentsToCreate )
                            );
                            if( err ) {
                                Y.log( `assignOldLabLog: failed to save treatments ${err.stack || err}`, 'warn', NAME );
                                labLog.errs.push( err.data || err );
                                postedActivities = [];
                            }
                        }
                        if( postedActivities && postedActivities.length ) {

                            for( let activity of postedActivities ) {
                                if( activity && activity.toString() ) {
                                    labLog.linkedActivities.push( activity.toString() );
                                }
                            }
                        }
                    }
                    if( tests && tests.length ) {
                        Y.log( `assignOldLabLog: processed ${treatmentsToCreate && treatmentsToCreate.length}/${tests.length} LDT entries for Leistungen.`, 'info', NAME );
                    }
                }
            }

            oldLabLog.flags[index] = labLog.linkedActivities[0];
            oldLabLog.associatedPatients[index] = patientId;
            oldLabLog.patientEntriesNoMatch = oldLabLog.patientEntriesNoMatch--;

            [err] = await formatPromiseResult(
                runDb( {
                    user: user,
                    model: 'lablog',
                    action: 'update',
                    query: {
                        _id: oldLabLog._id
                    },
                    data: Y.doccirrus.filters.cleanDbObject( oldLabLog )
                } )
            );

            if( err ) {
                Y.log( `assignOldLabLog: updateLabLogs, err: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                return handleResult( err, null, args.callback );
            }

            logExit( timer );
            return handleResult( null, labLog, args.callback );
        }

        /**
         * set treatments casefolder id as inBox case folder id, and post activities
         * @param {Object} user
         * @param {String} patientId
         * @param {Array} treatmentsToCreate
         * @returns {Promise.<module:v_treatmentSchema.v_treatment>}
         * @private
         */
        async function _pushTreatmentsToInBoxCaseFolder( user, patientId, treatmentsToCreate ) {
            let timer = logEnter( 'Y.doccirrus.api.lab._pushTreatmentsToInBoxCaseFolder' );
            let inboxCaseFolderId = await Y.doccirrus.api.casefolder.getInBoxCaseFolderId( {
                user: user,
                data: {patientId: patientId}
            } );
            let treatmentsToCreatePromises = [];
            if( inboxCaseFolderId ) {
                treatmentsToCreate.forEach( item => {
                    item.caseFolderId = inboxCaseFolderId;
                    treatmentsToCreatePromises.push(
                        postActivity( {
                            activityData: item,
                            user: user
                        } )
                    );
                } );

                let [err, postedActivities] = await formatPromiseResult(
                    Promise.all( treatmentsToCreatePromises )
                );

                if( err ) {
                    Y.log( `pushTreatmentsToInBoxCaseFolder: failed to post activities to inbox caseFolder ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                logExit( timer );
                return postedActivities;
            }
            logExit( timer );
            return [];
        }

        /**
         * @method deleteActivity
         *
         * @param {Object} args - Object of Arguments.
         * @param {Object} args.activityId - .
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Boolean}
         */
        async function deleteActivity( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.deleteActivity' );
            const {
                activityId,
                user
            } = args;

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.activity.delete( {
                    user,
                    query: {
                        _id: activityId
                    },
                    callback: ( err ) => {
                        if( err && err.code !== 400 ) {
                            logExit( timer );
                            return reject( err );
                        }
                        logExit( timer );
                        return resolve( true );
                    }
                } );
            } );
        }

        /**
         * @method revertLabLog
         *
         * @param {Object} args - Object of Arguments.
         * @param {Object} args.data - Data Object.
         * @param {module:lablogSchema.lablog} args.data.labLog - LabLog.
         * @param {module:authSchema.auth} args.user - User Object.
         * @param {Function} [args.callback] - Callback.
         *
         * @return {module:lablogSchema.lablog} ...
         */
        async function revertLabLog( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.revertLabLog' );
            let {
                data: {
                    labLog
                },
                user
            } = args;

            let [err, employee] = await formatPromiseResult(
                getEmployeeShortFromUser( {
                    user: user
                } )
            );
            if( err ) {
                throw err;
            }
            if( !employee ) {
                return handleResult( 'could not get employee from user', null, args.callback );
            }
            labLog.user[0] = employee;

            let notDeletedActivities = [];
            labLog.linkedActivities.reverse();

            for( let activityId of labLog.linkedActivities ) {
                Y.log( `Deleting Activity with ID: ${activityId}.`, 'info', NAME );
                const [err, isActivityDeleted] = await formatPromiseResult(
                    deleteActivity( {
                        activityId: activityId,
                        user: user
                    } )
                );

                if( err ) {
                    labLog.errs.push( err );
                    Y.log( `could not delete Activity with ID: ${activityId} err: ${err.stack || err}`, 'warn', NAME );
                }
                if( !isActivityDeleted ) {
                    notDeletedActivities.push( activityId );
                }
            }

            labLog.linkedActivities = notDeletedActivities;

            if( labLog.linkedActivities.length === 0 ) {
                labLog.description = '';
                labLog.configuration.assignment.assignmentField = '';
                labLog.configuration.assignment.assignmentValue = '';
                labLog.assignedPatient.patientId = '';
                labLog.assignedPatient.patientName = '';
                labLog.linkedActivities = [];
            }

            labLog.timestamp = new Date();

            //update lablog entries
            [err] = await formatPromiseResult(
                updateLabLogs( {
                    dbData: labLog,
                    user: user
                } )
            );

            if( err ) {
                Y.log( `updateLabLogs err: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            if( args.callback ) {
                logExit( timer );
                args.callback( null, labLog );
            } else {
                logExit( timer );
                return labLog;
            }
        }

        // test route: http://5f6eaa5e8888.dev.dc/1/lab/:kvcTriggerFindings?account=DocCirrus.3
        async function kvcTriggerFindings( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.kvcTriggerFindings' );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.kvcTriggerFindings' );
            }

            const
                {user, originalParams = {}, callback} = args,
                account = originalParams.account;

            await Y.doccirrus.kvconnect.service.ldt.triggerFindings( {
                user,
                username: account
            } );

            logExit( timer );
            callback();
        }

        async function sendMDN( user, message ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.sendMDN' );
            if( !message.dispositionNotificationTo || !message.returnPath || (message.dispositionNotificationTo !== message.returnPath) ) {
                Y.log( `skip sending of mdn for kvcmessage ${message._id} `, 'info', NAME );
                return;
            }
            const
                to = message.to,
                emailParts = to && to.split( '@' ),
                username = emailParts[0];

            if( !username ) {
                throw new Error( 'could not extract username' );
            }

            logExit( timer );
            return Y.doccirrus.kvconnect.service.ldt.sendFindingMDN( {
                user: user,
                to: message.dispositionNotificationTo,
                username,
                messageId: message.messageId
            } );
        }

        function processFindingLdt( user, kvcMessage ) {
            const Promise = require( 'bluebird' );
            const
                getFile = ( user, id ) => {
                    return new Promise( ( resolve, reject ) => {
                        gridfs.get( user, id, ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        } );
                    } );

                };

            return Promise.resolve().then( () => {
                const
                    Path = require( 'path' ),
                    ldtFileAttachment = (kvcMessage.attachments || []).find( attachment => '.ldt' === Path.extname( attachment.filename ) );

                if( !ldtFileAttachment || !ldtFileAttachment.contentFileId ) {
                    const msg = `no ldt attachment found in kvcmessage ID=${kvcMessage._id}`;
                    Y.log( msg, 'warn', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 500, {message: msg} );
                }

                return Promise.props( {
                    data: getFile( user, ldtFileAttachment.contentFileId ).then( fileObj => fileObj.data ),
                    originalname: ldtFileAttachment.filename,
                    path: ldtFileAttachment.filename
                } );

            } ).then( result => {
                return new Promise( resolve => {
                    return Y.doccirrus.api.settings.get( {
                        user: user,
                        callback: ( err, result ) => {
                            if( err ) {
                                Y.log( `could not get settings for ldt submit from kvconnect ${err}`, 'error', NAME );
                            }
                            resolve( result && result[0] || {} );
                        }
                    } );
                } ).then( settings => {
                    return new Promise( ( resolve, reject ) => {
                        Lab.submitLDT( {
                            user,
                            data: {
                                ignoreHashExists: true,
                                billingFlag: true === settings.ldtBillingFlag,
                                allowGkvBilling: true === settings.ldtAllowGkvBilling,
                                disallowGkvBilling: true === settings.ldtDisallowGkvBilling,
                                checkFileWithLdkPm: true === settings.checkFilesWithLdkPm
                            },
                            ldtFile: result,
                            callback: ( err, result ) => {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve( result );
                            }
                        } );
                    } );

                } );
            } );

        }

        function processKvcLdtFindingMessage( args ) {
            Y.log( 'Entering Y.doccirrus.api.lab.processKvcLdtFindingMessage', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.processKvcLdtFindingMessage' );
            }

            const {user, params, callback} = args;
            if( 'DELIVERY' === params.message.messageType ) {
                sendMDN( user, params.message ).then( () => {
                    Y.log( `send mdn for ldt delivery message ID=${params.message._id}`, 'debug', NAME );
                } ).catch( err => {
                    Y.log( `could not send mdn for message ID=${params.message._id} err=${err && err.stack || err}`, 'error', NAME );
                } );

                processFindingLdt( user, params.message ).then( result => callback( null, result ) ).catch( err => callback( err ) );

                return;
            }
            callback();
        }

        // test mdn messages
        function testMdn( args ) {
            Y.log( 'Entering Y.doccirrus.api.lab.testMdn', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.testMdn' );
            }
            Y.doccirrus.kvconnect.service.ldt.sendFindingMDN( {
                user: args.user
            } );
        }

        /**
         *  Read LDT 2/3 data into simplified format for tables and reporting
         *  @param {module:activitySchema.activity} activity
         *  @param {module:patientSchema.patient} [patient]
         *
         *  @returns {Array}
         */
        function getLabEntries( activity, patient = {} ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getLabEntries' );
            let
                ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( activity ),
                l_extra = activity.l_extra || [],
                tempFindings,
                labEntries = [];

            if( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {
                if( 'object' === typeof l_extra ) {
                    //  reduce from all LDT entries to just findings
                    tempFindings = lablogSchema.getRecordTests( l_extra );

                    //  flatten finding objects and annotate
                    l_extra = {testId: tempFindings};
                }

                if( l_extra.testId && l_extra.testId.length ) {
                    labEntries = l_extra.testId.map( function( testResult ) {
                        let expandedResult = labdata.utils.unwrapFindingObjLdt3( testResult );
                        expandedResult = forms.labdata.expandSingleTestResultLdt3( l_extra, ldtVersion, expandedResult );
                        return expandedResult;
                    } );
                }
            } else {
                const backupOfTests = l_extra.testId || [];

                //  previous LDT version and legacy manual entries
                if( l_extra.sampleRequests && Array.isArray( l_extra.sampleRequests ) ) {
                    l_extra.testId = l_extra.sampleRequests;
                    l_extra.testId = l_extra.testId.concat( backupOfTests );
                }

                if( Array.isArray( l_extra ) ) {
                    tempFindings = labdata.utils.collapseLExtra( activity );

                    let patientGender;
                    switch( patient && patient.gender ) {
                        case 'MALE':
                            patientGender = 'M';
                            break;
                        case 'FEMALE':
                            patientGender = 'W';
                            break;
                        default:
                            //log
                            break;
                    }

                    l_extra = {
                        testId: tempFindings,
                        patientGender: patientGender
                    };
                }

                if( l_extra.testId && l_extra.testId.length ) {
                    labEntries = l_extra.testId.map( function( testResult ) {
                        let expandedResult = forms.labdata.expandSingleTestResult( l_extra, testResult );

                        //  should not happen that we do not have a date for a finding, check anyway MOJ-10521
                        if( !expandedResult.labReqReceived ) {
                            expandedResult.labReqReceived = activity.timestamp;
                        }

                        return expandedResult;
                    } );
                }
            }
            logExit( timer );
            return labEntries.filter( entry => entry );
        }

        /**
         *  Return MEDDATA as labentries for mixing in tables and charts (includes PERCENTILECURVE and potentially
         *  other future MEDDATA activity types)
         *  @param {module:activitySchema.activity} activity
         *  @return {Array}
         */
        function getMeddataAsLabEntries( activity ) {
            let
                medData = activity.medData || [],
                labEntries = [],
                medDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
                translateLabel,
                i;

            for( i = 0; i < medData.length; i++ ) {
                translateLabel = medData[i].type;

                if( medDataTypes[translateLabel] ) {
                    translateLabel = i18n( `v_meddata-schema.medDataTypes.${translateLabel}` );
                }

                labEntries.push( {
                    labTestResultText: medData[i].textValue || '',
                    labResultDisplay: ((medData[i].textValue && '' !== medData[i].textValue) ? 'qualitative' : 'quantitative'),
                    labHead: medData[i].type,
                    labTestLabel: translateLabel,
                    labReqReceived: activity.timestamp,
                    labTestNotes: '',
                    labFullText: activity.content,
                    isPathological: false,
                    previousVersions: 0,
                    labMin: '',
                    labMax: '',
                    labTestResultVal: medData[i].value,
                    labTestResultUnit: medData[i].unit || '',
                    labNormalText: ''
                } );
            }

            return labEntries;
        }

        /**
         *  Dev/support route to manually run migration to set labEntries on LABDATA activities
         *  (ie, simplified parse of LDT data)
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */
        function regenerateLabEntries( args ) {
            Y.log( 'Entering Y.doccirrus.api.lab.regenerateLabEntries', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.regenerateLabEntries' );
            }
            inCaseUtils.migrationhelper.updateLabEntries( args.user, true, false, onAllUpdated );

            function onAllUpdated( err ) {
                if( err ) {
                    Y.log( `Problem in regenerateLabEntries migration: ${JSON.stringify( err )}`, 'warn', NAME );
                }
                Y.log( 'Completed regeneration of labEntries for LABDATA activities.', 'info', NAME );
            }

            //  call back immediately, this is a slow process
            args.callback( null, {'status': 'Started migration to regenerate LABDATA labEntries'} );
        }

        /**
         *  Dev/support route to manually run migration to set labEntries from activities with medData
         *  (ie, simplified parse of LDT data)
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */
        function regenerateMeddataLabEntries( args ) {
            Y.log( 'Entering Y.doccirrus.api.lab.regenerateMeddataLabEntries', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.regenerateMeddataLabEntries' );
            }
            inCaseUtils.migrationhelper.updateMeddataLabEntries( args.user, true, false, onAllUpdated );

            function onAllUpdated( err ) {
                if( err ) {
                    Y.log( `Problem in regenerateMeddataLabEntries migration: ${JSON.stringify( err )}`, 'warn', NAME );
                }
                Y.log( 'Completed regenerateMeddataLabEntries of labEntries for activities with medData.', 'debug', NAME );
            }

            //  call back immediately, this is a slow process
            args.callback( null, {'status': 'Started migration to regenerate labEntries from medData'} );
        }

        async function submitHL7( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.submitHL7' );
            Y.log( 'Entering Y.doccirrus.api.lab.submitHL7', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.submitHL7' );
            }
            const {user, data: {HL7JSON, config}, ldtFile} = args;

            let ldt;

            try {
                if( Y.doccirrus.api.hl7.isMessageOfTypeLabDataAndTreatments( HL7JSON.MSH ) ) {
                    ldt = getLDTJSONandTreatmentsFromHL7JSON( {HL7JSON, config} );
                } else if( Y.doccirrus.api.hl7.isMessageOfTypeLabRequest( HL7JSON.MSH ) ) {
                    ldt = getLDTJSONForLabRequestFromHL7JSON( HL7JSON );
                }

                let [err, result] = await formatPromiseResult(
                    submitLDT( {
                        user: user,
                        callback: args.callback,
                        data: {
                            ...config,
                            u_extra: {
                                treatments: ldt && ldt.treatments
                            }
                        },
                        ldtFile: {
                            ...ldtFile,
                            ldtJson: ldt && ldt.ldt
                        }
                    } ) );

                if( err ) {
                    Y.log( `submitHL7: failed to submit parsed HL7 file ${err.stack || err} `, 'error', NAME );
                    return handleResult( err, null, args.callback );
                }

                logExit( timer );
                return handleResult( err, result, args.callback );

            } catch( err ) {
                Y.log( `submitHL7: failed to submit submitHL7 ${err.stack || err} `, 'error', NAME );
                logExit( timer );
                return handleResult( err, null, args.callback );

            }
        }

        function getLDTJSONandTreatmentsFromHL7JSON( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.getLDTJSONandTreatmentsFromHL7JSON' );
            const {
                HL7JSON,
                config
            } = args;

            let {MSH} = HL7JSON,
                treatments = [];

            let typeOfLab = Y.doccirrus.schemas.flow.types.InternalExternalLabTreatmentsMapping_E.default;
            if(
                config.internalExternalLabTreatments &&
                Array.isArray( config.internalExternalLabTreatments ) &&
                config.internalExternalLabTreatments.length
            ) {
                typeOfLab = (config.internalExternalLabTreatments.find(
                    configOption => configOption.labName === (MSH && MSH.sendingApplication && MSH.sendingApplication.namespaceID)
                ) || {}).type || Y.doccirrus.schemas.flow.types.InternalExternalLabTreatmentsMapping_E.default;
            }

            if( HL7JSON.error ) {
                Y.log( `HL7_JSONtoLDT_JSON: HL7JSON contains error ${HL7JSON.error}`, 'error', NAME );
                throw HL7JSON.error;
            }

            const NTE = (HL7JSON.patientResult.PATIENT.NTE || [])[0];

            if( isTreatmentNTE( NTE ) ) {
                treatments.push( {
                    catalogItem: NTE.comment
                } );
            }

            let ldt = {
                versionUsed: {
                    type: "ldt",
                    name: 'ldt20'// HL7JSON.MSH.versionID.versionID
                },
                records: [
                    {
                        recordType: "8220",
                        ldtVersion: "LDT1014.01",//HL7JSON.MSH.versionID.versionID,
                        bsnr: "",
                        bsnrDesc: `${MSH.sendingApplication.namespaceID || ""} ${MSH.sendingApplication.universalID || ""} ${MSH.sendingApplication.universalIDType || ""}`,
                        labName: (MSH && MSH.sendingApplication && MSH.sendingApplication.namespaceID) || '',
                        typeOfLab: typeOfLab,
                        encoding: MSH.characterSet,  // MSH-18
                        dateOfCreation: HL7JSON.dateOfCreation
                    }]
            };

            ldt.records = ldt.records.concat( getItems( HL7JSON ) );

            function getItems( HL7JSON ) {
                let timer = logEnter( 'getItems' );
                let records = [],
                    is8201Pushed = false,
                    HL7_TO_TestStatus = {
                        'D': 'K',
                        'C': 'K',
                        'X': 'F',
                        'R': 'F',
                        'I': 'F',
                        'O': 'F',
                        'F': 'K'
                    },
                    uniqueFindingKinds = new Set();
                HL7JSON.patientResult.ORDER_OBSERVATIONS.forEach( ( orderObservation ) => {
                    let testIds = orderObservation.observations.map( observation => {
                        if( !observation || !observation.OBX ) {
                            return {};
                        }

                        if( isTreatmentNTE( observation.NTE[0] ) ) {
                            treatments.push( observation.NTE[0] );
                        }

                        let testId = {};
                        if( !isNaN( observation.OBX.observationValue ) ) {
                            testId.testResultVal = observation.OBX.observationValue;
                        } else {
                            if( observation.OBX.observationValue ) {
                                //sanitize HL7 html br tags
                                testId.sampleResultText = observation.OBX.observationValue.replace( /(\\)(\.)*(\w)+(\\)/gm, '\\' ).split( '\\' ).filter( elem => elem );
                            }
                        }

                        uniqueFindingKinds.add( observation.OBX.observationResultStatus || '' );

                        //MOJ-14972
                        //lab sends unicode symbols in form of 2 hex values: e.g. \X00B5\ (micro symbol)
                        //this gets converted to the JavaScript unicode form -> \u00b5 (values after \u can either be lower or upper case)
                        //it strips the last backslash, if present, as well
                        let testResultUnit = (observation.OBX.units || {}).identifier || "";
                        const unicodeRegex = RegExp( /\\X\w{4}\\/, 'g' );
                        if( unicodeRegex.test( testResultUnit ) ) {
                            const matches = testResultUnit.match( unicodeRegex ) || [];
                            for( let i = 0; i < matches.length; i++ ) {
                                try {
                                    let tmp = matches[i].toLowerCase().replace( /x/, 'u' ).replace( /\\$/, '' );
                                    testResultUnit = testResultUnit.replace( matches[i], JSON.parse( `"${tmp}"` ) );
                                } catch( e ) {
                                    Y.log( `getLDTJSONandTreatmentsFromHL7JSON, getItems: could not construct unicode char from sequence: ${matches[i]}, err: ${e.stack | e}`, 'error', NAME );
                                }
                            }
                        }

                        return {
                            ...testId,
                            head: (observation.OBX.observationIdentifier || {}).identifier || "",
                            testLabel: (observation.OBX.observationIdentifier || {}).text,
                            TestResultUnit: testResultUnit,
                            sampleNormalValueText: observation.OBX.referencesRange ? observation.OBX.referencesRange.split( " " ) : [""],
                            testStatus: HL7_TO_TestStatus[observation.OBX.observationResultStatus] || "",
                            labName: (MSH && MSH.sendingApplication && MSH.sendingApplication.namespaceID) || ''
                        };
                    } );

                    orderObservation.ntes.map( observationNTE => {
                        if( isTreatmentNTE( observationNTE ) ) {
                            treatments.push( observationNTE );
                        }
                    } );

                    let findingKind = 'E';
                    if( uniqueFindingKinds.has( 'O' ) || uniqueFindingKinds.has( 'I' ) ) {
                        findingKind = 'T';
                    } else if( uniqueFindingKinds.has( 'F' ) ) {
                        findingKind = 'E';
                    }
                    if( is8201Pushed ) {//Push all patient observation into one record
                        records[records.length - 1].testId = records[records.length - 1].testId.concat( testIds );
                    } else {
                        records.push( {
                            recordType: "8201",  // constant
                            //recordRequestId: /*MSH.messageControlID*/,  // this is not our ID
                            labReqNo: HL7JSON.labReqNo,  // some kind of request Id
                            labReqReceived: HL7JSON.dateOfCreation, // when sample was
                            // received by lab
                            reportDate: orderObservation.obr.specimenReceivedDateTime,   // message date
                            patientDob: HL7JSON.dob,  // patient DOB
                            patientGender: HL7JSON.gender,  // Patient Gender  M male,  W female, X Unknown
                            patientForename: HL7JSON.firstname,
                            patientName: HL7JSON.lastname,
                            feeSchedule: '90',//EAL catalog
                            // generalList gathers the translated stati of all tests and we generate a
                            // general status for the whole file according to the precedence rule in generalStatuses.
                            // e.g. if there is any 'T' then status is in general 'T', etc.
                            findingKind: findingKind,
                            testId: testIds
                        } );

                        is8201Pushed = true;
                    }
                } );

                records.push( {
                    recordType: "8221"
                } );

                logExit( timer );
                return records;
            }

            function isTreatmentNTE( nte ) {
                return nte && nte.commentType && nte.commentType.identifier === "AI";
            }

            logExit( timer );
            return {
                ldt,
                treatments
            };
        }

        function getLDTJSONForLabRequestFromHL7JSON( HL7JSON ) {
            let {MSH} = HL7JSON,
                treatments = [];

            if( HL7JSON.error ) {
                Y.log( `getLDTJSONForLabRequestFromHL7JSON: HL7JSON contains error ${HL7JSON.error}`, 'error', NAME );
                throw HL7JSON.error;
            }

            let ldt = {
                versionUsed: {
                    type: "ldt",
                    name: 'ldt20'// HL7JSON.MSH.versionID.versionID
                },
                records: [
                    {
                        recordType: "8220",
                        ldtVersion: "LDT1014.01",//HL7JSON.MSH.versionID.versionID,
                        bsnr: "",
                        bsnrDesc: `${MSH.sendingApplication.namespaceID || ""} ${MSH.sendingApplication.universalID || ""} ${MSH.sendingApplication.universalIDType || ""}`,
                        encoding: MSH.characterSet,  // MSH-18
                        dateOfCreation: HL7JSON.dateOfCreation
                    }
                ]
            };

            ldt.records = ldt.records.concat( getItems( HL7JSON ) );

            function getItems( HL7JSON ) {
                let
                    records = [],
                    is8201Pushed = false,
                    tests = [];

                HL7JSON.ORDERS.forEach( ( orders ) => {
                    if( orders && orders.orderDetails && orders.orderDetails.universalServiceIdentifier ) {
                        tests.push( {
                            head: orders.orderDetails.universalServiceIdentifier.identifier,
                            testLabel: orders.orderDetails.universalServiceIdentifier.text
                        } );
                    }
                } );

                if( is8201Pushed ) {
                    records[records.length - 1].testId = records[records.length - 1].testId.concat( tests );
                } else {
                    records.push( {
                        recordType: "8218",
                        patientName: HL7JSON.lastname,
                        patientForename: HL7JSON.firstname,
                        patientDob: HL7JSON.dob,
                        patientGender: HL7JSON.gender,
                        feeSchedule: '90',
                        recordRequestId: HL7JSON.labReqNo,
                        labReqReceived: HL7JSON.dateOfCreation,
                        reportDate: HL7JSON.dateOfCreation,
                        ...(tests && Array.isArray( tests ) && tests.length) ? {testId: tests} : {}
                    } );
                    is8201Pushed = true;
                }

                records.push( {
                    recordType: "8221"
                } );

                return records;
            }

            return {
                ldt,
                treatments
            };
        }

        /**
         * debug logging function, so that we don't need to delete debug logging messages in this module
         * @method dbg
         * @param {String} functionName
         * @param {String} msg
         * @param {Object} [obj]
         */
        function dbg( functionName, msg, obj ) {
            const optional = obj ? `${util.inspect( obj )}` : '';
            const string = `${functionName}: ${msg}${optional}`;
            Y.log( string, 'debug', NAME );
        }

        function updateCaseFolder( caseFolderId ) {
            if( caseFolderId ) {
                Y.doccirrus.communication.emitEventForAll( {
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: caseFolderId
                    }
                } );
            }
        }

        /**
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {module:lablogSchema.lablog} args.labLog
         * @param {Object} args.cfg
         * @param {Boolean} [args.cfg.useDataFromLabrequestIfPresent]
         * @param {Boolean} [args.cfg.allowGkvBilling]
         * @param {Boolean} [args.cfg.hl7CreateTreatments]
         * @param {Object} args.savedLDTFile
         * @param {ObjectId} args.savedLDTFile.fileDatabaseId
         * @param {Object} args.metaData
         * @param {Object} [args.overrides]
         * @param {activityDetails} [args.overrides.detailsForLDTMatching]
         * @return {Promise<module:lablogSchema.lablog>}
         */
        async function processLabLog( args ) {
            let timer = logEnter( 'Y.doccirrus.api.lab.processLabLog' );
            let {
                labLog,
                cfg,
                cfg: {
                    useDataFromLabrequestIfPresent = false,
                    allowGkvBilling = false,
                    hl7CreateTreatments = true
                } = {},
                savedLDTFile,
                user,
                metaData,
                overrides: {
                    detailsForLDTMatching,
                    detailsForLDTMatching: {
                        employeeIdForPatient
                    } = {}
                } = {}
            } = args;

            if( labLog.sourceFileType && (labLog.sourceFileType === 'HL7' && !hl7CreateTreatments) ) {
                logExit( timer );
                return labLog;
            }

            //MOJ-12689
            //update ldt tests with labName
            const recordId = labLog.l_data.records.length > 3 ? 2 : 1;
            if( labLog.l_data.records[recordId] && labLog.l_data.records[recordId].testId && Array.isArray( labLog.l_data.records[recordId].testId ) && labLog.l_data.records[recordId].testId.length ) {
                for( let i = 0; i < labLog.l_data.records[recordId].testId.length; i++ ) {
                    labLog.l_data.records[recordId].testId[i].labName = metaData.labName;
                }
            }

            let [err, matchMethod] = await formatPromiseResult(
                findMatchMethod( {
                    cfg: cfg,
                    ldtJson: labLog.l_data
                } )
            );

            if( err ) {
                Y.log( `processLabLog: findMatchMethod err: ${err.stack || err}`, 'warn', NAME );
                labLog.errs.push( err );
            }

            if( matchMethod ) {
                if( !detailsForLDTMatching ) {
                    [err, detailsForLDTMatching] = await formatPromiseResult(
                        getDetailsForLDTMatching( {
                            assignmentField: matchMethod.assignmentField,
                            assignmentValue: matchMethod.assignmentValue,
                            cfg: cfg,
                            matchMethod: matchMethod,
                            ldtJson: labLog.l_data,
                            patientDob: matchMethod.patientDob,
                            patientFirstname: matchMethod.patientFirstname,
                            patientInsuranceId: matchMethod.patientInsuranceId,
                            patientInsuranceNo: matchMethod.patientInsuranceNo,
                            patientName: matchMethod.patientName,
                            user: user
                        } )
                    );

                    if( err ) {
                        Y.log( `processLabLog: getDetailsForLDTMatching - err: ${err.stack || err}`, 'warn', NAME );
                        labLog.errs.push( err );
                    }
                }

                //file
                let locationId = matchMethod.locationIdFromLDT;
                //LABREQUEST
                if( useDataFromLabrequestIfPresent ) {
                    let [err, lastLabRequest] = await formatPromiseResult(
                        getLabRequest( {
                            caseFolderId: detailsForLDTMatching.caseFolderId,
                            labRequestId: (matchMethod.assignmentField === recordRequestField || matchMethod.assignmentField === labRequestField) ? matchMethod.assignmentValue : undefined,
                            patientId: detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString(),
                            user: user
                        } )
                    );
                    if( err ) {
                        Y.log( `processLabLog: could not get last labrequest activity, err: ${err.stack || err}`, 'info', NAME );
                    }
                    if( lastLabRequest && lastLabRequest.length ) {
                        locationId = lastLabRequest[0].locationId;
                        employeeIdForPatient = lastLabRequest[0].employeeId;
                    } else {
                        Y.log( `processLabLog: placing activities into InBox`, 'info', NAME );
                        let [err, inBoxCaseFolderId] = await formatPromiseResult(
                            Y.doccirrus.api.casefolder.getInBoxCaseFolderId( {
                                user: user,
                                data: {
                                    patientId: detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString()
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `processLabLog: could not get inbox casefolder for patient: ${detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString()}, err: ${err.stack || err}`, 'warn', NAME );
                            labLog.errs.push( err );
                        } else if( inBoxCaseFolderId ) {
                            detailsForLDTMatching.caseFolderId = inBoxCaseFolderId;
                        }
                    }
                }
                if( !locationId ) {
                    Y.log( `processLabLog: LDT File has no LocationId`, 'info', NAME );
                    //schein
                    let query = {
                        patientId: detailsForLDTMatching.patient && detailsForLDTMatching.patient._id.toString(),
                        timestamp: new Date()
                    };

                    let options = {};
                    if( detailsForLDTMatching.caseFolderId ) {
                        query.caseFolderId = detailsForLDTMatching.caseFolderId;
                    } else {
                        options.doNotQueryCaseFolder = true;
                    }

                    const [err, schein] = await formatPromiseResult(
                        getLastScheinPromise( {
                            user: user,
                            query: query,
                            options: options
                        } )
                    );

                    if( err ) {
                        Y.log( `processLabLog: could not get last schein, err: ${err.stack || err}`, 'warn', NAME );
                        labLog.errs.push( err );
                    } else if( schein && schein.length > 0 ) {
                        locationId = schein[0].locationId && schein[0].locationId.toString();
                        Y.log( `processLabLog: Patient has a Schein with LocationId: ${locationId}`, 'info', NAME );
                    }
                    if( !locationId ) {
                        Y.log( `processLabLog: Didnt find a Schein for Patient: ${query.patientId}`, 'warn', NAME );
                        let [err, insurance] = await formatPromiseResult(
                            getInsuranceForPatient( {
                                caseFolderId: detailsForLDTMatching.caseFolderId,
                                patientId: detailsForLDTMatching.patient && detailsForLDTMatching.patient._id.toString(),
                                user: user
                            } )
                        );
                        if( err ) {
                            Y.log( `processLabLog: could not get insurance for patient, err: ${err.stack || err}`, 'warn', NAME );
                        } else if( insurance ) {
                            locationId = insurance.locationId;
                        }
                        locationId = locationId || detailsForLDTMatching.locationId;
                        if( !locationId ) {
                            locationId = Y.doccirrus.schemas.location.getMainLocationId();
                            Y.log( `processLabLog: Setting LocationId to main LocationId: ${locationId}`, 'info', NAME );
                        }
                    }
                } else {
                    Y.log( `processLabLog: LDT File has a LocationId: ${locationId}`, 'info', NAME );
                }

                if( !employeeIdForPatient ) {
                    [err, employeeIdForPatient] = await formatPromiseResult(
                        getEmployeeIdForPatient( {
                            caseFolderId: detailsForLDTMatching.caseFolderId,
                            labRequestId: (matchMethod.assignmentField === recordRequestField || matchMethod.assignmentField === labRequestField) ? matchMethod.assignmentValue : undefined,
                            patientId: detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString(),
                            timestamp: matchMethod.timestamp,
                            user: user
                        } )
                    );
                    if( err ) {
                        Y.log( `processLabLog: getEmployeeIdForPatient err: ${err.stack || err}`, 'warn', NAME );
                        labLog.errs.push( err );
                    }
                }

                labLog.configuration.assignment.assignmentField = (detailsForLDTMatching || matchMethod || {}).assignmentField;
                labLog.configuration.assignment.assignmentValue = (detailsForLDTMatching || matchMethod || {}).assignmentValue;
                labLog.assignedPatient.patientId = detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString();
                labLog.assignedPatient.patientName = Y.doccirrus.schemas.person.personDisplay( detailsForLDTMatching.patient );
                labLog.description = getDescriptionFromRecord( {
                    assignmentField: labLog.configuration.assignment.assignmentField,
                    assignmentValue: labLog.configuration.assignment.assignmentValue
                } );

                let initialActivityData;
                [err, initialActivityData] = await formatPromiseResult(
                    getInitialActivityData( {
                        caseFolderId: detailsForLDTMatching.caseFolderId,
                        dbData: labLog,
                        employeeId: employeeIdForPatient || detailsForLDTMatching.employeeId,
                        labName: metaData.labName,
                        ldtJson: labLog.l_data,
                        locationId: locationId,
                        timestamp: matchMethod.timestamp
                    } )
                );

                if( err ) {
                    Y.log( `processLabLog: getInitialActivityData, err: ${err.stack || err}`, 'warn', NAME );
                    logExit( timer );
                    throw err;
                }

                let verifiedActivityData;
                [err, verifiedActivityData] = await formatPromiseResult(
                    getVerifiedActivityData( {
                        activityData: initialActivityData,
                        user: user
                    } )
                );
                if( err ) {
                    Y.log( `processLabLog: getVerifiedActivityData, err: ${err.stack || err}`, 'warn', NAME );
                    logExit( timer );
                    throw err;
                }

                let postedActivity;
                [err, postedActivity] = await formatPromiseResult(
                    postActivity( {
                        activityData: verifiedActivityData.activityData,
                        user: user
                    } )
                );

                if( err ) {
                    Y.log( `processLabLog: postActivity, err: ${err.stack || err}`, 'warn', NAME );
                    labLog.errs.push( err );
                } else if( postedActivity ) {
                    dbg( 'submitLDT', `created activity, id: ${postedActivity} , data: ${util.inspect( verifiedActivityData.activityData )}` );
                    labLog.linkedActivities.splice( 0, 0, postedActivity );
                    if( verifiedActivityData.mergingIsRequired ) {
                        const [err, labLogsWithOldActivityId] = await formatPromiseResult(
                            runDb( {
                                user: user,
                                model: 'lablog',
                                action: 'get',
                                query: {
                                    linkedActivities: verifiedActivityData.previousLabdata._id
                                },
                                options: {
                                    lean: true
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `processLabLog: could not get old labLogs, err: ${err.stack || err}`, 'warn', NAME );
                        }
                        if( labLogsWithOldActivityId && labLogsWithOldActivityId.length > 0 ) {
                            for( let labLogWithOldActivityId of labLogsWithOldActivityId ) {
                                if( labLogWithOldActivityId.linkedActivities && Array.isArray( labLogWithOldActivityId.linkedActivities ) && labLogWithOldActivityId.linkedActivities.length > 0 ) {
                                    labLogWithOldActivityId.linkedActivities.splice( labLogWithOldActivityId.linkedActivities.indexOf( verifiedActivityData.previousLabdata._id ), 1 );
                                    labLogWithOldActivityId.linkedActivities.splice( 0, 0, postedActivity );
                                }

                                const [err] = await formatPromiseResult(
                                    runDb( {
                                        user: user,
                                        model: 'lablog',
                                        action: 'update',
                                        query: {
                                            _id: labLogWithOldActivityId._id && labLogWithOldActivityId._id.toString()
                                        },
                                        data: labLogWithOldActivityId
                                    } )
                                );
                                if( err ) {
                                    Y.log( `processLabLog: could not update old labLogs, err: ${err.stack || err}`, 'warn', NAME );
                                }
                            }
                        }
                    }
                }

                let caseFolderFromPatient;
                if( labLog.configuration.pre.disallowGkvBilling ) {
                    [err, caseFolderFromPatient] = await formatPromiseResult(
                        getCaseFolderById( {
                            caseFolderId: detailsForLDTMatching && detailsForLDTMatching.caseFolderId,
                            user: user
                        } )
                    );
                    if( err ) {
                        Y.log( `could not get caseFolderById, err: ${err.stack || err}`, 'warn', NAME );
                        labLog.errs.push( err );
                    } else if( !caseFolderFromPatient || caseFolderFromPatient.length === 0 ) {
                        Y.log( `could not find caseFolderById with id: ${detailsForLDTMatching && detailsForLDTMatching.caseFolderId}`, 'warn', NAME );
                    } else {
                        caseFolderFromPatient = caseFolderFromPatient[0];
                    }
                }
                if( labLog.configuration.pre.disallowGkvBilling && caseFolderFromPatient && caseFolderFromPatient.type === 'PUBLIC' ) {
                    Y.log( 'processLabLog: skipping creation of tests, because disallowGkvBilling is set', 'info', NAME );
                } else if( labLog.configuration.pre.billingFlag ) {
                    dbg( 'submitLDT', 'creating billing data...' );
                    const
                        record = labLog.l_data && labLog.l_data.records && labLog.l_data.records.length && labLog.l_data.records[labLog.l_data.records.length > 3 ? 2 : 1],
                        areTreatmentDiagnosesBillable = ('K' === lablogSchema.getRecordBillingType( record ) && !allowGkvBilling) ? '0' : '1';

                    let
                        tests = lablogSchema.getRecordTests( record ),
                        tmpFeeSchedule = lablogSchema.getRecordFeeSchedule( record ),
                        feeSchedule = tmpFeeSchedule && feeScheduleMap[tmpFeeSchedule],
                        catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                            actType: 'TREATMENT',
                            short: feeSchedule
                        } ),
                        lib = {};

                    //Filtering of already existing Treatments from LDT
                    if( !lablogSchema.isRequest( record ) && tests && tests.length > 0 ) {
                        if( labLog.l_data.versionUsed.name && labLog.l_data.versionUsed.name.startsWith( 'ldt3' ) ) {
                            dbg( 'submitLDT', `got feeSchedule?: ${feeSchedule}` );
                            dbg( 'submitLDT', `got catalogDescriptor?: ${util.inspect( catalogDescriptor )}` );
                            let l_requestId = lablogSchema.getRecordRequestId( record );

                            if( l_requestId ) {
                                runDb( {
                                    user: user,
                                    model: 'lablog',
                                    action: 'get',
                                    query: {
                                        'l_data.records.recordRequestId': l_requestId,
                                        _id: {$ne: savedLDTFile.fileDatabaseId}
                                    },
                                    options: {
                                        lean: true
                                    },
                                    callback: function( err, res ) {
                                        if( err ) {
                                            Y.log( `processLabLog: error while checking for existing lablog ${err}`, 'warn', NAME );
                                        }
                                        if( res ) {
                                            res.forEach( ( {labData, flags} ) => {
                                                if( labData.records ) {
                                                    labData.records.forEach( ( record, i ) => {
                                                        let curTests = lablogSchema.getRecordTests( record );
                                                        let r_requestId = lablogSchema.getRecordRequestId( record );
                                                        if( curTests && r_requestId === l_requestId && 'NOMATCH' !== flags[i] ) {
                                                            curTests.forEach( test => {
                                                                let testId = lablogSchema.getTestId( test );
                                                                if( testId ) {
                                                                    lib[testId] = test;
                                                                }
                                                            } );
                                                        }
                                                    } );
                                                }
                                            } );
                                        }
                                    }
                                } );
                            }
                        } else {
                            if( labLog.sourceFileType !== 'HL7' ) {
                                if( verifiedActivityData.mergingIsRequired && verifiedActivityData.previousLabdata ) {
                                    let allLabDataTests = [];
                                    if( Array.isArray( verifiedActivityData.previousLabdata.l_extra ) ) {
                                        for( let i = 0; i < verifiedActivityData.previousLabdata.l_extra.length; i++ ) {
                                            allLabDataTests = allLabDataTests.concat( lablogSchema.getRecordTests( verifiedActivityData.previousLabdata.l_extra[i] ) );
                                        }
                                    } else {
                                        allLabDataTests = allLabDataTests.concat( lablogSchema.getRecordTests( verifiedActivityData.previousLabdata.l_extra ) );
                                    }
                                    const newTests = tests.filter( test => !allLabDataTests.find( aTest => aTest && aTest.head === lablogSchema.getTestId( test ) ) );
                                    tests = tests && Array.isArray( tests ) && tests.filter( test => allLabDataTests.find( aTest => aTest && aTest.head === lablogSchema.getTestId( test ) && JSON.stringify( aTest.gnr ) !== JSON.stringify( lablogSchema.getTestGnr( test ) ) ) );
                                    tests = tests.concat( newTests );
                                }
                            }
                        }
                    } else {
                        dbg( 'submitLDT', 'no tests...' );
                    }

                    if( tests || labLog.sourceFileType === 'HL7' ) {
                        let
                            treatmentsToCreate = [],
                            labReqId;

                        if( matchMethod.assignmentField === recordRequestField ) {
                            labReqId = matchMethod.recordRequestId;
                        } else if( matchMethod.assignmentField === labRequestField ) {
                            labReqId = matchMethod.labReqId;
                        }

                        if( labLog.sourceFileType === 'HL7' ) {
                            //Filtering of already existing Treatments from Hl7
                            let treatments;
                            if( verifiedActivityData.mergingIsRequired && verifiedActivityData.previousLabdata ) {
                                treatments = verifiedActivityData.activityData.u_extra.treatments.filter( supposedlyNewTreatment => !verifiedActivityData.previousLabdata.u_extra.treatments.find( alreadyExistingTreatments => alreadyExistingTreatments.comment === supposedlyNewTreatment.comment ) );
                            } else {
                                treatments = verifiedActivityData.activityData.u_extra.treatments;
                            }

                            let billable = '1';
                            switch( metaData && metaData.typeOfLab ) {
                                case 'internal':
                                    billable = '1';
                                    break;
                                case 'external':
                                    billable = '0';
                                    break;
                            }

                            let activityDataFromTreatment;

                            for( let treatment of treatments ) {
                                [err, activityDataFromTreatment] = await formatPromiseResult(
                                    evaluateTreatment( {
                                        billable: billable,
                                        caseFolderId: detailsForLDTMatching.caseFolderId,
                                        catalogDescriptor: catalogDescriptor,
                                        employeeId: employeeIdForPatient || detailsForLDTMatching.employeeId,
                                        factor: 2,
                                        feeSchedule: feeSchedule,
                                        gnr: treatment.comment,
                                        labReqId: labReqId,
                                        locationId: locationId,
                                        patientId: detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString(),
                                        test: {},
                                        timestamp: matchMethod.timestamp,
                                        user: user
                                    } )
                                );

                                if( activityDataFromTreatment ) {
                                    treatmentsToCreate.push( activityDataFromTreatment );
                                }
                            }
                        } else {
                            for( let test of tests ) {
                                dbg( 'submitLDT', `trying to create data for ${util.inspect( test, {depth: 10} )}` );
                                let recGnr = lablogSchema.getTestGnr( test ) || [];
                                dbg( 'submitLDT', `creating ${recGnr.length} treatments...` );
                                let [err, treatments] = await formatPromiseResult(
                                    getAllTreatmentsFromTest( {
                                        areTreatmentDiagnosesBillable: areTreatmentDiagnosesBillable,
                                        catalogDescriptor: catalogDescriptor,
                                        feeSchedule: feeSchedule,
                                        recGnr: recGnr,
                                        test: test,
                                        version: labLog.l_data.versionUsed.name
                                    } )
                                );
                                if( err ) {
                                    Y.log( `processLabLog: tests, err: ${err.stack || err}`, 'warn', NAME );
                                }

                                if( treatments && treatments.length ) {
                                    for( let i = 0; i < treatments.length; i++ ) {
                                        if( !treatments[i] ) {
                                            Y.log( `processLabLog: malformed treatment... continue`, 'info', NAME );
                                            continue;
                                        }

                                        let activityDataFromTreatment;
                                        [err, activityDataFromTreatment] = await formatPromiseResult(
                                            evaluateTreatment( {
                                                billable: treatments[i].billable,
                                                caseFolderId: detailsForLDTMatching.caseFolderId,
                                                catalogDescriptor: treatments[i].catalogDescriptor,
                                                cost: treatments[i].cost,
                                                employeeId: employeeIdForPatient || detailsForLDTMatching.employeeId,
                                                factor: treatments[i].factor,
                                                feeSchedule: lablogSchema.getTestFeeSchedule( treatments[i] ),
                                                gnr: lablogSchema.getTestGnr( treatments[i] ),
                                                labReqId: labReqId,
                                                locationId: locationId,
                                                patientId: detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString(),
                                                test: treatments[i].test,
                                                timestamp: matchMethod.timestamp,
                                                user: user
                                            } )
                                        );

                                        if( err ) {
                                            Y.log( `processLabLog: treatment, err: ${err.stack || err}`, 'warn', NAME );
                                            continue;
                                        }

                                        if( activityDataFromTreatment ) {
                                            treatmentsToCreate.push( activityDataFromTreatment );
                                        }
                                    }
                                }
                            }
                        }

                        if( treatmentsToCreate.length > 0 ) {
                            let treatmentsToCreatePromises = [];
                            for( let i = 0; i < treatmentsToCreate.length; i++ ) {
                                treatmentsToCreatePromises.push(
                                    postActivity( {
                                        activityData: treatmentsToCreate[i],
                                        user: user
                                    } )
                                );
                            }

                            let [err, postedActivities] = await formatPromiseResult(
                                Promise.all( treatmentsToCreatePromises )
                            );

                            if( err ) {
                                Y.log( `processLabLog: failed to save treatments ${err.stack || err}`, 'warn', NAME );
                                labLog.errs.push( err );
                                [err, postedActivities] = await formatPromiseResult(
                                    _pushTreatmentsToInBoxCaseFolder( user, detailsForLDTMatching.patient && detailsForLDTMatching.patient._id && detailsForLDTMatching.patient._id.toString(), treatmentsToCreate )
                                );
                                if( err ) {
                                    Y.log( `processLabLog: failed to save treatments ${err.stack || err}`, 'warn', NAME );
                                    labLog.errs.push( err.data || err );
                                    postedActivities = [];
                                }
                            }
                            if( postedActivities && postedActivities.length ) {
                                for( let activity of postedActivities ) {
                                    if( activity && activity.toString() ) {
                                        labLog.linkedActivities.push( activity.toString() );
                                    }
                                }
                            }
                            if( tests && tests.length ) {
                                Y.log( `processed ${treatmentsToCreate && treatmentsToCreate.length}/${tests.length} LDT entries for Leistungen.`, 'info', NAME );
                            }
                        }
                    }
                }
                if( postedActivity ) {
                    let caseFolderId = detailsForLDTMatching.caseFolderId || verifiedActivityData.activityData.caseFolderId;
                    updateCaseFolder( caseFolderId );
                }
            }

            logExit( timer );
            return labLog;
        }

        /**
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} [args.data]
         * @param {Boolean} [args.data.immediateResponse]
         * @param {Function} [args.callback]
         * @return {Promise<triggerLabLogResponse>}
         */
        async function triggerLabProcess( args ) {
            const timer = logEnter( "Y.doccirrus.api.lab.triggerLabProcess" );
            const {
                user,
                data: {
                    immediateResponse = false
                } = {}
            } = args;
            let {
                callback
            } = args;
            let newlyAssigned = 0;

            const labLogUser = Y.doccirrus.auth.getSUForLocal();

            if( callback && typeof callback === "function" ) {
                if( immediateResponse ) {
                    callback();
                }

                callback = function finalResponse( err, success ) {
                    logExit( timer );
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: EVENTS.triggerLabProcessEvent,
                        msg: {
                            data: {
                                result: success,
                                error: (err && err.message) || err
                            }
                        }
                    } );
                };
            }

            let [err, allUnassignedLabLogs] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'lablog',
                    query: {
                        "linkedActivities.0": {$exists: false}
                    },
                    options: {
                        sort: {
                            timestamp: 1
                        }
                    }
                } )
            );

            if( err ) {
                return handleResult( err, undefined, callback );
            }
            if( !allUnassignedLabLogs || !Array.isArray( allUnassignedLabLogs ) ) {
                return handleResult( 'DB error', undefined, callback );
            }
            if( !allUnassignedLabLogs.length ) {
                return handleResult( undefined, {
                    unassignedEntries: allUnassignedLabLogs.length,
                    newlyAssigned: newlyAssigned
                }, callback );
            }

            for( let i = 0; i < allUnassignedLabLogs.length; i++ ) {
                let [err, metaData] = await formatPromiseResult(
                    getMetaData( {
                        ldtJson: allUnassignedLabLogs[i].l_data
                    } )
                );
                if( err ) {
                    return handleResult( err, undefined, callback );
                }

                let processedLabLog;
                [err, processedLabLog] = await formatPromiseResult(
                    processLabLog( {
                        user: labLogUser,
                        labLog: allUnassignedLabLogs[i],
                        cfg: allUnassignedLabLogs[i].configuration.pre,
                        metaData: metaData,
                        savedLDTFile: {
                            fileDatabaseId: allUnassignedLabLogs[i].fileDatabaseId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `triggerLabProcess: error processing labLog with id ${allUnassignedLabLogs[i]._id.toString()}: ${err.stack || err}`, 'warn', NAME );
                }
                if( processedLabLog && processedLabLog.assignedPatient && processedLabLog.assignedPatient.patientId ) {
                    newlyAssigned++;
                    processedLabLog.timestamp = new Date();

                    //update lablog entries
                    [err] = await formatPromiseResult(
                        updateLabLogs( {
                            dbData: processedLabLog,
                            user: user
                        } )
                    );
                    if( err ) {
                        return handleResult( err, undefined, callback );
                    }
                }
            }

            return handleResult( undefined, {
                unassignedEntries: allUnassignedLabLogs.length,
                newlyAssigned: newlyAssigned
            }, callback );
        }

        Y.namespace( 'doccirrus.api' ).lab = {

            name: NAME,

            checkAndCreateMissingTreatmentsFromLabdata,
            regenerateAllLabEntries,
            assignLabLog,
            assignOldLabLog,
            revertLabLog,
            submitLDT,
            getStringified,
            kvcTriggerFindings,
            processKvcLdtFindingMessage,
            testMdn,
            getLabEntries,
            getMeddataAsLabEntries,
            regenerateLabEntries,
            regenerateMeddataLabEntries,
            getCatalog,
            evaluateTreatment,
            getNewestScheinFromPatientMatchingFeeSchedule,
            setAndGetTreatmentData,
            createActivityDataFromTreatment,
            getAllTreatmentsFromTest,
            getTreatmentFromTest,
            getVerifiedActivityData,
            getInitialActivityData,
            getInitialLabLogDataFromLDT,
            getRecordTypeFromLDT,
            redundancyCheck,
            findMatchMethod,
            getPatientsFromPatientIds,
            findCaseFolderForPatient,
            findNewestCaseFolderForPatient,
            getDetailsForLDTMatching,
            getInitialPatientLabLogDataFromLabLogEntries,
            getMetaData,
            checkLabLogForDuplicateImport,
            parseLDTFile,
            writeInitialLabLogs,
            submitHL7,
            getLDTJSONandTreatmentsFromHL7JSON,

            getDescriptionFromRecord: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.lab.getDescriptionFromRecord', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `../../../server/utils/logWrapping` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.lab.getDescriptionFromRecord' );
                }
                getDescriptionFromRecord( args );
            },
            triggerLabProcess
        };

    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'dcerror',
            'activity-schema',
            'lablog',
            'activity-api',
            'inport-schema',
            'lablog-schema',
            'lab-utils',
            'kvconnect-service-ldt',
            'dccommonerrors',
            'settings-api',
            'xdtParser',
            'xdtTools'
        ]
    }
);
