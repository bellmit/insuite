/**
 * User: rrrw
 * Date: 01/07/2014  15:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'calendar-process', function( Y, NAME ) {
        /**
         * The DC Calendar data process definition
         *
         * @class EventProcess
         */

        const
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult} = require( 'dc-core' ).utils;


        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Cascade delete of calendar to related calendar events
         *
         * @param {Object}          user
         * @param {Object}          calendar
         * @param {Function}        callback
         */
        function deleteCalendarEvents( user, calendar, callback ) {

            function handleErr( err ) {
                if( err ) {
                    Y.log( 'Problem deleting related calevents after calendar deletion. Ignoring:  ' + err, 'error', NAME );
                    Y.log( err.stack, 'info', NAME );
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'delete',
                model: 'repetition',
                query: {calendar: calendar._id},
                options: {override: true}
            }, handleErr );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'delete',
                model: 'schedule',
                query: {calendar: calendar._id},
                options: {override: true}
            }, handleErr );

            callback( null, calendar );
        }

        /**
         * removes CalendarRef at an "scheduletype" for a calendar
         *
         * @param {Object}          user
         * @param {Object}         calendar
         * @param {Function}       callback
         */
        function removeCalendarRefAtScheduletypeForCalendar( user, calendar, callback ) {
            var
                calendarId = String( calendar._id );

            Y.doccirrus.mongodb.getModel( user, 'scheduletype', true, function getModelAndUpdate( error, scheduletype ) {
                if( error ) {
                    return callback( error );
                }
                scheduletype.mongoose.collection.update(
                    {calendarRefs: {$elemMatch: {calendarId: calendarId}}},
                    {$pull: {calendarRefs: {calendarId: calendarId}}},
                    {multi: true},
                    function( err ) {
                        callback( err, calendar );
                    }
                );
            } );
        }

        function addRefToScheduletype( user, calendar, callback ) {
            if( calendar && 'INFORMAL' === calendar.type || calendar.mirrorCalendarId || !calendar.wasNew ) {
                return callback( null, calendar );
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'scheduletype',
                action: 'put',
                query: {_id: Y.doccirrus.schemas.scheduletype.getStandardId()},
                options: {},
                data: {calendarRefs: {calendarId: calendar._id}, skipcheck_: true},
                fields: ['calendarRefs'],
                callback: function( err ) {
                    if( err ) {
                        Y.log( 'Error Auto-adding schedule type to cal' + JSON.stringify( err ), 'error', NAME );
                    }
                    callback( err, calendar );
                }
            } );
        }

        function emitCalendar( user, calendar, callback ) {
            if( calendar && 'INFORMAL' === calendar.type || calendar.mirrorCalendarId || calendar.wasNew ) {
                return callback( null, calendar );
            }
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                event: `calendar.blockedSlotRefresh`,
                tenantId: user && user.tenantId,
                msg: {
                    data: calendar._id && calendar._id.toString()
                }
            } );
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                event: `calendar.consultTimeRefresh`,
                tenantId: user && user.tenantId,
                msg: {
                    data: calendar._id && calendar._id.toString()
                }
            } );
            return callback( null, calendar );
        }

        /**
         * Creates audit log entry that partner calendar was activated/registered
         *
         * @param {object} user
         * @param {{
         *          _id: <ObjectId>,
         *          type: <String>,
         *          name: <String>,
         *          isPublic: <Boolean>,
         *          locationId: <ObjectId>,
         *          consultTimes: [Object],
         *          specialConsultTimes: [Object],
         *          calGroup: [String],
         *          color: <String>,
         *          employee: <String>,
         *          isShared: <Boolean>,
         *          mirrorCalendarId: <ObjectId>
         *        }} calendar :REQUIRED: Object which is passed to pre/post process
         * @param {function} callback
         * @returns {function} callback
         */
        async function auditActivationOfPartner( user, calendar, callback ) {
            let
                oldData = calendar.originalData_ || {},
                err,
                registeredOnAgent = calendar.wasNew && Boolean( calendar.mirrorCalendarId ),
                description = registeredOnAgent ?
                    i18n( 'calendar-api.text.PARTNER_CALENDAR_WAS_REGISTERED', {data: {name: calendar.name}} ) :
                    i18n( 'calendar-api.text.PARTNER_CALENDAR_WAS_ACTIVATED', {data: {name: calendar.name}} ),
                entry = Y.doccirrus.api.audit.getBasicEntry( user, 'put', 'calendar', description );

            if( ( oldData.isShared !== calendar.isShared && calendar.isShared ) || registeredOnAgent ) {
                entry.objId = calendar._id;

                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'audit',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( entry )
                    } )
                );

                if( err ) {
                    Y.log( `auditActivationOfPartnerOnMaster: Error while creating audit entry: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                return callback( null, calendar );
            } else {
                return callback( null, calendar );
            }
        }

        /**
         * Send updated calendar data to all confirmed partners if this calendar is shared
         *
         * @param {object} user
         * @param {{
         *          _id: <ObjectId>,
         *          type: <String>,
         *          name: <String>,
         *          isPublic: <Boolean>,
         *          locationId: <ObjectId>,
         *          consultTimes: [Object],
         *          specialConsultTimes: [Object],
         *          calGroup: [String],
         *          color: <String>,
         *          employee: <String>,
         *          isShared: <Boolean>
         *        }} calendar :REQUIRED: Object which is passed to pre/post process
         * @param {function} callback
         * @returns {function} callback
         */
        async function updateCalendarOnPartner( user, calendar, callback ) {
            let err, partners;
            if( calendar.isShared && !calendar.mirrorCalendarId ) {
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
                    Y.log( `updateCalendarOnPartner. Error while getting partners: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }

                if( !partners || !partners.length ) {
                    // no partners to update
                    Y.log( `updateCalendarOnPartner. There is no partners to send info to.`, 'info', NAME );
                    return callback( null, calendar );
                }

                partners.forEach( async ( item ) => {
                    [err] = await formatPromiseResult(
                        new Promise( function( resolve, reject ) {
                            Y.doccirrus.communication.callExternalApiByCustomerNo( {
                                api: 'mirrorcalendar.updateMirrorCalendarFromMaster',
                                dcCustomerNo: item.dcId,
                                user: user,
                                query: {},
                                useQueue: true,
                                data: {
                                    _id: calendar._id,
                                    name: calendar.name,
                                    color: calendar.color
                                },
                                options: {},
                                callback: onCalledExternalAPI
                            } );

                            function onCalledExternalAPI( err ) {
                                if( err ) {
                                    Y.log( `Partner (dcCustomerNo: ${item.dcId}) calendar synchronization error: ${err.stack || err}`, 'warn', NAME );
                                    return reject( err );
                                }
                                resolve();
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateCalendarOnPartner. Error received from agent on updateMirrorCalendarFromMaster: ${err.stack || err} `, 'warn', NAME );
                        return callback( err );
                    }
                } );
                return callback( null, calendar );
            } else {
                return callback( null, calendar );
            }
        }

        /**
         * Set value for wasNew if calendar is new (just created)
         *
         * @param {Object}          user
         * @param {Object}          calendar
         * @param {Function}        callback
         */
        function setWasNew( user, calendar, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                calendar.lastChanged = calendar.lastChanged || new Date();
            } else {
                calendar.lastChanged = new Date();
            }
            calendar.wasNew = calendar.isNew;
            callback( null, calendar );
        }

        function syncCalendarWithDispatcherOnDelete( user, calendar, callback ) {
            callback( null, calendar );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `calendar_${ calendar._id.toString()}`,
                entityName: 'calendar',
                entryId: calendar._id.toString(),
                lastChanged: calendar.lastChanged,
                onDelete: true
            }, () => {} );
        }

        function syncCalendarWithDispatcher( user, calendar, callback ) {
            callback( null, calendar );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `calendar_${ calendar._id.toString()}`,
                entityName: 'calendar',
                entryId: calendar._id.toString(),
                lastChanged: calendar.lastChanged,
                onDelete: false
            }, () => {} );
        }

        /**
         * Class Event Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [Y.doccirrus.filtering.models.calendar.resultFilters[0], setWasNew],
                    forAction: 'write'
                },
                {run: [Y.doccirrus.filtering.models.calendar.resultFilters[0], syncCalendarWithDispatcherOnDelete], forAction: 'delete'}
            ],
            post: [
                {run: [removeCalendarRefAtScheduletypeForCalendar, deleteCalendarEvents], forAction: 'delete'},
                {run: [addRefToScheduletype, emitCalendar, auditActivationOfPartner, updateCalendarOnPartner, syncCalendarWithDispatcher ], forAction: 'write'}
            ],

            name: NAME,

            audit: {},

            processQuery: Y.doccirrus.filtering.models.calendar.processQuery,
            processAggregation: Y.doccirrus.filtering.models.calendar.processAggregation
        };

    },
    '0.0.1', {requires: ['calendar-schema', 'dcdatafilter']}
);
