/*global YUI */
YUI.add( 'banklog-api', function( Y, NAME ) {

        const
            {formatPromiseResult, handleResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            {logEnter, logExit} = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            moment = require( 'moment' );

        function findPatient( user, patientId ) {
            return Y.doccirrus.mongodb.runDb( {
                model: 'patient',
                user: user,
                action: 'get',
                query: {
                    _id: patientId || new ObjectId( -1 )
                },
                options: {
                    lean: true
                }
            } );
        }

        function notifyUI( user, percentage ) {
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'BANKLOG_IMPORT',
                msg: {
                    data: percentage
                }
            } );
        }

        /**
         *
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {module:banklogSchema.banklog} args.data
         * @param {Integer} args.size
         * @param {Integer} args.index
         * @param {String} args.fileHash
         * @param {Function} args.callback
         * @return {Promise<{callback}|*>}
         */
        async function createBankLogRecord( args ) {
            Y.log( 'Entering Y.doccirrus.api.banklog.createBankLogRecord', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.banklog.createBankLogRecord' );
            }
            const
                {user, data = {}, size, index, fileHash, callback} = args,
                transactions = ['999', '995'];

            let err,
                bankLogIdArr,
                activity,
                referenceNo,
                invoiceNo;

            if( -1 !== transactions.indexOf( data['Transaction type'] ) ) {
                return callback( null );
            }

            data['Payment date'] = moment( data['Payment date'].match( /.{1,2}/g ).join( '-' ), 'YY-MM-DD' ).toDate();
            data['Credit date'] = moment( data['Credit date'].match( /.{1,2}/g ).join( '-' ), 'YY-MM-DD' ).toDate();
            data.fileHash = fileHash;
            if( data['Reference number'] ) {
                referenceNo = data['Reference number'];
                invoiceNo = Number( referenceNo.substring( 6, referenceNo.length ) ).toString();
                data.invoiceNo = invoiceNo;
            }

            [err, bankLogIdArr] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'banklog',
                    action: 'post',
                    user: user,
                    data: Y.doccirrus.filters.cleanDbObject( data )
                } )
            );

            if( err ) {
                Y.log( `createBankLogRecord: Error while creating data. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( data['Reference number'] ) {
                [err, activity] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'INVOICEREF',
                            invoiceRefNo: new RegExp( `^${data["Reference number"]}` )
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
            }

            if( err ) {
                Y.log( `createBankLogRecord: Error while getting activity for automatic assign Error: ${err.stack || err}`, "error", NAME );
            } else if( !activity || !activity.length ) {
                [err, activity] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'INVOICEREF',
                            locImportId: {$exists: true},
                            invoiceNo
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                if( err ) {
                    Y.log( `createBankLogRecord: Error while getting activity for automatic assign Error: ${err.stack || err}`, "error", NAME );
                }
            }

            if( activity && activity.length ) {
                activity = activity[0];
                [err] = await formatPromiseResult(
                    Y.doccirrus.api.banklog.claimBankLogEntry( {
                        user: user,
                        data: {
                            invoiceRef: activity,
                            bankLogId: bankLogIdArr[0],
                            amount: data.Amount
                        }
                    } )
                );
                if( err ) {
                    Y.log( `createBankLogRecord: claimBankLogEntry error: ${err.stack || err}`, "error", NAME );
                }
            } else {
                Y.log( `createBankLogRecord: activity for automatic assign not found`, "info", NAME );
            }
            notifyUI( user, (index / size) * 100 );
            return callback( null, bankLogIdArr );
        }

        /**
         * @method runBESR
         *
         * @param {Object} args
         * @param {Object} args.user - User Object
         * @param {Object} args.data - Data Object
         * @param {ObjectId} args.data.mediaId - Media ID
         * @param {String} [args.data.fileHash] - hash of .BESR file
         * @param {Function} args.callback
         */
        async function runBESR( args ) {
            Y.log( 'Entering Y.doccirrus.api.banklog.runBESR', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.banklog.runBESR' );
            }
            const
                {user, data = {}, callback} = args,
                transformerFn = Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.BESR];

            Y.doccirrus.media.gridfs.exportBuffer( user, data.mediaId, false, onLoadBuffer );

            async function onLoadBuffer( err, buf ) {
                if( err ) {
                    return callback( err );
                }
                let [error, media] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'media',
                        user: user,
                        query: {'_id': data.mediaId},
                        options: {
                            lean: true
                        }
                    } )
                );
                if( error ) {
                    Y.log( `runBESR: Error while getting data. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }
                notifyUI( user, 0 );
                transformerFn( {
                    input: {
                        data: buf,
                        media: media,
                        fileHash: data.fileHash
                    }
                }, user, ( err, ret ) => {
                    notifyUI( user, 100 );
                    if( err ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'BANKLOG_IMPORT_ERR',
                            msg: {
                                data: err
                            }
                        } );
                    }
                    callback( err, ret );
                } );
            }
        }

        /**
         * REST function for BESR upload
         * @method uploadBESR
         * @param {Object} args standard REST args that require a POST-based attachment
         * @param {Function} [args.callback] - callback.
         * @param {Object} args.data - Config Object.
         * @param {Object} args.user - User Object.
         *
         * @return {Function} returns Frontend Callback.
         */
        async function uploadBESR( args ) {
            let timer = logEnter( 'Y.doccirrus.api.banklog.uploadBESR' );

            const
                {
                    data,
                    user
                } = args,
                upload64P = promisifyArgsCallback( Y.doccirrus.api.media.upload64 );

            let
                callback = args.callback,
                err,
                result;

            //respond immediately
            if( callback ) {
                // eslint-disable-next-line callback-return
                callback();
            }

            callback = function finalCallback( error, result ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: args.user.identityId,
                    event: 'uploadBESREvent',
                    msg: {
                        data: {
                            result,
                            error
                        }
                    }
                } );
            };

            //duplicate check
            let fileHash;
            [err, fileHash] = await formatPromiseResult(
                duplicateCheck( {
                    data,
                    user
                } )
            );
            if( err ) {
                logExit( timer );
                return handleResult( err, null, callback );
            }

            //upload
            let media;
            [err, media] = await formatPromiseResult(
                upload64P( {
                    originalParams: {
                        ownerCollection: 'banklog',
                        ownerId: '',
                        source: data.fileData,
                        name: data.fileName,
                        fileName: data.fileName,
                        label: 'cashimport'
                    },
                    user
                } )
            );
            if( err ) {
                logExit( timer );
                return handleResult( err, null, callback );
            }

            notifyUI( user, 0 );
            [err, result] = await formatPromiseResult(
                Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.BESR]( {
                    input: {
                        data: data.fileData,
                        media: media,
                        fileHash: fileHash
                    }
                }, user )
            );
            notifyUI( user, 100 );
            if( err ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'BANKLOG_IMPORT_ERR',
                    msg: {
                        data: err
                    }
                } );
            }
            logExit( timer );
            return handleResult( err, result, callback );
        }

        /**
         *
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.data
         * @param {module:v_invoicerefSchema.v_invoiceref} [args.data.invoiceRef]
         * @param {String} args.data.bankLogId
         * @param {module:banklogSchema.banklog.Amount} [args.data.amount]
         * @return {Promise<{callback}|String>} createdActivityId
         */
        async function claimBankLogEntry( args ) {
            let timer = logEnter( 'Y.doccirrus.api.banklog.claimBankLogEntry' );
            const
                {user, data = {}, callback} = args,
                {
                    bankLogId,
                    amount
                } = data,
                quickCreateP = promisifyArgsCallback( Y.doccirrus.api.receipt.quickCreate ),
                doTransitionP = promisifyArgsCallback( Y.doccirrus.api.activity.doTransition );
            let
                invoiceRef = data.invoiceRef, //backend
                patientId = (invoiceRef && invoiceRef.patientId) || data.patientId, //frontend
                caseFolderId = (invoiceRef && invoiceRef.caseFolderId) || data.caseFolderId, //frontend
                calledFromBackend = !patientId,
                err,
                banklog,
                patient,
                createdReceipt;

            // ------------------------------ 1. Validations ------------------------------------------------------
            if( calledFromBackend && (!invoiceRef || !bankLogId) ) {
                //backend
                Y.log( `claimBankLogEntry: Backend-call is missing arguments: ${args}`, 'error', NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '500', 'Missing arguments' ), undefined, callback );
            }
            if( !calledFromBackend && (!patientId || !caseFolderId || !bankLogId) ) {
                //frontend
                Y.log( `claimBankLogEntry: Frontend-call is missing arguments: ${args}`, 'error', NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '500', 'Missing arguments' ), undefined, callback );
            }
            // ------------------------------------ 1. END --------------------------------------------------------

            // ---------------------- 2. Get bankLogEntry by Id and make sure it is 'UNPROCESSED' -----------------------------------
            [err, banklog] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'banklog',
                    action: 'get',
                    user: user,
                    query: {_id: bankLogId}
                } )
            );

            if( err ) {
                Y.log( `claimBankLogEntry: Error while querying bankLogId: ${bankLogId}. Error: ${err.stack || err}`, "error", NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '115000' ), undefined, callback );
            }

            if( !banklog || !Array.isArray( banklog ) || !banklog.length ) {
                Y.log( `claimBankLogEntry: bankLogEntry not found for Id: ${bankLogId}`, "error", NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '115002' ), undefined, callback );
            }
            banklog = banklog[0];

            if( banklog.status !== "UNPROCESSED" ) {
                Y.log( `claimBankLogEntry: bankLogId: ${bankLogId} is already claimed`, "error", NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '115003' ), undefined, callback );
            }
            // ------------------------------------------------ 2. END ------------------------------------------------------------------

            // ----------------------------- 3. Check if patient exists for the provided patient ID -------------------------------------------------
            [err, patient] = await formatPromiseResult(
                findPatient( user, patientId )
            );

            if( err ) {
                Y.log( `claimBankLogEntry: Error while querying patient by ID: ${patientId}. Error: ${err.stack || err}`, "error", NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '115000' ), undefined, callback );
            }

            if( !patient ) {
                Y.log( `claimBankLogEntry: patient with ID: ${patientId} not found in DB`, "info", NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '115006' ), undefined, callback );
            }
            patient = patient[0];
            const patientName = Y.doccirrus.schemas.person.personDisplay( patient );

            // ------------------------------------------ 3. END ------------------------------------------------------------------------------------

            //frontend-call doesnt provide invoiceRef, so we need to check if it even exists
            if( !invoiceRef ) {
                [err, invoiceRef] = await formatPromiseResult(
                    Y.doccirrus.api.invoice.findInvoiceRef( {
                        user: user,
                        patientId: patientId,
                        caseFolderId: caseFolderId,
                        invoiceNo: banklog.invoiceNo,
                        referenceNo: banklog['Reference number']
                    } )
                );

                if( err ) {
                    Y.log( `claimBankLogEntry: Error while finding invoiceRef by reference number: ${banklog['Reference number']} or invoiceNo: ${banklog.invoiceNo} and patient Id: ${patientId}. Error: ${err.stack || err}`, "error", NAME );
                    logExit( timer );
                    return handleResult( Y.doccirrus.errors.rest( '115000' ), undefined, callback );
                }

                if( !invoiceRef || !Array.isArray( invoiceRef ) || !invoiceRef.length ) {
                    Y.log( `claimBankLogEntry: invoiceRef by reference number: ${banklog['Reference number']} or invoiceNo: ${banklog.invoiceNo} and patient Id: ${patientId} not found in DB`, "info", NAME );
                    logExit( timer );
                    return handleResult( Y.doccirrus.errors.rest( '115029' ), undefined, callback );
                }
                invoiceRef = invoiceRef[0];
            }

            // ----------------------------- 4. Create activity ----------------------------------------------------------------------------
            // make balance
            const
                numbers = amount.split( '' ),
                removed = numbers.splice( 8, 0, "." ), // eslint-disable-line
                fixedBalance = numbers.join( '' );

            [err, createdReceipt] = await formatPromiseResult(
                quickCreateP( {
                    data: {
                        invoiceId: invoiceRef && invoiceRef._id && invoiceRef._id.toString(),
                        amount: fixedBalance,
                        createBadDebt: false,
                        linkToInvoice: true,
                        approve: false,
                        paymentMethod: 'BANKTRANSACTION'
                    },
                    user: user
                } )
            );

            if( err ) {
                Y.log( `claimBankLogEntry: Error in createActivity. ${err.stack || err}`, "error", NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '115008' ), undefined, callback );
            }


            //  intermittent floating point weirdness can cause tiny fractions, round to the cent when comparing receipts to invoice
            const
                roundReceiptAmount = parseFloat( createdReceipt && createdReceipt.amount ? createdReceipt.amount : 0 ).toFixed( 2 ),
                roundOutstanding = parseFloat( invoiceRef && invoiceRef.totalReceiptsOutstanding ).toFixed( 2 );
            if( createdReceipt && (roundReceiptAmount === roundOutstanding) ) {
                [err] = await formatPromiseResult(
                    doTransitionP( {
                        user: user,
                        data: {
                            activity: invoiceRef,
                            transition: 'pay',
                            _isTest: 'false'
                        }
                    } )
                );

                if( err ) {
                    Y.log( `claimBankLogEntry: Error in transition to pay. ${err.stack || err}`, "error", NAME );
                    logExit( timer );
                    return handleResult( Y.doccirrus.errors.rest( '115008' ), undefined, callback );
                }
            }
            // ---------------------------------------- 4. END ---------------------------------------------------------------------------------------

            // ----------------------------- 5. Claim deviceLog entry in DB ----------------------------------------------------------------------------
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'banklog',
                    action: 'put',
                    user: user,
                    query: {_id: bankLogId},
                    data: Y.doccirrus.filters.cleanDbObject( {
                        status: 'PROCESSED',
                        patientName: patientName,
                        patientId: patientId || (invoiceRef && invoiceRef.patientId),
                        activityId: createdReceipt._id,
                        caseFolderId: caseFolderId || (invoiceRef && invoiceRef.caseFolderId)
                    } ),
                    fields: ['status', 'patientId', 'activityId', 'patientName', 'caseFolderId']
                } )
            );

            if( err ) {
                Y.log( `claimBankLogEntry: Error while claiming bankLogId: ${bankLogId} by patientId: ${patientId} and activityId: ${createdReceipt && createdReceipt._id}. ${err.stack || err}`, "error", NAME );
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( '115009' ), undefined, callback );
            }
            // ---------------------------------------- 5. END ---------------------------------------------------------------------------------------

            // ---------------------- 6. If notify the UI to reload activities table ------------------------
            if( createdReceipt ) {
                await formatPromiseResult(
                    notifyUIToReloadActivitiesTable( user, createdReceipt )
                );
            }
            // -----------------------------------------------------6. END --------------------------------------------------------------------------

            logExit( timer );
            return handleResult( undefined, createdReceipt._id, callback );
        }

        /**
         *
         * @param {module:authSchema.auth} user
         * @param {module:v_receiptSchema.v_receipt} activity
         * @return {Promise<void>}
         */
        async function notifyUIToReloadActivitiesTable( user, activity ) {
            if( !activity || activity.caseFolderId ) {
                Y.log( `notifyUIToReloadActivitiesTable: casefolderId is not present for activityId: ${activity && activity._id}`, "warn", NAME );
                throw `casefolderId is not present for activityId: ${activity && activity._id}`;
            }

            // ------------------------------------ 1. Notify UI to reload case file for activityArr[0].casefolderId --------------------------------------------------
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: activity.caseFolderId
                }
            } );
            // ---------------------------------------------------------------- 1. END --------------------------------------------------------------------------
        }

        /**
         *
         * @param {Object} args
         * @return {Promise<{callback}|*>}
         */
        async function unsassignActivityFromBankLogRecord( args ) {
            Y.log( 'Entering Y.doccirrus.api.banklog.unsassignActivityFromBankLogRecord', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.banklog.unsassignActivityFromBankLogRecord' );
            }
            const
                {user, data = {}, callback} = args,
                {bankLogId, activityId} = data;

            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'banklog',
                    action: 'put',
                    user: user,
                    query: {_id: bankLogId},
                    data: Y.doccirrus.filters.cleanDbObject( {
                        status: 'UNPROCESSED',
                        patientName: '',
                        patientId: '',
                        activityId: ''
                    } ),
                    fields: ['status', 'patientId', 'activityId', 'patientName']
                } )
            );

            if( err ) {
                Y.log( `unsassignActivityFromBankLogRecord: Error while claiming bankLogId: unsassign activityId: ${activityId} from banking book record ${bankLogId}. ${err.stack || err}`, "error", NAME );

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115009' ) );
                }
            }

            [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.activity.delete( {
                        user,
                        query: {_id: activityId},
                        callback: ( err, result ) => {
                            var data = result && result[0] && result[0].data;
                            if( err ) {
                                return reject( err );
                            }
                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: user.identityId,
                                event: 'system.UPDATE_ACTIVITIES_TABLES',
                                msg: {
                                    data: data.caseFolderId
                                }
                            } );
                            resolve();
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `unsassignActivityFromBankLogRecord: Error while removing activity with activityId: ${activityId} from banking book record ${bankLogId}. ${err.stack || err}`, "error", NAME );

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '115009' ) );
                }
            }

            return callback( null );
        }

        /**
         *
         * @param {Object} args
         * @return {Promise<{callback}|*>}
         */
        async function runTest( args ) {
            Y.log( 'Entering Y.doccirrus.api.banklog.runTest', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.banklog.runTest' );
            }
            const
                {user, data = {}, callback} = args,
                fs = require( 'fs' ),
                path = `${process.cwd()}/mojits/BankLogMojit/assets/xml/`,
                filename = 'dummy_request.xml',
                transformerFn = Y.doccirrus.api.flow_transformers[Y.doccirrus.schemas.flow.transformerTypes.MEDIPORT_RES];
            let [err, xml] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    fs.readFile( path + filename, 'utf8', ( err, data ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( data );
                    } );
                } )
            );

            if( err ) {
                Y.log( `runTest: error reading xml file. ${err.stack || err}`, "error", NAME );
                if( callback ) {
                    return callback( err );
                }
            }

            let providerEnding = "InvoiceResponse_450_2";
            xml = xml.replace( providerEnding, data.invoiceNo );
            xml = Buffer.from( xml );
            transformerFn( {input: {data: xml}}, user, ( err, ret ) => {
                if( err ) {
                    return callback( err );
                }
                // creating activity on callback
                let data = (ret && ret.data) || {},
                    query = (ret && ret.query) || {};
                Y.doccirrus.api.activity.createCommunicationFromMediport( {
                    user,
                    data,
                    query,
                    callback( err, res ) {
                        callback( err, res );
                    }
                } );
            } );
        }

        /**
         * @method duplicateCheck
         *
         * @param {Object} args - Object of Arguments.
         * @param {Object} args.data - Raw File Data.
         * @param {ArrayBuffer} args.data.data - Raw File Data.
         * @param {String} args.data.fileName - File name.
         * @param {Object} args.user - User Object.
         * @param {Function} [args.callback] - callback.
         *
         * @return {String} fileHash
         */
        async function duplicateCheck( args ) {
            let timer = logEnter( 'Y.doccirrus.api.banklog.duplicateCheck' );

            const {
                data: {
                    fileData,
                    fileName
                },
                user,
                callback
            } = args;

            if( !fileData || !fileName ) {
                Y.log( `duplicateCheck - no fileData: ${fileData} or no fileName: ${fileName} provided`, 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 19001 ), null, callback );
            }

            const
                buffer = Buffer.from( fileData ),
                fileHash = Y.doccirrus.api.xdtTools.fastHash( buffer ).toString( 16 );

            Y.log( `duplicateCheck - BESR File hash is: ${fileHash} ( ${fileName} )`, 'debug', NAME );

            let [err, res] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'banklog',
                    action: 'get',
                    query: {
                        fileHash: fileHash
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `duplicateCheck - ${err.stack || err}`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 19001 ), null, callback );
            }
            if( res.length > 0 ) {
                Y.log( 'duplicateCheck - BESR file hash found in database, preventing duplicate import.', 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 19000 ), null, callback );
            }

            logExit( timer );
            return handleResult( null, fileHash, callback );
        }

        /**
         * @class banklog
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).banklog = {
            /**
             * @property name
             * @type {String}
             * @default banklog-api
             * @protected
             */
            name: NAME,
            // --------------- JSONRPC Methods -------------
            createBankLogRecord,
            runBESR,
            claimBankLogEntry,
            unsassignActivityFromBankLogRecord,
            runTest,
            duplicateCheck,
            uploadBESR

        };

    },

    '0.0.1', {
        requires: [
            'dccommunication',
            'dcauth'
        ]
    }
);
