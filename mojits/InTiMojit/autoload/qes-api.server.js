/**
 * User: do
 * Date: 28.01.21  17:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

YUI.add( 'ti-qes', async function( Y, NAME ) {
    const {logEnter, logExit} = require( `../../../server/utils/logWrapping.js` )( Y, NAME );
    const {handleResult, formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;
    const {basename} = require( 'path' );
    const getObject = Y.doccirrus.commonutils.getObject;
    const SIGN_PROCESS_MAX_STACK_SIZE_BYTES = 250 * 1000000; // 250mb

    function postAuditActivity( user, activityId, error ) {
        Y.doccirrus.api.audit.postKimSignEntry( user, 'activity', activityId, error );
    }

    function postAuditMedia( user, mediaId, error ) {
        Y.doccirrus.api.audit.postKimSignEntry( user, 'media', mediaId, error );
    }

    function extractErrorFromTiResponse( response ) {
        const tiError = getObject( 'cause.root.Envelope.Body.Fault.detail.Error.Trace', response );
        if( !tiError ) {
            return response;
        }
        return {code: tiError.Code, message: tiError.ErrorText, originalError: tiError};
    }

    function getFile( user, id ) {
        return new Promise( ( resolve, reject ) => {
            Y.doccirrus.gridfs.get( user, id, ( err, id ) => {
                if( err ) {
                    return reject( err );
                }
                resolve( id );
            } );
        } );
    }

    async function createSignRequestsForActivity( args ) {
        const {user, activity, warnings, contentTypes, signRequests, fileStats, kimIncludeRevocationInfo} = args;
        const ti = Y.doccirrus.dcTi.getTi();
        const {SignatureTypeEnum, MimeTypeEnum} = ti;
        const attachedMediaIdsToSign = activity.attachedMedia
            .filter( attachedMedia => contentTypes.includes( attachedMedia.contentType ) )
            .map( attachedMedia => attachedMedia.mediaId );

        if( !attachedMediaIdsToSign.length ) {
            const error = Y.doccirrus.errors.rest( '11411' );
            postAuditActivity( user, activity._id, error );
            warnings.push( error );
            return;
        }

        let [err, fsFiles] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'fs.files',
            query: {filename: {$in: attachedMediaIdsToSign}}
        } ) );

        if( err ) {
            Y.log( `signDocuments: could not get fs.files of activity ${activity._id}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        let media;
        [err, media] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'media',
            query: {_id: {$in: attachedMediaIdsToSign}}
        } ) );

        if( err ) {
            Y.log( `signDocuments: could not get media of activity ${activity._id}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        for( let attachedMediaIdToSign of attachedMediaIdsToSign ) {
            const mediaObj = media.find( _mediaObj => _mediaObj._id.toString() === attachedMediaIdToSign );
            if( !mediaObj ) {
                throw Y.doccirrus.errors.rest( `could not find mediaObj ${attachedMediaIdToSign} of activity ${activity._id}`, true );
            }
            const fsFile = fsFiles.find( file => file.filename === attachedMediaIdToSign );
            if( !fsFile ) {
                throw  Y.doccirrus.errors.rest( 500, `could not find fsFile filename=${attachedMediaIdToSign} of activity ${activity._id}`, true );
            }

            fileStats.stackFileSize += fsFile.length;

            if( fileStats.stackFileSize > SIGN_PROCESS_MAX_STACK_SIZE_BYTES ) {
                throw Y.doccirrus.errors.rest( 11412, '', true );
            }

            let buffer;
            [err, buffer] = await formatPromiseResult( getFile( user, fsFile._id ) );

            if( err ) {
                throw Y.doccirrus.errors.rest( 500, `could not get fsFile buffer of filename=${attachedMediaIdToSign} of activity ${activity._id}: ${err.stack || err}`, true );
            }

            // TODO: determine signature type by contentType: application/pdf (DC) -> application/pdf-a (KONNEKTOR)
            signRequests.push( {
                    RequestID: mediaObj._id.toString(),
                    OptionalInputs: {
                        SignatureType: SignatureTypeEnum.PDF
                    },
                    Document: {
                        DokumentID: `${activity.actType}-${mediaObj._id.toString()}`,
                        ShortText: basename( mediaObj.name ),
                        MimeType: MimeTypeEnum.PDF,
                        DocumentData: buffer.data.toString( 'base64' ),
                        IncludeRevocationInfo: kimIncludeRevocationInfo
                    }
                }
            );
            return activity;
        }
    }

    async function storeFile( user, filename, options = {}, buffer ) {
        return new Promise( ( resolve, reject ) => {
            function storedCb( err, id ) {
                if( err ) {
                    return reject( err );
                }
                resolve( id );
            }

            Y.doccirrus.gridfs.store( user, filename, options, buffer, storedCb );
        } );
    }

    function removeFile( user, id ) {
        return new Promise( function( resolve, reject ) {
            function deletedCb( err ) {
                if( err ) {
                    return reject( err );
                }
                resolve();
            }

            Y.doccirrus.gridfs.delete( user, id, deletedCb );
        } );
    }

    async function exchangeFile( {user, mediaId, base64Data, params} ) {
        let [err, [originalFile]] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'fs.files',
            query: {filename: mediaId},
            options: {
                lean: true,
                limit: 1
            }
        } ) );

        if( err ) {
            Y.log( `exchangeFile: JobNumber ${params.JobNumber} could not fetch fs.files by filename(mediaId) ${mediaId}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        [err] = await formatPromiseResult( storeFile( user, mediaId, {}, Buffer.from( base64Data, 'base64' ) ) );

        if( err ) {
            Y.log( `exchangeFile: JobNumber ${params.JobNumber} could not store new fs.files with filename(mediaId) ${mediaId}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        [err] = await formatPromiseResult( removeFile( user, originalFile._id.toString() ) );

        if( err ) {
            Y.log( `exchangeFile: JobNumber ${params.JobNumber} could not store new fs.files with filename(mediaId) ${mediaId}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        // Remove cache of changed media otherwise download will point to old file
        Y.log( `exchangeFile: try to remove cache for mediaId ${mediaId}`, 'warn', NAME );
        Y.doccirrus.media.cacheRemove( {_id: mediaId}, () => {
            if( err ) {
                Y.log( `exchangeFile: error while removing cache for mediaId ${mediaId}: ${err.stack || err}`, 'warn', NAME );
            }
        } );

    }

    async function updateActivity( {user, mediaId, timestamp, base64Data, params} ) {
        const _ = require( 'lodash' );
        const employeeId = user.specifiedBy;
        const name = user.U || `${user.firstname} ${user.lastname}`.trim();
        Y.log( `updateActivity: JobNumber ${params.JobNumber} update activity after media ${mediaId} was signed`, 'info', NAME );
        const select = {
            attachedMedia: 1,
            kimState: 1,
            kimSignedBy: 1
        };
        const selectFields = Object.keys( select );
        let [err, [activity]] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            query: {'attachedMedia.mediaId': mediaId},
            options: {
                lean: true,
                limit: 1,
                select
            }
        } ) );

        if( err ) {
            Y.log( `updateActivity: JobNumber ${params.JobNumber} could not fetch activity by mediaId ${mediaId}: ${err.stack || err}`, 'warn', NAME );
            postAuditMedia( user, mediaId, err );
            throw err;
        }

        [err] = await formatPromiseResult( exchangeFile( {
            user,
            mediaId,
            base64Data,
            params
        } ) );

        if( err ) {
            Y.log( `updateActivity: JobNumber ${params.JobNumber} could not exchange file of mediaId ${mediaId}: ${err.stack || err}`, 'warn', NAME );
            postAuditActivity( user, activity._id, err );
            throw err;
        }

        if( !Array.isArray( activity.kimSignedBy ) ) {
            activity.kimSignedBy = [];
        }

        activity.kimState = 'SIGNED';
        activity.kimSignedBy.push( {
            name,
            employeeId,
            timestamp
        } );

        [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'update', // must work with approved activities
            query: {_id: activity._id},
            data: _.pick( activity, selectFields )
        } ) );

        if( err ) {
            postAuditActivity( user, activity._id, err );
            Y.log( `updateActivity: JobNumber ${params.JobNumber} could not update activity ${activity._id}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        postAuditActivity( user, activity._id );

        return null;
    }

    function capitalizeStatus( status ) {
        return status && status.toUpperCase && status.toUpperCase();
    }

    async function processSignDocumentResult( {user, results, timestamp, params, activities} ) {
        Y.log( `processSignDocumentResult: JobNumber ${params.JobNumber}`, 'info', NAME );
        const processedResults = [];
        for( let result of results ) {
            const errors = [];
            const mediaId = result.attributes.RequestID;
            let status = capitalizeStatus( result.Status.Result );
            const connectorError = result.Status.Error || null;
            let base64Data;
            let attachedMedia = {};
            let thisActivity = activities.find(
                ( act ) => act.attachedMedia.some(
                    ( media ) => {
                        var match = media.mediaId === mediaId;
                        attachedMedia = media;
                        return match;
                    } ) );
            if( ['OK', 'WARNING'].includes( status ) ) {
                base64Data = getObject( 'SignatureObject.Base64Signature.$value', result ) || getObject( 'OptionalOutputs.DocumentWithSignature.Base64XML', result );
                if( base64Data ) {
                    let [updateActivityError] = await formatPromiseResult( updateActivity( {
                        user,
                        mediaId,
                        timestamp,
                        base64Data,
                        params
                    } ) );
                    if( updateActivityError ) {
                        Y.log( `processSignDocumentResult: JobNumber ${params.JobNumber} error while updating activity with mediaId: ${mediaId}: ${updateActivityError.stack || updateActivityError}`, 'warn', NAME );
                        status = 'ERROR';
                        errors.push( updateActivityError );
                    }
                } else {
                    Y.log( `processSignDocumentResult: JobNumber ${params.JobNumber} base64 buffer not found`, 'warn', NAME );
                    const error = Y.doccirrus.errors.rest( '11413' );
                    postAuditMedia( user, mediaId, error );
                    errors.push( error );
                }
            } else if( connectorError ) {
                Y.log( `processSignDocumentResult: JobNumber ${params.JobNumber} ${connectorError.stack || connectorError}`, 'warn', NAME );
                const error = Y.doccirrus.errors.rest( '11414', {
                    $message: connectorError.message || '-'
                } );
                postAuditMedia( user, mediaId, error );
                errors.push( error );
            } else {
                Y.log( `processSignDocumentResult: JobNumber ${params.JobNumber} unknown error`, 'warn', NAME );
                const error = Y.doccirrus.errors.rest( 500 );
                postAuditMedia( user, mediaId, error );
                errors.push( error );
            }

            const processResult = {
                status,
                errors,
                mediaId,
                activity: thisActivity,
                attachedMedia: attachedMedia
            };

            processedResults.push( processResult );
        }

        return processedResults;
    }

    async function execDocumentSign( {user, qes, warnings, timestamp, params, activities} ) {
        let timer = logEnter( 'Y.doccirrus.api.tiQES.execDocumentSign' );
        let [err, results] = await formatPromiseResult( qes.signDocument( params ) );
        let signResult;
        if( err ) {
            Y.log( `execDocumentSign: JobNumber ${params.JobNumber} could not execute signDocuments: ${err.stack || err}`, 'warn', NAME );
            signResult = {
                jobNumber: params.JobNumber,
                errors: [extractErrorFromTiResponse( err )],
                status: 'ERROR',
                warnings
            };
        } else if( !results ) {
            // this happens if stopSignature is called in during processing
            Y.log( `execDocumentSign: signature job ${params.JobNumber} was manually stopped!`, 'info', NAME );
            logExit( timer );
            return;
        } else {
            let [processError, processedResults] = await formatPromiseResult( processSignDocumentResult( {
                user,
                results,
                timestamp,
                params,
                activities
            } ) );
            if( processError ) {
                Y.log( `execDocumentSign: JobNumber ${params.JobNumber} could not process signDocuments result: ${processError.stack || processError}`, 'warn', NAME );
                signResult = {
                    jobNumber: params.JobNumber,
                    errors: [processError],
                    status: 'ERROR',
                    warnings
                };
            } else {
                signResult = {
                    jobNumber: params.JobNumber,
                    status: 'OK',
                    processedResults,
                    warnings
                };
            }
        }

        Y.doccirrus.communication.emitEventForUser( {
            targetId: user.identityId,
            event: 'signDocumentProcessFinished',
            eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
            msg: {data: signResult}
        } );

        logExit( timer );
    }

    async function createSignRequests( {
                                           user,
                                           activityIds,
                                           warnings,
                                           contentTypes,
                                           signRequests,
                                           fileStats,
                                           kimIncludeRevocationInfo
                                       } ) {
        if( !activityIds.length ) {
            throw Y.doccirrus.errors.rest( 11410, '', true );
        }
        var approvedActivities = [];

        let [err, activities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            query: {_id: {$in: activityIds}}
        } ) );

        if( err ) {
            Y.log( `signDocuments: could not fetch activityIds ${activityIds}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }
        for( let activity of activities ) {
            if( activity.status !== 'APPROVED' ) {
                let [err, result] = await formatPromiseResult( new Promise( function( resolve, reject ) {
                    Y.doccirrus.activityapi.doTransition( user, {}, activity, 'approve', false, ( err, result ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( result );
                    } );
                } ) );

                if( err ) {
                    Y.log( `doTransition: error with ${activity}: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                approvedActivities.push( result[0].data );
            } else {
                approvedActivities.push( activity ); // already approved
            }
        }
        activities = approvedActivities;

        for( let activity of activities ) {
            [err] = await formatPromiseResult( createSignRequestsForActivity( {
                user,
                activity,
                warnings,
                contentTypes,
                signRequests,
                fileStats,
                kimIncludeRevocationInfo
            } ) );
            if( err ) {
                Y.log( `signDocuments: could not create sign requests for activity: ${activity._id}`, 'warn', NAME );
                throw err;
            }
        }
        return activities;

    }

    /**
     * Collects all media (currently only PDFs) from requested activities and creates sign requests for the TI Konnektor.
     * Starts the signing process in background and reports if process started and warnings to the client. Finally the
     * signing process ends and results are processed. If a sign request was successful then the fs.files file from the
     * media entry is swapped with the new file blob returned by the sign request.
     *
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {Array<String>} args.originalParams.activityIds
     * @param {String} args.originalParams.cardHandle
     * @param {Object} args.originalParams.context
     * @param {String} args.originalParams.context.MandantId
     * @param {String} args.originalParams.context.ClientSystemId
     * @param {String} args.originalParams.context.WorkplaceId
     * @param {Array<String>} [args.originalParams.contentTypes]
     * @param {Function} args.callback
     * @return {Promise<*>}
     */
    async function signDocuments( args ) {
        Y.log( 'Entering Y.doccirrus.api.tiQES.signDocuments', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.tiQES.signDocuments' );
        }

        const {user, originalParams = {}, callback} = args;
        const readIncaseConfig = promisifyArgsCallback( Y.doccirrus.api.incaseconfiguration.readConfig );
        const timestamp = new Date();
        const {activityIds = [], cardHandle, context, contentTypes = ['application/pdf']} = originalParams;
        const warnings = [];
        const signRequests = [];
        const fileStats = {stackFileSize: 0};

        let
            activities;

        if( !cardHandle || !context ) {
            return handleResult( Y.doccirrus.errors.rest( '400' ), undefined, callback );
        }
        let [err, incaseConfig] = await formatPromiseResult( readIncaseConfig( {user} ) );
        if( err ) {
            Y.log( `signDocuments: could not load incaseConfig: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        [err, activities] = await formatPromiseResult( createSignRequests( {
            user,
            activityIds,
            warnings,
            contentTypes,
            signRequests,
            fileStats,
            kimIncludeRevocationInfo: incaseConfig && incaseConfig.kimIncludeRevocationInfo || false
        } ) );

        if( err ) {
            Y.log( `signDocuments: could not create sign requests: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( !signRequests.length ) {
            Y.log( `signDocuments: created 0 signRequests for activities: ${activityIds}`, 'info', NAME );
            return handleResult( null, {errors: [], warnings, data: {processing: false}}, callback );
        }

        let qes;
        [err, qes] = await formatPromiseResult( Y.doccirrus.dcTi.createQES( {user} ) );

        if( err ) {
            Y.log( `signDocuments: could not create qes api instance: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let jobNumber;
        [err, jobNumber] = await formatPromiseResult( qes.getJobNumber( context ) );
        if( err ) {
            Y.log( `signDocuments: could not create jobNumber: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        const params = {
            ...context,
            CardHandle: cardHandle,
            JobNumber: jobNumber,
            UserId: user.id,
            SignRequests: signRequests
        };

        Y.log( `signDocuments: return early with JobNumber ${params.JobNumber} processing`, 'info', NAME );
        // Run this in background...
        execDocumentSign( {user, qes, timestamp, warnings, params, activities} );
        // ... and return to client until socket io sends event...
        return handleResult( null, {errors: [], warnings, data: {processing: true, jobNumber}}, callback );
    }

    /**
     * Verify attached media of an activityId or a attachedMedia object.
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {Array<String>} [args.originalParams.activityId]
     * @param {Array<String>} [args.originalParams.attachedMedia]
     * @param {Object} args.originalParams.tiContext
     * @param {String} args.originalParams.tiContext.MandantId
     * @param {String} args.originalParams.tiContext.ClientSystemId
     * @param {String} args.originalParams.tiContext.WorkplaceId
     * @param {Function} args.callback
     * @return {Promise<*>}
     */
    async function verifyDocument( args ) {
        Y.log( 'Entering Y.doccirrus.api.tiQES.signDocuments', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.tiQES.signDocuments' );
        }
        const readIncaseConfig = promisifyArgsCallback( Y.doccirrus.api.incaseconfiguration.readConfig );
        const {user, originalParams = {}, callback} = args;
        const {activityId, attachedMedia, tiContext} = originalParams;

        if( (!activityId && !attachedMedia) || !tiContext ) {
            return handleResult( Y.doccirrus.errors.rest( '400' ), undefined, callback );
        }

        const ti = Y.doccirrus.dcTi.getTi();
        const {MimeTypeEnum} = ti;

        let err, activities, activity, signedMedia;

        if( activityId ) {
            [err, activities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {_id: activityId}
            } ) );

            if( err ) {
                Y.log( `verifyDocument: could not fetch activityId ${activityId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            activity = activities[0];

            if( !activity ) {
                Y.log( `verifyDocument: activityId ${activityId} not found`, 'warn', NAME );
                return handleResult( Y.doccirrus.errors.rest( 404, `activity ${activityId} not found` ), undefined, callback );
            }

            if( activity.kimState !== 'SIGNED' ) {
                return handleResult( Y.doccirrus.errors.rest( '11415' ), undefined, callback );
            }

            signedMedia = activity.attachedMedia.find( attachedMediaEntry => attachedMediaEntry.contentType === 'application/pdf' );
        } else if( attachedMedia ) {
            signedMedia = attachedMedia;
        }

        if( !signedMedia ) {
            return handleResult( Y.doccirrus.errors.rest( '11416' ), undefined, callback );
        }

        let fsFiles;
        [err, fsFiles] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'fs.files',
            query: {filename: signedMedia.mediaId}
        } ) );
        let fsFile = fsFiles[0];
        if( !fsFile ) {
            Y.log( `verifyDocument: fsFile with filename ${signedMedia.mediaId} not found`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( 404, `fsFile with filename ${signedMedia.mediaId} not found` ), undefined, callback );
        }

        let file;
        [err, file] = await formatPromiseResult( getFile( user, fsFile._id ) );
        if( err ) {
            Y.log( `verifyDocument: could not get gridfs file ${fsFile._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }
        if( !file ) {
            Y.log( `verifyDocument: gridfs file ${fsFile._id} not found`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( 404, `gridfs file ${fsFile._id} not found` ), undefined, callback );
        }

        let qes;
        [err, qes] = await formatPromiseResult( Y.doccirrus.dcTi.createQES( {user} ) );
        if( err ) {
            Y.log( `verifyDocument: could not create qes api instance: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let incaseConfig;
        [err, incaseConfig] = await formatPromiseResult( readIncaseConfig( {user} ) );
        if( err ) {
            Y.log( `verifyDocument: could not load incaseConfig: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let verifyDocumentResult;
        [err, verifyDocumentResult] = await formatPromiseResult( qes.verifyDocument( {
            ...tiContext,
            Document: {
                DokumentID: `${activity && activity.actType || 'MEDIA'}-${signedMedia.mediaId}`,
                ShortText: signedMedia.caption,
                MimeType: MimeTypeEnum.PDF,
                DocumentData: file.data.toString( 'base64' ),
                IncludeRevocationInfo: incaseConfig && incaseConfig.kimIncludeRevocationInfo || false
            }
        } ) );
        if( err ) {
            Y.log( `verifyDocument: could not verify document: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return handleResult( null, verifyDocumentResult, callback );
    }

    async function stopSigningProcess( args ) {
        const {user, originalParams = {}, callback} = args;
        const {context, jobNumber} = originalParams;

        if( !context || !jobNumber ) {
            return handleResult( Y.doccirrus.errors.rest( '400' ), undefined, callback );
        }

        let [err, qes] = await formatPromiseResult( Y.doccirrus.dcTi.createQES( {user} ) );

        if( err ) {
            Y.log( `stopSigningProcess: could not create qes api instance: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let result;
        [err, result] = await formatPromiseResult( qes.stopSignature( {...context, JobNumber: jobNumber} ) );

        if( err ) {
            Y.log( `stopSigningProcess: could not call stopSignature: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return handleResult( null, result, callback );
    }

    Y.namespace( 'doccirrus.api' ).tiQES = {
        /**
         * @property name
         * @type {String}
         * @protected
         */
        name: NAME,
        signDocuments,
        stopSigningProcess,
        verifyDocument
    };
}, '0.0.1', {
    requires: [
        'JsonRpc',
        'dcerror',
        'activity-api',
        'dcTi'
    ]
} );