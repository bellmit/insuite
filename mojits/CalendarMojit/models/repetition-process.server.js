/**
 * User: ma
 * Date: 27/05/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'repetition-process', function( Y, NAME ) {


        function cleanData( user, repetition, callback ) {
            repetition.repetition = undefined;
            callback( null, repetition );
        }

        /**
         * delete a marked repetition if it doesn't belong to a series anymore
         * @param user
         * @param repetition
         * @param callback
         */
/*
        function garbageCleanUp( user, repetition, callback ) {

            if( !repetition.deleted ) {
                callback( null, repetition );
                return;
            }

            // get a master schedule whose series contains this repetition
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'schedule',
                query: {
                    _id: repetition.scheduleId,
                    repetition: {$ne: null},
                    dtstart: {$lte: repetition.start},
                    $or: [
                        {until: {$gte: repetition.start}},
                        {until: null}
                    ]
                },
                callback: function( err, result ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    if( result && result[0] ) {
                        callback( null, repetition );
                    } else {
                        Y.log( 'deleting the dangling repetition: ' + JSON.stringify( repetition ), 'debug', NAME );
                        repetition.remove();
                        callback( null, repetition );
                    }
                }
            } );
        }
*/

/*
        /!**
         * handle special cases when a repetition is marked deleted
         * if there is no series entry before this one then shrink series up to the next alive entry
         *
         * @param user
         * @param repetition
         * @param callback
         *!/
        function updateSeries( user, repetition, callback ) {

            if( true !== repetition.deleted || !repetition.isModified( 'deleted' ) ) {
                callback( null, repetition );
                return;
            }

            var
                masterSchedule,
                myStart = new Date( repetition.start.getYear() + 1900, repetition.start.getMonth(), repetition.start.getDate() ); // zeroed seconds

            function getPreviousRepetition( err, result ) {
                var
                    previousOne = result && result[result.length - 1];

                if( err ) {
                    callback( err );
                    return;
                }
                if( !previousOne ) { // then this is the last repetition we are deleting, so delete the whole series
                    Y.doccirrus.api.calevent['delete']( {
                        user: user,
                        query: {_id: repetition.scheduleId},
                        data: {eventType: 'plan'},
                        callback: function( err1 ) {
                            if( err1 ) {
                                callback( err1 );

                            } else {
                                callback( null, repetition );
                            }
                        }
                    } );
                    return;
                }

                masterSchedule = Y.clone( previousOne.toObject ? previousOne.toObject() : previousOne, true );
                masterSchedule.scheduleId = null;
                masterSchedule.until = new Date( previousOne.start );
                Y.doccirrus.api.calevent.put( {
                    user: user,
                    query: {_id: repetition.scheduleId},
                    fields: ['until'],
                    data: masterSchedule,
                    noValidation: true,
                    noAudit: true,
                    callback: function( err1 ) {
                        if( err1 ) {
                            callback( err1 );

                        } else {
                            callback( null, repetition );
                        }
                    }
                } );
            }

            function getNextRepetition( err, result ) {
                var
                    nextOne = result && result[0];
                if( err ) {
                    callback( err );
                    return;
                }

                if( nextOne ) {
                    masterSchedule = Y.clone( nextOne.toObject ? nextOne.toObject() : nextOne, true );
                    masterSchedule.scheduleId = null;

                    // if this is the first repetition then update dtstart
                    if( nextOne.dtstart.toJSON() === myStart.toJSON() ) {
                        masterSchedule.dtstart = nextOne.start;
                        Y.doccirrus.api.calevent.put( { // shrink the series from its left
                            user: user,
                            query: {_id: repetition.scheduleId},
                            fields: ['dtstart'],
                            data: masterSchedule,
                            noValidation: true,
                            noAudit: true,
                            callback: function( err1 ) {
                                if( err1 ) {
                                    Y.log( 'error in modifying series start date: ' + JSON.stringify( err1 ), 'error', NAME );
                                    callback( err1 );

                                } else {
                                    callback( null, repetition ); // go on with post/put (this might result in garbage data)
                                }
                            }
                        } );

                    } else { // it's not the first, not the last entry
                        callback( null, repetition );
                    }

                } else { // this is the last entry in the series, so shrink the series from its right
                    // get the previous repetition
                    Y.doccirrus.calUtils.getNRepetitions( user, {scheduleOrId: repetition.scheduleId, baseDate: repetition.start, steps: -1, include: false}, getPreviousRepetition );
                }
            }

            // get the next entry in the series
            Y.doccirrus.calUtils.getNRepetitions( user, {scheduleOrId: repetition.scheduleId, baseDate: repetition.start, steps: 1, include: false}, getNextRepetition );
        }
*/

        /**
         * set title with the same policy for schedules
         * @param {Object}           user
         * @param {Object}          repetition
         * @param {Function}        callback
         * @return {*}              callback
         */
        function setTitle( user, repetition, callback ) {
            if( repetition.deleted ) {
                return callback( null, repetition );
            }
                Y.doccirrus.schemaprocess.schedule.setTitle( user, repetition, callback );
        }

        function alertWriteEvent( user, event, callback ) {
            var
                updatedFields = event.$__.activePaths.states.modify;
            if( !event.isNew && updatedFields.start && updatedFields.eta ) { // if the time was changed by a user
                if( '' === event.patient ) {
                    delete event._doc.patient; // a hack to prevent mongoose.populate crash
                }
                Y.doccirrus.patalert.alertEvents( user, [event], {updated: true}, function( err ) {
                    if( err ) {
                        Y.log( 'error came back from alertEvents. updated:true', 'error', NAME );
                    }
                } );
            }
            callback( null, event );
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class RepetitionProcess
         */
        NAME = Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [cleanData, /*updateSeries,*/ setTitle, alertWriteEvent], forAction: 'write'}
            ],

            post: [
                {run: [/*garbageCleanUp, */Y.doccirrus.schemaprocess.schedule.updateNextAppointment], forAction: 'write'}
            ],

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param   {Object}          data
                 * @returns {*|string|string}
                 */
                descrFn: function( data ) {
                    return Y.doccirrus.schemaprocess.schedule.describe( data, true );
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: [
        'oop',
        'schedule-process'
    ]}
);
