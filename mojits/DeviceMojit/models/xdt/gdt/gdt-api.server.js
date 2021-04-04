/*
 @user: jm
 @date: 2015-08-11
 */

/*global YUI */



YUI.add( 'gdt-api', function( Y, NAME ) {
        const
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            i18n = Y.doccirrus.i18n;

        var GdtApi = {};

        const DEFAULT_ENCODING = "ISO 8859-15",
            moment = require( 'moment' ),
            path = require( 'path' ),
            async = require( 'async' ),
            gdtRegexChunks = {
                treatmentCode: `(?<treatmentCode>[A-Za-z0-9]{0,10})`,
                treatmentPrice: `(?<treatmentPrice>.+?)`,
                treatmentDescription: `(?<treatmentDescription>.+?)`,
                icd10: `(?<icd10>[A-TV-Z][0-9][0-9AB]\\.?[0-9A-TV-Z]{0,4})`,
                icdDescription: `(?<icdDescription>.+?)`
            };

        let {
            mongodb: {runDb},
            schemas: {patient: Patient},
            errors,
            api: {
                xdtTools,
                xdtParser,
                xdtVersions,
                sdManager,
                devicelog,
                flowlog,
                activity
            }
        } = Y.doccirrus;

        var genderMap = {"MALE": "1", "FEMALE": "2"};

        function getPatientId( patient, showOriginalId ) {
            if( showOriginalId ) {
                if( !isNaN( patient.patientNo ) && parseInt( patient.patientNo, 10 ) === patient.patientNumber ) {
                    return patient.patientNumber.toString();
                } else if( !isNaN( patient.patientNo ) ) {
                    return `${parseInt( patient.patientNo, 10 )}`;
                } else {
                    return patient.patientNo.replace( /^[0]{0,5}/, "" ); //basically convert 000abc => abc
                }
            } else {
                return patient.patientNo;
            }
        }

        function error( msg, cb ) {
            Y.log( msg, 'warn', NAME );
            cb( errors.rest( 400, msg, true ) );
        }

        async function _postActivity( args ) {
            const {
                data,
                user
            } = args;

            return new Promise( async ( resolve, reject ) => {
                Y.doccirrus.api.activity.post( {
                    user: user,
                    data: data,
                    callback: ( err, res ) => {
                        if( err ) {
                            return reject( err );
                        } else if( res ) {
                            return resolve( res[0] );
                        }
                    }
                } );
            } );
        }

        /**
         * import: GDT to FINDING
         * @method gdtToFinding
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {String} [args.xdt]
         * @param {Boolean} args.softValidation
         * @param {String} [args.mapSubtype]
         * @param {Buffer} [args.subtypeToMap]
         * @param {String} [args.deleteAttachments]
         * @param {String} [args.sourceBasePath]
         * @param {String} [args.sourceDeviceServer]
         * @param {String} [args.sourceFlowName]
         * @param {Buffer} args.buffer
         * @param {String} [args.path]
         * @param {Boolean} args.getOnlyInsuranceCaseFolder
         * @param {ObjectId} args.gdtLogId
         * @param {Boolean} args.forceCreateNewActivity
         * @param {Boolean} [args.gdtUseLastChangedActivity]
         * @param {String} args.title
         * @param {Function} callback
         */
        GdtApi.gdtToFinding = async function( args, callback ) {
            let
                gdt = "gdt",
                patientQuery;

            const {
                gdtMappingsForUnknownFields,
                title,
                user,
                buffer,
                xdt,
                softValidation,
                gdtLogId,
                mapSubtype,
                subtypeToMap,
                forceCreateNewActivity,
                sourceDeviceServer,
                sourceBasePath,
                deleteAttachments,
                getOnlyInsuranceCaseFolder,
                sourceFlowName,
                gdtUseLastChangedActivity = true
            } = args;

            function deleteAttachmentMaybe( client, path, delCb ) {
                if( deleteAttachments ) {
                    sdManager.unlinkS2eClient( {
                        query: {
                            client,
                            path
                        },
                        callback: delCb
                    } );
                } else {
                    delCb( null, true );
                }
            }

            if( xdt ) {
                gdt = xdtTools.getXdtFromPath( xdt );
            }
            xdtParser.parse( {
                data: buffer,
                xdt: gdt,
                softValidation: softValidation,
                callback: async function( err, res ) {
                    if( err || !res || !res.records || !res.records.length ) {
                        err = err || errors.rest( 400, "missing record", true );
                        Y.log( `GDT err: ${require( 'util' ).inspect( err )}`, 'warn' );

                        if( gdtLogId ) {
                            await formatPromiseResult(
                                Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus( {
                                    user: user,
                                    data: {
                                        errorMessage: Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.PARSE_ERROR,
                                        gdtLogId: gdtLogId
                                    }
                                } )
                            );
                        }

                        return callback( err );
                    }

                    var record = res.records[0]; //gdt 2.0 isn't expected to carry more than one record.
                    /// ---------  check if gdt already contains a patient number -----------
                    var patId = record && (record.patientId || (record.Obj_Patient && record.Obj_Patient.patientId));

                    if( !patId ) {
                        if( softValidation ) {
                            if(
                                !(record.patientForename || record.Obj_Patient && record.Obj_Patient.patientForename) ||
                                !(record.patientName || record.Obj_Patient && record.Obj_Patient.patientName) ||
                                !(record.patientDob || record.Obj_Patient && record.Obj_Patient.patientDob)
                            ) {
                                Y.log( "gdtToFinding: invalid file - no patient details found", "warn", NAME );
                                Y.log( require( 'util' ).inspect( res, {depth: 10, colors: true} ) );

                                if( gdtLogId ) {
                                    await formatPromiseResult(
                                        Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus( {
                                            user: user,
                                            data: {
                                                errorMessage: Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.PATIENT_NOT_FOUND,
                                                firstName: record.patientForename || record.Obj_Patient && record.Obj_Patient.patientForename,
                                                lastName: record.patientName || record.Obj_Patient && record.Obj_Patient.patientName,
                                                gdtLogId: gdtLogId
                                            }
                                        } )
                                    );
                                }

                                return callback( errors.rest( 400, "invalid file", true ) );
                            }

                            patientQuery = {
                                $or: [
                                    {
                                        firstname: record.patientForename || record.Obj_Patient && record.Obj_Patient.patientForename,
                                        lastname: record.patientName || record.Obj_Patient && record.Obj_Patient.patientName,
                                        kbvDob: moment( record.patientDob || record.Obj_Patient && record.Obj_Patient.patientDob ).format( "DD.MM.YYYY" )
                                    }
                                ]
                            };
                        } else {
                            Y.log( "invalid file - no patient Id data for matching.", "warn", NAME );
                            Y.log( require( 'util' ).inspect( res, {depth: 10, colors: true} ) );

                            if( gdtLogId ) {
                                await formatPromiseResult(
                                    Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus( {
                                        user: user,
                                        data: {
                                            errorMessage: Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.NO_PATIENT_NUM_FOUND_IN_FILE,
                                            firstName: record.patientForename || record.Obj_Patient && record.Obj_Patient.patientForename,
                                            lastName: record.patientName || record.Obj_Patient && record.Obj_Patient.patientName,
                                            gdtLogId: gdtLogId
                                        }
                                    } )
                                );
                            }

                            return callback( errors.rest( 400, "invalid file", true ) );
                        }
                    } else {
                        const patIdParsed = isNaN( patId ) ? NaN : parseInt( patId, 10 );

                        if( isNaN( patIdParsed ) || 0 === patIdParsed ) {
                            patientQuery = {
                                $or: [{patientNo: patId}]
                            };
                        } else {
                            patientQuery = {$or: [{patientNumber: patIdParsed}, {patientNo: patId}]};
                        }
                    }

                    /// ---------  setup contents for the activity -- update or post, we don't know yet -----------
                    var userContent = xdtTools.prettyText( res );
                    var timestamp = (record && record.treatmentDate) || new Date();
                    const currentDate = moment();
                    timestamp = moment( timestamp )
                        .add( currentDate.hours(), 'hours' )
                        .add( currentDate.minutes(), 'minutes' )
                        .add( currentDate.seconds(), 'seconds' )
                        .toDate();
                    var filtered = GdtApi.filterGdtText( userContent );

                    const caseFolderId = record.caseFolderId && record.caseFolderId.split( ' ' );
                    const doctorId = record.responsibleDoctor && record.responsibleDoctor.split( ' ' );
                    const commercialNo = record.bsnr;
                    let locationId;

                    if( commercialNo ) {
                        let err;
                        [err, locationId] = await formatPromiseResult(
                            runDb( {
                                user: user,
                                model: 'location',
                                action: 'get',
                                query: {
                                    commercialNo: commercialNo
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `Could not get location: ${err.stack || err}`, 'warn', NAME );
                        }
                        if( locationId && Array.isArray( locationId ) && locationId.length ) {
                            locationId = locationId[0]._id;
                            Y.log( `Setting locationId for gdtImport to ${locationId.toString()}.`, 'info', NAME );
                        }
                    }

                    //preparation for later ticket
                    // const employeeId = record.signature && record.signature.split( ' ' );
                    // let editor = {};
                    // const tmpId = employeeId && Array.isArray( employeeId ) && employeeId.length > 1 && employeeId[1];
                    //
                    // if( tmpId ) {
                    //     const [editorError, editorResult] = await formatPromiseResult(
                    //         Y.doccirrus.mongodb.runDb( {
                    //             action: 'get',
                    //             model: 'employee',
                    //             user: args.user,
                    //             query: {_id: tmpId}
                    //         } )
                    //     );
                    //
                    //     if( editorError ) {
                    //         Y.log( `error getting employee from employeeid: ${tmpId}, error: ${editorError}`, "warn", NAME );
                    //     }
                    //     if( editorResult && Array.isArray( editorResult ) && editorResult.length > 0 ) {
                    //         editor.name = editorResult[0].firstname + ' ' + editorResult[0].lastname;
                    //         editor.employeeNo = editorResult[0].employeeNo;
                    //         editor.initials = editorResult[0].initials;
                    //         editor._id = editorResult[0]._id;
                    //     }
                    // }

                    var cbData = {
                        user: user,
                        query: patientQuery,
                        data: {
                            g_extra: res,
                            userContent: filtered,
                            content: filtered,
                            subType: "GDT",
                            actType: "FINDING",
                            timestamp,
                            caseFolderId: caseFolderId && Array.isArray( caseFolderId ) && caseFolderId.length > 1 && caseFolderId[1],
                            employeeId: (doctorId && Array.isArray( doctorId ) && doctorId.length > 1 && doctorId[1]),
                            locationId: locationId
                            // editor: [editor]
                        },
                        gdtUseLastChangedActivity: gdtUseLastChangedActivity
                    };
                    if( mapSubtype && subtypeToMap ) {
                        let fieldData = gdt.fields[subtypeToMap];
                        if( fieldData ) {
                            let {attribute} = fieldData;
                            let stack = [record];

                            let pushChildObjects = obj => {
                                Object.keys( obj ).forEach( key => {
                                    if( "object" === typeof obj[key] ) {
                                        stack.push( obj[key] );
                                    }
                                } );
                            };

                            while( stack.length ) {
                                let currentObj = stack.pop();
                                if( "undefined" !== typeof currentObj[attribute] ) {
                                    if( "object" === typeof currentObj[attribute] && (currentObj[attribute].head || (currentObj[attribute][0] && currentObj[attribute][0].head)) ) {
                                        cbData.data.subType = currentObj[attribute].head || (currentObj[attribute][0] && currentObj[attribute][0].head);
                                        break;
                                    } else if( "object" !== typeof currentObj[attribute] ) {
                                        cbData.data.subType = currentObj[attribute];
                                        break;
                                    }
                                } else {
                                    pushChildObjects( currentObj );
                                }
                            }
                        }
                    }

                    /// ---------  setup parameters to say we don't know yet whether new activity or not (upsert) -----------
                    /// ---------  setup parameters to query against activity (by g_extra, subType and timestamp) -----------
                    cbData.action = {
                        UPSERT: true,
                        UPDATE_OR_CREATE_ATTACHMENTS: {
                            timestamp: cbData.data.timestamp,
                            g_extra: {$exists: true},
                            subType: cbData.data.subType
                        }
                    };

                    if( forceCreateNewActivity ) {
                        cbData.action.UPDATE_OR_CREATE_ATTACHMENTS = {_id: new ObjectId( -1 )};
                    }

                    /// ---------  handle attachments differently, if attachment is present use the media-api to create the activity  -----------
                    /// ---------  but only if delivered from a device server  ----------->>>>>>> Stashed changes
                    if( record.fileArchiveLabel && record.fileArchiveLabel[0] && sourceDeviceServer ) {
                        async.eachSeries( record.fileArchiveLabel, ( archive, cb ) => {
                            if( archive.fileRef ) {
                                let filePath = archive.fileRef;
                                if( !path.win32.isAbsolute( filePath ) && sourceBasePath ) {
                                    filePath = path.join( sourceBasePath, filePath );
                                }

                                sdManager.readFileS2eClient( {
                                    query: {
                                        client: sourceDeviceServer,
                                        path: filePath
                                    },
                                    callback: ( err, res ) => {
                                        if( res ) {
                                            /**
                                             * This object would be filled with EITHER errorMessage or activityId by
                                             * matchPatientAndCreateAttachment method. This approach is used because
                                             * the code in 'matchPatientAndCreateAttachment' is not segregated and
                                             * getting the required result via callback is very difficult as it is
                                             * called from multiple places
                                             * @type {{errorMessage: <String | null>, activityId: <String | null>}}
                                             */
                                            let
                                                activityResult = {
                                                    errorMessage: null,
                                                    activityId: null
                                                };

                                            devicelog.matchPatientAndCreateAttachment( {
                                                activityResult,
                                                patientQuery: patientQuery,
                                                caption: path.win32.basename( filePath ),
                                                timestamp: timestamp,
                                                hours: 0,
                                                file: {
                                                    data: res,
                                                    path: filePath
                                                },
                                                deviceId: "GDT Import",
                                                actData: cbData.data,
                                                action: cbData.action,
                                                getOnlyInsuranceCaseFolder: getOnlyInsuranceCaseFolder,
                                                user: user,
                                                callback: async ( err ) => {
                                                    if( gdtLogId ) {
                                                        if( activityResult.errorMessage ) {
                                                            await formatPromiseResult(
                                                                Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus( {
                                                                    user: user,
                                                                    data: {
                                                                        errorMessage: activityResult.errorMessage,
                                                                        firstName: record.patientForename || record.Obj_Patient && record.Obj_Patient.patientForename,
                                                                        lastName: record.patientName || record.Obj_Patient && record.Obj_Patient.patientName,
                                                                        gdtLogId: gdtLogId
                                                                    }
                                                                } )
                                                            );
                                                        } else if( activityResult.activityId ) {

                                                            if( forceCreateNewActivity ) {
                                                                cbData.action.UPDATE_OR_CREATE_ATTACHMENTS = {_id: activityResult.activityId};
                                                            }

                                                            await formatPromiseResult(
                                                                Y.doccirrus.api.gdtlog.claimGdtLogEntry( {
                                                                    user: user,
                                                                    data: {
                                                                        activityId: activityResult.activityId,
                                                                        gdtLogId: gdtLogId
                                                                    }
                                                                } )
                                                            );
                                                        }
                                                    }

                                                    if( err ) {
                                                        error( err.message || err, cb );
                                                    } else {
                                                        deleteAttachmentMaybe( sourceDeviceServer, filePath, () => {
                                                            cb( err, true );
                                                        } );
                                                    }
                                                }
                                            } );
                                        } else {
                                            flowlog.log( sourceFlowName || "", Y.doccirrus.i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), `error while searching for attachment: ${JSON.stringify( err )}`, args.user );
                                            cbData.callback = async ( err, activityIdArr ) => {
                                                if( gdtLogId ) {
                                                    if( err ) {
                                                        await formatPromiseResult(
                                                            Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus( {
                                                                user: user,
                                                                data: {
                                                                    errorMessage: (err.code === 400 && err.data === "Patient wurde nicht gefunden." && Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.PATIENT_NOT_FOUND) || Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.ERROR_CREATING_ACTIVITY,
                                                                    firstName: record.patientForename || record.Obj_Patient && record.Obj_Patient.patientForename,
                                                                    lastName: record.patientName || record.Obj_Patient && record.Obj_Patient.patientName,
                                                                    gdtLogId: gdtLogId
                                                                }
                                                            } )
                                                        );
                                                    } else if( activityIdArr && Array.isArray( activityIdArr ) && activityIdArr.length ) {

                                                        if( forceCreateNewActivity ) {
                                                            cbData.action.UPDATE_OR_CREATE_ATTACHMENTS = {_id: activityIdArr[0]};
                                                        }

                                                        await formatPromiseResult(
                                                            Y.doccirrus.api.gdtlog.claimGdtLogEntry( {
                                                                user: user,
                                                                data: {
                                                                    activityId: activityIdArr[0],
                                                                    gdtLogId: gdtLogId
                                                                }
                                                            } )
                                                        );
                                                    }
                                                }

                                                cb( err, true );
                                            };
                                            cbData.getOnlyInsuranceCaseFolder = true;
                                            activity.createActivityForPatient( cbData );
                                        }
                                    }
                                } );
                            } else {
                                cb();
                            }
                        }, ( err ) => {
                            callback( err, {
                                query: patientQuery,
                                action: {IGNORE: true},
                                data: {}
                            } );
                        } );
                    } else {
                        /// ---------  default GDT (no attachment, or not via device server) -----------
                        cbData.callback = async ( err, activityId ) => {
                            if( err ) {
                                if( gdtLogId ) {
                                    await formatPromiseResult(
                                        Y.doccirrus.api.gdtlog.updateGdtLogErrorStatus( {
                                            user: user,
                                            data: {
                                                errorMessage: (err.code === 400 && err.data === "Patient wurde nicht gefunden." && Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.PATIENT_NOT_FOUND) || Y.doccirrus.schemas.gdtlog.gdtResultMessageObj.ERROR_CREATING_ACTIVITY,
                                                firstName: record.patientForename || record.Obj_Patient && record.Obj_Patient.patientForename,
                                                lastName: record.patientName || record.Obj_Patient && record.Obj_Patient.patientName,
                                                gdtLogId: gdtLogId
                                            }
                                        } )
                                    );
                                }

                                callback( err );
                            } else {
                                if( gdtLogId && activityId && Array.isArray( activityId ) && activityId.length ) {
                                    await formatPromiseResult(
                                        Y.doccirrus.api.gdtlog.claimGdtLogEntry( {
                                            user: user,
                                            data: {
                                                activityId: activityId[0],
                                                gdtLogId: gdtLogId
                                            }
                                        } )
                                    );
                                }
                                if( gdtMappingsForUnknownFields && Array.isArray( gdtMappingsForUnknownFields ) && gdtMappingsForUnknownFields.length &&
                                    activityId && Array.isArray( activityId ) && activityId.length ) {

                                    let [err, activity] = await formatPromiseResult(
                                        runDb( {
                                            user: user,
                                            model: 'activity',
                                            action: 'get',
                                            query: {
                                                _id: activityId[0]
                                            },
                                            options: {
                                                lean: true
                                            }
                                        } )
                                    );

                                    if( err ) {
                                        flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.noFindingFound` ), user );
                                        Y.log( `gdtToFinding: Could not find activity by Id: ${activityId[0]} Error: ${err.stack || err}.`, 'warn', NAME );
                                    }
                                    if( activity && Array.isArray( activity ) && activity.length ) {
                                        activity = activity[0];
                                        const newTimestamp = activity && moment( new Date( activity.timestamp ) ).add( 1, 'seconds' ).toDate();

                                        let caseFolder;
                                        [err, caseFolder] = await formatPromiseResult(
                                            runDb( {
                                                user: user,
                                                model: 'casefolder',
                                                action: 'get',
                                                query: {
                                                    _id: activity.caseFolderId
                                                },
                                                options: {
                                                    lean: true
                                                }
                                            } )
                                        );

                                        if( err ) {
                                            flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.noFindingFound` ), user );
                                            Y.log( `gdtToFinding: Could not find caseFolder by Id: ${activity.caseFolderId}. Error: ${err.stack || err}.`, 'warn', NAME );
                                        }

                                        if( caseFolder && Array.isArray( caseFolder ) && caseFolder.length ) {
                                            caseFolder = caseFolder[0];

                                            for( let i = 0; i < gdtMappingsForUnknownFields.length; i++ ) {
                                                const
                                                    field = gdtMappingsForUnknownFields[i],
                                                    gdtFieldNumber = field && field.gdtFieldNumber,
                                                    regexString = field && field.gdtMappingRegexString,
                                                    gdtAction = field && field.gdtMappingAction,
                                                    unknownRecords = res.unknownRecords,
                                                    unknownRecordMatchedWithGdtFieldNumber = gdtFieldNumber && unknownRecords && unknownRecords[gdtFieldNumber];

                                                if( unknownRecordMatchedWithGdtFieldNumber ) {
                                                    let [err, extractedData] = await formatPromiseResult(
                                                        Y.doccirrus.api.flow_transformers.extractDataWithRegexForFlows( {
                                                            regexChnks: gdtRegexChunks,
                                                            input: unknownRecordMatchedWithGdtFieldNumber,
                                                            title: title,
                                                            user: user,
                                                            regexString: regexString,
                                                            ignoreBeginningAndEnd: true,
                                                            component: Y.doccirrus.schemas.flow.transformerTypes.GDT_JSON
                                                        } )
                                                    );

                                                    if( err ) {
                                                        flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.regexParseError` ), user );
                                                        Y.log( `gdtToFinding: Could not parse regex input field: ${regexString}, data from GDT File: ${unknownRecordMatchedWithGdtFieldNumber}. Error: ${err.stack || err}.`, 'warn', NAME );
                                                        continue;
                                                    }
                                                    if( extractedData ) {
                                                        const caseFolderToFeeScheduleMap = {
                                                            'PUBLIC': 'EBM',
                                                            'PUBLIC_A': 'EBM',
                                                            'PRIVATE': 'GOÄ',
                                                            'PRIVATE_A': 'GOÄ',
                                                            'SELFPAYER': 'GOÄ',
                                                            'BG': 'UVGOÄ'
                                                        };

                                                        let
                                                            activityData = {
                                                                caseFolderId: activity.caseFolderId,
                                                                employeeId: activity.employeeId,
                                                                locationId: activity.locationId,
                                                                patientId: activity.patientId,
                                                                timestamp: newTimestamp
                                                            },
                                                            catalog,
                                                            treatmentInCatalog,
                                                            postedActivity,
                                                            catalogDescriptor,
                                                            desc,
                                                            workingTreatmentCode;
                                                        switch( gdtAction ) {
                                                            case 'createTreatment':
                                                                if( !extractedData.treatmentCode ) {
                                                                    flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.noTreatmentCodeFound`, {
                                                                        data:
                                                                            {
                                                                                gdtFieldNumber
                                                                            }
                                                                    } ), user );
                                                                    Y.log( `gdtToFinding: User wants to create Treatment, but there is no code in the specified line of GDT File: ${unknownRecordMatchedWithGdtFieldNumber}.`, 'warn', NAME );
                                                                    continue;
                                                                }

                                                                [err, desc] = await formatPromiseResult(
                                                                    Y.doccirrus.api.catalog.getTreatmentCatalogCatalogDescriptor( user, caseFolderToFeeScheduleMap[caseFolder.type], activity.locationId )
                                                                );

                                                                if( err || !desc ) {
                                                                    flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.notInCatalog`, {
                                                                        data: {
                                                                            gdtFieldNumber,
                                                                            actType: i18n( 'InCaseMojit.casefile_browser.new.menuitem.SERVICE' )
                                                                        }
                                                                    } ), user );
                                                                    Y.log( `gdtToFinding: Could not find given code: ${extractedData.treatmentCode} in any catalog. Error: ${err ? err.stack || err : undefined}.`, 'warn', NAME );
                                                                    continue;
                                                                }

                                                                workingTreatmentCode = extractedData.treatmentCode;
                                                                for( let j = 0; j < extractedData.treatmentCode.length; j++ ) {
                                                                    if( j > 0 ){
                                                                        workingTreatmentCode = extractedData.treatmentCode.slice( 0, -j );
                                                                    }
                                                                    [err, treatmentInCatalog] = await formatPromiseResult(
                                                                        runDb( {
                                                                            user: user,
                                                                            model: 'catalog',
                                                                            action: 'get',
                                                                            query: {
                                                                                seq: workingTreatmentCode,
                                                                                catalog: desc.filename
                                                                            },
                                                                            options: {
                                                                                lean: true
                                                                            }
                                                                        } )
                                                                    );
                                                                    if((treatmentInCatalog && Array.isArray( treatmentInCatalog ) && treatmentInCatalog.length) || err){
                                                                        break;
                                                                    }
                                                                }

                                                                if( err || !(treatmentInCatalog && Array.isArray( treatmentInCatalog ) && treatmentInCatalog.length) ) {
                                                                    flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.notInCatalog`, {
                                                                        data: {
                                                                            gdtFieldNumber,
                                                                            actType: i18n( 'InCaseMojit.casefile_browser.new.menuitem.SERVICE' ),
                                                                            number: extractedData.treatmentCode,
                                                                            catalogType: caseFolderToFeeScheduleMap[caseFolder.type]
                                                                        }
                                                                    } ), user );
                                                                    Y.log( `gdtToFinding: Could not find given code: ${extractedData.treatmentCode} in any catalog. Error: ${err ? err.stack || err : undefined}.`, 'warn', NAME );
                                                                    continue;
                                                                }

                                                                [err, activityData] = await formatPromiseResult(
                                                                    Y.doccirrus.api.lab.createActivityDataFromTreatment( {
                                                                        billable: '1',
                                                                        caseFolderId: activity.caseFolderId,
                                                                        catalog: treatmentInCatalog[0],
                                                                        employeeId: activity.employeeId,
                                                                        feeSchedule: caseFolderToFeeScheduleMap[caseFolder.type],
                                                                        gnr: treatmentInCatalog[0].seq,
                                                                        labReqId: undefined,
                                                                        locationId: activity.locationId,
                                                                        patientId: activity.patientId,
                                                                        test: undefined,
                                                                        timestamp: newTimestamp,
                                                                        user
                                                                    } )
                                                                );

                                                                if( extractedData.treatmentDescription ) {
                                                                    activityData.content = extractedData.treatmentDescription;
                                                                    activityData.userContent = extractedData.treatmentDescription;
                                                                }

                                                                if( extractedData.treatmentPrice ) {
                                                                    if( extractedData.treatmentPrice.includes( ',' ) ) {
                                                                        extractedData.treatmentPrice = extractedData.treatmentPrice.replace( /,/g, '.' );
                                                                    }
                                                                    activityData.price = parseFloat( extractedData.treatmentPrice );
                                                                }

                                                                [err, postedActivity] = await formatPromiseResult(
                                                                    _postActivity( {
                                                                        user,
                                                                        data: Y.doccirrus.filters.cleanDbObject( activityData )
                                                                    } )
                                                                );

                                                                if( err ) {
                                                                    flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.couldNotCreateActivity`, {
                                                                        data: {
                                                                            gdtFieldNumber,
                                                                            actType: i18n( 'InCaseMojit.casefile_browser.new.menuitem.SERVICE' )
                                                                        }
                                                                    } ), user );
                                                                    Y.log( `gdtToFinding: Could not create Treatment. Error: ${err.stack || err}.`, 'warn', NAME );
                                                                    continue;
                                                                }
                                                                if( postedActivity ) {
                                                                    Y.log( `gdtToFinding: Created Treatment ${postedActivity}.`, 'info', NAME );
                                                                }

                                                                break;
                                                            case 'createDiagnosis':
                                                                if( !extractedData.icd10 ) {
                                                                    flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.noIcd10CodeFound`, {data: {gdtFieldNumber}} ), user );
                                                                    Y.log( `gdtToFinding: User wants to create Diagnosis, but there is no ICD 10 code in the specified line of GDT File: ${unknownRecordMatchedWithGdtFieldNumber}.`, 'warn', NAME );
                                                                    continue;
                                                                }

                                                                catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                                                                    actType: 'DIAGNOSIS',
                                                                    short: 'ICD-10'
                                                                } );

                                                                [err, catalog] = await formatPromiseResult(
                                                                    Y.doccirrus.api.lab.getCatalog( {
                                                                        fileName: catalogDescriptor && catalogDescriptor.fileName,
                                                                        gnr: extractedData.icd10
                                                                    } )
                                                                );
                                                                if( err ) {
                                                                    flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.notInCatalog`, {
                                                                        data: {
                                                                            gdtFieldNumber,
                                                                            actType: i18n( 'InCaseMojit.casefile_browser.new.menuitem.DIAGNOSIS' ),
                                                                            number: extractedData.icd10,
                                                                            catalogType: 'ICD-10'
                                                                        }
                                                                    } ), user );
                                                                    Y.log( `gdtToFinding: Could not find given ICD-10 code: ${extractedData.icd10} in any catalog. Error: ${err.stack || err}.`, 'warn', NAME );
                                                                    continue;
                                                                }

                                                                if( catalog ) {
                                                                    activityData.code = catalog.seq;
                                                                    activityData.actType = 'DIAGNOSIS';
                                                                    activityData.diagnosisCert = 'CONFIRM';
                                                                    activityData.catalog = false;
                                                                    activityData.catalogRef = catalog.catalog;
                                                                    activityData.catalogShort = 'ICD-10';
                                                                    activityData.comment = Array.isArray( catalog.infos ) ? catalog.infos.join( ', ' ) : (catalog.infos || undefined);
                                                                    activityData.content = catalog.title;
                                                                    activityData.status = 'VALID';
                                                                    activityData.u_extra = catalog.u_extra;
                                                                    activityData.userContent = extractedData.icdDescription || catalog.title;

                                                                    [err] = await formatPromiseResult(
                                                                        promisifyArgsCallback(
                                                                            Y.doccirrus.schemas.activity._setActivityData )( {
                                                                                initData: {
                                                                                    actType: 'DIAGNOSIS',
                                                                                    catalogShort: 'ICD-10',
                                                                                    locationId: activity.locationId
                                                                                },
                                                                                entry: activityData,
                                                                                user: user
                                                                            }
                                                                        )
                                                                    );

                                                                    if( err ) {
                                                                        flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.couldNotSetDefaultValues`, {data: {actType: i18n( 'InCaseMojit.casefile_browser.new.menuitem.DIAGNOSIS' )}} ), user );
                                                                        Y.log( `gdtToFinding: Could not _setActivityData for Diagnosis. Error: ${err.stack || err}.`, 'warn', NAME );
                                                                        continue;
                                                                    }

                                                                    [err, postedActivity] = await formatPromiseResult(
                                                                        _postActivity( {
                                                                            user,
                                                                            data: Y.doccirrus.filters.cleanDbObject( activityData )
                                                                        } )
                                                                    );

                                                                    if( err ) {
                                                                        flowlog.log( title, i18n( 'flow-schema.TransformerType_E.GDT_JSON.i18n' ), i18n( `flowlog-api.errMessages.gdtAdditionalFields.couldNotCreateActivity`, {
                                                                            data: {
                                                                                gdtFieldNumber,
                                                                                actType: i18n( 'InCaseMojit.casefile_browser.new.menuitem.DIAGNOSIS' )
                                                                            }
                                                                        } ), user );
                                                                        Y.log( `gdtToFinding: Could not create Diagnosis. Error: ${err.stack || err}.`, 'warn', NAME );
                                                                        continue;
                                                                    }
                                                                    if( postedActivity ) {
                                                                        Y.log( `gdtToFinding: Created Treatment ${postedActivity}.`, 'info', NAME );
                                                                    }
                                                                }
                                                                break;
                                                            default:
                                                                break;

                                                        }

                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                callback( null, {
                                    query: patientQuery,
                                    action: {IGNORE: true},
                                    data: {}
                                } );
                            }
                        };

                        cbData.getOnlyInsuranceCaseFolder = true;
                        activity.createActivityForPatient( cbData );
                    }
                }
            } );
        };

        GdtApi.filterGdtText = function( gdtText ) {
            let filteredText = gdtText;
            var fieldBlackList = [
                "Satzidentifikation",
                "Satzlänge",
                "Verwendeter Zeichensatz",
                "GDT-ID",
                "Version GDT",
                "Patientennummer / Patientenkennung",
                "Name des Patienten",
                "Vorname des Patienten",
                "Geburtsdatum des Patienten",
                "Geschlecht des Patienten",
                "Versichertennummer des Patienten",
                "Datei-Archivierungskennung",
                "Software",
                "Release-Stand der Software",
                "Tag der Speicherung von Behandlungsdaten",
                "Betriebsstättennummer (BSNR)",
                "Fall-ID",
                "Beauftragender / verantwortl. Arzt",
                "Signatur"
            ];

            filteredText = filteredText.split( "\n" );

            let lastLineDeleted = false;
            filteredText = filteredText.filter( function( line ) {
                if( lastLineDeleted && 0 === line.indexOf( "    " ) ) {
                    return false;
                }
                if( line ) {
                    for( let i = 0; i < fieldBlackList.length; i++ ) {
                        if( 0 === line.indexOf( fieldBlackList[i] ) ) {
                            lastLineDeleted = true;
                            return false;
                        }
                    }
                }
                lastLineDeleted = false;
                return true;
            } );

            filteredText = filteredText.join( "\n" );

            return filteredText;
        };

        /**
         * export: FINDING to VIEW REQUEST
         * @method findingToGdtView
         * @param {Object} args
         * @param {Object} args.finding activity of actType FINDING
         * @param {Function} cb
         */
        GdtApi.findingToGdtView = function( args, cb ) {
            var rec = (args.finding && args.finding.g_extra && args.finding.g_extra.records && args.finding.g_extra.records[0]) || {};
            GdtApi.generateStudyDataViewRequest( {
                sender: rec.receiverGdtId,
                receiver: rec.senderGdtId,
                showOriginalId: args.showOriginalId,
                patient: {
                    firstname: rec.patientForename,
                    lastname: rec.patientName,
                    dob: rec.patientDob,
                    patientNo: rec.patientId,
                    patientNumber: 0
                },
                treatmentDate: rec.treatmentDate,
                procedure: rec.procedure,
                collDate: rec.collDate || (rec.testId && rec.testId[0] && rec.testId[0].collDate),
                encoding: args.encoding,
                originalPatient: args.patient
            }, cb );
        };

        /**
         * export: PATIENT to PATIENT DATA
         * @method patientToGdtPatient
         * @param {Object} args
         * @param {String} args.encoding - encoding
         * @param {Boolean} [args.ignoreLen] - ignore length restriction on fields
         * @param {Object} args.options - Options Object
         * @param {Object} args.patient - Patient Object
         * @param {String} [args.receiver] identifier. len: 8
         * @param {String} [args.sender] identifier. len: 8
         * @param {Boolean} args.showOriginalId - Manipulate patientId (i.e. patientNo) by removing leading 0's from it
         * @param {String} args.version - GDT Version
         * @param {Function} cb
         */
        GdtApi.patientToGdtPatient = function( args, cb ) {
            switch( args.version ) {
                case 'gdt30':
                    GdtApi.generatePatientData30( {
                            encoding: args.encoding || DEFAULT_ENCODING,
                            ignoreLen: args.ignoreLen,
                            gdtVersion: args.version,
                            options: args.options,
                            patient: args.patient,
                            receiver: args.receiver,
                            sender: args.sender,
                            showOriginalId: args.showOriginalId,
                            user: args.user,
                            location: args.location,
                            customLocation: args.customLocation,
                            customEmployee: args.customEmployee,
                            lastSchein: args.lastSchein,
                            selectedActivities: args.selectedActivities
                        },
                        cb
                    );
                    break;
                case 'gdt21':
                default:
                    GdtApi.generatePatientData( {
                            encoding: args.encoding || DEFAULT_ENCODING,
                            ignoreLen: args.ignoreLen,
                            gdtVersion: args.version,
                            options: args.options,
                            patient: args.patient,
                            receiver: args.receiver,
                            sender: args.sender,
                            showOriginalId: args.showOriginalId,
                            user: args.user,
                            location: args.location,
                            customLocation: args.customLocation,
                            customEmployee: args.customEmployee,
                            lastSchein: args.lastSchein,
                            selectedActivities: args.selectedActivities
                        },
                        cb
                    );
                    break;
            }
        };

        /**
         * This method is called when the user wants to export patient to study request i.e. create GDT file containing
         * patient details.
         *
         * If 'selectedCasefolderId' is given then GDT file is created with schein details based on
         * 'selectedCasefolderId' and also insurance details is picked based on 'selectedCasefolderId' while creating
         * GDT file.
         *
         * If 'selectedCasefolderId' is NOT provided then GDT file is created without insurance/schein details
         *
         * @method patientToGdtStudy
         *
         * @param {Object} args
         * @param {Object} args.user - User Object
         * @param {String<"gdt30" or "gdt21">} args.version - Version of GDT generator to use
         * @param {Object} args.patient - Patient whose details are to be exported in GDT file
         * @param {Boolean} args.ignoreLen - ignore length restriction on fields
         * @param {String} [args.sender] - identifier. len: 8 i.e. senderGdtId
         * @param {String} [args.receiver] - identifier. len: 8 i.e receiverGdtId
         * @param {Boolean} [args.encoding] - gdt encoding to use
         * @param {Object} args.employee - employee object
         * @param {Object} args.location - location object
         * @param {Object} args.options - Options object
         * @param {String} args.procedure - type of study, e.g. "EKG01"
         * @param {String} [args.testId] - freely defined ID for this test
         * @param {Boolean} args.showOriginalId - Manipulate patientId (i.e. patientNo) by removing leading 0's from it
         * @param {Array} [args.selectedActivities] - Selected Activities in CaseFolder
         * @param {String} [args.selectedCasefolderId] - The casefolder (insurance) on which user wants to export
         *     patient details
         * @param {Function} callback - will be called by callback(error || null, Buffer)
         *
         * @return {Promise<Buffer>}
         */
        GdtApi.patientToGdtStudy = async function( args, callback ) {
            const {
                encoding,
                employee,
                ignoreLen,
                location,
                options,
                patient,
                procedure,
                receiver,
                selectedActivities,
                selectedCasefolderId,
                sender,
                showOriginalId,
                testId,
                user,
                version
            } = args;

            let
                err,
                result,
                casefolderObj,
                scheinObj;

            // ---------------------- 1. Query casefolder ------------------------------------------------------------
            if( selectedCasefolderId ) {
                [err, result] = await formatPromiseResult(
                    runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'get',
                        query: {_id: selectedCasefolderId}
                    } )
                );

                if( err ) {
                    Y.log( `patientToGdtStudy: Error while querying casefolder by _id: ${selectedCasefolderId}. Error: ${err.stack || err}. Stopping...`, "error", NAME );
                    return callback( errors.rest( 400, err, true ) );
                }

                if( !result || !Array.isArray( result ) || !result.length ) {
                    Y.log( `patientToGdtStudy: No casefolder found for provided casefolder id: ${selectedCasefolderId}. Stopping...`, "error", NAME );
                    return callback( `Invalid casefolder id: ${selectedCasefolderId} provided` );
                }

                casefolderObj = result[0];
            }
            // -------------------------------- 1. END ---------------------------------------------------------------

            if( version === "gdt30" ) {
                // -------------------- 2. If 'casefolderObj' is present then query schein --------------------------
                if( casefolderObj ) {
                    [err, result] = await formatPromiseResult(
                        runDb( {
                            user: user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                $or: [
                                    {actType: {$in: ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN']}}
                                ],
                                caseFolderId: casefolderObj._id.toString(),
                                patientId: patient._id,
                                timestamp: {
                                    $lte: new Date()
                                }
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `patientToGdtStudy: Error while querying schein for caseFolderId: ${casefolderObj._id} and patientId: ${patient._id}. Error: ${err.stack || err}. Stopping...`, "error", NAME );
                        return callback( errors.rest( 400, err, true ) );
                    }

                    if( result && Array.isArray( result ) && result.length ) {
                        scheinObj = result[0];
                    }
                }
                // ------------------------------------- 2. END ------------------------------------------------------

                return GdtApi.generateStudyDataRequest30( {
                    casefolderObj: casefolderObj,
                    employee: employee,
                    encoding: encoding || DEFAULT_ENCODING,
                    ignoreLen: ignoreLen,
                    location: location,
                    options: options,
                    patient: patient,
                    procedure: procedure,
                    receiver: receiver,
                    schein: scheinObj,
                    sender: sender,
                    selectedActivities: selectedActivities,
                    showOriginalId: showOriginalId,
                    testId: testId
                }, callback );
            } else {
                GdtApi.generateStudyDataRequest( {
                    casefolderObj: casefolderObj,
                    encoding: encoding || DEFAULT_ENCODING,
                    ignoreLen: ignoreLen,
                    options: options,
                    patient: patient,
                    procedure: procedure,
                    receiver: receiver,
                    sender: sender,
                    showOriginalId: showOriginalId,
                    testId: testId
                }, callback );
            }
        };

        GdtApi.test = function( args ) {
            var testId = "5423ad0b4434016a04f12ae9";

            GdtApi.generateStudyDataRequest(
                {
                    sender: "EDV1",
                    receiver: "SONO",
                    patientId: xdtTools.trimObjectId( testId, 10 ),
                    patient: {
                        firstname: "J",
                        lastname: "M",
                        dob: new Date()
                    },
                    procedure: "SONO00",
                    testId: "Sonografie?!"

                },
                function( err, res ) {
                    if( err ) {
                        Y.log( `generateStudyDataRequest err: ${err}`, 'warn', NAME );
                    }
                    if( res ) {
                        xdtParser.parse( {
                            data: res,
                            xdt: "gdt",
                            callback: function( err, res ) {
                                if( err ) {
                                    Y.log( `err: ${err}`, 'warn' );
                                }
                                if( res ) {
                                    xdtTools.prettyPrint( res );
                                }
                                args.callback( err, res );
                            }
                        } );
                    }
                }
            );
        };

        /**
         * generator for "Stammdaten anfordern" (6300)
         * requests patient data
         * @method generatePatientDataRequest
         * @param {Object} [argsIn]
         * @param {String} [argsIn.sender] identifier. len: 8?
         * @param {String} [argsIn.receiver] identifier. len: 8?
         * @param {String} [argsIn.patientId] patientId. len: 10?
         * @param {Function} [argsIn.callback]
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        GdtApi.generatePatientDataRequest = function( argsIn, cb ) {
            var args = argsIn || {},
                gdt = xdtVersions.gdt.gdt21,
                encoding = args.encoding || DEFAULT_ENCODING;

            //pad defaults to space/" ", padStart to false
            return xdtTools.metaRecordBuilder(
                "patientDataRequest",
                [
                    {key: "receiverGdtId", val: args.receiver, optional: true},
                    {key: "senderGdtId", val: args.sender, optional: true},
                    {key: "encoding", val: xdtTools.getEncodingId( encoding, gdt )},
                    {key: "gdtVersion", val: gdt.version},
                    {key: "patientId", val: args.patientId || "0", padStart: true}
                ],
                gdt,
                encoding,
                false,
                cb || argsIn.callback
            );
        };

        /**
         * generator for "Stammdaten übermitteln" (6301)
         * creates patient data to be sent
         *
         * GDT PATIENT Export 21
         *
         * @method generatePatientData
         * @param {Object} args
         * @param {Function} [args.callback] - callback
         * @param {String} args.encoding - encoding
         * @param {Boolean} [args.ignoreLen] - ignore length restriction on fields
         * @param {Object} args.options - Options Object
         * @param {Object} args.patient - patient object from DB
         * @param {String} [args.receiver] - identifier. len: 8
         * @param {String} [args.sender] - identifier. len: 8
         * @param {Array<module:activitySchema.activity>} [args.selectedActivities] - selected activities from frontend
         * @param {Boolean} [args.showOriginalId] - Manipulate patientId (i.e. patientNo) by removing leading 0's from
         *     it
         * @param {Function} [cb] - callback
         *
         * @return {Buffer}
         */
        GdtApi.generatePatientData = async function( args, cb ) {
            const {
                callback,
                encoding,
                ignoreLen,
                options,
                patient,
                receiver,
                sender,
                selectedActivities,
                showOriginalId,
                user,
                // customEmployee,
                customLocation,
                lastSchein
            } = args;

            const
                gdt = xdtVersions.gdt.gdt21,
                ins = Patient.getInsuranceByType( patient, "PUBLIC" ),
                patLoc = Patient.getAddressByKind( patient, "OFFICIAL" ),
                patientHeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'HEIGHT' ),
                patientWeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'WEIGHT' );
                // customEmployeeId = customEmployee && customEmployee._id;

            let fields = [];

            //pad defaults to space/" ", padStart to false
            fields.push(
                {key: "receiverGdtId", val: receiver, optional: true}, // 8315
                {key: "senderGdtId", val: sender, optional: true}, // 8316
                {key: "encoding", val: xdtTools.getEncodingId( encoding, gdt )}, // 9206
                {key: "gdtVersion", val: gdt.version}, // 9218
                {key: "patientId", val: getPatientId( patient, showOriginalId ), padStart: true}, // 3000
                {key: "patientNameAdd", val: patient.nameaffix, optional: true}, // 3100
                {key: "patientName", val: patient.lastname}, // 3101
                {key: "patientForename", val: patient.firstname}, // 3102
                {key: "patientDob", val: moment( patient.kbvDob, "DD.MM.YYYY" ).toDate()}, // 3103
                {key: "patientTitle", val: patient.title, optional: true}, // 3104
                {key: "patientInsNo", val: (ins && ins.insuranceNo) || "0"}, // 3105
                {key: "patientCity", val: patLoc && patLoc.city}, // 3106
                {key: "patientStreet", val: (patLoc && `${patLoc.street} ${patLoc.houseno}`)}, // 3107
                {key: "insuranceKind", val: ins && ins.insuranceKind}, // 3108
                {key: "patientGender", val: genderMap[patient.gender] || "1"}, // 3110
                {
                    key: "patientHeight",
                    val: (options && options.exportMedData) && patientHeight && patientHeight.value && (parseFloat( patientHeight.value ) * 100).toString()
                }, // 3622
                {key: "patientWeight", val: (options && options.exportMedData) && patientWeight && patientWeight.value} // 3623
                //3628: patientNativelang
            );

            if( options.mapBSNR && options.mapBSNRTo !== undefined ) {
                if( gdt.fields.hasOwnProperty( options.mapBSNRTo.toString() ) ) {
                    let err, selectedLocation;
                    if(
                        selectedActivities && Array.isArray( selectedActivities ) &&
                        selectedActivities.length > 0
                    ) {
                        [err, selectedLocation] = await formatPromiseResult(
                            runDb( {
                                user: user,
                                model: 'location',
                                action: 'get',
                                query: {
                                    _id: selectedActivities[0].locationId
                                },
                                options: {
                                    lean: true
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `Could not get location: ${err.stack || err}, fallback to last Schein or user location.`, 'info', NAME );
                        }

                        if(
                            selectedLocation && Array.isArray( selectedLocation ) &&
                            selectedLocation.length > 0
                        ) {
                            fields.push( {
                                key: gdt.fields[options.mapBSNRTo.toString()].attribute,
                                val: selectedLocation[0].commercialNo
                            } );
                        }
                    } else {
                        fields.push( {
                            key: gdt.fields[options.mapBSNRTo.toString()].attribute,
                            val: (customLocation && customLocation.commercialNo) || args.location.commercialNo
                        } );
                    }
                } else {
                    fields.push( {
                        key: "bsnr",
                        val: (customLocation && customLocation.commercialNo) || args.location.commercialNo
                    } ); // 0201
                }
            }

            if( options.mapCaseFolderId && options.mapCaseFolderIdTo !== undefined ) {
                if( gdt.fields.hasOwnProperty( options.mapCaseFolderIdTo.toString() ) ) {
                    fields.push( {
                        key: gdt.fields[options.mapCaseFolderIdTo.toString()].attribute,
                        val: `DCcaseFolderId: ${patient.activeCaseFolderId}`
                    } );
                } else {
                    fields.push( {
                        key: "caseFolderId",
                        val: `DCcaseFolderId: ${patient.activeCaseFolderId}`
                    } ); // 8310
                }
            }

            if( options.mapResponsibleDoctor && options.mapResponsibleDoctorTo !== undefined ) {
                const employeeId = (selectedActivities && Array.isArray( selectedActivities ) &&
                                  selectedActivities.length && selectedActivities[0].employeeId) ||
                                 (lastSchein && lastSchein.employeeId) || '';
                if( gdt.fields.hasOwnProperty( options.mapResponsibleDoctorTo.toString() ) ) {
                    fields.push( {
                        key: gdt.fields[options.mapResponsibleDoctorTo.toString()].attribute,
                        val: `DCdoctorId: ${employeeId}`
                    } );
                } else {
                    fields.push( {
                        key: "responsibleDoctor",
                        val: `DCdoctorId: ${employeeId}`
                    } ); // 8491
                }
            }

            if( options.mapEmployeeId && options.mapEmployeeIdTo !== undefined ) {
                if( gdt.fields.hasOwnProperty( options.mapEmployeeIdTo.toString() ) ) {
                    fields.push( {
                        key: gdt.fields[options.mapEmployeeIdTo.toString()].attribute,
                        val: `DCemployeeId: ${user.specifiedBy}`
                    } );
                } else {
                    fields.push( {
                        key: "signature",
                        val: `DCemployeeId: ${user.specifiedBy}`
                    } ); // 8990
                }
            }

            return xdtTools.metaRecordBuilder( "patientData", fields, gdt, encoding, ignoreLen, cb || callback );
        };

        /**
         * generator for "Stammdaten übermitteln" (6301)
         * creates patient data to be sent
         *
         * GDT PATIENT Export 30
         *
         * @method generatePatientData30
         * @param {Object} args
         * @param {Function} [args.callback] - callback
         * @param {String} args.encoding - encoding
         * @param {Boolean} [args.ignoreLen] - ignore length restriction on fields
         * @param {Object} args.options - Options Object
         * @param {Object} args.patient - patient object from DB
         * @param {String} [args.receiver] - identifier. len: 8
         * @param {String} [args.sender] - identifier. len: 8
         * @param {Boolean} [args.showOriginalId] - Manipulate patientId (i.e. patientNo) by removing leading 0's from
         *     it
         * @param {Function} [cb] - callback
         *
         * @return {Buffer}
         */
        GdtApi.generatePatientData30 = function( args, cb ) {
            const {
                callback,
                encoding,
                ignoreLen,
                options,
                patient,
                receiver,
                sender,
                showOriginalId
            } = args;

            const
                gdt = xdtVersions.gdt.gdt30,
                ins = Patient.getInsuranceByType( patient, "PUBLIC" ),
                patLoc = Patient.getAddressByKind( patient && patient.addresses, "OFFICIAL" ),
                patientHeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'HEIGHT' ),
                patientWeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'WEIGHT' ),
                pkg = Y.config.insuite;

            let
                fields = [],
                kopfCount = 8,
                patCount = 7,
                diagCount = 2;

            //pad defaults to space/" ", padStart to false

            fields.push( {key: "objType", val: "Obj_Kopfdaten"} ); // 8200
            if( receiver ) {
                fields.push( {key: "receiverGdtId", val: receiver} ); // 8315
                kopfCount++;
            }
            if( sender ) {
                fields.push( {key: "senderGdtId", val: sender, optional: true} ); // 8316
                kopfCount++;
            }
            fields.push(
                {key: "dateOfCreation", val: moment(), optional: true}, // 9103
                {key: "encoding", val: xdtTools.getEncodingId( encoding, gdt )}, // 9206
                {key: "gdtVersion", val: gdt.version}, // 9218
                {key: "sv", val: pkg.author.name}, // 0102
                {key: "sw", val: pkg.description}, // 0103
                {key: "swVersion", val: pkg.version}, // 0132
                {key: "objEntries", val: kopfCount} // 8201
            );
            //---

            fields.push(
                {key: "objType", val: "Obj_Patient"}, // 8200
                {key: "patientId", val: getPatientId( patient, showOriginalId ), padStart: true} // 3000
            );
            if( patient.nameaffix ) {
                fields.push( {key: "patientNameAdd", val: patient.nameaffix, optional: true} ); // 3100
                patCount++;
            }
            fields.push(
                {key: "patientName", val: patient.lastname}, // 3101
                {key: "patientForename", val: patient.firstname}, // 3102
                {key: "patientDob", val: moment( patient.kbvDob, "DD.MM.YYYY" ).toDate()} // 3103
            );
            if( patient.title ) {
                fields.push( {key: "patientTitle", val: patient.title, optional: true} ); // 3104
                patCount++;
            }
            fields.push( {key: "patientInsNo", val: (ins && ins.insuranceNo) || '0'} );// 3105
            if( patLoc && patLoc.zip && patLoc.city ) {
                fields.push( {key: "patientCity", val: `${patLoc.zip} ${patLoc.city}`} );// 3106
                patCount++;
            }
            if( patLoc && patLoc.street && patLoc.houseno ) {
                fields.push( {key: "patientStreet", val: (patLoc && `${patLoc.street} ${patLoc.houseno}`)} ); // 3107
                patCount++;
            }
            if( ins && ins.insuranceKind ) {
                fields.push( {key: "insuranceKind", val: ins.insuranceKind} ); // 3108
                patCount++;
            }
            if( patient && patient.gender ) {
                fields.push( {key: "patientGender", val: genderMap[patient.gender] || "1"} ); // 3110
                patCount++;
            }
            if( patLoc && patLoc.countryCode ) {
                fields.push( {key: "patientCountrycode", val: patLoc.countryCode} ); // 3114
                patCount++;
            }
            if( patLoc && patLoc.addon && options.mapPatientLocationAddon && options.mapPatientLocationAddonTo !== undefined ) {
                if( gdt.fields.hasOwnProperty( options.mapPatientLocationAddonTo.toString() ) ) {
                    fields.push( {
                        key: gdt.fields[options.mapPatientLocationAddonTo.toString()].attribute,
                        val: patLoc.addon
                    } );
                } else {
                    fields.push( {key: "patientLocationAddon", val: patLoc.addon} ); // 3115
                }
                patCount++;
            }
            fields.push( {key: "objEntries", val: patCount} ); // 8201
            //---

            if( (options && options.exportMedData) && (patientHeight || patientWeight) ) {
                fields.push( {key: "objType", val: "Obj_Basisdiagnostik"} ); // 8200
                if( patientHeight ) {
                    fields.push( {
                        key: "patientHeight",
                        val: patientHeight.value && (parseFloat( patientHeight.value ) * 100).toString()
                    } ); // 3622
                    diagCount++;
                }
                if( patientWeight ) {
                    fields.push( {key: "patientWeight", val: patientWeight.value} ); // 3623
                    diagCount++;
                }
                fields.push( {key: "objEntries", val: diagCount} ); // 8201
            }

            return xdtTools.metaRecordBuilder( "patientData", fields, gdt, encoding, ignoreLen, cb || callback );
        };

        function getDiagnosisConfidenceFromDiagnosisCert( diagnosisCert ) {
            const map = {
                "CONFIRM": "G",
                "TENTATIVE": "V",
                "ASYMPTOMATIC": "Z",
                "EXCLUDE": "A"
            };

            return map[diagnosisCert];
        }

        /**
         * generator for "Neue Untersuchung anfordern" (6302)
         * requests a new study to be made/potentially sent
         *
         * GDT STUDY Export 30
         *
         * @method generateStudyDataRequest30
         * @param {Object} args
         * @param {Function} [args.callback] - callback
         * @param {Object} [args.casefolderObj] - casefolderObj
         * @param {Object} args.employee - Employee Object
         * @param {String} args.encoding - encoding
         * @param {Boolean} [args.ignoreLen] - ignore length restriction on fields
         * @param {Object} args.location - Location Object
         * @param {Object} args.options - Options Object
         * @param {Object} args.patient - patient object from DB
         * @param {String} [args.procedure] - type of study, e.g. "EKG01"
         * @param {String} [args.receiver] - identifier. len: 8
         * @param {Object} args.schein - Schein Activity
         * @param {String} [args.sender] - identifier. len: 8
         * @param {Array} [args.selectedActivities] - selectedActivities
         * @param {Boolean} [args.showOriginalId] - Manipulate patientId (i.e. patientNo) by removing leading 0's from
         *     it
         * @param {String} args.testId - freely defined ID for this test
         * @param {Function} cb
         *
         * @return {Buffer}
         */
        GdtApi.generateStudyDataRequest30 = function( args, cb ) {
            const {
                callback,
                casefolderObj,
                employee,
                encoding,
                ignoreLen,
                location,
                options,
                patient,
                procedure,
                receiver,
                schein,
                sender,
                selectedActivities,
                showOriginalId,
                testId
            } = args;

            const
                gdt = xdtVersions.gdt.gdt30,
                ins = casefolderObj && Patient.getInsuranceByType( patient, casefolderObj.type ),
                patLoc = Patient.getAddressByKind( patient && patient.addresses, "OFFICIAL" ),
                patientHeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'HEIGHT' ),
                patientWeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'WEIGHT' ),
                pkg = Y.config.insuite;

            let
                fields = [],
                kopfCount = 8,
                patCount = 5,
                diagCount = 2,
                diagnosisCount = 2,
                labTestCount = 2,
                empCount = 6;

            fields.push( {key: "objType", val: "Obj_Kopfdaten"} ); // 8200
            if( receiver ) {
                fields.push( {key: "receiverGdtId", val: receiver} ); // 8315
                kopfCount++;
            }
            if( sender ) {
                fields.push( {key: "senderGdtId", val: sender, optional: true} ); // 8316
                kopfCount++;
            }
            fields.push(
                {key: "dateOfCreation", val: moment(), optional: true}, // 9103
                {key: "encoding", val: xdtTools.getEncodingId( encoding, gdt )}, // 9206
                {key: "gdtVersion", val: gdt.version}, // 9218
                {key: "sv", val: pkg.author.name}, // 0102
                {key: "sw", val: pkg.description}, // 0103
                {key: "swVersion", val: pkg.version}, // 0132
                {key: "objEntries", val: kopfCount} // 8201
            );
            //---

            fields.push(
                {key: "objType", val: "Obj_Patient"}, // 8200
                {key: "patientId", val: getPatientId( patient, showOriginalId ), padStart: true} // 3000
            );
            if( patient.nameaffix ) {
                fields.push( {key: "patientNameAdd", val: patient.nameaffix} ); // 3100
                patCount++;
            }
            fields.push(
                {key: "patientName", val: patient.lastname}, // 3101
                {key: "patientForename", val: patient.firstname}, // 3102
                {key: "patientDob", val: moment( patient.kbvDob, "DD.MM.YYYY" ).toDate()} // 3103
            );
            if( patient.title ) {
                fields.push( {key: "patientTitle", val: patient.title} ); // 3104
                patCount++;
            }
            if( ins ) {
                fields.push( {key: "patientInsNo", val: ins.insuranceNo || "0"} );// 3105
                patCount++;
            }
            if( patLoc && patLoc.zip && patLoc.city ) {
                fields.push( {key: "patientCity", val: `${patLoc.zip} ${patLoc.city}`} );// 3106
                patCount++;
            }
            if( patLoc && patLoc.street && patLoc.houseno ) {
                fields.push( {key: "patientStreet", val: (patLoc && `${patLoc.street} ${patLoc.houseno}`)} ); // 3107
                patCount++;
            }
            if( ins && ins.insuranceKind ) {
                fields.push( {key: "insuranceKind", val: ins.insuranceKind} ); // 3108
                patCount++;
            }
            if( patient && patient.gender ) {
                fields.push( {key: "patientGender", val: genderMap[patient.gender] || "1"} ); // 3110
                patCount++;
            }
            if( patLoc && patLoc.zip && patLoc.city ) {
                fields.push( {key: "patientZip", val: patLoc.zip} ); // 3112
                patCount++;
            }
            if( patLoc && patLoc.countryCode ) {
                fields.push( {key: "patientCountrycode", val: patLoc.countryCode} ); // 3114
                patCount++;
            }
            if( patLoc && patLoc.addon ) {
                fields.push( {key: "patientLocationAddon", val: patLoc.addon} ); // 3115
                patCount++;
            }
            if( patient && patient.communications && Array.isArray( patient.communications ) && patient.communications.length > 0 ) {
                const mobileNo = patient.communications.find( com => com.type === 'MOBILEPRIV' );
                const email = patient.communications.find( com => com.type === 'EMAILPRIV' || com.type === 'EMAILJOB' );
                fields.push(
                    {key: "patientMobile", val: (mobileNo && mobileNo.value) || ""}, // 3618
                    {key: "patientEmail", val: (email && email.value) || ""} // 3619
                );
                patCount += 2;
            }
            fields.push( {key: "objEntries", val: patCount} ); // 8201
            if( ins ) {
                fields.push(
                    {key: "objType", val: "Obj_Versichertenkarte"}, // 8200
                    {key: "payerName", val: ins.insuranceName}, // 0202, 2002
                    {key: "cardType", val: ins.cardType}, // 3004
                    {key: "cardCdmVersion", val: ins.cdmVersion}, // 3006
                    {key: "insuranceVKNR", val: ins.insuranceGrpId}, // 4104
                    {key: "payerBillingArea", val: ins.costCarrierBillingSection}, // 4106
                    {key: "insurancelastCardReadOfQuarter", val: (ins.cardSwipe ? ins.cardSwipe : "")}, // 4109
                    {key: "insuranceValidToDate", val: ins.fk4110 ? moment( ins.fk4110 ).format( "MMYY" ) : ""}, // 4110
                    {key: "insuranceNo", val: ins.insuranceId}, // 4111
                    {key: "insuranceStatus", val: ""}, // 4112
                    {key: "insuranceStatusAdditionDMP", val: ins.dmp}, // 4113
                    {key: "insuranceFeeSchedule", val: ins.feeSchedule || '3'}, // 4121
                    {key: "insuranceBillingArea", val: (schein && schein.scheinBillingArea) || "00"}, // 4122
                    {key: "objEntries", val: "14"} // 8201
                );
            }
            fields.push(
                {key: "objType", val: "Obj_Anforderung"}, // 8200
                {key: "recordRequestId", val: "1"}, // 8310
                {key: "recordRequestUid", val: "Export"}, // 8314
                {key: "procedure", val: procedure}, // 8402
                {key: "objEntries", val: "5"} // 8201
            );
            if( (options && options.exportMedData) && (patientHeight || patientWeight) ) {
                fields.push( {key: "objType", val: "Obj_Basisdiagnostik"} ); // 8200
                if( patientHeight ) {
                    fields.push( {
                        key: "patientHeight",
                        val: patientHeight.value && (parseFloat( patientHeight.value ) * 100).toString()
                    } ); // 3622
                    diagCount++;
                }
                if( patientWeight ) {
                    fields.push( {key: "patientWeight", val: patientWeight.value} ); // 3623
                    diagCount++;
                }
                fields.push( {key: "objEntries", val: diagCount} ); // 8201
            }
            // fields.push( {key: "objType", val: "Obj_Dauermedikament"} ); // 8200
            // fields.push( {key: "objType", val: "Obj_Dauerdiagnose"} ); // 8200

            const selectedDiagnosis = selectedActivities && selectedActivities.filter( activity => activity.actType === 'DIAGNOSIS' );

            fields.push(
                {key: "objType", val: "Obj_Überweisung"}, // 8200
                {key: "assignment", val: "Aufnahme"}, // 4205
                {
                    key: "diagnosis_suspected",
                    val: (selectedDiagnosis && selectedDiagnosis[0] && selectedDiagnosis.content) || "-"
                }, // 4207
                {key: "assigment_diag_suspicion", val: "-"}, // 4209
                {key: "refBSNR", val: location.commercialNo}, // 4218
                {key: "refLANR", val: employee.officialNo}, // 4242
                {key: "refFromOther", val: "-"}, // 4219
                {key: "refTo", val: "-"}, // 4220
                {key: "treatmentType", val: "1"}, // 4221
                {key: "followUpOfKnownInfection", val: "0"}, // 4231
                {key: "objEntries", val: "11"} // 8201
            );

            if( selectedDiagnosis && selectedDiagnosis.length > 0 && options.exportDiagnosis ) {
                fields.push( {key: "objType", val: "Obj_Diagnose"} ); // 8200
                for( let diagnosis of selectedDiagnosis ) {
                    if( diagnosis.code && diagnosis.diagnosisCert && diagnosis.userContent ) {
                        fields.push(
                            {key: "icd", val: diagnosis.code}, // 6001
                            {
                                key: "confidence",
                                val: getDiagnosisConfidenceFromDiagnosisCert( diagnosis.diagnosisCert )
                            }, // 6003
                            {key: "derogation", val: diagnosis.userContent} // 6008
                        );
                        diagnosisCount += 3;
                    }
                }
                fields.push( {key: "objEntries", val: diagnosisCount} ); // 8201
            }

            // fields.push( {key: "objType", val: "Obj_Anhang"} ); // 8200
            fields.push(
                {key: "objType", val: "Obj_RgEmpfänger"}, // 8200
                {key: "recipientName", val: patient.lastname}, // 8601
                {key: "recipientTitleForename", val: patient.firstname} // 8602
            );
            if( patLoc ) {
                fields.push(
                    {key: "recipientCity", val: patLoc.city}, // 8606
                    {key: "recipientStreetHouseno", val: `${patLoc.street} ${patLoc.houseno}`} // 8607
                );
                empCount += 2;
            }
            fields.push(
                {key: "billingType", val: "K"}, // 8609
                {key: "privateCharges", val: "2"}, // 8610
                {key: "objEntries", val: empCount} // 8201
            );

            fields.push( {key: "objType", val: "Obj_Labortest"} ); // 8200

            const pregnancy = patient && patient.latestMedData && patient.latestMedData.find( medData => medData.type === 'LAST_MENSTRUATION_P' );
            const pregnancyValue = pregnancy !== undefined;
            if( pregnancyValue ) {
                fields.push( {key: "pregnancy", val: pregnancyValue ? '1' : '0'} ); // 8510
                labTestCount++;
            }

            const
                thisDate = moment(),
                pregDate = pregnancy && moment( pregnancy.textValue, 'DD.MM.YYYY' );

            if( pregDate ) {
                let weeks = thisDate.diff( pregDate, 'weeks' );
                pregDate.add( weeks, 'weeks' );
                const days = thisDate.diff( pregDate, 'days' );

                if( weeks < 10 ) {
                    weeks = `0${weeks}`;
                }

                fields.push( {key: "pregnancyGestationLen", val: `${weeks}${days}`} ); // 8511
                labTestCount++;
            }
            if( pregnancy && pregnancy.textValue ) {
                fields.push( {
                    key: "pregnancyFirstDayOfCycle",
                    val: moment( pregnancy.textValue, 'DD.MM.YYYY' ).toDate()
                } ); // 8512
                labTestCount++;
            }
            fields.push( {key: "objEntries", val: labTestCount} ); // 8201

            fields.push(
                {key: "sampleId", val: testId, optional: true} // 8410
            );
            // fields.push( {key: "objType", val: "Obj_Arztidentifikation"} ); // 8200

            //pad defaults to space/" ", padStart to false
            return xdtTools.metaRecordBuilder( "studyDataRequest", fields, gdt, encoding, ignoreLen, cb || callback );
        };

        /**
         * generator for "Neue Untersuchung anfordern" (6302)
         * requests a new study to be made/potentially sent
         *
         * GDT STUDY Export 21
         *
         * @method generateStudyDataRequest
         * @param {Object} args
         * @param {Function} [args.callback] - callback
         * @param {Object} [args.casefolderObj] - casefolderObj
         * @param {String} args.encoding - encoding
         * @param {Boolean} [args.ignoreLen] - ignore length restriction on fields
         * @param {Object} args.options - Options Object
         * @param {Object} args.patient - patient object from DB
         * @param {String} [args.procedure] - type of study, e.g. "EKG01"
         * @param {String} [args.receiver] - identifier. len: 8
         * @param {String} [args.sender] - identifier. len: 8
         * @param {Boolean} [args.showOriginalId] - Manipulate patientId (i.e. patientNo) by removing leading 0's from
         *     it
         * @param {String} args.testId - freely defined ID for this test
         * @param {Function} cb
         *
         * @return {Buffer}
         */
        GdtApi.generateStudyDataRequest = function( args, cb ) {
            const {
                callback,
                casefolderObj,
                encoding,
                ignoreLen,
                options,
                patient,
                procedure,
                receiver,
                sender,
                showOriginalId,
                testId
            } = args;

            const
                gdt = xdtVersions.gdt.gdt21,
                ins = casefolderObj && Patient.getInsuranceByType( patient, casefolderObj.type ),
                patLoc = Patient.getAddressByKind( patient && patient.addresses, "OFFICIAL" ),
                patientHeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'HEIGHT' ),
                patientWeight = patient && patient.latestMedData && patient.latestMedData.length > 0 && patient.latestMedData.find( medData => medData.type === 'WEIGHT' ),
                pkg = Y.config.insuite;

            let fields = [];

            fields.push(
                {key: "receiverGdtId", val: receiver, optional: true}, // 8315
                {key: "senderGdtId", val: sender, optional: true}, // 8316
                {key: "encoding", val: xdtTools.getEncodingId( encoding, gdt )}, // 9206
                {key: "gdtVersion", val: gdt.version}, // 9218
                {key: "sv", val: pkg.author.name, optional: true}, // 0102
                {key: "sw", val: pkg.description, optional: true}, // 0103
                {key: "swVersion", val: pkg.version, optional: true}, // 0132
                {key: "patientId", val: getPatientId( patient, showOriginalId ), padStart: true}, // 3000
                {key: "patientNameAdd", val: patient.nameaffix, optional: true}, // 3100
                {key: "patientName", val: patient.lastname}, // 3101
                {key: "patientForename", val: patient.firstname}, // 3102
                {key: "patientDob", val: moment( patient.kbvDob, "DD.MM.YYYY" ).toDate()}, // 3103
                {key: "patientTitle", val: patient.title, optional: true}, // 3104
                {key: "patientInsNo", val: (ins && ins.insuranceNo) || "0"}, // 3105
                {key: "patientcity", val: patLoc && patLoc.zip && patLoc.city && (`${patLoc.zip} ${patLoc.city}`)}, // 3106
                {
                    key: "patientStreet",
                    val: patLoc && patLoc.street && patLoc.houseno && (`${patLoc.street} ${patLoc.houseno}`)
                }, // 3107
                {key: "insuranceKind", val: ins && ins.insuranceKind}, // 3108
                {key: "patientGender", val: genderMap[patient.gender] || "1"} // 3110
            );

            if( (options && options.exportMedData) && (patientHeight || patientWeight) ) {
                if( patientHeight ) {
                    fields.push( {
                        key: "patientHeight",
                        val: patientHeight.value && (parseFloat( patientHeight.value ) * 100).toString()
                    } ); // 3622
                }
                if( patientWeight ) {
                    fields.push( {key: "patientWeight", val: patientWeight.value} ); // 3623
                }
            }

            fields.push(
                //3628: patientNativelang ?
                {key: "procedure", val: procedure, optional: true}, // 8402
                {key: "testId", val: testId, optional: true} // 8410
            );

            fields.push(
                {key: "insuranceFeeSchedule", val: (ins && ins.feeSchedule) || '3'} // 4121
            );

            //pad defaults to space/" ", padStart to false
            return xdtTools.metaRecordBuilder( "studyDataRequest", fields, gdt, encoding, ignoreLen, cb || callback );
        };

        /**
         * generator for "Daten einer Untersuchung zeigen" (6311)
         * shows the given study result on the device (?)
         *
         * GDT VIEW Export
         *
         * @method generateViewStudyRequest
         * @param {Object} args
         * @param {String} [args.encoding] - encoding
         * @param {String} [args.sender] identifier. len: 8
         * @param {String} [args.receiver] identifier. len: 8
         * @param {String} [args.patient] patient object from DB
         * @param {String} [args.treatmentDate] date/time of the study to be viewed
         * @param {String} [args.procedure] type of study, e.g. "EKG01"
         * @param {String} [args.collDate] date/time of a single reading
         * @param {Function} [args.callback]
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        GdtApi.generateStudyDataViewRequest = function( args, cb ) {
            const
                pat = args.patient,
                gdt = xdtVersions.gdt.gdt21,
                encoding = args.encoding || DEFAULT_ENCODING;

            let dob;
            if( pat.kbvDob ) {
                dob = moment( pat.kbvDob, "DD.MM.YYYY" );
            } else if( pat.dob ) {
                dob = moment( pat.dob );
            }

            //pad defaults to space/" ", padStart to false
            return xdtTools.metaRecordBuilder(
                "studyDataViewRequest",
                [
                    {key: "receiverGdtId", val: args.receiver, optional: true}, // 8315
                    {key: "senderGdtId", val: args.sender, optional: true}, // 8316
                    {key: "encoding", val: xdtTools.getEncodingId( encoding, gdt ), optional: true}, // 9206
                    {key: "gdtVersion", val: gdt.version}, // 9218
                    {key: "patientId", val: getPatientId( args.patient, args.showOriginalId ), padStart: true}, // 3000
                    {key: "patientNameAdd", val: pat.nameaffix, optional: true}, // 3100
                    {key: "patientName", val: pat.lastname, optional: true}, // 3101
                    {key: "patientForename", val: pat.firstname, optional: true}, // 3102
                    {key: "patientDob", val: dob && dob.toDate(), optional: true}, // 3103
                    {key: "patientTitle", val: pat.title, optional: true}, // 3104
                    {key: "treatmentDate.date", val: args.treatmentDate, optional: true}, // 6200
                    {key: "treatmentDate.time", val: args.treatmentDate, optional: true}, // 6201
                    {key: "procedure", val: args.procedure, optional: true}, // 8402
                    {key: "collDate.date", val: args.collDate, optional: true}, // 8432
                    {key: "collDate.time", val: args.collDate, optional: true} // 8439
                ],
                gdt,
                encoding,
                false,
                cb || args.callback
            );
        };

        //function dbg(msg) {Y.log("\x1b[90mgdt-api debug: "+msg+"\x1b[0m", "debug", NAME);}

        Y.namespace( 'doccirrus.api' ).gdt = GdtApi;

    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'patient-schema',
            'dcerror',
            'xdttools',
            'xdtparser',
            'gdt_v_21',
            'gdt_v_30',
            'gdt_v_dicomPACS',
            'dcsdmanager',
            'devicelog-api',
            'flowlog',
            'activity-api',
            'gdtlog-api',
            'gdtlog-schema'
        ]
    }
);
