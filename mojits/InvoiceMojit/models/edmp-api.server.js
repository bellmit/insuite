/*global YUI */


YUI.add( 'edmp-api', function( Y, NAME ) {
        const
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            getModel = Promise.promisify( Y.doccirrus.mongodb.getModel ),
            updateActivity = Y.doccirrus.edmputils.updateActivity,
            removeFile = Y.doccirrus.edocutils.removeFile,
            resetEdocStatus = Y.doccirrus.edocutils.resetEdocStatus,
            createMedDataUtil = Y.doccirrus.edmputils.createMedData,
            mapMedDataWithEdmpActivity = Y.doccirrus.edmputils.mapMedDataWithEdmpActivity,
            getPathsToSync = Y.doccirrus.edmpIndicationMappings.getPathsToSync,
            ObjectID = require( 'mongodb' ).ObjectID,
            getConcurrentIndicationsForActivity = Y.doccirrus.edmputils.getConcurrentIndicationsForActivity,
            createLastDocsPipeline = Y.doccirrus.edmputils.createLastDocsPipeline,
            isMedDataEdmpDataTransferEnabled = Y.doccirrus.edmputils.isMedDataEdmpDataTransferEnabled,
            getLatestMeddataForPatient = Y.doccirrus.edmputils.getLatestMeddataForPatient,
            mergePathsByActType = Y.doccirrus.edmpcommonutils.mergePathsByActType,
            mappedMergePathsByActType = Y.doccirrus.edmpcommonutils.mappedMergePathsByActType,
            calculateFollowUpEdmpHeadDate = Y.doccirrus.edmpcommonutils.calculateFollowUpEdmpHeadDate,
            compareDatesAndReturnLaterDate = Y.doccirrus.edmpcommonutils.compareDatesAndReturnLaterDate,
            {formatPromiseResult} = require( 'dc-core' ).utils;


        // api

        function getPatientsLastFirstDoc( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.getPatientsLastFirstDoc', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.getPatientsLastFirstDoc');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.actType || !params.patientId || !params.timestamp || !params.caseFolderId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            runDb( {
                user: user,
                model: 'activity',
                query: {
                    caseFolderDisabled: {$ne: true},
                    patientId: params.patientId,
                    actType: params.actType,
                    caseFolderId: params.caseFolderId,
                    timestamp: {
                        $lt: params.timestamp
                    },
                    status: {
                        $ne: "CANCELLED"
                    },
                    // [MOJ-10727] bugfix, was not set to first, although function name suggests this
                    dmpType : "FIRST"
                },
                options: {
                    limit: 1,
                    sort: {timestamp: -1},
                    lean: true
                }
            } ).then( docs => {
                callback( null, docs );
            } ).catch( err => {
                Y.log( `could not get patients last first documenation: ${  err}`, 'error', NAME );
                callback( err );
            } );
        }

        /**
         * [MOJ-10727]
         * This functions loads all dmp documentations within the casefile for this patient.
         * This is used, e.g., to determine the latest diagnosis of cancer for BK, or other statistical relevant properties.
         * Mainly, this is required to determine the correct dmpDocumentationInterval for follow-up documentations.
         * @param {Object} args
         * @return {Function} callback
         */
        function collectDiagnosisChainInfo( args ) {
            Y.log( 'Entering Y.doccirrus.api.edmp.collectDiagnosisChainInfo', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.edmp.collectDiagnosisChainInfo' );
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.actType || !params.patientId || !params.timestamp || !params.caseFolderId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            /**
             * first, we get all BK dmp documentations, to be able to search them for diagnosis dates
             */
            runDb( {
                user: user,
                model: 'activity',
                query: {
                    caseFolderDisabled: {$ne: true},
                    patientId: params.patientId,
                    caseFolderId: params.caseFolderId,
                    timestamp: {
                        $lt: params.timestamp
                    },
                    status: {
                        $ne: "CANCELLED"
                    }
                },
                options: {
                    sort: {timestamp: -1},
                    lean: true
                }
            } ).then( docs => {
                let
                    latestDiagnosisDate = null,
                    remoteMetastasesFound = false,
                    firstDocumentationExists = false,
                    firstDocumentationIsPreOperative = false,
                    postOperativeDocumentationExists = false,
                    physicianChangedOnce = false,
                    i, doc,
                    docCount = (docs && docs.length) ? docs.length : 0,
                    docIds = [];

                // go through all documentations and check their properties
                for( i = 0; i < docCount; i++ ) {
                    doc = docs[i];

                    /// push the id to the array of ids
                    docIds.push( doc._id );

                    // collect activity-type specific data
                    switch( doc.actType ) {

                        // get the BK-relevant diagnosis-dates, and compare them to the previously set latest-diagnosis-date
                        case "BK":
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, doc.dmpInitialManifestationOfPrimaryTumor );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, doc.dmpManifestationOfContralateralBreastCancer );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, doc.dmpManifestationOfLocoregionalRecurrence_following_date );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, doc.dmpLocoregionalRecurrence );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, doc.dmpManifestationOfLocoregionalRecurrence_following_date );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, doc.dmpFirstConfirmationOfRemoteMetastases );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, doc.dmpManifestationOfRemoteMetastases_following_date );

                            // if no remoteMetastases were found in the history yet, check, if this doc is diagnosing one
                            if( !remoteMetastasesFound ) {
                                switch (true) {
                                    case !!doc.dmpFirstConfirmationOfRemoteMetastases:
                                    case !!doc.dmpManifestationOfRemoteMetastases_following_date:
                                    case doc.dmpRegistrationFor === "REMOTE_METASTASES":
                                        remoteMetastasesFound = true;
                                }
                            }
                            break;

                    }

                    // dmpType-dependent statistics
                    switch( doc.dmpType ) {
                        // first-time documentations
                        case "FIRST":
                            firstDocumentationExists = true;

                            // if no direct treatment status is given, obtain one from other parameters, if available
                            switch( true ) {
                                case doc.dmpCurrentTreatmentStatus === 'OPERATION_PLANNED':
                                case doc.dmpCurrentTreatmentStatus === 'OPERATION_NOT_PLANNED':
                                case doc.dmpPerformedSurgicalTherapy_4_23 instanceof Array && doc.dmpPerformedSurgicalTherapy_4_23.indexOf( 'OPERATION_PLANNED' ) !== -1:
                                case doc.dmpPerformedSurgicalTherapy_4_23 instanceof Array && doc.dmpPerformedSurgicalTherapy_4_23.indexOf( 'OPERATION_NOT_PLANNED' ) !== -1:
                                case doc.dmpPerformedSurgicalTherapy instanceof Array && doc.dmpPerformedSurgicalTherapy.indexOf( 'NO_OPERATION' ) !== -1:
                                    firstDocumentationIsPreOperative = true;
                                    break;
                                default:
                                    firstDocumentationIsPreOperative = false;
                            }
                            break;

                        // post-operative first-time documentations
                        case "PNP":
                            postOperativeDocumentationExists = true;
                            break;

                        case "FOLLOWING":
                            break;
                    }

                    // type-independent changes
                    if( doc.dmpPhsicianChanged ) {
                        physicianChangedOnce = true;
                    }

                }
                callback( null, {
                    latestDiagnosisDate,
                    remoteMetastasesFound,
                    firstDocumentationExists,
                    firstDocumentationIsPreOperative,
                    postOperativeDocumentationExists,
                    physicianChangedOnce,
                    docIds
                } );
            } ).catch( err => {
                Y.log( `could not get patients BK dmp history : ${  err}`, 'error', NAME );
                callback( err );
            } );
        }

        function checkEdmpCaseNo( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.checkEdmpCaseNo', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.checkEdmpCaseNo');
            }
            const
                user = args.user,
                patientId = args.originalParams && args.originalParams.patientId,
                edmpCaseNo = args.originalParams && args.originalParams.edmpCaseNo,
                callback = args.callback;

            if( !patientId || !edmpCaseNo ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            runDb( {
                user: user,
                model: 'patient',
                action: 'count',
                query: {
                    _id: {$ne: patientId},
                    edmpCaseNo: edmpCaseNo
                }
            } ).then( count => {
                callback( null, {valid: !count} );
            } ).catch( err => {
                Y.log( `could check edmp case no: ${  err}`, 'error', NAME );
                callback( err );
            } );

        }

        function getLastDocStatus( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.getLastDocStatus', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.getLastDocStatus');
            }
            const
                user = args.user,
                callback = args.callback;

            getModel( user, 'activity' ).then( activityModel => {
                return new Promise( ( resolve, reject ) => {
                    activityModel.mongoose.aggregate( createLastDocsPipeline(), ( err, result ) => (err ? reject( err ) : resolve( result )) );
                } );
            } ).then( result => callback( null, result ) ).catch( err => callback( err ) );
        }

        function isEdmpCaseNoLocked( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.isEdmpCaseNoLocked', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.isEdmpCaseNoLocked');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.patientId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            runDb( {
                user: user,
                model: 'activity',
                action: 'count',
                query: {
                    patientId: params.patientId,
                    dmpDeliveryRef: {$ne: null},
                    actType: {$in: Y.doccirrus.schemas.casefolder.eDmpTypes}
                }
            } )
                .then( count => 0 < count )
                .then( isLocked => callback( null, {isLocked} ) )
                .catch( err => callback( err ) );
        }

        function syncConcurrentIndicationForPatient( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.syncConcurrentIndicationForPatient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.syncConcurrentIndicationForPatient');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            let activityModel; // eslint-disable-line no-unused-vars
            // [Didn't want to break anything. See TODOOO below...]

            if( !(params.activityId || params.activity ) ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            let activity,
                pathsToSync;

            getModel( user, 'activity', true ).then( model => {
                activityModel = model;
                activityModel = activityModel;

                return Promise.resolve( params.activity || runDb( { // TODOOO change this looks like an anti pattern and errors may get swallowed?
                        user: user,
                        model: 'activity',
                        query: {
                            _id: params.activityId,
                            caseFolderDisabled: {$ne: true}
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    } ).get( 0 ) ).then( _activity => {
                    activity = _activity;
                    if( !activity ) {
                        throw Error( 'activity not found' );
                    }
                    pathsToSync = getPathsToSync( activity.actType );
                    return getConcurrentIndicationsForActivity( user, activity, pathsToSync );
                } );
            } ).each( concurrentDoc => {
                let concurrentDocActType = concurrentDoc.actType,
                    updateData = {};

                pathsToSync.forEach( entry => {
                    let path = entry.path;
                    if( -1 !== entry.actTypes.indexOf( concurrentDocActType ) && activity[path] ) {
                        updateData[path] = activity[path];
                    }
                } );

                if( 0 === Object.keys( updateData ).length ) {
                    return;
                }
                Y.log( `sync concurrent edmp doc: paths ${  Object.keys( updateData )  } from ${  activity._id  } to ${  concurrentDoc._id}`, 'debug', NAME );

                return runDb( {
                    user: user,
                    model: 'activity',
                    action: 'put',
                    query: {
                        _id: new ObjectID( concurrentDoc._id )
                    },
                    data: Y.doccirrus.filters.cleanDbObject( JSON.parse( JSON.stringify( updateData ) ) ),
                    fields: Object.keys( updateData )
                } ).then( () => {
                    Y.log( 'could save and valdiate concurrent indications', 'debug', NAME );
                    return null;
                } ).catch( err => {
                    if( 'ValidationError' !== err.name ) {
                        throw err;
                    }
                    Y.log( `could not update concurrent indications because of validation error:${  err  } attempt to update without validation`, 'debug', NAME );
                    updateData.status = 'CREATED'; // manually set status to CREATED TODOOO check if calling fsm.create works, too?
                    resetEdocStatus( updateData );
                    return updateActivity( user, new ObjectID( concurrentDoc._id ), updateData ).then( () => {
                        if( !concurrentDoc.dmpFileId ) {
                            return null;
                        }
                        return removeFile( user, concurrentDoc.dmpFileId );
                    } );
                } );
            } ).then( result => {
                Y.log( 'sucessfully synced concurrent edmp docs', 'debug', NAME );
                callback( null, result );
            } ).catch( err => {
                Y.log( `could not sync concurrent edmp docs ${  err && err.stack || err}`, 'error', NAME );
                callback( err );
            } );

        }

        function setAddressee( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.setAddressee', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.setAddressee');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.activityId || !params.addressee || !params.dmpDeliveryInfo ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            updateActivity( user, params.activityId, {
                dmpAddressee: params.addressee,
                dmpDeliveryInfo: params.dmpDeliveryInfo
            } ).then( () => callback() ).catch( err => callback( err ) );
        }

        function setPrintedFlag( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.setPrintedFlag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.setPrintedFlag');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.activityId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            updateActivity( user, params.activityId, {dmpPrintStatus: 'PRINTED'} ).then( () => callback() ).catch( err => callback( err ) );
        }

        function createMedData( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.createMedData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.createMedData');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            createMedDataUtil( user, params.activity ).then( () => {
                callback();
            } ).catch( err => {
                Y.log( `could not create medData from edmp activty ${  err}`, 'error', NAME );
                callback( err );
            } );
        }

        function getMergeData( args ) {
            Y.log('Entering Y.doccirrus.api.edmp.getMergeData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.getMergeData');
            }
            const
                {user, originalParams, callback} = args,
                _ = require( 'lodash' );

            if( !originalParams.actType || !originalParams.patientId || !originalParams.caseFolderId || !originalParams.timestamp ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            let paths = mergePathsByActType[originalParams.actType];
            let mappedPaths = mappedMergePathsByActType[originalParams.actType];

            if( !paths && !mappedPaths) {
                Y.log( `createMergeData: could not get mergePaths for edmp type ${  originalParams.actType}`, 'error', NAME );
                return callback( Error( `createMergeData: could not get mergePaths for edmp type ${  originalParams.actType}` ) );
            }

            Promise.props( {
                lastDoc: runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        actType: originalParams.actType,
                        patientId: originalParams.patientId,
                        caseFolderId: originalParams.caseFolderId,
                        timestamp: {
                            $lt: originalParams.timestamp
                        }
                    },
                    options: {
                        sort: {
                            timestamp: -1
                        },
                        limit: 1
                    }
                } ).get( 0 ),
                medData: isMedDataEdmpDataTransferEnabled( user ).then( isEnabled => {
                    if( isEnabled ) {
                        return getLatestMeddataForPatient( user, originalParams.patientId );
                    } else {
                        return Promise.resolve( null );
                    }
                } )
            } ).then( result => {
                const
                    doc = result.lastDoc,
                    medData = result.medData,
                    schema = Y.doccirrus.schemas.activity.schema,
                    medDataOverrides = {};


                if( medData && medData.length ) {
                    let mappedMedData = mapMedDataWithEdmpActivity( medData, {actType: originalParams.actType} );
                    delete mappedMedData.actType;


                    Object.keys( mappedMedData ).forEach( key => {
                        let value = mappedMedData[key];
                        if( doc[key] !== value ) {
                            doc[key] = value;
                            medDataOverrides[key] = true;
                        }
                    } );

                    // inject also non kbv conform paths if optional MEDATA/eDMP sync option is enabled
                    [].push.apply( paths, Object.keys( mappedMedData ) );
                    paths = _.uniq( paths );
                }

                if(paths) {
                    result = paths.map( path => {
                        let docValueForPath = doc[path],
                            schemaEntry = schema[path],
                            valueDisplay, arr;

                        if( schemaEntry.list ) {
                            arr = (Array.isArray( docValueForPath ) ? docValueForPath : [docValueForPath]).filter( Boolean );
                            valueDisplay = arr.map( function( value ) {
                                var translation;
                                schemaEntry.list.some( listEntry => {
                                    if( value === listEntry.val ) {
                                        translation = listEntry.i18n;
                                        return true;
                                    }
                                } );
                                return translation;
                            } ).join( ', ' );
                        } else {
                            valueDisplay = docValueForPath;
                        }

                        return {
                            value: docValueForPath,
                            valueDisplay: valueDisplay,
                            path: path,
                            i18n: schemaEntry.i18n,
                            overridden: Boolean( medDataOverrides[path] )
                        };
                    } ).filter( function( obj ) {
                        return obj.value;
                    } );
                }
                else if(mappedPaths) {
                    result = mappedPaths.map( entry => {
                        let docValueForPath = doc[entry.origin],
                            schemaEntry = schema[entry.target],
                            valueDisplay, arr;

                        if( schemaEntry.list ) {
                            arr = (Array.isArray( docValueForPath ) ? docValueForPath : [docValueForPath]).filter( Boolean );
                            valueDisplay = arr.map( function( value ) {
                                var translation;
                                schemaEntry.list.some( listEntry => {
                                    if( value === listEntry.val ) {
                                        translation = listEntry.i18n;
                                        return true;
                                    }
                                } );
                                return translation;
                            } ).join( ', ' );
                        } else {
                            valueDisplay = docValueForPath;
                        }

                        return {
                            value: docValueForPath,
                            valueDisplay: valueDisplay,
                            path: entry.target,
                            i18n: schemaEntry.i18n,
                            overridden: false
                        };
                    } ).filter( function( obj ) {
                        return obj.value;
                    } );
                }

                callback( null, result );
            } ).catch( err => {
                callback( err );
            } );
        }

        function createEdmpDoc( args ) {
            Y.log( 'Entering Y.doccirrus.api.edmp.createEdmpDoc', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.edmp.createEdmpDoc' );
            }
            const
                moment = require( 'moment' ),
                {user, originalParams, callback} = args;

            return Promise.resolve().then( () => {
                if( !originalParams.patientId || !originalParams.edmpType || !originalParams.caseFolderId ) {
                    throw Error( 'insufficient arguments' );
                }
                return runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: originalParams.edmpType,
                        patientId: originalParams.patientId,
                        status: {$in: ['CREATED', 'VALID', 'INVALID']}
                    }
                } );
            } ).then( count => {
                if( 0 < count ) {
                    throw new Y.doccirrus.commonerrors.DCError( 28009 );
                }
                return runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        actType: originalParams.edmpType,
                        patientId: originalParams.patientId,
                        status: 'SENT'
                        // dmpDocVersion: 1
                    },
                    options: {
                        lean: true,
                        sort: {
                            dmpSentDate: -1
                        },
                        select: {
                            actType: 1,
                            dmpQuarter: 1,
                            dmpYear: 1,
                            dmpDocumentationInterval: 1,
                            locationId: 1,
                            employeeId: 1,
                            caseFolderId: 1,
                            patientId: 1
                        }
                    }
                } );
            } ).get( 0 ).then( doc => {

                /**
                 * If there is no sent eDMP documentation for this patient, create the initial first documentation.
                 */
                if( !doc ) {
                    let today = moment();
                    return Y.doccirrus.edmputils.createFirstDocumentation( user, {
                        patientId: originalParams.patientId,
                        caseFolderId: originalParams.caseFolderId,
                        employeeId: originalParams.employeeId,
                        locationId: originalParams.locationId,
                        actType: originalParams.edmpType,
                        dmpHeadDate: today.toDate(), // set dmp head date only once activity is created [eDMP Anforderungskatalog P1-14]
                        dmpQuarter: today.quarter(),
                        dmpYear: today.year()
                    } );
                }

                /**
                 * Else, one has to create a follow-up documentation
                 * with the given interval after the preceding documentation.
                 * In general, this will be doc.dmpDocumentationInterval = "EVERY_SECOND_QUARTER",
                 * but it may differ for some eDMPs.
                 */
                const dmpHeadDateMoment = calculateFollowUpEdmpHeadDate( doc, true );
                return Y.doccirrus.edmputils.createFollowingDocumentation( user, {
                    dmpQuarter: dmpHeadDateMoment.quarter(),
                    dmpYear: dmpHeadDateMoment.year(),
                    timestamp: new Date(),
                    dmpHeadDate: dmpHeadDateMoment.toDate(),
                    dmpDocumentationInterval: doc.dmpDocumentationInterval,
                    caseFolderId: doc.caseFolderId,
                    employeeId: doc.employeeId,
                    locationId: doc.locationId,
                    patientId: doc.patientId,
                    actType: doc.actType,
                    dmpNeedsMergeAcknowledgment: true
                } );
            } ).then( () => {
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'refreshCaseFolder',
                    msg: {
                        data: {
                            caseFolderId: originalParams.caseFolderId
                        }
                    }
                } );
                callback( null );
            } ).catch( err => {
                callback( err );
            } );
        }

        /**
         * This method creates a new document of HGV bzw. HGVK in the database. It checks if there is a existing
         * casefolder ond/or document for the current patient. If none of this in the db it generates new entries.
         * If new documents are made it emits a refresh event for the casefolder.
         * @param {Object}      args
         * @param {Object}      args.user: current active user.
         * @param {String}      args.originalparams: patientID, caseFolderID and timestamp.
         * @param {Function}    args.callback: callback for error message.
         * @returns {Promise <DCError>}
         */
        async function createHgvDoc( args ) {
            let
                err,
                result;

            Y.log('Entering Y.doccirrus.api.edmp.createHgvDoc', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.createHgvDoc');
            }
            const
                eHgvActTypes = Y.doccirrus.schemas.activity.eHgvActTypes,
                moment = require( 'moment' ),
                {user, originalParams, callback } = args;

            let _dob = moment(originalParams.dob, "YYYY/MM/DD"),
                age = null;

            if(_dob.isValid()) {
                age = moment().diff(_dob, 'years', false);
            }

            [err, result] = await formatPromiseResult( runDb( {
                user,
                model: 'activity',
                action: 'count',
                query: {
                    actType: {$in: eHgvActTypes},
                    patientId: originalParams.patientId,
                    status: {$in: ['CREATED', 'VALID', 'INVALID']}
                }
            } ) );

            if( err ) {
                Y.log( `error loading hgv casefolder count for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                return callback(new Y.doccirrus.commonerrors.DCError( `error loading hgv casefolder count for patientID: ${originalParams.patientId}` ));
            }

            if( 0 < result ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 28009 ) );
            }

            [err, result] = await formatPromiseResult( runDb( {
                user: user,
                model: 'activity',
                query: {
                    actType: {$in: eHgvActTypes},
                    patientId: originalParams.patientId,
                    status: 'SENT'
                    // dmpDocVersion: 1
                },
                options: {
                    lean: true,
                    sort: {
                        dmpSentDate: -1
                    },
                    select: {
                        actType: 1,
                        dmpQuarter: 1,
                        dmpYear: 1,
                        dmpDocumentationInterval: 1,
                        locationId: 1,
                        employeeId: 1,
                        caseFolderId: 1,
                        patientId: 1
                    }
                }
            } ).get(0));

            if( err ) {
                Y.log( `error loading hgv casefolder document for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                return callback(new Y.doccirrus.commonerrors.DCError( `error loading hgv casefolder document for patientID: ${originalParams.patientId}` ));
            }

            if( !result ) {
                let today = moment();
                const isAdult = age >= 18;
                [err] = await formatPromiseResult( Y.doccirrus.edmputils.createFirstDocumentation( user, {
                    patientId: originalParams.patientId,
                    caseFolderId: originalParams.caseFolderId,
                    actType: isAdult ? 'HGV' : 'HGVK',
                    dmpHeadDate: today.toDate(), // set dmp head date only once activity is created [eDMP Anforderungskatalog P1-14]
                    dmpQuarter: today.quarter(),
                    dmpYear: today.year(),
                    dmpAge: isAdult ? 'ADULT' : 'CHILD'
                } ) );

                if( err ) {
                    Y.log( `error creating first hgv document for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( `error creating first hgv document for patientID: ${originalParams.patientId}` ) );
                }
            }
            else {
                const
                    // calculate the follow-up edmp-date from the last-document's edmp documentation interval
                    dmpHeadDateMoment = calculateFollowUpEdmpHeadDate( result , true ),
                    isAdult = (age >= 18);

                [err] = await formatPromiseResult( Y.doccirrus.edmputils.createFollowingDocumentation( user, {
                    dmpQuarter: dmpHeadDateMoment.quarter(),
                    dmpYear: dmpHeadDateMoment.year(),
                    timestamp: new Date(),
                    dmpHeadDate: dmpHeadDateMoment.toDate(),
                    dmpDocumentationInterval: result.dmpDocumentationInterval,
                    caseFolderId: result.caseFolderId,
                    employeeId: result.employeeId,
                    locationId: result.locationId,
                    patientId: result.patientId,
                    actType: isAdult ? 'HGV' : 'HGVK',
                    dmpNeedsMergeAcknowledgment: true,
                    dmpAge: isAdult ? 'ADULT' : 'CHILD'
                } ) );

                if( err ) {
                    Y.log( `error creating following hgv document for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( `error creating following hgv document for patientID: ${originalParams.patientId}` ) );
                }
            }

            Y.doccirrus.communication.emitEventForSession( {
                sessionId: user.sessionId,
                event: 'refreshCaseFolder',
                msg: {
                    data: {
                        caseFolderId: originalParams.caseFolderId
                    }
                }
            } );
            return callback( null );
        }

        /**
         * This method creates a new document of zervix zytologie in the database. It checks if there is a existing
         * casefolder ond/or document for the current patient. If none of this in the db it generates new entries.
         * If new documents are made it emits a refresh event for the casefolder.
         * @param {Object}      args
         * @param {Object}      args.user: current active user.
         * @param {String}      args.originalparams: patientID, caseFolderID and timestamp.
         * @param {Function}    args.callback: callback for error message.
         * @returns {Promise <DCError>}
         */
        async function createZervixZytologieDoc( args ) {
            let
                err,
                result;

            Y.log( 'Entering Y.doccirrus.api.edmp.createZervixZytologieDoc', 'info', NAME );

            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmp.createZervixZytologieDoc');
            }
            const
                eZervixZytologieActTypes = Y.doccirrus.schemas.activity.eZervixZytologieActTypes,
                moment = require( 'moment' ),
                {user, originalParams, callback } = args;

            [err, result] = await formatPromiseResult( runDb( {
                user,
                model: 'activity',
                action: 'count',
                query: {
                    actType: {$in: eZervixZytologieActTypes},
                    patientId: originalParams.patientId,
                    status: {$in: ['CREATED', 'VALID', 'INVALID']}
                }
            } ) );

            if( err ) {
                Y.log( `error loading zervix zytologie casefolder for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                return callback(new Y.doccirrus.commonerrors.DCError( `error loading zervix zytologie casefolder for patientID: ${originalParams.patientId}` ));
            }

            if( 0 < result ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 28009 ) );
            }

            [err, result] = await formatPromiseResult( runDb( {
                user: user,
                model: 'activity',
                query: {
                    actType: {$in: eZervixZytologieActTypes},
                    patientId: originalParams.patientId,
                    status: 'SENT'
                    // dmpDocVersion: 1
                },
                options: {
                    lean: true,
                    sort: {
                        dmpSentDate: -1
                    },
                    select: {
                        actType: 1,
                        dmpQuarter: 1,
                        dmpYear: 1,
                        dmpDocumentationInterval: 1,
                        locationId: 1,
                        employeeId: 1,
                        caseFolderId: 1,
                        patientId: 1
                    }
                }
            } ).get(0));

            if( err ) {
                Y.log( `error loading zervix zytologie document for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                return callback (new Y.doccirrus.commonerrors.DCError( `error loading zervix zytologie document for patientID: ${originalParams.patientId}` ));
            }

            if( !result ) { // if there is no document, make one
                let today = moment();
                [err, result] = await formatPromiseResult( Y.doccirrus.edmputils.createFirstDocumentation( user, {
                    patientId: originalParams.patientId,
                    caseFolderId: originalParams.caseFolderId,
                    actType: 'ZERVIX_ZYTOLOGIE',
                    dmpHeadDate: today.toDate(), // set dmp head date only once activity is created [eDMP Anforderungskatalog P1-14]
                    dmpQuarter: today.quarter(),
                    dmpYear: today.year()
                } ) );

                if( err ) {
                    Y.log( `error creating first zervix zytologie document for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( `error creating first zervix zytologie document for patientID: ${originalParams.patientId}` ) );
                }
            }
            else {
                const
                    dmpHeadDateMoment = calculateFollowUpEdmpHeadDate( result , true );

                [err, result] = await formatPromiseResult( Y.doccirrus.edmputils.createFollowingDocumentation( user, {
                    dmpQuarter: dmpHeadDateMoment.quarter(),
                    dmpYear: dmpHeadDateMoment.year(),
                    timestamp: new Date(),
                    dmpHeadDate: dmpHeadDateMoment.toDate(),
                    dmpDocumentationInterval: result.dmpDocumentationInterval,
                    caseFolderId: result.caseFolderId,
                    employeeId: result.employeeId,
                    locationId: result.locationId,
                    patientId: result.patientId,
                    actType: 'ZERVIX_ZYTOLOGIE',
                    dmpNeedsMergeAcknowledgment: true
                } ) );

                if( err ) {
                    Y.log( `error creating following zervix zytologie document for patientID: ${originalParams.patientId}: ${err && err.stack || err}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( `error creating following zervix zytologie document for patientID: ${originalParams.patientId}` ) );
                }
            }

            Y.doccirrus.communication.emitEventForSession( {
                sessionId: user.sessionId,
                event: 'refreshCaseFolder',
                msg: {
                    data: {
                        caseFolderId: originalParams.caseFolderId
                    }
                }
            } );
            return callback( null );
        }

        Y.namespace( 'doccirrus.api' ).edmp = {

            name: NAME,
            getPatientsLastFirstDoc: getPatientsLastFirstDoc,
            collectDiagnosisChainInfo,
            checkEdmpCaseNo: checkEdmpCaseNo,
            getLastDocStatus: getLastDocStatus,
            isEdmpCaseNoLocked: isEdmpCaseNoLocked,
            syncConcurrentIndicationForPatient: syncConcurrentIndicationForPatient,
            setAddressee: setAddressee,
            setPrintedFlag: setPrintedFlag,
            createMedData: createMedData,
            getMergeData: getMergeData,
            createEdmpDoc: createEdmpDoc,
            createHgvDoc: createHgvDoc,
            createZervixZytologieDoc: createZervixZytologieDoc
        };

    },
    '0.0.1', {requires: ['casefolder-schema', 'edmp-utils', 'edmp-filebuilder', 'edoc-filewriter', 'tempdir-manager', 'xpm', 'activity-schema', 'edmp-commonutils', 'edmp-indication-mappings', 'activity-schema']}
);
