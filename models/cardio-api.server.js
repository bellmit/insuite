/**
 * User: pi
 * Date: 20/02/2015  14:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*jshint esnext:true */
/*global YUI */
'use strict';

YUI.add(
    'cardio-api',
    function( Y, NAME ) {

        const
            async = require( 'async' ),
            moment = require( 'moment' ),
            _ = require( 'lodash' ),
            { formatPromiseResult } = require( 'dc-core' ).utils,

            TIMESTAMP_FORMAT = Y.doccirrus.i18n( 'general.TIMESTAMP_FORMAT_DOQUVIDE' ),
            i18n = Y.doccirrus.i18n,

            MedDataItemSchema = Y.doccirrus.schemas.v_meddata.MedDataItemSchema,

            util = require('util'),
            ObjectId = require( 'mongoose' ).Types.ObjectId;


        /**
         * @module cardio-api
         */

        function getAllowedTenantUsers(){
            return new Promise( resolve => {
                let su = Y.doccirrus.auth.getSUForLocal();
                if( Y.doccirrus.auth.isVPRC() ) {
                    let users = [];
                    Y.doccirrus.api.company.getActiveTenants( {
                        user: su,
                        callback: function( err, activeTenants ) {
                            if( err ) {
                                Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                                return resolve( [] );
                            }

                            let activeTenantList = activeTenants.map( doc => doc.tenantId ),
                                tenantSU = null;
                            activeTenantList.forEach( function( tenantId ) {
                                tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );
                                if( tenantSU && ( Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) ||
                                                  Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) ||
                                                  Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) ) ) {
                                    users = [ ...users, tenantSU ];
                                }
                            } );

                            resolve( users );
                        }
                    } );
                } else {
                    let tenantId = "0";
                    if( Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) ||
                        Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) ||
                        Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) ) {
                        resolve( [ su ] );
                    }
                }
            } );
        }

        function preServerCheck( cb ) {
            checkCardioServer( {
                callback: cb || function( err ) {
                    if( err ) {
                        Y.log( "Pre-checking Cardio server: " + ( err.message || err ), 'info', NAME );
                    }
                }
            } );
        }

        function importMedia( user, attachment, callback ) {
            let fileName = attachment.ID;
            let fileData = attachment.CONTENT;

            var tempPath = Y.doccirrus.media.getTempDir();
            var tempFilePath = tempPath + fileName;
            var fs = require( 'fs' );
            fs.writeFileSync( tempFilePath, new Buffer( fileData, "base64" ) );

            Y.doccirrus.media.importMediaFromFile( user, tempFilePath, "", "", fileName, 'user', 'OTHER', callback );
        }

        function taskAssignPatient( user, exportData, devSerial ) {
            Y.doccirrus.api.task.createTaskForRoles( {
                user: user,
                roles: ["Telecardio"],
                title: `${i18n( 'TaskMojit.SYSTEM_MESSAGE.assigned_patient' )} (${devSerial})`,
                details: `Patientensatz von ${exportData.exportName} mit Seriennummer ${devSerial} konnte nicht zugeordnet werden.`,
                cardioSerialNumber: devSerial,
                type: Y.doccirrus.schemas.task.systemTaskTypes.RULE_ENGINE,
                unique: true
            }, (err) => {
                if( err ){
                    Y.log( `Error creating new task for assigning patient to cardio ${err.message}`, 'error', NAME );
                }
            } );
        }

        function getCardioCatalog( message, catalogDate, callback ) {

            catalogDate = ( catalogDate || new Date() ).toISOString();
            let superUser = Y.doccirrus.auth.getSUForLocal();

            let description = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'MEASUREMENT',
                short: 'BIOTRONIK'
            } );

            Y.doccirrus.mongodb.runDb( {
                user: superUser,
                model: 'catalog',
                action: 'get',
                query: {
                    messages: message,
                    catalog: description && description.filename
                }
            }, ( err, entry ) => {
                if( err ) {
                    Y.log( 'Error on getting Cardio catalog: ' + ( err.message || err ), 'error' );
                }
                if( entry && entry.length ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: superUser,
                        model: 'catalog',
                        action: 'get',
                        query: {
                            seq: entry[0].seq,
                            catalog: description && description.filename,
                            start: { $lte: catalogDate },
                            end: { $gt: catalogDate }
                        }
                    }, ( err, entry ) => {

                        if( entry && entry.length ) {
                            return callback( err, {
                                code: entry[0].seq,
                                message: Y.doccirrus.schemas.catalog.getMessageInLanguage( entry[0].messages, Y.config.lang )
                            } );
                        } else {
                            return callback( err, {
                                code: 0,
                                message: ''
                            } );
                        }
                    } );
                } else {
                    return callback( err, {
                        code: 0,
                        message: ''
                    } );
                }
            } );
        }

        function addCardioDataIfNew( user, curExport, serverOptions, fileData, nextSeries ) {
            var //user = Y.doccirrus.auth.getSUForLocal(),
                devSerial,
                reports,
                exportJSON,
                exportData = {},
                eventMessage = "",
                exportMeta,
                usersPromise;

            if( user ) {
                usersPromise = Promise.resolve( [user] );
            } else {
                usersPromise = getAllowedTenantUsers();
            }

            usersPromise.then( users => {
                async.eachSeries( users, ( user, nextUser ) => {
                    Y.log( `Processing cardio for tenant ${user.tenantId}`, 'info', NAME );
                    let skipIfExists = false;
                    async.waterfall( [
                        function( nextWaterfall ) {
                            Y.log( "checking exportID " + curExport.id, 'debug', NAME );
                            Y.doccirrus.mongodb.runDb( {
                                    model: 'cardio',
                                    action: 'get',
                                    user: user,
                                    query: { exportId: curExport.id }
                                },
                                ( err, res ) => {
                                    if( err ) {
                                        return nextWaterfall( err );
                                    }
                                    if( res && res.length ) {
                                        skipIfExists = true;
                                    }
                                    nextWaterfall();
                                }
                            );
                        },
                        function( nextWaterfall ) {
                            if( skipIfExists ) {
                                return nextWaterfall();
                            }
                            Y.log( `adding new cardio record ${curExport.id}`, 'debug', NAME );
                            if( !fileData ) {
                                Y.doccirrus.api.biotronik.getExportJSONById( curExport.id, serverOptions, ( err, exportCardioJSON ) => {
                                    if( err ) {
                                        return nextWaterfall( err );
                                    }
                                    exportJSON = exportCardioJSON;
                                    //delay for 10 seconds to not overload remote server
                                    setTimeout( nextWaterfall, 10000 );
                                } );
                            } else {
                                //get JSON from sink file
                                Y.doccirrus.api.biotronik.getJSONfromXML( fileData, ( err, result ) => {
                                    if( err ) {
                                        return nextWaterfall( err );
                                    }
                                    exportJSON = result;
                                    curExport.patient = exportJSON.dataset && exportJSON.dataset.MDC && exportJSON.dataset.MDC.ATTR &&
                                                        exportJSON.dataset.MDC.ATTR.PT && exportJSON.dataset.MDC.ATTR.PT.ID || "sink from Device";
                                    curExport.created_at = new Date( exportJSON.dataset && exportJSON.dataset.BIO &&
                                                                     exportJSON.dataset.BIO.REQUEST && exportJSON.dataset.BIO.REQUEST.DATE );
                                    nextWaterfall();
                                } );
                            }
                        },
                        function( nextWaterfall ) {
                            if( skipIfExists ) {
                                return nextWaterfall();
                            }
                            exportMeta = exportJSON.meta || {};
                            devSerial = exportJSON.dataset.MDC && exportJSON.dataset.MDC.IDC && exportJSON.dataset.MDC.IDC.DEV && exportJSON.dataset.MDC.IDC.DEV.SERIAL;
                            reports = exportJSON.dataset && exportJSON.dataset.BIO && exportJSON.dataset.BIO.REQUEST && exportJSON.dataset.BIO.REQUEST.REPORTS;

                            if( !reports ) {
                                return nextWaterfall();
                            }

                            //importing inline binary data into media
                            async.eachSeries( ['STATUS_REPORT', 'EPISODE_REPORT'],
                                ( reportType, next ) => {
                                    if( reports[reportType] ) {
                                        if( !Array.isArray( reports[reportType] ) ) {
                                            reports[reportType] = [reports[reportType]];
                                        }
                                        async.eachSeries( reports[reportType],
                                            ( report, nextReport ) => {

                                                importMedia( user, report, function( err, res ) {
                                                    if( err ) {
                                                        Y.log( 'Error importing media data: ' + ( err.message || err ), 'error', NAME );
                                                    }
                                                    if( res && res._id ) {
                                                        report.url = `/1/media/:download?_id=${res._id.toString()}&mime=APPLICATION_PDF&from=casefile`;
                                                        report.mediaId = res._id.toString();
                                                        delete report.CONTENT;

                                                    }
                                                    nextReport();
                                                } );
                                            },
                                            ( err ) => {
                                                next( err );
                                            }
                                        );

                                    } else {
                                        return next();
                                    }
                                },
                                ( err ) => {
                                    if( err ) {
                                        Y.log( 'Error processing binary data for ' + curExport.id, 'error', NAME );
                                    }
                                    nextWaterfall();
                                }
                            );
                        },
                        function( nextWaterfall ) {
                            if( skipIfExists ) {
                                return nextWaterfall( null, {} );
                            }
                            let dataset = exportJSON.dataset,
                                status = dataset.BIO && dataset.BIO.REQUEST && dataset.BIO.REQUEST.HM && dataset.BIO.REQUEST.HM.STATUS,
                                notifications = dataset.BIO && dataset.BIO.REQUEST && dataset.BIO.REQUEST.HM && dataset.BIO.REQUEST.HM.NOTIFICATION,
                                message = status && status.TEXT,
                                time = dataset && dataset.MDC && dataset.MDC.IDC && dataset.MDC.IDC.SESS && dataset.MDC.IDC.SESS.DTM,
                                timestamp = time && moment( time ).local();

                            //Check for a new format
                            if( notifications ) {
                                message = notifications[0] && notifications[0].VENDOR_CODE ||
                                          notifications && notifications.VENDOR_CODE;
                            }

                            //Check for programmer xml
                            if( exportMeta && exportMeta.creator === 'BioICSConverter' ) {
                                message = 'Programmer triggered message received';
                            }

                            if( !message ) {
                                return nextWaterfall( null, {
                                        code: 0,
                                        message: ''
                                    }
                                );
                            }

                            getCardioCatalog( message, timestamp, nextWaterfall );
                        },
                        function( eventCatalog, nextWaterfall ) {
                            if( skipIfExists ) {
                                return nextWaterfall( null, {} );
                            }
                            eventMessage = eventCatalog.message;

                            Y.doccirrus.mongodb.runDb( {
                                model: 'patient',
                                action: 'get',
                                user: user,
                                query: {
                                    partnerIds: {
                                        $elemMatch: {
                                            partnerId: 'CARDIO',
                                            patientId: devSerial,
                                            $or: [
                                                { isDisabled: {$exists: false} },
                                                { isDisabled: false }
                                            ]
                                        }
                                    }
                                },
                                callback: nextWaterfall
                            } );
                        },
                        function( patients, nextWaterfall ) {
                            if( skipIfExists ) {
                                return nextWaterfall( null, {} );
                            }
                            var patientId = patients && patients[0] && patients[0]._id || "",
                                patientName = patients && patients[0] && (patients[0].lastname + ", " + patients[0].firstname) || "",
                                setSubType = exportJSON.dataset && exportJSON.dataset.MDC && exportJSON.dataset.MDC.IDC &&
                                             exportJSON.dataset.MDC.IDC.DEV && exportJSON.dataset.MDC.IDC.DEV.MODEL;

                            Y.log( require( 'util' ).inspect( exportJSON, {
                                depth: 10,
                                colors: true
                            } ), 'debug', NAME );

                            exportData = {
                                exportId: curExport.id,
                                exportName: curExport.patient || "[undefiniert]",
                                exportDate: curExport.created_at,
                                data: exportJSON,
                                patientId: patientId,
                                patientName: patientName,
                                serialNumber: devSerial,
                                eventMessage: eventMessage,
                                type: 'MEASUREMENT',
                                subType: setSubType,
                                catalog: 'BIOTRONIK',
                                skipcheck_: true
                            };

                            Y.doccirrus.mongodb.runDb( {
                                model: 'cardio',
                                action: 'post',
                                user: user,
                                data: exportData,
                                callback: nextWaterfall
                            } );
                        },

                        function( cardios, nextWaterfall ) {
                            if( skipIfExists ) {
                                return nextWaterfall();
                            }
                            if( exportData.patientId && cardios && cardios[0] ) {
                                attachToPatient( user, exportData.patientId, reports, exportJSON.dataset, exportMeta, ( err ) => {
                                    if( err ) {
                                        Y.log( 'Error during attaching patient ' + ( err.message || err ), 'error', NAME );
                                    } else {
                                        Y.doccirrus.communication.emitEventForSession( {
                                            sessionId: user.sessionId,
                                            event: 'patientPartnersHasChanged',
                                            msg: { data: 0 }
                                        } );
                                    }
                                } );
                            } else {
                                taskAssignPatient( user, exportData, devSerial );
                            }
                            nextWaterfall();
                        }

                    ], ( err ) => {
                        if( err ) {
                            Y.log( 'Error processing Cardio exports for: ' + curExport.id + ' ' + ( err.message || err ), 'error', NAME );
                        }
                        nextUser( null );
                    } );
                }, nextSeries );
            } );
        }



        function checkCardioServer( args ) {
            Y.log('Entering Y.doccirrus.api.cardio.checkCardioServer', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardio.checkCardioServer');
            }
            Y.log( "checking HMSC exports list...", 'debug', NAME );
            getAllowedTenantUsers().then( users => {
                async.eachSeries( users, ( user, nextUser ) => {
                        Y.log( `checking HMSC for tenant ${user.tenantId}`, 'info', NAME );
                        Y.doccirrus.api.biotronik.getExportList( user, ( err, resultsArray ) => {
                            if( err ) {
                                Y.log( `Cannot reach server ${err.message || err}`, 'warn', NAME );
                                return nextUser(); //continue for next tenant
                            }

                            async.eachSeries( resultsArray, ( resultObj, nextResult ) => {
                                let {option: serverOptions, result: res} = resultObj;
                                if( !res || !res.exports || !serverOptions ) {
                                    Y.log( `Incomplete biotronic export list ${JSON.stringify( res )} or server options ${serverOptions.host}`, 'warn', NAME );
                                    return nextResult();
                                }

                                async.eachSeries( res.exports,
                                    ( exportData, nextSeries ) => {
                                        addCardioDataIfNew( user, exportData, serverOptions, false, nextSeries );
                                    },
                                    ( err ) => {
                                        if( err ) {
                                            Y.log( `Error on adding cardio record for ${serverOptions.host} : ${err.message}`, 'warn', NAME );
                                        }
                                        nextResult();
                                    }
                                );

                            }, ( err ) => {
                                if( err ) {
                                    Y.log( `Error on itreating cardo export list ${err.message}`, 'warn', NAME );
                                }
                                nextUser();
                            } );
                        } );
                    },
                    ( err ) => {
                        if( err ) {
                            return args.callback( err );
                        }
                        args.callback( null );
                    } );
            } );
        }

        function attachToPatient( user, patientId, reports, dataset, exportMeta, callback ) {

            function getLoc( user, patientId, callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'patient',
                    query: { _id: patientId },
                    options: { lean: true },
                    callback: ( err, res ) => {
                        if( err || !res[0] ) {
                            return callback( "Can not find patient" );
                        }
                        const
                            locationIdFromInsurance = res[0] && res[0].insuranceStatus[0] && res[0].insuranceStatus[0].locationId,
                            locationIdFromPatient = res[0].locationId,
                            mainLocationId = Y.doccirrus.schemas.location.getMainLocationId();
                        callback( null, locationIdFromInsurance || locationIdFromPatient || mainLocationId, res[0] );
                    }
                } );
            }

            /**
             * find appropriate PHYSYCIAN and not SUPPORT employee for location
             */
            async function getEmp( user, locationId, callback ) {
                const
                    supportGroup = Y.doccirrus.schemas.identity.userGroups.SUPPORT;

                let [ err, employees ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'employee',
                        query: {
                            type: 'PHYSICIAN',
                            'memberOf.group': {$ne: supportGroup},
                            'locations._id': locationId
                        }
                    } )
                );
                if( err ) {
                    Y.log(`getEmp: Error getting employee: ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }
                if( !employees.length ) {
                    return callback( "cannot find employee" );
                }

                callback( null, employees[0] && employees[0]._id );
            }

            function createAttachment( attachment, callback ) {
                const
                    defaultLocationId = Y.doccirrus.schemas.location.getMainLocationId();

                let
                    fileName = attachment.filename,
                    mediaId = attachment.mediaId,
                    activityId = attachment.activityId || '';

                Y.log( `creating attachment for ${mediaId} filename: ${fileName}`, 'info', NAME );
                if( mediaId ) {
                    let docObj = {
                        "type": "OTHER",
                        "url": "/1/media/:download?_id=" + mediaId + "&mime=APPLICATION_PDF&from=casefile",
                        "publisher": "biotronik-api",
                        "contentType": "application/pdf",
                        "subType": "Import",
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

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'document',
                        data: docObj,
                        callback: callback
                    } );
                }

            }

            function partnerIdExists( patient, partnerId ) {
                if( !patient.partnerIds && !Array.isArray( patient.partnerIds ) ) {
                    return false;
                }
                let patientIdPartner = patient.partnerIds.filter( function( p ) {
                    return ( typeof p.isDisabled !== 'undefined' ) ? p.partnerId === partnerId && !p.isDisabled : p.partnerId === partnerId;
                } );
                return !!patientIdPartner.length;
            }

            function getDOQUVIDEActiveRuleCodes(user, callback){
                let codes = [],
                    parentId = Y.doccirrus.schemas.rule.getDOQUVIDEDirId();
                Y.doccirrus.ruleutils.walkDownFrom( user, parentId, (rule) => {
                    if( ( ( rule.metaActTypes || [] ).includes( 'MEASUREMENT') || ( rule.metaActTypes || [] ).includes( 'PROCESS') ) && (rule.metaActCodes || []).length ){
                        codes = [...codes, ...rule.metaActCodes];
                    }
                } ).then( () => {
                    callback( null, codes );
                } );
            }

            function postActivity( activityData, callback ) {
                if( activityData.patientId && activityData.caseFolderId && activityData.locationId ) {
                    let postData = {
                        model: "activity",
                        user: user,
                        data: {
                            actType: activityData.specialDOQUVIDE ? "PROCESS" : "MEASUREMENT",
                            timestamp: activityData.event && activityData.event.timestamp || new Date(),
                            patientId: activityData.patientId,
                            employeeId: activityData.employeeId,
                            caseFolderId: activityData.caseFolderId,
                            locationId: activityData.locationId,
                            userContent: getPrettyJson( activityData.data ),
                            d_extra: Object.assign( {}, activityData.data, (activityData.event.color) ? { color: activityData.event.color } : {} ),
                            attachments: activityData.attachments,
                            status: "APPROVED",
                            code: activityData.event.code,
                            eventMessage: activityData.event.message,
                            eventDate: activityData.event && activityData.event.timestamp,
                            catalogShort: activityData.event.catalogShort,
                            specialDOQUVIDE: activityData.specialDOQUVIDE,
                            catalog: true,
                            vendorId: activityData.data.MDC.IDC.DEV.MFG,
                            subType: activityData.data.MDC.IDC.DEV.MODEL,
                            time: activityData.event.time
                        },
                        options: {},
                        callback: callback
                    };

                    if ( activityData._id ) {
                        postData._id = activityData._id;
                    }

                    Y.doccirrus.api.activity.post( postData );
                } else {
                    Y.log( "argument(s) missing for activity creation ", "error" );
                }
            }

            function postMedDataFromActivity( activityData, callback ) {
                if( activityData.patientId && activityData.caseFolderId && activityData.locationId ) {
                    const
                        modelName = activityData.data.MDC.IDC.DEV.MODEL || activityData.event.catalogShort,
                        postData = {
                            model: "activity",
                            user: user,
                            data: {
                                actType: "MEDDATA",
                                timestamp: (activityData.event && activityData.event.timestamp) || new Date(),
                                patientId: activityData.patientId,
                                employeeId: activityData.employeeId,
                                caseFolderId: activityData.caseFolderId,
                                locationId: activityData.locationId,
                                medData: getMedDataItems( activityData.data, { category: modelName } ).map( item => item.toObject() ),
                                // attachments: activityData.attachments, don't include the attachments here
                                status: "APPROVED",
                                code: activityData.event.code,
                                eventMessage: activityData.event.message,
                                eventDate: activityData.event && activityData.event.timestamp,
                                catalogShort: modelName,
                                specialDOQUVIDE: activityData.specialDOQUVIDE,
                                catalog: true,
                                vendorId: activityData.data.MDC.IDC.DEV.MFG,
                                subType: modelName,
                                time: activityData.event.time
                            },
                            options: {},
                            callback: callback
                        };

                    if( activityData._id ) {
                        postData._id = activityData._id;
                    }

                    Y.doccirrus.api.activity.post( postData );
                } else {
                    Y.log( "argument(s) missing for MEDDATA activity creation ", "error" );
                }
            }

            /**
             *  Create a MEASUREMENT/Messung activity from a cardio book entry
             *
             *  Overall process:
             *
             *      (1) Save all attached documents / PDFs
             *      (2) Create a placeholder form before saving activity
             *      (3) Save the activity
             *      (4) Initialize a form for the measurement if one is assigned to the role
             *
             * @param activityData
             * @param attachmentsToAdd
             * @param documentModel
             * @param callback
             * @return {Promise<*>}
             */

            async function creatActivity(activityData, attachmentsToAdd, documentModel, callback) {
                const
                    createAttachmentP = util.promisify( createAttachment ),
                    postActivityP = util.promisify( postActivity ),
                    postMedDataFromActivityP = util.promisify( postMedDataFromActivity ),
                    initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity );

                let
                    newActivityIds,
                    newActivityId,
                    attachment,
                    stubFormDoc,
                    err, result;

                //  Set an _id for the new activity before creating it
                activityData._id  =  new ObjectId();
                activityData.attachments = [];

                //  (1) Save all attached documents / PDFs
                for( attachment of attachmentsToAdd ) {
                    attachment.activityId = activityData._id.toString();

                    [ err, result ] = await formatPromiseResult( createAttachmentP( attachment ) );
                    if ( err ) {
                        Y.log( `Problem creating attachments for new ${activityData.actType}: ${err.stack||err}`, 'error', NAME );
                        return callback( err );
                    }

                    if ( result && result[0] ) {
                        activityData.attachments.push( result[0] );
                    }
                }

                //  (2) Create a placeholder form before saving activity
                if ( activityData.formId ) {

                    [ err, stubFormDoc ] = await formatPromiseResult(
                        Y.doccirrus.forms.mappinghelper.createStubFormDocument(
                            user,
                            activityData._id,
                            activityData.locationId,
                            activityData.formId,
                            activityData.formVersion
                        )
                    );

                    if ( err ) {
                        Y.log( `Could not create stub form for activity:${err.stack||err}`, 'warn', NAME );
                        //  not critical, continue with best effort
                    } else {
                        activityData.attachments.push( `${stubFormDoc._id}` );
                    }
                }

                //  (3) Save the activity
                [ err, newActivityIds ] = await formatPromiseResult( postActivityP( activityData ) );

                if ( !err && !newActivityIds[0] ) {
                    err = new Error( `Could not make post into activities database` );
                }

                if( err ) {
                    Y.log( `Could not post new activity to database: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                newActivityId = newActivityIds[0];

                //  (4) Replace the temporary _id for attachments, post seems to discard it
                [ err ] = await formatPromiseResult(
                    documentModel.mongoose.update(
                        { _id: { $in: activityData.attachments } },
                        { $set: { 'activityId': newActivityId, 'attachedTo': newActivityId } },
                        { multi: true }
                    ).exec()
                );

                if ( err ) {
                    Y.log( `Problem updating ownership of attachments for new activity ${newActivityId}: ${err.stack||err}`, 'error', NAME );
                    // continue despite error, best effort
                }

                //  (5) Initialize a form for the measurement if one is assigned to the role
                if ( activityData.formId ) {
                    [ err ] = await formatPromiseResult(
                        initializeFormForActivityP( user, newActivityId, {}, null )
                    );

                    if ( err ) {
                        Y.log( `Problem creating form form new activity ${newActivityId}: ${err.stack||err}`, 'error', NAME );
                        // continue despite error, best effort
                    }
                }

                // IF this is not a DOQUVIDE
                if( !activityData.specialDOQUVIDE ) {
                    //  (6) Save a new MEDDATA activity with all the XML structure as medDataItems
                    [err, result] = await formatPromiseResult( postMedDataFromActivityP( activityData ) );

                    if( !err && !result[0] ) {
                        err = new Error( `Could not post new MedDataItem post into activities database` );
                    }

                    if( err ) {
                        Y.log( `Could not post new MedData activity to database: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }

                    // add the MedData activity id to the list of newly created activities
                    newActivityIds.push( result[0] );
                }

                callback( err, newActivityIds );
            } // end creatActivity

            let data = dataset,
                status = dataset.BIO && dataset.BIO.REQUEST && dataset.BIO.REQUEST.HM && dataset.BIO.REQUEST.HM.STATUS,
                notifications = dataset.BIO && dataset.BIO.REQUEST && dataset.BIO.REQUEST.HM && dataset.BIO.REQUEST.HM.NOTIFICATION,
                activityData = {
                    data: data,
                    patientId: patientId,
                    employeeId: undefined,
                    locationId: undefined,
                    event: {},
                    attachments: []
                },
                additionalType = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                attachmentsToAdd = [],
                time = data && data.MDC && data.MDC.IDC && data.MDC.IDC.SESS && data.MDC.IDC.SESS.DTM;

            if( time ) {
                let timestamp = moment( time ).local();
                activityData.event.timestamp = timestamp;
                activityData.event.time = timestamp.format('HH:mm' ).toString();
            }

            if( status && status.COLOR ) {
                if( ['Rot', 'Red', 'Rouge', 'Rojo', 'Rosso'].includes( status.COLOR ) ) {
                    activityData.event.color = 'red';
                }
                if( ['Gelb', 'Yellow', 'Jaune', 'Amarillo', 'Giallo'].includes( status.COLOR ) ) {
                    activityData.event.color = 'yellow';
                }
            }

            if( reports ) {
                ['STATUS_REPORT', 'EPISODE_REPORT'].forEach( reportType => {
                    if( reports[reportType] ) {
                        let arr = reports[reportType];
                        if( !Array.isArray( arr ) ) {
                            arr = [arr];
                        }
                        arr.forEach( report => {
                            attachmentsToAdd.push( {
                                filename: report.ID,
                                mediaId: report.mediaId
                            } );
                        } );
                    }
                } );
            }

            let eventMessages,
                DOQUVIDEPatient = false,
                collectedDoquvideRules = [],
                //doquvideCasefolderId = '', // do not copy DOQUVIDE Measurement
                telecardioCasefolderId = '',
                isDOQUVIDE = Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE );

            let measurementFormId = '';

            async.waterfall( [

                //  Look up form role for MEASUREMENT activities
                function( nextWaterfall ) {
                    const formRole = 'casefile-telekardio-measurement';
                    Y.dcforms.getConfigVar( user, formRole, false, onFormLookup );
                    function onFormLookup( err, canonicalId ) {
                        if ( err ) { return nextWaterfall( err ); }
                        measurementFormId = canonicalId;
                        //console.log( '(****) lookup of measurement form: ', measurementFormId );
                        nextWaterfall();
                    }
                },

                function( nextWaterfall ) {
                    Y.doccirrus.cardioutils.createCaseFolderOfType( user, patientId, additionalType )
                        .then( result => nextWaterfall(null, result) )
                        .catch( err => nextWaterfall(err) );
                },
                function( caseFolderId, nextWaterfall ) {
                    telecardioCasefolderId = caseFolderId;
                    activityData.caseFolderId = caseFolderId;
                    getLoc( user, patientId, nextWaterfall );
                },
                function( locationId, patient, nextWaterfall ) {
                    if ( patient ) {
                        DOQUVIDEPatient = partnerIdExists(patient, Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE);
                    }
                    activityData.locationId = locationId;
                    getEmp( user, activityData.locationId, nextWaterfall );
                },
                function( employeeId, nextWaterfall ) {
                    activityData.employeeId = employeeId;

                    let messages = [];
                    let message = status && status.TEXT,
                        creator = exportMeta && exportMeta.creator;

                    //Check for a new format
                    if( notifications ) {
                        message = notifications[0] && notifications[0].VENDOR_CODE ||
                                  notifications && notifications.VENDOR_CODE;
                    }

                    //Check for programmer xml
                    if( 'BioICSConverter' === creator ) {
                        message = 'Programmer triggered message received';
                    }
                    if ( notifications && 'BioHMSC' === creator ){
                        //should additionally processed DOQUVIDOQ events
                        messages.push( message );
                        for(let i = 1; i < notifications.length; i++ ){
                            let doqvidoqMessage = notifications[i] && notifications[i].VENDOR_CODE ||
                                                  notifications && notifications.VENDOR_CODE;
                            if(doqvidoqMessage){
                                messages.push( doqvidoqMessage );
                            }
                        }
                    } else {
                        messages = [ message ];
                    }

                    if( !messages.length ) {
                        return nextWaterfall( null, [ {
                                code: 0,
                                message: ''
                            } ]
                        );
                    }
                    let catalogCodes = [];
                    async.eachSeries( messages, ( message, nextSeries ) => {
                        getCardioCatalog(message, activityData.event && activityData.event.timestamp, (err, result)=> {
                            if( err ){
                                Y.log( `Error getting cardio catalog ${err.message}`, 'error', NAME );
                            }
                            catalogCodes.push( result );
                            nextSeries();
                        });
                    }, (err) => {
                        if( err ){
                            Y.log('Error on getting cardio catalog ' + ( err.message || err ), 'error', NAME);
                        }
                        nextWaterfall(err, catalogCodes);
                    });
                },
                function( collectedEventMessages, nextWaterfall ) {
                    eventMessages = collectedEventMessages;
                    if( !isDOQUVIDE || !DOQUVIDEPatient || !eventMessages.length ) {
                        return nextWaterfall(null, []);
                    }
                    getDOQUVIDEActiveRuleCodes( user, nextWaterfall);
                },
                function( DoquvideRules, nextWaterfall ) {
                    collectedDoquvideRules = DoquvideRules;
                    if( !isDOQUVIDE || !DOQUVIDEPatient ) { // || 1 === eventMessages.length // now 1 event also can be DOQUVIDE
                        return nextWaterfall(null, '');
                    }
                    let DOQUVIDEadditionalType = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE;
                    Y.doccirrus.cardioutils.createCaseFolderOfType( user, patientId, DOQUVIDEadditionalType )
                        .then( result => nextWaterfall(null, result) )
                        .catch( err => nextWaterfall(err) );
                },
                function( CasefolderId, nextWaterfall ) {
                    //doquvideCasefolderId = CasefolderId; // do not copy DOQUVIDE Measurement

                    let
                        cardioProcessed = false,
                        doquvidoqProcessed = false,
                        createdActivities = [],
                        documentModel;

                    async.eachSeries( eventMessages, ( eventMessage, nextSeries ) => {
                        async.waterfall( [
                            function(nextWater) {
                                activityData.event.code = eventMessage.code;
                                activityData.event.message = eventMessage.message;
                                activityData.event.catalogShort = 'BIOTRONIK';
                                activityData.actType = "MEASUREMENT";
                                activityData.formId = measurementFormId;
                                Y.doccirrus.mongodb.getModel( user, 'document', true, nextWater);
                            },
                            function(model, nextWater) {
                                documentModel = model;

                                if (!cardioProcessed) {
                                    cardioProcessed = true;
                                    activityData.specialDOQUVIDE = false;
                                    activityData.caseFolderId = telecardioCasefolderId;
                                    creatActivity(activityData, attachmentsToAdd, documentModel, nextWater);
                                } else {
                                    nextWater(null, []);
                                }
                            },
                            function(activities, nextWater) {
                                createdActivities = [...createdActivities, ...activities];
                                if (isDOQUVIDE && !doquvidoqProcessed && (collectedDoquvideRules || []).includes(eventMessage.code)) {
                                    doquvidoqProcessed = true;
                                    activityData.specialDOQUVIDE = true;
                                    let doquvideCreated = [];
                                    async.waterfall([
                                        (nextDoqvide) => {
                                            activityData.caseFolderId = telecardioCasefolderId;
                                            creatActivity(activityData, attachmentsToAdd, documentModel, nextDoqvide);
                                        }
                                        /* , do not copy DOQUVIDE Measurement
                                        (activity, nextDoqvide) => {
                                            doquvideCreated = [...doquvideCreated, ...activity];
                                            activityData.caseFolderId = doquvideCasefolderId;
                                            creatActivity(activityData, attachmentsToAdd, documentModel, nextDoqvide);
                                        }
                                        */
                                    ], ( err, activity ) => {
                                        nextWater( err, [...doquvideCreated, ...activity] );
                                    } );
                                } else {
                                    nextWater(null, []);
                                }
                            },
                            function(activities, nextWater) {
                                createdActivities = [...createdActivities, ...activities];
                                nextWater();
                            }
                        ], (err) => {
                            nextSeries(err);
                        });
                    }, (err) => {
                        nextWaterfall( err, createdActivities );
                    });
                }
            ], ( err, result ) => {
                if( err ) {
                    Y.log( "Error on creating CARDIO activity " + ( err.message || err ), "error" );
                }

                Y.log( 'Created activity ' + JSON.stringify( result ) + ' with data ' + JSON.stringify( activityData ), 'debug' );
                activityData.caseFolderId = telecardioCasefolderId; //for correct case folder refreshing
                callback( err, activityData );
            } );

        }

        function attachToPatientId( user, patient, cardioSerialNumber, callback ) {
            let patientId = patient._id.toString(),
                patientName = patient.lastname + ", " + patient.firstname || "[NAME PARSE ERROR]";

            Y.log( 'Assigning to ' + patientName + ' cardio records with serial ' + cardioSerialNumber, 'info', NAME );

            Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'cardio',
                    query: {
                        'serialNumber': cardioSerialNumber,
                        $or: [
                            { "patientId": "" },
                            { "patientId": { $exists: false } }
                        ]
                    },
                    options: { lean: true }
                },
                ( err, cardios ) => {
                    if( err ) {
                        Y.log( "Error on getting cardio records " + ( err.message || err ), 'error' );
                        return callback( err );
                    }

                    let toAssignIds = [],
                        casefolderId;

                    async.eachSeries( cardios,
                        ( cardio, next ) => {
                            let
                                dataset = cardio.data && cardio.data.dataset,
                                reports = dataset && dataset.BIO && dataset.BIO.REQUEST && dataset.BIO.REQUEST.REPORTS,
                                exportMeta = cardio.data && cardio.data.meta;

                            attachToPatient( user, patientId, reports, dataset, exportMeta, ( err, activityData ) => {

                                if( !err ) {
                                    toAssignIds.push( cardio._id.toString() );
                                }
                                if( activityData && activityData.caseFolderId ){
                                    casefolderId = activityData.caseFolderId;
                                }
                                next( err );
                            } );
                        },
                        ( err ) => {
                            if( casefolderId ){
                                Y.doccirrus.communication.emitEventForSession( {
                                    sessionId: user.sessionId,
                                    event: 'refreshCaseFolder',
                                    msg: {
                                        data: {
                                            caseFolderId: casefolderId
                                        }
                                    }
                                } );
                            }
                            if( err ) {
                                Y.log( 'Error creating cardio activities ' + JSON.stringify( err ), 'error' );
                            }
                            if( toAssignIds.length ) {
                                Y.doccirrus.mongodb.runDb( {
                                        user: user || Y.doccirrus.auth.getSUForLocal(),
                                        model: 'cardio',
                                        action: 'put',
                                        query: { _id: { $in: toAssignIds } },
                                        options: {},
                                        fields: ["patientId", "patientName"],
                                        data: {
                                            patientId: patientId,
                                            patientName: patientName,
                                            skipcheck_: true,
                                            multi_: true
                                        }
                                    },
                                    ( err ) => {
                                        if( err ) {
                                            Y.log( 'Error on assigning patient to cardio record ' + ( err.message || err ), 'error' );
                                        }

                                        //remove tasks about unassigned serials
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user || Y.doccirrus.auth.getSUForLocal(),
                                            model: 'task',
                                            action: 'get',
                                            query: { cardioSerialNumber: cardioSerialNumber },
                                            options: { lean: true }
                                        }, ( err, tasks ) => {

                                            if( err ) {
                                                Y.log( 'Error on removing task on patient assign ' + ( err.message || err ), 'error', NAME );
                                            }
                                            if ( tasks ) {
                                                tasks.forEach( task => {
                                                    Y.doccirrus.communication.emitEventForSession( {
                                                        sessionId: user.sessionId,

                                                        messageId: task._id && task._id.toString(),
                                                        event: 'closeMessage'

                                                    } );
                                                } );
                                            }

                                        } );

                                        Y.doccirrus.communication.emitEventForSession( {
                                            sessionId: user.sessionId,
                                            event: 'patientPartnersHasChanged',
                                            msg: { data: 0 }
                                        } );

                                        callback( err );
                                    } );
                            } else {
                                return callback( null );
                            }

                        }
                    );

                } );
        }

        function clearPatientId( user, patientId, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user || Y.doccirrus.auth.getSUForLocal(),
                model: 'cardio',
                action: 'put',
                query: { "patientId": patientId },
                options: {},
                fields: ["patientId", "patientName"],
                data: {
                    patientId: "",
                    patientName: "",
                    skipcheck_: true,
                    multi_: true
                }
            },
            ( err, results ) => {
                if( err ) {
                    Y.log( 'Error on clearing patient in cardio records ' + ( err.message || err ), 'error' );
                } else {
                    if( results && results.length ) {
                        let serials = _.uniq( results.map( el => el.serialNumber ) || [] );
                        serials.forEach( serial => {
                            let result = results.filter( el => {
                                return el.serialNumber === serial;
                            } );
                            result = result && result[0];
                            taskAssignPatient( user, result, serial );
                        } );
                    }
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'patientPartnersHasChanged',
                    msg: { data: 0 }
                } );

                callback( err );
            } );
        }

        function getIndent( indentation ) {
            let indentString = "";
            for( let i = 0; i < indentation; i++ ) {
                indentString += "    ";
            }
            return indentString;
        }

        function getPrettyJson( obj, indentation ) {
            var printString = "";
            indentation = indentation || 0;

            if( Array.isArray( obj ) ) {
                obj.forEach( element => {
                    printString += "\n" + getIndent( indentation ) + getPrettyJson( element, indentation + 1 );
                } );
            } else if( 'object' === typeof obj ) {
                if( obj.constructor === Object ){
                    Object.keys( obj ).forEach( key => {
                        printString += "\n" + getIndent( indentation ) + key + ": ";
                        printString += getPrettyJson( obj[key], indentation + 1 );
                    } );
                } else if( obj.constructor === Date ){
                    return moment( obj ).utc().format( TIMESTAMP_FORMAT );
                } else {
                    return obj;
                }
            } else {
                return obj;
            }
            return printString;
        }

        /**
         * Creates an array of MedDataItems from the given object.
         * The MedDataItems will be structured as follows:
         * Sections will structure the key (aka. type in MedData language).
         * Values go into textValue or value, depending on the data type. (string or number)
         * <section name="MDC">
         *     <section name="IDC">
         *         <section name="DEV">
         *             <value name="TYPE" type="MDC_IDC_ENUM_DEV_TYPE">Monitor</value>
         *
         * Will become:
         *      type        = "MDC.ICD.DEV.TYPE"
         *      textValue   = "Monitor"
         * @param {object} xmlData
         * @param {object|undefined} options
         * @param {string|undefined} options.category
         * @param {string|undefined} options.separator
         * @param {object|undefined} options.attributes
         * @param {object|undefined} options.additionalData
         * @param {string[]} initialKeyTree
         * @return {MedDataItemSchema[]}
         */
        function getMedDataItems( xmlData, options, initialKeyTree ) {
            let
                /**
                 * Stores all MedDataItems created from the XML.
                 * @type {MedDataItemSchema[]}
                 */
                medDataItems = [],
                /**
                 * Array of all keys, to build up a nested key structure.
                 * @type {string[]}
                 */
                keyTree = Array.isArray( initialKeyTree ) ? initialKeyTree : [],
                /**
                 * Last element in the keyTree.
                 * @type {string|null}
                 */
                currentKeyElement = (keyTree.length > 0) ? keyTree[keyTree.length - 1] : null;

            // set default options, if not given
            if( typeof options !== "object" ) {
                options = {};
            }
            if( !Object.prototype.hasOwnProperty.call( options, "category" ) || typeof options.category !== "string" ) {
                options.category = "XML";
            }
            if( !Object.prototype.hasOwnProperty.call( options, "separator" ) || typeof options.separator !== "string" ) {
                options.separator = ".";
            }
            if( !Object.prototype.hasOwnProperty.call( options, "attributes" ) || typeof options.attributes !== "object" ) {
                options.attributes = {};
            }
            if( !Object.prototype.hasOwnProperty.call( options, "additionalData" ) || typeof options.additionalData !== "object" ) {
                options.additionalData = {};
            }

            if( Array.isArray( xmlData ) ) {
                /**
                 * If we deal with an array, run the function recursively on any element.
                 * Add the array index as new key element. Remove that element after each restructuring.
                 */
                xmlData.forEach( ( element, index ) => {
                    keyTree.push( index.toString() );
                    medDataItems.push( ...getMedDataItems( element, JSON.parse( JSON.stringify( options ) ), keyTree ) );
                    keyTree.pop();
                } );
            } else if( typeof xmlData === 'object' && !(xmlData instanceof Date) ) {
                /**
                 * Most of the time, we will deal with objects.
                 * If the value of the object[key] is not another object, we have found our parameter.
                 * Hence, we can create the new MedDataItem.
                 */
                if( xmlData.constructor === Object ) {
                    /**
                     * Special treatment of attributes and additional information,
                     * stored together with a data point.
                     * XML attributes were are actually merged into the object as suffix.
                     * @see biotronik-api.server.js
                     *
                     */
                    const
                        keys = Object.keys( xmlData ),
                        // filter all keys belonging to attributes
                        attributeKeys = keys.filter( key => {
                            if( key.endsWith( "_UNIT" ) ) {
                                options.attributes[key] = xmlData[key];
                                return true;
                            }
                            return false;
                        } ),

                        /**
                         * Filter all keys for keys of numeric values.
                         * If we have more than one numeric value, we add the parameters to all of them.
                         * NOTICE: THIS IS TEMPORARILY REMOVED. See the discussion in MOJ-12397.
                         * @type {string[]}
                         */
                        keysOfNumericValues = keys.filter( key => typeof xmlData[key] === "number" || xmlData[key] === "Null" );

                    /**
                     * NOTICE: THIS IS TEMPORARILY REMOVED. See the discussion in MOJ-12397.
                     * HENCE the check for < 0. To activate the grouping again, set the check to > 0.
                     */
                    if( keysOfNumericValues.length < 0 ) {
                        /**
                         * Conversion of data belonging to a single numeric data point into
                         * the additionalData property of a MedDataItem.
                         *
                         * example-input:
                         * "HEART_RATE": {
                         *      "DTM_START": "2018-12-11T01:27:04.000Z",
                         *      "DTM_END": "2018-12-12T01:27:00.000Z",
                         *      "VENTRICULAR_MEAN_UNIT": "{beats}/min",
                         *      "VENTRICULAR_MEAN": 78
                         * }
                         *
                         * example-output:
                         * MedDataItem({
                         *      type: "HEART_RATE.VENTRICULAR_MEAN",
                         *      value: 78,
                         *      unit: "{beats}/min",
                         *      additionalData: {
                         *          "DTM_START": ""2018-12-11T01:27:04.000Z",
                         *          "DTM_END": "2018-12-12T01:27:00.000Z"
                         *      }
                         * })
                         */
                        keysOfNumericValues.forEach( keyOfNumericValue => {
                            // create additionalData entries for all non-filtered keys
                            keys
                                .filter( key => key !== !keysOfNumericValues.includes( key ) && !attributeKeys.includes( key ) )
                                .forEach( key => {
                                    options.additionalData[MedDataItemSchema.createAdditionalDataKey( "TELECARDIO", options.category, key )] = xmlData[key];
                                } );

                            keyTree.push( keyOfNumericValue );
                            medDataItems.push( ...getMedDataItems( xmlData[keyOfNumericValue], JSON.parse( JSON.stringify( options ) ), keyTree ) );
                            keyTree.pop();
                        } );
                    } else {
                        // create MedDataItems for all non-filtered keys
                        keys
                            .filter( key => !attributeKeys.includes( key ) )
                            .forEach( key => {
                                keyTree.push( key );
                                medDataItems.push( ...getMedDataItems( xmlData[key], JSON.parse( JSON.stringify( options ) ), keyTree ) );
                                keyTree.pop();
                            } );
                    }

                    // reset attributes and additional data, as they were just valid for this group of keys
                    options.attributes = {};
                    options.additionalData = {};
                }
            } else {
                // create a new item
                const
                    unitKey = `${currentKeyElement}_UNIT`,
                    unit = Object.prototype.hasOwnProperty.call( options.attributes, unitKey ) ? options.attributes[unitKey] : "",
                    newMedDataItem = new MedDataItemSchema( {
                        category: options.category,
                        type: keyTree.join( options.separator ),
                        sampleNormalValueText: [],
                        unit: unit,
                        additionalData: options.additionalData
                    } );

                switch( true ) {
                    case xmlData instanceof Date:
                        newMedDataItem.textValue = moment( xmlData ).utc().format( TIMESTAMP_FORMAT );
                        break;
                    case typeof xmlData === "number":
                        newMedDataItem.value = xmlData;
                        break;
                    case typeof xmlData === "string":
                        newMedDataItem.textValue = xmlData;
                        break;
                    default:
                        newMedDataItem.textValue = xmlData.toString();
                }
                medDataItems.push( newMedDataItem );
            }

            return medDataItems;
        }

        let Cardio = function() {
            this.name = NAME;
            let cardio = this;

            cardio.checkServer = checkCardioServer;
            cardio.checkCardioServer = checkCardioServer;
            cardio.attachToPatientId = attachToPatientId;
            cardio.clearPatientId = clearPatientId;

            cardio.createAndAssignRecord = function( args ) {
                let path = require( 'path' ),
                    filename = args.path && path.parse( args.path );

                if( filename && filename.name && args.data ) {
                    let exportData = {
                        id: filename.name,
                        patient: '',
                        created_at: ''
                    };
                    addCardioDataIfNew( null, exportData, {}, args.data, args.callback );
                }

            };
            cardio.getPrettyJson = getPrettyJson;
            cardio.getMedDataItems = getMedDataItems;

            /**
             *  Test REST route to repeatedly trigger import, temporary, used  to repeatedly attach an activity while
             *  developing and making forms.
             *
             *  @param args
             */

            /*
            cardio.testAttach = async function( args) {
                let
                    cardioSerialNumber = '915008071',
                    patient = {
                        _id: '5c9a209eab4eb86d9c6d62f7',
                        lastName: 'Tarbuckle',
                        firstName: 'Jefferson'
                    };

                //  unassign cardio book entries for this device
                let
                    err, result,
                    updateRequest = {
                        user: args.user,
                        model: 'cardio',
                        action: 'update',
                        query: { serialNumber: cardioSerialNumber },
                        data: { $set: { patientId: '' } }
                    };

                [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( updateRequest ) )
                attachToPatientId( args.user, patient, cardioSerialNumber, args.callback );
            };
            */
        };

        /**
         * @class cardio
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).cardio = new Cardio();

        if( Y.doccirrus.ipc.isMaster() && ( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) ) {
            Y.doccirrus.kronnd.on( 'checkCardioServer', preServerCheck );
        }
    },
    '0.0.1',
    {
        requires: [
            'dcauth',
            'task-api',
            'admin-schema',
            'dclicmgr',
            'biotronik-api',
            'v_meddata-schema'
        ]
    }
);
