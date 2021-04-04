/**
 * User: strix
 * Date: 23/01/16
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'mailmerge-helper', function( Y, NAME ) {

        const
            async = require( 'async' ),
            moment = require( 'moment' ),
            {formatPromiseResult} = require( 'dc-core' ).utils,
            i18n = Y.doccirrus.i18n,
            DCError = Y.doccirrus.commonerrors.DCError;

        /**
         *  Create COMMUNICATION activities for all users in a mailmerge and render PDFs for them based on a
         *  given form.
         *
         *  Overall process:
         *
         *      -> 1. Create a document and activity for each patient
         *        -> 1.1 Process a single patient at a time
         *      -> 2. Render PDFs from all documents/activities created
         *        -> 2.1 Process a single PDF at a time
         *      -> 3. Read the PDFs from GridFS to a folder on disk for concat
         *        -> 3.1 Extract a single file at a time, record new filename
         *      -> 4. Join all PDF files into a single file with external utility
         *      -> 5. Delete all the new activities, documents and media if box was checked
         *      -> X. Call back with metadata usefile to the client
         *
         *  Note: this should call back with an object containing:
         *
         *      (*) location of a PDF file (all activity PDFs concatenated together)
         *      (*) a zip ID (individual PDFs named by client)
         *      (*) set of patient stub objects with activity, document and media ids for each
         *
         *  @param  user                                    {Object}    REST user or equivalent
         *  @param  callback                                {Function}  Of the form( err, meta )
         *  @param  options                                 {Object}    Passed by client
         *  @param  options.formId                          {String}    Canonical _id of the form being merged
         *  @param  options.formVersionId                   {String}    Version _id of the form being merged (options, recommended)
         *  @param  options.formState                       {Object}    Client-side form template serialised with template.toDict()
         *  @param  options.formName                        {String}    Title of the form in the current user's language, used for activity content
         *  @param  options.orientation                     {String}    Name of this form's orientation for PDF renderer
         *  @param  options.patientIds                      {Object}    Array of patients which who will be part of the mailing
         *  @param  [options.baseContactIds]                {Object}    Array of baseContacts which who will be part of the mailing
         *  @param  options.forCaseFolder                   {String}    Type of CaseFolder to place activity into
         *  @param  options.typeOfSerialCommunication       {String}    Type of Communication
         *
         *  //  This property may be true if 'Make activities' checkbox is unchecked
         *
         *  @param  options.removeActivities    {Boolean}   TRUE if activities should be deleted at end of process
         *
         */

        function createActivitiesForPatients( user, options, callback ) {
            const
                ids = options.patientIds || options.baseContactIds;
            let
                requestId = require( 'node-uuid' ).v4(),
                forClient = {mediaIds: [], activityIds: [], documentIds: [], pdfFile: ''},
                patients = {},
                totalSteps = ids.length * 2,
                currentStep = 0,
                fileNames = [],
                errors = [];

            //  call back immediately, further communication will be via socket (this may take a long time)
            callback( null, {status: 'Started generation of serial letter', requestId} );        //  eslint-disable-line callback-return

            if( options.formId ) {
                async.series(
                    [
                        createDocumentsAndActivities,
                        renderAllPdfs,
                        createZipArchive,
                        concatenatePdfs,
                        removeTempActivities
                    ],
                    onAllDone
                );
            } else {
                async.series(
                    [
                        createDocumentsAndActivities,
                        removeTempActivities
                    ],
                    onAllDone
                );
            }

            //  1. Create a document and activity for each patient
            function createDocumentsAndActivities( itcb ) {
                async.eachSeries( ids, createSingle, onCreatedAll );

                function onCreatedAll( err ) {
                    if( err ) {
                        Y.log( `Problem while creating activities and documents: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    Y.log( `Created ${ids.length} activities and documents`, 'debug', NAME );
                    itcb( null );
                }
            }

            //  1.1 Process a single patient at a time
            //  TODO: WebSocket events here to update progress on the client
            function createSingle( patientId, itcb ) {
                //  create document and COMMUNICATION activity for this single patient
                //  call back with activity_id
                createDocumentAndActivity( user, patientId, options, onSingleActivityCreated );

                function onSingleActivityCreated( err, patientStub ) {
                    if( err ) {
                        Y.log( `Error creating single activity: ${err.stack || err}`, 'warn', NAME );
                        errors.push( {
                            patientId: patientId,
                            error: 'ERROR_CREATE_DOCUMENT_AND_ACTIVITY',
                            originalError: err
                        } );
                    } else {
                        let percent = (currentStep / totalSteps) * 100;
                        currentStep = currentStep + 1;

                        patients[patientId] = patientStub;

                        const
                            msgAct = (options && options.typeOfSerialCommunication === 'EMAIL') ? i18n( 'TaskMojit.SerialEMailModal.steps.STEP_4.GEN_ACT_AND_PDF' ) : i18n( 'TaskMojit.SerialLetterModal.steps.STEP_4.GEN_ACT_AND_PDF' ),
                            msgPdf = (options && options.typeOfSerialCommunication === 'EMAIL') ? i18n( 'TaskMojit.SerialEMailModal.steps.STEP_4.GEN_PDF' ) : i18n( 'TaskMojit.SerialLetterModal.steps.STEP_4.GEN_PDF' ),
                            progressMsg = ((!options.removeActivities) ? msgAct : msgPdf);

                        emitProgressEvent( user, percent, `${progressMsg}: ${patientStub.patientName}` );

                        Y.log( `Created communication activity for patient: ${patientId}`, 'debug', NAME );
                    }

                    return itcb( null );
                }
            }

            //  2. Render PDFs from all documents/activities created
            function renderAllPdfs( itcb ) {
                async.eachSeries( ids, renderSinglePdf, itcb );
            }

            //  2.1 Process a single PDF at a time
            //  TODO: WebSocket events here to update progress on the client
            function renderSinglePdf( patientId, itcb ) {
                let
                    patientStub = patients[patientId],
                    activityId = patientStub && patientStub.activityId;

                if( !patientStub ) {
                    itcb( null );
                    return;
                }

                Y.doccirrus.forms.renderOnServer.toPDF( {
                    user: user,
                    formId: options.formId,
                    formVersionId: options.formVersionId || '',
                    mapperName: 'InCase_T',
                    mapObject: activityId,
                    mapCollection: 'activity',
                    mapFields: null,
                    saveTo: 'db',
                    zipId: '',
                    preferName: '',
                    onProgress: onPdfProgress,
                    onPdfRendered: onPdfRendered,
                    callback: onPdfComplete
                } );

                function onPdfProgress( evt ) {
                    //  TODO: adjust progress and pass WebSocket event evt
                    Y.log( `Generating pdf from activity ${activityId}: ${JSON.stringify( evt )}`, 'debug', NAME );
                }

                function onPdfRendered( err, mediaId ) {
                    if( err ) {
                        Y.log( `PDF render completed with error: ${JSON.stringify( err )}`, 'warn', NAME );
                        return;
                    }

                    Y.log( `PDF rendered to database, media id: ${mediaId}`, 'info', NAME );
                }

                function onPdfComplete( err, mediaId ) {
                    if( err ) {
                        Y.log( `Could not complete PDF: ${err.stack || err}`, 'warn', NAME );
                        errors.push( {
                            patientId: patientId,
                            error: 'ERROR_RENDER_SINGLE_PDF',
                            originalError: err
                        } );
                        delete patients[patientId];
                        return itcb( err );
                    }

                    const
                        msgAct = (options && options.typeOfSerialCommunication === 'EMAIL') ? i18n( 'TaskMojit.SerialEMailModal.steps.STEP_4.GEN_ACT_AND_PDF' ) : i18n( 'TaskMojit.SerialLetterModal.steps.STEP_4.GEN_ACT_AND_PDF' ),
                        msgPdf = (options && options.typeOfSerialCommunication === 'EMAIL') ? i18n( 'TaskMojit.SerialEMailModal.steps.STEP_4.GEN_PDF' ) : i18n( 'TaskMojit.SerialLetterModal.steps.STEP_4.GEN_PDF' ),
                        progressMsg = ((!options.removeActivities) ? msgAct : msgPdf);

                    Y.log( `PDF render complete, notifying client of new media item: ${mediaId}`, 'debug', NAME );
                    currentStep = currentStep + 1;
                    emitProgressEvent( user, (currentStep / totalSteps) * 100, `${progressMsg}: ${patientStub.patientName}` );

                    patients[patientId].mediaId = mediaId;
                    forClient.mediaIds.push( mediaId );
                    itcb( null );
                }
            }

            function createZipArchive( itcb ) {
                const nameOfArchive = (options && options.typeOfSerialCommunication === 'EMAIL') ? '_serienemail' : '_serienbrief';
                Y.doccirrus.media.zip.create( moment().format( 'YYYYMMDD_HHmmss' ) + nameOfArchive, onZipCreated );

                function onZipCreated( err, zipId ) {
                    if( err ) {
                        Y.log( `onZipCreated: ${err.stack || err}`, 'warn', NAME );
                        return itcb( null );
                    }
                    forClient.zipId = zipId;

                    Y.log( `Writing PDFs to zip ${zipId}: ${JSON.stringify( fileNames )}`, 'info', NAME );
                    async.eachSeries( ids, writeSinglePdfToZip, itcb );
                }

            }

            //  3.1 Extract a single file at a time, record new filename
            function writeSinglePdfToZip( patientId, itcb ) {
                let
                    mediaStub = {'mime': 'APPLICATION_PDF', 'transform': 'original'},
                    patientStub = patients[patientId],
                    patientName = patientStub && patientStub.patientName,
                    mediaId = patientStub && patientStub.mediaId,
                    localPath = Y.doccirrus.media.getTempDir(),
                    tempFile = Y.doccirrus.media.getTempFileName( mediaStub ),
                    fileName = Y.doccirrus.media.cleanFileName( `${moment().format()} ${patientName}.pdf` );

                if( !patientStub ) {
                    itcb( null );
                    return;
                }

                Y.doccirrus.media.gridfs.exportFile( user, mediaId, tempFile, false, onFileWritten );

                function onFileWritten( err, actualFile ) {
                    if( err ) {
                        Y.log( `Could not write PDF to disk from GridFS: ${err.stack || err}`, 'warn', NAME );
                        errors.push( {
                            patientId: patientId,
                            error: 'ERROR_WRITE_SINGLE_PDF_TO_ZIP',
                            originalError: err
                        } );
                        delete patients[patientId];
                        return itcb( null );
                    }
                    Y.log( `Adding single file to zip ${forClient.zipId}: ${actualFile}`, 'info', NAME );
                    Y.doccirrus.media.zip.addFile( forClient.zipId, actualFile, localPath, fileName, false, itcb );
                }
            }

            //  4. Join all PDF files into a single file with external utility
            function concatenatePdfs( itcb ) {
                Y.log( `Mailmerge: concatenating ${fileNames.length} PDFs`, 'debug', NAME );
                const nameOfArchive = (options && options.typeOfSerialCommunication === 'EMAIL') ? '_serienemail' : '_serienbrief';
                const
                    concatOptions = {
                        'user': user,
                        'mediaIds': forClient.mediaIds,
                        'newFileName': `${moment().format( 'YYYYMMDD_HHmmss' )}${nameOfArchive}.pdf`
                    };

                Y.doccirrus.media.pdf.concatenatePDFs( concatOptions, onConcatPdfsComplete );

                function onConcatPdfsComplete( err, concatFileName ) {
                    if( err ) {
                        Y.log( `Could not concatenate PDFs for download: ${JSON.stringify( err )}`, 'error', NAME );
                        return itcb( err );
                    }

                    Y.log( `Concatenated PDFs into single file: ${concatFileName}`, 'info', NAME );
                    forClient.diskFile = concatFileName;
                    itcb( null );
                }
            }

            //  5. Delete all the new activities, documents and media if box was checked
            function removeTempActivities( itcb ) {
                if( !options.removeActivities ) {
                    return itcb( null );
                }

                Y.log( `Removing ${ids.length} temporary activities...`, 'info', NAME );
                async.eachSeries( ids, removeSingleActivity, itcb );

                function removeSingleActivity( patientId, onDeleteSingleActivity ) {
                    let patientStub = patients[patientId];
                    if(  patientStub && patientStub.activityId ) {
                        Y.log( `Cleaning up COMMUNICATION activity from serienbrief: ${patientStub.activityId}`, 'debug', NAME );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            action: 'delete',
                            query: {_id: patientStub.activityId},
                            callback: onDeleteSingleActivity
                        } );
                    } else {
                        return onDeleteSingleActivity( null );
                    }
                }
            }

            //  X. Call back with metadata useful to the client
            async function onAllDone( err ) {
                if( err ) {
                    Y.log( `Mailmerge completed with error: ${JSON.stringify( err )}`, 'warn', NAME );
                    const nameOfErrorEvent = (options && options.typeOfSerialCommunication === 'EMAIL') ? 'onSerialEMailError' : 'onSerialLetterError';
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        nsp: 'default',
                        event: nameOfErrorEvent,
                        msg: {
                            data: {
                                requestId,
                                error: err
                            }
                        }
                    } );
                    return;
                }
                Y.log( `Completed mail merge: ${forClient.pdfFile}`, 'info', NAME );
                forClient.patients = patients;
                forClient.errors = errors;

                if( errors.length ) {
                    let patients;
                    [err, patients] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        query: {_id: {$in: errors.map( error => error.patientId )}},
                        options: {
                            lean: true,
                            select: {
                                firstname: 1,
                                lastname: 1
                            }
                        }
                    } ) );
                    if( err ) {
                        Y.log( `could not get patient name of found errors: ${err.stack || err}`, 'warn', NAME );
                    } else {
                        errors.forEach( error => {
                            const patient = patients.find( p => p._id.toString() === error.patientId );
                            if( patient && patient.firstname && patient.lastname ) {
                                error.patientName = `${patient.lastname}, ${patient.firstname}`;
                            }
                        } );
                    }
                }

                const nameOfCompleteEvent = (options && options.typeOfSerialCommunication === 'EMAIL') ? 'onSerialEMailComplete' : 'onSerialLetterComplete';

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    nsp: 'default',
                    event: nameOfCompleteEvent,
                    msg: {
                        data: {
                            requestId,
                            data: forClient,
                            additionalData: options
                        }
                    }
                } );
            }
        }

        /**
         *  Create a document from the form state on the client, and add that to a new communication activity
         *
         *  Overall process is:
         *
         *      1. Load the patient (get casefolder _id, insurance, etc)
         *      2. Load extended data about patient, used to find correct casefolder (See EXTMOJ-522)
         *      3. Look up casefolder if client has requested a specific casefolder type
         *      4. Create the COMMUNICATION activity, will be used to make PDF, hold resulting document
         *      5. Create a document object for the form state, will be mapped with individual patient's data
         *      6. Attach the document to the activity (might be automatically done by post-processes)
         *      X. call back with _ids of new object
         *
         *  @param  user        {Object}
         *  @param  patientId   {String}
         *  @param  options     {Object}
         *  @param  callback    {Function}
         */

        async function createDocumentAndActivity( user, patientId, options, callback ) {
            let patientStub = {_id: patientId};

            //  1. Load the patient (get casefolder _id, insurance, etc)
            let [err, patient] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    query: {_id: patientId},
                    options: {lean: true}
                } )
            );

            if( err ) {
                return callback( err );
            }
            if( !patient || !Array.isArray( patient ) || !patient[0] ) {
                //  should never happen
                return callback( Y.doccirrus.errors.rest( 404, `Patient not found: ${patientId}`, true ) );
            }

            patientStub.patientName = `${patient[0].firstname} ${patient[0].lastname}`;
            patientStub.activeCaseFolderId = patient[0].activeCaseFolderId;

            //  2. Load extended data about patient, used to find correct casefolder (See EXTMOJ-522)
            [err] = await formatPromiseResult(
                loadPatientData( patient[0] )
            );

            //  3. Look up casefolder if client has requested a specific casefolder type
            let casefolder;
            if( '_LATEST' !== options.forCaseFolder && options.forCaseFolder ) {
                [err, casefolder] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        query: {
                            patientId: patient[0]._id.toString(),
                            type: options.forCaseFolder
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                Y.log( `Looking up caseFolder for patient ${patient[0]._id} matching type: ${options.forCaseFolder}`, 'debug', NAME );

                if( err ) {
                    Y.log( `Problem while looking up casefolder for serial letter COMMUNICATION activity: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                if( casefolder && Array.isArray( casefolder ) && casefolder[0] ) {
                    Y.log( `Found ${options.forCaseFolder} casefolder(s) for new COMMUNICATION activity: ${JSON.stringify( casefolder )}`, 'debug', NAME );
                    patientStub.activeCaseFolderId = casefolder[0]._id;

                    //  there may be more than one casefolder of the requested type.
                    //  if one of them is the active (displayed) casefolder then prefer it
                    //  if one of them is the suggested casefolder (by scheine) from the activity api then prefer it
                    for( let i = 0; i < casefolder.length; i++ ) {
                        if( casefolder[i]._id.toString() === patient[0].activeCaseFolderId ) {
                            patientStub.activeCaseFolderId = casefolder[i]._id.toString();
                        }
                    }
                    for( let i = 0; i < casefolder.length; i++ ) {
                        if( casefolder[i]._id.toString() === patient[0].caseFolderId ) {
                            patientStub.activeCaseFolderId = casefolder[i]._id.toString();
                        }
                    }
                }
            }

            if( !patientStub.activeCaseFolderId ) {
                Y.log( `could not get matching casefolder: get inbox case folder for patient ${patientId}`, 'info', NAME );
                let [err, inBoxCaseFolderId] = await formatPromiseResult(
                    Y.doccirrus.api.casefolder.getInBoxCaseFolderId( {
                        user,
                        data: {
                            patientId: patientId
                        }
                    } )
                );

                if( err ) {
                    Y.log( `could not get inbox casefolder for patient: ${patientId}, err: ${err.stack || err}`, 'warn', NAME );
                } else if( inBoxCaseFolderId ) {
                    patientStub.activeCaseFolderId = inBoxCaseFolderId;
                }

                if( !patientStub.activeCaseFolderId ) {
                    Y.log( `CaseFolder for Patient not found: ${patientId}`, 'warn', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 1130002, {
                        data: {
                            $lastname: patient[0].lastname,
                            $firstname: patient[0].firstname
                        }
                    } ) );
                }
            }

            const forDoctor = options.forDoctor && options.forDoctor.split( '-' ) || [];

            //  4. Create the COMMUNICATION activity, will be used to make PDF, hold resulting document
            let activity;
            const
                locationId = forDoctor[1] ? forDoctor[1] : ( user.locations[0] ? user.locations[0]._id : Y.doccirrus.schemas.location.getMainLocationId() ),
                employeeId = forDoctor[0] ? forDoctor[0] : user.specifiedBy || null,
                typeOfSerialCommunication = (options && options.typeOfSerialCommunication === 'LETTER') ? i18n( 'TaskMojit.SerialLetterProcess.activityContent' ) : i18n( 'TaskMojit.SerialEMailProcess.activityContent' ),
                contentForEmail = `${ i18n( 'PatientTransferMojit.NewMessage.subject' ) }: ${options.subject} ${ i18n( 'general.title.MESSAGE' ) }: ${options.emailContent}`,
                contentForLetter = options.formName,
                actContent = `${typeOfSerialCommunication}: ${((options && options.typeOfSerialCommunication === 'LETTER') ? contentForLetter : contentForEmail)}`;

            let activityObj = {
                actType: 'COMMUNICATION',
                patientId: patient[0]._id.toString(),
                caseFolderId: patientStub.activeCaseFolderId,
                content: actContent,
                userContent: actContent,
                employeeId: employeeId,
                locationId: locationId,
                formId: options.formId,
                formVersion: options.formVersionId,
                timestamp: new Date()
            };

            Y.log( `Creating new COMMUNICATION activity for patient: ${patient[0]._id.toString()}`, 'debug', NAME );

            activityObj = Y.doccirrus.filters.cleanDbObject( activityObj );

            [err, activity] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'activity',
                    data: activityObj
                } )
            );

            if( err ) {
                return callback( err );
            }
            patientStub.activityId = activity[0];

            //  5. Create a document object for the form state, will be mapped with individual patient's data
            let documentObj = {
                type: 'FORM',
                activityId: activity && activity[0],
                attachedTo: activity && activity[0],        //  set to patientId to share in patient portal
                formId: options.formId,
                formInstanceId: options.formVersionId || '',
                formState: options.formState,
                // NB: magic value, causes renderpdf to map patient details into edited fields
                formData: 'bake'
            };

            Y.log( `Creating/saving document for activity: ${activity && activity[0]}`, 'debug', NAME );

            documentObj = Y.doccirrus.filters.cleanDbObject( documentObj );

            let document;
            [err, document] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'document',
                    data: documentObj
                } )
            );
            if( err ) {
                return callback( err );
            }
            patientStub.documentId = document[0];

            //  6. Attach the document to the activity (might be automatically done by post-processes)
            Y.log( `Attaching document to activity: ${activity && activity[0]}`, 'debug', NAME );

            const putData = Y.doccirrus.filters.cleanDbObject( {
                fields_: ['attachments', 'status'],
                attachments: [document[0]],
                status: 'VALID'
            } );

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'put',
                    query: {_id: activity && activity[0]},
                    data: putData
                } )
            );
            if( err ) {
                Y.log( `Problem attaching document to activity: ${JSON.stringify( err )}`, 'warn', NAME );
                return callback( err );
            }

            if( activity && activity[0] ) {
                //  7. Remap form
                [err] = await formatPromiseResult(
                    remapFormInContext( activity[0] )
                );
            }

            //  X. call back with _ids of new object
            if( err ) {
                return callback( err );
            }

            Y.log( `Created document and activity for patient: ${patientId}: ${JSON.stringify( patientStub )}`, 'debug', NAME );
            return callback( null, patientStub );

            async function loadPatientData( patient ) {
                return new Promise( ( resolve, reject ) => {
                    if( !patient ) {
                        //  should never happen
                        return reject( Y.doccirrus.errors.rest( 404, `Patient not found: ${patientId}`, true ) );
                    }
                    Y.doccirrus.api.activity.getActivityDataForPatient( {
                        user: user,
                        data: {
                            patient: patient,
                            useFirstSuitableInsurance: true
                        },
                        migrate: false,
                        callback: onPatientDataLoaded
                    } );

                    function onPatientDataLoaded( err, result ) {
                        if( err ) {
                            Y.log( `Could not load extended patient data: ${JSON.stringify( err )}`, 'warn', NAME );
                            return reject( err );
                        }

                        if( result.caseFolderId && '' === patientStub.activeCaseFolderId ) {
                            patientStub.activeCaseFolderId = result.caseFolderId;
                        }

                        patientStub.employeeId = result.employeeId || '';
                        resolve();
                    }
                } );
            }

            async function remapFormInContext( id ) {
                return new Promise( ( resolve, reject ) => {
                    if( !id ) {
                        return reject( new DCError( 500, {message: 'missing parameter id '} ) );
                    }
                    Y.doccirrus.forms.mappinghelper.remapInNewContext( user, id, null, onRemapForm );

                    function onRemapForm( err ) {
                        if( err ) {
                            Y.log( `Error while remapping form for ${id} during mailmerge: ${err.stack || err}`, 'error', NAME );
                            return reject( err );
                        }
                        resolve( null );
                    }
                } );

            }
        }

        function emitProgressEvent( user, percent, label ) {
            Y.log( `Serienbrief progress, passing to client percent: ${percent} label: ${label}`, 'debug', NAME );
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                nsp: 'default',
                event: 'onSerialLetterProgress',
                msg: {
                    data: {
                        percent: percent,
                        label: label
                    }
                }
            } );
        }

        Y.namespace( 'doccirrus.tasks' ).mailmerge = {
            createActivitiesForPatients: createActivitiesForPatients
        };

    },
    '0.0.1',
    {
        requires: [
            'dcmedia'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'activity-api',
            // 'casefolder-api',
            // 'dccommonerrors',
            // 'dcerror',
            // 'dcforms-mappinghelper',
            // 'dcmedia-gridfs',
            // 'dcmedia-pdf',
            // 'dcmedia-store',
            // 'dcmedia-zip',
            // 'dcmongodb'
        ]
    }
);
