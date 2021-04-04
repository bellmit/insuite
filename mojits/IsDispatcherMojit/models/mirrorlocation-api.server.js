/**
 * User: pi
 * Date: 04.05.16  12:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'mirrorlocation-api', function( Y, NAME ) {

        /**
         * Function to populate employees in locations.
         *
         * @param {Object} user
         * @param {Object} locations
         * @param {unction} callback
         */
        function populateEmployees( user, locations, callback ) {
            Y.log( 'Location API - locations', 'info', NAME );
            let
                _locations;

            function finalCb( err ) {
                if( err ) {
                    Y.log( 'Location API - locations finalCb ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }

                _locations = ( _locations || [] ).filter( el => el.employees && el.employees.length );

                if( Array.isArray( locations ) ) {
                    locations = _locations;
                } else {
                    locations.result = _locations;
                    locations.count = _locations.length;
                }

                callback( null, locations );
            }

            function getEmployees( location, _cb ) {

                function addEmployees( err, employees ) {

                    if( err ) {
                        Y.log( 'Location API - locations addEmployees' + JSON.stringify( err ), 'error', NAME );
                        _cb( err );
                        return;
                    }

                    location.employees = employees;
                    _cb();
                }


                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'mirrorlocation',
                    action: 'get',
                    options: {
                        lean: true
                    },
                    query: {
                        '_id': location._id
                    }
                }, (err, locations) => {
                    if( err ) {
                        Y.log( 'Location API - Error getting location for id: ' + location._id.toString() +  ' ' + err.message, 'error', NAME );
                    }

                    let locationId = ( locations[0] && true === locations[0].isMainLocation ) ? '000000000000000000000001' : location._id.toString();

                    Y.doccirrus.mongodb.runDb(
                        {
                            migrate: true,
                            user: user,
                            model: 'mirroremployee',
                            action: 'get',
                            options: {
                                lean: true
                            },
                            query: {
                                prcCustomerNo: location.prcCustomerNo,
                                'locations._id': locationId
                        }
                    }, addEmployees );
                } );
            }

            _locations = Array.isArray( locations ) ? locations : locations.result;
            require( 'async' ).each( _locations, getEmployees, finalCb );
        }

        function getLocation( args ) {
            let
                query = args.query || {},
                user = args.user,
                options = args.options || {},
                callback = args.callback;
            options.lean = true;

            Y.doccirrus.mongodb.runDb( {
                    migrate: ( args.options && args.options.migrate ),
                    action: 'get',
                    model: 'mirrorlocation',
                    user: user,
                    query: query,
                    options: options
                },
                function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }

                    if( args.originalParams && false === args.originalParams[Y.doccirrus.urls.PARAM_OBJPOPULATE] ) {
                        return callback( err, result );
                    }

                    populateEmployees( user, result, callback );
                } );

        }

        Y.namespace( 'doccirrus.api' ).mirrorlocation = {

            name: NAME,

            // override the default REST handler
            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.mirrorlocation.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorlocation.get');
                }
                getLocation( args );
            }
        };

    },
    '0.0.1', {requires: []}
);
