/*global YUI */

YUI.add( 'location-api', function( Y, NAME ) {

    const
        dns = require( 'dns' ),
        {formatPromiseResult, promisifiedCallback} = require( 'dc-core' ).utils,
        ObjectId = require( 'mongoose' ).Types.ObjectId;

    function addLocationToEmployees( user, employeeLocation, employeeIds, callback ) {
        Y.log( 'Location API - addLocationToEmployees ' + JSON.stringify( employeeIds ), 'info', NAME );
        Y.doccirrus.mongodb.runDb(
            {
                user: user,
                model: 'employee',
                action: 'put',
                data: Y.doccirrus.filters.cleanDbObject( {
                    locations: employeeLocation,
                    multi_: true
                } ),
                fields: 'locations',
                query: {
                    _id: {
                        $in: employeeIds
                    }
                },
                callback: callback
            }
        );
    }

    function addLocationToIdentities( user, location, employeeIds, callback ) {
        Y.log( 'Location API - addLocationToIdentities ' + JSON.stringify( employeeIds ), 'info', NAME );
        Y.doccirrus.mongodb.runDb(
            {
                user: user,
                model: 'identity',
                action: 'put',
                data: Y.doccirrus.filters.cleanDbObject( {
                    locations: location,
                    multi_: true
                } ),
                fields: 'locations',
                query: {
                    specifiedBy: {
                        $in: employeeIds
                    }
                },
                callback: callback
            }
        );
    }

    /**
     * Function to populate employees in locations.
     *
     * @param {object} user user hwo triggered
     * @param {object[]} locations location set
     * @param {function} callback callback
     */
    function populateEmployees( user, locations, callback ) {
        Y.log( 'Location API - locations', 'info', NAME );

        function finalCb( err ) {
            if( err ) {
                Y.log( 'Location API - locations finalCb ' + JSON.stringify( err ), 'error', NAME );
                callback( err );
                return;
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

            Y.doccirrus.mongodb.runDb(
                {
                    migrate: true,
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        'locations._id': location._id
                    },
                    callback: addEmployees
                }
            );
        }

        // MOJ-2216 -- cannot count on the data structure returned from db layer.
        // adding a non-schema field, so need to step outside mongoose
        locations = JSON.parse( JSON.stringify( locations.result || locations ) );

        require( 'async' ).each( locations, getEmployees, finalCb );

    }

    /**
     * Returns location set which includes HBS and all NBS, for initial location.
     * If initial location does not have NBS, array will contain only initial location.
     * @method getLocationSet
     * @param {Object} args arguments
     * @param {Object} args.user user
     * @param {Object} args.query query which is used to select initial location. "Find" has limit - 1.
     * @param {Object} [args.options] used to final find. Can be used to select, lean... result array
     * @param {Function} args.callback callback
     */
    function getLocationSet( args ) {
        let
            { user, query, options = {}, callback } = args,
            async = require( 'async' );
        async.waterfall( [
            function( next ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'get',
                    query,
                    migrate: options.migrate,
                    options: {
                        lean: true,
                        select: {
                            isAdditionalLocation: 1,
                            mainLocationId: 1
                        },
                        limit: 1
                    }
                }, function( err, results ) {
                    if( err ) {
                        return next( err );
                    }
                    if( !results[0] ) {
                        Y.log( `getLocationSet. Location not found. Query: ${JSON.stringify( query )}`, 'error', NAME );
                        return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Location not found' } ) );
                    }
                    next( null, results[0] );
                } );
            },
            function( location, next ) {
                let
                    mainLocationId;
                if( location.isAdditionalLocation ) {
                    mainLocationId = location.mainLocationId;
                } else {
                    mainLocationId = location._id.toString();
                }
                if( !mainLocationId ) {
                    return setImmediate( next, null, [location] );
                }
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'get',
                    migrate: options.migrate,
                    query: {
                        $or: [
                            { _id: mainLocationId },
                            { mainLocationId: mainLocationId }
                        ]
                    },
                    options
                }, next );
            }
        ], callback );
    }

    /**
     * check if there is already location with given commercial No
     *
     * @method isCommercialNoAlreadyAssigned
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {String} args.originalParams.commercialNo     commercial number to check
     * @param {Function} args.callback
     *
     * @returns {Function} callback                         if duplicate found returns error with code 40000
     */
    function isCommercialNoAlreadyAssigned( args ) {
        Y.log('Entering Y.doccirrus.api.location.isCommercialNoAlreadyAssigned', 'info', NAME);
        if (args.callback) {
            args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.isCommercialNoAlreadyAssigned');
        }
        const
            user = args.user,
            callback = args.callback,
            params = args.originalParams,
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

        if( !params.commercialNo ) {
            return callback( Y.doccirrus.errors.rest( 500, 'insufficient arguments', true ) );
        }

        let query = {
            commercialNo: params.commercialNo
        };

        if( params.locationId ) {
            query._id = { $ne: params.locationId };
        }
        runDb( {
            user: user,
            action: 'count',
            model: 'location',
            query: query
        } ).then( count => {
            if( 0 === count ) {
                callback( null );
                return;
            }
            throw new Y.doccirrus.commonerrors.DCError( '40000', { data: { $commercialNo: params.commercialNo } } );
        } ).catch( err => {
            callback( err );
        } );
    }

    /**
     * get grouped locations if there are some with same commercial number
     *
     * @method areThereSameCommercialNoAssigned
     * @param {Object} args
     * @param {Object} args.user
     * @param {Function|*} args.callback
     *
     * @returns {Array<Object>}
     */
    async function areThereSameCommercialNoAssigned( args ) {
        Y.log('Entering Y.doccirrus.api.location.areThereSameCommercialNoAssigned', 'info', NAME);
        const
            { user, callback = promisifiedCallback} = args;

        let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            action: 'aggregate',
            model: 'location',
            pipeline: [
                {$match: { commercialNo: {$exists: true, $ne: ''}}},
                {$group: { _id: '$commercialNo', locations: {$addToSet: '$locname' }}},
                {$match: { locations: {$not: {$size: 1}}}}
            ]
        } ) );
        if( err ){
            Y.log( `areThereSameCommercialNoAssigned: error aggregations of locations with same commercial No : ${err.stack || err}`, 'error', NAME );
        }

        Y.log('Exiting Y.doccirrus.api.location.areThereSameCommercialNoAssigned', 'info', NAME);
        return callback( err, result && result.result || [] );
    }

    function getForeignLocations( args ) {
        Y.log('Entering Y.doccirrus.api.location.getForeignLocations', 'info', NAME);
        if (args.callback) {
            args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.getForeignLocations');
        }
        const
            tenantUser = Y.doccirrus.auth.getSUForTenant( args.user.tenantId );
        Y.doccirrus.mongodb.runDb( {
            user: tenantUser,
            model: 'location',
            query: {_id: {$nin: (args.user.locations || []).map( location => location._id )}},
            options: {
                select: {
                    locname: 1,
                    commercialNo: 1
                }
            }
        } )
            .then( results => populateEmployees( args.user, results, args.callback ) )
            .catch( err => args.callback( err ) );
    }

    /**
     * Saves location when it has some stocklocations
     *
     * @method saveWithStockLocations
     * @param {Object} args arguments
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {Function} args.callback
     * @returns {Function} callback
     */

    async function saveWithStockLocations( {user, originalParams, callback} ) {
        Y.log( 'Entering Y.doccirrus.api.location.saveWithStockLocations', 'info', NAME );

        if( callback ) {
            callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.location.saveWithStockLocations' );
        }

        const {query, data, fields, stockLocationList} = originalParams,
            oldStockLocations = data.stockLocations;

        let error, stockLocations, result;

        [error, stockLocations] = await formatPromiseResult( Y.doccirrus.api.stocklocation.updateFromLocationData( {
            user,
            stockLocationList,
            oldStockLocations,
            locationId: new ObjectId( data._id )
        } ) );

        if( error ) {
            Y.log( `saveWithStockLocations(): Failed to handle stocklocations. Error: ${error.stack || error}`, 'error', NAME );
            return callback( error );
        }

        data.stockLocations = stockLocations;

        [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            ...(data._id ? {query} : {}),
            model: 'location',
            action: data._id ? 'put' : 'post',
            data: Y.doccirrus.filters.cleanDbObject( data ),
            ...(data._id ? {fields} : {}),
            migrate: true
        } ) );

        if( error ) {
            Y.log( `saveWithStockLocations(): Failed to save stocklocations. Error: ${error.stack || error}`, 'error', NAME );
            return callback( error );
        }

        Y.doccirrus.api.location.updateEmployees( user, data, callback, error, result );
        //return callback( error, result );
    }

    /**
     * Removes location when it has some stocklocations
     *
     * @method deleteWithStockLocations
     * @param {Object} args arguments
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {Function} args.callback
     * @returns {Function} callback
     */
    async function deleteWithStockLocations( {user, originalParams, callback} ) {
        Y.log( 'Entering Y.doccirrus.api.location.deleteWithStockLocations', 'info', NAME );

        if( callback ) {
            callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.location.deleteWithStockLocations' );
        }

        const {query, data, stockLocationList} = originalParams;
        let error, result;

        [error] = await formatPromiseResult( Y.doccirrus.api.stocklocation.deleteStockLocations( {
            user,
            deleteList: stockLocationList,
            locationId: new ObjectId( data._id )
        } ) );

        if( error ) {
            Y.log( `deleteWithStockLocations(): Failed to handle stocklocations. Error: ${error.stack || error}`, 'error', NAME );
            return callback( error );
        }

        [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            query,
            model: 'location',
            action: 'delete',
            migrate: true
        } ) );

        return callback( error, result );
    }

    /**
     * Gets location with all stocklocations data
     *
     * @method getWithStockLocations
     * @param {Object} args arguments
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {Function} args.callback
     * @returns {Function} callback
     */
    async function getWithStockLocations( {user, originalParams, callback} ) {
        Y.log( 'Entering Y.doccirrus.api.location.getWithStockLocations', 'info', NAME );

        if( callback ) {
            callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.location.getWithStockLocations' );
        }

        const {query = {}} = originalParams;

        if(query._id) {
            query._id = new ObjectId(query._id);
        }

        let [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'location',
            action: 'aggregate',
            migrate: true,
            pipeline: [
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: 'stocklocations',
                        localField: 'stockLocations',
                        foreignField: '_id',
                        as: 'stockLocations'
                    }
                }
            ]
        } ) );

        if( error ) {
            Y.log( `saveWithStockLocations(): Failed to handle stocklocations. Error: ${error.stack || error}`, 'error', NAME );
            return callback( error );
        }

        result = result.result || result;
        return callback( null, result );
    }
    Y.namespace( 'doccirrus.api' ).location = {

        name: NAME,

        addLocation: function( user, data, options, callback ) {
            const async = require( 'async' );
            Y.log( 'Location API - addLocation', 'info', NAME );

            function _addLocation( err, result ) {
                var employeeIds = data && data.employees && data.employees.map( function( employee ) {
                        return employee._id;
                    } ),
                    location = {
                        _id: result[0],
                        locname: data.locname
                    };
                if( err || !result.length ) {
                    Y.log( 'Location API - addLocationToEmployees' + err ? JSON.stringify( err ) : 'No Employee ID returned', 'error', NAME );
                    callback( err || 'No Employee ID returned' );
                    return;
                }
                Y.log( 'Location API - addLocationToEmployees result' + JSON.stringify( result ), 'info', NAME );

                function finalCb( err ) {
                    if( err ) {
                        Y.log( 'Location API - finalCb' + JSON.stringify( err ), 'error', NAME );
                        callback( err );
                        return;
                    }
                    callback( null, result );
                }

                async.parallel( [
                    function( done ) {
                        addLocationToEmployees( user, location, employeeIds, done );
                    },
                    function( done ) {
                        addLocationToIdentities( user, location, employeeIds, done );
                    }
                ], finalCb );
            }

            function saveLocation( cb ) {
                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'location',
                        action: 'post',
                        data: data,
                        options: options,
                        callback: cb || callback
                    }
                );
            }

            Y.doccirrus.filters.cleanDbObject( data );

            if( data.employees && Array.isArray( data.employees ) && data.employees.length ) {
                saveLocation( _addLocation );
            } else {
                saveLocation();
            }

        },

        post: function POST( args ) {
            Y.log('Entering Y.doccirrus.api.location.post', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.post');
            }
            if( args.data ) {
                args.data.isOptional = true;
            }

            if( !args.data.countryMode ) {
                let practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
                let countryMode = practiceCountryMode.length ? practiceCountryMode[0] : 'D';
                Y.log('Automatic settings POST: ' + practiceCountryMode, 'info', NAME);
                args.data.countryMode = [countryMode]; // reqd for /2 REST backward compatibility.
            }

            Y.doccirrus.licmgr.locationLicensingCheck( args.user, err => {
                if( err ) {
                    return args.callback( err );
                } else {
                    Y.doccirrus.api.location.addLocation( args.user, args.data, args.options, args.callback );
                }
            } );
        },

        // override the default REST handler
        get: function GET( args ) {
            Y.log('Entering Y.doccirrus.api.location.get', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.get');
            }

            let
                user = args.user,
                settings = Y.doccirrus.api.settings.getSettings( { user } ),
                isAdmin = args.user.groups.some( g => g.group === 'ADMIN' ),
                isAdminPanel = ( args.originalParams && args.originalParams.isAdminPanel ) || false,
                allowed = true,
                userLocation = user.locations || [];

            // Allow to see ALL locations only admin in admin panel [MOJ-5797]

            if( settings && settings.noCrossLocationAccess ) {
                allowed = !!(isAdminPanel && isAdmin);
            }

            if( !allowed && !user.superuser ) {
                let allowedLocations = { $in: userLocation.map( l => l._id ) };

                if( args.query._id ) {
                    args.query.$and = [
                        { _id: args.query._id },
                        { _id: allowedLocations }
                    ];
                    delete args.query._id;
                } else {
                    args.query._id = allowedLocations;
                }
            }

            /*
             simulate slow connection here
             */
            //                var myCb = args.callback;
            //                var simulate = function( err, result ) {
            //
            //                    setTimeout( function() {
            //                        myCb( err, result );
            //                    }, 2000 );
            //                };
            //                args.callback = simulate;
            /***/
            if( args.query && args.query.pid ) { // blind proxy adds pid to any request which is wrong!
                delete args.query;
            }

            Y.doccirrus.mongodb.runDb( {
                migrate: ( args.options && args.options.migrate ),
                action: 'get',
                model: 'location',
                user: user,
                query: args.query,
                options: args.options,
                callback: function( err, result ) {

                    if( err ) {
                        return args.callback( err );
                    }

                    if( args.originalParams && args.originalParams[Y.doccirrus.urls.PARAM_OBJPOPULATE] === false ) {
                        return args.callback( err, result );
                    } else {
                        populateEmployees( user, result, args.callback );
                    }

                }
            } );
        },

        enhancedLocations: function( args ) {
            Y.log('Entering Y.doccirrus.api.location.enhancedLocations', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.enhancedLocations');
            }
            var
                user = args.user, query = args.query,
                options = args.options, callback = args.callback;
            Y.log( 'Location API - enhancedLocations', 'info', NAME );
            // FIXME MOJ-1117
            function enhanceByCalendars( err, data ) {
                var
                    Q = require( 'q' ),
                    deferred,
                    promises = [],
                    result = data && data.result || data,
                    myData = JSON.parse( JSON.stringify( result ) );

                if( err ) {
                    callback( err );
                    return;
                }

                result.forEach( function( location ) {
                    deferred = Q.defer();
                    promises.push( deferred.promise );
                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: 'calendar',
                            action: 'get',
                            callback: deferred.makeNodeResolver(),
                            query: { locationId: location._id.toString(), isPublic: true },
                            options: {}
                        }
                    );
                } );

                Q.allSettled( promises )
                    .then( function( calendars ) {
                        var i;
                        for( i = 0; i < myData.length; i++ ) {
                            myData[i].calendars = [].concat( calendars[i].value );
                        }
                    } )
                    .done( function() {
                        callback( '', myData );
                    } );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                query: query,
                options: options,
                callback: enhanceByCalendars
            } );
        },

        updateEmployees: function( user, data, callback, err, result ) {
            let locationUpdateResults;

            if( err || (data._id && (!result || !result._id)) ) {
                Y.log( 'error in updateEmployees: ' + JSON.stringify( err || Y.doccirrus.errors.rest( 400, 'location does not exist' ) ), 'error', NAME );
                callback( err || 'no result' );
                return;
            }

            locationUpdateResults = result;

            var employeeIdsToSave = data && data.employees && data.employees.map( function( employee ) {
                return employee && employee._id;
            } ) || [];

            // add this location to new employees in location
            function addNewEmployeeLocation( err ) {
                var async = require( 'async' );

                if( err ) {
                    Y.log( 'addNewEmployeeLocation' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }
                if( employeeIdsToSave.length ) {
                    async.parallel( [
                        function( done ) {
                            addLocationToEmployees( user, {
                                _id: result._id,
                                locname: result.locname
                            }, employeeIdsToSave, done );
                        },
                        function( done ) {
                            addLocationToIdentities( user, {
                                _id: result._id,
                                locname: result.locname
                            }, employeeIdsToSave, done );
                        }
                    ], finalCb );
                } else {
                    finalCb();
                }

                // MOJ-805: the following must be refactored into the data layer
                function finalCb( err, result ) {
                    if( err ) {
                        Y.log( 'Aborting transmit to DCPRC, location info write error.' + err, 'debug', NAME );
                        return callback( err );
                    } else {
                        Y.log( 'Transmit Location info to DCPRC / Practice ' + JSON.stringify( result ), 'debug', NAME );
                        // shows how the model will apply the pre and post processing steps
                        // allowing the updates to use the model to create and affect other models.
                        Y.doccirrus.schemaprocess.location.changeLocation( user, locationUpdateResults, callback );
                    }
                }
            }

            // remove location from employee.locations, if employee is not in location
            function updateCurrentEmployeeLocations( employee, _cb ) {
                var async = require( 'async' );
                var locationIdx, employeeIdx;
                employeeIdx = employeeIdsToSave.indexOf( employee._id.toString() );
                if( -1 === employeeIdx ) {
                    let
                        newLocations = employee.locations.concat( [] );
                    // set originalData_ because we save without runDb
                    // originalData_ is needed to determine which location was removed from employee
                    employee.originalData_ = employee;
                    locationIdx = indexOfLocationId( employee.locations, result._id.toString() );
                    if( -1 === locationIdx ) {
                        return _cb();
                    }
                    newLocations.splice( locationIdx, 1 );
                    // mark modified?
                    async.parallel( [
                        function( done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'employee',
                                action: 'put',
                                fields: ['locations'],
                                query: {
                                    _id: employee._id.toString()
                                },
                                data: {
                                    locations: newLocations,
                                    skipcheck_: true
                                }
                            }, done );
                        },
                        function( done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'identity',
                                action: 'put',
                                fields: ['locations'],
                                query: {
                                    specifiedBy: employee._id.toString()
                                },
                                data: {
                                    locations: newLocations,
                                    skipcheck_: true
                                }
                            }, done );
                        }
                    ], _cb );
                    return;
                }

                employeeIdsToSave.splice( employeeIdx, 1 );
                _cb();

                function indexOfLocationId( locations, id ) {
                    var idx = -1;
                    if( !Array.isArray( locations ) ) {
                        return idx;
                    }
                    locations.some( function( location, index ) {
                        if( location._id === id ) {
                            idx = index;
                            return true;
                        }
                    } );
                    return idx;
                }
            }

            function interate( err, employees ) {
                if( err ) {
                    Y.log( 'iterate' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }
                require( 'async' ).each( employees, updateCurrentEmployeeLocations, addNewEmployeeLocation );
            }

            Y.doccirrus.mongodb.runDb(
                {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        'locations._id': result._id
                    },
                    options: {
                        lean: true
                    }
                }, interate );
        },

        updateLocations: function( user, query, fields, data, callback ) {
            var self = this;
            user.changeLocation = true;

            function saveLocation( cb ) {
                Y.doccirrus.mongodb.runDb(
                    {
                        action: 'put',
                        model: 'location',
                        user: user,
                        query: query,
                        fields: Object.keys( data ),
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    }, cb );
            }

            if( data && !data.employees && !Array.isArray( data.employees ) ) {
                data.employees = [];
            }

            const updateEmployees = function( err, result ) {
                return self.updateEmployees( user, data, callback, err, result );
            };
            saveLocation( updateEmployees );
        },

        deleteLocation: function( user, query, callback ) {
            var
                result; // the delete result

            function removeLocationsFromEmployees( err, employees ) {

                if( err ) {
                    Y.log( 'updateEmployees' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }

                function remove( employee, _cb ) {

                    if( Array.isArray( employee.locations ) && employee.locations.length ) {
                        employee.locations = Y.Array.reject( employee.locations, function( location ) {
                            return location._id === query;
                        } );
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            action: 'put',
                            query: {
                                _id: employee._id
                            },
                            fields: Object.keys( employee ),
                            data: Y.doccirrus.filters.cleanDbObject( employee )
                        }, function( err ) {
                            if( err ) {
                                Y.log( 'removeLocationsFromEmployees' + JSON.stringify( err ), 'error', NAME );
                                _cb( err );
                                return;
                            }
                            _cb();
                        } );
                    } else {
                        return _cb();
                    }

                }

                function onMediaDelete( err, result ) {
                    if( err ) {
                        Y.log( `Error while deleting media by ownerId: ${query._id} and location collection` + JSON.stringify( err ), 'error', NAME );
                    } else {
                        Y.log( `Successfully deleted media by ownerId: ${query._id} Result: ${JSON.stringify( result )}`, 'info', NAME );
                    }
                }

                require( 'async' ).each( employees, remove, function( err ) {
                    if( err ) {
                        return callback( err );
                    } else {
                        Y.doccirrus.api.media.deleteMediaByOwnerCollectionAndId( {
                            'user': user,
                            'callback': onMediaDelete,
                            'originalParams': {
                                'ownerCollection': 'location',
                                'ownerId': query._id
                            }
                        } );
                        return callback( null, result );
                    }
                } );
            }

            function getEmployees() {

                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            'locations._id': query
                        },
                        callback: removeLocationsFromEmployees
                    }
                );

            }

            Y.doccirrus.mongodb.runDb(
                {
                    action: 'delete',
                    model: 'location',
                    user: user,
                    query: query
                }, function( err, _result ) {
                    if( err ) {
                        Y.log( 'error from delete location: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    } else {
                        result = _result;
                        getEmployees();
                    }
                } );
        },
        put: function( args ) {
            Y.log('Entering Y.doccirrus.api.location.put', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.put');
            }
            var
                self = this;
            self.updateLocations( args.user, args.query, args.fields, args.data, args.callback );

        },
        upsert: function( args ) {
            Y.log('Entering Y.doccirrus.api.location.upsert', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.upsert');
            }
            if( args.data ) {
                args.data.isOptional = true;
            }

            if( !args.data.countryMode ) {
                let practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
                let countryMode = practiceCountryMode.length ? practiceCountryMode[0] : 'D';
                Y.log('Automatic settings POST: ' + practiceCountryMode, 'info', NAME);
                args.data.countryMode = [countryMode]; // reqd for /2 REST backward compatibility.
            }

            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.mongodb.runDb(
                {
                    action: 'upsert',
                    model: 'location',
                    user: args.user,
                    query: args.query,
                    data: args.data,
                    callback: args.callback
                }
            );
        },
        delete: function( args ) {
            Y.log('Entering Y.doccirrus.api.location.delete', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.delete');
            }
            var
                self = this;
            self.deleteLocation( args.user, args.query, args.callback );
        },

        /**
         * Test an email address by sending an email to it.
         * @param {object} arg arguments
         * @param {object} arg.originalParams parameters
         * @param {string} arg.originalParams.email email address to check
         */
        testEmail: function( arg ) {
            const { user } = arg;
            var
                params = arg.originalParams,
                email = params.email;

            Y.doccirrus.email.sendEmail( {
                user,
                serviceName: 'prcService',
                to: email,
                subject: 'Dies ist eine Test E-Mail von Ihrem System.',
                text: 'Dies ist eine Test E-Mail von Ihrem System.'
            }, arg.callback );

        },

        /**
         * Test email to fax gateway through MX record
         * @param {object} args args object
         * @param {string} args.data.email email address to test
         * @callback  Error or null depending if the host is up and valid
         *
         * @returns {*}
         */
        testEmailWithoutSend( args ) {
            Y.log('Entering Y.doccirrus.api.location.testEmailWithoutSend', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME).wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.testEmailWithoutSend');
            }

            const
                { data: { email = '' } = {}, callback } = args;

            try {
                const host = email.split( '@' )[1];
                Y.log( `Testing email to fax gateway: ${host}`, 'info', NAME );
                dns.resolveMx( host, ( err ) => callback( err || null ) );
            } catch( e ) {
                return callback( true );
            }
        },
        /**
         * If existing location does not exist for this practice, then
         * default values are used.
         *
         * If existingLocation is falsy, then the location is created
         * with default values and main location id.
         *
         * @method getLocationFromPractice
         * @param {Object} practice Array of Objects or Object - this practice
         * @param {Object} [existingLocation] A location object - preserved from this object are the _id and the weeklyTimes.
         * @param {Function} [callback]  function( err, location)
         * @return {Object} location
         */
        getLocationFromPractice: function getLocationFromPractice( practice, existingLocation, callback ) {
            var
                result;
            if( Array.isArray( practice ) ) {
                practice = practice[0];
            }
            result = Y.merge( {}, Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( practice ) );
            result.locname = practice.coname;
            result.commercialNo = practice.commercialNo;
            result.countryMode = practice.countryMode || ['D'];

            // address info
            if( practice.addresses[0] ) {
                result.street = practice.addresses[0].street;
                result.houseno = practice.addresses[0].houseno;
                result.zip = practice.addresses[0].zip;
                result.city = practice.addresses[0].city;
                result.postbox = practice.addresses[0].postbox;
                result.kind = practice.addresses[0].kind;
                result.country = practice.addresses[0].country;
                result.countryCode = practice.addresses[0].countryCode;
            }
            // id and opening times
            if( existingLocation ) {
                result._id = existingLocation._id;
                result.openTimes = existingLocation.openTimes;
            } else {
                result._id = Y.doccirrus.schemas.location.getMainLocationId();
                result.openTimes = [
                    {
                        days: [1, 2, 3, 4, 5],
                        start: [9],
                        end: [18, 30]
                    }
                ];
            }
            result.isOptional = true;
            Y.doccirrus.filters.cleanDbObject( result ); //todo
            if( callback ) {
                return callback( null, result );
            }
            return result;
        },
        getLocationSet( args ){
            Y.log('Entering Y.doccirrus.api.location.getLocationSet', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.location.getLocationSet');
            }
            getLocationSet( args );
        },
        isCommercialNoAlreadyAssigned,
        areThereSameCommercialNoAssigned,
        getForeignLocations,
        saveWithStockLocations,
        deleteWithStockLocations,
        getWithStockLocations
    };

}, '0.0.1', {
    requires: [
        'location-schema',
        'location-process',
        'employee-schema',
        'dckvconnectutils',
        'dcemail'
    ]
} );
