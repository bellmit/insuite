/*
 @author: rw
 @date: 2013 May
 */

/**
 * Library of Queueing functions specifically for separate calendar queues for doctors.
 *
 * Used by the scheduling library.
 *
 * Uses the YUI namespace.
 * @module calendar
 * @submodule dccalq
 */



/*jslint anon:true, nomen:true*/
/*global YUI*/



YUI.add( 'dccalq', function( Y, NAME ) {

        var
            moment = require( 'moment' ),
        // this is the singleton CalQ Object for the application
        // at the moment offers only static functions
            myCalQ;

        /**
         * Constructor for the module class.
         *
         * @submodule dccalq
         * @class DCCalQueue
         * @namespace doccirrus
         * @private
         */
        function DCCalQueue() {
            // purely static object at the moment, nothing in the instances.
        }

        DCCalQueue.prototype.init = function() {
        };

        DCCalQueue.prototype.isLate = function isLate( event ) {
            var
                fT = Y.doccirrus.scheduling.getFuzzyMinutes() * (60 * 1000); // millis

            if( event.start.getTime ) {
                if( (event.start.getTime() - fT) < Date.now() ) {
                    // can use now() because it is also in UTC
                    return true;
                }

            } else {
                // dealing with a moment or string
                if( moment.utc( event.start ).subtract( Y.doccirrus.scheduling.getFuzzyMinutes(), 'm' ).unix() <
                    moment().unix() ) {
                    return true;
                }
            }
            return false;
        };

        /**
         * Given  Queue (array) of events, log this in a log-friendly fashion
         *
         * @method  logQ
         * @param   {Array}             arrayQ the queue
         * @param   {Object}            verbose full events, otherwise just start, end, pushtime and number+title are printed
         */
        DCCalQueue.prototype.logQ = function logQ( arrayQ, verbose ) {
            var
                nonVirtual = false,
                msg = '',
                evt,
                i;
            // check loglevel before calling this function TODO YUI.logLevel === ??
            if( !arrayQ || !arrayQ.length ) {
                return;
            }
            for( i = 0; i < arrayQ.length; i++ ) {
                evt = arrayQ[i];
                if( !Y.doccirrus.scheduling.isVirtual( evt ) ) {
                    nonVirtual = true;
                }
                if( !msg ) {
                    msg = '\n';
                }
                msg = msg + (i < 10 ? ' ' + i : i) + '. ' +
                      moment( evt.start ).format( 'YY-MM-DD HH:mm:ss' ) + ' - ' +
                      moment( evt.end ).format( 'YY-MM-DD HH:mm:ss' ) + ' | ' +
                      moment( evt.pushtime ).format( 'YY-MM-DD HH:mm:ss' ) + ' | ' +
                      (evt.number || ' T') + ' ' + evt.title + '\n';

                // added to allow this file to pass jslint, strix, 2014-04-17
                if( verbose ) {
                    msg = msg + '';
                }
            }
            if( nonVirtual ) {
                Y.log( msg,
                    'debug',
                    NAME
                );
            }
        };

        /**
         * Checks all parameters of the event to see if it can be pushed.
         *
         * @method  canPush
         * @param   {Object}            event
         *
         * @return  {Boolean}
         */
        DCCalQueue.prototype.canPush = function canPush( event ) {
            // start with cheap checks:
            // 01. is it scheduled, anything in state 1 or 2 may no longer be moved.
            //     is it a consult time
            //     is it a close time
            if( event.scheduled ||
                event.consultTime ||
                event.closeTime ) {
                return false;
            }
            // 02. cannot push a master
            if(  Y.doccirrus.calUtils.isMasterSchedule( event ) ) {
                return false;
            }
            // 03. check is adhoc
            if( event.adhoc ) {
                if( Y.doccirrus.schemas.calendar.SCH_WAITING === event.scheduled ) {
                    return true;
                }
                // cannot move admitted or ended events.
                return false;
            }
            return false;

            // This code is staying in, in case, PM makes this parallelism
            // configurable.  Serial variable needs to be passed in somehow
            // to change this
            //
            //            if( isSerialOperation && this.isLate( event ) ) {
            //                return true;
            //            }

        };

        /**
         * Returns the number of queues (calendars) in the list.
         *
         * @method getNumOfQs
         * @param {Array}           list  list of all the days' events
         * @return {Array}
         */
        DCCalQueue.prototype.getNumOfQs = function getNumOfQs( list ) {
            var i, cnt = 0, cals = {};

            for( i = 0; i < list.length; i++ ) {
                if( !cals[list[i].calendar] ) {
                    cals[list[i].calendar] = true;
                    cnt++;
                }
            }
            return cnt;
        };
        /**
         * Given an array of events, sorts these into the appropriate queue.
         * I.e. each element in the return is a queue for a different calendar.
         *
         * Preserves sort order of list in the queues.
         *
         * @method getQs
         * @param {Array} list a list of calevents or ranges containing calendarId
         * @return {Array} of arrays.  Each calendar event in the sub-arrays belongs
         *                  to the same calendar. So a list of unique calendars for today
         *                  is   qs[i][0].calendar
         */
        DCCalQueue.prototype.getQs = function getQs( list ) {
            var i, cnt = 0, cals = {}, arr = [];

            for( i = 0; i < list.length; i++ ) {
                if( undefined === cals[list[i].calendar] ) {
                    // this is a new queue... add it
                    cals[list[i].calendar] = cnt;
                    // simultaneously draw up a list
                    arr.push( [list[i]] );
                    cnt++;
                } else {
                    // the queue exists, add to it.
                    arr[cals[list[i].calendar]].push( list[i] );
                }
            }
            return arr;
        };

        /**
         * Returns a sorted list of events for a specific calendar.
         *
         * @method gerQueue
         * @param {ObjectId} calId  calendar id
         * @param {rray} list  sorted list of all the days' events
         * @return {Array}
         */
        DCCalQueue.prototype.getQueue = function getQueue( calId, list ) {
            var i,
                result = [];

            // since the list is sorted, the result will also be sorted.
            for( i = 0; i < list.length; i++ ) {
                if( calId.toString() === list[i].calendar.toString() ) {
                    result.push( list[i] );
                }
            }
            return result;
        };

        /**
         * Gets the pushtime sorted version of the given list. This is the
         * basis of the push.
         *
         * @param   {Object}            user
         * @param   {Array}             list
         *
         * @return {Array}
         */
        DCCalQueue.prototype.getPushTimeQ = function getPushTimeQ( user,  list ) {
            var
                now = Date.now(),
                diff = Y.doccirrus.scheduling.getFuzzyMinutes() * (60 * 1000), // millis
            // shallow copy
                listCp = [].concat( list );

            /**
             * get a mongoose calendar event,
             * reset the pushtime on this event
             * save it to the mongoose DB.
             *
             * @param {Object} evt
             * @return {*}  returns the events pushtime.
             */
            function getAdjPushTime( evt ) {
                if( evt.pushtime.getTime() + diff < now ) {
                    evt.pushtime = 0;

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'put',
                        query: {
                            _id: evt._id
                        },
                        fields: ['pushtime'],
                        data: Y.doccirrus.filters.cleanDbObject( {
                            pushtime: evt.pushtime
                        } )
                    }, ( err ) => {
                        if( err ) {
                            Y.log( 'Error during reset the pushtime on event ' + JSON.stringify( err ), 'error' );
                        }
                        Y.log( 'Reset the pushtime on event ' + evt._id.toString(), 'debug', NAME );
                    } );
                }
                return evt.pushtime;
            }

            // it is necessary to zero elements pushtime
            // zero the elements older than a certain time (PUSH_TIMEOUT - 2 minutes)
            // we do it in the sort...
            // sort the list
            listCp.sort( function( a, b ) {
                var
                    ap = getAdjPushTime( a ).getTime(),
                    bp = getAdjPushTime( b ).getTime(),
                    as = a.start.getTime(),
                    bs = b.start.getTime();

                if( ap === bp ) {
                    // check start time
                    if( as === bs ) {
                        return 0;
                    }
                    return ( as < bs ? -1 : 1);
                }
                return ( ap < bp ? -1 : 1);
            } );

            return listCp;
        };

        DCCalQueue.prototype.getListEvt = function getListEvt( list, id ) {
            var
                result = null,
                i;
            if( list && list[0] ) {
                for( i = 0; i < list.length; i++ ) {
                    if( list[i]._id && id === list[i]._id.toString() ) {
                        result = list[i];
                    }
                }
            }
            return result;
        };

        myCalQ = new DCCalQueue();
        //myCalQ.init();

        Y.namespace( 'doccirrus' ).calq = myCalQ;

    },
    '0.0.1', {requires: []}
);
