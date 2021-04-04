/*global YUI */

/**
 * transfer activities with all related data
 */
YUI.add( 'activitytransfer-api', function( Y, NAME ) {

        const
            _ = require( 'underscore' ),
            ObjectID = require( 'mongodb' ).ObjectID,
            INTERNAL = 'INTERNALsystemType',
            util = require('util'),
            { formatPromiseResult, promisifyArgsCallback } = require('dc-core').utils,
            moment = require( 'moment' ),

            { logEnter, logExit } = require( '../server/utils/logWrapping.js' )(Y, NAME),

            // temporary, backwards compatibility with 4.4 for patch on Martell
            getModel = function( user, modelName ) {
                return new Promise( function( resolve, reject ) {
                    Y.doccirrus.mongodb.getModel( user, modelName.toLowerCase(), true, function( err, model ) {
                        if( err ) {
                            Y.log( 'ERR CANT GET MODEL ' + modelName, 'error', NAME );
                            reject();
                        } else {
                            resolve( model );
                        }
                    } );
                } );
            },

            IPC_REQUEST_RESYNCHRONIZE = 'RequestResynchronize',
            IPC_REQUEST_TRANSFER = 'RequestTransferToPartner';

        /**
         * @method getPatientVersion
         * @public
         *
         * returns timestamp of the newest patient version
         *
         * @param {Object} user
         * @param {String} patientId
         *
         * @returns {Promise}{Date} timestamp
         */
        async function getPatientVersion( user, patientId ) {
            let [err, patientVersions] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patientversion',
                    query: { patientId },
                    options: {
                        sort: {
                            timestamp: -1
                        },
                        limit: 1,
                        select: {
                            timestamp: 1
                        }
                    }
                } )
            );
            if( err ) {
                Y.log( `getPatientVersion: Error getting patientversions: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            return patientVersions && patientVersions[0] && patientVersions[0].timestamp;
        }

        /**
         * @method getFsFiles
         * @private
         *
         * returns list of file metas
         *
         * @param {Object} user
         * @param {Object|String} media
         *
         * @returns {Promise} list of file metas
         */
        async function getFsFiles( user, media ) {
            const loadFileMeta = util.promisify( Y.doccirrus.media.gridfs.loadFileMeta );
            return loadFileMeta( user, (media.mediaId || media) + '', false );
        }

        /**
         * @method listFsFileChunks
         * @private
         *
         * returns list of GridFs chunks, looking up directly since gridfs stream used by media API can
         * behave strangely if chunks are queried before the fs.files object exists.
         *
         * @param {Object} user
         * @param {Object|String} media
         *
         * @returns {Promise} list of file metas
         */
        async function listFsFileChunks( user, media ) {

            let
                mediaId = media && media.mediaId ? media.mediaId + '' : media + '',

                err, gridFile, chunks;

            //  check for a file meta first
            [ err, gridFile ] = await formatPromiseResult( getFsFiles( user, { mediaId: mediaId } ) );

            if ( err || !gridFile ) { return []; }

            //  check database for chunks matching this
            let
                chunkParams = {
                    user: user,
                    model: 'fs.chunks',
                    query: { files_id: gridFile._id },
                    options: {
                        fields: {
                            '_id': 1,
                            'n': 1,
                            'files_id': 1
                        }
                    }
                };

            [err, chunks ]  = await formatPromiseResult( Y.doccirrus.mongodb.runDb( chunkParams ) );
            return chunks;
        }

        /**
         * @method getFsChunks
         * @private
         *
         * returns list of file chunks
         *
         * @param {Object} user
         * @param {Object|String} media
         *
         * @returns {Promise} list of file chunks
         */
        async function getFsChunks( user, media ) {
            const
                listFileChunks = util.promisify( Y.doccirrus.media.gridfs.listFileChunks ),
                loadChunk = util.promisify( Y.doccirrus.media.gridfs.loadChunk );
            let [err, fileChunks] = await formatPromiseResult(
                listFileChunks( user, (media.mediaId || media) + '', false )
            );
            if( err ){
                Y.log(`getFsChunks: Error getting file chunk list: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            let chunks = [];
            for( let file of fileChunks) {
                let [err, sourceChunk] = await formatPromiseResult(
                    loadChunk( user, file._id + '', false )
                );
                if( err ) {
                    Y.log( `getFsChunks: Error loading file chunks: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                chunks.push( Object.assign( sourceChunk, {data: sourceChunk.data.toString( 'base64' )} ) );
            }
            return chunks;
        }

        /**
         * @method createPayload
         * @private
         *
         * collect and put together in payload object:
         *  - activities from given activityIds
         *  - activities referenced from [icds, activities, icdsExtra, receipts, continuousIcds] in previously collected activities
         *  - patient avatar
         *  - patient data
         *  - latest patient version timestamp
         *  - locations used in activities (same next collections)
         *  - employees
         *  - documents
         *  - media
         *  - bascontacts (and also all referenced basecontacts)
         *  - casefolders
         *
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Array} args.activityIds
         * @param {Object} [args.filters={}]                             - collection filters (allow for instance exclude particular activity using map)
         * @param {Function} args.filters.activity.map                  - mapping function for activity collection
         * @param {Boolean} [args.anonymizePatientImages=false]         - do not grab patient logo image if true
         * @param {Boolean} [args.teleconsil=false]                     - include fileMetas, fileChunks in payload if true
         * @param {Boolean} [args.noTransferOfLinkedActivities=false]   - exclude linked activities from payload (remove all references)
         *
         * @returns {Promise} {
         *  activities:{Array},         requested and all linked activities
         *  patient:{Object},           patient data
         *  patientVersion:{Date},      latest timestamp from patient version
         *  locations:{Array},          locations
         *  employees:{Array},          employees
         *  documents:{Array},          documents
         *  media:{Array},              media
         *  basecontacts:{Array},       basecontacts from patient and also all basecontacts referenced by them
         *  casefolders:{Array}         casefolders
         * }
         */
        async function createPayload( args ){
            const
                {
                    user,
                    activityIds,
                    filters = {},
                    anonymizePatientImages = false,
                    teleconsil = false,
                    noTransferOfLinkedActivities = false
                } = args;

            let payload = {}, err;
            //  Load all activities in activityIds to check for linked acitivities

            let activities;
            [err, activities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {_id: {$in: activityIds}}
                } )
            );
            if( err ){
                Y.log(`createPayload: Error getting activities: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            let linkedActivities = [];

            addUniqueActivityIds( activityIds );

            // resolve linked activities, if not configured
            if( activities && activities.length && !noTransferOfLinkedActivities ) {
                activities.forEach( addLinkedActivityIds );
            }

            function addLinkedActivityIds( act ) {
                let linkedIds = Y.doccirrus.api.linkedactivities.getAllReferences( act );
                addUniqueActivityIds( linkedIds );
            }

            function addUniqueActivityIds( someIds ) {
                let i;
                for ( i = 0; i < someIds.length; i++ ) {
                    if ( someIds[i] && -1 === linkedActivities.indexOf( someIds[i] ) ) {
                        linkedActivities.push( someIds[i] );
                    }
                }
            }

            //  Load all activities from before, as well as their linked activities
            Y.log( `Loading linked activities to transfer to partner: ${JSON.stringify( linkedActivities )}`, 'debug', NAME );
            [err, activities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {_id: {$in: linkedActivities }}
                } )
            );
            if( err ){
                Y.log(`createPayload: Error getting linked activities: ${err.stack || err}`, 'error', NAME);
                throw err;
            }

            if( !activities || !activities.length ){
                Y.log(`createPayload: Any activities found for ${linkedActivities}`, 'error', NAME);
                throw new Error( 'no activities found for payload' );
            }

            activities.forEach( activity => {
               if( activity.mirrorActivityId ){
                   Y.log(`createPayload: trying to re-tranfer transfered activity ${activity._id}`, 'error', NAME);
                   throw new Error( 're-transfering not allowed');
               }
            });

            if( filters && filters.activity && filters.activity.map ){
                payload.activities = activities.map( filters.activity.map );
            } else {
                payload.activities = activities;
            }

            // remove any reference to possible linked activities, if configured
            if( noTransferOfLinkedActivities ) {
                activities.forEach( Y.doccirrus.api.linkedactivities.clearActivityObjectOfAllReferences );
            }

            let activitiesData = {};
            // Assume patientId is always the same
            activitiesData.patientId = activities[0] && activities[0].patientId;

            activitiesData.locationIds = new Set( activities.map( ( el ) => el.locationId.toString() ) );
            activitiesData.employeeIds = new Set( activities.map( ( el ) => el.employeeId.toString() ) );
            // activitiesData.caseFolderIds = new Set(result.map((el) => el.caseFolderId.toString()));
            activitiesData.mediaIds = new Set();
            activitiesData.documentsIds = new Set();

            activities.forEach( ( res ) => {
                if( res.fromPdf ) {
                    activitiesData.mediaIds.add( res.formPdf );
                }
            } );
            activities.forEach( ( el ) => (el.attachedMedia || []).forEach( ( media ) => activitiesData.mediaIds.add( media && media.mediaId || media ) ) );
            activities.forEach( ( el ) => (el.attachments || []).forEach( ( attachment ) => activitiesData.documentsIds.add( attachment ) ) );

            if(!anonymizePatientImages){
                let logoMedias;
                [err, logoMedias] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'media',
                        query: {
                            label: 'logo',
                            ownerCollection: 'patient',
                            ownerId: activitiesData.patientId
                        }
                    } )
                );
                if( err ){
                    Y.log(`createPayload: Error getting logo media: ${err.stack || err}`, 'error', NAME);
                    throw err;
                }
                if( logoMedias.length > 0 ) {
                    Y.log( `Found ${logoMedias[0]._id } user avatar.`, 'debug', NAME );
                    activitiesData.mediaIds.add( logoMedias[0]._id.toString() );
                }
            }

            let patients;
            [err, patients] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    query: { _id: activitiesData.patientId }
                } )
            );
            if( err ){
                Y.log(`createPayload: Error getting patient: ${err.stack || err}`, 'error', NAME);
                throw err;
            }

            let
                patientPortalFields = Y.doccirrus.schemas.patient.types.PatientPortal_T,
                fieldsToFilter = [...Object.keys( patientPortalFields ), 'markers'],
                baseContacts = [...(patients[0].physicians || []), patients[0].familyDoctor, patients[0].institution].filter( el => el );

            payload.patient = _.omit( patients[0], fieldsToFilter );
            if(payload.patient.insuranceStatus && payload.patient.insuranceStatus.length){
                payload.patient.insuranceStatus = payload.patient.insuranceStatus.map( el => {
                    delete el.locationId;
                    delete el.employeeId;
                    return el;
                } );
            }
            activitiesData.baseContacts = baseContacts;

            let patientVersion;
            [err, patientVersion] = await formatPromiseResult(
                getPatientVersion(user, activitiesData.patientId)
            );
            if( err ){
                Y.log(`createPayload: Error getting patientversions: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            payload.patientVersion = patientVersion;
            let locations;
            [err, locations] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    query: { _id: { $in: Array.from( activitiesData.locationIds ) } }
                } )
            );
            if( err ){
                Y.log(`createPayload: Error getting locations: ${err.stack || err}`, 'error', NAME);
                throw err;
            }

            payload.locations = locations;
            locations.forEach( location => {
                payload.activities.forEach( activity => {
                    if( activity.locationId.toString() === location._id.toString() ){
                        activity.locationName = location.locname;
                    }
                } );
            } );

            let employees;
            [err, employees] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    query: { _id: { $in: Array.from( activitiesData.employeeIds ) } }
                } )
            );
            if( err ){
                Y.log(`createPayload: Error getting employees: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            payload.employees = employees;

            let documents;
            [err, documents] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'document',
                    query: {
                        $or: [
                            { activityId: { $in: activityIds } },
                            { _id: { $in: Array.from( activitiesData.documentsIds ) } }
                        ]
                    }
                } )
            );
            if( err ){
                Y.log(`createPayload: Error getting documents: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            payload.documents = documents;
            documents.forEach( ( document ) => {
                activitiesData.mediaIds.add( document.mediaId );
                // extend by form media
                if( document.usesMedia && document.usesMedia.length ){
                    activitiesData.mediaIds.add( ...document.usesMedia );
                }
            } );

            let medias;
            [err, medias] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'media',
                    query: { _id: { $in: Array.from( activitiesData.mediaIds ) } }
                } )
            );
            if( err ){
                Y.log(`createPayload: Error getting medias: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            payload.media = medias;

            // skipping addition of GridFs files and chunks to payload, was previously done here, memory issues EXTMOJ-1996
            //use old code for teleconsil, will be split on separate sending later
            if( teleconsil ){
                let mediaIds = Array.from( activitiesData.mediaIds ).filter( el => el );
                payload.fileMetas = [];
                payload.fileChunks = [];

                for( let mediaId of mediaIds) {
                    let result;
                    [err, result] = await formatPromiseResult(
                        Promise.all( [
                            getFsFiles( user, mediaId ),
                            getFsChunks( user, mediaId )
                        ] )
                    );
                    if( err ) {
                        Y.log( `createPayload: Error getting files and chunks: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                    payload.fileMetas = [ ...payload.fileMetas, result[0] ];
                    payload.fileChunks = [ ...payload.fileChunks, ...result[1] ];
                }
            }

            let
                ids = [...(activitiesData.baseContacts || [])],
                processedIds = [], basecontacts = [];

            while( ids.length ){
                let result;
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'basecontact',
                        query: {_id: {$in: ids}}
                    } )
                );
                if( err ){
                    Y.log( `createPayload: Error getting basecontacts for ${ids}: ${err.stack || err}`, 'error', NAME );
                } else {
                    ids = [];
                    basecontacts = [...basecontacts, ...result];
                    processedIds = [...new Set([...processedIds, ...result.map( el => el._id.toString() )])];
                    result.forEach( contact => { //eslint-disable-line no-loop-func
                        ids = [...ids, ...( contact.contacts || [] ).map( el => el.toString() ).filter( el => !processedIds.includes( el ) )];
                    } );
                }
            }

            payload.basecontacts = basecontacts;

            let casefolderIds = (payload.activities|| []).map( el => el.caseFolderId );
            if(casefolderIds.length){
                let casefolders;
                [err, casefolders] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'get',
                        query: {_id: {$in: casefolderIds}}
                    } )
                );
                if( err ){
                    Y.log(`createPayload: Error getting casefolders: ${err.stack || err}`, 'error', NAME);
                    throw err;
                }
                payload.casefolders = casefolders.map( el => {
                    el.ruleActivities = 0;
                    el.ruleWarnings = 0;
                    el.ruleErrors = 0;

                    if (el.sumexErrors) {
                        el.sumexErrors = [];
                    }

                    return el;
                });
                casefolders.forEach( casefolder => {
                    payload.activities.forEach( activity => {
                        if( activity.caseFolderId.toString() === casefolder._id.toString() ){
                            activity.mirrorCaseFolderType = casefolder.type || casefolder.additionalType;
                        }
                    } );
                } );
            }

            return payload;
        } // end createPayload

        /**
         * @method createPayloadInternal
         * @private
         *
         * prepare payload for PRC <=> PRC communication
         *
         * @param {Object} user
         * @param {Array} activityIds
         * @param {object} partner
         *
         * @returns {Promise} {
         *  {...payload from preparePayload function: activities, patient,... etc}
         *  dcCustomerNo:{String},
         *  commercialNo:{String},
         *  coname:{String},
         *  doctorName:{String}
         * }
         */
        async function createPayloadInternal(user, activityIds, partner ){
            let err, payload;
            [err, payload] = await formatPromiseResult(
                createPayload( {
                    user,
                    activityIds,
                    anonymizePatientImages: partner.anonymizing && !(partner.anonymizeKeepFields || []).includes( 'images' ),
                    noTransferOfLinkedActivities: partner.noTransferOfLinkedActivities || false
                } )
            );
            if( err ) {
                Y.log( `createPayloadInternal: Error creating payload: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if(!payload){
                payload = {};
            }

            if(partner.anonymizing && payload.patient && partner.activeActive !== true){
                payload.patient = anonimyzePatient(user, partner, payload.patient, false);
            }

            let myPrac;
            [err, myPrac] = await formatPromiseResult(
                new Promise( (resolve, reject) => {
                    Y.doccirrus.api.practice.getMyPractice( {
                        user,
                        callback: ( err, result ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        }
                    } );
                } )
            );
            if( err ) {
                Y.log( `createPayloadInternal: Error getting practice data: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            if( !myPrac ) {
                Y.log( 'createPayloadInternal: practice data not found', 'error', NAME );
                throw new Error( 'createPayloadInternal: practice data not found' );
            }

            payload.dcCustomerNo = myPrac.dcCustomerNo;
            payload.commercialNo = myPrac.commercialNo;
            payload.coname = myPrac.coname;
            payload.city = Array.isArray(myPrac.addresses) && myPrac.addresses[0] ? myPrac.addresses[0].city : '';

            if ( 'su' === user.id || (user.identityId && 24 !== user.identityId.length) ) {
                //guess here is Admin user
                payload.doctorName = Y.doccirrus.schemas.person.personDisplay( {
                    firstname: user.firstname || '',
                    lastname: user.lastname || 'Automatischer Prozess',
                    title: ''
                } );
            } else {
                let identities;
                [err, identities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'identity',
                        action: 'get',
                        query: {
                            _id: user.identityId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `createPayloadInternal: Error getting practice data: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                if( !identities || !identities.length ) {
                    Y.log( `createPayloadInternal: user not found for ${user.identityId}`, 'error', NAME );
                    throw new Error( 'createPayloadInternal: user not found' );
                }
                let userIdentity = identities[0];

                let employees;
                [err, employees] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'employee',
                        query: {
                            _id: userIdentity.specifiedBy
                        }
                    } )
                );
                if( err ) {
                    Y.log( `createPayloadInternal: Error getting practice data: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                if( employees && employees.length ) {
                    payload.doctorName = Y.doccirrus.schemas.person.personDisplay( {
                        firstname: employees[0].firstname,
                        lastname: employees[0].lastname,
                        title: employees[0].title
                    } );
                }
            }

            return payload;
        }

        /**
         * @method validatePayload
         * @private
         *
         * run mongoose schema validation over provided object from payload
         *
         * @param {Object} user
         * @param {Object} payload
         * @param {Object} payload.patient
         * @param {Array} payload.casefolders
         * @param {Array} payload.activities
         *
         * @returns {Promise} array of mongoose validation errors
         */
        async function validatePayload( user, payload ) {
            let validationErrors = [];

            async function processCollection( model, data, validationErrors ) {
                if(!data){
                    return validationErrors;
                }
                for( let doc of data ) {
                    if(!doc){
                        continue;
                    }
                    let [errors] = await formatPromiseResult(
                        new Promise( (resolve, reject) => {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model,
                                action: 'validate',
                                args: [doc, (err) => {
                                    if(err){
                                        return reject(err);
                                    }
                                    resolve();
                                }]
                            } );
                        })

                    );
                    if( errors && Object.keys( errors ).length ) {
                        let errorObj = {model, _id: doc._id, errors};
                        if(model === 'activity'){
                            errorObj.actType = doc.actType;
                        }
                        validationErrors = [...validationErrors, errorObj];
                    }
                }
                return validationErrors;
            }

            validationErrors = await processCollection( 'patient', [payload.patient], validationErrors );
            validationErrors = await processCollection( 'casefolder', payload.casefolders, validationErrors );
            validationErrors = await processCollection( 'activity', payload.activities, validationErrors );
            validationErrors = await processCollection( 'basecontact', payload.basecontacts, validationErrors );
            return validationErrors;
        }

        /**
         * @method createTaskForValidationErrors
         * @private
         *
         * create task with listed validation errors
         *
         * @param {Object} user
         * @param {Object} validationErrors
         * @param {Object} payload
         * @param {Object} manuallyTriggered
         *
         */
        async function createTaskForValidationErrors( user, validationErrors, payload, manuallyTriggered ) {
            let links = [], addedLinks = {};

            const
                errorString = validationErrors.map( el => {
                    if( el.errors && el.errors.errors ){
                        let messages = [],
                            schema = Y.doccirrus.schemas[el.model] && Y.doccirrus.schemas[el.model].schema;
                        for( let validationError in el.errors.errors ){
                            if (Object.prototype.hasOwnProperty.call(el.errors.errors, validationError)) {
                                //try to ger german schema name
                                let fieldName;
                                if( schema ){
                                    let errorPathArr = validationError.split('.');
                                    let schemaObj = {...schema};
                                    for( let errorPath of errorPathArr){
                                        if(schemaObj[errorPath]){
                                            schemaObj = schemaObj[errorPath];
                                        }
                                    }
                                    if( schemaObj.i18n || schemaObj['-de'] ){
                                        fieldName = schemaObj.i18n || schemaObj['-de'];
                                    }
                                }

                                let prefix = '';
                                if( el.model === 'basecontact' ){

                                    let url = `${Y.doccirrus.auth.getGeneralExternalUrl( user )}/contacts#/${el._id}/`;
                                    if( !addedLinks[url]){
                                        addedLinks[url] = 1;
                                        links = [...links, {url, text:  Y.doccirrus.i18n('InSuiteAdminMojit.insuiteadmin.menuitem.CONTACTS')}];
                                    }

                                    prefix = `${validationError}:${el.errors.errors[validationError].value} `;
                                }

                                let message = ` - ${prefix} ${Y.doccirrus.i18n( 'audit-schema.ModelMeta_E.' + el.model )}: ${(el.errors.errors[validationError] && el.errors.errors[validationError].message)}`;
                                if( fieldName && el.errors.errors[validationError].path ){
                                    message = message.replace(el.errors.errors[validationError].path, fieldName);
                                }
                                messages.push( message );
                            }
                        }
                    return messages.join('\n');
                }
                }).join('\n'),
                details = `${Y.doccirrus.i18n( 'PatientTransferMojit.message.document_validation_error_details' )}:
${errorString}

${Y.doccirrus.i18n( 'PatientTransferMojit.message.' + (manuallyTriggered === true ? 'document_validation_error_details_manual' : 'document_validation_error_details_automatic'))}                `,
                taskData = {
                    allDay: true,
                    alertTime: (new Date()).toISOString(),
                    title: Y.doccirrus.i18n( 'PatientTransferMojit.message.document_validation_error_title' ),
                    urgency: 2,
                    details,
                    group: false,
                    roles: [Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG],
                    creatorName: payload.coname,
                    type: 'NEW_TRANSFER',
                    links
                };

            if( payload && payload.patient ) {
                taskData.patientId = payload.patient._id;
                taskData.patientName = Y.doccirrus.schemas.person.personDisplay( {
                    firstname: payload.patient.firstname,
                    lastname: payload.patient.lastname,
                    title: payload.patient.title
                } );
            }
            let activityErrorIds = _.uniq( validationErrors.filter( el => el.model === 'activity' ).map( el => {
                return {
                    _id: el._id,
                    actType: el.actType
                };
            } ) ) || [];
            taskData.activities = activityErrorIds;

            let [err, taskCount] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'count',
                    query: { title: taskData.title, patientId: taskData.patientId, details, status: {$ne: 'DONE'} },
                    useCache: false
                } )
            );
            if( err ) {
                Y.log( `createTaskForValidationErrors: Error getting task count: ${err.stack || err}`, 'error', NAME );
            }
            if( taskCount === 0 ){
                writeTask( user, taskData );
            } else {
                Y.log( `createTaskForValidationErrors: task already created`, 'info', NAME );
            }
        }

        /**
         * @method syncObj
         * @private
         *
         * force activeActive transfering for object
         *
         * @param {Object} user
         * @param {String} model        - model name
         * @param {String} id           - _id of document
         * @param {Date} lastChanged    - date of last change from the document
         *
         * @returns {Promise}           - only error is interested in response
         */
        function syncObj(user, model, id, lastChanged){
            const syncObjectWithDispatcher = util.promisify(Y.doccirrus.api.dispatch.syncObjectWithDispatcher);
            return syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `${model}_sync_${id}`,
                entityName: model,
                entryId: id,
                lastChanged: lastChanged || new Date(),
                onDelete: false
            });
        }

        /**
         *  Given an array of activity ids and an array of partners, transfer the activities to the partners along with
         *  the related records needed to show them (employees, patients, documents, media, etc)
         *
         *  This will be invoked on the master instance by IPC if not already called on the master instance.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.data
         *  @param  {Object}    args.data.activityIds           Array of activity _ids
         *  @param  {Boolean}   args.data.automaticTransfer
         *  @param  {Object}    args.data.partners
         *  @param  {Boolean}   args.data.manuallyTriggered
         *  @param  {Object}    args.callback
         *  @return {Promise<*>}
         */

        async function transfer( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.transfer', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.transfer');
            }

            if ( !Y.doccirrus.ipc.isMaster() ) {
                Y.log( 'Transfer requested on worker, redirecting to master by IPC', 'debug', NAME );
                args.data.tenantId = args.user.tenantId;
                Y.doccirrus.ipc.sendAsync( IPC_REQUEST_TRANSFER, args.data, args.callback );
                return;
            }

            async function cacheTransferedActivity( user, activityId, payload, preparedPayload){
                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'upsert',
                        model: 'transfercache',
                        query:  {
                            activityId
                        },
                        data: {
                            activityId,
                            patientId: payload.patient && payload.patient._id,
                            basecontactsIds: (payload.basecontacts || []).map( el => el._id ),
                            timestamp: new Date(),
                            payloadSize: preparedPayload.length,
                            skipcheck_: true
                        },
                        options: {
                            omitQueryId: true
                        }
                    } )
                );
                if( err ){
                    Y.log( `cacheTransferedActivity: Error on caching tranfered activity: ${err.stack || err}`, 'error', NAME );
                }
            }

            async function pushSyncObjects( user, payload ){
                let err;

                for( let doc of (payload.locations || []) ){
                    [err] = await formatPromiseResult(
                        syncObj( user, 'location', doc._id.toString(), doc.lastChanged)
                    );
                    if( err ){
                        Y.log(`transfer: Error processing location re-sync ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                }

                for( let doc of (payload.employees || []) ){
                    [err] = await formatPromiseResult(
                        syncObj( user, 'employee', doc._id.toString(), doc.lastChanged)
                    );
                    if( err ){
                        Y.log(`transfer: Error processing employee re-sync ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                }

                for( let doc of (payload.basecontacts || []) ){
                    [err] = await formatPromiseResult(
                        syncObj( user, 'basecontact', doc._id.toString(), doc.lastChanged)
                    );
                    if( err ){
                        Y.log(`transfer: Error processing basecontact re-sync ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                }

                [err] = await formatPromiseResult(
                    syncObj( user, 'patient', payload.patient._id.toString(), payload.patient.lastChanged)
                );
                if( err ){
                    Y.log(`transfer: Error processing patient re-sync ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }

                for( let doc of (payload.casefolders || []) ){
                    [err] = await formatPromiseResult(
                        syncObj( user, 'casefolder', doc._id.toString(), doc.lastChanged)
                    );
                    if( err ){
                        Y.log(`transfer: Error processing casefolder re-sync ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                }

                for( let doc of (payload.documents || []) ){
                    [err] = await formatPromiseResult(
                        syncObj( user, 'document', doc._id.toString(), doc.lastChanged)
                    );
                    if( err ){
                        Y.log(`transfer: Error processing document re-sync ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                }

                for( let doc of (payload.media || []) ){
                    [err] = await formatPromiseResult(
                        syncObj( user, 'media', doc._id.toString(), doc.lastChanged)
                    );
                    if( err ){
                        Y.log(`transfer: Error processing media re-sync ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                }

                for( let doc of (payload.activities || []) ){
                    [err] = await formatPromiseResult(
                        syncObj( user, 'activity', doc._id.toString(), doc.lastChanged)
                    );
                    if( err ){
                        Y.log(`transfer: Error processing activity re-sync ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                    await formatPromiseResult( cacheTransferedActivity( user, doc._id.toString(), payload, '') );
                }
            }

            const
                {user, data: {activityIds, automaticTransfer = false, partners, manuallyTriggered = false}, callback} = args,
                sendPRCdispatch = util.promisify( Y.doccirrus.api.dispatch.sendPRCdispatch );

            Y.log( `entered dispatchPatientData, params: ${JSON.stringify(args.data)}`, 'debug', NAME );

            if( !activityIds || !activityIds.length || !partners || !partners.length ) {
                return callback( Y.doccirrus.errors.rest( 400, 'insufficient parameters' ) );
            }

            if( !partners.every( function( p ) {
                    return p.publicKey && 'string' === typeof p.publicKey || p.systemType && 'LICENSED' === p.status;
                } ) ) {

                return callback( 'no public key' );
            }

            //prepare payloads depending on system types
            let payloadsBySystemTypes = {};

            for(let partner of partners){

                if( partner.systemType && 'LICENSED' === partner.status ){
                    if(payloadsBySystemTypes[partner.systemType]){
                        continue;
                    }
                    let [err, payload] = await formatPromiseResult(
                        Y.doccirrus.api.dispatch.createPayloadExternal( {
                            user: user,
                            activityIds: activityIds,
                            anonymize: partner.anonymizing,
                            systemType: partner.systemType,
                            noTransferOfLinkedActivities: partner.noTransferOfLinkedActivities || false
                        } )
                    );
                    if( err ){
                        Y.log(`transfer: Error createPayloadExternal: ${err.stack || err}`, 'error', NAME);
                        return callback( err );
                    }
                    payloadsBySystemTypes[partner.systemType] = payload;
                } else {
                    if(payloadsBySystemTypes[INTERNAL]){
                        continue;
                    }
                    let [err, payload] = await formatPromiseResult(
                        createPayloadInternal( user, activityIds, partner )
                    );
                    if( err ){
                        Y.log(`transfer: Error createPayloadInternal: ${err.stack || err}`, 'error', NAME);
                        return callback( err );
                    }
                    payloadsBySystemTypes[INTERNAL] = payload;
                }
            }

            let errors = [];
            for( let partner of partners ) {
                let
                    payload,            //  set of activities and related records (patients, employees, media, etc)
                    err,                //  collected in errors array
                    fileSyncErr;        //  non-fatal, ignored, not collected in errors array

                if( partner.systemType && 'LICENSED' === partner.status ) {
                    payload = payloadsBySystemTypes[partner.systemType];

                    if( partner.preserveCaseFolder ) {
                        payload.preserveCaseFolder = partner.preserveCaseFolder;
                    }

                    if( partner.unlock ) {
                        payload.unlock = partner.unlock;
                    }

                    Y.log( 'transfer data to external source, payload:' + JSON.stringify( {
                        systemType: partner.systemType,
                        payload
                    } ), 'debug', NAME );

                    let validationResult = await validatePayload( user, payload );
                    if( validationResult.length ){
                        createTaskForValidationErrors( user, validationResult, payload, manuallyTriggered );
                        return callback( { validationResult } );
                    }

                    [err] = await formatPromiseResult(
                        sendPRCdispatch( user, payload, partner.systemType )
                    );
                    if( err ) {
                        Y.log( `transfer: Error sendPRCdispatch: ${err.stack || err}`, 'error', NAME );
                        errors = [...errors, err];
                    }

                    //  Send files attached to activities after payload, allow for malware scanning, EXTMOJ-1996
                    [fileSyncErr] = await formatPromiseResult( transferAllAttachedFiles( user, payload, partner ) );

                    if( fileSyncErr ) {
                        //  continue despite missing attachment, best effort
                        Y.log( `Could not transfer file to partner: ${fileSyncErr.stack || fileSyncErr}`, 'warn', NAME );
                    }
                } else {
                    payload = payloadsBySystemTypes[INTERNAL];

                    let preparedPayload;
                    if( partner.activeActive === true ) {
                        [err] = await formatPromiseResult(
                            pushSyncObjects( user, payload )
                        );
                        if( err ) {
                            Y.log( `transfer: Error re-sync activeActive ${err.stack || err}`, 'warn', NAME );
                        }
                    } else {
                        Y.log( 'transfer data to source, payload:' + JSON.stringify( {
                            dcCustomerNo: partner.dcId,
                            payload
                        } ), 'debug', NAME );

                        if( partner.preserveCaseFolder ) {
                            payload.preserveCaseFolder = partner.preserveCaseFolder;
                        }
                        if( partner.unlock ) {
                            payload.unlock = partner.unlock;
                        }
                        if( automaticTransfer ) {
                            payload.automaticTransfer = automaticTransfer;
                        }

                        let validationResult = await validatePayload( user, payload );
                        if( validationResult.length ) {
                            createTaskForValidationErrors( user, validationResult, payload, manuallyTriggered );
                            return callback( { validationResult } );
                        }

                        preparedPayload = JSON.stringify( {payload: payload} );

                        let [err] = await formatPromiseResult(
                            callExternalApiByCustomerNo( user, partner.dcId, 'activityTransfer.receive', { payload: preparedPayload } )
                        );

                        if( err ) {
                            Y.log( `transfer: Error callExternalApiByCustomerNo: ${err.stack || err}`, 'error', NAME );
                            errors = [...errors, err];
                        } else {

                            //  Send files attached to activities after the payload, allow malware scanning, EXTMOJ-1996
                            [fileSyncErr] = await formatPromiseResult( transferAllAttachedFiles( user, payload, partner, null ) );

                            if( fileSyncErr ) {
                                //  continue despite missing attachment, best effort
                                Y.log( `Could not transfer file to partner: ${fileSyncErr.stack || fileSyncErr}`, 'warn', NAME );
                            }

                            for( let activityTransfered of (payload.activities || []) ) {
                                logActivityTransfer( activityTransfered, user, partner );
                                let activityId = new ObjectID( activityTransfered._id );
                                await formatPromiseResult( cacheTransferedActivity( user, activityId, payload, preparedPayload ) );
                            }
                        }
                    }
                }
            }

            for( let err of errors ){
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    messageId: 'sendingDispatchData',
                    event: 'message',
                    msg: {
                        data: err.toString()
                    },
                    meta: {
                        level: 'ERROR'
                    }
                } );
            }

            callback( errors.length ? errors : null );
        }

        /**
         *  Transfer files referenced by the payload to the partner
         *
         *  These may be attachments of activities to be transferred, attachments of linked activites or user profile pictures.
         *
         *  @param  {Object}    user            For GridFS access
         *  @param  {Object}    payload
         *  @param  {Object}    payload.media   Array of objects from media collection
         *  @param  {Object}    partner         Destination of transfer
         */

        async function transferAllAttachedFiles( user, payload, partner ) {
            if ( !payload || !payload.media ) {
                Y.log( 'Missing payload, skipping transfer of files.', 'warn', NAME );
                return;
            }
            payload.media = payload.media ? payload.media : [];
            Y.log( `Transferring ${payload.media.length} media from attached activites and patient profiles.`, 'info', NAME );

            for ( let mediaObj of payload.media ) {
                let
                    mediaId = mediaObj._id.toString(),
                    err;

                [ err ] = await formatPromiseResult(
                    transferGridFsFileToPartner( user, mediaId, partner )
                );

                if ( err ) {
                    Y.log( `Problem transferring media to partner: ${err.stack||err}`, 'warn', NAME );
                    //  continue despite error, best effort
                }

            }
        }

        /**
         *  Send all chunks of a single gridfs file to partner
         *  @public
         *
         *  @param  {Object}    user
         *  @param  {String}    mediaObj    GridFS file name
         *  @param  {Object}    partner
         *  @return {Promise<void>}
         */

        async function transferGridFsFileToPartner( user, mediaObj, partner ) {
            let
                err, gridFsFile,
                localChunks, remoteChunks,
                chunksToSend = [];

            [ err, gridFsFile ] = await formatPromiseResult( getFsFiles( user, mediaObj ) );

            if ( err ) {
                Y.log( `Could not load file object from GridFs: ${err.stack||err}`, 'warn', NAME );
                throw err;
            }

            [ err, localChunks ] = await formatPromiseResult( listFsFileChunks( user, mediaObj ) );

            if ( err ) {
                Y.log( `Could not list file chunks chunks GridFs: ${err.stack||err}`, 'warn', NAME );
                throw err;
            }

            //  Send the GridFS file header, partner will respond with list of chunks it already has

            let
                remoteApiName = 'activityTransfer.receiveGridFile',
                sendData = { payload: JSON.stringify( { gridFsFile: gridFsFile } ) };

            if( partner.systemType && 'LICENSED' === partner.status ) {
                //  send to a partner with a given licence type (INCARE, DQS, DOQUVIDE, etc)
                [ err, remoteChunks ] = await formatPromiseResult(
                    callExternalApiBySystemType( user, partner.systemType, remoteApiName, sendData )
                );
            } else {
                //  send to a peer/partner PRC
                [ err, remoteChunks ] = await formatPromiseResult(
                    callExternalApiByCustomerNo( user, partner.dcId, remoteApiName, sendData )
                );
            }

            if ( err ) {
                Y.log( `Could not transmit GridFs file Meta: ${err.stack||err}`, 'warn', NAME );
                // destination system can be Off, continue with sending chunks
            }

            //  check remote chunks against local chunks
            for( let localChunk of localChunks ) {
                let localFound = false;
                for ( let remoteChunk of (remoteChunks || []) ) {
                    if ( localChunk._id + '' === remoteChunk._id + '' ) {
                        localFound = true;
                    }
                }

                if ( !localFound ) {
                    chunksToSend.push( localChunk );
                }
            }

            //  send any chunks which partner does not have

            for ( let toSend of chunksToSend ) {
                [ err ] = await formatPromiseResult( transferChunkToPartner( user, toSend._id, partner ) );

                if ( err ) {
                    Y.log( `Error transferring file chunk ${toSend._id} to partner: ${err.stack||err}`, 'warn', NAME );
                    //failed sent will be resent from socketioevents
                }
            }

            //  send "file complete" message

            remoteApiName = 'activityTransfer.receiveGridFileEnd';
            sendData = { mediaId: mediaObj };

            //console.log( `(****) transmitting data: `, sendData );

            if( partner.systemType && 'LICENSED' === partner.status ) {
                //  send to a partner with a given licence type (INCARE, DQS, DOQUVIDE, etc)
                [ err, remoteChunks ] = await formatPromiseResult(
                    callExternalApiBySystemType( user, partner.systemType, remoteApiName, sendData )
                );
            } else {
                //  send to a peer/partner PRC
                [ err, remoteChunks ] = await formatPromiseResult(
                    callExternalApiByCustomerNo( user, partner.dcId, remoteApiName, sendData )
                );
            }

            if ( err ) {
                Y.log( `Could not transmit GridFs file Meta: ${err.stack||err}`, 'warn', NAME );
                // destination system can be Off, continue with sending chunks
            }

            Y.log( `Transferred to partner file corresponding to media ${mediaObj}`, 'info', NAME );
        }

        /**
         *  Send a single GridFS file chunk to a partner system
         *
         *  @param  {Object}    user
         *  @param  {String}    chunkId
         *  @param  {Object}    partner
         *  @return {Promise<*>}
         */

        async function transferChunkToPartner( user, chunkId, partner ) {
            let
                chunkParams = {
                    'user': user,
                    'model': 'fs.chunks',
                    'action': 'get',
                    'query': { '_id': chunkId + '' }
                },

                err, chunk, reply;

            //  Load the chunk from the database

            [ err, chunk ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( chunkParams ) );

            if ( err ) {
                Y.log( `Could not load GridFS chunk from database: ${err.stack||err}`, 'warn', NAME );
                throw err;
            }

            if ( !chunk[0] ) {
                Y.log( `Could not load GridFS chunk from database: ${err.stack||err}`, 'warn', NAME );
                throw Error( `GridFS file chunk not found: ${chunkId}` );
            }

            //  Send to partner
            let
                remoteApiName = 'activityTransfer.receiveGridFileChunk',
                sendData = { payload: JSON.stringify( { chunk: chunk[0] } ) };

            if ( partner.systemType && 'LICENSED' === partner.status ) {
                //  send to a partner with a given licence type (INCARE, DQS, DOQUVIDE, etc)
                [ err, reply ] = await formatPromiseResult(
                    callExternalApiBySystemType( user, partner.systemType, remoteApiName, sendData )
                );
            } else {
                //  send to a peer/partner PRC
                [ err, reply ] = await formatPromiseResult(
                    callExternalApiByCustomerNo( user, partner.dcId, remoteApiName, sendData )
                );
            }

            if ( err ) {
                Y.log( `Could not send GridFS chunk to partner: ${err.stack||err}`, 'warn', NAME );
                throw err;
            }

            return reply;
        }

        /**
         *  Promise wrapper for communications api call by customer number (PRC <==> PRC communication)
         *  @public
         *
         *  @param  {Object}    user            Must have tenantId
         *  @param  {String}    dcCustomerNo
         *  @param  {String}    apiName         Remote API name, like 'activityTransfer.receive'
         *  @param  {Object}    data            Data to be passed to remote API
         *  @return {Promise}
         */

        function callExternalApiByCustomerNo( user, dcCustomerNo, apiName, data ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.communication.callExternalApiByCustomerNo( {
                    user: user,
                    api: apiName,
                    dcCustomerNo: dcCustomerNo,
                    data: data,
                    query: {},
                    useQueue: true,
                    options: {},
                    callback: onCalledExternalAPI
                } );

                function onCalledExternalAPI( err, result ) {
                    if( err ) {
                        Y.log( `PRC synchronization error (by customer no): ${err.stack||err}`, 'warn', NAME );
                        return reject( err );
                    }
                    resolve( result );
                }
            } );
        }

        /**
         *  Promise wrapper for communications api call by system type (DOQUVIDE, ISD, etc)
         *
         *  @param  {Object}    user            Must have tenantId
         *  @param  {String}    systemType
         *  @param  {String}    apiName         Remote API name, like 'activityTransfer.receive'
         *  @param  {Object}    data            Data to be passed to remote API
         *  @return {Promise}
         */

        function callExternalApiBySystemType( user, systemType, apiName, data ) {
            return new Promise( function( resolve, reject ) {
                systemType = Y.doccirrus.dispatchUtils.getModuleSystemType( user.tenantId, systemType );

                Y.log( 'PRC data sent to (' + systemType + ')... ' + JSON.stringify( data ), 'debug', NAME );

                Y.doccirrus.communication.callExternalApiBySystemType( {
                    api: apiName,
                    user: user,
                    data: data,
                    query: {},
                    useQueue: true,
                    systemType: systemType,
                    options: {},
                    callback: onCalledExternalAPI
                } );


                function onCalledExternalAPI( err, result ) {
                    if( err ) {
                        Y.log( `PRC synchronization error (by system type): ${err.stack||err}`, 'warn', NAME );
                        return reject( err );
                    }
                    resolve( result );
                }

            } );
        }

        /**
         *  Promise wrapper to get PRC public data - details of the current instance, customer number, public key, etc
         *
         *  @param  {Object}    user            Must have tenantId
         *  @param  {String}    systemType
         *  @return {Promise}
         */

        /*
        function getPRCPublicData( user, systemType ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.api.admin.getPRCPublicData( user, onGetPRCPublicData );

                function onGetPRCPublicData( err, pubData ) {
                    if ( !err && !pubData ) { err = new Error( `missing pubData for, system type: ${systemType}` ); }
                    if ( !err && (!pubData.dcCustomerNo && !pubData.systemType ) ) { err = new Error( 'missing dcCustomerNo and systemType' ); }
                    if ( !err && !pubData.host ) { err = new Error( `missing host for external call, system type: ${systemType}` ); }

                    if( err ) {
                        // report and skip
                        Y.log( 'Error loading PRC public data: ' + JSON.stringify( err || 'no dcCustomerNo/host' ) + ' pubData:' + JSON.stringify( pubData ), 'error', NAME );
                        return reject( err );
                    }

                    resolve( pubData );
                }
            } );

        }
        */

        /**
         *  Receive a GridFs file descriptor from a partner system, see transferGridFsFile above
         *
         *  Will call back with the _ids of file chunks already on this system, to prevent re-sending of large
         *  files which we already have.
         *
         *  Overall process:
         *
         *    (1) parse the received payload
         *    (2) store GridFS file meta
         *    (3) look up _ids of file chunks, so that partner knows which we still need
         *    (4) call back with list of file chunks we already have
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {String}    args.data.payload   JSON serialized with gridFsFile
         *  @param  {Object}    args.callback       Of the form fn( err, [ chunkDescriptors ] )
         */

        async function receiveGridFile( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.receiveGridFile', 'info', NAME);
            //if (args.callback) {
            //    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
            //        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.receiveGridFile');
            //}

            let
                user = args.user,
                transferData = args.data || {},
                payload = transferData.payload || {},
                gridFsFile,

                err, localChunks;

            //  (1) parse the received payload
            if ( 'string' === typeof payload ) {
                try {
                    payload = JSON.parse( payload );
                    gridFsFile = payload.gridFsFile || null;
                } catch ( parseErr ) {
                    return args.callback( Y.doccirrus.errors.rest( 500, 'Could not parse payload' ) );
                }
            } else {
                gridFsFile = payload.gridFsFile || null;
            }

            if ( !gridFsFile ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'No GridFS file meta in payload' ) );
            }

            //  (2) store GridFS file meta
            [ err ] = await formatPromiseResult( upsertFileMeta( user, gridFsFile ) );

            if ( err ) {
                Y.log( `Problem upserting gridFile: ${err.stack||err}`, 'warn', NAME );
                return args.callback( Y.doccirrus.errors.rest( 500, 'Could not store GridFS meta' ) );
            }

            //  (3) look up _ids of file chunks, so that partner knows which we still need
            let mediaStub = { 'mediaId': gridFsFile.filename };

            [ err, localChunks ] = await formatPromiseResult( listFsFileChunks( user, mediaStub ) );

            //  (4) call back with list of file chunks we already have
            args.callback( null, localChunks || [] );
        }

        /**
         *  Receive a GridFs file descriptor from a partner system, see transferGridFsFile above
         *
         *  Will call back with the _ids of file chunks already on this system, to prevent re-sending of large
         *  files which we already have.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {String}    args.data.payload   JSON serialized with chunk
         *  @param  {Object}    args.callback
         */

        async function receiveGridFileChunk( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.receiveGridFileChunk', 'info', NAME);
            //if (args.callback) {
            //    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
            //        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.receiveGridFileChunk');
            //}

            let
                user = args.user,
                transferData = args.data || {},
                payload = transferData.payload || {},
                gridFsChunk,
                err;

            //  (1) parse the received payload

            if ( 'string' === typeof payload ) {
                try {
                    payload = JSON.parse( payload );
                    gridFsChunk = payload.chunk || null;
                } catch ( parseErr ) {
                    return args.callback( Y.doccirrus.errors.rest( 500, 'Could not parse payload' ) );
                }
            } else {
                gridFsChunk = payload.chunk || null;
            }

            if ( !gridFsChunk ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'No GridFS file chunk in payload' ) );
            }

            [ err ] = await formatPromiseResult( upsertFileChunks( user, gridFsChunk ) );

            if ( err ) {
                Y.log( `Problem upserting gridFile: ${err.stack||err}`, 'warn', NAME );
                return args.callback( Y.doccirrus.errors.rest( 500, 'Could not store GridFS chunk' ) );
            }

            args.callback( null );
        }

        /**
         *  Received after a file is successfully transferred and ready to use
         *
         *  Check it for viruses at this point
         *
         *  @param  args
         *  @param  args.user
         *  @param  args.data
         *  @param  args.data.payload
         *  @param  args.data.payload.mediaId
         *  @return {Promise<void>}
         */

        async function receiveGridFileEnd( args ) {

            const
                timer = logEnter( `receiveGridFileEnd` ),
                virusScanGridFSP = util.promisify( Y.doccirrus.media.virusScanGridFS ),
                removeFileP = util.promisify( Y.doccirrus.media.gridfs.removeFile ),
                getSettingsP = promisifyArgsCallback( Y.doccirrus.api.settings.get ),
                payload = args.data || {},
                mediaId = payload.mediaId || null;

            let err, settings, malwareWarning;

            if ( !mediaId ) {
                Y.log( `No mediaId given when sending GridFS file.`, 'warn', NAME );
                return args.callback( null );
            }

            //  load inSuite settings
            [ err, settings ] = await formatPromiseResult( getSettingsP( { user: args.user } ) );

            if ( err ) {
                return args.callback( err );
            }

            [ err ] = await formatPromiseResult( virusScanGridFSP( args.user, mediaId ) );

            if ( err ) {
                Y.log( `Received file from partner which failed malware scan: ${mediaId}`, 'error', NAME );
                malwareWarning = err.msg;

                if ( settings[0] && settings[0].blockMalware ) {
                    //  option from inSuite settings to prevent save of file to GrisFS
                    Y.log( `Blocking save of file due to malware warning: ${mediaId}`, 'info', NAME );

                    [ err ] = await formatPromiseResult( removeFileP( args.user, mediaId, false ) );
                    if ( err ) {
                        //  should never happen
                        Y.log( `Malware check - could not remove file from GridFS: ${err.stack||err}`, 'error', NAME );
                    }
                } else {
                    //  malware is allowed mark it on the malware page
                    Y.log( `Adding malware warning to media: ${mediaId}: ${err.msg}`, 'warn', NAME );

                    [ err ] =  await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'media',
                            action: 'update',
                            query: {_id: mediaId },
                            data: {
                                $set: { "malwareWarning": malwareWarning }
                            }
                        } )
                    );

                    await Y.doccirrus.media.recordMalwareAuditEntry( args.user, mediaId, malwareWarning );

                    //  in case of race condition with processing payload and receiving files
                    //  hacky, TODO: remove
                    setTimeout( async function() {

                        [ err ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'media',
                                action: 'update',
                                query: {_id: mediaId },
                                data: {
                                    $set: { "malwareWarning": malwareWarning }
                                }
                            } )
                        );

                        if ( err ) {
                            //  should never happen
                            Y.log( `Malware check - could mark malware in GridFS: ${err.stack||err}`, 'error', NAME );
                        }

                    }, 30000 ); // 30 seconds

                    if ( err ) {
                        //  should never happen
                        Y.log( `Malware check - could mark malware in GridFS: ${err.stack||err}`, 'error', NAME );
                    }

                }

            } else {
                Y.log( `Received file from partner passes malware scan: ${mediaId}`, 'info', NAME );
            }

            logExit( timer );
            return args.callback( null );
        }

        /**
         *  Do action on sender after error on receiver:
         *  - for now implemented clearing of cache - reason to show not transferred activities on re-sync
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {Object}    args.data.entityName
         *  @param  {Object}    args.data.entryId
         *  @param  {Object}    args.data.sequenceNo
         *  @param  {Object}    args.data.message
         *  @param  {Function}  args.callback
         */
        async function receiveActiveFailure( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.receiveActiveFailure', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.receiveActiveFailure');
            }
            const
                { user, data: { entityName, entryId, sequenceNo, message }, callback } = args;

            Y.log( `receiveActiveFailure: Received failure details: ${entityName}.${entryId} ${sequenceNo} : ${message}`, 'debug', NAME );
            if( !entryId || !sequenceNo){
                Y.log( `receiveActiveFailure: Not all required params provided: entryId:${entryId} sequenceNo:${sequenceNo}`, 'error', NAME );
                return callback( 'Not all required params provided' );
            }

            if( entityName === 'activity' ){
                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'delete',
                        model: 'transfercache',
                        query: {
                            activityId: entryId
                        },
                        options: {
                            override: true
                        }
                    } )
                );
                if( err ) {
                    Y.log( `receiveActiveFailure: could not remove transfer cached activity: ${err.stack || err}`, 'error', NAME );
                }
            }

            callback( null );
        }

        /**
         *  Receive failure details aftre an activity transfer
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {Object}    args.data.failureDetails
         *  @param  {Function}  args.callback
         */
        async function receiveActiveRepeatSend( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.receiveActiveRepeatSend', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.receiveActiveRepeatSend');
            }
            const
                { user, data: { sequenceNos }, callback } = args;

            Y.log( `receiveActiveRepeatSend: resend for: ${sequenceNos}`, 'debug', NAME );
            if( !sequenceNos || !sequenceNos.length ){
                Y.log( `receiveActiveRepeatSend: Not all required params provided: sequenceNos:${sequenceNos}`, 'error', NAME );
                return callback( 'sequenceNo is required' );
            }

            let [err, syncdispatches] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'syncdispatcharchive',
                    query: { sequenceNo : {$in: sequenceNos } }
                } )
            );
            if( err ) {
                Y.log( `receiveActiveRepeatSend: error getting syncdispatcharchive for sequenceNo: ${sequenceNos}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( syncdispatches.length ) {
                for( let syncdispatch of syncdispatches){
                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'post',
                            model: 'syncdispatch',
                            data: {...syncdispatch, skipcheck_: true}
                        } )
                    );
                    if( err ) {
                        Y.log( `receiveActiveRepeatSend: error posting back syncdispatch for sequenceNo: ${syncdispatch.sequenceNo}: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }

            }
            callback( null );
        }

        /**
         *  Receive an activity transfer payload from a partner system in activActive mode
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {Object}    args.data.payload
         *  @param  {Function}  args.callback
         */
        async function receiveActive( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.receiveActive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.receiveActive');
            }
            const
                { user, data: transferData, callback } = args;

            Y.log( `Received data: ${JSON.stringify(transferData)}`, 'debug', NAME );
            let data, payload;
            try {
                data = JSON.parse( transferData.payload );
                payload = data.payload;
            } catch( err ) {
                Y.log(`receive: Error parsing payload data: ${err.stack || err}`, 'error', NAME);
            }

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'receivedispatch',
                    action: 'post',
                    data: {
                        ...payload,
                        timestamp: new Date(),
                        status: 0,
                        skipcheck_: true
                    }
                } )
            );
            if( err ){
                Y.log( `receiveActive: Error posting receivedispatch ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            callback( null, result);
        }

        /**
         *  Receive an activity transfer payload from a partner system
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {Object}    args.data.payload
         *  @param  {Function}  args.callback
         */

        function receive( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.receive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.receive');
            }
            const
                { user, data: transferData, callback } = args;

            Y.log( `Received data: ${JSON.stringify(transferData)}`, 'debug', NAME );
            let data, payload;
            try {
                data = JSON.parse( transferData.payload );
                payload = data.payload;
            } catch( err ) {
                Y.log(`receive: Error parsing payload data: ${err.stack || err}`, 'error', NAME);
            }

            function upsertMirrorData( unlock ) {

                return Promise.all( (payload.locations || []).map( ( loc ) => upsertMirrorLocation( user, loc, payload.commercialNo ) ) )
                    .then( ( locations ) => {
                        let casefolderPromises;
                        if( payload.preserveCaseFolder ){
                            casefolderPromises = [ ...(payload.casefolders || []).map( ( casefolder ) => upsertMirrorCaseFolder( user, true, casefolder ) ) ];
                        } else {
                            casefolderPromises = [ upsertMirrorCaseFolder( user, false, {
                                patientId: (payload.patient || {})._id,
                                sourceCustomerNo: payload.dcCustomerNo,
                                title: 'Von' + payload.dcCustomerNo
                            } ) ];
                        }

                        if( !(payload.patient || {}).countryMode ) {
                            if( !payload.patient ) {
                                Y.log(`upsertMirrorData: no patient in payload!`, 'warn', NAME);
                            } else {
                                let practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
                                let countryMode = practiceCountryMode.length ? practiceCountryMode[0] : 'D';
                                Y.log('Automatic settings POST: ' + practiceCountryMode, 'info', NAME);
                                payload.patient.countryMode = [countryMode]; // reqd for /2 REST backward compatibility.
                            }
                        }

                        const
                            mainLocation = _.findWhere( (locations || []), { isMainLocation: true } ) || {},
                            promises = [
                                ...(payload.employees || []).map( ( emp ) => upsertMirrorEmployee( user, emp ) ),
                                ...(payload.media || []).map( ( med ) => upsertMedia( user, med ) ),
                                ...(payload.documents || []).map( ( doc ) => upsertDocument( user, doc ) ),
                                ...(payload.activities || []).map( ( act ) => upsertMirrorActivity( user, act, mainLocation, unlock  ) ),
                                ...(payload.fileMetas || []).map( ( fmeta ) => upsertFileMeta( user, fmeta ) ),
                                ...(payload.fileChunks || []).map( ( fchunk ) => upsertFileChunks( user, fchunk ) ),
                                ...(payload.basecontacts || []).map( ( basecontact ) => upsertBaseContact( user, basecontact ) ),
                                ...casefolderPromises,
                                upsertMirrorPatient( user, payload.patient )
                            ];
                        return Promise.all( promises );
                    } );
            }

            /**
             * create task about new transfer (new entry in patienttransfer) - one per partner
             */
            async function createTaskForNewLogEntry( transferWithPatient ) {
                const
                    transferEntryId = transferWithPatient.transferEntryId,
                    taskData = {
                        allDay: true,
                        alertTime: (new Date()).toISOString(),
                        title: Y.doccirrus.i18n( 'PatientTransferMojit.message.document_received_title' ),
                        urgency: 2,
                        details: Y.Lang.sub( Y.doccirrus.i18n( 'PatientTransferMojit.message.document_received_details' ),
                            { facility: payload.coname} ),
                        group: false,
                        roles: [Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG],
                        creatorName: payload.coname,
                        type: 'NEW_TRANSFER'
                    };

                if(transferWithPatient.activities && transferWithPatient.activities.length){
                    //activities automatically created no additional tasks in this case
                    return Promise.resolve( transferWithPatient );
                }

                if(transferEntryId){
                    taskData.transferEntryId = transferEntryId;
                }

                let [err, taskCount] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'task',
                        action: 'count',
                        query: {
                            type: 'NEW_TRANSFER',
                            details: taskData.details,
                            status: {$ne: 'DONE'}
                        },
                        useCache: false
                    } )
                );
                if( err ) {
                    Y.log( `createTaskForNewLogEntry: Error getting task count: ${err.stack || err}`, 'error', NAME );
                }
                if( taskCount === 0 ){
                    writeTask( user, taskData );
                } else {
                    Y.log( `createTaskForNewLogEntry: task already created`, 'info', NAME );
                }

                return Promise.resolve( transferWithPatient );
            }

            function doneProcessing() {
                Y.log( 'All promises completed!', 'debug', NAME );
                callback( null, {} );
            }

            upsertMirrorData( payload.unlock )
                .then( matchPatient( user, payload.patient, payload.patientVersion ) )
                .then( ( matchedPatient ) => createTransferLogEntryOrAutomatic( user, payload.patient, matchedPatient, payload ) )
                .then( ( transferWithPatient ) => createTaskForNewLogEntry( transferWithPatient ) )
                .then( doneProcessing )
                .catch( ( err ) => callback( err ) );
        }

        /**
         * @method matchPatient
         * @private
         *
         * match receiver patients with payload and get latest timestamp from patientVersion
         *
         * @param {Object} user
         * @param {Object} patient
         * @param {Date} patientVersion
         *
         * @returns {Promise}{Object} matchingPatient
         */
        async function matchPatient(user, patient, patientVersion) {
            let matchPatient = promisifyArgsCallback( Y.doccirrus.api.patientmatch.matchPatient );

            if( !patient ){
                return null;
            }

            let [err, patientsMatching] = await formatPromiseResult(matchPatient({
                user: user,
                data: patient,
                options: {}
            }));

            if( err ){
                Y.log( `matchPatient: Error on patient match: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( patientsMatching.length ){
                if( patientVersion ){
                    let patientVersion;
                    [err, patientVersion] = await formatPromiseResult(
                        getPatientVersion(user, patientsMatching[0]._id)
                    );
                    if( err ){
                        Y.log( `matchPatient: Error getting matched patient version: ${err.stack || err}`, 'error', NAME );
                    } else {
                        patientsMatching[0].receiverPatientVersion = patientVersion;
                    }
                }

                return patientsMatching[0];
            }
        }

        /**
         * @method createOrGetFolder
         * @private
         *
         * process with transfer: either automatically create activities in partner folder or create new patienttransfer entry
         *
         * @param {Object} user
         * @param {Object} patient
         * @param {Object} matchedPatient
         * @param {Object} payload
         */
        async function createTransferLogEntryOrAutomatic( user, patient, matchedPatient, payload  ) {
            let
                patientsDiff,
                changed,
                err,
                result,
                createOrUpdatePatientP = promisifyArgsCallback( createOrUpdatePatient );

            if( matchedPatient && payload.automaticTransfer ){
                if( !payload.requestId ){
                    if( matchedPatient.mirrorPatientId && patient._id && matchedPatient.mirrorPatientId !== patient._id.toString() &&
                        (matchedPatient.additionalMirrorPatientIds || []).includes(patient._id.toString() ) ){ //additionally linked partner, no need to compare
                        Y.log( `Patient additionally linked to another patient, keep original patient`, 'debug', NAME );
                    } else {
                        if( !patient.patientVersion || !matchedPatient.receiverPatientVersion ||
                            (new Date(patient.patientVersion).getTime()) > (new Date(matchedPatient.receiverPatientVersion).getTime()) ){
                            patientsDiff = { rows: [ {area: 'baseData'} ] }; // force put in transfer book
                            try {
                                patientsDiff = ( matchedPatient && patient ) ? Y.doccirrus.commonutils.comparePatients(matchedPatient, patient) : { rows: [ {area: 'baseData'} ] };
                            } catch (err){
                                Y.log( 'Error on getting patients diff ' + err.message, 'error', NAME );
                            }
                        } else {
                            Y.log( `Patient version sender: ${new Date(patient.patientVersion)} lower than receiver: ${matchedPatient.receiverPatientVersion}, keep existed patient`, 'debug', NAME );
                        }
                    }

                    changed = ((patientsDiff || {}).rows || []).filter( diff => {
                        //on server side not count locationId, employeeId and _id in insuranceData
                        let pathArr = diff.pathOrg && diff.pathOrg.split('.') || [],
                            path = pathArr[pathArr.length - 1];

                        return (diff.area !== 'insuranceData') || !['locationId', 'employeeId', '_id'].includes(path);
                    }).map( diff => diff.area );
                }
                Y.log( `createTransferLogEntryOrAutomatic: diff ${JSON.stringify(patientsDiff)}`, 'debug', NAME );

                if( payload.requestId || !changed.length ){
                    // all checked patient data similar
                    let params = {
                        mirrorPatient: patient,
                        mirrorActivitiesIds: payload.activities.map( a => a._id ),
                        practiceName: payload.coname,
                        doctorName: payload.doctorName,
                        preservedCaseFolders: payload.preserveCaseFolder,
                        unlock: payload.unlock,
                        requestId: payload.requestId,
                        selectedData: {},
                        caseFolderId: payload.caseFolderId
                    };

                    [err, result] = await formatPromiseResult(
                        createOrUpdatePatientP ( {
                            user: user,
                            originalParams: params,
                            query: { _id: matchedPatient._id }
                        } )
                    );

                    if( err ){
                        throw err;
                    } else {
                        return { matchedPatient: matchedPatient, activities: result && result.activities };
                    }
                }
            }

            const entryData = {
                mirrorActivitiesIds: payload.activities.map( a => a._id ),
                mirrorActivitiesActTypes: payload.activities.map( a => a.actType ),
                mirrorPatientId: (patient || {})._id || ( payload.activities && payload.activities[0] && payload.activities[0].patientId ),
                practiceName: payload.coname,
                practiceCity: payload.city,
                mirrorPatientName: Y.doccirrus.schemas.person.personDisplay( {
                    firstname: (patient || {}).firstname,
                    lastname: (patient || {}).lastname,
                    title: (patient || {}).title
                } ),
                patientName: matchedPatient ? Y.doccirrus.schemas.person.personDisplay( {
                    firstname: matchedPatient.firstname,
                    lastname: matchedPatient.lastname,
                    title: matchedPatient.title
                } ) : null,
                patientPseudonym: matchedPatient ? matchedPatient.pseudonym : (patient || {}).pseudonym,
                doctorName: payload.doctorName,
                patientId: matchedPatient ? matchedPatient._id : null,
                preservedCaseFolders: payload.preserveCaseFolder,
                unlock: payload.unlock,
                requestId: payload.requestId
            };

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'patienttransfer',
                    data: Y.doccirrus.filters.cleanDbObject( entryData )
                } )
            );

            if( err ) {
                throw err;
            } else {
                return { matchedPatient: matchedPatient, transferEntryId: result[0], orgPatient: _.pick( payload.patient || {}, ['firstname', 'lastname', 'title'] ) };
            }
        }

        /**
         * @method createOrGetFolder
         * @private
         *
         * create partner caseFolded on receiver or get _id of already created
         *
         * @param {Object} user
         * @param {String} practiceName
         * @param {String} mirrorPatientId
         * @param {String} createdPatientId
         * @param {Boolean} preservedCaseFolders
         * @param {String} activityId
         * @param {String} prcDcCustomerNo
         *
         * @returns {Promise} {
         *  patientId:{String},         return back createdPatientId
         *  caseFolderId:{String}       partners casefolder _id or _id of preserved casefolder (same as in payload)
         */
        function createOrGetFolder( user, practiceName, mirrorPatientId, createdPatientId, preservedCaseFolders, activityId, prcDcCustomerNo ) {

            return new Promise( ( resolve, reject ) => {

                function doCaseFolderAction( preserved, mirrorObject, sourceCustomerNo ) {

                    let query,
                        data = {
                            patientId: createdPatientId,
                            skipcheck_: true
                        };
                    if( preserved ){
                        query = {
                            additionalType: mirrorObject.additionalType,
                            patientId: createdPatientId
                        };
                        data.additionalType = mirrorObject.additionalType;
                        data.title = mirrorObject.title;
                    } else {
                        query = {
                            sourceCustomerNo: sourceCustomerNo,
                            patientId: createdPatientId
                        };
                        data.title = 'Von ' + practiceName;
                        data.sourceCustomerNo = sourceCustomerNo;
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'upsert',
                        model: 'casefolder',
                        query,
                        options: { omitQueryId: true },
                        data
                    }, ( err, result ) => {
                        if( err ) {
                            Y.log( 'Failed to match casefolder: ' + err.message, 'error', NAME );
                            reject( err );
                        }
                        Y.log( `Done upsert casefolder: ${JSON.stringify(result)}`, 'debug', NAME );
                        resolve( { patientId: createdPatientId, caseFolderId: result && result._id } );
                    } );
                }

                // Only if patient matched
                if( createdPatientId ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'mirroractivity',
                        query: {
                            _id: activityId
                        }
                    }, ( err, activities ) => {
                        if( err ){
                            Y.log('Error on getting mirroractivity on transfering ' + err.message, 'errror', NAME );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'mirrorcasefolder',
                            query: {
                                patientId: mirrorPatientId
                            }
                        }, ( err, result ) => {
                            if( err ){
                                Y.log(`Error on getting mirroracasefolder on transfering ${err.message}`, 'errror', NAME );
                            }
                            //first check if there are preserved casefolders
                            let
                                presevedCF = result.filter( el => el._id.toString() === activities[0].caseFolderId ),
                                nonPreservedCF = result.filter( el => el.sourceCustomerNo );

                            if(preservedCaseFolders){
                                if(!presevedCF.length){
                                    return reject('preserved mirror casefolder not found');
                                }
                                doCaseFolderAction( true, presevedCF[0] );
                            } else {
                                if(!nonPreservedCF.length){
                                    return reject('source mirror casefolder not found');
                                }
                                doCaseFolderAction( false, nonPreservedCF[0], prcDcCustomerNo || nonPreservedCF[0].sourceCustomerNo );
                            }
                        } );
                    } );

                } else {
                    resolve( { patientId: createdPatientId, caseFolderId: null } );
                }
            } );
        }

        /**
         * @method createOrUpdatePatient
         * @public
         *
         * first create new patient from casefolder or assign mirrorPatientId to existed patient,
         * than create all activities that are pending in patienttransfers or set in argument mirrorActivitiesIds,
         * all processed patienttransfers are marked as IMPORTED
         *
         * @param {Object} args.user
         * @param {Object} args.query                                query for specific patient
         * @param {Object} args.originalParams.mirrorPatient
         * @param {String} args.originalParams.practiceName
         * @param {String} args.originalParams.requestId             patienttransfer entry id
         * @param {String} args.originalParams.caseFolderId          selected casefolder (used in complexprescription)
         * @param {Array} args.originalParams.mirrorActivitiesIds    array of mirroractivity id that pending to be saved in partner casefolder
         * @param {Boolean} args.originalParams.preservedCaseFolders  keep id of casefolder as in payload
         * @param {Array} args.originalParams.selectedData          areas of patient data that should be updated
         * @param {Function} args.callback
         *
         * @returns callback {
         *  patientId:{String}
         *  caseFolderId:{String}
         *  activities:{Array}      list of ids of saved activities in partner casefolder
         */
        async function createOrUpdatePatient( args ) {
            Y.log('Entering Y.doccirrus.api.activityTransfer.createOrUpdatePatient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.createOrUpdatePatient');
            }
            const
                { user, query, originalParams: { mirrorPatient: patient, practiceName, requestId, caseFolderId: selectedCaseFolderId,
                    mirrorActivitiesIds = [], preservedCaseFolders = false, unlock = false, selectedData = {} }, callback } = args;

            let patientCreateUpdatePromise = ((query._id) ? updatePatient( user, patient, query, selectedData ) : createPatient( user, patient ));

            let err, patId;
            [ err, patId ] = await formatPromiseResult( patientCreateUpdatePromise );
            if( err ){
                Y.log( 'Failed to update or create the patient: ' + err.message, 'error', NAME );
                return callback( err );
            }

            let createPatientAndCaseFolder = {patientId: patId};

            let patienttransfers;
            [ err, patienttransfers ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patienttransfer',
                    query: { mirrorPatientId: patient._id, status: 'NEW' },
                    options: { select: {_id: 1, mirrorActivitiesIds: 1} }
                } )
            );
            if( err ){
                Y.log( `createOrUpdatePatient: Error getting NEW patientTransfers for mirrorPatientId: ${patient._id} : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let patientTransferLogs = [], mirrorActivitiesIdsToProcess = [...mirrorActivitiesIds];
            ( patienttransfers || [] ).forEach( el => {
                patientTransferLogs = [...patientTransferLogs, el._id];
                mirrorActivitiesIdsToProcess = [...mirrorActivitiesIdsToProcess, ...( el.mirrorActivitiesIds || [] )];
            } );

            //TODO here should be separate process of patient transfer entries to allow change status to imported if any
            // error was during activity creation
            let
                updatedActivities = [],
                updatedActivitiesForReporting = [];
            mirrorActivitiesIdsToProcess = [...new Set(mirrorActivitiesIdsToProcess)];

            for( let mirrorActivityId of mirrorActivitiesIdsToProcess){
                let promiseCaseFolder;
                if(selectedCaseFolderId){
                    promiseCaseFolder = Promise.resolve( {
                        patientId: patId,
                        caseFolderId: selectedCaseFolderId
                    } );
                } else {
                    promiseCaseFolder = createOrGetFolder( user, practiceName, patient._id, patId, preservedCaseFolders, mirrorActivityId );
                }

                let patientAndCaseFolder;
                [ err, patientAndCaseFolder ] = await formatPromiseResult( promiseCaseFolder );
                if( err ){
                    Y.log( `createOrUpdatePatient: Error processing caseFolder for mirrorActivityId: ${mirrorActivityId} : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                createPatientAndCaseFolder = patientAndCaseFolder;

                let actId;
                [ err, actId ] = await formatPromiseResult(
                    insertActivityPlaceholder( user, mirrorActivityId, patientAndCaseFolder.patientId, patientAndCaseFolder.caseFolderId, requestId, preservedCaseFolders, unlock )
                );
                if( err ){
                    Y.log( `createOrUpdatePatient: Error inserting activity placeholder for mirrorActivityId: ${mirrorActivityId} : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                updatedActivities.push( actId );
                //only in this case we create normal activity for which reporting should be generated
                if( preservedCaseFolders && unlock ){
                    updatedActivitiesForReporting.push( actId );
                }

            }

            //  request reporting after two minutes, and again after 10 minutes - MOJ-11306

            //  the timeout is to allow for other linked objects which may still be transferring and are needed by mappers
            //  and to prevent forms from being duplicated if the activity saves first and re-initializes them

            const REPORTING_WAIT_FOR_FORM = 2 * 60 * 1000;
            const REPORTING_WAIT_FOR_TRANSFER = 10 * 60 * 1000;

            if(updatedActivitiesForReporting.length) { //generate reporting for normal activities
                setTimeout( function() {
                    makeReportingForReceivedActivities( user, updatedActivitiesForReporting );
                }, REPORTING_WAIT_FOR_FORM );
                setTimeout( function() {
                    makeReportingForReceivedActivities( user, updatedActivitiesForReporting );
                }, REPORTING_WAIT_FOR_TRANSFER );
            }

            (createPatientAndCaseFolder || {}).activities =  updatedActivities;

            [ err ] = await formatPromiseResult(
                updatePatientMedia( user, patient._id, createPatientAndCaseFolder.patientId )
            );
            if( err ){
                Y.log( `createOrUpdatePatient: Error updating patient ${patient._id} media : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !patientTransferLogs.length ) {
                return callback( null, createPatientAndCaseFolder );
            }

            let patients;
            if( createPatientAndCaseFolder.patientId ) {
                [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'patient',
                        query: {
                            _id: createPatientAndCaseFolder.patientId
                        }
                    } )
                );
                if( err ){
                    Y.log( `createOrUpdatePatient: Error getting patient ${createPatientAndCaseFolder.patientId} : ${err.stack || err}`, 'warn', NAME );
                }
            }

            //update status in mass processed patienttransfers
            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'patienttransfer',
                    query: {
                        _id: {$in: patientTransferLogs}
                    },
                    data: {
                        $set: {
                            user: [ {
                                employeeNo: user.specifiedBy,
                                name: user.U
                            }],
                            status: 'IMPORTED',
                            patientId: createPatientAndCaseFolder.patientId,
                            patientName: patients && patients.length ? Y.doccirrus.schemas.person.personDisplay( {
                                firstname: patients[0].firstname,
                                lastname: patients[0].lastname,
                                title: patients[0].title
                            } ) : null
                        }
                    },
                    options: {multi: true}
                } )
            );
            if( err ){
                Y.log( `createOrUpdatePatient: Error updating patient ${patient._id} media : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            callback( null, createPatientAndCaseFolder );
        }

        /**
         *  Hotpatch for Semdatex, to ensure reporting is made, MOJ-11306
         *  @param user
         *  @param updatedActivities
         */

        async function makeReportingForReceivedActivities( user, updatedActivities ) {
            let
                newActivityId,
                err, result;

            for ( newActivityId of updatedActivities ) {

                //  get the _id, may be an activity or mirror activity _id

                if ( Array.isArray( newActivityId ) && newActivityId[0] ) {
                    newActivityId = `${newActivityId[0]}`;
                }

                if ( 'object' === typeof newActivityId && newActivityId.id ) {
                    newActivityId = `${newActivityId.id}`;
                }

                if ( 'object' === typeof newActivityId && newActivityId._id ) {
                    newActivityId = `${newActivityId._id}`;
                }

                if ( 'string' !== typeof newActivityId ) {
                    newActivityId = `${newActivityId}`;
                }

                //  check if this is actually a mirrorActivityId

                if ( newActivityId ) {


                    [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: { unlinkedMirrorIds: newActivityId }
                    } ) );

                    if ( err ) {
                        //  should not happen
                        Y.log( `Could not query mirror activity id ${newActivityId}: ${err.stack||err}`, 'error', NAME );
                        return;
                    }

                    if ( result && result[0] ) {
                        Y.log( `Resolved mirror activity _id ${newActivityId} to copy activity: ${result[0]._id.toString()}`, 'info', NAME );
                        newActivityId = result[0]._id.toString();
                    }

                    [ err ] = await formatPromiseResult( checkFormForReceivedActivity( user, newActivityId ) );

                    if ( err ) {
                        Y.log( `Problem checking form for ${newActivityId}: ${err.stack||err}`, 'error', NAME );
                        //  continue anyway, best effort
                    }

                    Y.log( `Invoking syncReportingManager for received activity: ${newActivityId}`, 'info', NAME );
                    Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', newActivityId );
                }

            }
        }

        /**
         *  If the received activity should have a fprm, but does not, create and initialize it MOJ-11306
         *
         *  @param  {Object}    user
         *  @param  {String}    newActivityId       actual activity _id, not mirror activity id
         */

        async function checkFormForReceivedActivity( user, newActivityId ) {

            const
                attachments = new Y.dcforms.AttachmentsModel(),
                loadAttachmentsP = util.promisify( attachments.loadFromActivity ),
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity );

            let err, result, activity, formDoc;

            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                query: { _id: newActivityId }
            } ) );

            if ( err ) {
                Y.log( `Could not load activity to check form attachments ${newActivityId}: ${err.stack||err}`, 'error', NAME );
                return;
            }

            if ( !result || !result[0] ) {
                Y.log( `Could not load activity to check form attachments ${newActivityId}, not present`, 'error', NAME );
                return;
            }

            activity = result[0];

            if ( !activity.formId ) {
                //  no form on this activity, no need to check attachments
                return;
            }

            [ err ] = await formatPromiseResult( loadAttachmentsP( user, activity ) );

            if ( err ) {
                Y.log( `Could not load attachments of ${newActivityId}: ${err.stack||err}`, 'error', NAME );
                return;
            }

            formDoc = attachments.findDocument( 'FORM' );

            if ( formDoc ) {
                //  formDoc exists, nothing more to do
                return;
            }

            [ err ] = await formatPromiseResult( initializeFormForActivityP( user, newActivityId, {}, null ) );


            if ( err ) {
                Y.log( `Could not intialize form ${activity.formId} of ${newActivityId}: ${err.stack||err}`, 'error', NAME );
                return;
            }
        }

        /**
         * @method updatePatientMedia
         * @private
         *
         * reassign arrived media from mirrorPatientId to real (matched) patient _id
         *
         * @param {Object} user
         * @param {String} mirrorPatientId
         * @param {String} createdPatientId
         *
         * @returns {Promise}
         */
        async function updatePatientMedia( user, mirrorPatientId, createdPatientId ) {
            let [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'media',
                    action: 'put',
                    data: {
                        ownerId: createdPatientId,
                        skipcheck_: true
                    },
                    fields: ['ownerId'],
                    query: {
                        ownerCollection: 'patient',
                        ownerId: mirrorPatientId
                    }
                } )
            );
            if( err ) {
                Y.log( `updatePatientMedia: Failed to update the patient media: ${err.stack || err}`, 'error', NAME );
                throw( err );
            }
            Y.log( `Found patient media to update, updating...done ${result._id}`, 'debug', NAME );
            return result;
        }

        /**
         * @method updatePatientMedia
         * @private
         *
         * reasign arrived media from mirrorPatientId to real (matched) patient _id
         *
         * @param {Object} user
         * @param {Object} patient      received patient data
         * @param {Object} query        query for update actual receiver patient collection
         * @param {Array} selectedData  areas of patient data that need to be updated
         *
         * @returns {Promise}   _id of updated patient
         */
        async function updatePatient( user, patient, query, selectedData ) {
            let data = {...patient},
                fields = [ 'mirrorPatientId' ],
                toCheck = {
                    baseData: [
                        'firstname', 'lastname', 'kbvDob', 'partnerIds', 'talk', 'title', 'nameaffix', 'fk3120',
                        'gender', 'dateOfDeath', 'jobTitle', 'workingAt', 'isPensioner', 'sendPatientReceipt',
                        'patientSince', 'dob_DD', 'dob_MM', 'communications', 'addresses',
                        'physicians', 'familyDoctor', 'institution', 'pseudonym', 'treatmentNeeds'
                    ],
                    careData: ['partnerIds'],
                    accountData: ['accounts'],
                    additionalData: [
                        'crmCatalogShort', 'crmTreatments', 'crmTags', 'crmAppointmentMonth', 'crmAppointmentRangeEnd',
                        'crmAppointmentRangeStart', 'crmAppointmentYear', 'crmComment', 'crmReminder'
                    ],
                    insuranceData: ['insuranceStatus'],
                    egkData: ['insuranceStatus']
                };
            let err, patients;
            [ err, patients ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'get',
                    query: {$or: [
                        query,
                        {mirrorPatientId: patient._id},
                        {additionalMirrorPatientIds: patient._id}
                    ]}
                } )
            );
            if( err ){
                Y.log( `updatePatient: Error on getting transfered patients: ${err.stack || err}`, 'error', NAME );
            }

            let patientIs = patients && patients[0] || {},
                is = patientIs.partnerIds || [],
                is_base = [],
                is_care = [],
                nw = patient.partnerIds || [],
                nw_base = [],
                nw_care = [],
                nw_base_update = false,
                nw_care_update = false,
                partnerIds_toWrite;



            let patientFound = patients && patients[0] && patients[0] || {},
                linkedPartners = [...(patientFound.additionalMirrorPatientIds || []), patientFound.mirrorPatientId],
                needUpdateMirrorId = !linkedPartners.includes( patient._id );

            data.mirrorPatientId = patientFound.mirrorPatientId;
            data.additionalMirrorPatientIds = patientFound.additionalMirrorPatientIds || [];



            if( needUpdateMirrorId ){
               data.additionalMirrorPatientIds = [...(patientFound.additionalMirrorPatientIds || []), patient._id ];
               fields.push( 'additionalMirrorPatientIds' );
            }

            if( patient._id === patientFound.mirrorPatientId ){ //update if ony patient was firstly assigned
                let insurance_nw_base_update = false,
                    insurance_nw_ekg_update = false;

                Object.keys(toCheck).forEach( function(area) {
                    if( 'baseData' === area && true === selectedData[area] ) { nw_base_update = true; }
                    if( 'careData' === area && true === selectedData[area] ) { nw_care_update = true; }

                    if( 'insuranceData' === area && true === selectedData[area] ) { insurance_nw_base_update = true; }
                    if( 'egkData' === area && true === selectedData[area] ) { insurance_nw_ekg_update = true; }

                    if( true === selectedData[area] ){
                        fields = [ ...new Set([ ...fields, ...toCheck[area] ]) ];
                    }

                } );

                if( nw_base_update && nw_care_update ){
                    partnerIds_toWrite = nw;
                } else if( nw_base_update || nw_care_update ){
                    nw.forEach( el => {
                        if( el.extra ){
                            nw_base.push(el);
                        } else {
                            nw_care.push(el);
                        }
                    } );
                    is.forEach( el => {
                        if( el.extra ){
                            is_base.push(el);
                        } else {
                            is_care.push(el);
                        }
                    } );
                    if( nw_base_update ){
                        partnerIds_toWrite = [...nw_base, ...is_care];
                    } else {
                        partnerIds_toWrite = [...is_base, ...nw_care];
                    }
                } else {
                    partnerIds_toWrite = is;
                }

                data.partnerIds = partnerIds_toWrite;

                //insurance and eKG separately
                let insuranceIsObj, insuranceObj, insuranceArr, insuranceNwObj, keys,
                    isInsuranceStatuses = [...(patientIs.insuranceStatus || []) ],
                    mwInsuranceStatuses = [...(patient.insuranceStatus || []) ];

                if( insurance_nw_base_update ){
                    //preprocess insurances to prevent removing insurance
                    insuranceIsObj = Y.doccirrus.commonutils.processInsuranceStatus(isInsuranceStatuses, false, 'all' );
                    insuranceNwObj = Y.doccirrus.commonutils.processInsuranceStatus(mwInsuranceStatuses, false, 'all' );

                    keys = [...new Set( [...(Object.keys(insuranceIsObj || {})), ...(Object.keys(insuranceNwObj)) ] )];

                    for(let typeKey of keys) {
                        if( insuranceIsObj[typeKey] && !insuranceNwObj[typeKey] ){
                            insuranceNwObj[typeKey] = insuranceIsObj[typeKey];
                        }
                        if( insuranceIsObj[typeKey] && insuranceNwObj[typeKey] ){
                            //set in new data locationId and employeeId same as in receiver data
                            insuranceNwObj[typeKey].locationId = insuranceIsObj[typeKey].locationId;
                            insuranceNwObj[typeKey].employeeId = insuranceIsObj[typeKey].employeeId;
                        }
                    }
                    isInsuranceStatuses = Object.values(insuranceIsObj) || [];
                    mwInsuranceStatuses = Object.values(insuranceNwObj) || [];
                }



                if( insurance_nw_base_update && insurance_nw_ekg_update ){
                    data.insuranceStatus = mwInsuranceStatuses;
                } else if( insurance_nw_base_update && !insurance_nw_ekg_update ){
                    insuranceIsObj = Y.doccirrus.commonutils.processInsuranceStatus(mwInsuranceStatuses, true);
                    insuranceNwObj = Y.doccirrus.commonutils.processInsuranceStatus(mwInsuranceStatuses, true);
                    insuranceObj = Y.doccirrus.commonutils.processInsuranceStatus(mwInsuranceStatuses, false, 'location&employee' );

                    insuranceArr = [];
                    for(let insurance in insuranceObj){
                        if (insuranceObj.hasOwnProperty(insurance)) {
                            let dataLocal = insuranceIsObj[insurance];

                            //we need to keep cardSwipe if it set and not changed
                            if( insuranceIsObj.hasOwnProperty( insurance ) && insuranceNwObj.hasOwnProperty( insurance ) &&
                                insuranceIsObj[insurance] && insuranceNwObj[insurance] &&
                                insuranceIsObj[insurance].cardSwipe && insuranceNwObj[insurance].cardSwipe &&
                                moment(insuranceIsObj[insurance].cardSwipe).isSame(insuranceNwObj[insurance].cardSwipe) ){
                                dataLocal.cardSwipe = insuranceIsObj[insurance].cardSwipe;

                            }

                            if( insuranceObj.hasOwnProperty( insurance ) ) {
                                insuranceArr = [...insuranceArr, {...insuranceObj[insurance], ...dataLocal}];
                            }
                        }
                    }
                    data.insuranceStatus = insuranceArr;
                } else if( !insurance_nw_base_update && insurance_nw_ekg_update ){
                    insuranceIsObj = Y.doccirrus.commonutils.processInsuranceStatus(isInsuranceStatuses, false, 'location&employee');
                    insuranceObj = Y.doccirrus.commonutils.processInsuranceStatus(mwInsuranceStatuses, true);

                    insuranceArr = [];
                    for(let insurance in insuranceIsObj){
                        if (insuranceIsObj.hasOwnProperty(insurance)) {
                            let dataLocal = insuranceIsObj[insurance];
                            if(insuranceObj[insurance]){
                                dataLocal = {...dataLocal, ...insuranceObj[insurance]};
                            }
                            insuranceArr = [...insuranceArr, dataLocal];
                        }
                    }
                    data.insuranceStatus = insuranceArr;
                } else {
                    delete data.insuranceStatus; //both insuranceStatus and ekgData unchecked
                }
            }

            if( fields.length === 1 && fields[0] === 'mirrorPatientId' && patients.length && !needUpdateMirrorId ){
                //only existed and already set field pending to update, skip...
                Y.log( `updatePatient skipped... due to only mirrorPatientId is pending to update`, 'debug', NAME );
                return patients[0]._id;
            }




            Y.log( `updatePatient: f:[${fields}] q:[${JSON.stringify(query)}] d:${JSON.stringify(data)}`, 'debug', NAME );

            let result;
            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'put',
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    fields,
                    query
                } )
            );
            if( err ) {
                Y.log( `updatePatient: Error on updating patient: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            Y.log( `Found patient ${result._id}, updating...done`, 'debug', NAME );
            return result._id;
        }

        function upsertFileMeta( user, data ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.media.gridfs.saveFileMeta( user, data, false, true, ( err, data ) => {
                    if( err ) {
                        Y.log( 'inCare Failed to add filemeta: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        resolve( data );
                    }
                } );
            } );
        }

        function upsertFileChunks( user, data ) {
            return new Promise( ( resolve, reject ) => {
                const chunkCopy = Object.assign( data, { files_id: new ObjectID( data.files_id ) } );
                Y.doccirrus.media.gridfs.saveChunk( user, chunkCopy, false, true, ( err, data ) => {
                    if( err ) {
                        Y.log( 'inCare Failed to save chunk: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        resolve( data );
                    }
                } );
            } );
        }

        function upsertMirrorPatient( user, patient ) {
            return new Promise( ( res, rej ) => {
                if(!patient){
                    return res();
                }
                delete patient.__v;
                const cleanPatient = Y.doccirrus.filters.cleanDbObject( patient );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'mirrorpatient',
                    fields: Object.keys( patient ),
                    data: cleanPatient
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert mirrorpatient: ' + err.message, 'error', NAME );
                        rej( err );
                    } else {
                        res( result );
                    }
                } );
            } );
        }

        function upsertMirrorCaseFolder( user, preserved, data ) {

            return new Promise( ( resolve, reject ) => {
                if(!data.patientId){
                    return resolve();
                }

                let query, options = {};
                if( preserved ){
                    query = {
                        _id: data._id
                    };
                } else {
                    query = {
                        sourceCustomerNo: data.sourceCustomerNo,
                        patientId: data.patientId
                    };
                    options.omitQueryId = true;
                    delete data._id;
                }


                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'count',
                    model: 'mirrorcasefolder',
                    query
                }, ( err, count ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert mirror caseFolder: ' + err.message, 'error', NAME );
                        reject( err );
                    } else if( 0 === count ) {
                        delete data.__v;

                        data = Y.doccirrus.filters.cleanDbObject( data );

                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'upsert',
                            query,
                            model: 'mirrorcasefolder',
                            fields: Object.keys( data ),
                            data,
                            options
                        }, ( err ) => {
                            if( err ) {
                                Y.log( 'Failed to upsert mirror caseFolder: ' + err.message, 'error', NAME );
                                reject( err );
                            }
                            resolve( {} );
                        } );
                    } else {
                        resolve( {} );
                    }

                } );
            } );
        }

        function createPatient( user, patient ) {
            return new Promise( ( resolve, reject ) => {

                Y.log( 'Start to upsert patient', 'debug', NAME );

                const // 'physicians', 'partnerIds'
                    mirrorPatientData = Object.assign( _.omit( patient, ['_id', 'id', '__v', 'patientNo' ] ), {
                        mirrorPatientId: patient._id,
                        additionalMirrorPatientIds: []
                    } ),
                    cleanMirrorPatientData = Y.doccirrus.filters.cleanDbObject( mirrorPatientData );
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'patient',
                    user: user,
                    data: cleanMirrorPatientData,
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'Failed to create patient: ' + err.message, 'error', NAME );
                            reject( err );
                        } else {
                            Y.log( 'Creating new patient...done', 'debug', NAME );
                            resolve( result[0] );
                        }
                    }
                } );
            } );
        }

        function upsertMirrorLocation( user, data, commercialNo ) {
            return new Promise( ( resolve, reject ) => {

                Y.log( 'Start to upsert mirrorlocation', 'debug', NAME );

                let location = _.omit( data, '__v' );

                function upsertMirrorLocationDirect() {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'upsert',
                        model: 'mirrorlocation',
                        fields: Object.keys( location ),
                        data: Y.doccirrus.filters.cleanDbObject( location )
                    }, ( err, result ) => {
                        if( err ) {
                            Y.log( 'Failed to upsert mirrorlocation: ' + err.message, 'error', NAME );
                            reject( err );
                        } else {
                            Y.log( 'Done upsert mirroremployee', 'debug', NAME );
                            resolve( result );
                        }
                    } );
                }

                if( '000000000000000000000001' === data._id ) {
                    location = _.omit( Object.assign( location, { 'isMainLocation': true } ), '_id' );

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'mirrorlocation',
                        query: {
                            commercialNo: commercialNo,
                            isMainLocation: true
                        },
                        options: { lean: true }
                    }, ( err, result ) => {

                        if( err ) {
                            Y.log( 'Failed to upsert mirrorlocation: ' + err.message, 'error', NAME );
                            reject( err );
                        } else {
                            if( result && result.length > 0 ) {
                                resolve( result[0] );
                            } else {
                                upsertMirrorLocationDirect();
                            }
                        }
                    } );
                } else {
                    upsertMirrorLocationDirect();
                }

            } );
        }

        function upsertMirrorEmployee( user, data ) {
            return new Promise( ( resolve, reject ) => {

                Y.log( 'Start to upsert mirroremployee', 'debug', NAME );

                delete data.__v;
                data = Y.doccirrus.filters.cleanDbObject( data );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'mirroremployee',
                    fields: Object.keys( data ),
                    data: data
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert mirroremployee: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        Y.log( 'Done upsert mirroremployee', 'debug', NAME );
                        resolve( { type: 'employee', id: result._id, officialNo: result.officialNo || '' } );
                    }

                } );
            } );
        }

        function upsertDocument( user, data ) {
            return new Promise( ( resolve, reject ) => {

                Y.log( 'Start upsert document', 'debug', NAME );

                delete data.__v;

                data = Y.doccirrus.filters.cleanDbObject( data );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'document',
                    fields: Object.keys( data ),
                    data: data
                }, ( err ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert document: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        Y.log( 'Done upsert document', 'debug', NAME );
                        resolve( {} );
                    }

                } );
            } );
        }

        function upsertBaseContact( user, data ) {
            return new Promise( ( resolve, reject ) => {

                Y.log( 'Start upsert basecontact', 'debug', NAME );

                delete data.__v;

                data = Y.doccirrus.filters.cleanDbObject( data );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'basecontact',
                    fields: Object.keys( data ),
                    data: data
                }, ( err ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert basecontact: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        Y.log( 'Done upsert basecontact', 'debug', NAME );
                        resolve( {} );
                    }

                } );
            } );
        }

        function upsertMedia( user, data ) {
            return new Promise( ( resolve, reject ) => {

                Y.log( 'Start upsert media', 'debug', NAME );

                delete data.__v;

                data = Y.doccirrus.filters.cleanDbObject( data );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'media',
                    fields: Object.keys( data ),
                    data: data
                }, ( err ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert media: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        Y.log( 'Done upsert media', 'debug', NAME );
                        resolve( {} );
                    }
                } );
            } );
        }

        function upsertMirrorActivity( user, data, mainLocation, unlock = false ) {
            return new Promise( ( resolve, reject ) => {

                Y.log( `Start upserting mirroractivity; unlock:${unlock}`, 'debug', NAME );

                delete data.__v;

                if( !unlock && '000000000000000000000001' === data.locationId && mainLocation._id) {
                    data.locationId = mainLocation._id;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'mirroractivity',
                    fields: Object.keys( data ),
                    data: Y.doccirrus.filters.cleanDbObject( data )
                }, ( err ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert mirroractivity: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        Y.log( 'Done upsert mirroractivity entity', 'debug', NAME );
                        resolve();
                    }
                } );
            } );
        }

        function insertActivityPlaceholder( user, mirrorActivityDataOrId, patientId, caseFolderId, requestId, preservedCaseFolders, unlock ) {
            return new Promise( ( resolve, reject ) => {

                var mirrorActivityId = null;

                async function updateAct( mirrorActivityData ) {

                    if( !mirrorActivityData ) {
                        reject( new Error( 'No activity data provided' ) );
                        return;
                    }

                    let data = Object.assign(
                        _.omit( mirrorActivityData, 'patientId', 'caseFolderId', '__v' ),
                        {
                            patientId: patientId,
                            mirrorActivityId: requestId ? null : mirrorActivityData._id,
                            restRequestId: requestId ? requestId : null,
                            caseFolderId: caseFolderId
                        } ),
                        operation = {
                            user,
                            model: 'activity',
                            action: unlock && preservedCaseFolders ? 'post' : ( requestId ? 'upsert' : 'update' ),
                            migrate: true,
                            query: {
                                _id: mirrorActivityData._id
                            },
                            data,
                            options: { upsert: true, 'new': true }
                        };

                    //add this field to enable discriminators
                    data.__t = data.actType;
                    data.skipcheck_ = true;

                    if( unlock && preservedCaseFolders ){
                        data.unlinkedMirrorIds = [ ...new Set([...(data.unlinkedMirrorIds || []), mirrorActivityData._id]) ];
                        delete data.mirrorActivityId;
                        delete data.mirrorCaseFolderType;
                        delete data._id;
                        data.status = 'CREATED';
                        data.skipcheck_ = true;
                    }

                    if( requestId ){
                        data.skipcheck_ = true;
                        operation.fields = Object.keys( data );
                    }

                    //try to popualate location and employee during unlock
                    if( unlock ){
                        let error, locations;
                        [ error, locations ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'location',
                                action: 'get',
                                query: {$or: [
                                    {_id: data.locationId && data.locationId.toString() },
                                    { locname: data.locationName }
                                ] }
                            } )
                        );
                        if( error ){
                            Y.log( `updateAct: Error getting location ${error.stack || error}`, 'warn', NAME );
                        } else {
                            if( locations.length ){
                                data.locationId = locations[0]._id;
                            } else {
                                data.locationId = Y.doccirrus.schemas.location.getMainLocationId();
                            }
                        }

                        //initially drop original employeeId, it will be populated by actual data later
                        data.employeeId = null;

                        let mirroremployees,
                            employees;
                        [ error, mirroremployees ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'mirroremployee',
                                action: 'get',
                                query: {_id: data.employeeId},
                                options: {select: {firstname: 1, lastname: 1}}
                            } )
                        );
                        if( error ){
                            Y.log( `updateAct: Error getting location ${error.stack || error}`, 'warn', NAME );
                        } else {
                            if( mirroremployees.length ){
                                [ error, employees ] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        model: 'employee',
                                        action: 'get',
                                        query: {$or: [
                                            {_id: data.employeeId},
                                            {firstname: mirroremployees[0].firstname, lastname: mirroremployees[0].lastname}
                                        ]}
                                    } )
                                );
                                if( error ){
                                    Y.log( `updateAct: Error getting location ${error.stack || error}`, 'warn', NAME );
                                } else {
                                    if( employees.length ){
                                        data.employeeId = employees[0]._id;
                                    }
                                }
                            }
                        }

                        if( !data.employeeId ){
                            //it is required for saving activity then take any Physician for this location
                            [ error, employees ] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'employee',
                                    action: 'get',
                                    query: {status: 'ACTIVE'}
                                } )
                            );
                            if( error ){
                                Y.log( `updateAct: Error getting active employees ${error.stack || error}`, 'warn', NAME );
                            } else {
                                let physicians = (employees || []).find( el => el.type === 'PHYSICIAN' );
                                if(physicians){
                                    data.employeeId = physicians._id && physicians._id.toString();
                                }
                            }
                        }

                    }

                    Y.doccirrus.mongodb.runDb( operation, function( err ) {
                        if( err ) {
                            Y.log( 'Activity placeholder creation error:' + err.message, 'error' );
                            reject( err );
                        } else {
                            Y.log( 'Done upsert activity placeholder', 'debug', NAME );
                            resolve( { id: mirrorActivityData._id, type: mirrorActivityData.actType } );
                        }
                    } );
                }

                if( patientId ) {

                    if( 'string' === typeof mirrorActivityDataOrId ) {
                        mirrorActivityId = mirrorActivityDataOrId;
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'mirroractivity',
                            query: {
                                _id: mirrorActivityId
                            },
                            options: { lean: true }
                        }, ( err, result ) => {

                            if( err ) {
                                reject( err );
                            } else {
                                updateAct( result[0] );
                            }
                        } );
                    } else {
                        updateAct( mirrorActivityDataOrId );
                    }

                } else {
                    resolve( null );
                }
            } );
        }

        function generateAuditDescription( data ) {
            var
                content,
                res = '';
            if( data.actType ) {
                res = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', data.actType, '-de', '' );
            }
            if( data.code ) {
                res += (res ? ',  ' + data.code : data.code);
            }
            if( data.patientName ) {
                res = (res ? data.patientName + ',  ' : data.patientName) + res;
            }
            content = data.content || ' kein Inhalt';
            return res + (res ? ',  ' + content : content) || 'Eintrag ohne Titel';
        }

        function logActivityTransfer( activity, who, target ) {

            const
                entry = Y.doccirrus.api.audit.getBasicEntry( who, 'transfer', 'activity', `${target.name}: ${generateAuditDescription( activity )}` );

            if( entry ) {
                if( !entry.diff ) {
                    entry.diff = {
                        caseFolderId: {newValue: activity.caseFolderId},
                        patientId: {newValue: activity.patientId},
                        locationId: {newValue: activity.locationId && activity.locationId.toString()},
                        employeeId: {newValue: activity.employeeId}
                    };
                }
            }

            return Y.doccirrus.api.audit.post( {
                user: who,
                data: Object.assign( {}, entry, {
                    skipcheck_: true,
                    objId: activity._id
                } )
            } );
        }

        function writeTask( user, taskData ) {
            const cleanData = Y.doccirrus.filters.cleanDbObject( taskData );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanData
            }, function( err ) {//, result
                if( err ) {
                    Y.log( 'Failed to add task: ' + err.message, 'error', NAME );
                }
            } );
        }

        /**
         * @method prepareActivityQuery
         * @private
         *
         * returns prepared comulative query and array of partners with exact query per partner
         *
         * @param {Object} user
         * @param {Object} dates                - { startDate,  endDate } interval for getting activities
         * @param {Array} selectedPartners      - array of _id of selected on UI partners
         * @param {String} patientId            - _id of patient wich
         *
         * @returns {Object}{ query, partnerQueries } query             - single querie to get all activities for all selected partners
         *                                            partnerQueries    - array of partners configured for automatic transfer with activity query for
         *                                                                exact partner
         */
        async function prepareActivityQuery( user, dates, selectedPartners = [], patientId = null ){
            let [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    action: 'aggregate',
                    pipeline: [
                        {$addFields: { doc: "$$ROOT" } },
                        {$match: {
                                bidirectional: true,
                                status: {$in: ['CONFIRMED', 'LICENSED']},
                                $or: [
                                    {configuration: {$elemMatch: { automaticProcessing: true } }},
                                    {activeActive: true}
                                ]

                            }},
                        {$unwind: '$configuration'},
                        {$match: { $or: [
                                {"configuration.automaticProcessing": true},
                                {activeActive: true}
                        ] } },
                        {$lookup: {
                                from: "casefolders",
                                let: { caseType: "$configuration.caseFolders" },
                                pipeline: [
                                    { $match: {
                                            $expr: { $or: [
                                                    { $in: [ "$type",  "$$caseType" ] },
                                                    { $in: [ "$additionalType",  "$$caseType" ] }
                                                ] }
                                        } },
                                    { $project: { _id: 1 } }
                                ],
                                as: "casefolders"
                            } },
                        {$group: {_id: "$_id", doc: {$first: "$doc"}, actTypes: {$first: "$configuration.actTypes"}, actStatuses: {$first: "$configuration.actStatuses"}, subTypes: {$first: "$configuration.subTypes"}, caseFolders: {$first: "$configuration.caseFolders"}, casefolderIds: {$addToSet: "$casefolders._id"}}},
                        {$unwind: "$casefolderIds"}
                    ]
                } )
            );
            if( err ) {
                Y.log( `prepareActivityQuery: Error on aggregating partner configurations : ${err.stack || err}`, 'error', NAME );
                throw( err );
            }
            let partners = results && results.result || [];

            let
                orClause = [],
                partnerQueries = [],
                patientIdFilter = { patientId: { $in: [patientId] } },
                timeRange = { timestamp: {
                    $gt: new Date( dates.startDate ),
                    $lte: new Date( dates.endDate )
                } };

            partners.forEach( el => {
                let andClause = {};
                if( el.doc && el.doc.activeActive !== true ){
                    if( el.actTypes && el.actTypes.length === 1 && el.actTypes[0] === 'ALL' ) {
                        andClause.actType = {$exists: true}; //in case all other will be ALL, to produce correct query
                    } else {
                        andClause.actType = {$in: el.actTypes};
                    }
                    if( el.actStatuses && !(el.actStatuses.length === 1 && el.actStatuses[0] === 'ALL') ) {
                        andClause.status = {$in: el.actStatuses};
                    }
                    if( el.caseFolders && !(el.caseFolders.length === 1 && el.caseFolders[0] === 'ALL') ) {
                        andClause.caseFolderId = {$in: el.casefolderIds.map( el => el.toString())};
                    }
                    if( el.subTypes && el.subTypes.length ) {
                        andClause.subType = {$in: el.subTypes};
                    }

                    if( selectedPartners.includes(el._id.toString()) ){
                        orClause.push( andClause );
                    }
                } else {
                    if( selectedPartners.includes(el._id.toString()) ) {
                        orClause.push( {actType: {$exists: true}} ); //query all activities in time range for activeActive
                    }
                }

                let andArray = [
                    patientId ? patientIdFilter : timeRange,
                    { $or: [
                        { mirrorActivityId: { $exists: false } },
                        { mirrorActivityId: { $eq: null } }
                    ]}
                ];
                if( Object.keys(andClause).length ){
                    andArray.push( andClause );
                }

                partnerQueries.push( { partner: el, query: { $and: andArray } } );
            } );

            let query = orClause.length ? {
                $and: [
                    patientId ? patientIdFilter : timeRange,
                    { $or: [
                        { mirrorActivityId: { $exists: false } },
                        { mirrorActivityId: { $eq: null } }
                    ]},
                    { $or: [ ...orClause ] }
                ]
            } : null;
            return { query, partnerQueries };
        }

        /**
         * @method prepareActivityQuery
         * @public
         *
         * returns prepared comulative query and array of partners with exact query per partner
         *
         * @param {Object} user
         * @param {Object} originalParams.dates                - { startDate,  endDate } interval for getting activities
         * @param {Array} originalParams.selectedPartners      - array of _id of selected on UI partners
         * @param {Boolean} originalParams.useCache            - use transferCache. NOTE: transfer cache is not track to which partner is transfered
         *
         * @returns {Object}    - contain arrays of activity counts per date format prepared for TimeLine widget,
         *                        also array include object countsByPartner with array of partners
         */
        async function getActivityCounts( args ){
            Y.log('Entering Y.doccirrus.api.activityTransfer.getActivityCounts', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.getActivityCounts');
            }
            const  {user, originalParams: data, callback } = args;
            let err, result;
            [err, result] = await formatPromiseResult(
                prepareActivityQuery( user, data.dates, data.selectedPartners, data.patientId )
            );
            if( err ) {
                Y.log( `getActivityCounts: Error on preparing query : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            let { query, partnerQueries = [] } = result;

            if( !partnerQueries.length ){
                return callback(null, []);
            }

            let countsByPartner = [];
            for(let partnerObj of partnerQueries){
                let
                    activityCount,
                    pipeline = [ {$match: partnerObj.query} ];
                if( data.useCache ){
                    pipeline = [...pipeline, {$lookup:
                            {
                                from: "transfercaches",
                                localField: "_id",
                                foreignField: "activityId",
                                as: "cached"
                            }},
                        { $match: { "cached": { $eq: [] } } }
                    ];
                }
                pipeline = [...pipeline, {$count: 'cnt'} ];
                [err, activityCount] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'aggregate',
                        pipeline
                    } )
                );
                if( err ) {
                    Y.log( `getActivityCounts: Error getting count of activities for partner ${partnerObj.partner._id} : ${err.stack || err}`, 'error', NAME );
                }

                if( partnerObj.partner._id ){
                    countsByPartner = [...countsByPartner, {
                        _id: partnerObj.partner._id,
                        name: partnerObj.partner.doc.name,
                        partnerType: partnerObj.partner.doc.partnerType,
                        comment: partnerObj.partner.doc.comment,
                        activityCount: activityCount.result && activityCount.result.length && activityCount.result[0].cnt || 0,
                        activeActive: partnerObj.partner.doc.activeActive || false
                    } ];
                }
            }

            if( !data.selectedPartners && !data.selectedPartners.length || !query ){
                return callback( null, [ { countsByPartner } ]);
            }

            let pipeline = [ {$match: query} ];
            if( data.useCache ){
                pipeline = [...pipeline, {$lookup:
                    {
                        from: "transfercaches",
                        localField: "_id",
                        foreignField: "activityId",
                        as: "cached"
                    }},
                    { $match: { "cached": { $eq: [] } } }
                ];
            }
            pipeline = [...pipeline, {$project: {
                        year : {$year :  "$timestamp"},
                        month : {$month : "$timestamp"},
                        week: {$week : "$timestamp"},
                        day : {$dayOfMonth :  "$timestamp"}
                    }},
                {$project: {
                        dateNormal: { $dateFromParts : { year: "$year", month: "$month", day: "$day" } },
                        dateYearMonth: {"$concat" : [ {"$substr" : ["$year", 0, 4]}, "-", {"$substr" : ["$month", 0, 2]} ]},
                        dateYearWeek: {"$concat" : [ {"$substr" : ["$year", 0, 4]}, "-", {"$substr" : ["$week", 0, 2]} ]}
                    }},
                ...data.pipeline
            ];

            let dateResults;
            [err, dateResults] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'aggregate',
                    pipeline
                } )
            );
            if( err ) {
                Y.log( `getActivityCounts: Error aggregating activities : ${err.stack || err}`, 'error', NAME );
            }

            dateResults.result = [...dateResults.result, { countsByPartner } ];
            callback( err, dateResults );
        }

        /**
         * @method processPartner
         * @private
         *
         * create payloads and transfer it for particular partner
         *
         * @param {Object} user
         * @param {Object} activityQuery        query to collect activities
         * @param {Object} partner              entry of partners collection for particular partner
         * @param {Number} processed            count of already transfered activities
         * @param {Boolean} useCache            do not reprocess already transfered and cached activities (NOTE: not sensitive for partner)
         *                                      TODO: extend cache logic to be count on activityID and partnerId
         *
         * @returns {Promise}                   increase processed count
         */
        async function processPartner( user, activityQuery, partner, processed, useCache = false ){

            Y.log( `processPartner: ${JSON.stringify(partner)} cacheUsed: ${useCache}`, 'debug', NAME );
            Y.log( `processPartner: activity query ${JSON.stringify(activityQuery)}`, 'debug', NAME );

            const madeTransferFn = (activityId, partner) => {
                return new Promise( (resolve, reject) => {
                    Y.doccirrus.api.activityTransfer.transfer( {
                        user,
                        data: {
                            activityIds: [activityId],
                            automaticTransfer: true,
                            manuallyTriggered: true, //TODO change this if in case of error pushed new syndispatch
                            partners: [partner]
                        },
                        callback: ( err ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve();
                        }
                    } );
                } );
            };

            let err, activityModel;
            [err, activityModel] = await formatPromiseResult(
                getModel( user, 'activity', true )
            );
            if( err ) {
                Y.log( `reSynchronizeTransfer: Error on getting activity model : ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            let cursor = activityModel.mongoose.find( activityQuery, {
                _id: 1,
                actType: 1,
                status: 1,
                timestamp: 1
            }, {sort: {timestamp: 1}} ).cursor( ).addCursorFlag( 'noCursorTimeout', true );

            let activity;
            while( activity = await cursor.next() ) { // eslint-disable-line no-cond-assign
                Y.log( `processPartner: activity data ${JSON.stringify( activity )}`, 'debug', NAME );

                if(useCache){
                    let cacheHit;
                    [err, cacheHit] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'count',
                            model: 'transfercache',
                            query: {
                                activityId: activity._id
                            }
                        } )
                    );
                    if( err ){
                        Y.log( `processPartner: Error on check cached transfers: ${err.stack || err}`, 'error', NAME );
                    }
                    if( cacheHit > 0){
                        Y.log( `processPartner: already processed, skip`, 'debug', NAME );
                        continue;
                    }
                }

                processed++;
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'reSynchronizationReportProgress',
                    msg: {data: {processed}}
                } );

                if( !partner.activeActive ){
                    //delete this activity from syncdispatch if any only for activePasive mode
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'delete',
                            model: 'syncdispatch',
                            query: {
                                entityName: 'activity',
                                entryId: activity._id.toString()
                            },
                            options: {
                                override: true
                            }
                        } )
                    );
                }

                if( err) {
                    Y.log( `processPartner: Error on cleanup syncdispatch : ${err.stack || err}`, 'error', NAME );
                }

                [err] = await formatPromiseResult(
                    madeTransferFn(activity._id, partner)
                );

                if( err && err.validationResult ) {
                    Y.log( `End of synchronization ${activity._id} finished with  validation error: ${JSON.stringify(err.validationResult)}`, 'warn', NAME );
                } else if( err ) {
                    Y.log( `End of synchronization ${activity._id} finished with error: ${err.stack || err}`, 'error', NAME );
                } else {
                    Y.log( `End of synchronization succeed`, 'debug', NAME );
                }
            }
            return processed;
        }

        /**
         * @method processCalendarPartner
         * @private
         *
         * collect calendar related collections and transfer it to partner in activeActive mode
         *
         * @param {Object} user
         * @param {Object} activityQuery        query to collect activities
         * @param {Object} partner              entry of partners collection for particular partner
         *
         * @returns {Promise}                   increase processed count
         */
        async function processCalendarPartner( user, activityQuery, partner ){

            Y.log( `processCalendarPartner: ${JSON.stringify(partner)}`, 'debug', NAME );

            let intervalQuery = activityQuery && activityQuery.$and.find( el => el.timestamp );
            Y.log( `processCalendarPartner: interval query ${JSON.stringify(intervalQuery)}`, 'debug', NAME );

            //get schedules
            let [err, schedules] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'schedule',
                    query: {
                        start: {$gte: intervalQuery.timestamp.$gt},
                        end: {$lte: intervalQuery.timestamp.$lte}
                    }
                } )
            );
            if( err ) {
                Y.log( `processCalendarPartner: Error getting schedules for interval : ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( !schedules || !schedules.length){
                Y.log( `processCalendarPartner: schedules not found in interval : ${intervalQuery.timestamp}, do nothing`, 'info', NAME );
                return;
            }

            let masterSchedulesIds = schedules.map( el => el.linkSeries ).filter( el => el );
            if( masterSchedulesIds.length ){
                let masterSchedules;
                [err, masterSchedules] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'schedule',
                        query: {
                            _id: {$in: masterSchedulesIds}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `processCalendarPartner: Error getting schedules for interval : ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                if(masterSchedules && masterSchedules.length){
                    schedules = [...schedules, ...masterSchedules];
                }
            }

            let patientIds = schedules.map( el => el.patient ).filter( el => el ),
                calendarIds = schedules.map( el => el.calendar ).filter( el => el ),
                scheduletypeIds = schedules.map( el => el.scheduletype ).filter( el => el );

            let patients;
            if( patientIds.length ){
                [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'patient',
                        query: {
                            _id: {$in: patientIds}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `processCalendarPartner: Error getting patients for schedules : ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

            }

            let calendars;
            if( calendarIds.length ){
                [err, calendars] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'calendar',
                        query: {
                            _id: {$in: calendarIds}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `processCalendarPartner: Error getting calendars for schedules : ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

            }

            let scheduletypes;
            if( scheduletypeIds.length ){
                [err, scheduletypes] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'scheduletype',
                        query: {
                            _id: {$in: scheduletypeIds}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `processCalendarPartner: Error getting scheduletypes for schedules : ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

            }

            let locationIds = calendars.map( el => el.locationId ).filter( el => el ),
                employeeIds = calendars.map( el => el.employee ).filter( el => el );

            let locations;
            if( locationIds.length ){
                [err, locations] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'location',
                        query: {
                            _id: {$in: locationIds}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `processCalendarPartner: Error getting locations for calendars : ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

            }

            let employees;
            if( employeeIds.length ){
                [err, employees] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'employee',
                        query: {
                            _id: {$in: employeeIds}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `processCalendarPartner: Error getting employees for schedules : ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

            }

            //synchronizing collected data
            for( let doc of (locations || []) ){
                [err] = await formatPromiseResult(
                    syncObj( user, 'location', doc._id.toString(), doc.lastChanged)
                );
                if( err ){
                    Y.log(`processCalendarPartner: Error processing location re-sync calendars ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
            }

            for( let doc of (employees || []) ){
                [err] = await formatPromiseResult(
                    syncObj( user, 'employee', doc._id.toString(), doc.lastChanged)
                );
                if( err ){
                    Y.log(`processCalendarPartner: Error processing employee re-sync calendars ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
            }

            for( let doc of (scheduletypes || []) ){
                [err] = await formatPromiseResult(
                    syncObj( user, 'scheduletype', doc._id.toString(), doc.lastChanged)
                );
                if( err ){
                    Y.log(`processCalendarPartner: Error processing scheduletypes re-sync calendars ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
            }

            for( let doc of (patients || []) ){
                [err] = await formatPromiseResult(
                    syncObj( user, 'patient', doc._id.toString(), doc.lastChanged)
                );
                if( err ){
                    Y.log(`processCalendarPartner: Error processing patients re-sync calendars ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
            }

            for( let doc of (calendars || []) ){
                [err] = await formatPromiseResult(
                    syncObj( user, 'calendar', doc._id.toString(), doc.lastChanged)
                );
                if( err ){
                    Y.log(`processCalendarPartner: Error processing calendars re-sync calendars ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
            }

            for( let doc of (schedules || []) ){
                [err] = await formatPromiseResult(
                    syncObj( user, 'schedule', doc._id.toString(), doc.lastChanged)
                );
                if( err ){
                    Y.log(`processCalendarPartner: Error processing calendars re-sync schedules ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
            }

            Y.log(`processCalendarPartner: Finished sync calendars l:${locations.length}, e:${employees.length}, p:${patients.length}, st:${scheduletypes.length}, s:${schedules.length}, c:${calendars.length}`, 'info', NAME );
        }

        /**
         *  Send activities in a dare range to partners
         *
         *  Note that this will be run on the master tenant, to prevent complications of passing large payloads over
         *  IPC to the sockets.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.dates   Used to make activity query
         *  @param  {Function}  args.callback
         *  @return {Promise<void>}
         */

        async function reSynchronizeTransfer( args ){
            Y.log('Entering Y.doccirrus.api.activityTransfer.reSynchronizeTransfer', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.reSynchronizeTransfer');
            }

            const
                {user, originalParams: data, callback } = args;

            if(!data.selectedPartners || !data.selectedPartners.length){
                return callback( Y.doccirrus.errors.rest( 404, 'No partners selected', true ) );
            }

            //  run on master to avoid issues with passing large payloads around
            if ( !Y.doccirrus.ipc.isMaster() ) {
                Y.log( 'IPC indirect reSynchronizeTransfer to master.', 'info', NAME );
                data.tenantId = args.user.tenantId;
                Y.doccirrus.ipc.sendAsync( IPC_REQUEST_RESYNCHRONIZE, data, callback );
                return;
            }

            //  returns immediately, updates will be sent to client by WS events
            callback( null );                                               //  eslint-disable-line callback-return

            //TODO: EXTMOJ-1930 !!must!! limit amount of activities per one processing

            let err, result;
            [err, result] = await formatPromiseResult(
                prepareActivityQuery( user, data.dates, data.selectedPartners, data.patientId )
            );
            if( err ) {
                Y.log( `reSynchronizeTransfer: Error on preparing query : ${err.stack || err}`, 'error', NAME );
                //callback is already called
                return;
            }
            let { partnerQueries } = result;

            let processed = 0;
            for(let partnerData of partnerQueries){
                if( !data.selectedPartners.includes(partnerData.partner._id.toString()) ){
                    continue;
                }
                [ err, processed ] = await formatPromiseResult(
                    processPartner( user, partnerData.query, partnerData.partner.doc, processed, data.useCache )
                );
                if( err ){
                    Y.log( `reSynchronizeTransfer: Error on processing partner: ${err.stack || err}`, 'error', NAME );
                }

                if( partnerData.partner.doc && partnerData.partner.doc.activeActive === true ){
                    [ err ] = await formatPromiseResult(
                        processCalendarPartner( user, partnerData.query, partnerData.partner.doc )
                    );
                    if( err ){
                        Y.log( `reSynchronizeTransfer: Error on processing partner calendars: ${err.stack || err}`, 'error', NAME );
                    }
                }
            }
            Y.log( `reSynchronizeTransfer: End of processing: ${processed} done`, 'debug', NAME );
            Y.doccirrus.communication.emitEventForSession( {
                sessionId: user.sessionId,
                event: 'reSynchronizationReportDone',
                msg: {data: {}}
            } );

        }

        /**
         * @method getPendingActivities
         * @public
         *
         * returns activities that will be reTransfered
         *
         * @param {Object} user
         * @param {Object} originalParams.dates                - { startDate,  endDate } interval for getting activities
         * @param {Array} originalParams.selectedPartners      - array of _id of selected on UI partners
         * @param {Boolean} originalParams.useCache            - use transferCache
         *
         * @returns {Object}    - contain arrays of activities. NOTE added extra linkedActivities array for each activity
         */
        async function getPendingActivities( args ){
            Y.log('Entering Y.doccirrus.api.activityTransfer.getPendingActivities', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activityTransfer.getPendingActivities');
            }

            const
                {user, originalParams: data, options, callback } = args;

            let err, result ;
            [err, result] = await formatPromiseResult(
                prepareActivityQuery( user, data.dates, data.selectedPartners, data.patientId )
            );
            if( err ) {
                Y.log( `getPendingActivities: Error on preparing query : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let { query } = result;
            if( !query ){
                return callback( null, [] );
            }

            let pipeline = [ {$match: query} ];
            if( data.useCache ){
                pipeline = [...pipeline, {$lookup:
                        {
                            from: "transfercaches",
                            localField: "_id",
                            foreignField: "activityId",
                            as: "cached"
                        }},
                    { $match: { "cached": { $eq: [] } } }
                ];
            }
            let activities;
            [err, activities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'aggregate',
                    pipeline,
                    options
                } )
            );
            if( err ) {
                Y.log( `getPendingActivities: Error on getting activities : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !activities.result || !activities.result.length ){
                return callback( null, activities );
            }

            let casefolderIds = activities.result.map( el => el.caseFolderId ), casefolders;
            if( casefolderIds.length ){
                [err, casefolders] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'casefolder',
                        query: {_id: {$in: casefolderIds} },
                        options: { select: { title: 1 } }
                    } )
                );
                if( err ) {
                    Y.log( `getPendingActivities: Error on getting activities : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

            }
            activities.result.forEach( el => {
                let casefolder = (casefolders || []).find( cf => cf._id.toString() === el.caseFolderId );
                if( casefolder ){
                    el.caseFolderTitle = casefolder.title;
                }
                let linkedActivities = Y.doccirrus.api.linkedactivities.getAllReferences( el );
                linkedActivities = (linkedActivities || []).filter( linkedId => linkedId.toString() !== el._id.toString() );
                el.linkedActivities = linkedActivities;
            } );

            callback( null, activities );
        }

        /**
         * @method anonimyzePatient
         * @public
         *
         * in case parter has set to anonymize patient data - remove/change data and keep unchanged only fields that is listed
         * in partner.anonymizeKeepFields
         *
         * @param {Object} user
         * @param {Object} partner                - partner record
         * @param {Object} patient                - original patient record
         * @param {Boolean} external              - for external contains systemType to send to (DOQUVIDE|DQS)
         *
         * @returns {Object}                      - anonymized patient data
         */
        function anonimyzePatient( user, partner, patient, external ) {
            function partnerIdExists( patient, partnerId ) {
                if( !patient.partnerIds || !Array.isArray( patient.partnerIds ) ) {
                    return false;
                }
                let patientIdPartner = patient.partnerIds.filter( function( p ) {
                    return ( typeof p.isDisabled !== 'undefined' ) ? p.partnerId === partnerId && !p.isDisabled : p.partnerId === partnerId;
                } );
                return !!patientIdPartner.length;
            }

            let
                CARDIO = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                isCARDIO = patient && partnerIdExists( patient, CARDIO ),
                DOQUVIDE = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                DOQUVIDElicense = Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ),
                DQS = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                DQSlicense = Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DQS ),
                pcnt = JSON.parse(JSON.stringify(patient)),
                anonymizeKeepFields = partner.anonymizeKeepFields || [];

            if( partner && partner.pseudonym && partner.pseudonym.length){
                let
                    partnerPseudonym = partner.pseudonym[0],
                    partnerElement;
                if( partnerPseudonym.pseudonymType === 'patientData' ){
                    pcnt.pseudonym = pcnt._id.toString();
                } else if( partnerPseudonym.pseudonymType === 'careData' ){
                    let partnerIdName = (partnerPseudonym.pseudonymIdentifier || '').replace( 'ID', '' ).toUpperCase();
                    partnerElement = (pcnt.partnerIds || []).find( el => el.partnerId === partnerIdName );
                    if( partnerElement ){
                        pcnt.pseudonym = partnerElement.patientId;
                    }
                } else {
                    partnerElement = (pcnt.partnerIds || []).find( el => el.extra === partnerPseudonym.pseudonymIdentifier );
                    if( partnerElement ){
                        pcnt.pseudonym = partnerElement.patientId;
                    }
                }
            } else if( external ){
                let carePartnerElement = (pcnt.partnerIds || []).find( el => el.partnerId === external );
                if( carePartnerElement ){
                    pcnt.pseudonym = carePartnerElement.patientId;
                }
            }

            let name;
            for( name of ['title', 'firstname', 'lastname', 'nameaffix', 'middlename','fk3120']) {
                if(anonymizeKeepFields.includes(name)){
                    continue;
                }
                pcnt[name] = 'xxx';
            }

            if( !anonymizeKeepFields.includes( 'localPracticeId' ) ){
                pcnt.localPracticeId = '';
            }

            if( !anonymizeKeepFields.includes( 'gender' ) ){
                pcnt.gender = 'UNKNOWN';
            }

            if( !anonymizeKeepFields.includes( 'dob' ) ){
                pcnt.dob = 0;
            }


            if( !anonymizeKeepFields.includes( 'talk' ) ){
                pcnt.talk = 'MS';
            }
            if( !anonymizeKeepFields.includes( 'careDegree' ) ){
                pcnt.careDegree = 'NO';
            }
            if( anonymizeKeepFields.includes( 'addresses' ) ){
                pcnt.addresses = (pcnt.addresses || []).map( address => ({
                    zip: address.zip,
                    city: ' ',
                    kind: address.kind,
                    postbox: ' ',
                    country: ' ',
                    countryCode: ' '
                }) );
            } else {
                pcnt.addresses = [];
            }

            for( name of ['insuranceStatus','accessPRC','lang','jobTitle','isPensioner','images','patientPortal','patientSince',
                    'patientNo','nextAppointment','familyDoctor','edmpTypes','edmpCaseNo','edmpParticipationChronicHeartFailure','cardioHeartFailure',
                    'cardioCryptogenicStroke','cardioCHD','latestMedData','dataTransmissionToPVSApproved', 'treatmentNeeds']) {
                if(anonymizeKeepFields.includes(name)){
                    continue;
                }
                delete pcnt[name];
            }

            //fields removed unquestionably
            pcnt.attachedSeverity = 'NONE';
            pcnt.sendPatientReceipt = false; //default value of schema
            pcnt.crmCatalogShort = '';
            pcnt.activeCaseFolderId = '';
            pcnt.dob_MM = '00';
            pcnt.dob_DD = '00';
            pcnt.kbvDob = '00.00.0000';

            if( external ){
                pcnt.partnerIds = (pcnt.partnerIds || []).filter( ( item ) => DOQUVIDE === item.partnerId || DQS === item.partnerId ).map( ( item ) => {
                    if( DOQUVIDE === item.partnerId && (!isCARDIO || !DOQUVIDElicense) ) {
                        item.isDisabled = true;
                    }
                    if( DQS === item.partnerId && (!isCARDIO || !DQSlicense) ) {
                        item.isDisabled = true;
                    }
                    return item;
                } );
            } else {
                pcnt.partnerIds = [];
            }

            for( name of ['markers','communications','accounts','relType','relByLaw','affiliate','pin','generatedAt','mirrorPatientId','affiliates','comment',
                'workingAt','preferLanguage','workingAtRef','primaryDoc','physicians','alternativeId','socialInsuranceNumber','partner_extra',
                'insuranceNotes','patientNumber','noShowCount','attachedActivity','attachedContent','patientTransfer','importId','crmTags','crmTreatments',
                'crmAppointmentRangeStart','crmAppointmentRangeEnd','crmAppointmentMonth','crmAppointmentQuarter','crmAppointmentYear','crmComment','crmReminder',
                'generatedAt','crmReminderCalRef','institution']) {
                delete pcnt[name];
            }

            return pcnt;
        }

        /**
         *  Set up IPC listeners, intiializer registered in dcdb.server.js
         *
         *  @param  {Function}  callback
         */

        function runOnStart( callback ) {
            if ( !Y.doccirrus.ipc.isMaster() ) {
                return callback( null );
            }

            //  listen for request to transfer activites
            Y.doccirrus.ipc.subscribeNamed( IPC_REQUEST_TRANSFER, NAME, true, onWorkerRequestTransferToPartner );

            function onWorkerRequestTransferToPartner( data, callback ) {
                Y.log( `Received IPC ${IPC_REQUEST_TRANSFER} on ${Y.doccirrus.ipc.whoAmI()}.`, 'debug', NAME );
                transfer( {
                    user: Y.doccirrus.auth.getSUForTenant( data.tenantId ),
                    data: data,
                    callback: callback
                } );
            }

            //  listen for requests to resynchronize a set of activities in a time range
            Y.doccirrus.ipc.subscribeNamed( IPC_REQUEST_RESYNCHRONIZE, NAME, true, onWorkerRequestResynchronize );

            function onWorkerRequestResynchronize( data, callback ) {
                Y.log( `Received IPC ${IPC_REQUEST_RESYNCHRONIZE} on ${Y.doccirrus.ipc.whoAmI()}.`, 'debug', NAME );
                reSynchronizeTransfer( {
                    user: Y.doccirrus.auth.getSUForTenant( data.tenantId ),
                    originalParams: data,
                    callback: callback
                } );
            }

            //  return to startup process
            if ( !callback ) { return; }
            callback( null );
        }

        /**
         * @method getTransferStats
         * @public
         *
         * get state statistics of receivedispatch collection
         *
         * @param {Object} user
         * @param {Function} callback
         *
         * @returns {Object}  - grouped by dcCustomerNo states of receivedispatches
         */
        async function getTransferStats( args ) {
            Y.log( 'Entering Y.doccirrus.api.activityTransfer.getTransferStats', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activityTransfer.getTransferStats' );
            }

            const
                {user, callback} = args;

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'receivedispatch',
                action: 'aggregate',
                pipeline: [
                    {$group: {
                        _id: {dcCustomerNo:'$dcCustomerNo', status:'$status'},
                        minNo: {$min: '$sequenceNo' },
                        maxNo: {$max:'$sequenceNo'},
                        count: {$sum: 1}}
                    },
                    {$group: {_id: {dcCustomerNo: '$_id.dcCustomerNo'},
                            states: {$push: '$$ROOT'}}
                    },
                    {$sort: {'_id.dcCustomerNo': 1, 'states._id.status': 1}}
                ]
            }, callback );
        }

        /*
         *  Expose API
         */

        Y.namespace( 'doccirrus.api' ).activityTransfer = {

            name: NAME,

            runOnStart,

            transfer,
            receive,
            receiveActive,
            receiveActiveFailure,
            receiveActiveRepeatSend,
            receiveGridFile,
            receiveGridFileChunk,
            receiveGridFileEnd,
            createOrUpdatePatient,
            getFsFiles,
            getFsChunks,
            createPayload,
            getActivityCounts,
            reSynchronizeTransfer,
            getPendingActivities,
            getPatientVersion,
            anonimyzePatient,
            callExternalApiByCustomerNo,
            transferGridFsFileToPartner,
            getTransferStats,
            createTransferLogEntryOrAutomatic,
            matchPatient
        };
    },
    '0.0.1', { requires: ['dccommunication', 'dcauth', 'dcipc', 'person-schema', 'activitytransfer-api', 'linkedactivities-api'] }
);
