/**
 * User: dcdev
 * Date: 2/5/21  2:34 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
YUI.add( 'medidatalog-api', function( Y, NAME ) {

        const {formatPromiseResult, handleResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            util = require( 'util' ),
            needle = require( 'needle' ),
            DCError = Y.doccirrus.commonerrors.DCError;

        function _generateNeedleOptions( {clientId, login, password} ) {
            const auth = Buffer.from( `${login}:${password}` ).toString( 'base64' );

            return {
                rejectUnauthorized: false,
                headers: {
                    'X-CLIENT-ID': clientId,
                    'Authorization': `Basic ${auth}`
                }
            };
        }

        /**
         * Gets status of sent medidatalog entry
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {Array} args.originalParams.logs
         * @param {Function} args.callback
         */

        async function getDocumentsStatus( {user, originalParams, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.medidatalog.getDocumentsStatus', 'info', NAME );
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.medidatalog.getDocumentsStatus' );
            }

            let error, result;
            const logs = originalParams.logs || [],
                medidataConfig = require( `${process.cwd()}/medidataNet.json` ),
                {appCurrentUrl, appCurrentPort, uploadsUrl} = medidataConfig,
                options = _generateNeedleOptions( medidataConfig ),
                needleGetP = util.promisify( needle.get );

            function _saveDocumentStatus( {requestResult, log} ) {
                const {body} = requestResult;

                return Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'medidatalog',
                    query: {_id: log._id},
                    data: Y.doccirrus.filters.cleanDbObject( {status: body.status} ),
                    fields: ['status']
                } );
            }

            function _getDocumentStatus( log ) {
                const url = `https://${appCurrentUrl}:${appCurrentPort}/${uploadsUrl}/${log.transmissionReference}/status`;

                if( !log.transmissionReference ) {
                    throw new DCError( 'medidata_07', {data: {$parameter: 'transmissionReference'}} );
                }

                return needleGetP( url, options );
            }

            [error, result] = await formatPromiseResult( Y.doccirrus.medidatalogUtils.handleRequestsInParallel( {
                logs,
                request: _getDocumentStatus,
                handler: _saveDocumentStatus
            } ) );

            //todo: handle result

            return handleResult( error, result, callback );
        }

        /**
         * Gets references for documents which are ready to download
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        async function obtainDocumentReferences( {user, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.medidatalog.obtainDocumentReferences', 'info', NAME );
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.medidatalog.obtainDocumentReferences' );
            }

            const medidataNetConfig = require( `${process.cwd()}/medidataNet.json` ),
                {downloadsUrl, appCurrentUrl, appCurrentPort} = medidataNetConfig,
                needleGetP = util.promisify( needle.get ),
                options = _generateNeedleOptions( medidataNetConfig ),
                url = `https://${appCurrentUrl}:${appCurrentPort}/${downloadsUrl}`;

            const _getDocumentReferences = function() {
                return needleGetP( url, options );
            };

            let [error, result] = await formatPromiseResult( Y.doccirrus.medidatalogUtils.fetchLogsFromMedidata( {
                user,
                type: "RECEIVED",
                request: _getDocumentReferences
            } ) );

            return handleResult( error, result, callback );
        }

        /**
         * Downloads documents from medidata
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {Array} args.originalParams.logs
         * @param {Function} args.callback
         */
        async function downloadDocumentsFromMedidata( {user, originalParams, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.medidatalog.downloadDocumentsFromMedidata', 'info', NAME );
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.medidatalog.downloadDocumentsFromMedidata' );
            }
            let error, result;
            const medidataNetConfig = require( `${process.cwd()}/medidataNet.json` ),
                {downloadsUrl, appCurrentUrl, appCurrentPort} = medidataNetConfig,
                needleGetP = util.promisify( needle.get ),
                options = _generateNeedleOptions( medidataNetConfig ),
                logs = originalParams.logs || [],
                createCommunicationP = promisifyArgsCallback( Y.doccirrus.api.activity.createCommunicationFromMediport );

            async function _saveDocument( {requestResult, log} ) {
                const body = requestResult.body;
                let [error, result] = await formatPromiseResult( Y.doccirrus.medidatalogUtils.parseResponseXml( {
                    user,
                    buffer: body,
                    errorHandler: () => {}
                } ) );

                if( error ) {
                    Y.log( `downloadDocumentsFromMedidata: Failed to parse response xml \nError: ${error.stack || error}`, 'error', NAME );
                    throw error;
                }

                const {communicationData, invoiceRef, documents, status} = result;

                [error, result] = await formatPromiseResult( createCommunicationP( {
                    user,
                    data: {
                        communication: communicationData,
                        invoiceRef,
                        documents,
                        status,
                        buffer: body
                    },
                    query: {
                        _id: invoiceRef.patientId
                    }
                } ) );

                if( error ) {
                    Y.log( `downloadDocumentsFromMedidata: Failed to create communication activity:\nError: ${error.stack || error}`, 'error', NAME );
                    throw error;
                }
                const communicationId = result;

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'document',
                    query: {
                        activityId: communicationId,
                        type: 'SUMEXXML'
                    },
                    options: {
                        fields: {
                            _id: 1
                        }
                    }
                } ) );

                if( error ) {
                    Y.log( `downloadDocumentsFromMedidata: Failed to get document:\nError: ${error.stack || error}`, 'error', NAME );
                    throw error;
                }

                const documentId = result[0]._id;

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'medidatalog',
                    action: 'put',
                    query: {
                        _id: log._id
                    },
                    data: Y.doccirrus.filters.cleanDbObject( {
                        status: 'UPLOADED',
                        documentId: documentId,
                        description: communicationData.userContent
                    } ),
                    fields: ['status', 'documentId', 'description']
                } ) );

                if( error ) {
                    Y.log( `downloadDocumentsFromMedidata: Failed to update medidatalog ${log._id}:\nError: ${error.stack || error}`, 'error', NAME );
                    throw error;
                }

                return result;
            }

            function _downloadDocument( log ) {
                const url = `https://${appCurrentUrl}:${appCurrentPort}/${downloadsUrl}/${log.transmissionReference}`;
                if( !log.transmissionReference ) {
                    throw new DCError( 'medidata_07', {data: {$parameter: 'transmissionReference'}} );
                }

                return needleGetP( url, options );
            }

            [error, result] = await formatPromiseResult( Y.doccirrus.medidatalogUtils.handleRequestsInParallel( {
                logs,
                request: _downloadDocument,
                handler: _saveDocument
            } ) );

            if( result && result.errors && result.errors.length ) {
                for( let errorObject of result.errors ) {
                    if( errorObject.logId ) {
                        const errorMessage = Y.doccirrus.errorTable.getMessage( errorObject.error );
                        [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'medidatalog',
                            action: 'put',
                            query: {
                                _id: errorObject.logId
                            },
                            data: Y.doccirrus.filters.cleanDbObject( {
                                description: errorMessage,
                                status: 'UPLOAD_ERROR'
                            } ),
                            fields: ['description', 'status']
                        } ) );
                    }
                }
            }

            return handleResult( error, result, callback );
        }

        /**
         * Prepares medidatalogs with type NOTIFICATION and RECEIVED for frontend table
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        async function getLogs( {user, query, callback} ) {
            let error, result;

            Y.log( 'Entering Y.doccirrus.api.medidatalog.getLogs', 'info', NAME );
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.medidatalog.getLogs' );
            }

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medidatalog',
                action: 'aggregate',
                pipeline: [
                    {$match: query},
                    {
                        $lookup: {
                            from: 'medidatalogs',
                            let: {caseId: '$correlationReference'},
                            pipeline: [{$match: {type: 'SENT', $expr: {$eq: ["$correlationReference", "$$caseId"]}}}],
                            as: 'sentInfo'
                        }
                    },
                    {
                        $addFields: {
                            documentIdObj: {$toObjectId: '$documentId'}
                        }
                    },
                    {
                        $lookup: {
                            from: 'documents',
                            localField: 'documentIdObj',
                            foreignField: '_id',
                            as: 'document'
                        }
                    },
                    {
                        $project: {
                            status: '$status',
                            type: '$type',
                            subject: '$subject',
                            transmissionReference: '$transmissionReference',
                            correlationReference: '$correlationReference',
                            notificationType: '$notificationType',
                            documentReference: '$documentReference',
                            created: '$created',
                            description: '$description',
                            notificationId: '$notificationId',
                            technicalInfo: '$technicalInfo',
                            invoiceNo: {$arrayElemAt: ['$sentInfo.invoiceNo', 0]},
                            activityId: {$arrayElemAt: ['$sentInfo.activityId', 0]},
                            patientId: {$arrayElemAt: ['$sentInfo.patientId', 0]},
                            patientName: {$arrayElemAt: ['$sentInfo.patientName', 0]},
                            sender: {$arrayElemAt: ['$sentInfo.receiver', 0]},
                            documentUrl: {$arrayElemAt: ['$document.url', 0]}
                        }
                    }
                ]
            } ) );

            if( error || !result || !result.result ) {
                error = error || new DCError( 400, {message: 'Notifications not found'} );
                Y.log( 'getLogs: Failed to get notifications from database' );
                return handleResult( error, null, callback );
            }

            return handleResult( null, result.result, callback );
        }

        /**
         * Gets notifications from medidata
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {String} args.originalParams.startDate
         * @param {String} args.originalParams.endDate
         * @param {String} args.originalParams.limit
         * @param {Function} args.callback
         */
        async function fetchNotificationsFromMedidata( {user, originalParams, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.medidatalog.fetchNotificationsFromMedidata', 'info', NAME );
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.medidatalog.fetchNotificationsFromMedidata' );
            }

            let error, result;
            const {startDate, endDate, limit} = originalParams,
                medidataNetConfig = require( `${process.cwd()}/medidataNet.json` ),
                {notificationsUrl, appCurrentUrl, appCurrentPort} = medidataNetConfig,
                needleGetP = util.promisify( needle.get ),
                options = _generateNeedleOptions( medidataNetConfig );

            let url = `${appCurrentUrl}:${appCurrentPort}/${notificationsUrl}`;

            if( Object.keys( originalParams || {} ).length ) {
                url = Y.doccirrus.https.buildGetRequestUrl( {
                    baseUrl: url,
                    parameters: [
                        {name: 'from', value: startDate.substring( 0, startDate.indexOf( 'T' ) )},
                        {name: 'to', value: endDate.substring( 0, endDate.indexOf( 'T' ) )},
                        {name: 'limit', value: limit}
                    ]
                } );
            }

            const _getNotifications = function() {
                return needleGetP( `https://${url}`, options );
            };

            [error, result] = await formatPromiseResult( Y.doccirrus.medidatalogUtils.fetchLogsFromMedidata( {
                user,
                type: "NOTIFICATION",
                request: _getNotifications
            } ) );

            return handleResult( error, result, callback );
        }

        /**
         * Confirm that system received notifications from medidata
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {String} args.originalParams.type
         * @param {Array} args.originalParams.logs
         * @param {Function} args.callback
         */
        async function confirmReceipt( {user, originalParams, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.medidatalog.confirmReceipt', 'info', NAME );
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.medidatalog.confirmReceipt' );
            }

            const {type, logs} = originalParams,
                medidataNetConfig = require( `${process.cwd()}/medidataNet.json` ),
                {notificationsUrl, appCurrentUrl, appCurrentPort} = medidataNetConfig,
                needlePutP = util.promisify( needle.put ),
                options = _generateNeedleOptions( medidataNetConfig );

            let error, result;

            options.headers["Content-Type"] = "application/json";

            function _confirmRequest( log ) {
                if( !log.notificationId ) {
                    throw new DCError( 'medidata_07', {data: {$parameter: 'notificationId'}} );
                }
                const url = `https://${appCurrentUrl}:${appCurrentPort}/${notificationsUrl}/${log.notificationId}/status`;
                const stringifiedData = JSON.stringify( {notificationFetched: true} );
                return needlePutP( url, stringifiedData, options );
            }

            function _updateLog( {requestResult, log} ) {
                const {statusCode} = requestResult;

                if( statusCode !== 200 ) {
                    const {statusMessage} = requestResult;
                    Y.log( `confirmReceipt: Failed to confirm receipt of ${type.toLowerCase()} medidataLog. Request Status code: ${statusCode}\nMessage: ${statusMessage}`, 'error', NAME );
                    throw new DCError( 'medidata_08', {data: {$statusCode: statusCode, $statusMessage: statusMessage}} );
                }

                return Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'medidatalog',
                    query: {
                        _id: log._id
                    },
                    fields: ['status'],
                    data: Y.doccirrus.filters.cleanDbObject( {status: "CONFIRMED"} )
                } );
            }

            [error, result] = await formatPromiseResult( Y.doccirrus.medidatalogUtils.handleRequestsInParallel( {
                logs,
                request: _confirmRequest,
                handler: _updateLog
            } ) );

            if( error ) {
                Y.log( `confirmReceipt: Failed to handle requests in parallel.\nError: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }
            return handleResult( null, result, callback );
        }

        /**
         * @class medidatalog
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).medidatalog = {
            /**
             * @property name
             * @type {String}
             * @default medidatalog-api
             * @protected
             */
            name: NAME,
            // --------------- JSONRPC Methods -------------
            getDocumentsStatus,
            obtainDocumentReferences,
            downloadDocumentsFromMedidata,
            fetchNotificationsFromMedidata,
            getLogs,
            confirmReceipt
        };
    },

    '0.0.1', {
        requires: [
            'medidatalogUtils'
        ]
    }
);
