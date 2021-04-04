/*global YUI */


YUI.add( 'mirroractivity-api', function( Y, NAME ) {

        var moment = require( 'moment' ),
            ATTRIBUTES = Y.doccirrus.schemas.mirroractivity.ATTRIBUTES;

        /**
         * Helper function populating activities in a list of activities.
         * @param {Object} model
         * @param {Array} activityList
         * @param {Object} options  optional params object
         *          field:  {String}  [ 'all' | 'icds' | 'activities' ]
         *              'icds'  populates the icds field.
         *              'all' | falsy  populates the both fields.         *              'activities'   populates the activities field.

         *          objPopulate: {Boolean} true or false
         * @param {Function }callback
         */
        function populateActivities( model, activityList, options, callback ) {
            var
                field = options.field,
                async = require( 'async' ),
                fields = ['all', 'icds', 'activities', 'icdsExtra', 'continuousIcds'];
            // check value of field
            if( 'function' === typeof field ) {
                callback = field;
                field = 'all';
            }
            // set value of field
            if( -1 === fields.indexOf( field ) ) {
                field = 'all';
            }
            // populate activityList
            async.each( activityList, function forActivity( activity, _cb ) {
                function doPopulate( fld, myCallback ) {
                    var
                        cloneFld = [].concat( activity[fld] ),
                        cleanIds = [],
                        i;

                    // rename CB
                    // it's easier to work with populated fields if they are different for
                    // read (object, populated) and write (string array) -- new pattern Mar 2014
                    //
                    // then either the output field must be in the schema then (ugly -- because its
                    // read-only!) or the field is hacked into mongoose with the following trick
                    // using _doc
                    function renameCb( err ) {
                        var
                            rename = '_' + fld + 'Obj';

                        if( err ) {
                            Y.log( "Error in populateActivityList (renameCb): \n" + err, 'error', NAME );
                            _cb( err );
                            return;
                        }
                        if( options.objPopulate ) {
                            Y.log( 'RENAME  >>>  ' +
                                   rename );
                            if( activity._doc ) {
                                activity._doc[rename] = activity[fld];
                            } else {
                                activity[rename] = activity[fld];
                            }
                            activity[fld] = cloneFld;

                        }
                        myCallback();

                    }

                    // short-circuit!
                    if( !activity[fld] ) {
                        myCallback();
                        return;
                    }
                    if( Array.isArray( activity[fld] ) && 0 === activity[fld].length ) {
                        myCallback();
                        return;
                    }

                    //  check for bad value or type of linked activity _id
                    for( i = 0; i < activity[fld].length; i++ ) {
                        Y.log( 'Checking type of linked activity: ' + i, 'debug', NAME );

                        if( null !== activity[fld][i] ) { // first filter null - legacy data
                            if( 'object' === typeof activity[fld][i] && activity[fld][i]._id && 'remap' !== activity[fld][i]._id ) {
                                Y.log( 'Correcting type before populate ==> ' + activity[fld][i]._id, 'debug', NAME );
                                cleanIds.push( activity[fld][i]._id + '' );
                            } else {
                                if( 'remap' !== activity[fld][i] ) {
                                    cleanIds.push( activity[fld][i] + '' );
                                }
                            }
                        }
                    }

                    activity[fld] = cleanIds;

                    // empty data has been short circuited by now
                    if( Array.isArray( activity[fld] ) ) {
                        // filter out placeholder -- not required with new mongoose // FIXME
                        activity[fld] = activity[fld].filter( function( val ) {
                            return val.match( /^[a-z0-9]+$/ );
                        } );
                    }
                    // mutate activity
                    model.mongoose.populate( activity, [
                        {
                            path: fld,
                            //select: 'actType timestamp caseNo patientId locationId code price content comment',
                            model: 'mirroractivity'
                        }
                    ], renameCb );
                }

                switch( field ) {
                    case 'activities': /* fall through */
                    case 'icdsExtra': /* fall through */
                    case 'icds':
                    case 'continuousIcds':
                        doPopulate( field, _cb );
                        break;
                    case 'all' :
                        // populate with waterfall to avoid
                        // race conditions.
                        async.series( [
                            function( next ) {
                                doPopulate( 'activities', next );
                            },
                            function( next ) {
                                doPopulate( 'icds', next );
                            },
                            function( next ) {
                                doPopulate( 'icdsExtra', next );
                            },
                            function( next ) {
                                doPopulate( 'continuousIcds', next );
                            }
                        ], _cb );
                        break;
                }

            }, function( err ) {
                if( err ) {
                    Y.log( "Error populateActivities: \n" + err, 'error', NAME );
                }
                callback( err, activityList );
            } );
        }

        /**
         * Helper function populating patients in a list of activities.
         * @param {Object} model
         * @param {Array }activityList
         * @param {Function} callback
         */
        function populatePatients( model, activityList, callback ) {
            require( 'async' ).each( activityList, function forActivity( activity, _cb ) {
                model.mongoose.populate( activity, [
                    {
                        path: 'patientId',
                        model: 'mirrorpatient'
                    }
                ], _cb );

            }, function( err ) {
                if( err ) {
                    Y.log( "Error populatePatients: \n" + err, 'error', NAME );
                }
                callback( err, activityList );
            } );
        }

        /**
         * Helper function populating attachments in a list of activities.
         * @param {Object} model
         * @param {Array }activityList
         * @param {Function} callback
         */
        function populateAttachments( model, activityList, callback ) {

            function forEachActivity( activity, _cb ) {

                var
                    populateOptions = {
                        model: 'document',
                        path: 'attachments',
                        select: {
                            formInstanceId: 1,
                            formId: 1,
                            formData: 1,
                            formState: 1,
                            isEditable: 1,
                            url: 1,
                            publisher: 1,
                            createdOn: 1,
                            attachedTo: 1,
                            contentType: 1,
                            locationId: 1,
                            activityId: 1,
                            patientId: 1,
                            caption: 1,
                            data: 1,
                            type: 1,
                            mediaId: 1,
                            printerName: 1,
                            accessBy: 1,
                            tags: 1
                        }
                    },
                    cleanAttachments = [],
                    check,
                    i;

                function onPopulateComplete( err ) {
                    //  rename the populated field and restore original, as with linked activities
                    activity._attachmentsObj = activity.attachments;
                    activity.attachments = cleanAttachments.slice();
                    _cb( err );
                }

                //  drop the attachments array if corrupt (knockout was messing this up in the client in an earlier
                //  version, and it could break casefile)

                if( activity.attachments ) {
                    for( i = 0; i < activity.attachments.length; i++ ) {
                        check = activity.attachments[i];
                        if( ('[object Object]' !== check) && (null !== check) && ('new' !== check) && ('remap' !== check) ) {
                            cleanAttachments.push( check );
                        }
                    }
                }

                // note clone of array, prevents duplicate redference
                activity.attachments = cleanAttachments.slice();

                Y.log( 'Populating attachments for activity: ' + activity._id, 'info', NAME );
                model.mongoose.populate( activity, [populateOptions], onPopulateComplete );
            }

            function onPopulateError( err ) {
                if( err ) {
                    Y.log( "Error in populateAttachments: \n" + err, 'error', NAME );
                }
                callback( err, activityList );
            }

            require( 'async' ).each( activityList, forEachActivity, onPopulateError );
        }

        /**
         * Helper function populating employees in a list of activities.
         * @param {Object} model
         * @param {Array }activityList
         * @param {Function} callback
         */
        function populateEmployees( model, activityList, callback ) {
            require( 'async' ).each( activityList, function forActivity( activity, _cb ) {
                model.mongoose.populate( activity, [
                    {
                        path: 'employeeId',
                        select: 'officialNo lastname firstname specialities',
                        model: 'mirroremployee'
                    }
                ], _cb );

            }, function( err ) {
                if( err ) {
                    Y.log( "Error populateEmployees: \n" + err, 'error', NAME );
                }
                callback( err, activityList );
            } );
        }

        /**
         * MOJ-1529: this is currently a hardcoded factor
         * needs to use an auxiliary library to calculate
         *
         * mutates the result
         * @param {Array} activityList array of activities
         * @param {Function} callback
         */
        function translatePrices( activityList, callback ) {
            if( typeof activityList !== 'undefined' ) {
                activityList.forEach( function( activity ) {
                    if( typeof activity !== 'undefined' ) {
                        if( activity.unit === 'Punkte' ) {
                            activity.price = activity.price * 0.035363;
                            activity.unit = 'Euro';
                        }
                    }
                } );
            }
            callback( null, activityList );
        }

        /**
         * Gets activities for a period, sorted by patient and
         * populated with the patient.
         *
         * If options.migrate is set, this can safely be used
         * during migration.
         *
         * @param {Object} args
         *
         * @return {Function} callback
         *
         */
        function getActivitiesPopulated( args ) {
            Y.log('Entering Y.doccirrus.api.mirroractivity.getActivitiesPopulated', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirroractivity.getActivitiesPopulated');
            }
            var user = args.user,
                query = args.query,
                options = args.options || {},
                data = args.data || {},
                callback = args.callback,
                migrate = options.migrate,
                myAct;

            Y.log( 'getMirrorActivitiesPopulated query: ' + JSON.stringify( query ), 'debug', NAME );

            function actCallback( err, activities ) {

                if( err || !activities ) {
                    Y.log( "Error getMirrorActivitiesPopulated (actCallback): \n" + err || 'no such patient', 'error', NAME );
                    return callback( err || 'no such patient' );
                } else {
                    if( activities.result ) {
                        myAct = activities.result;
                    } else {
                        myAct = (Array.isArray( activities ) && activities) || [activities];
                    }
                    require( 'async' ).waterfall( [

                        //  1. After this all waterfalled functions have the same signature
                        function( _cb ) {
                            _cb( null, myAct );
                        },

                        //  2. Load and populate linked activities ( recursive )
                        function( result, _cb ) {
                            if( options.withoutActivities ) {
                                return _cb( null, result );
                            } else {
                                Y.doccirrus.mongodb.getModel(
                                    user, 'mirroractivity', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getMirrorActivitiesPopulated (modCallback 1): \n" + err, 'error', NAME );
                                            return _cb( err );
                                        } else {
                                            Y.log( 'getMirrorActivitiesPopulated: populating linked activities of ' + result.length + ' activities', 'debug', NAME );
                                            populateActivities( model, result, options, _cb );
                                        }
                                    }
                                );
                            }
                        },

                        //  3. Get Patients
                        function( result, _cb ) {

                            if( options.hide && -1 < options.hide.indexOf( 'patient' ) ) {
                                return _cb( null, result );
                            } else {
                                Y.doccirrus.mongodb.getModel(
                                    user, 'mirrorpatient', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getMirrorActivitiesPopulated (modCallback 2): \n" + err, 'error', NAME );
                                            return _cb( err );
                                        } else {
                                            populatePatients( model, result, _cb );
                                        }
                                    }
                                );
                            }
                        },

                        //  4. Expand attachments
                        function( result, _cb ) {
                            if( options.withoutAttachments ) {
                                return _cb( null, result );
                            } else {
                                Y.doccirrus.mongodb.getModel(
                                    user, 'document', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getMirrorActivitiesPopulated (modCallback 3): \n" + err, 'error', NAME );
                                            return _cb( err );
                                        } else {
                                            populateAttachments( model, result, _cb );
                                        }
                                    }
                                );
                            }
                        },

                        //  5. Get and attach employee
                        function( result, _cb ) {
                            if( options.withEmployee ) {
                                Y.doccirrus.mongodb.getModel(
                                    user, 'mirroremployee', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getMirrorActivitiesPopulated (modCallback 4): \n" + err, 'error', NAME );
                                            return _cb( err );
                                        } else {
                                            populateEmployees( model, result, _cb );
                                        }
                                    }
                                );
                            } else {
                                return _cb( null, result );
                            }
                        },

                        //  6. Translate prices
                        function( result, _cb ) {
                            if( options.withEmployee ) {
                                translatePrices( result, _cb );
                            } else {
                                return _cb( null, result );
                            }
                        }

                    ], function( err, result ) {
                        if( err ) {
                            Y.log( "Error getMirrorActivitiesPopulated (waterfall final): \n" + err, 'error', NAME );
                        }
                        //Y.log( 'POPULATED WATERFALL: ' + JSON.stringify( result ) );
                        if( activities.result ) {
                            activities.result = result;
                        } else {
                            activities = result;
                        }
                        callback( err, activities );
                    } );
                }
            }

            if( !query && !data.activities ) {
                return callback( null, [] );
            }

            if( data.activities ) {
                actCallback( null, data.activities );
            } else {
                Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'mirroractivity',
                        action: 'get',
                        query: query,  // for now accept the query, but in future
                        // allow to use during migration
                        migrate: migrate,
                        // make this a parameter patientId
                        /*{$and:[{start:{ $gt: startdate}}, {start:{ $lt: enddate}}]},*/
                        options: options
                    },
                    actCallback );
            }

        }

        /**
         * determines day separation flag for given activity
         * @method isDaySeparationFlag
         * @param {Object} activity
         * @return {boolean}
         * @private
         */
        function isDaySeparationFlag( activity ) {
            return Boolean( activity.daySeparation );
        }

        /**
         * determines new day flag for given activities
         * @method setNewDayFlag
         * @param {Array} activities
         * @return {boolean} an activity got flag
         * @private
         */
        function setNewDayFlag( activities ) {
            var
                lastDay,
                otherArray = [].concat( activities ),
                result = false;

            // sort ascending
            otherArray.sort( function( a, b ) {
                var timestampDiff = a.timestamp - b.timestamp;

                if( 0 === timestampDiff ) {
                    timestampDiff = activities.indexOf( a ) > activities.indexOf( b ) ? -1 : 1;
                }

                return timestampDiff;
            } );

            otherArray.forEach( function( activity ) {
                var
                    timestamp = activity.timestamp,
                    day = timestamp && timestamp.toDateString();
                // MOJ-4450 before that validation allowed undefined timestamp
                // only occurred in mvprc rest interface because the UI always has a timestamp
                if( !day ) {
                    return;
                }
                if( lastDay && day !== lastDay ) {
                    activity._attributes.push( ATTRIBUTES.NEW_DAY_FLAG );
                    result = true;
                }

                lastDay = day;

            } );

            return result;

        }

        /**
         * determines quarter change flag for given activities
         * @method setQuarterChangeFlag
         * @param {Array} activities
         * @return {boolean} an activity got flag
         * @private
         */
        function setQuarterChangeFlag( activities ) {
            var
                lastQuarter,
                otherArray = [].concat( activities ),
                result = false;

            // sort ascending
            otherArray.sort( function( a, b ) {
                var timestampDiff = a.timestamp - b.timestamp;

                if( 0 === timestampDiff ) {
                    timestampDiff = activities.indexOf( a ) > activities.indexOf( b ) ? -1 : 1;
                }

                return timestampDiff;
            } );

            otherArray.forEach( function( activity ) {
                var
                    timestamp = moment( activity.timestamp ),
                    quarter = timestamp.quarter();

                if( lastQuarter && quarter !== lastQuarter ) {
                    activity._attributes.push( ATTRIBUTES.QUARTER_CHANGE_FLAG );
                    result = true;
                }

                lastQuarter = quarter;

            } );

            return result;

        }

        /**
         * Returns all Activities with populated data(activities,patient,employee)
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        function getCaseFile( args ) {
            var
                options = args.options || {},
                async = require( 'async' ),
                items;

            if( args.query ) {

                // there are other properties that can also filter "timestamp"
                if( args.query.$or && Array.isArray( args.query.$or ) ) {
                    // rename "quarterColumn" property to "timestamp"
                    args.query.$or.forEach( function( or ) {
                        if( or.quarterColumn ) {
                            or.timestamp = or.quarterColumn;
                            delete or.quarterColumn;
                        }
                    } );
                    // also apply original "timestamp" to "$or"
                    if( args.query.timestamp ) {
                        args.query.$or.push( {timestamp: args.query.timestamp} );
                        delete args.query.timestamp;
                    }
                }

            }

            async.parallel( [
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'mirroractivity',
                        action: 'count',
                        query: args.query
                    }, done );
                },
                function( done ) {
                    getActivitiesPopulated( {
                        user: args.user,
                        query: args.query,
                        options: {
                            limit: options.limit,
                            skip: options.skip,
                            sort: options.sort,
                            objPopulate: true,
                            withoutActivities: false,
                            withoutAttachments: false
                        },
                        callback: done
                    } );

                }
            ], function( err, results ) {
                if( err ) {
                    return args.callback( err );
                }

                items = results[1].map( function( record ) {
                    return record.toObject ? record.toObject() : record;
                } );

                items.forEach( function( activity ) {

                    // set up "_attributes" which is to flag an activity of some kind
                    activity._attributes = [];

                    // set simple attribute flags:

                    if( isDaySeparationFlag( activity ) ) {
                        activity._attributes.push( ATTRIBUTES.DAY_SEPARATION_FLAG );
                    }

                } );

                // set attribute flag for new day:
                setNewDayFlag( items );

                // set attribute flag for quarter change:
                setQuarterChangeFlag( items );

                // add location name
                async.each( items, function( item, callback ) {
                    if( item.locationId && !item.locationName ) {

                        item.locationName = '';

                        Y.doccirrus.mongodb.runDb(
                            {
                                action: 'get',
                                model: 'mirrorlocation',
                                user: args.user,
                                query: {_id: item.locationId},
                                options: {}
                            }, function( err, locations ) {
                                if( !err && locations.length ) {
                                    item.locationName = locations[0].locname;
                                }
                                callback();
                            } );

                    } else {
                        return callback();
                    }
                }, function( err ) {

                    items.count = results[0];

                    args.callback( err, items );

                } );

            } );
        }

        /**
         * Gets Activity for front-end(activity model)
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getActivityForFrontend( args ) {
            var
                user = args.user,
                query = args.query,
            //options = args.options, //has paging flag which transform get output
                callback = args.callback,
                async = require( 'async' ),
                finalResult = {
                    activity: null,
                    additionalActivityData: {
                        caseFolder: null,
                        lastSchein: null
                    },
                    populatedObj: {}
                };

            function removeUser( obj ) {
                if( obj ) {
                    delete obj.user_;
                }
            }

            async.waterfall( [
                function( next ) {
                    let
                        options = {
                            lean: true
                        };
                    Y.doccirrus.api.mirroractivity.get( {
                        user: user,
                        query: query,
                        options: options,
                        callback: function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                return next( Y.doccirrus.errors.rest( 400, 'activity not found', true ) );
                            }
                            finalResult.activity = results && results[0];
                            removeUser( finalResult.activity );
                            next( err, results && results[0] );
                        }
                    } );
                },
                function( activity, next ) {
                    /**
                     * Add caseFolder data
                     */
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'mirrorcasefolder',
                        action: 'get',
                        query: {
                            _id: activity.caseFolderId
                        },
                        options: {
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            return next( Y.doccirrus.errors.rest( 400, 'case folder not found', true ) );
                        }
                        finalResult.additionalActivityData.caseFolder = results && results[0];
                        removeUser( finalResult.additionalActivityData.caseFolder );
                        next( err, activity );
                    } );
                },
                function( activity, next ) {
                    getActivitiesPopulated( {
                        user: user,
                        options: {
                            hide: ['patient'],
                            withoutAttachments: false,
                            objPopulate: true
                        },
                        data: {
                            activities: [Object.assign( {}, activity )]
                        },
                        callback: function( err, activities ) {
                            if( err ) {
                                return next( err );
                            }
                            if( !activities.length ) {
                                return next( Y.doccirrus.errors.rest( 400, 'activity not found', true ) );
                            }
                            // set all populated arrays
                            finalResult.populatedObj.icdsObj = activities[0]._icdsObj || [];
                            finalResult.populatedObj.icdsExtraObj = activities[0]._icdsExtraObj || [];
                            finalResult.populatedObj.activitiesObj = activities[0]._activitiesObj || [];
                            finalResult.populatedObj.continuousIcdsObj = activities[0]._continuousIcdsObj || [];
                            finalResult.populatedObj.attachmentsObj = activities[0]._attachmentsObj || [];

                            next( err, activity );
                        }
                    } );
                },
                function( activity, next ) {
                    switch( activity.actType ) {
                        case 'TREATMENT':
                            if( !activity.billingFactorType ) {
                                activity.billingFactorType = Y.doccirrus.schemas.person.types.BillingFactor_E.list[0].val;
                            }
                            if( !activity.fk5042Set || !activity.fk5042Set.length ) {
                                activity.fk5042Set = [{}];
                            }
                            if( !activity.fk5020Set || !activity.fk5020Set.length ) {
                                activity.fk5020Set = [{}];
                            }
                            doTreatmentPipeline( {
                                user: user,
                                query: {
                                    patientId: activity.patientId
                                }
                            }, function( err, treatmentData ) {
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, treatmentData );
                                next( err, activity );
                            } );
                            break;
                        case 'REFERRAL':
                            Y.doccirrus.api.patient.lastSchein( {
                                user: user,
                                query: activity,
                                callback: function( err, result ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    finalResult.additionalActivityData.lastSchein = result && result[0];
                                    next( err, activity );
                                }
                            } );
                            break;
                        case 'SCHEIN':
                        case 'BGSCHEIN':
                        case 'PKVSCHEIN':
                            doScheinPipeline( {
                                user: user,
                                query: {
                                    patientId: activity.patientId,
                                    locationId: activity.locationId,
                                    timestamp: activity.timestamp,
                                    caseFolderId: activity.caseFolderId,
                                    excludeActivities: [activity._id && activity._id.toString()]
                                }
                            }, function( err, scheinData ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, scheinData );
                                next( err, activity );
                            } );
                            break;
                        default:
                            setImmediate( next, null, activity );
                    }
                }
            ], function( err ) {
                callback( err, finalResult );
            } );
        }

        /**
         * Executes treatment pipeline
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} [args.query.timestamp] only if relevantDiagnoses is set to true
         * @param {String} [args.query.caseFolderId] only if relevantDiagnoses is set to true
         * @param {Object} [args.options]
         * @param {Boolean} [args.options.relevantDiagnoses] include relevantDiagnoses
         * @param {Function} callback
         */
        function doTreatmentPipeline( args, callback ) {
            var
                user = args.user,
                query = args.query || {},
                timestamp = query.timestamp,
                caseFolderId = query.caseFolderId,
                patientId = query.patientId,
                options = args.options || {},
                finalResult = {
                    fk5008Notes: null,
                    relatedDiagnoses: null
                },
                async = require( 'async' );

            function getFk5008Notes( callback ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'mirrorpatient',
                            action: 'get',
                            query: {
                                _id: patientId
                            },
                            options: {
                                lean: true,
                                limit: 1
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                Y.log( 'doTreatmentPipeline.getFk5008Notes Patient not found, _id: ' + patientId, 'error', NAME );
                                return next( Y.doccirrus.errors.rest( 400, 'patient not found', true ) );
                            }
                            next( err, results && results[0] );
                        } );
                    },
                    function( patient, next ) {
                        let
                            insurance = patient.insuranceStatus && patient.insuranceStatus.find( status => 'PUBLIC' === status.type );
                        if( insurance ) {
                            Y.doccirrus.api.kbv.dkm( {
                                user: user,
                                originalParams: {
                                    patientId: patient._id && patient._id.toString(),
                                    locationId: insurance.locationId,
                                    costCarrierBillingSection: insurance.costCarrierBillingSection,
                                    costCarrierBillingGroup: insurance.costCarrierBillingGroup
                                },
                                callback: next
                            } );
                        } else {
                            setImmediate( next, null, null );
                        }
                    }
                ], callback );
            }

            async.parallel( [
                function( done ) {
                    getFk5008Notes( function( err, result ) {
                        if( err ) {
                            return done( err );
                        }
                        if( result && result[0] ) {
                            finalResult.fk5008Notes = [result[0].kvValue];
                        }
                        done();
                    } );
                },
                function( done ) {
                    if( options.relevantDiagnoses ) {
                        Y.doccirrus.api.patient.relevantDiagnosesForTreatment( {
                            user: user,
                            query: {
                                timestamp: timestamp,
                                patientId: patientId,
                                caseFolderId: caseFolderId
                            },
                            callback: function( err, result ) {
                                if( err ) {
                                    return done( err );
                                }
                                finalResult.relatedDiagnoses = result;
                                done();
                            }
                        } );
                    } else {
                        setImmediate( done );
                    }

                }
            ], function( err ) {
                callback( err, finalResult );
            } );

        }

        /**
         * Executes schein pipeline (needed only for new activity)
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.options]
         * @param {Boolean} args.options.continuousDiagnosis
         * @param {Boolean} args.options.openScheinBL
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} args.query.timestamp
         * @param {String} args.query.locationId
         * @param {String} args.query.caseFolderId
         * @param {Array} [args.query.excludeActivities] array of schein ids.
         * @param {Function} callback
         */
        function doScheinPipeline( args, callback ) {
            var
                user = args.user,
                query = args.query || {},
                options = args.options || {},
                patientId = query.patientId,
                timestamp = query.timestamp,
                locationId = query.locationId,
                caseFolderId = query.caseFolderId,
                excludeActivities = query.excludeActivities,
                finalResult = {
                    continuousIcdsObj: null,
                    openScheinBl: null,
                    caseFolderBl: null
                },
                async = require( 'async' );

            function _getContinuousDiagnosis( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'invoiceconfiguration',
                    options: {
                        lean: true
                    }
                }, function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( result[0] && result[0].kbvFocusFunctionalityContinuousDiagnosis ) {
                        Y.doccirrus.api.activity.getContinuousDiagnosis( {
                            user: user,
                            query: {
                                to: timestamp,
                                patientId: patientId,
                                timestamp,
                                locationId
                            },
                            callback: function( err, result ) {
                                if( err ) {
                                    return callback( err );
                                }
                                finalResult.continuousIcdsObj = result || [];
                                callback();
                            }

                        } );
                    } else {
                        finalResult.continuousIcdsObj = [];
                        return callback();
                    }
                } );
            }

            async.parallel( [
                function( done ) {
                    if( options.continuousDiagnosis ) {
                        _getContinuousDiagnosis( done );
                    } else {
                        setImmediate( done, null );
                    }
                },
                function( done ) {
                    if( options.openScheinBL ) {
                        Y.doccirrus.api.activity.getOpenScheinBL( {
                            user: user,
                            query: {
                                timestamp: timestamp,
                                locationId: locationId,
                                patientId: patientId,
                                caseFolderId: caseFolderId
                            },
                            callback: function( err, result ) {
                                if( err ) {
                                    return done( err );
                                }
                                finalResult.openScheinBl = result[0];
                                done();
                            }
                        } );
                    } else {
                        setImmediate( done, null );
                    }

                },
                function( done ) {
                    Y.doccirrus.api.activity.getCaseFolderBl( {
                        user: user,
                        query: {
                            patientId: patientId,
                            caseFolderId: caseFolderId,
                            excludeActivities: excludeActivities
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.caseFolderBl = result;
                            done();
                        }
                    } );
                }
            ], function( err ) {
                callback( err, finalResult );
            } );
        }

        function getCaseFileLight( args ) {
            var
                async = require( 'async' ),
                options = args.options || {},
                items,
                count;



            //  1. Add any additional constraints to the query
            function checkQuery( itcb ) {
                if( args.query ) {

                    // there are other properties that can also filter "timestamp"
                    if( args.query.$or && Array.isArray( args.query.$or ) ) {
                        // rename "quarterColumn" property to "timestamp"
                        args.query.$or.forEach( function( or ) {
                            if( or.quarterColumn ) {
                                or.timestamp = or.quarterColumn;
                                delete or.quarterColumn;
                            }
                        } );
                        // also apply original "timestamp" to "$or"
                        if( args.query.timestamp ) {
                            args.query.$or.push( {timestamp: args.query.timestamp} );
                            delete args.query.timestamp;
                        }
                    }

                }
                itcb( null );
            }

            //  2. Request a page of activities from the database
            function getActivitiesPage( itcb ) {
                function onRawActivitiesLoaded( err, result) {
                    if ( err ) { return itcb( err ); }
                    items = result.result ? result.result : result;
                    itcb( null );
                }

                args.options.lean = true;

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'mirroractivity',
                    action: 'get',
                    query: args.query,
                    options: args.options,
                    callback: onRawActivitiesLoaded
                } );
            }

            //  3. Count total matching activities in CaseFile (if necessary)
            function getTotalCount( itcb ) {
                //  no need to count total rows if we're on the last page
                if( options.limit && options.skip && options.limit > items.length ) {
                    count = items.length + options.skip;
                    return itcb( null );
                }

                function onCountComplete( err, result ) {
                    count = result;
                    itcb( err, result );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'mirroractivity',
                    action: 'count',
                    query: args.query
                }, onCountComplete );
            }

            //  4. Add additional attributes to the activities
            function expandResults( itcb ) {

                items.forEach( function( activity ) {

                    activity = activity.toObject ? activity.toObject() : activity;

                    //  location name is filled by client
                    activity.locationId = activity.locationId ? activity.locationId : '000000000000000000000001';
                    activity.locationName = activity.locationName ? activity.locationName : 'PLACEHOLDER';

                    // set up "_attributes" which is to flag an activity of some kind
                    activity._attributes = [];

                    // set simple attribute flags:
                    if( isDaySeparationFlag( activity ) ) {
                        activity._attributes.push( ATTRIBUTES.DAY_SEPARATION_FLAG );
                    }

                } );

                // set attribute flag for new day:
                setNewDayFlag( items );

                // set attribute flag for quarter change:
                setQuarterChangeFlag( items );

                // convert points to Euros
                translatePrices( items, itcb );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error loading page of CaseFile: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                if (  options.paging ) {
                    items.count = count;
                }

                args.callback( err, items );
            }

            async.series( [ checkQuery, getActivitiesPage, getTotalCount, expandResults ], onAllDone );
        }

        //copy from activity-proccess, reason to not interfer with activity collection if original implementation will change
        function deleteAttachments( user, activity, callback ) {
            Y.log( 'entering deleteAttachments for mirroractivity', 'debug', NAME );

            // finally delete all media that belong to the activity
            function deleteMedia( err ) {
                if( err ) {
                    Y.log( `problem in deleting documents: ${  err}`, 'error', NAME );
                    callback( err );
                    return;
                }
                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    action: 'delete',
                    model: 'media',
                    user: user,
                    query: { ownerId: activity._id },
                    callback: callback
                } );
            }

            //  delete a single document
            function forHangingDocument( doc, _cb ) {
                Y.log( `Deleting hanging document: ${  doc._id}`, 'info', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    action: 'delete',
                    model: 'document',
                    user: user,
                    query: { '_id': doc._id },
                    callback: _cb
                } );
            }

            //  delete every remaining document in the database linked to this activity._id
            function deleteHangingDocuments( err, result ) {
                if( err ) {
                    Y.log( `Error querying documents:${  JSON.stringify( err )}`, 'error', NAME );
                    callback( err );
                    return;
                }
                result = (result) ? result : [];
                require( 'async' ).each( result, forHangingDocument, deleteMedia );
            }

            //  get any attachments belonging to this activity which may have become unlinked
            function getHangingDocuments( err ) {
                if( err ) {
                    Y.log( 'error in deleting attachments', 'error', NAME );
                    callback( err );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    'action': 'get',
                    'model': 'document',
                    'user': user,
                    'query': { 'activityId': activity._id.toString() },
                    'callback': deleteHangingDocuments
                } );
            }

            // delete every file related to this media
            function forMedia( media, _cb ) {
                Y.doccirrus.media.cacheRemove( media, _cb );
            }

            function deleteFiles( err, result ) {
                if( err ) {
                    Y.log( `Error querying media collection: ${  err}`, 'error', NAME );
                    callback( err );
                    return;
                }
                result = (result) ? result : [];
                require( 'async' ).each( result, forMedia, getHangingDocuments );
            }

            // get all media that belong to the activity
            function getMediaList( err ) {
                if( err ) {
                    Y.log( 'error in deleting attachments', 'error', NAME );
                    callback( err );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    'action': 'get',
                    'model': 'media',
                    'user': user,
                    'query': { 'ownerId': activity._id.toString() },
                    'callback': deleteFiles
                } );
            }

            //  delete all attachments linked by the activity
            function forAttachment( docId, _cb ) {

                if( null === docId ) {
                    callback( null, [] );
                    return;
                }

                if( 'string' !== typeof docId && docId._id ) {
                    docId = docId._id;
                }

                //  sometimes caused by a noew-resolved knockout error, checking in case of legacy data
                if( '[object object]' === docId.toLowerCase() ) {
                    callback( null, [] );
                    return;
                }

                Y.log( `Deleting document: ${  docId}`, 'info', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    action: 'delete',
                    model: 'document',
                    user: user,
                    query: { _id: docId },
                    callback: _cb
                } );
            }

            var attachments = activity.attachments || [];

            require( 'async' ).each( attachments, forAttachment, getMediaList );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class mirroractivity
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).mirroractivity = {

            name: NAME,

            getCaseFile: function( args ) {
                Y.log('Entering Y.doccirrus.api.mirroractivity.getCaseFile', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirroractivity.getCaseFile');
                }
                getCaseFile( args );
            },
            getActivityForFrontend: function( args ) {
                Y.log('Entering Y.doccirrus.api.mirroractivity.getActivityForFrontend', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirroractivity.getActivityForFrontend');
                }
                getActivityForFrontend( args );
            },
            getCaseFileLight: function( args ) {
                Y.log('Entering Y.doccirrus.api.mirroractivity.getCaseFileLight', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirroractivity.getCaseFileLight');
                }
                getCaseFileLight( args );
            },
            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.mirroractivity.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirroractivity.get');
                }
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'mirroractivity',
                    user: args.user,
                    query: args.query,
                    options: args.options
                }, args.callback );
            },
            getActivitiesPopulated: getActivitiesPopulated,
            deleteAttachments: deleteAttachments
        };

    },
    '0.0.1', {
        requires: [
            'activity-schema', 'activity-api', 'dcerror', 'dccommunication', 'activityapi', 'dccommunication', 'dcerrortable', 'person-schema',
            'mirrorpatient-schema']
    }
);
