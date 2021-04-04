/**
 * User: oliversieweke
 * Date: 21.12.18  14:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

// ================================================================================================================== \\
// This file contains the logic for generating TARMED invoices through the SUMEX Sol. The generation proper is done by
// the Sumex module, implemented as a sol.

// Exported methods:
// - genereateTarmedInvoices()

// Related files:
// - sumex-generalInvoiceRequest450.server.js: contains the API methods for interacting with the Sumex module.
// - sumex-mappers.server.js: contains functions to map inSuite fields to Sumex parameters.
// - tarmed-utils.server.js: contains utility functions to stream schein entries by patient for a given tarmedlog

// Given how the SUMEX Sol is running in a WINE emulator, it was technically complicated to keep data in memory
// for related operations. What is thus actually happening is that related operations are being grouped by patients,
// collected into a JSON file and sent in a single request to the SUMEX Sol with a sendOperationsToSumexSol() call.
// Operations are then executed in order, taking into account how API calls are chained and nested.

// ================================================================================================================== \\

YUI.add( 'tarmed-invoices', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const util = require('util'),
            ObjectId = require( 'mongoose' ).Types.ObjectId;

        /**
         * This method streams scheins for each patient for a given tarmedlog. Sumex operations are then constructed and the
         * invoice generation over the Sumex module is triggered for each patient. If successful, the invoice XML is saved
         * through gridfs.
         * The method finally returns an array containing all invoice XML ids.
         *
         * @PUBLIC
         * @method genereateTarmedInvoices
         *
         * @param {Object} args                        :REQUIRED:
         * @param {Object} args.tarmedlog              :REQUIRED:
         * @param {Object} args.user                   :REQUIRED: Used for DB operations
         * @returns {Array} Array of invoiceXML ids (saved through gridfs)
         */
        async function genereateTarmedInvoices( {tarmedlog, user, onProgress} ) {
            let err, progressCount = 0;
            const tarmedlogId = tarmedlog._id.toString();

            function gridfsStorePromise ( user, filename, options, buffer ) {
                return new Promise( function( resolve, reject ) {
                    const callback = function( err, result ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( result );
                    };
                    Y.doccirrus.gridfs.store( user, filename, options, buffer, callback );
                } );
            }

            const scheinResults = [],
                invoiceDocs = [],
                errors = [],
                warnings = [],
                successfullScheins = [],
                {excludedPatientIds = [], excludedScheinIds = []} = tarmedlog;

            let firstAttempt = true,
                failedScheins = [];

            progressCount += 10;
            _showProgress( progressCount );

            // ---------- SEND SUMEX REQUEST FOR EACH SCHEIN ----------
            [err] = await formatPromiseResult( Y.doccirrus.tarmedUtils.handleScheinsInBatch( {
                user, tarmedlogId, excludedScheinIds, excludedPatientIds,
                medidataRejected: tarmedlog.collectMedidataRejected,
                handler: _generateInvoiceHandler
            } ) );

            firstAttempt = false;
            if( err ) {
                Y.log( `genereateTarmedInvoices(): invoiceref generation error tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
            }

            // ---------- RETRY IF SERVER ERROR HAPPENED ----------
            if( failedScheins.length ) {
                Y.log(`genereateTarmedInvoices(): some of scheins failed (${failedScheins.length} items), retry...`, 'info', NAME);
                [err] = await formatPromiseResult( Y.doccirrus.tarmedUtils.retryScheinsHandle( {
                    user, tarmedlogId, scheins: failedScheins,
                    handler: _generateInvoiceHandler
                } ) );

                if( err ) {
                    Y.log( `genereateTarmedInvoices(): invoiceref generation error tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                }
            }

            if( Array.isArray( errors ) && errors.length ) {
                Y.log( `genereateTarmedInvoices(): Invoice generation fo tarmedlog ${tarmedlogId} Finished with ${errors.length} errors`, 'error', NAME );
                return {
                    errors,
                    warnings
                };
            }

            // ---------- GENERATE INVOICEREF FOR EACH SCHEIN RESULT ----------
            Y.log(`genereateTarmedInvoices(): ${scheinResults.length} requests have been sent and received successfully. No more sumex requests`, 'info', NAME);
            failedScheins = [];
            let finishedCount = 0;
            let promises = scheinResults.map( async function( scheinResult ) {
                const {xml, pdf, schein} = scheinResult,
                    invoiceDoc = {scheinId: schein._id},
                    patientId = schein.data.patientId;

                let invoiceRef;

                if( tarmedlog.collectMedidataRejected && schein.data.invoiceRefId && schein.data.actType === 'INVOICEREF' ) {
                    let res;
                    [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        query: {
                            actType: 'INVOICEREF',
                            _id: schein.data.invoiceRefId
                        }
                    } ) );

                    if( err ) {
                        Y.log( `genereateTarmedInvoice(): error in getting rejected invoiceRef by id ${schein.data.invoiceRefId} for tarmedlog ${tarmedlogId}.`, 'error', NAME );
                        return _handleScheinError( {errorCode: 'sumex_13', schein, pushFailedScheins: true} );
                    }

                    invoiceRef = res && res[0];
                }

                if( !invoiceRef ) {
                    [err, invoiceRef] = await formatPromiseResult(
                        Y.doccirrus.api.invoicelog.createReferenceActivity(
                            user,
                            schein,
                            'INVOICEREF',
                            '',
                            true )
                    );

                    if( err ) {
                        Y.log( `genereateTarmedInvoice(): error in generating invoiceRef for tarmedlog ${tarmedlogId}.`, 'error', NAME );
                        return _handleScheinError( {errorCode: 'sumex_13', schein, pushFailedScheins: true} );
                    }
                }
                Y.log( `genereateTarmedInvoice(): created/fetched invoiceRef successfully`, 'debug', NAME );

                const fsmName = Y.doccirrus.schemas.activity.getFSMName( invoiceRef.actType ),
                    fsmStateChangePromise = function( user, options, activity, isTest, stateChangeFn ) {
                        return new Promise( function( resolve, reject ) {
                            const callback = function( err, result ) {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve( result );
                            };
                            stateChangeFn( user, options, activity, isTest, callback );
                        } );
                    };

                const fileName = `${tarmedlogId}-${schein._id}`;
                let createDocumentsResult;

                [err, createDocumentsResult = {}] = await formatPromiseResult( createDocumentsFromFiles( {
                    user, xml, pdf, fileName, activityId: invoiceRef._id
                } ) );

                if( err ) {
                    Y.log( `genereateTarmedInvoices(): Sumex documents generation for invoiceRef ${invoiceRef._id} failed.\nError: ${err.stack || err}`, 'error', NAME );
                    [err] = await formatPromiseResult( fsmStateChangePromise( user, {}, invoiceRef, false, Y.doccirrus.fsm[fsmName].cancel ) );
                    if( err ) {
                        Y.log( `genereateTarmedInvoices(): failed to cancel invoiceref ${invoiceRef._id}. \n Error: ${err.message || err}`, 'error', NAME );
                    }
                    return _handleScheinError( {errorCode: 'sumex_14', schein, pushFailedScheins: true} );
                }

                const {attachments, pdfDoc, xmlDoc} = createDocumentsResult;

                if( xmlDoc ) {
                    const xmlFileName = xmlDoc.media.origFilename.split( '/' ).pop();
                    [err] = await formatPromiseResult( gridfsStorePromise( user, xmlFileName, {}, Buffer.from( xml ) ) );

                    if( err ) {
                        Y.log( `genereateTarmedInvoices(): error in saving invoice XML over gridfs for patient ${patientId} and tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                        return _handleScheinError( {errorCode: 'sumex_14', schein, pushFailedScheins: true} );
                    }
                    invoiceDoc.xml = xmlFileName;
                }
                if( pdfDoc ) {
                    const pdfFileName = pdfDoc.media.origFilename.split( '/' ).pop();
                    [err] = await formatPromiseResult( gridfsStorePromise( user, pdfFileName, {}, Buffer.from( pdf, 'base64' ) ) );

                    if( err ) {
                        Y.log( `genereateTarmedInvoices(): error in saving invoice XML over gridfs for patient ${patientId} and tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                        return _handleScheinError( {errorCode: 'sumex_14', schein, pushFailedScheins: true} );
                    }
                    invoiceDoc.pdf = pdfFileName;
                }
                //if doccPrinted === true need to create a copy of the invoice PDF
                if( schein.data.docPrinted ) {
                    let invoiceCopyResult;
                    [err, invoiceCopyResult] = await formatPromiseResult( generateInvoiceCopy( {
                        user,
                        invoice: invoiceRef,
                        xml,
                        ownerId: tarmedlogId,
                        schein: schein
                    } ) );
                    if( err || !invoiceCopyResult ) {
                        Y.log( `Failed to generate invoice copy for patient ${patientId} and tarmedlog ${tarmedlogId}`, 'error', NAME );
                    } else if( invoiceCopyResult.errors && invoiceCopyResult.errors.length ) {
                        Y.log( `genereateTarmedInvoices(): errors in generating invoice copy for patient ${patientId} and tarmedlog ${tarmedlogId}.`, 'error', NAME );
                        warnings.push( ...invoiceCopyResult.errors );
                    } else if( invoiceCopyResult.copyPdf ) {
                        attachments.push( invoiceCopyResult.copyPdf._id );
                        invoiceDoc.copyPdf = `${fileName}-copy.pdf`;
                    }
                }
                invoiceDocs.push( invoiceDoc );

                if( invoiceRef.attachments && invoiceRef.attachments.length ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'document',
                            action: 'put',
                            query: {
                                _id: {
                                    $in: invoiceRef.attachments
                                },
                                type: {
                                    $in: ['SUMEXXML', 'SUMEXPDF']
                                }
                            },
                            fields: ['title'],
                            data: {title: 'rejected', skipcheck_: true}
                        } )
                    );
                    if( err ) {
                        Y.log( `genereateTarmedInvoices(): error updating activity attachments ${invoiceRef._id} : ${err.stack || err}`, 'warn', NAME );
                    }
                }

                const saveAttachments = (invoiceRef.attachments || []).concat(attachments);

                [err] = await formatPromiseResult( fsmStateChangePromise( user, {}, invoiceRef, false, Y.doccirrus.fsm[fsmName].approve ) );

                if( err ) {
                    Y.log( `genereateTarmedInvoices(): failed to approve activities for tarmedlog ${tarmedlogId}. \n Error: ${err}`, 'error', NAME );
                    [err] = await formatPromiseResult( fsmStateChangePromise( user, {}, invoiceRef, false, Y.doccirrus.fsm[fsmName].delete ) );
                    if( err ) {
                        Y.log( `genereateTarmedInvoices(): failed to delete invoiceref ${invoiceRef._id}. \n Error: ${err.message || err}`, 'error', NAME );
                    }
                    return _handleScheinError( {errorCode: 'sumex_13', schein, pushFailedScheins: true} );
                }

                // update activity with attachments and link to inviceLog
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'put',
                        query: {
                            _id: invoiceRef._id
                        },
                        fields: ['attachments', 'medidataRejected', 'invoiceLogId', 'kvglogId'],
                        data: {invoiceLogId: tarmedlogId, kvglogId: tarmedlogId, attachments: saveAttachments, medidataRejected: false, skipcheck_: true}
                    } )
                );

                if( err ) {
                    Y.log( `genereateTarmedInvoices(): error updating activity ${invoiceRef._id} : ${err.stack || err}`, 'warn', NAME );
                    [err] = await formatPromiseResult( fsmStateChangePromise( user, {}, invoiceRef, false, Y.doccirrus.fsm[fsmName].cancel ) );
                    if( err ) {
                        Y.log( `genereateTarmedInvoices(): failed to cancel invoiceref ${invoiceRef._id}. \n Error: ${err.message || err}`, 'error', NAME );
                    }
                    return _handleScheinError( {errorCode: 'sumex_14', schein, pushFailedScheins: true} );
                }
                successfullScheins.push(schein);

                progressCount += 100 / scheinResults.length * 0.4;
                finishedCount++;
                Y.log(`genereateTarmedInvoices(): Finished document generation for ${finishedCount}/${scheinResults.length} invoices.`, 'info', NAME);
                _showProgress( progressCount );
            } );

            [err] = await formatPromiseResult(Promise.all(promises));

            if( err ) {
                Y.log( `genereateTarmedInvoices(): Unexpected error in Promise.all while creating invoiceRefs.\n${err && err.stack || err}`, 'error', NAME );
            }

            let newTarmedlogId, totalItems, priceTotal;
            if( successfullScheins.length && failedScheins.length ) {
                _showProgress( 75 );

                Y.log( `genereateTarmedInvoices(): invoiceref generation failed for ${failedScheins.length} scheins for tarmedlog ${tarmedlogId}.`, 'error', NAME );
                let result;

                [err, result] = await formatPromiseResult( generateFailureTarmedLog( {
                    user,
                    scheins: failedScheins,
                    originalTarmedlog: tarmedlog,
                    errors
                } ) );

                if( err ) {
                    Y.log(`Failed to create tarmedlog for failed scheins. Error:\n${err.stack || err}`, 'error', NAME);
                }
                newTarmedlogId = result;

                // subtract failed scheins from successfull tarmedlog
                totalItems = calculateTotalItems( successfullScheins );
                const failedScheinsTotal = calculateScheinsTotal( failedScheins );
                priceTotal = tarmedlog.priceTotal - failedScheinsTotal;
            }
            _showProgress( 90 );

            return {
                errors: newTarmedlogId ? [] : errors,
                warnings,
                invoiceDocs,
                totalItems,
                priceTotal
            };

            // --------------------------------- INTERNAL FUNCTIONS DECLARATION ------------------------------------
            function _showProgress( count ) {
                if( onProgress ) {
                    onProgress( {
                            total: 100,
                            current: count,
                            durationElapsed: 0,
                            type: 'sending'
                        }
                    );
                }
            }

            async function _generateInvoiceHandler( {tarmedlogId, schein, user, scheinsLength} ) {
                let err, resultObj, scheinResult = {schein};
                [err, resultObj = {}] = await formatPromiseResult( Y.doccirrus.api.sumex.generalInvoiceRequest( {
                    invoicelogId: tarmedlogId,
                    schein,
                    user,
                    requestType: 'generate'
                } ) );

                if( firstAttempt && Number.isFinite( scheinsLength ) ) {
                    progressCount += 100 / scheinsLength * 0.4;
                    _showProgress( progressCount );
                }

                if( err ) {
                    Y.log( `genereateTarmedInvoices(): error occured in generating iGeneralInvoiceRequest tarmedlog ${tarmedlogId}.\nError: ${err.stack || err}`, 'error', NAME );
                    if( [500, 503, 504].includes( err.code ) ) {
                        return firstAttempt ? failedScheins.push( schein ) : _handleScheinError( {errorCode: 'sumex_15', schein} );
                    }
                    return _handleScheinError( {errorCode: err.code || 'sumex_03', schein} );
                }

                if( resultObj.errors && resultObj.errors.length ) {
                    Y.log( `genereateTarmedInvoices(): there are errors in generating iGeneralInvoiceRequest tarmedlog ${tarmedlogId}.`, 'error', NAME );
                    errors.push( ...resultObj.errors );
                    return;
                }
                let {xml, pdf} = resultObj;

                if( !xml && !pdf ) {
                    Y.log( `genereateTarmedInvoices(): no relevant activities present to generate iGeneralInvoiceRequest tarmedlog ${tarmedlogId}.`, 'error', NAME );
                    return _handleScheinError( {errorCode: 'sumex_12', schein} );
                }

                scheinResult.xml = xml;
                scheinResult.pdf = pdf;
                scheinResults.push( scheinResult );
            }

            function _handleScheinError( {errorCode, schein, pushFailedScheins} ) {
                const err = Y.doccirrus.errors.rest( errorCode ),
                    sumexError = Y.doccirrus.tarmedUtils.generateSumexError( {
                        schein,
                        text: Y.doccirrus.errorTable.getMessage( err ),
                        errorCode
                    } );

                errors.push( sumexError );
                if( pushFailedScheins ) {
                    failedScheins.push( schein );
                }
            }
        }

        /**
         * Creates document and media from file or buffer
         *
         * @PUBLIC
         * @method createDocumentFromFile
         *
         * @param {Object} args                        :REQUIRED:
         * @param {Object} args.user                   :REQUIRED:
         * @param {String} args.ownerId                :REQUIRED:
         * @param {String} args.fileName               :REQUIRED:
         * @param {String} args.file                   :REQUIRED:
         * @param {String} args.fileType               :REQUIRED:
         * @param {String} args.model                  :OPTIONAL:
         * @param {String} args.docType                :OPTIONAL:
         * @param {Buffer} args.buffer                 :OPTIONAL:
         * @returns {Object} Object with document and media
         */

        async function createDocumentFromFile(args) {
            Y.log(`Entering tarmed-invoices.createDocumentFromFile()`, 'info', NAME);
            const {user, ownerId, fileName, file, fileType} = args;
            const writeFile = util.promisify( Y.doccirrus.media.writeFile ),
                importMediaFromFile = util.promisify( Y.doccirrus.media.importMediaFromFile ),
                tempDir = `${Y.doccirrus.media.getTempDir()}`,
                tempFile = `${tempDir}${fileName}`,
                model = args.model || 'activity',
                docType = args.docType || 'OTHER';
            let buffer, err;

            if(args.buffer) {
                buffer = args.buffer;
            } else {
                buffer = fileType === 'pdf' ? Buffer.from(file, 'base64') : Buffer.from(file);
            }

            [err] = await formatPromiseResult( writeFile( tempFile, tempDir, buffer ) );
            if( err ) {
                Y.log( `createDocumentFromFile(): error in writing pdf file \n${err && err.stack || err}`, 'error', NAME );
                Y.log(`Exiting tarmed-invoices.createDocumentFromFile()`, 'info', NAME);
                throw err;
            }

            let media;
            [err, media] = await formatPromiseResult( importMediaFromFile(
                user,
                tempFile,
                model,
                ownerId,
                fileName,
                fileType,
                docType || 'OTHER'
            ) );
            if( err ) {
                Y.log( `createDocumentFromFile(): error in creating pdf media \n${err && err.stack || err}`, 'error', NAME );
                Y.log(`Exiting tarmed-invoices.createDocumentFromFile()`, 'info', NAME);
                throw err;
            }

            let document;
            [ err, document ] = await formatPromiseResult( createDocument( user, {
                fileName,
                mediaId: media._id,
                type: fileType.toUpperCase(),
                activityId: ownerId,
                docType
            } ) );
            if ( err ) {
                Y.log( `createDocumentFromFile(): Problem creating attachments for ${ownerId}: ${err.stack||err}`, 'error', NAME );
                Y.log(`Exiting tarmed-invoices.createDocumentFromFile()`, 'info', NAME);
                throw err;
            }
            Y.log(`Exiting tarmed-invoices.createDocumentFromFile()`, 'info', NAME);
            return {document, media};
        }

        /**
         * Creates document from media, and link to activity
         *
         * @PRIVATE
         * @method createDocument
         *
         * @param {Object} user                        :REQUIRED:
         * @param {Object} attachment                  :REQUIRED:
         * @returns {Array} Array of invoiceXML ids (saved through gridfs)
         */

        async function createDocument( user, attachment ) {
            Y.log( `Entering tarmed-invoices.createDocument()`, 'info', NAME );
            const
                defaultLocationId = Y.doccirrus.schemas.location.getMainLocationId();

            let {fileName, mediaId, type, activityId = '', docType = 'OTHER'} = attachment;

            Y.log( `creating attachment for ${mediaId} filename: ${fileName}`, 'info', NAME );
            if( mediaId ) {
                let docObj = {
                    "type": docType,
                    "title": ['SUMEXXML', 'SUMEXPDF'].includes( docType ) ? 'sumex' : '',
                    "url": "/1/media/:download?_id=" + mediaId + `&mime=APPLICATION_${type}&from=casefile`,
                    "publisher": 'sumex',
                    "contentType": (type === 'PDF') ? 'application/pdf' : 'text/plain',
                    "subType": 'Import',
                    "locationId": defaultLocationId,
                    "isEditable": false,
                    "caption": fileName,
                    "origFilename": fileName,
                    "createdOn": new Date(),
                    "mediaId": mediaId,
                    "activityId": activityId,
                    "attachedTo": activityId,
                    "accessBy": []
                };

                docObj = Y.doccirrus.filters.cleanDbObject( docObj );

                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'post',
                        model: 'document',
                        data: docObj
                    } )
                );
                if( err ) {
                    Y.log( `createDocument: Could not post document. Error: ${err.stack || err}`, 'warn', NAME );
                    Y.log( `Exiting tarmed-invoices.createDocument()`, 'info', NAME );
                    throw err;
                }
                const documentId = result[0];
                Y.log( `Exiting tarmed-invoices.createDocument()`, 'info', NAME );
                return {
                    _id: documentId,
                    ...docObj
                };
            }
        }

        /**
         * @method generateInvoiceCopy
         * Generates copy PDF of the invoice, adds PDF to attached documents
         *
         * @param {Object} user  :REQUIRED:
         * @param {String} ownerId  :REQUIRED:
         * @param {Object} schein  :REQUIRED:
         * @param {String} xml  :REQUIRED:
         * @returns {Object}
         */
        async function generateInvoiceCopy({user, ownerId, schein, xml}) {
            Y.log(`Entering tarmed-invoices.generateInvoiceCopy()`, 'info', NAME);
            let err, resultObj, createDocument;

            [err, resultObj] = await formatPromiseResult(Y.doccirrus.api.sumex.generateInvoiceCopyPdf( {
                user, ownerId, schein, xml
            } ) );

            if(err) {
                Y.log(`Exiting tarmed-invoices.generateInvoiceCopy()`, 'info', NAME);
                throw err;
            }
            if(resultObj.errors && resultObj.errors.length) {
                Y.log( `generateInvoiceCopy(): error in generating iGeneralInvoiceRequest for invoice ${ownerId}.`, 'error', NAME );
                Y.log(`Exiting tarmed-invoices.generateInvoiceCopy()`, 'info', NAME);
                return {errors: resultObj.errors};
            }
            const copyPdf = resultObj.pdf,
                copyPdfFileName = `${ownerId}-${schein._id}-copy`;

            [err, createDocument] = await formatPromiseResult(createDocumentFromFile({
                user,
                ownerId,
                fileName: copyPdfFileName,
                file: copyPdf,
                fileType: 'pdf',
                docType: 'OTHER'
            }));

            if( err ) {
                Y.log( `generateInvoiceCopy(): failed to create document for invoice ${ownerId}.\n${err && err.stack || err}`, 'error', NAME );
                Y.log(`Exiting tarmed-invoices.generateInvoiceCopy()`, 'info', NAME);
                throw err;
            }

            Y.log(`Exiting tarmed-invoices.generateInvoiceCopy()`, 'info', NAME);
            return {copyPdf: createDocument.document};
        }
        /**
         * This method creates and saves documents from files and returns attachments.
         *
         * @PUBLIC
         * @method createDocumentsFromFiles
         *
         * @param {Object} args                     :REQUIRED:
         * @param {Object} args.user                :REQUIRED: Used for DB operations
         * @param {Object} args.activityId          :REQUIRED: documents will be associated with
         * @param {Object} args.xml                 :REQUIRED: xml file
         * @param {Object} args.pdf                 :REQUIRED: pdf file
         * @param {Object} args.sumex               :OPTIONAL: defines whether documents are from Sumex or not
         * @returns {Object} with attachments array and pdfDoc
         */

        async function createDocumentsFromFiles({user, xml, pdf, fileName, activityId, sumex = true}) {
            Y.log(`Entering tarmed-invoices.createDocumentsFromFiles`, 'info', NAME);
            let err, xmlDoc, pdfDoc;
            const attachments = [];

            if(pdf) {
                [err, pdfDoc] = await formatPromiseResult(createDocumentFromFile({
                    user,
                    ownerId: activityId,
                    fileName: `${fileName}.pdf`,
                    fileType: 'pdf',
                    docType: sumex ? 'SUMEXPDF' : 'PDF',
                    file: pdf
                }));

                if(err) {
                    Y.log(`Failed to create PDF document for activity ${activityId}`, 'error', NAME);
                    Y.log(`Exiting tarmed-invoices.createDocumentsFromFiles`, 'info', NAME);
                    throw err;
                }

                attachments.push(pdfDoc.document._id);
            }

            if(xml) {
                [err, xmlDoc] = await formatPromiseResult(createDocumentFromFile({
                    user,
                    ownerId: activityId,
                    fileName: `${fileName}.xml`,
                    fileType: 'xml',
                    docType: sumex? 'SUMEXXML' : 'OTHER',
                    file: xml
                }));

                if(err) {
                    Y.log(`Failed to create XML document for activity ${activityId}`, 'error', NAME);
                    Y.log(`Exiting tarmed-invoices.createDocumentsFromFiles`, 'info', NAME);
                    throw err;
                }

                attachments.push(xmlDoc.document._id);
            }
            Y.log(`Exiting tarmed-invoices.createDocumentsFromFiles`, 'info', NAME);
            return {
                attachments,
                pdfDoc,
                xmlDoc
            };
        }

        async function saveAttachmentsToActivity( {user, activity, createdDocuments} ) {
            let error;
            activity.attachments = activity.attachments.concat(createdDocuments.attachments);
            const {pdfDoc, xmlDoc} = createdDocuments;

            [error] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                action: 'put',
                model: 'activity',
                data: Y.doccirrus.filters.cleanDbObject({
                    attachments: activity.attachments
                }),
                query: {_id: activity._id},
                fields: ['attachments']
            }));

            if( error ) {
                Y.log( `saveAttachmentsToActivity: error in updating activity ${activity._id}.\n${error && error.stack || error}`, 'error', NAME );
                throw error;
            }
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                nsp: 'default',
                event: 'onPDFCreated',
                msg: {
                    data: {
                        'status': 'complete',
                        'mediaId': pdfDoc.media._id,
                        'activity': activity,
                        'owner': activity
                    }
                }
            } );
            return {pdfDoc, xmlDoc};
        }

        function calculateTotalItems( scheins ) {
            const nScheins = scheins.length,
                nActivities = scheins.map( s => (s.data.treatments || []).length + (s.data.medications || []).length ).reduce( ( a, b ) => a + b, 0 ),
                nDiagnoses = scheins.map( s => (s.data.diagnoses || []).length ).reduce( ( a, b ) => a + b, 0 );

            return `${nScheins}/${nActivities}/${nDiagnoses}`;
        }

        function calculateScheinsTotal( scheins ) {
            let scheinsTotal = 0;
            scheins.forEach(schein => {
                const treatmentsTotal = (schein.data.treatments || []).map(t => t.price || 0).reduce( ( a, b ) => a + b, 0 ),
                    medicationsTotal = (schein.data.medications || []).map(m => {
                        if( !m || parseFloat( m.phPriceSale ) ) {
                            return 0;
                        }
                        return parseFloat( m.phPriceSale );
                    }).reduce( ( a, b ) => a + b, 0 ),

                    total = treatmentsTotal + medicationsTotal;

                scheinsTotal += Math.round( total * 20 ) / 20;
            });
            return scheinsTotal;
        }

        async function generateFailureTarmedLog( {user, scheins, originalTarmedlog, errors} ) {
            Y.log('Entering Y.doccirrus.tarmedInvoices.generateFailureTarmedLog', 'info', NAME);
            function _updateInvoiceLogId( {model, ids} ) {
                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model,
                    query: {
                        _id: {$in: ids}
                    },
                    action: 'update',
                    data: {
                        $set: {invoiceLogId: tarmedlogId.toString()}
                    },
                    options: {
                        multi: true
                    }
                } );
            }

            let location = {
                _id: originalTarmedlog.mainLocationId || originalTarmedlog.locationId,
                locname: originalTarmedlog.locname
            }, err, result;

            const settings = Y.doccirrus.api.tarmedlog.getSettingsFromTarmedlog( originalTarmedlog ),
                newTarmedlog = Y.doccirrus.api.tarmedlog.generateNewTarmedLogData( {user, location, settings} ),
                tarmedlogId = new ObjectId(),
                logInfo = { id: tarmedlogId.toString(), isPreValidation: true, countryCode: 'CH'};


            newTarmedlog.totalItems = calculateTotalItems( scheins );
            newTarmedlog.status = 'INVALID';
            newTarmedlog.output = errors;
            newTarmedlog._id = tarmedlogId;
            newTarmedlog._log_version = Y.doccirrus.schemas.invoicelog.LATEST_LOG_VERSION;

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'tarmedlog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( newTarmedlog )
            } ) );

            if( err ) {
                Y.log( `SUMEX: generateFailureTarmedlog: Failed to generate new tarmedlog for failed scheins. Error:\n${err.stack || err}`, 'error', NAME );
                throw err;
            }

            let activityIds = [];
            scheins.forEach( schein => {
                activityIds.push( schein.data._id );
                activityIds = activityIds.concat( (schein.data.treatments || []).map( t => t._id ) );
                activityIds = activityIds.concat( (schein.data.medications || []).map( m => m._id ) );
                activityIds = activityIds.concat( (schein.data.diagnoses || []).map( d => d._id ) );
            } );

            [err] = await formatPromiseResult( _updateInvoiceLogId( {
                model: 'activity',
                ids: activityIds
            } ) );

            if( err ) {
                Y.log( `SUMEX: generateFailureTarmedlog: Failed to update activity invoiceLogId. Error:\n${err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err] = await formatPromiseResult( _updateInvoiceLogId( {
                model: 'invoiceentry',
                ids: scheins.map( s => s._id )
            } ) );

            if( err ) {
                Y.log( `SUMEX: generateFailureTarmedlog: Failed to update invoiceentries invoiceLogId. Error:\n${err.stack || err}`, 'error', NAME );
                throw err;
            }

            let collectState;

            //collect invoiceentries for new tarmedlog
            try {
                [err, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'location',
                    action: 'get',
                    query: {
                        _id: location._id
                    }
                }));

                if( err || !result || !result.length) {
                    Y.log( `generateFailureTarmedLog: error in getting location for tarmedlog ${tarmedlogId.toString()}:\n${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }
                location = result[0];
                logInfo.commercialNo = location.commercialNo;
                logInfo.zsrNumber = location.zsrNumber;

                [err, collectState] = await formatPromiseResult( Y.doccirrus.api.tarmedlog.collectInvoiceEntries( {
                    user,
                    tarmedlog: newTarmedlog,
                    logInfo
                } ) );
                if( err ) {
                    Y.log( `generateFailureTarmedLog: error in collecting invoice entries for tarmedlog with id: ${tarmedlogId.toString()}. ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
            } catch ( exception ) {
                Y.log( `generateFailureTarmedLog: failed to collect invoice entries for tarmedlog with id: ${tarmedlogId.toString()}. ${exception.stack || exception}`, 'error', NAME );
            }

            [err] = await formatPromiseResult( Y.doccirrus.api.tarmedlog.updateTarmedlogValidationStatus( {
                user,
                tarmedlog: newTarmedlog,
                collectState,
                actionResults: {
                    errors
                }
            } ) );

            if( err ) {
                Y.log( `SUMEX: generateFailureTarmedlog: Failed to update tarmedlog validation status Error:\n${err.stack || err}`, 'error', NAME );
                throw err;
            }

            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'tarmedLogging',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                msg: {
                    data: {
                        error: Y.doccirrus.errors.rest('tarmed_08'),
                        invoiceType: 'KVG'
                    }
                }
            } );

            return tarmedlogId;
        }

        Y.namespace( 'doccirrus' ).tarmedInvoices = {
            name: NAME,
            genereateTarmedInvoices,
            createDocumentFromFile,
            createDocumentsFromFiles,
            saveAttachmentsToActivity,
            generateInvoiceCopy
        };
    },
    '0.0.1', { requires: ['sumex', 'sumex-mappers', 'dcmongodb', 'kbvlog-api', 'patient-api', 'basecontact-api', 'tarmed-utils', 'sumex-generalInvoiceRequest450', 'dcgridfs', 'dcinvoicelogutils']}
);
