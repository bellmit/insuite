/**
 * User: do
 * Date: 09/09/16  19:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'edmpdelivery-api', function( Y, NAME ) {
        const
            flatten = require( 'lodash' ).flatten,
            uniq = require( 'lodash' ).uniq,
            getTmpDir = Y.doccirrus.tempFileManager.get,
            moment = require( 'moment' ),
            Promise = require( 'bluebird' ),
            joinPath = require( 'path' ).join,
            mkdirp = Promise.promisify( require( 'mkdirp' ) ),
            writeFile = Promise.promisify( require( 'fs' ).writeFile ),
            readAndWriteFile = Y.doccirrus.edmputils.readAndWriteFile,
            writeBackupdatedCaseNo = Y.doccirrus.edmputils.writeBackupdatedCaseNo,
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            getModel = Promise.promisify( Y.doccirrus.mongodb.getModel ),
            updateActivity = Y.doccirrus.edmputils.updateActivity,
            updateActivities = Y.doccirrus.edmputils.updateActivities,
            getArchivePathByActType = Y.doccirrus.edocutils.getArchivePathByActType,
            createArchiveName = Y.doccirrus.edmputils.createArchiveName,
            createForm = Promise.promisify( Y.doccirrus.edmputils.createForm ),
            makeZip = Y.doccirrus.edmputils.makeZip,
            createEvlFromArchive = Y.doccirrus.edocutils.createEvlFromArchive,
            eDocActTypes = Y.doccirrus.schemas.activity.eDocActTypes,
            eDmpActTypes = Y.doccirrus.schemas.activity.eDmpActTypes,
            isEdmp = Y.doccirrus.schemas.activity.isEdmp,
            isEhks = Y.doccirrus.schemas.activity.isEhks,
            ObjectID = require( 'mongodb' ).ObjectID,
            createEdmpDeliveryBaseData = Y.doccirrus.edmpcommonutils.createEdmpDeliveryBaseData,
            createFileWriter = Y.doccirrus.edocFileWriter.createFileWriter,
            buildIndexFile = Y.doccirrus.edmpFileBuilder.buildIndexFile,
            calculateFollowUpEdmpHeadDate = Y.doccirrus.edmpcommonutils.calculateFollowUpEdmpHeadDate,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            libxml = require( 'libxmljs' ),

            addresseeActivityIdMappingPipeline = [
                {
                    $match: {
                        dmpAddressee: {$ne: null},
                        dmpDeliveryRef: {$eq: null},
                        actType: {$in: eDocActTypes},
                        status: 'APPROVED',
                        mirrorActivityId: null  // MOJ-10890: ignore transfer case folders; easier than explicitly
                                                // exclude all eDMP case folders until $lookup works with strings
                    }
                },
                {
                    $group: {
                        _id: {dmpAddressee: "$dmpAddressee", locationId: "$locationId", dmpYear: "$dmpYear", dmpQuarter: "$dmpQuarter"},
                        dmpDeliveryInfo: {$last: "$dmpDeliveryInfo"},
                        activityIds: {$push: "$_id"},
                        actType:  {$last: "$actType"}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        dmpAddressee: "$_id.dmpAddressee",
                        locationId: "$_id.locationId",
                        dmpYear: "$_id.dmpYear",
                        dmpDeliveryInfo: 1,
                        activityIds: 1,
                        dmpQuarter: "$_id.dmpQuarter",
                        actType: 1
                    }
                }
            ];

        function createFollowingDocsFromSentDelivery( user, deliveryId ) {
            var today = new Date();

            return Promise.resolve().then( () => {
                if( !deliveryId ) {
                    throw Error( 'insufficient arguments' );
                }

                return runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        dmpDeliveryRef: deliveryId,
                        actType: {$in: eDmpActTypes}, // create only for eDMP
                        status: 'SENT',
                        dmpDocVersion: 1
                    },
                    options: {
                        lean: true,
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
            } ).each( doc => {

                // calculate the follow-up edmp-date from the last-document's edmp documentation interval
                const dmpHeadDateMoment = calculateFollowUpEdmpHeadDate( doc , true );

                return Y.doccirrus.edmputils.createFollowingDocumentation( user, {
                    dmpQuarter: dmpHeadDateMoment.quarter(),
                    dmpYear: dmpHeadDateMoment.year(),
                    timestamp: today,
                    dmpHeadDate: dmpHeadDateMoment.toDate(),
                    dmpDocumentationInterval: doc.dmpDocumentationInterval,
                    caseFolderId: doc.caseFolderId,
                    employeeId: doc.employeeId,
                    locationId: doc.locationId,
                    patientId: doc.patientId,
                    actType: doc.actType,
                    dmpNeedsMergeAcknowledgment: true
                } );

            } );
        }

        function getEditor( user ) {
            return user ? [{name: user.U, employeeNo: ''}] : undefined;
        }

        function updateDelivery( user, deliveryId, data, options ) {
            options = options || {};
            return getModel( user, 'edmpdelivery', true ).then( edmpdeliveryModel => {
                return new Promise( function( resolve, reject ) {
                    edmpdeliveryModel.mongoose.update( {
                        _id: deliveryId
                    }, data, options, ( err, result ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( result );
                    } );
                } );
            } );
        }

        function getAddresseeActivityIdMapping( user ) {
            return getModel( user, 'activity', true ).then( activityModel => {
                return new Promise( ( resolve, reject ) => {
                    activityModel.mongoose.aggregate( addresseeActivityIdMappingPipeline, function( err, results ) {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( results );
                        }
                    } );
                } );
            } );
        }

        function setEdmpDeliveryDocCount( user, deliveryId ) {

            return runDb( {
                user: user,
                model: 'activity',
                action: 'count',
                query: {
                    dmpDeliveryRef: deliveryId
                }
            } ).then( count => {
                return updateDelivery( user, deliveryId, {
                    nDocs: count,
                    lastUpdate: new Date(),
                    editor: getEditor( user )
                } );
            } );

        }

        function addToDelivery( user, deliveryId, activityIds ) {
            return updateActivity( user, {$in: activityIds}, {dmpDeliveryRef: deliveryId}, {multi: true} ).then( () => {
                return setEdmpDeliveryDocCount( user, deliveryId );
            } );
        }

        function getLocationData( user, id ) {
            return runDb( {
                user: user,
                model: 'location',
                query: {
                    _id: id
                },
                options: {
                    select: {
                        locname: 1,
                        commercialNo: 1,
                        institutionCode: 1,
                        kv: 1
                    },
                    lean: true
                }
            } ).get( 0 );
        }

        function createDelivery( args ) {
            const {user, addresseeObj, locationId, year, quarter, actType} = args;

            return getLocationData( user, locationId ).then( locationData => {
                if( !locationData ) {
                    throw Error( `eDMP: could not get location data to refine edmp delivery` );
                }

                return runDb( {
                    user: user,
                    action: 'post',
                    model: 'edmpdelivery',
                    data: createEdmpDeliveryBaseData( {
                        lastUpdate: new Date(),
                        locationId: locationId,
                        locname: locationData.locname,
                        commercialNo: locationData.commercialNo,
                        institutionCode: locationData.institutionCode,
                        addressee: addresseeObj.kv_connect,
                        addresseeId: addresseeObj._id,
                        addresseeCollection: addresseeObj.catalogUsage ? 'catalogusage' : 'catalog',
                        kv: locationData.kv,
                        addresseeIk: addresseeObj.orgianizationId || addresseeObj.ukv,
                        addresseeName: addresseeObj.orgianizationName,
                        addresseeKv: addresseeObj.kv,
                        editor: getEditor( user ),
                        year: actType === "QDOCU" && year ? year : null,
                        quarter: actType === "QDOCU" && quarter ? quarter : null,
                        skipcheck_: true
                    } )
                } );
            } );
        }

        function createOrUseDelivery( user, mapping ) {

            if( 0 === mapping.activityIds.length ) {
                return;
            }

            let dmpDeliveryInfo = mapping.dmpDeliveryInfo,
                dmpAddressee = mapping.dmpAddressee,
                locationId = mapping.locationId,
                activityIds = mapping.activityIds,
                year = mapping.dmpYear,
                quarter = mapping.dmpQuarter,
                actType = mapping.actType,
                addresseeObj = dmpDeliveryInfo.addressees.find( addresseeObj => {
                    return addresseeObj.orgianizationId === dmpAddressee || addresseeObj.ukv === dmpAddressee;
                } );

            let query = {
                addresseeIk: mapping.dmpAddressee,
                locationId: mapping.locationId,
                edmpDeliveryStatus: 'OPEN'
            };

            if( actType === "QDOCU" ) {
                query.year = mapping.dmpYear;
                query.quarter = mapping.dmpQuarter;
            }

            return runDb( {
                user: user,
                model: 'edmpdelivery',
                query: query,
                options: {
                    limit: 1,
                    select: {_id: 1}
                }
            } ).then( deliveries => {
                if( deliveries && deliveries[0] ) {
                    return addToDelivery( user, deliveries[0]._id.toString(), activityIds );
                }
                return createDelivery( {user, addresseeObj, locationId, year, quarter, actType} ).then( deliveryId => {
                    deliveryId = deliveryId[0];
                    if( !deliveryId ) {
                        throw Error( 'no edmpdelivery was created' );
                    }
                    return addToDelivery( user, deliveryId, activityIds );
                } );
            } );

        }

        function createDeliveries( args ) {
            Y.log('Entering Y.doccirrus.api.edmpdelivery.createDeliveries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmpdelivery.createDeliveries');
            }
            const
                user = args.user,
                callback = args.callback;

            getAddresseeActivityIdMapping( user )
                .each( mapping => {
                    return createOrUseDelivery( user, mapping );
                } )
                .then( ( results ) => {
                    callback( null, results );
                } )
                .catch( err => {
                    Y.log( `could not create delivery: ${err && err.stack || err}`, 'error', NAME );
                    callback( err );
                } );

        }

        function removeDocsFromDelivery( args ) {
            Y.log('Entering Y.doccirrus.api.edmpdelivery.removeDocsFromDelivery', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmpdelivery.removeDocsFromDelivery');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;
            if( !params.docIds || !params.deliveryId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            let docIds = params.docIds.map( id => (new ObjectID( id )) );
            // TODOOO also only update acts with dmpDeliveryRef === params.deliveryId => needs changes in updateActivity
            return updateActivity( user, {$in: docIds}, {dmpDeliveryRef: null}, {multi: true} )
                .then( () => {
                    return setEdmpDeliveryDocCount( user, params.deliveryId );
                } )
                .then( () => callback() )
                .catch( err => {
                    Y.log( `could not remove docs from delivery: ${err}`, 'error', NAME );
                    callback( err );
                } );
        }

        function getDeliveryDocIds( user, deliveryId ) {
            return runDb( {
                user: user,
                model: 'activity',
                query: {
                    dmpDeliveryRef: deliveryId
                },
                options: {
                    lean: true,
                    select: {_id: 1}
                }
            } ).map( function( doc ) {
                return doc._id;
            } );
        }

        function getFile( user, id ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.gridfs.get( user, id, ( err, result ) => {
                    if( err ) {
                        reject( err );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        function encryptZip( actType, path, tmpPath ) {
            let xkmMode;
            switch( actType ) {
                case 'DM1':
                case 'DM2':
                case 'BK':
                case 'KHK':
                case 'ASTHMA':
                case 'COPD':
                    xkmMode = 'DMP_Verschluesselung';
                    break;
                case 'EHKSD':
                case 'EHKSND':
                    xkmMode = 'EHKS_Verschluesselung';
                    break;
                case 'HGV':
                    xkmMode = `QSHGV_Verschluesselung`;
                    break;
                case 'HGVK':
                    xkmMode = `QSHGVK_Verschluesselung`;
                    break;
                default:
                    throw Error( `could not find xkm mode for actType ${actType}` );
            }
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.xkm.encryptFile( path, tmpPath, xkmMode, ( err, result ) => {
                    if( err ) {
                        reject( err );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        function getPatient( user, patientId ) {
            return runDb( {
                user: user,
                model: 'patient',
                query: {
                    _id: patientId
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ).get( 0 );
        }

        // patient.edmpCaseNo must be changeable until doc is sent (in our case packed or activity.dmpDeliveryRef exists
        // here we check if data has changed and adjust xml doc if necessary
        function handleChangedEdmpCaseNo( user, activity, file ) {
            const
                Iconv = require( 'iconv' ).Iconv,
                iconvIsoToUtf8 = new Iconv( 'iso-8859-15//TRANSLIT//IGNORE', 'utf-8' );

            function replace( edmpCaseNo ) {

                const
                    buff = file && file.data;

                if( !buff ) {
                    throw Error( 'no file buffer' );
                }

                let xmlStr = iconvIsoToUtf8.convert( buff ).toString();

                if( !xmlStr ) {
                    throw Error( 'could not convert file buffer' );
                }

                function getElementFrom( node, elName ) {
                    let result = null;
                    node.childNodes().some( function( node ) {
                        if( node.name() === elName ) {
                            result = node;
                            return true;
                        }
                    } );
                    return result;
                }

                function getPath( $root, path ) {
                    let next = $root;

                    path.forEach( p => {
                        if( !next ) {
                            return;
                        }
                        next = getElementFrom( next, p );
                    } );
                    return next;
                }

                const
                    xmlDoc = libxml.parseXmlString( xmlStr, {noblanks: true} ),
                    root = xmlDoc.root(),
                    path = 'clinical_document_header/patient/person/id'.split( '/' );

                let patientIdEl = getPath( root, path );
                if( !patientIdEl ) {
                    throw Error( 'could not find element clinical_document_header/patient/person/id' );
                }

                patientIdEl.attr( {'EX': edmpCaseNo} );

                let changedXmlStr = xmlDoc.toString( false );
                changedXmlStr = changedXmlStr.replace( 'encoding="UTF-8"', 'encoding="ISO-8859-15"' ); // MOJ-8596: parsing again changes encoding and doc.encoding('ISO-..') is also not working here

                let iconvUtf8ToIso = new Iconv( 'utf-8', 'iso-8859-15//TRANSLIT//IGNORE' );
                let convertedBuff = iconvUtf8ToIso.convert( changedXmlStr );

                file.data = convertedBuff;

                return writeBackupdatedCaseNo( user, file, activity._id, activity.dmpFileId, edmpCaseNo );
            }

            if( !isEdmp( activity.actType ) ) {
                return;
            }
            return Promise.resolve().then( () => {
                return getPatient( user, activity.patientId );
            } ).then( patient => {

                let patientShort = activity.patientShort,
                    // fieldsToReplace = [],
                    newCaseNo;
                //_ = require( 'lodash' );

                if( !patient ) {
                    throw Error( 'could not find patient with id' + activity.patientId );
                }

                if( !patientShort ) {
                    throw Error( 'activity is missing patientShort attribute' );
                }

                if( patient.edmpCaseNo !== patientShort.edmpCaseNo ) {
                    // fieldsToReplace.push( ['edmpCaseNo', patient.edmpCaseNo] );
                    newCaseNo = patient.edmpCaseNo;
                    file.filename = file.filename.replace( patientShort.edmpCaseNo, patient.edmpCaseNo );
                }

                // if( patient.edmpParticipationChronicHeartFailure !== patientShort.edmpParticipationChronicHeartFailure ) {
                //     fieldsToReplace.push( ['edmpParticipationChronicHeartFailure', patient.edmpParticipationChronicHeartFailure] );
                // }
                // if( _.intersection( patient.edmpTypes, patientShort.edmpTypes ).length !== patientShort.edmpTypes ) {
                //     fieldsToReplace.push( ['edmpTypes', patient.edmpTypes] );
                // }

                if( newCaseNo ) {
                    Y.log( 'dmpCaseNo has changed update documentation ' + activity._id, 'debug', NAME );
                    return replace( newCaseNo );
                }
            } ).then( () => {
                return file;
            } );

        }

        async function packDelivery( args ) {
            Y.log('Entering Y.doccirrus.api.edmpdelivery.packDelivery', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmpdelivery.packDelivery');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                createdProgramFolders = {},
                dateOfArchiveCreation = moment();

            let tempDir, delivery, contentObj = [], contentFormId, labelFormId;

            function writeDocToDisc( file, actType ) {
                let
                    programsDocsPath = getArchivePathByActType( actType );

                function write() {
                    let filePath = joinPath( tempDir.path, programsDocsPath, file.filename );
                    return writeFile( filePath, file.data );
                }

                if( !programsDocsPath ) {
                    throw Error( `could not get file path for ${actType} eDMP program` );
                }
                if( !createdProgramFolders[programsDocsPath] ) {
                    return mkdirp( joinPath( tempDir.path, programsDocsPath ) ).then( () => {
                        createdProgramFolders[programsDocsPath] = {actType: actType, docs: [file.filename]};
                        return write();
                    } );
                }
                createdProgramFolders[programsDocsPath].docs.push( file.filename );
                return write();
            }

            if( !params.deliveryId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            if( params.isQDocu ) {
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.api.qdocudelivery.packQDocuDelivery( args )
                );

                if( result && result.validationError || result && result.errorDetails || err ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'edmpdelivery',
                            action: 'update',
                            query: {_id: params.deliveryId},
                            data: {
                                $set: {
                                    edmpDeliveryStatus: 'PACK_ERR',
                                    content: null,
                                    dateOfPacking: null,
                                    labelFormId: null,
                                    contentFormId: null,
                                    lastUpdate: new Date(),
                                    editor: getEditor( user ),
                                    error: result && result.deliveryError || '',
                                    errorDetails: result && result.errorDetails || ''
                                }
                            }
                        } ) );

                    if( err ) {
                        Y.log( `packDelivery: could not update edmpDelivery to activity: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        event: 'edmpPackingFinished',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: {
                            data: null
                        }
                    } );

                    return callback( err );
                }

                if( result && result.deliveryId ) {
                    return callback( null, result );
                }
            }

            return updateDelivery( user, params.deliveryId, {
                edmpDeliveryStatus: 'PACKING',
                lastUpdate: new Date(),
                includedEdocTypes: [],
                editor: getEditor( user )
            } ).then( () => {
                callback();
            } ).catch( err => {
                callback( err ); //eslint-disable-line callback-return
                throw err;
            } ).then( () => {
                // create temp folder to collect files, make zips etc.
                return runDb( { // group here by doc type already?
                    user: user,
                    model: 'edmpdelivery',
                    query: {
                        _id: params.deliveryId
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                } );
            } ).get( 0 ).then( _delivery => {
                if( !_delivery ) {
                    throw Error( 'could not find edmp delivery ' + params.deliveryId );
                }
                delivery = _delivery;
                // create temp folder to collect files, make zips etc.
                return getTmpDir( user, 'edmp-delivery' );
            } ).then( _tempDir => {
                tempDir = _tempDir;
                return mkdirp( joinPath( _tempDir.path, 'tmp' ) );
            } ).then( () => {
                return getDeliveryDocIds( user, params.deliveryId );
            } ).map( ( docId, idx, len ) => {
                Y.log( `packing delivery ${params.deliveryId}: processing doc ${idx}/${len}: `, 'debug', NAME );
                let doc,
                    file;
                return runDb( { // group here by doc type already?
                    user: user,
                    model: 'activity',
                    query: {
                        _id: docId
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        select: {
                            _id: 1,
                            actType: 1,
                            dmpFileId: 1,
                            patientShort: 1,
                            patientId: 1
                        }
                    }
                } ).get( 0 ).then( _doc => {
                    if( !_doc ) {
                        throw Error( 'could not get doc to pack in edmpdelivery' );
                    }
                    doc = _doc;
                    return getFile( user, doc.dmpFileId );
                } ).then( _file => {
                    if( !_file ) {
                        throw Error( 'could not find edmp xml to encrypt' );
                    }
                    file = _file;
                    return handleChangedEdmpCaseNo( user, doc, file );
                } ).then( () => {
                    return writeDocToDisc( file, doc.actType );
                } ).then( () => {
                    return uniq( Object.keys( createdProgramFolders ).map( key => ({
                        path: key,
                        actType: createdProgramFolders[key].actType,
                        docs: createdProgramFolders[key].docs
                    }) ), 'actType' );
                } ).then( results => {
                    return results;
                } );
            }, {concurrency: 5} ).then( results => {
                let flattend = uniq( flatten( results ), 'actType' );
                return flattend;
            } ).each( fullFolderPathObj => {
                let fullFolderPath = fullFolderPathObj.path,
                    actType = fullFolderPathObj.actType,
                    programFolderPath = fullFolderPath.split( '/' )[0], // get rid of the "Dokumentation" part of path COPD/Dokumentation
                    zipFileName = createArchiveName( actType, delivery.institutionCode || delivery.commercialNo, dateOfArchiveCreation, delivery.quarter, delivery.year ),
                    cwd = tempDir.path;

                if( isEdmp( actType ) && !delivery.includedEdocTypes.includes( 'EDMP' ) ) {
                    delivery.includedEdocTypes.push( 'EDMP' );
                } else if( isEhks( actType ) && !delivery.includedEdocTypes.includes( 'EHKS' ) ) {
                    delivery.includedEdocTypes.push( 'EHKS' );
                }

                return makeZip( zipFileName, programFolderPath, cwd ).then( () => {
                    // return readAndWriteFile( user, zipFileName, joinPath( tempDir.path, zipFileName ) );
                    if( true === delivery.createEvl ) {
                        Y.log( 'create "eVersandliste"', 'debug', NAME );
                        return createEvlFromArchive( user, zipFileName, tempDir.path, delivery );
                    }
                } ).then( ( result ) => {
                    fullFolderPathObj.evlAckFileId = result && result.ackFileId;
                    fullFolderPathObj.evlAckFileName = result && result.ackFileName;
                    return readAndWriteFile( user, zipFileName, joinPath( tempDir.path, zipFileName ) );
                } ).then( fileId => {
                    fullFolderPathObj.archiveFileId = fileId;
                    fullFolderPathObj.archiveFileName = zipFileName;
                    return encryptZip( actType, zipFileName, tempDir.path );
                } ).then( result => {
                    fullFolderPathObj.encryptedArchiveFileName = result.fileName;
                    return readAndWriteFile( user, result.fileName, result.filePath );
                } ).then( fileId => {
                    fullFolderPathObj.encryptedArchiveFileId = fileId;
                } );
            } ).each( result => {
                result.indexFileName = result.archiveFileName.replace( '.zip', '.idx' );

                let filePath = joinPath( tempDir.path, result.indexFileName );
                // create idx file
                Y.log( `creating edmp index fiel at ${filePath}`, 'debug', NAME );

                return buildIndexFile( {
                    context: {content: result, dateOfCreation: dateOfArchiveCreation, delivery: delivery},
                    writer: createFileWriter( {destination: filePath, user} )
                } ).then( () => {
                    return readAndWriteFile( user, result.indexFileName, filePath );
                } ).then( fileId => {
                    result.indexFileId = fileId;
                    return result;
                } );

            } ).then( results => {
                Array.prototype.push.apply( contentObj, results );
                return contentObj;
            } ).then( () => {
                return tempDir.done();
            } ).then( () => {
                return createForm( user, 'content', Object.assign( {}, delivery, {
                    content: contentObj,
                    dateOfPacking: dateOfArchiveCreation.toDate()
                } ) );
            } ).then( result => {
                contentFormId = result._id;
                return createForm( user, 'label', Object.assign( {}, delivery, {
                    content: contentObj,
                    dateOfPacking: dateOfArchiveCreation.toDate()
                } ) );
            } ).then( result => {
                labelFormId = result._id;
                Y.log( 'result contentObj ' + JSON.stringify( contentObj ), 'debug', NAME );
                return updateDelivery( user, params.deliveryId, {
                    edmpDeliveryStatus: 'PACKED',
                    dateOfPacking: dateOfArchiveCreation.toDate(),
                    includedEdocTypes: delivery.includedEdocTypes,
                    content: contentObj,
                    labelFormId: labelFormId,
                    contentFormId: contentFormId,
                    lastUpdate: new Date(),
                    editor: getEditor( user )
                } );
            } ).catch( err => {
                Y.log( 'could noch pack edmpdelivery: ' + (err && err.stack || err), 'error', NAME );
                return updateDelivery( user, params.deliveryId, {
                    edmpDeliveryStatus: 'PACK_ERR',
                    content: null,
                    dateOfPacking: null,
                    labelFormId: null,
                    contentFormId: null,
                    lastUpdate: new Date(),
                    editor: getEditor( user )
                } );
            } ).finally( () => {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: args.user.identityId,
                    event: 'edmpPackingFinished',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {}
                } );
            } );
        }

        function sendDelivery( args ) {
            Y.log('Entering Y.doccirrus.api.edmpdelivery.sendDelivery', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmpdelivery.sendDelivery');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                now = new Date();
            if( !params.deliveryId ) {
                return callback( Error( 'insufficient arguments' ) );
            }
            runDb( {
                user: user,
                model: 'edmpdelivery',
                query: {
                    _id: params.deliveryId
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ).get( 0 ).then( delivery => {
                if( !delivery ) {
                    throw Error( `could not send edmpdelivery: edmpdelivery with id ${params.deliveryId} not found` );
                }
                if( 'PACKED' !== delivery.edmpDeliveryStatus ) {
                    throw Error( 'edmpdelivery needs to be packed before you can send it' );
                }
                return updateActivities( user, {dmpDeliveryRef: params.deliveryId}, {
                    status: 'SENT',
                    dmpSentDate: now
                }, {multi: true} );
            } ).then( () => {
                return runDb( {
                    user: user,
                    model: 'edmpdelivery',
                    action: 'put',
                    query: {
                        _id: params.deliveryId
                    },
                    data: {
                        edmpDeliveryStatus: 'SENT',
                        lastUpdate: now,
                        sentDate: now,
                        editor: getEditor( user ),
                        skipcheck_: true
                    },
                    fields: ['edmpDeliveryStatus', 'lastUpdate', 'sentDate', 'editor']
                } );
            } ).then( () => {
                callback(); //eslint-disable-line callback-return
                createFollowingDocsFromSentDelivery( user, params.deliveryId );
            } ).catch( err => {
                callback( err );
            } );
        }

        function archiveDelivery( args ) {
            Y.log('Entering Y.doccirrus.api.edmpdelivery.archiveDelivery', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmpdelivery.archiveDelivery');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.deliveryId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            runDb( {
                user: user,
                model: 'edmpdelivery',
                query: {
                    _id: params.deliveryId
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ).get( 0 ).then( delivery => {
                if( !delivery ) {
                    throw Error( `could not send edmpdelivery: edmpdelivery with id ${params.deliveryId} not found` );
                }
                if( 'SENT' !== delivery.edmpDeliveryStatus ) {
                    throw Error( 'edmpdelivery needs to be sent before you can send it' );
                }
                return updateActivities( user, {dmpDeliveryRef: params.deliveryId}, {status: 'ARCHIVED'}, {multi: true} );
            } ).then( () => {
                return runDb( {
                    user: user,
                    action: 'put',
                    model: 'edmpdelivery',
                    query: {
                        _id: params.deliveryId
                    },
                    data: {
                        edmpDeliveryStatus: 'ARCHIVED',
                        editor: getEditor( user ),
                        skipcheck_: true
                    },
                    fields: ['edmpDeliveryStatus', 'editor']
                } );
            } ).then( () => {
                callback();
            } ).catch( err => {
                callback( err );
            } );

        }

        function GET( args ) {
            let query = args.query || {};

            if( !query.edmpDeliveryStatus ) {
                query.edmpDeliveryStatus = {$nin: ['ARCHIVED']};
            }

            runDb( {
                user: args.user,
                model: 'edmpdelivery',
                query: query,
                options: args.options || {}
            } ).then( result => args.callback( null, result ) ).catch( err => args.callback( err ) );
        }

        function addDoc( user, data ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'mongoInsertOne',
                data
            } ).then( function onAddedActivity( result ) {
                const insertedId = result && result.insertedId;
                if ( insertedId ) {
                    Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', insertedId.toString() );
                }
                return result;
            } );
        }

        function correctDocsFromDelivery( args ) {
            Y.log('Entering Y.doccirrus.api.edmpdelivery.correctDocsFromDelivery', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edmpdelivery.correctDocsFromDelivery');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.deliveryId || !params.docIds || !Array.isArray( params.docIds ) ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            if( !params.docIds.length ) {
                return callback();
            }

            runDb( {
                user: user,
                model: 'edmpdelivery',
                query: {
                    _id: params.deliveryId
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ).get( 0 ).then( delivery => {
                if( !delivery ) {
                    throw Error( `could not send edmpdelivery: edmpdelivery with id ${params.deliveryId} not found` );
                }
                if( 'SENT' !== delivery.edmpDeliveryStatus ) {
                    throw Error( 'edmpdelivery needs to be sent before you can correct it' );
                }
                // cancel activities
                return updateActivities( user, {
                    dmpDeliveryRef: params.deliveryId,
                    status: 'SENT',
                    _id: {$in: params.docIds.map( id => new ObjectID( id ) )}
                }, {status: 'CANCELLED'}, {multi: true} );
            } ).then( () => {
                return runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: {$in: params.docIds}
                    },
                    options: {
                        lean: true
                    }
                } );
            } ).each( doc => {
                // copyRef should always point to doc that was first copied from
                doc.copyRef = doc._id.toString();
                delete doc._id;
                delete doc.editor;
                doc.dmpSignatureDate = null;
                doc.status = 'CREATED';
                doc.dmpAddressee = null;
                doc.dmpErrors = null;
                doc.dmpDeliveryInfo = null;
                doc.dmpFileId = null;
                doc.dmpDeliveryRef = null;
                doc.dmpSentDate = null;
                doc.dmpPrintStatus = 'NOT_PRINTED';
                doc.dmpDocVersion = doc.dmpDocVersion ? ++doc.dmpDocVersion : 1;

                return addDoc( user, doc );
            } ).then( () => callback() ).catch( err => callback( err ) );
        }

        Y.namespace( 'doccirrus.api' ).edmpdelivery = {

            name: NAME,
            get: GET,
            createDeliveries: createDeliveries,
            removeDocsFromDelivery: removeDocsFromDelivery,
            sendDelivery: sendDelivery,
            packDelivery: packDelivery,
            archiveDelivery: archiveDelivery,
            correctDocsFromDelivery: correctDocsFromDelivery
        };

    },
    '0.0.1', {requires: ['casefolder-schema', 'catalog-api', 'qdocudelivery-api', 'edmp-commonutils', 'tempdir-manager', 'dcgridfs', 'xkm', 'dccommunication', 'edmp-utils', 'edoc-utils']}
);
