/**
 *  API to collect MEDDATA utilities
 *
 *  Currently MEDDATA common format and controls are used for
 *
 *  MEDDATA:                medically relevant measurements of patients - bllodpressure, BMI, etc (default)
 *  GRAVIDOGRAMMPROCESS:    standard set of observations collected in checkups on a pregnancy (inGyn)
 *  PERCENTILECURVE:        standard set of measurements collected of child growth (inPedia)
 *
 *  Additionally, most recent MEDDATA are collected on patient records (excluding pregnancy information) and mapped
 *  dynamically into forms.
 *
 *  Pregnancy dates are calculated from MEDDATA (last period, menstrual cycle length), and end of pregnancies is
 *  recorded in MEDDATA.
 *
 *  User: strix
 *  Date: 12/03/2018
 *  (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'meddata-api', function( Y, NAME ) {
        'use strict';
        /**
         * @module meddata-api
         */

        const
            { formatPromiseResult, promisifyArgsCallback, handleResult, promisifiedCallback } = require('dc-core').utils,
            util = require( 'util' ),
            moment = require('moment'),
            MEDDATA_TYPE = 'MEDDATA',
            isTypeMeddata = type => type === MEDDATA_TYPE,

            // class linkers, will become ES6 imports later on
            // eslint-disable-next-line no-unused-vars
            TagSchema = Y.doccirrus.schemas.tag.TagSchema,
            MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection;

        /**
         * @method validateArgs
         * @private
         *
         * Provide common validation for incoming data.
         *
         * @param {Object} args - iincomingdata
         * @param {String} action - HTTP method
         * @returns {Object} - errors and validity status
         */
        const validateArgs = ( args, action ) => {
            args.model = 'activity';

            const
                actType = args.data.actType,
                status = args.data.status,
                fsmName = Y.doccirrus.schemas.activity.getFSMName( actType ),
                isCreatedAllowed = Y.doccirrus.schemas.activity.isFSMAllowingCreatedStatus( fsmName );
            let
                isValid = true,
                error;

            switch( action ) {
                case 'get':
                    args.query = args.query || {};
                    args.query.actType = MEDDATA_TYPE;
                    break;
                case 'delete':
                    if( Object.keys( args.query ).length ) {
                        args.query.actType = MEDDATA_TYPE;
                    }
                    break;
                case 'post':
                    args.model = 'activity';
                    if ( !isTypeMeddata( args.data.actType )) {
                       isValid = false;
                       error = 'Only MEDDATA actType can be posted.';
                    }

                    if( isCreatedAllowed && status === 'CREATED' ) {
                        args.data.status = 'CREATED';
                    } else {
                        args.data.status = 'VALID';
                    }
                    break;
                case 'put':
                case 'upsert':
                    if ( !isTypeMeddata( args.data.actType )) {
                        args.data.actType = MEDDATA_TYPE;
                    }

                    if( isCreatedAllowed && status === 'CREATED' ) {
                        args.data.status = 'CREATED';
                    } else {
                        args.data.status = 'VALID';
                    }
                    break;
            }
            return { isValid, error };
        };

        /**
         * Validates the incoming medData type
         * @param {String} medDataType
         * @param {Object} [user]
         * @returns {[undefined|string, boolean]}
         */
        async function validateMedDataType( medDataType, user ) {
            let
                isValid = true,
                error,
                result,
                medDataTypesList;
            const
                medDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
                gravidogrammTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes,
                precentileTypes = Y.doccirrus.schemas.v_meddata.percentileCurveDataTypes,
                defaultMedDataTypes = {...medDataTypes, ...gravidogrammTypes, ...precentileTypes};

            /* first we check if it a default type, this is speedy */

            medDataTypesList = Object.keys( defaultMedDataTypes );

            if( medDataTypesList.includes( medDataType ) ) {
                return [error, isValid];
            }

            /* otherwise we check the custom types */

            [error, result] = await formatPromiseResult(
                Y.doccirrus.api.meddata.getMedDataItemTemplateCollection( {user} )
            );

            if( error ) {
                isValid = false;
                error = `Unable to check medData type "${medDataType}": ${error}`;
                return [error, isValid];
            }

            if( !result.hasMedDataType( medDataType ) ) {
                isValid = false;
                error = `MedData type is invalid, could not find a matching type for "${medDataType}"`;
            }

            return [error, isValid];
        }

        /**
         * If any special filters have been added in activity-schema.common.js > MedData_T
         * we should clean them up and apply the correct query for MongoDB
         * @param {Object} args
         * @returns args
         */
        async function validateAndUpdateCustomFilters( args ) {
            let
                medDataType,
                isValid = true,
                error;

            if( args.query.medDataType ) {
                medDataType = args.query.medDataType.toUpperCase();
                [error, isValid] = await validateMedDataType( medDataType, args.user );
                if( isValid ) {
                    args.query.medData = {$elemMatch: {type: medDataType}};
                    delete args.query.medDataType;
                }
            }

            return [error, isValid];
        }

        /**
         * @method preparePayload
         * @private
         *
         * Validate provided data and prepare them for saving.
         *
         * @param {Object} user
         * @param {Object} requestData
         * @returns {Object} - contains prepared data, errors, etc
         */
        async function preparePayload( user, requestData ){
            let
                warnings = [],
                err,
                cnt;

            if ( requestData.locationId ) {
                [ err, cnt ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        action: 'count',
                        query: {
                            _id: requestData.locationId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting location ${requestData.locationId}: ${err.stack || err}`, 'error', NAME );
                }
                if( 0 === cnt ) {
                    warnings = [...warnings, `requested location ${requestData.locationId} not found`];
                    delete requestData.locationId;
                }
            } else {
                warnings = [...warnings, 'MEDDATA entry does not have a locationId'];
            }

            if ( requestData.employeeId ) {
                [ err, cnt ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        action: 'count',
                        query: {
                            _id: requestData.employeeId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting employee ${requestData.employeeId}: ${err.stack || err}`, 'error', NAME );
                }
                if( 0 === cnt ) {
                    warnings = [...warnings, `requested employee ${requestData.employeeId} not found`];
                    delete requestData.employeeId;
                }
            } else {
                warnings = [...warnings, 'MEDDATA entry does not have an employeeId'];
            }

            if ( requestData.patientId ){
                let patients;
                [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: requestData.patientId
                        },
                        options: { select: { firstname: 1, lastname: 1, dob: 1, gender: 1} }
                    } )
                );

                if( err ) {
                    Y.log( `preparePayload: Error on getting patient ${requestData.patientId}: ${err.stack || err}`, 'error', NAME );
                }
                if( !patients || !patients.length ) {
                    warnings = [...warnings, `requested patient ${requestData.patientId} not found`];
                    delete requestData.patientId;
                }
            } else {
                warnings = [...warnings, 'MEDDATA entry does not have a patientId'];
            }

            if ( requestData.caseFolderId ) {
                [err, cnt] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'count',
                        query: {
                            _id: requestData.caseFolderId,
                            patientId: requestData.patientId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting casefolder ${requestData.caseFolderId}: ${err.stack || err}`, 'error', NAME );
                }
                if( 0 === cnt ) {
                    warnings = [...warnings, `requested casefolder ${requestData.caseFolderId} not found`];
                    delete requestData.caseFolderId;
                }
            } else {
                warnings = [...warnings, 'MEDDATA entry does not have a caseFolderId'];
            }

            //if required for activity IDs not valid or not provided - populate with default values
            if ( !requestData.locationId ){
                //use default location
                warnings = [...warnings, `used default main location`];
                requestData.locationId = Y.doccirrus.schemas.location.getMainLocationId();
            }

            if ( !requestData.employeeId ) {
                //use one Phisician from selected location
                let employees;
                [err, employees] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        query: {
                            type: 'PHYSICIAN',
                            status: 'ACTIVE',
                            'locations._id': requestData.locationId
                        },
                        options: {
                            fields: {_id: 1},
                            limit: 1
                        }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting employee for location ${requestData.locationId}: ${err.stack || err}`, 'error', NAME );
                }
                requestData.employeeId = employees && employees[0]._id;
                warnings = [...warnings, `used new employee ${requestData.employeeId} from location ${requestData.locationId}`];
            }

            return [ requestData, warnings ];
        }


        const i18n = Y.doccirrus.i18n;

        /**
         *  Query a patient's med data and return format used by chartmd form elements
         *
         *  May in future add support for GRAVIDOGRAMMPROCESS entries.  Currently treated separately to patient MEDDATA
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Function}  args.callback
         */

        function getChartData( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.getChartData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.getChartData');
            }
            const
                async = require( 'async' ),
                moment = require( 'moment' ),

                checkParams = [
                    'xMin', 'xMax', 'yMin', 'yMax',
                    'xDatum', 'yDatum',
                    'patientId', 'patientDOB', 'timestamp'
                ];

            let
                params = args.originalParams,

                activities,
                chartData = {
                    'points': [],
                    'activityIds': []
                };

            async.series( [ checkArguments, queryActivities, formatResults ], onAllDone );

            function checkArguments( itcb ) {
                let i;
                for ( i = 0; i < checkParams.length; i++ ) {
                    if ( !params.hasOwnProperty( checkParams[i] ) ) {
                        return itcb( Y.doccirrus.errors.rest( 400, 'Missing parameter: ' + checkParams[i] ) );
                    }
                }
                itcb( null );
            }

            function queryActivities( itcb ) {
                let
                    query = {
                        'actType': { '$in': [ 'MEDDATA', 'PERCENTILECURVE' ] },
                        'patientId': params.patientId
                    };

                switch( params.xDatum ) {
                    case 'DAY_SINCE_ACTIVITY':
                        //  TODO: query based on xMin / xMax from params.timestamp
                        break;

                    case 'DAY_PATIENT_AGE':
                        //  TODO: query based on xMin / xMax from patient DOB
                        break;
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': query,
                    'callback': onActivitiesLoaded
                } );

                function onActivitiesLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Query matched ' + result.length + ' MEDDATA activities.', 'debug', NAME );
                    activities = result;
                    itcb( null );
                }
            }

            function formatResults( itcb ) {
                let i, chartPoint;

                for ( i = 0; i < activities.length; i++ ) {
                    chartPoint = getChartPoint( activities[i] );
                    if ( chartPoint ) {
                        chartData.points.push( chartPoint );
                        chartData.activityIds.push( activities[i]._id );
                    }
                }

                return itcb( null );
            }

            /**
             *  Check that an activity has MEDDATA matching the current query, return as x,y pair
             *
             *  @param  {Object}    act     A MEDDATA or PERCENTILECURVE activity
             */

            function getChartPoint( act ) {
                let
                    xPoint = getMedDataValue( act, params.xDatum ),
                    yPoint = getMedDataValue( act, params.yDatum );

                if ( xPoint === null || yPoint === null ) {
                    return null;
                }

                return {
                    'x': xPoint,
                    'y': yPoint
                };
            }

            function getMedDataValue( act, head ) {
                let i, value = null;

                if ( !act.medData ) { return null; }

                for ( i = 0; i < act.medData.length; i++ ) {

                    if ( act.medData[i].type === head && act.medData[i].hasOwnProperty( 'value' ) ) {
                        value = parseFloat( act.medData[i].value );
                    }

                    //  x axis is in days between chart activity and meddata activity
                    if ( head === 'DAY_SINCE_ACTIVITY' ) {
                        value = moment( params.timestamp ).diff( moment ( act.timestamp ), 'days' );
                        if ( value > params.xMax ) { value = null; }
                        if ( value < params.xMin ) { value = null; }
                    }

                    //  x axis is in days between patient date of birth and meddata activity
                    if ( head === 'DAY_PATIENT_AGE' ) {
                        value = moment(  act.timestamp ).diff( moment( params.patientDOB ), 'days' );
                        if ( value > params.xMax ) { value = null; }
                        if ( value < params.xMin ) { value = null; }
                    }

                }

                if ( isNaN( value ) ) { return null; }

                return value;
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem querying MEDDATA for patient chart.', 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, chartData );
            }
        }

        /**
         *  Get array of user-defined MEDDATA types. These are fetched from the tag collection,
         *  as each custom type is stored within the tag collection as new entry.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {string[]|string|undefined}  args.category? optional filter for certain categories to fetch
         *  @param  {string[]|string|undefined}  args.medDataType? optional filter for certain MedDataItem types to be fetched
         *  @param  {string[]|string|undefined}  args.title? optional filter for certain MedDataItem types to be fetched (same as setting medDataType)
         *  @param  {(err, result: string[]) => any}  args.callback?
         *  @return {Promise<MedDataItemTemplateCollection>}
         */
        async function getMedDataItemTemplateCollection( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.getMedDataItemTemplateCollection', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.getMedDataItemTemplateCollection');
            }

            const
                {
                    user,
                    category,
                    title,
                    medDataType,
                    callback = promisifiedCallback
                } = args;

            /**
             * setup filters to increase performance by limiting the required lookup universe
             * @type {{$exists: boolean}|{$in: string[]}|string}
             */
            let categoryFilter, titleFilter;

            // The category filter is used to fetch only tags registered for a specific MedDataItemCategory.
            if( typeof category === "string" ) {
                categoryFilter = category;
            } else if( Array.isArray( category ) ) {
                categoryFilter = { $in: category.filter( item => typeof item === "string" ) };
            } else {
                categoryFilter = { $exists: true };
            }

            // The title filter can be set either by a given medDataType or the title.
            // MedDataType is more intuitive, as the medDataItem's type is a tag's title.
            // A given title in the query will overwrite any given medDataType, as this is knowingly more precise.
            if( typeof title === "string" ) {
                titleFilter = title;
            } else if( Array.isArray( title ) ) {
                titleFilter = { $in: title.filter( item => typeof item === "string" ) };
            } else if( typeof medDataType === "string" ) {
                titleFilter = medDataType;
            } else if( Array.isArray( medDataType ) ) {
                titleFilter = { $in: medDataType.filter( item => typeof item === "string" ) };
            } else {
                titleFilter = { $exists: true };
            }

            /**
             * Fetch all tags matching the queries categories, or all categories,
             * if no query has been applied.
             */
            const [err, tagList] = await formatPromiseResult(
                Y.doccirrus.api.tag.get( {
                    user,
                    query: {
                        type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA,
                        category: categoryFilter,
                        title: titleFilter
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `getMedDataItemTemplateCollection error while loading tags from database loading custom medDataTypes for categories ${category.join( "," )}: ${JSON.stringify( err )}`, 'error', NAME );
                return callback( err );
            }

            // create a new template collection
            const templateCollection = new MedDataItemTemplateCollection( {} );

            // add all custom tags (static tags have been added inside the constructor already)
            if( tagList && Array.isArray( tagList ) ) {
                templateCollection.addTagOrTagList( tagList );
            }

            return callback( null, templateCollection );
        }

        /**
         *  Used when setting up chartmd elements in form editor
         *
         *  Returns a dict of key -> translated label
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback   Of the form fn( err, dict )
         */

        function getAllMeddataTypes( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.getAllMeddataTypes', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.getAllMeddataTypes');
            }
            let
                async = require( 'async' ),
                allMedDataTypes = {};

            async.series( [ getDefaultTypes, getCustomTypes ], onAllDone );

            function getDefaultTypes( itcb ) {
                let
                    medDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
                    gravidogrammTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes,
                    precentileTypes = Y.doccirrus.schemas.v_meddata.percentileCurveDataTypes,
                    k;

                for ( k in medDataTypes ) {
                    if ( medDataTypes.hasOwnProperty( k ) ) {
                        allMedDataTypes[ k ] = i18n( 'v_meddata-schema.medDataTypes.' + medDataTypes[ k ] );
                    }
                }

                for ( k in gravidogrammTypes ) {
                    if ( gravidogrammTypes.hasOwnProperty( k ) ) {
                        allMedDataTypes[ k ] = i18n( 'v_meddata-schema.gravidogrammDataTypes.' + gravidogrammTypes[ k ] );
                    }
                }

                for ( k in precentileTypes ) {
                    if ( precentileTypes.hasOwnProperty( k ) ) {
                        allMedDataTypes[ k ] = i18n( 'v_meddata-schema.medDataTypes.' + precentileTypes[ k ] );
                    }
                }

                itcb( null );
            }

            function getCustomTypes( itcb ) {
                getMedDataItemTemplateCollection( {
                    'user': args.user,
                    'callback': onCustomTypesLoaded
                } );

                //  custom types override defaults
                function onCustomTypesLoaded( err, resObj ) {
                    if ( err ) { return itcb( err ); }
                    let
                        i,
                        customTypes = resObj.getMedDataTypeList();
                    for ( i = 0; i < customTypes.length; i++ ) {
                        allMedDataTypes[ customTypes[i] ] = customTypes[i];
                    }
                    itcb( null );
                }
            }

            function onAllDone( err) {
                if ( err ) { return args.callback( err ); }
                args.callback( null, allMedDataTypes );
            }
        }

        /**
         *  Get most recent MEDDATA as recorded on patient API (will include MEDDATA and inPedia data)
         *
         *  TODO: replace activity-api::getLatestMeddataForPatient with this version
         *
         *  @param  {Object}    args
         *  @param  {Object]    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.patientId       _id of a patient
         *  @param  {Function}  args.callback                       Of the form fn( err, medDataArray )
         */

        function getLatestMeddataForPatient( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.getLatestMeddataForPatient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.getLatestMeddataForPatient');
            }
            let
                params = args.originalParams || {};

            if( !params.patientId ) {
                return args.callback( new Error( 'insufficient arguments' ) );
            }

            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'model': 'patient',
                'query': { '_id': params.patientId },
                'callback': onPatientLoaded
            } );

            function onPatientLoaded( err, result ) {
                if ( err ) {
                    Y.log( 'Problem loading patient ' + params.patientId + ' from database: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                if ( !result || !result[0] || !result[0].latestMedData ) {
                    //  nothing found
                    return args.callback( null, [] );
                }

                return args.callback( null, result[0].latestMedData );
            }
        }

        async function GET( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.GET', 'info', NAME);
            let
                isValid,
                error;
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.meddata.GET' );
            }
            validateArgs( args, 'get' );
            [error, isValid] = await validateAndUpdateCustomFilters( args );

            if( !isValid ) {
                return args.callback(
                    new Y.doccirrus.commonerrors.DCError( 403, {message: error || 'Validation for request failed'} )
                );
            }

            Y.doccirrus.api.activity.get( args );
        }

        async function POST( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.POST', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.POST');
            }

            const [ data, warnings ] = await preparePayload( args.user, args.data );
            if ( Array.isArray( warnings ) ) {
                warnings.forEach( warn => Y.log( warn, 'warn', NAME ) );
            }
            args.data = data;

            if( !args.data.caseFolderId ) {
                Y.log(`Linking MEDDATA to "inBox" casefolder`, 'info', NAME);
                const caseFolderId = await Y.doccirrus.api.casefolder.getInBoxCaseFolderId( {
                    user: args.user,
                    data: args.data
                } );
                if( caseFolderId ) {
                    args.data.caseFolderId = caseFolderId;
                }
            }

            const { isValid, error } = validateArgs( args, 'post' );
            if ( !isValid ) {
                return args.callback( Y.doccirrus.errors.rest( 403, error, true ), null );
            } else {
                Y.doccirrus.api.activity.post( args );
            }
        }

        function PUT( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.PUT', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.PUT');
            }
            validateArgs( args, 'put');
            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.api.activity.put( args );
        }

        function DELETE( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.DELETE', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.DELETE');
            }
            validateArgs( args, 'delete');
            const callback = args.callback;
            args.callback = ( error, response ) => {
                if ( Array.isArray( response ) ) {
                    response = response.map( r => r.data );
                }
                callback( error, response );
            };
            Y.doccirrus.api.activity.delete( args );
        }

        function UPSERT( args ) {
            Y.log('Entering Y.doccirrus.api.meddata.UPSERT', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.meddata.UPSERT');
            }
            validateArgs( args, 'upsert');
            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.api.activity.upsert( args );
        }

        /**
         *  Check ImpfDataMe for vaccination status and create new medication data if needed
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.patient - fields from currently open patient
         *  @param  {Object}    args.originalParams.server  - ImpfDocNe connection settings configured in gadget
         *
         *  @param  {Function}  args.callback
         */
        async function checkVaccinationStatus( args ) {
            Y.log( 'Entering Y.doccirrus.api.meddata.checkVaccinationStatus', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.meddata.checkVaccinationStatus' );
            }
            const
                xmlrpc = require('xmlrpc'),
                parseString = require( 'xml2js' ).parseString,
                { user, originalParams: {
                    patient: { patientId, firstname, lastname, patientNumber, gender, dob, activeCaseFolderId },
                    server: { url, port, bsnr, firstname: doctorFirstName, lastname: doctorLastName } }, callback } = args,
                gendersMap = {
                    'UNKNOWN': 0,
                    'MALE': 1,
                    'FEMALE': 2,
                    'UNDEFINED': 3,
                    'VARIOUS': 4
                },
                getLatestMeddataForPatientPromisify = promisifyArgsCallback( getLatestMeddataForPatient ),
                createActivityForPatientPromisify = promisifyArgsCallback( Y.doccirrus.api.activity.createActivityForPatient );

            if( !url || !port || !bsnr || !doctorFirstName || !doctorLastName || !patientId ){
                return callback( Y.doccirrus.errors.rest( 400, 'Vaccination status: insufficient connection params' ) );
            }

            if( !activeCaseFolderId ){
                return callback( Y.doccirrus.errors.rest( 400, 'Vaccination status: casefolder not selected' ) );
            }

            // client should be started with xmlrpc support
            // impfdoc.bat --aisport=8081 --aisinterface=3.3

            let client = xmlrpc.createClient({ host: url, port, path: '/'});

            let request = `<?xml version="1.0" encoding="UTF-8"?><Aktion xmlns="http://www.gzim.de/impfdoc/ne/request"><Kennung-A>AnfrageStatusPatient</Kennung-A><Patient><PatientenStamm FK3000="${patientNumber}"><FK3101>${lastname}</FK3101><FK3102>${firstname}</FK3102><FK3110>${gendersMap[gender]}</FK3110><FK3103>${moment( dob ).format( i18n( 'general.TIMESTAMP_FORMAT' ) )}</FK3103></PatientenStamm></Patient><ArztStamm><FK0201>${bsnr}</FK0201><FK0211>${doctorLastName}</FK0211><FK0220>${doctorFirstName}</FK0220></ArztStamm></Aktion>`;

            let [err, responseXML] = await formatPromiseResult(
                new Promise( (resolve, reject) => {
                    setTimeout( () => {
                        Y.log( `checkVaccinationStatus: server ${url}:${port} not answer`, 'warn', NAME );
                        //empty response if server is not answer
                        return resolve();
                    }, 3 * 1000);
                    client.methodCall( 'Impfdoc.request', [ request ], (err, result) => {
                       if( err ){
                           return reject( err );
                       }
                       resolve( result );
                    } );
                } )
            );

            if( err ){
                Y.log( `checkVaccinationStatus: Error on executing xmlrpc: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !responseXML || !responseXML.data ){
                return callback( null, { changed: false } );
            }

            let responseObject;
            [err, responseObject] = await formatPromiseResult(
                new Promise( (resolve, reject) => {
                    try {
                        parseString( responseXML.data, function( err, result ) {
                            if( err ){
                                return reject( err );
                            }
                            resolve( result );
                        } );
                    } catch ( err ){
                        return reject( err );
                    }
                } )
            );

            if( err ){
                Y.log( `checkVaccinationStatus: Error on parsing xml: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let latestMedData;
            [err, latestMedData] = await formatPromiseResult(
                getLatestMeddataForPatientPromisify({
                    user,
                    originalParams: { patientId }
                })
            );

            /*
             * EXAMPLE XML response serialized in "responseObject"
             * <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
             * <Aktion xmlns="http://www.gzim.de/impfdoc/ne/response">
             * <Kennung-A>AntwortStatusPatient</Kennung-A>
             * <login>test</login>
             * <Patient>
             * <PatientenStamm FK3000="143">
             * <FK3110>1</FK3110>
             * <FK4121>1</FK4121>
             * </PatientenStamm>
             * </Patient>
             * <PatientenStatus FK3000="143">
             * <PatientZeile>1, GeneralTest (10.09.2002)</PatientZeile>
             * <ImpfAmpel>0</ImpfAmpel>
             * <HatAnamnese>0</HatAnamnese>
             * <HatGueltigenImpfplan>0</HatGueltigenImpfplan>
             * <HatImpfungenEmpfohlen>0</HatImpfungenEmpfohlen>
             * <HatImpfungenBaldEmpfohlen>0</HatImpfungenBaldEmpfohlen>
             * <NaechsterTermin>19.11.2020</NaechsterTermin>
             * </PatientenStatus>
             * </Aktion>
             */

            let
                currentMedDataItem = ( latestMedData || [] ).find( el => el.type === Y.doccirrus.schemas.v_meddata.medDataTypes.VACCINATION ),
                oldStatus = currentMedDataItem && currentMedDataItem.textValue,
                patientStatus = responseObject && responseObject.Aktion && responseObject.Aktion.PatientenStatus &&
                                responseObject.Aktion.PatientenStatus[0] || {},
                newStatus = patientStatus.ImpfAmpel && patientStatus.ImpfAmpel[0],
                patientData = {},
                key;

            for( key of Object.keys(patientStatus) ) {
                if( ['$', 'PatientZeile'].includes( key ) ) {
                    continue;
                }
                if( patientStatus[key] && Array.isArray( patientStatus[key] ) && patientStatus[key][0] ){
                    patientData[key] = patientStatus[key][0];
                }
            }

            // handle different types and normalize them
            switch( typeof newStatus ) {
                case "number":
                    newStatus = newStatus.toString();
                    break;
                case "string":
                    newStatus = newStatus.trim();
                    break;
            }

            // handle different types
            switch( typeof oldStatus ) {
                case "number":
                    oldStatus = oldStatus.toString();
                    break;
                case "string":
                    oldStatus = oldStatus.trim();
                    break;
            }

            // if a new status is given, and there is either no
            // oldStatus or the newStatus diverges from the old one, create a new entry
            if( newStatus && (!oldStatus || newStatus !== oldStatus) ) {
                [err] = await formatPromiseResult(
                    createActivityForPatientPromisify( {
                        user,
                        data: {
                            status: 'VALID',
                            actType: 'MEDDATA',
                            patientId,
                            caseFolderId: activeCaseFolderId,
                            medData: [
                                {
                                    type: Y.doccirrus.schemas.v_meddata.medDataTypes.VACCINATION,
                                    textValue: newStatus
                                }
                            ]
                        },
                        query: { _id: patientId }
                    } )
                );
                if( err ) {
                    Y.log( `checkVaccinationStatus: Error on posting new med data: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'refreshCaseFolder',
                    msg: {
                        data: {
                            caseFolderId: activeCaseFolderId
                        }
                    }
                } );

                return callback( null, { changed: true, patientData } );
            }

            callback( null, { changed: false, patientData } );
        }

        /**
         * Returns data from cdsCodes catalog
         * @param args
         * @param {Object} args.query
         * @param {Number} args.originalParams.itemsPerPage
         * @returns {Promise.<*>}
         */
        async function cdsCodesSearch( args ) {
            Y.log( 'Entering Y.doccirrus.api.meddata.cdsCodesSearch', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.meddata.cdsCodesSearch' );
            }

            let {query = {}, originalParams: {itemsPerPage = 0}, callback} = args,
                superUser = Y.doccirrus.auth.getSUForLocal(),
                titleQuery,
                regExStr,
                err, result;

            regExStr = buildSearchRegExStr( query.term || "" );
            let $and;
            try {
                $and = [
                    {
                        title: {
                            $regex: regExStr,
                            $options: 'i'
                        }
                    },
                    {
                        isCode: query.isCode === false ? false : true
                    },
                    {checks: {$ne: null}}
                ];

                if( query.cchType ) {
                    $and.push( {cchType: query.cchType} );
                }

                if( query.state ) {
                    $and.push( {state: query.state} );
                }

                if( query.cchKey ) {
                    $and.push( {cchKey: query.cchKey} );
                }
            } catch( err ) {
                Y.log( 'cdsCodesSearch: Cannot build regex because of invalid user input', 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: superUser,
                    model: 'cdscode',
                    action: 'get',
                    query: {$and},
                    options: {
                        limit: itemsPerPage || 0
                    }

                } )
            );

            if( err ) {
                Y.log( `cdsCodesSearch: Failed to get cdsCodes by query: ${JSON.stringify( titleQuery )}, err: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            return handleResult( err, result, callback );

            function buildSearchRegExStr( term ) {
                return "(?=.*" + term.trim().split( " " ).join( ")(?=.*" ) + ")";
            }
        }

        /**
         * Generate the content for MEDDATA activities.
         * Loads the custom formatting functions for each entry.
         * @param {object} args
         * @param {object} args.user
         * @param {MedDataSchema} args.activity
         * @param {function} [args.callback]
         * @return {Promise<MedDataSchema>}
         */
        async function generateContentForActivity( args ) {
            Y.log( 'Entering Y.doccirrus.api.meddata.generateContentForActivity', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.meddata.generateContentForActivity' );
            }

            const
                {
                    user,
                    activity,
                    callback = promisifiedCallback
                } = args,
                timestampOfActivity = (activity && activity.timestamp) || null,
                medDataItems = (activity && activity.medData) || null,

                // content array to be filled
                content = [];

            if( Array.isArray( medDataItems ) ) {
                // load the med data item templates to correctly format the values within the form
                const [err, medDataItemTemplateCollection] = await formatPromiseResult( getMedDataItemTemplateCollection( {
                    user
                } ) );

                if( err ) {
                    Y.log( `Error querying the MedDataItemTemplateCollection: ${err && err.message || JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }

                medDataItems.forEach( function forEachMedDataItem( medDataItem ) {
                    if( medDataItem && medDataItem.type ) {
                        const
                            // get corresponding medDataItemConfig from MedDataItemTemplateCollection
                            medDataItemConfig = medDataItemTemplateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                                medDataItem,
                                timestamp: timestampOfActivity
                            } );

                        if( medDataItemConfig ) {
                            const
                                // the item's type may be translated
                                translatedType = medDataItemConfig && medDataItemConfig.template && medDataItemConfig.template.i18n || medDataItem.type,
                                // get the formatted value (may be an empty string, if no value is given)
                                formattedValue = medDataItemConfig.formatMedDataItem( medDataItem ),
                                // add the unit with a space, if defined
                                unit = (medDataItem.unit) ? ` ${medDataItem.unit}` : '';

                            // just push the item, if any value is given (may not be the case for items flagged as "isOptional")
                            if( typeof formattedValue === "string" && formattedValue.length > 0 ) {
                                content.push( `${translatedType}: ${formattedValue}${unit}` );
                            }
                        }
                    }
                } );

                // mix in a folding marker, if the content exceeds 5 entries
                if( content.length > 5 ) {
                    content.splice( 5, 0, '{{...}}' );
                }
            }

            // set the activity's content
            activity.content = content.join( '\n' );

            return callback( null, activity );
        }

        function getActivitiesLinkedToContract( args ) {
            // install activity type filter, to only return results of this activity type
            args.activityQuery = {
                actType: { $in: Y.doccirrus.schemas.activity.medDataActTypes }
            };
            return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
        }

        async function migrateMedData( args ) {
            let
                err,
                result1,
                result2,
                result3,
                result4,
                result5,
                result6;

            Y.log( 'Entering Y.doccirrus.api.meddata.migrateMedData', 'info', NAME );

            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.meddata.migrateMedData' );
            }

            [err, result1] = await formatPromiseResult( util.promisify( Y.doccirrus.inCaseUtils.migrationhelper.migrateMedLabDataCategories )( args.user, false ) );

            if( err ) {
                Y.log( `migrateMedData: Error migrating migrateMedLabDataCategories: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            [err, result2] = await formatPromiseResult( util.promisify( Y.doccirrus.inCaseUtils.migrationhelper.updateMedDataItemsWithBoolInTextValueToBoolValue )( args.user, false ) );

            if( err ) {
                Y.log( `migrateMedData: Error migrating updateMedDataItemsWithBoolInTextValueToBoolValue: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            [err, result3] = await formatPromiseResult( util.promisify( Y.doccirrus.inCaseUtils.migrationhelper.updateMedDataItemsInBooleanCategoriesWithoutAnyValue)( args.user, false ) );

            if( err ) {
                Y.log( `migrateMedData: Error migrating updateMedDataItemsInBooleanCategoriesWithoutAnyValue: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            [err, result4] = await formatPromiseResult( util.promisify( Y.doccirrus.inCaseUtils.migrationhelper.updateMedDataItemsWithDateInTextValueToDateValue)( args.user, false ) );

            if( err ) {
                Y.log( `migrateMedData: Error migrating updateMedDataItemsWithDateInTextValueToDateValue: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            [err, result5] = await formatPromiseResult( util.promisify( Y.doccirrus.inCaseUtils.migrationhelper.migrateMedDataItemsVACCINATIONFromNumberToStringEnum)( args.user, false ) );

            if( err ) {
                Y.log( `migrateMedData: Error migrating migrateMedDataItemsVACCINATIONFromNumberToStringEnum: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            [err, result6] = await formatPromiseResult( util.promisify( Y.doccirrus.inCaseUtils.migrationhelper.migrateMedDataItemsWithPureNumericTextValueToNumberValue)( args.user, false ) );

            if( err ) {
                Y.log( `migrateMedData: Error migrating migrateMedDataItemsWithPureNumericTextValueToNumberValue: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            return handleResult(
                null,
                {
                    ...result1,
                    ...result2,
                    ...result3,
                    ...result4,
                    ...result5,
                    ...result6
                },
                args.callback );
        }

        Y.namespace( 'doccirrus.api' ).meddata = {
            'name': NAME,
            get: GET,
            put: PUT,
            post: POST,
            upsert: UPSERT,
            'delete': DELETE,
            getChartData,
            getMedDataItemTemplateCollection,
            generateContentForActivity,
            getAllMeddataTypes,

            //  testing / provisional
            getLatestMeddataForPatient,
            checkVaccinationStatus,
            cdsCodesSearch,
            getActivitiesLinkedToContract,
            migrateMedData
        };

    },
    '0.0.1', { requires: [
        'activity-schema',
        'v_meddata-schema',
        'tag-schema',
        'cdscode-schema',
        'dcactivityutils',
        'dccommonutils'
    ] }
);
