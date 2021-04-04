/**
 * User: pi
 * Date: 26/08/2015  16:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'flow_transformers', function( Y, NAME ) {
        /**
         * @module flow_transformers
         */

        const
            util = require( 'util' ),
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            XRegExp = require( 'xregexp' ),
            path = require( 'path' ),
            moment = require( 'moment' ),
            i18n = Y.doccirrus.i18n,
            flowlog = Y.doccirrus.api.flowlog,
            TIMESTAMP_FORMAT_DOQUVIDE = i18n( 'general.TIMESTAMP_FORMAT_DOQUVIDE' );

        /**
         * HELPERS
         */

        const traTypes = Y.doccirrus.schemas.flow.transformerTypes;

        function i18nComponent( compName ) {
            return i18n( `flow-schema.TransformerType_E.${compName}.i18n` );
        }

        function i18nErrorMessage( message, data ) {
            return i18n( `flowlog-api.errMessages.${message}`, data ? {data} : undefined );
        }

        function error( msg, cb ) {
            Y.log( msg, 'warn', NAME );
            cb( Y.doccirrus.errors.rest( 400, msg, true ) );
        }

        const regexChunks = {
            patientNumber: "(?<patientNumber>.+?)",
            lastname: "(?<lastname>.+?)",
            firstname: "(?<firstname>.+?)",
            dobDD: "(?<dobDD>[0-9]{2})",
            dobMM: "(?<dobMM>[0-9]{2})",
            dobYYYY: "(?<dobYYYY>[0-9]{4})",
            docYYYY: "(?<docYYYY>[0-9]{4})",
            docMM: "(?<docMM>[0-9]{2})",
            docDD: "(?<docDD>[0-9]{2})",
            docHH: "(?<docHH>[0-9]{2})",
            docmm: "(?<docmm>[0-9]{2})",
            docss: "(?<docss>[0-9]{2})",
            counter: "(?<counter>[0-9]+)",
            extension: "(?<extension>pdf|png|jpg|jpeg|avi|PDF|PNG|JPG|JPEG|AVI)",
            ignore123: "(?:\\d+)",
            ignoreABC: "(?:\\D+)",
            ignoreAny: "(?:.+?)"
        };

        function getPatientQuery( fileNameData ) {
            let query = {};
            if( fileNameData.patientNumber ) {
                let patId = fileNameData.patientNumber;
                let patIdParsed = parseInt( patId, 10 );
                if( isNaN( patIdParsed ) || 0 === patIdParsed ) {
                    patId = {patientNo: patId};
                } else {
                    patId = {$or: [{patientNumber: patIdParsed}, {patientNo: patId}]};
                }

                query = patId;
            } else if( fileNameData.firstname && fileNameData.lastname && fileNameData.dobDD && fileNameData.dobMM && fileNameData.dobYYYY ) {
                let kbvDob = `${fileNameData.dobDD}.${fileNameData.dobMM}.${fileNameData.dobYYYY}`;
                query = Y.doccirrus.api.patient.getNameDobUmlQuery( fileNameData.firstname, fileNameData.lastname, kbvDob );
            }
            return query;
        }

        function getDateOfCreationString( fileNameData ) {
            let doc = "";
            if( fileNameData.docYYYY && fileNameData.docMM && fileNameData.docDD ) {
                doc += `${fileNameData.docDD}.${fileNameData.docMM}.${fileNameData.docYYYY}`;
            }
            if( fileNameData.docHH && fileNameData.docmm && fileNameData.docss ) {
                doc += `${(doc && " ") + fileNameData.docHH}:${fileNameData.docmm}`;
                if( fileNameData.docss ) {
                    doc += `:${fileNameData.docss}`;
                }
            }
            return doc;
        }

        function getDateOfCreation( fileNameData ) {
            const dateStr = getDateOfCreationString( fileNameData );
            if( dateStr && dateStr.length >= 10 ) { //prioritizes date
                return moment( dateStr, TIMESTAMP_FORMAT_DOQUVIDE );
            } else {
                return null;
            }
        }

        async function checkAndCreateGdtExportLog( args ) {
            const
                {user, data} = args,
                {flow, patient, activity, buffer, transformer} = data;

            if( flow &&
                flow.flowType === "GDT" &&
                flow.sources &&
                flow.sources[0] &&
                flow.sources[0].resourceType === "DATABASE" &&
                transformer &&
                (transformer.transformerType === "GDTVIEW" || transformer.transformerType === "GDTSTUDY" || transformer.transformerType === "GDTPATIENT")
            ) {
                await formatPromiseResult(
                    Y.doccirrus.api.gdtexportlog.checkAndCreate( {
                        user,
                        data: {
                            buffer,
                            flowTitle: flow.title,
                            patient,
                            activity,
                            transformerType: transformer.transformerType
                        }
                    } )
                );
            }
        }

        /**
         * @method crc10
         * @public
         *
         * recursive module 10 crc calculation
         *
         * @param {String} str - input string that contains only numbers [0-1]
         *
         * @returns {Number} CRC value 1 digit (-1 if format of input string is wrong)
         */
        function crc10( str ) {
            if( !(/^\d+$/.test( str )) ) {
                return -1;
            }

            let table = [
                [0, 9, 4, 6, 8, 2, 7, 1, 3, 5, 0],
                [9, 4, 6, 8, 2, 7, 1, 3, 5, 0, 9],
                [4, 6, 8, 2, 7, 1, 3, 5, 0, 9, 8],
                [6, 8, 2, 7, 1, 3, 5, 0, 9, 4, 7],
                [8, 2, 7, 1, 3, 5, 0, 9, 4, 6, 6],
                [2, 7, 1, 3, 5, 0, 9, 4, 6, 8, 5],
                [7, 1, 3, 5, 0, 9, 4, 6, 8, 2, 4],
                [1, 3, 5, 0, 9, 4, 6, 8, 2, 7, 3],
                [3, 5, 0, 9, 4, 6, 8, 2, 7, 1, 2],
                [5, 0, 9, 4, 6, 8, 2, 7, 1, 3, 1]
            ];

            let carryOver = 0;
            for( let i = 0; i < str.length; i++ ) {
                let val = parseInt( str[i], 10 );
                carryOver = table[carryOver][val];
            }
            return table[carryOver][10];
        }

        /**
         * TRANSFORMERS
         */

        /* structure of flow config input:
         {
             _id,
             title, //flow name
             flowType,
             sinks: [],
             transformers: [],
             sources: [],
             __v: 22
         }
         */

        let flow_transformers = {
            name: NAME,

            extractDataWithRegexForFlows: async function extractDataWithRegexForFlows( args ) {
                const {
                    regexChnks,
                    input,
                    title,
                    user,
                    ignoreBeginningAndEnd
                } = args;

                let {
                    regexString,
                    component
                } = args;

                let
                    fileRegex,
                    fileNameData;
                if( !ignoreBeginningAndEnd ) {
                    regexString = `^${regexString}$`;
                }
                if( !component ) {
                    component = 'MEDIA_IMPORT';
                }
                Object.keys( regexChnks ).forEach( regexTemplate => {
                    regexString = regexString.replace( new RegExp( `{${regexTemplate}}`, 'g' ), regexChnks[regexTemplate] );
                } );

                Y.log( `extractDataWithRegexForFlows: fileRegex String = ${regexString}`, 'info', NAME );

                let unidentifiedTags = [];
                const reg = /{(\D.*?)}/g;
                let match = reg.exec( regexString );
                while( match !== null ) {
                    unidentifiedTags.push( match[1] );
                    match = reg.exec( regexString );
                }

                if( unidentifiedTags.length > 0 ) {
                    flowlog.log( title, i18nComponent( traTypes[component] ), `${i18nErrorMessage( 'invalidTags', {unidentifiedTags} )}`, user );
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: i18nErrorMessage( 'invalidTags', {unidentifiedTags} )} );
                }

                try {
                    fileRegex = new XRegExp( regexString, 'gx' );
                    Y.log( `extractDataWithRegexForFlows: fileRegex Build = ${fileRegex}`, 'info', NAME );
                } catch( e ) {
                    flowlog.log( title, i18nComponent( [component] ), `${i18nErrorMessage( 'invalidRegex' )}`, user );
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid regex.'} );
                }

                try {
                    fileNameData = XRegExp.exec( input, fileRegex );
                } catch( e ) {
                    flowlog.log( title, i18nComponent( [component] ), `${i18nErrorMessage( 'invalidRegex' )}`, user );
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid regex.'} );
                }

                if( !fileNameData ) {
                    if( component === 'MEDIA_IMPORT' ) {
                        flowlog.log( title, i18nComponent( [component] ), `${i18nErrorMessage( 'regexMismatch', {fileName: input} )}`, user );
                        throw new Y.doccirrus.commonerrors.DCError( 400, {message: `${i18nErrorMessage( 'regexMismatch', {fileName: input} )}`} );
                    } else {
                        flowlog.log( title, i18nComponent( [component] ), `${i18nErrorMessage( 'noResultSet', {fileName: input} )}`, user );
                        throw new Y.doccirrus.commonerrors.DCError( 400, {message: `${i18nErrorMessage( 'noResultSet', {fileName: input} )}`} );
                    }
                }
                return fileNameData;
            }
        };

        flow_transformers[traTypes.JSON_BDT] = function JSON_BDT( config, user, callback ) {
            const input = config.input;
            if( input && input.patient && input.employee && input.location ) {
                Y.doccirrus.api.bdt.convertPatientToBDT( config, callback );
            } else {
                error( 'Wrong data structure has been passed to BDT transformer', callback );
                flowlog.log( config.title, i18nComponent( traTypes.JSON_BDT ), "patient/employee/location data set incomplete", user );
            }
        };

        /**
         *
         * @param {Object} config
         * @param {module:flowSchema.transformersObj} config.transformer
         * @param {Object} config.input
         * @param {String} config.input.basePath
         * @param {String} config.input.deviceServer
         * @param {Buffer} config.input.data
         * @param {String} config.input.path
         * @param {String} config.title
         * @param {ObjectId} [config.gdtLogId]
         * @param {module:authSchema.auth} user
         * @param {Function} callback
         * @return {Promise<void>}
         */
        flow_transformers[traTypes.GDT_JSON] = function GDT_JSON( config, user, callback ) {
            return Y.doccirrus.api.gdt.gdtToFinding( {
                user,
                xdt: config.transformer.gdtVersion,
                softValidation: config.transformer.softValidation,
                mapSubtype: config.transformer.mapSubtype,
                subtypeToMap: config.transformer.subtypeToMap,
                deleteAttachments: config.transformer.deleteAttachments,
                sourceBasePath: config.input.basePath,
                sourceDeviceServer: config.input.deviceServer,
                sourceFlowName: config.title,
                buffer: config.input.data,
                path: config.input.path,
                getOnlyInsuranceCaseFolder: true,
                gdtLogId: config.gdtLogId,
                forceCreateNewActivity: config.transformer.forceCreateNewActivity,
                gdtUseLastChangedActivity: config.transformer.gdtUseLastChangedActivity,
                gdtMappingsForUnknownFields: config.transformer.gdtMappingsForUnknownFields,
                title: config.title
            }, function GDT_JSON_callback( err, res ) {
                if( err ) {
                    flowlog.log( config.title, i18nComponent( traTypes.GDT_JSON ), `${(err.message && util.inspect( err.message, {depth: 10} )) || util.inspect( err, {depth: 10} )}
File: ${config.input.path}`, user );
                    return error( err.message || err, callback );
                } else {
                    return callback( err, res );
                }
            } );
        };

        flow_transformers[traTypes.GDTSTUDY] = function GDTSTUDY( config, user, callback ) {
            const options = {
                exportMedData: config.transformer.exportMedData || false,
                exportDiagnosis: config.transformer.exportDiagnosis || false
            };

            Y.doccirrus.api.gdt.patientToGdtStudy( {
                ignoreLen: true,
                user: user,
                sender: config.transformer.gdtSender,
                receiver: config.transformer.gdtReceiver,
                version: config.transformer.gdtVersion,
                encoding: config.transformer.gdtEncoding,
                patient: config.input.patient,
                employee: config.input.employee,
                location: config.input.location,
                testId: config.input.patient.deviceOrder,
                procedure: config.transformer.procedure,
                showOriginalId: config.transformer.showOriginalId,
                selectedActivities: config.input.selectedActivities,
                selectedCasefolderId: config.selectedCasefolderId,
                options: options
            }, async ( err, res ) => {
                if( err ) {
                    flowlog.log( config.title, i18nComponent( traTypes.GDTSTUDY ), err.message || util.inspect( err, {depth: 10} ), user );
                } else if( res ) {
                    await checkAndCreateGdtExportLog( {
                        user,
                        data: {
                            flow: config.configuredFlow,
                            patient: config.input.patient,
                            buffer: res,
                            transformer: config.transformer
                        }
                    } );
                }
                callback( err, res );
            } );
        };

        flow_transformers[traTypes.GDTPATIENT] = function GDTPATIENT( config, user, callback ) {
            const options = {
                exportMedData: config.transformer.exportMedData || false,
                mapPatientLocationAddon: config.transformer.mapPatientLocationAddon || false,
                mapPatientLocationAddonTo: config.transformer.mapPatientLocationAddonTo || '',
                mapBSNR: config.transformer.mapBSNR || false,
                mapBSNRTo: config.transformer.mapBSNRTo || '',
                mapCaseFolderId: config.transformer.mapCaseFolderId || false,
                mapCaseFolderIdTo: config.transformer.mapCaseFolderIdTo || '',
                mapEmployeeId: config.transformer.mapEmployeeId || false,
                mapEmployeeIdTo: config.transformer.mapEmployeeIdTo || '',
                mapResponsibleDoctor: config.transformer.mapResponsibleDoctor || false,
                mapResponsibleDoctorTo: config.transformer.mapResponsibleDoctorTo || ''
            };

            Y.doccirrus.api.gdt.patientToGdtPatient( {
                encoding: config.transformer.gdtEncoding,
                ignoreLen: true,
                getOnlyInsuranceCaseFolder: true,
                options: options,
                patient: config.input.patient,
                receiver: config.transformer.gdtReceiver,
                sender: config.transformer.gdtSender,
                showOriginalId: config.transformer.showOriginalId,
                user: user,
                version: config.transformer.gdtVersion,
                location: config.input.location,
                customLocation: config.input.customLocation,
                customEmployee: config.input.customEmployee,
                lastSchein: config.input.lastSchein,
                selectedActivities: config.input.selectedActivities
            }, async ( err, res ) => {
                if( err ) {
                    flowlog.log( config.title, i18nComponent( traTypes.GDTPATIENT ), err.message || util.inspect( err, {depth: 10} ), user );
                } else if( res ) {
                    await checkAndCreateGdtExportLog( {
                        user,
                        data: {
                            flow: config.configuredFlow,
                            patient: config.input.patient,
                            buffer: res,
                            transformer: config.transformer
                        }
                    } );
                }
                callback( err, res );
            } );
        };

        flow_transformers[traTypes.GDTVIEW] = function GDTVIEW( config, user, callback ) {
            Y.doccirrus.api.gdt.findingToGdtView( {
                encoding: config.transformer.gdtEncoding,
                finding: config.input.activity,
                showOriginalId: config && config.transformer && config.transformer.showOriginalId,
                getOnlyInsuranceCaseFolder: true,
                transformer: config.transformer
            }, async ( err, res ) => {
                if( err ) {
                    flowlog.log( config.title, i18nComponent( traTypes.GDTVIEW ), err.message || util.inspect( err, {depth: 10} ), user );
                } else if( res ) {
                    await checkAndCreateGdtExportLog( {
                        user,
                        data: {
                            flow: config.configuredFlow,
                            activity: config.input.activity,
                            buffer: res,
                            transformer: config.transformer
                        }
                    } );
                }
                callback( err, res );
            } );
        };

        flow_transformers[traTypes.MEDIA_IMPORT] = async function MEDIA_IMPORT( config, user, callback ) {
            let fileRegexStr = config.transformer.fileNameMap;
            const fileName = path.win32.basename( config.input.path );

            let [err, fileNameData] = await formatPromiseResult(
                Y.doccirrus.api.flow_transformers.extractDataWithRegexForFlows( {
                    regexChnks: regexChunks,
                    input: fileName,
                    title: config.title,
                    user: user,
                    regexString: fileRegexStr
                } )
            );

            if( err ) {
                error( err.message, callback );
                return;
            }

            Y.log( `MediaImportTransformer: Extracted fileNameData = ${util.inspect( fileNameData, {depth: 10} )}`, 'info', NAME );

            const
                dateOfCreationString = getDateOfCreationString( fileNameData ),
                patientQuery = getPatientQuery( fileNameData ),
                timestamp = getDateOfCreation( fileNameData );

            Y.log( `MediaImportTransformer: Patient query: ${JSON.stringify( patientQuery )} and date of creation: ${timestamp}`, "info", NAME );

            Y.doccirrus.api.devicelog.matchPatientAndCreateAttachment( {
                caption: `Aufnahme ${fileNameData.counter || ""}${dateOfCreationString && ` (${dateOfCreationString})`}`,
                patientQuery,
                timestamp,
                hours: config.transformer.hours,
                file: config.input,
                deviceId: config.title,
                actData: {
                    subType: config.transformer.subType,
                    actType: "OBSERVATION"
                },
                overwrite: config.overwrite,
                user,
                calledFromMediaImportTransformer: true,
                callback: async ( err, res ) => {
                    if( err ) {
                        if( err.customMessage === "EXISTS" ) {
                            await formatPromiseResult(
                                Y.doccirrus.api.flowlog.logDeletedFileDetails( {
                                    user,
                                    data: {
                                        flowName: config.title || "",
                                        flowComponentName: Y.doccirrus.i18n( 'flow-schema.Flow_T.transformers.i18n' ),
                                        msg: Y.doccirrus.errorTable.getMessage( {
                                            code: 115026,
                                            data: {$filePath: err.filePath, $fileHash: err.fileHash}
                                        } ),
                                        fileDownloadUrl: err.fileDownloadUrl
                                    }
                                } )
                            );

                            if( user.id !== 'su' ) {
                                // Notify UI via system message as a warning that the duplicate gdt file was received
                                Y.doccirrus.api.devicelog.sendDuplicateMediaReceivedSystemNotification( user, Y.doccirrus.errorTable.getMessage( {
                                    code: 115026,
                                    data: {$filePath: err.filePath, $fileHash: err.fileHash}
                                } ) );
                            }

                            return callback();
                        } else {
                            flowlog.log( config.title, i18nComponent( traTypes.MEDIA_IMPORT ), `${err.message || err.data || util.inspect( err, {depth: 10} )}
File: ${config.input.path}`, user );
                            error( err.message || err, callback );
                        }
                    } else {
                        callback( err, res );
                    }
                }
            } );
        };

        flow_transformers[traTypes.LDT_UPLOAD] = async function LDT_UPLOAD( config, user, callback ) {
            let [err, lablogs] = await formatPromiseResult(
                Y.doccirrus.api.lab.submitLDT( {
                    user: user,
                    data: {
                        ignoreHashExists: false,        //  MOJ-10176
                        billingFlag: config.transformer.billingFlag,
                        disallowGkvBilling: config.transformer.disallowGkvBilling,
                        allowGkvBilling: config.transformer.allowGkvBilling,
                        useDataFromLabrequestIfPresent: config.transformer.useDataFromLabrequestIfPresent,
                        softValidation: config.transformer.softValidation,
                        useAddInfoForId: config.transformer.useAddInfoForId,
                        useAddInfoForIdFK: config.transformer.useAddInfoForIdFK,
                        timeRange: config.transformer.timeRange,
                        timeRangeDays: config.transformer.timeRangeDays,
                        checkFileWithLdkPm: config.transformer.checkFileWithLdkPm,
                        specialMatchConfig: {
                            source: config.transformer.specialMatchSource,
                            activityField: config.transformer.specialMatchActivityField,
                            days: config.transformer.specialMatchDays,
                            activityType: config.transformer.specialMatchActivityType
                        },
                        flow: config.title
                    },
                    ldtFile: {
                        path: config.input.path,
                        originalname: require( 'path' ).basename( config.input.path ),
                        data: config.input.data
                    }
                } )
            );
            if( err ) {
                flowlog.log( config.title, i18nComponent( traTypes.LDT_UPLOAD ), `${err.message || util.inspect( err, {depth: 10} )}
File: ${config.input.path}`, user );
            }
            //process.exit(); //DO NOT DELETE -- What is this? MOJ-9131
            return callback( err, lablogs );
        };

        flow_transformers[traTypes.LDT_TRANSACTION] = async function LDT_TRANSACTION( config, user, callback ) {
            // activeCaseFolderTab is not provided when flow is executed from 'Weitere...' -> 'Export'
            if( !config.input.activeCaseFolderTab ) {
                let [, casefolder] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    model: 'casefolder',
                    user: user,
                    action: 'get',
                    query: {
                        _id: config && config.input && config.input.patient && config.input.patient.activeCaseFolderId
                    },
                    options: {
                        limit: 1
                    }
                } ) );
                // MOJ-14319: [OK]
                if( casefolder && (Y.doccirrus.schemas.patient.isPublicInsurance( {type: casefolder[0].type} ) ||
                                   Y.doccirrus.schemas.patient.isPrivateInsurance( {type: casefolder[0].type} ) ||
                                   casefolder[0].type === 'SELFPAYER' || casefolder[0].type === 'BG') ) {
                    config.input.activeCaseFolderTab = casefolder[0];
                } else {
                    Y.log( `wrong casefolder selected for LDT Transaction`, 'warn', NAME );
                    return callback( new Error( Y.doccirrus.i18n( 'CaseFileMojit.error.ldtExportTransformerNotInCaseFolder' ) ), null );
                }
            }

            Y.doccirrus.api.ldt.generateLabFAOrder( {
                ldt: Y.doccirrus.api.xdtTools.getXdtFromPath( config.transformer.ldtVersion ),
                patient: config.input.patient,
                employee: config.input.employee,
                location: config.input.location,
                customLocation: config.input.customLocation,
                customEmployee: config.input.customEmployee,
                insurance: Y.doccirrus.schemas.patient.getInsuranceByType( config.input.patient, config.input.activeCaseFolderTab && config.input.activeCaseFolderTab.type ),
                user: user
            }, ( err, res ) => {
                if( err ) {
                    flowlog.log( config.title, i18nComponent( traTypes.LDT_TRANSACTION ), err.message || util.inspect( err, {depth: 10} ), user );
                }
                callback( err, res );
            } );
        };

        flow_transformers[traTypes.LDT_TRANSACTION_EXTENDED] = async function LDT_TRANSACTION_EXTENDED( config, user, callback ) {
            if( !config.input.activeCaseFolderTab ) {
                let [, casefolder] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    model: 'casefolder',
                    user: user,
                    action: 'get',
                    query: {
                        _id: config && config.input && config.input.patient && config.input.patient.activeCaseFolderId
                    },
                    options: {
                        limit: 1
                    }
                } ) );
                // MOJ-14319: [OK]
                if( casefolder && (Y.doccirrus.schemas.patient.isPublicInsurance( {type: casefolder[0].type} ) ||
                                   Y.doccirrus.schemas.patient.isPrivateInsurance( {type: casefolder[0].type} ) ||
                                   casefolder[0].type === 'SELFPAYER' || casefolder[0].type === 'BG') ) {
                    config.input.activeCaseFolderTab = casefolder[0];
                } else {
                    Y.log( `wrong casefolder selected for LDT Export`, 'warn', NAME );
                    return callback( new Error( Y.doccirrus.i18n( 'CaseFileMojit.error.ldtExportTransformerNotInCaseFolder' ) ), null );
                }
            }

            const extendedProperties = {
                patientHeightInCm: config.transformer.patientHeightInCm,
                patientHeightInCmFK: config.transformer.patientHeightInCmFK,
                patientWeightInKg: config.transformer.patientWeightInKg,
                patientWeightInKgFK: config.transformer.patientWeightInKgFK,
                diagnosisSuspected: config.transformer.diagnosisSuspected,
                diagnosisSuspectedFK: config.transformer.diagnosisSuspectedFK,
                initiatorBSNR: config.transformer.initiatorBSNR,
                initiatorBSNRFK: config.transformer.initiatorBSNRFK,
                refBSNR: config.transformer.refBSNR,
                refBSNRFK: config.transformer.refBSNRFK,
                treatmentType: config.transformer.treatmentType,
                treatmentTypeSel: config.transformer.treatmentTypeSel,
                treatmentTypeFK: config.transformer.treatmentTypeFK,
                initiatorLANR: config.transformer.initiatorLANR,
                initiatorLANRFK: config.transformer.initiatorLANRFK,
                refLANR: config.transformer.refLANR,
                refLANRFK: config.transformer.refLANRFK,
                ICDCode: config.transformer.ICDCode,
                ICDCodeFK: config.transformer.ICDCodeFK,
                diagnosisCertainty: config.transformer.diagnosisCertainty,
                diagnosisCertaintyFK: config.transformer.diagnosisCertaintyFK,
                diagnosisLoc: config.transformer.diagnosisLoc,
                diagnosisLocFK: config.transformer.diagnosisLocFK,
                diagnosisDesc: config.transformer.diagnosisDesc,
                diagnosisDescFK: config.transformer.diagnosisDescFK,
                diagnosisExceptionDesc: config.transformer.diagnosisExceptionDesc,
                diagnosisExceptionDescFK: config.transformer.diagnosisExceptionDescFK,
                patientPregnancy: config.transformer.patientPregnancy,
                patientPregnancyFK: config.transformer.patientPregnancyFK,
                patientPregnancyGestationLength: config.transformer.patientPregnancyGestationLength,
                patientPregnancyGestationLengthFK: config.transformer.patientPregnancyGestationLengthFK,
                selectedRefBSNRMapping: config.transformer.selectedRefBSNR,
                selectedRefLANRMapping: config.transformer.selectedRefLANR
            };

            Y.doccirrus.api.ldt.generateLabFAOrder( {
                ldt: Y.doccirrus.api.xdtTools.getXdtFromPath( config.transformer.ldtVersion ),
                patient: config.input.patient,
                employee: config.input.employee,
                location: config.input.location,
                customLocation: config.input.customLocation,
                customEmployee: config.input.customEmployee,
                insurance: Y.doccirrus.schemas.patient.getInsuranceByType( config.input.patient, config.input.activeCaseFolderTab && config.input.activeCaseFolderTab.type ),
                selectedActivities: config.input.selectedActivities,
                extendedProperties: extendedProperties,
                user: user
            }, ( err, res ) => {
                if( err ) {
                    flowlog.log( config.title, i18nComponent( traTypes.LDT_TRANSACTION_EXTENDED ), err.message || util.inspect( err, {depth: 10} ), user );
                }
                callback( err, res );
            } );
        };

        flow_transformers[traTypes.OSIRIX] = function OSIRIX( config, user, callback ) {
            let DUMMY = "Dummy/Lokal";
            if( config.input.activity && config.input.activity.g_extra && config.input.activity.g_extra.StudyInstanceUID ) {
                if( config.transformer.modality === DUMMY && config.overwrite && config.overwrite.ip ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'inpacsmodality',
                        query: {
                            ip: config.overwrite.ip
                        }
                    }, ( err, res ) => {
                        if( res && res[0] ) {
                            res = res.filter( mod => "INPACS" !== mod.name );
                        }
                        if( err || !res[0] ) {
                            return callback( err || Y.doccirrus.errors.rest( 41002, null, true ) );
                        }
                        Y.doccirrus.api.inpacs.sendStudyAndOpen( user, config.input.activity.g_extra.StudyInstanceUID, res[0].name, ( err, res ) => {
                            callback( err, res );
                        } );
                    } );
                } else {
                    Y.doccirrus.api.inpacs.sendStudyAndOpen( user, config.input.activity.g_extra.StudyInstanceUID, config.transformer.modality, ( err, res ) => {
                        callback( err, res );
                    } );
                }
            } else {
                callback( Y.doccirrus.errors.rest( 41000, "Activity does not contain inPacs data.", true ) );
            }
        };

        flow_transformers[traTypes.MINIVIDAS] = function MINIVIDAS( config, user, callback ) {
            Y.doccirrus.api.serialParsers.miniVIDAS.parse( config.input, ( err, deviceData ) => {
                if( deviceData ) {
                    Y.doccirrus.api.lab.addMiniVIDASResult( deviceData, user, callback );
                } else {
                    callback( err || "no data" );
                }
            } );
        };

        flow_transformers[traTypes.BESR] = async function BESR( config, user, callback ) {
            //duplicate check
            let
                err,
                fileHash = config && config.input && config.input.fileHash;
            if( !fileHash ) {
                [err, fileHash] = await formatPromiseResult(
                    Y.doccirrus.api.banklog.duplicateCheck( {
                        user: user,
                        data: config && config.input && config.input.data
                    } )
                );

                if( err ) {
                    Y.log( `BESR - duplicateCheck error: ${err.stack || err}`, 'error', NAME );
                    flowlog.log( config.title, i18nComponent( traTypes.BESR ), `${err.message || util.inspect( err, {depth: 10} )}
File: ${config.input.path}`, user );
                    return handleResult( err, null, callback );
                }
            }

            let
                dataRows = config.input && config.input.data && config.input.data.toString().trim(),
                mediaObj = config.input && config.input.media,
                response = [];

            dataRows = (dataRows || '').split( /(?:\r\n|\r|\n)/g );

            // eslint-disable-next-line no-unused-vars
            for( let [index, data] of dataRows.entries() ) {
                let ret = {},
                    template,
                    transactionType = data.substring( 0, 3 );

                if( ['002', '005', '008', '012', '015', '018', '102', '105', '108', '112', '115', '118'].includes( transactionType ) ) {
                    template = [
                        ['Transaction type', 0, 3, false],
                        ['ESR participant number', 3, 12, true],
                        ['Reference number', 12, 39, true],
                        ['Amount', 39, 49, false],
                        ['Payment reference', 49, 59, false],
                        ['Payment date', 59, 65, false],
                        ['Processing date', 65, 71, false],
                        ['Credit date', 71, 77, false],
                        ['Microfilm number', 77, 86, false],
                        ['Reject code', 86, 87, false],
                        ['Reserve', 87, 96, false],
                        ['Post office deposit fees', 96, 100, false]
                    ];
                } else if( ['999', '995'].includes( transactionType ) ) {
                    template = [
                        ['Transaction type', 0, 3, false],
                        ['ESR participant number', 3, 12, true],
                        ['Sorting key', 12, 39, false],
                        ['Amount', 39, 51, false],
                        ['Number of transactions', 51, 63, false],
                        ['Creation date of file', 63, 69, false],
                        ['Post office deposit fees', 69, 78, false],
                        ['Post office postprocessing charges', 78, 87, false],
                        ['Reserve', 87, 100, false]
                    ];
                } else if( data.trim().length ) {
                    return handleResult( `unknown document type for ${data}`, null, callback );
                } else {
                    //empty line
                    continue;
                }

                // eslint-disable-next-line no-unused-vars
                for( let fieldArr of template ) {

                    let [name, start, end, needCRC] = fieldArr,
                        value = data.substring( start, end );

                    if( needCRC ) {
                        let input = value.substr( 0, value.length - 1 ),
                            orgCrc = value.substr( value.length - 1 ),
                            crc = crc10( input );

                        if( orgCrc !== crc.toString() ) {
                            Y.log( `CRC not match for ${name}:${value}`, 'error', NAME );
                            return handleResult( `CRC not match for ${name}:${value}`, null, callback );
                        }
                        ret[name] = input;
                        ret[`${name}CRC`] = crc;
                    } else {
                        ret[name] = value;
                    }
                }
                response.push( ret );
                let record = ret;
                record.MediaObj = mediaObj;
                let [err] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.banklog.createBankLogRecord( {
                        user,
                        data: record,
                        size: dataRows.length - 1,
                        index: index,
                        fileHash: fileHash,
                        callback: async ( err ) => {
                            if( err ) {
                                reject( err );
                            }
                            resolve( response );
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `BESR - createBankLogRecord error: ${err.stack || err}`, 'error', NAME );
                    flowlog.log( config.title, i18nComponent( traTypes.BESR ), `${err.message || util.inspect( err, {depth: 10} )}
File: ${config.input.path}`, user );
                    return handleResult( err, null, callback );
                }
            }
            return handleResult( null, response, callback );
        };

        flow_transformers[traTypes.HL7_LDT_JSON] = async function HL7_LDT_JSON( config, user, callback ) {
            const calledFromFlowTransformer = true;

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.api.hl7.convertHL7toLDTJSON( {config, calledFromFlowTransformer, user} )
            );

            if( err ) {
                flowlog.log( config.title, i18nComponent( traTypes.LDT_UPLOAD ), `${err.message || util.inspect( err, {depth: 10} )}
File: ${config.input.path}`, user );
            }

            callback( err, result );
        };

        flow_transformers[traTypes.OPHTHALMOLOGY_TMP_IMPORT] = async function OPHTHALMOLOGY_TMP_IMPORT( config, user, callback ) {
            let
                dataRows = config.input && config.input.data && config.input.data.toString().trim(),
                content;

            dataRows = (dataRows || '').split( /(?:\r\n|\r|\n)/g );

            if( !dataRows || dataRows.length === 0 ) {
                return callback( 'Empty file!' );
            }

            content = `${config.transformer.tmpFileTypeDescription}\n`;
            config.transformer.mappingTmpFileRows.forEach( ( {rowNumber, label} ) => {
                if( label.slice( -1 ) === ':' || label.slice( -1 ) === ' ' ) {
                    content += `${label.slice( 0, -1 )}${label.slice( -1 )}${dataRows[rowNumber - 1]}`;
                } else if( label.slice( -1 ) === ')' ) {
                    content += `${label.slice( 0, -2 )} (${dataRows[rowNumber - 1]})`;
                } else {
                    content += `${label} ${dataRows[rowNumber - 1]}`;
                }
                content += '\n';
            } );

            callback( null, {content, ophthalmologistTmpFileImported: true} );
        };

        flow_transformers[traTypes.MEDIPORT_RES] = async function MEDIPORT_RES( config, user, callback ) {
            Y.log('Entering flow_transformers[MEDIPORT_RES]', 'info', NAME);
            let error, result;

            async function showFlowErrorFile( args ) {
                const {patientSsn, fileName, fileType, buffer, searchParams, message} = args;
                //patientSsn CAN be undefined
                let [err, res] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            socialSecurityNo: patientSsn || ''
                        }
                    } )
                );
                let ownerId;
                if( err || !res || !res.length ) {
                    //Y.log(`Failed to get patient from response with SSN ${ssn}.\nError: ${err}`, 'error', NAME );
                    //throw err || null;
                    ownerId = '';
                } else {
                    ownerId = res[0]._id;
                }

                [err, res] = await formatPromiseResult( Y.doccirrus.tarmedInvoices.createDocumentFromFile( {
                    user,
                    fileName,
                    file: '',
                    fileType,
                    ownerId: ownerId,
                    model: 'patient',
                    buffer
                } ) );

                if( err || !res ) {
                    Y.log( `flow_transformers[MEDIPORT_RES]: Failed to create documents for patient ${ownerId}.\nError: ${err && err.stack || err}`, 'error', NAME );
                    err = err || Y.doccirrus.errors.rest( 'medidata_06', {}, true );
                    throw err;
                }
                const docId = res.document && res.document._id;

                if( !docId ) {
                    Y.log( `flow_transformers[MEDIPORT_RES]: Failed to create documents for patient ${ownerId}. No document id`, 'error', NAME );
                    throw Y.doccirrus.errors.rest( 'medidata_06', {}, true );
                }
                [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'document',
                    action: 'get',
                    query: {_id: docId}
                } ) );

                if( err || !res || !res.length ) {
                    Y.log( `flow_transformers[MEDIPORT_RES]: Failed to get document ${docId} for patient ${ownerId}.\nError: ${err && err.stack || err}`, 'error', NAME );
                    err = err || Y.doccirrus.errors.rest( 'medidata_06', {}, true );
                    throw err;
                }
                const document = res[0],
                    msg = `${Y.doccirrus.errorTable.getMessage( {
                        code: 'medidata_00',
                        data: searchParams
                    } )}\n ${message}`;

                await Y.doccirrus.api.flowlog.logDeletedFileDetails( {
                    user,
                    data: {
                        flowName: config.title || "",
                        flowComponentName: Y.doccirrus.i18n( 'flow-schema.Flow_T.transformers.i18n' ),
                        msg, fileDownloadUrl: document.url
                    }
                } );
            }

            [error, result] = await formatPromiseResult(Y.doccirrus.medidatalogUtils.parseResponseXml({
                user,
                buffer: config.input.data,
                errorHandler: showFlowErrorFile
            } ) );

            if( error ) {
                Y.log(`flow_transformers[MEDIPORT_RES]: Error in parsing Response XML from Medidata.\nError:${error.stack || error}`, 'error', NAME);
                return callback( null, {} );
            }

            const {communicationData, invoiceRef, documents, status} = result;

            Y.log('Exiting flow_transformers[MEDIPORT_RES]', 'info', NAME);
            callback( null, {
                data: {
                    communication: communicationData,
                    invoiceRef,
                    documents,
                    status
                },
                query: {_id: invoiceRef.patientId}
            } );
        };
        /**
         * @class flow_transformers
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).flow_transformers = flow_transformers;

    },
    '0.0.1', {
        requires: [
            'flow-schema',
            'file-schema',
            'devicelog-api',
            'banklog-api',
            'flowlog',
            'lab-api',
            'gdt-api',
            'bdt-api',
            'xdttools',
            'serialParsers',
            'gdtexportlog-api'
        ]
    }
);
