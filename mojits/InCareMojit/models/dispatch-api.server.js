/**
 * User: pi
 * Date: 30/09/2015  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict'; //eslint-disable-line

YUI.add( 'dispatch-api', function( Y, NAME ) {

        const async = require( 'async' ),
            ObjectID = require( 'mongodb' ).ObjectID,
            moment = require( 'moment' ),
            _ = require( 'lodash' ),
            util = require('util'),
            { formatPromiseResult, promisifiedCallback, handleResult } = require( 'dc-core' ).utils,
            INTERNAL = 'INTRNALsystemType',
            INCARE_DOQUVIDE_DQS_SYSTEM_TYPES = [
                Y.doccirrus.schemas.company.systemTypes.INCARE,
                Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS
            ];

        const
            alowedDestinations = { //note: used same for casefolder.aditionalTypes and company.systemTypes
                'internal': {
                    systemType: INTERNAL,
                    allowedTypes: ['reference', 'activeReference' ],
                    patientQuery:  []
                },
                'inSpectorLearningSystem': {
                    systemType: Y.doccirrus.schemas.company.systemTypes.INSPECTOR_LEARNING_SYSTEM,
                    allowedTypes: ['reference'],
                    patientQuery:  []
                },
                'inSpectorExpertSystem': {
                    systemType: Y.doccirrus.schemas.company.systemTypes.INSPECTOR_EXPERT_SYSTEM,
                    allowedTypes: ['reference'],
                    patientQuery:  []
                },
                'inSpectorSelectiveCareSystem': {
                    systemType: Y.doccirrus.schemas.company.systemTypes.INSPECTOR_SELECTIVECARE_SYSTEM,
                    allowedTypes: ['reference'],
                    patientQuery:  []
                },
                'care': {
                    systemType: Y.doccirrus.schemas.company.systemTypes.INCARE,
                    allowedTypes: ['activityDeleted', 'location', 'employee', 'patient', 'activitystatus', 'reference', 'prcSettings', 'prc', 'checkCaseFolder'],
                    patientQuery:  [
                        {partnerIds: {$elemMatch: {"partnerId" : Y.doccirrus.schemas.patient.DISPATCHER.INCARE}}}
                    ]
                },
                'doquvide': {
                    systemType: Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                    allowedTypes: ['activityDeleted', 'patient', 'reference', 'prc'],
                    patientQuery: [
                        {partnerIds: {$elemMatch: {
                            "partnerId" : Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                            $or: [
                                {"isDisabled": false},
                                {"isDisabled": {$exists: false}}
                            ]
                        }}},
                        {partnerIds: {$elemMatch: {
                            "partnerId" : Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                            $or: [
                                {"isDisabled": false},
                                {"isDisabled": {$exists: false}}
                            ]
                        }}}
                    ]
                },
                'dqs': {
                    systemType: Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                    allowedTypes: ['activityDeleted', 'patient', 'reference', 'prc'],
                    patientQuery:  [
                        {partnerIds: {$elemMatch: {
                            "partnerId" : Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                            $or: [
                                {"isDisabled": false},
                                {"isDisabled": {$exists: false}}
                            ]
                        }}},
                        {partnerIds: {$elemMatch: {
                            "partnerId" : Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                            $or: [
                                {"isDisabled": false},
                                {"isDisabled": {$exists: false}}
                            ]
                        }}}
                    ]
                }
            };

        function addNewTask( user, urgency, activityId ) {
            // creating new task
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "activity",
                action: 'get',
                query: {_id: activityId}

            }, function( err, activity ) {
                if( err ) {
                    Y.log( 'inCare Failed to get activity for task: ' + err.message, 'error', NAME );
                } else {

                    if( activity[0].actType.toString() === 'PROCESS' ||
                        activity[0].actType.toString() === 'PUBPRESCR' ||
                        activity[0].actType.toString() === 'PRESASSISTIVE' ) {
                        let actType = Y.doccirrus.i18n( 'activity-schema.Activity_E.' + activity[0].actType.toString() ),
                            text = Y.doccirrus.i18n( 'TaskModel.text.PRINT_ACT_TYPE' ).replace( '{actType}', actType ),
                            taskData = {
                                employeeId: activity[0].employeeId,
                                candidates: [activity[0].employeeId],
                                patientId: activity[0].patientId,
                                allDay: true,
                                alertTime: (new Date()).toISOString(),
                                title: text,
                                urgency: urgency,
                                details: text,
                                group: false,
                                roles: [Y.doccirrus.schemas.patient.DISPATCHER.INCARE],
                                activityId: activity[0]._id,
                                activityType: activity[0].actType,
                                creatorName: Y.doccirrus.i18n( 'dispatch.task.creatorName' )
                            };

                        if( activity[0].patientId ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: "patient",
                                action: 'get',
                                query: {_id: activity[0].patientId}
                            }, function( err, patient ) {
                                if( err ) {
                                    Y.log( 'inCare Failed to get patient for task: ' + err.message, 'error', NAME );
                                } else if( !patient.length ) {
                                    Y.log( `inCare Failed to get patient for task: patient not found. PatientId: ${activity[ 0 ].patientId}`, 'error', NAME );
                                } else {
                                    taskData.patientName = Y.doccirrus.schemas.person.personDisplay( {
                                        firstname: patient[0].firstname,
                                        lastname: patient[0].lastname,
                                        title: patient[0].title
                                    } );
                                    writeTask( user, taskData );

                                }
                            } );
                        } else {
                            writeTask( user, taskData );
                        }
                    }
                }
            } );
        }

        function writeTask( user, taskData ) {
            let cleanData = Y.doccirrus.filters.cleanDbObject( taskData );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "task",
                action: 'post',
                data: cleanData
            }, function( err ) {//, result
                if( err ) {
                    Y.log( 'inCare Failed to add task: ' + err.message, 'error', NAME );
                }
            } );
        }

        function logActivityReceive( activity, who ) {
            let description = Y.doccirrus.i18n( 'dispatchrequest.audit.prcReceive' ),
                entry = Y.doccirrus.api.audit.getBasicEntry( who, 'transfer', 'v_dispatch', description );

            entry.skipcheck_ = true;
            entry.objId = activity._id;

            return Y.doccirrus.api.audit.post( {
                user: who,
                data: entry
            } );
        }

        function addActivity( user, activityData, fileData ) {
            return new Promise( function( resolve, reject ) {
                // creating new activity
                let cleanData = Y.doccirrus.filters.cleanDbObject( activityData );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: "activity",
                    action: 'post',
                    data: cleanData
                }, function( err, result ) {
                    if( err ) {
                        Y.log( "InCarePost: Error" + err.message, 'error', NAME );
                        reject( err.message );
                    } else {
                        Y.log( "Added activity:  " + JSON.stringify( result[0] ), 'error', NAME );
                        logActivityReceive( activityData, user );
                        addNewTask( user, 2, result[0] );

                        if( fileData ) {
                            addFile( user, fileData, () => {
                                resolve( result );
                            } );
                        } else {
                            resolve( result );
                        }

                    }
                } );
            } );
        }

        function addFile( user, fileData, cb ) {
            Y.log( "Processing:\n  " + fileData.id + "\n  " + fileData.name, 'error', NAME );

            Y.doccirrus.api.activity.saveFile( {
                user: user,
                query: {
                    targetId: fileData.id,
                    from: 'casefile',
                    file: {
                        name: fileData.name,
                        filename: fileData.name,
                        dataURL: fileData.content
                    }

                },
                callback: ( err ) => {
                    if( err ) {
                        Y.log( "Adding file error:  " + JSON.stringify( err ), 'error', NAME );
                    }

                    cb();
                }
            } );

        }

        function updatePatientId( user, patientData ) {
            return new Promise( function( resolve, reject ) {
                // creating new activity

                let cleanData = Y.doccirrus.filters.cleanDbObject( patientData );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: "patient",
                    action: 'put',
                    query: {_id: cleanData._id},
                    data: cleanData,
                    fields: ['partnerIds']
                }, function( err, result ) {
                    if( err ) {
                        Y.log( "Update patient ID: Error" + err.message, 'error', NAME );
                        reject( err.message );
                    } else {
                        resolve( result );
                    }
                } );

            } );
        }

        function getLocation( user, locationId, employeeId, cb ) {
            if( employeeId ) {
                cb( employeeId );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'employee',
                query: {
                    'locations._id': locationId
                },
                options: {
                    limit: 1,
                    select: {
                        _id: 1
                    }
                }
            }, function( err, results ) {
                if( err ) {
                    return cb( null );
                }
                cb( results[0] && results[0]._id.toString() );
            } );
        }

        function getCaseFolder( user, patientId ) {
            return new Promise( ( resolve ) => {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'get',
                    query: {_id: patientId}
                }, function( err, patient ) {

                    if( !patient || !patient.length ) {
                        Y.log( 'Patient not found, returning default casefolder: ', 'error', NAME );
                        resolve( null );
                        return;
                    }

                    let type = null;
                    if( err ) {
                        Y.log( 'InCare  getCaseFolder patient querying error: ' + err.message, 'error', NAME );
                    } else {
                        let inCarePartners = patient[0].partnerIds.filter( ( el ) => {
                            return el.partnerId === Y.doccirrus.schemas.casefolder.additionalTypes.INCARE;
                        } );
                        if( inCarePartners && inCarePartners[0] && inCarePartners[0].insuranceType ) {
                            type = inCarePartners[0].insuranceType;
                        }
                    }

                    let insuranceStatus = patient[0].insuranceStatus.filter( ( el ) => {
                                return el.type === type;
                            } ) || [],
                        locationId = null,
                        employeeId = null;

                    if( insuranceStatus[0] ) {
                        locationId = insuranceStatus[0].locationId;
                        employeeId = insuranceStatus[0].employeeId;
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'get',
                        query: {
                            patientId: patientId,
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.INCARE,
                            type: type
                        },
                        options: {
                            lean: true,
                            limit: 1
                        }
                    }, function( err, res ) {

                        if( err ) {
                            Y.log( 'InCare CaseFolder get error:' + err.message, 'error' );
                            resolve( null );
                        } else if( !res[0] ) {
                            let caseFolderData = {
                                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.INCARE,
                                patientId: patientId,
                                // MOJ-14319:[OK]
                                title: Y.doccirrus.i18n( 'casefolder-schema.Additional_E.INCARE.i18n' ) +
                                       ((Y.doccirrus.schemas.patient.isPublicInsurance( {type: type} )) ? ' (GKV)' : '') +
                                       ((Y.doccirrus.schemas.patient.isPrivateInsurance( {type: type} )) ? ' (PKV)' : ''),
                                type: type
                                //, start: (new Date()).toISOString()
                            };
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'casefolder',
                                action: 'post',
                                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                            }, function( err, res ) {
                                if( err ) {
                                    Y.log( 'InCare CaseFolder post error:' + err.message, 'error' );
                                    resolve( null );
                                } else {
                                    //Creating SCHEIN activity

                                    let actTypeMap = Y.doccirrus.schemas.activity.getInsuranceScheinMap();
                                    getLocation( user, locationId, employeeId, ( newEmloyeeId ) => {

                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'activity',
                                            action: 'post',
                                            data: Y.doccirrus.filters.cleanDbObject( {
                                                caseFolderId: res[0],
                                                actType: actTypeMap[type],
                                                patientId: patientId,
                                                locationId: locationId || '000000000000000000000001',
                                                employeeId: newEmloyeeId,
                                                scheinType: '0101',
                                                scheinSubgroup: '00',
                                                scheinYear: moment().year(),
                                                scheinQuarter: moment().quarter(),
                                                timestamp: new Date(),
                                                status: "VALID"
                                            } )
                                        }, function( err ) {
                                            if( err ) {
                                                Y.log( 'InCare CaseFolder SCHEIN creation error:' + err.message, 'error' );
                                            }
                                            resolve( res[0] );
                                        } );
                                    } );

                                }
                            } );
                        } else {
                            resolve( res[0]._id && res[0]._id.toString() );
                        }
                    } );
                } );
            } );
        }

        function getModelData( user, model ) {
            return new Promise( ( resolve ) => {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'get',
                    options: {
                        lean: true
                    }
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( 'Dispatch api model ' + model + '; error ' + err.message, 'error', NAME );
                        resolve( [] );
                    } else {

                        resolve( result );
                    }
                } );
            } );
        }


        function processPatientData( user, patient, practice, anonymize = false, systemType ){
            let
                pcnt = JSON.parse(JSON.stringify(patient));
            if( anonymize ) {
                pcnt = Y.doccirrus.api.activityTransfer.anonimyzePatient( user, {}, pcnt, systemType );
            }

            pcnt.prcCustomerNo = practice.dcCustomerNo;
            pcnt.customerNo = practice.customerNo;
            pcnt.prcCoName = practice.coname;

            pcnt.fields_ = Object.keys( pcnt ).filter( ( item ) => item !== '__v' );
            return pcnt;
        }

        function getPatientsData( user, systemType ) {
            const
                CARDIO = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO;

            return new Promise( ( resolve ) => {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'get',
                    query: {
                        $and: [
                            { mirrorPatientId: {$exists: false, $not : { $type : 10 }} },
                            { partnerIds: {
                                $elemMatch: {
                                    partnerId: systemType,
                                    $or: [{isDisabled: false}, {isDisabled: {$exists: false}}]
                                }
                            } },
                            { partnerIds: {
                                $elemMatch: {
                                    partnerId: CARDIO,
                                    $or: [{isDisabled: false}, {isDisabled: {$exists: false}}]
                                }
                            } }
                        ]
                    },
                    options: {
                        lean: true
                    }
                }, ( err, results ) => {
                    if( err ) {
                        Y.log( 'Error on getting patient count ' + err.message, 'error', NAME );
                        resolve( [] );
                    } else {
                        resolve( results );
                    }
                } );
            } );
        }

        function waitForAuth() {
            return new Promise( ( resolve ) => {
                if( Y.doccirrus.auth.isReady() ) {
                    resolve();
                }
                else {
                    Y.doccirrus.auth.onReady( resolve() );
                }
            } );
        }

        function getSpecialModules( user ) {
            return new Promise( ( resolve ) => {
                waitForAuth().then( () => {
                    if( !user.tenantId && 0 !== user.tenantId ) {
                        resolve( [] );
                    } else {
                        resolve( Y.doccirrus.licmgr.getSpecialModules( user.tenantId ) );
                    }
                } );
            } );
        }

        function logDataSynchro( who, type, data ){

            let translation;
            switch( type ) {
                case "employee":
                    translation = 'activity-schema.Activity_T.employeeName.i18n';
                    break;
                case "location":
                    translation = 'activity-schema.Activity_T.locationId.i18n';
                    break;
                case "patient":
                    translation = 'task-schema.Task_T.patient.i18n';
                    break;
                case "activity":
                    translation = 'task-schema.Task_T.activityId.i18n';
                    break;
                default:
                //do not audited other synchronisations like file chanks etc.
            }

            if( !translation ) {
                return;
            }

            let objectName = Y.doccirrus.i18n( translation ),
                description = Y.doccirrus.i18n( 'dispatchrequest.audit.prcSend' ),
                entry = Y.doccirrus.api.audit.getBasicEntry( who, 'transfer', 'v_synchro', `${description} (${objectName})` );

            entry.skipcheck_ = true;

            if( data && data._id ) {
                entry.objId = data._id;
            }

            return Y.doccirrus.api.audit.post( {
                user: who,
                data: entry
            } );
        }


        function sendPRCdispatch( user, payload, systemType, cb ) {
            if( !cb ) {
                cb = function() {
                };
            }

            systemType = Y.doccirrus.dispatchUtils.getModuleSystemType( user.tenantId, systemType );

            Y.doccirrus.api.admin.getPRCPublicData( // the user object determines the subject tenant
                user,
                function( err, pubData ) {
                    if( err || !pubData || (!pubData.dcCustomerNo && !pubData.systemType ) || !pubData.host ) { // report and skip
                        Y.log( 'error in registering PRC on PUC: ' + JSON.stringify( err || 'no dcCustomerNo/host' ) + ' pubData:' + JSON.stringify( pubData ), 'error', NAME );

                    } else {

                        payload.practice.hostname = pubData.host;

                        Y.log( 'PRC data sent to (' + systemType + ')... ' + JSON.stringify( payload ), 'debug', NAME );

                        Y.doccirrus.communication.callExternalApiBySystemType( {
                            api: 'prcsynchro.post',
                            user: user,
                            data: payload,
                            query: {},
                            useQueue: true,
                            systemType: Y.doccirrus.dispatchUtils.getModuleSystemType( user && user.tenantId, systemType ),
                            options: {},
                            callback: function( err ) { //, result
                                if( err ) {
                                    Y.log( 'PRC synchronization error:' + JSON.stringify( err ), 'warn', NAME );
                                } else {
                                    if(payload.activities && payload.activities.length){ //now along with activity other collection are transfered, so no need to log this fact
                                        (payload.activities || []).map( ( act ) => logDataSynchro( user, 'activity', act ) );
                                    } else {
                                        (payload.locations || []).map( ( lctn ) => logDataSynchro( user, 'location', lctn ) );
                                        (payload.employees || []).map( ( emp ) => logDataSynchro( user, 'employee', emp ) );
                                        (payload.patients || []).map( ( pcnt ) => logDataSynchro( user, 'patient', pcnt ) );
                                    }
                                }
                                cb();
                            }
                        } );
                    }
                }
            );
        }

        function inSynchroCaseFile( user, caseFolderId, systemType ) {
            return new Promise( ( resolve ) => {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'get',
                    query: {
                        _id: caseFolderId,
                        additionalType: systemType
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                }, function( err, res ) {
                    if( err ) {
                        Y.log( 'InCare activity synchronization error:' + err.message, 'error' );
                        resolve( false );
                    } else if( res[0] ) {
                        resolve( true );
                    } else {
                        resolve( false );
                    }
                } );
            } );
        }

        function inSynchroCaseFileActivity( user, activityId, systemType, patientQuery ) {

            //  this can happen when attaching media to an activity which is not yet saved
            //  in this case the media is stored with a temporary random _id and not a valid Mongo _id
            if ( !activityId || 24 !== activityId.length || /[^0-9a-f]/.test( activityId.toLowerCase() ) ) {
                return Promise.resolve( null );
            }

            return new Promise( ( resolve ) => {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: activityId
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                }, function( err, activity ) {
                    if( err ) {
                        Y.log( 'Error on getting activity for synchronization: ' + err.message, 'error', NAME );
                        resolve( null );
                        return;
                    }
                    if( !activity[0] ) {
                        //activity can not be found for media, documents
                        resolve( null );
                        return;
                    }

                    let casefolderQuery = { _id: activity[0].caseFolderId };
                    if ( INCARE_DOQUVIDE_DQS_SYSTEM_TYPES.includes(systemType) ) {
                        casefolderQuery.additionalType = systemType;
                    }

                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'casefolder',
                            action: 'get',
                            query: casefolderQuery,
                            options: {
                                lean: true,
                                limit: 1
                            }
                        }, function( err, casefolders ) {

                            if( err ) {
                                Y.log( 'Checking synchro casefolder error:' + err.message, 'error', NAME );
                                resolve( null );
                            } else if( casefolders[0] ) {
                                //check if Patient is INCARE
                                let query = {
                                    $and: [
                                        {_id: activity[0].patientId},
                                        ...patientQuery
                                    ]
                                };
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'patient',
                                    action: 'get',
                                    query: query
                                }, function( err, patient ) {

                                    if( err ) {
                                        Y.log( 'InCare document synchronization on patient error:' + err.message, 'error', NAME );
                                        resolve( null );
                                    } else if( patient[0] ) {
                                        resolve( {
                                            activity: activity[0],
                                            casefolder: casefolders[0],
                                            patient: patient[0]
                                        } );
                                    } else {
                                        resolve( null );
                                    }

                                } );
                            } else {
                                resolve( null );
                            }
                        }
                    );
                } );
            } );
        }

        function postFileMeta( user, model, obj, cb ) {

            Y.doccirrus.media.gridfs.saveFileMeta( user, obj, false, false, ( err, result ) => {
                if( err && err.code === 11000 ) {
                    Y.log( model + ' (' + obj._id + ') already exist, Skipped.', 'warn', NAME );
                    err = null;
                }
                cb( err, result );
            } );
        }

        function postFileChunks( user, model, obj, cb ) {
            if( !Array.isArray( obj ) ) {
                obj = [obj];
            }
            async.each( obj, ( chunk, next ) => {
                let chunkCopy = Object.assign( chunk, {
                    files_id: new ObjectID( chunk.files_id )
                } );
                Y.doccirrus.media.gridfs.saveChunk( user, chunkCopy, false, false, ( err, result ) => {
                    if( err && err.code === 11000 ) {
                        Y.log( model + ' (' + chunkCopy._id + ') already exist, Skipped.', 'warn', NAME );
                        err = null;
                    }
                    next( err, result );
                } );
            }, ( error ) => {
                cb( error );
            } );

        }

        function postModel( user, modelName, obj, cb ) {

            Y.doccirrus.mongodb.getModel( user, modelName, ( err, model ) => {
                if( err ) {
                    Y.log( 'Error during inserting ' + modelName + ' ' + JSON.stringify( err ), 'error', NAME );
                    return cb( err );
                }
                let data = Y.doccirrus.filters.cleanDbObject( obj );
                data = (new model.mongoose( data )).toObject();
                Y.doccirrus.mongodb.runDb( {
                        user,
                        model: modelName,
                        action: 'mongoInsertOne',
                        data
                    }, ( error ) => {
                        if( error && 11000 === error.code ) {
                            Y.log( modelName + ' (' + obj._id + ') already exist, Skipped.', 'warn', NAME );
                            error = null;
                        }
                        cb( error );
                    }
                );
            } );
        }

        function postEmployee( args, obj, cb ) {
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'employee',
                action: 'get',
                query: {_id: obj._id},
                options: {lean: true}
            }, function( err, res ) {
                if( err ) {
                    Y.log( 'Getting employee error:' + err.message, 'error', NAME );
                    return cb( err );
                }
                if( res [0] ) {
                    Y.log( 'Employee (' + obj._id + ') already exist, Skipped.', 'warn', NAME );
                    return cb( null );
                }
                let argsCopy = Object.assign( {}, args );

                argsCopy.callback = cb;
                argsCopy.data = obj;
                argsCopy.data.username = argsCopy.data.username || argsCopy.data.lastname;
                argsCopy.data.memberOf = argsCopy.data.memberOf || [];

                Y.doccirrus.api.user.post( argsCopy );
            } );

        }

        function finishRestore( user, cb ) {
            Y.doccirrus.mongodb.getModel( user, 'settings', ( error, model ) => {
                if( error ) {
                    Y.log( 'Error during set restore status ' + JSON.stringify( error ), 'error', NAME );
                    return cb( error );
                }
                model.mongoose.update(
                    {},
                    {isRestoreFromISCD: false},
                    {multi: true},
                    ( error ) => {
                        if( error ) {
                            Y.log( 'Error during restore status ' + JSON.stringify( error ), 'error', NAME );
                        } else {
                            Y.doccirrus.communication.emitEventForSession( {
                                sessionId: user.sessionId,
                                event: 'message',
                                msg: {data: Y.doccirrus.i18n( 'dispatch.restore_success' )}
                            } );
                        }
                        cb( error );
                    }
                );
            } );
        }

        async function setPracticeInPayload( user, payload = {}, cb ) {
            const
                practices = await getModelData( user, 'practice' ),
                practice = practices && practices[0];

            payload.practice = _.pick( practice, ['dcCustomerNo', 'customerNo', 'coname', 'cotype', 'activeState', 'lastOnline', 'addresses', 'communications', 'centralContact'] );
            payload.practice.lastOnline = practice.lastOnline || new Date();
            payload.practice.version = Y.config.insuite && Y.config.insuite.version;
            payload.practice.prcCustomerNo = payload.practice.dcCustomerNo;
            payload.practice.customerId = '';
            if( practice.restoreStatus ) {
                payload.practice.restoreStatus = practice.restoreStatus;
            }

            return handleResult( null, payload, cb );
        }

        function syncLocation( user, lctn, systemType ){
            setPracticeInPayload( user, {}, (err, payload) => {
                if(err){
                    Y.log('Error setting practice in sync location ' + err.message, 'error', NAME );
                }
                lctn.prcCustomerNo = payload.practice.dcCustomerNo;
                payload.locations = [ lctn ];
                sendPRCdispatch( user, payload, systemType );
            } );
        }

        function syncEmployee( user, empl, systemType ){
            setPracticeInPayload( user, {}, (err, payload) => {
                if(err){
                    Y.log('Error setting practice in sync employee ' + err.message, 'error', NAME );
                }
                empl.prcCustomerNo = payload.practice.dcCustomerNo;
                payload.employees = [ empl ];
                sendPRCdispatch( user, payload, systemType );
            } );
        }

        function syncPatient( user, patient, systemType ){
            const
                DOQUVIDE = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                DQS = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS;

            setPracticeInPayload( user, {}, (err, payload) => {
                if(err){
                    Y.log('Error setting practice in sync patient ' + err.message, 'error', NAME );
                }
                payload.patients = [ processPatientData(user, patient, payload.practice, ( systemType === DOQUVIDE || systemType === DQS ), systemType ) ];
                sendPRCdispatch( user, payload, systemType );
            } );
        }

        function syncPRCSettings( user, options, systemType ){
            setPracticeInPayload( user, {}, (err, payload) => {
                if(err){
                    Y.log('Error setting practice in sync PRC ' + err.message, 'error', NAME );
                }
                payload.practice = Object.assign(payload.practice, options);
                payload.updatePractice = true;
                sendPRCdispatch( user, payload, systemType );
            } );
        }

        /**
         * @param {object} args
         * @param {object} args.user
         * @param {string[]} args.activityIds
         * @param {boolean} args.anonymize
         * @param {boolean} [args.noTransferOfLinkedActivities=false]
         * @param {string} args.systemType
         * @param {function(err, payload)} [args.callback]
         * @returns {Promise<object>} payload created
         */
        async function createPayloadExternal( args ){
            const
                {
                    user,
                    activityIds,
                    anonymize,
                    systemType,
                    noTransferOfLinkedActivities = false,
                    callback = promisifiedCallback
                } = args;

            let payload, err;
            [err, payload] = await formatPromiseResult( Y.doccirrus.api.activityTransfer.createPayload( {
                user,
                activityIds,
                filters: {
                    activity: {
                        map: ( activity ) => {
                            activity.patientShort = "";
                            activity.patientName = "";
                            activity.patientFirstName = "";
                            activity.patientLastName = "";
                            activity.fields_ = Object.keys( activity ).filter( ( item ) => item !== '__v' );
                            return activity;
                        }
                    }
                },
                anonymizePatientImages: anonymize,
                noTransferOfLinkedActivities
            } ) );

            if( err ) {
                Y.log( 'createPayloadExternal: Error creating payload ' + err.message, 'error', NAME );
                return callback( err );
            }

            [err, payload] = await formatPromiseResult( setPracticeInPayload( user, payload ) );

            if( err ) {
                Y.log( 'createPayloadExternal: Error setting practices in payload ' + err.message, 'error', NAME );
                return callback( err );
            }

            payload.patients = [ processPatientData(user, payload.patient, payload.practice, anonymize, systemType) ];

            delete payload.patient;
            delete payload.basecontacts;

            return callback( null, payload );
        }

        function syncPRC( user, options, systemType ){
            const DOQUVIDE = Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE,
                DQS = Y.doccirrus.schemas.casefolder.additionalTypes.DQS;

            Y.log( systemType + ' PRC startup detected...', 'info', NAME );
            setPracticeInPayload( user, {}, ( err, payload ) => {
                if(err){
                    Y.log('Error setting practice in sync prc data ' + err.message, 'error', NAME );
                }
                if( options && options.hasOwnProperty( 'activeState' ) ) {
                    Y.log( 'Practise state is: ' + options.activeState, 'info', NAME );
                    payload.practice.activeState = options.activeState;
                }

                if( payload.practice.activeState ) {
                    // synchronize collections
                    let patientPromise = ( systemType === DOQUVIDE || systemType === DQS ) ? getPatientsData : () => {
                        return Promise.resolve( [] );
                    };

                    Promise.all( [getModelData( user, 'employee' ), getModelData( user, 'location' ), patientPromise( user, systemType )] ).then( ( values ) => {
                        if( values[0].length ) {
                            payload.employees = values[0].map( empl => {
                                empl.prcCustomerNo = payload.practice.dcCustomerNo;
                                return empl;
                            } );
                        }

                        if( values[1].length ) {
                            payload.locations = values[1].map( lctn => {
                                lctn.prcCustomerNo = payload.practice.dcCustomerNo;
                                return lctn;
                            } );
                        }
                        if( values[2].length ) {
                            payload.patients = values[2].map( pcnt => {
                                return processPatientData( user, pcnt, payload.practice, true, systemType );
                            } );
                        }
                        sendPRCdispatch( user, payload, systemType );
                    } );
                } else {
                    payload.updatePractice = true;
                    sendPRCdispatch( user, payload, systemType );
                }
            } );
        }

        async function addToQueue( user, entityName, entryId, addedFrom, systemType, partners ){

            let
                activePasive= (partners || []).filter( el => !el.activeActive ),
                err;

            if( activePasive.length ){
                let data = {
                    entryId,
                    entityName,
                    systemType,
                    timestamp: new Date(),
                    addedFrom: addedFrom,
                    partners: activePasive,
                    skipcheck_: true
                };

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'upsert',
                        query: {
                            entryId,
                            entityName,
                            systemType,
                            sequenceNo: {$exists: false}
                        },
                        model: 'syncdispatch',
                        data,
                        options: { omitQueryId: true }
                    } )
                );
                if( err ){
                    Y.log( `addToQueue: Error on adding to syncdispach activePasive ${JSON.stringify(data)} : ${err.stack || err}`, 'error', NAME);
                }
                Y.log( `addToQueue: Added new activity sync request to syncdispach activePasive ${data.addedFrom} to ${data.systemType}`, 'info', NAME );
            }
        }

        async function addToQueueActive( user, entityName, entryId, addedFrom, systemType, partners, onDelete, lastChanged ){
            const
                getNextAASequenceNo = util.promisify( Y.doccirrus.schemas.sysnum.getNextAASequenceNo );

            let
                activeActive = (partners || []).filter( el => el.activeActive ),
                err,
                sequenceNo;

            if( activeActive.length ){

                let data = {
                    entryId,
                    entityName,
                    systemType,
                    timestamp: new Date(),
                    addedFrom: addedFrom,
                    partners: activeActive,
                    lastChanged,
                    onDelete,
                    skipcheck_: true
                };

                let result;
                [ err, result ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'count',
                        query: {
                            entryId,
                            entityName,
                            systemType,
                            onDelete,
                            sequenceNo: {$exists: true}
                        },
                        model: 'syncdispatch'
                    } )
                );
                if( err ){
                    Y.log( `addToQueue: Error on counting syncdispach activeActive ${JSON.stringify(data)} : ${err.stack || err}`, 'error', NAME);
                    throw( err );
                }
                if( result !== 0){
                    return;
                }
                [err, sequenceNo ] = await formatPromiseResult(
                    getNextAASequenceNo( user )
                );
                data.sequenceNo = sequenceNo.number;
                if( err || !sequenceNo || !sequenceNo.number ){
                    Y.log( `addToQueue: Error on getting next activeActive sequence number: ${err.stack || err}`, 'error', NAME);
                    throw( err );
                }

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'post',
                        model: 'syncdispatch',
                        data
                    } )
                );
                if( err ){
                    Y.log( `addToQueue: Error on adding to syncdispach activeActive ${JSON.stringify(data)} : ${err.stack || err}`, 'error', NAME);
                }
                Y.log( `addToQueue: Added new activity sync request to syncdispach activeActive ${data.addedFrom} to ${data.systemType}`, 'info', NAME );
            }
        }

        async function getFromQueue( user, activeActive = false ){
            let
                pastDate = moment().subtract( 1, 'minutes' ).toDate(),
                query = {
                    timestamp: {$lte: pastDate},
                    sequenceNo: {$exists: activeActive}
                };
            if( !activeActive ){
                query.entityName = {$in: ['activity', 'activitystatus']};
                query.onDelete = {$exists: false};
            }

            let err, results;
            [ err, results ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    query,
                    model: 'syncdispatch',
                    options: { sort: { timestamp: 1 } }
                } )
            );
            if( err ){
                Y.log( `getFromQueue: Error on getting syncdispatch ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            let idsToDelete = (results || []).map( el => {
                return el._id.toString();
            } );

            if(!idsToDelete.length){
                return;
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'delete',
                    model: 'syncdispatch',
                    query:  {
                        _id: {$in: idsToDelete}
                    },
                    options: {
                        override: true
                    }
                } )
            );
            if( err ){
                Y.log( `getFromQueue: Error on deleting syncdispatch ${err.stack || err}`, 'error', NAME );
                throw( err );
            }
            return results;
        }

        function inSynchroDeleteActivity( user, activityDelete, systemType ){
            return new Promise(resolve => {
                let casefolderQuery = { _id: activityDelete.caseFolderId };
                if ( INTERNAL !== systemType ){
                    casefolderQuery.additionalType = systemType;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'get',
                    query: casefolderQuery,
                    options: {
                        lean: true,
                        limit: 1
                    }
                }, function( err, casefolders ) {
                    if( err ) {
                        Y.log( 'Getting casefolder for deleted activity error:' + err.message, 'error', NAME );
                        return resolve( null );
                    }

                    resolve( {
                        activity: activityDelete,
                        casefolder: casefolders && casefolders[0] || []
                    } );
                } );
            } );

        }

        function checkActivitySynchronization( user, activityId, systemType, patientQuery, activityDelete, callback ){
            let
                isAmts = Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO )
                         || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC )
                         || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI ),
                promise = (!activityDelete) ?
                    inSynchroCaseFileActivity( user, activityId, systemType, patientQuery ) :
                    inSynchroDeleteActivity( user, activityDelete, systemType );

            promise.then( ( inSyncActivityCaseFolder ) => {
                if( !inSyncActivityCaseFolder ) {
                    return callback(null, []);
                }

                if( inSyncActivityCaseFolder.activity && inSyncActivityCaseFolder.activity.mirrorActivityId) {
                    Y.log( 'skipped transfer for transferred activity ' + inSyncActivityCaseFolder.activity._id.toString(), 'info', NAME );
                    return callback(null, []);
                }

                let caseFolders = [inSyncActivityCaseFolder.casefolder.type, inSyncActivityCaseFolder.casefolder.additionalType, 'ALL'].filter( el => el ),
                    query = {
                        bidirectional: true,
                        activeActive: {$ne: true},
                        status: {$in: ['CONFIRMED', 'LICENSED']},
                        configuration: {$elemMatch: {
                            $and: [
                                {automaticProcessing: true},
                                {actTypes: {$in: [inSyncActivityCaseFolder.activity.actType, 'ALL'] }},
                                {actStatuses: {$in: [inSyncActivityCaseFolder.activity.status, 'ALL'] }},
                                {caseFolders: {$in: caseFolders }}
                            ]
                        }}};

                if(inSyncActivityCaseFolder.activity.subType){
                    query.configuration.$elemMatch.$and.push( { $or: [
                        { subTypes: {$in: [ inSyncActivityCaseFolder.activity.subType.trim() ] } },
                        { subTypes: {$exists: false} },
                        { subTypes: { $size: 0 } }
                    ] } );
                } else {
                    query.configuration.$elemMatch.$and.push( { $or: [
                        { subTypes: {$exists: false} },
                        { subTypes: { $size: 0 } }
                    ] } );
                }

                if(INTERNAL === systemType){
                    query.status = 'CONFIRMED';
                    query.$or = [
                        { systemType: {$exists: false} },
                        { systemType: '' }
                    ];
                } else if( Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE === systemType ||
                      Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS === systemType ){
                    query.status = 'LICENSED';
                    query.dcId = systemType;
                    query.systemType = 'DSCK';
                } else {
                    query.status = 'LICENSED';
                    query.systemType = systemType;
                }

                /**
                 * for systems where AMTS activated allow to send activities
                 * to partners that selected condition only for patients with matching condition
                  */
                if( isAmts ) {
                    let
                        conditionQuery = Y.doccirrus.schemas.partner.getPartnerQueryForAmts( inSyncActivityCaseFolder.patient );

                    Array.prototype.push.apply(query.configuration.$elemMatch.$and, conditionQuery);
                }

                Y.log('Looking for partners for systemType: ' + systemType + ' q:' + JSON.stringify(query), 'debug', NAME );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'partner',
                    query: query
                }, callback );

            } );
        }

        /**
         * @method processQueue
         * @public
         *
         * called by event-catcher as reaction on cron
         *
         * process syncdispatches collection in order to get all records that path time threshold in 1 minute and dispatch it to partners,
         * processed records deleted, if error occurred during communication dispatch is stored in socketioevents to re-try
         *
         * @param {Object} user
         *
         */
        async function processQueue( user ){
            let err, results;
            [ err, results ] = await formatPromiseResult(
                getFromQueue( user, false )
            );
            if( err ){
                Y.log( `processQueue: Error on processing sync dispatcher activePasive ${err.status || err}`, 'error', NAME );
            } else {
                for (let result of (results || [])){
                    switch ( result.entityName ){
                        case 'activity': {
                            [ err ] = await formatPromiseResult(
                                new Promise( (resolve, reject) => {
                                    Y.doccirrus.api.activityTransfer.transfer( {
                                        user: user,
                                        data: {
                                            activityIds: [result.entryId],
                                            automaticTransfer: true,
                                            partners: result.partners
                                        },
                                        callback: ( err ) => {
                                            if( err ) {
                                                return reject( err );
                                            }
                                            resolve();
                                        }
                                    } );
                                } )
                            );

                            if(err && err.validationResult){
                                Y.log( `End of synchronization ${result.entryId} to ${result.systemType} finished with validation errors`, 'warn', NAME );

                                //push record back to syncdispatch for reprocess
                                let [ error ] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        action: 'post',
                                        model: 'syncdispatch',
                                        data: {
                                            ...result,
                                            timestamp: moment().add(10, 'minutes').toDate(),
                                            skipcheck_: true
                                        }
                                    } )
                                );
                                if( error ){
                                    Y.log( `processQueue: Error on pushing syncdispatch ${JSON.stringify(result)} back to queue: ${error.stack || error}`, 'error', NAME );
                                }
                            } else if( err ){
                                Y.log( `End of synchronization ${result.entryId} to ${result.systemType} finished with error: ${err.message}`, 'error', NAME );
                            } else {
                                Y.log( `End of synchronization ${result.entryId} to ${result.systemType}`, 'info', NAME );
                            }
                            break;
                        }

                        case 'activitystatus': {
                            let payload;
                            [ err, payload ] = await formatPromiseResult( setPracticeInPayload( user, {} ) );
                            if(err){
                                Y.log( `processQueue: Error on setting Practice in payload ${err.status || err}`, 'error', NAME );
                            } else {
                                payload.practice.prcCustomerNo = payload.practice.dcCustomerNo;
                                payload.tasks = [
                                    {activityId: result.entryId}
                                ];

                                sendPRCdispatch( user, payload, Y.doccirrus.schemas.company.systemTypes.INCARE);
                            }
                            break;
                        }
                        default:
                            Y.log( `processQueue: Unknown synchro entity ${JSON.stringify(result)}`, 'warn', NAME );
                    }
                }
            }

            //ActiveActive
            [ err, results ] = await formatPromiseResult(
                getFromQueue( user, true )
            );
            if( err ){
                Y.log( `processQueue: Error on processing sync dispatcher activeActive ${err.status || err}`, 'error', NAME );
                return;
            }
            if(!results || !results.length){
                return;
            }

            let payload;
            [ err, payload ] = await formatPromiseResult( setPracticeInPayload( user, {} ) );
            if( err ){
                Y.log( `processQueue: Error getting practice for activeActive ${err.stack || err}`, 'error', NAME );
                return;
            }

            payload = { dcCustomerNo: payload && payload.practice && payload.practice.dcCustomerNo };

            for (let result of results){

                //push records in archive collection
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'upsert',
                        model: 'syncdispatcharchive',
                        data: {
                            ...result,
                            skipcheck_: true
                        }


                    } )
                );
                if( err ){
                    Y.log( `processQueue: Error on pushing into syncdispatcharchive :  ${err.stack || err}`, 'error', NAME );
                }

                let docs;
                if( !result.onDelete ){
                    [ err, docs ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: result.entityName,
                            query: {_id: result.entryId}
                        } )
                    );
                    if( err ){
                        Y.log( `processQueue: Error getting ${result.entityName}.${result.entryId} activeActive ${err.stack || err}`, 'error', NAME );
                        return;
                    }
                }
                if( !docs || !docs.length ){
                    result.onDelete = true; // record not found then it have been deleted in meantime
                }

                let preparedPayload = JSON.stringify( {payload: {
                        ...payload,
                        doc: docs && docs[0],
                        lastChanged: result.lastChanged,
                        onDelete: result.onDelete,
                        sequenceNo: result.sequenceNo,
                        entityName: result.entityName,
                        entryId: result.entryId
                    } } );

                for(let partner of (result.partners || [])){
                    let [ err ] = await formatPromiseResult(
                        Y.doccirrus.api.activityTransfer.callExternalApiByCustomerNo( user, partner.dcId, 'activityTransfer.receiveActive', { payload: preparedPayload} )
                    );
                    if( err ){
                        Y.log( `processQueue: Error sending ${result.entityName}.${result.entryId} activeActive to partner ${partner.dcId} : ${err.stack || err}`, 'error', NAME );
                    }
                    if(result.entityName === 'media' && docs && docs[0] && docs[0]._id && !result.onDelete ){
                        let [ err ] = await formatPromiseResult(
                            Y.doccirrus.api.activityTransfer.transferGridFsFileToPartner( user, docs[0] && docs[0]._id, partner )
                        );
                        if( err ){
                            Y.log( `processQueue: Error sending files for ${result.entityName}.${result.entryId} activeActive to partner ${partner.dcId} : ${err.stack || err}`, 'error', NAME );
                        }

                    }
                }
            }
        }


        /**
         * @method generateDiff
         * @private
         *
         * generate diff between 2 objects similar to audit log
         *
         * @param {Object} leftData
         * @param {Object} rightData
         *
         * @returns {Object} key - is path to field that has deference value is Object with oldValue and newValue
         *
         */
        function generateDiff( leftData, rightData ) {
            if( !leftData || !rightData ) {
                return;
            }
            leftData = leftData.toObject ? leftData.toObject() : leftData;
            rightData = rightData.toObject ? rightData.toObject() : rightData;
            let
                diff = {},
                keys = Object.keys( leftData ).concat( Object.keys( rightData ) ), // a pool of all keys
                irrelevantFields = {_id: true, __v: true}, // fields that should be ignored
                str;

            // distinguishes between arrays of primary types and array of sub-documents
            function isObjectArray( myArr ) {
                return myArr && myArr[0] && myArr[0]._id;
            }

            // remove duplicates
            keys = keys.sort();
            keys = keys.filter( function( k ) {
                if( str === k ) {
                    return false;
                }
                str = k;
                return true;
            } );

            keys.forEach( function( fName ) {
                let
                    lv, rv,
                    subDiff,
                    idList = {};
                if( irrelevantFields[fName] ) {
                    return;
                }
                lv = leftData[fName]; // left value
                rv = rightData[fName]; // right value

                if( Array.isArray( lv ) && Array.isArray( rv ) && (isObjectArray( lv ) || isObjectArray( rv )) ) { // if both sides are sub-docs and at least one is not empty
                    diff[fName] = [];
                    lv.concat( rv ).forEach( function( item ) {
                        let
                            lEntry, rEntry;
                        if( !item || !item._id || idList[item._id.toString()] ) { // dismiss unidentifiable entries and duplicates
                            return;
                        }
                        idList[item._id.toString()] = true;

                        // find the same item on both sides
                        lv.some( function( lItem ) {
                            if( lItem && lItem._id && lItem._id.toString() === item._id.toString() ) {
                                lEntry = lItem;
                                return true;
                            }
                        } );
                        rv.some( function( rItem ) {
                            if( rItem && rItem._id && rItem._id.toString() === item._id.toString() ) {
                                rEntry = rItem;
                                return true;
                            }
                        } );

                        if( lEntry && rEntry ) { // the item was found on both sides, lets make their diff
                            subDiff = generateDiff( lEntry, rEntry );
                            if( subDiff && Object.keys( subDiff ).length ) {
                                diff[fName].push( subDiff );
                            }

                        } else { // only one side was found (it means item added/removed), no need for further diff
                            diff[fName].push( {oldValue: lEntry, newValue: rEntry} );
                        }
                    } );
                    if( !diff[fName].length ) {
                        delete diff[fName];
                    }

                } else if( lv && lv._id && rv && rv._id ) { // if both are mongoose objects (sub-docs)
                    diff[fName] = generateDiff( lv, rv );

                } else { // primary schema types, e.g date, string..., or arrays of those types
                    // stringify both sides for a better comparison
                    if( lv ) {
                        lv = lv.toJSON ? lv.toJSON() : lv.toString().trim();
                    }
                    if( rv ) {
                        rv = rv.toJSON ? rv.toJSON() : rv.toString().trim();
                    }
                    if( lv !== rv ) {
                        diff[fName] = {oldValue: lv, newValue: rv}; // this indicates an add/remove/change
                    }
                }
            } );

            return diff;
        }


        let receiveQueueProcessing = {},
            repeatCount = {};


        async function processDispatch( user, dispatch ){
            const getModel = util.promisify(Y.doccirrus.mongodb.getModel);

            //actual processing
            let err;
            if( dispatch.onDelete ){
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: dispatch.entityName,
                        action: 'delete',
                        query:{
                            _id: dispatch.entryId
                        },
                        options: {
                            override: true
                        },
                        context: {
                            activeActiveWrite: true
                        }
                    } )
                );
                if( err ){
                    Y.log( `processDispatch: Error on deleting dispatch ${dispatch.entityName}.${dispatch.entryId} ${err.stack || err}`, 'error', NAME );
                }
            } else if ( dispatch.doc && Object.keys(dispatch.doc).length ) {
                //firstly try deal deal with previously created activities

                let [ errWorkAround, model ] = await formatPromiseResult(
                    getModel( user, dispatch.entityName, false )
                );
                if( errWorkAround ){
                    Y.log( `processDispatch: Error on getting model ${dispatch.entityName}.${dispatch.entryId} ${errWorkAround.stack || errWorkAround}`, 'warn', NAME );
                }

                let orgDocument,
                    docId = new ObjectID( dispatch.entryId );
                [ errWorkAround, orgDocument ] = await formatPromiseResult(
                    model.mongoose.collection.findOneAndDelete( {
                        _id: docId
                    } )
                );
                if( errWorkAround ){
                    Y.log( `processDispatch: Error on pre processing previously transfered ${dispatch.entityName}.${dispatch.entryId} ${errWorkAround.stack || errWorkAround}`, 'warn', NAME );
                }

                if( dispatch.entityName === 'location' ){
                    if( orgDocument && orgDocument.value ) {
                        // keep local printers on location
                        dispatch.doc.enabledPrinters = orgDocument.value.enabledPrinters;
                        dispatch.doc.defaultPrinter = orgDocument.value.defaultPrinter;
                    } else {
                        delete dispatch.doc.defaultPrinter;
                        delete dispatch.doc.enabledPrinters;
                    }
                }

                if( dispatch.entityName === 'patient' ){
                    if( orgDocument && orgDocument.value && orgDocument.value.insuranceStatus.length) {
                        // MOJ-14319: [OK] [CARDREAD]
                        let cardInsurances = orgDocument.value.insuranceStatus.filter( el => el.cardSwipe && ['PUBLIC', 'PRIVATE'].includes(el.type));

                        // keep fields for cardSwipe
                        // fields get from Y.doccirrus.schemas.patient.getReadOnlyFields( orgDocument.value );
                        if( cardInsurances.length ){

                            dispatch.doc.title = orgDocument.value.title;
                            dispatch.doc.firstname = orgDocument.value.firstname;
                            dispatch.doc.nameaffix = orgDocument.value.nameaffix;
                            dispatch.doc.fk3120 = orgDocument.value.fk3120;
                            dispatch.doc.lastname = orgDocument.value.lastname;
                            dispatch.doc.kbvDob = orgDocument.value.kbvDob;

                            let cardAddresses = (orgDocument.value.addresses || []).filter( el => ['OFFICIAL', 'POSTBOX'].includes( el.kind ) );

                            for(let address of cardAddresses){
                                let found = false;
                                (dispatch.doc.addresses || []).forEach( (newAddress, ind) => {
                                    if( newAddress.kind === address.kind ){
                                        dispatch.doc.addresses[ind] = {...address};
                                        found = true;
                                    }
                                } );
                                if( !found ){
                                    dispatch.doc.addresses.push( address );
                                }
                            }

                            for(let insurance of cardInsurances){
                                let found = false;
                                (dispatch.doc.insuranceStatus).forEach( (newInsurance, ind) => {
                                    if( newInsurance.type === insurance.type ){
                                        dispatch.doc.insuranceStatus[ind].type = insurance.type;
                                        dispatch.doc.insuranceStatus[ind].cardSwipe = insurance.cardSwipe;
                                        dispatch.doc.insuranceStatus[ind].insuranceNo = insurance.insuranceNo;
                                        dispatch.doc.insuranceStatus[ind].kvkHistoricalNo = insurance.kvkHistoricalNo;
                                        dispatch.doc.insuranceStatus[ind].insuranceId = insurance.insuranceId;
                                        dispatch.doc.insuranceStatus[ind].insuranceName = insurance.insuranceName;
                                        dispatch.doc.insuranceStatus[ind].insurancePrintName = insurance.insurancePrintName;
                                        dispatch.doc.insuranceStatus[ind].insuranceKind = insurance.insuranceKind;
                                        dispatch.doc.insuranceStatus[ind].locationFeatures = insurance.locationFeatures;
                                        dispatch.doc.insuranceStatus[ind].fk4133 = insurance.fk4133;
                                        dispatch.doc.insuranceStatus[ind].fk4110 = insurance.fk4110;
                                        dispatch.doc.insuranceStatus[ind].persGroup = insurance.persGroup;
                                        dispatch.doc.insuranceStatus[ind].dmp = insurance.dmp;
                                        dispatch.doc.insuranceStatus[ind].locationFeatures = insurance.locationFeatures;
                                        found = true;
                                    }
                                } );
                                if( !found ){
                                    dispatch.doc.insuranceStatus.push( insurance );
                                }
                            }
                        }

                    }
                }

                //in this case upsert operation can not be used because we need keep _id but not include this _id in query, that is
                //not possible therefor just check if autoGenID exists (not give 100% protection from race condition)

                let skipPost = false;
                if( 'activity' === dispatch.entityName && dispatch.doc && dispatch.doc.autoGenID ){
                    let result;
                    [ err, result ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'count',
                            query: {
                                $and: [
                                    { autoGenID: dispatch.doc.autoGenID },
                                    { status: {$ne: 'CANCELLED' } }
                                ]
                            },
                            useCache: false
                        } )
                    );
                    if( err ){
                        Y.log( `processDispatch: Error on counting autoGenID ${dispatch.doc.autoGenID}`, 'error', NAME );
                    }
                    if( result && result > 0 ){
                        Y.log( `processDispatch: autoGenID ${dispatch.doc.autoGenID} found, post skipped...`, 'debug', NAME );
                        skipPost = true;
                    }
                }

                if( !skipPost ){
                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: dispatch.entityName,
                            action: 'post',
                            data: {...dispatch.doc, skipcheck_: true },
                            context: {
                                activeActiveWrite: true
                            }
                        } )
                    );
                }


                if( err ){
                    Y.log( `processDispatch: Error on posting dispatch ${dispatch.entityName}.${dispatch.entryId} ${err.stack || err}`, 'error', NAME );

                    //immediately change status in case that 2 next blocks of await will never resolved
                    let [ errorSpecial ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'receivedispatch',
                            action: 'update',
                            query: {
                                _id: dispatch._id
                            },
                            data: {$set: {
                                    status: 3,
                                    errorMessage: err.message || err
                                }}
                        } )
                    );
                    if( errorSpecial ){
                        Y.log( `processDispatch: Error on special extra status update ${dispatch.entityName}.${dispatch.entryId} ${errorSpecial.stack || errorSpecial}`, 'error', NAME );
                    }

                    Y.log( 'Start special operations on post failed...', 'info', NAME );
                    //notify sender about failure
                    //for now only for activity to drop cache on sender side
                    if( dispatch.entityName === 'activity' ){
                        Y.log( 'Notify sender that posting activity fails, to drop caching...', 'info', NAME );
                        [ errWorkAround ] = await formatPromiseResult(
                            Y.doccirrus.api.activityTransfer.callExternalApiByCustomerNo( user, dispatch.dcCustomerNo, 'activityTransfer.receiveActiveFailure', {
                                entityName: dispatch.entityName,
                                entryId: dispatch.entryId,
                                sequenceNo: dispatch.sequenceNo,
                                message: err.message
                            } )
                        );
                        if( errWorkAround ){
                            Y.log( `processDispatch: Error sending receiveActiveFailure to partner ${dispatch.dcCustomerNo} : ${errWorkAround.stack || errWorkAround}`, 'error', NAME );
                        }
                    }
                    Y.log( 'Post back original data if exists', 'info', NAME );
                    //insert back original data
                    if( orgDocument && orgDocument.value ){
                        Y.log( `Original data ${JSON.stringify(orgDocument && orgDocument.value)}`, 'info', NAME );
                        [ errWorkAround ] = await formatPromiseResult(
                            model.mongoose.collection.findOneAndUpdate(
                                {_id: docId },
                                { $setOnInsert: orgDocument.value},
                                { upsert: true }
                            )
                        );
                        if( errWorkAround ){
                            Y.log( `processDispatch: Error on recovering original document ${JSON.stringify( orgDocument )} ${errWorkAround.stack || errWorkAround}`, 'warn', NAME );
                        }
                    }
                    Y.log( 'Finish special operations on post failed...', 'info', NAME );
                }
            } else {
                err = 'processDispatch: not received upsert data';
            }

            let [ error ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'receivedispatch',
                    action: 'update',
                    query: {
                        _id: dispatch._id
                    },
                    data: {$set: {
                            status: ( err ? 3 : 1 ),
                            errorMessage: ( err ? (err.message || err) : null )
                        }}
                } )
            );
            if( error ){
                Y.log( `processDispatch: Error on updating dispatch status ${dispatch.entityName}.${dispatch.entryId} ${error.stack || error}`, 'error', NAME );
                throw error;
            }
            if( !err ){ //mark all same clashes as processed, BUT received earlier!!
                [ error ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'receivedispatch',
                        action: 'update',
                        query: {
                            dcCustomerNo: dispatch.dcCustomerNo,
                            entryId: dispatch.entryId,
                            entityName: dispatch.entityName,
                            status: {$in: [2, 3]},
                            sequenceNo: {$lte: dispatch.sequenceNo}
                        },
                        data: {$set: {status: 1}},
                        options: {multi: true}
                    } )
                );
                if( error ){
                    Y.log( `processDispatch: Error on updating previous clashes ${dispatch.entityName}.${dispatch.entryId} ${error.stack || error}`, 'error', NAME );
                    throw error;
                }
            }
        }



        /**
         * @method processReceiveQueue
         * @public
         *
         * called by event-catcher as reaction on cron
         *
         * process receivedispatch collection in order to get next unprocessed activeActive tranfer and then upsert
         * or delete original collection with arrived data. Operation change status of the record:
         *  0 - new (created in this state on arival)
         *  1 - successfully processed
         *  2 - lastChanged comparison failed, receiver has new data, diff of data stored in
         *  3 - error on actual mongo operation, errorMessage stored in
         *
         * @param {Object} user
         * @param {Boolean} internallyCall
         *
         */
        async function processReceiveQueue( user, internallyCall = false ){


            if( receiveQueueProcessing[user.tenantId] && !internallyCall ){
                Y.log( 'processReceiveQueue: another process currently run, skip...', 'info', NAME );
                return;
            }

            receiveQueueProcessing[user.tenantId] = true;
            let [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'receivedispatch',
                    action: 'count',
                    query: {status: 0}
                })
            );
            if( err ){
                Y.log( `processReceiveQueue: Error on getting unprocessed count ${err.stack || err}`, 'error', NAME );
                receiveQueueProcessing[user.tenantId] = false;
                return;
            }
            if( !results ){
                //there are no unprocessed records, do no need to run AGGREGATE
                receiveQueueProcessing[user.tenantId] = false;
                return;
            }

            [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'receivedispatch',
                    action: 'aggregate',
                    pipeline: [
                        {$group: {_id: {dcCustomerNo: "$dcCustomerNo", status: "$status"}, minNo: {$min: "$sequenceNo"}, maxNo: {$max: "$sequenceNo"}}},
                        {$group: {_id: {dcCustomerNo: "$_id.dcCustomerNo"}, states: {$push: "$$ROOT"}}}
                    ]
                })
            );
            if( err ){
                Y.log( `processReceiveQueue: Error on getting next sequence to process ${err.stack || err}`, 'error', NAME );
                receiveQueueProcessing[user.tenantId] = false;
                return;
            }
            let result = results.result ? results.result : results;
            if(!result || !result.length){
                receiveQueueProcessing[user.tenantId] = false;
                return;
            }
            for( let sender of result){
                let lastProcessed, firstUnprocessed;
                for( let state of (sender.states || []) ){
                    if( state._id.status === 0 ){
                        firstUnprocessed = state.minNo;
                    } else if( !lastProcessed || lastProcessed < state.maxNo ){
                        lastProcessed = state.maxNo;
                    }
                }
                if( (firstUnprocessed && !lastProcessed) || (firstUnprocessed === lastProcessed + 1)
                    || (firstUnprocessed === lastProcessed ) //special case occurred when hotpatch was applied
                ){
                    repeatCount[user.tenantId] = 0;

                    //correct order lets process
                    let dispatches;
                    [ err, dispatches ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'receivedispatch',
                            action: 'get',
                            query:{
                                status: 0,
                                dcCustomerNo: sender._id.dcCustomerNo,
                                sequenceNo: firstUnprocessed
                            }
                        } )
                    );
                    if( err ){
                        Y.log( `processReceiveQueue: Error on getting dispatch record to process ${err.stack || err}`, 'error', NAME );
                    }

                    for(let dispatch of (dispatches || [])){
                        //check for newer
                        let lastChanged = ( dispatch.doc && dispatch.doc.lastChanged ) || dispatch.lastChanged || new Date();

                        let newers;
                        [ err, newers ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: dispatch.entityName,
                                action: 'get',
                                query:{
                                    _id: dispatch.entryId,
                                    lastChanged: {$gt: lastChanged }
                                }
                            } )
                        );
                        if( err ){
                            Y.log( `processReceiveQueue: Error on getting dispatch record to process ${err.stack || err}`, 'error', NAME );
                            receiveQueueProcessing[user.tenantId] = false;
                            return;
                        }
                        if(newers.length) {
                            //lets check if only time related fields are changed
                            let
                                diff,
                                fieldsDiff;

                            if( !dispatch.doc ){ //in case of deleting action there are no way to build diff, so made { status: 2 }
                                diff = {};
                                fieldsDiff = [ 'needToBeUpdated' ];
                            } else {
                                diff = generateDiff(newers[0], dispatch.doc);
                                fieldsDiff = Object.keys( diff || {} ).filter( el => {
                                    if( !['lastChanged', 'lastEditedDate'].includes( el ) ){
                                        return true;
                                    }
                                    let duration = Math.abs( moment.duration( moment( diff[el].oldValue ).diff( moment( diff[el].newValue ) ) ).asSeconds() );
                                    if( duration > 60 ){
                                        return true;
                                    }
                                    return false;
                                } );
                            }

                            [err] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'receivedispatch',
                                    action: 'update',
                                    query: {
                                        _id: dispatch._id
                                    },
                                    data: {$set: {
                                        status: fieldsDiff.length ? 2 : 1,
                                        diff
                                    }}
                                } )
                            );
                            if( err ) {
                                Y.log( `processReceiveQueue: Error on updating status to time conflict ${err.stack || err}`, 'error', NAME );
                                receiveQueueProcessing[user.tenantId] = false;
                                return;
                            }
                            await formatPromiseResult( processReceiveQueue( user, true ) );
                            return;
                        }


                        [err] = await formatPromiseResult(
                            processDispatch( user, dispatch )
                        );
                        if( err ){
                            Y.log( `processReceiveQueue: Error on actual dispatch processing ${err.stack || err}`, 'error', NAME );
                            receiveQueueProcessing[user.tenantId] = false;
                            return;
                        }
                        //not wait next cron event continue processing
                        await formatPromiseResult( processReceiveQueue( user,true ) );
                        return;
                    }
                } else if( firstUnprocessed && lastProcessed && ( firstUnprocessed > lastProcessed + 1 ) ){
                    //found gap in processing
                    if( !repeatCount[user.tenantId] ){
                        repeatCount[user.tenantId] = 0;
                    }
                    //wait a bit maybe transferred all but in wrong order (and wait for requested syncdispatcharchive)
                    if( repeatCount[user.tenantId] < 2 ){
                        Y.log( `processReceiveQueue: Found gap in processing wait ${lastProcessed}...${firstUnprocessed} , repeat count ${repeatCount[user.tenantId]}`, 'warn', NAME );
                        repeatCount[user.tenantId] += 1;
                        receiveQueueProcessing[user.tenantId] = false;
                        return;
                    } else {
                        //request to resend some entries from sender
                        let [ error ] = await formatPromiseResult(
                            Y.doccirrus.api.activityTransfer.callExternalApiByCustomerNo( user, sender._id.dcCustomerNo, 'activityTransfer.receiveActiveRepeatSend', {
                                sequenceNos: _.range( lastProcessed + 1, firstUnprocessed )
                            } )
                        );
                        if( error ){
                            Y.log( `processReceiveQueue: Error sending receiveActiveRepeatSend to partner ${sender._id.dcCustomerNo} : ${error.stack || error}`, 'error', NAME );
                        }

                        repeatCount[user.tenantId] = 0;
                        receiveQueueProcessing[user.tenantId] = false;
                        return;
                    }

                }
            }
            receiveQueueProcessing[user.tenantId] = false;
        }

        /**
         *  Dev / support route to resend activity data for the given date range
         *
         *  Call like /1/dispatch/:resendDateRange?dateStart=2019-01-01&dateEnd=2019-12-31
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.dateStart   YYYY-MM-DD
         *  @param  {String}    args.originalParams.dateEnd     YYYY-MM-DD
         *  @param  {Function}  args.callback
         *  @return {Promise<void>}
         */

        async function resendDateRange( args ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                syncWithDispatcherProcessP = util.promisify( Y.doccirrus.schemaprocess.activity.post[0].run[9] );

            let
                params = args.originalParams,

                activityModel,
                activityCursor,
                activity,
                dbQuery,

                activityCount = 0,

                dateStart,
                dateEnd,

                err;

            //  Check if post-process matches the expected method: syncActivityWithDispatcher
            if ( Y.doccirrus.schemaprocess.activity.post[0].run[9].name !== 'syncActivityWithDispatcher' ) {
                return args.callback( 'Post-processes have changed, please update this route to use syncActivityWithDispatcher' );
            }

            //  Check if dates were given in querystring
            if ( !params.hasOwnProperty( 'dateStart' ) || !params.hasOwnProperty( 'dateEnd' )  ) {
                return args.callback( 'Please provide dateStart and dateEnd in queryString' );
            }

            dateStart = params.dateStart;
            dateEnd = params.dateEnd;

            Y.log( `Resending data to dispatcher for date range: ${dateStart} to ${dateEnd}`, 'info', NAME );

            dateStart = dateStart + 'T00:00:00.105Z';
            dateEnd = dateEnd + 'T00:00:00.105Z';

            //  Create an activity model
            [ err, activityModel ] = await formatPromiseResult( getModelP( args.user, 'activity', false ) );

            if ( err ) { return args.callback( err ); }

            //  Iterate over all matching activities
            dbQuery = {
                '$or': [
                    {
                        lastChanged: {
                            '$gt': dateStart,
                            '$lt': dateEnd
                        }
                    },
                    {
                        timestamp: {
                            '$gt': dateStart,
                            '$lt': dateEnd
                        }
                    }
                ]
            };

            activityCursor = activityModel.mongoose.find( dbQuery , {}, { lean: true } ).cursor().addCursorFlag( 'noCursorTimeout', true );

            while ( activity = await activityCursor.next() ) {      //  eslint-disable-line no-cond-assign
                Y.log( `Will add activity: ${activity._id} ${activity.actType} ${activity.timestamp}`, 'info', NAME );
                [ err ] = await formatPromiseResult( syncWithDispatcherProcessP( args.user, activity ) );

                if ( err ) {
                    Y.log( `Could not resync with dispatcher: ${err.stack||err}`, 'error', NAME );
                    return args.callback( err );
                }

                activityCount++;
            }

            args.callback( null, `Syncing with dispatcher: ${activityCount} activities` );
        }

        Y.namespace( 'doccirrus.api' ).dispatch = {

            name: NAME,

            // check for the allowed payload types
            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.dispatch.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dispatch.post');
                }
                let data = JSON.parse( args.data.payload ) || [],
                    type = "", payload = {}, patientId = "";
                if( data[0] ) {
                    type = data[0].type;
                    payload = data[0].payload;
                    patientId = (type === 'activity') ? payload.patientId : payload._id;
                }

                Y.log( "InCarePost: type(" + type + ") patient(" + patientId + ") " + JSON.stringify( payload ), 'debug', NAME );

                getCaseFolder( args.user, patientId ).then( ( caseFolderId ) => {
                    let promises = [];

                    data.forEach( function( elm ) {
                        let type = elm.type,
                            payload = elm.payload;
                        switch( type ) {
                            case 'activity':
                                payload.caseFolderId = caseFolderId;
                                promises.push( addActivity( args.user, payload, elm.file[0] ) );
                                break;
                            case 'patient':
                                promises.push( updatePatientId( args.user, payload ) );
                                break;
                            default:
                                Y.log( "InCarePost: Unknown type(" + type + ") " + JSON.stringify( payload ), 'error', NAME );
                        }
                    } );

                    Promise.all( promises ).then( function() {
                        //TODO handle revert in case of the error
                        args.callback( null, {} );

                    } );
                } );
            },

            restore: function restore( args ) {
                Y.log('Entering Y.doccirrus.api.dispatch.restore', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dispatch.restore');
                }
                getModelData(args.user, 'settings').then(settings => {
                    if( settings.length > 0 && settings[0].isRestoreFromISCD ) {
                        let data = JSON.parse( args.data.payload ),
                            type = data && data.type,
                            payload = data && data.payload;

                        async.each( payload, ( el, cb ) => {
                            let obj = el.obj || el;
                            if( 'string' === typeof obj ) {
                                obj = JSON.parse( el.obj );
                            }
                            delete obj.__v;

                            switch( type ) {
                                case "location":
                                case "activity":
                                case "patient":
                                case "document":
                                case "casefolder":
                                case "media":
                                    postModel( args.user, type, obj, cb );
                                    break;
                                case "employee":
                                    postEmployee( args, obj, cb );
                                    break;
                                case "filemeta":
                                    postFileMeta( args.user, type, obj, cb );
                                    break;
                                case "filechunks":
                                    postFileChunks( args.user, type, obj, cb );
                                    break;
                                case "finish":
                                    finishRestore( args.user, cb );
                                    break;
                                default:
                                    return args.callback( {code: 777, message: 'unknown collection'} );
                            }
                        }, ( error ) => {
                            if( error ) {
                                Y.log( 'Error during restore ' + JSON.stringify( error ), 'error', NAME );
                            }
                            args.callback( error, {} );
                        } );

                    } else {
                        return args.callback( {code: 777, message: 'not configured for recovery'} );
                    }

                } );
            },

            syncObjectWithDispatcher: ( user, type, data, cb ) => {
                if( Y.doccirrus.auth.isISD() || Y.doccirrus.auth.isPUC() ) {
                    Y.log( 'Not allowed system type for synchronization', 'info', NAME );
                    return cb();
                }
                if( -1 !== process.argv.indexOf( '--mocha' ) ) { //do not dispatch during mocha tests
                    //NOTE Y.doccirrus.auth.isMocha() can't be used because during rule engine test is OFF
                    return cb();
                }

                if( !type || !data ) {
                    let err = 'Parameters are not provided';
                    Y.log( err, 'error', NAME );
                    return cb( new Error( err ) );
                }

                //, systemType - need to be determined from somewhere like partners collection
                getSpecialModules( user ).then( specialModules => {
                    let allowedModules = Object.keys(alowedDestinations),
                        modulesForSynchro = (specialModules || []).concat('internal').filter( el => allowedModules.includes( el ) ),
                        operations = [],
                        caseFolderReceived;

                    //special case for switched off license, need to set inactive state
                    if( 'prc' === type && data && false === data.activeState && data.systemType ){
                        let offLicenseKey = allowedModules.find( key => alowedDestinations[key].systemType === data.systemType );
                        modulesForSynchro = modulesForSynchro.concat( offLicenseKey );
                    }

                     if( Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_LEARNING_SYSTEM )) {
                         modulesForSynchro = modulesForSynchro.concat( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_LEARNING_SYSTEM );
                     }

                     if( Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_EXPERT_SYSTEM )) {
                         modulesForSynchro = modulesForSynchro.concat( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_EXPERT_SYSTEM );
                     }

                     if( Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_SELECTIVECARE_SYSTEM )) {
                         modulesForSynchro = modulesForSynchro.concat( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_SELECTIVECARE_SYSTEM );
                     }

                    if( !modulesForSynchro.length ){
                        Y.log( 'There are no licensed special modules for synchronization', 'info', NAME );
                        return cb();
                    }

                    modulesForSynchro.forEach( specialModule => {
                        let systemType = alowedDestinations[specialModule].systemType;

                        if( !alowedDestinations[specialModule].allowedTypes.includes(type) ){
                            return;
                        }

                        switch(type) {
                            case "activityDeleted":
                                operations.push( ( next ) => {
                                    next(); // eslint-disable-line callback-return
                                    checkActivitySynchronization( user, data._id.toString(), systemType, alowedDestinations[specialModule].patientQuery, data, ( err, partners ) => {
                                        if(err){
                                            Y.log('Error on check activity synchronization ' + err.message, 'error', NAME );
                                        }
                                        if( partners && partners.length ) {
                                            setPracticeInPayload( user, {}, ( err, payload ) => {
                                                if(err){
                                                    Y.log('Error on seting paractice for object synchro ' + err.message, 'error', NAME );
                                                }
                                                payload.activities = [data];
                                                sendPRCdispatch( user, payload, systemType );
                                            } );
                                        }
                                    } );
                                } );
                                break;
                            case "checkCaseFolder":
                                operations.push( ( next ) => {
                                    getCaseFolder(user, data.patientId).then( casefolderId => {
                                        caseFolderReceived = casefolderId;
                                        next();
                                    } );
                                } );
                                break;
                            case "prc":
                                if(data.systemType !== systemType){
                                    return;
                                }

                                operations.push( ( next ) => {
                                    next(); //  eslint-disable-line callback-return
                                    syncPRC( user, data, systemType );
                                } );
                                break;
                            case "prcSettings":
                                operations.push( ( next ) => {
                                    next(); //  eslint-disable-line callback-return
                                    syncPRCSettings( user, data, systemType );
                                } );
                                break;
                            case "location":
                                operations.push( ( next ) => {
                                    next(); //  eslint-disable-line callback-return
                                    syncLocation( user, data, systemType );
                                } );
                                break;
                            case "employee":
                                operations.push( ( next ) => {
                                    next(); //  eslint-disable-line callback-return
                                    syncEmployee( user, data, systemType );
                                } );
                                break;
                            case "patient":
                                if( !data.sync_to || !data.sync_to[specialModule] ){
                                    return;
                                }

                                operations.push( ( next ) => {
                                    next(); //  eslint-disable-line callback-return
                                    syncPatient( user, data, systemType );
                                } );
                                break;
                            case "activitystatus":
                                //INCARE activitystaus is for all but FORM synchronization
                                if( 'FORM' === data.actType && 'care' === specialModule ){
                                    Y.log( 'Skipped synchronization of ' + data.actType + ' for ' + specialModule, 'info', NAME );
                                    return;
                                }

                                operations.push( ( next ) => {
                                    inSynchroCaseFile( user, data.caseFolderId, systemType ).then( ( inSyncAllowed ) => {
                                        if( !inSyncAllowed ) {
                                            return next();
                                        }

                                        next(); //  eslint-disable-line callback-return
                                        addToQueue( user, 'activitystatus', data._id.toString(), data.addedFrom, systemType, [] );
                                    } );
                                } );
                                break;
                            case "reference":
                                operations.push( ( next ) => {
                                    next(); //  eslint-disable-line callback-return
                                    checkActivitySynchronization( user, data.syncActivityId, systemType, alowedDestinations[specialModule].patientQuery, null, (err, partners) => {
                                        if(err){
                                            Y.log('Error on checking activity synchronization ' + err.message, 'error', NAME );
                                        }
                                        if(partners && partners.length){
                                            addToQueue( user, 'activity', data.syncActivityId, data.addedFrom, systemType, partners);
                                        }
                                    } );
                                } );
                                break;
                            case "activeReference":
                                operations.push( ( next ) => {
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        action: 'get',
                                        query: { bidirectional: true, activeActive: true },
                                        model: 'partner'

                                    }, async (err, partners) => {
                                        if(err){
                                            Y.log('Error on checking activity synchronization ' + err.message, 'error', NAME );
                                        }
                                        if(partners && partners.length){
                                            [ err ] = await formatPromiseResult(
                                                addToQueueActive( user, data.entityName, data.entryId, data.addedFrom, systemType, partners, (data.onDelete || false), data.lastChanged)
                                            );
                                            if( err ){
                                                Y.log( `Error on adding ${data.entityName}:${data.entryId} to queue : ${err.stack || err}` + err.message, 'warn', NAME );
                                            }
                                            next();
                                        } else {
                                            next();
                                        }

                                    } );
                                } );
                                break;
                            default:
                                Y.log( 'Unknown type ' + JSON.stringify(type), 'warn', NAME );
                        }
                    } );

                    if( !operations.length ){
                        Y.log( 'There are no required synchronization', 'info', NAME );
                        return cb();
                    }

                    async.waterfall( operations, ( err ) => {
                        if(err){
                            Y.log( 'Error on processing synchronizations ' + err.message, 'error', NAME );
                        }
                        if( caseFolderReceived ){
                            return cb( null, caseFolderReceived );
                        }
                        cb();
                    } );
                });

            },
            processQueue,
            processReceiveQueue,
            sendPRCdispatch,
            createPayloadExternal,
            processDispatch,

            resendDateRange
        };

    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'prcdispatch-schema',
            'dispatchrequest-schema',
            'dcauth',
            'admin-api',
            'dispatchUtils'
        ]
    }
)
;
