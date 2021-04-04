/*global YUI */
'use strict';
YUI.add( 'scheduletype-api', function( Y, NAME ) {

        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId;

        /**
         * Returns all schedule types which have calendarId in calendarRefs.
         * @method getScheduleTypeForPartner
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.calendarId
         * @param {String} args.sourceDcCustomerNo
         * @param {Function} args.callback
         */
        function getScheduleTypeForPartner( args ){
            let
                { user, data:{ calendarId } = {}, callback, sourceDcCustomerNo } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.partner.getPartner( {
                        user,
                        data: {
                            dcCustomerNo: sourceDcCustomerNo
                        },
                        callback( err ){
                            next( err );
                        }
                    } );
                },
                function( next ) {

                    Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'scheduletype',
                        action: 'get',
                        query: {
                            'calendarRefs.calendarId': calendarId
                        },
                        options: {
                            lean: true
                        }
                    }, next );

                }
            ], callback );

        }

        /**
         * @public
         * @async
         * @JsonRpcApi
         *
         * This method does below:
         * 1] Removes requiredResource from scheduleType with given _id
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {string} args.query.resourceId - Id of resource to delete
         * @param {string} args.query.scheduletypeId - Id of scheduleType from which resource should be deleted
         * @param {function} [args.callback] - If present then response will be sent via callback
         * @returns {Promise<undefined>}
         */
        async function deleteRequiredResource( args ) {
            const
                {user, query, callback} = args;
            let
                err, result;

            if( !query || !query.resourceId || !query.scheduletypeId ) {
                Y.log( `deleteRequiredResource. Missing params.`, 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ), undefined, callback );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    'action': 'update',
                    'model': 'scheduletype',
                    'query': {
                        _id: query.scheduletypeId
                    },
                    'data': {
                        $pull: {requiredResources: {_id: query.resourceId}}
                    }
                } )
            );
            if( err ) {
                Y.log( `deleteRequiredResource. Error while deleting resource with _id ${query.resourceId} from scheduletype ${query.scheduletypeId}. Error: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, result, callback );
        }

        /**
         * @public
         * @async
         * @JsonRpcApi
         *
         * This method does below:
         * 1] Add new requiredResources inside a scheduleType
         * 2] Update existed requiredResources inside a scheduleType
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {Array} args.originalParams.created - Array of resource objects which should be inserted into scheduleType
         * @param {Array} args.originalParams.updated - Array of resource objects which should be updated inside scheduleType
         * @param {function} [args.callback] - If present then response will be sent via callback
         * @returns {Promise<undefined>}
         */
        async function updateRequiredResources( args ) {
            const
                {user, query, data, callback} = args,
                {created, updated} = data;

            let
                err, result,
                res = {
                    created: 0,
                    updated: 0
                };

            if( !query || !query._id ) {
                Y.log( `updateRequiredResources. Missing params.`, 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ), undefined, callback );
            }

            if( created.length > 0 ) {
                for( let item of created ) {
                    item = Y.doccirrus.filters.cleanDbObject( item );
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'scheduletype',
                            query: query,
                            data: {
                                $addToSet: {requiredResources: item}
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateRequiredResources. Error while adding new resources for scheduletype: ${query._id}. Error: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( result && result.nModified ) {
                        res.created += result.nModified;
                    }
                }
            }

            if( updated.length > 0 ) {
                for( let item of updated ) {
                    item = Y.doccirrus.filters.cleanDbObject( item );
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'scheduletype',
                            query: {
                                _id: query._id,
                                'requiredResources._id': item._id
                            },
                            data: {
                                $set: {
                                    'requiredResources.$[elem]': item
                                }
                            },
                            options: {
                                "arrayFilters": [{'elem._id': new ObjectId( item._id )}]
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateRequiredResources. Error while updating of resources in scheduletype: ${item.scheduletypeId}. Error: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }
                    if( result && result.nModified ) {
                        res.updated += result.nModified;
                    }
                }
            }
            return handleResult( null, res, callback );
        }


        Y.namespace( 'doccirrus.api' ).scheduletype = {

            name: NAME,

            /**
             * Read scheduletypes for the admin section to edit them
             * @method readScheduletypeForEdit
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {Function} parameters.callback
             * @param {Object} parameters.user
             */
            readScheduletypeForEdit: function readScheduletypeForEdit( parameters ) {
                Y.log('Entering Y.doccirrus.api.scheduletype.readScheduletypeForEdit', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.scheduletype.readScheduletypeForEdit');
                }
                var
                    params = parameters.originalParams,
                    query = params.query || {},
                    callback = parameters.callback,
                    user = parameters.user;

                require( 'async' ).parallel(
                    {
                        calendar: function calendar_parallel( calendarCallback ) {
                            Y.doccirrus.mongodb.runDb(
                                {
                                    user: user,
                                    model: 'calendar',
                                    action: 'get',
                                    options: {
                                        select: {name: 1}
                                    }
                                },
                                function calendar_parallel_runDb( error, result ) {
                                    calendarCallback( error, Array.isArray( result ) && result.map( function calendar_parallel_map( calendar ) {
                                        return calendar.toObject ? calendar.toObject() : calendar;
                                    } ) );
                                }
                            );
                        },
                        scheduletype: function scheduletype_parallel( scheduletypeCallback ) {
                            Y.doccirrus.mongodb.runDb(
                                {
                                    user: user,
                                    model: 'scheduletype',
                                    action: 'get',
                                    query: query,
                                    options: {
                                        sort: {_id: 1}
                                    }
                                },
                                function scheduletype_parallel_runDb( error, result ) {
                                    scheduletypeCallback( error, Array.isArray( result ) && result.map( function scheduletype_parallel_map( scheduletype ) {
                                        var
                                            item = scheduletype.toObject ? scheduletype.toObject() : scheduletype;

                                        // ensure availability of fields migrated also with "ensureScheduletypeFields_2_6"
                                        if( !item.hasOwnProperty( 'info' ) ) {
                                            item.info = '';
                                        }

                                        if( !item.hasOwnProperty( 'isPreconfigured' ) ) {
                                            item.isPreconfigured = false;
                                        }

                                        if( !item.hasOwnProperty( 'capacity' ) ) {
                                            item.capacity = 0;
                                        }

                                        return item;
                                    } ) );
                                }
                            );
                        }
                    },
                    function readScheduletypesAdmin_complete( error, result ) {
                        if( error ) {
                            return callback( error );
                        }
                        var
                            calendars = {};

                        // build calendars map
                        result.calendar.forEach( function readScheduletypesAdmin_calendar_forEach( calendar ) {
                            calendars[calendar._id] = calendar;
                        } );

                        // associate calendarRefs with calendar
                        result.scheduletype.forEach( function readScheduletypesAdmin_scheduletype_forEach( scheduletype ) {
                            var
                                calendarRefs = scheduletype.calendarRefs;

                            if( Array.isArray( calendarRefs ) ) {

                                calendarRefs.forEach( function readScheduletypesAdmin_scheduletype_calendarRefs_forEach( calendarRef, index, all ) {
                                    var
                                        calendar = calendars[calendarRef.calendarId];

                                    all[index] = null;

                                    if( calendar ) {
                                        all[index] = {
                                            _id: calendarRef._id,
                                            calendarId: calendarRef.calendarId,
                                            name: calendar.name
                                        };
                                    }

                                } );

                                scheduletype.calendarRefs = Y.Array.filter( scheduletype.calendarRefs, function readScheduletypesAdmin_scheduletype_calendarRefs_filter( calendarRef ) {
                                    return Boolean( calendarRef );
                                } );

                            }
                        } );

                        // return populated calendarRefs
                        callback( error, result.scheduletype );
                        // clean up
                        delete result.calendar;
                        delete result.scheduletype;
                        calendars = null;
                        result = null;
                    }
                );

            },

            /**
             * Read available calendars for scheduletype editing in the admin section
             * @method readScheduletypeForEdit
             * @param {Function} parameters.callback
             * @param {Object} parameters.user
             */
            readCalendarForScheduletypeEdit: function readCalendarForScheduletypeEdit( parameters ) {
                Y.log('Entering Y.doccirrus.api.scheduletype.readCalendarForScheduletypeEdit', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.scheduletype.readCalendarForScheduletypeEdit');
                }
                var
                    callback = parameters.callback,
                    user = parameters.user;

                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'calendar',
                        action: 'get',
                        query: {
                            mirrorCalendarId: {$exists: false}
                        },
                        options: {
                            select: {
                                name: 1,
                                employee: 1,
                                isPublic: 1
                            }
                        }
                    },
                    function calendar_runDb( error, result ) {
                        callback( error, Array.isArray( result ) && Y.Array.filter( result, function( calendar ) {
                            return Y.doccirrus.schemas.calendar.isDoctorCalendar( String( calendar._id ) );
                        } ) );
                    }
                );
            },

            /**
             * Removes unused CalendarRefs from all "scheduletype"s
             * @param {Object} parameters
             * @param {Function} parameters.callback
             * @param {Function} [parameters.migrate=false]
             * @param parameters.user
             */
            removeUnusedCalenderRefs: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.scheduletype.removeUnusedCalenderRefs', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.scheduletype.removeUnusedCalenderRefs');
                }
                var
                    callback = parameters.callback,
                    user = parameters.user,
                    migrate = parameters.migrate || false;

                Y.doccirrus.mongodb.getModel( user, 'scheduletype', true, function getModelAndUpdate( error, scheduletype ) {
                    if( error ) { // considered model doesn't exist
                        return callback( null );
                    }

                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: 'calendar',
                            action: 'get',
                            migrate: migrate,
                            options: {select: {_id: 1}}
                        },
                        function calendar_runDb( error, result ) {
                            if( error ) {
                                return callback( error, null );
                            }
                            var
                                availableCalendarIds = result.map( function( calendar ) {
                                    return String( calendar._id );
                                } );

                            scheduletype.mongoose.collection.update(
                                {},
                                {$pull: {calendarRefs: {calendarId: {$nin: availableCalendarIds}}}},
                                {multi: true},
                                callback
                            );
                        }
                    );

                } );
            },

            /**
             * Read scheduletypes that belong to a given calendar
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {String} parameters.originalParams.calendarId
             */
            readScheduletypesForCalendarId: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.scheduletype.readScheduletypesForCalendarId', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.scheduletype.readScheduletypesForCalendarId');
                }
                var
                    params = parameters.originalParams,
                    callback = parameters.callback,
                    user = parameters.user,
                    calendarId = params.calendarId;

                if( !calendarId ) {
                    return callback( Y.doccirrus.errors.rest( 400, 'calendarId required' ) );
                }

                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'scheduletype',
                        action: 'get',
                        query: {'calendarRefs.calendarId': String( calendarId )}
                    },
                    callback
                );
            },
            getScheduleTypeForPartner( args ){
                Y.log('Entering Y.doccirrus.api.scheduletype.getScheduleTypeForPartner', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.scheduletype.getScheduleTypeForPartner');
                }
                getScheduleTypeForPartner( args );
            },
            deleteRequiredResource( args ) {
                Y.log('Entering Y.doccirrus.api.scheduletype.deleteRequiredResource', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.scheduletype.deleteRequiredResource');
                }
                deleteRequiredResource( args );
            },
            updateRequiredResources( args ) {
                Y.log('Entering Y.doccirrus.api.scheduletype.updateRequiredResources', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.scheduletype.updateRequiredResources');
                }
                updateRequiredResources( args );
            }

        };

    },
    '0.0.1', {
        requires: [
            'scheduletype-schema',
            'calendar-schema'
        ]
    }
);
