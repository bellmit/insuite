/**
 * User: do
 * Date: 07/04/15  16:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'casefolder-api', function( Y, NAME ) {

        const
            i18n = Y.doccirrus.i18n,
            moment = require( 'moment' ),
            _ = require( 'lodash' ),
            util = require( 'util' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            {formatPromiseResult, handleResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            {logEnter, logExit} = require('../server/utils/logWrapping')(Y, NAME),

            // module imports
            MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes;

        /**
         * @module casefolder-api
         */

        function getCaseFolderIdsByType( args ) {
            Y.log('Entering Y.doccirrus.api.casefolder.getCaseFolderIdsByType', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getCaseFolderIdsByType');
            }
            let
                async = require( 'async' ),

                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            function iterate( oId, cb ) {
                setImmediate( function() {
                    cb( null, oId.toString() );
                } );
            }

            function mapResults( err, results ) {
                if( err ) {
                    Y.log( 'getCaseFolderIdsByType: aggregation failed ' + err, 'error', NAME );
                    return callback( err );
                }

                let ids = results && results[0] && results[0].ids || [];

                async.mapSeries( ids, iterate, callback );
            }

            function modelCb( err, model ) {
                if( err ) {
                    Y.log( 'getCaseFolderIdsByType: ' + err, 'error', NAME );
                    return callback( err );
                }

                model.mongoose.aggregate( [
                    {$match: {type: Array.isArray( params.type ) ? {$in: params.type} : params.type}},
                    {$group: {_id: null, ids: {$push: '$_id'}}}
                ], mapResults );
            }

            if( !params.type ) {
                return callback( new Error( 'insufficient arguments' ) );
            }

            Y.doccirrus.mongodb.getModel( user, 'casefolder', true, modelCb );
        }

        /**
         * find the smallest available case number after or equal to the current counter number
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Function} args.callback
         * @return {Number|undefined} currentNumber
         */
        async function getNextCaseNumber(args) {
            const getCaseCounterP = promisifyArgsCallback(Y.doccirrus.schemas.sysnum.getCaseCounter);
            let counter, currentNumber, err, result,
                async = require( 'async' ),
                { user, callback } = args,
                isUsed = true;

            [err, result] = await formatPromiseResult(getCaseCounterP({ user }));

            counter = result && result[0];

            if( err || !counter ) {
                Y.log( 'getNextCaseNumber: no amtsCasefolder counter: ' + JSON.stringify( err ), 'error', NAME );
                return handleResult( err || 'no amtsCasefolder counter', undefined, callback );
            }

            currentNumber = counter.number;
            async.whilst(
                function testFn() {
                    return isUsed;
                },
                async function tryNextNumber( _cb ) {
                    if( /^[0-9]+$/.test( currentNumber ) ) {
                        let [err, count] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'count',
                                model: 'casefolder',
                                query: {caseNumber: (currentNumber + '')},
                                options: {}
                            } )
                        );
                        if( err ) {
                            return _cb( err );
                        }
                        if( 0 < count ) {
                            currentNumber++;
                            return _cb();
                        }
                    }
                    isUsed = false; // jump out of the while
                    return _cb();
                },
                function done( err1 ) {
                    if( err1 ) {
                        Y.log( 'getNextCaseNumber: error getting caseNumber for new casefodler: ' + JSON.stringify( err1 ), 'error', NAME );
                        return handleResult( err1, undefined, callback );
                    }
                    return handleResult( null, currentNumber, callback );
                }
            );
        }

        async function checkCaseNumber( args ) {
            let
                { query = {}, user, callback } = args,
                queryDB = { caseNumber: (query.caseNumber || '') },
                err, count;

            if( query.caseFolderId ) {
                queryDB._id = {$ne: query.caseFolderId};
            }

            [err, count] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'casefolder',
                    action: 'count',
                    query: queryDB
                }));

            if( err ) {
                Y.log( 'checkCaseNumber: error getting casefolder by caseNumber: ' + JSON.stringify( err ), 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            if( 0 < count ) {
                Y.log( 'checkCaseNumber: caseNumber is not valid: ' + JSON.stringify( err ), 'error', NAME );
                return handleResult( Y.doccirrus.errors.rest( 7100, 'caseNumber is not valid', true ), undefined, callback );
            }
            return handleResult( null, undefined, callback );
        }

        function createNewCaseFolder( args ) {
            var user = args.user,
                callback = args.callback,
                data = args.data || {},
                async = require( 'async' ),
                options = args.options || {};
            options = {lean: true, entireRec: true, ...options};
            function getNewTitle( count, type, additionalType ) {
                var titles = {
                        PUBLIC: 'GKV',
                        PRIVATE: 'PKV',
                        PUBLIC_A: 'GKV-Z',
                        PRIVATE_A: 'PKV-Z',
                        PRIVATE_CH: 'KVG',
                        BG: 'BG',
                        SELFPAYER: 'SZ',
                        PRIVATE_CH_UVG: 'UVG',
                        PRIVATE_CH_IVG: 'IVG',
                        PRIVATE_CH_MVG: 'MVG',
                        PRIVATE_CH_VVG: 'VVG',
                        PREPARED: i18n('casefolder-api.PREPARED')
                    },
                    title = titles[type] || '';

                if ( 'PREGNANCY' === additionalType ) {
                    title = 'Schwangerschaft';
                }

                if( count ) {
                    title = title + ' ' + count.toString();
                }
                return title;
            }

            async.waterfall( [
                function( next ) {
                    if( data.title ) {
                        return next( null, data.title );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'count',
                        query: {
                            patientId: data.patientId,
                            type: data.type
                        }
                    }, function( err, count ) {
                        if( err ) {
                            return next( err );
                        }
                        next( err, getNewTitle( count, data.type, data.additionalType ) );
                    } );

                },
                function( title, next ) {
                    data.title = title;
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( data ),
                        options: options
                    }, next );
                },
                async function doAudit( caseFolder, next ) {
                    await formatPromiseResult(
                        doBasicCaseFolderAudit( {
                            caseFolder: caseFolder && Array.isArray( caseFolder ) && caseFolder[0],
                            action: 'post',
                            user: user
                        } )
                    );
                    return next( undefined, caseFolder );
                }
            ], onAllDone );

            function onAllDone( err, result ) {
                callback( err, result );
            }
        }

        /**
         *
         * @param {Object} args
         * @param {module:casefolderSchema.casefolder} args.caseFolder
         * @param {String} args.action
         * @param {module:patientSchema.patient} args.patient
         * @return {String} description
         */
        function generateAuditLogDescription( args ) {
            const {
                caseFolder,
                action,
                patient
            } = args;

            if( !Y.doccirrus.schemas.audit.isValidAction( action ) ) {
                return '';
            }

            return Y.doccirrus.i18n( `casefolder-schema.audit.${action}`, {
                data: {
                    title: caseFolder.title,
                    personDisplay: Y.doccirrus.schemas.person.personDisplay( patient ),
                    personDOB: patient.kbvDob,
                    personId: patient.patientNo
                }
            } );
        }

        /**
         *
         * @param {Object} args
         * @param {module:casefolderSchema.casefolder} args.caseFolder
         * @param {module:authSchema.auth} args.user
         * @param {String} args.action
         * @returns {Promise<module:casefolderSchema.casefolder|undefined>}
         */
        async function doBasicCaseFolderAudit( args ) {
            const {
                caseFolder,
                user,
                action
            } = args;
            if( !caseFolder ) {
                return;
            }

            let patient;

            [, patient] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'get',
                    query: {
                        _id: ObjectId( caseFolder.patientId )
                    },
                    options: {
                        lean: true
                    }
                } )
            );
            if( !patient || !Array.isArray( patient ) ){
                return caseFolder;
            }

            await formatPromiseResult(
                Y.doccirrus.api.audit.postEntryWithValidation( {
                    user: user,
                    description: generateAuditLogDescription( {
                        caseFolder: caseFolder,
                        patient: patient[0],
                        action: action
                    } ),
                    action: action,
                    model: 'caseFolder',
                    objId: caseFolder._id.toString()
                } )
            );
            return caseFolder;
        }

        /**
         *
         * @param {Object} args
         * @param {String} args.action
         * @param {Function} [args.callback]
         * @param {module:casefolderSchema.casefolder} args.data
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @returns {Promise<Object|String>}
         */
        async function put( args ) {
            const
                timer = logEnter( 'Y.doccirrus.api.casefolder.put' ),
                {
                    action = 'put',
                    callback,
                    data,
                    user,
                    query,
                    options
                } = args;
            let {
                data: {
                    fields_
                }
            } = args;

            if( fields_ && Array.isArray( fields_ ) && fields_.length ) {
                fields_ = fields_.filter( filterFields );
            } else {
                fields_ = Object.getOwnPropertyNames( data ).filter( filterFields );
            }

            const [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'put',
                    model: 'casefolder',
                    query: query,
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    fields: fields_,
                    options: {
                        lean: true,
                        ...options
                    }
                } )
            );

            await formatPromiseResult(
                doBasicCaseFolderAudit( {
                    caseFolder: result,
                    action: action,
                    user: user
                } )
            );

            logExit( timer );
            return handleResult( err, result, callback );
        }

        /**
         *
         * @param {String} field
         * @returns {boolean}
         * @private
         */
        function filterFields( field ) {
            return Object.getOwnPropertyNames( Y.doccirrus.schemas.casefolder.schema ).includes( field );
        }

        /**
         * Copies activities to specified casefolder.
         *  Sets areTreatmentDiagnosesBillable to '1' and status to 'VALID'
         *
         *  (1) Load all activities out of database
         *  (2) For any activities which are MEDICATIONS, update the activity from MMI
         *  (3) Update / remove links between activities, assign new _ids
         *  (4) Update location, etc and save the copies to database
         *  (5) Let user know about any MEDICATION activities which were not copied because MMI could not confirm them
         *
         * @method copyToCaseFolder
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Array} args.query.activityIds
         * @param {String} args.query.caseFolderId
         * @param {String} [args.query.locationId]
         * @param {String} [args.query.employeeId]
         * @param {String} [args.query.timestamp]
         * @param {Function} args.callback
         */

        async function copyActivitiesToCaseFolder( args ) {
            let
                {query = {}, user, options = {}, callback} = args,

                copyIds = [],
                err, allActivities, activity, mmiData, newId,
                notPresentInMMIArr = [];

            Y.log( `Copy activities ${query.activityIds} to casefolder ${query.caseFolderId}`, 'debug', NAME );

            //  (1) Load all activities out of database

            [ err, allActivities ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: { $in: query.activityIds }
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not load activities to copy: ${err.stack||err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( typeof options.transform === 'function' ) {
                allActivities.forEach( options.transform );
            }

            // preserve order of copied activities
            allActivities = allActivities.sort( ( a, b ) => {
                return query.activityIds.indexOf( a._id.toString() ) - query.activityIds.indexOf( b._id.toString() );
            } );

            //  (2) For any activities which are MEDICATIONS, update the activity from MMI
            //  Note: we remove any medications which are not in the catalog, recorded in notPresentInMMIArr

            for ( activity of allActivities ) {
                //If we are copying IMPORTED MEDICATION then only update data from MMI before saving
                if( activity.actType === 'MEDICATION' && activity.empImportId && activity.patImportId && activity.locImportId ) {

                    [ err, mmiData ] = await formatPromiseResult( getMedicationDataP( activity ) );

                    if ( err ) {
                        Y.log( `Error occurred while request to mmi: ${JSON.stringify( err )}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( mmiData && mmiData.medicationData && Object.keys( mmiData.medicationData ).length ) {
                        activity = copyMMIDataToActivity( activity, mmiData );
                        Y.log( `Updated MEDICATION properties from MMI: ${activity._id}`, 'debug', NAME );
                    } else {
                        notPresentInMMIArr.push( activity.phPZN );
                        activity.removeFromSet = true;
                    }
                }

                if( 'TREATMENT' === activity.actType && activity.hierarchyRules ) {
                    activity.hierarchyRules.forEach( ( rule ) => {
                        rule.checked = false;
                    });

                    activity.activities = [];
                    activity.referencedBy = [];
                }
            }

            allActivities = allActivities.filter( item => item.removeFromSet !== true );

            //  (3) Update / remove links between activities, assign new _ids
            allActivities = Y.doccirrus.api.linkedactivities.unlinkOnCopy( allActivities );

            //  (4) Update location, etc and save the copies to database
            //  Note: when saving a copy, we must first copy attachments of the original

            async function saveCopiedActivity( activity ) {
                const
                    copyActivityAttachments = util.promisify( Y.doccirrus.activityapi.copyActivityAttachments ),
                    activityPost = promisifyArgsCallback( Y.doccirrus.api.activity.post );

                let [err, newAttachmentIds] = await formatPromiseResult( copyActivityAttachments( user, false, activity, activity._id ) );
                if ( err ) {
                    Y.log( `saveCopiedActivity: error saving attachments ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }

                activity.attachments = newAttachmentIds;

                // trySetNewTimestamp functionality to keep order of copied activities

                let newTimestamp;
                [ err, newTimestamp ] = await formatPromiseResult(
                    Y.doccirrus.api.activity.getNextTimestamp( { user, activity, options: { setTimestamp: activity.timestamp, currentDate: false } } )
                );
                if( err ){
                    Y.log( `saveCopiedActivity: error getting new timestamp: ${err.stack || err}`, 'warn', NAME );
                } else {
                    activity.timestamp = newTimestamp;
                }

                let result;
                [ err, result ] = await formatPromiseResult( activityPost( {
                    user,
                    data: activity
                } ) );

                if ( err ) {
                    Y.log( `saveCopiedActivity: error saving copied activity ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }

                return result;
            }

            for ( activity of allActivities ) {

                //  set new caseFolderId and make valid
                activity.caseFolderId = query.caseFolderId;
                activity.status = 'VALID';

                //  set location, employee and timestamp, if specified in query
                activity.locationId = query.locationId ? query.locationId : activity.locationId;
                activity.employeeId = query.employeeId ? query.employeeId : activity.employeeId;
                activity.timestamp = query.timestamp ? query.timestamp : activity.timestamp;

                //  treatments only
                activity.areTreatmentDiagnosesBillable = '1';

                delete activity.mirrorActivityId;
                delete activity.mirrorCaseFolderType;
                delete activity.referencedBy;

                activity.isPrescribed = false;

                [ err, newId ] = await formatPromiseResult( saveCopiedActivity( activity ) );

                if ( !err && !newId[0] ) {
                    err = new Error( 'Copied activity not saved.' );
                }

                if ( err ) {
                    Y.log( `Could not save new copy of activity: ${err.stack||err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                Y.log( `Saved new copy of activity: ${newId}`, 'info', NAME );
                copyIds.push( newId[0] );
            }

            //  (5) Let user know about any MEDICATION activities which were not copied because MMI could not confirm them
            if ( notPresentInMMIArr.length > 0 ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    msg: {
                        data: i18n('casefolder-api.MEDICATION_NOT_FOUNDIN_DB_MSG') + notPresentInMMIArr.join( ', ' )
                    }
                } );
            }

            //  utility - wrap Y.doccirrus.api.activity.getMedicationData in a promise to simplify code above
            function getMedicationDataP( activity ) {
                function wrapGetMedicationData( resolve, reject ) {
                    Y.doccirrus.api.activity.getMedicationData( {
                        user: user,
                        data: {
                            locationId: activity.locationId.toString(),
                            employeeId: activity.employeeId,
                            patientId: activity.patientId,
                            pzn: activity.phPZN,
                            caseFolderId: activity.caseFolderId
                        },
                        callback: onMMIResponse
                    } );

                    function onMMIResponse( err, result ){
                        if( err ) { return reject( err ); }
                        resolve( result );
                    }
                }

                return new Promise( wrapGetMedicationData );
            }

            //  utility - copy MMI data to activity
            function copyMMIDataToActivity( activity, mmiData ) {
                let k;
                for ( k in mmiData ) {
                    if ( mmiData.hasOwnProperty(k) ) {
                        activity[k] = mmiData[k];
                    }
                }
                return activity;
            }

            //  call back with array of new activity _ids
            return handleResult( null, copyIds, callback );
        }

        function updateCaseFolderRuleStats( args ) {
            Y.log('Entering Y.doccirrus.api.casefolder.updateCaseFolderRuleStats', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.updateCaseFolderRuleStats');
            }
            const ObjectId = require( 'mongoose' ).Types.ObjectId,
                { user, originalParams: params, callback } = args,
                emitUpdateStats = _.debounce( (user, caseFolderId) => {
                    return Y.doccirrus.communication.emitEventForSession( {
                        sessionId: user.sessionId,
                        event: 'caseStatsUpdated',
                        msg: {
                            data: {
                                caseFolder:{
                                    _id: caseFolderId
                                }
                            }
                        }
                    } );
                }, 50);

            function modelCb( err, model ) {
                if( err ) {
                    return callback( err );
                }

                model.mongoose.update( {_id: new ObjectId( params.caseFolderId )}, {
                    ruleErrors: params.stats.errors || 0,
                    ruleWarnings: params.stats.warnings || 0,
                    ruleActivities: params.stats.activities || 0
                }, (err, result) => {
                    emitUpdateStats( user, params.caseFolderId );
                    callback( err, result );
                } );
            }

            if( !params.caseFolderId ) {
                return callback( Error( 'Missing Parameter: caseFolderId' ) );
            }

            if( !params.stats ) {
                return callback( Error( 'Missing Parameter: stats' ) );
            }

            Y.doccirrus.mongodb.getModel( user, 'casefolder', true, modelCb );
        }

        /**
         * Collecting  invoice entries related to case folder id, and put their ids into caseFolder.sumexErrors
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         * @returns {Promise.<Object>}
         */
        async function updateCaseFolderSumexStatus( args ) {
            const
                {data, callback, user} = args,
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                {caseFolderIds} = data;
            let err, invoiceEntries;

            if( !caseFolderIds ) {
                Y.log( `updateCaseFolderSumexStatus: caseFolderIds are required`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid params.'} ), null, callback );
            }

            try {
                caseFolderIds.forEach( async ( caseFolderId ) => {
                    [err, invoiceEntries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'invoiceentry',
                        action: 'get',
                        query: {
                            $and: [
                                {"source": "sumex"},
                                {"data.caseFolderId": {$in: [caseFolderId]}}
                            ]
                        }
                    } ) );

                    if( err ) {
                        Y.log( `updateCaseFolderSumexStatus: failed to get invoice entries, caseFolderId: ${caseFolderId}`, 'error', NAME );
                        throw new Error( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Bad request'} ) );
                    }

                    invoiceEntries = invoiceEntries.result ? invoiceEntries.result : invoiceEntries;

                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'put',
                        query: {
                            _id: new ObjectId( caseFolderId )
                        },
                        fields: ["sumexErrors"],
                        data: Y.doccirrus.filters.cleanDbObject( {sumexErrors: invoiceEntries.map( entry => entry._id.toString() )} )
                    } ) );

                    if( err ) {
                        Y.log( `updateCaseFolderSumexStatus: failed to update sumexErrors, caseFolderId : ${caseFolderId}`, 'error', NAME );
                        throw new Error( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Bad request'} ) );
                    }
                } );
            } catch (error) {
                return handleResult(error, null, callback);
            }

            return handleResult(null, {}, callback);
        }

        function getCaseFolderById(user, caseFolderId, callback) {
            Y.doccirrus.mongodb.runDb( { //todo
                model: 'casefolder',
                user: user,
                query: {
                    _id: caseFolderId
                },
                options: {
                    lean: true
                },
                callback: callback
            } );
        }

        /**
         * Checks (and create) casefolder for specified query.
         * if there is casefolder which matches specified query, then return plain object of the casefolder
         * if not, will create one using specified data.
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.data
         * @param {Object} args.query
         * @param {Function} args.callback
         * @return {Object|module:casefolderSchema.casefolder}
         */
        function checkCaseFolder( args ) {
            var
                user = args.user,
                query = args.query || {},
                data = args.data || {},
                callback = args.callback,
                async = require( 'async' );

            if( !query ) {
                return callback( Y.doccirrus.errors.rest( 400, 'query is required', true ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'get',
                        query: query,
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, function( err, result ) {
                        if( err ) {
                            return next( err );
                        }
                        next( err, result[ 0 ] );
                    } );
                }, function( casefolder, next ) {
                    if( casefolder ) {
                        setImmediate( next, null, casefolder );
                    } else {
                        let
                            fields = Object.keys( data );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'casefolder',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( data ),
                            fields: fields,
                            options: {
                                entireRec: true
                            }
                        }, ( err, result ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( err, result[ 0 ] );
                        } );
                    }
                }
            ], callback );
        }

        function removeEdmpTypeFromPatient( user, casefolder, callback ) {

            function finalCb( err, results ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, results );
            }

            function modelCb( err, patientModel ) {
                if( err ) {
                    return callback( err );
                }

                patientModel.mongoose.update( {_id: casefolder.patientId}, {$pull: {edmpTypes: {$in: [casefolder.additionalType]}}}, finalCb );
            }

            Y.doccirrus.mongodb.getModel( user, 'patient', true, modelCb );
        }

        function deleteCaseFolder( args ) {
            const
                edmpRemovals = {},
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            function notifyUserAboutEdmpRemoval() {
                const patientIds = Object.keys( edmpRemovals );

                if( patientIds.length ) {
                    runDb( {
                        model: 'patient',
                        user: args.user,
                        query: {
                            _id: {$in: patientIds}
                        },
                        options: {
                            lean: true,
                            select: {
                                firstname: 1,
                                lastname: 1,
                                edmpTypes: 1
                            }
                        }
                    } ).then( patients => {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: args.user.identityId,
                            event: 'message',
                            msg: {
                                data: patients.map( patient => {
                                    return i18n( 'casefolder-api.REMOVED_EDMP_TYPE', {
                                        data: {
                                            firstname: patient.firstname,
                                            lastname: patient.lastname,
                                            edmpTypes: edmpRemovals[patient._id].join( ',' )
                                        }
                                    } );
                                } ).join( '\n' )
                            }
                        } );
                    } ).catch( err => {
                        Y.log( 'could not notify user about removed edmpTypes: ' + err, 'error', NAME );
                    } );
                }
            }

            Promise.resolve( runDb( {
                model: 'casefolder',
                user: args.user,
                query: args.query,
                options: {lean: true}
            } ) ).map( caseFolder => {

                return new Promise( ( resolve, reject ) => {
                    if( !Y.doccirrus.schemas.casefolder.isEDMP( caseFolder ) ) {
                        resolve();
                        return;
                    }
                    removeEdmpTypeFromPatient( args.user, caseFolder, ( err, result ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            if( result && result.nModified ) {
                                if( !Array.isArray( edmpRemovals[caseFolder.patientId] ) ) {
                                    edmpRemovals[caseFolder.patientId] = [];
                                }
                                edmpRemovals[caseFolder.patientId].push( caseFolder.additionalType );
                            }
                            resolve();
                        }
                    } );
                } );

            }, {concurrency: 1} ).then( () => {

                notifyUserAboutEdmpRemoval();

                return runDb( {
                    action: 'delete',
                    model: 'casefolder',
                    user: args.user,
                    query: args.query,
                    options: {lean: true, ...args.options}
                } );
            } )
                .then( async function doAudit( caseFolder ) {
                    await formatPromiseResult(
                        doBasicCaseFolderAudit( {
                            caseFolder: caseFolder && Array.isArray( caseFolder ) && caseFolder[0],
                            action: 'delete',
                            user: args.user
                        } )
                    );
                    return caseFolder;
                } )
                .then( ( result ) => {
                    args.callback( null, result );
                } )
                .catch( err => args.callback( err ) );
        }

        /**
         * Checks all case folders which match query and removes all which do not have activity.
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         * @return {Object|module:casefolderSchema.casefolder}
         */
        function deleteEmpty( args ) {
            let
                user = args.user,
                query = args.query || {},
                callback = args.callback,
                async = require( 'async' );
            return async.waterfall( [
                function( next ) {
                    /**
                     * Get casefolders id by query
                     */
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'casefolder',
                        query: query,
                        options: {
                            lean: true,
                            select: {
                                _id: 1,
                                patientId: 1
                            }
                        }
                    }, function( err, result ) {
                        if( err ) {
                            return next( err );
                        }
                        next( err, result );
                    } );
                }, function( caseFolderList, next ) {
                    let
                        idToDelete = [];
                    if( !caseFolderList.length ) {
                        return setImmediate( next, null, [] );
                    }
                    async.each( caseFolderList, function( caseFolder, done ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            action: 'count',
                            query: {
                                caseFolderId: caseFolder._id.toString(),
                                patientId: caseFolder.patientId
                            }
                        }, function( err, count ) {
                            if( err ) {
                                return done( err );
                            }
                            if( 0 === count ) {
                                idToDelete.push( caseFolder._id.toString() );
                            }
                            done();
                        } );
                    }, function( err ) {
                        if( err ) {
                            return next( err );
                        }
                        next( err, idToDelete );
                    } );
                }, function( idList, next ) {
                    if( !idList.length ) {
                        return setImmediate( next );
                    }
                    Y.doccirrus.api.casefolder.delete( {
                        user: user,
                        query: {
                            _id: { $in: idList }
                        },
                        options: {
                            overrride: true
                        },
                        callback: next
                    } );
                }, async function doAudit( caseFolder, next ) {
                    await formatPromiseResult(
                        doBasicCaseFolderAudit( {
                            caseFolder: caseFolder && Array.isArray( caseFolder ) && caseFolder[0],
                            action: 'delete',
                            user: user
                        } )
                    );
                    return next( undefined, caseFolder );
                }
            ], callback );
        }

        /**
         * Gets case folders which is visible for current user.
         * ATTENTION: be carefull, last item is activities count for prepared casefolder
         *  !!!Overrides query.$or
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.data
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        async function getCaseFolderForCurrentEmployee( args ) {
            let
                { user, data, query, options, callback } = args,
                err,
                caseFolders,
                caseFoldersIds,
                activitiesCount;
            const getAllowedCaseFolderForEmployeeP = promisifyArgsCallback(Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee);

            [err, caseFoldersIds] = await formatPromiseResult(
                    getAllowedCaseFolderForEmployeeP( {
                        user,
                        query,
                        options: {
                            select: {
                                _id: 1
                            }
                        }
                    } ) );

            if( err ){
                Y.log( `getCaseFolderForCurrentEmployee: Error on getting allowed case folders ids for employees: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let
                _query = Object.assign( {}, query );
            if( !_query._id ) {
                _query._id = { $in: caseFoldersIds };
            }

            [err, caseFolders] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    data,
                    model: 'casefolder',
                    query: _query,
                    action: 'get',
                    options: options
                } ) );

            if( err ){
                Y.log( `getCaseFolderForCurrentEmployee: Error on getting allowed case folders for employees: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let activitiesQuery = {
                patientId: query.patientId,
                caseFolderId: Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId()
            };

            [err, activitiesCount] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    data,
                    model: 'activity',
                    query: activitiesQuery,
                    action: 'count'
                } ) );

            if( err ){
                Y.log( `getCaseFolderForCurrentEmployee: Error on counting activities for PREPARED casefolder: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }


            if( caseFolders && caseFolders.result ) {
                caseFolders.result.push({
                    activitiesCount: activitiesCount
                });
            }
            return callback( null, caseFolders );
        }

        /**
         * Gets query to find all allowed case folders for user employee
         * @method getCaseFolderQueryForEmployee
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query] original case folder query
         * @param {Function} args.callback
         * @return {Object} dbQuery
         */
        function getCaseFolderQueryForEmployee( args ) {
            let
                { user, data = {}, query = {}, callback } = args;
            function createQuery( employee ) {
                let
                    resultQuery = query,
                    isPartner = user.groups && user.groups.some( item => Y.doccirrus.schemas.employee.userGroups.PARTNER === item.group );
                if( isPartner ) {
                    let
                        caseFolderQuery = {
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ASV,
                            identity: { $in: (employee && employee.asvTeamNumbers) || [] }
                        };
                    if( query && Object.keys( query ).length ) {
                        resultQuery = {
                            $and: [
                                query,
                                caseFolderQuery
                            ]
                        };
                    } else {
                        resultQuery = caseFolderQuery;
                    }
                }
                return resultQuery;
            }

            if( data.employee ) {
                return callback( null, createQuery( data.employee ) );
            }
            Y.doccirrus.api.employee.getMyEmployee( {
                user: user,
                callback: function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !results || !results[ 0 ] ) {
                        Y.log( 'getCaseFolderQueryForEmployee. Employee not found. user: '+ JSON.stringify(user), 'error', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Employee not found' } ) );
                    }
                    callback( null, createQuery( results && results[ 0 ] ) );

                }
            } );
        }

        /**
         * Gets case folders which are allowed for user employee
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.options]
         * @param {Object} [args.options.select] can be used to reduce number of fields
         * @param {Object} [args.query] original case folder query
         * @param {Function} args.callback
         */
        function getAllowedCaseFolderForEmployee( args ){
            let
                user = args.user,
                data = args.data || {},
                query = args.query || {},
                options = args.options || {},
                callback = args.callback,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.casefolder.getCaseFolderQueryForEmployee({
                        user,
                        data,
                        query,
                        callback: next
                    });
                },
                function( _query, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        data: data,
                        model: 'casefolder',
                        query: _query,
                        action: 'get',
                        options: {
                            lean: true,
                            select: options.select
                        }
                    }, function( err, caseFolders ) {
                        if( err ) {
                            return next( err );
                        }

                        next( err, caseFolders );

                    } );
                }
            ], callback );


        }
        function getCaseFolder( args ){
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'casefolder',
                user: args.user,
                migrate: args.migrate,
                query: args.query,
                options: args.options
            }, args.callback );
        }

        /**
         *  Find and close any open pregnancy casefolder(s) for a patient
         *
         *  Raised in response to END_OF_PREGNANCY MEDDATA created in other casefolders
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user                           REST user or equivalent
         *  @param  {Function}  args.callback
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.patientId       _id patient to check for ongoing pregnancies
         *  @param  {String}    args.originalParams.reasonToClose   reason the pregnancy has ended (text val of MEDDATA)
         */

        function lockAnyPregnancyCaseFolder( args ) {
            Y.log('Entering Y.doccirrus.api.casefolder.lockAnyPregnancyCaseFolder', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.lockAnyPregnancyCaseFolder');
            }
            var
                async = require( 'async' ),
                params = args.originalParams,
                patientId = params.patientId ? params.patientId : null,
                reasonToClose = params.reasonToClose ? params.reasonToClose : null,
                caseFolders;

            if ( !patientId ) { return args.callback( Y.doccirrus.errors.rest( 500, 'Missing patientId' ) ); }
            if ( !reasonToClose ) { return args.callback( Y.doccirrus.errors.rest( 500, 'Missing reasonToClose' ) ); }

            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'model': 'casefolder',
                'query': {
                    'patientId': patientId,
                    'additionalType': 'PREGNANCY',
                    'disabled': false
                },
                'callback': onLookupActivePregnancyCase
            } );

            function onLookupActivePregnancyCase( err, result ) {
                if ( err ) { return args.callback( err ); }
                if ( 0 === result.length ) { return args.callback( null ); }

                caseFolders = result;
                async.eachSeries( caseFolders, closeSinglePegnancy, args.callback );
            }

            function closeSinglePegnancy( caseFolder, itcb ) {
                lockPregnancyCaseFolder( {
                    'user': args.user,
                    'originalParams': {
                        'caseFolderId': caseFolder._id.toString(),
                        'reasonToClose': reasonToClose
                    },
                    'callback': itcb
                } );
            }

        }

        /**
         *  Called via JSONRPC API to record the end of a pregnancy, MOJ-8551
         *
         *
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user                           REST user or equivalent
         *  @param  {Function}  args.callback
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.caseFolderId    _id of open pregnancy case
         *  @param  {String}    args.originalParams.reasonToClose   reason the pregnancy has ended
         */

        function lockPregnancyCaseFolder( args ) {
            Y.log('Entering Y.doccirrus.api.casefolder.lockPregnancyCaseFolder', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.lockPregnancyCaseFolder');
            }
            var
                async = require( 'async' ),
                params = args.originalParams,
                caseFolderId = params.caseFolderId ? params.caseFolderId : null,
                reasonToClose = params.reasonToClose ? params.reasonToClose : null,
                hasExistingProcess = false,
                caseFolder;

            if ( !caseFolderId || !reasonToClose ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'missing required params' ) );
            }

            async.series(
                [
                    loadCaseFolder,
                    checkForNote,
                    createNote,
                    createMedData,
                    lockCaseFolder
                ],
                onAllDone
            );

            //  1. Load the casefolder to check that it exists and is unlocked
            function loadCaseFolder( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'casefolder',
                    'query': { _id: caseFolderId },
                    'callback': onCaseFolderLoaded
                } );

                function onCaseFolderLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 404, 'Casefolder not found' ); }
                    if ( err ) { return itcb( err ); }

                    caseFolder = result[0];

                    if ( caseFolder.disabled ) {
                        err = Y.doccirrus.errors.rest( 500, 'Casefolder is already closed, not repeating.' );
                        return itcb( err );
                    }

                    itcb( null );
                }
            }

            //  2. Check the casefolder for any existing PROCESS activity
            function checkForNote( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': {
                        'caseFolderId': caseFolderId,
                        'actType': 'PROCESS'
                    },
                    'callback': onProcessQuery
                } );

                function onProcessQuery( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( result && result[0] ) {
                        hasExistingProcess = true;
                    }
                    itcb( null );
                }
            }

            //  3. Create a PROCESS entry to note why the pregnancy ended (live birth, miscarriage, terminated, etc)
            function createNote( itcb ) {
                //  If PROCESS already exists then we can skip this step, the pregnancy case was already closed,
                //  reopened and is being closed again
                if ( hasExistingProcess ) { return itcb( null ); }

                var
                    postData = {
                        'status': 'VALID',
                        'actType': 'PROCESS',
                        'content': reasonToClose,
                        'userContent': reasonToClose,
                        'patientId': caseFolder.patientId + '',
                        'caseFolderId': caseFolderId + ''
                    };

                Y.doccirrus.api.activity.createActivityForPatient( {
                    'user': args.user,
                    'data': postData,
                    'query': { _id: caseFolder.patientId + '' },
                    'callback': onNoteCreated
                } );

                function onNoteCreated( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Created process entry to finalize casefolder.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  4. Create MEDDATA entry to record end of pregnancy
            function createMedData( itcb ) {
                //  If PROCESS already exists then we can skip this step, the pregnancy case was already closed,
                //  reopened and is being closed again, it is up to the doctor to create the meddata entry
                if ( hasExistingProcess ) { return itcb( null ); }

                var
                    postData = {
                        'status': 'VALID',
                        'actType': 'MEDDATA',
                        'content': 'End of pregnancy',      //  should be overwritten by post-process
                        'userContent': 'End of pregnancy',  //  should be overwritten by post-process
                        'patientId': caseFolder.patientId + '',
                        'caseFolderId': caseFolderId + '',
                        'medData': [
                            {
                                "category": MedDataCategories.BIOMETRICS,
                                "type": MedDataTypes.END_OF_PREGNANCY,
                                "textValue": reasonToClose,
                                "unit": ""
                            }
                        ]
                    };

                //  If process already exists then we can skip this step, the pregnancy case was already closed,
                //  reopened and is being closed again
                if ( hasExistingProcess ) { return itcb( null ); }

                Y.doccirrus.api.activity.createActivityForPatient( {
                    'user': args.user,
                    'data': postData,
                    'query': { _id: caseFolder.patientId + '' },
                    'callback': onMeddataCreated
                } );

                function onMeddataCreated( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Created meddata entry to finalize casefolder.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  5. Lock the casefolder to further entries
            function lockCaseFolder( itcb ) {
                var
                    putData = {
                        'disabled': true,
                        'fields_': [ 'disabled' ]
                    };
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'casefolder',
                    'action': 'put',
                    'query': { _id: caseFolderId },
                    'data': Y.doccirrus.filters.cleanDbObject( putData ),
                    'callback': onCaseFolderLocked
                } );

                function onCaseFolderLocked( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not close pregnancy casefolder: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, { 'status': 'done' } );
            }
        }

        /**
         *  Reopen an preiously closed pregnancy case to make changes
         *
         *  @param  args
         *  @param  args.user
         *  @param  args.query
         *  @param  args.callback
         */

        function unlockPregnancyCaseFolder( args ) {
            Y.log('Entering Y.doccirrus.api.casefolder.unlockPregnancyCaseFolder', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.unlockPregnancyCaseFolder');
            }
            var
                query = args.query || {},
                caseFolderId = query._id || null,
                putData = {
                    'disabled': false,
                    'fields_': [ 'disabled' ]
                };

            if ( !caseFolderId ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'Missing caseFolderId' ) );
            }

            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'model': 'casefolder',
                'action': 'put',
                'query': { _id: caseFolderId },
                'data': Y.doccirrus.filters.cleanDbObject( putData ),
                'callback': onCaseFolderUnlocked
            } );

            function onCaseFolderUnlocked( err /*, result */ ) {
                if ( err ) {
                    Y.log( 'Could not unlock casefolder: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null );
            }

        }

        /**
         * Gets:
         * 1. best location: from Schein, from patient insurance
         * 2. hasLastSchein
         *
         * @method getCaseFolderDataForActivity
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.patientId
         * @param {Object} args.data.caseFolderId
         * @param {Object} [args.data.caseFolderType] set to avoid extra db call
         * @param {Object} [args.data.insuranceLocation] set to avoid extra db call
         * @param {Function} args.callback
         */
        function getCaseFolderDataForActivity( args ) {
            Y.log('Entering Y.doccirrus.api.casefolder.getCaseFolderDataForActivity', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getCaseFolderDataForActivity');
            }
            const
                { user, data: { patientId, caseFolderId, caseFolderType, insuranceLocation } = {}, callback } = args,
                async = require( 'async' ),
                moment = require( 'moment' ),
                data = {};
            async.series( [
                function( next ) {
                    if( insuranceLocation ){
                        return setImmediate( next );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: patientId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'patient nor found' } ) );
                        }
                        data.patient = results[ 0 ];
                        next();
                    } );
                },
                function( next ) {
                    if( caseFolderType ) {
                        data.caseFolder = {
                            type: caseFolderType
                        };
                        return setImmediate( next );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'caseFolderId',
                        action: 'get',
                        query: {
                            _id: caseFolderId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'case folder nor found' } ) );
                        }
                        data.caseFolder = results[ 0 ];
                        next();
                    } );
                },
                function( next ){
                    Y.doccirrus.api.patient.lastSchein( {
                        user: user,
                        query: {
                            caseFolderId: caseFolderId,
                            patientId: patientId,
                            timestamp: moment().toISOString()
                        },
                        callback: function( err, result ) {
                            let
                                insurance;
                            if( err ) {
                                return next( err );
                            }
                            let lastSchein = result && result[0];

                            data.lastSchein = lastSchein;

                            if( lastSchein ) {
                                data.locationId = lastSchein.locationId;
                                data.employeeId = lastSchein.employeeId;
                            } else {
                                insurance = insuranceLocation ? { locationId: insuranceLocation } : Y.doccirrus.schemas.patient.getInsuranceByType( data.patient, data.caseFolder.type );
                                data.locationId = insurance && insurance.locationId;
                                data.employeeId = insurance && insurance.employeeId;
                            }
                            next();
                        }
                    } );
                }
            ], err => {
                callback( err, {
                    locationId: data.locationId,
                    employeeId: data.employeeId,
                    lastSchein: data.lastSchein,
                    hasLastSchein: Boolean( data.lastSchein )
                } );
            } );
            /**
             * get last schein
             * get best locationId
             *
             */
        }

        /**
         *  Move a set of activities between casefolders
         *
         *  Overall process:
         *
         *      (1) Load all activities by _id and separate in schein type activities and others
         *      (2) Check if any of these activities are referenced (required) but other activities in their current casefolder
         *      (3) Load all activities again and keep them as a clean copy to restore state in case of a rollback
         *      (4) Copy each scheine into the new casefolder to create a temporary schein (validation?)
         *      (5) Delete references to other activities which would be broken by move
         *      (6) Move all activities which are not scheine to the destination casefolder
         *      (7) Move the scheine to the destination casefolder, if any
         *      (8) Remove temp scheine
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.activityIds     Array of activities to move
         *  @param  {Object}    args.originalParams.caseFolderId    Destination casefolder? (CHECKME)
         *  @param  {Object}    args.callback                       Of the form fn( err )
         */

        async function moveActivitiesToCaseFolder( args ) {
            Y.log('Entering Y.doccirrus.api.casefolder.moveActivitiesToCaseFolder', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.moveActivitiesToCaseFolder');
            }

            const
                SCHEIN_ACTIVITY_TYPES  = Y.doccirrus.schemas.activity.scheinActTypes,

                user = args.user,
                callback = args.callback,
                params = args.originalParams || {},
                activityIds = params.activityIds,
                toCaseFolderId = params.caseFolderId,

                tempScheinIds = [],

                scheinQuery =  {
                    _id: { $in: activityIds },
                    actType: { $in: SCHEIN_ACTIVITY_TYPES }
                },

                notScheinQuery = {
                    _id: { $in: activityIds },
                    actType: { $nin: SCHEIN_ACTIVITY_TYPES }
                };

            let
                err, allActivities, allActivitiesOriginal, currActivity,
                scheinActivities = [], otherActivities = [],
                oldSchein, newSchein,
                changeSet, currChanges,
                fromCaseFolderId;

            if( !params.activityIds || !params.caseFolderId ) {
                return handleResult( new Error( 'insufficient arguments' ), undefined, callback );
            }

            //  (1) Load all activities by _id and separate in schein type activities and others

            [ err, allActivities ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: { _id: { $in: activityIds } },
                    options: {
                        lean: true
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not load activities from database: ${err.stack||err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            for ( currActivity of allActivities ) {
                if ( -1 === SCHEIN_ACTIVITY_TYPES.indexOf( currActivity.actType ) ) {
                    otherActivities.push( currActivity );
                } else {
                    scheinActivities.push( currActivity );
                }
            }

            Y.log( `Loaded ${allActivities} from database, ${scheinActivities.length} scheine and ${otherActivities} others`, 'debug', NAME);

            //  (2) Check if any of these activities are referenced (required) but other activities in their current casefolder

            if ( !Y.doccirrus.api.linkedactivities.canMoveCaseFolder( allActivities ) ) {
                //  TODO: errortable
                err = Y.doccirrus.errors.rest( 500, 'Can not move activities, referenced in old casefolder' );
                return handleResult( err, undefined, callback );
            }

            //  (3) Load all activities again and keep them as a clean copy to restore state in case of a rollback

            [ err, allActivitiesOriginal ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: { _id: { $in: activityIds } },
                    options: {
                        lean: true
                    }
                } )
            );

            //  (4) Copy each scheine into the new casefolder to create a temporary schein (validation?)
            //
            //  for each schein
            //  - delete _id and user_
            //  - set status CREATED
            //  - use fist casefolder _id as fromCaseFolderId for rollback
            //  - save as a new scheine in the destination casefolder, POST operation

            for ( oldSchein of scheinActivities ) {
                delete oldSchein._id;
                delete oldSchein.user_;
                oldSchein.status = 'CREATED';
                if( !fromCaseFolderId ) {
                    //  only reachable if there is a schein?
                    fromCaseFolderId = oldSchein.caseFolderId;
                }
                oldSchein.caseFolderId = toCaseFolderId;

                [ err, newSchein ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( oldSchein )
                    } )
                );

                if ( err ) {
                    rollbackMoveActivities( user, allActivitiesOriginal, tempScheinIds );
                    return handleResult( err, undefined, callback );
                }

                tempScheinIds.push( newSchein[0] );
            }

            //  (5) Delete references to other activities which would be broken by move, EXTMOJ-2015

            changeSet = Y.doccirrus.api.linkedactivities.unlinkOnMove( allActivities );

            for ( currChanges of changeSet ) {
                if ( currChanges.data.fields_.length > 0 ) {

                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            model: 'activity',
                            user: user,
                            action: 'put',
                            query: currChanges.query,
                            data: Y.doccirrus.filters.cleanDbObject( currChanges.data ),
                            context: {
                                forceScheinCheck: true
                            }
                        } )
                    );

                    if ( err ) {
                        rollbackMoveActivities( user, allActivitiesOriginal, tempScheinIds );
                        return handleResult( err, undefined, callback );
                    }
                }

            }

            //  (6) Move all activities which are not scheine to the destination casefolder
            let activitiesPrepared,
                preparedQuery = Object.assign( {}, notScheinQuery );
            preparedQuery.status = 'PREPARED';
            [ err, activitiesPrepared ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    user: user,
                    action: 'get',
                    query: preparedQuery
                } )
            );

            if ( err ) {
                rollbackMoveActivities( user, allActivitiesOriginal, tempScheinIds );
                return handleResult( err, undefined, callback );
            }

            if( 0 < activitiesPrepared.length ) {
                // fix timestamp for PREPARED activities
                activitiesPrepared.forEach( async ( activity ) => {
                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'activity',
                            migrate: true,
                            query: { _id: activity._id },
                            data: { $set: { timestamp: new Date().toISOString() } }
                        } )
                    );

                    if ( err ) {
                        rollbackMoveActivities( user, allActivitiesOriginal, tempScheinIds );
                        return handleResult( err, undefined, callback );
                    }
                });
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    user: user,
                    action: 'put',
                    query: notScheinQuery,
                    data: {
                        caseFolderId: toCaseFolderId,
                        skipcheck_: true,
                        multi_: true
                    },
                    fields: ['caseFolderId'],
                    context: {
                        forceScheinCheck: true
                    }
                } )
            );

            if ( err ) {
                rollbackMoveActivities( user, allActivitiesOriginal, tempScheinIds );
                return handleResult( err, undefined, callback );
            }

            //  (7) Move the scheine to the destination casefolder, if any

            if ( scheinActivities.length > 0 ) {
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        user: user,
                        action: 'put',
                        query: scheinQuery,
                        data: {
                            caseFolderId: toCaseFolderId,
                            skipcheck_: true,
                            multi_: true
                        },
                        fields: ['caseFolderId']
                    } )
                );

                if ( err ) {
                    rollbackMoveActivities( user, allActivitiesOriginal, tempScheinIds );
                    return handleResult( err, undefined, callback );
                }
            }

            //  (8) Remove temp scheine
            [ err ] = await formatPromiseResult( removeTempScheine( user, tempScheinIds ) );

            if ( err ) {
                //  not rolling back from this step, rollback would just repeat above step
                Y.log( `Problem deleting temporary scheine while moving activities ${err.stack||err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            //  All done
            return handleResult( null, activityIds, callback );
        }

        /**
         *  If there is a problem moving activities between casefolders, the whole batch of changes should be rolled back
         *
         *  @param  {Object}    user
         *  @param  {Object}    allActivitiesOriginal   Original state of all activities
         *  @param  {Object}    tempScheinIds           Array of _ids of temporary schein objects in destination casefolder
         *  @return {Promise<*>}
         */

        async function rollbackMoveActivities( user, allActivitiesOriginal, tempScheinIds ) {

            const
                SCHEIN_ACTIVITY_TYPES  = Y.doccirrus.schemas.activity.scheinActTypes;

            let err, activity;


            Y.log( `Rolling back operation to move activities: ${allActivitiesOriginal.length}`, 'info', NAME );

            //  (1) Move schein activities back to the casefolder they came from

            for ( activity of allActivitiesOriginal ) {
                if( -1 !== SCHEIN_ACTIVITY_TYPES.indexOf( activity.actType ) ) {
                    [err] = await formatPromiseResult(
                        rollbackSingleActivity( user, activity )
                    );
                }

                if ( err ) {
                    Y.log(`Rollback error - could not move scheine ${activity._id} back to original casefolder: ${err.stack || err}`, 'error', NAME);
                    return err;
                }
            }

            //  (2) Move the rest of the activities back to the casefolder they came from

            for ( activity of allActivitiesOriginal ) {
                if ( -1 === SCHEIN_ACTIVITY_TYPES.indexOf( activity.actType ) ) {
                    [err] = await formatPromiseResult(
                        rollbackSingleActivity( user, activity )
                    );
                }

                if ( err ) {
                    Y.log(`Rollback error - could not move ${activity.actType} ${activity._id} back to original casefolder: ${err.stack || err}`, 'error', NAME);
                    return err;
                }
            }

            Y.log( `Rolled back movement of ${allActivitiesOriginal.length} activities.`, 'info', NAME );

            //  (3) Delete temp scheine, if any
            return removeTempScheine( user, tempScheinIds );
        }

        /**
         *  Restore the state of an activity to how it was before a failed move operation
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @return {Promise<boolean>}
         */

        async function rollbackSingleActivity( user, activity ) {

            const
                copyFields = [ 'invoiceId', 'activities', 'icds', 'icdsExtra', 'receipts', 'referencedBy' ],
                setData = {
                    caseFolderId: activity.caseFolderId
                };

            let fieldName, err;

            for ( fieldName of copyFields ) {
                if ( activity[ fieldName] ) { setData[ fieldName ] = activity[ fieldName ];  }
            }

            if( 'PREPARED' === activity.status ) {
                setData.timestamp = activity.timestamp;
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'update',
                    model: 'activity',
                    query: {_id: activity._id },
                    data: {
                        $set: setData
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if ( err ) { throw err; }
            return true;
        }

        /**
         *  Deduplicating, small helper to delete temporary scheine used for validation when moving a batch of
         *  activities between casefolders
         *
         *  @param  {Object}    user
         *  @param  {Object}    tempScheinIds   Array of activity _ids
         *  @return {Promise<*>}
         */

        async function removeTempScheine( user, tempScheinIds ) {
            let err, tempScheinId;

            if ( !tempScheinIds || 0 === tempScheinIds.length ) { return; }

            for ( tempScheinId of tempScheinIds ) {
                Y.log( `Deleting temporary schein from batch move between casefolders: ${tempScheinIds}`, 'debug', NAME );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'delete',
                        model: 'activity',
                        query: { _id: tempScheinId },
                        options: {
                            override: true
                        }
                    } )
                );

                if ( err ) {
                    //  not rolling back from this step, rollback would just repeat above step
                    Y.log( `Problem deleting temporary scheine ${tempScheinId} while moving activities ${err.stack||err}`, 'warn', NAME );
                    return err;
                }
            }

            Y.log( `Deleted ${tempScheinIds.length} temporary scheine`, 'info', NAME );
        }

        /**
         *  Look up the name of the insurance company corresponding to a casefolder
         *
         *  Returns empty string if none, prefers insurancePrintName if available
         *
         *  @param  {Object}    user
         *  @param  {String}    caseFolderId
         *  @return {Promise<void>}
         */

        async function getInsuranceName( user, caseFolderId ) {
            let err, casefolders, patientId, patients, insurances, insurance;

            //  1.  Load the casefolder

            [ err, casefolders ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                query: { _id: caseFolderId }
            } ) );

            if ( err ) {
                Y.log( `Could not load casefolder ${caseFolderId}: ${err.stack||err}` );
                throw err;
            }

            if ( !casefolders[0] ) {
                Y.log( `Casefolder not found ${caseFolderId}`, 'warn', NAME );
                return '';
            }

            patientId = casefolders[0].patientId;

            //  2.  Load the patient and get the insurances

            [ err, patients ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                query: { _id: patientId }
            } ) );

            if ( err ) {
                Y.log( `Could not load patient ${patientId}: ${err.stack||err}` );
                throw err;
            }

            if ( !patients[0] ) {
                Y.log( `Patient not found ${patientId}`, 'warn', NAME );
                return '';
            }

            insurances = patients[0].insuranceStatus || [];

            //  3.  Look for insurance which matches the casefolder type

            for ( insurance of insurances ) {
                if ( insurance.type === casefolders[0].type ) {
                    if ( insurance.insurancePrintName ) {
                        return insurance.insurancePrintName;
                    }
                    if ( insurance.insuranceName ) {
                        return insurance.insuranceName;
                    }
                }
            }

            return '';
        }

        /**
         * get errors form rule log and invoice entries
         * @param  {Object} args
         * @param  {Object} args.query
         * @param  {Object} args.query.ruleLogQuery  - query to get items from rule log
         * @param  {Object} args.query.invoiceEntriesQuery -query to get items from invoiceEntries
         * @returns {Promise.<*>}
         */
        async function getCaseFolderErrors( args ) {
            const {user, callback, options, query} = args,
                getRuleErrorsP = promisifyArgsCallback(Y.doccirrus.api.rulelog.getErrors);
            const {ruleLogQuery, invoiceEntriesQuery } = query;
            let err, ruleLogEntries, invoiceEntries;


            [err, ruleLogEntries] = await formatPromiseResult(getRuleErrorsP({
                user,
                query: ruleLogQuery,
                options: options
            }));

            if (err) {
                Y.log(`getCaseFolderErrors: failed to get data from ruleLog`, 'error', NAME);
                return handleResult( Y.doccirrus.errors.http( '500', err.stack || err ), null, callback);
            }

            if (!invoiceEntriesQuery) {
                return handleResult(null, ruleLogEntries, callback);
            }

            [err, invoiceEntries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb({
                user,
                action: 'get',
                model: 'invoiceentry',
                query: invoiceEntriesQuery
            }));

            if (err) {
                Y.log(`getCaseFolderErrors: failed to get data from innvoiceentry`, 'error', NAME);
                return handleResult( Y.doccirrus.errors.http( '500', err.stack || err ), null, callback);
            }

            //Map invoiceEntries to rulLog format
            invoiceEntries = invoiceEntries.map( entry => {
                entry.data = entry.data || {};
                return {
                    ...entry,
                    ...entry.data,
                    message: entry.data.originalText,
                    actTypes: (entry.data.affectedActivities || []).map(act => act.actType)
                };
            });
            if (ruleLogEntries.result) {
                ruleLogEntries.result = ruleLogEntries.result.concat(invoiceEntries);
                ruleLogEntries.count += invoiceEntries.length;
            } else {
                ruleLogEntries = ruleLogEntries.concat(invoiceEntries);
            }

            return handleResult(null, ruleLogEntries, callback);
        }


        /**
         * Gets the inBox/error casefolder object for the user and returns the casefolder ID
         * if the inbox/error casefolder is none-existent, it creates it
         *
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.data
         * @param {Function} [args.callback]
         * @returns {String|null}
         */
        async function getInBoxCaseFolderId( args ) {
            const {user, data, callback} = args;
            const checkCaseFolderPromise = promisifyArgsCallback( Y.doccirrus.api.casefolder.checkCaseFolder );
            const [err, casefolder] = await formatPromiseResult( checkCaseFolderPromise( {
                user: user,
                query: {
                    patientId: data.patientId,
                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR
                },
                data: {
                    patientId: data.patientId,
                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR,
                    start: new Date(),
                    title: Y.doccirrus.i18n( 'casefolder-schema.additionalCaseFolderTypes.ERROR' ),
                    skipcheck_: true
                }
            } ) );
            if( err || !casefolder ) {
                Y.log( `Could not create inBox casefolder for patient with ID: ${
                    data.patientId.replace( /.{8}$/, '#'.repeat( 8 ) )
                    }: ${err || 'UNKNOWN ERROR'}`, 'error', NAME );

                return handleResult( null, casefolder._id && casefolder._id.toString(), callback );
            }

            return handleResult( null, casefolder._id && casefolder._id.toString(), callback );
        }

        /**
         * insert audit entry per caseFolderId/employeeId once in hour
         *
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.data
         * @param {Array<String>} args.data.caseFolderIds - array of caseFolderId from what activities are shown in getCaseFileLight
         * @returns {*}
         */
        async function auditCaseOpen( args ) {
            const
                {user, data} = args,
                timer = logEnter( 'Y.doccirrus.api.casefolder.auditCaseOpen' );
            let {caseFolderIds} = data;


            let [err, audits] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                query: {
                    action: 'open',
                    model: 'caseFolder',
                    objId: {$in: caseFolderIds},
                    userId: user.identityId,
                    timestamp: {$gte: moment().subtract( 1, 'hour' ).toDate() }
                },
                options: { select: { objId: 1 } }
            } ) );
            if( err ) {
                Y.log( `auditCaseOpen: error getting audited caseFolder(s) ${caseFolderIds} for ${user.U} : ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                throw err;
            }

            let auditedCasefolders = audits.map( audit => audit.objId );
            caseFolderIds = caseFolderIds.filter( caseFolder => !auditedCasefolders.includes(caseFolder) );

            if( !caseFolderIds.length ){
                logExit( timer );
                return;
            }

            let caseFolders;
            [err, caseFolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                query: {
                    _id: {$in: caseFolderIds}
                }
            } ) );
            if( err ) {
                Y.log( `auditCaseOpen: error getting caseFolder(s) ${caseFolderIds} : ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                throw err;
            }

            let promises = [];
            for( let caseFolder of caseFolders){
                promises.push (
                    doBasicCaseFolderAudit( {
                        user,
                        caseFolder,
                        action: 'open'
                    } )
                );
            }
            await Promise.all( promises );

            logExit( timer );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class casefolder
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).casefolder = {

            name: NAME,

            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.get');
                }
                getCaseFolder( args );
            },
            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.post');
                }
                createNewCaseFolder( args );
            },
            'delete': function (args) {
                Y.log('Entering Y.doccirrus.api.casefolder.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.delete');
                }
                deleteCaseFolder( args );
            },
            deleteEmpty: function( args ){
                Y.log('Entering Y.doccirrus.api.casefolder.deleteEmpty', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.deleteEmpty');
                }
                deleteEmpty( args );
            },
            put,

            moveActivitiesToCaseFolder,

            setActiveTab: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.setActiveTab', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.setActiveTab');
                }
                var user = args.user,
                    params = args.originalParams,
                    callback = args.callback;

                function modelCb( err, patientModel ) {
                    if( err ) {
                        Y.log( 'could not get patientModel to set active tab for patient ' + params.patientId + ' and casefolder ' + params.caseFolderId, 'error', NAME );
                        return callback( err );
                    }

                    patientModel.mongoose.update( {
                        _id: params.patientId
                    }, {
                        activeCaseFolderId: params.caseFolderId
                    }, callback );

                }

                if( !params.patientId || !params.caseFolderId ) {
                    callback( new Error( 'insufficient arguments' ) );
                    return;
                }

                Y.doccirrus.api.rule.triggerIpcQueue({
                    user,
                    tenantId: user.tenantId,
                    triggerRuleEngineOnCaseOpen: true,
                    query: {
                        patientId: params.patientId,
                        caseFolderId: params.caseFolderId
                    }
                } );

                Y.doccirrus.mongodb.getModel( user, 'patient', true, modelCb );
            },

            copyActivitiesToCaseFolder: function( args ){
                Y.log('Entering Y.doccirrus.api.casefolder.copyActivitiesToCaseFolder', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.copyActivitiesToCaseFolder');
                }
                copyActivitiesToCaseFolder( args );
            },
            getCaseFolderIdsByType: getCaseFolderIdsByType,
            updateCaseFolderRuleStats: updateCaseFolderRuleStats,
            updateCaseFolderSumexStatus: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.updateCaseFolderSumexStatus', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.updateCaseFolderSumexStatus');
                }
                return updateCaseFolderSumexStatus(args);
            },
            getCaseFolderById: getCaseFolderById,
            checkCaseFolder: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.checkCaseFolder', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.checkCaseFolder');
                }
                checkCaseFolder( args );
            },
            getCaseFolderForCurrentEmployee: function( args ){
                Y.log('Entering Y.doccirrus.api.casefolder.getCaseFolderForCurrentEmployee', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getCaseFolderForCurrentEmployee');
                }
                getCaseFolderForCurrentEmployee( args );
            },
            getAllowedCaseFolderForEmployee: function( args ){
                Y.log('Entering Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee');
                }
                getAllowedCaseFolderForEmployee( args );
            },
            getCaseFolderQueryForEmployee: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.getCaseFolderQueryForEmployee', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getCaseFolderQueryForEmployee');
                }
                getCaseFolderQueryForEmployee( args );
            },
            lockPregnancyCaseFolder: lockPregnancyCaseFolder,
            lockAnyPregnancyCaseFolder: lockAnyPregnancyCaseFolder,
            unlockPregnancyCaseFolder: unlockPregnancyCaseFolder,
            getNextCaseNumber: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.getNextCaseNumber', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getNextCaseNumber');
                }
                return getNextCaseNumber( args );
            },
            checkCaseNumber: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.checkCaseNumber', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.checkCaseNumber');
                }
                return checkCaseNumber( args );
            },
            getCaseFolderDataForActivity,
            getInsuranceName,
            getCaseFolderErrors: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.getCaseFolderErrors', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getCaseFolderErrors');
                }
                return getCaseFolderErrors(args);
            },
            getInBoxCaseFolderId: function( args ) {
                Y.log('Entering Y.doccirrus.api.casefolder.getInBoxCaseFolderId', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.casefolder.getInBoxCaseFolderId');
                }
                return getInBoxCaseFolderId(args);
            },
            auditCaseOpen
        };

    },
    '0.0.1', {
        requires: [
            'dcauth',
            'dccommunication',
            'admin-schema',
            'activity-schema',
            'employee-schema',
            'v_meddata-schema',
            'casefolder-schema'
        ]
    }
);
