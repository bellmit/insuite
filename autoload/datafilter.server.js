/**
 * User: mahmoud
 * Date: 25/08/15  12:46
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

/**
 * data filtering is applied in two stages:
 * 1- any query before reaching to db layer is augmented with a condition that ensures a certain data access restriction
 * 2- the result back from db is filtered by the same condition
 * for example location based filters make sure a user cannot touch data that does not belong to user's location
 */



YUI.add( 'dcdatafilter', function( Y, NAME ) {
        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            {formatPromiseResult} = require('dc-core').utils,
            GET_ACTION = 'get';
        let
            modelFilters;

        /**
         * modifies a query that filters target documents by location id.
         * the new query ensures user will get/touch data contained only within their location
         *
         * @param user
         * @param action (post, get, put, delete)
         * @param query
         * @param [checkUserConfirmation] if set to true, GET results will include docs of patients (doc.patientId) with
         *                                enabled confirmedViewFromOtherLocations option
         * @param path to the location field
         * @param callback
         */
        async function addLocationFilter( user, action, query, checkUserConfirmation, path, pathType, callback ) {
            const getIncludedPatientIdsQuery = ( locationIds ) => ({
                confirmedViewFromOtherLocations: true,
                $or: [
                    {confirmedViewFromLocationIds: []},
                    {confirmedViewFromLocationIds: null},
                    {confirmedViewFromLocationIds: {$in: locationIds}}
                ]
            });

            let
                locationIds,
                settings = Y.doccirrus.api.settings.getSettings( user ),
                userLocations = (user.locations || []);

            if( !applyLocationAccessDatafilter( settings, user ) ) {
                return callback( null, query );
            }

            if( query && query._id && !(applyLocationAccessDatafilter( settings ) && settings.noCrossLocationPatientAccess) ) {
                return callback( null, query );
            }

            locationIds = (userLocations || []).map( location => {
                if( pathType === ObjectId ) {
                    return ObjectId( location._id );
                } else {
                    return location._id;
                }
            } );

            let patientIdsToInclude;
            if( action === GET_ACTION && true === checkUserConfirmation ) {
                let [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        query: getIncludedPatientIdsQuery( locationIds ),
                        options: {
                            select: {
                                _id: 1
                            }
                        }
                    } )
                );
                if( err ) {
                    Y.log( `addLocationFilter: could not get ids of patient that have confirmed view from other locations: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                patientIdsToInclude = patients.map( patient => patient._id.toString() );
            }

            //build query
            const
                newQuery = {$and: []},
                locationPathNotExistingQuery = Array.isArray( path ) ? {$and: path.map( p => ({[p]: {$exists: false}}) )} : {[path]: {$exists: false}},
                locationFilterQuery = Array.isArray( path ) ? {$or: path.map( p => ({[p]: {$in: locationIds}}) )} : {[path]: {$in: locationIds}},
                patientIncludedQuery = patientIdsToInclude && patientIdsToInclude.length ? {patientId: {$in: patientIdsToInclude}} : null;

            //query can be empty object. e.g. get all patients
            if( query && Object.keys( query ).length ) {
                newQuery.$and.push( query );
            }

            let or = [
                locationFilterQuery,
                locationPathNotExistingQuery,
                patientIncludedQuery
            ];
            if( action === GET_ACTION ) {
                or.push( getIncludedPatientIdsQuery( locationIds ) );
            }

            newQuery.$and.push( {
                $or: or.filter( Boolean )
            } );

            return callback( null, newQuery );
        }

        /**
         * Helper function to check if the location filter should be applied
         * @param settings
         * @param user
         * @returns {Boolean}
         */
        function applyLocationAccessDatafilter( settings, user ) {
            if( user ) {
                return Boolean( settings && settings.noCrossLocationAccess && 'su' !== user.id );
            }
            return Boolean( settings && settings.noCrossLocationAccess );
        }

        /**
         * Returns aggregation pipeline query with location filter by:
         * 1. building parameters for addLocationFilter
         * 2. obtaining query from addLocationFilter
         * 3. extracting the $or sub-query needed and creating a $match query from it
         * 4. adding the $match query to the pipeline
         *
         * @param {Object} args.user
         * @param {Array} args.pipeline
         * @param {String|Array} args.path
         * @param {Object} args.pathType
         */
        function addLocationFilterToAggregationPipeline( args ) {
            const
                {user, pipeline, path, pathType} = args,
                query = {},
                checkUserConfirmation = false;

            addLocationFilter( user, GET_ACTION, query, checkUserConfirmation, path, pathType, function( err, query ) {

                if( err ){
                    Y.log( `addLocationFilter: Error while getting location filter ${err}`, 'error', NAME );
                } else if( '$and' in query ) {
                    // this relies on addLocationFilter.buildQuery adding an $or into the query
                    const matchLocationIdSubQuery = query.$and.find( function( subQuery ) {
                        return subQuery.$or;
                    } );
                    const matchLocationIdQuery = {
                        $match: matchLocationIdSubQuery
                    };
                    pipeline.unshift( matchLocationIdQuery );
                }
            } );

            return pipeline;
        }

        function getValuesBy( obj, path ) {
            const values = [];
            path.split( '.' ).filter( Boolean ).some( ( part, idx, parts ) => {
                const nextIdx = idx + 1;
                const nParts = parts.length;
                let currentObjPart = obj[part];
                const restPath = parts.slice( nextIdx, nParts ).join('.');
                if( currentObjPart instanceof ObjectId ) {
                    currentObjPart = currentObjPart.toString();
                }
                if( Array.isArray( currentObjPart ) ) {
                    currentObjPart.forEach( el => {
                        [].push.apply( values, getValuesBy( el, restPath ) );
                    } );
                    return true;
                } else if('object' === typeof currentObjPart){
                    [].push.apply( values, getValuesBy( currentObjPart, restPath ) );
                    return true;
                } else if( currentObjPart && 'string' === typeof currentObjPart ) {
                    values.push( currentObjPart );
                    return true;
                }
            } );

            return values;
        }

        /**
         * returns true if the object is assigned to any of user's locations,
         * or the object is not assigned to any location
         *
         * returns false of the user.locations is empty
         *
         * careful! if the path is wrong it might return true wrongly (the check is not schema aware)
         *
         * @param user the subject employee user
         * @param targetObj the target object
         * @param pathToField the path to the field specifying the _id of a location
         * @returns {boolean}
         */
        function locationFilterHelper( user, targetObj, pathToField ) {
            const
                lodash = require('lodash'),
                settings = Y.doccirrus.api.settings.getSettings( user );

            if( !applyLocationAccessDatafilter( settings, user ) ) {
                return true;
            }

            const values = lodash.flatten( (Array.isArray( pathToField ) ? pathToField : [pathToField])
                .map( path => getValuesBy( targetObj, path ) ) );

            return values.length <= 0 ? true : (lodash.intersection( values, (user.locations || [])
                .map( l => l._id ) ).length > 0);
        }

        function checkLocationAccess( user, model, path, isDeletion, callback ) {
            const
                hasAccess = locationFilterHelper( user, model, path );
            if( hasAccess ) {
                callback( null, model );
            } else {
                if( isDeletion ) {
                    callback( Y.doccirrus.errors.rest( 7016, 'Deletion to the model is restricted to your location', true ) );
                    return;
                }
                callback( Y.doccirrus.errors.rest( 7015, 'access to the model is restricted to your location', true ) );
            }
        }

        function getLocationChecker( path ) {
            /**
             * is the user allowed to read/write/delete the model?
             * define a condition when satisfied the user operation is allowed.
             * @param user
             * @param model the data model subject to check
             * @param path the path to the field used in the condition
             * @param callback
             */
            return function( user, model, callback ) {
                const isDeletion = !this.rawData && this.dbData;
                checkLocationAccess( user, model, path, isDeletion, callback );
            };
        }

        /**
         * Used in strict mode, check that user is allowed access to patient's location
         * @param path
         * @return {Function}
         */

        function getPatientLocationChecker( path ) {
            return function( user, model, callback ) {
                const settings = Y.doccirrus.api.settings.getSettings( user ) || {};
                const checkForNoCrossLocationPatient = applyLocationAccessDatafilter( settings ) &&
                                                       (!settings.noCrossLocationPatientAccess &&
                                                        !settings.crossLocationPatientEditingAllowed) ||
                                                       settings.noCrossLocationPatientAccess;
                const isDeletion = !this.rawData && this.dbData;

                if( !checkForNoCrossLocationPatient && !isDeletion ) {
                    return callback( null, model );
                }


                checkLocationAccess( user, model, path, isDeletion, callback );
            };
        }

        function getQueryProcessor( path ) {
            return function processQuery( user, action, query, callback ) {
                addLocationFilter( user, action, query, false, path, String, callback );
            };
        }

        function getActivityProcessQuery( path ) {
            return function processQuery( user, action, query, callback ) {
                addLocationFilter( user, action, query, true, path, ObjectId, callback );
            };
        }

        function getPatientProcessQuery( path ) {
            return function processQuery( user, action, query, callback ) {
                const settings = Y.doccirrus.api.settings.getSettings( user );

                // exclude patient get from query processing if option is set
                if( action === GET_ACTION && !(applyLocationAccessDatafilter( settings ) && settings.noCrossLocationPatientAccess) ) {
                    return callback( null, query );
                }
                addLocationFilter( user, action, query, false, path, String, callback );
            };
        }
        function getCalendarProcessQuery( path ) {
            return function processQuery( user, action, query, callback ) {
                const settings = Y.doccirrus.api.settings.getSettings( user );

                // exclude calendar get from query processing if option is set
                if( action === GET_ACTION && !(applyLocationAccessDatafilter( settings ) && settings.noCrossLocationCalendarAccess) ) {
                    return callback( null, query );
                }
                addLocationFilter( user, action, query, false, path, String, callback );
            };
        }

        /**
         * Returns the processAggregation function that adds the
         * location filter to the pipeline provided as argument
         *
         * @param {String|Array} path
         * @param {String} schemaName
         * @returns {function(*=, *=): *}
         */
        function getAggregationQueryProcessor( path, schemaName = '' ) {
            return function processAggregation( user, pipeline ) {
                let pathType;

                switch( schemaName ) {
                    case 'patient':
                        break;
                    case 'activity':
                        pathType = ObjectId;
                        break;
                    case 'calendar':
                        pathType = ObjectId;
                        break;
                    default:
                        pathType = String;
                }

                return addLocationFilterToAggregationPipeline( {user, pipeline, path, pathType} );
            };
        }

        // function processAggregation( user, pipeline ) {
        //     return addLocationFilterToAggregationPipeline( user, pipeline );
        // }

        const defaultLocationIdKey = 'locationId';
        const locationIdKeyList = [ 'insuranceStatus.locationId', defaultLocationIdKey ];

        modelFilters = {
            patient: {
                processQuery: getPatientProcessQuery( locationIdKeyList ),
                resultFilters: [getPatientLocationChecker( locationIdKeyList )],
                processAggregation: getAggregationQueryProcessor( defaultLocationIdKey, 'patient' )
            },
            activity: {
                processQuery: getActivityProcessQuery( defaultLocationIdKey ),
                resultFilters: [getLocationChecker( defaultLocationIdKey )],
                processAggregation: getAggregationQueryProcessor( defaultLocationIdKey, 'activity' )
            },
            edmpdelivery: {
                processQuery: getActivityProcessQuery( defaultLocationIdKey ),
                resultFilters: [getLocationChecker( defaultLocationIdKey )],
                processAggregation: getAggregationQueryProcessor( defaultLocationIdKey )
            },
            upcomingedmpdoc: {
                processQuery: getActivityProcessQuery( defaultLocationIdKey ),
                resultFilters: [getLocationChecker( defaultLocationIdKey )],
                processAggregation: getAggregationQueryProcessor( defaultLocationIdKey )
            },
            calendar: {
                processQuery: getCalendarProcessQuery( defaultLocationIdKey ),
                resultFilters: [getLocationChecker( defaultLocationIdKey )],
                processAggregation: getAggregationQueryProcessor( defaultLocationIdKey, 'calendar' )
            },
            catalogusage: {
                processQuery: getQueryProcessor( defaultLocationIdKey ),
                resultFilters: [getLocationChecker( defaultLocationIdKey )],
                processAggregation: getAggregationQueryProcessor( defaultLocationIdKey )
            },
            document: {
                processQuery: getQueryProcessor( defaultLocationIdKey ),
                resultFilters: [getLocationChecker( defaultLocationIdKey )],
                processAggregation: getAggregationQueryProcessor( defaultLocationIdKey )
            },
            reporting: {
                processQuery: getQueryProcessor( 'locId' ),
                resultFilters: [getLocationChecker( 'locId' )],
                processAggregation: getAggregationQueryProcessor( 'locId' )
            },
            kbvlog: {
                processQuery: getQueryProcessor( 'mainLocationId' ),
                resultFilters: [getLocationChecker( 'mainLocationId' )],
                processAggregation: getAggregationQueryProcessor( 'mainLocationId' )
            },
            tarmedlog: {
                processQuery: getQueryProcessor( 'mainLocationId' ),
                resultFilters: [getLocationChecker( 'mainLocationId' )],
                processAggregation: getAggregationQueryProcessor( 'mainLocationId' )
            },
            pvslog: {
                processQuery: getQueryProcessor( 'mainLocationId' ),
                resultFilters: [getLocationChecker( 'mainLocationId' )],
                processAggregation: getAggregationQueryProcessor( 'mainLocationId' )
            },
            task: {
                processQuery: getQueryProcessor( 'locations._id' ),
                resultFilters: [getLocationChecker( 'locations._id' )],
                processAggregation: getAggregationQueryProcessor( 'locations._id' )
            }
        };

        Y.namespace( 'doccirrus' ).filtering = {
            models: modelFilters
        };
    },
    '0.0.1', {
        requires: [
            'dcmongodb'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'settings-api',
            // 'dcerror'
        ]
    }
);