/*global YUI */

YUI.add( 'activity-api', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            async = require( 'async' ),
            util = require( 'util' ),
            _ = require( 'lodash' ),
            https = require( 'https' ),
            path = require( 'path' ),
            fs = require( 'fs' ),
            join = require( 'path' ).join,
            documedisConfig = require( 'dc-core' ).config.load( `${process.cwd()}/documedis.json` ),

            {formatPromiseResult, handleResult, promisifyArgsCallback, promisifiedCallback} = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            ATTRIBUTES = Y.doccirrus.schemas.activity.ATTRIBUTES,
            i18n = Y.doccirrus.i18n,
            documedisIdTypeToPropertyMap = {
                1: null,
                2: "code",
                3: "phPZN",
                4: 'prdNo',
                'catalog': 'prdNo'//Use 'prdNo' to allow export medications created via catalog
            },

            // class linkers, will become ES6 imports later on
            ActiveIngredientForIngredientPlanSchema = Y.doccirrus.schemas.v_ingredientplan.ActiveIngredientForIngredientPlanSchema,
            IngredientPlan = Y.doccirrus.api.ingredientplan.IngredientPlan;

        function checkCatalogCode( args ) {

            var defaultEBM = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM'
                } ),
                catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptors( {
                    actType: 'TREATMENT',
                    filename: args.query.catalog
                } ),
                catalogShort = catalogDescriptor && catalogDescriptor.TREATMENT && catalogDescriptor.TREATMENT.cat && catalogDescriptor.TREATMENT.cat[0].short;

            function check() {
                var queryParams = args.query,
                    async = require( 'async' );
                async.parallel( [
                    function( done ) {
                        var superUser = Y.doccirrus.auth.getSUForLocal();
                        Y.doccirrus.mongodb.runDb( {
                            user: superUser,
                            model: 'catalog',
                            action: 'get',
                            query: {
                                $and: [
                                    {seq: queryParams.seq},
                                    {catalog: queryParams.catalog}
                                ]
                            }
                        }, done );
                    },
                    function( done ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'catalogusage',
                            action: 'get',
                            query: Y.doccirrus.api.catalogusage.getQueryForActivity( {
                                code: queryParams.seq,
                                catalogShort: catalogShort,
                                locationId: args.query.locationId
                            } )
                        }, done );
                    }
                ], function( err, results ) {
                    if( err ) {
                        return args.callback( err );
                    }
                    args.callback( err, {
                        catalogEntry: (results[0].length > 0),
                        customEntry: (results[1].length > 0),
                        original: results[0]
                    } );

                } );
            }

            if( defaultEBM.filename === args.query.catalog && args.query.locationId ) {
                Y.doccirrus.api.catalog.getEBMDescriptorByLocationId( {
                    user: args.user,
                    originalParams: {
                        locationId: args.query.locationId
                    },
                    callback: function( err, desc ) {
                        if( err ) {
                            Y.log( 'Error getting kv from locationId for EBM(851)' );
                            args.callback( err );
                            return;
                        }
                        args.query.catalog = desc.filename;
                        check();
                    }
                } );

            } else {
                check();
            }

        }

        //function getContentTopByActType( args ) {
        //    var async = require( 'async' ),
        //        queryParams = args.query || {};
        //    queryParams.limitTop = parseInt( queryParams.limitTop, 10 ) || 5;
        //    async.waterfall( [
        //        function( done ) {
        //            Y.doccirrus.mongodb.getModel( args.user, 'activity', done );
        //        },
        //        function( activivtyModel, done ) {
        //            activivtyModel.mongoose.aggregate( [
        //                {
        //                    $match: {
        //                        $and: [
        //                            {
        //                                content: {
        //                                    $exists: true
        //                                }
        //                            },
        //                            {
        //                                content: {
        //                                    $ne: ""
        //                                }
        //                            },
        //                            {
        //                                actType: queryParams.actType
        //                            }
        //                        ]
        //                    }
        //                },
        //                {
        //                    $group: {
        //                        _id: "$content",
        //                        count: {
        //                            $sum: 1
        //                        }
        //                    }
        //                },
        //                {
        //                    $sort: {
        //                        count: -1
        //                    }
        //                },
        //                {
        //                    $limit: queryParams.limitTop
        //                },
        //                {
        //                    $project: {
        //                        _id: 0,
        //                        content: '$_id',
        //                        count: 1
        //                    }
        //                }
        //            ], done );
        //        }
        //    ], args.callback );
        //}

        /**
         * Recommends valid prescription types for medication activity ids.
         * Recommendations are made each medication and for all together.
         *
         * Result will look like this:
         * {Object} data.recommendations Array of valid prescription types for all specified medications.
         * {Boolean} data.advice Indicates that results contain advice(s). Does not matter if a recommended type was found.
         * {Boolean} data.rejected Indicates that no recommended types for all medications were found.
         * {Array} data.results Contains all medication and their recommended types.
         * {String} data.results._id MedicationActivity Id
         * {Array} data.results.recommendations Contains recommendations for this medication.
         * {String} data.result.recommendations.name Name of the recommendation.
         * {Array} data.result.recommendations.prescriptions Array of recommended prescription types.
         *
         * @method getPrescriptionTypes
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Array} args.query.medications Array of MedicationActivity Ids
         * @param {Function} args.callback
         * @for doccirrus.api.activity
         */
        function getPrescriptionTypes( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getPrescriptionTypes', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getPrescriptionTypes' );
            }
            var user = args.user,
                params = args.query,
                insuranceType,
                callback = args.callback;

            function medicationsCb( err, medications ) {
                if( err ) {
                    Y.log( 'error getting medications ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                if( !medications || !medications.length ) {
                    Y.log( 'no medications found ', 'debug', NAME );
                    callback( null );
                    return;
                }

                callback( null, Y.doccirrus.schemas.v_medication.getPrescriptionRecommendation( {
                    medications,
                    insuranceType,
                    patientAge: params.patientAge
                } ) );
            }

            if( !params || !Array.isArray( params.medications ) || !params.insuranceType ) {
                Y.log( 'getPrescriptionTypes: missing params', 'error', NAME );
                callback( new Error( 'getPrescriptionTypes: missing params' ) );
                return;
            }

            if( !params.medications.length ) {
                Y.log( 'getPrescriptionTypes: no medication ids passed - return early', 'debug', NAME );
                callback( null );
                return;
            }

            insuranceType = params.insuranceType;

            Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                query: {
                    _id: {
                        $in: params.medications
                    },
                    actType: 'MEDICATION'
                },
                callback: medicationsCb
            } );

        }

        /**
         *  Calls back with count of activities(with status != CANCELLED)
         *  specified by 'code','patientId', 'actType' in specified range of time
         *
         *  @method countInRange
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {String}    args.query.timestampFrom    timestamp of start point to search
         *  @param  {String}    args.query.timestampTo      timestamp of end point to search
         *  @param  {String}    args.query.patientId        patient ID of activity
         *  @param  {String}    [args.query.actType]        activity type
         *  @param  {String}    args.query.code             code(seq) of activity
         *  @param  {Function}  args.callback               of the form fn( err, countOfActivities )
         */
        function countInRange( args ) {
            var queryParams = args.query || {},
                timestampQuery = {};
            if( queryParams.timestampFrom ) {
                timestampQuery.$gte = new Date( queryParams.timestampFrom );
            }
            if( queryParams.timestampTo ) {
                timestampQuery.$lt = new Date( queryParams.timestampTo );
            }
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activity',
                action: 'count',
                query: {
                    actType: queryParams.actType,
                    code: queryParams.code,
                    timestamp: timestampQuery,
                    patientId: queryParams.patientId,
                    status: {$ne: 'CANCELLED'},
                    caseFolderId: queryParams.caseFolderId
                }
            }, function( err, result ) {
                if( err ) {
                    return args.callback( err );
                }
                args.callback( err, [result] );
            } );
        }

        /**
         *  Loads a parent activity if not cancelled and calls back with it
         *
         *  TODO: check usage of this against linkedactivity-api
         *
         *  @method getParent
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {Object}    args.query.parentId     id of parent
         *  @param  {Object}    args.query.timestamp    timestamp of current child
         *  @param  {Object}    args.query.actType      actType of current child
         *  @param  {Function}  args.callback           of the form fn( err, [ parentActivity ] || [] )
         */
        function getParent( args ) {
            var queryParams = args.query || {};
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activity',
                action: 'get',
                query: {
                    _id: queryParams.parentId,
                    timestamp: {
                        $lt: new Date( queryParams.timestamp )
                    },
                    status: {$ne: 'CANCELLED'},
                    actType: queryParams.actType

                }
            }, args.callback );
        }

        /**
         *  Calls back with last(youngest) children list for specified activity(parent) id.
         *  Child - activity which has parent id in 'activities' field and parent.timestamp < child.timestamp.
         *
         *  NOTE: linedactivities-api has alternet mathods for loading all children including fields besides activities
         *  (receipts, icds, icdsExtra, invoiceId, etc)
         *
         *  TODO: check useage of this against linkedactivity-api
         *
         *  @method getChildren
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {String}    [args.query.actType]        children activity type
         *  @param  {String}    args.query.patientId        patient id of children
         *  @param  {String}    args.query.parentId         parent id
         *  @param  {String}    [args.query.$or]            $or query condition
         *  @param  {String}    [args.query.$and]           $and query condition
         *  @param  {String}    args.query.timestampFrom    timestamp of start point to search children (*1)
         *  @param  {String}    [args.query.timestampTo]    timestamp of end point to search children (ISO string)
         *  @param  {Object}    [args.options]              options for db request
         *  @param  {Function}  args.callback               of the form fn( err, [ childActivity, ... ] )
         *  @returns {*}
         *
         *  *1: if not provided could return all related (ISO string)
         */
        function getChildren( args ) {
            var queryParams = args.query || {},
                options = args.options,
                query;
            if( !queryParams.parentId ) {
                Y.log( 'no activity id passed', 'error', NAME );
                return args.callback( Y.doccirrus.errors.rest( 500, 'no activity id passed', true ) );
            }
            query = {
                _id: {$ne: queryParams.parentId},
                actType: queryParams.actType,
                patientId: queryParams.patientId,
                activities: queryParams.parentId,
                status: {$ne: 'CANCELLED'},
                $or: queryParams.$or,
                $and: queryParams.$and
            };
            if( queryParams.timestampFrom || queryParams.timestampTo ) {
                query.timestamp = {};
                if( queryParams.timestampFrom ) {
                    query.timestamp.$gte = new Date( queryParams.timestampFrom );
                }
                if( queryParams.timestampTo ) {
                    query.timestamp.$lt = new Date( queryParams.timestampTo );
                }
            }
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activity',
                action: 'get',
                query: query,
                options: options
            }, args.callback );
        }

        /**
         *  Recalculates amount of BL (specified by code, patientId) for 'Schein' (in specific timerange (till Current Quarter)).
         *
         *  Specified timestamp defines end point
         *  Specific timerange:
         *
         *      if current 'Schein' is not a parent(main) than
         *          start point equals beginning of the parent 'Schein' quarter,
         *          end point equals end of current 'Schein' quarter
         *
         *      if current 'Schein' is a parent, start and end point are taken from its quarter.
         *
         *  @method countBLFrom
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {String}    args.query.code
         *  @param  {String}    args.query.timestamp        timestamp of current 'Schein'(ISO String)
         *  @param  {String}    [args.query.endPoint]       end point (ISO String)
         *  @param  {String}    [args.query._id]            id of current 'Schein'
         *  @param  {String}    args.query.patientId
         *  @param  {String}    args.query.caseFolderId     case folder id
         *  @param  {Array}     args.query.activities       an array of related 'Schein'(parent) ids for current 'Schein'
         *  @param  {String}    [args.query.scheinType]     actType of current Schein
         *  @param  {Function}  args.callback               of the form fn( err, countActivities )
         */
        function countBLFrom( args ) {
            var
                user = args.user,
                queryParams = args.query || {},
                async = require( 'async' ),
                scheinId = queryParams._id,
                startPoint = queryParams.timestamp,
                endPoint = queryParams.endPoint;

            function getStartEndPoint( activities, callback ) {
                async.waterfall( [
                    function( next ) {
                        if( activities && 1 === activities.length ) {
                            getParent( {
                                user: user,
                                query: {
                                    parentId: activities[0],
                                    timestamp: queryParams.timestamp,
                                    actType: queryParams.scheinType
                                },
                                callback: function( err, results ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    if( results && 0 < results.length ) {
                                        startPoint = results[0].timestamp;
                                        scheinId = results[0]._id.toString();
                                    }
                                    next( null, scheinId, startPoint );

                                }
                            } );
                        } else {
                            return next( null, scheinId, startPoint );
                        }
                    },
                    function( parentId, startPoint, next ) {
                        let
                            _query;
                        if( endPoint ) {
                            return next( null, startPoint, endPoint );
                        }
                        if( !parentId ) {
                            return next( null, startPoint, null );
                        }
                        _query = {
                            timestamp: {
                                $gt: new Date( queryParams.timestamp )
                            },
                            patientId: queryParams.patientId,
                            caseFolderId: queryParams.caseFolderId,
                            $or: [
                                {'fk4235Set.fk4244Set.fk4244': queryParams.code},
                                {'fk4235Set.fk4256Set.fk4244': queryParams.code}
                            ]
                        };
                        if( queryParams._id ) {
                            _query._id = {$ne: queryParams._id};
                        }
                        Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: _query,
                                options: {
                                    limit: 1,
                                    sort: {
                                        timestamp: 1
                                    },
                                    lean: true,
                                    select: {
                                        timestamp: 1
                                    }
                                }
                            }, function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( results && results.length ) {
                                    endPoint = results[0].timestamp;
                                }
                                next( err, startPoint, endPoint );
                            }
                        );
                    }
                ], callback );
            }

            function getAmount( config, callback ) {
                countInRange( {
                    user: config.user,
                    query: {
                        code: config.code,
                        timestampFrom: config.startPoint,
                        timestampTo: config.endPoint,
                        patientId: config.patientId,
                        caseFolderId: config.caseFolderId
                    },
                    callback: callback
                } );

            }

            async.waterfall( [
                function( next ) {
                    getStartEndPoint( queryParams.activities, next );
                },
                function( _startPoint, _endPoint, next ) {
                    getAmount( {
                        user: args.user,
                        code: queryParams.code,
                        startPoint: _startPoint,
                        endPoint: _endPoint,
                        patientId: queryParams.patientId,
                        caseFolderId: queryParams.caseFolderId
                    }, next );
                }
            ], function( err, result ) {
                args.callback( err, result );
            } );
        }

        /**
         * returns open Schein - the Schein where counter of Bewilligte Leistung still is not exceeded
         * @method getOpenSchein
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.actType activity type of Schein
         * @param {String} args.query.locationId location id
         * @param {String} args.query.patientId patient Id
         * @param {String} args.query.caseFolderId case folder Id
         * @param {String} args.query.timestamp timestamp of current Schein
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        function getOpenSchein( args ) {
            const
                {query: queryParams = {}} = args,
                async = require( 'async' ),
                openedStatuses = ['VALID', 'APPROVED'];
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                actType: queryParams.actType,
                                patientId: queryParams.patientId,
                                locationId: queryParams.locationId,
                                timestamp: {
                                    $lt: new Date( queryParams.timestamp )
                                },
                                status: {$in: openedStatuses},
                                caseFolderId: queryParams.caseFolderId,
                                fk4235Set: {
                                    $exists: true,
                                    $not: {$size: 0}
                                }
                            },
                            options: {
                                sort: {timestamp: -1},
                                limit: 1,
                                lean: true
                            }
                        }, next );
                    },
                    function( activities, next ) {
                        var schein = activities[0],
                            result = false;
                        if( schein ) {
                            if( schein.fk4235Set ) {
                                result = schein.fk4235Set.some( function( item ) {

                                    const sumTreatments = ( sum, entry ) => sum + Number( entry.fk4246 || 0 );
                                    const maxTreatmentsOfInsuredPerson = item.fk4252;
                                    const maxTreatmentsOfCareGiver = item.fk4255;
                                    const sumTreatmentsOfInsuredPerson = (item.fk4244Set || []).reduce( sumTreatments, 0 );
                                    const sumTreatmentsOfCareGiver = (item.fk4256Set || []).reduce( sumTreatments, 0 );

                                    return (!maxTreatmentsOfInsuredPerson || sumTreatmentsOfInsuredPerson < maxTreatmentsOfInsuredPerson) ||
                                           (!maxTreatmentsOfCareGiver || maxTreatmentsOfCareGiver < sumTreatmentsOfCareGiver);
                                } );
                            }
                            if( result ) {
                                return next( null, activities.slice( 0, 1 ) );
                            }
                            return next( null, null );
                        } else {
                            return next( null, null );
                        }
                    }

                ],
                args.callback
            );
        }

        /**
         * returns LAST opened BL Schein if it has status "BILLED"
         * @method getOpenSchein
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} [args.query.actType] activity type of Schein
         * @param {String} args.query.locationId location id
         * @param {String} args.query.patientId patient Id
         * @param {String} args.query.caseFolderId case folder Id
         * @param {String} args.query.timestamp timestamp of current Schein
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        function getOpenBilledSchein( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getOpenBilledSchein', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getOpenBilledSchein' );
            }
            const
                {query: queryParams = {}, callback} = args,
                async = require( 'async' ),
                invalidStatuses = ['CANCELLED'];
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                actType: queryParams.actType,
                                patientId: queryParams.patientId,
                                locationId: queryParams.locationId,
                                timestamp: {
                                    $lt: new Date( queryParams.timestamp )
                                },
                                status: {$nin: invalidStatuses},
                                caseFolderId: queryParams.caseFolderId,
                                fk4235Set: {
                                    $exists: true,
                                    $not: {$size: 0}
                                }
                            },
                            options: {
                                sort: {timestamp: -1},
                                limit: 1,
                                lean: true
                            }
                        }, next );
                    },
                    function( activities, next ) {
                        let schein = activities[0];
                        let result;
                        if( schein && 'BILLED' === schein.status ) {
                            if( schein.fk4235Set ) {
                                result = schein.fk4235Set.some( function( item ) {
                                    const sumTreatments = ( sum, entry ) => sum + Number( entry.fk4246 || 0 );
                                    const maxTreatmentsOfInsuredPerson = item.fk4252;
                                    const maxTreatmentsOfCareGiver = item.fk4255;
                                    const sumTreatmentsOfInsuredPerson = (item.fk4244Set || []).reduce( sumTreatments, 0 );
                                    const sumTreatmentsOfCareGiver = (item.fk4256Set || []).reduce( sumTreatments, 0 );

                                    return (!maxTreatmentsOfInsuredPerson || sumTreatmentsOfInsuredPerson < maxTreatmentsOfInsuredPerson) ||
                                           (!maxTreatmentsOfCareGiver || sumTreatmentsOfCareGiver < maxTreatmentsOfCareGiver);
                                } );
                            }

                            if( result ) {
                                return next( null, schein );
                            }
                        }
                        return next();
                    }

                ],
                callback
            );
        }

        /**
         * Returns Bewilligte Leisting of opened Schein
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.query.actType] Schein actType
         * @param {String} args.query.timestamp timestamp of current Schein
         * @param {String} args.query.patientId patient id
         * @param {String} args.query.caseFolderId case folder id
         * @param {String} args.query.locationId
         * @param {String} args.query.actType actType of Schein
         * @param {Function} args.callback
         * @see getOpenSchein
         */
        function getOpenScheinBL( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getOpenScheinBL', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getOpenScheinBL' );
            }
            const
                {query: queryParams = {}} = args,
                async = require( 'async' );

            function updateBLCounter( openSchein, item, done ) {
                countBLFrom( {
                    user: args.user,
                    query: {
                        timestamp: openSchein.timestamp,
                        endPoint: queryParams.timestamp,
                        code: item.fk4244,
                        patientId: openSchein.patientId,
                        activities: openSchein.activities,
                        _id: openSchein._id,
                        actType: 'TREATMENT',
                        caseFolderId: openSchein.caseFolderId
                    },
                    callback: function( err, results ) {
                        if( err ) {
                            return done( err );
                        }
                        // MOJ-8549: PRF11/21 allow initial values for fk4246
                        item.fk4246 = item.fk4246Offset ? (+item.fk4246Offset + results[0]) : results[0];
                        done();
                    }
                } );
            }

            async.waterfall( [
                function( next ) {
                    getOpenSchein( {
                        user: args.user,
                        query: {
                            actType: queryParams.actType,
                            patientId: queryParams.patientId,
                            locationId: queryParams.locationId,
                            timestamp: queryParams.timestamp,
                            caseFolderId: queryParams.caseFolderId
                        },
                        callback: next
                    } );

                },
                function( activities, next ) {
                    var openSchein = activities && activities[0];
                    if( openSchein && openSchein.fk4235Set ) {
                        async.eachSeries( openSchein.fk4235Set, ( fk4235, done ) => {
                            if( fk4235.fk4244Set && 0 < fk4235.fk4244Set.length ) {
                                async.each( fk4235.fk4244Set, function( item, done ) {
                                    updateBLCounter( openSchein, item, done );
                                }, err => done( err ) );
                            } else {
                                return done();
                            }
                        }, ( err ) => {
                            let
                                parentId;
                            if( err ) {
                                return next( err );
                            }

                            if( openSchein.activities && 1 === openSchein.activities.length && openSchein._id.toString() !== openSchein.activities[0] ) {
                                parentId = openSchein.activities[0];
                            } else {
                                parentId = openSchein._id.toString();
                            }

                            next( null, [
                                {
                                    parentId,
                                    fk4235Set: openSchein.fk4235Set
                                }] );
                        } );
                    } else {
                        return next( null, [] );
                    }
                }
            ], function( err, results ) {
                args.callback( err, results );
            } );
        }

        /**
         * Get unique diagnosis which means that diagnosis where code, userContent, diagnosisCert,
         * diagnosisTreatmentRelevance, diagnosisSite and diagnosisDerogation are only returned once.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object|undefined} args.options
         * @param {Function} args.callback
         */
        async function getUniqueDiagnosis( args ) {
            const {user, query, options, callback} = args;
            const match = {actType: 'DIAGNOSIS', ...query};

            // Ensure locationId is ObjectId
            if( match.locationId ) {
                match.locationId = ObjectId( match.locationId );
            }

            const pipeline = [
                {
                    $match: match
                },
                options && options.sort ? {$sort: options.sort} : undefined,
                {
                    $group: {
                        _id: {
                            code: '$code',
                            userContent: '$userContent',
                            diagnosisCert: '$diagnosisCert',
                            diagnosisDerogation: '$diagnosisDerogation',
                            diagnosisSite: '$diagnosisSite',
                            diagnosisTreatmentRelevance: '$diagnosisTreatmentRelevance'
                        },
                        activity: {$first: '$$ROOT'},
                        count: {$sum: 1}
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: '$activity'
                    }
                }
            ].filter( Boolean );

            // MongoDB will not use indexed search in an attribute which has $in + array.  But in this case, we know
            // the casefolder array will only ever have max 4 casefolders. so this is the best index to use, unless
            // there is no casefolder, in which case, the patient is the next best index.
            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'aggregate',
                model: 'activity',
                pipeline,
                options: {
                    hint: query.caseFolderId ? {caseFolderId: 1} : {patientId: 1}
                }
            } ) );
            if( err ) {
                Y.log( `could not aggregate unique diagnosis: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            callback( null, result && result.result );
        }

        /**
         * Get historic med data activities for given fields
         * @param {object} args
         * @param {object} args.user
         * @param {object} args.query
         * @param {object} args.query.medDataTypes
         * key value storage
         * key: string[] (array with number of history entries to be loaded)
         * e.g.
         * HEIGHT: [1,2,3] (load the last three entries for MedData height)
         * @param {object} args.query.patient
         * @param {function|undefined} args.callback
         */
        async function getHistoricMedDataActivities( args ) {
            const
                getModel = require( 'util' ).promisify( Y.doccirrus.mongodb.getModel ),
                {
                    user,
                    query,
                    callback = promisifiedCallback
                } = args,
                {
                    patient,
                    medDataTypes
                } = query,
                match = {
                    actType: "MEDDATA",
                    patientId: patient._id
                };

            if( typeof patient._id !== "string" || patient._id.length === 0 ) {
                Y.log( `patient id required: ${patient._id}`, 'warn', NAME );
                err = new Error( `patient id required: ${patient._id}` );
                return callback( err );
            }

            let err, activityModel, result, aggregationPromises;

            // get the activity model
            [err, activityModel] = await formatPromiseResult( getModel( user, 'activity' ) );
            if( err ) {
                Y.log( `could not get activity model: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            // collect the aggregation promises, one for each type
            aggregationPromises = Object.keys( medDataTypes ).map( ( medDataTypeToFetch ) => {
                // as the keys object contains arrays of elements
                const
                    indicesToFetch = Array.isArray( medDataTypes[medDataTypeToFetch] ) ? medDataTypes[medDataTypeToFetch] : [],
                    matchForType = Object.assign( {}, match, {medData: {$elemMatch: {type: medDataTypeToFetch}}} ),
                    projectionPerIndex = {};

                // do not do the roundtrip to the database, if there are no indices to fetch
                if( indicesToFetch.length === 0 ) {
                    return [];
                }

                // create the projection element
                indicesToFetch.map( ( entryIndex ) => {
                    const numericEntryIndex = parseInt( entryIndex, 10 );
                    if( !isNaN( numericEntryIndex ) ) {
                        projectionPerIndex[`${entryIndex}`] = {$arrayElemAt: ["$hmdt", numericEntryIndex]};
                    }
                } );

                // fetch all elements with the given indices
                let
                    pipeline = [
                        // filter out any med data activities NOT matching the type to fetch
                        {$match: matchForType},
                        // sort them by timestamp DESC
                        {$sort: {timestamp: -1}},
                        // group them together
                        {
                            $group: {
                                _id: medDataTypeToFetch,
                                hmdt: {
                                    $push: {
                                        medData: "$medData",
                                        timestamp: "$timestamp"
                                    }
                                }
                            }
                        },
                        // project just the elements requested
                        {$project: projectionPerIndex}
                    ];

                return activityModel.mongoose.aggregate( pipeline )
                    .then( ( aggregatedEntries ) => {
                        return Promise.resolve( aggregatedEntries[0] || [] );
                    } )
                    .catch( ( err ) => {
                        Y.log( `could not aggregate historic med data entry for type ${medDataTypeToFetch}: ${err.stack || err}`, 'warn', NAME );
                        return Promise.reject( err );
                    } );
            } );

            // fetch the data for all keys
            [err, result] = await formatPromiseResult( Promise.all( aggregationPromises ) );

            if( err ) {
                Y.log( `could not aggregate historic med data entries: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            return callback( null, result );
        }

        /**
         * Get continuous diagnoses for a specific patient and related activity (at the only moment schein).
         * If last schein in casefolder is present take it's continuous diagnosis and search for new continuous
         * diagnosis from last schein timestamp.
         *
         * @method getContinuousDiagnosis
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} args.query.caseFolderId - of related activity
         * @param {String} args.query.locationId - of related activity
         * @param {String} args.query.timestamp - of related activity
         * @param {Date} [args.query.from]
         * @param {Date} [args.query.to]
         * @param {Function} args.callback
         * @returns {*}
         */
        async function getContinuousDiagnosis( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getContinuousDiagnosis', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getContinuousDiagnosis' );
            }
            let locationId;
            let [err, incaseConfig] = await formatPromiseResult(
                promisifyArgsCallback(
                    Y.doccirrus.api.incaseconfiguration.readConfig )( {user: args.user} ) );

            if( err ) {
                Y.log( `getContinuousDiagnosis: could not get incase configuration: ${err.stack || err}`, 'warn', NAME );
            } else if( incaseConfig.documentContinuousDiagnosisPerLocation && args.query.locationId ) {
                locationId = args.query.locationId instanceof ObjectId ? args.query.locationId : new ObjectId( args.query.locationId );
            } else if( incaseConfig.documentContinuousDiagnosisPerLocation && !args.query.locationId ) {
                Y.log( `getContinuousDiagnosis: documentContinuousDiagnosis enabled but no locationId passed`, 'debug', NAME );
            }
            if( incaseConfig.getImportedContinuousDiagnosisFromCurrentLocation && !args.query.locationId ) {
                Y.log( `getContinuousDiagnosis: getImportedContinuousDiagnosisFromCurrentLocation enabled but no locationId passed`, 'debug', NAME );
            }

            const
                {user, originalParams = {}} = args,
                allowedStatus = ['VALID', 'APPROVED', 'IMPORTED'],

                // promisified functions
                getUniqueDiagnosisAsync = promisifyArgsCallback( getUniqueDiagnosis ),
                hasDocumentedScheinAsync = promisifyArgsCallback( Y.doccirrus.api.patient.hasDocumentedSchein ),
                lastScheinAsync = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein );

            let
                query = {
                    actType: 'DIAGNOSIS',
                    diagnosisType: 'CONTINUOUS',
                    // MOJ-11762: include INVALIDATING diagnoses, to check for invalidations
                    diagnosisTreatmentRelevance: {$in: ['TREATMENT_RELEVANT', 'INVALIDATING']},
                    // MOJ-11762: invalidated diagnoses carry the invalidation date, exclude them from the beginning
                    $or: [
                        {diagnosisInvalidationDate: {$exists: false}},
                        {diagnosisInvalidationDate: null}
                    ],
                    patientId: args.query.patientId,
                    status: {$in: allowedStatus}
                },
                lastSchein, hasSchein;

            if( locationId ) {
                query.locationId = locationId;
            }

            if( !args.query.patientId || !args.query.timestamp ) {
                Y.log( `getContinuousDiagnosis: insufficient arguments`, 'warn', NAME );
                return args.callback( new Error( 'insufficient arguments' ) );
            }

            /**
             * Maps results with the same diagnosis-code together.
             * Only add each diagnosis once!
             *
             * [MOJ-11762]
             * IMPORTANT: the order of the activities MUST be sorted by timestamp DESC.
             * The mapper includes just those diagnoses, which are TREATMENT_RELEVANT.
             * However, if an INVALIDATING diagnosis is found once,
             * it prevents ignores diagnoses of the same type afterwards.
             * This is the reason, why the input is required to be sorted by timestamp DESC.
             * If both types appear at the exact same time, the invalidating diagnosis wins.
             *
             * @param {object|undefined} err
             * @param {array} results REQUIRED TO BE ORDERED BY TIMESTAMP!
             * @returns {Promise<Array>} returns the array of diagnoses
             */
            function mapUniqueDiagnoses( err, results ) {

                let invalidatedDiagnoses = {},
                    mappedDiagnoses = {};

                if( err ) {
                    Y.log( `could not get continuous diagnosis: ${err.stack || err}`, 'warn', NAME );
                    return args.callback( err );
                }

                /**
                 * Go through all diagnoses, and get just unique entries.
                 * Since the diagnoses are sorted by timestamp DESC,
                 * we may add a diagnosis to the ignore list, if we stumble upon
                 * an invalidated diagnosis.
                 */
                results
                    .sort( ( a, b ) => {
                        if( a.timestamp < b.timestamp ) {
                            return 1;
                        } else if( a.timestamp > b.timestamp ) {
                            return -1;
                        }
                        return 0;
                    } )
                    .forEach( function( diagnosis ) {
                        let diagnosisCode = diagnosis.code;

                        switch( diagnosis.diagnosisTreatmentRelevance ) {
                            case 'TREATMENT_RELEVANT':
                                /**
                                 * Check, if a diagnosis with the same code has been found.
                                 * Check, if the diagnosis is not blocked by an INVALIDATING diagnosis.
                                 * => just store the first (latest in time) occurrence for this code
                                 */
                                if( !mappedDiagnoses[diagnosisCode] && !invalidatedDiagnoses[diagnosisCode] ) {
                                    mappedDiagnoses[diagnosisCode] = diagnosis;
                                }
                                break;
                            case 'INVALIDATING':
                                // mark all further occurrences of the diagnosis as invalidated (timestamp is ordered DESC)
                                if( !invalidatedDiagnoses[diagnosisCode] ) {
                                    invalidatedDiagnoses[diagnosisCode] = true;

                                    /**
                                     * If a diagnosis with the same code has been found, that's ok,
                                     * as long as the timestamp is AFTER (NOT EQUAL) this invalidating one.
                                     * In that case, we leave it in the map, as it occurred after the INVALIDATION in time.
                                     * However, if the invalidating diagnosis occurs at the same time,
                                     * it is most probably created by copying the previous diagnosis. Hence,
                                     * the timestamps match exactly, and we remove the occurrence from the mappedResult array.
                                     */
                                    if( diagnosis.timestamp instanceof Date &&
                                        mappedDiagnoses[diagnosisCode] &&
                                        mappedDiagnoses[diagnosisCode].timestamp instanceof Date &&
                                        mappedDiagnoses[diagnosisCode].timestamp.getTime() === diagnosis.timestamp.getTime() ) {
                                        delete mappedDiagnoses[diagnosisCode];
                                    }
                                }
                                break;
                        }
                    } );

                return args.callback( null, Object.values( mappedDiagnoses ) );
            }

            /**
             * MOJ-10885: if no imported schein exists at all, we get all imported continuous diagnosis
             * @returns {Promise<void>}
             */
            async function getAllImportedContinuousDiagnoses() {
                const getAllQuery = {...query};
                if( !incaseConfig.getImportedContinuousDiagnosisFromCurrentLocation ) {
                    delete getAllQuery.locationId;
                }

                if( incaseConfig.getImportedContinuousDiagnosisFromCurrentLocation && args.query.locationId ) {
                    getAllQuery.locationId = args.query.locationId;
                }
                let [err, result] = await formatPromiseResult(
                    getUniqueDiagnosisAsync( {
                        user,
                        query: getAllQuery,
                        options: {
                            sort: {
                                timestamp: -1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `could not get all continuous diagnosis: ${err.stack || err}`, 'warn', NAME );
                }
                if( !result ) {
                    Y.log( `empty result: continuous diagnosis from all imported case folders: ${result}`, 'warn', NAME );
                    result = []; // paranoid should never happen.
                }
                return mapUniqueDiagnoses( err, result );
            }

            /**
             * Fetch all unique diagnosis. If a lastSchein is given,
             * we consider only those created AFTER the creation timestamp of the schein.
             * If no schein is given, the timestamp may be limited by a from in the query.
             * In any case, a limit for the timestamp up to a given value may be given.
             * @returns {Promise<void>}
             */
            async function getActivities() {
                if( !lastSchein && args.query.from ) {
                    query.timestamp = {
                        $gte: args.query.from
                    };
                }
                if( lastSchein ) {
                    query.timestamp = {
                        $gte: lastSchein.timestamp
                    };
                }

                if( args.query.to ) {
                    if( !query.timestamp ) {
                        query.timestamp = {};
                    }
                    query.timestamp.$lte = args.query.to;
                }

                // if last schein exists also get it's continuous diagnosis
                if( lastSchein && lastSchein.continuousIcds && lastSchein.continuousIcds.length ) {
                    let scheinQuery = {
                        _id: {$in: lastSchein.continuousIcds.map( id => ObjectId( id ) )},
                        patientId: lastSchein.patientId,
                        // MOJ-11762: exclude invalidated diagnoses
                        $or: [
                            {diagnosisInvalidationDate: {$exists: false}},
                            {diagnosisInvalidationDate: null}
                        ],
                        status: {$in: allowedStatus}
                    };

                    if( locationId ) {
                        scheinQuery.locationId = locationId;
                    }
                    query = {
                        patientId: query.patientId,
                        $or: [
                            query,
                            scheinQuery
                        ]
                    };
                }

                let [err, result] = await formatPromiseResult(
                    getUniqueDiagnosisAsync( {
                        user,
                        query,
                        options: {
                            sort: {
                                timestamp: -1
                            }
                        }
                    } )
                );

                return mapUniqueDiagnoses( err, result );
            }

            /**
             * If no previous Schein should be checked for continuous diagnoses, just load all activities.
             */
            if( originalParams.omitScheinCheck ) {
                return getActivities();
            }

            // MOJ-10885: if no imported schein exists at all, we get all imported continuous diagnosis
            [err, hasSchein] = await formatPromiseResult(
                hasDocumentedScheinAsync( {
                    user,
                    originalParams: {patientId: args.query.patientId}
                } )
            );
            if( err ) {
                Y.log( `could not check if patient has schein: ${err.stack || err}`, 'warn', NAME );
                return args.callback( err );
            }
            if( !hasSchein ) {
                Y.log( `patient "${args.query.patientId}" has no documented schein. get continuous diagnosis from imported casefolders`, 'debug', NAME );
                return getAllImportedContinuousDiagnoses();
            }

            /**
             * If a lastSchein exists, we have to consider all diagnosis with respect to this lastSchein.
             * So we fetch the Schein, and use it in getActivities() as a filter.
             * We only get diagnosis created after the lastSchein,
             * and use all continuous diagnoses mentioned in the lastSchein.
             */
            [err, lastSchein] = await formatPromiseResult(
                lastScheinAsync( {
                    user,
                    query: {
                        patientId: args.query.patientId,
                        timestamp: args.query.timestamp,
                        locationId
                    },
                    options: {
                        doNotQueryCaseFolder: true
                    }
                } )
            );
            if( err ) {
                Y.log( 'could not get last schein before getting coninuous diagnosis', 'warn', NAME );
                return args.callback( err );
            }
            lastSchein = lastSchein && lastSchein[0];
            return getActivities();
        }

        /**
         * Get continuous medications
         *
         * @method getContinuousMedications
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} args.query.caseFolderId - of related activity
         * @param {String} args.query.locationId - of related activity
         * @param {String} args.query.timestamp - of related activity
         * @param {Date} [args.query.from]
         * @param {Date} [args.query.to]
         * @param {Function} args.callback
         * @returns {*}
         */
        async function getContinuousMedications( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getContinuousMedications', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getContinuousMedications' );
            }

            const
                {user, originalParams = {}} = args,
                allowedStatus = ['VALID', 'APPROVED', 'IMPORTED', 'ORDERED', 'DISPENSED'],

                // promisified functions
                getUniqueMedicationsAsync = promisifyArgsCallback( getUniqueDiagnosis ),
                hasDocumentedScheinAsync = promisifyArgsCallback( Y.doccirrus.api.patient.hasDocumentedSchein ),
                lastScheinAsync = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein );

            let locationId = args.query.locationId ? args.query.locationId instanceof ObjectId ? args.query.locationId : new ObjectId( args.query.locationId ) : null,
                err,
                query = {
                    actType: 'MEDICATION',
                    phContinuousMed: true,
                    $or: [
                        {noLongerValid: {$exists: false}},
                        {noLongerValid: false}
                    ],
                    patientId: args.query.patientId,
                    status: {$in: allowedStatus}
                },
                lastSchein, hasSchein;

            if( locationId ) {
                query.locationId = locationId;
            }

            if( !args.query.patientId || !args.query.timestamp ) {
                Y.log( `getContinuousMedications: insufficient arguments`, 'warn', NAME );
                return args.callback( new Error( 'insufficient arguments' ) );
            }

            function mapUniqueMedications( err, results ) {

                let discontinuedMedications = {},
                    mappedMedications = {};

                if( err ) {
                    Y.log( `getContinuousMedications: could not get continuous medications: ${err.stack || err}`, 'warn', NAME );
                    return args.callback( err );
                }

                results
                    .sort( ( a, b ) => {
                        if( a.timestamp < b.timestamp ) {
                            return 1;
                        } else if( a.timestamp > b.timestamp ) {
                            return -1;
                        }
                        return 0;
                    } )
                    .forEach( function( medication ) {
                        let medicationCode = medication.code;

                        if( medication.noLongerValid ) {
                            if( !discontinuedMedications[medicationCode] ) {
                                discontinuedMedications[medicationCode] = true;

                                if( medication.timestamp instanceof Date &&
                                    mappedMedications[medicationCode] &&
                                    mappedMedications[medicationCode].timestamp instanceof Date &&
                                    mappedMedications[medicationCode].timestamp.getTime() === medication.timestamp.getTime() ) {
                                    delete mappedMedications[medicationCode];
                                }
                            }
                        } else {
                            if( !mappedMedications[medicationCode] && !discontinuedMedications[medicationCode] ) {
                                mappedMedications[medicationCode] = medication;
                            }
                        }

                    } );

                return args.callback( null, Object.values( mappedMedications ) );
            }

            async function getAllImportedContinuousMedications() {
                const getAllQuery = {...query};
                delete getAllQuery.locationId;
                let [err, result] = await formatPromiseResult(
                    getUniqueMedicationsAsync( {
                        user,
                        query: getAllQuery,
                        options: {
                            sort: {
                                timestamp: -1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `getContinuousMedications: could not get all continuous medications: ${err.stack || err}`, 'warn', NAME );
                }
                if( !result ) {
                    Y.log( `getContinuousMedications: empty result: continuous medications from all imported case folders: ${result}`, 'warn', NAME );
                    result = []; // paranoid should never happen.
                }
                return mapUniqueMedications( err, result );
            }

            async function getActivities() {
                if( !lastSchein && args.query.from ) {
                    query.timestamp = {
                        $gte: args.query.from
                    };
                }
                if( lastSchein ) {
                    query.timestamp = {
                        $gte: lastSchein.timestamp
                    };
                }

                if( args.query.to ) {
                    if( !query.timestamp ) {
                        query.timestamp = {};
                    }
                    query.timestamp.$lte = args.query.to;
                }

                // if last schein exists also get it's continuous medications
                if( lastSchein && lastSchein.continuousMedications && lastSchein.continuousMedications.length ) {
                    let scheinQuery = {
                        _id: {$in: lastSchein.continuousMedications.map( id => ObjectId( id ) )},
                        patientId: lastSchein.patientId,
                        phContinuousMed: true,
                        $or: [
                            {noLongerValid: {$exists: false}},
                            {noLongerValid: false}
                        ],
                        status: {$in: allowedStatus}
                    };

                    if( locationId ) {
                        scheinQuery.locationId = locationId;
                    }
                    query = {
                        patientId: query.patientId,
                        $or: [
                            query,
                            scheinQuery
                        ]
                    };
                }

                let [err, result] = await formatPromiseResult(
                    getUniqueMedicationsAsync( {
                        user,
                        query,
                        options: {
                            sort: {
                                timestamp: -1
                            }
                        }
                    } )
                );

                return mapUniqueMedications( err, result );
            }

            if( originalParams.omitScheinCheck ) {
                return getActivities();
            }

            [err, hasSchein] = await formatPromiseResult(
                hasDocumentedScheinAsync( {
                    user,
                    originalParams: {patientId: args.query.patientId}
                } )
            );
            if( err ) {
                Y.log( `getContinuousMedications: could not check if patient has schein: ${err.stack || err}`, 'warn', NAME );
                return args.callback( err );
            }
            if( !hasSchein ) {
                Y.log( `getContinuousMedications: patient "${args.query.patientId}" has no documented schein. get continuous diagnosis from imported casefolders`, 'debug', NAME );
                return getAllImportedContinuousMedications();
            }

            [err, lastSchein] = await formatPromiseResult(
                lastScheinAsync( {
                    user,
                    query: {
                        patientId: args.query.patientId,
                        timestamp: args.query.timestamp,
                        locationId
                    },
                    options: {
                        doNotQueryCaseFolder: true
                    }
                } )
            );
            if( err ) {
                Y.log( 'getContinuousMedications: could not get last schein before getting coninuous medications', 'warn', NAME );
                return args.callback( err );
            }
            lastSchein = lastSchein && lastSchein[0];
            return getActivities();
        }

        /**
         * A generic database function, which sets the "diagnosisInvalidationDate" of activities,
         * matching the db-query. The default query is constructed from parameters of a given activity.
         * This function is used during invalidation of continuous diagnoses.
         * The query's default values are:
         * {
                        actType: 'DIAGNOSIS',
                        diagnosisTreatmentRelevance: {$ne: 'INVALIDATING'}, // everything BUT "INVALIDATING"
                        timestamp: null,                                    // MUST BE OVERWRITTEN, default is NULL for security reasons
                        patientId: activity.patientId,                      // for the same patient
                        code: activity.code                                 // for the same activity code
         * }
         * Those may be overwritten by queryExtension.
         *
         * @param {Object} args
         * @param {Object} args.activity                    reference activity
         * @param {String} args.diagnosisInvalidationDate   invalidation date to be set
         * @param {Object} args.query                       query parameter override
         * @param {Function|undefined} args.callback        (optional) callback function
         * @returns {Promise<void>}
         */
        async function updateDiagnosisInvalidationDate( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.updateDiagnosisInvalidationDate', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.updateDiagnosisInvalidationDate' );
            }

            let {user, activity, diagnosisInvalidationDate, query} = args,
                callback = (typeof args.callback === "function") ? args.callback : false;

            // update all activities matching the query with the new diagnosisInvalidationDate
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    query: _.extend(
                        {
                            actType: 'DIAGNOSIS',
                            diagnosisTreatmentRelevance: {$ne: 'INVALIDATING'}, // everything BUT "INVALIDATING"
                            timestamp: null,                                    // MUST BE OVERWRITTEN, default is NULL for security reasons
                            patientId: activity.patientId,                      // for the same patient
                            code: activity.code                                 // for the same code
                        },
                        query
                    ),
                    data: {
                        diagnosisInvalidationDate,
                        skipcheck_: true,
                        multi_: true
                    },
                    fields: ['diagnosisInvalidationDate']
                } )
            );

            if( err ) {
                Y.log( `could not update diagnosisInvalidationDate: ${err.stack || err}`, 'error', NAME );
                if( callback ) {
                    return callback( err, activity );
                }
                return Promise.reject( err );
            }

            if( callback ) {
                return callback( null, activity );
            }
            Y.log( 'Exiting Y.doccirrus.api.activity.updateDiagnosisInvalidationDate', 'info', NAME );
            return Promise.resolve( activity );
        }

        /**
         * Helper function populating activities in a list of activities.
         *
         * @param   {Object}    model
         * @param   {Object}    activityList
         * @param   {Object}    options                 optional params object (1*)
         * @param   {Boolean}   options.objPopulate
         * @param   {String}    options.field           one of [ 'all' | 'icds' | 'activities' ] (1*)
         * @param   {Function}  callback
         *
         * 1*. options.field may be:
         *
         *          'icds'  populates the icds field.
         *          'activities'   populates the activities field.
         *          'all' | falsy  populates the both fields.
         */
        function populateActivities( model, activityList, options, callback ) {
            var
                field = options.field,
                async = require( 'async' ),
                fields = ['all', 'icds', 'activities', 'icdsExtra', 'continuousIcds', 'referencedBy'];

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

                        if( null !== activity[fld][i] ) {  // first filter null - legacy data
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
                            model: 'activity'
                        }
                    ], renameCb );
                }

                switch( field ) {
                    case 'activities': /* fall through */
                    case 'icdsExtra': /* fall through */
                    case 'icds':
                    case 'continuousIcds':
                    case 'referencedBy':
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
                            },
                            function( next ) {
                                if( !Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) ) {
                                    //  referencedBy activities are only needed for invoice communications for far
                                    //  (ie, form mappings from parent activity instead of child)
                                    return next();
                                }
                                doPopulate( 'referencedBy', next );
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
         * @param {Object}      model
         * @param {Object}      activityList
         * @param {Function}    callback
         */
        function populatePatients( model, activityList, callback ) {
            require( 'async' ).each( activityList, function forActivity( activity, _cb ) {
                model.mongoose.populate( activity, [
                    {
                        path: 'patientId',
                        model: 'patient'
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
         * Populates a caseFolder object for each activity from given list
         *
         * @param {Object} model - model to populate from
         * @param {Array} activityList - list af activities to populate to
         * @returns {Array} - original array with populated caseFolder objects
         */
        async function populateCaseFolder( model, activityList ) {
            for( let activity of activityList ) {
                let [err] = await formatPromiseResult( model.mongoose.populate( activity, [
                        {
                            path: 'caseFolderId',
                            model: 'casefolder'
                        }
                    ] )
                );
                if( err ) {
                    Y.log( `populateCaseFolder. Error while populate caseFolder ${activity.caseFolderId}: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
            }
            return activityList;
        }

        /**
         * Helper function populating attachments in a list of activities.
         * @param {Object}      model
         * @param {Object}      activityList
         * @param {Function}    callback
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
                            formStateHash: 1,
                            formInitialState: 1,
                            mapData: 1,
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
                            tags: 1,
                            malwareWarning: 1
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
         * @param {Object}      model
         * @param {Object}      activityList
         * @param {Function}    callback
         */
        function populateEmployees( model, activityList, callback ) {
            require( 'async' ).each( activityList, function forActivity( activity, _cb ) {
                model.mongoose.populate( activity, [
                    {
                        path: 'employeeId',
                        select: 'officialNo lastname firstname specialities',
                        model: 'employee'
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
         * Helper function populating receipts in a list of activities.
         * @param {Object}      model
         * @param {Object}      activityList
         * @param {Function}    callback
         */
        function populateReceipts( model, activityList, callback ) {

            function forEachActivity( activity, _cb ) {

                var
                    populateOptions = {
                        model: 'activity',
                        path: 'receipts',
                        select: {
                            content: 1,
                            timestamp: 1,
                            employeeName: 1
                        }
                    },
                    cleanReceipts = [],
                    check,
                    i;

                function onPopulateComplete( err ) {
                    //  rename the populated field and restore original, as with linked activities
                    activity._receiptsObj = activity.receipts;
                    activity.receipts = cleanReceipts.slice();
                    _cb( err );
                }

                //  drop the attachments array if corrupt (knockout was messing this up in the client in an earlier
                //  version, and it could break casefile)

                if( activity.receipts ) {
                    for( i = 0; i < activity.receipts.length; i++ ) {
                        check = activity.receipts[i];
                        if( ('[object Object]' !== check) && (null !== check) && ('new' !== check) && ('remap' !== check) ) {
                            cleanReceipts.push( check );
                        }
                    }
                }

                // note clone of array, prevents duplicate reference
                activity.receipts = cleanReceipts.slice();

                Y.log( 'Populating receipts for activity: ' + activity._id, 'info', NAME );
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
         * MOJ-1529: this is currently a hardcoded factor
         * needs to use an auxiliary library to calculate
         *
         * mutates the result
         *
         * @param   {Object}    activityList    array of activities
         * @param   {Function}  callback        Of the form fn( err, activityList )
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
         *  Gets activities for a period, sorted by patient and populated with the patient.
         *
         *  If options.migrate is set, this can safely be used during migration.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.options
         *  @param  {Boolean}   args.options.migrate
         *  @param  {Function}  args.callback
         *  @returns    {*}
         */
        function getActivitiesPopulated( args ) {
            const
                user = args.user,
                query = args.query,
                options = args.options || {},
                data = args.data || {},
                callback = args.callback,
                migrate = options.migrate,
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel );
            let
                myAct;

            Y.log( 'getActivitiesPopulated query: ' + JSON.stringify( query ), 'debug', NAME );

            function actCallback( err, activities ) {
                if( err || !activities || (!activities.length && (!activities.result || !activities.result.length)) ) {
                    let error = err || Y.doccirrus.errors.rest( 404, 'no such activity' );
                    Y.log( `Error getActivitiesPopulated (actCallback):
    q:${JSON.stringify( query )}
    e:${JSON.stringify( error )}
    r:${JSON.stringify( activities )}`, 'warn', NAME );

                    //we must show an empty result for cashbook table
                    if( !err && (!activities || (!activities.length && (!activities.result || !activities.result.length))) && options.withReceipts ) {
                        return callback( null, [] );
                    }
                    return callback( error );
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
                                    user, 'activity', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getActivitiesPopulated (modCallback 1): \n" + err, 'error', NAME );
                                            return _cb( err );
                                        } else {
                                            Y.log( 'getActivitiesPopulated: populating linked activities of ' + result.length + ' activities', 'debug', NAME );
                                            populateActivities( model, result, options, _cb );
                                        }
                                    }
                                );
                            }
                        },
                        async function( result, _cb ) {
                            if( options.withCaseFolder ) {
                                let err, model, activitiesWithCaseFolders;
                                [err, model] = await formatPromiseResult(
                                    getModelP( user, 'casefolder', migrate )
                                );
                                if( err ) {
                                    Y.log( `getActivitiesPopulated. Error while getting casefolder model: ${err.stack || err}`, 'error', NAME );
                                    return _cb( err );
                                }
                                [err, activitiesWithCaseFolders] = await formatPromiseResult( populateCaseFolder( model, result ) );
                                return _cb( err, activitiesWithCaseFolders );
                            } else {
                                return _cb( null, result );
                            }
                        },

                        //  3. Get Patients
                        function( result, _cb ) {

                            if( options.hide && -1 < options.hide.indexOf( 'patient' ) ) {
                                return _cb( null, result );
                            } else {
                                Y.doccirrus.mongodb.getModel(
                                    user, 'patient', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getActivitiesPopulated (modCallback 2): \n" + err, 'error', NAME );
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
                                            Y.log( "Error getActivitiesPopulated (modCallback 3): \n" + err, 'error', NAME );
                                            return _cb( err );
                                        } else {
                                            populateAttachments( model, result, _cb );
                                        }
                                    }
                                );
                            }
                        },

                        //  5. Expand receipts for INVOICE
                        function( result, _cb ) {
                            if( options.withReceipts ) {
                                Y.doccirrus.mongodb.getModel(
                                    user, 'activity', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getActivitiesPopulated (modCallback 4): \n" + err, 'error', NAME );
                                            return _cb( err );
                                        } else {
                                            populateReceipts( model, result, _cb );
                                        }
                                    }
                                );
                            } else {
                                return _cb( null, result );
                            }
                        },

                        //  6. Get and attach employee
                        function( result, _cb ) {
                            if( options.withEmployee ) {
                                Y.doccirrus.mongodb.getModel(
                                    user, 'employee', migrate,
                                    function modCallback( err, model ) {
                                        if( err ) {
                                            Y.log( "Error getActivitiesPopulated (modCallback 5): \n" + err, 'error', NAME );
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

                        //  7. Translate prices
                        function( result, _cb ) {
                            if( options.withEmployee ) {
                                translatePrices( result, _cb );
                            } else {
                                return _cb( null, result );
                            }
                        }

                    ], function( err, result ) {
                        if( err ) {
                            Y.log( "Error getActivitiesPopulated (waterfall final): \n" + err, 'error', NAME );
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
                if( query['linkedTimestamps.timestamp'] ) {
                    query['linkedTimestamps.timestamp'].$lte = new Date( query['linkedTimestamps.timestamp'].$lte );
                    query['linkedTimestamps.timestamp'].$gte = new Date( query['linkedTimestamps.timestamp'].$gte );
                }

                Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
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
         *  Expands activities with linked objects
         *
         *  This is a reimplementation of getActivitiesPopulated, created due to performance issues (MOJ-6442)
         *
         *  If options.migrate is set, this can safely be used during migration
         *
         *  NOTE: this is an experimental optimization, it reliable, expect to replace getActivitiesPopulated in 2.18
         *
         *  @param  {Object}    args                    As requested by casefolder
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {Object}    args.options
         *  @param  {Boolean}   args.options.migrate    True if run in migration
         *  @param  {Object}    args.data
         *  @param  {Function}  args.callback           Of the form fn( err, [ populatedActivity, ... ] )
         *  @param  {Object}    useCache                A reporting cache object
         *  @returns {*}
         */
        function getActivitiesPopulatedAlt( args, useCache ) { //jshint ignore:line
            var
                async = require( 'async' ),
                user = args.user,
                query = args.query,
                options = args.options || {},
                data = args.data || {},
                migrate = options.migrate,
                activities = [],
                objCache = useCache || {},

                patientModel,
                locationModel;

            Y.log( 'getActivitiesPopulated query: ' + JSON.stringify( query ), 'debug', NAME );

            if( !query && !data.activities ) {
                return args.callback( null, [] );
            }

            async.series(
                [
                    loadRawActivities,
                    loadLinkedActivities,
                    loadPatientObjects,
                    expandAttachedDocuments,
                    loadEmployeeObjects,
                    translateAllPrices,
                    addLocationName
                ],
                onAllDone
            );

            //  1. Execute query requested by client
            function loadRawActivities( itcb ) {
                Y.log( 'getPopulatedActivities: loadRawActivities ' + (new Date().getTime()), 'debug', NAME );

                function onRawActivitiesLoaded( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }
                    result = result.result ? result.result : result;

                    // Add all activities to cache
                    result.forEach( function actToCache( obj ) {
                        //mongooselean.toObject
                        obj = obj.toObject ? obj.toObject() : obj;
                        activities.push( obj );
                        objCacheSet( 'activity', obj._id, obj );
                    } );

                    itcb( null );
                }

                //  If a set of activities was passed then don't bother to run the query
                if( data.activities ) {
                    return onRawActivitiesLoaded( null, data.activities );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: query,                           // for now accept the query, but in future
                    migrate: migrate,                       // allow to use during migration
                    options: options,
                    callback: onRawActivitiesLoaded
                } );
            }

            //  2. Load linked activities of each activity
            function loadLinkedActivities( itcb ) {
                //  skip this step if configured
                if( options.withoutActivities ) {
                    return itcb( null );
                }

                Y.log( 'getPopulatedActivities: loadLinkedActivities ' + (new Date().getTime()), 'debug', NAME );
                Y.doccirrus.mongodb.getModel( user, 'activity', migrate, onActivityModelReady );

                function onActivityModelReady( err, model ) {
                    if( err ) {
                        Y.log( "Error getActivitiesPopulated (modCallback 1): \n" + err, 'error', NAME );
                        return itcb( err );
                    }
                    Y.log( 'getActivitiesPopulated: populating linked activities of ' + activities.length + ' activities', 'debug', NAME );
                    populateActivities( model, activities, options, itcb );
                }

            }

            //  3. Get patient object for each activity
            function loadPatientObjects( itcb ) {
                //  skip this step if configured
                if( options.hide && -1 < options.hide.indexOf( 'patient' ) ) {
                    return itcb( null );
                }
                if( options.withoutPatient ) {
                    return itcb( null );
                }

                Y.log( 'getPopulatedActivities: loadPatientObjects ' + (new Date().getTime()), 'debug', NAME );
                Y.doccirrus.mongodb.getModel( user, 'patient', migrate, onPatientModelLoaded );

                function onPatientModelLoaded( err, model ) {
                    if( err ) {
                        Y.log( "Error getActivitiesPopulated, could not load patient model: " + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    patientModel = model;
                    async.eachSeries( activities, populatePatientSingle, itcb );
                }
            }

            //  3.5 Populate a patient object for a single activity (cache results)
            function populatePatientSingle( activity, itcb ) {

                Y.log( 'getPopulatedActivities: populatePatientSingle patientId:' + activity.patientId, 'debug', NAME );

                //  skip this step if configured
                if( options.withoutPatient ) {
                    return itcb( null );
                }

                //  skip this step of no patient (should never happen)
                if( !activity.patientId ) {
                    return itcb( null );
                }

                if( objCacheHas( 'patient', activity.patientId ) ) {
                    activity.patientId = objCacheGet( 'patient', activity.patientId );
                    return itcb( null );
                }

                patientModel.mongoose.populate( activity, [{path: 'patientId', model: 'patient'}], onPatientPopulated );

                function onPatientPopulated( err /*, result */ ) {
                    if( err ) {
                        return itcb( err );
                    }
                    // keep this for next time (getCaseFile optimization)
                    objCacheSet( 'patient', activity.patientId._id, activity.patientId );
                    itcb( null );
                }
            }

            //  4. Expand attached documents
            function expandAttachedDocuments( itcb ) {
                if( options.withoutAttachments ) {
                    return itcb( null );
                }

                Y.log( 'getPopulatedActivities: expandAttachedDocuments ' + (new Date().getTime()), 'debug', NAME );
                Y.doccirrus.mongodb.getModel( user, 'document', migrate, onDocumentModelLoaded );

                function onDocumentModelLoaded( err, model ) {
                    if( err ) {
                        Y.log( "Error getActivitiesPopulated (modCallback 3): \n" + err, 'error', NAME );
                        return itcb( err );
                    }
                    populateAttachments( model, activities, itcb );
                }
            }

            //  5. Get and attach employee
            function loadEmployeeObjects( itcb ) {
                if( !options.withEmployee ) {
                    return itcb( null );
                }

                Y.log( 'getPopulatedActivities: loadEmployeeObjects ' + (new Date().getTime()), 'debug', NAME );
                async.each( activities, populateEmployeeSingle, itcb );
            }

            //  5.5 populate a single employee
            function populateEmployeeSingle( activity, itcb ) {
                Y.log( 'getPopulatedActivities: populateEmployeeSingle employeeId:' + activity.employeeId, 'debug', NAME );

                //  skip this step of no employee (should never happen)
                if( !activity.employeeId ) {
                    return itcb( null );
                }

                if( objCacheHas( 'employee', activity.employeeId ) ) {
                    activity.employeeId = objCacheGet( 'employee', activity.employeeId );
                    return itcb( null );
                }

                var
                    popQuery = {
                        path: 'employeeId',
                        select: '_id officialNo lastname firstname specialities',
                        model: 'employee'
                    };

                patientModel.mongoose.populate( activity, [popQuery], onEmployeePopulated );

                function onEmployeePopulated( err /*, result */ ) {
                    if( err ) {
                        return itcb( err );
                    }
                    // keep this for next time (getCaseFile optimization)
                    objCacheSet( 'employee', activity.employeeId._id, activity.employeeId );
                    itcb( null );
                }
            }

            //  6. Translate prices
            function translateAllPrices( itcb ) {
                if( !options.withEmployee ) {
                    return itcb( null );
                }
                Y.log( 'getPopulatedActivities: translatePrices ' + (new Date().getTime()), 'debug', NAME );
                translatePrices( activities, itcb );
            }

            //  7. Add location name for casefile
            function addLocationName( itcb ) {
                if( !options.withLocationNames ) {
                    return itcb( null );
                }

                Y.log( 'getPopulatedActivities: addLocationName ' + (new Date().getTime()), 'debug', NAME );
                Y.doccirrus.mongodb.getModel( user, 'location', migrate, onLocationModelLoaded );

                function onLocationModelLoaded( err, model ) {
                    if( err ) {
                        Y.log( 'Could not instantiate location model: ' + JSON.stringify( err ), 'error', NAME );
                        return itcb( err );
                    }

                    locationModel = model;
                    async.eachSeries( activities, populateLocationSingle, itcb );
                }
            }

            //  7.5 populate a single location name
            function populateLocationSingle( activity, itcb ) {
                Y.log( 'getPopulatedActivities: populateLocationSingle locationId:' + activity.locationId, 'debug', NAME );

                //  skip this step of no employee (should never happen)
                if( !activity.locationId ) {
                    return itcb( null );
                }

                //  already done
                if( activity.locationId && activity.locationName ) {
                    return itcb( null );
                }

                var loc;

                if( objCacheHas( 'location', activity.locationId ) ) {
                    loc = objCacheGet( 'location', activity.locationId );
                    activity.locationName = loc.locname || '';
                    return itcb( null );
                }

                locationModel.mongoose.findOne( {_id: activity.locationId}, onLocationFound );

                function onLocationFound( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }

                    //  missing location, should not happen
                    if( !result || !result._id ) {
                        return itcb( null );
                    }

                    // keep this for next time (getCaseFile optimization)
                    objCacheSet( 'location', result._id, result );
                    activity.locationName = result.locname;
                    itcb( null );
                }
            }

            //  Finally - all activities expanded
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error while expanding activities: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, activities );
            }

            //  Helper functions for caching, prevent unncessary queries for repeated locations, employees, etc

            function objCacheHas( modelName, _id ) {
                //Y.log( 'objCache query: ' + modelName + '::' + _id + ' ' + (objCache.hasOwnProperty( modelName + '::' + _id) ? 'HIT' : 'MISS' ), 'debug', NAME );
                if( !useCache ) {
                    return false;
                }
                return objCache.hasOwnProperty( modelName + '::' + _id );
            }

            function objCacheSet( modelName, _id, cacheMe ) {
                //Y.log( 'onCache set: ' + modelName + '::' + _id, 'debug', NAME );
                if( !useCache ) {
                    return;
                }
                objCache[modelName + '::' + _id] = cacheMe;
            }

            function objCacheGet( modelName, _id ) {
                //Y.log( 'objCache hit: ' + modelName + '::' + _id, 'debug', NAME );
                return objCache[modelName + '::' + _id];
            }

        }

        /**
         * Returns all Invoices with populated data(activities,patient,employee)
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        function getCashBook( args ) {
            var
                async = require( 'async' ),
                options = args.options || {},
                queryParams = args.query || {},
                userLocationsId = (args.user.locations || []).map( item => item._id.toString() );

            //  enforce location restrictions on which invoices a user can view, EXTMOJ-773
            if( queryParams.locationId && queryParams.locationId.$in && Array.isArray( queryParams.locationId.$in ) ) {
                queryParams.locationId.$in = queryParams.locationId.$in.filter( locationId => userLocationsId.includes( locationId ) );
            } else {
                queryParams.locationId = {$in: userLocationsId};
            }

            if( queryParams.invoiceDate ) {
                queryParams.invoiceDate.$lte = new Date( queryParams.invoiceDate.$lte );
                queryParams.invoiceDate.$gte = new Date( queryParams.invoiceDate.$gte );
            }

            if( !queryParams.$and ) {
                queryParams.$and = [];
            }

            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                queryParams.$and.push( {
                    $or: [
                        {actType: 'INVOICE'},
                        {actType: 'INVOICEREF'}
                    ]
                } );
            } else {
                queryParams.actType = 'INVOICE';
            }

            async.waterfall( [
                function( next ) {
                    let patientQuery = {};
                    if( queryParams['patientId.patientNo'] ) {
                        patientQuery.patientNo = queryParams['patientId.patientNo'];
                        delete queryParams['patientId.patientNo'];
                    }
                    if( Object.keys( patientQuery ).length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'patient',
                            action: 'get',
                            query: patientQuery,
                            options: {
                                select: {
                                    _id: 1
                                }
                            }
                        }, next );
                    } else {
                        return next( null, false );
                    }

                },
                async function( patientIdList, next ) {
                    let caseFolderQuery = {};
                    if( queryParams['caseFolderId.type'] ) {
                        caseFolderQuery.type = queryParams['caseFolderId.type'];
                        delete queryParams['caseFolderId.type'];
                        let [err, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'casefolder',
                                action: 'get',
                                query: caseFolderQuery,
                                options: {
                                    select: {
                                        _id: 1
                                    }
                                }
                            } )
                        );
                        if( err ) {
                            return next( err );
                        }
                        return next( null, patientIdList, result );
                    } else {
                        return next( null, patientIdList, false );
                    }
                },
                function( patientIdlist, caseFolderIdList, next ) {
                    if( patientIdlist ) {
                        queryParams.patientId = {
                            $in: patientIdlist.map( function( patientData ) {
                                return patientData._id.toString();
                            } )
                        };
                    }
                    if( caseFolderIdList ) {
                        queryParams.caseFolderId = {
                            $in: caseFolderIdList.map( function( item ) {
                                return item._id.toString();
                            } )
                        };
                    }

                    async.parallel( [
                        function( done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'activity',
                                action: 'count',
                                query: queryParams
                            }, function( err, results ) {
                                if( err ) {
                                    return done( err );
                                }
                                done( err, results );
                            } );
                        },
                        function( done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'activity',
                                action: 'get',
                                query: queryParams
                            }, function( err, results ) {
                                if( err ) {
                                    return done( err );
                                }
                                let sumTotalReceiptsOutstanding = 0,
                                    sumTotalReceipts = 0,
                                    sumPrice = 0;
                                results.forEach( ( invoice ) => {
                                    sumTotalReceiptsOutstanding += invoice.totalReceiptsOutstanding;
                                    sumTotalReceipts += invoice.totalReceipts;
                                    sumPrice += invoice.price ? invoice.price : 0;
                                } );
                                let finalData = {
                                    _id: null,
                                    totalReceiptsOutstanding: sumTotalReceiptsOutstanding,
                                    totalReceipts: sumTotalReceipts,
                                    price: sumPrice
                                };
                                done( err, finalData );
                            } );
                        },
                        function( done ) {
                            getActivitiesPopulated( {
                                user: args.user,
                                query: queryParams,
                                options: {
                                    limit: options.limit,
                                    skip: options.skip,
                                    sort: options.sort,
                                    withReceipts: true,
                                    withCaseFolder: true,
                                    withoutActivities: true,
                                    withoutAttachments: true
                                },
                                callback: done
                            } );
                        }
                    ], next );
                }
            ], function( err, results ) {
                if( err ) {
                    return args.callback( err );
                }
                // calculate data for total row it should be last item
                results[2].count = results[0];
                // push the summaryRow data
                results[2].push( results[1] );
                args.callback( err, results[2] );
            } );
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
                //  MOJ-6864 - make sure that timestamp exists and is actually a date
                if( !activity || !activity.timestamp ) {
                    return;
                }
                if( typeof activity.timestamp.toDateString !== 'function' ) {
                    Y.log( 'Activity timestamp was not a date: ' + activity.timestamp, 'warn', NAME );
                    Y.log( 'Activity follows: ' + Y.doccirrus.utils.safeStringify( activity ), 'info', NAME );
                    activity.timestamp = new Date( activity.timestamp );
                }

                var
                    timestamp = activity.timestamp,
                    day = timestamp && timestamp.toDateString();
                // MOJ-4450 before that validation allowed undefined timestamp
                // only occurred in mvprc rest interface because the UI always has a timestamp
                if( !day ) {
                    return;
                }
                if( lastDay && day !== lastDay && !moment( day ).isAfter() ) {
                    // not set day seperator for future timestamp using for PREPARED
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
                    timestamp = activity.timestamp,
                    quarter = moment( timestamp ).quarter(),
                    day = timestamp && timestamp.toDateString();

                if( lastQuarter && quarter !== lastQuarter && !moment( day ).isAfter() ) {
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
                    if( options.paging ) {
                        return setImmediate( done );
                    }

                    function onCountComplete( err, result ) {
                        done( err, result );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activity',
                        action: 'count',
                        query: args.query
                    }, onCountComplete );
                },
                function( done ) {
                    function onPopulatedComplete( err, result ) {
                        done( err, result );
                    }

                    getActivitiesPopulated( {
                        user: args.user,
                        query: args.query,
                        options: {
                            limit: options.limit,
                            skip: options.skip,
                            sort: options.sort,
                            objPopulate: true,
                            paging: options.paging,
                            withoutActivities: false,
                            withoutAttachments: false,
                            withLocationNames: true,
                            withReceipts: options.withReceipts
                        },
                        callback: onPopulatedComplete
                    } );

                }
            ], function( err, results ) {
                if( err ) {
                    return args.callback( err );
                }
                if( results[1].result ) {
                    items = results[1].result.map( function( record ) {
                        return record.toObject ? record.toObject() : record;
                    } );
                } else {
                    items = results[1].map( function( record ) {
                        return record.toObject ? record.toObject() : record;
                    } );
                }

                items.forEach( function( activity ) {

                    // set up "_attributes" which is to flag an activity of some kind
                    activity._attributes = [];

                    // set simple attribute flags:

                    if( isDaySeparationFlag( activity ) && 'PREPARED' !== activity.status ) {
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
                                model: 'location',
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
                    if( results[1].count ) {
                        items.count = results[1].count;
                    } else {
                        items.count = results[0];
                    }

                    args.callback( err, items );
                } );

            } );
        }

        /**
         *  This is a streamlined version of the getCaseFile method above
         *
         *  This should load and return only the data needed by the inCase activity table, where a number of the
         *  linked objects (activitiesObj, icdsObj, patient, location) are not used, or are already loaded for use by
         *  other components.
         *
         *      1. Add any additional constraints to the query
         *      2. Request a page of activities from the database
         *      3. Count total matching activities in CaseFile (if necessary)
         *      4. Add additional attributes to the activities
         *
         *  @param {Object} args
         *  @param {Object} args.user
         *  @param {Object} args.options
         *  @param {Object} [args.originalParams.caseFileDoctorSelectFilter] selected filter for location and employee
         *  @param {Object} [args.originalParams.ignoreCountLimit] overrides the addition of countLimit in getTotalCount if true
         *  @param {Object} args.query
         *  @param {Function} args.callback
         */

        function getCaseFileLight( args ) {
            var
                async = require( 'async' ),
                params = args.originalParams || {ignoreCountLimit: false},
                caseFileDoctorSelectFilter = params.caseFileDoctorSelectFilter,
                options = args.options || {},
                activities,
                count,
                caseFolderIds;

            if( args.options.sort && args.options.sort.time ) {
                args.options.sort.timestamp = args.options.sort.time;
                delete args.options.sort.time;
            }

            //caseFolderTitle replaced by caseFolderId because filtering
            if( args.query && args.query.caseFolderTitle ) {
                caseFolderIds = args.query.caseFolderTitle;
                delete args.query.caseFolderTitle;
                args.query.caseFolderId = caseFolderIds;
            }

            async.series( [checkQuery, getActivitiesPage, getLockedActivities, getCaseFolders, mapLinkedActivities, getTotalCount, expandResults, auditCaseOpen, checkActivitySettings], onAllDone );

            //  1. Add any additional constraints to the query
            function checkQuery( itcb ) {
                if( args.query ) {

                    // map form mapped fields back to schema fields
                    if( args.query.editorName ) {
                        args.query['editor.name'] = args.query.editorName;
                        delete args.query.editorName;
                    }
                    if( args.query.editorInitials ) {
                        args.query['editor.initials'] = args.query.editorInitials;
                        delete args.query.editorInitials;
                    }

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

                    /**
                     * [MOJ-11908]
                     * Whenever a regex filter against the activity's content is queried, we intercept it.
                     * This makes it possible to search the content for the so-called "badges" (bootstrap-labels),
                     * which are rendered, if specific properties of an activity are set to true/false, or to
                     * specific values (mainly ENUMs)
                     *      E.g. activity.phContinuousMed = true renders a badge with the abbreviation "DM" (in german),
                     *      which means "DauerMedikament".
                     *
                     * Since the user sees these patches within the content, he assumes, that one may search for the
                     * label's content. In the example, this would be "DM".
                     * So we have to be able to filter the properties in the database accordingly,
                     * although the activity.content has NO knowledge of the "DM".
                     *
                     * Here, this is done by analyzing the query sent by the user,
                     * and search for these abbreviations. If found, the query is altered on-the-fly,
                     * to include a search for the requested parameters.
                     */
                    if( args.query.content && args.query.content.$regex ) {
                        let CONTINUOUS_MEDICATION = i18n( 'InCaseMojit.activity_schema.CONTINUOUS_MEDICATION' ),
                            SAMPLE_MEDICATION = i18n( 'InCaseMojit.activity_schema.SAMPLE_MEDICATION' ),
                            ACUTE_DOK = i18n( 'InCaseMojit.activity_schema.diagnose_type.ACUTE_DOK' ),
                            ACUTE_INVALIDATING = i18n( 'InCaseMojit.activity_schema.diagnose_type.ACUTE_INVALIDATING' ),
                            CONT_DIAGNOSES = i18n( 'InCaseMojit.activity_schema.diagnose_type.CONT_DIAGNOSES' ),
                            CONT_DIAGNOSES_DOK = i18n( 'InCaseMojit.activity_schema.diagnose_type.CONT_DIAGNOSES_DOK' ),
                            CONT_DIAGNOSES_INVALIDATING = i18n( 'InCaseMojit.activity_schema.diagnose_type.CONT_DIAGNOSES_INVALIDATING' ),
                            A_CONT_DIAGNOSES = i18n( 'InCaseMojit.activity_schema.diagnose_type.A_CONT_DIAGNOSES' ),
                            A_CONT_DIAGNOSES_DOK = i18n( 'InCaseMojit.activity_schema.diagnose_type.A_CONT_DIAGNOSES_DOK' ),
                            A_CONT_DIAGNOSES_INVALIDATING = i18n( 'InCaseMojit.activity_schema.diagnose_type.A_CONT_DIAGNOSES_INVALIDATING' ),
                            EXPENSES = i18n( 'InCaseMojit.casefile_detail.group.EXPENSES' ),

                            /**
                             * An activity may provide multiple parameters, which are set to true/false,
                             * or a given set of parameters. Depending on this state, a badge (bootstrap-label)
                             * is displayed in the content, which shows an abbreviation, according to this state.
                             * So the user sees this label, and tries to search for it, by typing the abbreviation.
                             *
                             * This array defines an object for each searchable property (which has a corresponding badge).
                             *      {
                             *          searchTag : abbreviation displayed in the label,
                             *          searchCondition: database parameters to be searched for
                             *      }
                             * @type {Array}
                             */
                            propertiesToSearchFor = [
                                {
                                    searchTag: CONTINUOUS_MEDICATION,
                                    searchCondition: {phContinuousMed: true}
                                },
                                {
                                    searchTag: SAMPLE_MEDICATION,
                                    searchCondition: {phSampleMed: true}
                                },
                                {
                                    searchTag: ACUTE_DOK,
                                    searchCondition: {
                                        diagnosisType: 'ACUTE',
                                        diagnosisTreatmentRelevance: 'DOKUMENTATIV'
                                    }
                                },
                                {
                                    searchTag: ACUTE_INVALIDATING,
                                    searchCondition: {
                                        diagnosisType: 'ACUTE',
                                        diagnosisTreatmentRelevance: 'INVALIDATING'
                                    }
                                },
                                {
                                    searchTag: CONT_DIAGNOSES,
                                    searchCondition: {
                                        diagnosisType: 'CONTINUOUS',
                                        diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT'
                                    }
                                },
                                {
                                    searchTag: CONT_DIAGNOSES_DOK,
                                    searchCondition: {
                                        diagnosisType: 'CONTINUOUS',
                                        diagnosisTreatmentRelevance: 'DOKUMENTATIV'
                                    }
                                },
                                {
                                    searchTag: CONT_DIAGNOSES_INVALIDATING,
                                    searchCondition: {
                                        diagnosisType: 'CONTINUOUS',
                                        diagnosisTreatmentRelevance: 'INVALIDATING'
                                    }
                                },
                                {
                                    searchTag: A_CONT_DIAGNOSES,
                                    searchCondition: {
                                        diagnosisType: 'ANAMNESTIC',
                                        diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT'
                                    }
                                },
                                {
                                    searchTag: A_CONT_DIAGNOSES_DOK,
                                    searchCondition: {
                                        diagnosisType: 'ANAMNESTIC',
                                        diagnosisTreatmentRelevance: 'DOKUMENTATIV'
                                    }
                                },
                                {
                                    searchTag: A_CONT_DIAGNOSES_INVALIDATING,
                                    searchCondition: {
                                        diagnosisType: 'ANAMNESTIC',
                                        diagnosisTreatmentRelevance: 'INVALIDATING'
                                    }
                                },
                                {
                                    searchTag: EXPENSES,
                                    searchCondition: {
                                        $and: [
                                            {costType: {$exists: true}},
                                            {costType: {$type: "string"}},
                                            {costType: {$ne: ""}}
                                        ]
                                    }
                                },
                                {
                                    searchTag: 'email',
                                    searchCondition: {savedEmails: {$exists: true}}

                                }

                            ],

                            // extract the query's regex source
                            queryRegexSource = (args.query.content.$regex.source || ''),
                            queryRegexFlags = (args.query.content.$regex.flags || 'i');

                        /**
                         * We start, by examining the search query (which is actually a regex itself), for the occurrence of
                         * the searchTags of the properties. So we filter out all occurrences, for which we have to
                         * take care about. Notice: the query may additionally be limited to the beginning
                         * or the end of the string, "^" or "$", respectively.
                         * Examples for this regex:
                         *      - "DM", "^DM", "DM$": single occurrences
                         *          To search all continuous medications (DM).
                         *      - "DM ExampleMedication", "DM ExampleMedication", "^DM ExampleMedication$"
                         *          To search for all continuous medications (DM), and additionally those of type "ExampleMedication".
                         *      - "DM MM", "^DM MM", "DM MM$": multiple occurrences
                         *          To search for all continuous (DM) and sample medications (MM). Should generally not happen.
                         */
                        propertiesToSearchFor = propertiesToSearchFor
                            .filter( propertyToSearch => {
                                // Create multiple RegExp from the property's search tag, and match each
                                // against the query. Each RegExp covers the cases explained above.
                                let // watch out, the searchTag itself is escaped for regex characters
                                    // =>   this requires us to double-escape all regex-characters in our search tag,
                                    //      to obtain a match on those (e.g. search for "DD.d", query is "DD\.d", so we create a regex with "DD\\\.d")
                                    escapedSearchTag = Y.doccirrus.commonutils.$regexEscape( Y.doccirrus.commonutils.$regexEscape( propertyToSearch.searchTag ) ),
                                    // get a collection of all tests to run on the user's query regex
                                    regexTests = [
                                        // match the occurrence of the searchTag at the beginning of the query
                                        new RegExp( "^\\^?" + escapedSearchTag + "\\s", "gi" ),

                                        // match the occurrence of the searchTag in the middle of the query
                                        new RegExp( "\\s" + escapedSearchTag + "(\\s)", "gi" ), // the capture group is intended here!

                                        // match the occurrence of the searchTag at the end of the query
                                        new RegExp( "\\s" + escapedSearchTag + "\\$?$", "gi" ),

                                        // match the occurrence of the searchTag as the only content of the query
                                        new RegExp( "^\\^?" + escapedSearchTag + "\\$?$", "gi" )
                                    ],
                                    tagFound = false,
                                    tagFoundCallback = ( match, spaceCaptureGroup ) => {
                                        /**
                                         * If yes, this function is invoked.
                                         * Here, we remove the occurrence of the tag from the regex string,
                                         * and mark the tag as found.
                                         * E.g.:
                                         *      "DD Test-Diagnosis XYZ" => "Test-Diagnosis XYZ"
                                         *
                                         * NOTICE:
                                         * We explicitly proceed with other regex tests from the array,
                                         * to catch multiple occurrences of the same tag in the different positions,
                                         * and to properly remove these occurrences.
                                         * This may be caused by the user entering the tag twice,
                                         * e.g. "DM test medication DM", and him still expecting a result.
                                         * @type {boolean}
                                         */
                                        tagFound = true;

                                        /**
                                         * Replace every tag by an empty string, with one exception:
                                         * In case of a positioning of the tag within the string,
                                         * we have to keep a space, to avoid merging words.
                                         */
                                        return (typeof spaceCaptureGroup === "string") ? spaceCaptureGroup : '';
                                    };

                                for( let regexTest of regexTests ) { //eslint-disable-line no-unused-vars
                                    // see, if there is a match of the query's regex source with the test regex
                                    queryRegexSource = queryRegexSource.replace( regexTest, tagFoundCallback );
                                }

                                // if no tag of this type was found, exclude the tag from further treatment
                                return tagFound;
                            } );

                        /**
                         * Now, that we have all relevant properties, and that we have cleaned the query's regex source
                         * from these properties, we may map the matching properties into the query as new conditions ($and).
                         */
                        if( propertiesToSearchFor.length > 0 ) {

                            // Create the new search Regex for the content, which has been cleaned from all matched tags.
                            args.query.content.$regex = new RegExp( queryRegexSource, queryRegexFlags );

                            // Ensure, that there is an $and defined ...
                            if( !args.query.$and ) {
                                args.query.$and = [];
                            }
                            // ... and that it is an array.
                            if( Array.isArray( args.query.$and ) ) {
                                // move the former "content"-query out of the original query, and into the $and.
                                args.query.$and.push( {content: args.query.content} );
                                delete args.query.content;

                                // finally, map the all search conditions into the $and
                                propertiesToSearchFor.map( propertyToSearch => args.query.$and.push( propertyToSearch.searchCondition ) );
                            }
                        }
                    }

                }
                if( caseFileDoctorSelectFilter ) {
                    args.query = {$and: [caseFileDoctorSelectFilter, args.query]};
                }
                itcb( null );
            }

            //  2. Request a page of activities from the database
            async function getActivitiesPage( itcb ) {
                function onRawActivitiesLoaded( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }
                    activities = result.result ? result.result : result;

                    itcb( null );
                }

                const readConfig = promisifyArgsCallback( Y.doccirrus.api.incaseconfiguration.readConfig );
                let err, result, incaseconfig;

                [err, incaseconfig] = await formatPromiseResult(
                    readConfig( {
                        user: args.user
                    } )
                );

                if( err ) {
                    Y.log( `getCaseFileLight: Error in looking for incaseconfiguration. ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }

                let hideMedicationPlanMedications = incaseconfig.hideMedicationPlanMedications,
                    medicationPlanQuery = Object.assign(
                        {actType: {$in: ['MEDICATIONPLAN', 'MEDICATION']}},
                        args.query
                    ),
                    filtered = [];

                if( hideMedicationPlanMedications ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'activity',
                            action: 'get',
                            query: medicationPlanQuery,
                            options: {
                                select: {
                                    referencedBy: 1,
                                    activities: 1,
                                    actType: 1
                                }
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `getCaseFileLight: Error in looking for MEDICATIONPLAN. ${err.stack || err}`, 'error', NAME );
                        return itcb( err );
                    }

                    if( result && result.length ) {
                        let medicationPans = result.filter( i => 'MEDICATIONPLAN' === i.actType ).map( i => i._id.toString() );
                        result.filter( i => 'MEDICATION' === i.actType ).forEach( ( i ) => {
                            if( i.referencedBy && i.referencedBy.length ) {
                                let isConnected = i.referencedBy.every( j => medicationPans.includes( j ) );

                                if( isConnected ) {
                                    filtered.push( i._id.toString() );
                                }
                            }
                        } );
                    }
                }

                let
                    getActivitiesQuery = Object.assign(
                        {},
                        args.query
                    );

                if( filtered && filtered.length && hideMedicationPlanMedications ) {
                    getActivitiesQuery.$and = [
                        {_id: {$nin: filtered}}
                    ];
                }

                args.options.lean = true;

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'activity',
                    action: 'get',
                    query: getActivitiesQuery,
                    options: args.options,
                    callback: onRawActivitiesLoaded
                } );
            }

            //  2.0. Get employeeId for the locked activities if any
            function getLockedActivities( itcb ) {
                if( !activities || !activities.length || !activities.filter( el => el.status === 'LOCKED' ).length ) {
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'lockedactivity',
                    action: 'get',
                    query: {_id: {$in: activities.map( el => el._id.toString() )}},
                    options: {select: {employeeId: 1}}
                }, ( err, lockedActivities ) => {
                    if( err ) {
                        Y.log( `getLockedActivities: Error on getting locked ${err.stack || err}`, 'error', NAME );
                        return itcb( err );
                    }

                    for( let locked of (lockedActivities || []) ) { // eslint-disable-line no-unused-vars
                        let activity = activities.find( el => el._id.toString() === locked._id.toString() );
                        activity.lockedBy = locked.employeeId;
                    }
                    itcb( null );
                } );
            }

            //  2.1 Get casefolders for activities
            async function getCaseFolders( itcb ) {
                let
                    err,
                    result,
                    caseFolders;

                if( !activities.length ) {
                    return itcb( null );
                }

                let caseFolderIds = activities.map( activity => activity.caseFolderId );

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'casefolder',
                        action: 'get',
                        query: {_id: {$in: caseFolderIds}}
                    } ) );

                if( err ) {
                    return itcb( err );
                }

                caseFolders = result.result ? result.result : result;

                if( !caseFolders.length ) {
                    return itcb();
                }

                activities = activities.map( activity => {
                    activity.caseFolderTitle = (caseFolders.find( cf => cf._id.toString() === activity.caseFolderId ) || {}).title;
                    return activity;
                } );

                itcb( null );
            }

            //2.2 Add property with mapped  linked activities id's to theirs types
            async function mapLinkedActivities( itcb ) {
                let err, linkedActivities, linkedActivitiesIds = [];

                activities.forEach( act => {
                    linkedActivitiesIds = linkedActivitiesIds.concat( act.activities );
                } );

                linkedActivitiesIds = linkedActivitiesIds.map( id => new ObjectId( id ) );

                [err, linkedActivities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: "activity",
                        action: 'aggregate',
                        pipeline: [
                            {$match: {_id: {$in: linkedActivitiesIds}}},
                            {
                                $project: {
                                    _id: 1,
                                    actType: 1,
                                    status: 1
                                }
                            }
                        ]
                    } ) );

                if( err ) {
                    Y.log( `Error loading linked activities: ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }

                linkedActivities = linkedActivities.result ? linkedActivities.result : linkedActivities;

                activities = activities.map( act => {
                    if( !act.activities || !act.activities.length ) {
                        return act;
                    }
                    act.linkedAct = [];
                    act.activities.forEach( id => {
                        act.linkedAct = act.linkedAct.concat( [linkedActivities.find( la => la._id.toString() === id )] );
                    } );

                    return act;
                } );

                itcb( null );
            }

            //  3. Count total matching activities in CaseFile (if necessary)
            function getTotalCount( itcb ) {
                //  no need to count total rows if we're on the last page
                if( options.limit && options.skip && options.limit > activities.length ) {
                    count = activities.length + options.skip;
                    return itcb( null );
                }

                let countOptions = {};
                if( options.countLimit ) {
                    countOptions.options = {
                        countLimit: options.countLimit
                    };
                } else if( params.ignoreCountLimit ) {
                    countOptions.options = {
                        noCountLimit: true
                    };
                }

                function onCountComplete( err, result ) {
                    count = result;
                    itcb( err, result );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'activity',
                    action: 'count',
                    query: args.query,
                    ...countOptions
                }, onCountComplete );
            }

            //  4. Add additional attributes to the activities
            function expandResults( itcb ) {

                activities.forEach( function( activity ) {

                    activity = activity.toObject ? activity.toObject() : activity;

                    //  location name is filled by client
                    activity.locationId = activity.locationId ? activity.locationId : '000000000000000000000001';
                    activity.locationName = activity.locationName ? activity.locationName : '';

                    // set up "_attributes" which is to flag an activity of some kind
                    activity._attributes = [];

                    // set simple attribute flags:
                    if( isDaySeparationFlag( activity ) && 'PREPARED' !== activity.status ) {
                        activity._attributes.push( ATTRIBUTES.DAY_SEPARATION_FLAG );
                    }

                } );

                // set attribute flag for new day:
                setNewDayFlag( activities );

                // set attribute flag for quarter change:
                setQuarterChangeFlag( activities );

                // convert points to Euros
                translatePrices( activities, itcb );
            }

            //  5. Collect actual casefolders from activities and audit redaing action
            async function auditCaseOpen( itcb ) {
                if( args.user.su ){
                    //do not audit system user
                    return itcb( null );
                }

                const caseFolderIds = [...new Set( [
                    ...(activities || []).map( activity => activity.caseFolderId ),
                    ...( Array.isArray(args.query.caseFolderId) ? args.query.caseFolderId : [ args.query.caseFolderId ] )
                ] ) ].filter( Boolean );
                if( caseFolderIds.length ){
                    let [err] = await formatPromiseResult( Y.doccirrus.api.casefolder.auditCaseOpen( { user: args.user, data: { caseFolderIds } } ) );
                    //do not stop processing on error
                    if( err ){
                        Y.log( `getCaseFileLight: Error auditing CaseFile(s) ${ caseFolderIds } open : ${err.stack || err}`, 'warn', NAME );
                    }
                }

                itcb( null );
            }
            //  6. Check activitysettings for 'hideLinksOfPrintedPDF' option and delete attachedMedia property if needed
            async function checkActivitySettings( itcb ) {
                const
                    loadActivitySettingsP = promisifyArgsCallback( Y.doccirrus.api.activitysettings.loadActivitySettings );

                let
                    [err, activitySettings] = await formatPromiseResult( loadActivitySettingsP( {user: args.user} ) );
                if( err ) {
                    Y.log( `checkActivitySettings. Error while getting activitysettings: ${err.stack || err}`, 'warn', NAME );
                    return itcb( err );
                }
                if( !activitySettings || !activitySettings.settings ) {
                    Y.log( `checkActivitySettings. Activitysettings are empty/missing.`, 'debug', NAME );
                    return itcb( null );
                }

                for( let activity of activities ) {
                    // find activity setting per activity
                    let currentActivitySettings = activitySettings.settings.find( setting => setting.actType === activity.actType );

                    if( currentActivitySettings && currentActivitySettings.hideLinksOfPrintedPDF && activity.formPdf ) {
                        Y.log( `checkActivitySettings. Delete attachedMedia property for ${activity._id} activity.`, 'debug', NAME );
                        delete activity.attachedMedia;
                    }
                }
                itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error loading page of CaseFile: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                if( options.paging ) {
                    activities.count = count;
                }

                args.callback( err, activities );
            }

        }

        /**
         *  Alias for Y.doccirrus.activityapi.doTransitionBatch
         *  @method doTransitionBatch
         *
         *  @param {Object}     args
         *  @param {Object}     args.user
         *  @param {Object}     args.originalParams
         *  @param {String}     args.originalParams.event   if specified the request will return immediately and service will provide progress information via socket.io
         *  @param {Object}     args.query
         *  @param {Array}      args.query.ids              array of activity IDs
         *  @param {String}     args.query.transition       Name of transition
         *  @param {Function}   args.callback
         *
         *  @see Y.doccirrus.activityapi.doTransitionBatch
         */

        function doTransitionBatch( args ) {
            var
                user = args.user,
                params = args.originalParams,
                queryParams = args.query || {},
                callback = args.callback;

            function onBatchTransitionComplete( err, results ) {
                if( !params.event ) {
                    if( err ) {
                        Y.log( 'Error while doTransitionBatch: ' + err, 'error', NAME );
                        return callback( err );
                    }
                    return callback( null, results );
                } else {
                    onProgress( {state: 'finished', error: err} );
                }
            }

            function onProgress( data ) {
                if( params.event ) {
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        tenantId: user && user.tenantId,
                        event: params.event,
                        msg: {
                            data: data
                        }
                    } );
                }
            }

            if( (null === queryParams.transition) || !queryParams.ids || (0 === queryParams.ids.length) ) {
                callback( Y.doccirrus.errors.http( 409, 'bad request, please POST activity and transition' ) );
                return;
            }
            if( params.event ) {
                return callback();
            }

            onProgress( {state: 'start', action: queryParams.transition} );
            Y.doccirrus.activityapi.doTransitionBatch( user, (params.additionalParams) ? params.additionalParams : {}, queryParams.ids, queryParams.transition, onProgress, onBatchTransitionComplete );
        }

        /**
         * Moves activity
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.targetId target activity id (the one which user moved)
         * @param {Object} args.query.targetPosition timestamp of drop item
         * @param {Object} args.query.direction -1 = drag item from top to bottom, 1 = drag item from bottom to top
         * @param {Function} args.callback
         */
        function moveActivity( args ) {
            var queryParams = args.query || {},
                target = queryParams.targetId,
                direction = queryParams.direction,
                moment = require( 'moment' ),
                targetPosition = moment( queryParams.targetPosition ),
                async = require( 'async' ),
                queryDB;

            function getAnotherBorder( config ) {

                var tempBorder,
                    nextPosition = config.nextPosition,
                    targetPosition = config.targetPosition,
                    direction = config.direction,
                    result = moment( targetPosition ).add( direction * 10, 'm' );

                if( nextPosition ) {
                    tempBorder = moment( nextPosition );
                    if( 600000 >= Math.abs( targetPosition.diff( tempBorder ) ) && targetPosition.date() === tempBorder.date() ) {
                        result = tempBorder;
                        return result;
                    }
                }
                if( result.isAfter( moment() ) ) {
                    result = moment();
                }
                if( targetPosition.date() !== result.date() ) {
                    if( -1 === direction ) {
                        result = targetPosition.clone().startOf( 'day' );
                    } else {
                        result = targetPosition.clone().endOf( 'day' );
                    }
                }
                return result;
            }

            if( -1 === direction ) {
                queryDB = {timestamp: {$lt: new Date( queryParams.targetPosition )}};
            } else {
                queryDB = {timestamp: {$gt: new Date( queryParams.targetPosition )}};
            }
            queryDB.timestamp.$exists = true;
            async.parallel( {
                targetActivity( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: target
                        },
                        options: {
                            limit: 1,
                            lean: true,
                            select: {
                                timestamp: 1,
                                time: 1,
                                status: 1,
                                actType: 1,
                                patientId: 1,
                                caseFolderId: 1,
                                locationId: 1
                            }
                        }
                    }, ( err, results ) => done( err, results && results[0] ) );
                },
                closestActivity( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activity',
                        action: 'get',
                        query: queryDB,
                        options: {
                            limit: 1,
                            sort: {timestamp: direction},
                            lean: true,
                            select: {
                                timestamp: 1,
                                time: 1,
                                status: 1
                            }
                        }
                    }, ( err, results ) => done( err, results && results[0] ) );
                }
            }, function( err, results ) {
                var
                    newTimestamp,
                    anotherBorder;
                if( err ) {
                    return args.callback( err );
                }

                if( results.targetActivity ) {
                    let
                        targetActivity = results.targetActivity,
                        closestActivity = results.closestActivity;
                    if( 'VALID' !== targetActivity.status && 'CREATED' !== targetActivity.status ) {
                        Y.log( `move activity error: Only valid or created activity can be moved`, 'error', NAME );
                        return args.callback( new Y.doccirrus.commonerrors.DCError( 403, {message: 'Only valid activity can be moved'} ) );
                    }
                    if( targetActivity.time ) {
                        let
                            targetDate = moment( targetPosition );
                        newTimestamp = moment( targetActivity.timestamp ).set( {
                            year: targetDate.year(),
                            month: targetDate.month(),
                            date: targetDate.date()
                        } );
                    } else {
                        anotherBorder = getAnotherBorder( {
                            direction: direction,
                            nextPosition: closestActivity && closestActivity.timestamp,
                            targetPosition: targetPosition
                        } );
                        newTimestamp = targetPosition.clone().subtract( targetPosition.diff( anotherBorder ) / 2, 'ms' );
                    }

                    //save new timestamp
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activity',
                        action: 'put',
                        fields: ['timestamp'],
                        query: {
                            _id: targetActivity._id.toString()
                        },
                        data: Y.doccirrus.filters.cleanDbObject( {timestamp: newTimestamp.toISOString()} )
                    }, function( err ) {
                        args.callback( err );
                    } );
                } else {
                    return args.callback( err );
                }
            } );

        }

        function saveFile( args ) {
            var queryParams = args.query || {},
                callback = args.callback,
                user = args.user,
                targetActivityId = queryParams.targetId,
                file = queryParams.file,
                async = require( 'async' ),
                ownerCollection = 'activity',
                mimeTypeReg = /^data:(.+);base64,/,
                mimeType = '',
                activity,
                mediaId = '',
                documentId = '',
                from = queryParams.from;

            if( !file || !targetActivityId ) {
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid data' ) );
            }
            mimeType = mimeTypeReg.exec( file.dataURL )[1];

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        user: user,
                        action: 'get',
                        query: {
                            _id: targetActivityId
                        }
                    }, function( err, results ) {
                        var error;
                        //mongooselean.toObject
                        activity = results && results[0];
                        if( err || !activity ) {
                            error = err || Y.doccirrus.errors.rest( 400, 'target activity not found, id: ' + targetActivityId );
                            Y.log( JSON.stringify( error ), 'error', NAME );
                            return next( error );
                        }
                        next( err, activity );
                    } );
                },
                function( activity, next ) {
                    Y.doccirrus.api.media.upload64( {
                        user: user,
                        originalParams: {
                            ownerCollection: ownerCollection,
                            ownerId: activity._id.toString(),
                            source: file.dataURL,
                            name: file.filename,
                            fileName: file.filename
                        },
                        callback: next
                    } );
                },
                function( mediaObjects, next ) {
                    var
                        mime = mimeType && mimeType.toLowerCase(),
                        ext = Y.doccirrus.media.getExt( mime ),
                        data = {
                            type: 'OTHER',
                            contentType: mime,
                            createdOn: moment().utc().toJSON(),
                            isEditable: false,
                            locationId: activity.locationId,
                            //accessBy: [ user.identityId ],
                            accessBy: [],
                            url: '/media/' + mediaObjects._id + '_original.' + mime + '.' + ext + '?from=' + from,
                            mediaId: mediaObjects._id,
                            caption: file.filename,
                            attachedTo: activity.patientId,     //  deprecated, see MOJ-9190
                            patientId: activity.patientId,
                            activityId: activity._id
                        };
                    mediaId = mediaObjects._id;
                    data = Y.doccirrus.filters.cleanDbObject( data );
                    Y.doccirrus.mongodb.runDb( {
                        model: 'document',
                        action: 'post',
                        user: user,
                        data: data
                    }, next );
                },
                function( documentIds, next ) {
                    var data = {
                        attachments: activity.attachments
                    };
                    documentId = documentIds && documentIds[0];
                    data.attachments.push( documentId );
                    data = Y.doccirrus.filters.cleanDbObject( data );
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'put',
                        fields: ['attachments'],
                        data: data,
                        query: {
                            _id: activity._id
                        }
                    }, next );
                }
            ], function( err, results ) {
                if( err ) {
                    Y.log( `Error while updating activity: ${activity && activity._id}`, 'error', NAME );
                    if( documentId ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'delete',
                            model: 'document',
                            query: {
                                _id: documentId.toString()
                            }
                        } );
                    }
                    if( mediaId ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'media',
                            action: 'delete',
                            query: {
                                _id: mediaId.toString()
                            }
                        } );
                    }
                    return callback( err );
                }
                callback( err, results );
            } );
        }

        /**
         *  Deletes activity through FSM.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {String}    args.query._id      Activity to delete
         *  @param  {Object}    args.callback       Of the form fn( err, fsmTransitionResponse )
         *  @returns {*}
         */
        function deleteActivity( args ) {
            var user = args.user,
                callback = args.callback,
                query = args.query;
            if( !query || !query._id ) {
                return callback( Y.doccirrus.errors.rest( 400, '_id is missing' ) );
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'activity',
                query: {
                    _id: query._id
                },
                options: {
                    lean: true
                }
            }, function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                if( !results[0] ) {
                    Y.log( 'Can not delete activity with _id:' + query._id + '. Activity not found.', 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 400, 'Can not delete activity with _id:' + query._id + '. Activity not found.' ) );
                }
                Y.doccirrus.activityapi.doTransition( user, {}, results[0], 'delete', false, callback );
            } );

        }

        function createActivitiesFromCatalogusage( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createActivitiesFromCatalogusage', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createActivitiesFromCatalogusage' );
            }
            const
                user = args.user,
                params = args.originalParams,
                oldActivity = params.oldActivity,
                quantities = params.quantities || {},
                titles = params.titles || {},
                explanations = params.explanations || {},
                billingFactors = params.billingFactors || {},
                callback = args.callback,
                async = require( 'async' ),
                moment = require( 'moment' );

            let
                additionalMedicationData,
                queueKey = {},
                cacheObj = {},
                catalogUsageEntries,
                timeshift = 0,
                dignitiesAndTarmedCodes = [];

            function finalCb( err ) {
                if( dignitiesAndTarmedCodes.length ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'TREATMENT_DIGNITIES_ERROR',
                        msg: {
                            data: dignitiesAndTarmedCodes
                        }
                    } );
                }
                if( err ) {
                    Y.log( 'could not create activities from catalogusage entries ' + err, 'error', NAME );
                    return callback( err );
                }

                callback();

            }

            function iterate( catalogUsageEntry, _cb ) {
                let entries,
                    quantity = quantities[catalogUsageEntry._id] || 1,
                    title = titles[catalogUsageEntry._id],
                    explanation = explanations[catalogUsageEntry._id],
                    explanationsIsTemplate = quantity > 1 && (-1 !== (explanation || '').indexOf( '#' )),
                    explanationsArray = explanationsIsTemplate ? explanation.split( '#' ).map( el => el.trim() ) : [],
                    billingFactor = billingFactors[catalogUsageEntry._id],
                    activities;
                const
                    isLastCatalogUsage = catalogUsageEntries && catalogUsageEntries.indexOf( catalogUsageEntry ) === catalogUsageEntries.length - 1;

                function createActivity( entry, cb ) {

                    var activity = JSON.parse( JSON.stringify( oldActivity ) );
                    const
                        isLastActivity = activities && activities.indexOf( entry ) === activities.length - 1;

                    async function activityDataSetCb( err, newActivity ) {
                        if( err ) {
                            return cb( err );
                        }
                        Y.mix( newActivity, activity );

                        //recalculate hierarchy rules if needed
                        let hierarchyRules = [], catalogQuery;

                        // get code and fields from catalog
                        if( 'Hauptleistung' === newActivity.treatmentCategory && newActivity.code ) {
                            let groupCodes,
                                excludedDivisionCodes = ['5000'], //codes should not be visible in practice
                                blockRules = (entry.u_extra && entry.u_extra.blocRules || []).map( function( i ) {
                                    return i.code;
                                } ),
                                hasImagingDevice,
                                result;
                            if( newActivity && newActivity.u_extra && newActivity.u_extra.treatmentGroups ) {
                                groupCodes = newActivity.u_extra.treatmentGroups.map( i => {
                                    return i.code;
                                } );
                            }

                            if( groupCodes && groupCodes.length ) {
                                catalogQuery = {
                                    $or: [
                                        {
                                            treatmentCategory: 'Referenzleistung',
                                            divisionCode: {$nin: excludedDivisionCodes},
                                            'u_extra.cumulationRules': {
                                                $elemMatch: {
                                                    'slaveSeq': {$in: groupCodes},
                                                    'slaveType': 'G',
                                                    'type': 'X'
                                                }
                                            }
                                        },
                                        {
                                            treatmentCategory: 'Zuschlagsleistung',
                                            'u_extra.hierarchyRules.seq': newActivity.code
                                        }]
                                };

                                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'get',
                                    model: 'invoiceconfiguration',
                                    options: {
                                        lean: true
                                    }
                                } ) );

                                if( err ) {
                                    // continue
                                    Y.log( `createAndLinkTarmedTreatments: Error in getting invoiceconfiguration. ${err.stack || err}`, 'error', NAME );
                                    hasImagingDevice = false;
                                }

                                if( result && result[0] ) {
                                    hasImagingDevice = result[0].hasImagingDevice;
                                }

                                if( hasImagingDevice && blockRules.length ) {
                                    let divisionCode = entry.divisionCode && entry.divisionCode.toString(),
                                        orQuery = {
                                            $and: [
                                                {divisionCode: {$nin: excludedDivisionCodes}},
                                                {divisionCode: divisionCode}
                                            ],
                                            treatmentCategory: 'Referenzleistung',
                                            'u_extra.blocRules.code': {$in: blockRules}
                                        };

                                    orQuery.seq = {$in: ['39.2000', '39.3800', '39.5300', '39.4300', '39.7300']};
                                    catalogQuery.$or.push( orQuery );
                                }

                            } else {
                                catalogQuery = {
                                    treatmentCategory: 'Zuschlagsleistung',
                                    'u_extra.hierarchyRules.seq': newActivity.code
                                };
                            }
                        }

                        if( 'Zuschlagsleistung' === newActivity.treatmentCategory && newActivity.u_extra && newActivity.u_extra.hierarchyRules && newActivity.u_extra.hierarchyRules.length ) {
                            let codes = newActivity.u_extra.hierarchyRules.map( el => el.seq );
                            catalogQuery = {
                                treatmentCategory: 'Hauptleistung',
                                seq: {$in: codes}
                            };
                        }

                        if( 'Referenzleistung' === newActivity.treatmentCategory && newActivity.u_extra && newActivity.u_extra.cumulationRules && newActivity.u_extra.cumulationRules.length ) {
                            let codes = newActivity.u_extra.cumulationRules.filter( item => {
                                return "X" === item.type && "G" === item.slaveType;
                            } ).map( item => {
                                return item.slaveSeq;
                            } );
                            catalogQuery = {
                                'u_extra.treatmentGroups.code': {$in: codes}
                            };
                        }

                        if( catalogQuery ) {
                            let
                                catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                                    actType: newActivity.actType,
                                    short: newActivity.catalogShort
                                } ),
                                [err, catalogCodes] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                    user: Y.doccirrus.auth.getSUForLocal(),
                                    model: 'catalog',
                                    query: {
                                        ...catalogQuery,
                                        catalog: catalogDescriptor && catalogDescriptor.filename || ''
                                    },
                                    options: {
                                        select: {
                                            seq: 1,
                                            validFrom: 1,
                                            validUntil: 1,
                                            title: 1
                                        }
                                    }
                                } ) );
                            if( err ) {
                                Y.log( `createActivityFromCatalogUsage: Error in getting hierarchy rules. ${err.stack || err}`, 'warn', NAME );
                            } else {
                                hierarchyRules = (catalogCodes || []).map( el => ({
                                    checked: false, //hence there are no main activity all hiererchy rules are unchecked / unlinked
                                    seq: el.seq,
                                    title: el.title,
                                    validFrom: el.validFrom,
                                    validUntil: el.validUntil
                                }) );
                            }
                        }
                        newActivity.hierarchyRules = hierarchyRules;

                        newActivity.skipcheck_ = true;
                        let error, employee;

                        [error, employee] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            migrate: true,
                            query: {
                                _id: newActivity.employeeId
                            },
                            options: {
                                select: {
                                    qualiDignities: 1
                                }
                            }
                        } ) );

                        if( error ) {
                            Y.log( `Error trying to get employees for activities from invoice. ${error.stack || error}`, 'error', NAME );
                            return callback( error );
                        }

                        if( 'TREATMENT' === newActivity.actType
                            && ('TARMED' === newActivity.catalogShort || 'TARMED_UVG_IVG_MVG' === newActivity.catalogShort) ) {
                            let
                                dignities = employee && employee[0] && employee[0].qualiDignities || [],
                                qualDignities = newActivity.u_extra && newActivity.u_extra.dignityRules && newActivity.u_extra.dignityRules.qualDignity,
                                dignitiesCodes = (qualDignities || []).map( function( i ) {
                                    return i.code;
                                } ),
                                hasDignity;

                            if( !dignities.length ) {
                                for( let code of dignitiesCodes ) { //eslint-disable-line no-unused-vars
                                    dignitiesAndTarmedCodes.push( {
                                        actCode: newActivity.code,
                                        code
                                    } );
                                }
                                return cb( null );
                            }

                            hasDignity = dignitiesCodes.some( function( i ) {
                                return -1 !== dignities.indexOf( i );
                            } );

                            if( !hasDignity ) {
                                for( let code of dignitiesCodes ) { //eslint-disable-line no-unused-vars
                                    if( -1 === dignities.indexOf( code ) ) {
                                        dignitiesAndTarmedCodes.push( {
                                            actCode: newActivity.code,
                                            code
                                        } );
                                    }
                                }
                                return cb( null );
                            }
                        }

                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'post',
                            model: 'activity',
                            data: newActivity,
                            context: {
                                weakQueueKey: queueKey,
                                isLastInBatch: isLastCatalogUsage && isLastActivity,
                                cache: cacheObj
                            }
                        }, cb );
                    }

                    function setActivityData() {
                        let setActivityDataOptions;

                        // merge in table editor data
                        if( title ) {
                            entry.title = title;
                        }

                        if( explanationsIsTemplate ) {
                            let newExplanation = explanationsArray.shift();
                            activity.explanations = newExplanation;
                            entry.explanations = newExplanation;
                        } else if( explanation ) {
                            activity.explanations = explanation;
                            entry.explanations = explanation;
                        }

                        if( billingFactor && ['GOÄ', 'AMTS'].includes( activity.catalogShort ) ) {
                            activity.billingFactorValue = billingFactor;
                            setActivityDataOptions = {
                                skipBillingFactorCalculation: true
                            };
                        }

                        //shift timestamp by 50ms
                        timeshift += 50; // prepend is important for save ++ functionality
                        activity.timestamp = moment( activity.timestamp ).add( timeshift, 'millisecond' ).toISOString();

                        Y.doccirrus.schemas.activity._setActivityData( {
                            initData: activity,
                            entry: entry,
                            user: user,
                            options: setActivityDataOptions,
                            locationId: activity.locationId
                        }, activityDataSetCb );
                    }

                    if( 'MEDICATION' === activity.actType ) {
                        Y.doccirrus.api.catalogusage.getMMIActualData( {
                            user: user,
                            query: {
                                pzn: entry.phPZN,
                                patientAge: additionalMedicationData.patientData.age,
                                bsnr: additionalMedicationData.commercialNo || '',
                                lanr: additionalMedicationData.officialNo || '',
                                insuranceIknr: additionalMedicationData.patientData.iknr || ''
                            },
                            callback: function( err, result ) {
                                // not all customers have mmi installed so this maybe fails if MMI is not running
                                Y.log( 'try t oget MMI actual data failed ' + err, 'debug', NAME );
                                if( !err && result ) {
                                    Y.each( result, function( value, key ) {
                                        if( undefined !== entry[key] ) {
                                            entry[key] = value;
                                        }
                                    } );
                                }
                                setActivityData();
                            }
                        } );
                    } else if( ['GOÄ', 'UVGOÄ', 'AMTS'].includes( activity.catalogShort ) ) {
                        Y.doccirrus.api.catalog.get( {
                            user: user,
                            query: {
                                catalog: entry.catalogRef,
                                seq: entry.seq
                            },
                            itemsPerPage: 1,
                            callback: function( err, result ) {
                                var catalogData;
                                if( err ) {
                                    return cb( err );
                                }
                                catalogData = result && result[0];
                                if( catalogData ) {
                                    Y.each( catalogData, function( value, key ) {
                                        if( undefined !== entry[key] ) {
                                            entry[key] = value;
                                        }
                                    } );
                                }
                                setActivityData();
                            }
                        } );
                    } else {
                        setActivityData();
                    }

                }

                if( quantities[catalogUsageEntry._id] && 1 < quantities[catalogUsageEntry._id] ) {
                    entries = [];
                    for( let i = 0; i < quantity; i++ ) {
                        entries.push( JSON.parse( JSON.stringify( catalogUsageEntry ) ) );
                    }
                    activities = entries;
                    async.eachSeries( entries, createActivity, _cb );
                } else {
                    activities = [catalogUsageEntry];
                    createActivity( catalogUsageEntry, _cb );
                }
            }

            function catalogusageCb( err, entries ) {
                Y.doccirrus.weakQueue.newQueue( queueKey );
                catalogUsageEntries = entries;
                if( err ) {
                    Y.log( 'could not get catalogusage entries while creating activities from catalogusage entries ' + err, 'error', NAME );
                    return callback( err );
                }
                async.eachSeries( entries, iterate, finalCb );

            }

            if( !Array.isArray( params.catalogusageIds ) || !oldActivity ) {
                return callback( new Error( 'insufficient arguments' ) );
            }

            function getCatalogUsageEntries( err ) {
                if( err ) {
                    Y.log( 'could not get patient data', 'error', NAME );
                    return callback( err );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    query: {
                        _id: {$in: params.catalogusageIds}
                    },
                    options: {
                        lean: true
                    }
                }, catalogusageCb );
            }

            if( 'MEDICATION' === oldActivity.actType ) {
                async.parallel( {
                    commercialNo: function( cb ) {

                        function locationCb( err, locations ) {
                            if( err ) {
                                return cb( err );
                            }
                            cb( null, locations[0] && locations[0].commercialNo );
                        }

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            query: {
                                _id: oldActivity.locationId
                            }
                        }, locationCb );

                    },
                    officialNo: function( cb ) {
                        function employeeCb( err, employees ) {
                            if( err ) {
                                return cb( err );
                            }
                            cb( null, employees[0] && employees[0].officialNo );
                        }

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            query: {
                                _id: oldActivity.employeeId
                            }
                        }, employeeCb );
                    },
                    patientData: function( cb ) {

                        async function patientCb( err, patients ) {
                            var patientData = {},
                                patient, insurance, deathmom;
                            if( err ) {
                                return cb( err );
                            }

                            if( patients[0] ) {

                                let [caseFoldersErr, caseFolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'casefolder',
                                    action: 'get',
                                    query: {
                                        _id: oldActivity.caseFolderId
                                    },
                                    options: {
                                        lean: true,
                                        limit: 1
                                    }
                                } ) );
                                if( caseFoldersErr ) {
                                    Y.log( `could not get case folder for treatment pipeline: ${caseFoldersErr.stack || caseFoldersErr}`, 'warn', NAME );
                                }

                                const caseFolder = caseFolders && caseFolders[0];
                                const publicInsuranceType = caseFolder && caseFolder.type && caseFolder.type.startsWith( 'PUBLIC' ) ? caseFolder.type : 'PUBLIC';

                                patient = patients[0];
                                // MOJ-14319: [OK] [CARDREAD]
                                insurance = Y.doccirrus.schemas.patient.getInsuranceByType( patient, publicInsuranceType );
                                deathmom = patient.dateOfDeath;
                                patientData.age = deathmom ? (patient.kbvDob ? moment( deathmom ).diff( moment( patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '') :
                                    (patient.kbvDob ? moment().diff( moment( patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '');
                                patientData.iknr = insurance && insurance.insuranceId;
                            }

                            cb( null, patientData );
                        }

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patient',
                            query: {
                                _id: oldActivity.patientId
                            }
                        }, patientCb );
                    }
                }, function( err, results ) {
                    if( err ) {
                        Y.log( 'could not get patient data ' + err, 'error', NAME );

                        return callback( err );
                    }
                    additionalMedicationData = results;
                    getCatalogUsageEntries();

                } );
            } else {
                getCatalogUsageEntries();
            }
        }

        /**
         * Checks if it is possible to create BL with codes in case folder
         * @method isLegalBLForCaseFolder
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId patient id
         * @param {String} args.query.caseFolderId target case folder id
         * @param {String} args.query.actType actType of Schein
         * @param {String} [args.query._id] _id of Schein
         * @param {Object} args.data
         * @param {Array} args.data.codes treatments codes for new BL Schein
         * @param {Function} args.callback
         * @returns {*}
         */
        function isLegalBLForCaseFolder( args ) {
            var user = args.user,
                data = args.data || {},
                query = args.query || {},
                callback = args.callback,
                async = require( 'async' ),
                legal = true,
                openedStatuses = ['VALID', 'APPROVED'];
            if( !data.codes ) {
                return callback( Y.doccirrus.errors.rest( 400, 'codes are missing', true ) );
            }
            async.waterfall( [
                function( next ) {
                    var _query = {
                        patientId: query.patientId,
                        caseFolderId: query.caseFolderId,
                        actType: query.actType,
                        status: {$in: openedStatuses},
                        fk4235Set: {
                            $exists: true,
                            $not: {$size: 0}
                        }
                    };
                    if( query._id ) {
                        _query._id = {
                            $ne: query._id
                        };
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'count',
                        query: _query
                    }, next );
                },
                function( count, next ) {
                    var _query = {
                        actType: query.actType,
                        caseFolderId: query.caseFolderId,
                        patientId: query.patientId,
                        status: {$in: openedStatuses},
                        $or: [
                            {'fk4235Set.fk4244Set.fk4244': {$in: data.codes}},
                            {'fk4235Set.fk4256Set.fk4244': {$in: data.codes}}
                        ]
                    };
                    if( !count ) {
                        return next( null, true );
                    }
                    if( query._id ) {
                        _query._id = {
                            $ne: query._id
                        };
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'activity',
                        query: _query,
                        options: {
                            sort: {
                                timestamp: -1
                            },
                            limit: 1,
                            lean: true
                        }
                    }, function( err, results ) {
                        var schein,
                            codes = [];
                        if( err ) {
                            return callback( err );
                        }
                        schein = results[0];
                        legal = false;
                        if( schein ) {
                            schein.fk4235Set.forEach( function( fk4235 ) {
                                ((fk4235.fk4244Set || []).concat( (fk4235.fk4256Set || []) )).forEach( function( fk4244 ) {
                                    codes.push( fk4244.fk4244 );
                                } );
                            } );
                            legal = (codes.length === data.codes.length) && codes.every( function( code ) {
                                return -1 !== data.codes.indexOf( code );
                            } );
                        }
                        next( err, legal );
                    } );
                }
            ], function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, [results] );
            } );

        }

        /**
         * Recalculates BL of entire case folder
         * Only VALID and APPROVED scheins/treatments are involved in this process
         * @method recalcBLInCaseFolder
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.caseFolderId
         * @param {String} args.query.patientId
         * @param {String} [args.query.parentId] if specified, will update only chain of the parent Schein
         * @param {Object} args.options
         * @param {Boolean} [args.options.quiet=false] if true, does not emit 'system.BL_EXCEEDED' event, if BL is exceeded
         * @param {Boolean} [args.options.migrate=false] if true, run it with migrate mode
         * @param {Object} args.callback
         */
        function recalcBLInCaseFolder( args ) {
            var
                async = require( 'async' ),
                moment = require( 'moment' ),
                {user, options: {migrate} = {}} = args,
                queryParams = args.query,
                finalCb = args.callback,
                skipExceededCheck = args.options && args.options.quiet,
                model = 'activity',
                openedStatuses = ['VALID', 'APPROVED'],
                activitiesMap = {};

            function updateSchein( schein, callback ) {
                var codes = [];
                Y.log( 'Updating BL of Schein, id: ' + schein._id, 'debug', NAME );

                if( schein.activities && 1 === schein.activities.length ) {
                    if( !activitiesMap[schein.activities[0]] ) {
                        Y.log( 'Child schein does not have parent, or it has timestamp < than parent timestamp.', 'error', NAME );
                        return callback( Y.doccirrus.errors.rest( 18004, '', true ) );
                    }
                } else {
                    activitiesMap[schein._id.toString()] = {
                        timestamp: schein.timestamp,
                        childs: [],
                        amount: {}
                    };
                }

                schein.fk4235Set.forEach( function( fk4235 ) {
                    ((fk4235.fk4244Set || []).concat( (fk4235.fk4256Set || []) )).forEach( function( fk4244 ) {
                        if( -1 === codes.indexOf( fk4244.fk4244 ) ) {
                            codes.push( fk4244.fk4244 );
                        }
                    } );
                } );
                async.each( codes, function( code, done ) {
                    updateAmountOfCode( code, schein, done );
                }, function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    saveSchein( schein, function( err ) {
                        if( err ) {
                            return callback( err );
                        }
                        evaluateBL( {user, data: {schein}} );
                        callback();
                    } );
                } );
            }

            function findNext( options, callback ) {
                var query = {
                    caseFolderId: queryParams.caseFolderId,
                    patientId: queryParams.patientId,
                    status: {$in: openedStatuses},
                    fk4235Set: {
                        $exists: true,
                        $not: {$size: 0}
                    }
                };
                if( queryParams.parentId ) {
                    //if we want to update specific chain
                    query.activities = queryParams.parentId;
                }
                options = options || {};
                if( options.timestamp ) {
                    query.timestamp = {
                        $gt: options.timestamp
                    };
                }
                if( options.code ) {
                    query.$or = [
                        {'fk4235Set.fk4244Set.fk4244': options.code},
                        {'fk4235Set.fk4256Set.fk4244': options.code}
                    ];
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'get',
                    query: query,
                    migrate,
                    options: {
                        sort: {
                            timestamp: 1
                        },
                        limit: 1,
                        lean: true
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( results[0] ) {
                        results[0]._id = results[0]._id.toString();
                    }
                    callback( err, results[0] );
                } );

            }

            function saveSchein( schein, callback ) {
                async.series( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'update',
                            migrate,
                            query: {
                                _id: schein._id
                            },
                            data: {
                                fk4235Set: schein.fk4235Set,
                                content: Y.doccirrus.schemas.activity.generateContent( schein )
                            }
                        }, next );
                    },
                    function( next ) {
                        Y.doccirrus.api.patient.updateAttachedContent( {
                            user: user,
                            data: {
                                activity: schein
                            },
                            callback: next
                        } );
                    }
                ], callback );
            }

            function updateAmountOfCode( code, schein, callback ) {
                async.waterfall( [
                    function( next ) {
                        findNext( {
                                timestamp: schein.timestamp,
                                code: code
                            },
                            next );
                    }, function( nextSchein, next ) {
                        var endPoint = moment( nextSchein && nextSchein.timestamp ).toISOString(),
                            startPoint = moment( schein.timestamp ).toISOString();
                        countTreatments( {
                            start: startPoint,
                            end: endPoint,
                            code,
                            locationId: schein.locationId
                        }, next );
                    }, function( amount, next ) {
                        schein.fk4235Set.some( function( fk4235 ) {
                            return ((fk4235.fk4244Set || []).concat( (fk4235.fk4256Set || []) )).some( function( fk4244 ) {
                                if( code === fk4244.fk4244 ) {
                                    // MOJ-8549: PRF11/21 allow initial values for fk4246
                                    fk4244.fk4246 = fk4244.fk4246Offset ? (+fk4244.fk4246Offset + amount) : amount;
                                    if( activitiesMap[schein._id] ) {
                                        // this is 'parent' or independent Schein
                                        activitiesMap[schein._id].amount[code] = amount;
                                    } else {
                                        //this is 'child' Schein
                                        //calculate amount = <own amount> + <parent amount> + <all prev children amount(for the code)>
                                        fk4244.fk4246 = fk4244.fk4246 + (activitiesMap[schein.activities[0]].amount[code] || 0);
                                        activitiesMap[schein.activities[0]].childs.forEach( function( child ) {
                                            if( child.code === code ) {
                                                fk4244.fk4246 = fk4244.fk4246 + child.amount;
                                            }
                                        } );
                                        activitiesMap[schein.activities[0]].childs.push( {
                                            code: code,
                                            amount: amount
                                        } );
                                    }
                                    Y.log( 'Amount of BL with code: ' + code + ', was updated. New value: ' + fk4244.fk4246 + '. Schein id: ' + schein._id, 'debug', NAME );
                                    return true;
                                }
                                return false;
                            } );
                        } );

                        if( !skipExceededCheck && ['VALID', 'APPROVED'].includes( schein.status ) ) {
                            const hasExceeded = schein.fk4235Set.some( function( fk4235 ) {
                                const sumTreatments = ( sum, entry ) => sum + Number( entry.fk4246 || 0 );
                                const maxTreatmentsOfInsuredPerson = fk4235.fk4252;
                                const maxTreatmentsOfCareGiver = fk4235.fk4255;
                                const sumTreatmentsOfInsuredPerson = (fk4235.fk4244Set || []).reduce( sumTreatments, 0 );
                                const sumTreatmentsOfCareGiver = (fk4235.fk4256Set || []).reduce( sumTreatments, 0 );
                                return (!maxTreatmentsOfInsuredPerson || sumTreatmentsOfInsuredPerson > maxTreatmentsOfInsuredPerson) &&
                                       (!maxTreatmentsOfCareGiver || sumTreatmentsOfCareGiver > maxTreatmentsOfCareGiver);
                            } );
                            if( hasExceeded ) {
                                Y.doccirrus.communication.emitEventForUser( {
                                    targetId: args.user.identityId,
                                    event: 'system.BL_EXCEEDED',
                                    msg: {
                                        error: {},
                                        data: {
                                            caseFolderId: queryParams.caseFolderId
                                        }
                                    }
                                } );
                            }
                        }

                        next();
                    }
                ], callback );
            }

            function countTreatments( config, callback ) {
                let
                    {start, end, code, locationId} = config,
                    openedTreatmentStatuses = ['VALID', 'APPROVED', 'BILLED'],
                    _query = {
                        actType: 'TREATMENT',
                        caseFolderId: queryParams.caseFolderId,
                        patientId: queryParams.patientId,
                        locationId: {$in: [locationId]},
                        code: code,
                        timestamp: {
                            $gt: new Date( start ),
                            $lt: new Date( end )
                        },
                        status: {$in: openedTreatmentStatuses}
                    },
                    async = require( 'async' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.location.getLocationSet( {
                            user,
                            query: {
                                _id: locationId
                            },
                            options: {
                                migrate,
                                select: {
                                    _id: 1
                                },
                                lean: true
                            },
                            callback( err, locations ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( locations.length ) {
                                    _query.locationId.$in = locations.map( location => location._id.toString() );
                                }
                                next( null );
                            }
                        } );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: model,
                            migrate,
                            action: 'count',
                            query: _query
                        }, next );
                    }
                ], callback );
            }

            function checkNext( timestamp ) {
                Y.log( 'Looking for first Schein since: ' + ((timestamp && timestamp.toISOString()) || 'beginning of the case folder'), 'debug', NAME );
                findNext( {timestamp: timestamp}, function( err, activity ) {
                    if( err ) {
                        return finalCb( err );
                    }
                    if( !activity ) {
                        Y.log( 'All Scheins are updated in case folder with id: ' + queryParams.caseFolderId, 'debug', NAME );
                        return finalCb();
                    }
                    updateSchein( activity, function( err ) {
                        if( err ) {
                            return finalCb( err );
                        }
                        checkNext( activity.timestamp );
                    } );
                } );
            }

            checkNext();
        }

        /**
         * Returns youngest BL Schein in the case folder
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} args.query.caseFolderId
         * @param {Object} args.callback
         */
        function getBLOfLastSchein( args ) {
            var
                user = args.user,
                queryParams = args.query,
                callback = args.callback,
                model = 'activity';
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'get',
                query: {
                    patientId: queryParams.patientId,
                    caseFolderId: queryParams.caseFolderId,
                    fk4235Set: {
                        $exists: true,
                        $not: {$size: 0}
                    }
                },
                options: {
                    sort: {
                        timestamp: -1
                    },
                    limit: 1,
                    lean: true,
                    select: {
                        fk4235Set: 1
                    }
                }
            }, function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, results );
            } );

        }

        /**
         * Creates activity(ties) from jawbone data
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.jawboneData jawbone data
         * @param {String} args.data.patientId patient id
         * @param {Function} args.callback
         * @returns {*}
         */
        function createJawboneActivity( args ) {
            var
                moment = require( 'moment' ),
                async = require( 'async' ),
                user = args.user,
                callback = args.callback,
                data = args.data || {},
                jawboneData = data.jawboneData,
                patientId = data.patientId,
                preparedData,
                i18n = Y.doccirrus.i18n,
                FROM_PATIENT = i18n( 'activity-api.createJawboneActivity.FROM_PATIENT' ),
                CALORIES_SHORT = i18n( 'general.text.CALORIES_SHORT' ),
                SLEEP = i18n( 'PatPortalMojit.jawboneAPI.title.SLEEP' ),
                WEIGHT = i18n( 'PatPortalMojit.jawboneAPI.title.WEIGHT' ),
                HEART_RATE = i18n( 'PatPortalMojit.jawboneAPI.title.HEART_RATE' );

            Y.log( 'Received jawbone data. Creating jawbone activities', 'debug', NAME );
            if( !data.patientId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'patient id is missing'} ) );
            }
            if( !jawboneData ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'jawbone data is missing'} ) );
            }

            function getUserContent( data ) {
                var result = 'Jawbone:: ',
                    mealCalories = 0,
                    burnedCalories = 0,
                    sleepDuration = 0,
                    weight,
                    heartrate;
                if( data.meal && data.meal.items ) {
                    data.meal.items.forEach( function( meal ) {
                        mealCalories += meal.details.calories || 0;
                    } );
                }
                result += ' ' + CALORIES_SHORT + ': +' + Math.round( mealCalories ) + '/-';
                if( data.move ) {
                    burnedCalories += (data.move.details.calories || 0) + (data.move.details.bmr || 0);
                }
                result += Math.round( burnedCalories ) + ', ' + SLEEP + ': ';
                if( data.sleep && data.sleep.items ) {
                    data.sleep.items.forEach( function( sleep ) {
                        sleepDuration += sleep.details.duration - sleep.details.awake;
                    } );
                }
                sleepDuration = moment.duration( sleepDuration, 's' );
                result += sleepDuration.hours() + ':' + sleepDuration.minutes();
                if( data.weight && data.weight.items ) {
                    weight = data.weight.items[data.weight.items.length - 1].weight;
                    result += ', ' + WEIGHT + ': ' + Math.floor( (weight * 10) / 10 );
                }
                if( data.heartrate && data.heartrate.items ) {
                    heartrate = data.heartrate.items[data.heartrate.items.length - 1].resting_heartrate;
                    if( heartrate ) {
                        result += ', ' + HEART_RATE + ': ' + heartrate;
                    }
                }
                return result;
            }

            function prepareData( jawboneData ) {
                var result = {};
                Y.Object.each( jawboneData, function( data, dataType ) {
                    if( data.items ) {
                        data.items.forEach( function( item ) {
                            if( item.date ) {
                                result[item.date] = result[item.date] || {
                                    date: item.date
                                };
                                if( 'move' === dataType ) {
                                    // user can have only one move object per day
                                    result[item.date][dataType] = result[item.date][dataType] || item;
                                } else {
                                    result[item.date][dataType] = result[item.date][dataType] || {
                                        items: []
                                    };
                                    result[item.date][dataType].items.push( item );
                                }

                            }
                        } );
                    }
                } );
                return result;
            }

            function createActivity( jawboneData, callback ) {
                var
                    currentTime = moment(),
                    newActivity = {
                        attachments: [],
                        timestamp: moment( jawboneData.date, 'YYYYMMDD' ).minutes( currentTime.minutes() ).seconds( currentTime.seconds() ).hours( currentTime.hours() ).toISOString(),
                        patientId: patientId,
                        status: 'VALID',
                        actType: 'FROMPATIENT',
                        d_extra: jawboneData
                    };
                if( !jawboneData ) {
                    return callback();
                }
                newActivity.userContent = getUserContent( jawboneData );
                async.waterfall( [
                        function( next ) {
                            // get Patient
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'patient',
                                action: 'get',
                                query: {
                                    _id: patientId
                                },
                                options: {
                                    limit: 1,
                                    select: {
                                        activeCaseFolderId: 1,
                                        insuranceStatus: 1
                                    }
                                }
                            }, function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( !results[0] ) {
                                    return next( new Y.doccirrus.commonerrors.DCError( 400, {message: 'patient not found. id: ' + data.patientId} ) );
                                }
                                if( !results[0].insuranceStatus.length ) {
                                    return next( new Y.doccirrus.commonerrors.DCError( 400, {message: 'patient should have insurance. id: ' + data.patientId} ) );
                                }
                                newActivity.locationId = results[0].insuranceStatus[0].locationId;
                                newActivity.employeeId = results[0].insuranceStatus[0].employeeId;
                                next( err );
                            } );

                        },
                        function( next ) {
                            // Get 'fromPatient' case folder
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'casefolder',
                                action: 'get',
                                query: {
                                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.FROM_PATIENT,
                                    patientId: patientId
                                },
                                options: {
                                    limit: 1
                                }
                            }, function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( results[0] ) {
                                    newActivity.caseFolderId = results[0]._id.toString();
                                }
                                next( err );
                            } );

                        },
                        function( next ) {
                            // if there is no 'fromPatient' case folder - create it
                            var caseFolderData;
                            if( newActivity.caseFolderId ) {
                                return next();
                            }
                            caseFolderData = {
                                title: FROM_PATIENT,
                                patientId: patientId,
                                start: moment().toISOString(),
                                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.FROM_PATIENT
                            };
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'post',
                                model: 'casefolder',
                                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                            }, function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                newActivity.caseFolderId = results[0];
                                next( err );
                            } );
                        },
                        function( next ) {
                            // if employee is not set - find first one of location
                            if( newActivity.employeeId ) {
                                return next();
                            } else {
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    action: 'get',
                                    model: 'employee',
                                    query: {
                                        'locations._id': newActivity.locationId
                                    },
                                    options: {
                                        limit: 1,
                                        select: {
                                            _id: 1
                                        }
                                    }
                                }, function( err, results ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    newActivity.employeeId = results[0] && results[0]._id.toString();
                                    next( err );
                                } );
                            }
                        },
                        function( next ) {
                            // save activity
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'post',
                                model: 'activity',
                                data: Y.doccirrus.filters.cleanDbObject( newActivity )
                            }, next );
                        }

                    ],
                    callback );
            }

            preparedData = prepareData( jawboneData );
            async.eachSeries( Object.keys( preparedData ), function( date, done ) {
                createActivity( preparedData[date], done );
            }, callback );
        }

        /**
         * Gets all activities which can be transfered. Patient portal.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getActivityForTransfer( args ) {
            var
                user = args.user,
                query = args.query,
                callback = args.callback,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.incaseconfiguration.isTransferAllowed( {
                        user: user,
                        callback: next
                    } );
                }, function( allowed, next ) {
                    if( allowed && allowed[0] ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'activity',
                            user: user,
                            query: query,
                            options: {
                                lean: true
                            }
                        }, function( err, results ) {
                            next( err, results );
                        } );
                    } else {
                        return next( null, [] );
                    }
                }
            ], callback );
        }

        /**
         * Gets patient sleep data
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Mixed} [args.query.patientId]
         * @param {Mixed} [args.query.timestamp]
         * @param {Mixed} [args.query.d_extra]
         * @param {Function} args.callback
         */
        function getDeviceSleepData( args ) {
            var
                user = args.user,
                callback = args.callback,
                query = args.query || {},
                async = require( 'async' ),
                i18n = Y.doccirrus.i18n,
                DEEP_SLEEP = i18n( 'InCaseMojit.casefile_detail.title.DEEP_SLEEP' ),
                LIGHT_SLEEP = i18n( 'InCaseMojit.casefile_detail.title.LIGHT_SLEEP' ),
                HOURS_SHORT = i18n( 'general.HOURS_SHORT' ),
                HOUR = i18n( 'general.HOUR' ),
                MINUTES_SHORT = i18n( 'general.MINUTES_SHORT' );

            /**
             * Converts seconds to hours
             * @param {Number} seconds
             * @returns {Number}
             */
            function formatSecondsToHours( seconds ) {
                var
                    duration,
                    result = seconds;
                if( seconds ) {
                    duration = moment.duration( seconds, 'seconds' );
                    result = duration.asHours();
                }
                return result;
            }

            /**
             * Converts seconds to string representation
             * @param {Number} seconds
             * @returns {String}
             */
            function formatSecondsToString( seconds ) {
                var
                    duration,
                    result = seconds;
                if( seconds ) {
                    duration = moment.duration( seconds, 'seconds' );
                    result = duration.hours() + ' ' + HOURS_SHORT + ' ' + duration.minutes() + ' ' + MINUTES_SHORT;
                }
                return result;
            }

            function formatItem( date ) {
                var
                    value = date.value;
                date.value = formatSecondsToHours( value );
                date.title = formatSecondsToString( value );
            }

            function formatSleepData( data ) {
                if( data.deepSleep ) {
                    data.deepSleep.unit = HOUR;
                    data.deepSleep.titleMax = formatSecondsToString( data.deepSleep.max );
                    data.deepSleep.max = formatSecondsToHours( data.deepSleep.max );
                    data.deepSleep.titleMin = formatSecondsToString( data.deepSleep.min );
                    data.deepSleep.min = formatSecondsToHours( data.deepSleep.min );

                    if( data.deepSleep.items ) {
                        data.deepSleep.items.forEach( formatItem );
                    }
                }
                if( data.lightSleep ) {
                    data.lightSleep.unit = HOUR;
                    data.lightSleep.titleMax = formatSecondsToString( data.lightSleep.max );
                    data.lightSleep.max = formatSecondsToHours( data.lightSleep.max );
                    data.lightSleep.titleMin = formatSecondsToString( data.lightSleep.min );
                    data.lightSleep.min = formatSecondsToHours( data.lightSleep.min );

                    if( data.lightSleep.items ) {
                        data.lightSleep.items.forEach( formatItem );
                    }

                }
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', next );
                },
                function( activityModel, next ) {
                    activityModel.mongoose.aggregate( [
                            {$match: query},
                            {
                                $sort: {
                                    timestamp: -1
                                }
                            },
                            {$limit: 10},
                            {
                                $project: {
                                    sleep: {$ifNull: ["$d_extra.sleep.items", [{}]]},
                                    type: {$literal: 'sleep'},
                                    timestamp: 1
                                }
                            },
                            {$unwind: '$sleep'},
                            {
                                $group: {
                                    _id: '$type',
                                    deepSleepItems: {
                                        $push: {
                                            value: '$sleep.details.sound',
                                            date: '$timestamp'
                                        }
                                    },
                                    deepSleepMax: {$max: '$sleep.details.sound'},
                                    deepSleepMin: {$min: '$sleep.details.sound'},
                                    lightSleepItems: {
                                        $push: {
                                            value: '$sleep.details.light',
                                            date: '$timestamp'
                                        }
                                    },
                                    lightSleepMax: {$max: '$sleep.details.light'},
                                    lightSleepMin: {$min: '$sleep.details.light'}
                                }
                            },
                            {
                                $project: {
                                    deepSleep: {
                                        type: {$literal: DEEP_SLEEP},
                                        items: '$deepSleepItems',
                                        max: '$deepSleepMax',
                                        min: '$deepSleepMin'
                                    },
                                    lightSleep: {
                                        type: {$literal: LIGHT_SLEEP},
                                        items: '$lightSleepItems',
                                        max: '$lightSleepMax',
                                        min: '$lightSleepMin'
                                    }
                                }
                            }
                        ], function( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            if( result[0] ) {
                                formatSleepData( result[0] );
                            }
                            next( err, result[0] );
                        }
                    );
                }
            ], callback );
        }

        /**
         * Gets patient calories data
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Mixed} [args.query.patientId]
         * @param {Mixed} [args.query.timestamp]
         * @param {Mixed} [args.query.d_extra]
         * @param {Function} args.callback
         */
        function getDeviceCaloriesData( args ) {
            var
                user = args.user,
                callback = args.callback,
                query = args.query || {},
                async = require( 'async' ),
                i18n = Y.doccirrus.i18n,
                CALORIES = i18n( 'general.text.CALORIES' ),
                CALORIES_SHORT = i18n( 'general.text.CALORIES_SHORT' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', next );
                },
                function( activityModel, next ) {
                    activityModel.mongoose.aggregate(
                        [
                            {$match: query},
                            {
                                $sort: {
                                    timestamp: -1
                                }
                            },
                            {$limit: 10},
                            {
                                $project: {
                                    items: {$ifNull: ['$d_extra.meal.items', [{}]]},
                                    date: '$timestamp',
                                    type: {
                                        $literal: CALORIES
                                    }
                                }
                            },
                            {$unwind: '$items'},
                            {
                                $group: {
                                    _id: '$date',
                                    type: {$last: '$type'},
                                    calories: {$sum: '$items.details.calories'}
                                }
                            },
                            {
                                $sort: {
                                    _id: -1
                                }
                            },
                            {
                                $group: {
                                    _id: '$type',
                                    type: {$last: '$type'},
                                    items: {
                                        $push: {
                                            value: '$calories',
                                            date: '$_id'
                                        }
                                    },
                                    max: {
                                        $max: '$calories'
                                    },
                                    min: {
                                        $min: '$calories'
                                    }
                                }
                            }
                        ], function( err, result ) {
                            var
                                data = result[0];
                            if( err ) {
                                return next( err );
                            }
                            if( data ) {
                                data.unit = CALORIES_SHORT;
                                data.items.forEach( function( item ) {
                                    item.formattedValue = Y.doccirrus.comctl.numberToLocalString( item.value, {decimals: 0} );
                                } );
                                data.formattedMax = Y.doccirrus.comctl.numberToLocalString( data.max, {decimals: 0} );
                                data.formattedMin = Y.doccirrus.comctl.numberToLocalString( data.min, {decimals: 0} );
                            }
                            next( err, data );
                        }
                    );
                }
            ], callback );
        }

        /**
         * Gets patient move(steps) data
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} [args.query.patientId]
         * @param {String} [args.query.timestamp]
         * @param {Object} [args.query.d_extra]
         * @param {Function} args.callback
         */
        function getDeviceMoveData( args ) {
            var
                user = args.user,
                callback = args.callback,
                query = args.query || {},
                async = require( 'async' ),
                i18n = Y.doccirrus.i18n,
                STEPS = i18n( 'InCaseMojit.casefile_detail.title.STEPS' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', next );
                },
                function( activityModel, next ) {
                    activityModel.mongoose.aggregate(
                        [
                            {$match: query},
                            {
                                $sort: {
                                    timestamp: -1
                                }
                            },
                            {$limit: 10},
                            {
                                $project: {
                                    steps: {$ifNull: ['$d_extra.move.details.steps', 0]},
                                    date: '$timestamp',
                                    type: {
                                        $literal: STEPS
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: '$type',
                                    type: {$last: '$type'},
                                    items: {
                                        $push: {
                                            value: '$steps',
                                            date: '$date'
                                        }
                                    },
                                    max: {
                                        $max: '$steps'
                                    },
                                    min: {
                                        $min: '$steps'
                                    }
                                }
                            }
                        ], function( err, result ) {
                            var
                                data = result[0];
                            if( err ) {
                                return next( err );
                            }
                            if( data ) {
                                data.unit = STEPS;
                                data.items.forEach( function( item ) {
                                    item.formattedValue = Y.doccirrus.comctl.numberToLocalString( item.value, {decimals: 0} );
                                } );
                                data.formattedMax = Y.doccirrus.comctl.numberToLocalString( data.max, {decimals: 0} );
                                data.formattedMin = Y.doccirrus.comctl.numberToLocalString( data.min, {decimals: 0} );
                            }
                            next( err, data );
                        }
                    );
                }
            ], callback );
        }

        /**
         * Gets patient heart rate data
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Mixed} [args.query.patientId]
         * @param {Mixed} [args.query.timestamp]
         * @param {Mixed} [args.query.d_extra]
         * @param {Function} args.callback
         */
        function getDeviceHeartRateData( args ) {
            var
                user = args.user,
                callback = args.callback,
                query = args.query || {},
                async = require( 'async' ),
                i18n = Y.doccirrus.i18n,
                HEART_RATE = i18n( 'PatPortalMojit.jawboneAPI.title.HEART_RATE' ),
                BPM = i18n( 'activity-api.title.BPM' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', next );
                },
                function( activityModel, next ) {
                    activityModel.mongoose.aggregate(
                        [
                            {$match: query},
                            {
                                $sort: {
                                    timestamp: -1
                                }
                            },

                            {
                                $project: {
                                    heart_rate: {$ifNull: ['$d_extra.heartrate.items', [{resting_heartrate: null}]]},
                                    timestamp: 1
                                }
                            },

                            {$unwind: '$heart_rate'},

                            {
                                $group: {
                                    _id: '$timestamp',
                                    heart_rate: {$last: '$heart_rate.resting_heartrate'}
                                }
                            },
                            {
                                $sort: {
                                    _id: -1
                                }
                            },
                            {
                                $project: {
                                    heart_rate: '$heart_rate',
                                    date: '$_id',
                                    type: {
                                        $literal: HEART_RATE
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: '$type',
                                    type: {$last: '$type'},
                                    items: {
                                        $push: {
                                            value: '$heart_rate',
                                            date: '$date'
                                        }
                                    },
                                    max: {
                                        $max: '$heart_rate'
                                    },
                                    min: {
                                        $min: '$heart_rate'
                                    }
                                }
                            }
                        ], function( err, result ) {
                            var
                                data = result[0];
                            if( err ) {
                                return next( err );
                            }
                            if( data ) {
                                data.unit = BPM;
                                data.items.forEach( function( item ) {
                                    item.formattedValue = item.value && Y.doccirrus.comctl.numberToLocalString( item.value, {decimals: 0} );
                                } );
                                data.formattedMax = Y.doccirrus.comctl.numberToLocalString( data.max, {decimals: 0} );
                                data.formattedMin = Y.doccirrus.comctl.numberToLocalString( data.min, {decimals: 0} );
                            }
                            next( err, data );
                        }
                    );
                }
            ], callback );
        }

        /**
         * Gets patient jawbone data
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} args.query.timestamp
         * @param {Function} args.callback
         */
        function getDeviceTableData( args ) {
            var
                user = args.user,
                callback = args.callback,
                queryParams = args.query || {},
                query = {
                    'd_extra': {$exists: true},
                    patientId: queryParams.patientId,
                    caseFolderId: queryParams.caseFolderId,
                    timestamp: {
                        $lte: new Date( queryParams.timestamp )
                    }
                },
                async = require( 'async' );

            function hasDataToShow( data ) {
                return data.items && data.items.some( item => item.value );
            }

            async.series( [
                function( next ) {
                    Y.doccirrus.api.activity.getDeviceSleepData( {
                        user: user,
                        query: query,
                        callback: next
                    } );
                },
                function( next ) {
                    Y.doccirrus.api.activity.getDeviceMoveData( {
                        user: user,
                        query: query,
                        callback: next
                    } );
                },
                function( next ) {
                    Y.doccirrus.api.activity.getDeviceHeartRateData( {
                        user: user,
                        query: query,
                        callback: next
                    } );
                },
                function( next ) {
                    Y.doccirrus.api.activity.getDeviceCaloriesData( {
                        user: user,
                        query: query,
                        callback: next
                    } );
                }
            ], function( err, results ) {
                var data = [];
                if( err ) {
                    return callback( err );
                }
                if( results[0] ) {

                    if( hasDataToShow( results[0].deepSleep ) ) {
                        data.push( results[0].deepSleep );
                    }
                    if( hasDataToShow( results[0].lightSleep ) ) {
                        data.push( results[0].lightSleep );
                    }

                }
                if( results[1] && hasDataToShow( results[1] ) ) {
                    data.push( results[1] );
                }
                if( results[2] && hasDataToShow( results[2] ) ) {
                    data.push( results[2] );
                }
                if( results[3] && hasDataToShow( results[3] ) ) {
                    data.push( results[3] );
                }
                callback( err, data );

            } );
        }

        /**
         * Gets patient lab data
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.activityId activity id. If it is set, api will produce data for single LABDATA activity, other query params will be skipped.
         * @param {String} args.query.patientId
         * @param {String} args.query.timestamp
         * @param {String} args.query.caseFolderId
         * @param {Function} args.callback
         */
        function getLabDataTableData( args ) {

            var
                user = args.user,
                callback = args.callback,
                moment = require( 'moment' ),
                queryParams = args.query || {},
                async = require( 'async' ),
                options = args.options || {},
                activityModel;

            function prepareResults( results ) {

                let
                    count = 0,
                    _results = {
                        result: null,
                        count: 0,
                        query: {}
                    };
                _results.result = results.filter( function( result ) {
                    return result.items && result.items.length && result._id;
                } ).map( function( result ) {
                    var
                        minMax,
                        i;
                    if( !count ) {
                        count = result.count;
                    }

                    delete result.count;
                    if( result.normalValue && result.normalValue.length && result.normalValue[0] && result.normalValue[0].split ) {
                        minMax = result.normalValue[0].split( '-' );
                        result.min = (minMax[0] || '').trim() || '';
                        result.max = (minMax[1] || '').trim() || '';
                    } else {
                        result.min = '';
                        result.max = '';
                    }
                    result.allDates = result.allDates || [];
                    result.allDates.sort( ( a, b ) => moment( b ).diff( moment( a ) ) );
                    result.items = result.items || [];
                    result.items.sort( ( a, b ) => moment( b.date ).diff( moment( a.date ) ) );
                    for( i = 0; i < result.allDates.length; i++ ) {
                        if( !(result.items[i] && moment( result.allDates[i] ).isSame( moment( result.items[i].date ) )) ) {
                            result.items.splice( i, 0, {
                                date: result.allDates[i]
                            } );
                        }
                    }
                    return result;
                } );
                _results.count = count;
                return _results;
            }

            function initPipeline() {
                let
                    result = [],
                    mongoose = require( 'mongoose' ),
                    query = {
                        caseFolderId: queryParams.caseFolderId
                    },
                    query2 = {
                        patientId: queryParams.patientId,
                        actType: 'LABDATA',
                        'l_extra': {$exists: true},
                        timestamp: {
                            $lte: new Date( queryParams.timestamp )
                        }
                    };
                if( queryParams.activityId ) {
                    result.push(
                        {
                            $match: {_id: new mongoose.Types.ObjectId( queryParams.activityId )}
                        },
                        {$project: {l_extra: 1, timestamp: 1, actType: 1, patientId: 1}}
                    );
                } else {
                    result.push(
                        {
                            $match: query
                        },
                        {$project: {l_extra: 1, timestamp: 1, actType: 1, patientId: 1}},
                        {
                            $match: query2
                        },
                        {
                            $sort: {
                                timestamp: -1
                            }
                        },
                        {$limit: 1000}
                    );
                }

                return result;
            }

            /**
             * Aggregate patient lab data (which are contained in l_extra.testId.testLabel).
             * @param {Object} activityModel
             * @param {Function} callback
             */
            function aggregateLabData( activityModel, callback ) {
                let
                    pipeline = initPipeline();
                pipeline.push(
                    {
                        $group: {
                            _id: null,
                            allDates: {$addToSet: '$l_extra.labReqReceived'},
                            l_extra: {$push: '$l_extra'}
                        }
                    },
                    {$unwind: '$l_extra'},
                    {$unwind: '$l_extra.testId'},
                    {$match: {$or: [{'l_extra.testId.testResultVal': {$exists: true}}, {'l_extra.testId.sampleResultText': {$exists: true}}]}},
                    {
                        $group: {
                            _id: '$l_extra.testId.head',
                            type: {
                                $last: '$l_extra.testId.head'
                            },
                            title: {$last: '$l_extra.testId.testLabel'},
                            unit: {$last: '$l_extra.testId.TestResultUnit'},
                            normalValue: {$last: '$l_extra.testId.sampleNormalValueText'},
                            allDates: {$last: '$allDates'},
                            items: {
                                $push: {
                                    date: '$l_extra.labReqReceived',
                                    value: '$l_extra.testId.testResultVal',
                                    text: '$l_extra.testId.sampleResultText'
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            originData: {
                                $push: {
                                    _id: '$_id',
                                    type: '$type',
                                    title: '$title',
                                    unit: '$unit',
                                    normalValue: '$normalValue',
                                    allDates: '$allDates',
                                    items: '$items'
                                }
                            },
                            count: {$sum: 1}
                        }
                    },
                    {$unwind: '$originData'},
                    {
                        $project: {
                            _id: '$originData._id',
                            type: '$originData.type',
                            title: '$originData.title',
                            unit: '$originData.unit',
                            normalValue: '$originData.normalValue',
                            allDates: '$originData.allDates',
                            items: '$originData.items',
                            count: '$count'
                        }
                    },
                    {$skip: options.skip || 0},
                    {$limit: options.limit || 1000}
                );
                activityModel.mongoose.aggregate( pipeline, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( err, prepareResults( results ) );

                } );
            }

            /**
             * Aggregate additional patient lab data (l_extra.testLabel, l_extra.sampleNormalValueText).
             * @param {Object} activityModel
             * @param {Function} callback
             */
            function aggregateAdditionalLabData( activityModel, callback ) {
                let
                    pipeline = initPipeline();
                pipeline.push(
                    {
                        $group: {
                            _id: '$l_extra.testLabel',
                            type: {
                                $last: '$l_extra.testLabel'
                            },
                            title: {
                                $last: '$l_extra.testLabel'
                            },
                            unit: {
                                $last: '$l_extra.TestResultUnit'
                            },
                            normalValue: {
                                $addToSet: '$l_extra.sampleNormalValueText'
                            },
                            items: {
                                $push: {
                                    date: '$l_extra.labReqReceived',
                                    value: '$l_extra.testResultVal'
                                }
                            }

                        }
                    }
                );
                activityModel.mongoose.aggregate( pipeline, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( err, prepareResults( results ) );

                } );
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', next );
                },
                function( model, next ) {
                    activityModel = model;
                    aggregateLabData( activityModel, function( err, result ) {
                        next( err, result );
                    } );
                },
                function( data, next ) {
                    aggregateAdditionalLabData( activityModel, function( err, additionalData ) {
                        if( err ) {
                            return next( err );
                        }
                        data.result = data.result.concat( additionalData.result );
                        if( data.count ) {
                            data.count = data.count + additionalData.result.length; //additionalData does not have limit and skip
                        } else {
                            data.count = (options.skip || 0) + additionalData.result.length; //additionalData does not have limit and skip
                        }

                        next( err, data );
                    } );
                }
            ], onLabdataLoaded );

            function onLabdataLoaded( err, data ) {
                applyOrder( data.result );

                data.result = applyFilters( data.result );

                callback( err, data );
            }

            //  HACK apply sorting for table
            //  TODO: MOJ-6887 - sorting would better be applied by the database

            function applyOrder( toData ) {
                var sortField = '', sortDir = 0;
                if( args.options && args.options.sort ) {
                    if( args.options.sort.max ) {
                        sortField = 'max';
                        sortDir = args.options.sort.max;
                    }
                    if( args.options.sort.min ) {
                        sortField = 'min';
                        sortDir = args.options.sort.min;
                    }
                    if( args.options.sort.unit ) {
                        sortField = 'unit';
                        sortDir = args.options.sort.unit;
                    }
                    if( args.options.sort.type ) {
                        sortField = 'type';
                        sortDir = args.options.sort.type;
                    }
                }

                if( '' !== sortField ) {
                    if( 1 === sortDir ) {
                        toData.sort( orderDataAsc );
                    } else {
                        toData.sort( orderDataDesc );
                    }
                }

                function orderDataAsc( a, b ) {
                    if( a[sortField] < b[sortField] ) {
                        return -1;
                    }
                    if( a[sortField] > b[sortField] ) {
                        return 1;
                    }
                    return 0;
                }

                function orderDataDesc( a, b ) {
                    if( a[sortField] > b[sortField] ) {
                        return -1;
                    }
                    if( a[sortField] < b[sortField] ) {
                        return 1;
                    }
                    return 0;
                }

            }

            //  HACK filter results
            //  TODO: MOJ-6887 - would be more efficient as part of the aggregation

            function applyFilters( toData ) {
                var filterField = '', filterBy = '';

                if( args.query ) {
                    if( args.query.type && args.query.type.$regex ) {
                        filterField = 'type';
                        filterBy = args.query.type.$regex;
                        toData = toData.filter( reduceRows );
                    }
                    if( args.query.unit && args.query.unit.$regex ) {
                        filterField = 'unit';
                        filterBy = args.query.unit.$regex;
                        toData = toData.filter( reduceRows );
                    }
                    if( args.query.max && args.query.max.$regex ) {
                        filterField = 'max';
                        filterBy = args.query.max.$regex;
                        toData = toData.filter( reduceRows );
                    }
                    if( args.query.min && args.query.min.$regex ) {
                        filterField = 'min';
                        filterBy = args.query.min.$regex;
                        toData = toData.filter( reduceRows );
                    }
                }

                function reduceRows( row ) {
                    var checkValue = row[filterField];
                    if( !checkValue ) {
                        return false;
                    }
                    return null !== checkValue.match( filterBy );
                }

                return toData;
            }

        }

        /**
         * Creates activity with actType 'FINDING' for specified patient.
         *  Saves activity to activity case folder. Takes locationId and employeeId accordingly
         *      case folder type.
         *  If there is no active case folder, will take last.
         *  If there is no case folder at all, will take first insurance. Based on the insurance
         *      will take locationId and employeeId.
         *  If employeeId is not set, will take first employee of
         *      the location.
         * @method createActivityForPatient
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.action]
         * @param {Object} [args.action.UPDATE_OR_CREATE_ATTACHMENTS] in the case that there are attachments and an activity query is needed
         * @param {Object} [args.action.UPDATE_OR_CREATE_ATTACHMENTS.patientId] to change the attachedTo of document to this activity and maintain the patientId in the document
         * @param {Object} args.data activity data
         * @param {Object} args.query query to select patient
         * @param {Function} args.callback
         * @returns {*}
         */
        function createActivityForPatient( args ) {
            const
                {
                    user,
                    query,
                    action = {},
                    callback,
                    getOnlyInsuranceCaseFolder,
                    gdtUseLastChangedActivity
                } = args,
                async = require( 'async' );

            let
                {
                    data = {}
                } = args,
                createdOrUpdatedActivity;

            Y.log( 'createActivityForPatient. query: ' + JSON.stringify( query ), 'debug', NAME );
            if( action && action.IGNORE ) {
                return callback( null, true );
            } else {
                if( !data || !query ) {
                    Y.log( 'createActivityForPatient. Data or query is missing. data: ' + JSON.stringify( data ) + ', query: ' + JSON.stringify( query ), 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 400, 'Data and query should be specified.', true ) );
                }
                async.waterfall( [
                    /// ---------  find the patient and setup data from patient -----------
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'patient',
                            query: query,
                            options: {
                                lean: true,
                                limit: 1,
                                sort: {
                                    _id: -1
                                }
                            }
                        }, function( err, results ) {
                            if( err ) {
                                Y.log( 'createActivityForPatient. Patient not found. Error: ' + JSON.stringify( err ), 'debug', NAME );
                                return next( err );
                            }
                            if( !results.length ) {
                                Y.log( 'createActivityForPatient. Patient not found. Query: ' + JSON.stringify( query ), 'debug', NAME );
                                return callback( Y.doccirrus.errors.rest( 400, Y.doccirrus.errorTable.getMessage( {code: 18005} ), true ) );
                            }
                            /// ---------  we have a patient, so mutate the activity data!! -----------
                            data.patientId = results[0]._id && results[0]._id.toString();
                            if( !results[0].insuranceStatus || !results[0].insuranceStatus.length ) {
                                Y.log( 'createActivityForPatient. Patient should have insurance, id: ' + data.patientId, 'warn', NAME );
                                Y.doccirrus.api.casefolder.checkCaseFolder( {
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
                                    },
                                    callback: ( err, res ) => {
                                        if( err ) {
                                            return next( err );
                                        }
                                        data.caseFolderId = res._id;
                                        next( null, results[0] );
                                    }
                                } );
                            } else {
                                return next( err, results[0] );
                            }
                        } );
                    },
                    /// ---------  find the casefolder and setup data from casefolder -----------
                    async function setUpData( patient, next ) {
                        //  MOJ-8551 keep caseFolderId if specified by caller
                        //  (set when creating entries on closing pregnancy casefolder)
                        if( data.caseFolderId ) {
                            Y.log( 'Skip lookup of casefolder id, keeping: ' + data.caseFolderId, 'debug', NAME );
                            return next();
                        } else if( gdtUseLastChangedActivity && data && data.patientId ) {
                            const [err, latestActivity] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'activity',
                                    action: 'get',
                                    query: {
                                        patientId: data.patientId
                                    },
                                    options: {
                                        sort: {
                                            lastChanged: -1
                                        },
                                        limit: 1
                                    }
                                } )
                            );
                            if( err ) {
                                return next( err );
                            }
                            if( !latestActivity || !Array.isArray( latestActivity ) || !latestActivity.length ) {
                                Y.log( `createActivityForPatient: could not find latest activity for patient: ${data.patientId}`, 'warn', NAME );
                                return next( Y.doccirrus.commonerrors.DCError( 400, {message: 'Could not find latest activity.'} ) );
                                // return next( Y.doccirrus.errors.rest( 404, 'Could not find latest activity.', true ) );
                            }
                            data.employeeId = latestActivity[0].employeeId;
                            data.locationId = latestActivity[0].locationId;
                            data.caseFolderId = latestActivity[0].caseFolderId;
                            return next();
                        } else {
                            /// ---------  locate patient's casefolders and add casefolder ID to the activity -----------
                            Y.doccirrus.api.activity.getActivityDataForPatient( {
                                user,
                                data: {patient, getOnlyInsuranceCaseFolder, isGDT: Boolean( data.g_extra )},
                                callback( err, activityData ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    data.employeeId = activityData.employeeId;
                                    data.locationId = activityData.locationId;

                                    if( activityData.caseFolderId ) {
                                        data.caseFolderId = activityData.caseFolderId;
                                        return next( err );
                                    }

                                    Y.doccirrus.api.casefolder.checkCaseFolder( {
                                        user: user,
                                        query: {
                                            patientId: patient._id,
                                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR
                                        },
                                        data: {
                                            patientId: patient._id,
                                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR,
                                            start: new Date(),
                                            title: Y.doccirrus.i18n( 'casefolder-schema.additionalCaseFolderTypes.ERROR' ),
                                            skipcheck_: true
                                        },
                                        callback: ( err, res ) => {
                                            if( err || !res ) {
                                                return next( err || "err_no_error_casefolder" );
                                            }
                                            data.caseFolderId = res._id;
                                            next();
                                        }
                                    } );
                                }
                            } );
                        }
                    },
                    /// ---------  find the employee and setup data from employee, and then also for location! -----------
                    function( next ) {
                        if( data.employeeId && data.locationId ) {
                            Y.log( 'createActivityForPatient. Employee not found. Take first employee of the location.', 'debug', NAME );
                            return next();
                        } else {
                            let query = {type: 'PHYSICIAN'};

                            if( data.locationId ) {
                                query['locations._id'] = data.locationId;
                            }

                            if( data.employeeId ) {
                                query._id = data.employeeId;
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'employee',
                                query: query,
                                options: {
                                    lean: true,
                                    limit: 1,
                                    select: {
                                        _id: 1
                                    }
                                }
                            }, function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                data.employeeId = results[0] && results[0]._id.toString();
                                if( !data.locationId ) {
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        action: 'get',
                                        model: 'location',
                                        query: {},
                                        options: {
                                            lean: true,
                                            limit: 1,
                                            select: {
                                                _id: 1
                                            }
                                        }
                                    }, function( err, res ) {
                                        data.locationId = res[0] && res[0]._id.toString();
                                        next( err );
                                    } );
                                } else {
                                    return next( err );
                                }
                            } );
                        }
                    },
                    /// ---------  Finally create or update the activity -----------
                    function( next ) {
                        data.status = 'VALID';

                        function postNewActivity() {
                            Y.doccirrus.api.activity.post( {
                                user: user,
                                data: data,
                                callback: next
                            } );
                        }

                        /// ---------  Do we have a query to identify an activity? -----------
                        if( action && action.UPDATE_OR_CREATE_ATTACHMENTS ) {
                            /// ---------  In this branch we have such a query -----------
                            let activityQuery = action.UPDATE_OR_CREATE_ATTACHMENTS;

                            if( data.actType ) {
                                /// ---------  try to use the activity _id - most accurate query -----------
                                if( !activityQuery._id ||
                                    (typeof activityQuery._id !== "string" && activityQuery._id.toString() === "[object Object]")
                                ) {
                                    activityQuery.actType = data.actType;
                                }
                            }

                            /// ---------  set the patientId in the query from the data if necessary-----------
                            if( !activityQuery.patientId && !activityQuery._id ) {
                                activityQuery.patientId = data.patientId;
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'activity',
                                query: activityQuery,
                                options: {sort: {_id: -1}}
                            }, function( err, res ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( res[0] ) {

                                    let activity = res[0],
                                        d = {attachments: [], attachedMedia: []};

                                    if( activity.status !== 'VALID' ) {
                                        next( new Y.doccirrus.commonerrors.DCError( 400, {message: i18n( 'DeviceLogMojit.patientAndActivitySelectDlg.error.notValidActivity' )} ) );
                                        return;
                                    }

                                    if( activity.attachments ) {
                                        activity.attachments.forEach( e => d.attachments.push( e ) ); //because array attachments is overloaded with additional functions
                                    }
                                    if( activity.attachedMedia ) {
                                        activity.attachedMedia.forEach( e => d.attachedMedia.push( e ) );
                                    }
                                    if( data.attachments ) {
                                        data.attachments.forEach( e => d.attachments.push( e ) );
                                    }
                                    if( data.attachments ) {
                                        data.attachedMedia.forEach( e => d.attachedMedia.push( e ) );
                                    }

                                    let fields = ['attachments', 'attachedMedia'];
                                    let newData = {
                                        skipcheck_: true,
                                        attachments: d.attachments,
                                        attachedMedia: d.attachedMedia
                                    };

                                    if( data.subType && !res[0].subType ) {
                                        newData.subType = data.subType;
                                        fields.push( 'subType' );
                                    }

                                    if( action && action.UPSERT ) {
                                        fields = [];
                                        Object.keys( data ).forEach( entry => {
                                            newData[entry] = data[entry];
                                        } );

                                        newData.attachments = d.attachments;
                                        newData.attachedMedia = d.attachedMedia;

                                        Object.keys( data ).forEach( entry => {
                                            fields.push( entry );
                                        } );
                                    }

                                    Y.doccirrus.mongodb.runDb( {
                                        action: 'put',
                                        model: 'activity',
                                        user: user,
                                        query: {_id: activity._id},
                                        fields,
                                        data: newData,
                                        callback: function( err ) {
                                            if( err ) {
                                                Y.log( 'Failed to update activity attachedMedia and attachments! ' + JSON.stringify( err ), 'error', NAME );
                                            }
                                            next( err, [activity._id.toString()] );
                                        }
                                    } );
                                } else {
                                    /// ---------  no activity found, so POST it -----------
                                    postNewActivity();
                                }
                            } );
                        } else if( action && action.UPSERT ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                query: action.UPSERT,
                                action: 'upsert',
                                fields: Object.keys( data ),
                                data: Y.doccirrus.filters.cleanDbObject( data )
                            }, function( err, res ) {
                                next( err, [res._id] );
                            } );
                        } else {
                            postNewActivity();
                        }
                    },

                    function getUpdatedOrCreatedActivity( activityId, next ) {
                        if( activityId && Array.isArray( activityId ) && activityId.length ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'activity',
                                query: {_id: activityId[0]}
                            }, function( err, res ) {
                                if( err ) {
                                    return next( err );
                                }

                                if( res && Array.isArray( res ) && res.length ) {
                                    createdOrUpdatedActivity = res[0];
                                    return next( null, activityId );
                                }

                                Y.log( `Activity with ID: ${activityId[0]} not found in DB`, 'error', NAME );
                                next( `Activity with ID: ${activityId[0]} not found in DB` );
                            } );
                        } else {
                            Y.log( 'No activity Id received after UPDATE/POST of activity', 'error', NAME );
                            return next( 'No activity Id received after UPDATE/POST of activity' );
                        }
                    },

                    //  -----------------   if there are attachments, change the attachedTo of document to this activity ---------------------
                    function( activityId, next ) {

                        if( action && action.UPDATE_OR_CREATE_ATTACHMENTS && Array.isArray( data.attachments ) && data.attachments.length ) {
                            //  added patientId to resolve MOJ-11726
                            let patientId = action.UPDATE_OR_CREATE_ATTACHMENTS.patientId || null;
                            let
                                documentData = {
                                    activityId: activityId[0],
                                    //  new activity is not approved, documents cannot be shared on patient portal:
                                    patientId,
                                    //  deprecated, but kept for now, MOJ-9190
                                    attachedTo: activityId[0]
                                },
                                fields = ['activityId', 'attachedTo', 'patientId'];

                            if( createdOrUpdatedActivity && createdOrUpdatedActivity.locationId ) {
                                documentData.locationId = createdOrUpdatedActivity.locationId.toString();
                                fields.push( 'locationId' );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'document',
                                query: {
                                    _id: {$in: data.attachments}
                                },
                                action: 'put',
                                fields: fields,
                                data: Y.doccirrus.filters.cleanDbObject( documentData )
                            }, function( err ) {
                                next( err, activityId );
                            } );
                        } else {
                            setImmediate( next, null, activityId );
                        }
                    }
                ], callback );
            }
        }

        async function createCommunicationFromMediport( args ) {
            Y.log( `Entering Y.doccirrus.api.activity.createCommunicationFromMediport`, 'info', NAME );
            const {user, data = {}, query = {}} = args,
                action = {UPDATE_OR_CREATE_ATTACHMENTS: {_id: new ObjectId( -1 )}},
                attachments = [],
                attachedMedia = [],
                createActivityPromise = promisifyArgsCallback( Y.doccirrus.api.activity.createActivityForPatient ),
                createTaskPromise = promisifyArgsCallback( Y.doccirrus.api.task.createTasksForActivities ),
                {communication, invoiceRef, documents, status, buffer} = data;

            let {callback} = args;

            if( callback ) {
                callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.activity.createCommunicationFromMediport' );
            }

            let [err, res] = await formatPromiseResult( createActivityPromise( {
                user,
                data: communication,
                query,
                action
            } ) );

            if( err || !res || !res.length ) {
                err = err || new Y.doccirrus.commonerrors.DCError( 500, {message: "cannot create communication activity"} );
                Y.log( `createCommunicationFromMediport(): Failed to create communication activity for invoiceRef ${invoiceRef && invoiceRef._id}.\nError: ${err.stack || err}`, 'error', NAME );
                if( callback ) {
                    return callback( err || null, {} );
                } else {
                    throw err || null;
                }
            }

            const communicationId = res[0];
            communication._id = communicationId;

            // Save xml document and attach it to communication activity

            if( buffer ) {
                [err] = await formatPromiseResult( Y.doccirrus.tarmedInvoices.createDocumentFromFile( {
                    user,
                    fileName: `${invoiceRef._id.toString()}-${communication._id.toString()}`,
                    fileType: 'xml',
                    file: buffer,
                    ownerId: communicationId,
                    docType: 'SUMEXXML'
                } ) );

                if( err ) {
                    Y.log( `createCommunicationFromMediport(): Failed to create document for communication ${communicationId}.\nError: ${err.stack || err}`, 'error', NAME );
                }
            }

            if( documents && documents.length ) {
                const promises = [];
                documents.forEach( document => {
                    const {fileName, file, fileType} = document;
                    promises.push( Y.doccirrus.tarmedInvoices.createDocumentFromFile( {
                        user, fileName, file, fileType,
                        ownerId: communicationId
                    } ) );
                } );

                [err, res] = await formatPromiseResult( Promise.all( promises ) );

                if( err || !res || !res.length ) {
                    Y.log( `createCommunicationFromMediport(): Failed to create documents for commuication ${communicationId}.\nError: ${err}`, 'error', NAME );
                    throw err || null;
                }

                res.forEach( resultObj => {
                    attachments.push( resultObj.document._id );
                    attachedMedia.push( {
                        mediaId: resultObj.media._id,
                        contentType: resultObj.media.mimeType,
                        caption: resultObj.media.label.toUpperCase()
                    } );
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'update',
                query: {_id: communicationId},
                data: {
                    referencedBy: [invoiceRef._id],
                    attachments,
                    attachedMedia,
                    status: 'APPROVED'
                }
            } );

            const fsmName = Y.doccirrus.schemas.activity.getFSMName( invoiceRef.actType ),
                fsmStateChangePromise = function( user, options, activity, isTest, stateChangeFn ) {
                    return new Promise( function( resolve, reject ) {
                        const callback = function( err, result ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        };
                        stateChangeFn( user, options, activity, isTest, callback );
                    } );
                };

            if( status === 'INCOMPLETE' || status === 'MEDIDATAREJECTED' ) {
                [err] = await formatPromiseResult( fsmStateChangePromise( user, {
                    communicationId
                }, invoiceRef, false, Y.doccirrus.fsm[fsmName].decline ) );

                if( err ) {
                    Y.log( `createCommunicationFromMediport(): Failed to reject invoice ${invoiceRef._id} \nError: ${err.stack || err}`, 'error', NAME );
                }

                [err, res] = await formatPromiseResult( createTaskPromise( {
                    user, data: {
                        tasksCount: 'MULTIPLE',
                        taskData: {
                            candidates: [invoiceRef.employeeId],
                            alertTime: new Date().toISOString(),
                            title: 'Medidata negative response',
                            roles: [Y.doccirrus.schemas.role.ROLES.INVOICE],
                            patientId: invoiceRef.patientId,
                            employeeId: invoiceRef.employeeId,
                            patientName: `${invoiceRef.patientLastName}, ${invoiceRef.patientFirstName}`,
                            employeeName: invoiceRef.employeeName,
                            urgency: 4,
                            details: communication.userContent
                        },
                        activities: [communication]
                    }
                } ) );
                if( err ) {
                    Y.log( `Failed to create task for communication ${communicationId}.\nError: ${err}`, 'error', NAME );
                }
            }
            callback( null, communicationId );
        }

        function getActivity( args ) {
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                action: 'get',
                model: 'activity',
                query: {
                    _id: args.query._id
                },
                options: {
                    limit: 1,
                    lean: true
                }
            }, function( err, res ) {
                if( err ) {
                    return args.callback( err );
                } else {
                    return args.callback( err, [{activity: res[0]}] );
                }
            } );

        }

        /**
         * Validates and updates specified activities, one by one.
         *
         * Called by CaseFileViewModel (table right click options) and patient version editor
         *
         * @method updateBatch
         * @param   {Object}    args
         * @param   {Object}    args.user
         * @param   {Object}    args.data
         * @param   {Boolean}   args.data.currentDate       True if activity should be copied to the current date
         * @param   {Boolean}   args.data.notShowProgress   True if ws events to be omitted
         * @param   {Array}     args.fields
         * @param   {Object}    args.query
         * @param   {Array}     args.query.activitiesId
         * @param   {Object}    args.originalParams
         * @param   {Boolean}   args.originalParams.copy
         * @param   {Object}    args.callback
         */
        function updateBatch( args ) {
            const
                {user, query: queryParams = {}, fields = [], originalParams: {copy = false, fromImported = false}, callback} = args,
                async = require( 'async' ),
                moment = require( 'moment' );

            let
                {data = {}} = args,
                currentDate = data.currentDate || false,
                notShowProgress = data.notShowProgress || false,
                activitiesId = queryParams.activitiesId || [],
                fsmOptions = {},
                processedActivities = [],
                errorList = [];

            if( 'string' === typeof activitiesId ) {
                activitiesId = [activitiesId];
            }

            function notifyProgress( err, activityId ) {
                if( err ) {
                    err.activityId = activityId;
                    errorList.push( err );
                }
                if( notShowProgress ) {
                    return;
                }
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'activty.PROCESSED_ONE',
                    msg: {
                        data: {
                            error: err
                        }
                    }
                } );
            }

            function updateActivity( activityId, callback ) {
                Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    action: 'get',
                    user: user,
                    query: {
                        _id: activityId
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                }, function( err, results ) {
                    if( err ) {
                        notifyProgress( err, activityId );
                        return callback();
                    }
                    if( results.length ) {
                        let
                            activity = results[0],
                            fsmName = Y.doccirrus.schemas.activity.getFSMName( activity.actType );
                        fields.forEach( field => {
                            if( data[field] && 'timestamp' === field ) {
                                let
                                    newTimestamp = moment( data[field] );
                                data.timestamp = activity.timestamp = moment( activity.timestamp ).date( newTimestamp.date() ).month( newTimestamp.month() ).year( newTimestamp.year() ).toISOString();
                            } else if( data[field] ) {
                                activity[field] = data[field];
                            }
                        } );
                        Y.doccirrus.fsm[fsmName].validate( user, fsmOptions, activity, true, function( err ) {
                            if( err ) {
                                if( 403 === err.code ) {
                                    return callback( Y.doccirrus.errors.rest( 18007, '', true ) );
                                }
                                if( !err.code && 'ValidationError' === err.name && err.errors && err.errors.timestamp ) {
                                    return callback( Y.doccirrus.errors.rest( 18008, '', true ) );
                                }
                                return callback( err );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                model: 'activity',
                                action: 'put',
                                user: user,
                                query: {
                                    _id: activity._id
                                },
                                data: Y.doccirrus.filters.cleanDbObject( data ),
                                fields: fields.concat( ['processingType'] ),
                                context: {
                                    forceScheinCheck: true
                                },
                                callback: function( err ) {
                                    notifyProgress( err, activityId );
                                    callback();
                                }
                            } );
                        } );
                    } else {
                        notifyProgress( null, activityId );
                        return callback();
                    }
                } );
            }

            function copyActivity( activityId, callback ) {
                Y.doccirrus.activityapi.copyActivity( user, activityId, {
                    currentDate: currentDate,
                    setLocationId: data.locationId,
                    setEmployeeId: data.employeeId,
                    setTimestamp: data.timestamp,
                    setCaseFolderId: data.caseFolderId,
                    setBatch: true,
                    fromImported: fromImported
                }, ( err, result ) => {
                    if( result ) {
                        let processedData = {
                            _id: result._id,
                            actType: result.actType,
                            patientId: result.patientId,
                            caseFolderId: result.caseFolderId,
                            timestamp: result.timestamp,
                            date: moment( result.timestamp ).format( "YYYY-MM-DD" ),
                            locationId: result.locationId,
                            employeeId: result.employeeId,
                            areTreatmentDiagnosesBillable: result.areTreatmentDiagnosesBillable
                        };
                        if( result.code ) {
                            processedData.code = result.code;
                        }
                        if( result.catalogShort ) {
                            processedData.catalogShort = result.catalogShort;
                        }
                        processedActivities.push( processedData );
                    }
                    notifyProgress( err, activityId );
                    callback( null, result );
                } );
            }

            async.series( [
                function( next ) {
                    //  copy/update treatments first
                    async.eachSeries( activitiesId.filter( activity => 'TREATMENT' === activity.actType ), copy ? copyActivity : updateActivity, next );
                },
                function( next ) {
                    //  copy/update all other activities when treatments complete
                    async.eachSeries( activitiesId.filter( activity => 'TREATMENT' !== activity.actType ), copy ? copyActivity : updateActivity, next );
                }
            ], ( err ) => {
                if( !err && errorList.length ) {
                    callback( errorList );
                } else {
                    callback( err );        //  eslint-disable-line callback-return
                }

                if( !err && processedActivities.length ) {
                    Y.doccirrus.api.rule.triggerIpcQueue( {
                        user,
                        tenantId: user.tenantId,
                        type: 'activity',
                        caseFolderId: processedActivities[0].caseFolderId,
                        locationId: processedActivities[0].locationId.toString(),
                        patientId: processedActivities[0].patientId,
                        onDelete: false,
                        processingType: 'batch',
                        preparedActivities: processedActivities,
                        data: JSON.parse( JSON.stringify( processedActivities[0] ) )
                    } );
                }
            } );

        }

        /**
         * Handles the activity.post operations
         * 1. checks for timestamp and employeeId and tries correct them if something is wrong
         * 2. cleans the data object before adding it to the database
         * 3. adds data to database
         * @method post
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.model
         * @param {Object} args.options
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        function post( args ) {
            var
                user = args.user,
                data = args.data || {},
                options = args.options,
                callback = args.callback;

            function postActivity( dataObj ) {
                dataObj = Y.doccirrus.filters.cleanDbObject( dataObj || {} );
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: args.model || 'activity',
                    user: user,
                    data: dataObj,
                    options: options
                }, callback );
            }

            // override the default POST on activity to check the timestamp
            // This code should be effected for MOJ-2336

            if( !(data.timestamp) || moment( data.timestamp ).isAfter( moment() ) ) {
                Y.log( 'Correcting timestamp set in future: ' + data.timestamp, 'info', NAME );
                data.timestamp = moment().toJSON();
            }

            if( !data.employeeId ) {
                let
                    query = {};
                if( data.locationId ) {
                    query['locations._id'] = data.locationId;
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'employee',
                    query: query,
                    options: {
                        limit: 1,
                        select: {
                            _id: 1
                        }
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !results[0] ) {
                        return callback( Y.doccirrus.errors.rest( 500, 'Can not post activity. System does not have employees.', true ) );
                    }
                    data.employeeId = results[0]._id.toString();
                    postActivity( data );
                } );
            } else {
                postActivity( data );
            }
        }

        /**
         * Executes treatment pipeline
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} [args.query.timestamp] only if relevantDiagnoses is set to true
         * @param {String} [args.query.caseFolderId] only if relevantDiagnoses is set to true
         * @param {String} [args.query.locationId] only for catalog text
         * @param {String} [args.query.code] only for catalog text
         * @param {String} [args.query.catalogShort] only for catalog text
         * @param {Object} [args.options]
         * @param {Boolean} [args.options.relevantDiagnoses] include relevantDiagnoses
         * @param {Boolean} [args.options.skipCatalogText] skip catalog text
         * @param {Function} callback
         */
        function doTreatmentPipeline( args, callback ) {
            var
                user = args.user,
                query = args.query || {},
                {timestamp, caseFolderId, caseFolder, patientId, locationId, code, catalogShort} = query,
                options = args.options || {},
                finalResult = {
                    fk5008Notes: null,
                    relatedDiagnoses: null,
                    catalogText: null
                },
                async = require( 'async' );

            function getFk5008Notes( callback ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patient',
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
                            // MOJ-14319: [OK] [CASEFOLDER]
                            publicInsuranceType = caseFolder && caseFolder.type && caseFolder.type.startsWith( 'PUBLIC' ) ? caseFolder.type : 'PUBLIC',
                            publicInsurance = patient.insuranceStatus && patient.insuranceStatus.find( status => publicInsuranceType === status.type );

                        if( publicInsurance ) {
                            Y.doccirrus.api.kbv.dkm( {
                                user: user,
                                originalParams: {
                                    patientId: patient._id && patient._id.toString(),
                                    locationId: publicInsurance.locationId,
                                    costCarrierBillingSection: publicInsurance.costCarrierBillingSection,
                                    costCarrierBillingGroup: publicInsurance.costCarrierBillingGroup
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
                },
                function( done ) {
                    if( options.skipCatalogText || !locationId || !code || !catalogShort || options.catalogTextHidden ) {
                        return setImmediate( done );
                    }
                    Y.doccirrus.api.catalogtext.get( {
                        user: user,
                        query: {
                            locationId,
                            code,
                            catalogShort
                        },
                        options: {
                            lean: true,
                            limit: 1
                        },
                        callback( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.catalogText = result[0];
                            done();
                        }
                    } );

                }
            ], function( err ) {
                callback( err, finalResult );
            } );
        }

        /**
         * Executes diagnosis pipeline
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} [args.query.locationId] only for catalog text
         * @param {String} [args.query.code] only for catalog text
         * @param {String} [args.query.catalogShort] only for catalog text
         * @param {Object} [args.options]
         * @param {Boolean} [args.options.skipCatalogText] skip catalog text
         * @param {Function} callback
         */
        function doDiagnosisPipeline( args, callback ) {
            var
                user = args.user,
                query = args.query || {},
                {locationId, code, catalogShort} = query,
                options = args.options || {},
                finalResult = {
                    catalogText: null
                },
                async = require( 'async' );

            async.parallel( [
                function( done ) {
                    if( options.skipCatalogText || !locationId || !code || !catalogShort || options.catalogTextHidden ) {
                        return setImmediate( done );
                    }
                    Y.doccirrus.api.catalogtext.get( {
                        user: user,
                        query: {
                            locationId,
                            code,
                            catalogShort
                        },
                        options: {
                            lean: true,
                            limit: 1
                        },
                        callback( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.catalogText = result[0];
                            done();
                        }
                    } );

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
         * @param {String} args.query.locationId
         * @param {String} args.query.timestamp
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
                locationId = query.locationId,
                timestamp = query.timestamp,
                caseFolderId = query.caseFolderId,
                excludeActivities = query.excludeActivities,
                finalResult = {
                    continuousIcdsObj: null,
                    continuousMedicationsObj: null,
                    openScheinBl: null,
                    caseFolderBl: null
                },
                async = require( 'async' );

            // TODO: check conICDS
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
                            user,
                            query: {
                                patientId,
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

            function _getContinuousMedications( callback ) {
                Y.doccirrus.api.activity.getContinuousMedications( {
                    user,
                    query: {
                        patientId,
                        timestamp,
                        locationId
                    },
                    callback: function( err, result ) {
                        if( err ) {
                            //do not brake process if errors ocurs just return empty aray
                            Y.log( `_getContinuousMedications: Error getting continuousMedications ${err.message || err}`, 'warn', NAME );
                        }
                        finalResult.continuousMedicationsObj = !err && result || [];
                        callback();
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
                    _getContinuousMedications( done );
                },
                function( done ) {
                    if( options.openScheinBL ) {
                        Y.doccirrus.api.activity.getOpenScheinBL( {
                            user: user,
                            query: {
                                timestamp,
                                patientId,
                                caseFolderId,
                                locationId
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
                    if( options.openScheinBL && !finalResult.openScheinBl ) {
                        Y.doccirrus.api.activity.getOpenBilledSchein( {
                            user: user,
                            query: {
                                timestamp,
                                patientId,
                                caseFolderId,
                                locationId
                            },
                            callback: function( err, result ) {
                                if( err ) {
                                    return done( err );
                                }
                                finalResult.openBilledScheinBl = result && {
                                    _id: result._id,
                                    fk4235Set: result.fk4235Set
                                };
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

        /**
         * Executes medication pipeline:
         *  1. sets defaultMappings
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} callback
         */
        function doMedicationPipeline( args, callback ) {
            var
                {user} = args,
                finalResult = {
                    defaultMappings: null
                };
            Y.doccirrus.api.mmi.getMappingCatalogEntries( {
                user,
                query: {
                    catalogShortNames: ['MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT']
                },
                callback( err, results ) {
                    if( err ) {
                        Y.log( `Could not get data from mmi service. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                        return callback( null, finalResult );
                    }
                    finalResult.defaultMappings = results;
                    callback( null, finalResult );
                }
            } );
        }

        /**
         * Executes labdata pipeline:
         *  1. sets options for "head"
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} callback
         */
        function doLabDataPipeline( args, callback ) {
            var
                {user} = args,
                finalResult = {
                    defaultLabTestTypes: []
                },
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.labtest.get( {
                        user,
                        options: {
                            lean: true,
                            select: {
                                head: 1,
                                testLabel: 1,
                                sampleId: 1,
                                TestResultUnit: 1,
                                sampleTestNotes: 1,
                                sampleNormalValueText: 1,
                                testResultLimitIndicator: 1
                            }
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                return next( err );
                            }

                            var i;
                            for( i = 0; i < result.length; i++ ) {
                                if( result[i].head ) {
                                    finalResult.defaultLabTestTypes.push( result[i] );
                                }
                            }

                            next();
                        }
                    } );
                }
            ], ( err ) => {
                callback( err, finalResult );
            } );
        }

        /**
         * Executes meddata pipeline:
         *
         *  MOJ-1065 - TODO - mix in Gravidogramm types if licence is present, or add new API call
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Array|string} args.categories categories to collect
         * @param {Function} cb? callback function
         * @returns {Promise}
         */
        async function doMedDataPipeline( args, cb ) {
            let
                callback = (typeof cb === "function") ? cb : promisifiedCallback,
                {user, categories} = args;

            // set defaults for the categories
            if( typeof categories === "string" ) {
                categories = [categories];
            }
            if( !Array.isArray( categories ) ) {
                categories = Object.values( Y.doccirrus.schemas.v_meddata.medDataCategories );
            }

            const [err, customMedDataTypeResult] = await formatPromiseResult(
                Y.doccirrus.api.meddata.getMedDataItemTemplateCollection( {
                    'user': user,
                    'category': categories
                } )
            );

            if( err ) {
                Y.log( `doMedDataPipeline error loading custom medDataTypes for categories ${categories.join( "," )}: ${JSON.stringify( err && err.message || err )}`, 'error', NAME );
                return callback( err );
            }

            return callback( err, customMedDataTypeResult );
        }

        /**
         * Executes gravidogram pipeline:
         *
         * Calls doMedDataPipeline with predefined categories, and returns a special object.
         * @param {object} args
         * @param {function} cb?
         * @return {Promise<void>}
         * @deprecated
         */
        async function doGravidogrammPipeline( args, cb ) {
            const
                callback = (typeof cb === "function") ? cb : promisifiedCallback,
                [err, resObj] = await formatPromiseResult( doMedDataPipeline(
                    // overwrite categories with ONLY the GRAVIDOGRAMM category
                    Object.assign(
                        args,
                        {categories: [Y.doccirrus.schemas.v_meddata.medDataCategories.GRAVIDOGRAMM]}
                    )
                ) );

            if( err ) {
                Y.log( `doGravidogrammPipeline error executing doMedDataPipeline: ${JSON.stringify( err && err.message || err )}`, 'error', NAME );
                return callback( err );
            }

            return callback( err, resObj );
        }

        /**
         * Calls doMedDataPipeline with predefined categories, and returns a special object.
         * @param {object} args
         * @param {function} cb
         * @return {Promise<void>}
         * @deprecated
         */
        async function doPercentilecurvePipeline( args, cb ) {
            const
                callback = (typeof cb === "function") ? cb : promisifiedCallback,
                [err, resObj] = await formatPromiseResult( doMedDataPipeline(
                    // overwrite categories with ONLY the PERCENTILECURVE category
                    Object.assign(
                        args,
                        {categories: [Y.doccirrus.schemas.v_meddata.medDataCategories.PERCENTILECURVE]}
                    )
                ) );

            if( err ) {
                Y.log( `doPercentilecurvePipeline error executing doMedDataPipeline: ${JSON.stringify( err && err.message || err )}`, 'error', NAME );
                return callback( err );
            }

            return callback( err, resObj );
        }

        /**
         * Executes referral pipeline:
         *  1. sets kbvSpecialities - list of KBV "Fachgruppen" from catalog
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} callback
         */
        function doReferralPipeline( args, callback ) {
            function fachgruppeCb( err, entries ) {
                if( err ) {
                    Y.log( 'could not get fachgruppen from kbv catalog ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                entries = entries && entries[0] && entries[0].kvValue || [];

                let finalResult = {
                    kbvSpecialities: (Array.isArray( entries ) ? entries.map( entry => ({
                        id: entry.key,
                        text: entry.value
                    }) ) : [])
                };

                callback( null, finalResult );
            }

            Y.doccirrus.api.kbv.fachgruppe( {
                user: args.user,
                originalParams: {},
                callback: fachgruppeCb
            } );
        }

        /**
         * Executes kbvutility2 pipeline:
         *  1. sets diagosis group
         * @param {Function} callback
         */
        function doKBVUtility2Pipeline( callback ) {
            Y.doccirrus.api.kbvutility2.getSdhm( {
                user: Y.doccirrus.auth.getSUForLocal(),
                callback: function( err, results ) {
                    if( err ) {
                        callback( err );
                    } else {
                        callback( null, {sdhm: results} );
                    }
                }
            } );
        }

        /**
         * Executes KBVUTILITY pipeline:
         *  1. sets lastKbvUtility
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} callback
         */
        function doKbvUtilityPipeline( args, callback ) {
            let
                {user, patientId, timestamp} = args,
                finalResult = {
                    lastKbvUtility: null,
                    acuteEvents: null
                },
                async = require( 'async' );
            async.waterfall( [
                function( next ) {

                    lastKbvUtility( {
                        user,
                        originalParams: {
                            patientId: patientId,
                            timestamp: timestamp
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            finalResult.lastKbvUtility = result;
                            next();
                        }
                    } );
                },
                function( next ) {

                    getKbvUtilityAcuteEvents( {
                        user,
                        originalParams: {
                            patientId: patientId
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            finalResult.acuteEvents = result;
                            next();
                        }
                    } );
                }
            ], ( err ) => {
                callback( err, finalResult );
            } );
        }

        /**
         * Gets most recent previous kbvUtility
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {Function} args.callback
         *
         * @returns {Function} args.callback
         */
        function lastKbvUtility( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.lastKbvUtility', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.lastKbvUtility' );
            }
            const
                {user, originalParams, callback} = args;

            if( !originalParams.patientId || !originalParams.timestamp ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
            }

            let query = {
                status: {$ne: 'CANCELLED'},
                patientId: originalParams.patientId,
                actType: 'KBVUTILITY',
                timestamp: {
                    $lt: originalParams.timestamp
                }
            };

            if( originalParams.caseFolderId ) {
                query.caseFolderId = originalParams.caseFolderId;
            }

            if( originalParams.utIndicationCode ) {
                query.$or = [
                    {
                        utIndicationCode: {
                            $regex: '^' + originalParams.utIndicationCode,
                            $options: 'i'
                        }
                    },
                    {
                        utIndicationCode: {
                            $regex: '^' + originalParams.utIndicationCode.replace( /[a-z]$/, '' ),
                            $options: 'i'
                        }
                    }
                ];
            }

            if( originalParams.fromDate ) {
                query.timestamp.$gte = originalParams.fromDate;
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query,
                options: {
                    lean: true,
                    limit: 1,
                    sort: {timestamp: -1}
                },
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, result && result[0] || null );
                }
            } );
        }

        function getKbvUtilityAcuteEvents( args ) {
            const
                {user, originalParams, callback} = args;

            if( !originalParams.patientId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
            }

            let query = {
                status: {$ne: 'CANCELLED'},
                patientId: originalParams.patientId,
                actType: 'KBVUTILITY',
                utAcuteEvent: {
                    $ne: null
                }
            };

            if( originalParams.caseFolderId ) {
                query.caseFolderId = originalParams.caseFolderId;
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: query,
                options: {
                    lean: true,
                    select: {
                        utAcuteEvent: 1
                    },
                    sort: {timestamp: -1}
                },
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, (result || []).map( activity => activity.utAcuteEvent ) );
                }
            } );

        }

        function checkKbvUtilityExistence( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.checkKbvUtilityExistence', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.checkKbvUtilityExistence' );
            }
            const
                relatedDiagnosisGroups = [
                    ['WS1', 'WS2'],
                    ['EX1', 'EX2', 'EX3'],
                    ['AT1', 'AT2'],
                    ['LY1', 'LY2', 'LY3'],
                    ['SB4', 'SB5']
                ],
                makeIndicationCodeCriteria = ( group ) => {
                    var groups = [group];
                    relatedDiagnosisGroups.some( relatedGroups => {
                        if( -1 !== relatedGroups.indexOf( group ) ) {
                            groups = relatedGroups;
                            return true;
                        }
                    } );
                    return {$in: groups.map( grp => new RegExp( grp, 'i' ) )};
                },
                {user, originalParams, callback} = args;

            if( !originalParams.patientId || !originalParams.timestamp || !originalParams.indicationCode || !originalParams.icdCode ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
            }

            let query = {
                status: {$ne: 'CANCELLED'},
                patientId: originalParams.patientId,
                actType: 'KBVUTILITY',
                timestamp: {
                    $lt: originalParams.timestamp
                },
                utIcdCode: {$regex: '^' + originalParams.icdCode, $options: 'i'},
                utIndicationCode: makeIndicationCodeCriteria( originalParams.indicationCode )
            };

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: query,
                options: {
                    lean: true,
                    limit: 3,
                    sort: {timestamp: -1}
                },
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, result );
                }
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
            const
                {user, query, callback} = args,
                async = require( 'async' ),
                getActivity = promisifyArgsCallback( Y.doccirrus.api.activity.get );
            let
                incaseConfig,
                requiresLastSchein = ['TREATMENT', 'REFERRAL', 'INVOICE'], // used to skip extra call when it is not necessary
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
                    Y.doccirrus.api.incaseconfiguration.readConfig( {
                        user: user,
                        callback: function( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            incaseConfig = result;
                            return next();
                        }
                    } );
                },
                async function( next ) {
                    let [err, results] = await formatPromiseResult(
                        getActivity( {
                            user,
                            query,
                            options: {
                                lean: true
                            }
                        } )
                    );
                    if( err ) {
                        return next( err );
                    }
                    if( !results.length ) {
                        return next( Y.doccirrus.errors.rest( 400, 'activity not found', true ) );
                    }
                    finalResult.activity = results && results[0];
                    if( finalResult.activity.status === 'LOCKED' ) {
                        let lockedactivities;
                        [err, lockedactivities] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'lockedactivity',
                                action: 'get',
                                query: {
                                    _id: finalResult.activity._id,
                                    employeeId: user.specifiedBy
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `getActivityForFrontend: Error getting locked activities ${finalResult.activity._id}: ${err.stack || err}`, 'error', NAME );
                            return next( err );
                        }
                        if( lockedactivities.length ) {
                            finalResult.activity = lockedactivities[0].data;
                            finalResult.activity.status = 'LOCKED';
                        }
                    }
                    removeUser( finalResult.activity );
                    next( err, results && results[0] );
                },
                function( activity, next ) {
                    if( !requiresLastSchein.includes( activity.actType ) || activity.mirrorActivityId ) {
                        return setImmediate( next, null, activity );
                    }
                    Y.doccirrus.api.patient.lastSchein( {
                        user: user,
                        query: {
                            caseFolderId: activity.caseFolderId,
                            patientId: activity.patientId,
                            timestamp: activity.timestamp,
                            locationId: activity.locationId
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            finalResult.additionalActivityData.lastSchein = result && result[0];
                            next( null, activity );
                        }
                    } );
                },
                function( activity, next ) {
                    if( Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === activity.caseFolderId ) {
                        finalResult.additionalActivityData.caseFolder = {
                            _id: Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId(),
                            type: 'PREPARED'
                        };
                        removeUser( finalResult.additionalActivityData.caseFolder );
                        return next( null, activity );
                    }
                    /**
                     * Add caseFolder data
                     */
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
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
                            finalResult.populatedObj.continuousMedicationsObj = activities[0].continuousMedicationsObj || [];
                            finalResult.populatedObj.continuousIcdsObj = activities[0]._continuousIcdsObj || [];
                            finalResult.populatedObj.referencedByObj = activities[0]._referencedByObj || [];
                            finalResult.populatedObj.attachmentsObj = activities[0]._attachmentsObj || [];

                            next( err, activity );
                        }
                    } );
                },
                //  populate selected contact if one is specified (contact chosen to address DocLetter) MOJ-11944
                async function populateSelectedContact( activity, next ) {
                    if( activity.hasOwnProperty( 'selectedContact' ) ) {
                        finalResult.populatedObj.selectedContactObj = null;
                    }

                    if( !activity.selectedContact ) {
                        //  no value to load
                        return setImmediate( next, null, activity );
                    }

                    let err, result;

                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'basecontact',
                        query: {_id: activity.selectedContact}
                    } ) );

                    if( !err && result[0] ) {
                        finalResult.populatedObj.selectedContactObj = result[0];
                    }

                    next( err, activity );
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
                                    patientId: activity.patientId,
                                    locationId: activity.locationId,
                                    code: activity.code,
                                    catalogShort: activity.catalogShort,
                                    caseFolder: finalResult.additionalActivityData.caseFolder
                                },
                                options: {
                                    catalogTextHidden: incaseConfig.catalogTextHidden || false
                                }
                            }, function( err, treatmentData ) {
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, treatmentData );
                                next( err, activity );
                            } );
                            break;
                        case 'DIAGNOSIS':
                            doDiagnosisPipeline( {
                                user: user,
                                query: {
                                    locationId: activity.locationId,
                                    code: activity.code,
                                    catalogShort: activity.catalogShort
                                },
                                options: {
                                    catalogTextHidden: incaseConfig.catalogTextHidden || false
                                }
                            }, function( err, diagnosisData ) {
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, diagnosisData );
                                next( err, activity );
                            } );
                            break;
                        case 'SCHEIN':
                        case 'BGSCHEIN':
                        case 'PKVSCHEIN':
                            doScheinPipeline( {
                                user: user,
                                query: {
                                    patientId: activity.patientId,
                                    timestamp: activity.timestamp,
                                    locationId: activity.locationId,
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
                        case 'LABDATA': {
                            doLabDataPipeline( {user}, function( err, labData ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, labData );
                                next( err, activity );
                            } );
                            break;
                        }
                        case 'MEDICATIONPLAN':
                            doMedicationPipeline( {user}, function( err, medicationData ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, medicationData );
                                next( err, activity );
                            } );
                            break;
                        case 'GRAVIDOGRAMMPROCESS':
                            doGravidogrammPipeline( {user}, function( err, medData ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, medData );
                                next( err, activity );
                            } );
                            break;
                        case 'PERCENTILECURVE':
                            doPercentilecurvePipeline( {user}, function( err, medData ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, medData );
                                next( err, activity );
                            } );
                            break;
                        case 'MEDDATA':
                            doMedDataPipeline( {user}, function( err, medData ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, medData );
                                next( err, activity );
                            } );
                            break;
                        case 'INGREDIENTPLAN':
                            doMedDataPipeline(
                                {user, categories: [Y.doccirrus.schemas.v_meddata.medDataCategories.ACTIVEINGREDIENTS]},
                                function( err, medData ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, medData );
                                    next( err, activity );
                                } );
                            break;
                        case 'REFERRAL':
                            doReferralPipeline( {user}, function( err, referralData ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, referralData );
                                next( err, activity );
                            } );
                            break;
                        case 'KBVUTILITY2':
                        case 'KBVUTILITY2APPROVAL':
                            doKBVUtility2Pipeline( function( err, kbvutility2Data ) {
                                if( err ) {
                                    return next( err );
                                }
                                finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, kbvutility2Data );
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
         * Gets all necessary data for new activity
         * @method getNewActivityForFrontend
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.caseFolderId
         * @param {String} args.query.patientId
         * @param {String} args.query.timestamp
         * @param {String} args.query.actType
         * @param {String} args.query.locationId
         * @param {Function} args.callback
         * @returns {*}
         */
        function getNewActivityForFrontend( args ) {
            const moment = require( 'moment' );
            let
                user = args.user,
                query = args.query || {},
                callback = args.callback,
                caseFolderId = query.caseFolderId,
                patientId = query.patientId,
                timestamp = query.timestamp,
                actType = query.actType,
                locationId = query.locationId,
                selectedLocationId = query.selectedLocationId,
                incaseConfig,
                finalResult = {
                    additionalActivityData: {},
                    populatedObj: {}
                },
                async = require( 'async' );

            if( (!caseFolderId && 'QUOTATION' !== actType) || !patientId || !timestamp || !actType ) {
                Y.log( 'getNewActivityForFrontend. parameter(s) is missing. query: ' + JSON.stringify( query ), 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid data' ) );
            }

            async.series( [
                function( done ) {
                    Y.doccirrus.api.incaseconfiguration.readConfig( {
                        user: user,
                        callback: function( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            incaseConfig = result;
                            return done();
                        }
                    } );
                },
                function( done ) {
                    if( 'QUOTATION' === actType ) {
                        finalResult.additionalActivityData.lastSchein = null;
                        return setImmediate( done );
                    }

                    Y.doccirrus.api.patient.lastSchein( {
                        user: user,
                        query: {
                            caseFolderId: caseFolderId,
                            patientId: patientId,
                            timestamp: timestamp
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            let lastSchein = result && result[0];

                            finalResult.additionalActivityData.lastSchein = lastSchein;

                            if( lastSchein && !selectedLocationId ) {
                                locationId = lastSchein.locationId;
                            } else if( selectedLocationId ) {
                                locationId = selectedLocationId;
                            }

                            done();
                        }
                    } );

                },
                function( done ) {
                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && Y.doccirrus.schemas.activity.isScheinActType( actType ) ) {
                        const propsToDelete = ['_id', 'status', 'employeeName', 'employeeInitials', 'lastChanged', 'caseFolderId', 'timestamp', 'editor', 'invoiceData', 'scheinNotes', 'onHold', 'onHoldNotes', 'statusBeforeHold'];
                        let lastSchein = Object.assign( {}, finalResult.additionalActivityData.lastSchein );
                        if( !_.isEmpty( lastSchein ) && Y.doccirrus.schemas.activity.isScheinActType( actType ) && moment().diff( lastSchein.timestamp ) <= 3 ) {

                            propsToDelete.forEach( ( prop ) => {
                                delete lastSchein[prop];
                            } );

                            finalResult.additionalActivityData.scheinTemplate = lastSchein;

                            done();
                        } else {
                            Y.doccirrus.api.patient.lastSchein( {
                                user: user,
                                query: {
                                    patientId: patientId,
                                    timestamp: timestamp,
                                    gteTimestamp: moment( timestamp ).subtract( 3, 'months' ).toString()
                                },
                                options: {
                                    doNotQueryCaseFolder: true
                                },
                                callback: function( err, result ) {
                                    if( err ) {
                                        return done( err );
                                    }
                                    let lastSchein = result && result[0];

                                    if( lastSchein ) {
                                        propsToDelete.forEach( ( prop ) => {
                                            delete lastSchein[prop];
                                        } );

                                        finalResult.additionalActivityData.scheinTemplate = lastSchein;
                                    }
                                    done();
                                }
                            } );
                        }
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( Y.doccirrus.schemas.activity.isScheinActType( actType ) ) {
                        doScheinPipeline( {
                            user: user,
                            query: {
                                timestamp: timestamp,
                                locationId: locationId,
                                patientId: patientId,
                                caseFolderId: caseFolderId
                            },
                            options: {
                                continuousDiagnosis: true,
                                openScheinBL: true
                            }
                        }, function( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, result );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                async function( done ) {
                    let [err, caseFolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'get',
                        query: {
                            _id: caseFolderId
                        },
                        options: {
                            lean: true,
                            limit: 1
                        }
                    } ) );
                    if( err ) {
                        Y.log( `could not get case folder for treatment pipeline: ${err.stack || err}`, 'warn', NAME );
                    }
                    if( 'TREATMENT' === actType ) {
                        doTreatmentPipeline( {
                            user: user,
                            query: {
                                timestamp: timestamp,
                                patientId: patientId,
                                caseFolderId: caseFolderId,
                                caseFolder: caseFolders && caseFolders[0]
                            },
                            options: {
                                relevantDiagnoses: false,
                                skipCatalogText: true,
                                catalogTextHidden: incaseConfig.catalogTextHidden || false
                            }
                        }, function( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, result );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( 'MEDICATIONPLAN' === actType ) {
                        doMedicationPipeline( {
                            user
                        }, function( err, medicationData ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, medicationData );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( 'MEDDATA' === actType || 'INGREDIENTPLAN' === actType ) {
                        doMedDataPipeline( {
                            user,
                            categories: ('INGREDIENTPLAN' === actType) ? ['ACTIVEINGREDIENTS'] : null
                        }, function( err, medData ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, medData );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( 'LABDATA' === actType ) {
                        doLabDataPipeline( {user}, function( err, labData ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, labData );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( 'KBVUTILITY' === actType ) {
                        doKbvUtilityPipeline( {user, timestamp, patientId}, function( err, kbvUtilityData ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, kbvUtilityData );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( 'DIAGNOSIS' === actType ) {
                        doDiagnosisPipeline( {
                            user: user,
                            query: {},
                            options: {
                                skipCatalogText: true,
                                catalogTextHidden: incaseConfig.catalogTextHidden || false
                            }
                        }, function( err, diagnosisData ) {
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, diagnosisData );
                            done( err );
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( 'REFERRAL' === actType ) {
                        doReferralPipeline( {user}, function( err, referralData ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, referralData );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                },
                function( done ) {
                    if( ['KBVUTILITY2', 'KBVUTILITY2APPROVAL'].includes( actType ) ) {
                        doKBVUtility2Pipeline( function( err, kbvutility2Data ) {
                            if( err ) {
                                return done( err );
                            }
                            finalResult.additionalActivityData = Y.merge( finalResult.additionalActivityData, kbvutility2Data );
                            done();
                        } );
                    } else {
                        setImmediate( done );
                    }
                }
            ], function( err ) {
                if( err ) {
                    Y.log( 'getNewActivityForFrontend. error: ' + JSON.stringify( err ), 'error', NAME );
                }
                callback( err, finalResult );
            } );

        }

        /**
         * Gets bl codes which are already used in specified cas folder.
         * @method getCaseFolderBl
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.caseFolderId
         * @param {Object} args.query.patientId
         * @param {Array} [args.query.excludeActivities]
         * @param {Function} args.callback
         * @returns {*}
         */
        function getCaseFolderBl( args ) {
            var
                user = args.user,
                query = args.query || {},
                caseFolderId = query.caseFolderId,
                patientId = query.patientId,
                excludeActivities = query.excludeActivities || [],
                callback = args.callback,
                openedStatuses = ['VALID', 'APPROVED'];
            if( !caseFolderId || !patientId ) {
                Y.log( ' activity-api.getCaseFolderBl. caseFolderId or patientId is missing. query: ' + JSON.stringify( query ), 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'Bad params', true ) );
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'activity',
                query: {
                    _id: {$nin: excludeActivities},
                    patientId: patientId,
                    caseFolderId: caseFolderId,
                    status: {$in: openedStatuses},
                    fk4235Set: {
                        $exists: true,
                        $not: {$size: 0}
                    }
                },
                options: {
                    limit: 1,
                    lean: true
                },
                callback: function( err, result ) {
                    var
                        blCodes = [];
                    if( err ) {
                        return callback( err );
                    }
                    if( result && result[0] ) {
                        result[0].fk4235Set.forEach( fk4235Set => {
                            ((fk4235Set.fk4244Set || []).concat( (fk4235Set.fk4256Set || []) )).forEach( fk4244Set => {
                                if( -1 === blCodes.indexOf( fk4244Set.fk4244 ) ) {
                                    blCodes.push( fk4244Set.fk4244 );
                                }
                            } );
                        } );
                    }
                    callback( err, blCodes );
                }
            } );
        }

        /**
         * @method doTransition
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.activity
         * @param {String} args.data.transition
         * @param {Object} args.data.formforpdf
         * @param {String} args.data.tempid
         * @param {Boolean} args.data._isTest
         * @param {Object} [args.options]
         * @param {Object} [args.options.activityContext] passed to runDb as context
         * @param {Function} args.callback
         */
        function doTransition( args ) {
            var
                user = args.user,
                _final = args.callback,
                params = args.data,
                migrate = args.migrate,
                activity = params.hasOwnProperty( 'activity' ) ? params.activity : {},
                transition = params.hasOwnProperty( 'transition' ) ? params.transition : null,
                actType = activity.hasOwnProperty( 'actType' ) ? activity.actType : null,
                currState = activity.hasOwnProperty( 'status' ) ? activity.status : null,
                tempId = params.hasOwnProperty( 'tempid' ) ? params.tempid : null,
                options = Object.assign( {
                    migrate,
                    activityContext: args.activityContext || {}
                }, args.options || {} ),
                fsmName;

            Y.log( `doTransition: ${transition} on activity ${activity._id} ${activity.status}`, 'info', NAME );
            //  check paramaters

            if( (null === transition) || (null === actType) || (null === currState) ) {
                _final( Y.doccirrus.errors.rest( 409, 'Eintragstyp nicht gesetzt', true ) );
                return;
            }

            if( 'PREPARED' !== activity.status && !Y.doccirrus.schemas.activity.hasTransition( activity.actType, activity.status, transition ) ) {
                _final( Y.doccirrus.errors.rest( 409, 'Statuswechsel nicht verfügbar: ' + transition, true ) );
                return;
            }

            fsmName = Y.doccirrus.schemas.activity.getFSMName( activity.actType );

            if( !Y.doccirrus.fsm[fsmName].hasOwnProperty( transition ) ) {
                Y.log( 'Unimplemented state transition ' + transition + ' on ' + fsmName, 'error', NAME );
                _final( Y.doccirrus.errors.rest( 409, 'Statuswechsel nicht implementiert', true ) );
                return;
            }

            params._isTest = 'false' !== params._isTest;
            Y.doccirrus.activityapi.doTransition( user, options, activity, transition, params._isTest, onAfterTransition );

            //  After a successful first save we we may need to reassociate attached documents with the new activity
            //  Attachments will previously have been liked to a temporary identifier generated on the client

            function onAfterTransition( err, result ) {
                if( !err && tempId ) {
                    Y.doccirrus.api.document.claimForActivityId(
                        user,
                        tempId,
                        result[0].data._id,
                        function onAfterDocumentsClaimed( err2 ) {
                            _final( err2, result );
                        } );
                } else {
                    _final( err, result );
                }
            }
        }

        /**
         *  Expanded version of doTransition which can also save documents and start a print job
         *
         *  Wrapper for operations which often happen in sequence, and can be slowed by several round trips to the server
         *
         *  Overall process:
         *
         *      1. Create / update documents
         *      2. Run the activity transition, deferring some post-processes
         *      3. Generate a PDF if printing
         *      4. Send to printer if printing
         *      5. Expand attachments in response, pre-emppt client asking for update to documents
         *      6. Kick off deferred post-processes to run rules and update secondary objects
         *
         *  @method doTransitionPlus
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {Object}    args.data.activity
         *  @param  {String}    args.data.transition
         *  @param  {Object}    args.data.formforpdf
         *  @param  {String}    args.data.tempid
         *  @param  {Object}    args.data.documents                         Array of documents to create or update
         *  @param  {String}    args.data.printPdf                          Name of printer to use
         *  @param  {Number}    args.data.printCopies                       Number of copies to print
         *  @param  {Boolean}   args.data.recreatePDF                       Make a new PDF for this activity
         *  @param  {Boolean}   args.data.skipInvalidateParentActivities    Skip data consistency check of linked activities parent
         *  @param  {Boolean}   args.data._isTest
         *  @param  {Object}    [args.options]
         *  @param  {Object}    [args.options.activityContext]              passed to runDb as context
         *  @param  {Function}  args.callback
         *
         */

        async function doTransitionPlus( args ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                populateAttachmentsP = util.promisify( populateAttachments ),

                toPDFP = promisifyArgsCallback( Y.doccirrus.forms.renderOnServer.toPDF ),
                doTransitionP = promisifyArgsCallback( doTransition ),
                printMediaP = promisifyArgsCallback( Y.doccirrus.api.media.print ),

                user = args.user,
                params = args.data,
                activity = params.activity || null,
                printPdf = params.printPdf || null,
                //printCopies = params.printCopies || 0, // currently requested by client
                recreatePdf = params.recreatePdf || false,
                callback = args.callback,

                activityContext = {
                    skipInvalidateParentActivities: params.skipInvalidateParentActivities
                };

            let
                err,
                doc,
                docRequest,
                newDocId,
                transitionResult,
                hasTransitionResult,
                pdfMediaId,
                printResult;

            // TODO: timing code to be removed once performance testing on customer systems is complete, mid 2019
            let timing = [], randId = Y.doccirrus.comctl.getRandId();
            Y.dcforms.addTimingPoint( timing, randId + ' (start doTransitionPlus)' );

            if( !activity ) {
                return handleResult( new Error( 'No activity passed to transition.' ), null, callback );
            }
            // 0. Check linked activities ( if any ) for LOCKED status to avoid APPROVE them
            if( ['approve', 'repeat'].includes( params.transition ) && activity.activities && activity.activities.length ) {
                let [err, count] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        _id: {$in: activity.activities},
                        status: 'LOCKED'
                    }
                } ) );

                if( err ) {
                    Y.log( `Could not check linked activities for LOCKED status: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, null, callback );
                }
                if( count > 0 ) {
                    //should not happen - APPROVE button is disabled on UI in this case
                    return handleResult( new Error( `Couldn't approve activity with LOCKED linked activities` ), null, callback );
                }
            }

            //  1. Create / update documents

            params.documents = params.documents ? params.documents : [];
            activity.attachments = activity.attachments || [];

            for( doc of params.documents ) {

                docRequest = {
                    user: user,
                    model: 'document',
                    data: Y.doccirrus.filters.cleanDbObject( doc )
                };

                if( doc._id ) {
                    docRequest.action = 'put';
                    docRequest.query = {_id: doc._id};
                    docRequest.fields = Object.keys( doc );

                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( docRequest ) );

                    if( err ) {
                        Y.log( `Could not save new attachment: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    Y.log( `Updated existing attachment: ${doc._id}`, 'debug', NAME );

                } else {
                    docRequest.action = 'post';
                    [err, newDocId] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( docRequest ) );

                    if( err ) {
                        Y.log( `Could not update existing attachment: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    Y.log( `Saved new attachment, adding to activity: ${newDocId}`, 'debug', NAME );
                    if( newDocId && newDocId[0] ) {
                        doc._id = newDocId[0];
                        activity.attachments.push( newDocId[0] );
                    }
                }

            }

            Y.dcforms.addTimingPoint( timing, randId + ' saved ' + params.documents.length + ' documents to db' );

            //  2. Run the activity transition

            args.activityContext = activityContext;
            [err, transitionResult] = await formatPromiseResult( doTransitionP( args ) );

            if( err ) {
                Y.log( `Could not complete transition ${params.transition}: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, transitionResult, callback );
            }

            Y.dcforms.addTimingPoint( timing, randId + ' ran activity transition ' + JSON.stringify( params.transition ) );

            hasTransitionResult = (transitionResult && transitionResult[0] && transitionResult[0].data);

            //  3. Generate a PDF if requested or if printing

            if( (printPdf && hasTransitionResult) || (recreatePdf && hasTransitionResult) ) {
                Y.log( `Checking or generating PDF for print job: ${printPdf}`, 'debug', NAME );

                [err, pdfMediaId] = await formatPromiseResult( toPDFP( {
                    user: user,
                    formId: hasTransitionResult.formId,
                    formVersionId: hasTransitionResult.formVersion,
                    mapCollection: 'activity',
                    mapObject: hasTransitionResult._id.toString(),
                    saveTo: 'db',
                    skipTriggerRules: true,
                    skipTriggerSecondary: true,
                    activity: hasTransitionResult
                } ) );

                if( err ) {
                    //  TODO: ws event to report this failure to user, transition returns as usual
                    Y.log( `Could not generate PDF on transition: ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( `doTransition plus generated PDF, media._id: ${pdfMediaId}`, 'debug', NAME );
                }
            }

            Y.dcforms.addTimingPoint( timing, randId + ' generated PDF ' + pdfMediaId );

            //  4. Send to printer if printing

            if( pdfMediaId && printPdf ) {
                Y.log( `Printing PDF ${pdfMediaId} to ${printPdf}`, 'info', NAME );

                [err, printResult] = await formatPromiseResult(
                    printMediaP( {
                        user: user,
                        originalParams: {
                            printerName: printPdf,
                            mediaId: pdfMediaId
                        }
                    } )
                );

                if( err ) {
                    Y.log( `Could not export PDF to disk: ${err.stack || err}`, 'warn', NAME );
                    //  TODO: ws event to report this failure to user, transition returns as usual
                } else {
                    Y.log( `Sent PDF ${pdfMediaId} to printer: ${printResult}`, 'debug', NAME );

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        nsp: 'default',
                        event: 'asyncPDFPrinted',
                        msg: {
                            data: {
                                'status': 'complete',
                                'mediaId': pdfMediaId,
                                'printerName': printPdf,
                                'mapId': activity._id,
                                'mapCollection': 'activity',
                                'msg': printResult.msg
                            }
                        }
                    } );

                }
            }

            Y.dcforms.addTimingPoint( timing, randId + ' printed PDF ' + pdfMediaId + ' to ' + printPdf );

            //  5. Expand attachments in response, pre-empt client asking for update to documents

            transitionResult.documents = params.documents;

            if( params.documents.length > 0 || printPdf || recreatePdf ) {
                let activityModel;

                [err, activityModel] = await formatPromiseResult( getModelP( user, 'activity', false ) );

                if( err ) {
                    //  should not happen
                    Y.log( `Could not instantiate activity model: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                //  re-load the activity with new attachment metadata
                let plainActivities;

                [err, plainActivities] = await formatPromiseResult( activityModel.mongoose.find( {_id: transitionResult[0].data._id} ) );

                if( !err && !plainActivities[0] ) {
                    err = new Error( 'Could not reload activity: ', transitionResult[0].data._id );
                }

                if( err ) {
                    Y.log( `Could not re-load activity with new document metadata: ${err.stack || err}`, 'error', NAME );
                } else {

                    //  remove mongoose stuff and get a plain object
                    transitionResult[0].data = plainActivities[0].toObject();

                    let rePopulated;

                    [err, rePopulated] = await formatPromiseResult( populateAttachmentsP( activityModel, [transitionResult[0].data] ) );

                    if( !rePopulated || !rePopulated[0] ) {
                        //  should never happen
                        err = new Error( 'Could not re-populate activity after transition.' );
                    }

                    if( err ) {
                        //  should not happen
                        Y.log( `Could not expand updated attachments to return to client: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, transitionResult, callback );
                    } else {
                        transitionResult[0].data = rePopulated[0];
                    }

                }

            }

            Y.dcforms.addTimingPoint( timing, randId + ' populated activity attachments ' + pdfMediaId + ' to ' + printPdf );

            //  X.  Done

            Y.dcforms.addTimingPoint( timing, randId + ' (end doTransitionPlus)' );
            //Y.dcforms.printTiming( timing );

            return handleResult( null, transitionResult, callback );
        }

        /**
         * @method copeActivity
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.activityId
         * @param {Function} args.callback
         * @returns {*}
         */
        function copeActivity( args ) {
            let
                user = args.user,
                callback = args.callback,
                params = args.data,
                activityId = params.activityId,
                currentDate = params.currentDate,
                setLocationId = params.locationId,
                setEmployeeId = params.employeeId,
                setTimestamp = params.timestamp,
                setCaseFolderId = params.caseFolderId;

            if( !activityId ) {
                Y.log( 'copeActivity. activityId is missing', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'Bad params', true ) );
            }

            function returnActivity( err, activity ) {
                if( err ) {
                    Y.log( 'copeActivity. error: ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }
                callback( null, {activity: activity} );
            }

            Y.doccirrus.activityapi.copyActivity( user, activityId, {
                currentDate: currentDate,
                setLocationId: setLocationId,
                setEmployeeId: setEmployeeId,
                setTimestamp: setTimestamp,
                setCaseFolderId: setCaseFolderId
            }, returnActivity );
        }

        function validateInvoices( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.validateInvoices', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.validateInvoices' );
            }
            const
                moment = require( 'moment' ),
                Prom = require( 'bluebird' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            function validate( invoice ) {

                var errors = [],
                    ruleStatus = 'VALID',
                    from = moment( invoice.timestamp ),
                    to = moment( invoice.timestamp ),
                    patientId = invoice.patientId,
                    caseFolderId = invoice.caseFolderId,
                    linkedIds = invoice.activities.concat( invoice.icds );

                return runDb( {
                    action: 'get',
                    model: 'activity',
                    user: user,
                    query: {
                        _id: {
                            $in: linkedIds
                        },
                        status: 'VALID'
                    },
                    options: {
                        lean: true,
                        fields: {
                            timestamp: 1
                        }
                    }
                } ).each( activity => {
                    var timestamp = moment( activity.timestamp );
                    if( timestamp.isBefore( from ) ) {
                        from = timestamp;
                    } else if( timestamp.isAfter( to ) ) {
                        to = timestamp;
                    }
                } ).then( () => {
                    return Y.doccirrus.api.rulelog.collectRuleLogEntries( {
                        user: args.user,
                        patientId: patientId,
                        caseFolderId: caseFolderId,
                        from: from.toDate(),
                        to: to.toDate()
                    } );
                } ).each( result => {
                    result._id = undefined;
                    result.__v = undefined;
                    if( 'ERROR' === result.ruleLogType ) {
                        ruleStatus = 'INVALID';
                    }
                    errors.push( result );
                } ).then( () => {
                    var data = {
                        ruleStatus: ruleStatus,
                        ruleErrors: errors
                    };

                    //  increment progress bar on client
                    if( args.onSingleValidation && 'function' === typeof args.onSingleValidation ) {
                        args.onSingleValidation( invoice._id.toString(), invoice.content || '' );
                    }
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'update',
                        migrate: true,
                        query: {
                            _id: invoice._id.toString()
                        },
                        data
                    } );
                } );

            }

            if( !params || !Array.isArray( params.invoiceIds ) ) {
                return callback( Y.doccirrus.errors.rest( '500' ) );
            }

            runDb( {
                action: 'get',
                model: 'activity',
                user: user,
                query: {
                    _id: {
                        $in: params.invoiceIds
                    }
                },
                options: {
                    lean: true,
                    fields: {patientId: 1, caseFolderId: 1, timestamp: 1, activities: 1, icds: 1, locationId: 1}
                }
            } ).each( validate )
                .then( () => callback() )
                .catch( err => callback( err ) );
        }

        /**
         *  Step an invoice activity through approval and billing and print the resulting PDF
         *
         *  This action should call back quickly and continue  generating and printing the PDF in the background
         */

        function quickPrint( args ) {
            var
                params = args.originalParams,
                user = args.user,
                activity = params.activity,
                attachments = params.attachments || [],
                numCopies = params.numCopies,

                //  FSM transition options
                options = {
                    fast: true,
                    print: true,
                    numCopies: numCopies,
                    onPDFProgress: onPDFProgress
                };

            if( params.printerName ) {
                options.printerName = params.printerName;
            }

            async.series(
                [
                    validateActivity,
                    saveAllAttachments,
                    approveActivity,
                    billActivity
                ],
                onAllDone
            );

            // 1. save/validate the activity
            function validateActivity( itcb ) {
                // if already validated we can skip this step
                if( 'CREATED' !== activity.status ) {
                    return itcb( null );
                }

                function onValidateTransition( err, result ) {
                    //  result should have the form { state: newState, data: activity}

                    var
                        hasResult = (result && result[0] && result[0].data),
                        newState = (hasResult) ? result[0].state : activity.status;

                    activity = (hasResult) ? result[0].data : activity;

                    if( !err && 'VALID' !== newState ) {
                        Y.log( 'Validate transition was blocked for activity ' + (activity._id || '(not saved)'), 'warn', NAME );
                        err = new Error( 'Validate transition was blocked for activity ' + (activity._id || '(not saved)') );
                    }

                    itcb( err );
                }

                Y.doccirrus.activityapi.doTransition( user, options, activity, 'validate', false, onValidateTransition );
            }

            // 1.5 save any attachments and add them to the activity
            function saveAllAttachments( itcb ) {

                if( !attachments || 0 === attachments.length ) {
                    //  if not attachments then we can skip this step
                    Y.log( 'No attachments sent with quickprint, skipping step', 'debug', NAME );
                    itcb( null );
                    return;
                }

                async.eachSeries( attachments, saveSingleAttachment, onAllAttachmentsSaved );

                function saveSingleAttachment( attachment, escb ) {
                    var
                        saveArgs = {
                            'action': 'post',
                            'user': args.user,
                            'model': 'document'
                        },
                        k;

                    function onSingleAttachmentSaved( err, data ) {
                        if( err && '{}' === JSON.stringify( err ) ) {
                            err = null;
                        }

                        if( err ) {
                            Y.log( 'Error saving attachment: ' + JSON.stringify( err ), 'debug', NAME );
                        } else {
                            if( data ) {
                                data = data[0] ? data[0] : data;
                                data = data._id ? data._id : data;

                                Y.log( 'Saved new attachment, adding to activity: ' + data, 'debug', NAME );
                                activity.attachments.push( data );
                            }
                        }
                        escb( err );
                    }

                    saveArgs.activityId = activity._id + '';
                    saveArgs.data = Y.doccirrus.filters.cleanDbObject( attachment );
                    saveArgs.callback = onSingleAttachmentSaved;

                    if( attachment._id ) {
                        saveArgs.action = 'put';
                        saveArgs.data.fields_ = [];
                        for( k in attachment ) {
                            if( attachment.hasOwnProperty( k ) ) {
                                if( '_id' !== k ) {
                                    saveArgs.data.fields_.push( k );
                                }
                            }
                        }
                    }

                    Y.doccirrus.mongodb.runDb( saveArgs );
                }

                function onAllAttachmentsSaved( err ) {
                    if( err ) {
                        Y.log( 'Error while saving attachments: ' + JSON.stringify( err ), 'warn', NAME );
                    } else {
                        Y.log( 'all attachments saved: ' + JSON.stringify( activity.attachments ), 'debug', NAME );
                    }

                    itcb( err );
                }
            }

            // 2. approve the activity (this will kick off PDF generation)
            function approveActivity( itcb ) {
                // if already approved we can skip this step
                if( 'VALID' !== activity.status ) {
                    return itcb( null );
                }

                /**
                 *  @param  err     {Object}
                 *  @param  result  {Object}    should have the form { state: newState, data: activity}
                 */

                function onApproveTransition( err, result ) {

                    var
                        hasResult = (result && result[0] && result[0].data),
                        newState = (hasResult) ? result[0].state : activity.status;

                    activity = (hasResult) ? result[0].data : activity;

                    if( !err && 'APPROVED' !== newState ) {
                        Y.log( 'Approve transition was blocked for activity ' + activity._id, 'warn', NAME );
                        err = new Error( 'Approve transition was blocked for activity ' + activity._id );
                    }
                    itcb( err );
                }

                Y.doccirrus.activityapi.doTransition( user, options, activity, 'approve', false, onApproveTransition );
            }

            // 3. set activity status to billed
            async function billActivity( itcb ) {
                // if already billed we can skip this step
                if( 'APPROVED' !== activity.status ) {
                    return itcb( null );
                }

                const [err, activitySettings] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activitysettings',
                        action: 'get',
                        query: {}
                    } )
                );

                if( err ) {
                    Y.log( `Error getting activitySettings: ${err.stack || err}.`, 'error', NAME );

                    itcb( err );
                }

                let currentActivitySettings;
                if( activitySettings.length ) {
                    currentActivitySettings = activitySettings[0].settings.find( el => el.actType === activity.actType );
                }

                //  this step is controlled by configuration setting described in MOJ-5571
                if( !currentActivitySettings || !currentActivitySettings.quickPrintInvoiceBill || !Y.doccirrus.schemas.activity.isLegalNewStatus( activity.actType, activity.status, 'BILLED' ) ) {
                    itcb( null );
                    return;
                }

                function onBillTransition( err, result ) {
                    //  result should have the form { state: newState, data: activity}
                    var
                        hasResult = (result && result[0] && result[0].data),
                        newState = (hasResult) ? result[0].state : activity.status;

                    activity = (hasResult) ? result[0].data : activity;

                    if( !err && 'BILLED' !== newState ) {
                        Y.log( 'Bill transition was blocked for activity ' + activity._id, 'warn', NAME );
                        err = new Error( 'Bill transition was blocked for activity ' + activity._id );
                    }

                    itcb( err );
                }

                Y.doccirrus.activityapi.doTransition( user, options, activity, 'bill', false, onBillTransition );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error running quickprint: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }
                args.callback( null, {'newState': activity.status, data: activity} );
            }

            function onPDFProgress( evt ) {
                evt.targetId = args.user.identityId;
                Y.dcforms.raisePdfProgressEvent( evt );
            }

        }

        async function getLastScheinLocation( args ) {
            const {user, patientId, timestamp, caseFolderId} = args;

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'activity',
                query: {
                    patientId,
                    actType: {$in: Y.doccirrus.schemas.activity.scheinActTypes},
                    timestamp: {$lte: timestamp},
                    caseFolderId
                },
                options: {
                    lean: true,
                    sort: {timestamp: -1},
                    limit: 1,
                    select: {
                        locationId: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `could not get last schein to get location: ${err.stack | err}`, 'warn', NAME );
                throw err;
            }

            const locationId = results && results[0] && results[0].locationId;
            let locations;

            if( locationId ) {
                [err, locations] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'location',
                    query: {
                        _id: locationId
                    },
                    options: {
                        lean: true
                    }
                } ) );

                if( err ) {
                    Y.log( `could not get last schein location: ${err.stack | err}`, 'warn', NAME );
                    throw err;
                }
            }

            return locations && locations[0];
        }

        async function getPatient( args ) {
            const {user, patientId} = args;
            const patients = await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'patient',
                query: {
                    _id: patientId
                },
                options: {
                    lean: true
                }
            } );

            if( !patients || !patients[0] ) {
                Y.log( `generateMedicationPlan. Patient not found. _id: ${patientId}`, 'warn', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `Patient not found. _id: ${patientId}`} );
            }
            return patients[0];
        }

        async function getLocation( args ) {
            const {user, locationId} = args;
            const locations = await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'location',
                query: {
                    _id: locationId
                },
                options: {
                    lean: true
                }
            } );

            if( !locations || !locations[0] ) {
                Y.log( `generateMedicationPlan. Location not found. _id: ${locationId}`, 'warn', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: `Location not found. _id: ${locationId}`} );
            }
            return locations[0];
        }

        async function getEmployee( args ) {
            const {user, employeeId, locationId, patient} = args;

            let employees = await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'employee',
                query: {
                    _id: employeeId,
                    $or: [
                        {type: 'PHYSICIAN'},
                        {type: 'PHARMACIST'}
                    ]
                },
                options: {
                    lean: true
                }
            } );

            if( employees[0] ) {
                return employees[0];
            }

            // TODO: MP old code does this but did not check if employeeId exists on insurance. Not sure if this here is right

            const insurance = patient.insuranceStatus.find( data => data.locationId === locationId.toString() );
            if( insurance && insurance.employeeId ) {
                employees = await Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'employee',
                    query: {
                        _id: insurance.employeeId,
                        $or: [
                            {type: 'PHYSICIAN'},
                            {type: 'PHARMACIST'}
                        ]
                    },
                    options: {
                        lean: true
                    }
                } );
            }

            return employees[0];
        }

        function mapMedicationPlanGender( gender ) {
            let mappedGender;
            switch( gender ) {
                case 'MALE':
                    mappedGender = 'm';
                    break;
                case 'FEMALE':
                    mappedGender = 'w';
                    break;
                case 'VARIOUS':
                    mappedGender = 'divers';
                    break;
                default:
                    mappedGender = 'unbestimmt';
                    break;
            }
            return mappedGender;
        }

        function mapMedicationPlanData( args ) {
            const
                simpleperson = Y.doccirrus.schemas.simpleperson,
                person = Y.doccirrus.schemas.person;
            let
                {
                    employee = {},
                    patient,
                    location,
                    lastScheinLocation,
                    medicationPlanEntries,
                    patientWeight,
                    patientHeight,
                    patientCreatinineValue,
                    patientGender,
                    patientAllergiesAndIntolerances,
                    patientLactation,
                    patientPregnant,
                    patientParameter1,
                    patientParameter2,
                    patientParameter3
                } = args,
                simplePerson = simpleperson.getSimplePersonFromPerson( employee ),
                medicationEntries = [],
                locationAddress = lastScheinLocation ? lastScheinLocation : location,
                medicationPlan = {
                    AUTHOR: {
                        NAME: person.personDisplay( employee ),
                        CITY: locationAddress.city,
                        STREET: `${locationAddress.street} ${locationAddress.houseno}`,
                        ZIP: locationAddress.zip,
                        PHONE: locationAddress.phone || simplePerson.phone || simplePerson.mobile,
                        EMAIL: locationAddress.email || simplePerson.email
                    },
                    PATIENT: {
                        TITLE: patient.title,
                        FIRSTNAME: patient.firstname,
                        PREFIX: patient.fk3120,
                        NAMEAFFIX: patient.nameaffix,
                        LASTNAME: patient.lastname,
                        PARAMETERS: {},
                        BIRTHDATE: patient.kbvDob
                    },
                    IDENTIFICATION: {
                        LANGUAGECODE: 'de-DE',
                        PRINTINGDATE: moment().valueOf(),
                        //"IDENTIFICATIONNAME": "4A3178DB13504F929C8E4B8D181D10B6",
                        VERSION: '026'

                    },
                    CARRIERBLOCKS: [
                        {
                            MEDICATIONENTRIES: medicationEntries
                        }
                    ]
                };

            if( patientWeight ) {
                medicationPlan.PATIENT.PARAMETERS.WEIGHT = patientWeight;
            }
            if( patientHeight ) {
                medicationPlan.PATIENT.PARAMETERS.HEIGHT = patientHeight;
            }
            if( patientCreatinineValue ) {
                medicationPlan.PATIENT.PARAMETERS.CREATININE = patientCreatinineValue;
            }
            if( patientGender ) {
                medicationPlan.PATIENT.PARAMETERS.GENDER = mapMedicationPlanGender( patientGender );
            }
            if( patientAllergiesAndIntolerances ) {
                medicationPlan.PATIENT.PARAMETERS.ALLERGY = patientAllergiesAndIntolerances; // TODO: MP check INTOLERANCE?
            }
            if( patientLactation ) {
                medicationPlan.PATIENT.PARAMETERS.LACTATION = '1';
            }
            if( patientPregnant ) {
                medicationPlan.PATIENT.PARAMETERS.PREGNANCY = '1';
            }
            if( patientParameter1 ) {
                medicationPlan.PATIENT.PARAMETERS.PARAMETER1 = patientParameter1;
            }
            if( patientParameter2 ) {
                medicationPlan.PATIENT.PARAMETERS.PARAMETER2 = patientParameter2;
            }
            if( patientParameter3 ) {
                medicationPlan.PATIENT.PARAMETERS.PARAMETER3 = patientParameter3;
            }

            function buildMedicationEntry( medicationPlanEntry ) {
                const
                    entry = {
                        ENTRYTYPE: 'LABELEDDRUG'
                    },
                    dosage = Y.doccirrus.schemas.activity.getMedicationDosis( medicationPlanEntry );

                if( medicationPlanEntry.phPZN ) {
                    entry.PZN = medicationPlanEntry.phPZN;
                    entry.ENTRYTYPE = 'LABELEDDRUG';
                } else {
                    let
                        activeIngr = medicationPlanEntry.phIngr || [];
                    entry.ENTRYTYPE = 'ACTIVESUBSTANCE';
                    entry.ACTIVESUBSTANCENAME = activeIngr.map( item => item.name.replace( /~/mg, '\\~' ) ).join( '~' );
                    entry.STRENGTH = activeIngr.map( item => (item.strength || '').replace( /~/mg, '\\~' ) ).join( '~' );
                    entry.DRUGNAME = medicationPlanEntry.phNLabel;
                    entry.PHARMFORM = `${medicationPlanEntry.phForm}`;

                    if( medicationPlanEntry.phFormCode && medicationPlanEntry.phFormCode.indexOf( ' ' ) !== -1 ) {
                        entry.PHARMFORMCODE = medicationPlanEntry.phFormCode.substring( 0, medicationPlanEntry.phFormCode.indexOf( ' ' ) );
                    } else if( medicationPlanEntry.phFormCode ) {
                        entry.PHARMFORMCODE = medicationPlanEntry.phFormCode;
                    }
                }

                if( dosage ) {
                    entry.DOSAGESCHEDULE = dosage;
                }

                if( medicationPlanEntry.phUnit ) {
                    entry.DOSEQUANTITY = `${medicationPlanEntry.phUnit}`;
                }
                if( medicationPlanEntry.phDosisUnitCode ) {
                    entry.DOSEQUANTITYCODE = medicationPlanEntry.phDosisUnitCode.substring( 0, medicationPlanEntry.phDosisUnitCode.indexOf( ' ' ) );
                }

                entry.REFERENCE = medicationPlanEntry.phNote;
                entry.OBSERVATION = medicationPlanEntry.phReason;

                return entry;
            }

            function buildFreeText( medicationPlanEntry ) {
                const entry = {
                    ENTRYTYPE: 'FREETEXT',
                    FREETEXT: medicationPlanEntry.freeText
                };

                return entry;
            }

            function buildBindText( medicationPlanEntry, lastMedicationPlanEntry, lastEntry ) {
                if( lastMedicationPlanEntry && ['MEDICATION', 'MEDICATION_RECIPE'].includes( lastMedicationPlanEntry.type ) && lastEntry ) {
                    lastEntry.BINDTEXT = medicationPlanEntry.bindText;
                }
            }

            function buildMedicationRecipe( medicationPlanEntry ) {
                const entry = {
                    ENTRYTYPE: 'PRESCRIPTION',
                    FREETEXT: medicationPlanEntry.medicationRecipeText
                };

                return entry;
            }

            function buildSubHeading( medicationPlanEntry ) {
                const entry = {
                    SUBHEADING: medicationPlanEntry.subHeadingText,
                    ENTRYTYPE: 'HEADING'
                };

                if( medicationPlanEntry.subHeadingCode ) {
                    // '419 https://fhir.kbv.de/CodeSystem/74_CS_SFHIR_BMP_ZWISCHENUEBERSCHRIFT'
                    entry.SUBHEADINGCODE = medicationPlanEntry.subHeadingCode.substring( 0, medicationPlanEntry.subHeadingCode.indexOf( ' ' ) );
                }

                return entry;
            }

            let medicationEntriesIndex = 0; // need to keep track of index manually because BINDTEXT entries will not be pushed
            medicationPlanEntries.forEach( ( medicationPlanEntry, index ) => {
                let entry;

                switch( medicationPlanEntry.type ) {
                    case 'MEDICATION':
                        entry = buildMedicationEntry( medicationPlanEntry );
                        break;
                    case 'FREETEXT':
                        entry = buildFreeText( medicationPlanEntry );
                        break;
                    case 'BINDTEXT':
                        buildBindText( medicationPlanEntry, medicationPlanEntries[index - 1], medicationEntries[medicationEntriesIndex - 1] );
                        return;
                    case 'MEDICATION_RECIPE':
                        entry = buildMedicationRecipe( medicationPlanEntry );
                        break;
                    case 'SUB_HEADING':
                        entry = buildSubHeading( medicationPlanEntry );
                        break;
                }
                medicationEntriesIndex++;
                medicationEntries.push( entry );
            } );

            return medicationPlan;
        }

        function createDocument( args ) {
            const {user, activityId, locationId, media} = args;
            let
                data = {
                    type: 'MEDICATIONPLAN',
                    url: '/media/' + Y.doccirrus.media.getCacheFileName( media, false ),
                    publisher: 'From MMI',
                    contentType: Y.doccirrus.media.getMimeType( media.mime ),
                    attachedTo: activityId,           //  deprecated, see MOJ-9190
                    activityId: activityId,
                    patientId: null,
                    locationId: locationId,
                    caption: media.name,
                    createdOn: moment().toISOString(),
                    mediaId: media._id,
                    accessBy: []
                };

            return Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: 'document',
                data: Y.doccirrus.filters.cleanDbObject( data )
            } );
        }

        async function removeDocument( args ) {
            const {user, document} = args;
            let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'media',
                action: 'delete',
                query: {
                    _id: document.mediaId
                }
            } ) );

            if( err ) {
                Y.log( `could not delete existing media of document ${document._id}: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'document',
                action: 'delete',
                query: {
                    _id: document._id
                }
            } ) );

            if( err ) {
                Y.log( `could not delete existing document ${document._id}: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
        }

        function saveAttachment( args ) {
            const {user, activityId, attachments} = args;
            let data = {
                attachments,
                skipcheck_: true
            };

            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'put',
                model: 'activity',
                query: {_id: activityId},
                data: data,
                fields: ['attachments'],
                context: {
                    regenerateMedicationPlanPDF: false,
                    noMedicationCheck: true
                }
            } );
        }

        async function updateAttachment( args ) {
            let {user, activityId, documentId, attachments} = args;

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'document',
                query: {
                    _id: {$in: attachments},
                    type: 'MEDICATIONPLAN'
                },
                options: {
                    lean: true,
                    select: {mediaId: 1}
                }
            } ) );

            if( err ) {
                Y.log( `could not get existing documents for kbv medication plan ${activityId}: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            const document = results[0];

            if( document ) {

                await removeDocument( {user, document} );
                attachments = attachments.filter( id => document._id.toString() !== id );
            }

            attachments.push( documentId );

            [err] = await formatPromiseResult( saveAttachment( {user, activityId, attachments} ) );

            if( err ) {
                Y.log( `could not get save attachments for kbv medication plan ${activityId}: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
        }

        /**
         * Generates new medication plan(pdf) and replaces old plan with new one.
         * @method generateMedicationPlan
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data activity data
         * @param {String} args.data._id activity id
         * @param {String} args.data.patientWeight
         * @param {String} args.data.patientHeight
         * @param {String} args.data.patientCreatinineValue
         * @param {String} args.data.patientAllergiesAndIntolerances
         * @param {String} args.data.patientLactation
         * @param {String} args.data.patientPregnant
         * @param {String} args.data.patientParameter1
         * @param {String} args.data.patientParameter2
         * @param {String} args.data.patientParameter3
         * @param {String} args.data.medicationPlanEntries
         * @param {String} args.data.patientId
         * @param {String} args.data.employeeId
         * @param {String} args.data.locationId
         * @param {Array} args.data.attachments
         * @param {Date} args.data.timestamp
         * @param {Function} args.callback
         */
        async function updateKBVMedicationPlanPdf( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.updateKBVMedicationPlanPdf', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.updateKBVMedicationPlanPdf' );
            }

            const mediaCacheDir = Y.doccirrus.media.getCacheDir();
            const util = require( 'util' );
            const concatenatePDFsAsync = util.promisify( Y.doccirrus.media.pdf.concatenatePDFs );
            const importMediaFromFileAsync = util.promisify( Y.doccirrus.media.importMediaFromFile );

            function writeTmpFile( data ) {
                let
                    mongoose = require( 'mongoose' ),
                    tmpFileName = `${new mongoose.Types.ObjectId().toString()}_original.APPLICATION_PDF.pdf`;
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.media.writeFile( mediaCacheDir + tmpFileName, mediaCacheDir, Buffer.from( data ), function( err ) {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( tmpFileName );
                        }
                    } );
                } );
            }

            const generateCarrierSegmentsAsync = promisifyArgsCallback( Y.doccirrus.api.mmi.generateCarrierSegments );
            const generateMedicationPlanPDFAsync = promisifyArgsCallback( Y.doccirrus.api.mmi.generateMedicationPlanPDF );
            const {
                user, data: {
                    _id: activityId,
                    patientWeight,
                    patientHeight,
                    patientCreatinineValue,
                    patientGender,
                    patientAllergiesAndIntolerances,
                    patientLactation,
                    patientPregnant,
                    patientParameter1,
                    patientParameter2,
                    patientParameter3,
                    medicationPlanEntries,
                    patientId,
                    employeeId,
                    locationId,
                    attachments,
                    caseFolderId,
                    timestamp
                } = {}, callback
            } = args;
            let err, patient, employee, lastScheinLocation, location;

            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                return handleResult( undefined, undefined, callback );
            }

            // getDataForPdf

            [err, lastScheinLocation] = await formatPromiseResult( getLastScheinLocation( {
                user,
                patientId,
                timestamp,
                caseFolderId
            } ) );

            if( err ) {
                Y.log( `could not get last schein location for kbv medication plan ${activityId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            [err, patient] = await formatPromiseResult( getPatient( {
                user,
                patientId
            } ) );

            if( err ) {
                Y.log( `could not get patient for kbv medication plan ${activityId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            [err, employee] = await formatPromiseResult( getEmployee( {
                user,
                employeeId,
                locationId,
                patient
            } ) );

            if( err ) {
                Y.log( `could not get employee for kbv medication plan ${activityId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            [err, location] = await formatPromiseResult( getLocation( {
                user,
                locationId
            } ) );

            if( err ) {
                Y.log( `could not get location for kbv medication plan ${activityId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const mappedMedicationPlanData = mapMedicationPlanData( {
                medicationPlanEntries,
                patientWeight,
                patientHeight,
                patientCreatinineValue,
                patientGender,
                patientAllergiesAndIntolerances,
                patientLactation,
                patientPregnant,
                patientParameter1,
                patientParameter2,
                patientParameter3,
                employee,
                patient,
                location,
                lastScheinLocation
            } );

            Y.log( `mapped medication plan data: ${JSON.stringify( mappedMedicationPlanData, null, '  ' )}`, 'debug', NAME );

            let carrierSegments;
            [err, carrierSegments] = await formatPromiseResult( generateCarrierSegmentsAsync( {
                data: {
                    medicationPlan: mappedMedicationPlanData
                }
            } ) );

            if( err ) {
                Y.log( `could not generate mmi medicationplan ${activityId} carrirer segments: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const pdfFileNames = [];
            let carrierSegment;

            for( carrierSegment of carrierSegments ) {
                let pdfData;
                [err, pdfData] = await formatPromiseResult( generateMedicationPlanPDFAsync( {
                    data: {
                        carrierSegment
                    }
                } ) );

                if( err ) {
                    Y.log( `could not generate mmi medicationplan ${activityId} pdf data: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                let pdfFileName;
                [err, pdfFileName] = await formatPromiseResult( writeTmpFile( pdfData ) );

                if( err ) {
                    Y.log( `could not write mmi medicationplan ${activityId} pdf data: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                pdfFileNames.push( pdfFileName );
            }

            let completePdfFileName;

            const mongoose = require( 'mongoose' );

            if( 1 === pdfFileNames.length ) {
                completePdfFileName = pdfFileNames[0];
            } else {
                [err, completePdfFileName] = await formatPromiseResult( concatenatePDFsAsync( {
                    user,
                    fileNames: pdfFileNames.map( fileName => mediaCacheDir + fileName ),
                    newFileName: `${new mongoose.Types.ObjectId().toString()}_original.APPLICATION_PDF.pdf`
                } ) );

                if( err ) {
                    Y.log( `could not concat mmi medicationplan ${activityId} pdfs: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
            }
            let media;
            [err, media] = await formatPromiseResult( importMediaFromFileAsync(
                user,
                mediaCacheDir + completePdfFileName,
                'activity',
                activityId,
                completePdfFileName,
                'user',
                'MEDICATIONPLAN'
            ) );

            if( err ) {
                Y.log( `could not import media from mmi medicationplan ${activityId} pdf file: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let results;
            [err, results] = await formatPromiseResult( createDocument( {user, activityId, locationId, media} ) );

            if( err ) {
                Y.log( `could not create document for media of mmi medicationplan ${activityId} pdf: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const documentId = results[0];

            [err] = await formatPromiseResult( updateAttachment( {user, activityId, documentId, attachments} ) );

            if( err ) {
                Y.log( `could not update attachments of mmi medicationplan: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, media, callback );
        }

        /**
         * Generates new medication plan(pdf) and replaces old plan with new one.
         * @method generateMedicationPlan
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data activity data
         * @param {String} args.data._id activity id
         * @param {String} args.data.patientId patient id of activity
         * @param {String} args.data.employeeId employee id of activity
         * @param {String} args.data.locationId location id of activity
         * @param {Array} args.data.activities array of medications id
         * @param {Array} args.data.attachments array of attached documents id
         * @param {Function} args.callback
         */
        function generateMedicationPlan( args ) {
            let
                {user, data: {_id: activityId, patientId, employeeId, activities, locationId, attachments, caseFolderId, timestamp} = {}, callback} = args,
                commonerrors = Y.doccirrus.commonerrors,
                simpleperson = Y.doccirrus.schemas.simpleperson,
                media = Y.doccirrus.media,
                person = Y.doccirrus.schemas.person,
                tmpF = media.getCacheDir(),
                async = require( 'async' );

            function writeTmpFile( data, callback ) {
                let
                    mongoose = require( 'mongoose' ),
                    tmpFileName = `${new mongoose.Types.ObjectId().toString()}_original.APPLICATION_PDF.pdf`;
                media.writeFile( tmpF + tmpFileName, tmpF, Buffer.from( data ), function( err ) {
                    return callback( err, tmpFileName );
                } );
            }

            function createDocument( data, callback ) {
                let
                    media = data.media,
                    docObj = {
                        'type': 'MEDICATIONPLAN',
                        'url': '/media/' + Y.doccirrus.media.getCacheFileName( media, false ),
                        'publisher': 'From MMI',
                        'contentType': Y.doccirrus.media.getMimeType( media.mime ),
                        'attachedTo': activityId,           //  deprecated, see MOJ-9190
                        'activityId': activityId,
                        'patientId': null,
                        'locationId': locationId,
                        'caption': media.name,
                        'createdOn': moment().toISOString(),
                        'mediaId': media._id,
                        'accessBy': []
                    };

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'document',
                    data: Y.doccirrus.filters.cleanDbObject( docObj )
                }, ( err, results ) => {
                    if( err ) {
                        return callback( err );
                    }
                    data.documentId = results[0];
                    callback( null, data );
                } );

            }

            function removeDocument( document, callback ) {
                async.parallel( [
                    function( done ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'media',
                            action: 'delete',
                            query: {
                                _id: document.mediaId
                            }
                        }, done );
                    },
                    function( done ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'document',
                            action: 'delete',
                            query: {
                                _id: document._id
                            }
                        }, done );
                    }
                ], callback );

            }

            function saveAttachment( attachments, callback ) {
                let
                    data = {
                        attachments
                    };
                Y.doccirrus.api.activity.put( {
                    query: {
                        _id: activityId
                    },
                    user,
                    data,
                    fields: ['attachments'],
                    callback
                } );

            }

            function updateAttachment( data, callback ) {
                const
                    newDocumentId = data.documentId;
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'document',
                            query: {
                                _id: {$in: attachments},
                                type: 'MEDICATIONPLAN'
                            },
                            options: {
                                lean: true,
                                select: {mediaId: 1}
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            next( err, results[0] );
                        } );
                    },
                    function( document, next ) {
                        if( document ) {
                            removeDocument( document, function( err ) {
                                if( err ) {
                                    return next( err );
                                }
                                next( null, attachments.filter( id => document._id.toString() !== id ) );
                            } );
                        } else {
                            setImmediate( next, null, attachments.slice() );
                        }
                    },
                    function( attachments, next ) {
                        attachments.push( newDocumentId );
                        saveAttachment( attachments, ( err ) => {
                            next( err, data );
                        } );
                    }
                ], callback );
            }

            /**
             *  Saves new medication plan and replaces old one with new.
             *
             *  @param  {Object}    fileNames   Array of PDF filenames on disk
             *  @param  {Function}  callback
             */
            function savePDF( fileNames, callback ) {
                async.waterfall( [
                    function( next ) {
                        var
                            mongoose = require( 'mongoose' );
                        if( 1 === fileNames.length ) {
                            return setImmediate( next, null, {fileName: fileNames[0]} );
                        }
                        Y.doccirrus.media.pdf.concatenatePDFs( {
                            user,
                            fileNames: fileNames.map( fileName => tmpF + fileName ),
                            newFileName: `${new mongoose.Types.ObjectId().toString()}_original.APPLICATION_PDF.pdf`
                        }, ( err, fileName ) => {
                            next( err, {fileName: fileName} );
                        } );
                    },
                    function( data, next ) {
                        media.importMediaFromFile(
                            user,
                            tmpF + data.fileName,
                            'activity',
                            activityId,
                            data.fileName,
                            'user',
                            'MEDICATIONPLAN',
                            function( err, media ) {
                                if( err ) {
                                    return next( err );
                                }
                                data.media = media;
                                next( null, data );
                            }
                        );
                    },
                    createDocument,
                    updateAttachment
                ], callback );
            }

            function getPatient( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'patient',
                    query: {
                        _id: patientId
                    },
                    options: {
                        lean: true
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !results || !results[0] ) {
                        Y.log( `generateMedicationPlan. Patient not found. _id: ${patientId}`, 'error', NAME );
                        return callback( new commonerrors.DCError( 400, {message: `Patient not found. _id: ${patientId}`} ) );
                    }
                    callback( null, results[0] );
                } );
            }

            function getLocation( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'location',
                    query: {
                        _id: locationId
                    },
                    options: {
                        lean: true
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !results || !results[0] ) {
                        Y.log( `generateMedicationPlan. Location not found. _id: ${locationId}`, 'error', NAME );
                        return callback( new commonerrors.DCError( 400, {message: `Location not found. _id: ${locationId}`} ) );
                    }
                    callback( null, results[0] );
                } );
            }

            function getEmployee( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'employee',
                    query: {
                        _id: employeeId,
                        $or: [
                            {type: 'PHYSICIAN'},
                            {type: 'PHARMACIST'}
                        ]
                    },
                    options: {
                        lean: true
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, results[0] );
                } );
            }

            function getMedications( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'activity',
                    query: {
                        _id: {$in: activities}
                    },
                    options: {
                        lean: true
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    results.sort( ( itemA, itemB ) => {
                        return activities.indexOf( itemA._id.toString() ) > activities.indexOf( itemB._id.toString() ) ? 1 : -1;
                    } );
                    callback( null, results );
                } );
            }

            function prepareMedicationEntry( medication ) {
                let
                    entry = {
                        ENTRYTYPE: 'LABELEDDRUG'
                    },
                    dosage = Y.doccirrus.schemas.activity.getMedicationDosis( medication );

                // TODO: CHECK this MMI maps data automatically? Does PM know that?
                if( medication.phPZN ) {
                    entry.PZN = medication.phPZN;
                } else {
                    let
                        activeIngr = medication.phIngr || [];
                    entry.ACTIVESUBSTANCENAME = activeIngr.map( item => item.name ).join( ', ' );
                    entry.STRENGTH = activeIngr.map( item => item.strength ).join( ', ' );
                    entry.DRUGNAME = medication.phNLabel;
                    entry.PHARMFORM = `${medication.phForm}`;
                    // TODO: PHARMFORMCODE
                }

                if( dosage ) {
                    entry.DOSAGESCHEDULE = dosage;
                }

                if( medication.phUnit ) {
                    entry.DOSEQUANTITY = `${medication.phUnit}`; // Freetext Dosiereinheit
                }
                // TODO: DOSEQUANTITYCODE i guess MMI code or S_BMP_DOSIEREINHEIT?
                // TODO: need to store code in activity

                entry.REFERENCE = medication.phNote;
                entry.OBSERVATION = medication.phReason;
                return entry;
            }

            function getPdf( data, callback ) {
                let
                    {employee = {}, patient, medications, location, lastScheinLocation} = data,
                    groups = {
                        defaultGroup: []
                    },
                    simplePerson = simpleperson.getSimplePersonFromPerson( employee ),
                    medicationEntries = [],
                    additionalData = [],
                    linkIndex = 1,
                    locationAddress = lastScheinLocation ? lastScheinLocation : location,
                    medicationPlan = {
                        AUTHOR: {
                            NAME: person.personDisplay( employee ),
                            CITY: locationAddress.city,
                            STREET: `${locationAddress.street} ${locationAddress.houseno}`,
                            ZIP: locationAddress.zip,
                            PHONE: locationAddress.phone || simplePerson.phone || simplePerson.mobile,
                            EMAIL: locationAddress.email || simplePerson.email
                        },
                        PATIENT: {
                            FIRSTNAME: patient.firstname,
                            LASTNAME: patient.lastname,
                            PARAMETERS: {},
                            BIRTHDATE: patient.kbvDob
                        },
                        IDENTIFICATION: {
                            LANGUAGECODE: 'de-DE',
                            PRINTINGDATE: moment().valueOf(),
                            //"IDENTIFICATIONNAME": "4A3178DB13504F929C8E4B8D181D10B6",
                            VERSION: '024'

                        },
                        CARRIERBLOCKS: [
                            {
                                MEDICATIONENTRIES: medicationEntries
                            }
                        ]
                    };
                let entries = [];
                medications.forEach( medication => {
                    let
                        entry = prepareMedicationEntry( medication ),
                        groupName = medication.phHeader || 'defaultGroup';
                    if( entries.some( el => {
                        return ['ENTRYTYPE', 'PZN', 'ACTIVESUBSTANCENAME', 'STRENGTH', 'DRUGNAME', 'PHARMFORM', 'DOSAGESCHEDULE', 'DOSEQUANTITY', 'REFERENCE', 'OBSERVATION'].every( key => {
                            return el[key] === entry[key] || (!el[key] && !entry[key]);
                        } );
                    } ) ) {
                        return;
                    }
                    entries.push( entry );

                    // TODO: CHECK THIS:
                    // MOJ-7341:
                    if( entry.REFERENCE && 45 < entry.REFERENCE.length ) {
                        additionalData.push( {
                            ENTRYTYPE: 'FREETEXT',
                            FREETEXT: `${linkIndex} - ${entry.REFERENCE}`
                        } );
                        entry.REFERENCE = `[${linkIndex}]`;
                        linkIndex++;
                    }
                    if( entry.OBSERVATION && 45 < entry.OBSERVATION.length ) {
                        additionalData.push( {
                            ENTRYTYPE: 'FREETEXT',
                            FREETEXT: `${linkIndex} - ${entry.OBSERVATION}`
                        } );
                        entry.OBSERVATION = `[${linkIndex}]`;
                        linkIndex++;
                    }
                    if( entry.DOSAGESCHEDULE && 45 < entry.DOSAGESCHEDULE.length ) {
                        additionalData.push( {
                            ENTRYTYPE: 'FREETEXT',
                            FREETEXT: `${linkIndex} - ${entry.DOSAGESCHEDULE}`
                        } );
                        entry.DOSAGESCHEDULE = `[${linkIndex}]`;
                        linkIndex++;
                    }
                    if( entry.DOSEQUANTITY && 45 < entry.DOSEQUANTITY.length ) {
                        additionalData.push( {
                            ENTRYTYPE: 'FREETEXT',
                            FREETEXT: `${linkIndex} - ${entry.DOSEQUANTITY}`
                        } );
                        entry.DOSEQUANTITY = `[${linkIndex}]`;
                        linkIndex++;
                    }
                    groups[groupName] = groups[groupName] || [];
                    groups[groupName].push( entry );
                } );
                Object.keys( groups ).forEach( groupName => {
                    const
                        items = groups[groupName];
                    if( 'defaultGroup' !== groupName ) {
                        medicationEntries.push( {
                            SUBHEADING: groupName,
                            ENTRYTYPE: "HEADING"
                        } );
                    }
                    medicationEntries.push( ...items );
                } );
                if( additionalData.length ) {
                    medicationEntries.push( ...additionalData );
                }
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.mmi.generateCarrierSegments( {
                            data: {
                                medicationPlan
                            },
                            callback: next
                        } );
                    },
                    function( carrierSegments, next ) {
                        async.mapSeries( carrierSegments, generatePdfPage, next );
                    }
                ], callback );

            }

            function generatePdfPage( carrierSegment, callback ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.mmi.generateMedicationPlanPDF( {
                            data: {
                                carrierSegment
                            },
                            callback: next
                        } );
                    },
                    function( pdfData, next ) {
                        writeTmpFile( pdfData, next );
                    }
                ], callback );
            }

            function checkEmployee( data, callback ) {
                if( data.employee ) {
                    setImmediate( callback, null, data );
                } else {
                    let
                        insurance = data.patient.insuranceStatus.find( data => data.locationId === locationId.toString() );
                    if( insurance ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'employee',
                            query: {
                                _id: insurance.employeeId,
                                $or: [
                                    {type: 'PHYSICIAN'},
                                    {type: 'PHARMACIST'}
                                ]
                            },
                            options: {
                                lean: true
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return callback( err );
                            }
                            data.employee = results[0];
                            callback( null, data );
                        } );
                    } else {
                        setImmediate( callback, null, data );
                    }

                }
            }

            function getLastScheinLocation( callback ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'activity',
                            query: {
                                patientId,
                                actType: {$in: Y.doccirrus.schemas.activity.scheinActTypes},
                                timestamp: {$lte: timestamp},
                                caseFolderId
                            },
                            options: {
                                lean: true,
                                sort: {timestamp: -1},
                                limit: 1,
                                select: {
                                    locationId: 1
                                }
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            next( null, results && results[0] && results[0].locationId );
                        } );
                    },
                    function( locationId, next ) {
                        if( locationId ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'get',
                                model: 'location',
                                query: {
                                    _id: locationId
                                },
                                options: {
                                    lean: true
                                }
                            }, function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                next( null, results && results[0] );
                            } );
                        } else {
                            return setImmediate( next );
                        }
                    }
                ], callback );
            }

            function getDataForPdf( callback ) {
                async.parallel( {
                    lastScheinLocation( done ) {
                        getLastScheinLocation( done );
                    },
                    patient( done ) {
                        getPatient( done );
                    },
                    employee( done ) {
                        getEmployee( done );
                    },
                    location( done ) {
                        getLocation( done );
                    },
                    medications( done ) {
                        getMedications( done );
                    }
                }, callback );
            }

            /**
             * Collects all necessary data and generates PDF
             * @param {Function} callback called with { {Object} err, {Buffer} pdfBuffer }
             */
            function generatePdf( callback ) {
                async.waterfall( [
                    getDataForPdf,
                    checkEmployee,
                    getPdf
                ], callback );
            }

            /**
             * generate pdf
             *  get patient
             *  get employee(doctor)
             *  get medication(pzn codes)
             *  request pdf
             * save pdf as attachment
             *  write tmp file
             *  importMediaFromFile
             *  create document
             *  update attachments list
             *   remove prev. medication plan(document and media)
             *   add new document id
             */

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                async.waterfall( [
                    generatePdf,
                    savePDF
                ], callback );
            }
        }

        /**
         *  Helper to merge MMI medication data into a MEDICATION activity object
         *
         *  @param  {Object}    params
         *  @param  {Object}    params.activityData
         *  @param  {Object}    params.medication
         *  @returns {Object}
         */
        async function mergeMMIMedicationDataToActivity( params ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createActivitiesByMedicationPlan => mergeMMIMedicationDataToActivity', 'info', NAME );

            let
                {activityData: activity, medication} = params,
                activitySchema = Y.doccirrus.schemas.activity,
                isCustom = !Boolean( activity && Object.keys( activity ).length );

            function cleanName( name ) {
                if( name && 0 === name.indexOf( '$' ) ) {
                    name = name.slice( 1 );
                }
                return name;
            }

            function splitFieldWithTilde( str ) {
                const SEP = '<<<SEP>>>';
                return str && str.replace( /\\~/mg, SEP ).split( '~' ).map( s => s.replace( new RegExp( SEP, 'mg' ), '~' ) );
            }

            activity = activity || {};
            activity.phReason = medication.OBSERVATION;
            // LAM-1991: sanitize as linebreak is currently not possible
            activity.phNote = medication.REFERENCE && medication.REFERENCE.replace( /~/g, '' );
            activity.phForm = activity.phForm || cleanName( medication.PHARMFORM );

            activity.phUnit = cleanName( medication.DOSEQUANTITY );

            if( medication.DOSEQUANTITYCODE ) {
                let [err, codeSystemEntry] = await formatPromiseResult( Y.doccirrus.api.fhir_codesystem.codeLookUp( {
                    originalParams: {
                        code: medication.DOSEQUANTITYCODE,
                        system: '74_CS_SFHIR_BMP_DOSIEREINHEIT'
                    }
                } ) );

                if( err ) {
                    Y.log( `mergeMMIMedicationDataToActivity: could not get dosis quantity code text from code ${medication.DOSEQUANTITYCODE}: ${err.stack || err}`, 'warn', NAME );
                } else if( codeSystemEntry ) {
                    activity.phUnit = codeSystemEntry.display;
                    activity.phDosisUnitCode = codeSystemEntry.system;
                }
            }

            activity.dosis = medication.DOSAGESCHEDULE;
            activity.phDosisType = activitySchema.phDosisTypes.TEXT;

            // if the activity is pre-filled (has been given within the params)
            if( isCustom ) {
                activity.phIngr = [];
                activity.phNLabel = medication.DRUGNAME;
                const activeSubstancesNames = splitFieldWithTilde( medication.ACTIVESUBSTANCENAME );
                const strengths = splitFieldWithTilde( medication.STRENGTH );

                let i = 0;
                if( Array.isArray( activeSubstancesNames ) ) {

                    let activeSubstancesName;
                    for( activeSubstancesName of activeSubstancesNames ) {
                        let [err, result] = await formatPromiseResult( promisifyArgsCallback( Y.doccirrus.api.mmi.getMolecules )( {
                            query: {
                                name: activeSubstancesName,
                                maxResult: 1
                            }
                        } ) );

                        if( err ) {
                            Y.log( `mergeMMIMedicationDataToActivity: could not get molecule ${err.stack || err}`, 'warn', NAME );
                        }

                        activity.phIngr.push( {
                            code: result && result.MOLECULE && result.MOLECULE[0] && result.MOLECULE[0].ID,
                            name: result && result.MOLECULE && result.MOLECULE[0] && result.MOLECULE[0].NAME || activeSubstancesName,
                            strength: strengths && strengths[i]
                        } );

                        i++;
                    }
                }

                if( medication.PHARMFORMCODE ) {
                    let [err, codeSystemEntry] = await formatPromiseResult( Y.doccirrus.api.fhir_codesystem.codeLookUp( {
                        originalParams: {
                            code: medication.PHARMFORMCODE,
                            system: '74_CS_SFHIR_BMP_DARREICHUNGSFORM'
                        }
                    } ) );

                    if( err ) {
                        Y.log( `mergeMMIMedicationDataToActivity: could not get form code text from code ${medication.PHARMFORMCODE}`, 'warn', NAME );
                    } else if( codeSystemEntry ) {
                        activity.phForm = codeSystemEntry.display;
                        activity.phFormCode = codeSystemEntry.system;
                    }
                }

            } else {
                activity.phPZN = medication.DRUGNAME;
            }

            Y.log( 'Exiting Y.doccirrus.api.activity.createActivitiesByMedicationPlan => mergeMMIMedicationDataToActivity', 'info', NAME );
            return Promise.resolve( activity );
        }

        /**
         * helper.
         * Creates activities MEDICATION's and MEDICATIONPLAN and INGREDIENTPLANT based on an MMI medication plan
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.medicationPlan
         * @param {boolean} args.data.createMedicationPlan [MOJ-12072] either this, or createIngredientPlan, or both must be set
         * @param {boolean} args.data.createIngredientPlan [MOJ-12072] either this, or createMedicationPlan, or both must be set
         * @param {String} args.data.locationId
         * @param {String} args.data.employeeId
         * @param {String} args.data.iknr
         * @param {String} args.data.comment
         * @param {String|Number} args.data.patientAge
         * @param {String} args.data.caseFolderId
         * @param {String} args.data.patientId
         * @param {Function} args.callback if successful, returns an object {medicationPlanId, ingredientPlanId}
         * @returns {*}
         */
        async function createActivitiesByMedicationPlan( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createActivitiesByMedicationPlan', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createActivitiesByMedicationPlan' );
            }

            const getObject = Y.doccirrus.commonutils.getObject;

            let
                {
                    user,
                    data: {
                        medicationPlan, carrierSegments,
                        locationId, employeeId, iknr,
                        patientAge, caseFolderId, patientId,
                        createMedicationPlan, createIngredientPlan,
                        comment
                    } = {},
                    callback
                } = args,
                commonerrors = Y.doccirrus.commonerrors,
                mmiApi = Y.doccirrus.api.mmi,
                medicationEntries = [],
                preparedMedicationActivityObjects = [],
                medicationPlanEntries = [],
                err, result,
                additionalData,
                medicationPlanId = null,
                ingredientPlanId = null,
                mapMedicationPlanGender = ( gender ) => {
                    let mappedGender = '';
                    gender = (gender || '').toLowerCase();
                    if( !gender ) {
                        return mappedGender;
                    }
                    switch( gender ) {
                        case 'm':
                            mappedGender = 'MALE';
                            break;
                        case 'w':
                            mappedGender = 'FEMALE';
                            break;
                        case 'divers':
                            mappedGender = 'VARIOUS';
                            break;
                        default:
                            mappedGender = 'UNDEFINED';
                            break;
                    }
                    return mappedGender;
                },
                pznsNotFound = [];

            /**
             * Checks, if a medicationPlan object is valid.
             * A valid medicationPlan object must contain a CARRIERBLOCKS property,
             * and those CARRIERBLOCKS must at least contain items with MEDICATIONENTRIES objects or a given length.
             */
            if( typeof medicationPlan !== "object" || medicationPlan === null ) {
                Y.log( 'medicationPlan is missing.', 'error', NAME );
                return callback( new commonerrors.DCError( 400, {message: 'Bad params. medicationPlan is missing'} ) );
            }

            let isMedicationPlanValid = Array.isArray( medicationPlan.CARRIERBLOCKS ) &&
                                        medicationPlan.CARRIERBLOCKS.some( item => item.MEDICATIONENTRIES && item.MEDICATIONENTRIES.length );

            if( !isMedicationPlanValid ) {
                Y.log( 'medicationPlan is invalid.', 'error', NAME );
                return callback( new commonerrors.DCError( 400, {message: 'Bad params. medicationPlan is invalid or missing'} ) );
            }

            if( !createMedicationPlan && !createIngredientPlan ) {
                Y.log( 'Neither createMedicationPlan, nor createIngredientPlan is given.', 'error', NAME );
                return callback( new commonerrors.DCError( 400, {message: 'Bad params. Either a medication plan, or an ingredient plan has to be created.'} ) );
            }

            const kbvMedicationPlanData = {
                medicationPlanVersion: getObject( 'IDENTIFICATION.VERSION', medicationPlan ),
                identificationName: getObject( 'IDENTIFICATION.IDENTIFICATIONNAME', medicationPlan ),
                patientWeight: getObject( 'PATIENT.PARAMETERS.WEIGHT', medicationPlan ),
                patientHeight: getObject( 'PATIENT.PARAMETERS.HEIGHT', medicationPlan ),
                patientCreatinineValue: getObject( 'PATIENT.PARAMETERS.CREATININE', medicationPlan ),
                patientGender: mapMedicationPlanGender( getObject( 'PATIENT.PARAMETERS.GENDER', medicationPlan ) ),
                patientAllergiesAndIntolerances: getObject( 'PATIENT.PARAMETERS.ALLERGY', medicationPlan ),
                patientLactation: getObject( 'PATIENT.PARAMETERS.LACTATION', medicationPlan ),
                patientPregnant: getObject( 'PATIENT.PARAMETERS.PREGNANCY', medicationPlan ),
                patientParameter1: getObject( 'PATIENT.PARAMETERS.PARAMETER1', medicationPlan ),
                patientParameter2: getObject( 'PATIENT.PARAMETERS.PARAMETER2', medicationPlan ),
                patientParameter3: getObject( 'PATIENT.PARAMETERS.PARAMETER3', medicationPlan )
            };
            /**
             * Restructure data given within the medicationPlan object.
             * Collect all CARRIERBLOCKS from the medication plan into the medicationEntries array.
             */
            medicationPlan.CARRIERBLOCKS.forEach( item => {
                medicationEntries.push( ...item.MEDICATIONENTRIES );
            } );

            /**
             * Filter all entries that we are able to process.
             * @type {*[]}
             */
            medicationEntries = medicationEntries.filter( function( medicationBlock ) {
                switch( medicationBlock.ENTRYTYPE ) {
                    case 'HEADING':
                        return medicationBlock.SUBHEADINGCODE || medicationBlock.SUBHEADING;
                    case 'FREETEXT':
                        return medicationBlock.FREETEXT;
                    case 'PRESCRIPTION':
                        return medicationBlock.FREETEXT;
                    default:
                        if( !medicationBlock.DRUGNAME ) {
                            Y.log( `medication plan entry not recognized: ${JSON.stringify( medicationBlock )}`, 'warn', NAME );
                        }
                        return medicationBlock.DRUGNAME;
                }
            } );

            /**
             * Get additional data which will be used to fetch Medication data from MMI.
             * So far, this is just the official number of the practice, and the official number of the doctor,
             * bsnr and lanr, respectively.
             */
            [err, additionalData] = await formatPromiseResult( getAdditionalData() );
            if( err ) {
                Y.log( 'Error obtaining additional data.', 'error', NAME );
                return callback( new commonerrors.DCError( 400, {message: 'Error obtaining additional data.'} ) );
            }

            /**
             * [MOJ-12072]
             * 0) First of all, query each single medication from MMI, to obtain more details about each package.
             *    From this data, we then create prepared MEDICATION activity-objects, which are NOT stored in the database yet.
             *
             * Two pathways are possible (both or just a single):
             *      1) Create a MEDICATIONPLAN.
             *          => create a KBVMEDICATIONPLAN activity, which post-process will create actual medications
             *      2) Create an INGREDIENTPLAN.
             *          => First, extract the ingredients from the prepared MEDICATION activities.
             *          => Afterwards, put them into a new ACTIVITY called "INGREDIENTPLAN", a child of MEDDATA.
             */
                // step 0: prepare activities and medicationPlan entries
            let medicationEntry;
            for( medicationEntry of medicationEntries ) {
                let preparedActivity;
                if( medicationEntry.DRUGNAME ) {
                    [err, preparedActivity] = await formatPromiseResult( collectMedicationDataAndPrepareActivity( medicationEntry, additionalData ) );
                    if( err ) {
                        Y.log( `Error preparing medication data: ${JSON.stringify( medicationEntries )}`, 'error', NAME );
                        Y.log( `Error preparing medication data err: ${err.stack || err}`, 'error', NAME );
                        return callback( new commonerrors.DCError( 400, {message: 'Error preparing medication data1 from medication plan.'} ) );
                    }

                    preparedMedicationActivityObjects.push( preparedActivity );
                    medicationPlanEntries.push( {
                        ...preparedActivity, ...{
                            type: 'MEDICATION'
                        }
                    } );
                    if( medicationEntry.BINDTEXT ) {
                        medicationPlanEntries.push( {type: 'BINDTEXT', bindText: medicationEntry.BINDTEXT} );
                    }
                    if( !preparedActivity.phPZN && medicationEntry.DRUGNAME.match( /^\d{4,}$/gms ) ) {
                        pznsNotFound.push( medicationEntry.DRUGNAME );
                    }
                } else if( medicationEntry.ENTRYTYPE === 'HEADING' ) {
                    let subHeadingText = medicationEntry.SUBHEADING;
                    if( medicationEntry.SUBHEADINGCODE && !subHeadingText ) {
                        let codeSystemEntry;
                        [err, codeSystemEntry] = await formatPromiseResult( Y.doccirrus.api.fhir_codesystem.codeLookUp( {
                            code: medicationEntry.SUBHEADINGCODE,
                            system: '74_CS_SFHIR_BMP_ZWISCHENUEBERSCHRIFT'
                        } ) );

                        if( err ) {
                            Y.log( `createActivitiesByMedicationPlan: could not get sub heading text from code ${medicationEntry.SUBHEADINGCODE}: ${err.stack || err}`, 'warn', NAME );
                            continue;
                        }

                        if( !subHeadingText ) {
                            continue;
                        }
                        subHeadingText = codeSystemEntry && codeSystemEntry.display;
                    }

                    medicationPlanEntries.push( {
                        type: 'SUB_HEADING',
                        subHeadingText: subHeadingText,
                        subHeadingCode: medicationEntry.SUBHEADINGCODE
                    } );
                } else if( medicationEntry.ENTRYTYPE === 'FREETEXT' ) {
                    medicationPlanEntries.push( {
                        type: 'FREETEXT',
                        freeText: medicationEntry.FREETEXT
                    } );
                } else if( medicationEntry.ENTRYTYPE === 'PRESCRIPTION' ) {
                    medicationPlanEntries.push( {
                        type: 'MEDICATION_RECIPE',
                        medicationRecipeText: medicationEntry.FREETEXT
                    } );
                }
            }

            // pathway 1: create a MEDICATIONPLAN
            if( createMedicationPlan ) {

                if( pznsNotFound.length ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {data: i18n( 'activity-api.text.PZNS_ON_MEDICATIONPLAN_NOT_FOUND', {data: {pzns: pznsNotFound}} )},
                        meta: {level: 'WARNING'}
                    } );
                }

                kbvMedicationPlanData.medicationPlanEntries = medicationPlanEntries;
                // create a new activity "KBVMEDICATIONPLAN" post-process will created linked activities
                let medicationPlanActivity = setRequiredActivityFields( {
                    actType: 'KBVMEDICATIONPLAN'
                } );
                [err, result] = await formatPromiseResult( promisifyArgsCallback( Y.doccirrus.api.activity.post )( {
                    user,
                    data: {...medicationPlanActivity, ...kbvMedicationPlanData, comment}
                } ) );
                if( err ) {
                    Y.log( `Error creating the "KBVMEDICATIONPLAN" activity: ${JSON.stringify( medicationPlanActivity )}`, 'error', NAME );
                    Y.log( `Error creating the "KBVMEDICATIONPLAN" activity: err: ${err.stack || err}`, 'error', NAME );
                    return callback( new commonerrors.DCError( 400, {message: 'Error creating the "MEDICATIONPLAN" activity.'} ) );
                }
                medicationPlanId = result[0];
            }

            // pathway 2: create an INGREDIENTPLAN
            if( createIngredientPlan ) {
                /**
                 * get an array with all activeIngredients collected from the the medications within the medication plan.
                 * @type {Array<ActiveIngredientForIngredientPlanSchema>}
                 */
                let activeIngredients = ActiveIngredientForIngredientPlanSchema.fromMedicationActivityObjects( preparedMedicationActivityObjects );

                // create a new IngredientPlan object
                let ingredientPlan = new IngredientPlan( {
                    medicationPlanCarrierSegments: carrierSegments,
                    activeIngredients: activeIngredients
                } );

                // fetch all the custom data stored in the tag schema
                [err] = await formatPromiseResult( ingredientPlan.loadCustomDataForIngredients( args ) );
                if( err ) {
                    Y.log( `Error fetching existing data of ingredients in "INGREDIENTPLAN" activity: ${JSON.stringify( ingredientPlan )}`, 'error', NAME );
                    return callback( new commonerrors.DCError( 400, {message: 'Error fetching existing data of ingredients in "INGREDIENTPLAN" activity.'} ) );
                }

                // create a new activity "INGREDIENTPLAN"
                Y.log( `Creating "INGREDIENTPLAN" activity.`, 'info', NAME );
                [err, ingredientPlanId] = await formatPromiseResult( ingredientPlan.post( {
                    user,
                    data: {activity: setRequiredActivityFields()}
                } ) );
                if( err ) {
                    Y.log( `Error creating "INGREDIENTPLAN" activity: ${JSON.stringify( ingredientPlan )}`, 'error', NAME );
                    return callback( new commonerrors.DCError( 400, {message: 'Error creating the "INGREDIENTPLAN" activity.'} ) );
                }
            }

            return callback( null, {medicationPlanId, ingredientPlanId} );

            // ------------------------------ FUNCTIONS -----------------------------------

            /**
             * This function fetches additional information about the location and employee,
             * to be inserted into the new activities.
             * @returns {Promise<{bsnr: string, lanr: string}>}
             */
            async function getAdditionalData() {
                Y.log( 'Entering Y.doccirrus.api.activity.createActivitiesByMedicationPlan => getAdditionalData', 'info', NAME );

                /**
                 * Get the official number of the location (bsnr)
                 * @returns {Promise<string>}
                 */
                async function getLocationData() {
                    if( !locationId ) {
                        return Promise.reject( new commonerrors.DCError( 400, {message: 'location id is missing'} ) );
                    }

                    // get bsnr
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: locationId
                        },
                        options: {
                            limit: 1,
                            lean: true,
                            select: {
                                commercialNo: 1
                            }
                        }
                    } ).then(
                        function( results ) {
                            return Promise.resolve( results[0] && results[0].commercialNo );
                        }
                    );
                }

                /**
                 * Get the official number of the employee (lanr)
                 * @returns {Promise<string>}
                 */
                async function getEmployeeData() {
                    if( !employeeId ) {
                        return Promise.reject( new commonerrors.DCError( 400, {message: 'employee id is missing'} ) );
                    }
                    // get lanr
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: employeeId
                        },
                        options: {
                            limit: 1,
                            lean: true,
                            select: {
                                officialNo: 1
                            }
                        }
                    } ).then(
                        function( results ) {
                            return Promise.resolve( results[0] && results[0].officialNo );
                        }
                    );
                }

                let r = {
                    bsnr: await getLocationData(),
                    lanr: await getEmployeeData()
                };
                Y.log( 'Exiting Y.doccirrus.api.activity.createActivitiesByMedicationPlan => getAdditionalData', 'info', NAME );
                return r;
            }

            /**
             * Set some default fields of the activity.
             *      => locationId, employeeId, patientId, status, caseFolderId, timestamp
             * @param {object} activity
             * @return {object} activity
             */
            function setRequiredActivityFields( activity ) {
                if( typeof activity !== "object" ) {
                    activity = {};
                }
                activity.locationId = locationId;
                activity.employeeId = employeeId;
                activity.patientId = patientId;
                activity.status = 'VALID';
                activity.caseFolderId = caseFolderId;
                activity.timestamp = moment().toISOString();
                return activity;
            }

            /**
             * Collect further information for a single medication.
             * Returns a prepared activity-object created by the input data, and complemented with an MMI call.
             * The return object may be directly posted into the database.
             * @param {object} medication
             * @param {object} additionalData
             * @return {Promise<object>} activity object
             */
            async function collectMedicationDataAndPrepareActivity( medication, additionalData ) {
                Y.log( 'Entering Y.doccirrus.api.activity.createActivitiesByMedicationPlan => collectMedicationDataAndPrepareActivity', 'info', NAME );
                let err,
                    activityData, activity;

                // get the data from the MMI
                [err, activityData] = await formatPromiseResult( promisifyArgsCallback( mmiApi.getMappedProduct )( {
                        query: {
                            patientAge: patientAge,
                            phPZN: medication.DRUGNAME,
                            bsnr: additionalData.bsnr,
                            lanr: additionalData.lanr,
                            insuranceIknr: iknr
                        }
                    } )
                );
                if( err ) {
                    Y.log( `Error obtaining medication data from MMI. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    throw err;
                }

                // merge the MMI data with the medication data and the footnotes obtained from the medication plan
                [err, activity] = await formatPromiseResult( mergeMMIMedicationDataToActivity( {
                    activityData,
                    medication
                } ) );
                if( err ) {
                    Y.log( `Error merging medication data of MMI and medication plan. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    throw err;
                }

                // set the respective medication catalogs
                activity.catalogShort = Y.doccirrus.schemas.v_medication.catalogShort;
                activity.catalogRef = Y.doccirrus.schemas.v_medication.catalogShort;
                activity.catalog = false;

                // set the source type of the medication to be that of a medication plan
                activity.sourceType = 'MEDICATIONPLAN';
                // copy the medication plan comment to the medication (which contains the medication plan's source)
                activity.source = comment;

                // populate remaining activity data from the schema
                [err, activity] = await formatPromiseResult( promisifyArgsCallback( Y.doccirrus.schemas.activity._setActivityData )( {
                    initData: {
                        actType: Y.doccirrus.schemas.v_medication.actType,
                        catalogShort: Y.doccirrus.schemas.v_medication.catalogShort,
                        locationId: locationId
                    },
                    entry: activity
                } ) );
                if( err ) {
                    Y.log( `Error populating medications. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    throw err;
                }

                // last but not least, populate the owner and case folder information
                activity = setRequiredActivityFields( activity );

                Y.log( 'Exiting Y.doccirrus.api.activity.createActivitiesByMedicationPlan => collectMedicationDataAndPrepareActivity', 'info', NAME );
                return activity;
            }
        }

        /**
         * Creates MEDICATION and MEDICATIONPLAN from carrier segment
         *
         * KBV specification can be found here:
         *
         *  ftp://ftp.kbv.de/ita-update/Verordnungen/Arzneimittel/BMP/EXT_ITA_VGEX_BMP_Anlage3_mitAend.pdf
         *
         * @method createMedicationPlanByCarrierSegment
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} args.data.carrierSegments
         * @param {boolean} args.data.createMedicationPlan [MOJ-12072] either this, or createIngredientPlan, or both must be set
         * @param {boolean} args.data.createIngredientPlan [MOJ-12072] either this, or createMedicationPlan, or both must be set
         * @param {String} args.data.locationId
         * @param {String} args.data.employeeId
         * @param {String} args.data.iknr
         * @param {String|Number} args.data.patientAge
         * @param {String} args.data.caseFolderId
         * @param {String} args.data.patientId
         * @param {Function} args.callback
         * @returns {*}
         */
        async function createMedicationPlanByCarrierSegment( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createMedicationPlanByCarrierSegment', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createMedicationPlanByCarrierSegment' );
            }

            let
                {
                    user,
                    data: {
                        carrierSegments,
                        locationId, employeeId, caseFolderId, iknr,
                        patientAge, patientId,
                        createMedicationPlan, createIngredientPlan,
                        comment
                    } = {},
                    callback
                } = args,
                commonerrors = Y.doccirrus.commonerrors,
                mmiApi = Y.doccirrus.api.mmi,
                err, results;

            if( !carrierSegments ) {
                Y.log( 'createMedicationPlanByCarrierSegment. CarrierSegments is missing.', 'error', NAME );
                return callback( new commonerrors.DCError( 400, {message: 'Bad params. CarrierSegments is missing'} ) );
            }

            if( !createMedicationPlan && !createIngredientPlan ) {
                Y.log( 'createMedicationPlanByCarrierSegment. Neither createMedicationPlan, nor createIngredientPlan is given.', 'error', NAME );
                return callback( new commonerrors.DCError( 400, {message: 'Bad params. Either a medication plan, or an ingredient plan has to be created.'} ) );
            }

            // MOJ-12145: Quickfix reading medication plan 2.6
            carrierSegments = carrierSegments.map( carrierSegment => carrierSegment.replace( 'MP v="026"', 'MP v="024"' ) );
            // MOJ-12329: Quickfix reading medication plan 2.5
            carrierSegments = carrierSegments.map( carrierSegment => carrierSegment.replace( 'MP v="025"', 'MP v="024"' ) );

            [err, results] = await formatPromiseResult( Promise.all(
                carrierSegments.map(
                    function( carrierSegment ) {
                        return promisifyArgsCallback( mmiApi.generateMedicationPlan )( {data: {carrierSegment}} )
                            .then(
                                function( result ) {
                                    if( !result || !result.CARRIERBLOCKS ) {
                                        Y.log( `createMedicationPlanByCarrierSegment. can not generate medication plan by carrier segment. invalid carrierSegment in debug log`, 'error', NAME );
                                        Y.log( `createMedicationPlanByCarrierSegment: carrier segment failed: ${carrierSegment}`, 'debug', NAME );
                                        return Promise.reject( new commonerrors.DCError( 18018 ) );
                                    }
                                    return Promise.resolve( result );
                                }
                            );
                    }
                ) ) );
            if( err ) {
                return callback( err );
            }

            // construct from the results a new medicationPlan object, and summarize all carrierBlocks into that
            let medicationPlan = results[0];
            results.slice( 1 ).forEach( item => {
                medicationPlan.CARRIERBLOCKS.push( ...item.CARRIERBLOCKS );
            } );

            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!! call callback here and do the rest afterwards !!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            callback( err, medicationPlan ); // eslint-disable-line
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

            /**
             * Create new activities from the medication plan.
             * These may be more than one, if both, createMedicationPlan and createIngredientPlan are selected.
             */
            [err, results] = await formatPromiseResult( promisifyArgsCallback( createActivitiesByMedicationPlan )( {
                    user,
                    data: {
                        medicationPlan, carrierSegments,
                        locationId, employeeId, caseFolderId, iknr,
                        patientAge, patientId,
                        createMedicationPlan, createIngredientPlan,
                        comment
                    }
                }
            ) );
            if( err ) {
                Y.log( `createActivitiesByMedicationPlan finished with error: ${JSON.stringify( err )}`, 'error', NAME );
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    msg: {data: i18n( 'activity-api.text.MEDICATION_PLAN_ERROR' )},
                    meta: {level: 'ERROR'}
                } );
                return;
            }

            let
                successText = i18n( 'activity-api.text.MEDICATION_PLAN_CREATED' ),
                {medicationPlanId, ingredientPlanId} = results,
                messages = [];

            // helper function to replace the placeholder {link} by the activity link
            function replaceLink( str, id, text ) {
                return str.replace( /\{link\}/g, `<a class="closeAfterClick" data-messageId="${id}" href="/incase#/activity/${id}">${text}</a>` );
            }

            // show a message for both, the newly created medication plan, and the newly created ingredient plan
            if( medicationPlanId !== null ) {
                messages.push( {
                    id: medicationPlanId,
                    message: replaceLink( successText, medicationPlanId, i18n( 'activity-schema.Activity_E.MEDICATIONPLAN' ) )
                } );
            }
            if( ingredientPlanId !== null ) {
                messages.push( {
                    id: ingredientPlanId,
                    message: replaceLink( successText, ingredientPlanId, i18n( 'activity-schema.Activity_E.INGREDIENTPLAN' ) )
                } );
            }
            messages.forEach( ( messageObj ) => {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    messageId: messageObj.id,
                    msg: {data: messageObj.message}
                } );
            } );

            // update the activity tables in the UI, as activities were added
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {data: caseFolderId}
            } );
        }

        /**
         * Method tries first doTransition if it is failed then insert activity with status CREATED without mongoose validation
         * @method createActivitySafe
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data activity data
         * @param {Function} [args.plainObjectFormatter] can mutate activity plain object before insert
         * @param {Function} args.callback
         */
        function createActivitySafe( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createActivitySafe', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createActivitySafe' );
            }
            let
                {user, data, callback, plainObjectFormatter, migrate = false, skipPrePostProcesses = false, context = {}} = args,
                params = {
                    'activity': Object.assign( {}, data ),
                    'transition': 'validate',
                    _isTest: skipPrePostProcesses ? true : 'false'
                };

            function _createActivity( activity, callback ) {
                let
                    async = require( 'async' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'activity', migrate, function( err, model ) {
                            next( err, model );
                        } );
                    },
                    function( model, next ) {
                        let
                            _activity = new model.mongoose( activity ).toObject();
                        if( 'function' === typeof plainObjectFormatter ) {
                            return plainObjectFormatter( _activity, err => next( err, model, _activity ) );
                        }
                        setImmediate( next, null, model, _activity );
                    },
                    function( model, _activity, next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'mongoInsertOne',
                            data: _activity
                        }, ( err, result ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( null, result.insertedIds && result.insertedIds[0] || result.insertedId, true );
                        } );
                    }
                ], callback );
            }

            Y.doccirrus.api.activity.doTransition( {
                data: params,
                migrate,
                user,
                options: {
                    activityContext: context
                },
                callback( err, results ) {
                    let
                        activity;
                    if( err ) {
                        Y.log( `createActivitySafe. Activity could not validated. System is creating CREATED activity from plain object. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                        _createActivity( Object.assign( {}, data, {status: 'CREATED'} ), callback );
                        return;
                    }
                    if( skipPrePostProcesses ) {
                        ({data: activity = {}} = results[0] || {});
                        return _createActivity( Object.assign( {}, data, {status: ('INVALID' === activity.status) ? 'CREATED' : 'VALID'} ), callback );
                    } else {
                        ({data: activity = {}} = results[0] || {});
                        return callback( err, activity._id );
                    }

                }
            } );

        }

        /**
         * Method tries first doTransition if it is failed then update activity with status CREATED without mongoose validation
         * @method updateActivitySafe
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.activity activity data
         * @param {Array} args.data.fields fields which should be updated
         * @param {Object} [args.data.query] default _id: activity._id
         * @param {Function} args.callback
         * @returns {*}
         */
        function updateActivitySafe( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.updateActivitySafe', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.updateActivitySafe' );
            }
            let
                {user, data: {activity, fields = [], query} = {}, context = {}, callback} = args,
                params = {'activity': Object.assign( {}, activity ), 'transition': 'validate', _isTest: 'false'},
                mongoose = require( 'mongoose' );
            if( !activity ) {
                Y.log( 'updateActivitySafe. activity data is missing', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'activity data is missing'} ) );
            }
            if( !query ) {
                query = {
                    _id: new mongoose.Types.ObjectId( activity._id )
                };
            }

            function _updateActivity( activity, callback ) {
                let
                    async = require( 'async' );
                activity.status = 'CREATED';
                if( !fields.includes( 'status' ) ) {
                    fields.push( 'status' );
                }
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'activity', function( err, model ) {
                            next( err, model );
                        } );
                    },
                    function( model, next ) {
                        var
                            _activity = new model.mongoose( activity ).toObject(),
                            data = fields.reduce( ( obj, field ) => {
                                obj[field] = _activity[field];
                                return obj;
                            }, {} );
                        model.mongoose.collection.update( query, {$set: data}, ( err ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( null, true );
                        } );
                    }
                ], callback );
            }

            params.activity.status = 'CREATED';
            Y.doccirrus.api.activity.doTransition( {
                data: params,
                user,
                options: {
                    activityContext: context
                },
                callback( err ) {
                    if( err ) {
                        if( 'ValidationError' === err.name ) {
                            Y.log( `updateActivitySafe. Activity could not be updated. Activity is marked as CREATED and will be created as it is. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                            return _updateActivity( Object.assign( {}, activity ), callback );
                        }
                        return callback( err );
                    }
                    callback( err );
                }
            } );
        }

        /**
         *
         * @method getActualMedicationData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query] if not set, will catch necessary data
         * @param {String} [args.query.commercialNo]
         * @param {String} [args.query.officialNo]
         * @param {String} [args.query.patientAge]
         * @param {String} [args.query.iknr]
         * @param {Object} args.data
         * @param {Object} args.data.locationId
         * @param {Object} args.data.employeeId
         * @param {Object} args.data.patientId
         * @param {Object} args.data.caseFolderId
         * @param {Object} args.data.phPZN
         * @param {Function} args.callback
         */
        function getActualMedicationData( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getActualMedicationData', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActualMedicationData' );
            }
            let
                {user, query: {commercialNo, officialNo, patientAge, iknr} = {}, data: activity = {}, callback} = args;
            Y.doccirrus.api.activity.getMedicationData( {
                user,
                data: {
                    locationId: activity.locationId,
                    employeeId: activity.employeeId,
                    patientId: activity.patientId,
                    pzn: activity.phPZN,
                    caseFolderId: activity.caseFolderId,
                    commercialNo,
                    officialNo,
                    patientAge,
                    iknr
                },
                callback( err, result ) {
                    let
                        finalResult = null;
                    if( err ) {
                        Y.log( `saveMedicationPlan. Error occurred while request to mmi: ${JSON.stringify( err )}`, 'warn', NAME );
                        return callback( err, finalResult );
                    }

                    if( result ) {
                        finalResult = Object.assign( {}, result.additionalData, {medicationData: result.medicationData} );
                    }
                    callback( null, finalResult );

                }
            } );
        }

        /**
         * Saves medication activities, then medication plan activity, then generates medication plan
         * @method saveMedicationPlan
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} args.data.medications
         * @param {Object} args.data.medicationPlan
         * @param {Boolean} [args.waitCallback = false]
         * @param {Function} [args.onPdfCreated]
         * @param {Function} args.callback
         * @returns {*}
         */
        async function saveMedicationPlan( args ) {
            let
                {
                    data: {medications = [], medicationPlan = {}, caseFolderType = ""} = {}, medicationPlanOnly, user, callback, waitCallback, onPdfCreated = () => {
                }
                } = args,
                async = require( 'async' ),
                validationError = false, err, formId = "";

            const isSwissCaseFolder = ('CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType || 'ANY']),
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity );

            if( isSwissCaseFolder && caseFolderType ) {
                [err, formId] = await formatPromiseResult(
                    Y.doccirrus.formsconfig.getFormIdForActivityType( {
                        user,
                        data: {
                            actType: "MEDICATION",
                            caseFolderType
                        }
                    } )
                );

                if( err ) {
                    Y.log( 'prescribeMedications: Failed to get formId for medications', 'warn', NAME );
                    formId = "";
                }
            }

            medications.forEach( ( item, index ) => {
                if( typeof item.positionIndex === 'undefined' ) {
                    item.positionIndex = index;
                }
                if( formId ) {
                    item.formId = formId;
                }
            } );

            function handleMedications( callback ) {
                let
                    newActivitiesId = {},
                    medicationFields = Object.keys( Y.doccirrus.schemas.activity.types.Medication_T ).concat( ['timestamp', 'code'] ),
                    medicationQuery = {},
                    mmiOffline = false;
                if( medicationPlanOnly ) {
                    return callback( null, [] );
                }
                medications.sort( ( itemA, itemB ) => {
                    return (itemB.positionIndex || 0) - (itemA.positionIndex || 0);
                } );

                async.eachSeries( medications, function( medication, next ) {
                    if( medication._id ) {
                        updateActivitySafe( {
                            user,
                            data: {
                                activity: medication,
                                fields: Object.keys( medication ).filter( key => medicationFields.includes( key ) )
                            },
                            context: {
                                skipRegenerateMMIPDF: true
                            },
                            callback: function( err, hadValidationError ) {
                                validationError = validationError || hadValidationError;
                                next( err );
                            }
                        } );
                    } else {
                        async.waterfall( [
                            function( done ) {
                                if( medication.phPZN && !mmiOffline && Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                                    getActualMedicationData( {
                                        user,
                                        data: medication,
                                        query: medicationQuery,
                                        callback( err, result ) {
                                            if( result ) {
                                                medicationQuery = {
                                                    patientAge: result.patientAge,
                                                    commercialNo: result.commercialNo,
                                                    officialNo: result.officialNo,
                                                    iknr: result.iknr
                                                };
                                                if( result.medicationData ) {
                                                    Object.keys( result.medicationData ).forEach( key => {
                                                        if( undefined !== medication[key] ) {
                                                            medication[key] = result.medicationData[key];
                                                        }
                                                    } );
                                                }
                                            }
                                            if( err ) {
                                                mmiOffline = 9001 === err.code;
                                                Y.log( `saveMedicationPlan. Could not check medication data. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                                            }
                                            done();
                                        }
                                    } );
                                } else {
                                    setImmediate( done );
                                }
                            },
                            async function( done ) {
                                let [err, actId] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                                    createActivitySafe( {
                                        user,
                                        data: medication,
                                        callback: function( err, activityId, hadValidationError ) {
                                            validationError = validationError || hadValidationError;
                                            if( activityId ) {
                                                newActivitiesId[medication.positionIndex] = activityId;
                                            }
                                            if( err ) {
                                                return reject( err );
                                            }
                                            resolve( activityId );
                                        }
                                    } );
                                } ) );

                                if( err ) {
                                    Y.log( `saveMedicationPlan: failed to save activity: ${medication}, error: ${err.stack || err}`, 'error', NAME );
                                    return done( err );
                                }

                                if( formId && isSwissCaseFolder ) {
                                    [err] = await formatPromiseResult( initializeFormForActivityP( user, actId, {}, null ) );

                                    if( err ) {
                                        Y.log( `handleMedications: Failed to initialize form fro activity ${actId}`, 'error', NAME );
                                    }
                                }
                                done();
                            }
                        ], next );
                    }
                }, ( err ) => {
                    callback( err, newActivitiesId );
                } );
            }

            function handleMedicationPlan( newActivitiesMap, callback ) {
                let
                    params = {
                        'activity': Object.assign( {activities: []}, medicationPlan ),
                        'transition': 'validate',
                        _isTest: 'false'
                    };

                medications.reverse();
                medications.forEach( ( medication ) => {
                    if( medication._id ) {
                        params.activity.activities.splice( params.activity.activities.indexOf( medication._id ), 1 );
                    }
                    params.activity.activities.splice( medication.positionIndex, null, medication._id || newActivitiesMap[medication.positionIndex] );
                } );

                Y.doccirrus.api.activity.doTransition( {
                    data: params,
                    options: {
                        activityContext: {
                            onPdfCreated,
                            regenerateMedicationPlanPDF: Boolean( params.activity.activities.length )
                        }
                    },
                    user,
                    callback( err, result ) {
                        if( err ) {
                            return callback( err );
                        }
                        callback( null, result );
                    }
                } );
            }

            async.waterfall( [
                function( next ) {
                    handleMedications( next );
                },
                function( newActivities, next ) {
                    handleMedicationPlan( newActivities, next );
                }
            ], function( err, result ) {
                if( waitCallback ) {
                    return callback( err, result, validationError );
                }
                if( !waitCallback ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'system.UPDATE_ACTIVITIES_TABLES',
                        msg: {
                            data: medicationPlan.caseFolderId
                        }
                    } );
                    if( validationError || err ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'message',
                            msg: {
                                data: i18n( 'activity-api.text.CAN_NOT_CREATE_VALID_MEDICATION' )
                            },
                            meta: {
                                level: 'ERROR'
                            }
                        } );
                    }

                    return callback( null, result && result[0] && result[0].data && result[0].data._id );

                }
            } );
        }

        /**
         * Returns distinct entries
         * @method getDistinct
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.groupFields list of fields which will be used as _id for groupping
         * @param {Object} args.data.matches array of object which will be used as separate $match
         * @param {String} [args.data.modelName='activity']
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        async function getDistinct( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getDistinct', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getDistinct' );
            }
            let
                {user, query = {}, data: {groupFields = [], matches = [], modelName = 'activity'} = {}, options = {}, callback} = args,
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                err,
                result,
                pipeline,
                group,
                count,
                activities,
                checkForNoLongerValid;

            pipeline = [];

            if( groupFields && groupFields.length > 0 && options.fields ) {
                group = {
                    _id: null
                };

                group._id = groupFields.reduce( ( obj, key ) => {
                    obj[key] = `$${key}`;
                    return obj;
                }, {} );

                Object.keys( options.fields ).forEach( key => {
                    group[key] = {$last: `$${key}`};
                } );
            }

            // match block ------
            matches.forEach( match => {
                if( modelName === 'activity' && match.locationId && !(match.locationId instanceof ObjectId) ) {
                    match.locationId = new ObjectId( match.locationId );
                }

                // We dont display activities when the newest activity is noLongerValid: true
                // Because this needs to happen as LAST step after grouping
                // we check if it exists here, delete it from pipeline and add it back again later
                if( modelName === 'activity' && match.noLongerValid ) {
                    checkForNoLongerValid = match.noLongerValid;
                }

            } );

            let activitiesDistinct = {}; //will keep latest activity timestamp for code
            if( checkForNoLongerValid && modelName === 'activity' ) {
                //remove discontinue clause from matches
                matches = matches.filter( el => !el.noLongerValid );

                let notValid, valid;
                //get discontinued activities first
                [err, notValid] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    query: {$and: [...matches, {noLongerValid: true}]},
                    model: 'activity',
                    options: {select: {code: 1, timestamp: 1}}
                } ) );
                if( err ) {
                    Y.log( `getDistinct: Failed to get discontinued codes ${err.stack || err}`, 'warn', NAME );
                }

                if( !err && notValid.length ) {
                    //for discontinued codes get valid activities: can be earlier or latter
                    [err, valid] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        query: {$and: [...matches, {code: {$in: notValid.map( el => el.code )}}, {noLongerValid: {$ne: true}}]},
                        model: 'activity',
                        options: {select: {code: 1, timestamp: 1}}
                    } ) );
                    if( err ) {
                        Y.log( `getDistinct: Failed to get activities for discontinued codes ${err.stack || err}`, 'warn', NAME );
                    } else {
                        // as result of following - activitiesDistinct will have only latest discontinued codes
                        let el;
                        for( el of notValid ) {
                            if( !activitiesDistinct[el.code] || activitiesDistinct[el.code] < el.timestamp ) {
                                activitiesDistinct[el.code] = el.timestamp;
                            }
                        }
                        for( el of valid ) {
                            if( activitiesDistinct[el.code] && activitiesDistinct[el.code] < el.timestamp ) {
                                delete activitiesDistinct[el.code];
                            }
                        }
                    }
                }
            }

            //if there are any discontinued codes exclue them from aggregation
            pipeline.push( {$match: {$and: !Object.keys( activitiesDistinct ).length ? matches : [...matches, {code: {$nin: Object.keys( activitiesDistinct )}}]}} );

            if( Object.keys( query ).length ) {
                pipeline.push( {$match: query} );
            }

            // project block ------
            if( !group && options.fields ) {
                pipeline.push( {$project: options.fields} );
            }

            // group block ------
            if( group ) {
                pipeline.push( {$group: group} );
            }
            // group block ------

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'aggregate',
                pipeline: pipeline.slice(),
                model: modelName,
                options
            } ) );

            if( err ) {
                Y.log( `getDistinct: Failed to get data from activities ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            activities = result.result ? result.result : result;
            count = result.count;

            activities.count = count;
            return handleResult( err, activities, callback );

        }

        /**
         * This method is to search for hierarchyRules codes and validate each by SubGopMap
         *
         * @method checkSubGop
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams.activityData
         * @param {Function} args.callback
         *
         * @returns {Function} callback     Contains popualated activity data with substituted code if defined in subGop and fulfill patient validation crireria
         */
        function checkSubGop( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.checkSubGop', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.checkSubGop' );
            }
            const
                moment = require( 'moment' ),
                {user, originalParams: {activityData}, callback} = args,
                SU = Y.doccirrus.auth.getSUForLocal();

            Y.doccirrus.api.catalog.convertGopCode( activityData );

            /**
             * Calculates the treatment price if not present
             * @param {Object} args
             * @param {Object} args.entry
             * @param {function} callback
             * @returns {Object} entry
             */
            async function _addSwissTreatmentPrice( args, callback ) {
                Y.log( 'Entering _addSwissTreatmentPrice', 'info', NAME );
                if( callback ) {
                    callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( callback, 'Exiting _addSwissTreatmentPrice' );
                }

                const
                    {entry, activityData} = args,
                    catalogShort = activityData.catalogShort,
                    taxPoints = activityData.taxPoints;
                let price, err, result, locationId;

                /* ------------------------------------------
                * If price already exists return here
                * ------------------------------------------ */
                if( !entry ) {
                    err = new Y.doccirrus.commonerrors.DCError( 404, {message: 'catalog entry not found!'} );
                    return handleResult( err, entry, callback );
                }

                if( entry.price ) {
                    return handleResult( undefined, entry, callback );
                }

                /* ------------------------------------------
                * 1. Check catalog
                * ------------------------------------------ */

                if( catalogShort === "EAL" ) {

                    price = Y.doccirrus.commonutilsCh.calculateNonTarmedPrice( {
                        taxPoints
                    } );
                    entry.price = price;

                    return handleResult( undefined, entry, callback );

                } else if( ["MIGEL", 'ARZT_KVG_VVG', 'Pandemieleistungen', 'AMV'].includes( catalogShort ) ) {

                    price = activityData.price || Y.doccirrus.commonutilsCh.calculateNonTarmedPrice( {
                        taxPoints
                    } );
                    entry.price = price;

                    return handleResult( undefined, entry, callback );

                } else {

                    /* ------------------------------------------
                    * 2. Get data to calculate tarmed price
                    * ------------------------------------------ */

                    /* ------------------------------------------
                    * 2.1. Get patient
                    * ------------------------------------------ */

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patient',
                            action: 'get',
                            options: {
                                fields: ['activeCaseFolderId', 'insuranceStatus']
                            },
                            query: {_id: activityData.patientId}
                        } )
                    );

                    if( err ) {
                        Y.log( `_addSwissTreatmentPrice: error getting patient with ID ${activityData.patientId}: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( !result[0] ) {
                        Y.log( `_addSwissTreatmentPrice: error getting patient with ID ${activityData.patientId}: no patient found`, 'error', NAME );
                        return handleResult( new Error( 'no patient found' ), undefined, callback );
                    }

                    const patient = result[0];

                    /* ------------------------------------------
                    * 2.2. Get invoiceconfiguration
                    * ------------------------------------------ */

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'invoiceconfiguration',
                            action: 'get',
                            options: {
                                fields: ['tarmedTaxPointValues', 'tarmedInvoiceFactorValues']
                            },
                            query: {}
                        } )
                    );

                    if( err ) {
                        Y.log( `_addSwissTreatmentPrice: error getting invoiceconfigurations: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    const tarmedScalingFactors = {
                        taxPointValues: result[0] && result[0].tarmedTaxPointValues || [],
                        invoiceFactorValues: result[0] && result[0].tarmedInvoiceFactorValues || []
                    };

                    /* ------------------------------------------
                    * 2.3. Get casefolder for patient
                    * ------------------------------------------ */

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'casefolder',
                            action: 'get',
                            options: {
                                fields: ['type']
                            },
                            query: {_id: patient.activeCaseFolderId}
                        } )
                    );

                    if( err ) {
                        Y.log( `_addSwissTreatmentPrice: error getting casefolder with ID ${patient.activeCaseFolderId}: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    const
                        currentCaseFolderType = result[0] && result[0].type || 'PRIVATE_CH',
                        insuranceStatus = patient.insuranceStatus,
                        insurance = insuranceStatus.find( function( insurance ) {
                            return insurance.type === currentCaseFolderType;
                        } ),
                        insuranceGLN = insurance && insurance.insuranceGLN;

                    /* ------------------------------------------
                    * 2.4. Get location cantonCode
                    * ------------------------------------------ */

                    if( activityData.locationId ) {
                        locationId = activityData.locationId;
                    } else if( patient.locationId ) {
                        locationId = new ObjectId( patient.locationId );
                    } else {
                        locationId = new ObjectId( insurance.locationId );
                    }

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'location',
                            action: 'get',
                            options: {
                                fields: ['cantonCode']
                            },
                            query: {_id: locationId}
                        } )
                    );

                    if( err ) {
                        Y.log( `_addSwissTreatmentPrice: error getting location with ID ${locationId}: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    const cantonCode = result[0] && result[0].cantonCode;
                    /* ------------------------------------------
                    * 2.5. Get doctor's dignity
                    * ------------------------------------------ */

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'employee',
                            action: 'get',
                            options: {
                                fields: ['qualiDignities']
                            },
                            query: {_id: activityData.employeeId}
                        } )
                    );

                    if( err ) {
                        Y.log( `_addSwissTreatmentPrice: error getting location with ID ${locationId}: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    const qualiDignities = result[0] && result[0].qualiDignities || [],
                        dignityScalingFactor = Y.doccirrus.commonutilsCh.getRelevantDignityScalingFactor( {
                            tarmedInvoiceFactorValues: tarmedScalingFactors.invoiceFactorValues,
                            qualiDignities: qualiDignities,
                            caseFolderType: currentCaseFolderType
                        } ) || {};

                    // if there is no initial medicalScalingFactor in catalog entry - override it with dignity factor
                    if( entry.medicalScalingFactor === 1 && dignityScalingFactor.factor ) {
                        entry.medicalScalingFactor = dignityScalingFactor.factor;
                    }

                    /* ------------------------------------------
                    * 3. Calculate tarmedPrice
                    * ------------------------------------------ */

                    price = Y.doccirrus.commonutilsCh.calculateTarmedPrice( {
                        tarmedScalingFactors,
                        treatment: {
                            medicalTaxPoints: activityData.medicalTaxPoints,
                            technicalTaxPoints: activityData.technicalTaxPoints,
                            assistanceTaxPoints: activityData.assistanceTaxPoints,
                            medicalScalingFactor: activityData.medicalScalingFactor,
                            technicalScalingFactor: activityData.technicalScalingFactor
                        },
                        caseFolderType: currentCaseFolderType,
                        insuranceGLN,
                        cantonCode
                    } );
                    entry.price = price;

                    return handleResult( undefined, entry, callback );
                }
            }

            function getEbmEntry( code, cb ) {

                function entryCb( err, entries ) {
                    if( err ) {
                        return cb( err );
                    }
                    cb( null, entries && entries[0] );
                }

                function descriptorCb( err, desc ) {
                    if( err ) {
                        return cb( err );
                    }

                    if( !desc || !desc.filename ) {
                        return cb( new Error( 'could not get EBM catalog descriptor' ) );
                    }
                    Y.log( 'get catalog entry ' + code + ' filename ' + desc.filename, 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user: SU,
                        model: 'catalog',
                        query: {
                            seq: code,
                            catalog: desc.filename
                        },
                        options: {
                            limit: 1
                        }
                    }, entryCb );

                }

                if( 'EBM' === activityData.catalogShort ) {
                    Y.doccirrus.api.catalog.getEBMDescriptorByLocationId( {
                        user: user,
                        originalParams: {
                            locationId: activityData.locationId.toString()
                        },
                        callback: descriptorCb
                    } );
                } else if( activityData.actType && activityData.catalogShort ) {
                    let catDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: activityData.actType,
                        short: activityData.catalogShort
                    } );

                    descriptorCb( null, catDescriptor );
                }

            }

            function setEntryData( err, entry ) {
                if( entry && entry.seq === activityData.code ) {
                    return finalCb( null, activityData );
                }

                function finalCb( err, result ) {
                    if( err ) {
                        Y.log( 'could not set activity data for sub gop check ' + err, 'error', NAME );
                        return callback( err );
                    }

                    callback( null, {newData: result || null} );
                }

                if( err ) {
                    Y.log( 'could not get catalog entry for sub gop check ' + err.stack || err, 'error', NAME );
                    return callback( err );
                }
                if( entry ) {
                    Y.log( 'found sub gop entry ' + entry.seq, 'debug', NAME );
                    return Y.doccirrus.schemas.activity._setActivityData( {
                        initData: activityData,
                        user: user,
                        entry: entry
                    }, finalCb );
                }

                finalCb();
            }

            function patientCb( err, patients ) {
                let subGop, patient, age, deathmom, options = {};
                if( err ) {
                    Y.log( 'could not get patient for sub gop check ' + err, 'error', NAME );
                    return callback( err );
                }
                patient = patients[0];
                deathmom = patient.dateOfDeath;
                age = deathmom ? (patient.kbvDob ? moment( deathmom ).diff( moment( patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '') :
                    (patient.kbvDob ? moment( (Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ? activityData.timestamp : undefined) ).diff( moment( patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '');
                if( activityData.catalogShort === 'TARMED' ) {
                    options = {treatmentNeeds: patient.treatmentNeeds || false};
                }
                subGop = Y.doccirrus.schemas.catalog.getSubGop( activityData.u_extra, age, options );
                if( subGop ) {
                    Y.log( 'found sub gop ' + subGop + ' for activity ' + activityData._id + ' and patient age ' + age, 'info', NAME );

                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                        return getEbmEntry( subGop, ( err, entry ) => {
                            if( err ) {
                                Y.log( `getEbmEntry: error getting entry: ${err.stack || err}`, 'error', NAME );
                                return callback();
                            }

                            _addSwissTreatmentPrice( {entry, activityData} )
                                .then( ( entry ) => setEntryData( undefined, entry ) )
                                .catch( ( err ) => setEntryData( err ) );
                        } );
                    }

                    return getEbmEntry( subGop, setEntryData );

                } else {
                    Y.log( 'could not find sub gop for activity ' + activityData._id + ' and patient age ' + age, 'info', NAME );
                    return callback();
                }

            }

            if( 'TREATMENT' !== activityData.actType ||
                !['EBM', 'TARMED'].includes( activityData.catalogShort ) || !activityData.u_extra || !activityData.u_extra.sub_gop_liste ) {
                Y.log( 'skip sub gop check beceause of unfulfilled preconditions', 'debug', NAME );
                return callback();
            }

            Y.log( 'check sub gop liste', 'info', NAME );

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                migrate: true,
                query: {
                    _id: activityData.patientId
                },
                options: {
                    select: {
                        dateOfDeath: 1,
                        kbvDob: 1,
                        treatmentNeeds: 1
                    }
                }
            }, patientCb );

        }

        /**
         * Returns an activity object with filled employee, location, caseFolder Id
         * current logic to find case folder:
         *  1. if 0 < Object.keys( caseFolder ).length return caseFolder (assume caseFolder is complete case folder object)
         * else
         *  2. if activity.caseFolderId is set => return case folder selected by activity.caseFolderId
         * else
         *  3. if caseFolderType is set => return last patient case folder with this type
         * else
         *  4. try to find case folder of last created valid schein (if case folder found, employee and location id of "Schein" will be used, if it is not set in data.activity)
         * else
         *  5. if patient.activeCaseFolderId is set => return case folder with this id
         * else
         *  6. try to find case folder of last activity (if case folder found, employee and location id of last activity will be used, if it is not set in data.activity)
         * else
         *  7. if - return last created case folder
         *
         * current logic to find employee and location id:
         *  if activity.employeeId && activity.locationId is not set after case folder is found
         * else
         *  if caseFolder._id is set will check:
         *   1. last schein in this case folder
         *   2. last activity in this case folder
         *   if there is such activity - employeeId and locationId is taken from found activity
         * else
         *  otherwise try to get employeeId and locationId from patient insurance
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.activity
         * @param {Object} args.data.patient
         * @param {Object} args.data.caseFolder
         * @param {String} args.data.caseFolderType
         * @param {Boolean} [args.data.useFirstSuitableInsurance=false] if set, will use first insurance with employee and location Ids
         *  in case when all other methods have failed
         * @param {Boolean} [args.migrate=false]
         * @param {Function} args.callback
         * @returns {*}
         */
        function getActivityDataForPatient( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getActivityDataForPatient', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActivityDataForPatient' );
            }
            let
                {user, data = {}, callback, migrate = false} = args,
                {patient = {}, caseFolder = {}, activity = {}, caseFolderType, useFirstSuitableInsurance = false, getOnlyInsuranceCaseFolder, isGDT} = data,
                async = require( 'async' );
            const casefolderTypes = Y.doccirrus.schemas.person.types.Insurance_E.list.map( el => el.val );
            if( !activity.patientId && !patient._id ) {
                Y.log( `getActivityDataForPatient. Missing params: activity.patientId: ${activity.patientId || patient._id}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `Missing params. activity.patientId: ${activity.patientId || patient._id}`} ) );
            }

            /**
             * After every if - else
             * if 0 < Object.keys( patient ).length set patient (assume patient is complete patient object)
             * if - set patient selected by patient._id
             *
             * @param   {Function}  callback    Of the form fn( err )
             * @returns {*}
             */
            function getPatient( callback ) {
                if( 0 < Object.keys( patient ).length ) {
                    patient._id = patient._id || activity.patientId; //ensure that patient id is set
                    return setImmediate( callback );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        model: 'patient',
                        action: 'get',
                        migrate,
                        user,
                        query: {
                            _id: activity.patientId
                        },
                        options: {
                            lean: 1
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return callback( err );
                        }
                        if( !results[0] ) {
                            return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `Patient not found. patient id: ${activity.patientId}`} ) );
                        }
                        patient = results[0];
                        patient._id = patient._id.toString();
                        callback();
                    } );
                }
            }

            function getAndSetCaseFolder( query, callback ) {
                Y.doccirrus.api.casefolder.get( {
                    user,
                    query,
                    migrate,
                    options: {
                        lean: 1,
                        migrate,
                        sort: {
                            _id: -1
                        },
                        limit: 1
                    },
                    callback( err, results ) {
                        if( err ) {
                            return callback( err );
                        }
                        if( results[0] ) {
                            caseFolder = results[0];
                            caseFolder._id = caseFolder._id.toString();
                        }
                        callback( null, results[0] );
                    }
                } );
            }

            function checkIfInsuranceCaseFolder( query, callback ) {
                Object.assign( query || {}, {
                    additionalType: null,
                    imported: {$ne: true}
                } );
                Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'get',
                        query: query
                    }, ( err, result ) => {
                        return callback( err, result );
                    }
                );
            }

            /**
             *  1. if 0 < Object.keys( caseFolder ).length return caseFolder (assume caseFolder is complete case folder object)
             * else
             *  2. if activity.caseFolderId is set => return case folder selected by activity.caseFolderId
             * else
             *  3. if caseFolderType is set => return last patient case folder with this type
             * else
             *  4. try to find case folder of last created valid schein (if case folder found, employee and location id of "Schein" will be used, if it is not set in data.activity)
             * else
             *  5. if patient.activeCaseFolderId is set => return case folder with this id
             * else
             *  6. try to find case folder of last activity (if case folder found, employee and location id of last activity will be used, if it is not set in data.activity)
             * else
             *  7. if - return last created case folder
             *
             * @param   {Function}  callback
             * @returns {*}
             */
            function getPatientCaseFolder( callback ) {
                let
                    lastActivityData = {};

                if( !getOnlyInsuranceCaseFolder ) {
                    if( 0 < Object.keys( caseFolder ).length ) { //1. if 0 < Object.keys( caseFolder ).length return caseFolder (assume caseFolder is complete case folder object)
                        return setImmediate( callback );
                    } else if( activity.caseFolderId ) { //2. if activity.caseFolderId is set => return case folder selected by activity.caseFolderId
                        return getAndSetCaseFolder( {_id: activity.caseFolderId}, callback );
                    } else if( caseFolderType ) { //3. if caseFolderType is set => return last patient case folder with this type
                        return getAndSetCaseFolder( {
                            type: caseFolderType,
                            imported: {$ne: true},   // MOJ-8268
                            additionalType: {$exists: false}
                        }, callback );
                    }
                }

                async.waterfall( [
                    function( next ) {
                        if( !getOnlyInsuranceCaseFolder ) {
                            return next( null, null );
                        }

                        let query = {
                            patientId: patient._id,
                            type: {$in: casefolderTypes}
                        };

                        checkIfInsuranceCaseFolder( query, function( err, res ) {
                            if( err ) {
                                return next( err );
                            }

                            if( res.length === 1 ) {
                                return setImmediate( next, null, res[0] );
                            }

                            next( null, null );
                        } );
                    },
                    function( mainCasefolder, next ) {
                        if( mainCasefolder ) {
                            return setImmediate( next, null, mainCasefolder._id );
                        }
                        // MOJ-9868: for gdt related activities get casefolder id from activeCaseFolderId (next step)
                        if( true === isGDT ) {
                            setImmediate( next, null, null );
                            return;
                        }
                        //4. try to find case folder of last created valid schein
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                patientId: patient._id,
                                actType: {$in: Y.doccirrus.schemas.activity.scheinActTypes},
                                status: 'VALID'
                            },
                            options: {
                                lean: true,
                                limit: 1,
                                sort: {
                                    timestamp: -1
                                },
                                select: {
                                    caseFolderId: 1,
                                    employeeId: 1,
                                    locationId: 1
                                }
                            }
                        }, ( err, result ) => {
                            if( err ) {
                                return next( err );
                            }
                            if( result[0] && result[0].caseFolderId ) {
                                lastActivityData = result[0];
                                if( getOnlyInsuranceCaseFolder ) {
                                    let query = {
                                        _id: result[0].caseFolderId,
                                        type: {$in: casefolderTypes}
                                    };

                                    checkIfInsuranceCaseFolder( query, function( err, res ) {
                                        if( err ) {
                                            //  on error assume casefolder cannot be found, continue with best effort
                                            return next( null, null );
                                        }
                                        if( res.length > 0 ) {
                                            return next( null, result[0] && result[0].caseFolderId );
                                        }
                                        next( null, null );
                                    } );
                                } else {
                                    return next( null, result[0] && result[0].caseFolderId );
                                }
                            } else {
                                setImmediate( next, null, null );
                            }
                        } );
                    },
                    function( caseFolderId, next ) {
                        if( caseFolderId ) {
                            return setImmediate( next, null, caseFolderId );
                        }
                        //5. if patient.activeCaseFolderId is set => return case folder with this id
                        if( getOnlyInsuranceCaseFolder ) {
                            let query = {
                                _id: patient.activeCaseFolderId,
                                type: {$in: casefolderTypes}
                            };

                            checkIfInsuranceCaseFolder( query, function( err, res ) {
                                if( err ) {
                                    //  if error assume active casefolder cannot be found
                                    return next( null, null );
                                }
                                if( res.length > 0 ) {
                                    return setImmediate( next, null, patient.activeCaseFolderId );
                                }
                                next( null, null );
                            } );
                        } else {
                            return setImmediate( next, null, patient.activeCaseFolderId );
                        }
                    },
                    function( caseFolderId, next ) {
                        if( caseFolderId ) {
                            return setImmediate( next, null, caseFolderId );
                        }
                        //6. try to find case folder of last activity
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                patientId: patient._id
                            },
                            options: {
                                lean: true,
                                limit: 1,
                                sort: {
                                    timestamp: -1
                                },
                                select: {
                                    caseFolderId: 1,
                                    employeeId: 1,
                                    locationId: 1
                                }
                            }
                        }, ( err, result ) => {
                            if( err ) {
                                return next( err );
                            }
                            if( result[0] && result[0].caseFolderId ) {
                                lastActivityData = result[0];

                                if( getOnlyInsuranceCaseFolder ) {
                                    let query = {
                                        _id: result[0].caseFolderId,
                                        type: {$in: casefolderTypes}
                                    };

                                    checkIfInsuranceCaseFolder( query, function( err, res ) {
                                        if( err ) {
                                            //  not passing error on unrecognized casefolder
                                            return next( null, null );
                                        }
                                        if( res.length > 0 ) {
                                            return next( null, result[0] && result[0].caseFolderId );
                                        }
                                        next( null, null );
                                    } );
                                }
                            }
                            next( null, result[0] && result[0].caseFolderId );
                        } );
                    }
                ], function( err, caseFolderId ) {
                    if( err ) {
                        return callback( err );
                    }
                    // if "caseFolderId" is undefined - case 7.
                    getAndSetCaseFolder( {
                        patientId: patient._id,
                        type: {$exists: true},
                        imported: {$ne: true},   // MOJ-8268
                        _id: caseFolderId
                    }, ( err, foundedCaseFolder ) => {
                        if( foundedCaseFolder && lastActivityData ) {
                            activity.locationId = activity.locationId || lastActivityData.locationId;
                            activity.employeeId = activity.employeeId || lastActivityData.employeeId;
                        }
                        callback( err, foundedCaseFolder );
                    } );
                } );

            }

            /**
             *  Checks patient.insuranceStatus for insurance with type = case folder type
             *
             *      if not found - checks current user
             *      if user is not "PHYSICIAN" - take first insurance where location and employee id are set
             *
             *  @param  {Function}  callback    Of the form fn( err )
             */
            function getLocationAndEmployeeByInsurance( callback ) {
                let
                    userEmployeeId = user.specifiedBy,
                    insuranceType = caseFolder.type || caseFolderType,
                    insurance = Y.doccirrus.schemas.patient.getInsuranceByType( patient, insuranceType ),
                    insuranceLocationId = insurance && insurance.locationId || null,
                    insuranceEmployeeId = insurance && insurance.employeeId || null,
                    locationId = insuranceLocationId,
                    employeeId = insuranceEmployeeId || userEmployeeId;

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    migrate,
                    query: {
                        _id: employeeId
                    },
                    options: {
                        limit: 1,
                        lean: true,
                        select: {
                            type: 1
                        }
                    }
                }, ( err, results ) => {
                    let
                        employee;
                    if( err ) {
                        return callback( err );
                    }
                    [employee] = results;

                    if( !employee ) {
                        Y.log( `getLocationAndEmployeeByInsurance. Employee not found. employeeId: ${employeeId}`, 'error', NAME );
                        employeeId = null;
                    } else if( 'PHYSICIAN' !== employee.type ) {
                        Y.log( `getLocationAndEmployeeByInsurance. Employee is not "PHYSICIAN". employeeId: ${employeeId}`, 'error', NAME );
                        employeeId = null;
                    }
                    if( employeeId && employeeId === userEmployeeId && insuranceLocationId ) {

                        const
                            userLocations = user.locations,
                            isInsuranceLocationIdInUserLocations = insuranceLocationId && userEmployeeId && userLocations.some( userLocation => {
                                return userLocation._id === insuranceLocationId;
                            } );
                        if( !isInsuranceLocationIdInUserLocations ) {
                            locationId = null;
                        }
                    }

                    if( !employeeId && !locationId && patient.insuranceStatus && useFirstSuitableInsurance ) {
                        patient.insuranceStatus.some( _insurance => {
                            if( _insurance.employeeId && _insurance.locationId ) {
                                activity.employeeId = _insurance.employeeId;
                                activity.locationId = _insurance.locationId;
                                return true;
                            }
                            return false;
                        } );
                    }

                    activity.employeeId = employeeId;
                    activity.locationId = locationId;
                    callback();
                } );
            }

            function getLocationAndEmployeeByLastActivity( initialQuery = {}, callback ) {
                let
                    query = Object.assign( {
                        caseFolderId: caseFolder._id,
                        patientId: patient._id
                    }, initialQuery );
                if( activity.timestamp ) {
                    query.timestamp = {$lte: activity.timestamp};
                }

                Y.doccirrus.api.activity.get( {
                    user,
                    query,
                    migrate,
                    options: {
                        select: {
                            employeeId: 1,
                            locationId: 1
                        },
                        lean: true,
                        sort: {
                            timestamp: -1
                        },
                        limit: 1
                    },
                    callback( err, results ) {
                        if( err ) {
                            return callback( err );
                        }
                        if( results[0] ) {
                            activity.employeeId = results[0].employeeId;
                            activity.locationId = results[0].locationId;
                        }
                        callback();
                    }
                } );

            }

            /**
             * if activity.employeeId && activity.locationId is set, this step will be skipped
             * if caseFolder._id is set will check:
             *  1. last schein in this case folder
             *  2. last activity in this case folder
             *  if there is such activity - employeeId and locationId is taken from found activity
             * otherwise try to get employeeId and locationId from patient insurance
             * @param {Function}    callback
             */
            function getLocationAndEmployee( callback ) {
                async.series( [
                    function( next ) {
                        if( (activity.employeeId && activity.locationId) || !caseFolder._id ) {
                            return setImmediate( next );
                        }
                        getLocationAndEmployeeByLastActivity( {actType: {$in: Y.doccirrus.schemas.activity.scheinActTypes}}, next );
                    },
                    function( next ) {
                        if( (activity.employeeId && activity.locationId) || !caseFolder._id ) {
                            return setImmediate( next );
                        }
                        getLocationAndEmployeeByLastActivity( {}, next );
                    },
                    function( next ) {
                        if( activity.employeeId && activity.locationId ) {
                            return setImmediate( next );
                        }
                        getLocationAndEmployeeByInsurance( next );
                    }
                ], callback );

            }

            async.series( [
                function( next ) {
                    getPatient( next );
                },
                function( next ) {
                    getPatientCaseFolder( next );
                },
                function( next ) {
                    if( activity.employeeId && activity.locationId ) {
                        return setImmediate( next );
                    }
                    getLocationAndEmployee( next );
                }
            ], err => {
                if( err ) {
                    return callback( err );
                }
                activity.patientId = patient._id;
                activity.caseFolderId = caseFolder._id;
                if( activity.locationId ) {
                    activity.locationId = activity.locationId.toString();
                }
                callback( null, activity );
            } );
        }

        /**
         * Sets employee name to activity
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data activity data
         * @param {Function} args.callback
         */
        function setEmployeeName( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.setEmployeeName', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.setEmployeeName' );
            }
            const
                {user, data: activity = {}, callback, context = {}} = args,
                async = require( 'async' ),
                activitySchemaProcess = Y.doccirrus.schemaprocess.activity;
            if( activity.mirrorActivityId ) {
                callback( null, activity );
                return;
            }

            async.waterfall( [
                function( next ) {
                    let
                        cachedEmployee = activitySchemaProcess.getCollectionCache( {
                            context,
                            collection: 'employee',
                            key: activity.employeeId
                        } );
                    if( cachedEmployee ) {
                        return setImmediate( next, null, cachedEmployee );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        migrate: true,
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: activity.employeeId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        activitySchemaProcess.setCollectionCache( {
                            context,
                            collection: 'employee',
                            key: activity.employeeId,
                            data: results[0]
                        } );
                        next( null, results[0] );
                    } );
                }], function( err, employee = {} ) {
                if( err ) {
                    return callback( err );
                }
                activity.employeeName = Y.doccirrus.schemas.person.personDisplay( employee );
                activity.employeeInitials = employee.initials;
                callback( err, activity );
            } );

        }

        /**
         * Sets patient name to activity
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data activity data
         * @param {Function} args.callback
         */
        function setPatientName( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.setPatientName', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.setPatientName' );
            }
            let
                {user, data: activity = {}, context = {}, callback} = args,
                async = require( 'async' ),
                activitySchemaProcess = Y.doccirrus.schemaprocess.activity;
            if( activity.mirrorActivityId ) {
                callback( null, activity );
                return;
            }
            async.waterfall( [
                    function( next ) {
                        let
                            cachedPatient = activitySchemaProcess.getCollectionCache( {
                                context,
                                collection: 'patient',
                                key: activity.patientId
                            } );
                        if( cachedPatient ) {
                            return setImmediate( next, null, cachedPatient );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            migrate: true,
                            user: user,
                            model: 'patient',
                            action: 'get',
                            query: {
                                _id: activity.patientId
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            activitySchemaProcess.setCollectionCache( {
                                context,
                                collection: 'patient',
                                key: activity.patientId,
                                data: results[0]
                            } );
                            next( null, results[0] );
                        } );
                    }],
                function( err, patient = {} ) {
                    if( err ) {
                        return callback( err );
                    }
                    activity.patientFirstName = patient.firstname;
                    activity.patientLastName = patient.lastname;
                    callback( err, activity );
                } );

        }

        /**
         * updates activity editor
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data activity data
         * @param {Function} args.callback
         */
        function updateEditor( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.updateEditor', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.updateEditor' );
            }
            let
                {user, data: activity = {}, callback, context = {}} = args,
                activitySchemaProcess = Y.doccirrus.schemaprocess.activity,
                cachedIdentity = activitySchemaProcess.getCollectionCache( {
                    context,
                    collection: 'identity',
                    key: user.identityId
                } ),
                editorIndex = 0;
            if( !user ) {
                Y.log( 'ERROR:  IGNORING:  updateEditor called without user: ' );
                callback( null, activity );
                return;
            }

            if( user.superuser ) {
                Y.log( 'IGNORING:  updateEditor called via needs / patient portal' );
                callback( null, activity );
                return;
            }

            function getEmployeeCb( result ) {
                activity.editor = (activity.editor && Array.isArray( activity.editor ) && 0 < activity.editor.length) ? activity.editor : [ // initialize with defaults
                    {name: user.id, employeeNo: '', initials: ''}
                ];

                editorIndex = activity.editor.length - 1; // the last one
                if( result ) {
                    activity.editor[editorIndex].name = result.firstname + ' ' + result.lastname;
                    activity.editor[editorIndex].employeeNo = result.employeeNo;
                    activity.editor[editorIndex].initials = result.initials;
                    activity.editor[editorIndex]._id = new ObjectId();
                }

                callback( null, activity );
            }

            function getIdentityCb( result ) {
                let
                    employeeCacheKey = result.specifiedBy,
                    cachedEmployee = activitySchemaProcess.getCollectionCache( {
                        context,
                        collection: 'employee',
                        key: employeeCacheKey
                    } );
                if( cachedEmployee ) {
                    return getEmployeeCb( cachedEmployee );
                }
                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    'action': 'get',
                    'model': 'employee',
                    'user': user,
                    'query': {'_id': result.specifiedBy}
                }, ( err, results ) => {
                    if( err ) {
                        return callback( err );
                    }
                    activitySchemaProcess.setCollectionCache( {
                        context,
                        collection: 'employee',
                        key: employeeCacheKey,
                        data: results[0]
                    } );
                    getEmployeeCb( results[0] );

                } );
            }

            if( cachedIdentity ) {
                getIdentityCb( cachedIdentity );
            } else {
                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    'action': 'get',
                    'model': 'identity',
                    'user': user,
                    'query': {'_id': user.identityId}
                }, ( err, results ) => {
                    if( err || !results || !results[0] ) {
                        return callback( err || 'invalid identityId' );
                    }
                    activitySchemaProcess.setCollectionCache( {
                        context,
                        collection: 'identity',
                        key: user.identityId,
                        data: results[0]
                    } );
                    getIdentityCb( results[0] );
                } );
            }
        }

        /**
         * Checks if transition is valid
         * @param {Object} args
         * @param {Object} args.data activity data
         * @param {Function} args.callback
         * @return {*}
         */
        function checkTransition( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.checkTransition', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.checkTransition' );
            }
            let
                {data: activity = {}, callback} = args,
                legal = true,
                currentStatus = activity.originalData_ && activity.originalData_.status,
                newStatus = activity.status;
            if( currentStatus !== newStatus ) {
                //
                // allow mongoose style save transitions for now
                // need a new scheme for migration (must it be runDb?)
                if( !activity.originalData_ ) {
                    legal = true;
                } else {
                    Y.log( 'Checking transition rules from ' + currentStatus + ' to ' + newStatus + ' for activity ' + activity._id, 'debug', NAME );
                    legal = Y.doccirrus.schemas.activity.isLegalNewStatus( activity.originalData_.actType, currentStatus, newStatus );
                    Y.log( 'Transition is legal: ' + (legal ? 'TRUE' : 'FALSE'), 'debug', NAME );
                }
            }

            if( !legal ) {
                return callback( Y.doccirrus.errors.rest( 403, '', true ) );
            }

            callback( null, activity );
        }

        /**
         * Generates activity "content" from activityContent and other fields.  Called by post-process.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data activity data
         * @param {Function} args.callback
         */
        function generateContent( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.generateContent', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.generateContent' );
            }
            const
                async = require( 'async' ),

                //  these activities do not allow the user to edit the userContent in UI
                UC_NOT_EDITABLE = [
                    'SCHEIN',
                    'PKVSCHEIN',
                    'BGSCHEIN',
                    'ASSISTIVE',
                    'OPHTHALMOLOGY_TONOMETRY',
                    'OPHTHALMOLOGY_REFRACTION',
                    'LABREQUEST'
                ],

                //  these activities get userContent from a catalog entry, overrdigin the default,
                //  generate content from default userContent without overwriting
                UC_FROM_CATALOG = [
                    'MEDICATION',
                    'DIAGNOSIS'
                ];

            let
                {user, data: {activity, _activitiesObj} = {}, callback} = args,
                actType = activity.actType,
                activitySettings,
                hasCustomUserContent = false,
                newContent;

            // for prescriptions, we presume that the content is
            async.series(
                [
                    loadActivitySettings,
                    checkActivitiesObj,
                    setActivityContent,
                    setActivityContentFromBackmappingAsync,
                    setActivityContentAsync
                ], onAllDone
            );

            function loadActivitySettings( itcb ) {
                Y.doccirrus.api.activitysettings.loadActivitySettings( {'user': user, 'callback': onSettingsLoaded} );

                function onSettingsLoaded( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }

                    var i;
                    activitySettings = result.settings;

                    for( i = 0; i < activitySettings.length; i++ ) {
                        if(
                            (activitySettings[i].actType === actType) &&
                            (activitySettings[i].userContent) &&
                            ('' !== activitySettings[i].userContent)
                        ) {
                            hasCustomUserContent = true;

                            if(
                                ('VALID' === activity.status || 'CREATED' === activity.status) &&
                                (-1 !== UC_NOT_EDITABLE.indexOf( actType ))
                            ) {
                                //  if userContent cannot be changed by user, and a custom/default userContent exists,
                                //  assume that over any default passed from client, MOJ-9090
                                activity.userContent = activitySettings[i].userContent;
                            }

                            if(
                                ('VALID' === activity.status || 'CREATED' === activity.status) &&
                                (-1 !== UC_FROM_CATALOG.indexOf( actType ))
                            ) {
                                //  if userContent is fro cataglog, and a custom/default userContent exists, use default
                                //  instead of userContent from client (ie, copy back), MOJ-9090
                                activity.backmappingTemplate = activitySettings[i].userContent;
                            }
                        }
                    }

                    if( 'PROCESS' === actType && activity.d_extra && Object.keys( activity.d_extra ).length ) {
                        hasCustomUserContent = false;
                    }

                    itcb( null );
                }

            }

            //  X. Check that attachments of this activity are loaded, fix for MOJ-
            async function checkActivitiesObj( itcb ) {
                let err;
                if( activity && activity.activities && !_activitiesObj && !activity._activitiesObj ) {

                    [err, _activitiesObj] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            options: {lean: true},
                            query: {_id: {$in: activity.activities}}
                        } )
                    );

                    return itcb( err );
                }
                itcb( null );
            }

            //  1. Set activity content according to activity type, as defined in the activity schema
            async function setActivityContent( itcb ) {
                // for prescriptions, we presume that the content is
                // already correct because we do not want to reload the
                // attachments.
                if(
                    !hasCustomUserContent &&
                    activity &&
                    activity.patientId &&
                    (actType === 'PUBPRESCR' ||
                     actType === 'PRIVPRESCR' ||
                     actType === 'LONGPRESCR' ||
                     actType === 'PRESCRBTM' ||
                     actType === 'PRESCRG' ||
                     actType === 'PRESCRT' ||
                     actType === 'PRESASSISTIVE' ||
                     actType === 'MEDICATION')
                ) {
                    //EXTMOJ-2118 - get medications for patient and calculate medication range
                    let [err, response] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            query: {
                                isPrescribed: true,
                                actType: 'MEDICATION',
                                patientId: activity.patientId,
                                status: {$nin: ['CANCELLED']}
                            },
                            options: {lean: true},
                            sort: {timestamp: -1}
                        } )
                    );
                    if( err ) {
                        Y.log( `Could not get prescribed medications from Patient: ${err.stack || err}`, 'warn', NAME );
                    }

                    let elements = [];
                    if( activity.attachments && activity.attachments.length && activity.formVersion ) {
                        let documents;
                        [err, documents] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'document',
                                query: {
                                    _id: {$in: activity.attachments}
                                },
                                options: {
                                    lean: true,
                                    select: {
                                        formState: 1
                                    }
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `setActivityContent: Could not get document for activity ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                        }

                        if( documents && documents[0] && documents[0].formState ) {
                            let formversions;
                            [err, formversions] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'formtemplateversion',
                                    query: {
                                        _id: activity.formVersion
                                    },
                                    options: {
                                        lean: true,
                                        select: {
                                            'jsonTemplate.pages.elements': 1
                                        }
                                    }
                                } )
                            );
                            if( err ) {
                                Y.log( `setActivityContent: Could not get formVersion for activity ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                            }

                            let jsonTemplate = (formversions && formversions[0] || {}).jsonTemplate || {};

                            (jsonTemplate.pages || []).map( page => {
                                let lookedElements = (page.elements || []).filter(
                                    el => (['exactMed1', 'exactMed2', 'exactMed3'].includes( el.schemaMember )) ).map(
                                    el => ({
                                        id: el.id,
                                        schemaMember: el.schemaMember
                                    })
                                );
                                elements = [...elements, ...lookedElements];
                            } );

                            elements.forEach( el => {
                                el.value = documents[0].formState[el.id] === '[3mm]*';
                                switch( el.schemaMember ) {
                                    case 'exactMed1':
                                        el.idx = 1;
                                        el.medication = documents[0].formState.med1;
                                        break;
                                    case 'exactMed2':
                                        el.idx = 2;
                                        el.medication = documents[0].formState.med2;
                                        break;
                                    case 'exactMed3':
                                        el.idx = 3;
                                        el.medication = documents[0].formState.med3;
                                        break;
                                }
                                return el;
                            } );
                        }
                    }

                    newContent = Y.doccirrus.schemas.activity.generateContent(
                        activity,
                        {
                            _activitiesObj: _activitiesObj || activity._activitiesObj,
                            medicationsForPatient: response || [],
                            formElements: elements
                        }
                    );
                    activity.content = newContent;
                } else if(
                //  if there is custom content for prescriptions we skip the (default) hardcoded routine and use the
                //  template supplied by the user
                    !hasCustomUserContent &&
                    actType !== 'PUBPRESCR' &&
                    actType !== 'PRIVPRESCR' &&
                    actType !== 'LONGPRESCR' &&
                    actType !== 'PRESCRBTM' &&
                    actType !== 'PRESCRG' &&
                    actType !== 'PRESCRT' &&
                    actType !== 'PRESASSISTIVE' ||
                    _activitiesObj
                ) {
                    newContent = Y.doccirrus.schemas.activity.generateContent( activity, {_activitiesObj} );
                    if( actType === 'TELECONSULT' ) {
                        activity.userContent = newContent;
                        activity.content = '';
                    } else {
                        if (activity.actType === 'INVOICEREFPVS') {
                            if (!(activity.content && activity.content.includes(newContent))) {
                                activity.content = newContent;
                            }

                        } else {
                            activity.content = newContent;
                        }
                    }

                } else if( activity.noOfRepetitions && activity.content && activity.parentPrescriptionId ) {
                    let
                        // [MOJ-12027] switched to repeatString-generator function
                        repeatString = Y.doccirrus.schemas.activity.actTypeRepeatString( actType ),

                        // stripe an old repeatString from the existing content, and append the new
                        textToReplace = '<br/>' + repeatString;

                    if( -1 === activity.content.indexOf( textToReplace ) ) {
                        textToReplace = repeatString;
                    }
                    newContent = activity.content.slice( 0, activity.content.indexOf( textToReplace ) ) + '<br/>' + repeatString + ' (' + activity.noOfRepetitions + ')';
                    activity.content = newContent;
                }
                itcb( null );
            }

            //  2. Include values from a form document into templates defined in activity.userContent
            function setActivityContentFromBackmappingAsync( itcb ) {
                //  at present we only use form values in the content of HISTORY and SURGERY activities
                var hasBackmapping = Y.doccirrus.schemas.activity.actTypeHasBackmapping( activity.actType || '' );

                if( !hasBackmapping && !hasCustomUserContent ) {
                    //  activity type can not have backmapping, does not have specialized userContent
                    return itcb( null );
                }

                if( -1 === (activity.userContent || '').indexOf( '{{' ) && !activity.backmappingTemplate ) { //TODO: better to have null checking for userContent
                    //  activity type can have backmapping, but this one does not
                    return itcb( null );
                }

                Y.doccirrus.schemas.activity.generateContentAsync( user, activity, itcb );
            }

            //  3. overwrite the for activities whose content is generated on the server
            function setActivityContentAsync( itcb ) {
                switch( true ) {
                    case Y.doccirrus.schemas.activity.medDataActTypes.includes( activity.actType ):
                        return Y.doccirrus.api.meddata.generateContentForActivity( {
                            user,
                            activity,
                            callback: itcb
                        } );
                }
                return itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    return callback( err );
                }
                //  clean up temp field for UC_FROM_CATALOG
                if( activity.backmappingTemplate ) {
                    delete activity.backmappingTemplate;
                }

                callback( null, activity );
            }

        }

        /**
         *  Add links to media in the activity.attachedMedia field (used to make links to files in attachments)
         *
         *  This will also check the document.activityId and set if missing
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         */

        function addAttachmentLinks( user, activity, callback ) {
            Y.log( `Entering Y.doccirrus.api.activity.addAttachmentLinks ${activity._id}`, 'info', NAME );
            if( callback ) {
                callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.activity.addAttachmentLinks' );
            }

            const async = require( 'async' );
            let
                updatedAttachmentsArr = [];

            if( !activity ) {
                //  unlikely, but some strange behavior observed here
                callback( new Error( 'no activity pased to post process' ) );
                return;
            }

            if( !activity.content ) {
                activity.content = '';
            }

            activity.attachedMediaTags = [];

            if( !activity.attachments ) {
                activity.attachments = [];
            } else if( Array.isArray( activity.attachments ) && activity.attachments.length ) {
                activity.attachments = filterAttachments( activity.attachments ); // Remove any junk and duplicates
                updatedAttachmentsArr = [...activity.attachments]; //Copy this so that we do not mutate array.
            }

            //  clear any existing markdown links
            if( activity.attachedMedia ) {
                activity.attachedMedia.splice( 0, activity.attachedMedia.length );
            } else {
                activity.attachedMedia = [];
            }

            Y.log( `addAttachmentLinks: Updating attachedMedia from attachment set: ${JSON.stringify( activity.attachments )}`, 'debug', NAME );

            async.eachSeries( updatedAttachmentsArr, loadAttachment, onAllDone );

            function loadAttachment( docId, itcb ) {
                function onAttachmentLoaded( err, data ) {

                    var found, insert, i;
                    if( err ) {
                        itcb( err );
                        return;
                    }

                    //  collect tags on activity
                    if( data && data[0] && data[0].tags ) {
                        for( i = 0; i < data[0].tags.length; i++ ) {
                            if( -1 === activity.attachedMediaTags.indexOf( data[0].tags[i] ) ) {
                                activity.attachedMediaTags.push( data[0].tags[i] );
                            }
                        }
                    }

                    //  add to attachedMedia array
                    if( data && data[0] && data[0].mediaId ) {
                        insert = {
                            mediaId: data[0].mediaId,
                            contentType: data[0].contentType,
                            caption: data[0].caption,
                            title: data[0].title
                        };

                        if( data[0].malwareWarning ) {
                            insert.malwareWarning = data[0].malwareWarning;
                        }

                        found = Y.Array.find( activity.attachedMedia, function( media ) {
                            return media.mediaId === insert.mediaId;
                        } );
                        if( found ) {
                            activity.attachedMedia.splice( activity.attachedMedia.indexOf( found ), 1, insert );
                        } else {
                            activity.attachedMedia.push( insert );
                            Y.log( `addAttachmentLinks: Added new item to activity ${activity._id} attachedMedia: ${insert.mediaId}`, 'debug', NAME );
                        }
                    }

                    if( data && data[0] ) {
                        checkAttachment( data[0] );
                    } else {
                        return itcb();
                    }

                }

                /**
                 *  Some activity fields are copied to the document, check they are correct while we have it in memory
                 *
                 *  @param doc
                 *  @return {Promise<void>}
                 */

                async function checkAttachment( doc ) {
                    let
                        checkFields = ['locationId', 'patientId', 'caseFolderId', 'actType', 'subType'],
                        changes = {activityId: `${activity._id}`},
                        needsUpdate = (doc.activityId !== `${activity._id}`),
                        saveFields = needsUpdate ? ['activityId'] : [],
                        err;

                    checkFields.forEach( function( fieldName ) {
                        if( activity[fieldName] !== doc[fieldName] ) {
                            changes[fieldName] = `${activity[fieldName]}`;
                            saveFields.push( fieldName );
                            needsUpdate = true;
                        }
                    } );

                    if( needsUpdate ) {
                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                'user': user,
                                'action': 'put',
                                'model': 'document',
                                'query': {'_id': doc._id},
                                'fields': saveFields,
                                'data': Y.doccirrus.filters.cleanDbObject( changes )
                            } )
                        );
                    }

                    if( err ) {
                        Y.log( `addAttachmentLinks: Problem updating document from activity: ${err.stack || err}`, 'error', NAME );
                        //  continue with next attachment, best effort
                    }

                    itcb();
                }

                Y.doccirrus.mongodb.runDb( {
                    //'migrate': false, ?
                    'action': 'get',
                    'model': 'document',
                    'user': user,
                    'query': {'_id': docId.toString()},
                    'callback': onAttachmentLoaded
                } );
            }

            /**
             *  Check an attachments array for duplicates and bad values, happens sometimes with old data from kette, etc
             *
             *  @param      {Object}    attachmentIds   Potentially with junk entries
             *  @returns    {Object}                    Clean array
             */

            function filterAttachments( attachmentIds ) {
                const cleanAttachments = [];
                let i;
                for( i = 0; i < attachmentIds.length; i++ ) {
                    if( -1 !== cleanAttachments.indexOf( attachmentIds[i] ) ) {
                        Y.log( `addAttachmentLinks: Removing duplicate attachment: ${attachmentIds[i]} from activity ${activity._id}.`, 'warn', NAME );
                        continue;
                    }
                    //  null, 'undefined', empty strings sometimes seen in old data
                    if( !attachmentIds[i] || 24 !== attachmentIds[i].length ) {
                        Y.log( `addAttachmentLinks: Discarding invalid attachment: ${attachmentIds[i]} from activity ${activity._id}.`, 'warn', NAME );
                        continue;
                    }
                    cleanAttachments.push( attachmentIds[i] );
                }
                return cleanAttachments;
            }

            function onAllDone() {
                //Y.log( `Finished adding links to user content: ${JSON.stringify( activity.attachedMedia )}`, 'debug', NAME );
                callback( null, activity );
            }

        }

        function getLatestMeddataForPatient( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getLatestMeddataForPatient', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getLatestMeddataForPatient' );
            }
            Y.log( 'DEPRECATED, please use meddata-api implementation of getLatestMeddataForPatient.', 'warn', NAME );
            Y.doccirrus.api.meddata.getLatestMeddataForPatient( args );
        }

        /**
         *  Send email with activity content and attachments
         *
         *  TODO: keep an array of temp files to clean up
         *
         *  @param  args                    {Object}
         *  @param  args.data               {Object}
         *  @param  args.data.activities    {Object}    Plain array of activity _id strings
         *  @param  args.data.autorotate    {Boolean}   Make PDF attachments portrait (set true when emailing to fax service)
         *  @param  args.user               {Object}    REST user or equivalent
         *  @param  args.callback           {Function}
         */

        function mailActivities( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.mailActivities', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.mailActivities' );
            }
            const {user} = args,
                fs = require( 'fs' );
            let
                tempFiles = [];

            if( !args.data || !args.data.activities ) {
                return args.callback( Y.doccirrus.errors.rest( 404, 'missing activities', true ) );
            }

            //  Expand activities with formatted attachments
            async.map( args.data.activities, getActivityByIdWithAttachments, onActivitiesPrepared );

            //  Expand a single media item with formatted attachment
            function getActivityByIdWithAttachments( id, itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'get',
                    model: 'activity',
                    query: {_id: id},
                    options: {
                        limit: 1,
                        lean: true
                    },
                    callback: onActivityLoaded
                } );

                function onActivityLoaded( err, res ) {
                    if( err ) {
                        return itcb( err );
                    }
                    if( !res[0] ) {
                        return itcb( Y.doccirrus.errors.rest( 404, 'Activity not found: ' + id, true ) );
                    }

                    if( !res[0].attachedMedia ) {
                        return itcb( null, res );
                    }

                    var activityObj = res[0],
                        attachedMedia;

                    if( args.data.attachmentIds && args.data.attachmentIds.length ) {
                        attachedMedia = activityObj.attachedMedia.filter( function( item ) {
                            return -1 < args.data.attachmentIds.indexOf( item.mediaId );
                        } );
                    }

                    if( !attachedMedia || !attachedMedia.length ) {
                        attachedMedia = activityObj.attachedMedia;
                    }

                    async.map( attachedMedia, getBufferByMedia, onAllMediaLoaded );

                    function onAllMediaLoaded( err, mediaList ) {
                        if( err ) {
                            Y.log( 'Problem loading media to buffer: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        activityObj.media = mediaList;
                        itcb( null, activityObj );
                    }
                }
            }

            //  Given media object, export the corresponding file to disk, then load as a buffer
            function getBufferByMedia( media, itcb ) {

                var
                    tempFile,
                    mediaObj;

                async.series(
                    [
                        loadMedia,
                        exportToDisk,
                        reorientPdf,
                        loadToBuffer
                    ],
                    onMediaBuffered
                );

                function loadMedia( cb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'get',
                        model: 'media',
                        query: {_id: media.mediaId},
                        options: {
                            limit: 1,
                            lean: true
                        },
                        callback: onMediaLoaded
                    } );

                    function onMediaLoaded( err, result ) {
                        if( !err && !result[0] ) {
                            err = Y.doccirrus.errors.rest( 404, 'Media not found: ' + media._id, true );
                        }
                        if( err ) {
                            return cb( err );
                        }
                        mediaObj = result[0];
                        cb( null );
                    }
                }

                function exportToDisk( cb ) {
                    tempFile = Y.doccirrus.media.getTempFileName( mediaObj );

                    Y.doccirrus.media.gridfs.exportFile(
                        args.user,          //  REST user or equivalent
                        mediaObj._id,          //  GridFS id to export
                        tempFile,           //  requested location to export the file to
                        false,              //  assume not in migration
                        onFileWritten
                    );

                    function onFileWritten( err, fileName ) {
                        if( err ) {
                            return cb( err );
                        }
                        Y.log( 'Exported media to ' + fileName, 'debug', NAME );

                        //  note that actual file could be different from location requested, following security checks
                        tempFile = fileName;
                        tempFiles.push( fileName );
                        cb( null );
                    }
                }

                function reorientPdf( cb ) {
                    //  this step is only needed for PDFs, see MOJ-7590
                    if( 'APPLICATION_PDF' !== mediaObj.mime ) {
                        return cb( null );
                    }
                    //  and only if sending to fax service
                    if( !args.data.autorotate ) {
                        return cb( null );
                    }

                    Y.doccirrus.media.pdf.rotatePdfToPortrait( tempFile, onReorientComplete );

                    function onReorientComplete( err, reorientedFile ) {
                        if( err ) {
                            return cb( err );
                        }
                        tempFile = reorientedFile;

                        //  note the file to clean up later, if a new temp file was created
                        if( -1 === tempFiles.indexOf( reorientedFile ) ) {
                            tempFiles.push( reorientedFile );
                        }

                        cb( null );
                    }
                }

                function loadToBuffer( cb ) {
                    fs.readFile( tempFile, onFileLoaded );

                    function onFileLoaded( err, buffer ) {
                        if( err ) {
                            return cb( err );
                        }
                        mediaObj.buffer = buffer;
                        cb( null );
                    }
                }

                function onMediaBuffered( err ) {
                    if( err ) {
                        return itcb( err );
                    }
                    Y.log( 'Buffered media: ' + mediaObj._id, 'debug', NAME );
                    itcb( null, mediaObj );
                }

            }

            function onActivitiesPrepared( err, res ) {
                if( err ) {
                    Y.log( 'Problem preparing activities for email: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.data.activities = res;
                if( args.data.currentLocationId ) {

                    async.waterfall( [
                        function( next ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'location',
                                action: 'get',
                                query: {
                                    _id: args.data.currentLocationId
                                },
                                options: {
                                    select: {
                                        emailFooter: 1
                                    }
                                }
                            }, next );
                        },
                        function( location, next ) {

                            if( location && location[0] && location[0].emailFooter && '' !== location[0].emailFooter ) {
                                args.data.template = {};
                                args.data.template.emailFooter = location && location[0] && location[0].emailFooter;
                            }

                            Y.doccirrus.api.media.list( {
                                user: args.user,
                                originalParams: {'collection': 'location', 'id': args.data.currentLocationId},
                                callback: ( error, result ) => {
                                    if( error ) {
                                        Y.log( 'Problem getting mail logo: ' + JSON.stringify( err ), 'warn', NAME );
                                        return next();
                                    } else if( result && result[0] ) {
                                        let mediaObj = {
                                            'method': 'download',
                                            'transform': 'resize',
                                            'mime': result[0].mime,
                                            'widthPx': 200,
                                            'heightPx': -1,
                                            '_id': result[0]._id,
                                            '_toDataUri': false,
                                            '_fixAspect': true,
                                            '_ext': '',
                                            '_inCache': false,
                                            '_category': '',
                                            '_cacheFile': ''
                                        };

                                        Y.doccirrus.media.getImageFromMediaObject( args.user, mediaObj ).then( result => {
                                            args.data.template = args.data.template || {};
                                            args.data.template.filename = `${location[0].locname}.${result._fileExt}`;
                                            args.data.template.filePath = result._diskFile;
                                            return next();
                                        } ).catch( err => {
                                            Y.log( `could not get image from media object ${err}: go on without`, 'warn', NAME );
                                            return next();
                                        } );

                                    } else {
                                        return next();
                                    }
                                }
                            } );
                        }
                    ], ( err ) => {
                        if( err ) {
                            Y.log( 'Coudn`t get email settings from location. Err : ' + JSON.stringify( err ), 'warn', NAME );
                        }
                        sendAllMailWithData( args.data, onAllMailSent );
                    } );
                } else {
                    sendAllMailWithData( args.data, onAllMailSent );
                }

                function onAllMailSent( err ) {
                    if( err ) {
                        Y.log( 'Problem sending mail: ' + JSON.stringify( err ), 'warn', NAME );
                        return args.callback( err );
                    }
                    args.callback( null, Y.doccirrus.errors.rest( 200, 'ALL CLEAR', true ) );
                }
            }

            function sendAllMailWithData( mailData, callback ) {
                var attachments = [];

                mailData.activities.forEach( activity => {
                    if( activity.media ) {
                        activity.media.forEach( media => {
                            attachments.push( {
                                filename: require( 'path' ).basename( media.name ),
                                content: media.buffer
                            } );
                        } );
                    }
                } );

                var emailOptions = {
                    to: mailData.email,
                    user: user,
                    from: mailData.senderEmail,
                    replyTo: mailData.replyTo,
                    isReplyToSetExplicitly: Boolean( mailData.replyTo ),
                    subject: mailData.subject,
                    template: mailData.template,
                    jadeParams: {text: mailData.content.replace( /\n/g, "<br>" )},
                    jadePath: './mojits/InCaseMojit/views/mailActivities.pug',
                    attachments: args.data.attachments ? args.data.attachments.concat( attachments ) : attachments
                };

                if( !mailData.replyTo ) {
                    emailOptions.serviceName = 'conferenceService';
                }

                logActivityMail( attachments, mailData, args.user );

                //  clean up temp files
                Y.doccirrus.media.cleanTempFiles( {_tempFiles: tempFiles} );

                var emailMessage = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );

                Y.doccirrus.email.sendEmail(
                    {...emailMessage, user},
                    ( err ) => {
                        if( err ) {
                            callback( err );
                        } else {
                            saveEmail( mailData );
                            callback();
                        }
                    }
                );

            }

            async function saveEmail( mailData ) {
                let activitiesToUpdate = args.data.activities.map( ( el ) => {
                    return {
                        _id: el._id && el._id.toString(),
                        savedEmails: [...(el.savedEmails || [])],
                        caseFolderId: el.caseFolderId
                    };
                } );
                let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'post',
                    model: 'patientemail',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        to: mailData.email,
                        userId: user.identityId,
                        from: mailData.senderEmail || (mailData.template || {}).locationMail, //use location mail when it sended via fax
                        replyTo: mailData.replyTo || mailData.senderEmail,
                        subject: mailData.subject,
                        template: mailData.template,
                        content: mailData.content.replace( /\n/g, "<br>" ),
                        attachmentIds: args.data.attachmentIds,
                        activities: args.data.activities || [],
                        sentDate: Date.now(),
                        senderName: mailData.senderName || (mailData.template || {}).locationName, //use location name when it sended via fax
                        targetName: mailData.targetName
                    } )
                } ) );

                if( err ) {
                    Y.log( `saveEmail: Failed to save email: ${err.stack || err}`, 'error', NAME );
                    return;
                }

                result = result.result || result;
                markActivitiesAsSentByEmail( activitiesToUpdate, result[0] );
            }

            async function markActivitiesAsSentByEmail( activities, emailRecordId ) {
                for( let act of activities ) { //eslint-disable-line no-unused-vars
                    if( !act._id ) {
                        //guard to prevet setting savedEmails to random activity
                        Y.log( `mailActivities: try update activity with incorrect id ${JSON.stringify( act )}`, 'warn', NAME );
                        continue;
                    }
                    let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        query: {_id: act._id},
                        action: 'update',
                        data: {
                            savedEmails: (act.savedEmails || []).concat( emailRecordId )
                        }
                    } ) );

                    if( err ) {
                        Y.log( `markActivitiesAsSentByEmail: Failed to update activities: ${err.stack || err}`, 'warn', NAME );
                    }
                }
                if( activities && activities.length ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'system.UPDATE_ACTIVITIES_TABLES',
                        msg: {
                            data: activities[0].caseFolderId
                        }
                    } );
                }
            }

            function logActivityMail( attachments, mailData, who, callback ) {
                let entry = Y.doccirrus.api.audit.getBasicEntry( who, 'transfer', 'activity', `Email gesendet an ${mailData.email} mit ${attachments.length}  Attachment(s). antwarten on ${mailData.replyTo}, e-mail: ${mailData.content} ` );
                entry.skipcheck_ = true;
                return Y.doccirrus.api.audit.post( {
                    user: who,
                    data: entry,
                    callback: callback
                } );
            }

        }

        /**
         *  Send email to each entity from <entityname>Id
         *
         *  @param {Object} args
         *  @param {Object} args.data
         *  @param {Object|undefined} args.data.template
         *  @param {String} args.data.senderEmail
         *  @param {String} args.data.subject
         *  @param {String} args.data.content
         *  @param {Array|undefined} args.data.patientIds             Plain array of patient _id strings
         *  @param {Array|undefined} args.data.baseContactIds         Plain array of patient _id strings
         *  @param {Array|undefined} args.data.currentLocationId      Location ID
         *  @param {Array|undefined} args.data.mediaIds               Plain array of media _id strings
         *  @param {Boolean|undefined} args.data.autorotate           Make PDF attachments portrait (set true when emailing to fax service)
         *  @param {Object} args.user                                 REST user or equivalent
         *  @param {Function} args.callback
         *  @param {String} args.type                                 patient || contact
         */
        async function sendEmailsFromId( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.sendEmailsFromId', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.sendEmailsFromId' );
            }
            const {
                    user,
                    data
                } = args,
                fs = require( 'fs' ),
                readFile = util.promisify( fs.readFile ),
                Promise = require( 'bluebird' );
            let
                errors = [],
                patients = [],
                baseContacts = [],
                activities = [],
                mediaObjects = [],
                emailAddresses = [],
                amountOfAttachments = 0;

            async function listMedia() {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.media.list( {
                        user: user,
                        originalParams: {'collection': 'location', 'id': data.currentLocationId},
                        callback: ( error, result ) => {
                            if( error ) {
                                Y.log( `Problem getting mail logo: ${JSON.stringify( error )}`, 'warn', NAME );
                                reject( error );
                            } else if( result && result[0] ) {
                                let mediaObj = {
                                    method: 'download',
                                    transform: 'resize',
                                    mime: result[0].mime,
                                    widthPx: 200,
                                    heightPx: -1,
                                    _id: result[0]._id,
                                    _toDataUri: false,
                                    _fixAspect: true,
                                    _ext: '',
                                    _inCache: false,
                                    _category: '',
                                    _cacheFile: ''
                                };

                                Y.doccirrus.media.getImageFromMediaObject( user, mediaObj ).then( result => {
                                    data.template = data.template || {};
                                    // eslint-disable-next-line no-undef
                                    data.template.filename = `${location[0].locname}.${result._fileExt}`;
                                    data.template.filePath = result._diskFile;
                                    return resolve();
                                } ).catch( err => {
                                    Y.log( `could not get image from media object ${err}: go on without`, 'warn', NAME );
                                    return resolve();
                                } );

                            } else {
                                return resolve();
                            }
                        }
                    } );
                } );
            }

            async function sendEmailAsync( emailMessage, user ) {
                return new Promise( ( resolve, reject ) => {
                    if( !emailMessage || !user ) {
                        return reject( Error( 'could not sned mail: missing arguments' ) );
                    }
                    Y.doccirrus.email.sendEmail(
                        {...emailMessage, user},
                        ( err, res ) => {
                            if( err ) {
                                Y.log( `could not start send email: ${err.stack || err}`, 'error', NAME );
                                return reject( err );
                            }
                            Y.log( `sent email: ${res}`, 'debug', NAME );
                            resolve( res );
                        }
                    );
                } );
            }

            //  Given media object, export the corresponding file to disk, then load as a buffer
            async function getBufferByMedia( mediaId ) {
                async function exportFile( id, tempFile ) {
                    return new Promise( ( resolve, reject ) => {
                        if( !id || !tempFile ) {
                            return reject( Error( 'could not start export file: missing arguments' ) );
                        }
                        Y.doccirrus.media.gridfs.exportFile(
                            user,          //  REST user or equivalent
                            id,          //  GridFS id to export
                            tempFile,           //  requested location to export the file to
                            false,              //  assume not in migration
                            onFileWritten
                        );

                        function onFileWritten( err, fileName ) {
                            if( err ) {
                                return reject( Error( `could not export file: ${err.stack | err}` ) );
                            }
                            Y.log( `Exported media to ${fileName}`, 'debug', NAME );

                            //  note that actual file could be different from location requested, following security checks
                            resolve( fileName );
                        }
                    } );
                }

                async function rotatePdfToPortrait( tempFile ) {
                    return new Promise( ( resolve, reject ) => {
                        if( !tempFile ) {
                            return reject( Error( 'could not start rotate pdf to portrait: missing arguments' ) );
                        }
                        Y.doccirrus.media.pdf.rotatePdfToPortrait( tempFile, onReorientComplete );

                        function onReorientComplete( err, reorientedFile ) {
                            if( err ) {
                                return reject( Error( `could not rotate pdf to portrait: ${err.stack || err}` ) );
                            }

                            resolve( reorientedFile );
                        }
                    } );
                }

                let [err, mediaObject] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'media',
                        query: {_id: mediaId},
                        options: {
                            limit: 1,
                            lean: true
                        }
                    } )
                );

                if( !err && !mediaObject[0] ) {
                    err = Y.doccirrus.errors.rest( 404, `Media not found: ${mediaId}`, true );
                }
                if( err ) {
                    throw err;
                }

                let tempFile = Y.doccirrus.media.getTempFileName( mediaObject[0] );

                [err] = await formatPromiseResult(
                    exportFile( mediaObject[0]._id, tempFile )
                );

                if( err ) {
                    throw err;
                }

                //  this step is only needed for PDFs, see MOJ-7590
                //  and only if sending to fax service
                if( 'APPLICATION_PDF' === mediaObject[0].mime && data.autorotate ) {
                    [err] = await formatPromiseResult(
                        rotatePdfToPortrait( tempFile )
                    );
                    if( err ) {
                        throw err;
                    }
                }

                let buffer;
                [err, buffer] = await formatPromiseResult(
                    readFile( tempFile )
                );

                if( err ) {
                    throw err;
                }
                mediaObject[0].buffer = buffer;

                Y.log( `Buffered media: ${mediaObject[0]._id}`, 'debug', NAME );
                return mediaObject[0];
            }

            function logActivityMail( content, amountOfAttachments, email, origin, who, callback ) {
                const attachmentString = (amountOfAttachments === 0 || amountOfAttachments > 1) ? i18n( 'TaskMojit.SerialEMailModal.attachmentString.2' ) : i18n( 'TaskMojit.SerialEMailModal.attachmentString.1' );
                const emailString = email.join( ', ' );
                let entry = Y.doccirrus.api.audit.getBasicEntry( who, 'post', 'serialEmail', i18n( 'TaskMojit.SerialEMailModal.auditLogEntry', {
                    data: {
                        emailString: emailString,
                        amountOfAttachments: amountOfAttachments,
                        attachmentString: attachmentString,
                        content: content,
                        origin: i18n( `TaskMojit.SerialEMailModal.origin.${origin}` )
                    }
                } ) );
                entry.skipcheck_ = true;
                return Y.doccirrus.api.audit.post( {
                    user: who,
                    data: entry,
                    callback: callback
                } );
            }

            switch( args.type ) {
                case "patient":
                    if( !data || !data.patientIds ) {
                        return handleResult( Y.doccirrus.errors.rest( 404, 'missing arguments', true ), undefined, args.callback );
                    }

                    for( let patientId of data.patientIds ) { //eslint-disable-line no-unused-vars
                        let [err, results] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'patient',
                                query: {_id: patientId},
                                options: {
                                    limit: 1,
                                    lean: true
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `Problem loading patient ${patientId} for email: ${err.stack || err}`, 'warn', NAME );
                            errors.push( {
                                patientId: patientId,
                                error: 'ERROR_SENDMAIL_LOAD_PATIENT',
                                originalError: err
                            } );
                            continue;
                        }
                        const patient = results[0];
                        if( !patient ) {
                            err = Y.doccirrus.errors.rest( 404, 'Patient not found: ' + patientId, true );
                            Y.log( `Problem could not find patient ${patientId} for email: ${err.stack || err}`, 'warn', NAME );
                            errors.push( {
                                patientId: patientId,
                                error: 'ERROR_SENDMAIL_PATIENT_NOT_FOUND',
                                originalError: err
                            } );

                            continue;
                        }
                        if( !patient.communications || !Array.isArray( patient.communications ) || !patient.communications.find( communication => communication.type.includes( 'EMAIL' ) ) ) {
                            Y.log( `Problem patient ${patientId}  has no email setup: ${err.stack || err}`, 'warn', NAME );

                            errors.push( {
                                patientId: patientId,
                                patientName: `${patient.lastname}, ${patient.firstname}`,
                                error: 'ERROR_PATIENT_HAS_NO_EMAIL_COMMUNICATION',
                                originalError: err
                            } );
                            continue;
                        }

                        patients.push( patient );
                    }
                    for( let i = 0; i < data.mediaIds.length; i++ ) {
                        let [err, media] = await formatPromiseResult(
                            getBufferByMedia( data.mediaIds[i] )
                        );

                        if( err ) {
                            Y.log( `Problem loading media to buffer: ${err.stack || err}`, 'warn', NAME );
                            continue;
                        }

                        mediaObjects.push( media );
                    }

                    for( let i = 0; i < mediaObjects.length; i++ ) {
                        let [err, activity] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'activity',
                                query: {_id: mediaObjects[i].ownerId},
                                options: {
                                    limit: 1,
                                    lean: true
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `Problem loading activity: ${err.stack || err}`, 'warn', NAME );
                            continue;
                        }

                        if( activity && Array.isArray( activity ) && activity.length > 0 ) {
                            activities.push( activity[0] );
                        }
                    }

                    if( data.currentLocationId ) {
                        let [err, location] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'location',
                                action: 'get',
                                query: {
                                    _id: data.currentLocationId
                                },
                                options: {
                                    select: {
                                        emailFooter: 1
                                    }
                                }
                            } )
                        );

                        if( location && location[0] && location[0].emailFooter && '' !== location[0].emailFooter ) {
                            data.template = {
                                emailFooter: location && location[0] && location[0].emailFooter
                            };
                        }

                        [err] = await formatPromiseResult(
                            listMedia()
                        );

                        if( err ) {
                            Y.log( `Coudn't get email settings from location. Err: ${err.stack || err}`, 'warn', NAME );
                        }
                    }

                    if( data && patients && patients.length > 0 ) {
                        const listOfOwnerIdsFromMediaObject = mediaObjects.map( obj => obj.ownerId ) || [];
                        let emailsToSend = [];

                        for( let i = 0; i < patients.length; i++ ) {
                            const activityForPatient = activities && Array.isArray( activities ) && activities.length > 0 && activities.find( obj => obj && listOfOwnerIdsFromMediaObject.includes( obj._id && obj._id.toString() ) && obj.patientId === patients[i] && patients[i]._id && patients[i]._id.toString() );
                            const mediaForPatient = activityForPatient ? mediaObjects.find( obj => (obj && obj.ownerId) === (activityForPatient && activityForPatient._id && activityForPatient._id.toString()) ) : mediaObjects[i];
                            let attachmentForPatient;

                            if( mediaForPatient ) {
                                attachmentForPatient = {
                                    filename: require( 'path' ).basename( mediaForPatient.name ),
                                    content: mediaForPatient.buffer
                                };
                                amountOfAttachments++;
                            }

                            const emailOfPatient = patients[i].communications && patients[i].communications.find( communication => communication.type.includes( 'EMAIL' ) );

                            const emailOptions = {
                                serviceName: 'conferenceService',
                                to: emailOfPatient && emailOfPatient.value,
                                user: user,
                                from: data.senderEmail,
                                replyTo: data.senderEmail,
                                subject: data.subject,
                                template: data.template,
                                jadeParams: {text: data.content.replace( /\n/g, "<br>" )},
                                jadePath: './mojits/InCaseMojit/views/mailActivities.pug',
                                attachments: data.attachments ? data.attachments.concat( attachmentForPatient ) : [attachmentForPatient]
                            };

                            emailAddresses.push( emailOfPatient && emailOfPatient.value );

                            const emailMessage = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );

                            emailsToSend.push(
                                sendEmailAsync( emailMessage, user ).then( () => {
                                    return {
                                        patientId: patients[i]._id.toString(),
                                        patientName: `${patients[i].lastname}, ${patients[i].firstname} ${emailOfPatient && emailOfPatient.value}`
                                    };
                                } ).catch( err => {
                                    Y.log( `could not send mail to patient ${patients[i]._id.toString()}: ${err.stack || err}`, 'warn', NAME );
                                    errors.push( {
                                        patientId: patients[i]._id.toString(),
                                        patientName: `${patients[i].lastname}, ${patients[i].firstname} ${emailOfPatient && emailOfPatient.value}`,
                                        error: 'ERROR_PATIENT_HAS_NO_EMAIL_COMMUNICATION',
                                        originalError: err
                                    } );
                                    return Promise.resolve();
                                } ) );
                        }
                        let [err, sentEmails] = await formatPromiseResult(
                            Promise.all( emailsToSend )
                        );

                        if( err ) {
                            Y.log( `could not send emails: ${err.stack || err}`, 'error', NAME );
                            return handleResult( err, undefined, args.callback );
                        } else if( sentEmails ) {
                            Y.log( `sent emails: ${sentEmails}`, 'debug', NAME );
                        }

                        logActivityMail( data.content, amountOfAttachments, emailAddresses, data.origin, user );

                        return handleResult( null, {sentEmails: sentEmails.filter( Boolean ), errors}, args.callback );
                    }
                    break;

                case "contact":
                    if( !data || !data.baseContactIds ) {
                        return handleResult( Y.doccirrus.errors.rest( 404, 'missing arguments', true ), undefined, args.callback );
                    }
                    for( let i = 0; i < data.baseContactIds.length; i++ ) {
                        const contactId = data.baseContactIds[i];
                        let [err, baseContact] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'basecontact',
                                query: {_id: data.baseContactIds[i]},
                                options: {
                                    limit: 1,
                                    lean: true
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `Problem loading contact ${contactId} for email: ${err.stack || err}`, 'warn', NAME );
                            errors.push( {
                                contactId: contactId,
                                error: 'ERROR_SENDMAIL_LOAD_CONTACT',
                                originalError: err
                            } );
                            continue;
                        }
                        if( !baseContact[0] ) {
                            err = Y.doccirrus.errors.rest( 404, 'Patient not found: ' + data.baseContactIds[i], true );
                            Y.log( `Problem could not find contact ${contactId} for email: ${err.stack || err}`, 'warn', NAME );
                            errors.push( {
                                contactId: contactId,
                                error: 'ERROR_SENDMAIL_CONTACT_NOT_FOUND',
                                originalError: err
                            } );
                            continue;
                        }
                        if( !baseContact[0].communications || !Array.isArray( baseContact[0].communications ) || !baseContact[0].communications.find( communication => communication.type.includes( 'EMAIL' ) ) ) {
                            Y.log( `Problem contact ${contactId}  has no email setup: ${err.stack || err}`, 'warn', NAME );
                            errors.push( {
                                contactId: contactId,
                                contactName: `${baseContact[0].name}`,
                                error: 'ERROR_CONTACT_HAS_NO_EMAIL_COMMUNICATION',
                                originalError: err
                            } );
                            continue;
                        }

                        baseContacts.push( baseContact[0] );
                    }
                    // for( let i = 0; i < data.mediaIds.length; i++ ) {
                    //     let [err, media] = await formatPromiseResult(
                    //         getBufferByMedia( data.mediaIds[i] )
                    //     );
                    //
                    //     if( err ) {
                    //         Y.log( `Problem loading media to buffer:  + ${JSON.stringify( err )}`, 'warn', NAME );
                    //         throw err;
                    //     }
                    //
                    //     mediaObjects.push( media );
                    // }
                    if( data.currentLocationId ) {
                        let [err, location] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'location',
                                action: 'get',
                                query: {
                                    _id: data.currentLocationId
                                },
                                options: {
                                    select: {
                                        emailFooter: 1
                                    }
                                }
                            } )
                        );

                        if( location && location[0] && location[0].emailFooter && '' !== location[0].emailFooter ) {
                            data.template = {
                                emailFooter: location && location[0] && location[0].emailFooter
                            };
                        }

                        [err] = await formatPromiseResult(
                            listMedia()
                        );

                        if( err ) {
                            Y.log( `Coudn't get email settings from location. Err: ${JSON.stringify( err )}`, 'warn', NAME );
                        }
                    }

                    if( data && baseContacts && baseContacts.length > 0 ) {
                        // const listOfOwnerIdsFromMediaObject = mediaObjects.map( obj => obj.ownerId ) || [];
                        let emailsToSend = [];

                        for( let i = 0; i < baseContacts.length; i++ ) {
                            // const mediaForPatient = activityForPatient && mediaObjects.find( obj => obj.ownerId === activityForPatient._id.toString() );
                            // let attachmentForPatient;
                            //
                            // if( mediaForPatient ) {
                            //     attachmentForPatient = {
                            //         filename: require( 'path' ).basename( mediaForPatient.name ),
                            //         content: mediaForPatient.buffer
                            //     };
                            //     amountOfAttachments++;
                            // }

                            const emailAddress = baseContacts[i].communications && baseContacts[i].communications.find( communication => communication.type.includes( 'EMAIL' ) );

                            const emailOptions = {
                                serviceName: 'conferenceService',
                                to: emailAddress && emailAddress.value,
                                user: user,
                                from: data.senderEmail,
                                replyTo: data.senderEmail,
                                subject: data.subject,
                                template: data.template,
                                jadeParams: {text: data.content.replace( /\n/g, "<br>" )},
                                jadePath: './mojits/InCaseMojit/views/mailActivities.pug'
                                // attachments: data.attachments ? data.attachments.concat( attachmentForPatient ) : [attachmentForPatient]
                            };

                            emailAddresses.push( emailAddress && emailAddress.value );

                            const emailMessage = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );

                            emailsToSend.push(
                                sendEmailAsync( emailMessage, user ).then( () => {
                                    return {
                                        contactId: baseContacts[i]._id.toString(),
                                        contactName: `${baseContacts[i].content} ${emailAddress && emailAddress.value}`
                                    };
                                } ).catch( err => {
                                    Y.log( `could not send mail to cotnact ${baseContacts[i]._id}: ${err.stack || err}`, 'warn', NAME );
                                    errors.push( {
                                        patientId: baseContacts[i]._id.toString(),
                                        contactName: `${baseContacts[i].content} ${emailAddress && emailAddress.value}`,
                                        error: 'ERROR_CONTACT_HAS_NO_EMAIL_COMMUNICATION',
                                        originalError: err
                                    } );
                                    return Promise.resolve();
                                } ) );
                        }
                        let [err, sentEmails] = await formatPromiseResult(
                            Promise.all( emailsToSend )
                        );

                        if( err ) {
                            Y.log( `could not send emails: ${err}`, 'error', NAME );
                            return handleResult( err, undefined, args.callback );
                        } else if( sentEmails ) {
                            Y.log( `sent emails: ${sentEmails}`, 'debug', NAME );
                        }

                        logActivityMail( data.content, amountOfAttachments, emailAddresses, data.origin, user );

                        return handleResult( null, {sentEmails: sentEmails.filter( Boolean ), errors}, args.callback );
                    }
                    break;
            }
            return handleResult( null, null, args.callback );
        }

        /**
         *  Send email to each patient from patientId
         *
         *  @param  args                            {Object}
         *  @param  args.data                       {Object}
         *  @param  args.data.patientIds            {Array}    Plain array of patient _id strings
         *  @param  [args.data.currentLocationId]   {Array}    Location ID
         *  @param  args.data.mediaIds              {Array}    Plain array of media _id strings
         *  @param  args.data.autorotate            {Boolean}   Make PDF attachments portrait (set true when emailing to fax service)
         *  @param  args.user                       {Object}    REST user or equivalent
         *  @param  args.callback                   {Function}
         */

        async function sendEmailsFromPatientId( args ) {
            const callback = args.callback;
            delete args.callback;
            let [err, result] = await formatPromiseResult( sendEmailsFromId( {...args, type: 'patient'} ) );
            if( err ) {
                Y.log( `could not send emails from patient id: ${err.stack || err}`, 'error', NAME );
            }
            return handleResult( err, result, callback );
        }

        /**
         *  Send email to each contact from contactId
         *
         *  @param  args                            {Object}
         *  @param  args.data                       {Object}
         *  @param  args.data.patientIds            {Array}    Plain array of patient _id strings
         *  @param  [args.data.currentLocationId]   {Array}    Location ID
         *  @param  args.data.mediaIds              {Array}    Plain array of media _id strings
         *  @param  args.data.autorotate            {Boolean}   Make PDF attachments portrait (set true when emailing to fax service)
         *  @param  args.user                       {Object}    REST user or equivalent
         *  @param  args.callback                   {Function}
         */

        async function sendEmailsFromContactId( args ) {
            let [err, result] = await formatPromiseResult( sendEmailsFromId( {...args, type: 'contact'} ) );
            if( err ) {
                Y.log( `could not send emails from contact id: ${err.stack || err}`, 'error', NAME );
            }
            return handleResult( err, result, args.callback );

        }

        function saveKbvUtilityDiagnosis( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.saveKbvUtilityDiagnosis', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.saveKbvUtilityDiagnosis' );
            }
            const
                {user, callback, data} = args,
                result = {},
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            function lookUpCatalog( code ) {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.catalog.lookup( {
                        originalParams: {
                            catalogShort: 'ICD-10',
                            actType: 'DIAGNOSIS',
                            seq: code
                        },
                        callback: ( err, entry ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( entry );
                        }
                    } );
                } );
            }

            function makeDiagnosis( baseData ) {
                return lookUpCatalog( baseData.code )
                    .then( entry => {
                        if( !entry ) {
                            throw Error( 'ICD-10 code not found original catalog' );
                        }
                        return Object.assign( baseData, {
                            status: 'VALID',
                            catalogShort: 'ICD-10',
                            catalog: true,
                            catalogRef: entry.catalog,
                            comment: Array.isArray( entry.infos ) ? entry.infos.join( ', ' ) : (entry.infos || undefined),
                            u_extra: entry.u_extra,
                            skipcheck_: true
                        } );
                    } );
            }

            Promise.map( data, makeDiagnosis ).each( diagnosis => {
                return runDb( {
                    user: user,
                    action: 'post',
                    model: 'activity',
                    data: diagnosis
                } ).then( ids => {
                    if( diagnosis.isSecond ) {
                        result.utSecondIcdRef = ids[0] || null;
                    } else {
                        result.utIcdRef = ids[0] || null;
                    }
                } );
            } ).then( () => {
                callback( null, result );
            } ).catch( err => {
                callback( err );
            } );
        }

        function getKbvUtilityAgreement( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getKbvUtilityAgreement', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getKbvUtilityAgreement' );
            }
            const
                {user, originalParams, callback} = args,
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            Promise.resolve().then( () => {

                if( !originalParams.patientId || !originalParams.timestamp || !originalParams.utIndicationCode || !originalParams.utIcdCode ) {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} );
                }
                let query = {
                    status: {$ne: 'CANCELLED'},
                    patientId: originalParams.patientId,
                    actType: 'KBVUTILITY',
                    utAgreementApprovedTill: {
                        $gte: originalParams.timestamp
                    },
                    utAgreement: {$in: ['LHM', 'BVB']},
                    utIcdCode: originalParams.utIcdCode,
                    $or: [
                        {
                            utAgreementApprovedCode: {
                                $regex: '^' + originalParams.utIndicationCode,
                                $options: 'i'
                            }
                        },
                        {
                            utAgreementApprovedCode: {
                                $regex: '^' + originalParams.utIndicationCode.replace( /[a-z]/, '' ),
                                $options: 'i'
                            }
                        }
                    ]
                };

                return runDb( {
                    user: user,
                    model: 'activity',
                    query: query,
                    options: {
                        limit: 1,
                        select: {
                            utAgreement: 1,
                            utAgreementApprovedTill: 1,
                            utAgreementApprovedCode: 1,
                            utAgreementApprovedForInsurance: 1,
                            utAgreementApprovedText: 1,
                            utAgreementApprovedCodeUseDiagnosisGroup: 1
                        },
                        sort: {
                            timestamp: -1
                        }
                    }
                } );
            } ).get( 0 ).then( agreementData => {
                return agreementData || null;
            } ).then( result => {
                return callback( null, result );
            } ).catch( err => {
                return callback( err );
            } );
        }

        /**
         *  Test/manual migration to reset receipt totals on invoices according to state, MOJ-7642
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        function checkReceiptTotalsOnInvoices( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.checkReceiptTotalsOnInvoices', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.checkReceiptTotalsOnInvoices' );
            }
            Y.doccirrus.inCaseUtils.migrationhelper.checkReceiptTotalsOnInvoices( args.user, false, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( 'Could not complete migration to reset invoice receipt totals: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                Y.log( 'Completed migration to reset invoice receipt totals.', 'info', NAME );
            }

            //  process is slow, call back immediately
            args.callback( null, {'status': 'Started migration to check receipt totals on invoices.'} );
        }

        /**
         * Resets activity status to "VALID".
         * Can be used only by Support
         * @method resetActivityStatus
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array<String>} args.data.activityIds - array of activity ids to reseet status to VALID
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function resetActivityStatus( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.resetActivityStatus', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.resetActivityStatus' );
            }
            let
                {user, data: { activityIds }, callback} = args;

            if( !Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.employee.userGroups.SUPPORT ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 403 ) );
            }
            if( !activityIds || !activityIds.length ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400 ) );
            }

            let [err, activities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {_id: {$in: activityIds}},
                    action: 'get',
                    options: {
                        select: {
                            status: 1,
                            actType: 1,
                            code: 1,
                            patientName: 1,
                            content: 1
                        }
                    }
                } )
            );
            if( err ){
                Y.log( `resetActivityStatus: error getting activity data for ${activityIds} : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {_id: {$in: activityIds}},
                    action: 'update',
                    data: {
                        status: 'VALID'
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ){
                Y.log( `resetActivityStatus: error updating activity status for ${activityIds} : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            for (let activity of (activities || [])){
                Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activity._id );

                let description = i18n( 'activity-api.text.STATUS_WAS_RESET', {data: {actType: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activity.actType, 'i18n', '' )}} );
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.invoiceserverutils.auditChangeValues( user, activity._id, { status: activity.status }, { status: 'VALID' }, description, activity )
                );
                if( err ){
                    Y.log( `resetActivityStatus: error creating audit entry for ${activityIds} : ${err.stack || err}`, 'warn', NAME );
                }
            }

            callback( null );
        }

        /**
         * @method getMedicationData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.locationId
         * @param {String} args.data.commercialNo
         * @param {String} args.data.employeeId
         * @param {String} args.data.officialNo
         * @param {String} args.data.patientId
         * @param {String} args.data.patientAge
         * @param {String} args.data.iknr
         * @param {String} args.data.caseFolderId
         * @param {String} args.data.pzn
         * @param {Function} args.callback
         */
        function getMedicationData( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getMedicationData', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getMedicationData' );
            }
            const
                {user, data: {patientAge, iknr, officialNo, commercialNo, locationId, employeeId, patientId, pzn, caseFolderId} = {}, callback} = args;

            function getPatientDetails( data, callback ) {
                async.parallel( {
                    patient( done ) {
                        Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'patient',
                                action: 'get',
                                query: {
                                    _id: data.patientId
                                },
                                options: {
                                    lean: true
                                }
                            },
                            function( err, results ) {
                                if( err ) {
                                    return done( err );
                                }
                                if( !results || !results[0] ) {
                                    return done( new Y.doccirrus.commonerrors.DCError( 400, {message: `patient not found: ${data.patientId}`} ) );
                                }
                                done( err, results[0] );
                            } );
                    },
                    caseFolder( done ) {
                        Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'casefolder',
                                action: 'get',
                                query: {
                                    _id: data.caseFolderId
                                },
                                options: {
                                    lean: true
                                }
                            },
                            function( err, results ) {
                                if( err ) {
                                    return done( err );
                                }
                                if( !results || !results[0] ) {
                                    return done( new Y.doccirrus.commonerrors.DCError( 400, {message: `caseFolder not found: ${data.caseFolderId}`} ) );
                                }
                                done( err, results[0] );
                            } );
                    }
                }, callback );

            }

            async.parallel( [
                function( done ) {
                    if( commercialNo ) {
                        return done( null, commercialNo );
                    }
                    if( !locationId ) {
                        return done( Y.doccirrus.errors.rest( 400, 'location id is missing', true ) );
                    }
                    /**
                     * get bsnr
                     */
                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            action: 'get',
                            query: {
                                _id: locationId
                            }
                        },
                        function( err, results ) {
                            if( err ) {
                                return done( err );
                            }
                            done( err, results[0] && results[0].commercialNo );
                        } );
                },
                function( done ) {
                    if( officialNo ) {
                        return done( null, officialNo );
                    }
                    if( !employeeId ) {
                        return done( Y.doccirrus.errors.rest( 400, 'employee id is missing', true ) );
                    }
                    /**
                     * get lanr
                     */
                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            action: 'get',
                            query: {
                                _id: employeeId
                            }
                        },
                        function( err, results ) {
                            if( err ) {
                                return done( err );
                            }
                            done( err, results[0] && results[0].officialNo );
                        } );
                },
                function( done ) {
                    if( patientAge && iknr ) {
                        return done( null, {
                            patientAge,
                            iknr
                        } );
                    }
                    if( !patientId ) {
                        return done( Y.doccirrus.errors.rest( 400, 'patient id is missing', true ) );
                    }
                    if( !caseFolderId ) {
                        return done( Y.doccirrus.errors.rest( 400, 'case folder id is missing', true ) );
                    }
                    /**
                     * get patient age and iknr
                     */
                    getPatientDetails( {
                        patientId,
                        caseFolderId
                    }, function( err, data ) {
                        var age, iknr, _patient, caseFolder, deathmom;
                        if( err ) {
                            return done( err );
                        }
                        _patient = data.patient || {};
                        caseFolder = data.caseFolder || {};
                        deathmom = _patient.dateOfDeath;
                        age = deathmom ? (_patient.kbvDob ? moment( deathmom ).diff( moment( _patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '') :
                            (_patient.kbvDob ? moment().diff( moment( _patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '');
                        // MOJ-14319: [OK] [CASEFOLDER]
                        iknr = Y.doccirrus.schemas.patient.getInsurancesByType( _patient, caseFolder.type )[0];
                        done( err, {
                            patientAge: age,
                            iknr: iknr && iknr.insuranceId
                        } );
                    } );
                }
            ], function( err, results ) {
                let
                    patientAge, bsnr, iknr, lanr;
                if( err ) {
                    return callback( err );
                }
                bsnr = results[0];
                lanr = results[1];
                patientAge = results[2] && results[2].patientAge;
                iknr = results[2] && results[2].iknr;
                Y.doccirrus.api.catalogusage.getMMIActualData( {
                    query: {
                        pzn: pzn,
                        patientAge: patientAge,
                        bsnr: bsnr || '',
                        lanr: lanr || '',
                        insuranceIknr: iknr
                    },
                    callback( err, result ) {
                        if( err ) {
                            return callback( err );
                        }
                        callback( null, {
                            medicationData: result,
                            additionalData: {
                                patientAge,
                                iknr,
                                officialNo: lanr,
                                commercialNo: bsnr
                            }
                        } );
                    }
                } );
            } );
        }

        async function createKbvMedicationPlanForMedications( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createKbvMedicationPlanForMedications', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createKbvMedicationPlanForMedications' );
            }

            if( args.data.showDialog === undefined ) {
                args.data.preventPrinting = true;
            }

            const
                {
                    user,
                    data: {
                        kbvMedicationPlan,
                        createdMedications,
                        locationId,
                        employeeId,
                        timestamp,
                        caseFolderId,
                        patientId,
                        taskData,
                        printerName,
                        showDialog = true,
                        preventPrinting = false,
                        printActivities,
                        quickPrintPrescription = false
                    } = {}, medicationPlanOnly, callback
                } = args,
                startDate = moment( timestamp ),
                notPrintedActivities = [],
                loadActivitySettingsP = promisifyArgsCallback( Y.doccirrus.api.activitysettings.loadActivitySettings ),
                doTransitionP = promisifyArgsCallback( Y.doccirrus.api.activity.doTransition ),
                getMedicationRefOfCreatedMedications = ( medicationPlanEntry ) => {
                    if( !createdMedications || !createdMedications.length ) {
                        return;
                    }
                    const matchingCreatedMedication = createdMedications.find( createdMedication => (createdMedication.phNLabel || createdMedication.userContent) === (medicationPlanEntry.phNLabel || medicationPlanEntry.userContent) );
                    return matchingCreatedMedication && medicationPlanEntry._id && medicationPlanEntry._id.toString();
                };

            function createTask( medicationPlan ) {
                taskData.activities = [
                    {
                        actType: medicationPlan.actType,
                        _id: medicationPlan._id.toString()
                    }];
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( taskData )
                } );
            }

            const now = moment();
            startDate.hours( now.hours() ).minutes( now.minutes() ).subtract( 3, 's' );

            kbvMedicationPlan.medicationPlanEntries.forEach( medicationPlanEntry => {
                medicationPlanEntry.actType = 'MEDICATION';
                medicationPlanEntry.status = 'CREATED';
                medicationPlanEntry.locationId = locationId;
                medicationPlanEntry.employeeId = employeeId;
                medicationPlanEntry.caseFolderId = caseFolderId;
                medicationPlanEntry.patientId = patientId;
                medicationPlanEntry.timestamp = startDate.toISOString();
                medicationPlanEntry.medicationRef = getMedicationRefOfCreatedMedications( medicationPlanEntry );
                startDate.add( '2', 'ms' );
                if( !medicationPlanEntry.phSalesStatus ) {
                    medicationPlanEntry.phSalesStatus = 'UNKNOWN';
                }

                if( !medicationPlanEntry.phNormSize ) {
                    medicationPlanEntry.phNormSize = 'UNKNOWN';
                }
            } );

            if( createdMedications ) {
                kbvMedicationPlan.activities = createdMedications.map( createdMedication => createdMedication._id.toString() );
            }

            kbvMedicationPlan.status = 'VALID';
            kbvMedicationPlan.timestamp = startDate;
            kbvMedicationPlan.caseFolderId = caseFolderId;
            kbvMedicationPlan.patientGender = kbvMedicationPlan.patientGender || '';

            Y.log( `createKbvMedicationPlanForMedications: post KBVMEDICATIONPLAN and wait for pdf? ${showDialog}`, 'info', NAME );
            let [err, results] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                let medicationPlanError, medicationPlanResult;
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( kbvMedicationPlan ),
                    options: {
                        entireRec: true
                    },
                    context: {
                        noMedicationCheck: medicationPlanOnly,
                        onPdfCreated: ( err, media ) => {
                            if( medicationPlanError ) {
                                return;
                            }
                            if( showDialog && err ) {
                                Y.log( `createKbvMedicationPlanForMedications: reject POST onPdfCreated: ${err.stack || err}`, 'warn', NAME );
                                reject( err );
                            } else if( showDialog ) {
                                medicationPlanResult[0].attachedMedia = medicationPlanResult[0].attachedMedia || [];
                                if( media ) {
                                    medicationPlanResult[0].attachedMedia.push( {mediaId: media._id} );
                                }
                                resolve( medicationPlanResult );
                            }
                        }
                    },
                    callback: ( err, result ) => {
                        medicationPlanResult = result;
                        medicationPlanError = err;
                        if( err ) {
                            Y.log( `createKbvMedicationPlanForMedications: reject POST on callbackL ${err.stack || err}`, 'warn', NAME );
                            reject( err );
                        } else if( showDialog ) {
                            return;
                        } else {
                            resolve( medicationPlanResult );
                        }
                    }
                } );
            } ) );

            if( err ) {
                Y.log( `createKbvMedicationPlanForMedications: could not post kbv medication plan: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let newKbvMedicationPlan = results[0];

            if( taskData ) {
                [err] = await formatPromiseResult( createTask( newKbvMedicationPlan ) );
                if( err ) {
                    Y.log( `createKbvMedicationPlanForMedications: could not create task for medicationPlan ${newKbvMedicationPlan._id}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            if( !preventPrinting ) {
                notPrintedActivities.push( newKbvMedicationPlan );

                if( quickPrintPrescription ) {
                    // we have to approve this activity
                    let [err, createdMedPlan] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'get',
                                query: {_id: newKbvMedicationPlan._id}
                            }
                        ) );

                    if( err ) {
                        Y.log( `createKbvMedicationPlanForMedications: could not get kbv medication plan: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }
                    if( createdMedPlan && createdMedPlan[0] ) {
                        [err] = await formatPromiseResult( doTransitionP( {
                            data: {
                                activity: createdMedPlan[0],
                                transition: 'approve',
                                _isTest: 'false'
                            },
                            user,
                            options: {
                                activityContext: {
                                    activity: createdMedPlan[0],
                                    forceScheinCheck: true,
                                    _skipTriggerRules: true,
                                    _skipTriggerSecondary: true
                                }
                            }
                        } ) );
                        if( err ) {
                            Y.log( `createKbvMedicationPlanForMedications: could not approve medPlan: ${err.stack || err}`, 'warn', NAME );
                            // here we have to check activitysetting for medicationPlan to find out if we can
                            // continue with print without successful approving
                            let [errActSettings, activitySettings] = await formatPromiseResult(
                                loadActivitySettingsP( {user} )
                            );
                            if( errActSettings ) {
                                Y.log( `createKbvMedicationPlanForMedications: could not get activity settings: ${err.stack || err}`, 'warn', NAME );
                                // here we will stop the process
                                return handleResult( errActSettings, undefined, callback );
                            }

                            if( activitySettings && activitySettings.settings ) {
                                let currentActivitySettings = (activitySettings.settings || []).find( settings => settings.actType === createdMedPlan[0].actType );

                                if( currentActivitySettings && currentActivitySettings.quickPrintInvoice ) {
                                    // stop here since we cannot print non-approved activity
                                    return handleResult( new Y.doccirrus.commonerrors.DCError( 50003 ), undefined, callback );
                                }
                            }
                        }
                    }
                }

                if( showDialog ) {
                    Y.log( `createKbvMedicationPlanForMedications: print KBVMEDICATIONPLAN ${newKbvMedicationPlan._id}`, 'info', NAME );
                    Y.doccirrus.api.prescription.prepareDataForPrint( {
                        user,
                        data: {
                            notPrintedActivities,
                            printedActivities: notPrintedActivities.length ? [] : [
                                {
                                    actType: newKbvMedicationPlan.actType,
                                    printerName: printerName
                                }
                            ]
                        },
                        printActivities: printActivities
                    } );
                }

                Object.assign( results, {
                    notPrintedActivities, printActivities, kbvMedicationPlan: {
                        _id: newKbvMedicationPlan._id, actType: newKbvMedicationPlan.actType
                    }
                } );
            }

            return handleResult( err, results, callback );
        }

        async function createMedicationPlanForMedications( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createMedicationPlanForMedications', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createMedicationPlanForMedications' );
            }

            const
                {user, data: {medications, locationId, employeeId, timestamp, caseFolderId, caseFolderType, patientId, print, taskData, printerName, showDialog, printActivities, swissMedPlanTemplate, quickPrintPrescription} = {}, medicationPlanOnly, waitForPdf, callback, _callback} = args,
                medicationPlan = {
                    status: 'CREATED',
                    employeeId,
                    locationId,
                    caseFolderId,
                    patientId,
                    actType: 'MEDICATIONPLAN'
                },
                startDate = moment( timestamp ),
                notPrintedActivities = [],
                waitCallback = args.waitCallback || (args.originalParams && args.originalParams.waitCallback),
                includeMedicationsActivities = args.includeMedicationsActivities || (args.originalParams && args.originalParams.includeMedicationsActivities),
                doTransitionP = promisifyArgsCallback( Y.doccirrus.api.activity.doTransition ),
                loadActivitySettingsP = promisifyArgsCallback( Y.doccirrus.api.activitysettings.loadActivitySettings ),
                medicationList = [];
            let
                needPrint = print;

            if( !medicationPlanOnly ) {
                const now = moment();
                startDate.hours( now.hours() ).minutes( now.minutes() ).subtract( 3, 's' );
                medications.forEach( medication => {
                    const
                        count = Number( medication.count );
                    if( count ) {
                        for( let i = 1; i <= count; i++ ) {
                            medicationList.push( Object.assign( {}, medication ) );
                        }
                    } else {
                        medicationList.push( medication );
                    }
                } );
                medicationList.concat().reverse().forEach( medication => {
                    medication.actType = 'MEDICATION';
                    medication.status = 'CREATED';
                    medication.locationId = locationId;
                    medication.employeeId = employeeId;
                    medication.caseFolderId = caseFolderId;
                    medication.patientId = patientId;
                    medication.timestamp = startDate.toISOString();
                    startDate.add( '2', 'ms' );
                } );
            } else {
                medicationPlan.activities = medications.map( item => item._id );
            }
            medicationPlan.timestamp = startDate.toISOString();

            function printMedicationPlan( params, callback ) {
                Y.doccirrus.api.media.print( {
                    user,
                    originalParams: {
                        mediaId: params.media._id,
                        printerName: printerName
                    },
                    callback( err ) {
                        callback( err, printerName );
                    }
                } );
            }

            function createTask( medicationPlan, callback ) {
                taskData.activities = [
                    {
                        actType: medicationPlan.actType,
                        _id: medicationPlan._id.toString()
                    }];
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( taskData )
                }, err => callback( err ) );

            }

            async.waterfall( [
                function( next ) {
                    let
                        _result;
                    Y.doccirrus.api.activity.saveMedicationPlan( {
                        user,
                        data: {
                            medicationPlan,
                            medications: medicationList,
                            caseFolderType: caseFolderType
                        },
                        onPdfCreated( err, _data ) {
                            if( needPrint || waitForPdf ) {
                                if( err ) {
                                    needPrint = false;
                                    return next( err, {medicationPlan: _result} );
                                }

                                let medicationPlanWithMedia = Object.assign( {medicationPlan: _result}, _data );

                                //  awkward, matches previous API call, activity.media property is printed
                                //  separating this step would be preferable if refactoring this EXTMOJ-1758
                                if( waitForPdf && _data.media ) {
                                    _result.media = _data.media;
                                }

                                return next( null, medicationPlanWithMedia );
                            }
                        },
                        medicationPlanOnly,
                        waitCallback: true,
                        callback( err, results, validationError ) {
                            if( err ) {
                                return next( err );
                            }
                            if( validationError ) {
                                needPrint = false;
                                return next( null, {medicationPlan: _result} );
                            }
                            _result = results[0] && results[0].data;
                            if( !needPrint && !waitForPdf ) {
                                return next( err, {medicationPlan: _result} );
                            }

                        }
                    } );
                },
                function( data, next ) {
                    if( needPrint ) {
                        printMedicationPlan( data, ( err, printerName ) => {
                            data.printerName = printerName;
                            if( err ) {
                                Y.log( `Could not print medication plan to printer ${printerName}: ${JSON.stringify( err )}`, 'error', NAME );
                                notPrintedActivities.push( data.medicationPlan );
                            }
                            next( null, data );
                        } );
                    } else {
                        notPrintedActivities.push( data.medicationPlan );
                        return setImmediate( next, null, data );
                    }
                },
                function( data, next ) {
                    if( !print && taskData ) {
                        return createTask( data.medicationPlan, err => next( err, data ) );
                    } else {
                        return setImmediate( next, null, data );
                    }
                },
                async function( data, next ) {
                    if( includeMedicationsActivities ) {
                        if( data.medicationPlan && data.medicationPlan.activities && data.medicationPlan.activities.length ) {
                            let [err, medicationActivities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: {_id: {$in: data.medicationPlan.activities}}
                            } ) );

                            if( err ) {
                                next( err, data );
                            } else {
                                next( null, {...data, medicationActivities} );
                            }
                        }
                    } else {
                        next( null, data );
                    }
                }
            ], async ( err, result = {} ) => {
                const
                    _medicationPlan = result.medicationPlan || {},
                    response = {
                        notPrintedActivities,
                        printedActivities: notPrintedActivities.length ? [] : [
                            {
                                actType: _medicationPlan.actType,
                                printerName: result.printerName
                            }
                        ],
                        medicationPlan: {
                            _id: _medicationPlan._id,
                            actType: _medicationPlan.actType
                        },
                        medicationActivities: result.medicationActivities
                    };

                let pdfMedia;

                if( swissMedPlanTemplate ) {
                    try {

                        //  note the mediaId of the Documedis Medikationsplan PDF so it can be printed
                        [err, pdfMedia] = await formatPromiseResult(
                            getAndAttachPDFsToDocumedisMedplan( {
                                user,
                                data: {
                                    locationId,
                                    medPlanTemplate: swissMedPlanTemplate,
                                    medications: medications,
                                    medicationPlanId: response.medicationPlan._id
                                }
                            } )
                        );

                        //  record the mediaId on the activity so that it can be printed MOJ-12294
                        _medicationPlan.attachedMedia = _medicationPlan.attachedMedia || [];
                        if( pdfMedia && pdfMedia._id ) {
                            _medicationPlan.attachedMedia.push( {mediaId: pdfMedia._id} );
                        }

                    } catch( err ) {
                        Y.log( `createMedicationPlanForMedications: failed to get attached PDF ${err.stack || err}`, 'error', NAME );
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'message',
                            msg: {
                                data: err
                            },
                            meta: {
                                level: 'ERROR'
                            }
                        } );

                    }
                }
                if( waitCallback && !quickPrintPrescription ) {
                    return callback( err, response );
                }

                if( quickPrintPrescription ) {
                    // we have to approve this activity
                    let [err, createdMedPlan] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'get',
                                query: {_id: _medicationPlan._id}
                            }
                        ) );

                    if( err ) {
                        Y.log( `createMedicationPlanForMedications: could not get medication plan: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }
                    if( createdMedPlan && createdMedPlan[0] ) {
                        [err] = await formatPromiseResult( doTransitionP( {
                            data: {
                                activity: createdMedPlan[0],
                                transition: 'approve',
                                _isTest: 'false'
                            },
                            user,
                            options: {
                                activityContext: {
                                    activity: createdMedPlan[0],
                                    forceScheinCheck: true,
                                    _skipTriggerRules: true,
                                    _skipTriggerSecondary: true
                                }
                            }
                        } ) );
                        if( err ) {
                            Y.log( `createMedicationPlanForMedications: could not approve medPlan: ${err.stack || err}`, 'warn', NAME );

                            // here we have to check activitysetting for medicationPlan to find out if we can
                            // continue with print without successful approving
                            let [errActSettings, activitySettings] = await formatPromiseResult(
                                loadActivitySettingsP( {user} )
                            );
                            if( errActSettings ) {
                                Y.log( `createMedicationPlanForMedications: could not get activity settings: ${err.stack || err}`, 'warn', NAME );
                                // here we will stop the process
                                return handleResult( errActSettings, undefined, callback );
                            }

                            if( activitySettings && activitySettings.settings ) {
                                let currentActivitySettings = (activitySettings.settings || []).find( settings => settings.actType === createdMedPlan[0].actType );
                                if( currentActivitySettings && currentActivitySettings.quickPrintInvoice ) {
                                    // stop here since we cannot print non-approved activity
                                    return handleResult( new Y.doccirrus.commonerrors.DCError( 50003 ), undefined, callback );
                                }
                            }
                        }
                    }
                }

                if( showDialog ) {
                    Y.doccirrus.api.prescription.prepareDataForPrint( {
                        user,
                        data: response,
                        printActivities: printActivities
                    } );
                }

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: _medicationPlan.caseFolderId
                    }
                } );
                if( waitCallback ) {
                    return callback( err, response );
                }
                if( print ) {
                    const
                        printMessage = `${Y.doccirrus.i18n( 'general.text.PRINT_TEXT', {data: {count: 1}} )} \n${Y.doccirrus.i18n( 'general.text.PRINTED_ON', {
                            data: {
                                actType: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', _medicationPlan.actType, 'i18n', '' ),
                                printerName: result.printerName
                            }
                        } )}`;
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: printMessage
                        },
                        meta: {
                            removeTimeout: 10000,
                            level: 'SUCCESS'
                        }
                    } );
                }
                if( err ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: i18n( 'activity-api.text.CAN_NOT_CREATE_VALID_MEDICATION' )
                        },
                        meta: {
                            level: 'ERROR'
                        }
                    } );
                }
                if( 'function' === typeof _callback ) {
                    _callback( err, response );
                }

            } );

            if( !waitCallback && !waitForPdf ) {
                return callback();
            }

        }

        /**
         * Create medplan from imported documedis CHMED
         * Documedis docs: https://confluence.intra.doc-cirrus.com/display/SD/HCI+integration
         * @param {Object} args
         * @param {String} args.data.employeeId
         * @param {String} args.data.locationId
         * @param {String} args.data.patientId
         * @param {String} args.data.caseFolderId
         * @param {Object}  args.data.timestamp
         * @param {String}  args.data.print
         * @param {String}  args.data.printerName
         * @param {Number}  args.data.numCopies
         * @param {Object}  args.data.taskData
         * @param {Boolean}  args.data.showDialog
         * @param {Object}  args.data.printActivities
         * @param {Object} args.data.medPlanTemplate - documedis medplan template, using for getting PDF
         * @returns {Promise<Object|*>}
         */
        async function createMedicationPlanFromDocumedis( args ) {
            const
                _createMedicationPlanForMedications = promisifyArgsCallback( createMedicationPlanForMedications );
            let
                {user, data = {}, callback} = args,
                activityMedicament,
                err,
                medicationPlanResult,
                {locationId, caseFolderId, medPlanTemplate, caseFolderType, medData, createOnlyMedData} = args.data;
            data.medications = [];

            if( !createOnlyMedData ) {
                if( !data.catalogMedications || !data.catalogMedications.length ) {
                    //Should never happend
                    Y.log( 'createMedicationPlanFromDocumedis: No medications  data received', 'warn', NAME );
                    return handleResult( Y.doccirrus.errors.rest( 400, 'No medications  data received', true ), null, callback );
                }
                // eslint-disable-next-line no-unused-vars
                for( let medicament of data.catalogMedications ) {
                    [err, activityMedicament] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            Y.doccirrus.schemas.activity._setActivityData( {
                                    initData: {
                                        actType: 'MEDICATION',
                                        catalogShort: 'HCI',
                                        locationId: data.locationId
                                    },
                                    entry: medicament,
                                    user: null
                                }, ( err, res ) => {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        resolve( res );
                                    }
                                }
                            );
                        } ) );

                    if( err ) {
                        Y.log( `createMedicationPlanFromDocumedis: Failed to get activity data ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    data.medications.push( activityMedicament );
                }

                delete data.catalogMedications;

                [err, medicationPlanResult] = await formatPromiseResult( _createMedicationPlanForMedications( {
                    user: user,
                    data: {
                        ...data,
                        caseFolderType
                    },
                    waitCallback: true
                } ) );

                if( err ) {
                    Y.log( `createMedicationPlanFromDocumedis: Failed to create medication plan ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                if( !medicationPlanResult.medicationPlan ) {
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Failed to create PDF, no medplan.'}, null, callback ) );
                }

                try {
                    await getAndAttachPDFsToDocumedisMedplan( {
                        user,
                        data: {
                            locationId,
                            medPlanTemplate,
                            medications: data.medications,
                            medicationPlanId: medicationPlanResult.medicationPlan._id
                        }
                    } );
                } catch( err ) {
                    Y.log( `createMedicationPlanFromDocumedis: failed to get attached PDF ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
            }

            if( medData && medData.length ) {
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'activity',
                        data: {
                            actType: 'MEDDATA',
                            timestamp: new Date(),
                            caseFolderId: caseFolderId,
                            patientId: data.patientId,
                            employeeId: data.employeeId,
                            locationId: locationId,
                            medData: medData,
                            status: 'VALID',
                            skipcheck_: true
                        }
                    } ) );
            }

            if( err ) {
                Y.log( `createMedicationPlanFromDocumedis: failed to create medData ${err.stack || err}`, 'error', NAME );
            }

            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: caseFolderId
                }
            } );

            return handleResult( err, medicationPlanResult, callback );
        }

        /**
         * Get PDF with medication plan activities from documedis and attach to medicationplan activity
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.data.medicationPlanId
         * @param {String} args.data.locationId
         * @param {Object} args.data.medPlanTemplate
         * @param {Array} args.data.medications - list of medications from medicaionPlan
         * @returns {Promise.<*>}
         */
        async function getAndAttachPDFsToDocumedisMedplan( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getAndAttachPDFsToDocumedisMedplan', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getAndAttachPDFsToDocumedisMedplan' );
            }
            const {user, callback, data = {}} = args,
                importMediaFromFile = util.promisify( Y.doccirrus.media.importMediaFromFile ),
                {medicationPlanId, locationId, medPlanTemplate, medications} = data;

            let pdfMedia = null;

            async function getPdfDoc( tempFile, fileName, title = "" ) {
                [err, pdfMedia] = await formatPromiseResult( importMediaFromFile(
                    user,
                    tempFile,
                    'activity',
                    medicationPlanId,
                    fileName,
                    'pdf',
                    'OTHER'
                ) );

                if( err ) {
                    Y.log( `getAndAttachPDFsToDocumedisMedplan: Error in creating pdf media for medicationPlan ${medicationPlanId}.\n${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }

                let docObj = {
                    'type': 'MEDICATIONPLAN',
                    'url': '/media/' + Y.doccirrus.media.getCacheFileName( pdfMedia, false ),
                    'publisher': 'From Documedis',
                    'contentType': 'application/pdf',
                    'attachedTo': medicationPlanId,           //  deprecated, see MOJ-9190
                    'activityId': medicationPlanId,
                    'patientId': null,
                    'locationId': locationId,
                    'caption': title,
                    'createdOn': moment().toISOString(),
                    'mediaId': pdfMedia._id,
                    'accessBy': [],
                    title
                };

                let pdfDoc;

                [err, pdfDoc] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'document',
                    data: Y.doccirrus.filters.cleanDbObject( docObj )
                } ) );

                if( err ) {
                    Y.log( `getAndAttachPDFsToDocumedisMedplan: Problem creating pdf attachments for ${medicationPlanId}: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                return pdfDoc[0];
            }

            let medplanChmed, err;
            try {
                medplanChmed = await convertMedicationsToMedplanChmed( {
                    user, data: {
                        medplan: medPlanTemplate,
                        activities: medications
                    }
                } );

                let cdsPDFDoc, {tempFile, fileName} = await getDocumedisPDF( {
                        user,
                        data: {chmed: medplanChmed.chmed, locationId, employeeId: medPlanTemplate.Auth}
                    } ),
                    medPlanPDFDoc = await getPdfDoc( tempFile, fileName, i18n( 'InCaseMojit.casefile_detail.label.MEDICATIONPLAN_PDF' ) );

                let cds = await getDocumedisPDF( {
                    user,
                    data: {chmed: medplanChmed.chmed, pdfType: "cds", locationId, employeeId: medPlanTemplate.Auth}
                } );

                cdsPDFDoc = await getPdfDoc( cds.tempFile, cds.fileName, i18n( 'InCaseMojit.casefile_detail.label.CDS_REPORT_PDF' ) );

                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'put',
                        query: {
                            _id: medicationPlanId
                        },
                        fields: ['attachments'],
                        data: {attachments: [medPlanPDFDoc, cdsPDFDoc], skipcheck_: true}
                    } )
                );

                if( err ) {
                    throw err;
                }

            } catch( err ) {
                Y.log( `getAndAttachPDFsToDocumedisMedplan: failed to get documedis pdf ${err.stack || err}`, 'error', callback );
                Y.doccirrus.communication.emitEventForUser( {
                    event: 'message',
                    msg: {
                        data: err
                    },
                    meta: {
                        level: 'ERROR'
                    }
                } );
                return handleResult( err, null, callback );
            }
            return handleResult( null, pdfMedia, callback );
        }

        /**
         * Updates medication plan improtred from documedis
         * @param {Object} args
         * @param {Array} args.data.catalogMedications - medications should be created
         * @param {String} args.data.locationId
         * @param {Object} args.data.medPlan
         * @param {Array} args.data.activitiesToUpdate
         * @param {Array} args.data.activitiesToDelete
         * @param {Object} args.data.medPlanTemplate
         * @param {String} args.data.caseFolderId
         * @returns {Promise.<*>}
         */
        async function updateMedicationPlanFromDocumedis( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.updateMedicationPlanFromDocumedis', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.updateMedicationPlanFromDocumedis' );
            }
            const {user, data, callback} = args,
                {medPlan, activitiesToDelete, locationId, medPlanTemplate, caseFolderId, caseFolderType, medData} = data,
                updateActivitySafeP = promisifyArgsCallback( updateActivitySafe ),
                saveMedicationPlanP = promisifyArgsCallback( saveMedicationPlan );
            let createdMedications = [], err, activityMedicament, needToBeUpdated = false;

            if( !medPlan || !activitiesToDelete || !data ) {
                Y.log( 'updateMedicationPlanFromDocumedis: No medplan  data received', 'warn', NAME );
                return handleResult( Y.doccirrus.errors.rest( 400, 'No medplan  data received', true ), null, callback );
            }

            //Create new medications
            if( data.catalogMedications && data.catalogMedications.length ) {
                for( let medicament of data.catalogMedications ) { //eslint-disable-line no-unused-vars
                    [err, activityMedicament] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            Y.doccirrus.schemas.activity._setActivityData( {
                                    initData: {
                                        actType: 'MEDICATION',
                                        catalogShort: 'HCI',
                                        locationId: data.locationId
                                    },
                                    entry: medicament,
                                    user: null
                                }, ( err, res ) => {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        resolve( res );
                                    }
                                }
                            );
                        } ) );

                    if( err ) {
                        Y.log( `updateMedicationPlanFromDocumedis: Failed to get activity data ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }
                    activityMedicament.timestamp = Date.now();
                    activityMedicament.status = "CREATED";
                    activityMedicament.patientId = data.patientId;
                    activityMedicament.employeeId = data.employeeId;
                    activityMedicament.caseFolderId = data.caseFolderId;

                    createdMedications.push( activityMedicament );
                }
            }
            //Update activities
            if( data.activitiesToUpdate && data.activitiesToUpdate.length ) {
                for( let medicament of data.activitiesToUpdate ) { //eslint-disable-line no-unused-vars
                    medicament.timestamp = Date.now();
                    [err] = await formatPromiseResult( updateActivitySafeP( {
                        user,
                        data: {
                            activity: medicament,
                            fields: ['phDosisAfternoon', 'phDosisEvening', 'phDosisMorning', 'phDosisNight', 'userContent', 'phReason'],
                            query: {_id: medicament._id}
                        }
                    } ) );

                    if( err ) {
                        Y.log( `updateMedicationPlanFromDocumedis: Failed to update medication activity ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }
                }
            }
            //Delete activities from medication plan
            if( activitiesToDelete && activitiesToDelete.length ) {
                needToBeUpdated = true;
                medPlan.activities = medPlan.activities.filter( actId => {
                    return !(activitiesToDelete.find( act => act._id === actId ));
                } );
            }

            if( createdMedications.length ) {
                needToBeUpdated = true;
            }
            medPlan.status = "CREATED";
            if( needToBeUpdated ) {
                [err] = await formatPromiseResult( saveMedicationPlanP( {
                        user,
                        data: {
                            medicationPlan: medPlan,
                            medications: createdMedications.concat( data.activitiesToUpdate || [] ),
                            caseFolderType: caseFolderType
                        }
                    }
                ) );
                if( err ) {
                    Y.log( `updateMedicationPlanFromDocumedis: Failed to update medPlan ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
            }

            try {
                await getAndAttachPDFsToDocumedisMedplan( {
                    user,
                    data: {
                        locationId,
                        medPlanTemplate,
                        medications: createdMedications.concat( data.activitiesToUpdate || [] ),
                        medicationPlanId: medPlan._id
                    }
                } );
            } catch( err ) {
                Y.log( `updateMedicationPlanFromDocumedis: failed to get and attach PDF to medplan ${err.stack || err}` );
                return handleResult( err, null, callback );
            }

            if( medData && medData.length ) {
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'activity',
                        data: {
                            actType: 'MEDDATA',
                            timestamp: new Date(),
                            caseFolderId: caseFolderId,
                            patientId: data.patientId,
                            employeeId: data.employeeId,
                            locationId: locationId,
                            medData: medData,
                            status: 'VALID',
                            skipcheck_: true
                        }
                    } ) );
            }

            if( err ) {
                Y.log( `createMedicationPlanFromDocumedis: failed to create medData ${err.stack || err}`, 'error', NAME );
            }

            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: caseFolderId
                }
            } );

            return handleResult( err, null, callback );
        }

        /**
         *Unzipping documents CHMOD data аnd matching them with catalog medications
         * @param {Object} args
         * @param {String} args.data.chmed - documedis chmed data. Docs: https://confluence.intra.doc-cirrus.com/pages/viewpage.action?spaceKey=SD&title=HCI+integration
         * @returns {Promise.<*>} :
         */
        async function CHMEDtoMedications( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.CHMEDtoMedications', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.CHMEDtoMedications' );
            }
            const {data = {}, callback, user} = args;
            let err, documedisPlan, catalogMedications, missedMedicationsAttrs = [],
                {activityIds = [], savedActivities} = data, convertedRc = [];

            try {
                documedisPlan = await Y.doccirrus.api.InCaseMojit.unzipCHMED( {data: {chmed: data.chmed}} );
            } catch( err ) {
                Y.log( `CHMEDtoMedications: Failed to unzip chemd ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( !documedisPlan || !documedisPlan.Medicaments || !documedisPlan.Medicaments.length ) {
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: '18043'} )} ),
                    null,
                    callback
                );
            }

            const documedisMedicaments = documedisPlan.Medicaments.filter( med => !!documedisIdTypeToPropertyMap[med.IdType] );
            const documedisMeas = documedisPlan.Patient.Med.Meas || [];
            const documedisRc = documedisPlan.Patient.Med.Rc || [];

            const convertedMeas = _mapMeasToMeddata( documedisMeas ) || [];

            [err, convertedRc] = await formatPromiseResult( _maRcToMedData( documedisRc ) );

            if( err ) {
                Y.log( `CHMEDtoMedications: Failed to convert Rc medData Rc: ${JSON.stringify( documedisRc )}, err: ${err.stack || err}`, 'error', NAME );
            }

            let queryPairs = documedisMedicaments.map( med => {
                let queryPair = {};
                queryPair[documedisIdTypeToPropertyMap[med.IdType]] = med.Id;
                return queryPair;
            } );

            [err, catalogMedications] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'medicationscatalog',
                action: 'get',
                query: {$or: queryPairs}
            } ) );

            if( err ) {
                Y.log( `CHMEDtoMedications: Failed to get items from medicationscatalog ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            catalogMedications = catalogMedications.map( item => {
                return {
                    ...item,
                    seq: item.phPZN,
                    title: item.phDescription,
                    phNLabel: item.phDescription,
                    short: item.catalogShort,
                    phAtc: item.phAtc === null ? [] : [item.phAtc],
                    _id: ""
                };
            } );

            if( activityIds ) {
                [err, savedActivities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {_id: {$in: activityIds}}
                } ) );

                if( err ) {
                    Y.log( `CHMEDtoMedications: Failed to get  activities ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
            }

            let willBeCreated = [],
                shouldBeProcessedByUser = [],
                activitiesToUpdate = [],
                activitiesToDelete = [],
                activitiesIdsToUpdate = [];
            try {
                queryPairs.forEach( ( query, index ) => {
                    let currentMedications = [], isQueryUsed = false;
                    //Editing medplan : select activities which will be updated;
                    savedActivities.forEach( act => {
                        if( act[Object.keys( query )[0]] === query[Object.keys( query )[0]] ) {
                            act = _mapDocumedisToInSuite( act, documedisMedicaments[index] );
                            activitiesToUpdate.push( act );
                            activitiesIdsToUpdate.push( act._id );
                            isQueryUsed = true;
                        }
                    } );

                    if( !isQueryUsed ) {
                        catalogMedications.forEach( (catalogMedication => {
                            if( catalogMedication[Object.keys( query )[0]] === query[Object.keys( query )[0]] ) {
                                catalogMedication = _mapDocumedisToInSuite( catalogMedication, documedisMedicaments[index] );
                                currentMedications.push( catalogMedication );
                            }
                        }) );
                    }

                    let duplicateIndex, duplicate = null;
                    switch( currentMedications.length ) {
                        case 0:
                            if( missedMedicationsAttrs.indexOf( query[Object.keys( query )[0]] ) === -1 && !isQueryUsed ) {
                                missedMedicationsAttrs.push( query[Object.keys( query )[0]] ); //Medication is not found by the current attribute
                            }
                            break;
                        case 1:
                            duplicate = willBeCreated.find( ( wbc, index ) => {
                                duplicateIndex = index;
                                return wbc.phPZN === currentMedications[0].phPZN;
                            } );

                            if( duplicate ) { //If have dublicate then should be processed by user
                                willBeCreated.splice( duplicateIndex, 1 );
                                shouldBeProcessedByUser.push( [duplicate, currentMedications[0]] );
                            } else {
                                willBeCreated = willBeCreated.concat( currentMedications ); //Only one medication found in DB. Can be created
                            }
                            break;
                        default :
                            shouldBeProcessedByUser.push( currentMedications );  //More than one medication found in DB. User should decide which one should be created
                    }

                    currentMedications = [];
                } );

                activitiesToDelete = savedActivities.filter( act => {
                    return activitiesIdsToUpdate.indexOf( act._id ) === -1;
                } );

            } catch( error ) {
                Y.log( `CHMEDtoMedications: Failed to  find documedis medicaments in  catalog medicaments ${error.stack || error}`, 'error', NAME );
                return handleResult( new Error( error ), null, callback );
            }

            return handleResult( null, {
                willBeCreated,
                shouldBeProcessedByUser,
                missedMedicationsAttrs,
                activitiesToUpdate,
                activitiesToDelete,
                medData: convertedMeas.concat( convertedRc ),
                documedisPlan //Unziped chmed
            }, callback );

            function _mapDocumedisToInSuite( insuiteMedicament, documedisMedicament ) {
                if( !documedisMedicament.Pos && !documedisMedicament.Pos.length ) {
                    Y.log( '_mapDocumedisToInSuite:Wrong documedis data format. No posology', 'error', NAME );
                    throw new Error( "No posology in imported data" );
                }

                insuiteMedicament.timestamp = documedisMedicament.Pos[0].DtFrom;
                if( documedisMedicament.Pos.length > 1 ) {
                    Y.log( '_mapDocumedisToInSuite: Unexpected documedis data fromat ', 'error', NAME );
                }

                if( documedisMedicament.Pos[0].D && documedisMedicament.Pos[0].D.length ) {
                    insuiteMedicament.phDosisMorning = "" + documedisMedicament.Pos[0].D[0];
                    insuiteMedicament.phDosisAfternoon = "" + documedisMedicament.Pos[0].D[1];
                    insuiteMedicament.phDosisEvening = "" + documedisMedicament.Pos[0].D[2];
                    insuiteMedicament.phDosisNight = "" + documedisMedicament.Pos[0].D[3];
                    insuiteMedicament.phNote = documedisMedicament.AppInstr;
                }

                if( documedisMedicament.Pos[0].TT ) { //Spezialdierung flag is set
                    insuiteMedicament.dosis = documedisMedicament.AppInstr;
                    insuiteMedicament.phDosisType = "TEXT";
                }

                if( documedisMedicament.Pos[0] && documedisMedicament.Pos[0].DtTo ) {
                    insuiteMedicament.phContinuousMed = true;
                    insuiteMedicament.phContinuousMedDate = moment( documedisMedicament.Pos[0].DtTo );
                }

                insuiteMedicament.phUnit = documedisMedicament.Unit;
                insuiteMedicament.phForeignUnit = documedisMedicament.Unit;
                insuiteMedicament.phReason = documedisMedicament.TkgRsn;
                insuiteMedicament.u_extra = insuiteMedicament.u_extra || [];
                insuiteMedicament.u_extra = insuiteMedicament.u_extra.concat( [
                    {
                        AutoMed: documedisMedicament.AutoMed
                    },
                    {
                        Rep: documedisMedicament.Rep
                    },
                    {
                        Subs: documedisMedicament.Subs
                    },
                    {
                        IdType: documedisMedicament.IdType
                    }
                ] );

                // Add vat & hasVat to activity
                if( insuiteMedicament.vatType ) {
                    insuiteMedicament.vat = Y.doccirrus.schemas.instock.getVatByVatType( insuiteMedicament.vatType );
                    insuiteMedicament.hasVat = true;
                }

                return insuiteMedicament;
            }

            /**
             * Map documedis height, weight to documedis
             * @private
             * @param {Array} meas
             * @returns {Array}
             */
            function _mapMeasToMeddata( meas ) {
                const medDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
                    medDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes;
                let meddata = [];

                meas.forEach( m => {
                    if( m.Type === 1 ) {
                        meddata.push( {
                            category: medDataCategories.BIOMETRICS,
                            type: medDataTypes.WEIGHT,
                            value: Number( m.Val ),
                            unit: 'kg'
                        } );
                    } else if( m.Type === 2 ) {
                        meddata.push( {
                            category: medDataCategories.BIOMETRICS,
                            type: medDataTypes.HEIGHT,
                            value: Number( m.Val ) / 100,
                            unit: 'm'
                        } );
                    }
                } );

                return meddata;
            }

            /**
             * Map documedis meddata format to insuite.
             * Docs: https://confluence.intra.doc-cirrus.com/display/SD/Documedis+integration
             * @private
             * @param {Array} Rc
             * @returns {Promise.<*>}
             */
            async function _maRcToMedData( Rc ) {
                const medDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
                    medDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes;
                let meddata = [], cchKeys = [];

                Rc.forEach( rc => {
                    if( rc.R ) {
                        cchKeys = cchKeys.concat( rc.R );
                    }
                } );

                let [err, cdsCodes] = await formatPromiseResult( Y.doccirrus.api.meddata.cdsCodesSearch( {
                    query: {cchKey: {$in: cchKeys}},
                    originalParams: {}
                } ) );

                if( err ) {
                    Y.log( `CHMEDtoMedications:  failed to get cds codes, by cchKeys: ${cchKeys}, err ${err.stack || err}`, 'error', NAME );
                    return [];
                }

                cdsCodes = cdsCodes.result ? cdsCodes.result : cdsCodes;

                Rc.forEach( rc => {
                    (rc.R || [-1]).forEach( R => {
                        const csdCode = cdsCodes.find( cds => Number( cds.cchKey ) === R );

                        if( !csdCode && R !== -1 ) {
                            Y.log( `CHMEDtoMedications:  failed to find cds code,  R: ${R}`, 'error', NAME );
                            throw new Error( 'Failed to get medData from catalog ' );
                        }
                        if( rc.Id === 6 ) {
                            meddata.push( {
                                category: medDataCategories.ALLERGIES,
                                type: csdCode.title,
                                cchKey: R
                            } );
                        } else {
                            switch( rc.Id ) {
                                case 4:
                                    meddata.push( {
                                        category: medDataCategories.BIOMETRICS,
                                        type: medDataTypes.ATHLETE,
                                        ...getTextValueAndCchKey( rc.Id, R, csdCode )
                                    } );
                                    break;
                                case 5:
                                    meddata.push( {
                                        category: medDataCategories.BIOMETRICS,
                                        type: medDataTypes.DRIVER,
                                        ...getTextValueAndCchKey( rc.Id, R, csdCode )
                                    } );
                                    break;
                                case 2:
                                    meddata.push( {
                                        category: medDataCategories.BIOMETRICS,
                                        type: medDataTypes.HEPATIC_INSUFFICIENCY,
                                        ...getTextValueAndCchKey( rc.Id, R, csdCode )
                                    } );
                                    break;
                                case 1:
                                    meddata.push( {
                                        category: medDataCategories.BIOMETRICS,
                                        type: medDataTypes.RENAL_FAILURE,
                                        ...getTextValueAndCchKey( rc.Id, R, csdCode )
                                    } );
                                    break;
                            }
                        }
                    } );

                } );

                function getTextValueAndCchKey( Id, R, cdsCode ) {
                    if( !R || R === -1 ) {
                        return {
                            textValue: i18n( 'general.text.NO' ),
                            cchKey: -1
                        };
                    }
                    // 4 - Athlete , 5 - Driver
                    if( (Id === 4 || Id === 5) && R ) {
                        return {
                            textValue: i18n( 'general.text.YES' ),
                            cchKey: cdsCode.cchKey
                        };
                    }

                    return {
                        textValue: cdsCode.title,
                        cchKey: cdsCode.cchKey
                    };
                }

                return handleResult( null, meddata );
            }
        }

        /**
         * Convert activities to medplanChmed
         * @param {Object} args
         * @param {Object} args.user
         * @param {Array} args.data.activityIds - activity ids contained in medplan
         * @param {Array} args.data.activities - activities can be used in case whend don't have ids
         * @param {Object} args.data.medplan - documedis medplan template
         * @returns {Promise.<*>}
         */
        async function convertMedicationsToMedplanChmed( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.convertMedicationsToMedplanChmed', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.convertMedicationsToMedplanChmed' );
            }
            const
                {data = {}, callback, user} = args,
                {activityIds = [], medplan} = data,
                getChmed = promisifyArgsCallback( Y.doccirrus.api.InCaseMojit.getCHMED );
            let
                err,
                {activities = []} = data,
                documedisMedications = [],
                chmed;

            if( !activityIds.length && !activities.length ) {
                return handleResult(
                    Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: '18040'} )} ),
                    null,
                    callback
                );
            }

            if( !activities.length ) {
                //Get actvities from DB if activites was not received in args
                [err, activities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'activity',
                        user: user,
                        query: {_id: {$in: activityIds}}
                    } ) );

                if( err ) {
                    Y.log( `convertMedicationsToMedplanChmed: Failed to get activities ${err.stack || err}`, 'error', NAME );
                    return handleResult(
                        Y.doccirrus.commonerrors.DCError( 500, {message: Y.doccirrus.errorTable.getMessage( {code: '18041'} )} ),
                        null,
                        callback
                    );
                }

                if( !activities.length ) {
                    return handleResult(
                        Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: '18040'} )} ),
                        null,
                        callback
                    );
                }
            }
            //Convert insuite medications to documedis format
            try {
                activities.forEach( medicament => {
                    documedisMedications.push( _mapInSuiteToDocumedis( medicament ) );
                } );
            } catch( err ) {
                return handleResult( err, null, callback );
            }

            medplan.Medicaments = documedisMedications;

            try {
                [err, chmed] = await formatPromiseResult( getChmed( {data: {medplan: medplan}} ) );
            } catch( error ) {
                Y.log( `convertMedicationsToMedplanChmed: Failed to create chmed ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( err ) {
                Y.log( `convertMedicationsToMedplanChmed: Failed to get CHEMED ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            return handleResult( null, {medplan, chmed}, callback );

            function _mapInSuiteToDocumedis( inSuiteMedicament ) {
                let D = [], TT = [{}], PosItem = {}, AppInstr = "";
                const regExp = /^(\d*)-(\d*)-(\d*)-(\d*)$/;
                if( !inSuiteMedicament.u_extra ) {
                    inSuiteMedicament.u_extra = [];
                }

                const idType = inSuiteMedicament.u_extra.length ? (inSuiteMedicament.u_extra.find( ( attrObj ) => !!(attrObj || {}).IdType ) || {}).IdType : null,
                    autoMed = inSuiteMedicament.u_extra.length ? (inSuiteMedicament.u_extra.find( ( attrObj ) => !!(attrObj || {}).AutoMed ) || {}).AutoMed : null,
                    idProperty = documedisIdTypeToPropertyMap[idType || 'catalog'];

                if( !inSuiteMedicament[idProperty] ) {
                    Y.log( `convertMedicationsToMedplanChmed: Medcation  id: ${inSuiteMedicament._id} does not contains required property ${idProperty}`, `error`, NAME );
                    throw Y.doccirrus.errorTable.getMessage( {
                        code: 18046,
                        data: {
                            $content: inSuiteMedicament.phNLabel || inSuiteMedicament.content || inSuiteMedicament.userContent,
                            $property: i18n( `activity-schema.Medication_T.${idProperty}.i18n` )
                        }
                    } );
                }

                if( inSuiteMedicament.phDosisType === "TEXT" ) {
                    let matches = regExp.exec( inSuiteMedicament.dosis );

                    if( matches ) {
                        D = [matches[1], matches[2], matches[3], matches[4]];
                        AppInstr = inSuiteMedicament.phNote;
                    } else {
                        AppInstr = `${inSuiteMedicament.dosis}  ${inSuiteMedicament.phNote}`;
                    }
                } else {
                    if( inSuiteMedicament.phDosisMorning ||
                        inSuiteMedicament.phDosisAfternoon ||
                        inSuiteMedicament.phDosisEvening ||
                        inSuiteMedicament.phDosisNight ) {
                        D = [
                            Number( inSuiteMedicament.phDosisMorning ) || 0,
                            Number( inSuiteMedicament.phDosisAfternoon ) || 0,
                            Number( inSuiteMedicament.phDosisEvening ) || 0,
                            Number( inSuiteMedicament.phDosisNight ) || 0
                        ];
                    }
                    AppInstr = inSuiteMedicament.phNote;
                }

                if( D.length ) {
                    PosItem.D = D;
                } else {
                    PosItem.TT = TT;
                }

                if( inSuiteMedicament.phContinuousMed ) {
                    PosItem.DtTo = moment( inSuiteMedicament.phContinuousMedDate ).format( "YYYY-MM-DD" );
                }

                return {
                    Id: idProperty ? inSuiteMedicament[idProperty] : inSuiteMedicament.explanations,
                    IdType: idType || 4, //Use prdNo as default
                    Pos: [
                        {
                            DtFrom: moment( inSuiteMedicament.timestamp ).format( "YYYY-MM-DD" ),
                            ...PosItem
                        }],
                    AutoMed: autoMed || 0,
                    Unit: inSuiteMedicament.phForeignUnit === 'lt' ? "L" : inSuiteMedicament.phForeignUnit,
                    TkgRsn: inSuiteMedicament.phReason,
                    AppInstr: AppInstr,
                    PFields: []
                };
            }
        }

        /**
         * Downloal documedis PDF, medication plan or cds check printend in pdf
         * @param {Object} args
         * @param {String} args.data.chmed - documedis medication plan
         * @param {String} args.data.pdfType - default : 'medicationPlan', get medicationPlanPdf or CDS check
         * @returns {Promise.<void>}
         */
        async function getDocumedisPDF( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getDocumedisPDF', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getDocumedisPDF' );
            }
            const
                {chmed, pdfType = 'medicationPlan', locationId, employeeId} = args.data,
                {user, callback} = args;
            let
                err, result, organization = '';

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'employee',
                query: {
                    _id: employeeId
                },
                options: {}
            } ) );

            if( result && result[0] ) {
                organization += `${Y.doccirrus.schemas.person.personDisplay( result[0] )}\n`;
            }

            if( err ) {
                // continue, no need to stop
                Y.log( `Error in getting employee: ${employeeId}`, 'error', NAME );
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                query: {
                    _id: locationId
                },
                options: {
                    select: {
                        locname: 1,
                        city: 1,
                        zip: 1
                    }
                }
            } ) );

            if( err ) {
                // continue, no need to stop
                Y.log( `Error in getting location: ${locationId}`, 'error', NAME );
            }

            if( result && result[0] ) {
                let
                    loc = result[0] || {};

                if( loc.locname ) {
                    organization += `${i18n( 'basecontact-schema.BaseContactType_E.PRACTICE.i18n' )} ${loc.locname}\n`;
                }

                if( loc.zip ) {
                    organization += loc.zip + ' ';
                }

                if( loc.city ) {
                    organization += loc.city + ' ';
                }
            }

            const
                documedisJSON = JSON.stringify( {
                    "medication": chmed,
                    "checks": [
                        {check: "Interaction", hideAbove: null},
                        {check: "AllergySubstance", hideAbove: null},
                        {check: "AllergyExcipient", hideAbove: null},
                        {check: "DoubleMedication", hideAbove: null},
                        {check: "Posology", hideAbove: null},
                        {check: "RenalInsufficiency", hideAbove: null},
                        {check: "LiverInsufficiency", hideAbove: null},
                        {check: "Reproduction", hideAbove: null},
                        {check: "Doping", hideAbove: null},
                        {check: "Elderly", hideAbove: null},
                        {check: "Nutrition", hideAbove: null},
                        {check: "Driving", hideAbove: null}
                    ],
                    organization: organization
                } ),
                options = {
                    host: pdfType === 'medicationPlan' ? "documedis.hcisolutions.ch" : "ce.documedis.hcisolutions.ch",
                    path: pdfType === 'medicationPlan' ? "/2018-01/app/medication/medicationplan" : "/cds/2018-01/app//Check",
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${documedisConfig.Authorization}`,
                        'Content-Type': 'application/json',
                        'Accept': "application/pdf",
                        'Accept-Language': "de-CH",
                        'HCI-CustomerId': documedisConfig.CustomerId,
                        'HCI-Index': 'medINDEX',
                        'HCI-SoftwareOrgId': documedisConfig.CustomerId,
                        'HCI-SoftwareOrg': 'Doc Cirrus GmbH',
                        'HCI-Software': 'Doc Cirrus'
                    }
                },
                baseTmpDir = Y.doccirrus.media.getTempDir(),
                dirPath = join( baseTmpDir );

            let
                tempFile,
                fileName = "";

            [err, tempFile] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                const req = https.request( options, ( res ) => {
                    //Get file name from headers
                    let contentDisposition = ((res.headers || {})['content-disposition'] || "").match( /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/ );

                    if( contentDisposition && contentDisposition.length ) {
                        fileName = `${dirPath}${contentDisposition[1].replace( /"/g, "" ).replace( / /g, "" )}`;
                    } else {
                        fileName = `${dirPath}Documedis_${Date.now()}`;
                    }

                    if( res.statusCode !== 200 || (res.headers || {})['content-type'] !== 'application/pdf' ) {
                        Y.log( `getDocumedisPDF: Request to hcisolutions is not success, statusCode : ${res.statusCode}, chmed: ${chmed}`, 'error', NAME );
                        reject( -1 );
                    }

                    fs.writeFileSync( path.join( fileName ), "", 'binary' );
                    res.setEncoding( 'base64' );

                    res.on( 'data', ( chunk ) => {
                        try {
                            fs.appendFileSync( path.join( fileName ), new Buffer.from( chunk, 'base64' ), 'binary' );
                        } catch( err ) {
                            reject( err );
                        }
                    } );
                    res.on( 'end', () => {
                        Y.log( `getDocumedisPDF: Finished downloading ${fileName}`, 'info', NAME );
                        resolve( fileName );
                    } );
                } );

                req.on( 'error', ( err ) => {
                    Y.log( `getDocumedisPDF: Failed to make request to hcisolutions  ${err.stack || err}, chmed: ${chmed}`, 'error', NAME );
                    reject( err );
                } );
                // Write data to request body
                req.write( documedisJSON );
                req.end();
            } ) );

            if( err ) {
                Y.log( `getDocumedisPDF: Failed to download Documeds PDF  ${err.stack || err}`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: '18044'} )} ), null, callback );
            }

            return handleResult( null, {tempFile, fileName}, callback );
        }

        function getActivitiesGroupedByAPK( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getActivitiesGroupedByAPK', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActivitiesGroupedByAPK' );
            }
            var
                moment = require( 'moment' ),
                ObjectId = require( 'mongoose' ).Types.ObjectId,

                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                actQuery = {
                    apkState: params && params.apkState || 'IN_PROGRESS',
                    patientId: params.patientId,
                    actType: {
                        $nin: [
                            'INVOICE',
                            'RECEIPT',
                            'WARNING1',
                            'WARNING2',
                            'CREDITNOTE',
                            'REMINDER']
                    }
                },
                now = moment();

            function aggregationCb( err, results ) {
                if( err ) {
                    return callback( err );
                }
                //populate caseFolder titles
                if( results && results[0] ) {
                    async.eachSeries( results, ( item, done ) => {
                        async.eachSeries( item.activitiesWithCaseFolder, ( innerItem, innerDone ) => {
                            Y.doccirrus.mongodb.runDb( {
                                model: 'casefolder',
                                user: user,
                                query: {
                                    _id: innerItem.caseFolderId
                                },
                                options: {
                                    select: {
                                        title: 1,
                                        merged: 1
                                    },
                                    lean: true
                                }
                            }, ( err, result ) => {
                                if( err ) {
                                    return innerDone( err );
                                }

                                if( result && result[0] ) {
                                    innerItem.title = result[0].merged ? (result[0].title + ' (Z)') : result[0].title;
                                }
                                return innerDone();
                            } );
                        }, ( error ) => {
                            if( error ) {
                                return done( error );
                            }
                            return done();
                        } );
                    }, ( err ) => {
                        if( err ) {
                            return callback( err );
                        }
                        return callback( null, results );
                    } );
                } else {
                    return callback( null, results );
                }
            }

            function modelCb( err, activityModel ) {

                if( err ) {
                    Y.log( 'getActivitiesGroupedByAPK: could not get activity model ' + err, 'error', NAME );
                    return callback( err );
                }

                activityModel.mongoose.aggregate( [
                    {
                        $match: actQuery
                    },
                    {
                        $project: {
                            activity: "$$ROOT",
                            newDate: {
                                // EXTMOJ-2103: only do the "schein timezone add 2 hours" fix for schein activities
                                $cond: {
                                    if: {
                                        $and: [
                                            //{$not:{$in: ['$actType', ['SCHEIN', 'BGSCHEIN', 'PKVSCHEIN']]}},
                                            {$gte: [{$hour: "$timestamp"}, 22]}  // MOJ-14289: schein and leistung of same day has been broken apart after dragging in casefolder.
                                        ]
                                    },
                                    then: {$add: ["$timestamp", 2 * 60 * 60 * 1000]},
                                    else: '$timestamp'
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            timestampAsDate: {'$dateToString': {format: '%d.%m.%Y', date: '$newDate'}},
                            actType: "$activity.actType",
                            code: "$activity.code",
                            timestamp: "$newDate",
                            apkState: "$activity.apkState",
                            patientId: "$activity.patientId",
                            content: "$activity.content",
                            caseFolderId: "$activity.caseFolderId"
                        }
                    },
                    {
                        $group: {
                            _id: {
                                timestamp: "$timestampAsDate",
                                caseFolderId: "$caseFolderId",
                                actType: "$actType"
                            },
                            timestamp: {$first: "$timestamp"},
                            activities: {$push: "$$ROOT"}
                        }
                    },
                    {
                        $group: {
                            _id: {
                                timestamp: "$_id.timestamp",
                                caseFolderId: "$_id.caseFolderId"
                            },
                            timestamp: {$first: "$timestamp"},
                            activitiesWithTimestamp: {
                                $push: {
                                    actType: "$_id.actType",
                                    activities: "$activities"
                                }
                            }
                        }

                    },
                    {
                        $group: {
                            _id: {
                                timestamp: "$_id.timestamp"
                            },
                            timestamp: {$first: "$timestamp"},
                            activitiesWithCaseFolder: {
                                $push: {
                                    caseFolderId: "$_id.caseFolderId",
                                    activitiesWithTimestamp: "$activitiesWithTimestamp"
                                }
                            }
                        }
                    },
                    {
                        $sort: {
                            "timestamp": -1
                        }
                    }
                ], aggregationCb );
            }

            function startAggregation( err, caseFolderIds ) {

                if( err ) {
                    Y.log( 'getActivitiesGroupedByAPK: could not get caseFolderIds for type ' + params.insuranceTypeFilter + ' ' + err, 'error', NAME );
                    return callback( err );
                }

                if( Array.isArray( caseFolderIds ) && caseFolderIds.length ) {
                    actQuery.caseFolderId = {$in: caseFolderIds};
                }

                Y.doccirrus.filtering.models.activity.processQuery( user, 'get', actQuery, ( err, query ) => {
                    if( !err ) {
                        actQuery = query;
                    } else {
                        Y.log( 'getActivitiesGroupedByAPK: could not process query ' + err, 'warn', NAME );
                    }

                    Y.doccirrus.mongodb.getModel( user, 'activity', true, modelCb );
                } );
            }

            if( Array.isArray( params.locationFilter ) && params.locationFilter.length ) {
                actQuery.locationId = {
                    $in: params.locationFilter.map( function( id ) {
                        return new ObjectId( id );
                    } )
                };
            }

            if( Array.isArray( params.employeeFilter ) && params.employeeFilter.length ) {
                actQuery.employeeId = {
                    $in: params.employeeFilter
                };
            }

            if( params.period.$lte && params.period.$gte ) {
                actQuery.timestamp = {
                    $lte: moment( params.period.$lte ).endOf( 'day' ).toDate(),
                    $gte: moment( params.period.$gte ).startOf( 'day' ).toDate()
                };
            } else if( 0 <= params.period ) {
                actQuery.timestamp = {
                    $lte: now.clone().endOf( 'day' ).toDate(),
                    $gte: now.subtract( params.period, 'days' ).startOf( 'day' ).toDate()
                };
            } else { // add 2 yr limit to prevent potentially ultra-expensive query with $nin
                actQuery.timestamp = {
                    $lte: now.clone().endOf( 'day' ).toDate(),
                    $gte: now.subtract( 730, 'days' ).startOf( 'day' ).toDate()
                };
            }

            if( Array.isArray( params.insuranceTypeFilter ) && params.insuranceTypeFilter.length ) {
                Y.doccirrus.api.casefolder.getCaseFolderIdsByType( {
                    user: user,
                    originalParams: {
                        type: params.insuranceTypeFilter
                    },
                    callback: startAggregation
                } );
            } else {
                startAggregation();
            }

        }

        function setAPKState( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.setAPKState', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.setAPKState' );
            }
            var
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                caseFoldersIds = [];

            if( params && params.caseFolders && params.caseFolders[0] ) {
                params.caseFolders.forEach( function( item ) {
                    caseFoldersIds.push( item.caseFolderId );
                } );
                params.activity.caseFolderId = caseFoldersIds;
                Y.doccirrus.utils.setApkState( user, params.activity, callback );
            } else {
                Y.doccirrus.utils.setApkState( user, params.activity, callback );
            }
        }

        async function getLatestMedicationPlan( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getLatestMedicationPlan', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getLatestMedicationPlan' );
            }
            const
                {query = {}, callback} = args,
                invalidStatuses = ['CANCELLED', 'PREPARED'];
            let err, medicationPlans, activities;
            if( !query.patientId ) {
                return callback( null, [] );
            }

            [err, medicationPlans] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        actType: {$in: ['MEDICATIONPLAN', 'KBVMEDICATIONPLAN']},
                        medicationPlanEntries: {$not: {$size: 0}},
                        patientId: query.patientId,
                        status: {$nin: invalidStatuses}
                    },
                    options: {
                        sort: {timestamp: -1},
                        limit: 1,
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `getLatestMedicationPlan: failed to get medications plan, patientId: ${query.patientId}, err: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( !medicationPlans.length ) {
                return handleResult( null, [], callback );
            }

            if( medicationPlans.length && medicationPlans[0].actType === 'MEDICATIONPLAN' ) {
                [err, activities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: {$in: medicationPlans[0].activities}
                        }
                    } ) );

                if( err ) {
                    Y.log( `getLatestMedicationPlan: failed to get activities, ids: ${medicationPlans[0].activities}, err: ${err && err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                medicationPlans[0].medicationPlanEntries = activities.result ? activities.result : activities;
            }

            medicationPlans = (medicationPlans || []).reduce( ( acc, el ) => acc.concat( el.medicationPlanEntries ), [] ).filter( Boolean );
            medicationPlans.forEach( function( medication ) {
                medication.displayPhIngr = [];
                medication.displayStrength = [];
                if( medication.phIngr && medication.phIngr[0] ) {
                    medication.phIngr.forEach( ingr => {
                        medication.displayPhIngr.push( ingr.name || ' ' );
                        medication.displayStrength.push( ingr.strength || ' ' );
                    } );
                }

                medication.displayDosis = Y.doccirrus.schemas.activity.getMedicationDosis( medication );
            } );

            return handleResult( err, medicationPlans, callback );
        }

        async function _detachChildsOfScheins( params ) {
            Y.log( 'Entering Y.doccirrus.api.activity._detachChildsOfScheins', 'info', NAME );
            if( params.callback ) {
                params.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.activity._detachChildsOfScheins' );
            }
            const
                {user, activitiesIds, migrate} = params,
                {formatPromiseResult} = require( 'dc-core' ).utils,
                bluebird = require( 'bluebird' ),
                patients = {};
            let
                err,
                results;
            /**
             * Getting all "chained" scheins
             */
            [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    migrate,
                    query: {
                        _id: {$in: activitiesIds},
                        actType: {$in: Y.doccirrus.schemas.activity.scheinActTypes},
                        fk4235Set: {
                            $exists: true,
                            $not: {$size: 0}
                        },
                        activities: {
                            $exists: true,
                            $not: {$size: 0}
                        }
                    },
                    options: {
                        sort: {
                            timestamp: 1
                        },
                        select: {
                            activities: 1,
                            caseFolderId: 1,
                            patientId: 1,
                            fk4235Set: 1
                        }
                    }
                } )
            );
            if( err ) {
                throw err;
            }
            if( results ) {
                /**
                 * detaching of parent Schein children
                 * @type {*|boolean}
                 */
                const
                    caseFolderLastSchein = {},
                    activityMap = new Map();
                results.forEach( activity => {
                    activityMap.set( activity._id.toString(), activity );
                    caseFolderLastSchein[activity.caseFolderId] = activity; // last schein overrides first one
                } );
                /**
                 * running detachScheinChildren for every parent schein (lastest per case folder) => different opened "schein chains" can not be billed at once
                 */
                await bluebird.each( Object.keys( caseFolderLastSchein ), caseFolderId => {
                    const
                        schein = caseFolderLastSchein[caseFolderId];
                    let parentScheinId;
                    if( schein.activities.length > 1 ) {
                        parentScheinId = schein._id.toString();
                    } else {
                        parentScheinId = schein.activities[0];
                    }

                    return detachScheinChildren( {
                        user,
                        options: {
                            migrate
                        },
                        data: {
                            parentSchein: activityMap.get( parentScheinId ),
                            parentScheinId: parentScheinId
                        }
                    } )
                        .then( ( data ) => {
                            if( data.updated ) {
                                patients[schein.patientId] = patients[schein.patientId] || [];
                                if( !patients[schein.patientId].includes( schein.caseFolderId ) ) {
                                    patients[schein.patientId].push( schein.caseFolderId );
                                }
                            }
                        } );
                } );
            }

            /**
             * bl recalculation for every case folder
             */
            return bluebird.each( Object.keys( patients ), patientId => {
                const caseFolders = patients[patientId];
                return bluebird.each( caseFolders, caseFolderId => {
                    return new Promise( ( resolve, reject ) => {
                        Y.log( `_detachChildsOfScheins. recalculating bl in all affected case folders`, 'debug', NAME );
                        Y.doccirrus.api.activity.recalcBLInCaseFolder( {
                            user: user,
                            query: {
                                patientId,
                                caseFolderId
                            },
                            options: {
                                migrate
                            },
                            callback: function( err ) {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve();
                            }
                        } );
                    } );

                } );
            } )
                .then( () => patients );

        }

        /**
         * Accepts child scheins and detaches them from parents scheins
         * @param {Object} params
         * @param {Object} params.user
         * @param {Array} params.activities
         * @param {Boolean} [params.migrate]
         * @returns {Promise}
         * @private
         */
        async function _detachParentFromSchein( params ) {
            const
                {user, activities = [], migrate} = params,
                {formatPromiseResult} = require( 'dc-core' ).utils,
                bluebird = require( 'bluebird' ),
                patients = {},
                parentScheinSet = new Set();
            let
                err;

            activities.forEach( activity => {
                parentScheinSet.add( activity.activities[0] );
            } );

            for( let parentScheinId of parentScheinSet ) { //eslint-disable-line no-unused-vars
                let parentSchein;
                /**
                 * Getting parent "billed" schein
                 */
                [err, parentSchein] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        migrate,
                        query: {
                            _id: parentScheinId,
                            status: 'BILLED'
                        },
                        options: {
                            select: {
                                activities: 1,
                                patientId: 1,
                                caseFolderId: 1
                            }
                        }
                    } )
                        .then( results => results && results[0] )
                );
                if( err ) {
                    throw err;
                }
                if( parentSchein ) {

                    await detachScheinChildren( {
                        user,
                        options: {
                            migrate
                        },
                        data: {
                            backup: true,
                            parentScheinId: parentSchein._id.toString(),
                            parentSchein
                        }
                    } )
                        .then( ( data ) => {
                            if( data.updated ) {
                                patients[parentSchein.patientId] = patients[parentSchein.patientId] || [];
                                if( !patients[parentSchein.patientId].includes( parentSchein.caseFolderId ) ) {
                                    patients[parentSchein.patientId].push( parentSchein.caseFolderId );
                                }
                            }
                        } );

                }
            }

            /**
             * bl recalculation for every case folder
             */
            return bluebird.each( Object.keys( patients ), patientId => {
                const caseFolders = patients[patientId];
                return bluebird.each( caseFolders, caseFolderId => {
                    return new Promise( ( resolve ) => {
                        Y.log( `_detachChildsOfScheins. recalculating bl in casefolder: ${caseFolderId}, patientId: ${patientId}`, 'debug', NAME );
                        Y.doccirrus.api.activity.recalcBLInCaseFolder( {
                            user: user,
                            query: {
                                patientId,
                                caseFolderId
                            },
                            options: {
                                migrate
                            },
                            callback: function( err ) {
                                if( err ) {
                                    Y.log( `_detachChildsOfScheins. Could not recalculate bl in casefolder: ${caseFolderId}, patientId: ${patientId}`, 'error', NAME );
                                }
                                resolve();
                            }
                        } );
                    } );

                } );
            } )
                .then( () => patients );

        }

        /**
         * detaches "opened" scheins from parent schein
         * @param {Object} params
         * @param {Object} params.user
         * @param {Object} params.data
         * @param {Boolean} [params.data.backup=false] whether system should make backup of affected activities or not
         * @param {String} params.data.parentScheinId
         * @param {Object} [params.data.parentSchein] if not passed, fetched by parentScheinId
         * @returns {Promise}
         */
        async function detachScheinChildren( params ) {
            const
                {user, data: {parentScheinId, backup} = {}, options: {migrate} = {}} = params,
                {formatPromiseResult} = require( 'dc-core' ).utils,
                bluebird = require( 'bluebird' ),
                openedStatuses = ['VALID', 'APPROVED'],
                backupCollection = 'moj9395';
            let
                err,
                children,
                {data: {parentSchein} = {}} = params,
                codeMap,
                lastFk4235Set,
                activityModel;
            if( !parentScheinId ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'parent schein id is missing'} );
            }
            Y.log( `detachScheinChildren. starting process for parent Schein: ${parentScheinId}`, 'debug', NAME );
            if( !parentSchein ) {
                [err, parentSchein] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        migrate,
                        query: {
                            _id: parentScheinId
                        },
                        options: {
                            select: {
                                _id: 1,
                                activities: 1,
                                caseFolderId: 1
                            }
                        }
                    } )
                        .then( results => results[0] )
                );
                if( err ) {
                    Y.log( `Could not get parent schein. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    throw err;
                }
                if( !parentSchein ) {
                    Y.log( `Parent schein not found. parent schein _id: ${parentScheinId}`, 'error', NAME );
                    throw err;
                }
            }

            /**
             * Getting last billed schein in a chain
             */
            [err, lastFk4235Set] = await formatPromiseResult( //take last billed fk4235Set
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    migrate,
                    query: {
                        _id: {$in: parentSchein.activities},
                        fk4235Set: {
                            $exists: true,
                            $not: {$size: 0}
                        },
                        status: 'BILLED'
                    },
                    options: {
                        sort: {
                            timestamp: -1
                        },
                        select: {
                            _id: 1,
                            fk4235Set: 1
                        },
                        limit: 1
                    }
                } )
                    .then( results => results[0] && results[0].fk4235Set || [] )
            );
            if( err ) {
                Y.log( `Could not get lask fk4235 set. Error: ${JSON.stringify( err )}`, 'error', NAME );
                throw err;
            }

            codeMap = lastFk4235Set.reduce( ( obj, item ) => {
                if( !item.fk4244Set || !item.fk4244Set.length ) {
                    return obj;
                }
                obj[item._id] = {};
                item.fk4244Set.forEach( fk4244 => {
                    obj[item._id][fk4244.fk4244] = fk4244.fk4246;
                } );
                return obj;
            }, {} );

            /**
             * Getting children of parent schein
             */
            [err, children] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    migrate,
                    query: {
                        status: {$in: openedStatuses},
                        activities: {
                            $in: [parentScheinId],
                            $size: 1,
                            $exists: true
                        },
                        caseFolderId: parentSchein.caseFolderId
                    },
                    options: {
                        sort: {
                            timestamp: 1
                        },
                        select: {
                            _id: 1,
                            activities: 1,
                            fk4235Set: 1
                        }
                    }
                } )
            );
            if( err ) {
                Y.log( `Could not get child scheins. Error: ${JSON.stringify( err )}`, 'error', NAME );
                throw err;
            }
            if( !children.length ) {
                Y.log( `detachScheinChildren. There are no child Scheins to update for parent Schein - ${parentScheinId}`, 'debug', NAME );
                return {updated: false};
            }
            children.forEach( ( item, index ) => {
                item.activities = item.activities && item.activities.filter( id => id.toString() !== parentSchein._id.toString() ) || [];
                item.fk4235Set = item.fk4235Set || [];
                item.fk4235Set.forEach( item => {
                    const
                        codes = codeMap[item._id];
                    if( !codes ) {
                        return;
                    }
                    (item.fk4244Set || []).forEach( fk4244 => {
                        if( codes[fk4244.fk4244] ) {
                            fk4244.fk4246Offset = codes[fk4244.fk4244];
                        }
                    } );
                } );
                if( children.length > 1 ) {
                    if( index !== 0 ) {
                        children[0].activities.push( item._id.toString() );
                    }
                    item.activities.push( children[0]._id.toString() );
                }
            } );

            activityModel = await new Promise( ( resolve, reject ) => {
                Y.doccirrus.mongodb.getModel( user, 'activity', migrate, ( err, model ) => {
                    if( err ) {
                        Y.log( `detachScheinChildren. cound not get activity model`, 'error', NAME );
                        return reject( err );
                    }
                    resolve( model );
                } );
            } );
            if( backup ) {
                await activityModel.mongoose.aggregate( [
                    {$match: {_id: {$in: [...children.map( item => item._id ), parentSchein._id]}}},
                    {$out: backupCollection}
                ] ).exec();
            }
            return bluebird.each( children, activity => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate,
                    query: {
                        _id: activity._id
                    },
                    data: {
                        activities: activity.activities,
                        fk4235Set: activity.fk4235Set
                    }
                } );
            } )
                .then( () => {
                    const
                        affectedChilds = children.map( item => item._id.toString() ),
                        parentActivities = parentSchein.activities.filter( id => !affectedChilds.includes( id ) );
                    Y.log( `detachScheinChildren. Successfully updated following child Schein: ${affectedChilds}`, 'debug', NAME );
                    if( parentActivities.length === 1 ) {
                        parentActivities.length = 0;
                    }
                    Y.log( `detachScheinChildren. Updating parent Schein: ${parentScheinId}`, 'debug', NAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        migrate,
                        query: {
                            _id: parentScheinId
                        },
                        data: {
                            activities: parentActivities
                        }
                    } );
                } )
                .then( () => ({updated: true}) );

        }

        /**
         * Fixes broken Scheins MOJ-9395
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function fixBilledScheinChains( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.fixBilledScheinChains', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.fixBilledScheinChains' );
            }
            const
                {user, callback, options: {migrate} = {}} = args,
                openedStatuses = ['VALID', 'APPROVED'];
            /**
             * Get all "'VALID', 'APPROVED'" children scheins from 2018-01-08T22:00:00.001Z
             */
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'get',
                migrate,
                query: {
                    timestamp: {
                        $gt: '2018-01-08T22:00:00.001Z' // MOJ-8639 first commit 09.01.2018
                    },
                    status: {$in: openedStatuses},
                    fk4235Set: {
                        $exists: true,
                        $not: {$size: 0}
                    },
                    activities: {
                        $exists: true,
                        $size: 1
                    },
                    actType: {$in: Y.doccirrus.schemas.activity.scheinActTypes}
                },
                options: {
                    select: {
                        _id: 1,
                        activities: 1
                    }
                }
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                if( !results.length ) {
                    return callback();
                }
                _detachParentFromSchein( {
                    user,
                    migrate,
                    activities: results
                } )
                    .then( ( patients ) => {
                        const
                            links = Object.keys( patients ).reduce( ( arr, patientId ) => {
                                const items = patients[patientId];
                                arr.push( ...items.map( caseFolderId => `/incase#/patient/${patientId}/tab/casefile_browser/casefolder/${caseFolderId}` ) );
                                return arr;
                            }, [] );
                        Y.log( `fixBilledScheinChains. updated case folders: ${JSON.stringify( patients )}`, 'debug', NAME );
                        callback( null, links.join( ', ' ) );
                    } )
                    .catch( err => callback( err ) );
            } );

        }

        /**
         *  Dev / support route to run migration to set EBM prices from current catalog MOJ-10729
         *  @param args
         */

        function correctEBMPrices( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.correctEBMPrices( args.user, false, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem in migration to set EBM prices: ${err.stack || err}`, 'warn', NAME );
                }
            }

            //  call back immediately
            args.callback( null, {'status': 'Started migration to correct EBM prices from actualPrice.'} );
        }

        function correctEBMKettePrices( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.correctEBMKettePrices( args.user, false, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem in migration to set EBM prices in Kette: ${err.stack || err}`, 'warn', NAME );
                }
            }

            //  call back immediately
            args.callback( null, {'status': 'Started migration to set EBM prices from actualPrice.'} );
        }

        /**
         * Creating STOCKDISPENSE acttivity and linking it to Medication activity, attach and generate pdf form to medication,
         * reduce stock count on data.ware.reduce value for selected medication
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.dispense
         * @param {String} args.data.dispense.patientId
         * @param {String} args.data.dispense.phPZN
         * @param {String} args.data.dispense.stockLocationId
         * @param {String} args.data.dispense.locationId
         * @param {String} args.data.dispense.caseFolderId
         * @param {String} args.data.dispense.employeeId
         * @param {String} args.data.dispense.employeeName
         * @param {String} args.data.dispense.comment - selected medication description
         * @param {String} args.data.dispense.userContent - reason of adding dispense
         * @param {Object} args.data.medicationIds - medication activity ids
         * @param {Object} args.data.ware
         * @param {Object} args.data.ware._id - ware _id from instock,
         * @param {Object} args.data.ware.reduce - number of items will be reduced for
         * @param {Function} args.callback
         */

        async function createDispense( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.createDispense', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createDispense' );
            }

            const {user, data, callback} = args,
                doTransitionP = promisifyArgsCallback( doTransition );

            let err, result, medications, {dispense, medicationIds = [], wares} = data, stockDispense, insertedId;

            if( !Y.doccirrus.licmgr.hasAdditionalService( args.user.tenantId, 'inStock' ) ) {

                Y.log( "createDispense: Failed to createDispense, no inStock licence.", "error", NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( '18033' ), null, callback );
            }

            [err, medications] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: args.user,
                action: 'get',
                model: 'activity',
                query: {_id: {$in: medicationIds}}
            } ) );

            if( err ) {
                Y.log( `createDispense: failed to get actual medications: ${err}`, 'error', NAME );
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( '18029' ),
                    null,
                    callback
                );
            }

            medications = medications.result ? medications.result : medications;

            medications.forEach( ( medication ) => {
                if( medication.isDispensed ) {
                    Y.log( `createDispense: selected medication is already dispensed ${medication}`, 'error', NAME );
                    return handleResult(
                        new Y.doccirrus.commonerrors.DCError( '18029' ),
                        null,
                        callback
                    );
                }
            } );

            /*Create dispense activity*/
            dispense.actType = "STOCKDISPENSE";
            dispense.timestamp = new Date();
            dispense.status = "CREATED";
            dispense.stockItemId = new ObjectId( dispense.stockItemId );

            [err, result] = await formatPromiseResult( doTransitionP( {
                user,
                data: {
                    activity: dispense,
                    transition: "validate",
                    _isTest: 'false'
                }
            } ) );

            if( err ) {
                Y.log( `createDispense: Failed to create activity STOCKDISPENSE: ${err}`, 'error', NAME );
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( '18029' ),
                    null,
                    callback
                );
            }

            if( !result.length || !result[0].data || !result[0].data._id ) {
                Y.log( `createDispense: No results afer transition 'validate'`, 'error', NAME );
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( '18029' ),
                    null,
                    callback
                );
            }

            /*Set isDispensed = true and link current activity to dispense*/
            insertedId = result[0].data._id;
            stockDispense = result[0].data;

            medications.forEach( ( medication ) => {
                medication.activities.push( insertedId );
                medication.isDispensed = true;
            } );

            [err] = await formatPromiseResult( doTransitionP( {
                user,
                data: {
                    activity: stockDispense,
                    transition: "approve",
                    _isTest: 'false'
                }
            } ) );

            if( err ) {
                Y.log( `createDispense: Failed to approve STOCKDISPENSE: ${err}`, 'error', NAME );
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( "18031" ),
                    null,
                    callback
                );
            }

            /*Reduce ware count in instock*/

            [err] = await formatPromiseResult(
                Y.doccirrus.api.instockrequest.reduceWaresCount( {
                    user,
                    data: {
                        waresToReduce: wares,
                        locationId: stockDispense.locationId
                    }
                } )
            );

            if( err ) {
                Y.log( `createDispense: Failed to reduce wareCount: ${err.stack || err}`, 'error', NAME );
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( "18034" ),
                    null,
                    callback
                );
            }

            let medicationsPromises = [];
            medications.forEach( medication => {
                medicationsPromises.push( doTransitionP( {
                    user,
                    data: {
                        activity: medication,
                        transition: "dispense",
                        _isTest: 'false'
                    }
                } ) );
            } );

            [err] = await formatPromiseResult( Promise.all( medicationsPromises ) );

            if( err ) {
                Y.log( `createDispense: Failed to do transition "dispense" medication: ${err.stack || err}`, 'error', NAME );
            }

            return handleResult( err, result, callback );
        }

        /**
         * Attach to activity a "medication-label" form and generate PDF
         * @param {Object} args
         * */
        async function printLabel( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.printLabel', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.printLabel' );
            }
            const {user, callback} = args,
                makepdfwsP = promisifyArgsCallback( Y.doccirrus.api.formtemplate.makepdfws );
            let err, result, printServer, {medications = []} = args.data;

            for( let medication of medications ) { //eslint-disable-line no-unused-vars
                [err, printServer] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.formprinter.getPrinterServer(
                            user,
                            medication.formId,
                            medication.locationId,
                            function( err, res ) {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( res );
                            } );
                    } )
                );

                if( err ) {
                    Y.log( `printLabel: cannot get printer for medication: ${err}`, 'error', NAME );
                }

                if( !printServer ) {
                    Y.log( `printers not awalable, continue without print`, 'warn', NAME );
                }

                [err, result] = await formatPromiseResult(
                    makepdfwsP( {
                        user: user,
                        originalParams: {
                            formId: medication.formId,
                            formVersionId: medication.formVersion,
                            mapCollection: "activity",
                            mapObject: medication._id,
                            serialRender: "true",
                            printTo: printServer || null
                        }
                    } )
                );

                if( err ) {
                    Y.log( `Failed to update medication: ${err}`, 'error', NAME );
                    return handleResult(
                        new Y.doccirrus.commonerrors.DCError( '18030' ),
                        null,
                        callback
                    );
                }
            }

            return handleResult( err, result, callback );
        }

        /**
         * Increment printCount field and updates content for activity
         *  @param {Object} args
         *  @param {Number} args.originalParams.numCopies          number of copies to print
         *  @param {Array} args.originalParams.activityIds          array of activity ids
         * */
        async function incrementPrintCount( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.incrementPrintCount', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.incrementPrintCount' );
            }

            const activityIds = args.originalParams.activityIds,
                // mediaId = args.originalParams.mediaId,
                numCopies = args.originalParams.numCopies || 1;

            async.eachSeries( activityIds, updateActivityPrintCount, onAllDone );

            async function updateActivityPrintCount( activityId, itcb ) {
                let err, results, result;

                [err, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'get',
                        model: 'activity',
                        query: {_id: activityId},
                        options: {select: {printCount: 1}}
                    } )
                );

                if( err ) {
                    Y.log( `updateActivityPrintCount: error on getting activity ${activityId}: ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }
                if( results && results.length ) {
                    let printCountNewValue = results[0].printCount ? results[0].printCount + numCopies : numCopies;

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            action: 'update',
                            model: 'activity',
                            query: {_id: activityId},
                            data: {$set: {printCount: printCountNewValue}}
                        } )
                    );

                    if( err ) {
                        Y.log( `updateActivityPrintCount: error on updating activity ${activityId}: ${err.stack || err}`, 'error', NAME );
                    }

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        event: 'activityPrinted'
                    } );

                    // itcb( null );

                    if( result ) {
                        postAuditLog( activityId, itcb );
                    }

                    itcb( null );
                }

                async function postAuditLog( activityId ) {
                    let err, result, auditEntry, actId;

                    actId = Array.isArray( activityId ) ? activityId[0] : activityId;
                    auditEntry = Y.doccirrus.api.audit.getBasicEntry( args.user );
                    auditEntry = {
                        ...auditEntry,
                        model: "document",
                        action: "print",
                        skipcheck_: true
                    };

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                _id: ObjectId( actId )
                            },
                            options: {
                                limit: 1,
                                select: {
                                    content: 1,
                                    patientLastName: 1,
                                    patientFirstName: 1
                                }
                            }
                        } )
                    );

                    if( result ) {
                        result = result[0] ? result[0] : result;
                        auditEntry.descr = '';
                        auditEntry.descr += result.patientLastName ? result.patientLastName + ', ' : '';
                        auditEntry.descr += result.patientFirstName ? result.patientFirstName + ', ' : '';
                        auditEntry.descr += result.content ? result.content : '';
                        auditEntry.objId = actId;

                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'audit',
                                action: 'post',
                                data: auditEntry
                            } )
                        );

                        if( err ) {
                            Y.log( `Problem writing audit log for activity printed: for ${actId}: ${err.stack || err}`, 'error', NAME );
                        }
                    }

                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if( err ) {
                    Y.log( `Problem updating activity printCount: ${err.stack || err}`, 'warn', NAME );
                }

                return handleResult( err, null, args.callback );
            }
        }

        async function getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments( args ) {
            Y.log( 'Entering Y.doccirrus.api.diagnosis.getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.diagnosis.getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments' );
            }
            const
                query = args.originalParams || {},
                patientId = query.patientId || {},
                caseFolderId = query.caseFolderId || {},
                locationId = query.locationId || {},
                activityTimestamp = moment( query.timestamp ) || {},
                endDate = moment( query.timestamp ).endOf( 'day' ).toISOString() || {},
                startDate = moment( query.timestamp ).startOf( 'day' ).toISOString() || {};

            if( !patientId || !caseFolderId || !locationId || !query.timestamp ) {
                return args.callback( new Error( 'insufficient arguments' ) );
            }

            const [err, activities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'activity',
                    query: {
                        actType: {
                            $in: ['DIAGNOSIS', 'TREATMENT']
                        },
                        caseFolderId: caseFolderId,
                        locationId: locationId,
                        patientId: patientId,
                        timestamp: {
                            $gte: startDate,
                            $lte: endDate
                        },
                        status: {$ne: 'CANCELLED'},
                        diagnosisTreatmentRelevance: {$ne: 'DOKUMENTATIV'}
                    }
                } )
            );

            if( err ) {
                Y.log( `Problem loading activity from patient ${patientId} from database: ${JSON.stringify( err )}`, 'warn', NAME );
                return args.callback( err );
            }

            if( activities && Array.isArray( activities ) && activities.length > 0 ) {
                const resultContainsTreatments = activities.find( elem => elem.actType === 'TREATMENT' );
                let diagnosisArray = [];

                if( !resultContainsTreatments ) {
                    return args.callback( null, activities );
                }

                for( let i = 0; i < activities.length; i++ ) {
                    if( activities[i].actType === 'TREATMENT' && activities[i].daySeparation && moment( activities[i].timestamp ).isBefore( activityTimestamp ) ) {
                        diagnosisArray = [];
                    } else if( activities[i].actType === 'DIAGNOSIS' ) {
                        diagnosisArray.push( activities[i] );
                    } else if( activities[i].actType === 'TREATMENT' && activities[i].daySeparation && moment( activities[i].timestamp ).isAfter( activityTimestamp ) ) {
                        break;
                    }
                }
                return args.callback( null, diagnosisArray );
            } else {
                return args.callback( null, [] );
            }
        }

        /**
         *  Dev / support route to run migration to set missing form versions on activities
         *  @param args
         */

        function addMissingFormVersions( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addMissingFormVersions( args.user, false, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem in migration to set missing form versions: ${err.stack || err}`, 'warn', NAME );
                }
            }

            //  call back immediately
            args.callback( null, {'status': 'Started migration to set missing form versions in activities.'} );
        }

        /**
         *  Dev / support route to run migration to ad insurane names ot invoices, EXTMOJ-2235
         *  @param args
         */

        function addInsuranceNamesToInvoices( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addInsuranceNamesToInvoices( args.user, false, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem in migration to set insurance names on invoices: ${err.stack || err}`, 'warn', NAME );
                }
            }

            //  call back immediately
            args.callback( null, {'status': 'Started migration to add insurance company names to invoices.'} );
        }

        /**
         * Method tries first doTransition if it is failed then update activity with status CREATED without mongoose validation
         * @method activitiesLockUnlock
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} args.data.activities          list of activities to process
         * @param {String} args.data.operation          operation to execute on activities: lock|unlock
         * @param {Function} args.callback
         * @returns {Function} callback
         */
        async function activitiesLockUnlock( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.activitiesLockUnlock', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.activitiesLockUnlock' );
            }
            const
                {user, data: {activities: activitiesIds = [], operation}, callback} = args,
                DUMMY_VALUE = '***',
                getModel = util.promisify( Y.doccirrus.mongodb.getModel ),
                triggerRuleEngineOnDelete = util.promisify( Y.doccirrus.schemaprocess.activity.standalone.triggerRuleEngineOnDelete );

            Y.log( `activitiesLockUnlock: ${user.specifiedBy}(${user.U}) try ${operation} ${activitiesIds}`, 'debug', NAME );

            if( !activitiesIds.length ) {
                Y.log( 'activitiesLockUnlock: activities list is empty', 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'activities list is empty'} ), null, callback );
            }
            if( !['lock', 'unlock'].includes( operation ) ) {
                Y.log( 'activitiesLockUnlock: operation is not defined', 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'operation is not defined'} ), null, callback );
            }

            let [err, model] = await formatPromiseResult(
                getModel( user, 'activity', false )
            );
            if( err ) {
                Y.log( `activitiesLockUnlock: Error getting activity model: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( operation === 'lock' ) {
                let activities;
                [err, activities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: {$in: activitiesIds},
                            status: {$ne: 'LOCKED'}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `activitiesLockUnlock: Error getting activities ${activitiesIds}: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                let logs;
                [err, logs] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'audit',
                        action: 'get',
                        query: {
                            objId: {$in: activitiesIds},
                            model: 'activity'
                        }
                    } )
                );
                if( err ) {
                    Y.log( `activitiesLockUnlock: Error getting audit logs for objId ${activitiesIds}: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                let errorsPostingLocked = [];

                for( let activity of activities ) { //eslint-disable-line no-unused-vars
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'lockedactivity',
                            action: 'upsert',
                            fields: ['data', 'logs', 'employeeId'],
                            query: {
                                _id: activity._id
                            },
                            data: {
                                data: activity,
                                logs: logs.filter( el => el.objId === activity._id.toString() ),
                                employeeId: user.specifiedBy,
                                skipcheck_: true
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error upserting original activity ${activity._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }

                    [err] = await formatPromiseResult(
                        model.mongoose.remove( {_id: activity._id} ).exec()
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error removing original activity ${activity._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }

                    [err] = await formatPromiseResult(
                        triggerRuleEngineOnDelete( user, activity )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error triggering rule engine on delete for ${activity._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }

                    //TODO: delete other collections audits, reportings ??

                    let
                        newData = Object.assign( {userContent: `(${user.U}) ${DUMMY_VALUE}`, status: 'LOCKED'},
                            _.pick( activity, [
                                '_id', 'patientId', 'caseFolderId', 'locationId', 'employeeId', 'timestamp', 'actType', 'referencedBy',
                                'attachments', 'activities', 'countryMode', 'icds', 'icdsExtra', 'autoGenID', 'attachedMedia'] ) );
                    //TODO: add all needed technical fields like activities, attachments, etc.

                    switch( activity.actType ) {
                        case 'MEDICATION':
                            newData = {...newData, phNLabel: DUMMY_VALUE};
                            break;
                        case 'DIAGNOSIS':
                            newData = {...newData, diagnosisCert: 'EXCLUDE'};
                            break;
                        case 'TREATMENT':
                            newData = {...newData, catalogShort: DUMMY_VALUE};
                            break;
                        case 'SCHEIN':
                            newData = {
                                ...newData,
                                scheinQuarter: DUMMY_VALUE,
                                scheinYear: DUMMY_VALUE,
                                scheinType: DUMMY_VALUE,
                                scheinSubgroup: DUMMY_VALUE
                            };
                            break;
                        case 'LABREQUEST':
                            newData = {...newData, scheinSlipMedicalTreatment: 1}; //enum value "Kurativ", just selected first non empty
                            break;
                    }

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: {...newData, skipcheck_: true},
                            context: {
                                _skipTriggerRules: true
                            },
                            noAudit: true
                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error posting locked activity ${activity._id}: ${err.stack || err}`, 'error', NAME );

                        errorsPostingLocked.push( err );

                        //post back original activity to not lose data
                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'post',
                                data: {...activity, skipcheck_: true},
                                noAudit: true
                            } )
                        );
                        if( err ) {
                            Y.log( `activitiesLockUnlock: Error posting back original activity ${activity._id}: ${err.stack || err}`, 'error', NAME );
                        }

                        continue;
                    }

                    //in advance remove reporting faster
                    [err] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            Y.doccirrus.api.reporting.reportingDBaction( {
                                user,
                                action: 'delete',
                                query: {
                                    activityId: activity._id
                                },
                                options: {
                                    override: true
                                },
                                callback: ( err ) => {
                                    if( err ) {
                                        reject( err );
                                    }
                                    resolve();
                                }
                            } );
                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error removing reporting for activity ${activity._id}: ${err.stack || err}`, 'error', NAME );
                    }

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'audit',
                            action: 'delete',
                            query: {
                                objId: activity._id,
                                model: 'activity'
                            },
                            options: {
                                override: true
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error removing audit logs for activity ${activity._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }

                    let
                        text = `${Y.doccirrus.i18n( 'activity-schema.Activity_E.' + activity.actType )} (${activity.patientFirstName} ${activity.patientLastName})`,
                        auditEntry = Y.doccirrus.api.audit.getBasicEntry( user, 'lock', 'activity', text );

                    auditEntry = {...auditEntry, objId: activity._id, actType: activity.actType, skipcheck_: true};

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'audit',
                            action: 'post',
                            data: auditEntry
                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error posting audit for action lock for ${activity._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }
                }
                handleResult( errorsPostingLocked.length ? errorsPostingLocked : null, null, callback );
            }

            if( operation === 'unlock' ) {
                let [err, lockedactivities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'lockedactivity',
                        action: 'get',
                        query: {
                            _id: {$in: activitiesIds}
                        }
                    } )
                );
                if( err ) {
                    Y.log( `activitiesLockUnlock: Error getting locked activities ${activitiesIds}: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                let isAdmin = Y.doccirrus.auth.isAdminUser( user );

                for( let lockedactivity of lockedactivities ) { //eslint-disable-line no-unused-vars
                    if( !isAdmin && lockedactivity.employeeId !== user.specifiedBy ) {
                        Y.log( `activitiesLockUnlock: Not Admin user ${user.specifiedBy}(${user.U}) try to unlock another's activity locked by ${lockedactivity.employeeId}`, 'warn', NAME );
                        continue;
                    }

                    let removedActivity;
                    [err, removedActivity] = await formatPromiseResult(
                        model.mongoose.collection.findOneAndDelete( {_id: lockedactivity._id} )
                    );

                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error removing locked activity ${lockedactivity._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }
                    removedActivity = removedActivity && removedActivity.value;

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: {...lockedactivity.data, referencedBy: removedActivity.referencedBy, skipcheck_: true},
                            noAudit: true

                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error posting unlocked activity ${lockedactivity._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }

                    Y.log( `activitiesLockUnlock: activity ${lockedactivity._id} successfully unlocked`, 'info', NAME );

                    if( lockedactivity.logs && lockedactivity.logs.length ) {
                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'audit',
                                action: 'post',
                                data: Y.doccirrus.filters.cleanDbObject( lockedactivity.logs )
                            } )
                        );
                        if( err ) {
                            Y.log( `activitiesLockUnlock: Error recovering audit logs for activity ${lockedactivity._id}: ${err.stack || err}`, 'error', NAME );
                            continue;
                        }
                    }

                    let
                        text = `${Y.doccirrus.i18n( 'activity-schema.Activity_E.' + lockedactivity.data.actType )} (${lockedactivity.data.patientFirstName} ${lockedactivity.data.patientLastName})`,
                        auditEntry = Y.doccirrus.api.audit.getBasicEntry( user, 'unlock', 'activity', text );

                    auditEntry = {
                        ...auditEntry,
                        objId: lockedactivity.data._id,
                        actType: lockedactivity.data.actType,
                        skipcheck_: true
                    };

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'audit',
                            action: 'post',
                            data: auditEntry
                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error posting audit for action unlock for ${lockedactivity.data._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'lockedactivity',
                            action: 'delete',
                            query: {
                                _id: lockedactivity._id
                            },
                            options: {
                                override: true
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `activitiesLockUnlock: Error on clenup locked activity entry for ${lockedactivity.data._id}: ${err.stack || err}`, 'error', NAME );
                        continue;
                    }
                }
                handleResult( null, null, callback );
            }
        }

        function waitForETSArrangementCodeDelivery( args ) {
            function sleep( ms ) {
                return new Promise( resolve => setTimeout( resolve, ms ) );
            }

            function errorsToString( errors ) {
                if( !Array.isArray( errors ) || !errors.length ) {
                    return;
                }
                return errors.map( error => 'Ein Fehler ist aufgetreten: ' + (error.code ? `(${error.code}) ` : '') + error.message )[0];
            }

            const getKvcMessages = promisifyArgsCallback( Y.doccirrus.api.kvcmessage.get );

            Y.log( `waitForETSArrangementCodeDelivery: waiting for reply to messageId ${args.eTSArrangementCodeRequestMessageId}`, 'info', NAME );

            const {user} = args;

            const WAIT_FOR = 1000; // debatable
            const MAX_RETRIES = 10;
            let nRetries = 0;

            async function fetchKVCMessages() {
                let foundMessage;

                await sleep( WAIT_FOR );

                if( MAX_RETRIES <= nRetries ) {
                    Y.log( `waitForETSArrangementCodeDelivery: max retries (${MAX_RETRIES}) reached while fetching eTS kvconnect messages: report error to the user`, 'warn', NAME );
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'eTS-ARRANGEMENT-CODE-DELIVERY',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                        msg: {
                            data: {
                                eTSArrangementCodeDeliveryOriginalMessageId: args.eTSArrangementCodeRequestMessageId,
                                eTSAErrorMessage: 'Der Anwort konnte nicht in der vorgegebenen Zeit empfangen werden! Versuchen Sie es erneut.'
                            }
                        }
                    } );

                    return;
                }

                let [err] = await formatPromiseResult( Y.doccirrus.kvconnect.fetchNewMessages( {
                    user,
                    options: {
                        onlyServiceTypes: ['ETS'] // TODO: also filter by account !!!!
                    }
                } ) );

                if( err ) {
                    Y.log( `waitForETSArrangementCodeDelivery: an unexpected error occured while fetching eTS kvconnect messages: ${nRetries} of max. ${MAX_RETRIES} retries`, 'warn', NAME );
                } else {
                    await sleep( WAIT_FOR );
                    let result;
                    [err, result] = await formatPromiseResult( getKvcMessages( {
                        user,
                        query: {
                            messageStatus: 'PROCESSED',
                            originalMessageId: args.eTSArrangementCodeRequestMessageId
                        }
                    } ) );

                    if( err ) {
                        Y.log( `waitForETSArrangementCodeDelivery: an unexpected error occured while getting kvcmessages by originalMessageId: ${args.eTSArrangementCodeRequestMessageId}: ${nRetries} of max. ${MAX_RETRIES} retries`, 'warn', NAME );
                    } else if( result && result[0] ) {
                        foundMessage = result && result[0];

                    } else {
                        Y.log( `waitForETSArrangementCodeDelivery: kvcmessages not found by originalMessageId: ${args.eTSArrangementCodeRequestMessageId}: ${nRetries} of max. ${MAX_RETRIES} retries`, 'warn', NAME );
                    }
                }

                if( foundMessage ) {
                    Y.log( `waitForETSArrangementCodeDelivery: kvcmessages found by originalMessageId: ${args.eTSArrangementCodeRequestMessageId}: ${nRetries} of max. ${MAX_RETRIES} retries`, 'info', NAME );

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'eTS-ARRANGEMENT-CODE-DELIVERY',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                        msg: {
                            data: {
                                eTSArrangementCodeDeliveryOriginalMessageId: foundMessage.originalMessageId,
                                eTSArrangementCode: (foundMessage.extra || {}).arrangementCode,
                                eTSAErrorMessage: errorsToString( foundMessage._errors )
                            }
                        }
                    } );

                    return;
                }

                nRetries++;

                fetchKVCMessages();
            }

            fetchKVCMessages();
        }

        /**
         * Request an arrangement code for Form 06 and PTV 11 via kvconnect.
         * @param {Object} args
         */
        async function requestETSArrangementCode( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.requestETSArrangementCode', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.requestETSArrangementCode' );
            }

            const {user, originalParams, callback} = args;

            let [err, kvcAccount] = await formatPromiseResult( Y.doccirrus.api.kvcaccount.getAccount( {
                user,
                locationId: originalParams.locationId
            } ) );

            if( err ) {
                Y.log( `could not get kvcaccount for locationId ${originalParams.locationId} to request arrangement code: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let message;
            [err, message] = await formatPromiseResult( Y.doccirrus.kvconnect.service.eTS.sendArrangementCodeRequest( {
                user,
                formType: originalParams.formType,
                username: kvcAccount.username,
                bsnr: originalParams.bsnr,
                lanr: originalParams.lanr,
                urgency: originalParams.urgency,
                specialities: originalParams.specialities,
                specialitiesCodeSystem: originalParams.specialitiesCodeSystem,
                additionalQualifications: originalParams.additionalQualifications,
                ambulantePsychotherapeutischeAkutbehandlung: originalParams.ambulantePsychotherapeutischeAkutbehandlung,
                ambulantePsychoTherapie: originalParams.ambulantePsychoTherapie,
                zeitnahErforderlich: originalParams.zeitnahErforderlich,
                analytischePsychotherapie: originalParams.analytischePsychotherapie,
                tiefenpsychologischFundiertePsychotherapie: originalParams.tiefenpsychologischFundiertePsychotherapie,
                verhaltenstherapie: originalParams.verhaltenstherapie
            } ) );

            if( err ) {
                Y.log( `could not request arrangement code: ${err.stack || err}`, 'warn', NAME );
                if( err.error && err.error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ) {
                    err = Y.doccirrus.errors.rest( 2113, err.message );
                } else if( err.error && err.error.code === 'CERT_HAS_EXPIRED' ) {
                    err = Y.doccirrus.errors.rest( 2114, err.message );
                }
                return handleResult( err, undefined, callback );
            }

            const result = {eTSArrangementCodeRequestMessageId: message.messageId}; // TODO: eTS kvcAccount name query???

            waitForETSArrangementCodeDelivery( {user, ...result} );
            return handleResult( undefined, result, callback );
        }

        /**
         * handleMedications save medications from catalog as activities
         * @param {Object} args
         * @param {Object} args.medication
         * @param {String} args.data.employeeId
         * @param {String} args.data.locationId
         * @param {String} args.data.patientId
         * @param {String} args.data.caseFolderId
         * @param {Object}  args.data.timestamp
         * @returns {Promise.<*>}
         */
        async function handleMedications( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.handleMedications', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.handleMedications' );
            }

            const {user, callback, data: {medications, timestamp, locationId, employeeId, caseFolderId, patientId, caseFolderType}} = args,
                createActivitySafeP = promisifyArgsCallback( createActivitySafe ),
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity ),
                now = moment(),
                startDate = moment( timestamp );

            startDate.hours( now.hours() ).minutes( now.minutes() ).subtract( 3, 's' );

            let
                medicationList = [], err, actId, result, formId;

            medications.forEach( medication => {
                const
                    count = Number( medication.count );
                if( count ) {
                    for( let i = 1; i <= count; i++ ) {
                        medicationList.push( Object.assign( {}, medication ) );
                    }
                } else {
                    medicationList.push( medication );
                }
            } );

            [err, formId] = await formatPromiseResult(
                Y.doccirrus.formsconfig.getFormIdForActivityType( {
                    user,
                    data: {
                        actType: "MEDICATION",
                        caseFolderType
                    }
                } )
            );

            if( err ) {
                Y.log( `handleMedications: failed to get formId, formId will be assigned as empty`, 'warn', NAME );
                formId = "";
            }

            medicationList.forEach( medication => {
                medication.actType = 'MEDICATION';
                medication.status = 'CREATED';
                medication.locationId = locationId;
                medication.employeeId = employeeId;
                medication.caseFolderId = caseFolderId;
                medication.patientId = patientId;
                medication.formId = formId;
                medication.timestamp = startDate.toISOString();
            } );

            let newActivitiesIds = [];
            for( let medication of medicationList ) { //eslint-disable-line no-unused-vars
                [err, actId] = await formatPromiseResult( createActivitySafeP( {
                    user,
                    data: medication
                } ) );

                if( err ) {
                    Y.log( `handleMedications: Failed to save medication ${medication}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                if( formId ) {
                    [err] = await formatPromiseResult( initializeFormForActivityP( user, actId, {}, null ) );

                    if( err ) {
                        Y.log( `handleMedications: Failed to initialize form fro activity ${actId}`, 'error', NAME );
                    }
                }
                newActivitiesIds.push( actId );
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'activity',
                query: {_id: {$in: newActivitiesIds}}
            } ) );

            if( err ) {
                Y.log( `handleMedications: Failed to get medications ids ${newActivitiesIds}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            return handleResult( null, result, callback );
        }

        /**
         * Creates a simple activity and returns the ID
         * 0. if locationId is not passed, it adds locationId from latest activity with locationId
         * 1. if employeeId is missing and locationId exists, it adds it from the latest schein
         * 2. if employeeId is missing, it adds it from the patient insuranceStatus that matching the active casefolder type
         * 3. if both employeeId and locationId are missing, it uses mainLocationId and gets an active physician
         * 4. if employeeName is missing, it gets it from the employee using the employeeId
         * 4.2 if locationId is missing, it adds the location from the employee
         * 5. creates new activity
         *
         * @param {Object} args
         * @param {Object} args.originalParams.activeCaseFolder
         * @param {Object} args.originalParams.activityData
         * @param {String} [args.originalParams.activityData.employeeId]
         * @param {Date} args.originalParams.activityData.timestamp
         * @param {String} args.originalParams.activityData.patientId
         * @param {String} args.originalParams.activityData.caseFolderId
         * @param {String} [args.originalParams.activityData.locationId]
         * @param {String} [args.originalParams.activityData.employeeName]
         * @param {String} [args.originalParams.activityData.userContent]
         * @param {String} args.originalParams.activityData.actType
         * @param {Object} args.user
         * @param {Function} args.callback
         * @returns {Promise.<String>} activityId
         */
        async function createSimpleActivity( args ) {
            Y.log( 'Executing createSimpleActivity', 'info', NAME );
            const {
                    originalParams: {
                        activityData,
                        activeCaseFolder
                    },
                    user,
                    callback
                } = args,
                getLastScheinPromise = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein );

            let err, lastSchein, patient, insuranceData, lastActivity, simpleActivityId, employee;

            if( !activityData.patientId ) {
                err = 'createSimpleActivity: patientId not found in activityData';
                Y.log( err, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: err} ), undefined, callback );
            }

            /* step 0: add locationId from latest activity if missing */

            if( !activityData.locationId ) {
                Y.log( 'createSimpleActivity: locationId not present - getting it from latest activity', 'debug', NAME );

                [err, lastActivity] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        action: 'get',
                        user,
                        query: {
                            patientId: activityData.patientId,
                            caseFolderId: activityData.caseFolderId,
                            $and: [
                                {locationId: {$exists: true}},
                                {locationId: {$type: 'objectId'}}
                            ]
                        },
                        options: {
                            sort: {
                                timestamp: -1
                            },
                            limit: 1,
                            fields: {locationId: 1},
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `createSimpleActivity, could not get latest activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
                }

                if( lastActivity && lastActivity.length ) {
                    activityData.locationId = lastActivity[0].locationId.toString();
                }
            }

            /* step 1: add employeeId from last schein if missing */

            if( !activityData.employeeId && activityData.locationId ) {
                Y.log( 'createSimpleActivity: employeeId not present - getting it from last schein', 'debug', NAME );

                [err, lastSchein] = await formatPromiseResult(
                    getLastScheinPromise( {
                        user,
                        query: {
                            timestamp: activityData.timestamp,
                            patientId: activityData.patientId,
                            caseFolderId: activityData.caseFolderId,
                            locationId: activityData.locationId
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `createSimpleActivity, could not get last Schein: ${err.stack || err}`, 'error', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
                }

                if( lastSchein && lastSchein.length ) {
                    activityData.employeeId = lastSchein[0].employeeId;
                }
            }

            /* step 2: add employeeId and locationId from insuranceStatus if missing */

            if( !activityData.employeeId ) {
                Y.log( 'createSimpleActivity: employeeId not present - getting it from patient insuranceStatus', 'debug', NAME );

                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        model: 'patient',
                        action: 'get',
                        user,
                        query: {
                            _id: activityData.patientId,
                            insuranceStatus: {
                                $elemMatch: {
                                    type: activeCaseFolder.type,
                                    employeeId: {$exists: true}
                                }
                            }
                        },
                        options: {
                            fields: {insuranceStatus: 1},
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `createSimpleActivity, could not get patient: ${err.stack || err}`, 'error', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
                }

                if( patient && patient.length ) {
                    Y.log( 'createSimpleActivity: adding employeeId and locationId from insuranceStatus', 'info', NAME );
                    insuranceData = patient[0].insuranceStatus.find( ( entry ) => (entry.type === activeCaseFolder.type && entry.employeeId) );
                    activityData.employeeId = insuranceData.employeeId;
                    activityData.locationId = insuranceData.locationId;
                }
            }

            /* step 3: get employee from location if both missing */

            if( !activityData.employeeId && !activityData.locationId ) {
                const mainLocationId = Y.doccirrus.schemas.location.getMainLocationId();
                [err, employee] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        model: 'employee',
                        action: 'get',
                        user,
                        query: {
                            'locations._id': mainLocationId,
                            type: 'PHYSICIAN',
                            status: 'ACTIVE'
                        },
                        options: {
                            fields: {firstname: 1, lastname: 1},
                            lean: true,
                            limit: 1
                        }
                    } )
                );

                if( err ) {
                    Y.log( `createSimpleActivity, could not get employees location ${activityData.locationId}: ${err.stack || err}`, 'error', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
                }

                if( employee && employee.length ) {
                    activityData.locationId = mainLocationId;
                    activityData.employeeId = employee[0]._id;
                    activityData.employeeName = `${employee[0].lastname}, ${employee[0].firstname}`;
                }
            }

            if( !activityData.employeeId ) {
                err = `createSimpleActivity, could not find employee`;
                Y.log( err, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
            }

            /* step 4: get employeeName if missing */

            if( !activityData.employeeName ) {
                Y.log( `createSimpleActivity: employeeName not present - getting it for employee ${activityData.employeeId}`, 'debug', NAME );

                [err, employee] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        model: 'employee',
                        action: 'get',
                        user,
                        query: {
                            _id: activityData.employeeId
                        },
                        options: {
                            fields: {lastname: 1, firstname: 1, locations: 1},
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `createSimpleActivity, could not get employee data for ${activityData.employeeId}: ${err.stack || err}`, 'error', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
                }

                if( !employee || !employee.length ) {
                    err = `createSimpleActivity, could not get employee data for ${activityData.employeeId}: result from employee.find came back empty`;
                    Y.log( err, 'error', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
                }

                activityData.employeeName = `${employee[0].lastname}, ${employee[0].firstname}`;

                /* step 4.2: add locationId from employee if still missing */

                if( !activityData.locationId && employee[0].locations.length ) {
                    activityData.locationId = employee[0].locations[0]._id;
                }
            }

            /* step 5: create the simple activity */

            Y.log( `createSimpleActivity: creating new activity ${activityData.actType} for ` +
                   `patient ${activityData.patientId} location ${activityData.locationId} with ` +
                   `employee ${activityData.employeeId}`, 'info', NAME );

            [err, simpleActivityId] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( activityData )
                } )
            );

            if( err ) {
                Y.log( `createSimpleActivity, could not create Activity: ${err.stack || err}`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
            }

            if( !simpleActivityId || !simpleActivityId.length ) {
                err = 'createSimpleActivity, could not create Activity: result from POST came back empty';
                Y.log( err, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: err} ), undefined, callback );
            }

            Y.log( `createSimpleActivity: new activity created ${simpleActivityId[0]}`, 'info', NAME );

            return handleResult( undefined, simpleActivityId[0], callback );
        }

        /**
         * Create Simple Activity and attach existing PDF to it
         * @param {Object} args
         * @param {Object} args.originalParams
         * @param {Object} args.originalParams.params
         * @param {Object} args.originalParams.activityData
         * @param {String} [args.originalParams.activityData.employeeId]
         * @param {Date} args.originalParams.activityData.timestamp
         * @param {String} args.originalParams.activityData.patientId
         * @param {String} args.originalParams.activityData.caseFolderId
         * @param {String} args.originalParams.activityData.locationId
         * @param {String} args.originalParams.activityData.userContent
         * @param {String} args.originalParams.activityData.actType
         * @param {Object} args.user
         * @param {Function} args.callback
         * @returns {Promise.<String>} activityId
         */
        async function createSimpleActivityWithAttachedPDF( args ) {
            let {
                originalParams: {
                    params,
                    activityData
                },
                user,
                callback
            } = args;

            const
                importMediaFromFileP = util.promisify( Y.doccirrus.media.importMediaFromFile ),
                createDocumentFromMediaP = util.promisify( Y.doccirrus.api.document.createDocumentFromMedia ),
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity ),
                getDefaultUserContentP = util.promisify( Y.doccirrus.api.activitysettings.getDefaultUserContent ),
                getLastScheinPromise = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein ),
                cacheDir = Y.doccirrus.media.getCacheDir();

            const fullString = `${cacheDir}${params.documentFileName}`;
            const trustedPathtoPDF = Y.doccirrus.media.pathIsInDir( fullString, cacheDir );

            // 0. Step: Last Schein
            let err;
            if( !activityData.employeeId ) {
                let lastSchein;
                [err, lastSchein] = await formatPromiseResult(
                    getLastScheinPromise( {
                        user: user,
                        query: {
                            timestamp: activityData.timestamp,
                            patientId: activityData.patientId,
                            caseFolderId: activityData.caseFolderId,
                            locationId: activityData.locationId
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `createSimpleActivityWithAttachedPDF, could not get last Schein: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }
                if( lastSchein && lastSchein.length ) {
                    activityData.employeeId = lastSchein[0].employeeId;
                }
            }

            // 1. Step: Save media(PDF) to gridfs
            let mediaObject;
            [err, mediaObject] = await formatPromiseResult(
                importMediaFromFileP( user, trustedPathtoPDF, 'activity', '', params.documentFileName, 'user', 'PDF' )
            );

            if( err ) {
                Y.log( `createSimpleActivityWithAttachedPDF, could not import Media from file: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            // 2. Step: Lookup default Activity.content
            let defaultUserContent;
            if( !activityData.userContent ) {
                [err, defaultUserContent] = await formatPromiseResult(
                    getDefaultUserContentP( user, activityData.actType )
                );

                if( err ) {
                    Y.log( `createSimpleActivityWithAttachedPDF, could not get default userContent for Activity: ${err.stack || err}`, 'error', NAME );
                }
                if( defaultUserContent ) {
                    activityData.userContent = defaultUserContent;
                }
            }

            // 3. Step: Create SimpleActivity from params passed from client
            let simpleActivity;
            [err, simpleActivity] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( activityData )
                } )
            );

            if( err ) {
                Y.log( `createSimpleActivityWithAttachedPDF, could not create Activity: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }
            if( simpleActivity && simpleActivity.length ) {
                [err, simpleActivity] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: simpleActivity[0]
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `createSimpleActivityWithAttachedPDF, could not get just created Activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            //Update media with ownerId
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'media',
                    action: 'update',
                    query: {
                        _id: mediaObject._id
                    },
                    data: {
                        ownerId: simpleActivity[0]._id.toString()
                    }
                } )
            );

            if( err ) {
                Y.log( `createSimpleActivityWithAttachedPDF, could not update media ownerId: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            // 4. Step: Create Document from Media
            [err] = await formatPromiseResult(
                createDocumentFromMediaP(
                    simpleActivity[0],
                    {
                        canonicalId: params.formId,
                        user: user,
                        type: 'OTHER',
                        caption: mediaObject.name
                    },
                    mediaObject._id
                )
            );

            if( err ) {
                Y.log( `createSimpleActivityWithAttachedPDF, could not create Document from Media: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            // 5. Step: Initialize Form for Activity
            [err] = await formatPromiseResult(
                initializeFormForActivityP( user, simpleActivity[0]._id, undefined, null )
            );

            if( err ) {
                Y.log( `createSimpleActivityWithAttachedPDF, could not initialize Form for Activity: ${err.stack || err}`, 'info', NAME );
            }

            // 6. Step: Return new Activity.Id to client
            if( callback ) {
                return handleResult( undefined, simpleActivity[0]._id, callback );
            }
            return simpleActivity[0]._id;
        }

        /**
         * get next possible timestamp for copied activity
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.activity                    - new activity that will be saved
         * @param {String|Date} args.options.setTimestamp   - timestamp that should be set ( this function change time)
         * @param {Boolean} args.options.currentDate        - put activity into today
         *
         * @returns {Promise.<String|Date>}                 - new timestamp
         */
        async function getNextTimestamp( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getNextTimestamp', 'info', NAME );
            const {user, activity, options: {setTimestamp, currentDate}} = args;

            let inToday = (!setTimestamp && currentDate),
                query = {timestamp: {}, caseFolderId: activity.caseFolderId},
                ts;

            if( inToday ) {
                ts = moment();
                query.timestamp = {$gt: ts.startOf( 'day' ).toISOString()};
            } else {
                ts = moment( setTimestamp );
                query.timestamp = {$gt: ts.startOf( 'day' ).toISOString(), $lte: ts.endOf( 'day' ).toISOString()};
            }

            let [err, activities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query,
                    options: {
                        lean: true,
                        limit: 1,
                        sort: {
                            timestamp: -1
                        },
                        select: {timestamp: 1}
                    }
                } )
            );

            if( err ) {
                Y.log( `getNextTimestamp: error getting latest activity ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.activity.getNextTimestamp', 'info', NAME );
                throw(err);
            }

            let
                nextActivity = activities && activities[0],
                diff,
                timestampNext,
                timestampCurrent,
                tsSet = moment( setTimestamp ),
                newTimestamp;

            //  there may not be a next activity
            if( !nextActivity ) {
                if( !inToday && !setTimestamp ) {
                    //copy to today
                    newTimestamp = activity.timestamp;
                } else {
                    timestampNext = tsSet.clone().add( 55, 's' );
                    timestampCurrent = tsSet;
                }
            } else {
                tsSet = moment( nextActivity.timestamp );
                timestampNext = tsSet.clone().add( 55, 's' );
                if( !inToday && !setTimestamp ) {
                    newTimestamp = activity.timestamp;
                } else {
                    timestampCurrent = tsSet;
                }
            }

            if( !newTimestamp ) {
                let
                    now = moment();

                // we want to subtract a negative number, but it mustn't be smaller than
                // -50s

                diff = Math.max(
                    (timestampCurrent.diff( timestampNext ) / 2),
                    -50000
                );

                newTimestamp = timestampCurrent.subtract( diff, 'ms' );

                if( currentDate || newTimestamp.isAfter( now ) ) {
                    newTimestamp = now;
                }

                newTimestamp = newTimestamp.toISOString();
            }

            Y.log( 'Exiting Y.doccirrus.api.activity.getNextTimestamp', 'info', NAME );
            return newTimestamp;
        }

        async function evaluateBL( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.evaluateBL', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.evaluateBL' );
            }

            const {user, data, options = {}, callback} = args;
            const schein = data.schein;
            const fk4235Set = schein && schein.fk4235Set && schein.fk4235Set[0];

            if( !fk4235Set ) {
                Y.log( `evaluateBL: can not evaluate BL of ${schein && schein._id} because fk4235Set is empty`, 'debug', NAME );
                return handleResult( null, {ok: true}, callback );
            }

            const sumTreatments = ( sum, entry ) => sum + Number( entry.fk4246 || 0 );
            const maxTreatmentsOfInsuredPerson = fk4235Set.fk4252;
            const maxTreatmentsOfCareGiver = fk4235Set.fk4255;
            const pseudoGop = fk4235Set.pseudoGop;
            const finishedWithoutPseudoCode = fk4235Set.finishedWithoutPseudoCode;
            const scheinBlFinsihed = pseudoGop || finishedWithoutPseudoCode;
            const sumTreatmentsOfInsuredPerson = (fk4235Set.fk4244Set || []).reduce( sumTreatments, 0 );
            const sumTreatmentsOfCareGiver = (fk4235Set.fk4256Set || []).reduce( sumTreatments, 0 );

            // check if treatment amount is exceeded
            if(
                scheinBlFinsihed ||
                (!maxTreatmentsOfInsuredPerson || maxTreatmentsOfInsuredPerson > sumTreatmentsOfInsuredPerson) &&
                (!maxTreatmentsOfCareGiver || maxTreatmentsOfCareGiver > sumTreatmentsOfCareGiver)
            ) {
                return handleResult( null, {ok: true}, callback );
            }

            if( !options.silent ) {
                Y.log( `evaluateBL: notify user ${user.identityId} about missing pseudo gnrs for schein ${schein._id}`, 'info', NAME );
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    messageId: 'bl.notification',
                    event: 'message',
                    msg: {
                        data: Y.doccirrus.schemas.kbvlog.getBlPseudoGnrStatusMessage( 'KP2-965' )
                    },
                    meta: {
                        level: 'WARNING'
                    }
                } );
            }
            return handleResult( null, {ok: false}, callback );
        }

        async function checkRezidivProphylaxeCodes( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.checkRezidivProphylaxeCodes', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.checkRezidivProphylaxeCodes' );
            }
            const getLocationSet = promisifyArgsCallback( Y.doccirrus.api.location.getLocationSet );
            const {user, data, callback} = args;
            const activity = data.activity;
            // at the moment KBV does not provide structured data for KBV_ITA_AHEX_Codierungstabelle_PT_Rezidiv.pdf
            const rezidivProphylaxeCodes = [
                '35405R', '35405U', '35405Y', '35405Z', '35415R', '35415U', '35415Y', '35415Z', '35425R', '35425U', '35425Y', '35425Z', '35435R', '35435U', '35435Y', '35435Z', '35513R', '35513U', '35513X', '35513Y', '35514R', '35514U', '35514X', '35514Y', '35515R', '35515U', '35515X', '35515Y', '35516R', '35516U', '35516X', '35516Y', '35517R', '35517U', '35517X', '35517Y', '35518R', '35518U', '35518X', '35518Y', '35519R', '35519U', '35519X', '35519Y', '35533R', '35533U', '35534R', '35534U', '35535R', '35535U', '35536R', '35536U', '35537R', '35537U', '35538R', '35538U', '35539R', '35539U', '35553R', '35553U', '35553X', '35553Y', '35554R', '35554U', '35554X', '35554Y', '35555R', '35555U', '35555X', '35555Y', '35556R', '35556U', '35556X', '35556Y', '35557R', '35557U', '35557X', '35557Y', '35558R', '35558U', '35558X', '35558Y', '35559R', '35559U', '35559X', '35559Y', '35713R', '35713U', '35713X', '35713Y', '35714R', '35714U', '35714X', '35714Y', '35715R', '35715U', '35715X', '35715Y', '35716R', '35716U', '35716X', '35716Y', '35717R', '35717U', '35717X', '35717Y', '35718R', '35718U', '35718X', '35718Y', '35719R', '35719U', '35719X', '35719Y'
            ];
            const allowedStatus = ['VALID'];

            if( !activity || !allowedStatus.includes( activity.status ) || activity.catalogShort !== 'EBM' || !rezidivProphylaxeCodes.includes( activity.code ) ) {
                return handleResult( null, {ok: true}, callback );
            }

            // get all main + sub locations for a given location id

            let [err, results] = await formatPromiseResult( getLocationSet( {
                user,
                query: {
                    _id: activity.locationId
                },
                options: {
                    select: {
                        _id: 1
                    },
                    lean: true
                }
            } ) );

            if( err ) {
                Y.log( `checkRezidivProphylaxeCodes: could not get location set of location ${activity.locationId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const locationIds = results.map( location => location._id );

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    actType: 'SCHEIN',
                    status: {$nin: ['CANCELED']},
                    caseFolderId: activity.caseFolderId,
                    patientId: activity.patientId,
                    locationId: {$in: locationIds},
                    timestamp: {
                        $lte: activity.timestamp,
                        $gte: new Date( '2020-01-01T00:00:00.000Z' )
                    },
                    fk4235Set: {$exists: true, $not: {$size: 0}}
                }
            } ) );

            if( err ) {
                Y.log( `checkRezidivProphylaxeCodes: could not get last BL schein for treatment ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const lastBlSchein = results[0];

            if( !lastBlSchein ) {
                Y.log( `checkRezidivProphylaxeCodes: documented rezidiv prophylaxe code ${activity.code} but found no BL schein`, 'info', NAME );
                return handleResult( null, {ok: true}, callback );
            }

            const fk4235Set = lastBlSchein.fk4235Set && lastBlSchein.fk4235Set[0];
            const pseudoGop = fk4235Set.pseudoGop;
            const finishedWithoutPseudoCode = fk4235Set.finishedWithoutPseudoCode;

            if( finishedWithoutPseudoCode ) {
                Y.log( `checkRezidivProphylaxeCodes: documented rezidiv prophylaxe for treatment ${activity._id} and BL schein ${lastBlSchein._id} has finishedWithoutPseudoCode`, 'info', NAME );
                return handleResult( null, {ok: true}, callback );
            }

            if( pseudoGop === '88131' ) {
                Y.log( `checkRezidivProphylaxeCodes: documented rezidiv prophylaxe for treatment ${activity._id} and BL schein ${lastBlSchein._id} has documented 88131 pseudo gnr`, 'info', NAME );
                return handleResult( null, {ok: true}, callback );
            }

            Y.log( `checkRezidivProphylaxeCodes: notify user ${user.identityId} about missing pseudo gnr 88131  for treatment ${activity._id} and schein ${lastBlSchein._id}`, 'info', NAME );
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'message',
                msg: {
                    data: i18n( 'activity-api.text.MISSING_BL_PSEUDO_GNR_88131' )
                },
                meta: {
                    level: 'WARNING'
                }
            } );
            return handleResult( null, {ok: false}, callback );
        }

        async function setScheinFinishedWithoutPseudoCode( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.setScheinFinishedWithoutPseudoCode', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.setScheinFinishedWithoutPseudoCode' );
            }
            const {user, data, callback} = args;
            if( !data.scheinId ) {
                return handleResult( Y.doccirrus.errors.rest( 400, 'insufficient parameters' ) );
            }

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'update',
                query: {
                    _id: data.scheinId,
                    fk4235Set: {$exists: true, $not: {$size: 0}}
                },
                data: {
                    'fk4235Set.0.finishedWithoutPseudoCode': data.finishedWithoutPseudoCode
                }
            } ) );

            if( err ) {
                Y.log( `setScheinFinishedWithoutPseudoCode: could not update finishedWithoutPseudoCode: ${data.finishedWithoutPseudoCode} on schein ${data.scheinId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            Y.log( `setScheinFinishedWithoutPseudoCode: ${results}`, 'debug', NAME );

            return handleResult( null, results, callback );
        }

        const pseudoCodes = ['88130', '88131'];

        async function cleanBlScheinPseudoGnrMarks( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.cleanBlScheinPseudoGnrMarks', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.cleanBlScheinPseudoGnrMarks' );
            }
            const getLocationSet = promisifyArgsCallback( Y.doccirrus.api.location.getLocationSet );
            const {user, data, callback} = args;
            const activity = data.activity;

            if( !activity || activity.catalogShort !== 'EBM' || !pseudoCodes.includes( activity.code ) ) {
                return handleResult( null, undefined, callback );
            }
            let locationIds = activity._locationIds;

            if( !locationIds ) {
                // get all main + sub locations for a given location id
                let [err, results] = await formatPromiseResult( getLocationSet( {
                    user,
                    query: {
                        _id: activity.locationId
                    },
                    options: {
                        select: {
                            _id: 1
                        },
                        lean: true
                    }
                } ) );

                if( err ) {
                    Y.log( `cleanBlScheinPseudoGnrMarks: could not get location set for activity: ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                locationIds = results.map( location => location._id );
            }

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'update',
                query: {
                    'fk4235Set.0.pseudoGopId': activity._id.toString(),
                    fk4235Set: {$exists: true, $not: {$size: 0}}
                },
                data: {
                    'fk4235Set.0.pseudoGop': null,
                    'fk4235Set.0.pseudoGopId': null
                },
                options: {
                    multi: true
                }
            } ) );

            if( err ) {
                Y.log( `cleanBlScheinPseudoGnrMarks: could not update scheins with reference to : ${activity._id}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            Y.log( `cleanBlScheinPseudoGnrMarks: cleaned marked scheins result: ${results}`, 'debug', NAME );

            return handleResult( null, undefined, callback );
        }

        async function markBlScheinIfPseudoGnrIsAdded( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.markBlScheinIfPseudoGnrIsAdded', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.markBlScheinIfPseudoGnrIsAdded' );
            }

            const {user, data, callback} = args;
            const activity = data && data.activity;
            const allowMarkScheinOnStatus = ['VALID', 'APPROVED'];
            const getLocationSet = promisifyArgsCallback( Y.doccirrus.api.location.getLocationSet );

            if( !activity || activity.catalogShort !== 'EBM' || !pseudoCodes.includes( activity.code ) ) {
                return handleResult( null, undefined, callback );
            }

            // get all main + sub locations for a given location id

            let [err, results] = await formatPromiseResult( getLocationSet( {
                user,
                query: {
                    _id: activity.locationId
                },
                options: {
                    select: {
                        _id: 1
                    },
                    lean: true
                }
            } ) );

            if( err ) {
                Y.log( `markBlScheinIfPseudoGnrIsAdded: could not get location set for activity: ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const locationIds = results.map( location => location._id );
            activity._locationIds = locationIds;

            [err, results] = await formatPromiseResult( cleanBlScheinPseudoGnrMarks( {
                user,
                data: {activity}
            } ) );

            if( err ) {
                Y.log( `markBlScheinIfPseudoGnrIsAdded: could not clean marked schein for activity: ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // check if treatment is in assignable state

            if( !allowMarkScheinOnStatus.includes( activity.status ) ) {
                return handleResult( null, undefined, callback );
            }

            const query = {
                actType: 'SCHEIN',
                status: {$nin: ['CANCELED']},
                caseFolderId: activity.caseFolderId,
                patientId: activity.patientId,
                locationId: {$in: locationIds},
                timestamp: {
                    $lte: activity.timestamp,
                    $gte: new Date( '2020-01-01T00:00:00.000Z' )
                },
                fk4235Set: {$exists: true, $not: {$size: 0}},
                'fk4235Set.0.pseudoGop': {$not: {$type: 'string'}},
                'fk4235Set.0.pseudoGopId': {$not: {$type: 'string'}}

            };

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'update',
                query,
                data: {
                    'fk4235Set.0.pseudoGop': activity.code,
                    'fk4235Set.0.pseudoGopId': activity._id.toString()
                },
                options: {
                    multi: true
                }
            } ) );

            if( err ) {
                Y.log( `evaluateBL: could not get pseudo gnrs for schein: ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            Y.log( `markBlScheinIfPseudoGnrIsAdded: marked scheins ${results}`, 'debug', NAME );

            return handleResult( null, undefined, callback );
        }

        /**
         * @param {Object} args
         * @param {Object} args.data
         * @param {Function} args.callback
         * @param {Object|undefined} args.activityQuery if requested, may filter the linked activities additionally by that query
         *
         * @returns {Array} activities
         */
        async function getLinkedActivities( args ) {
            Y.log( 'Entering Y.doccirrus.api.activity.getLinkedActivities', 'info', NAME );

            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getLinkedActivities' );
            }

            const
                {user, data, activityQuery = {}, callback} = args,
                getActivitiesProm = promisifyArgsCallback( Y.doccirrus.api.activity.get );

            let [activitiesErr, activities] = await formatPromiseResult( getActivitiesProm( {
                user,
                query: data
            } ) );

            if( activitiesErr ) {
                Y.log( `getLinkedActivities: could not get activities matching query: ${JSON.stringify( data )} ${activitiesErr.stack || activitiesErr}`, 'warn', NAME );
                return handleResult( activitiesErr, undefined, callback );
            }

            const
                linkedActivitiesIds = _.flatten( activities.map( activity => activity.activities ) ),
                query = Object.assign( {}, activityQuery, {_id: {$in: linkedActivitiesIds}} );

            let linkedActivitiesErr, linkedActivities;
            if( linkedActivitiesIds.length > 0 ) {
                [linkedActivitiesErr, linkedActivities] = await formatPromiseResult( getActivitiesProm( {
                    user,
                    query,
                    options: {
                        sort: {timestamp: 1}
                    }
                } ) );
            } else {
                linkedActivities = [];
            }

            if( linkedActivitiesErr ) {
                Y.log( `getLinkedActivities: could not get linked activities matching query: ${JSON.stringify( data )} ${linkedActivitiesErr.stack || linkedActivitiesErr}`, 'warn', NAME );
                return handleResult( linkedActivitiesErr, undefined, callback );
            }

            return handleResult( null, linkedActivities, callback );
        }

        /**
         * Returns all activities linked to a contract through the "activities" array by ids.
         * @param {object} args
         * @param {string} args.data.patientId
         * @param {object|undefined} args.activityQuery if requested, may filter the linked activities addtionally by that query
         * @param {function} args.callback
         * @return {Promise<*>|*}
         */
        function getActivitiesLinkedToContract( args ) {
            const
                {data: {patientId}, callback} = args,
                virtualContractActivity = new Y.doccirrus.ActivityUtils( 'contract' );

            virtualContractActivity.addActTypeBody( args );

            if( !patientId ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Query parameter `patientId` is required.'} ), null, callback );
            }

            return getLinkedActivities( args );
        }

        /**
         * Calculates medicalScalingFactor for activities
         * Algorithm is next:
         * 1. Get treatment from catalog
         * 2. Get missing params if needed
         *  2.1. If tarmedInvoiceFactorValues are not given - take if from invoiceconfiguration
         *  2.2. If employeeDignities are not given - take them from employee by activityData.employeeId
         *  2.3. If caseFolderType is not given - take is from caseFolder by activityData.caseFolderId
         * 3. Calculate dignityScalingFactor for current employee
         * 4. If catalogEntry has medicalScalingFactor defined (not 0 and not 1) - take it from catalog. Otherwise use dignityScalingFactor
         *
         * @param {object} args
         * @param {object} args.user
         * @param {object} args.originalParams
         * @param {function} args.callback
         * @return {Promise<*>|*}
         */
        async function calculateActivityMedicalScalingFactor( {user, originalParams, callback} ) {
            if( callback ) {
                callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.activity.calculateActivityMedicalScalingFactor' );
            }
            Y.log( 'Entering Y.doccirrus.api.activity.calculateActivityMedicalScalingFactor', 'info', NAME );

            let {activityData, employeeDignities, caseFolderType, tarmedInvoiceFactorValues} = originalParams;
            let error, result;
            const currentMedicalScalingFactor = activityData.medicalScalingFactor || 1;

            const getTreatmentCatalogEntryP = promisifyArgsCallback( Y.doccirrus.api.catalog.getTreatmentCatalogEntry );

            // ------------- 1. Get treatment from catalog -------------------

            [error, result] = await formatPromiseResult( getTreatmentCatalogEntryP( {
                user,
                originalParams: {
                    code: activityData.code,
                    catalogShort: activityData.catalogShort,
                    locationId: activityData.locationId
                }
            } ) );

            if( error ) {
                Y.log( `calculateActivityMedicalScalingFactor(): failed to get activity catalog entry: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, currentMedicalScalingFactor, callback );
            }

            const treatmentFromCatalog = result || {},
                catalogMedicalScalingFactor = treatmentFromCatalog.medicalScalingFactor || 1;

            // ------------- 2. Get missing params if needed -------------------

            //---- 2.1. If tarmedInvoiceFactorValues are not given - take if from invoiceconfiguration ----
            if( !Array.isArray( tarmedInvoiceFactorValues ) ) {
                Y.log( `calculateActivityMedicalScalingFactor(): tarmedInvoiceFactorValues are not specified. Getting from invoiceconfiguration...`, 'debug', NAME );
                [error, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'invoiceconfiguration',
                        action: 'get',
                        options: {
                            fields: ['tarmedInvoiceFactorValues']
                        },
                        query: {}
                    } )
                );
                if( error ) {
                    Y.log( `calculateActivityMedicalScalingFactor(): error getting invoiceconfigurations: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, catalogMedicalScalingFactor, callback );
                }

                tarmedInvoiceFactorValues = result[0] && result[0].tarmedInvoiceFactorValues || [];
            }

            //---- 2.2. If employeeDignities are not given - take them from employee by activityData.employeeId ----
            if( !Array.isArray( employeeDignities ) ) {
                if( !activityData.employeeId ) {
                    Y.log( `calculateActivityMedicalScalingFactor(): no employeeId provided. Exiting`, 'error', NAME );
                    return handleResult( null, catalogMedicalScalingFactor, callback );
                }
                Y.log( `calculateActivityMedicalScalingFactor(): employee dignities are not specified. Getting from employee data by id ${activityData.employeeId}...`, 'debug', NAME );

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'get',
                    query: {_id: activityData.employeeId},
                    options: {
                        select: {qualiDignities: 1}
                    }
                } ) );

                if( error ) {
                    Y.log( `calculateActivityMedicalScalingFactor(): error getting employee: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, catalogMedicalScalingFactor, callback );
                }

                employeeDignities = result[0] && result[0].qualiDignities || [];
            }

            //---- 2.3. If caseFolderType is not given - take is from caseFolder by activityData.caseFolderId ----
            if( !caseFolderType ) {
                if( !activityData.caseFolderId ) {
                    Y.log( `calculateActivityMedicalScalingFactor(): no caseFolderId provided. Exiting`, 'error', NAME );
                    return handleResult( null, catalogMedicalScalingFactor, callback );
                }
                Y.log( `calculateActivityMedicalScalingFactor(): caseFolder Type is not specified. Getting from caseFolder data by id ${activityData.caseFolderId}...`, 'debug', NAME );

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'get',
                    query: {_id: activityData.caseFolderId},
                    options: {
                        select: {type: 1}
                    }
                } ) );

                if( error ) {
                    Y.log( `calculateActivityMedicalScalingFactor(): error getting casefolder: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, catalogMedicalScalingFactor, callback );
                }

                caseFolderType = result[0] && result[0].type;
            }

            // ------------- 3. Calculate dignityScalingFactor for current employee -------------------

            const dignityScalingFactor = Y.doccirrus.commonutilsCh.getRelevantDignityScalingFactor( {
                tarmedInvoiceFactorValues: tarmedInvoiceFactorValues,
                qualiDignities: employeeDignities,
                caseFolderType: caseFolderType
            } ) || {};

            if( !dignityScalingFactor.factor ) {
                Y.log( `calculateActivityMedicalScalingFactor(): No factor for this case. Exiting`, 'info', NAME );
                return handleResult( null, catalogMedicalScalingFactor, callback );
            }

            //------------- 4. If catalog entry has medicalScalingFactor defined (not 0 and not 1) - take it from catalog.
            // Otherwise use dignityScalingFactor -------------

            if( catalogMedicalScalingFactor && catalogMedicalScalingFactor !== 1 ) {
                Y.log( `calculateActivityMedicalScalingFactor(): return catalog default medicalScalingFactor`, 'info', NAME );
                return handleResult( error, catalogMedicalScalingFactor, callback );
            }

            return handleResult( error, dignityScalingFactor.factor, callback );
        }

        /**
         * Calculates price for TARMED treatments
         *
         * @param {object} args
         * @param {object} args.user
         * @param {object} args.originalParams
         * @param {function} args.callback
         * @return {Promise<*>|*}
         */
        async function calculateTarmedPrice( {user, originalParams, callback} ) {
            if( callback ) {
                callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.activity.calculateTarmedPrice' );
            }
            Y.log( 'Entering Y.doccirrus.api.activity.calculateTarmedPrice', 'info', NAME );

            let {treatment, caseFolderType, cantonCode, insuranceGLN, tarmedTaxPointValues} = originalParams,
                error, result;

            // If tarmedTaxPointValues are not given - take if from invoiceconfiguration
            if( !tarmedTaxPointValues ) {
                Y.log( `calculateTarmedPrice(): tarmedTaxPointValues are not specified. Getting from invoiceconfiguration...`, 'debug', NAME );
                [error, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'invoiceconfiguration',
                        action: 'get',
                        options: {
                            fields: ['tarmedTaxPointValues']
                        },
                        query: {}
                    } )
                );
                if( error ) {
                    Y.log( `calculateTarmedPrice(): error getting invoiceconfigurations: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, treatment.price, callback );
                }

                tarmedTaxPointValues = result[0] && result[0].tarmedTaxPointValues || [];
            }

            // If cantonCode is not given - take if from location
            if( !cantonCode ) {
                if( !treatment.locationId ) {
                    Y.log( `calculateTarmedPrice(): no locationId provided. Exiting`, 'error', NAME );
                    return handleResult( null, treatment.price, callback );
                }

                Y.log( `calculateTarmedPrice(): tarmedInvoiceFactorValues are not specified. Getting from invoiceconfiguration...`, 'debug', NAME );
                [error, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        options: {
                            fields: ['cantonCode']
                        },
                        query: {
                            _id: treatment.locationId
                        }
                    } )
                );
                if( error || !Array.isArray( result ) || !result.length || !result[0].cantonCode ) {
                    Y.log( `calculateTarmedPrice(): error getting invoiceconfigurations: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, treatment.price, callback );
                }

                cantonCode = result[0].cantonCode;
            }

            // If caseFolderType is not given - take is from caseFolder by activityData.caseFolderId
            if( !caseFolderType ) {
                if( !treatment.caseFolderId ) {
                    Y.log( `calculateTarmedPrice(): no caseFolderId provided. Exiting`, 'error', NAME );
                    return handleResult( null, treatment.price, callback );
                }
                Y.log( `calculateTarmedPrice(): caseFolder Type is not specified. Getting from caseFolder data by id ${treatment.caseFolderId}...`, 'debug', NAME );

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'get',
                    query: {_id: treatment.caseFolderId},
                    options: {
                        select: {type: 1}
                    }
                } ) );

                if( error ) {
                    Y.log( `calculateTarmedPrice(): error getting casefolder: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, treatment.price, callback );
                }

                caseFolderType = result[0] && result[0].type;
            }

            // ------------- 3. Calculate price -------------------

            const price = Y.doccirrus.commonutilsCh.calculateTarmedPrice( {
                treatment,
                tarmedScalingFactors: {taxPointValues: tarmedTaxPointValues},
                cantonCode,
                caseFolderType,
                insuranceGLN
            } );

            return handleResult( error, price || treatment.price, callback );
        }

        /**
         * Gets activities which belong to invoice with status ONHOLD
         *
         * @param {object} args
         * @param {object} args.user
         * @param {object} args.query
         * @param {function} args.callback
         * @return {Promise<*>|*}
         */
        async function getOnHoldActivities( {user, query, callback} ) {
            let error, result, scheins;

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query
            } ) );

            if( error ) {
                Y.log( `getOnHoldActivities: failed to get activities.\nError: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }
            [error, scheins] = await formatPromiseResult( Y.doccirrus.api.patient.getScheinsFromActivities( {
                user,
                activities: result
            } ) );

            if( error ) {
                Y.log( `getOnHoldActivities: failed to get scheins from activities.\nError: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }
            const onHoldActivities = scheins
                .map( s => s.status === 'ONHOLD' ? s.relatedActivitiesIds : [] )
                .reduce( ( acc, acts ) => acc.concat( acts ), [] );

            return callback( null, onHoldActivities );
        }

        /**
         * Create DocLetter update patient data if needed, create schein if needed
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data.logEntry  - patienttranfer entry of KIM type
         * @param {String} args.data.patientId  - selected patient
         * @param {String|undefined} args.data.caseFolderId  - selected caseFolder
         * @param {Function} args.callback
         * @return {Promise<*>|*}
         */
        async function createKIMActivity( args ) {
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createKIMActivity' );
            }
            Y.log( 'Entering Y.doccirrus.api.activity.createKIMActivity', 'info', NAME );
            const {user, data: { logEntry, patient, update = {} }, callback } = args,
                createSimpleActivityP = promisifyArgsCallback( Y.doccirrus.api.activity.createSimpleActivity ),
                {extname} = require('path'),
                makeCopyP = promisifyArgsCallback( Y.doccirrus.api.media.makecopy ),
                getLastScheinP = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein );

            let { data: { caseFolderId } } = args;

            if( !logEntry || !patient || !(patient.insuranceStatus || {}).find( insurance => insurance.type === 'PUBLIC' ) ){
                Y.log( `createKIMActivity: insufficient parameters`, 'error', NAME );
                return callback( Y.doccirrus.errors.http( 409, 'insufficient params' ) );
            }

            let
                patientId = patient._id,
                err,
                inBoxCaseFolderId;

            //update patient data if needed
            let newPatientName;
            if( logEntry.parsedKIMPatient && logEntry.parsedKIMPatient[0] && ( update.common || update.insurance || update.address ) ){
                [ err, newPatientName ] = await formatPromiseResult( Y.doccirrus.api.patient.mergeKIMPatient( user, patientId, logEntry.parsedKIMPatient[0], update ) );

                if( err ){
                    Y.log( `createKIMActivity: failed updating patient ${patientId} data: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            } else {
                newPatientName = Y.doccirrus.schemas.person.personDisplay( {
                    firstname: patient.firstname,
                    lastname: patient.lastname,
                    title: patient.title
                } );
            }

            //if caseFolder not provided try to get one of type PUBLIC or create new
            if( !caseFolderId ){
                let caseFolders;
                [err, caseFolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'casefolder',
                    query: {
                        patientId,
                        type: 'PUBLIC',
                        imported: { $exists: false },
                        additionalType: {$ne: Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION}
                    },
                    options: { sort: { _id: - 1 } }
                } ) );
                if( err ){
                    Y.log( `createKIMActivity: error getting casefolders for patient ${patientId} : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( caseFolders && caseFolders.length ){
                    //firstly check if activeCaseFolder is PUBLIC
                    let activePublic = caseFolders.find( folder => folder._id.toString() === patient.activeCaseFolderId );
                    if( activePublic ){
                        caseFolderId = activePublic._id.toString();
                    } else {
                        //otherwise take latest
                        caseFolderId = caseFolders[0]._id.toString();
                    }
                } else {
                    Y.log(`createKIMActivity: Linking DocLetter to "inBox" casefolder`, 'info', NAME);
                    inBoxCaseFolderId = await Y.doccirrus.api.casefolder.getInBoxCaseFolderId( {
                        user,
                        data: { patientId }
                    } );
                    if( inBoxCaseFolderId ) {
                        caseFolderId = inBoxCaseFolderId;
                    }
                }
            }

            //check if need create SCHEIN in case folder but not in inBox
            let activityTimestamp = new Date( logEntry.timestamp ),
                lastScheins;
            if( !inBoxCaseFolderId ){
                [err, lastScheins] = await formatPromiseResult( getLastScheinP( {
                    user: user,
                    query: {
                        timestamp: activityTimestamp,
                        gteTimestamp: moment( activityTimestamp ).startOf( 'quarter' ).toDate(),
                        patientId,
                        caseFolderId,
                        scheinType: '0101',
                        scheinSubgroup: '00'
                    },
                    options: {
                        lean: true
                    }
                } ) );
                if( err ){
                    Y.log( `createKIMActivity: error getting last Schein in casefolder ${caseFolderId} : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !lastScheins || !lastScheins.length ){
                    [err] = await formatPromiseResult( createSimpleActivityP( {
                        user,
                        originalParams: {
                            activityData: {
                                actType: 'SCHEIN',
                                scheinType: '0101',
                                scheinSubgroup: '00',
                                patientId,
                                caseFolderId,
                                scheinYear: moment( activityTimestamp ).year(),
                                scheinQuarter: moment( activityTimestamp ).quarter(),
                                timestamp: activityTimestamp,
                                status: 'VALID',
                                userContent: 'ambulante Behandlung (ambulante Behandlung)'
                            },
                            activeCaseFolder: {
                                type: 'PUBLIC'
                            }
                        }
                    } ) );
                    if( err ){
                        Y.log( `createKIMActivity: error creating new schein: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }
            }

            let activityData = {
                patientId,
                caseFolderId,
                timestamp: activityTimestamp,
                userContent: logEntry.textContent || '',
                status: 'VALID',
                actType: 'DOCLETTER',
                kimState: 'RECEIVED',
                kimSignedBy: [],
                attachments: []
            };

            if( logEntry.attachedMedia && logEntry.attachedMedia.length ) {
                for( let attachedMedia of logEntry.attachedMedia ) {
                    let newMediaId;
                    [err, newMediaId] = await formatPromiseResult( makeCopyP( {
                        user,
                        originalParams: {
                            mediaId: attachedMedia.mediaId
                        }
                    } ) );
                    if( err ) {
                        Y.log( `createKIMActivity: error making copy of media ${attachedMedia.mediaId} : ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }

                    if( !newMediaId ) {
                        Y.log( `createKIMActivity: media ${attachedMedia.mediaId} could not be copied without any error`, 'warn', NAME );
                        continue;
                    }

                    let newDocumentId;
                    [err, newDocumentId] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'post',
                        model: 'document',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            type: 'DOCLETTER',
                            url: `/media/${newMediaId}_original.${attachedMedia.mime}.${extname( attachedMedia.title ) || extname( attachedMedia.caption ) || ''}&from=casefile`,
                            contentType: attachedMedia.contentType,
                            mediaId: newMediaId,
                            caption: attachedMedia.caption,
                            patientId: patientId
                        } )
                    } ) );

                    if( err ) {
                        Y.log( `createKIMActivity: error posting new document: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }

                    if( newDocumentId && newDocumentId[0] ) {
                        activityData.attachments.push( newDocumentId[0] );
                    } else {
                        Y.log( `createKIMActivity: document for media ${attachedMedia.mediaId} could not be created without any error`, 'warn', NAME );
                    }
                }
            }

            let activityId;
            [err, activityId] = await formatPromiseResult( createSimpleActivityP( {
                user,
                originalParams: {
                    activityData,
                    activeCaseFolder: {
                        type: 'PUBLIC'
                    }
                }
            } ) );
            if( err ){
                Y.log( `createKIMActivity: error creating new activity: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            //and finally update patientTransfer with new data
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patienttransfer',
                action: 'put',
                query: {
                    _id: logEntry._id
                },
                fields: [ 'patientId', 'patientName', 'activityIds' ],
                data: {
                    patientId,
                    patientName: newPatientName,
                    activityIds: [activityId],
                    skipcheck_: true
                }
            } ) );
            if( err ){
                Y.log( `createKIMActivity: error updating patienttransfer ${logEntry._id}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            callback( null, { patientId, caseFolderId, activityId } );
        }

        async function revertKIMActivity( args ) {
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.revertKIMActivity' );
            }
            Y.log( 'Entering Y.doccirrus.api.activity.revertKIMActivity', 'info', NAME );
            const {user, data: {patientTransferId}, callback} = args;
            let err, patientTransfers;
            if( !patientTransferId ) {
                err = Y.doccirrus.errors.rest( 500, 'insufficient arguments' );
                Y.log( `revertKIMActivity: no patientTransferId passed: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }
            [err, patientTransfers] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patienttransfer',
                query: {
                    _id: patientTransferId
                },
                options: {limit: 1}
            } ) );

            if( err ) {
                Y.log( `revertKIMActivity: error reverting activities of patienttransfer ${patientTransferId}: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            let patientTransfer = patientTransfers[0];

            if( !patientTransfer ) {
                err = Y.doccirrus.errors.rest( 404, 'patienttransfer not found' );
                Y.log( `revertKIMActivity: error receivin patienttransfer ${patientTransferId}: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            if( patientTransfer.subject === 'Arztbrief' ) {
                [err] = await formatPromiseResult( Y.doccirrus.api.edocletter.removeRelatedTreatments( {
                    user,
                    docLetterIds: patientTransfer.activityIds
                } ) );

                if( err ) {
                    Y.log( `revertKIMActivity: error reverting docletter activities of patienttransfer ${patientTransferId}: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            let result;
            [err, result] = await formatPromiseResult( (new Promise( ( resolve, reject ) => {
                Y.doccirrus.activityapi.doTransitionBatch(
                    user,
                    {},
                    patientTransfer.activityIds,
                    'delete',
                    () => {
                    },
                    ( err, result ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( result );
                        }
                    }
                );
            } )) );

            if( err ) {
                Y.log( `revertKIMActivity: error deleting docletter activities ${patientTransfer.activityIds} of patienttransfer ${patientTransferId}: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patienttransfer',
                action: 'update',
                query: {
                    _id: patientTransferId
                },
                data: {
                    patientId: null,
                    patientName: '',
                    activityIds: [],
                    skipcheck_: true
                }
            } ) );

            if( err ) {
                Y.log( `createKIMActivity: error updating patienttransfer ${patientTransferId}: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            Y.log( `revertKIMActivity: removed docletter ${patientTransferId}`, 'debug', NAME );

            return handleResult( null, result, callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class activity
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).activity = {

            name: NAME,

            'delete': function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.delete', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.delete' );
                }
                deleteActivity( args );
            },

            put: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.put', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.put' );
                }
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'activity',
                    user: args.user,
                    query: args.query,
                    fields: args.fields,
                    data: args.data,
                    callback: args.callback
                } );
            },
            get: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.get' );
                }
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'activity',
                    user: args.user,
                    migrate: args.migrate,
                    query: args.query,
                    options: args.options
                }, args.callback );
            },
            upsert: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.upsert', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.upsert' );
                }
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'upsert',
                    model: 'activity',
                    user: args.user,
                    query: args.query,
                    data: args.data,
                    callback: args.callback
                } );
            },

            post: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.post', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.post' );
                }
                post( args );
            },

            updateBatch: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.updateBatch', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.updateBatch' );
                }
                updateBatch( args );
            },
            billByIds: function( user, ids ) {
                const now = new Date();
                Y.log( `Try to bill ${ids.length} activities`, 'info', NAME );
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    query: {
                        _id: {$in: ids},
                        status: {$in: ['VALID', 'APPROVED']}
                    },
                    data: {
                        status: 'BILLED',
                        scheinSettledDate: now
                    },
                    options: {
                        multi: true
                    }
                } )
                    .then( async ( result ) => {
                        for (let activityId of ids){
                            Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
                            let [ err ] = await formatPromiseResult(
                                Y.doccirrus.invoiceserverutils.auditChangeValues( user, activityId, { status: 'APPROVED' }, { status: 'BILLED', scheinSettledDate: now } )
                            );
                            if( err ){
                                Y.log( `billByIds: error creating audit entry for ${activityId} : ${err.stack || err}`, 'warn', NAME );
                            }
                        }

                        return Y.doccirrus.api.activity._detachChildsOfScheins( {
                            user,
                            activitiesIds: ids
                        } )
                            .then( () => result );
                    } );
            },
            _detachChildsOfScheins,
            isScheinComplete: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.isScheinComplete', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.isScheinComplete' );
                }
                const
                    Promise = require( 'bluebird' ),
                    runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                    {user, originalParams, callback} = args,
                    scheinId = originalParams && originalParams.scheinId;

                let schein;

                if( !scheinId ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
                }

                return runDb( {
                    user,
                    model: 'activity',
                    query: {
                        _id: scheinId
                    },
                    options: {
                        select: {
                            timestamp: 1,
                            caseFolderId: 1,
                            patientId: 1,
                            locationId: 1
                        }
                    }
                } ).get( 0 ).then( _schein => {
                    if( !_schein ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'schein not found'} ) );
                    }

                    schein = _schein;

                    return new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.patient.getNextSchein( {
                            user: user,
                            originalParams: {
                                patientId: schein.patientId,
                                timestamp: schein.timestamp,
                                caseFolderId: schein.caseFolderId,
                                locationId: schein.locationId
                            },
                            callback: ( err, nextSchein ) => {
                                if( err ) {
                                    reject( err );
                                } else {
                                    resolve( nextSchein );
                                }
                            }
                        } );
                    } );
                } ).then( nextScheins => {

                    const nextSchein = nextScheins && nextScheins[0];
                    let endDate = nextSchein ? nextSchein.timestamp : (new Date());

                    Y.log( `check if all treatments between schein ${scheinId} (${schein.timestamp}) and ${nextSchein ? nextSchein._id.toString() : 'no next schein'} (${endDate}) are billed`, 'debug', NAME );

                    return runDb( {
                        user,
                        model: 'activity',
                        query: {
                            actType: 'TREATMENT',
                            areTreatmentDiagnosesBillable: '1',
                            patientId: schein.patientId,
                            caseFolderId: schein.caseFolderId,
                            locationId: schein.locationId,
                            timestamp: {
                                $gte: schein.timestamp,
                                $lt: endDate
                            }
                        },
                        options: {
                            select: {
                                status: 1
                            }
                        }
                    } );
                } ).then( treatments => {
                    const
                        notAllowedStatus = ['VALID', 'APPROVED'];
                    callback( null, treatments.every( treatment => !notAllowedStatus.includes( treatment.status ) ) );
                } ).catch( err => {
                    Y.log( 'could not schein for completeness: ' + err, 'error', NAME );
                    callback( err );
                } );
            },
            /**
             * Returns all open and complete scheins which means that status is VALID or APPROVED and all treatments are
             * billed.
             *
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.query
             * @param {String} args.query.patientId
             * @param {String} args.query.caseFolderId
             * @param {String} args.query.timestamp
             * @param {String} args.query.locationId
             * @param {Function|undefined} args.callback
             * @return {Promise<*>}
             */
            getCompleteScheins: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getCompleteScheins', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getCompleteScheins' );
                }

                const {user, query, callback} = args;
                const isScheinComplete = promisifyArgsCallback( Y.doccirrus.api.activity.isScheinComplete );
                const completeScheins = [];
                let err, openScheins;

                if( !['patientId', 'caseFolderId', 'timestamp', 'locationId'].every( attr => query[attr] ) ) {
                    return handleResult( Y.doccirrus.errors.rest( 500, 'insufficient arguments' ), undefined, callback );
                }

                [err, openScheins] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        actType: {$in: ['PKVSCHEIN', 'BGSCHEIN']},
                        status: {$in: ['VALID', 'APPROVED']},
                        ...query
                    }
                } ) );

                if( err ) {
                    Y.log( `could not get open scheins: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                Y.log( `found ${openScheins.length} open scheins`, 'debug', NAME );
                for( let openSchein of openScheins ) { //eslint-disable-line no-unused-vars
                    let isComplete;
                    [err, isComplete] = await formatPromiseResult( isScheinComplete( {
                        user,
                        originalParams: {
                            scheinId: openSchein._id.toString()
                        }
                    } ) );

                    if( err ) {
                        Y.log( `could not check schein completeness of ${openSchein._id.toString()}: ${err.stack || err}`, 'warn', NAME );
                        continue;
                    }
                    if( isComplete ) {
                        completeScheins.push( openSchein );
                    }

                }

                Y.log( `found ${completeScheins.length} complete scheins`, 'debug', NAME );
                return handleResult( null, completeScheins, callback );
            },

            addSchein0101: function( user, patient, callback ) {
                let moment = require( 'moment' ),
                    Promise = require( 'bluebird' ),
                    ObjectId = require( 'mongoose' ).Types.ObjectId,
                    patientId = patient._id.toString(),
                    // MOJ-14319: [OK] [CARDREAD]
                    insuranceStatus = patient && Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' ),
                    insuranceLocationId = insuranceStatus && insuranceStatus.locationId || defaultLocationId(),
                    insuranceEmployeeId = insuranceStatus && insuranceStatus.employeeId,
                    scheinLocationId,
                    scheinEmployeeId,
                    data = {
                        actType: 'SCHEIN',
                        scheinType: '0101',
                        scheinSubgroup: '00',
                        patientId: patient._id.toString(),
                        scheinYear: moment().year(),
                        scheinQuarter: moment().quarter(),
                        timestamp: new Date(),
                        status: 'VALID',
                        userContent: 'ambulante Behandlung (ambulante Behandlung)'
                    };

                function getLastSchein() {
                    return new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.patient.lastSchein( {
                            user,
                            query: {
                                actType: 'SCHEIN',
                                patientId: patientId,
                                timestamp: (new Date())
                            },
                            options: {
                                doNotQueryCaseFolder: true
                            },
                            callback: ( err, schein ) => {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve( schein );
                            }
                        } );
                    } ).get( 0 );
                }

                function checkCaseFoldersExistence( patientId, caseFolders ) {
                    const
                        cfKeys = Object.keys( caseFolders || {} ),
                        result = {};

                    return Promise.resolve().then( () => {
                        const ids = [];

                        if( caseFolders.schein ) {
                            ids.push( new ObjectId( caseFolders.schein ) );
                        }

                        if( caseFolders.patient ) {
                            ids.push( new ObjectId( caseFolders.patient ) );
                        }

                        return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'casefolder',
                            query: {
                                patientId,
                                additionalType: null,
                                type: 'PUBLIC', // MOJ-14319: [OK] [CARDREAD]
                                _id: {$in: ids}
                            },
                            options: {
                                select: {
                                    _id: 1
                                }
                            }
                        } ) ).then( caseFoldersObjs => {
                            cfKeys.forEach( key => {
                                caseFoldersObjs.some( cf => {
                                    let cfId = caseFolders[key];
                                    if( cf._id.toString() === cfId ) {
                                        result[key] = cfId;
                                        return true;
                                    }
                                } );
                            } );
                        } );
                    } ).then( () => {
                        if( 0 === Object.keys( result ).length ) {
                            return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'casefolder',
                                query: {
                                    patientId,
                                    additionalType: null,
                                    type: 'PUBLIC' // MOJ-14319: [OK] [CARDREAD]
                                },
                                options: {
                                    select: {
                                        _id: 1
                                    },
                                    limit: 1
                                }
                            } ) ).get( 0 ).then( firstCf => {
                                if( firstCf ) {
                                    result.firstId = firstCf._id.toString();
                                }
                                return result;
                            } );
                        }
                        return result;
                    } );
                }

                function checkEmployeeIsInLocation( locId, insuranceEmployeeId, scheinEmployeeId ) {
                    return Promise.resolve(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'employee',
                            query: {
                                _id: {$in: [insuranceEmployeeId, scheinEmployeeId].filter( Boolean )},
                                'locations._id': locId
                            },
                            options: {
                                select: {
                                    _id: 1
                                },
                                limit: 1,
                                lean: true
                            }
                        } )
                    ).then( employees => {
                        let
                            foundInsuranceEmp = false,
                            foundScheinEmp = false;

                        employees.forEach( employee => {
                            const empId = employee._id.toString();
                            if( empId === insuranceEmployeeId ) {
                                foundInsuranceEmp = true;

                            } else if( empId === scheinEmployeeId ) {
                                foundScheinEmp = true;
                            }
                        } );

                        if( foundInsuranceEmp ) {
                            return insuranceEmployeeId;
                        }

                        if( foundScheinEmp ) {
                            return scheinEmployeeId;
                        }
                        return null;
                    } );
                }

                function defaultLocationId() {
                    var
                        locationId = insuranceStatus && insuranceStatus.locationId;
                    return locationId || Y.doccirrus.schemas.location.getMainLocationId();
                }

                if( !insuranceStatus ) {
                    Y.log( 'addSchein0101: patient has no public insurance: skip auto schein creation on insurance change', 'debug', NAME );
                    callback();
                    return;
                }

                getLastSchein().then( schein => {
                    // if no last schein exists we do not create new schein
                    if( !schein ) {
                        throw new Y.doccirrus.commonerrors.DCError( 18023 );
                    }
                    scheinLocationId = schein.locationId;
                    scheinEmployeeId = schein.employeeId;
                    return checkCaseFoldersExistence( patientId, {
                        schein: schein.caseFolderId,
                        patient: patient.activeCaseFolderId
                    } );
                } ).then( result => {

                    if( result.schein ) {
                        data.caseFolderId = result.schein;
                    } else if( result.schein ) {
                        data.caseFolderId = result.schein;
                    } else if( result.firstId ) {
                        data.caseFolderId = result.firstId;
                    } else {
                        throw new Y.doccirrus.commonerrors.DCError( 18024 );
                    }

                    data.locationId = insuranceLocationId || scheinLocationId;
                    return checkEmployeeIsInLocation( insuranceLocationId, insuranceEmployeeId, scheinEmployeeId );
                } ).then( employeeId => {
                    data.employeeId = employeeId;
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( data ),
                        context: {
                            autoCreation: true
                        }
                    } );
                } ).then( () => {
                    callback();
                } ).catch( err => {
                    if( err.code && [18023, 18024].includes( err.code ) ) {
                        Y.log( err.message + ': skipping schien auto creation on changed insurance', 'warn', NAME );
                        callback();
                        return;
                    }
                    Y.log( 'could not create auto schein on insurance change: ' + (err && err.stack || err), 'error', NAME );
                    callback( err );
                } );
            },
            checkCatalogCode: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.checkCatalogCode', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.checkCatalogCode' );
                }
                checkCatalogCode( args );
            },
            getContentTopByActType: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getContentTopByActType', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getContentTopByActType' );
                }
                args.callback( null, [] );
                //getContentTopByActType( args );
            },
            getPrescriptionTypes: getPrescriptionTypes,

            /**
             *  Activites may only have a single FORMPDF document attached - this method regenerates the PDF and
             *  makes a new document for it.
             *
             *  args:
             *
             *      activity    - an activity object with _formForPDF property holding form serialized for PDF API
             *
             *
             *  TODO: check if this can be removed, believe unused in new inCaseMojit
             *
             *  @param args
             */

            replaceFormPdf: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.replaceFormPdf', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.replaceFormPdf' );
                }
                var
                    activity = args.activity,
                    user = args.user,
                    callback = args.callback,
                    pdfDoc = activity._formForPDF,
                    nextDocId,
                    toCheck = [],
                    i;

                function onDocumentCreated( err, data ) {
                    if( err ) {
                        Y.log( 'Could not create new PDF attachment: ' + err, 'warn', NAME );
                        callback( err );
                        return;
                    }
                    Y.log( 'Created attachment: ' + JSON.stringify( data ), 'debug', NAME );
                    activity.attachments.push( data[0] );
                    callback( null, activity );
                }

                function onPDFCreated( err, mediaId ) {
                    if( err ) {
                        Y.log( 'Could not generate new PDF to represent activity: ' + err, 'warn', NAME );
                        callback( err );
                        return;
                    }
                    Y.log( 'Created PDF: ' + JSON.stringify( mediaId ), 'info', NAME );

                    var
                        newDoc = {
                            type: 'FORMPDF',
                            formId: activity.formId,
                            formInstanceId: activity.formVersion,
                            formData: '',
                            dcOwner: 'system',
                            url: '/1/media/:download?_id=' + mediaId._id,
                            publisher: 'system',
                            createdOn: (new Date()).toJSON(),
                            contentType: 'application/pdf',
                            attachedTo: activity.patientId,     //  deprecated, see MOJ-9190
                            patientId: activity.patientId,
                            activityId: pdfDoc.ownerId,
                            locationId: activity.locationId,
                            caption: activity.content
                        };

                    newDoc = Y.doccirrus.filters.cleanDbObject( newDoc );

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'document',
                        data: newDoc,
                        options: {}
                    }, onDocumentCreated );
                }

                function onCleanedAttachments() {
                    pdfDoc.save = 'db';
                    //Y.log('Generating PDF from: ' + JSON.stringify(pdfDoc), 'debug', NAME);
                    Y.doccirrus.api.media.makepdf( {
                        'user': user,
                        'originalParams': {'document': pdfDoc},
                        'callback': onPDFCreated
                    } );
                }

                function onDocDeleted() {
                    var newAttachments = [], i;
                    for( i = 0; i < activity.attachments.length; i++ ) {
                        if( activity.attachments[i] !== nextDocId ) {
                            newAttachments.push( activity.attachments[i] );
                        }
                    }
                    activity.attachments = newAttachments;
                    checkNextDoc();
                }

                function onDocLoaded( err, data ) {
                    if( err || !data.length || 0 === data.length ) {
                        Y.log( 'Could not load attachment: ' + nextDocId, 'warn', NAME );
                        checkNextDoc();
                        return;
                    }

                    if( 'FORMPDF' !== data[0].type ) {
                        //  document does not link a PDF generated from linked form, leave it alone
                        checkNextDoc();
                        return;
                    }

                    Y.log( 'Deleting existing FORMPDF attachment: ' + data[0]._id, 'info', NAME );

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'delete',
                        model: 'document',
                        query: {_id: data[0]._id},
                        options: {}
                    }, onDocDeleted );
                }

                function checkNextDoc() {

                    if( 0 === toCheck.length ) {
                        onCleanedAttachments();
                        return;
                    }

                    nextDocId = toCheck.pop();

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'document',
                        query: {_id: nextDocId},
                        options: {}
                    }, onDocLoaded );
                }

                for( i = 0; i < activity.attachments.length; i++ ) {
                    toCheck.push( activity.attachments[i] );
                }

                delete activity._formForPDF;
                checkNextDoc();
            },

            /**
             *  When a PDF is regenerated after an activity approved then the attachments field must be updated
             *  independantly.
             *
             *  Note that this will cause the activity post-proceses to call addAttachmentLinks, which will
             *  set the attachedMedia property of the activity
             *
             *  @param args
             */

            updateAttachments: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.updateAttachments', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.updateAttachments' );
                }
                var
                    params = args.originalParams,
                    activityId = params.activityId ? params.activityId : '',
                    attachments = params.attachments ? params.attachments : [],
                    user = args.user,
                    callback = args.callback,
                    putData = {
                        'attachments': attachments,
                        'fields_': ['attachments']
                    };

                Y.log( 'Updating attachments for ' + activityId + ':' + JSON.stringify( attachments ), 'debug', NAME );

                if( '' === activityId ) {
                    callback( new Error( 'Activity _id not given' ) );
                    return;
                }

                putData = Y.doccirrus.filters.cleanDbObject( putData );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'put',
                    model: 'activity',
                    query: {_id: activityId},
                    data: putData,
                    options: {ignoreReadOnly: ['attachments']}
                }, callback );

            },

            countBLFrom: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.countBLFrom', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.countBLFrom' );
                }
                countBLFrom( args );
            },
            getOpenSchein: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getOpenSchein', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getOpenSchein' );
                }
                getOpenSchein( args );
            },
            getParent: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getParent', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getParent' );
                }
                getParent( args );
            },
            getOpenScheinBL,
            getChildren: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getChildren', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getChildren' );
                }
                getChildren( args );
            },
            getUniqueDiagnosis,
            getContinuousDiagnosis,
            getContinuousMedications,
            getCashBook: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getCashBook', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getCashBook' );
                }
                getCashBook( args );
            },
            getActivitiesPopulated: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getActivitiesPopulated', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActivitiesPopulated' );
                }
                getActivitiesPopulated( args );
            },
            getActivitiesPopulatedAlt: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getActivitiesPopulatedAlt', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActivitiesPopulatedAlt' );
                }
                getActivitiesPopulatedAlt( args );
            },
            getCaseFile: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getCaseFile', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getCaseFile' );
                }
                getCaseFile( args );
            },
            getCaseFileLight: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getCaseFileLight', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getCaseFileLight' );
                }
                getCaseFileLight( args );
            },
            doTransitionBatch: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.doTransitionBatch', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.doTransitionBatch' );
                }
                doTransitionBatch( args );
            },
            moveActivity: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.moveActivity', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.moveActivity' );
                }
                moveActivity( args );
            },
            saveFile: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.saveFile', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.saveFile' );
                }
                saveFile( args );
            },
            isLegalBLForCaseFolder: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.isLegalBLForCaseFolder', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.isLegalBLForCaseFolder' );
                }
                isLegalBLForCaseFolder( args );
            },
            recalcBLInCaseFolder: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.recalcBLInCaseFolder', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.recalcBLInCaseFolder' );
                }
                recalcBLInCaseFolder( args );
            },
            getBLOfLastSchein: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getBLOfLastSchein', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getBLOfLastSchein' );
                }
                getBLOfLastSchein( args );
            },
            createActivitiesFromCatalogusage: createActivitiesFromCatalogusage,
            createJawboneActivity: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.createJawboneActivity', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createJawboneActivity' );
                }
                createJawboneActivity( args );
            },
            getActivityForTransfer: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getActivityForTransfer', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActivityForTransfer' );
                }
                getActivityForTransfer( args );
            },
            createFindingForPatient: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.createFindingForPatient', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createFindingForPatient' );
                }
                createActivityForPatient( args );
            },
            createActivityForPatient: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.createActivityForPatient', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createActivityForPatient' );
                }
                createActivityForPatient( args );
            },
            createMedDataForPatient: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.createMedDataForPatient', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createMedDataForPatient' );
                }
                createActivityForPatient( args );
            },
            createCommunicationFromMediport: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.createCommunicationFromMediport', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.createCommunicationFromMediport' );
                }
                createCommunicationFromMediport( args );
            },
            getActivity: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getActivity', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActivity' );
                }
                getActivity( args );
            },
            getDeviceTableData: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getDeviceTableData', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getDeviceTableData' );
                }
                getDeviceTableData( args );
            },
            getDeviceSleepData: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getDeviceSleepData', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getDeviceSleepData' );
                }
                getDeviceSleepData( args );
            },
            getDeviceMoveData: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getDeviceMoveData', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getDeviceMoveData' );
                }
                getDeviceMoveData( args );
            },
            getLabDataTableData: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getLabDataTableData', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getLabDataTableData' );
                }
                getLabDataTableData( args );
            },
            getDeviceHeartRateData: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getDeviceHeartRateData', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getDeviceHeartRateData' );
                }
                getDeviceHeartRateData( args );
            },
            getDeviceCaloriesData: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getDeviceCaloriesData', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getDeviceCaloriesData' );
                }
                getDeviceCaloriesData( args );
            },
            getActivityForFrontend: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getActivityForFrontend', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getActivityForFrontend' );
                }
                getActivityForFrontend( args );
            },
            getNewActivityForFrontend: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getNewActivityForFrontend', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getNewActivityForFrontend' );
                }
                getNewActivityForFrontend( args );
            },
            getCaseFolderBl: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getCaseFolderBl', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getCaseFolderBl' );
                }
                getCaseFolderBl( args );
            },
            doTransition: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.doTransition', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.doTransition' );
                }
                doTransition( args );
            },
            doTransitionPlus: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.doTransitionPlus', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.doTransitionPlus' );
                }
                doTransitionPlus( args );
            },
            copeActivity: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.copeActivity', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.copeActivity' );
                }
                copeActivity( args );
            },
            validateInvoices: validateInvoices,
            quickprint: quickPrint,
            updateKBVMedicationPlanPdf,
            generateMedicationPlan( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.generateMedicationPlan', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.generateMedicationPlan' );
                }
                generateMedicationPlan( args );
            },
            createMedicationPlanByCarrierSegment,
            saveMedicationPlan( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.saveMedicationPlan', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.saveMedicationPlan' );
                }
                saveMedicationPlan( args );
            },
            getOnHoldActivities( args ) {
                Y.log( 'Entering Y.doccirrus.api.activity.getOnHoldActivities', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.activity.getOnHoldActivities' );
                }
                getOnHoldActivities( args );
            },
            createKbvMedicationPlanForMedications,
            createMedicationPlanForMedications,
            createMedicationPlanFromDocumedis,
            updateMedicationPlanFromDocumedis,
            CHMEDtoMedications,
            convertMedicationsToMedplanChmed,
            handleMedications,
            getActualMedicationData,
            updateActivitySafe,
            createActivitySafe,
            getDistinct,
            mailActivities,
            sendEmailsFromPatientId,
            sendEmailsFromContactId,
            checkSubGop,
            translatePrices,
            getActivityDataForPatient,
            setEmployeeName,
            setPatientName,
            updateEditor,
            checkTransition,
            generateContent,
            getLatestMeddataForPatient,
            lastKbvUtility,
            checkKbvUtilityExistence,
            saveKbvUtilityDiagnosis,
            getKbvUtilityAgreement,
            addAttachmentLinks,
            createDispense,
            printLabel,
            incrementPrintCount,
            getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments,
            updateDiagnosisInvalidationDate,

            //  test/manual migration to correct receipt totals on invoices, MOJ-7642
            checkReceiptTotalsOnInvoices,
            resetActivityStatus,
            getMedicationData,
            getActivitiesGroupedByAPK,
            getLatestMedicationPlan,
            setAPKState,
            getOpenBilledSchein,
            fixBilledScheinChains,
            correctEBMPrices,
            correctEBMKettePrices,
            addMissingFormVersions,
            addInsuranceNamesToInvoices,
            activitiesLockUnlock,
            requestETSArrangementCode,
            createSimpleActivity,
            createSimpleActivityWithAttachedPDF,
            getNextTimestamp,
            setScheinFinishedWithoutPseudoCode,
            checkRezidivProphylaxeCodes,
            cleanBlScheinPseudoGnrMarks,
            markBlScheinIfPseudoGnrIsAdded,
            evaluateBL,
            getLinkedActivities,
            getActivitiesLinkedToContract,
            getHistoricMedDataActivities,
            calculateActivityMedicalScalingFactor,
            calculateTarmedPrice,
            createKIMActivity,
            revertKIMActivity
        };

    },
    '0.0.1', {
        requires: [
            'oop',
            'activity-schema',
            'activity-api',
            'activitysettings-api',
            'InCaseMojit-api',
            'meddata-api',
            'ingredientplan-api',
            'dcerror',
            'dccommunication',
            'dcactivityutils',
            'activityapi',
            'dccommunication',
            'dcerrortable',
            'person-schema',
            'v_meddata-schema',
            'v_ingredientplan-schema',
            'v_medication-schema',
            'kbv-api',
            'dcforms-confighelper',
            'casefolder-schema',
            'dcdatafilter',
            'incash-schema'
        ]
    }
);
