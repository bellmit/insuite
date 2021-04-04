/**
 * User: bhagyashributada
 * Date: 6/7/18  1:06 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, require*/



YUI.add(
    'blob-api',
    function( Y, NAME ) {

        const DEFAULT_ACTTYPE = 'EXTERNAL';
        const DEFAULT_CAPTION = 'untitled';
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * lists documents
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operation
         * @param {Function} args.callback
         * @param {Object} args.query :OPTIONAL: additional query to filter data in mongodb call
         *
         * @returns {Array}
         */
        async function getDocumentsList( args ) {
            let {user, callback, query = {}} = args,
                error, result;

            Y.log( 'Loading documents', 'info', NAME );

            [error, result] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'document',
                    query: {contentType: {$ne: 'dc/form'}, ...query},
                    options: {lean: true}
                } )
            );

            if( error ) {
                Y.log( `getDocuments: Error while querying documents. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            if( result && Array.isArray( result ) ) {
                Y.log( `getDocuments: No of documents: ${JSON.stringify( result )} `, "info", NAME );
                return callback( null, result );
            }
        }

        /*
         * loads media object & dataURI using mediaId
         */
        async function getBlob( args ) {
            let
                err,
                result,
                mediaObj,
                user = args.user,
                mediaId = args.query._id,
                params = {
                    user,
                    originalParams: {mediaId}
                };

            //Loads Media object
            [err, result] = await (formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.imagesCanvas.loadDataURI( {
                    ...params, callback: ( err, res ) => {
                        if( err ) {
                            return reject( err );
                        } else {
                            return resolve( res );
                        }
                    }
                } );
            } ) ));

            if( err ) {
                return args.callback( err );
            }

            if( result ) {
                mediaObj = result;
            }

            //Loads Document object
            [err, result] = await (formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: args.user,
                action: 'get',
                model: 'document',
                query: {mediaId},
                options: {lean: true}
            } ) ));

            if( err ) {
                return args.callback( err );
            }

            if( result && Array.isArray(result) && result.length ){
                mediaObj.tags = result[0].tags || [];
                mediaObj.type = result[0].type || 'OTHER';
            }

            return args.callback( null, [ mediaObj ] );
        }

        /*
         * Saves media object using params ( includes patientId, activityId/ownerId, dataURI)
         *
         */
        async function postBlob( args ) {

            const
                {user, callback} = args || {},
                params = args && args.data || {};
            let {
                    patientId, userContent = '', dataURI, studyId, caption = DEFAULT_CAPTION, createdOn, docType, type, patientQuery = {},
                    tags, activityId, subType, actType = DEFAULT_ACTTYPE
                } = params,
                error,
                result,
                uriBuffer;


            Y.log(`Post Blob Metadata: 
            patientId: ${patientId} 
            userContent: ${userContent} 
            studyId: ${studyId} 
            caption: ${caption} 
            createdOn: ${createdOn} 
            docType: ${docType} 
            tags: ${tags} 
            activityId: ${activityId} 
            subType: ${subType} 
            actType: ${actType}`, 'info', NAME );

            activityId = activityId && activityId.trim();
            studyId = studyId && studyId.trim();

            // -------------------------------- Validations -------------------------------------------------------------

            if( !dataURI || !dataURI.trim() ) {
                Y.log( `postBlob: Missing required parameter: dataURI.`, "error", NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'Missing required parameter: dataURI' ) );
            }

            // check if activity exists in db for the given activityId
            if( activityId ) {

                [error, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'activity',
                        'action': 'count',
                        'query': {_id: activityId}
                    } )
                );

                if( error || result === 0 ) {
                    // If error occurs or if no record is found for the given activityId, then send the document to media book with empty activityId
                    if( error ) {
                        Y.log( `postBlob: Error occurred while querying activity with _id: ${activityId}, continuing to save the document in media book. Error: ${error} `, "error", NAME );
                    } else {
                        Y.log( `postBlob: Activity not found with _id: ${activityId}, continuing to save the document in media book.`, "warn", NAME );
                    }

                    activityId = '';
                }

                if( result > 0 ) {
                    Y.log( `postBlob: Activity with _id: ${activityId} exists in DB, continuing to attach the document to the activity & store in media book.`, "debug", NAME );
                }
            }

            // check & fetch activityId for the given studyId
            if( studyId && !activityId ) {

                [error, result] = await (formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            'user': user,
                            'model': 'activity',
                            'action': 'get',
                            'query': {studyId}
                        } )
                    )
                );

                if( error || !result || !Array.isArray( result ) || !result.length ) {
                    // If error occurs or if no record is found for the given studyId, then send the document to media book with empty activityId
                    if( error ) {
                        Y.log( `postBlob: Error occurred while querying activity with studyId ${studyId}, continuing to save the document in media book. Error: ${error} `, "error", NAME );
                    } else {
                        Y.log( `postBlob: Activity not found with studyId ${studyId}, continuing to save the document in media book.`, "warn", NAME );
                    }

                    activityId = '';

                } else {
                    activityId = result[0]._id.toString();
                    Y.log( `postBlob: Activity Id with studyId: ${activityId} exists in DB, continuing to attach the document to the activity & store in media book.`, "debug", NAME );
                }
            }

            // -------------------------------- convert dataUri to buffer -------------------------------------------------------------
            try {
                if( /\%/i.test( dataURI ) ) {
                    dataURI = decodeURIComponent( dataURI );
                }

                uriBuffer = Y.doccirrus.media.dataUriToBuffer( dataURI );

            } catch( err ) {

                Y.log( `postBlob: Error occurred while converting dataURI to Buffer. Error: ${err} `, "error", NAME );
                return callback( Y.doccirrus.errors.rest( 400, `Error occurred while converting dataURI to Buffer: ${err}` ) );
            }

            // -------------------------------- Create and sent the document to media book -------------------------------------------------------------

            let
                blobDataToStore = {
                    caption,
                    user,
                    actData: {},
                    patientQuery,
                    overwrite: activityId ? {activityId} : {},
                    file: {
                        data: uriBuffer,
                        path: "fileContentBase64" // Required by the 'matchPatientAndCreateAttachment' as a mandatory field
                    },
                    getOnlyInsuranceCaseFolder: true, //Required to get the casefolderId
                    deviceId: `${user.U} (/2/blob)`,
                    documentDetails: {
                        type: type && type.trim() || 'OTHER',
                        docType: docType && docType.trim() || 'OTHER',
                        createdOn: createdOn ? new Date( createdOn ) : new Date(),
                        tags: tags && Array.isArray( tags ) ? tags : [],
                        fileSource: `${user.U} (/2/blob)`
                    }
                };

            if( !activityId ) {
                blobDataToStore.actData = {
                    actType,
                    subType,
                    userContent: `${caption}\n${userContent}`,
                    status: 'VALID'
                };
            }

            if( patientId ) {
                blobDataToStore.patientQuery._id = patientId;
            }

            [error, result] = await formatPromiseResult( Y.doccirrus.api.devicelog.matchPatientAndCreateAttachment( blobDataToStore ) );

            if( error ) {
                Y.log( `postBlob: Error occurred in 'matchPatientAndCreateAttachment'. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            Y.log( `postBlob: Stored Media & Document - ${JSON.stringify( result )}`, 'info', NAME );
            result = result && result.mediaObj && result.mediaObj._id ? [result.mediaObj._id] : [result];
            callback( null, result );
        }

        Y.namespace( 'doccirrus.api' ).blob = {
            get: function( args ){
                Y.log('Entering Y.doccirrus.api.blob.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.blob.get');
                }
                if( args.query && Object.keys( args.query ).length && args.query._id ){
                    getBlob( args );
                } else {
                    getDocumentsList( args );
                }
            },
            put: function() {
                return;
            },
            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.blob.post', 'info', NAME);
                if (args && args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.blob.post');
                }
                postBlob( args );
            }
        };

    },
    '0.0.1', {
        requires: [
            'v_blob-schema'
        ]
    }
);
