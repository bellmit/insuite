/*global YUI */
'use strict';

YUI.add( 'scheduletype-process', function( Y, NAME ) {

        const async = require( 'async' ),
            _ = require( 'lodash' ),
            {formatPromiseResult} = require('dc-core').utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function updateScheduleCapacity( user, scheduletype, callback ) {
            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'schedule',
                        action: 'get',
                        query: {
                            scheduletype: scheduletype._id.toString(),
                            group: true
                        }
                    }, next );
                },
                ( groupMasters, next ) => {
                    if( groupMasters && groupMasters[0] ) {
                        async.eachSeries( groupMasters, ( item, done ) => {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'count',
                                model: 'schedule',
                                query: { groupId: item._id.toString() }
                            }, ( error, result ) => {
                                if( error ) {
                                    return done( error );
                                }
                                if( result && result > 0 ) {
                                    if( result < scheduletype.capacity ) {
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'schedule',
                                            action: 'update',
                                            query: { _id: item._id },
                                            data: { $set: { capacityOfGroup: scheduletype.capacity - result } }
                                        }, ( err ) => {
                                            if( err ) {
                                                return done( err );
                                            }
                                            return done();
                                        } );
                                    } else {
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'schedule',
                                            action: 'update',
                                            query: { _id: item._id },
                                            data: { $set: { capacityOfGroup: 0 } }
                                        }, ( err ) => {
                                            if( err ) {
                                                return done( err );
                                            }
                                            return done();
                                        } );
                                    }
                                } else {
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'schedule',
                                        action: 'update',
                                        query: { _id: item._id },
                                        data: { $set: { capacityOfGroup: scheduletype.capacity } }
                                    }, ( err ) => {
                                        if( err ) {
                                            return done( err );
                                        }
                                        return done();
                                    } );
                                }
                            } );
                        }, ( err ) => {
                            if( err ) {
                                return next( err );
                            }
                            return next();
                        } );
                    } else {
                        return next();
                    }
                }
            ], ( err ) => {
                if( err ) {
                    return callback( err );
                }
                return callback( null, scheduletype );
            } );
        }

        /**
         * Send updated scheduletype data to all confirmed partners
         * - check if calendarRefs contains some shared calendar
         * - if yes, send update to partners
         *
         * @param {object} user
         * @param {{
         *          _id: <ObjectId>,
         *          type: <String>,
         *          name: <String>,
         *          color: <String>,
         *          isPreconfigured: <Boolean>,
         *          isPublic: <Boolean>,
         *          calendarRefs: [Object],
         *          durationUnit: <String>,
         *          duration: <Number>,
         *          capacity: <Number>
         *          numberOfSuggestedAppointments: <Number>
         *        }} scheduletype :REQUIRED: Object which is passed to pre/post process
         * @param {function} callback
         * @returns {function} callback
         */
        async function updateScheduleTypeOnPartner( user, scheduletype, callback ) {
            let err, partners, calendars,
                oldData = scheduletype.originalData_,
                oldCalendarRefs = oldData.calendarRefs || [],
                newCalendarRefs = scheduletype.calendarRefs || [],
                mixedRefs;

            // create a combined array of new and old calendarRefs
            // to check newly added or just removed calendars for partnership
            mixedRefs = [
                ...oldCalendarRefs.map( item => {
                    return item.calendarId;
                } ), ...newCalendarRefs.map( item => {
                    return item.calendarId;
                } )];
            mixedRefs = _.unique( mixedRefs );

            if( !mixedRefs || !mixedRefs.length ) {
                return callback( null, scheduletype );
            }
            [err, calendars] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'calendar',
                    action: 'get',
                    query: {
                        _id: {$in: mixedRefs},
                        isShared: true
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( !calendars || !calendars.length ) {
                //no shared calendars in calendarRefs of scheduletype
                return callback( null, scheduletype );
            }

            //get list of all confirmed partners
            [err, partners] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    action: 'get',
                    query: {
                        status: 'CONFIRMED'
                    },
                    options: {
                        lean: true,
                        select: {
                            dcId: 1,
                            name: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `updateScheduleTypeOnPartner. Error while getting partners: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !partners || !partners.length ) {
                // no partners to update
                return callback( null, scheduletype );
            }

            partners.forEach( async ( item ) => {
                    [err] = await formatPromiseResult(
                        new Promise( function( resolve, reject ) {
                            Y.doccirrus.communication.callExternalApiByCustomerNo( {
                                api: 'mirrorscheduletype.updateMirrorScheduleTypeFromMaster',
                                dcCustomerNo: item.dcId,
                                user: user,
                                query: {},
                                useQueue: true,
                                data: scheduletype,
                                options: {},
                                callback: onCalledExternalAPI
                            } );

                            function onCalledExternalAPI( err ) {
                                if( err ) {
                                    Y.log( `Partner (dcCustomerNo: ${item.dcId}) scheduletype synchronization error: ${err.stack || err}`, 'error', NAME );
                                    return reject( err );
                                }
                                resolve();
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `updateScheduleTypeOnPartner. Error received from agent on updateMirrorScheduleTypeFromMaster: ${err.stack || err} `, 'error', NAME );
                        return callback( err );
                    }
                }
            );
            return callback( null, scheduletype );
        }

        /**
         * Set initials values for for scheduletype
         *
         * @param user
         * @param scheduletype
         * @param callback
         */
        function setWasNew( user, scheduletype, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                scheduletype.lastChanged = scheduletype.lastChanged || new Date();
            } else {
                scheduletype.lastChanged = new Date();
            }
            scheduletype.wasNew = scheduletype.isNew;
            callback( null, scheduletype );
        }

        function syncScheduleTypeWithDispatcherOnDelete( user, scheduletype, callback ) {
            callback( null, scheduletype );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `scheduletype_${ scheduletype._id.toString()}`,
                entityName: 'scheduletype',
                entryId: scheduletype._id.toString(),
                lastChanged: scheduletype.lastChanged,
                onDelete: true
            }, () => {} );
        }

        function syncScheduleTypeWithDispatcher( user, scheduletype, callback ) {
            callback( null, scheduletype );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `scheduletype_${ scheduletype._id.toString()}`,
                entityName: 'scheduletype',
                entryId: scheduletype._id.toString(),
                lastChanged: scheduletype.lastChanged,
                onDelete: false
            }, () => {} );
        }

        /**
         * @private
         * @async
         *
         * This method does below:
         * 1] Finds all newly added and removed calendarRefs.
         * 2] Updates all resourceBased schedules of this scheduletype:
         *   - for schedules with calendar from 'addedRefs' set isReadOnly to 'false'
         *   - for schedules with calendar from 'removedRefs' set isReadOnly to 'true'
         * 3] Emits 'calendar.refresh' event with added and removed calendars to reflect all changes in schedules.
         *
         * @param {Object} user
         * @param {Object} scheduletype
         * @param {function} callback
         * @returns {function} callback
         */
        async function updateReadOnlyResourceSchedules( user, scheduletype, callback ) {
            const
                oldData = scheduletype.originalData_;

            let
                err, addedRefs, removedRefs,
                oldCalendarRefs = (oldData.calendarRefs || []).map( item => item.calendarId ),
                newCalendarRefs = (scheduletype.calendarRefs || []).map( item => item.calendarId );

            if( scheduletype.wasNew ) {
                return callback( null, scheduletype );
            }

            addedRefs = newCalendarRefs.filter( item => !oldCalendarRefs.includes( item ) );
            removedRefs = oldCalendarRefs.filter( item => !newCalendarRefs.includes( item ) );

            if( addedRefs ) {
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'update',
                        query: {
                            resourceBased: true,
                            isReadOnly: true,
                            scheduletype: scheduletype._id,
                            calendar: {$in: addedRefs}
                        },
                        data: {$set: {isReadOnly: false}},
                        options: {
                            multi: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `updateReadOnlyResourceSchedules. Error while setting readOnly to 'false': ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }
            if( removedRefs ) {
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'update',
                        query: {
                            resourceBased: true,
                            isReadOnly: false,
                            scheduletype: scheduletype._id,
                            calendar: {$in: removedRefs}
                        },
                        data: {$set: {isReadOnly: true}},
                        options: {
                            multi: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `updateReadOnlyResourceSchedules. Error while setting readOnly to 'true': ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                event: `calendar.refresh`,
                tenantId: user && user.tenantId,
                doNotChangeData: true,
                msg: {
                    data: [...addedRefs, ...removedRefs].map( item => item.toString() )
                }
            } );
            return callback( null, scheduletype );
        }

        /**
         * Calls function to update title of schedules of this scheduletype
         * if name of scheduletype was changed
         *
         * @param user
         * @param scheduletype
         * @param callback
         * @returns {Function} callback
         */
        async function updateScheduleTitle( user, scheduletype, callback ) {
            const oldData = scheduletype.originalData_;
            if( oldData && oldData.name !== scheduletype.name ) {
                let [err] = await formatPromiseResult( Y.doccirrus.utils.updateScheduleTitle( user, {
                    model: 'scheduletype',
                    entryId: scheduletype._id
                } ) );
                if( err ) {
                    Y.log( `updateScheduleTitle. Error while updating schedules: ${err.stack || err}`, 'error', NAME );
                }
            }
            return callback( null, scheduletype );
        }

        /**
         * Checks if there are some removed calendarRefs
         * - if yes then update those calendars by pulling out current scheduletype from scheduleTypes array of each consultTime and specificConsultTime
         * - if no just return a scheduletype
         * @param {Object} user
         * @param {Object} scheduletype
         * @param {Function} callback
         * @returns {Function} callback
         */
        async function updateCalendarRefsConsultTimeConfig( user, scheduletype, callback ) {
            const
                oldData = scheduletype.originalData_;

            let
                err, removedRefs,
                oldCalendarRefs = (oldData.calendarRefs || []).map( item => item.calendarId ),
                newCalendarRefs = (scheduletype.calendarRefs || []).map( item => item.calendarId );

            if( scheduletype.wasNew ) {
                return callback( null, scheduletype );
            }

            removedRefs = oldCalendarRefs.filter( item => !newCalendarRefs.includes( item ) );

            if( removedRefs ) {
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'update',
                        query: {
                            _id: {$in: removedRefs}
                        },
                        data: {
                            $pull: {
                                "consultTimes.$[].scheduleTypes": scheduletype._id,
                                "specificConsultTimes.$[].scheduleTypes": scheduletype._id
                            }
                        },
                        options: {
                            multi: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `updateCalendarRefsConsultTimeConfig. Error while updating calendar scheduleTypes: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }
            return callback( null, scheduletype );
        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                { run: [setWasNew], forAction: 'write' },
                { run: [syncScheduleTypeWithDispatcherOnDelete], forAction: 'delete' }
            ],
            post: [
                {
                    run: [
                        updateScheduleCapacity,
                        updateScheduleTypeOnPartner,
                        updateReadOnlyResourceSchedules,
                        syncScheduleTypeWithDispatcher,
                        updateScheduleTitle,
                        updateCalendarRefsConsultTimeConfig
                    ], forAction: 'write'
                }
            ],
            audit: {},
            name: NAME
        };
    },
    '0.0.1',
    {
        requires: []
    }
);
