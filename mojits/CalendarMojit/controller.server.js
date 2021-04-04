/**
 * User: rrrw
 * Date: 13/11/2012  13:33
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

/**
 * The Calendar Mojit.
 *
 *  Everything to do with Calendars, schedules, and repetitions (events, instances of reps)
 *  including scheduling logic can be found here.
 *
 * @module calendar
 * @main calendar
 */


YUI.add( 'CalendarMojit', function( Y, NAME ) {

        /**
         * Constructor for the Controller class.
         *
         * @module calendar
         * @namespace mojito.controllers
         * @class CalendarMojit
         * @constructor
         */
        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             * Method corresponding to the 'index' action.
             *
             * @method index
             * @param {Object} ac
             */
            calendar: function( ac ) {
                if( !Y.doccirrus.auth.hasModuleAccess( ac.http.getRequest() && ac.http.getRequest().user, NAME ) ) {
                    Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
                    return;
                }

                ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/fullcalendar/2.8.0/fullcalendar.min.css' );
                ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/fullcalendar/scheduler/1.3.2/scheduler.min.css' );

                ac.assets.addCss( './css/CalendarMojit.css' );
                ac.assets.addCss( './css/fullcalendar-bootstrap.css' );
                ac.assets.addCss( './css/fullcalendar-dc.css' );
                ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.css' );

                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/fullcalendar/2.8.0/fullcalendar.min.js', 'bottom' );
                ac.assets.addJs( './js/fullcalendar-rightclick.js', 'bottom' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/fullcalendar/2.8.0/lang-all.js', 'bottom' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/fullcalendar/scheduler/1.3.2/scheduler.min.js', 'bottom' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.js', 'bottom' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/jquery-sortable/0.9.13/source/js/jquery-sortable.js', 'bottom' );

                ac.done( {
                    status: 'ok',
                    data: null
                }, { http: {}, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.CALENDAR' ) } );

            },

            /**
             * Method corresponding to the 'waitinglist' action.
             *
             * @method waitinglist
             * @param {Object} ac
             */
            waitinglist: function( ac ) {
                ac.assets.addCss( './css/dccalendar.css' );
                //ac.assets.addCss( './themes/cirrus/theme.css','top' );
                //ac.assets.addCss( './fullcalendar-1.6.0/fullcalendar/fullcalendar.print.css','top' );

                ac.done( {
                    status: 'ok',
                    data: null
                }, {
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.CALENDAR' )
                } );
            },

            /*
             ========================  REST ============================
             */


            getModelName: function() {
                return 'calendar';
            },
            /**
             * Search for a record, or carry out a custom action on any of the
             * Calendar models.
             * @method get
             * @param {Object} ac
             */
            get: function( ac ) {
                var callback = this._getCallback( ac );

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: ac.rest.model,
                    user: ac.rest.user,
                    query: ac.rest.query,
                    options: ac.rest.options
                }, callback );

            },

            /**
             * Scheduling Logic
             *
             * adjusts start times and etas of all of today's events
             * from now()- onward...
             * returns as a single list.
             * Books a semaphore to the DB for scheduling. Does not lock
             * the entire collection it works on, so minor inconsistencies
             * can arise, but this prevents full-blown schedule calculation
             * race conditions, where two processes are trying to write
             * a lot of changes to the patient scheduling.
             * @param {Object} ac
             */
            'calculateschedule': function( ac ) {
                var
                    myCallback =
                        this._getCallback( ac, {} ),
                    data = ac.rest.originalparams,
                    user = ac.rest.user;

                Y.doccirrus.api.calevent.calculateSchedule({
                    user,
                    data,
                    callback: myCallback
                });

            },

            'getMixedCalData': function( ac ) {
                var
                    callback = this._getCallback( ac ),
                    scheduleTypes,
                    calendars,
                    result = {};

                function handleCalendars( err, data ) {
                    if( !err && data ) {
                        calendars = data;
                        result.types = scheduleTypes;
                        result.calendars = calendars;
                        callback( null, result );
                    }
                }

                function handleScheduleTypes( err, data ) {
                    if( !err && data ) {
                        scheduleTypes = data;
                    } else {
                        Y.doccirrus.mongodb.runDb( {
                            user: ac.rest.user,
                            model: 'calendar',
                            action: 'get',
                            callback: handleCalendars,
                            query: {},
                            options: {}
                        } );
                    }
                }

                Y.doccirrus.mongodb.runDb( {
                    user: ac.rest.user,
                    model: 'scheduletype',
                    action: 'get',
                    callback: handleScheduleTypes,
                    query: { isPublic: true },
                    options: {}
                } );
            },

            /**
             * Gets all schedule types.
             *
             * get with http://localhost:3000/r/scheduletype/?action=getScheduletypes
             * @method getScheduletypes
             * @param {Object} ac
             */
            'getScheduletypes': function( ac ) {
                var
                    callback = this._getCallback( ac ),
                    user = ac.rest.user;

                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'scheduletype',
                    action: 'get',
                    query: {}
                }, callback );
            },

            'alertpatients': function( ac ) {
                var
                    user = ac.rest.user,
                    callback = this._getCallback( ac );

                Y.doccirrus.patalert.alertPatients( user, callback );
            },

            /**
             * get with http://localhost:3000/r/calendar/?action=getPatients
             * @method getPatients
             * @param {Object} ac
             */
            'getPatients': function( ac ) {
                var
                    callback = this._getCallback( ac ),
                    myData = ac.rest.originalparams,
                    user = ac.rest.user;

                Y.doccirrus.api.patient.getPatients( {
                        user: user,
                        query: {
                            term: myData.qe,
                            isStub: myData.isStub
                        },
                        callback: callback
                    }
                );
            }

        };
    },
    '0.0.1', {
        requires: [
            'mojito',
            'mojito-assets-addon',
            'mojito-params-addon',
            'mojito-intl-addon',
            'mojito-http-addon',
            'mojito-data-addon',
            'dcscheduling',
            'dcauth'
        ]
    }
);
