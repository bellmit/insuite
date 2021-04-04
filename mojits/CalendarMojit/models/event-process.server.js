/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


// add this to the DBLayer TODO MOJ-805

YUI.add( 'event-process', function( Y, NAME ) {
        /**
         * The DC Event data schema definition
         *
         * @class EventProcess
         */

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Show patient params in a result set with repetition/schedule events
         *
         * Add fields from the patient to the given result set. Fields is a space delimited
         * string of fields to add, eg.  'firstname lastname'
         *
         * @param   {Object}            user
         * @param   {Array}             resultList
         * @param   {String}            fields
         * @param   {Function}          callback
         */
        function addPatientInfo( user, resultList, fields, callback ) {

            function handlePatientModel( err, model ) {
                var flds = '_id';

                if( err ) {
                    callback( err );
                    return;
                }
                Y.log( 'Adding patient info', 'info', NAME );
                if( fields && 'string' === typeof fields ) {
                    flds = flds + ' ' + fields;
                }
                //workaround for handling empty string ref values - crashes server when trying to convert to objid
                // (see location fn)
                model.mongoose.populate(
                    resultList,
                    [
                        {
                            path: 'patient', select: flds
                        }
                    ],
                    callback );
            }

            Y.doccirrus.mongodb.getModel( user, 'patient', handlePatientModel );
        }

        /**
         * Show location params in a result set with repetition/schedule events
         *
         * Add the locname to the given result set. Fields is a space delimited
         * string of additional fields besides locname, eg.  'email phone'
         *
         * @param   {Object}            user
         * @param   {Array}             resultList
         * @param   {String}            fields
         * @param   {Function}          callback
         */
        function addLocationInfo( user, resultList, fields, callback ) {
            var
                interimResults;

            function handleLocationModel( err, model ) {
                var flds = 'locname';

                if( err ) {
                    callback( err );
                    return;
                }
                Y.log( 'Adding location, interim results  ' + JSON.stringify( interimResults ), 'info', NAME );
                if( fields && 'string' === typeof fields ) {
                    flds = flds + ' ' + fields;
                }

                model.mongoose.populate(
                    interimResults,
                    [
                        {
                            path: 'calendar.locationId', select: flds
                        },
                        {
                            path: 'patient.insuranceStatus.locationId', select: flds
                        }
                    ],
                    callback );
            }

            addCalendarInfo( user, resultList, 'locationId', function getLModel( err, results ) {
                if( err ) {
                    callback( err );
                    return;
                }
                interimResults = results;
                Y.doccirrus.mongodb.getModelReadOnly( user, 'location', handleLocationModel );
            } );
        }

        /**
         * Show Calendar params in a result set with repetition/schedule events
         *
         * Add the cal name to the given result set. Fields is a space delimited
         * string of additional fields besides calname, eg.  'isPublic color'
         * @param   {Object}            user
         * @param   {Array}             resultList
         * @param   {String}            fields
         * @param   {Function}          callback
         */
        function addCalendarInfo( user, resultList, fields, callback ) {
            var i,
                flds = 'name';

            function handleCalendarModel( err, model ) {
                if( err ) {
                    return callback( err );
                }
                if( fields && 'string' === typeof fields ) {
                    flds = flds + ' ' + fields;
                }

                //workaround for handling empty string ref values - crashes server when trying to convert to objid
                for( i = 0; i < resultList.length; i++ ) {
                    resultList[i].calendar = resultList[i].calendar || undefined;
                }
                model.mongoose.populate(
                    resultList,
                    [
                        {path: 'calendar', select: flds}
                    ],
                    callback );
            }

            Y.doccirrus.mongodb.getModel( user, 'calendar', handleCalendarModel );
        }

        /**
         * Perhaps a way to hardwire event population?
         *
         * @param {Object}          user
         * @param {Array}           itemList
         * @param {Array}         show
         * @param {Function}        callback
         * @return {*} callback
         */
        function populateEvent( user, itemList, show, callback ) {
            function _final( err, result ) {
                Y.log( 'Added show information: ' + JSON.stringify( result ), 'debug', NAME );
                callback( err, result );
            }

            function doLocation( err, result ) {
                if( -1 < show.indexOf( 'location' ) ) {
                    Y.log( 'Adding show information: location', 'debug', NAME );
                    addLocationInfo( user, result, 'email phone street houseno zip city emailFooter', _final );
                } else {
                    return _final( err, result );
                }
            }

            if( show ) {
                Y.log( 'Adding show information: patient', 'debug', NAME );
                addPatientInfo( user, itemList, 'firstname lastname communications noMailing insuranceStatus', doLocation );
            } else {
                return callback( null, itemList );
            }
        }

        /**
         * Class Event Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [],

            post: [],

            populate: populateEvent,

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
