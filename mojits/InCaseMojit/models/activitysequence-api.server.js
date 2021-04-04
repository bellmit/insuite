/**
 * User: pi
 * Date: 19/01/2015  14:15
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'activitysequence-api', function( Y, NAME ) {
        /**
         * @module activitysequence-api
         */

        const
            {formatPromiseResult} = require( 'dc-core' ).utils,
            { logEnter, logExit } = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME),
            util = require( 'util' ),
            ObjectId = require('mongoose').Types.ObjectId;

        /**
         * prepare activities
         * filters all "link-property". All linked ids should be exist in activity list.
         *
         * @param {Array}  activities
         */
        function prepareActivities( activities ) {
            var
                activitiesId = activities.map( function( activity ) {
                    return activity._id && activity._id.toString();
                } );

            function isInList( id ) {
                return -1 !== activitiesId.indexOf( id );
            }

            activities.forEach( function( activity ) {
                activity.activities = activity.activities && activity.activities.filter( isInList );
                activity.icds = activity.icds && activity.icds.filter( isInList );
                activity.icdsExtra = activity.icdsExtra && activity.icdsExtra.filter( isInList );
            } );
        }

        function removePatientSpecificDataFromActivities( { activities, action } ) {
            const PATIENT_SPECIFIC_FIELDS = new Set( [
                "patientId", "patientFirstName", "patientLastName", "surveySex", "formGender",  // Patient-specific Info
                "employeeName", "employeeInitials", "employeeId",                               // Doctor-specific Info
                "severity", "dmpPrintStatus", "studyId", "g_extra",                             // Activity-specific Info
                "isDispensed", "isArrived", 'orderId'
            ] );



            activities.forEach( activity => {
                PATIENT_SPECIFIC_FIELDS.forEach( field => delete activity[field] );

                if ( action === "CREATE" ) {
                    activity.patientId = "k.A."; // patientId cannot be saved empty, so set to "k.A."
                    activity.employeeId = "k.A."; // employeeId cannot be saved empty, so set to "k.A."
                }
                if ( action === "INSERT" ) {
                    delete activity.locationId; // cannot be removed generally, because it is a required ObjectId field
                }
            });
        }

        /**
         * Loads activities from initial list and all nested activities(activities, icds, icdsExtra fields of initial activity)
         * Has recursive.
         * @param {Object} config
         * @param {Object} config.user
         * @param {Array} config.initList initial list of activities id
         * @param {Object} config.sort sorting option for db
         * @param {Function} callback callback which will be called with (err, finalActivityList)
         */
        function loadActivitiesDeep( config, callback ) {

            var
                completeList = [],
                async = require( 'async' ),
                { options, user } = config,
                initList = config.initList;


            function isIdNotInList( id, list ) {
                return -1 === list.indexOf( id );
            }

            function isBlockedForSequence( activity ) {
                //Activities that are blocked to adding to the sequence
                const blockedActivitiesTypes = [
                    "STOCKDISPENSE"
                ];

                return blockedActivitiesTypes.indexOf(activity.actType) !== -1;
            }

            /**
             *
             * @param {Array} initList list of activities id(next nested level)
             * @param {Array} _completeList link to final list of activities which should be loaded
             * @param {Function} done final callback
             */
            function loadActivityRecursive( initList, _completeList, done ) {
                var nextInitList = []; //list for next load
                /**
                 * add id of activities, which are in initial list, to completeList to exclude them from next load
                 * don't care about duplication, because of this list is used in query($in)
                 */
                _completeList = _completeList.concat( initList );
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'activity',
                    user: user,
                    query: {
                        _id: { $in: initList },
                        status: { $ne: 'CANCELLED' }
                    },
                    options: {
                        select: { activities: 1, icds: 1, icdsExtra: 1, actType: 1, receipts: 1 }
                    }
                }, function( err, results ) {
                    if( err ) {
                        return done( err );
                    }
                    if( results.length ) {
                        results.forEach( function( activity ) {
                            if (isBlockedForSequence(activity) && !isIdNotInList(activity._id.toString(), _completeList)) {
                                _completeList.splice(_completeList.indexOf(activity._id.toString()), 1);
                            } else {
                                //MOJ-4601
                                if( 'TREATMENT' !== activity.actType && activity.icds ) {
                                    activity.icds.forEach( function( id ) {
                                        if( isIdNotInList( id, _completeList ) ) {
                                            nextInitList.push( id );
                                        }
                                    } );
                                }
                                if( 'INVOICE' === activity.actType && activity.receipts ) {
                                    activity.receipts.forEach( function( id ) {
                                        if( isIdNotInList( id, _completeList ) ) {
                                            nextInitList.push( id );
                                        }
                                    } );
                                }
                                if( activity.icdsExtra ) {
                                    activity.icdsExtra.forEach( function( id ) {
                                        if( isIdNotInList( id, _completeList ) ) {
                                            nextInitList.push( id );
                                        }
                                    } );
                                }

                                /**
                                 * do not copy child of schein
                                 */
                                if( activity.activities && !('SCHEIN' === activity.actType || 'PKVSCHEIN' === activity.actType || 'BGSCHEIN' === activity.actType) ) {
                                    activity.activities.forEach( function( id ) {
                                        if( isIdNotInList( id, _completeList ) ) {
                                            nextInitList.push( id );
                                        }
                                    } );
                                }
                            }
                        } );
                    }
                    if( !nextInitList.length ) {
                        return done( err, _completeList );
                    }
                    /**
                     * load activities while unique dependencies exist(activities,icds,icdsExtra)
                     */
                    loadActivityRecursive( nextInitList, _completeList, done );
                } );
            }

            async.waterfall( [
                function( next ) {
                    loadActivityRecursive( initList, completeList, next );
                },
                function( _completeList, next ) {
                    /**
                     * load final list of activity which will be saved in db
                     */
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'activity',
                        user: user,
                        query: {
                            _id: { $in: _completeList },
                            status: { $ne: 'CANCELLED' }
                        },
                        options
                    }, next );
                }
            ], function( err, activities ) {
               if( err ) {
                    return callback( err );
                }
                prepareActivities( activities );
                callback( err, activities );
            } );
        }

        /**
         * API methods
         */

        /**
         * Updates/saves/deletes sequences
         * @method updateSequences
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Array} args.query.sequences array of sequences to update/save/delete
         * @param {String} args.query.sequences._id id of the sequence. If not provided, new sequences will be created
         * @param {String} args.query.sequences.title updated value of title
         * @param {Array} args.query.sequences.activitiesId ids of activities in current sequence
         * @param {Array} args.query.sequences.sequenceGroups groups in current sequence
         * @param {Integer} args.query.sequences.prevOrder order of the previous sequence. If provided,  the order will be changed
         * @param {Boolean} args.query.sequences.isDeleted true to delete sequence
         * @param {Function} args.callback
         */
        function updateSequences( args ) {
            var queryParams = args.query || {},
                sequences = queryParams.sequences || [],
                deleteList = [], // list of ids to remove
                updateList = [], // list of objects to update
                createList = [], // list of mongoose object to insert
                user = args.user,
                async = require( 'async' );

            function createSequenceObject( config ) {

                var result = {
                    title: config.title,
                    description: config.description
                };
                if( config._id ) {
                    result._id = config._id;
                }
                if( config.order ) {
                    result.order = config.order;
                }

                if( config.sequenceGroups ) {
                    result.sequenceGroups = config.sequenceGroups.map(function( item ) {
                        if( item.data ) {
                            return item.data;
                        } else {
                            return item;
                        }
                    });
                }

                if( config.orderInGroup ) {
                    result.orderInGroup = config.orderInGroup;
                }

                result.useOriginalValues = config.useOriginalValues; // This field is always set. We want to keep the undefined case to identify old Ketten.

                if( config.activities ) {
                    result.activities = JSON.parse( JSON.stringify( config.activities ) );
                }
                return result;
            }

            function loadAndPrepareActivities( activitiesId, callback ) {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: { $in: activitiesId },
                        status: { $ne: 'CANCELLED' }
                    },
                    options: {
                        lean: true,
                        sort: {
                            timestamp: 1
                        }
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    prepareActivities( results );
                    removePatientSpecificDataFromActivities( {activities: results, action: "CREATE"} );
                    callback( err, results );
                } );
            }

            /**
             * prepare sequence
             *
             * @param {Object}  sequence
             * @param {Array}   activities
             *
             */
            function setUpSequence( sequence, activities ) {

                var scheinExists = false;
                if( activities && activities.length ) {
                    activities.forEach( function( activity ) {
                        if( 'SCHEIN' === activity.actType || 'PKVSCHEIN' === activity.actType || 'BGSCHEIN' === activity.actType ) {
                            activity.activities.length = 0;
                            if( scheinExists ) {
                                return;
                            } else {
                                scheinExists = true;
                            }
                        }

                        //  TODO: clean all attachments except for
                        //activity.attachments = [];
                        activity.referencedBy = [];
                        activity.formVersion = '';

                        if( activity.receipts ) {
                            activity.receipts = [];
                        }

                        activity.activities = activity.activities || []; //required field
                        activity.icds = activity.icds || []; //required field
                        activity.icdsExtra = activity.icdsExtra || []; //required field
                        delete activity.invoiceNo;
                        delete activity.receiptNo;
                        delete activity.labRequestId;
                        if( 'CREATED' !== activity.status ) {
                            activity.status = 'VALID';
                        }
                        // Remove KIM related files from KimBase_T and EDocLetter_T
                        if( activity.actType === 'DOCLETTER' ) {
                            activity.kimState = 'NOT_SIGNED';
                            delete activity.flatFeeTreatmentId;
                            activity.kimSignedBy = [];
                        }
                        sequence.activities.push( activity );
                    } );
                    if( sequence.sequenceGroups && sequence.sequenceGroups.length ) {
                        sequence.sequenceGroups = sequence.sequenceGroups.map(function( item ) {
                            if( item.data ) {
                                return item.data;
                            } else {
                                return item;
                            }
                        });
                    }
                    createList.push(sequence);
                }
            }

            function sequenceMapper( sequence, done ) {

                if( sequence.isDeleted && sequence._id ) {
                    deleteList.push( sequence._id );
                    return done();
                }
                if( !sequence._id && sequence.activitiesId && 0 < sequence.activitiesId.length ) {
                    sequence.activities = [];
                    loadAndPrepareActivities( sequence.activitiesId, function( err, activities ) {
                            if( err ) {
                                return done( err );
                            }
                            setUpSequence( sequence, activities );
                            done();
                        }
                    );
                } else {
                    if( sequence._id ) {
                        updateList.push( createSequenceObject( sequence ) );
                    }
                    return done();
                }
            }

            async function updateSequence( record, callback ) {
                let fields = Object.keys( record ).filter( function( fieldName ) {
                    return 'id' !== fieldName && '_id' !== fieldName;
                } );

                let [ err, activitySequences ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activitysequence',
                        action: 'get',
                        query: {
                            _id: record._id && record._id.toString()
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    } )
                );
                if( err ){
                    Y.log( `updateSequence: Error on getting activitysequence: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                let
                    activitySequence = activitySequences[ 0 ],
                    activitiesId;
                if( !activitySequence ) {
                    return callback( Y.doccirrus.errors.rest( 10400, '', true ) );
                }
                if( record.activities ) {
                    activitiesId = record.activities.map( function( activity ) {
                        return activity._id && activity._id.toString();
                    } );
                    record.activities = activitySequence.activities.filter( function( activity ) {
                        return -1 !== activitiesId.indexOf( activity._id && activity._id.toString() );
                    } );

                    prepareActivities( record.activities );
                }

                if(!record.activities || !record.activities.length){
                    fields = (fields || []).filter( el => el !== 'activities' );
                }

                let result;
                [ err, result ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activitysequence',
                        action: 'put',
                        fields,
                        data: Y.doccirrus.filters.cleanDbObject( record ),
                        query: {
                            _id: record._id
                        }
                    } )
                );
                if( err ){
                    Y.log( `updateSequence: Error on putting activitysequence: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                callback( null, result );
            }

            async.series( {
                mappedSequences( next ) {
                    // prepare order, update, create lists
                    if( sequences && 0 < sequences.length ) {
                        async.eachSeries( sequences, sequenceMapper, next );
                    } else {
                        return next();
                    }
                },
                createdSequences( next ) {
                    if( createList && 0 < createList.length ) {
                        async.map( createList, async function( record, done ) {

                            //  make new copies of the attachments before saving the new sequence
                            //  original attachments, including forms, may be deleted on/with their own activities
                            //  or changed after the kette is in use, MOJ-10964

                            let copyErr;
                            [ copyErr ] = await formatPromiseResult( copyAttachmentsToSequence( user, false, record ) );
                            if ( copyErr ) {
                                Y.log( `Problem making copies of original attachments: ${copyErr.stack||copyErr}`, 'error', NAME );
                                return next( copyErr );
                            }

                            //  save the new sequence to the database

                            Y.doccirrus.filters.cleanDbObject( record );
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activitysequence',
                                action: 'post',
                                data: record
                            }, function( err, result ) {
                                if( err ) {
                                    return done( err );
                                }
                                done( err, result && result[ 0 ] );
                            } );
                        }, next );
                    } else {
                        return next();
                    }
                },
                updatedSequences( next ) {
                    if( updateList && 0 < updateList.length ) {
                        async.each( updateList, updateSequence, next );
                    } else {
                        return next();
                    }
                },
                deletedSequences( next ) {
                    if( deleteList && 0 < deleteList.length ) {
                        async.each( deleteList, function( recordId, done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activitysequence',
                                action: 'delete',
                                query: {
                                    _id: recordId
                                }
                            }, done );
                        }, next );
                    } else {
                        return next();
                    }
                }
            }, function( err, results ) {
                if( err ) {
                    Y.log( 'Can not update Activitysequence. Error: ' + JSON.stringify( err ), 'error', NAME );
                }
                args.callback( err, results );
            } );

        } // end updateSequences


        /**
         * Batch update of several activitysequence entries
         * used for now for fast reordering
         *
         * @method batchUpdate
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array}  args.data.sequence array of sequences to updat
         * @param {Function} args.callback
         */
        async function batchUpdate( args ) {
            const {user, data: {sequence}, callback } = args;

            if(!sequence || !sequence.length){
                Y.log( 'batchUpdate: sequences should be provided', 'error', NAME );
                return callback( new Y.doccirrus.errors.rest( 400, 'missed arguments' ) );
            }

            let [ err, sequenceModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'activitysequence' ) );


            let bulk = sequenceModel.mongoose.collection.initializeUnorderedBulkOp(),
                added = false;
            for( let item of sequence ){ //eslint-disable-line no-unused-vars
                let obj = {};
                for( let field of Object.keys( item ) ){ //eslint-disable-line no-unused-vars
                    if( field === '_id' ){ continue; }
                    obj[field] = item[field];
                }
                if( item._id && Object.keys( obj ).length ){
                    added = true;
                    bulk.find( { _id: new ObjectId( item._id) }).updateOne( { $set: obj } );
                }
            }
            if( added ){
                [ err ] = await formatPromiseResult( bulk.execute() );
                if( err ){
                    Y.log( `batchUpdate: error executing bulk operation ${err.stack || err}`, 'error', NAME );
                    return callback( new Y.doccirrus.errors.rest( 500 ) );
                }
            }
            callback();
        } // end batchUpdate


        /**
         *  Copy attachments from original activities and update them in the sequence
         *
         *  This is to prevent the situation where forms and other attachments are modified on the original activity,
         *  changing the behavior of the sequence.  This is also to prevent the content of forms from being lost on
         *  deletion of the original activity.
         *
         *  Note that this does not save the sequence, caller must do that
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration     True if called during migration
         *  @param  {Object}    sequence        activity sequence object
         */

        async function copyAttachmentsToSequence( user, inMigration, sequence ) {
            Y.log( `Entering Y.doccirrus.api.activitysequence.copyAttachmentsToSequence (${sequence.activities.length} activities)`, 'info', NAME );

            const
                copyActivityAttachmentsP = util.promisify( Y.doccirrus.activityapi.copyActivityAttachments );

            let
                err, result,

                activitiesUpdated = false,

                seqActivity,
                realActivity,
                newAttachments,
                documentId;

            //  for every activity in the sequence
            for ( seqActivity of sequence.activities ) {
                seqActivity.attachments = seqActivity.attachments || [];

                //  try to load original activity, may have been deleted
                [ err, result ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        migrate: inMigration,
                        query: { _id: seqActivity._id }
                    } )
                );

                if ( err ) { throw( err ); }
                realActivity = result[0] ? result[0] : null;

                //  if there are attachments on the original activity but not on the sequence, initialize them (migration)
                if ( realActivity && realActivity.attachments && 0 === seqActivity.attachments.length ) {
                    seqActivity.attachments = realActivity.attachments.slice();
                }

                //  if any attachments noted in the sequence are also on the original, replace it in the sequence with
                //  a new copy of the media and document.
                if ( realActivity && seqActivity.attachments ) {

                    let needsCopy = false;

                    for ( documentId of seqActivity.attachments ) {
                        if ( realActivity.attachments && -1 !== realActivity.attachments.indexOf( documentId ) ) {
                            //  sequence links to original attachment, replace it
                            Y.log( `Found original attachment ${documentId} linked from sequence activity, replacing with new copy...`, 'info', NAME );
                            needsCopy = true;
                        }

                    }

                    if ( needsCopy ) {
                        //  give activity in sequence a new _id, one that will own the copied attachments
                        seqActivity.originalId = `${seqActivity._id }`;
                        seqActivity._id = new ObjectId();

                        [ err, newAttachments ] = await formatPromiseResult( copyActivityAttachmentsP( user, inMigration, seqActivity, `${seqActivity._id}` ) );

                        if ( err ) {
                            Y.log( `Problem copying attachments of into sequence: ${err.stack||err}`, 'error', NAME );
                            throw err;
                        }

                        Y.log( `Copied attachments to sequence activity with new _id, ${seqActivity._id}: ${JSON.stringify(newAttachments)}`, 'info', NAME );
                        seqActivity.attachments = newAttachments;
                        activitiesUpdated = true;
                    }

                }

            }

            Y.log( 'Exiting Y.doccirrus.api.activitysequence.copyAttachmentsToSequence', 'info', NAME );
            return activitiesUpdated;
        }

        /**
         * Returns all sequences byGroup
         * @method getSequences
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getSequencesByGroup( args ) {
            let queryParams = args.query || {},
                query = {},
                countryCode,
                allowedShortNames;
            function activitiesMapper( activity ) {
                return activity._id && activity._id.toString();
            }

            if( queryParams.titleOrDescription ) {

                query.$and = [
                    {
                        $or: [
                            {
                                title: {
                                    $regex: queryParams.titleOrDescription,
                                    $options: 'i'
                                }
                            },
                            {
                                description: {
                                    $regex: queryParams.titleOrDescription,
                                    $options: 'i'
                                }
                            } ]
                    } ];
            }
            if( queryParams.caseFolderType ) {
                countryCode = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[queryParams.caseFolderType || 'ANY'];
                allowedShortNames = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType( countryCode, queryParams.caseFolderType );
                if( allowedShortNames ) {
                    query.$and = query.$and || [];
                    query.$and.push( {
                        activities: {
                            "$elemMatch": {
                                $or: [
                                    { 'catalogShort': { $in: allowedShortNames } },
                                    { 'actType': { $nin: [ 'TREATMENT' ] } }
                                ]
                            }
                        }
                    } );

                }

            }


            query.$and = query.$and || [];
            query.$and.push( {
                sequenceGroups:{
                    "$elemMatch": {
                        name: queryParams.sequenceGroups
                    }
                }
            } );

            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activitysequence',
                action: 'get',
                options: {
                    sort: { order: 1 },
                    lean: true,
                    select: {
                        title: 1,
                        order: 1,
                        description: 1,
                        sequenceGroups: 1,
                        orderInGroup: 1,
                        'activities._id': 1
                    }
                },
                query: query
            }, function( err, results ) {
                if( err ) {
                    return args.callback( err );
                }
                args.callback( err, results.map( function( sequence ) {
                    return {
                        _id: sequence._id,
                        title: sequence.title,
                        order: sequence.order,
                        description: sequence.description,
                        sequenceGroups: sequence.sequenceGroups,
                        orderInGroup: sequence.orderInGroup,
                        activitiesId: sequence.activities.map( activitiesMapper )
                    };
                } ) );
            } );
        }

        /**
         * Returns all sequences
         * @method getSequences
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getLightSequences( args ) {
            var queryParams = args.query || {},
                query = {},
                countryCode,
                allowedShortNames;

            function activitiesMapper( activity ) {
                return activity._id && activity._id.toString();
            }

            if( queryParams.titleOrDescription ) {

                query.$and = [
                    {
                        $or: [
                            {
                                title: {
                                    $regex: queryParams.titleOrDescription,
                                    $options: 'i'
                                }
                            },
                            {
                                description: {
                                    $regex: queryParams.titleOrDescription,
                                    $options: 'i'
                                }
                            } ]
                    } ];
            }
            if( queryParams.caseFolderType ) {
                countryCode =  Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[queryParams.caseFolderType || 'ANY'];
                allowedShortNames = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType( countryCode, queryParams.caseFolderType );
                if( allowedShortNames ) {
                    query.$and = query.$and || [];
                    query.$and.push( {
                        $or: [
                            { 'activities.catalogShort': { $in: allowedShortNames } },
                            { 'activities': { $not: { $elemMatch: { actType: { $in: [ 'TREATMENT' ] } } } } }
                        ]
                    } );

                }

            }
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activitysequence',
                action: 'get',
                options: {
                    sort: { order: 1 },
                    lean: true,
                    select: {
                        title: 1,
                        order: 1,
                        description: 1,
                        useOriginalValues: 1,
                        sequenceGroups: 1,
                        orderInGroup: 1,
                        'activities._id': 1
                    }
                },
                query: query
            }, function( err, results ) {
                if( err ) {
                    return args.callback( err );
                }
                args.callback( err, results.map( function( sequence ) {
                    return {
                        _id: sequence._id,
                        title: sequence.title,
                        order: sequence.order,
                        description: sequence.description,
                        useOriginalValues: sequence.useOriginalValues,
                        sequenceGroups: sequence.sequenceGroups,
                        orderInGroup: sequence.orderInGroup,
                        activitiesId: sequence.activities.map( activitiesMapper )
                    };
                } ) );
            } );
        }

        /**
         * Returns all sequences
         * @method getSequences
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query._id
         * @param {Function} args.callback
         */
        async function getSequenceWithActivities( {user, query: {_id: sequenceId}, callback} ) {
            if( !sequenceId ) {
                return callback( Y.doccirrus.errors.rest( 400, 'sequence id is missing', true ) );
            }

            function activitiesMapper( activity ) {
                Y.doccirrus.api.catalog.convertGopCode(activity);
                return {
                    ...activity,
                    _id: activity._id && activity._id.toString(),
                    u_extra: { rechnungsfaktor: activity.u_extra && activity.u_extra.rechnungsfaktor,
                        dignityRules: activity.u_extra && activity.u_extra.dignityRules }
                };
            }

            let [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    action: 'aggregate',
                    pipeline: [
                        {$match: {_id: new ObjectId( sequenceId )}},
                        {
                            $project: {
                                title: 1,
                                order: 1,
                                description: 1,
                                useOriginalValues: 1,
                                sequenceGroups: 1,
                                orderInGroup: 1,
                                'activities._id': 1,
                                'activities.code': 1,
                                'activities.userContent': 1,
                                'activities.actType': 1,
                                'activities.subType': 1,
                                'activities.catalogShort': 1,
                                'activities.timestamp': 1,
                                'activities.scheinType': 1,
                                'activities.scheinSubgroup': 1,
                                'activities.diagnosisCert': 1,
                                'activities.diagnosisSite': 1,
                                'activities.phPZN': 1,
                                'activities.billingFactorValue': 1,
                                'activities.billingFactorType': 1,
                                'activities.explanations': 1,
                                'activities.u_extra': 1
                            }
                        },
                        {$unwind: "$activities"},
                        {$sort: {'activities.timestamp': -1}},
                        {
                            $group: {
                                _id: "$_id",
                                title: {$first: '$title'},
                                order: {$first: '$order'},
                                description: {$first: '$description'},
                                useOriginalValues: {$first: '$useOriginalValues'},
                                activities: {$push: "$activities"},
                                sequenceGroups: {$first: "$sequenceGroups"},
                                orderInGroup: {$first: "$orderInGroup"}
                            }
                        }
                    ]
                } )
            );
            if( err ) {
                Y.log( `Error on getting activity sequence for _id${sequenceId} : ${err.message}`, 'error', NAME );
                return callback( err );
            }

            results = results && results.result || [];
            callback( err, results.map( function( sequence ) {
                return {
                    ...sequence,
                    activities: sequence.activities.map( activitiesMapper )
                };
            } ) );
        }

        /**
         * Helper
         * Populates a tree
         *  logic:
         *      Function get Array of unused activities and object with activities-nodes(each object is link to object in tree)
         *      If one of activity depends on(has parent) node(activity id is in activities/icds/icdsExtra field of node activity),
         *          this activity is pushed to node. This activity becomes a node for next iteration.
         *      Activities which are not depend on any of current nodes, are passed to next iteration with activities array.
         * @method populateTree
         * @param {Array} activities array of activities [{_id:..., parentActivities:[activityId, activityId]}]
         * @param {Object} _nodes object with nodes {amount:..., activityId:{_id:activityId, dependencies:[]}}
         * @param {Integer} _nodes.amount amount of nodes, if 0 - stops recursion
         * @param {Function}  callback
         *
         * @return {Function}   callback
         */
        function populateTree( activities, _nodes, callback ) {
            var nodes = {
                    amount: 0
                },
                nextActivities = [],
                finish = true;
            if( !_nodes.amount ) {
                return callback();
            }
            activities.forEach( function( actObj ) {
                var newActObj = {
                        _id: actObj._id,
                        dependencies: []
                    },
                    alreadyIncludedId = [],
                    isNode = true;
                /**
                 * If one of id in parentActivities field matches node id:
                 *  add current activity object to dependencies of the node
                 * else
                 *  add this activity object to next iteration nodes object.
                 */
                actObj.parentActivities.forEach( function( parentActivityId ) {
                    if( _nodes[ parentActivityId ] ) {
                        _nodes[ parentActivityId ].dependencies.push( newActObj );
                        nodes[ newActObj._id ] = newActObj;
                        nodes.amount++;
                        alreadyIncludedId.push( parentActivityId );
                    } else {
                        isNode = false;
                        finish = false;
                    }
                } );
                if( !isNode ) {
                    actObj.parentActivities = actObj.parentActivities.filter( function( activityId ) {
                        return -1 === alreadyIncludedId.indexOf( activityId );
                    } );
                    nextActivities.push( actObj );
                }
            } );
            /**
             * continue recursion while there are new nodes
             */
            if( !finish && nodes.amount ) {
                return setImmediate( populateTree, nextActivities, nodes, callback );
            }

            callback(); //  all done
        }

        /**
         * Creates activity tree
         * @method getActivityTree
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.newActivity data for new activities
         * @param {String} args.data.newActivity.timestamp
         * @param {String} args.data.newActivity.employeeId
         * @param {String} args.data.newActivity.locationId
         * @param {String} args.data.newActivity.patientId
         * @param {Object} args.data.caseFolder
         * @param {Array} args.data.activities
         * @param {Object} args.rCache (optional) reporting cache to add activities to
         * @param {Function} args.callback callback is called with (err, { {Array}tree, {Object}completeActivityMap }
         *
         * @return {Function} callback
         */
        function getActivityTree( args ) {
            let
                { data: { newActivity = {}, caseFolder = {}, activities } = {}, callback } = args,
                millisecond = 0,
                nodes = {
                    amount: 0
                },
                completeActivityMap = {},
                initialActivityList = {},
                activityWithDep = [],
                moment = require( 'moment' ),
                rCache = args.rCache ? args.rCache : Y.doccirrus.insight2.reportingCache.createReportingCache(),
                tree = [];

            /**
             * Increases counter for ordering
             * @returns {number}
             */
            function nextMSValue() {
                millisecond += 50;
                return millisecond;
            }

            function addIfNotExist( what, where ) {
                if( -1 === where.indexOf( what ) ) {
                    where.push( what );
                }
            }

            if( activities ) {
                /**
                 * Checks if the activities can be created in specified case folder.
                 *  [1] can create everything to "Quatation" casefolder
                 */
                if( Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION !== caseFolder.additionalType && !Y.doccirrus.schemas.casefolder.movementAllowed( activities, caseFolder ) ) {
                    return callback( Y.doccirrus.errors.rest( 10000, '', true ) );
                }
                activities.forEach( function( activity ) {
                    var
                        currentActivityId = activity._id.toString(),
                        dependencies = [];

                    /**
                     * Remove Prescription links to avoid loop.
                     */
                    if( 'MEDICATION' === activity.actType ){
                        activity.activities = [];
                        activity.isPrescribed = false;
                    }
                    /**
                     * remove children from parent Schein
                     * the links will be added in child creation proccess(if it is needed, currently only user can not use more that 1 schein in sequence)
                     */
                    if( Y.doccirrus.schemas.activity.isScheinActType( activity.actType ) && activity.activities && 1 < activity.activities.length ) {
                        activity.activities = [];
                        activity.timestamp = newActivity.timestamp;
                    } else {
                        activity.timestamp = moment( newActivity.timestamp ).add( nextMSValue(), 'millisecond' ).toISOString();
                    }
                    activity.employeeId = newActivity.employeeId;
                    activity.locationId = newActivity.locationId;
                    activity.patientId = newActivity.patientId;
                    activity.caseFolderId = caseFolder._id.toString();

                    initialActivityList[ currentActivityId ] = initialActivityList[ currentActivityId ] || {
                            _id: currentActivityId,
                            parentActivities: []
                        };
                    activity.activities.forEach( function( activityId ) {
                        addIfNotExist( activityId, dependencies );
                    } );
                    activity.icds.forEach( function( activityId ) {
                        addIfNotExist( activityId, dependencies );
                    } );
                    activity.icdsExtra.forEach( function( activityId ) {
                        addIfNotExist( activityId, dependencies );
                    } );
                    dependencies.forEach( function( activityId ) {
                        initialActivityList[ activityId ] = initialActivityList[ activityId ] || {
                                _id: activityId,
                                parentActivities: []
                            };
                        initialActivityList[ activityId ].parentActivities.push( currentActivityId );
                    } );

                    completeActivityMap[ activity._id ] = activity;

                    rCache.store( 'activity', currentActivityId, activity );

                    delete activity._id;
                } );
            }

            Y.Object.each( initialActivityList, function( actObj ) {
                var treeObj = {
                    _id: actObj._id,
                    dependencies: []
                };
                if( !actObj.parentActivities.length ) {
                    tree.push( treeObj );
                    nodes[ actObj._id ] = treeObj;
                    nodes.amount++;
                } else {
                    activityWithDep.push( actObj );
                }
            } );
            if( nodes.amount ) {
                populateTree( activityWithDep, nodes, function() {
                    callback( null, {
                        tree,
                        completeActivityMap
                    } );
                } );
            } else {
                return callback( null, {
                    tree,
                    completeActivityMap
                } );
            }

        }

        /**
         *  Applies sequence for patient
         *
         *  Overall process:
         *
         *      (check params)
         *
         *      1.  Get activitysequence object from database, sequence contains _ids of activities to copy
         *      2.  Load activities recorded in the sequence, as well as their tree of linked activities
         *      3.  Make copies of all nodes in tree, updating activity data from catalogs, etc
         *          3.1 Prepare node to save (all activities, goes from last to first layer)
         *              3.1.1 Check and load any additional data into an (single) activity before storing in database
         *
         *              ->  updateMMIEntry
         *              ->  updateCatalogEntry
         *                  ->  updateGOAE
         *                  ->  updateUVGOAE
         *                  ->  updateEBM
         *
         *      (save each copied and updated activity to the database)
         *      (copy any documents and media owned by activities in the sequence)
         *      (remap any forms associated with activities in sequence)
         *
         *  Step 3 involves a number of substeps to update copied activities before they are posted to the database.
         *
         *  @method applySequence
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {String}    args.query._id                      sequence id
         *  @param  {String}    args.query.employeeId               employee id for new activities
         *  @param  {String}    args.query.timestamp                timestamp for new activities
         *  @param  {String}    args.query.locationId               location id for new activities
         *  @param  {String}    args.query.patientId                patient id for new activities
         *  @param  {String}    args.query.caseFolderId             case folder id for new activities
         *  @param  {String}    args.query.caseFolderType           case folder type for new activities
         *  @param  {Array}     args.query.selectedActivities       array of activities id to apply
         *  @param  {String}    args.query.caseFolderAdditionalType case folder additional type for new activities
         *  @param  {Function}  args.onActivitiesPosted             (optional) called after all activities saved to db
         *  @param  {Function}  args.callback
         */

        async function applySequence( args ) {
            const
                async = require( 'async' ),
                moment = require( 'moment' ),
                ObjectID = require('mongodb').ObjectID,
                { user, query = {}, callback, onActivitiesPosted, data = {} } = args,
                isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            let
                caseFolder = {
                    type: query.caseFolderType,
                    additionalType: query.caseFolderAdditionalType,
                    _id: query.caseFolderId
                },

                { _id: sequenceId, timestamp, employeeId, locationId, patientId, useOriginalValues,
                    insuranceStatus, caseFolderType, caseFolderAdditionalType, daySeparation } = query, //eslint-disable-line
                { activitiesData = [] } = data,
                activitiesDataMap = new Map(),
                selectedActivities = activitiesData.map( item => item._id ),

                rCache = Y.doccirrus.insight2.reportingCache.createReportingCache(),
                queueKey = {},
                cacheObj = {},

                endOfDay = moment().endOf( 'day' ),   //  latest valid date when creating activities

                sequenceObj,
                completeActivityMap,
                tree,
                isCountValid = true;

            Y.doccirrus.weakQueue.newQueue( queueKey );

            if( daySeparation && activitiesData.length ) {
                let lastIndex;

                activitiesData.forEach( (activity, index) => {
                    if(activity.actType === "TREATMENT") {
                        lastIndex = index;
                    }
                } );

                if( lastIndex ) {
                    activitiesData[lastIndex].daySeparation = daySeparation;
                }
            }

            //  Check params
            activitiesData.forEach( item => {
                activitiesDataMap.set( item._id, item );
                isCountValid = isCountValid && Y.doccirrus.validations.common.ActivityDataItem_T_count[ 0 ].validator( item.count || 1 );
            } );

            if( !isCountValid ) {
                Y.log( 'applySequence error: Count is too big.', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Count must be in the range 1 to 10' } ) );
            }
            if( !sequenceId ) {
                Y.log( 'applySequence error: sequence id is missing.', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'sequence id is missing.', true ) );
            }

            if( !( caseFolder.type || caseFolder.additionalType ) || !caseFolder._id ) {
                Y.log( 'applySequence error: case folder information is missing.', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'case folder information is missing', true ) );
            }

            if ( moment( timestamp ).isAfter( endOfDay ) ) {
                //  future dates are invalid, use current date instead MOJ-10468
                Y.log( `Requested date was in the future, applying sequence today instead: ${timestamp}`, 'warn', NAME );
                timestamp = moment().toISOString();
            }

            let
                preparedActivities = [],
                processedActivities = [],
                savedActivities = [];

            var
                idMap = {}; //map oldId: newId

            async.series(
                [
                    getLastTimestampInDate,
                    updateSequenceSettings,
                    loadActivitySequence,
                    loadActivitiesTree,     //  <--- calls back here
                    copyActivitiesTree,
                    copyAttachedDocumentsAndSave
                    //remapCopiedForms              //  called by copyAttachedDocumentsAndSave due to async/await issue MOJ-13898
                    //updateClientCaseFolder        //  due to intermittent timing issue
                ],
                onAllDone
            );

            async function getLastTimestampInDate( next ) {
                let
                    ts = moment(timestamp).add(moment().utcOffset(), 'm'), //correct possible DST that shift date diapason to prev day
                    [err, activities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        //  limit to the same casefolder we are creating entries in
                        caseFolderId: query.caseFolderId,
                        timestamp: {
                            $gt: ts.clone().startOf( 'day' ).toISOString(),
                            $lte: ts.clone().endOf( 'day' ).toISOString()
                        }
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        sort: {
                            timestamp: -1
                        },
                        select: {
                            timestamp: 1
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `updateSequenceSettings: Error in getting last activity timestamp in ${timestamp} : ${err.message}`, 'error', NAME );
                }

                if( activities && activities.length ){
                    let nextTimestamp = moment(activities[0].timestamp).add(50, 'seconds');
                    if( nextTimestamp.isAfter(ts)){
                        timestamp = nextTimestamp.toISOString();
                    }
                }

                if ( moment( timestamp ).isAfter( endOfDay ) ) {
                    //  future dates are invalid, use current date instead MOJ-10468
                    Y.log( `Inferred date was in the future, applying sequence today instead: ${timestamp}`, 'warn', NAME );
                    timestamp = moment().toISOString();
                }

                return next( null ); // No need to throw an error.
            }

            //  0.  Update the useOriginalValueByDefault setting
            async function updateSequenceSettings( next ) {
                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    action: 'update',
                    query: {_id: sequenceId},
                    data: {
                        $set: {"useOriginalValues": useOriginalValues || false}
                    }
                } ) );

                if( err ) {
                    Y.log( `updateSequenceSettings: Error in updating activitysequence setting. ${err.message}`, 'error', NAME );
                }

                return next( null ); // No need to throw an error.
            }

            //  1.  Get activitysequence object from database, sequence contains _ids of activities to copy
            function loadActivitySequence( next ) {
                async function getActivitySequenceCb( err, results ) {
                    /**
                     * Error handling
                     */
                    if( err ) {
                        return next( err );
                    }

                    if( !results || !results.length ) {
                        return next( Y.doccirrus.errors.rest( 10400, '', true ) );
                    }

                    if( !results[0].activities || !results[0].activities.length ) {
                        return next( Y.doccirrus.errors.rest( 10001, '', true ) );
                    }
                    // --- error handling

                    sequenceObj = results[0];
                    let
                        hasTarmedActivities = ( sequenceObj && sequenceObj.activities || [] ).some( i => {
                            return 'TREATMENT' === i.actType && 0 <= Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( i.catalogShort );
                        });

                    Y.log( `ApplySequence: start applying ${sequenceId} - ${sequenceObj.title}`, 'info', NAME );

                    // if hasn't TARMED treatments then no need to check dignities
                    if( isSwiss && hasTarmedActivities ) {
                        //for swiss system do not create activities if employee do not have coresponding Dignity
                        let [error, employeeData] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'employee',
                            action: 'get',
                            query: {
                                _id: query.employeeId
                            },
                            options: {
                                lean: true,
                                limit: 1
                            }
                        } ) );

                        if( error ) {
                            Y.log( `loadActivitySequence: Error in getting employee ${query.employeeId}. ${error.stack || error}`, 'error', NAME );
                            return next( error );
                        }

                        let
                            employeeDignities = employeeData[0] && employeeData[0].qualiDignities || [],
                            activities = sequenceObj.activities || [],
                            filteredActivities = [],
                            wrongDignities = [];

                        for( let i = 0; i < activities.length; i++ ) {
                            let u_extra = activities[i].u_extra || {},
                                activityDignities = u_extra.dignityRules &&
                                                    u_extra.dignityRules.qualDignity &&
                                                    u_extra.dignityRules.qualDignity.map( function( elem ) {
                                                        return elem.code;
                                                    } ) || [],
                                selectedActivity = activities[i];

                            // check dignities for TARMED treatments only
                            if( 'TREATMENT' === selectedActivity.actType && 0 <= Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( selectedActivity.catalogShort ) ) {
                                let
                                    hasDignities = activityDignities.some( i => {
                                        return -1 !== employeeDignities.indexOf( i );
                                    });

                                if( !hasDignities ) {
                                    // if no dignities then get needed dignities for activity
                                    ( activityDignities || [] ).forEach( i => {
                                        if( -1 === employeeDignities.indexOf( i ) ) {
                                            wrongDignities.push({
                                                actCode: selectedActivity.code,
                                                code: i
                                            });
                                        }
                                    });
                                    continue;
                                }
                                filteredActivities.push( activities[i] );
                            } else {
                                filteredActivities.push( activities[i] );
                            }
                        }
                        if( wrongDignities.length ) {
                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: user.identityId,
                                event: 'TREATMENT_DIGNITIES_ERROR',
                                msg: {
                                    data: wrongDignities
                                }
                            } );
                            Y.log( `loadActivitySequence: activity with codes: ${JSON.stringify( wrongDignities )} not created due to dignities mismatch.`, 'info', NAME );
                        }
                        sequenceObj.activities = filteredActivities;
                    }

                    // Previously activity sequences were saved with patient specific data, that would later appear in the audit logs.
                    // Cleaning up the activities objects prevents that. This is to deal with existing activity sequences.
                    // Patient specific data is not saved anymore for newly created sequences.
                    removePatientSpecificDataFromActivities( {activities: sequenceObj.activities, action: "INSERT"} );

                    //  Resize cache to hold all original and copied activities
                    rCache.setCacheSize( 'activity', sequenceObj.activities.length * 4 );
                    rCache.setCacheSize( 'fullActivity', sequenceObj.activities.length * 4 );

                    next( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activitysequence',
                    action: 'get',
                    query: {
                        _id: sequenceId
                    },
                    options: {
                        lean: true
                    }
                }, getActivitySequenceCb );
            }

            //  2.  Load activities recorded in the sequence, as well as their tree of linked activities
            function loadActivitiesTree( next ) {
                var filterSequenceActivities = sequenceObj.activities.filter( activity => -1 !== selectedActivities.indexOf( activity._id.toString() ) );
                getActivityTree( {
                    user: user,
                    data: {
                        caseFolder,
                        newActivity: {
                            timestamp: timestamp,
                            employeeId: employeeId,
                            locationId: locationId,
                            patientId: patientId
                        },
                        activities: filterSequenceActivities
                    },
                    callback: onActivitiesTreeLoaded
                } );

                function onActivitiesTreeLoaded( _err, result ){
                    if( _err ) {
                        return next( _err );
                    }

                    tree = result.tree;
                    completeActivityMap = result.completeActivityMap;

                    callback( null, [] ); // eslint-disable-line callback-return

                    next( null );
                }
            }

            //  3.  Make copies of all nodes in tree, updating sequence numbers, data from catalogs, etc
            function copyActivitiesTree( next ) {
                //  if no tree of activities to copy then we can skip this step
                if ( !tree.length ) { return next( null ); }

                //  callback here, suppress eslint

                function checkTreeNodeForActivityCount( mainNode, callback ) {
                    async.series( [
                        function( next ) {
                            async.eachSeries( mainNode.dependencies, checkTreeNodeForActivityCount, next );
                        },
                        function( next ) {
                            let
                                activity = activitiesDataMap.get( mainNode._id ),
                                count = (activity && Number( activity.count ) || 0) - 1, // 1 is default
                                hasCreated = savedActivities.some( i => activity._id.toString() === i );
                            savedActivities.push( activity._id.toString() );
                            if( 0 < count && !hasCreated ) {
                                let
                                    iterArr = Array.apply( null, { length: count } ).map( Number.call, Number );
                                async.eachSeries( iterArr, ( index, callback ) => {
                                    if( 'TREATMENT' !== activity.actType && -1 !== Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( activity.catalogShort ) ) {
                                        // all TARMED treatments should be linked
                                        idMap = {};
                                    }
                                    prepareTreeNode( mainNode, callback );
                                }, next );

                            } else {
                                setImmediate( next );
                            }
                        }
                    ], callback );
                }

                async.series( [
                    function saveEachNode( _cb ) {
                        /**
                         * save every main Node:
                         *  save layer by layer from latest one.
                         */
                        async.eachSeries( tree, function( mainNode, done ) {
                            prepareTreeNode( mainNode, done );
                        }, _cb );
                    },
                    function saveAdditionalNodes( _cb ) {
                        let
                            shouldCreateAdditionalNodes = activitiesData.some( item => 1 < item.count );
                        /**
                         * do check for count
                         */
                        if( shouldCreateAdditionalNodes ) {
                            async.eachSeries( tree, checkTreeNodeForActivityCount, _cb );
                        } else {
                            setImmediate( _cb );
                        }
                    }
                ], (err)=>next(err));


            }   //  end step 3

            /**
             *  3.1 Prepare node to save (goes from last to first layer)
             *  @param {Object}     node object of tree
             *  @param {Function}   callback
             *
             *  @return {Function | undefined}
             */
            function prepareTreeNode( node, callback ) {
                function dependenciesMapper( id ) {
                    return idMap[ id ];
                }

                function filterNegative( id ) {
                    return id;
                }

                var activity;

                if ( !node.dependencies.length ) {
                    /**
                     * add simple record to db
                     */
                    if( completeActivityMap[ node._id ] ){
                        activity = Object.assign( {}, completeActivityMap[ node._id ] );
                    } else {
                        return callback();
                    }
                    prepareActivityToSave( node, activity, callback );
                    return;
                }

                //if( node.dependencies.length ) {

                //}

                async.eachSeries( node.dependencies, function iterator( childNode, done ) {
                    let hasCreated = savedActivities.some( i => childNode._id.toString() === i );
                    savedActivities.push( childNode._id.toString() );
                    if( idMap[ childNode._id ] || hasCreated ) {
                        return done();
                    }
                    prepareTreeNode( childNode, done );
                }, function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    /**
                     * add complex record to db
                     */
                    activity = Object.assign( {}, completeActivityMap[ node._id ] );
                    activity.icds = activity.icds.map( dependenciesMapper ).filter( filterNegative );
                    activity.icdsExtra = activity.icdsExtra.map( dependenciesMapper ).filter( filterNegative );
                    activity.activities = activity.activities.map( dependenciesMapper ).filter( filterNegative );
                    prepareActivityToSave( node, activity, callback );
                } );

            }  // end saveTreeNode

            /**
             * Check and load any additional data into an activity before storing in database
             * When ready, will be pushed into preparedActivities
             *
             * @param   {Object}    node        Node from original tree, has _id of original activity (? CHECKME)
             * @param   {Object}    activity
             * @param   {Function}  callback
             */
            function prepareActivityToSave( node, activity, callback ) {

                async.waterfall( [
                    function( next ) {
                        checkActivity( activity, next );
                    },
                    function( activity, next ) {
                        const caseFolderType = caseFolder.type;
                        const activityData = activitiesDataMap.get( node._id );
                        const id = new ObjectID();
                        activity._id = id;
                        idMap[node._id] = id;

                        if( ('DIAGNOSIS' === activity.actType && ('NONE' === activity.diagnosisCert || !activity.diagnosisCert)) &&
                            ('PUBLIC' === caseFolderType || 'BG' === caseFolderType) ) {
                            activity.diagnosisCert = 'CONFIRM';
                        }

                        // ------------------------------------ UPDATE USER CONTENT FACTOR -------------------------------------
                        // The userContent is determined as follows:
                        //    1) If it was changed manually on the client, keep that value
                        //    2) If it was not changed manually:
                        //          a) If useOriginalValues was checked, keep the old value.
                        //          b) If useOriginalValues was unchecked, update according to catalog

                        if( activity.userContent !== activityData.userContent ) { // 1)
                            activity.userContent = activityData.userContent;
                        } else if( activity.actType === "TREATMENT" && !useOriginalValues ) { // 2.b)
                            activity.userContent = activity.updatedUserContent || activity.userContent; // Take old value if no updated value is found. (e.g: for Hauskatalog)
                        }

                        activity.explanations = activityData.explanations;

                        if( activityData.daySeparation ) {
                            activity.daySeparation = activityData.daySeparation;
                        }

                        /**
                         * Invoice business
                         */
                        activity.invoiceId = undefined;
                        activity.invoiceLogId = undefined;

                        preparedActivities.push( activity );
                        next( null, activity );
                    },
                    //  Form version _id , this is deleted when creating an activity sequence, and must be re-added, MOJ-10964
                    //  TODO: remove this waterfall, async await
                    function checkFormVersionId( activity, next ) {
                        //  If no form on this activity when we can skip this step
                        if ( !activity.formId ) { return next( null, activity ); }
                        //  If activity already has a form version when we can skip this step
                        if ( activity.formId && activity.formVersion ) { return next( null , activity ); }

                        Y.doccirrus.api.formtemplate.listforms( {
                            user: user,
                            originalParams: { canonicalId: activity.formId },
                            callback: onFormLookup
                        } );

                        Y.dcforms.getFormListing( user, activity.formId, onFormLookup );

                        function onFormLookup( err, formMeta ) {
                            if ( err ) { return next( err ); }
                            if ( formMeta && formMeta[0] && formMeta[0].latestVersionId ) {
                                activity.formVersion = formMeta[0].latestVersionId;
                            }
                            next( null, activity );
                        }
                    }
                ], ( err, result ) => {
                    if( err && err.code !== 18100 ) {
                        callback( err );
                        return;
                    }
                    // notify on invalid treatment code
                    if( err && err.code === 18100 ) {
                        Y.log( err.message, 'debug', NAME );
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'message',
                            msg: {
                                data: err.message
                            }
                        } );

                    }
                    callback( null, result );
                } );

                /**
                 * Checks and updates(if it is needed) activities with actual data of 'catalogs' collection or MMI service
                 * If activity is based on custom entry, function returns activity without changes,
                 *  otherwise it tries to update data of activity
                 *
                 * Also protect against legacy data. MOJ-8740
                 *
                 * @param {Object} activity activity data
                 * @param {Function} callback
                 * @see updateCatalogEntry
                 * @see updateMMIEntry
                 */

                function checkActivity( activity, callback ) {
                    // protection
                    if( 'REFERRAL' === activity.actType || 'LABREQUEST' === activity.actType ) {
                        if( '' === activity.untersArt ) {
                            delete activity.untersArt;
                        }
                    }

                    // imported activities may have dates in the future, these are not valid when inserted
                    // via a sequence MOJ-10468

                    let
                        endOfToday = moment().endOf( 'day' );       //  see validation _pastOrPresentDate

                    if( activity.timestamp && moment( activity.timestamp ).isAfter( endOfToday ) ) {
                        Y.log( `Sequence activity was in the future, setting to current date/time: ${activity.timestamp}`, 'warn', NAME );
                        activity.timestamp = moment().toISOString();
                    }

                    // original code
                    if( 'MMI' === activity.catalogRef ) {
                        if( !activity.phPZN ) {
                            // Custom mmi activity. Does not need to be updated.
                            return callback( null, activity );
                        }
                        return updateMMIEntry( activity, callback );
                    } else if( activity.catalogRef && activity.code ) {
                        return updateCatalogEntry( activity, useOriginalValues, callback );
                    } else {
                        // Does not need to be updated.
                        return callback( null, activity );
                    }
                }

                /**
                 * Updates GOÄ/UVGOÄ catalog entry(comes from 'catalogs' collection).
                 *  If query to 'catalogs' collection returns 0 entries or error occurred, function returns activity without changes.
                 * @param {Object} activity activity data
                 * @param {Boolean} useOriginalValues
                 * @param {Function} callback
                 * @see updateGOAE
                 * @see updateUVGOAE
                 *
                 * @return {Function}   callback
                 */
                function updateCatalogEntry( activity, useOriginalValues, callback ) {
                    let
                        title,
                        activityData;
                    Y.doccirrus.api.catalog.convertGopCode( activity );
                    switch( activity.catalogShort ) {
                        case 'GOÄ':
                        case 'AMTS':
                        case 'UVGOÄ':
                        case 'EBM':
                            title = sequenceObj.title;
                            activityData = activitiesDataMap.get( node._id );
                            Y.doccirrus.treatmentutils.updateTreatment( { user, activity, activityData, timestamp, useOriginalValues, insuranceStatus, caseFolderType, caseFolderAdditionalType, title }, callback );
                            break;
                        case 'TARMED':
                        case 'TARMED_UVG_IVG_MVG':
                            Y.doccirrus.api.activity.calculateActivityMedicalScalingFactor( {
                                user,
                                originalParams: {
                                    activityData: activity,
                                    caseFolderType
                                },
                                callback: function( error, newMedicalScalingFactor ) {
                                    activity.medicalScalingFactor = newMedicalScalingFactor;
                                    Y.doccirrus.api.activity.calculateTarmedPrice( {
                                        user,
                                        originalParams: {
                                            treatment: activity,
                                            caseFolderType
                                        },
                                        callback: function( error, price ) {
                                            activity.price = price;
                                            return callback(error, activity);
                                        }
                                    } );
                                }
                            } );
                            break;
                        default:
                            return callback( null, activity );

                    }
                }

            }

            /**
             * Updates MMI Entry.
             *  If mmi does not response, returns 0 entries, or error occurred, function returns activity without changes.
             * @param {Object} activity activity data
             * @param {Function} callback
             */
            function updateMMIEntry( activity, callback ) {
                Y.doccirrus.api.activity.getMedicationData( {
                    user,
                    data: {
                        locationId: activity.locationId,
                        employeeId: activity.employeeId,
                        patientId: activity.patientId,
                        pzn: activity.phPZN,
                        caseFolderId: caseFolder._id
                    },
                    callback( err, result ){
                        if( err ) {
                            Y.log( `Error occurred while request to mmi: ${JSON.stringify( err )}`, 'warn', NAME );
                            return callback( null, activity );
                        }

                        if( result && result.medicationData ) {
                            Object.keys( result.medicationData ).forEach( key => {
                                if( undefined !== activity[key] ) {
                                    activity[key] = result.medicationData[key];
                                }
                            } );
                        }
                        callback( null, activity );
                    }
                } );
            }

            //  6.  Copy documents and media from sequence activity and attach to new activities
            //  TODO: restrict this to form documents
            async function copyAttachedDocumentsAndSave( itcb ) {
                const
                    copyActivityAttachmentsP = util.promisify( Y.doccirrus.activityapi.copyActivityAttachments ),
                    saveSinglePreparedActivityP = util.promisify( saveSinglePreparedActivity );

                let
                    err, newDocumentIds,
                    newActivity;

                for ( newActivity of preparedActivities ) {

                    [ err, newDocumentIds ] = await formatPromiseResult(
                        copyActivityAttachmentsP( user, false, newActivity, newActivity._id )
                    );

                    if ( err ) {
                        Y.log( `Could not copy activity attachments: ${err.stack||err}`, 'warn', NAME );
                    }

                    //  replace the attachments array
                    newActivity.attachments = newDocumentIds || [];

                    //  save the activity to the database
                    [ err ] = await formatPromiseResult(
                        saveSinglePreparedActivityP( newActivity )
                    );

                    if ( err ) {
                        Y.log( `applySequence: Could not save new activity: ${err.stack||err}`, 'warn', NAME );
                    }
                }

                remapCopiedForms( itcb );
            }

            //  4.1 Add a single activity to the batch
            function saveSinglePreparedActivity(activity, next) {
                const
                    isLastInBatch = preparedActivities.indexOf( activity ) === preparedActivities.length - 1;

                activity = {...activity, processingType: 'sequence'};
                Y.doccirrus.filters.cleanDbObject( activity );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: activity,
                    context: {
                        weakQueueKey: queueKey,
                        isLastInBatch: isLastInBatch,
                        cache: cacheObj,
                        rCache: rCache,
                        autoCreation: true
                    },
                    callback: onPostedPreparedActivity
                } );

                function onPostedPreparedActivity( err, results ) {
                    if( err ) {
                        Y.log( 'ApplySequence. Can not save one of activities. Activity sequence id: ' + sequenceId + ', Error: ' + JSON.stringify( err ), 'debug', NAME );

                        Y.doccirrus.communication.emitEventForSession( {
                            sessionId: user.sessionId,
                            event: 'errorNotification',
                            msg: {
                                data: {
                                    error: err
                                }
                            }
                        } );

                        return next( err );
                    }

                    activity._id = results && results[0];
                    rCache.store( 'activity', activity._id + '', activity );

                    let processedData = {
                        _id: results && results[ 0 ],
                        patientId: activity.patientId,
                        caseFolderId: activity.caseFolderId,
                        timestamp: activity.timestamp,
                        date: moment( activity.timestamp ).format( "YYYY-MM-DD" ),
                        locationId: activity.locationId,
                        employeeId: activity.employeeId,
                        formId: activity.formId,
                        actType: activity.actType,
                        areTreatmentDiagnosesBillable: activity.areTreatmentDiagnosesBillable
                    };
                    if( activity.code ){ processedData.code = activity.code; }
                    if( activity.catalogShort ){ processedData.catalogShort = activity.catalogShort; }

                    processedActivities.push( processedData );

                    next( err );
                }
            }

            function remapCopiedForms( itcb ) {
                if ( 0 === processedActivities.length ) { return itcb( null ); }

                async.eachSeries( processedActivities, remapSingleActivity, onRemappedForms );

                function remapSingleActivity( stub, next ) {
                    if ( !stub.formId || '' === stub.formId ) { return next( null ); }
                    Y.doccirrus.forms.mappinghelper.remapInNewContext( user, stub._id, rCache, next );
                }

                //  something is calling back early sometimes in a previous step, running next step outside of async
                //  series until this can all be refactored with async/await.
                function onRemappedForms( err ) {
                    updateClientCaseFolder( Y.dcforms.nullCallback );
                    triggerBatchRuleProcessing( Y.dcforms.nullCallback );
                    itcb( err );
                }
            }

            //  5. Tell client(s) to refresh the casefolder view
            function updateClientCaseFolder( itcb ) {
                //  if no change to activities in casefolder then we can skip this step
                if( !processedActivities.length ) { return itcb( null ); }


                Y.doccirrus.communication.emitEventForSession({
                    sessionId: user.sessionId,
                    event: 'refreshCaseFolder',
                    msg: {
                        data: {
                            caseFolderId: caseFolder._id
                        }
                    }
                });
                itcb( null );
            }

            //  6.  Run rules against batch of new activities
            function triggerBatchRuleProcessing( itcb ) {
                //  if no change to activities in casefolder then we can skip this step
                if( !processedActivities.length ) { return itcb( null ); }
                //  rules should not be triggered in Mocha test environment
                if( Y.doccirrus.auth.isMocha() ) { return itcb( null ); }

                Y.doccirrus.api.rule.triggerIpcQueue( {
                    user,
                    tenantId: user.tenantId,
                    type: 'activity',
                    caseFolderId: processedActivities[0].caseFolderId,
                    locationId: processedActivities[0].locationId.toString(),
                    patientId: processedActivities[0].patientId,
                    onDelete: false,
                    processingType: 'sequence',
                    preparedActivities: processedActivities,
                    data: JSON.parse( JSON.stringify( processedActivities[0] ) )
                } );

                return itcb( null );        //  not waiting for rules to complete
            }

            function onAllDone( err ) {
                if( 'function' === typeof onActivitiesPosted ){
                    onActivitiesPosted( err, processedActivities );
                }

                if( err ) {
                    Y.log( 'ApplySequence. Error: ' + JSON.stringify( err ), 'debug', NAME );
                    return callback( err );
                }

            }
        }

        /**
         * reorders all sequence with bigger indexes
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.callback
         */
        function reorderSequences( args ) {
            var async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activitysequence',
                        action: 'get',
                        options: {
                            sort: { order: 1 }
                        }
                    }, next );

                },
                function( sequences, next ) {
                    var step = Y.doccirrus.schemas.activitysequence.getOrderStep(),
                        i = 1;

                    if (!sequences || !sequences.length ) { return next(); }

                    async.eachSeries( sequences, function( sequence, _next ) {
                        var data = {
                            order: step * i
                        };
                        Y.doccirrus.filters.cleanDbObject( data );
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'activitysequence',
                            action: 'put',
                            fields: 'order',
                            data: data,
                            query: {
                                _id: sequence._id.toString()
                            }
                        }, function( err, results ) {
                            i++;
                            _next( err, results );
                        } );
                    }, next );
                }
            ], args.callback );
        }

        function getActivityCompleteList( args ) {
            var
                user = args.user,
                queryParams = args.query || {},
                callback = args.callback;

            loadActivitiesDeep( {
                    user: user,
                    initList: queryParams.activitiesId,
                    options: {
                        lean: true,
                        sort: {
                            actType: 1,
                            timestamp: -1
                        },
                        select: {
                            timestamp: 1,
                            actType: 1,
                            subType: 1,
                            catalogShort: 1,
                            code: 1,
                            content: 1,
                            activities: 1,
                            icds: 1,
                            icdsExtra: 1
                        }
                    }
                }, function( err, list ) {
                    callback( err, list );
                }
            );
        }

        /**
         * Replicates activitysequence collection from user tenant to the rest in the system.
         * @method replicateEntries
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.user.tenantId
         * @param {Object} [args.data]
         * @param {Array} [args.data.tenantList] if not present, will be catch from db.
         * @param {Function} args.callback
         */
        function replicateEntries( args ) {
            let
                { user, data:{ tenantList } = {}, callback } = args,
                async = require( 'async' );

            function prepareData( callback ) {
                async.parallel( {
                    tenantList( done ){
                        if( tenantList ) {
                            setImmediate( done, null, tenantList );
                        } else {
                            Y.doccirrus.api.company.getActiveTenants( {
                                user,
                                callback( err, results ){
                                    if( err ) {
                                        return done( err );
                                    }
                                    done( null, results.map( doc => doc.tenantId ) );
                                }
                            } );
                        }
                    },
                    acModel( done ){
                        Y.doccirrus.mongodb.getModel( user, 'activitysequence', true, done );
                    }
                }, callback );
            }

            function insertEntry( config, callback ) {
                let
                    { data, tenantId } = config,
                    su = Y.doccirrus.auth.getSUForTenant( tenantId );
                Y.doccirrus.api.activitysequence.upsert( {
                    user: su,
                    query: {
                        _id: data._id
                    },
                    fields: Object.keys( data ),
                    data,
                    callback
                } );
            }

            function replicateForTenant( config, callback ) {
                let
                    { tenantId, acModel } = config,
                    stream,
                    error = null;
                /**
                 * skip master tenant
                 */
                if( tenantId === user.tenantId ) {
                    return setImmediate( callback );
                }
                Y.log( `replicateEntries. Starting activity sequences replication for ${tenantId}.`, 'debug', NAME );
                stream = acModel.mongoose.find( {} ).stream();

                stream.on( 'data', function( activitySequence ) {
                    let
                        data;
                    stream.pause();
                    if( 'function' === typeof activitySequence.toObject ) {
                        activitySequence = activitySequence.toObject();
                    }
                    data = Object.assign( {}, activitySequence );
                    data._id = activitySequence._id.toString();
                    delete data.__v;
                    insertEntry( {
                        tenantId,
                        data
                    }, function( err ) {

                        if( err ) {
                            return stream.destroy( err );
                        }
                        stream.resume();
                    } );
                } ).on( 'error', function( err ) {
                    Y.log( 'replicateEntries. stream error' + err, 'error', NAME );
                    error = err;

                } ).on( 'close', function() {
                    Y.log( `replicateEntries. stream close event, activity sequences replication process finished for ${tenantId}.`, 'debug', NAME );

                    callback( error );
                } );
            }

            Y.log( 'replicateEntries. Starting replication process.', 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    prepareData( next );
                },
                function( preparedData, next ) {
                    let
                        { acModel, tenantList } = preparedData;

                    async.eachSeries( tenantList, function( tenantId, done ) {
                        /**
                         * skip master tenant
                         */
                        if( tenantId === user.tenantId ) {
                            return setImmediate( done );
                        }
                        replicateForTenant( {
                            acModel,
                            tenantId
                        }, done );
                    }, next );
                }
            ], callback );
        }

        /**
         * @method post
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.user
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        function post( args ){
            let
                { data, user, options, callback } = args;
            data = Y.doccirrus.filters.cleanDbObject( data );
            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'activitysequence',
                user: user,
                data: data,
                options: options
            }, callback );
        }

        /**
         * @method upsert
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        function upsert( args ){
            let
                { user, query, data, callback, options } = args;
            data = Y.doccirrus.filters.cleanDbObject( data );
            Y.doccirrus.mongodb.runDb( {
                action: 'upsert',
                model: 'activitysequence',
                user,
                query,
                data,
                options
            }, callback );
        }

        async function getAllSequenceGroups( args ) {
            const
                timer = logEnter( 'getAllSequenceGroups' ),
                {user, query = {}, options = {}, callback} = args,
                pipeline = [
                    {"$unwind": "$sequenceGroups" },
                    { "$match": query },
                    { "$group":
                        { _id: null, groups: {"$addToSet": "$sequenceGroups" } }
                    }
                ];

            let err, results;

            [ err, results ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    action: 'aggregate',
                    pipeline: pipeline,
                    options: options
                } )
            );

            if (err) {
                return callback(err);
            }

            if (!results || !results.result || !results.result[0]) {
                return callback(null, []);
            }

            //  sometimes there can be a case where the aggregation returns the group twice, once with order and
            //  once without.  Sort and deuplicate results before returning.

            let
                groups = results.result[0].groups,
                known = [],
                deduplicated = [],
                i;

            groups.sort( function( a, b ) {
                const
                    aHasOrder = a.hasOwnProperty( 'order' ),
                    bHasOrder = b.hasOwnProperty( 'order' );

                if ( aHasOrder && bHasOrder ) {
                    return a.order - b.order;
                }

                if ( aHasOrder && !bHasOrder ) {
                    return -1;
                }

                if ( !aHasOrder && bHasOrder ) {
                    return 1;
                }
            } );

            for ( i = 0; i < groups.length; i++ ) {
                if ( -1 === known.indexOf( groups[i].name ) ) {
                    known.push( groups[i].name );
                    deduplicated.push( groups[i] );
                }
            }

            //  force a sane order
            for ( i = 0; i < deduplicated.length; i++ ) {
                deduplicated[i].order = ( i + 1 );
            }

            logExit( timer );
            return callback(null, deduplicated);
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class activitysequence
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).activitysequence = {
            /**
             * @property name
             * @type {String}
             * @default activitysequence-api
             * @protected
             */
            name: NAME,
            post( args ){
                Y.log('Entering Y.doccirrus.api.activitysequence.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.post');
                }
                post( args );
            },
            upsert( args ){
                Y.log('Entering Y.doccirrus.api.activitysequence.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.upsert');
                }
                upsert( args );
            },
            getActivityTree: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.getActivityTree', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.getActivityTree');
                }
                getActivityTree( args );
            },
            updateSequences: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.updateSequences', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.updateSequences');
                }
                updateSequences( args );
            },
            batchUpdate: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.batchUpdate', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.batchUpdate');
                }
                batchUpdate( args );
            },
            getLightSequences: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.getLightSequences', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.getLightSequences');
                }
                getLightSequences( args );
            },
            applySequence: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.applySequence', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.applySequence');
                }
                applySequence( args );
            },
            reorderSequences: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.reorderSequences', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.reorderSequences');
                }
                reorderSequences( args );
            },
            getActivityCompleteList: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.getActivityCompleteList', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.getActivityCompleteList');
                }
                getActivityCompleteList( args );
            },
            getSequenceWithActivities: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.getSequenceWithActivities', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.getSequenceWithActivities');
                }
                getSequenceWithActivities( args );
            },
            replicateEntries( args ){
                Y.log('Entering Y.doccirrus.api.activitysequence.replicateEntries', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.replicateEntries');
                }
                replicateEntries( args );
            },
            getAllSequenceGroups( args ){
                Y.log('Entering Y.doccirrus.api.activitysequence.getAllSequenceGroups', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.getAllSequenceGroups');
                }
                getAllSequenceGroups( args );
            },
            getSequencesByGroup: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.getSequencesByGroup', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.getSequencesByGroup');
                }
                getSequencesByGroup( args );
            },

            /**
             *  Dev / support route to manually run migration on sequences
             *  @param args
             */

            correctDocumentsInSequences: function( args ) {
                Y.log('Entering Y.doccirrus.api.activitysequence.correctDocumentsInSequences', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitysequence.correctDocumentsInSequences');
                }
                Y.doccirrus.inCaseUtils.migrationhelper.correctDocumentsInSequences( args.user, false, args.callback );
            },

            //  Not a rest call, used by migration
            copyAttachmentsToSequence

        };

    },
    '0.0.1', {
        requires: [
            'oop',
            'patient-schema',
            'casefolder-schema',
            'dc-comctl',
            'activity-schema',
            'reporting-cache',
            'treatmentutils'
        ]
    }
);
