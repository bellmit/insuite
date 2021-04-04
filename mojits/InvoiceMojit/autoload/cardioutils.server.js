/**
 * User: md
 * Date: 27/10/16  12:02
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'dccardioutils', function( Y, NAME ) {

        const
            CARDIO_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO;

        const
            _ = require( 'lodash' ),
            async = require( 'async' ),
            Prom = require( 'bluebird' ),
            moment = require( 'moment' ),
            { formatPromiseResult } = require( 'dc-core' ).utils,
            util = require('util'),
            copyActivityAttachments = util.promisify( Y.doccirrus.activityapi.copyActivityAttachments ),
            initializeFormForActivity = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity );

        function getSerialNumber( patient ) {
            let serialNum;

            if ( patient && patient.partnerIds && patient.partnerIds.length ) {

                patient.partnerIds.forEach( ( partner ) => {
                    if( partner.partnerId === CARDIO_PARTNER_ID &&
                        ( typeof partner.isDisabled === 'undefined' || (typeof partner.isDisabled !== 'undefined' && partner.isDisabled === false ) ) ) {
                        serialNum = partner.patientId;
                    }
                } );

            }

            return serialNum;
        }

        /**
         *
         * @method PRIVATE
         *
         * Get casefolder by patientId and AdditionalType
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.additionalType
         * @param {String} args.patientId
         * @returns {Promise} that contains caseFolder {Object}
         */
        function getCasefolder(user, additionalType, patientId) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'get',
                query: {
                    patientId: patientId,
                    additionalType: additionalType
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } );
        }

        /**
         *
         * @method PUBLIC
         *
         * Create or Get existed or Set "disabled" = false in existed casefolder
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.patientId
         * @param {String} [args.additionalType]
         * @returns {Promise} that contains caseFolderId {String}
         */
        async function createCaseFolderOfType( user, patientId, additionalType ) {
            let err, results, message;

            [ err, results ] = await formatPromiseResult(
                getCasefolder(user, additionalType, patientId)
            );
            if( err ) {
                message = `Failed to get casefolder ( ${additionalType} ) : ${err.message}`;
                Y.log( message, 'error', NAME );
                throw( new Error( message ) );
            }

            if( !results.length ) {
                let caseFolderData = {
                    additionalType,
                    patientId,
                    title: Y.doccirrus.i18n( `casefolder-schema.Additional_E.${additionalType}.i18n` )
                };
                [ err, results ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                    } )
                );
                if( err ) {
                    message = `Failed to post casefolder( ${additionalType} ) : ${err.message}`;
                    Y.log( message, 'error', NAME );
                    throw( new Error( message ) );
                }
                return results[0];
            }

            let casefolderId = results[0]._id.toString();
            if( results[0].disabled ) {
                [err, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'update',
                        query: {_id: casefolderId},
                        data: {
                            $set: {disabled: false}
                        }
                    } )
                );
                if( err ){
                    message = `Feiled to set disabled to false for casefolder( ${additionalType} ) : ${err.message}`;
                    Y.log( message, 'error', NAME );
                    throw( new Error( message ) );
                }
            }

            return casefolderId;
        }

        /**
         *
         * @method PUBLIC
         *
         * Set "disabled" = true on casefolder if there are activities in casefolder
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.additionalType
         * @param {String} args.patientId
         * @returns {Promise} that contains caseFolderId {Object}
         */
        async function removeOrLockCaseFolderOfType( user, patientId, additionalType ) {
            let err, results, message;
            [ err, results ] = await formatPromiseResult(
                getCasefolder(user, additionalType, patientId)
            );
            if( err ) {
                message = `Failed to get casefolder for remove or lock ( ${additionalType} ) : ${err.message}`;
                Y.log( message, 'error', NAME );
                throw( new Error( message ) );
            }
            if( !results.length ){
                return;
            }

            let activityCount,
                casefolderId = results[0]._id.toString();
            [ err, activityCount ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {caseFolderId: casefolderId}
                } )
            );
            if( err ) {
                message = `Failed to get activity count for remove or lock ( ${additionalType} ) : ${err.message}`;
                Y.log( message, 'error', NAME );
                throw( new Error( message ) );
            }
            if( 0 !== activityCount ) {
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'update',
                        query: {_id: casefolderId},
                        data: {
                            $set: {disabled: true}
                        }
                    } )
                );
                if( err ) {
                    message = `Failed to set disabled = true for ( ${additionalType} ) : ${err.message}`;
                    Y.log( message, 'error', NAME );
                    throw( new Error( message ) );
                }
            }
            return casefolderId;
        }

        function processPlaceholders( source, ruleData, activity, patient ) {
            let ruleName = ruleData.ruleSetDescription +
                           ((ruleData.ruleSetDescription.length) ? ' / ' : '') +
                           ruleData.ruleDescription,
                triggeredByText = '',
                subType = '',
                content = '',
                employeeName = '',
                firstName = '',
                lastName = '',
                dateOfBirth = '',
                userName = '';

            if( activity ) {
                triggeredByText = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activity.actType, '-de', 'K. a.' ) +
                                  ' (' + moment( activity.timestamp ).format( 'DD.MM.YYYY (HH:mm:ss)' ) + ')';
                subType = activity.subType;

                content = activity.content;
                employeeName = activity.employeeName;

                if(activity.editor && activity.editor.length){
                    userName = activity.editor[0].name;
                }

            }

            if( patient ) {
                firstName = patient.firstname;
                lastName = patient.lastname;
                dateOfBirth = moment( patient.dob ).format( 'DD.MM.YYYY' );
            }

            source = source.replace( '{ruleName}', ruleName || '' );
            source = source.replace( '{activity}', triggeredByText || '' );
            source = source.replace( '{activity.content}', content || '' );
            source = source.replace( '{activity.user}', userName );
            source = source.replace( '{activity.physician}', employeeName || '' );
            source = source.replace( '{activity.subType}', subType || '' );
            source = source.replace( '{patient.firstName}', firstName || '' );
            source = source.replace( '{patient.lastName}', lastName || '' );
            source = source.replace( '{patient.DoB}', dateOfBirth || '' );

            return source;
        }

        function prepareTaskData( user, ruleData, activity, patient ) {
            let taskData = _.pick(
                ruleData.template,
                ["title", "details", "urgency", "roles", "allDay", "employeeId", "candidates", "locations", "taskType", "type"]
            );


            if( activity ) {
                taskData.patientId = activity.patientId;
                taskData.patientName = patient && Y.doccirrus.schemas.person.personDisplay( {
                        firstname: patient.firstname,
                        lastname: patient.lastname,
                        title: patient.title
                    } ) || '';
                taskData.activityId = activity._id;
                taskData.activityType = activity.actType;

            }

            taskData.details = taskData.details && processPlaceholders( taskData.details, ruleData, activity, patient );
            taskData.title = taskData.title && processPlaceholders( taskData.title, ruleData, activity, patient );

            taskData.alertTime = moment().add( {
                days: ruleData.template.days || 0,
                hours: ruleData.template.hours || 0,
                minutes: ruleData.template.minutes || 0
            } ).toISOString();
            taskData.allDay = false;

            taskData.creatorName = 'Rule Engine';
            if ( user.U && 'su' !== user.id && (user.identityId && 24 === user.identityId.length) ) {
                taskData.creatorName += ` (${user.U})`;
            }
            taskData.type = taskData.type || Y.doccirrus.schemas.task.systemTaskTypes.RULE_ENGINE;

            return taskData;
        }

        async function prepareFormData( user, activity, callback ) {
            let
                result = {
                actType: "FORM",
                timestamp: Date.now(),
                patientId: activity.patientId,
                eventMessage: activity.eventMessage,
                eventDate: activity.eventDate,
                caseFolderId: activity.caseFolderId,
                locationId: activity.locationId,
                d_extra: activity.d_extra,
                code: null,
                formVersion: null,
                formId: null,
                status: 'CREATED',
                attachments: []
            };

            let [ err, employeeLocationData ] = await formatPromiseResult(
                Y.doccirrus.ruleutils.getEmployeeAndLocationForActivity( user, activity )
            );

            if( err ){
                Y.log( `prepareFormData: error getting employee for activity ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            result.employeeId = employeeLocationData.employeeId;
            result.employeeName = employeeLocationData.employeeName;
            result.locationId = employeeLocationData.locationId;
            callback( null, result );
        }

        function removeGeneratedData( user, patientId, serialNum, callback ) {
            let vendorId = {};
            vendorId[CARDIO_PARTNER_ID] = serialNum;

            Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate: true,
                    query: {
                        patientId: patientId,
                        status: { $in: ["VALID", "APPROVED", "CANCELLED", "CREATED"] },
                        $or: [
                            {vendorId: JSON.stringify( vendorId )},
                            {"d_extra.MDC.IDC.DEV.SERIAL": serialNum}
                        ]
                    },
                    data: {
                        $set: {
                            notDeletable: false,
                            status: "VALID"
                        }
                    },
                    options: {
                        multi: true
                    }
                }, ( err ) => {
                    if( err ) {
                        Y.log( 'Error changing activity status  ' + err.message, 'error', NAME );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            patientId: patientId,
                            $or: [
                                {vendorId: JSON.stringify( vendorId )},
                                {"d_extra.MDC.IDC.DEV.SERIAL": serialNum}
                            ]
                        },
                        options: {
                            lean: true
                        }
                    }, ( err, activities ) => {
                        if( err ) {
                            return callback( err );
                        }
                        async.eachSeries( activities, ( activity, cb ) => {
                            Y.log( 'removing activity: ' + JSON.stringify( activity._id ), 'info' );
                            Y.doccirrus.activityapi.doTransition( user, {}, activity, 'delete', false, (err) => {
                                if( err ) {
                                    if( 409 === err.code ) {
                                        Y.log( 'Error removing activity due to notDeletable', 'warn', NAME );
                                        return cb();
                                    } else {
                                        return cb( err );
                                    }
                                }
                                return cb();
                            } );
                        }, ( err ) => {
                            if( err ) {
                                Y.log( 'Error removing activity ' + err.message, 'error', NAME );
                                return callback( err );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'task',
                                action: 'delete',
                                query: {vendorId: JSON.stringify( vendorId )},
                                options: {
                                    override: true
                                }
                            }, ( err ) => {
                                if( err ) {
                                    Y.log( 'Error removing tasks: ' + JSON.stringify( err ), 'error' );
                                }
                                callback( err );
                            } );

                        } );
                    } );
                }
            );

        }

        /**
         * @method multiplyActivitiesByMedia
         * @public
         *
         * create as many copy of newly created activity as many attached filenames matched with regular expression provide from rule
         *
         * @param {Object} user
         * @param {Object} activity             original activity that triggers rule, best use Entry type rule to get exactly needed original activity
         * @param {Function} processFn          function that creates new activity, along with other actions and returns new activity _id
         * @param {Object} formData             content for posting in new activity (parameter for processFn)
         * @param {String} filenameRegexp       regular expression to match filenames of media attached to original activity
         * @param {String} autoGenID
         *
         * @returns {Promise}                   nothing returned as value, result is one or several new activity wit or without attached medias
         */
        async function multiplyActivitiesByMedia( user, activity, processFn, formData, filenameRegexp, autoGenID ){
            const
                //  speed up initial form mapping, since activities all use the same patient, casefolder, etc
                rCache = Y.doccirrus.insight2.reportingCache.createReportingCache();

            let err,
                filteredAttachments;

            if( filenameRegexp && activity.attachments && activity.attachments.length ){
                [ err, filteredAttachments ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'document',
                        action: 'get',
                        query: {
                            _id: {$in: activity.attachments},
                            //contentType: 'application/pdf',
                            caption: {
                                $regex: filenameRegexp,
                                $options: 'i'
                            },
                            activityId: activity._id
                        }
                    } )
                );
                if( err ){
                    Y.log( `multiplyActivitiesByMedia: Error filtering documents by filename: ${err.stack || err}`, 'error', NAME);
                    filteredAttachments = [];
                }
            }

            if( !filteredAttachments || 0 === filteredAttachments.length || !filenameRegexp ){
                [ err ] = await formatPromiseResult(
                    processFn( formData )
                );
                if( err ){
                    Y.log( `multiplyActivitiesByMedia: Error executing action function: ${err.stack || err}`, 'error', NAME);
                }
            }

            let periodOptions = {...formData.periodOptions},
                referenceArea = formData.referenceArea;
            for(let attachmentDoc of (filteredAttachments || []) ){
                let
                    err, newActivityId,
                    attachment = attachmentDoc._id.toString();

                //  If reproducing an activity, include the original Cardio REPORT ID,
                //  needed for mapping forms later - MOJ-10966

                if ( formData.d_extra ) {
                    formData.d_extra.SPLIT_FROM_DOCUMENT = attachmentDoc;

                    if ( attachmentDoc.caption ) {
                        let parts = attachmentDoc.caption.split('_');
                        if ( 'Episode' === parts[0] ) {
                            formData.d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID = parts[3];
                        }
                    }

                    if( formData.d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID && activity.d_extra && activity.d_extra.SPLIT_ON && activity.d_extra.SPLIT_ON.ID &&
                        formData.d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID !== activity.d_extra.SPLIT_ON.ID){
                        Y.log( `Episode file ${attachmentDoc.caption} not match documented episode id:${activity.d_extra.SPLIT_ON.ID}, skip...`, 'info', NAME );
                        continue;
                    }
                }

                formData.autoGenID = `${autoGenID}_documentId_${attachment}`;
                formData.periodOptions = periodOptions;
                formData.referenceArea = referenceArea;

                //  create an activity corresponding to the filtered attachment
                [err, newActivityId] = await formatPromiseResult(
                    processFn( formData )
                );
                if(err){
                    Y.log( `multiplyActivitiesByMedia: Error executing action function for attachments: ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }

                //  copy the filtered attachment
                let attachments;
                [err, attachments] = await formatPromiseResult(
                    copyActivityAttachments( user, false, { _id: activity._id, attachments: [ attachment ] }, newActivityId )
                );
                if(err){
                    Y.log( `multiplyActivitiesByMedia: Error copy attachments: ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }

                //  record copied attachments back to new activity
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'put',
                        query: { _id: newActivityId },
                        fields: [ 'attachments' ],
                        data: { attachments,  skipcheck_: true },
                        context: { _skipTriggerRules: true }
                    } )
                );

                if(err){
                    Y.log( `multiplyActivitiesByMedia: Error putting attachments in new activity: ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }

                //  initialize the form
                if ( formData.formId ) {
                    [ err ] = await formatPromiseResult( initializeFormForActivity(  user, newActivityId, {}, rCache ) );
                    if ( err ) {
                        Y.log( `Problem initializing form ${formData.formId} for activity ${newActivityId}: ${err.stack||err}`, 'warn', NAME );
                        //  not critical, continue despite error, best effort
                    }
                }

            }
        } // end multiplyActivitiesByMedia

        /**
         * @method upsertModel
         * @private
         *
         * upsert model but only posting if not exists
         *
         * @param {Object} user
         * @param {Object} model              model name : activity|task
         * @param {String} data               model data
         *
         * @returns {Promise}{String}         _id of created document
         */
        async function upsertModel( user, model, data ) {
            let query = { $and: [ { autoGenID: data.autoGenID } ] };

            if( model === 'activity' ){
                query.$and = [...query.$and, { status: {$ne: 'CANCELLED' } } ];
            }
            if( model === 'task' ){
                query.$and = [...query.$and, { status: {$ne: 'DONE'} } ];
            }
            let command = {
                user,
                model,
                action: 'upsert',
                data: {...data, skipcheck_: true},
                query,
                options: {setOnInsert: true, omitQueryId: true},
                useCache: false
            };

            delete data.periodOptions;

            if( data.referenceArea && data.referenceArea !== 'ENTRY' ){
                command.context = { _skipTriggerRules: true };
            }
            delete data.referenceArea;

            let [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( command )
            );
            if( err ){
                Y.log(`upsertModel: error upserting model ${model}: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            let docId = result && result._id && result._id.toString();
            if( model !== 'activity' ){
                return docId;
            }

            [ err ] = await formatPromiseResult(
                initializeFormForActivity( user, docId, {}, null )
            );
            if( err ){
                Y.log( `addForm: Error initializing form for activity: ${err.stack || err}`, 'error', NAME );
                throw( err );
            }
            return docId;
        }


        function addTask( user, ruleData ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

            let isCasefolder = (ruleData.ruleSetCaseFolder || []).includes( 'CASEFOLDER' ),
                isPatient = (ruleData.ruleSetCaseFolder || []).includes( 'PATIENT' ),
                isTask = (ruleData.ruleSetCaseFolder || []).includes( 'TASK' );

            let promise,
                id = ( ( isPatient || isTask ) ? ruleData.caseFolderId : ruleData.triggeredBy[0] );

            if(!id){
                promise =  Promise.resolve([]);
            } else {
                promise = runDb( {
                    user: user,
                    model: ( isCasefolder || isPatient || isTask) ? 'casefolder' : 'activity',
                        action: 'get',
                        query: {_id: id},
                        options: {lean: true, limit: 1}
                } );
                }
            promise.then( ( activities ) => {
                let activity = activities && activities[0];

                if(!activities.length || !activities[0].patientId){
                    promise =  Promise.resolve([]);
                } else {
                    if( isCasefolder || isPatient || isTask ){
                        activity.caseFolderId = id;
                        activity.timestamp = new Date();
                    }

                    promise = runDb( {
                        user: user,
                        model: "patient",
                        action: 'get',
                        query: { _id: activity.patientId },
                        options: {lean: true}
                    } );
                }
                promise.then( ( patients ) => {
                    let serialNum = getSerialNumber( patients[0] ),
                        taskData = prepareTaskData( user, ruleData, activity, patients[0] ),
                        vendorId = {},
                        notDeletable = ruleData.template && ruleData.template.notDeletable || false;

                    taskData.title += ( serialNum && 'MEASUREMENT' === activities[0].actType ) ? ' ' + serialNum : '';

                    if( notDeletable && !isCasefolder && !isPatient && !isTask && activities[0] ) {
                        Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'update',
                                migrate: true,
                                query: {
                                    _id: activity._id
                                },
                                data: { notDeletable: notDeletable }
                            }, ( err ) => {
                                if( err ) {
                                    Y.log( 'Error on setting nonDeletable ' + err.message, 'error', NAME );
                                }
                            }
                        );
                    }

                    if( serialNum ) {
                        vendorId[CARDIO_PARTNER_ID] = serialNum;
                        taskData.vendorId = JSON.stringify( vendorId );
                    } else {
                        // specify that form is auto generated by rule engine
                        vendorId.RULEENGINE = 1;
                    }



                    if( ('TASK_WITH_FORM' === ruleData.type || 'FORM_WITHOUT_TASK' === ruleData.type) && ruleData.template.formId && activity ) {
                        prepareFormData( user, activity, ( err, formData ) => {
                            const
                                addFormFn  = async ( formData ) => {
                                    formData.referenceArea = ruleData.referenceArea;

                                    let [ err, formActivityId ] = await formatPromiseResult(
                                        upsertModel( user, 'activity', {...formData, formId: ruleData.template.formId} )
                                    );
                                    if( err ) {
                                        Y.log( `addFormFn: Error on adding Form ${err.stack || err}`, 'error', NAME );
                                    }
                                    if( !err && formActivityId ) {
                                        taskData.formActivityId = formActivityId;
                                        Y.doccirrus.communication.emitEventForSession( {
                                            sessionId: user.sessionId,
                                            event: 'refreshCaseFolder',
                                            msg: {
                                                data: {
                                                    caseFolderId: formData.caseFolderId
                                                }
                                            }
                                        } );
                                    }
                                    if ( 'FORM_WITHOUT_TASK' !== ruleData.type ){
                                        upsertModel( user, 'task', taskData );
                                    }
                                    return formActivityId;
                                },
                                splitByField = async ( user, activity, addFormFn, formData, template = {} ) => {
                                    let arrToSplit = [],
                                        autoGenID = formData.autoGenID;
                                    if( template.arrayFieldPath ){
                                        arrToSplit = _.get(activities[0], ruleData.template.arrayFieldPath);
                                    }
                                    if(!arrToSplit || !Array.isArray(arrToSplit) || arrToSplit.length === 0){
                                        //in any case create one form
                                        arrToSplit = [];
                                        arrToSplit.push(1);
                                    }
                                    let locId = 0;
                                    for( let val of arrToSplit){ //eslint-disable-line no-unused-vars

                                        //  note which XML section this is split on, for later form mapping
                                        if ( activities[0].d_extra ) {
                                            activities[0].d_extra.SPLIT_ON = val;
                                            activities[0].d_extra.SPLIT_PATH = ruleData.template.arrayFieldPath;
                                        }
                                        //in case if no file selected to further split
                                        if ( formData.d_extra ) {
                                            formData.d_extra.SPLIT_ON = val;
                                            formData.d_extra.SPLIT_PATH = ruleData.template.arrayFieldPath;
                                        }

                                        await multiplyActivitiesByMedia( user, activities[0], addFormFn, formData, template.filenameRegexp, `${autoGenID}_partId_${val.ID || locId}` );
                                        locId++;

                                        if ( activities[0].d_extra ) {
                                            delete activities[0].d_extra.SPLIT_ON;
                                            delete activities[0].d_extra.SPLIT_PATH;
                                        }
                                    }
                                };

                            let
                                caseFolderName = ruleData.template && ruleData.template.caseFolder;

                            formData.autoGenID = ruleData.autoGenID;
                            taskData.autoGenID = ruleData.autoGenID;

                            if ( err ){
                                Y.log( 'Error on getting employee for user ' + err.message, 'error', NAME );
                            }

                            formData.vendorId = JSON.stringify( vendorId );
                            formData.notDeletable = notDeletable;

                            if ( caseFolderName ) {
                                getCasefolder(user, caseFolderName, activities[0].patientId || '' ).then( ( caseFolders ) => {
                                    if ( caseFolders && caseFolders.length) {
                                        formData.caseFolderId = caseFolders[0]._id.toString();
                                        splitByField( user, activities[0], addFormFn, formData, ruleData.template );
                                    } else {
                                        Y.log('CaseFolder with additional type ' + caseFolderName+ ' not found!', 'error', NAME );
                                        if ( 'FORM_WITHOUT_TASK' !== ruleData.type ) {
                                            upsertModel( user, 'task', taskData );
                                        }
                                    }
                                } ).catch( err => {
                                        Y.log( 'Casefolder with additional type not found ' + err.message, 'error', NAME );
                                        throw( 'Casefolder with additional type not found ' + err.message );
                                    }
                                );
                            } else {
                                formData.caseFolderId = (isPatient || isTask) ? ruleData.caseFolderId : ( isCasefolder ? ruleData.triggeredBy[0] : activity.caseFolderId );
                                splitByField( user, activities[0], addFormFn, formData, ruleData.template );
                            }
                        } );
                    } else {
                        if ( 'FORM_WITHOUT_TASK' !== ruleData.type ) {
                            taskData.autoGenID = ruleData.autoGenID;
                            upsertModel( user, 'task', taskData );
                        }
                    }

                } ).catch( ( err ) => {
                    Y.log( 'Failed to get patient: ' + err.message, 'error', NAME );
                } );

            } ).catch( ( err ) => {
                Y.log( 'Failed to get activity that trigger rule: ' + err.message, 'error', NAME );

            } );
        }

        /**
         * @method traverse
         * @public
         *
         * recursively traverse json and execute function on strings numbers and Dates
         *
         * @param {Object} obj                  json object or value
         * @param {Array} path                  full path
         * @param {Object} parent                parent Object in which changes will be done
         * @param {Function} fn                 function that should be executed on values
         * @param  {boolean} arrayKeys
         */
        function traverse(obj, path, parent, fn, arrayKeys = false )
        {
            if (obj instanceof Object && !(obj instanceof Date) && obj !== null ) {
                if( !arrayKeys && Array.isArray(obj) ){ //to not add array index in path
                    for (let el of obj){
                        traverse( el, path, el, fn, arrayKeys );
                    }
                } else {
                    for (let key in obj){
                        if (obj.hasOwnProperty(key)){
                            traverse( obj[key], [...path, key], obj, fn, arrayKeys );
                        }
                    }
                }
            } else {
                fn( path, obj, parent);
            }
        }

        /**
         * @method convertNumeric
         * @public
         *
         * if path is found in known XML types, and type is Number then cast type to number in json
         *
         * @param {Array} pathArr               full path
         * @param {String|Number|Date} value    value from original json
         * @param {Object} parent               parent object in which casting should be donr
         */
        function convertNumeric(pathArr, value, parent) {
            const xmlTypes = Y.doccirrus.schemas.cardio.xmlTypes;

            let path = pathArr.join('.'),
                type = xmlTypes[path],
                lastKey = pathArr.length === 0 ? null : pathArr[pathArr.length -1];

            if( type && type === 'Number' && ( typeof value !== 'number' ) && lastKey && parent ){
                parent[lastKey] = +(value);
            }
        }

        Y.namespace( 'doccirrus' ).cardioutils = {
            addTask,
            removeGeneratedData,
            createCaseFolderOfType,
            removeOrLockCaseFolderOfType,
            getSerialNumber,
            multiplyActivitiesByMedia,
            traverse,
            convertNumeric
        };
    },
    '0.0.1', {
        requires: [
            'task-schema',
            'reporting-cache',
            'activityapi'
        ]
    }
);

