/*global YUI */


YUI.add( 'prcsynchro-api', function( Y, NAME ) {

        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            _ = require( 'lodash' ),
            syncAuxManager = Y.doccirrus.insight2.syncAuxManager;

        /**
         * @method setCountryMode
         * @private
         *
         * if input data not has coutryMode field populated then set it to one from practice or default
         *
         * @param {Object} data - location|employee|patient
         * @param {Boolean} asArray - type of field
         *
         * @returns {Object} returns data with additionally set countyMode if not exists
         */
        function setCountryMode( data, asArray = false ){
            if( !data.countryMode || !data.countryMode.length ){
                data.countryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs();
                if(!asArray){
                    data.countryMode = data.countryMode[0];
                }
            }
            return data;
        }

        function upsertMirrorLocation( user, data ) {
            return new Promise( ( resolve ) => {
                Y.doccirrus.api.prcdispatch.processLocation( user, data._id, data.prcCustomerNo ).then( ( val ) => {
                    data._id = val.id;
                    delete data.__v;
                    data.isMainLocation = val.mainLocation;
                    data = setCountryMode( data );
                    data = Y.doccirrus.filters.cleanDbObject( data );

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'upsert',
                        model: 'mirrorlocation',
                        fields: Object.keys( data ),
                        data: data
                    }, ( err, result ) => {
                        if( err ) {
                            Y.log( 'Failed to upsert mirrorlocation: ' + err.message, 'error', NAME );
                            resolve( {} );
                        } else {
                            resolve( {
                                type: 'location',
                                id: result._id,
                                commercialNo: result.commercialNo || '',
                                mainLocation: val.mainLocation
                            } );

                            syncAuxManager.auxHook({ _id: result._id }, 'location', user);
                        }
                    } );
                } );
            } );
        }

        function upsertMirrorEmployee( user, data ) {
            return new Promise( ( resolve ) => {
                delete data.__v;
                data = setCountryMode( data );
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
                        resolve( {} );
                    } else {
                        resolve( {
                            type: 'employee',
                            id: result._id,
                            officialNo: result.officialNo || '',
                            isActive: result.isActive
                        } );

                        syncAuxManager.auxHook( { _id: result._id }, 'employee', user );
                    }

                } );
            } );
        }

        function upsertMirrorActivity( user, data, practiceName, casefolders, preserveCaseFolder ) {
            return new Promise( ( resolve ) => {

                let casefolderPromise;
                if( !preserveCaseFolder ) {
                    casefolderPromise = () => {
                        return Promise.resolve( data.caseFolderId );
                    };
                } else {
                    casefolderPromise = () => {
                        return new Promise( ( resolve ) => {
                            let activityCaseFolder = (casefolders || []).filter( el => el._id.toString() === data.caseFolderId );
                            if( activityCaseFolder.length ) { //when activity deleted casefolders can be empty
                                let casefolderData = _.omit( activityCaseFolder[0], ['__v', '_id'] );
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    action: 'get',
                                    model: 'mirrorcasefolder',
                                    query: {
                                        patientId: data.patientId,
                                        additionalType: casefolderData.additionalType,
                                        type: casefolderData.type
                                    }
                                }, ( err, results ) => {
                                    if( err ){
                                        Y.log('Error on getting preserved mirror casefolder', 'error', NAME );
                                    }
                                    if( results.length ){
                                        return resolve( results[0]._id );
                                    }

                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        action: 'post',
                                        model: 'mirrorcasefolder',
                                        query: {
                                            patientId: data.patientId,
                                            additionalType: casefolderData.additionalType,
                                            type: casefolderData.type
                                        },
                                        fields: Object.keys( casefolderData ),
                                        options: {omitQueryId: true},
                                        data: Y.doccirrus.filters.cleanDbObject( casefolderData )
                                    }, ( err, result ) => {
                                        if( err ) {
                                            Y.log( 'Failed to upsert preserved mirror caseFolder: ' + err.message, 'error', NAME );
                                        }
                                        resolve( ( result && result[0] ) || data.caseFolderId );
                                    } );

                                } );


                            } else {
                                resolve( data.caseFolderId );
                            }
                        } );
                    };
                }

                casefolderPromise().then( casefolderId => {
                    //get old activity
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'mirroractivity',
                        query: {_id: data._id},
                        options: {lean: true}
                    }, ( err, oldActivity ) => {
                        let oldCaseFolderId = null;
                        if( !err && oldActivity[0] ) {
                            oldCaseFolderId = oldActivity[0].caseFolderId;
                        }

                        delete data.__v;

                        data.caseFolderId = casefolderId; //move activity to desired caseFolder (preserved or original)
                        data = Y.doccirrus.filters.cleanDbObject( data );

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'upsert',
                            model: 'mirroractivity',
                            fields: Object.keys( data ),
                            data: data
                        }, ( err, activity ) => {
                            if( err ) {
                                Y.log( 'Failed to upsert mirroractivity: ' + err.message, 'error', NAME );
                                resolve( {} );
                            } else {
                                let id = (typeof activity === 'object') ? activity._id : activity;
                                resolve( {
                                    type: 'activity',
                                    _id: id,
                                    practiceName: practiceName,
                                    oldCAseFolderId: oldCaseFolderId,
                                    status: activity.status
                                } );

                                //  request reporting be re/generated
                                Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', id );
                            }

                        } );
                    } );
                } );

            } );
        }

        function removeDocumentMedia( user, documentId ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'document',
                query: {_id: documentId},
                options: {lean: true}
            }, ( err, documents ) => {
                if( err ) {
                    Y.log( 'Failed to get document for dispathrequest: ' + err.message, 'error', NAME );
                } else if( documents.length === 0 ) {
                    Y.log( 'Found no document for dispathrequest ' + documentId.toString(), 'info', NAME );
                } else {

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'delete',
                        model: 'media',
                        query: {_id: documents[0].mediaId}
                    }, ( err ) => {
                        if( err ) {
                            Y.log( 'Failed to remove auto generated media ' + err.message, 'error', NAME );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'delete',
                            model: 'document',
                            query: {_id: documents[0]._id}
                        }, ( err ) => {
                            if( err ) {
                                Y.log( 'Failed to remove auto generated document ' + err.message, 'error', NAME );
                            }
                        } );
                    } );
                }

            } );
        }

        function upsertDocument( user, data ) {
            return new Promise( ( resolve ) => {
                delete data.__v;

                data = Y.doccirrus.filters.cleanDbObject( data );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'document',
                    fields: Object.keys( data ),
                    data: data
                }, ( err, nDocuments ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert document: ' + err.message, 'error', NAME );
                    } else if( nDocuments.length === 0 ) {
                        Y.log( 'Upserted 0 documents: ' + JSON.stringify(data && data._id), 'info', NAME );
                    } else {
                        setTimeout(() => {
                            let docActivityId = nDocuments.activityId || ( nDocuments[0] && nDocuments[0].activityId );

                            //  request reporting be re/generated for activity (including documents)
                            Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', docActivityId );

                        }, 2 * 1000);

                        //remove autogenerated document for PROCESS
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'mirroractivity',
                            query: {attachments: nDocuments[0]},
                            options: {lean: true}
                        }, ( err, activities ) => {
                            if( err ) {
                                Y.log( 'Failed to get activity for document: ' + err.message, 'error', NAME );
                            } else if ( activities.length === 0 ){
                                Y.log( 'Not found activities for document: ' + JSON.stringify(nDocuments[0]), 'error', NAME );
                            } else {
                                if( activities[0].actType.toString() === 'PROCESS' ) {
                                    Y.doccirrus.mongodb.getModel( user, 'dispatchrequest', ( err, dispatchRequestModel ) => {
                                        if( err ){
                                            Y.log( 'Error getting model dispatchrequest: ' + err.message, 'error', NAME );
                                        }
                                        dispatchRequestModel.mongoose.findOne(
                                            {"dispatchActivities.activityId": activities[0]._id},
                                            ( err, dispatchrequest ) => {
                                                if( err ){
                                                    Y.log( 'Error finding dispatchrequest by activityId: ' + err.message, 'error', NAME );
                                                }
                                                if( dispatchrequest && dispatchrequest.dispatchActivities[0].fileDocumentId ) {
                                                    //here we need cleanup auto generated data
                                                    removeDocumentMedia( user, dispatchrequest.dispatchActivities[0].fileDocumentId );

                                                    //and clenup DocumentId
                                                    dispatchRequestModel.mongoose.update(
                                                        {_id: dispatchrequest._id},
                                                        {$set: {"dispatchActivities.0.fileDocumentId": null}},
                                                        {multi: false},
                                                        () => {
                                                        }
                                                    );
                                                }

                                            } );
                                    } );
                                }
                            }
                        } );
                    }

                    resolve( {} );
                } );
            } );
        }

        function upsertMedia( user, data ) {
            return new Promise( ( resolve ) => {
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
                    }
                    resolve( {} );
                } );
            } );
        }

        function upsertMirrorCaseFolder( user, data, preserveCaseFolder) {
            return new Promise( ( resolve ) => {
                if( preserveCaseFolder ){ //execute only when preserveCaseFolder === false
                    return resolve( {} );
                }

                delete data.__v;

                data = Y.doccirrus.filters.cleanDbObject( data );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    model: 'mirrorcasefolder',
                    fields: Object.keys( data ),
                    data: data
                }, ( err ) => {
                    if( err ) {
                        Y.log( 'Failed to upsert mirror caseFolder: ' + err.message, 'error', NAME );
                    }
                    resolve( {} );
                } );
            } );
        }

        function upsertMirrorPatient( user, data, practiceName ) {
            return new Promise( ( resolve ) => {
                if(!data){
                    return resolve(null);
                }
                delete data.__v;
                data = setCountryMode( data, true );
                data = Y.doccirrus.filters.cleanDbObject( data );

                let partnerId, role;
                if( Y.doccirrus.auth.isDOQUVIDE() ) {
                    partnerId = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE;
                    role = Y.doccirrus.schemas.role.ROLES.CARDIO;
                } else {
                    partnerId = Y.doccirrus.schemas.patient.DISPATCHER.INCARE;
                    role = Y.doccirrus.schemas.patient.DISPATCHER.INCARE;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'mirrorpatient',
                    query: {_id: data._id}
                }, ( err, patients ) => {
                    if( err ) {
                        Y.log( 'Failed to get mirrorpatient: ' + err.message, 'error', NAME );
                        resolve( {} );
                    } else {

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'upsert',
                            model: 'mirrorpatient',
                            fields: Object.keys( data ),
                            data: data
                        }, ( err, result ) => {
                            if( err ) {
                                Y.log( 'Failed to upsert mirrorpatient: ' + err.message, 'error', NAME );
                                resolve( {} );
                            } else {
                                let patientIncareStatus = null,
                                    wasINCARE = false,
                                    isINCARE = false;

                                if( patients.length === 0 ) {
                                    patientIncareStatus = 'new';

                                    isINCARE = true;
                                } else {
                                    patients[0].partnerIds.forEach( ( el ) => {
                                        if( el.partnerId === partnerId ) {
                                            wasINCARE = true;
                                            if( typeof el.isDisabled !== 'undefined' ){
                                                wasINCARE = !el.isDisabled;
                                            }
                                        }
                                    } );
                                    data.partnerIds.forEach( ( el ) => {
                                        if( el.partnerId === partnerId ) {
                                            isINCARE = true;
                                            if( typeof el.isDisabled !== 'undefined' ){
                                                isINCARE = !el.isDisabled;
                                            }
                                        }
                                    } );
                                    if( !wasINCARE && isINCARE ) {
                                        patientIncareStatus = 'on';
                                    } else if( wasINCARE && !isINCARE ) {
                                        patientIncareStatus = 'off';
                                    }

                                }

                                resolve( {type: 'patient', id: result._id, isGHD: isINCARE} );

                                if( patientIncareStatus ) {
                                    let patientPartnerId;
                                    if( Y.doccirrus.auth.isDOQUVIDE() ) {
                                        patientPartnerId = Y.doccirrus.schemas.patient.getGHDPartnerId( result, Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE );
                                    }
                                    let patientName = Y.doccirrus.schemas.person.personDisplay( {
                                        firstname: result.firstname,
                                        lastname: result.lastname,
                                        title: result.title
                                    } );

                                    addNewPatientTask( user, 2, data.prcCustomerNo, result._id, patientName, practiceName, patientIncareStatus, role, patientPartnerId );
                                } else {
                                    Y.log( 'Unknown status of patient update ' + JSON.stringify( data ), 'info' );
                                }

                                syncAuxManager.auxHook( { _id: patients && ( patients._id || patients[0] && patients[0]._id ) }, 'patient', user );
                            }
                        } );

                    }
                } );
            } );
        }

        function getLocation( user, prcCustomerNo, locationId, cb ) {
            let query = {
                prcCustomerNo: prcCustomerNo
            };
            if( locationId && locationId.toString() === '000000000000000000000001' ) {
                query.isMainLocation = true;
            } else if( locationId ) {
                query._id = locationId;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "mirrorlocation",
                action: 'get',
                query: query,
                options: {lean: true}
            }, function( err, locations ) {

                if( err ){
                    Y.log( 'isDispatcher Failed to get location for task: ' + err.message, 'error', NAME );
                    cb( [] );
                } else if( 0 === locations.length ){
                    Y.log( 'isDispatcher location for task not found', 'warn', NAME );
                    cb( [] );
                } else {
                    cb( locations );
                }
            } );
        }

        function addNewPatientTask( user, urgency, prcCustomerNo, patientId, patientName, practiceName, patientIncareStatus, role, patientPartnerId ) {
            // creating new task
            getLocation( user, prcCustomerNo, null, ( locations ) => {
                if( locations.length === 0 ) {
                    return;
                }

                function i18nTitle( name ) {
                    return Y.doccirrus.i18n( `prcsynchro.task.${name}` );
                }

                var title = '', details = '', type = '',
                    isDoquvide = Y.doccirrus.auth.isDOQUVIDE();
                switch( patientIncareStatus ) {
                    case 'new':
                        title = isDoquvide ? i18nTitle( 'newDoquvidePatientTitle' ) : `${i18nTitle( 'newPatientTitle' )} ${patientName}`;
                        details = isDoquvide ? Y.Lang.sub(i18nTitle( 'newDoquvidePatientDetail' ),{
                            doquvideId: patientPartnerId,
                            practiceName: practiceName
                        }) : i18nTitle( 'newPatientDetail' );
                        type = 'NEW_PATIENT';
                        break;
                    case 'on':
                        title = isDoquvide ? i18nTitle( 'onDoquvidePatientTitle' ) : `${i18nTitle( 'PatientTitle' )} ${patientName} ${i18nTitle( 'onPatientTitle2' )}`;
                        details = isDoquvide ? Y.Lang.sub(i18nTitle( 'onDoquvidePatientDetail' ),{
                            doquvideId: patientPartnerId,
                            practiceName: practiceName
                        }) : i18nTitle( 'onPatientDetail' );
                        type = 'NEW_PATIENT';
                        break;
                    case 'off':
                        title = isDoquvide ? i18nTitle( 'offDoquvidePatientTitle' ) : `${i18nTitle( 'PatientTitle' )} ${patientName} ${i18nTitle( 'offPatientTitle2' )}`;
                        details = isDoquvide ? Y.Lang.sub(i18nTitle( 'offDoquvidePatientDetail' ),{
                            doquvideId: patientPartnerId,
                            practiceName: practiceName
                        }) : i18nTitle( 'offPatientDetail' );
                }

                var taskData = {
                    patientId: patientId,
                    patientName: patientName || '',
                    allDay: true,
                    alertTime: (new Date()).toISOString(),
                    title: title,
                    urgency: urgency,
                    details: details,
                    group: false,
                    roles: [ role ],
                    location: locations,
                    creatorName: practiceName,
                    type: type
                };
                if( patientPartnerId ) {
                    taskData.patientPartnerId = patientPartnerId;
                }
                Y.log( 'Creating task: ' + JSON.stringify( taskData ), 'debug', NAME );
                writeTask( user, taskData );

            } );
        }

        function addNewTask( user, urgency, activityId, practiceName, prcCustomerNo ) {


            // creating new task
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "mirroractivity",
                action: 'get',
                query: {_id: activityId}

            }, function( err, activity ) {
                if( err ) {
                    Y.log( 'isDispatcher Failed to get activity for task: ' + err.message, 'error', NAME );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: "dispatchrequest",
                        action: 'get',
                        query: {"dispatchActivities.0.activityId": activity[0]._id.toString()}
                    }, function( err, dispatchrequests ) {
                        if( err ) {
                            Y.log( 'isDispatcher Failed to get request for task: ' + err.message, 'error', NAME );
                        }

                        //update Confirmed date
                        if( dispatchrequests.length > 0 && activity.length > 0 && activity[0].editor &&
                            activity[0].editor[0] && activity[0].editor[0]._id ) {
                            Y.doccirrus.mongodb.getModel( user, 'dispatchrequest', ( err, dispatcherRequestModel ) => {
                                if( err ){
                                    Y.log( 'Error getting model dispatchrequest (update confirmed data): ' + err.message, 'error', NAME );
                                }
                                dispatcherRequestModel.mongoose.update(
                                    {_id: dispatchrequests[0]._id},                                //  query
                                    {$set: {dateConfirmed: activity[0].editor[0]._id.getTimestamp()}},   //  update
                                    {multi: false},                                            //  options
                                    () => {
                                    }
                                );
                            } );

                        }

                        //for Document task should not be created
                        if( activity[0] && activity[0].actType.toString() === 'PROCESS' ) {
                            return;
                        }

                        getLocation( user, prcCustomerNo, activity[0].locationId, ( locations ) => {
                            var //actType = Y.doccirrus.i18n('activity-schema.Activity_E.' + activity[0].actType.toString()),
                                text = Y.doccirrus.i18n( 'prcsynchro.task.APPROVED' ).replace( '{{actType}}', Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activity[0].actType, 'i18n', '' ) ),
                                taskData = {
                                    //employeeId: activity[0].employeeId,
                                    patientId: activity[0].patientId,
                                    allDay: true,
                                    alertTime: (new Date()).toISOString(),
                                    title: text,
                                    urgency: urgency,
                                    details: '',
                                    group: false,
                                    roles: [Y.doccirrus.schemas.patient.DISPATCHER.INCARE],
                                    activityId: activity[0]._id,
                                    activityType: activity[0].actType,
                                    creatorName: practiceName,
                                    location: (locations[0]) ? locations : null
                                };
                            if( dispatchrequests.length > 0 ) {
                                taskData.dispatchRequestId = dispatchrequests[0]._id.toString();
                            }

                            if( activity[0].patientId ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: "mirrorpatient",
                                    action: 'get',
                                    query: {_id: activity[0].patientId}
                                }, function( err, patient ) {
                                    if( err ) {
                                        Y.log( 'isDispatcher Failed to get patient for task: ' + err.message, 'error', NAME );
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
                        } );
                    } );
                }
            } );
        }

        function addChangedActivityTask( user, urgency, dispatchRequest, practiceName ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "mirroractivity",
                action: 'get',
                query: {_id: dispatchRequest.is.dispatchActivities[0].activityId},
                options: {lean: true}
            }, ( err, parentActity ) => {
                if( err ){
                    Y.log( 'isDispatcher Failed to get parent activity for change task ' + err.message, 'error', NAME );
                } else if( 0 === parentActity.length) {
                    Y.log( 'isDispatcher parent activity for change task not found', 'warn', NAME );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: "mirroremployee",
                        action: 'get',
                        query: {_id: parentActity[0].employeeId},
                        options: {lean: true}
                    }, ( err, employee ) => {
                        if( err ) {
                            Y.log( 'isDispatcher Failed to get employee for change task ' + err.message, 'error', NAME );
                        } else if( 0 === employee.length ){
                            Y.log( 'isDispatcher employee for change task not found', 'warn', NAME );
                        } else {
                            getLocation( user, employee[0].prcCustomerNo, parentActity[0].locationId, ( locations ) => {
                                if( locations.length === 0 ) {
                                    return;
                                }

                                var text = Y.doccirrus.i18n( 'prcsynchro.task.CHANGED' ).replace( '{{actType}}',
                                    Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', parentActity[0].actType, 'i18n', '' ) ),
                                    details = '', type = '';

                                var taskData = {
                                    allDay: true,
                                    alertTime: (new Date()).toISOString(),
                                    title: text,
                                    urgency: urgency,
                                    details: details,
                                    group: false,
                                    roles: [Y.doccirrus.schemas.patient.DISPATCHER.INCARE],
                                    location: locations,
                                    creatorName: practiceName,
                                    patientId: parentActity[0].patientId,
                                    activityId: parentActity[0]._id,
                                    activityType: parentActity[0].actType,
                                    type: type,
                                    dispatchRequestId: dispatchRequest._id.toString()
                                };

                                if( parentActity[0].patientId ) {
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: "mirrorpatient",
                                        action: 'get',
                                        query: {_id: parentActity[0].patientId}
                                    }, function( err, patient ) {
                                        if( err ) {
                                            Y.log( 'isDispatcher Failed to get patient for task: ' + err.message, 'error', NAME );
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

                            } );

                        }
                    } );
                }

            } );

        }

        function writeTask( user, taskData ) {
            (taskData.location || []).map( data => {
                data = setCountryMode( data );
                return data;
            });

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "task",
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( taskData )
            }, function( err ) {//, result
                if( err ) {
                    Y.log( 'inCare Failed to add task: ' + err.message, 'error', NAME );
                }
            } );
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

        function upsertFileChunks( user, chunk ) {
            return new Promise( ( resolve, reject ) => {
                const chunkCopy = Object.assign( chunk, { files_id: new ObjectId( chunk.files_id ) } );
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

        function wasChanged( prcRequest ) {
            let notified = prcRequest[0].notified,
                is = prcRequest[0].is.dispatchActivities[0].activities,
                was = prcRequest[0].was.dispatchActivities[0].activities;

            if( notified && notified.length ) {
                was = notified;
            }

            if( is.length !== was.length ) {
                return true;
            }

            let changed = false;
            is.forEach( ( is_el ) => {
                if( changed ) {
                    return;
                }
                let was_arr = was.filter( ( was_el ) => {
                    return _.isEqual( (is_el.activityId || []).sort(), (was_el.activityId || []).sort() );
                } );

                changed = was_arr.length !== 1 || !_.isEqual( _.omit( is_el, ['valid', 'note'] ), _.omit( was_arr[0], ['valid', 'note'] ) );
            } );

            return changed;
        }

        function logDataSynchro( data = {}, who ) {
            let translation;
            switch( data.type ) {
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
                description = Y.doccirrus.i18n( 'dispatchrequest.audit.receive' ),
                entry = Y.doccirrus.api.audit.getBasicEntry( who, 'transfer', 'v_synchro', `${description} (${objectName})` );

            entry.skipcheck_ = true;
            if( data.id || data._id ) {
                entry.objId = data.id || data._id;
            }

            return Y.doccirrus.api.audit.post( {
                user: who,
                data: entry
            } );
        }

        Y.namespace( 'doccirrus.api' ).prcsynchro = {

            name: NAME,

            // check for the allowed payload types
            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.prcsynchro.post', 'info', NAME);

                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prcsynchro.post');
                }

                const { user, data, callback } = args;

                let
                    shouldUpsertDispatch = false,
                    promises = [
                        ...(data.locations || []).map( ( lctn ) => upsertMirrorLocation( user, lctn ) ),
                        ...(data.employees || []).map( ( emp ) => upsertMirrorEmployee( user, emp ) ),
                        ...(data.media || []).map( ( med ) => upsertMedia( user, med ) ),
                        ...(data.documents || []).map( ( doc ) => upsertDocument( user, doc ) ),
                        ...(data.activities || []).map( ( act ) => upsertMirrorActivity( user, act, data.practice.coname, data.casefolders, data.preserveCaseFolder ) ),
                        ...(data.fileMetas || []).map( ( fmeta ) => upsertFileMeta( user, fmeta ) ),
                        ...(data.fileChunks || []).map( ( fchunk ) => upsertFileChunks( user, fchunk ) ),
                        ...(data.patients || []).map( ( pcnt ) => upsertMirrorPatient( user, pcnt, data.practice.coname ) ),
                        ...(data.casefolders || []).map( ( csfldr ) => upsertMirrorCaseFolder( user, csfldr, data.preserveCaseFolder ) )
                    ];

                if( true === data.updatePractice ){
                    promises = [...promises, () => { Promise.resolve(); } ];
                    shouldUpsertDispatch = true;
                }

                let practice = data.practice;
                (data.tasks || []).forEach( task => {
                    addNewTask( user, 2, task.activityId, practice.coname, practice.prcCustomerNo || practice.dcCustomerNo );
                } );

                if( !promises.length ){
                    return callback( null, {} );
                }

                Promise.all( promises ).then( val => {
                    practice.locationId = [];
                    practice.commercialNo = [];
                    practice.employeeId = [];
                    practice.officialNo = [];
                    practice.patientId = [];
                    practice.patientGHD = [];
                    practice.inActiveEmployeId = [];

                    val.forEach( ( elm ) => {

                        logDataSynchro( elm, user );

                        switch( elm.type ) {
                            case "employee":
                                practice.employeeId.push( elm.id );
                                practice.officialNo.push( elm.officialNo );
                                if( elm.hasOwnProperty( 'isActive' ) && elm.isActive === false ) {
                                    practice.inActiveEmployeId.push( elm.id.toString() );
                                }
                                shouldUpsertDispatch = true;
                                break;
                            case "location":
                                practice.locationId.push( elm.id );
                                practice.commercialNo.push( elm.commercialNo );
                                shouldUpsertDispatch = true;
                                break;
                            case "patient":
                                practice.patientId.push( elm.id );
                                practice.patientGHD.push( elm.isGHD );
                                shouldUpsertDispatch = true;
                                break;
                            case "activity":
                                Y.doccirrus.api.dispatchrequest.getDetails( {
                                    user: args.user,
                                    query: {
                                        $or: [
                                            {"dispatchActivities.0.activityId": elm._id},
                                            {"dispatchActivities.0.activities.activityId": elm._id},
                                            {"dispatchActivities.0.notifiedActivities.activityId": elm._id}
                                        ]
                                    },
                                    callback: ( err, prcRequest ) => {
                                        if( err ){
                                            Y.log( 'Error getting dispatchrequest detailse: ' + err.message, 'error', NAME );
                                        }
                                        if( prcRequest && prcRequest[0] && wasChanged( prcRequest ) &&
                                            elm.oldCAseFolderId && elm.oldCAseFolderId !== null ) { // skip first time activity update

                                            // write notified activities back to request
                                            Y.doccirrus.mongodb.getModel( args.user, 'dispatchrequest', ( err, dispatchRequestModel ) => {
                                                if( err ) {
                                                    Y.log( 'Error on getting model ' + JSON.stringify( err ), 'error' );
                                                    return;
                                                }

                                                dispatchRequestModel.mongoose.findOneAndUpdate( {
                                                        _id: prcRequest[0]._id
                                                    }, {
                                                        "dispatchActivities.0.notifiedActivities": prcRequest[0].is.dispatchActivities[0].activities
                                                    }, {
                                                        upsert: false
                                                    }
                                                ).exec().then( () => {
                                                }, ( err ) => {
                                                    Y.log( 'Error on updating notified activities ' + JSON.stringify( err ), 'error' );
                                                } );
                                            } );
                                            if( elm.status && elm.status === 'APPROVED' ) {
                                                addChangedActivityTask( args.user, 2, prcRequest[0], elm.practiceName );
                                            }

                                        }
                                    }
                                } );
                        }
                    } );

                    if( Y.doccirrus.auth.isAmtsIsdSystem() ) {
                        let creationEntriesPromises = (data.patients || []).map( async ( patient ) => {
                            let matchedPatient = await Y.doccirrus.api.activityTransfer.matchPatient( user, patient, data.patientVersion );

                            try {
                                await Y.doccirrus.api.activityTransfer.createTransferLogEntryOrAutomatic( user, patient, matchedPatient, data );
                            } catch (err) {
                                Y.log( `Could not create patient transfer entry. ${JSON.stringify(err && err.stack)}`, 'error', NAME );
                                callback( err );
                            }

                            Y.log( `Patient transfer entry successfully created!`, 'info', NAME );
                        });

                        Promise.all(creationEntriesPromises);
                    }

                    if( shouldUpsertDispatch ) {
                        Y.doccirrus.api.prcdispatch.upsertPRCDispatch( user, practice, callback );
                    } else {
                        callback( null, {} );
                    }
                } ).catch( err => {
                    Y.log('Error on synchronization ' + err.message, 'error', NAME );
                    callback( err );
                } );
            }
        };

    },
    '0.0.1', {
        requires: ['dccommunication', 'dcauth', 'v_prcsynchro-schema', 'syncReportingManager', 'syncAuxManager']
    }
);
