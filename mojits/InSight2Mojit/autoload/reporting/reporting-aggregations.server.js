/**
 *  Collection of hardocded aggregations for reports
 *
 *  Gathered here to de-clutter reporting-api, called fromm reporting-api
 *
 *  @user   strix
 *  @data   04.10.2018
 */
/*global YUI*/
/*jshint esnext:true */


YUI.add( 'reporting-aggregations', function( Y, NAME ) {

    /**
     * @module reporting-api
     *
     * Important: The reporting API does not use a schema and is allowed to use low-level mongoose operations, because of this.
     *
     * !!Do not follow these Database access examples in other Mojits!!
     *
     */

    const
        {formatPromiseResult} = require( 'dc-core' ).utils,
        moment = require( 'moment' ),
        async = require( 'async' ),
        util = require( 'util' ),
        _ = require( 'lodash' ),

        CURSOR_BATCH_SIZE = 1000,
        MAX_LAB_RESULTS = 8000;

    let

        inCaseSchema,
        AnalysisGen = Y.doccirrus.insight2.AnalysisGen,
        analysisUtils = Y.doccirrus.insight2.analysisUtils,
        reportingSchema = Y.doccirrus.schemas.reporting,
        modelDefinitions = reportingSchema.modelDefinitions,
        userGroupsPartner = Y.doccirrus.schemas.employee.userGroups.PARTNER,

        LAB_TABLE_FIELDS = {
            '_id': 1,
            'activityId': 1,
            'patientDbId': 1,
            'labResultDisplay': 1,
            'labTestResultVal': 1,
            'labTestResultUnit': 1,
            'labTestResultText': 1,
            'labNormalRanges': 1,
            'labNormalText': 1,
            'labHead': 1,
            'labFullText': 1,
            'labTestLabel': 1,
            'labReqReceived': 1,
            'labTestNotes': 1,
            'labMin': 1,
            'labMax': 1,
            'isPathological': 1
        };


    // ----------------
    // GET DATA (AGGREGATION)
    // ----------------

    function getDataByAggregation( args ) {
        const
            { user, originalParams: { dates, pipeline = [], orgDisplayFields = [] } } = args;

        let hasGrouping = pipeline.some(el => el.$group),
            firstProject = pipeline.find(el => el.$project);
        if (args.originalParams.serialEmail === true) {
            if (hasGrouping) {
                let firstGroup = pipeline.find(el => el.$group);

                if (!firstGroup.$group.patEmail) {
                    firstGroup.$group.patEmail = {$push: "$patEmail"};
                }
                if (firstProject && !firstProject.$project.patEmail) {
                    firstProject.$project.patEmail = "$patEmail";
                }
            } else {
                if (firstProject && !firstProject.patEmail) {
                    firstProject.$project.patEmail = 1;
                }
            }
        }

        if( orgDisplayFields.some( el => el.value === 'patEmail' ) && ! pipeline.some( el => el.$facet ) ){
            let  cond = hasGrouping ? { "$size": { "$filter": {
                "input": "$patEmail",
                    "as": "el",
                    "cond": {  "$ne": ["$$el", ""] }
            } } } : { "$cond": [ {  "$ne": ["$patEmail", ""] }, 1, 0 ] };

            if( !hasGrouping ){
                // for properly count empty Emails firstly coalesce to empty string if null
                pipeline.push( { $addFields: {"patEmail": { "$ifNull": ["$patEmail", ""] } } } );
            }

            pipeline.push({
                "$facet": {
                    "extra": [{
                        "$group": {
                            "_id": null,
                            "countEmail": { "$sum": cond }
                        }
                    }]
                }
            } );
        }
        // EXTMOJ-747 Recall nicht gesetzt
        if( '5909f7051b5d2b794fc3f2c6' === args.originalParams.insightConfigId ) {
            addSpecialCountQuery( pipeline, dates );
        } else {
            // filter results by date and time
            if( dates && Object.keys( dates ).length ) {
                const dateMatch = getQueryForDates( dates );
                pipeline.unshift( dateMatch );
            }
        }

        //cast bucket boundaries to Dates
        let bucket = pipeline.find( el => el.$bucket ),
            nullDt = (new Date( null )).getTime();
        if( bucket ){
            bucket.$bucket.boundaries = bucket.$bucket.boundaries.map( dt => ( new Date(dt) ) ).filter( dt => dt && dt.getTime() !== nullDt );
        }

        if( '5ace18b9eb0ce49d0d923b91' === args.originalParams.insightConfigId ) {
            pipeline.unshift( { $match: { employeeId: user.specifiedBy } } );
        }

        let isPartner = user.groups && user.groups.some( item => userGroupsPartner === item.group ),
            isSuperUser = Boolean( user.superuser );

        if( isPartner && !isSuperUser ) {
            Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee( {
                user: user,
                query: {},
                options: {
                    select: {
                        _id: 1
                    }
                },
                callback: function( err, caseFolders ) {
                    if(err){
                        Y.log(`Error on getting allowed casefolders for employee ${err.message}`, 'error', NAME );
                    }
                    var idList = caseFolders.map( casefolder => casefolder._id.toString() );

                    if( idList && idList.length ) {
                        let caseFolderIdMatch = getQueryForCaseFolderId( idList );

                        pipeline.unshift( caseFolderIdMatch );
                    }

                    makeReqAggregate( args, pipeline );
                }
            } );
        } else {
            makeReqAggregate( args, pipeline );
        }
    }

    function makeReqAggregate( args, pipeline ) {

        const
            callback = args.callback,
            {displayFields, orgDisplayFields = [], hideSummaryRow, saveToExpertMode} = args.originalParams;

        let
            groupSumQuery = {
                "$group": {
                    _id: null
                }
            },
            addedGroupCount = 0;

        if( displayFields && !hideSummaryRow ) {
            displayFields.filter( displayField => ( displayField.type === 'Number' || displayField.notVisibleAtSummaryRow === false ) ).forEach( function( displayField ){
                addedGroupCount++;
                groupSumQuery.$group[displayField.value] = {"$sum": `$${displayField.value}`};
            } );
        }

        let
            defaultOptions = {allowDiskUse: true, noRetryOnFailure: true},
            options = Object.assign( args.options || {}, defaultOptions );

        Y.log( 'AGGREGATE options: ' + JSON.stringify( options ), 'info', NAME );

        if( args.asCursor ) {
            return makeReqAggregateCursor( args, pipeline, defaultOptions );
        }

        //  Add a secondary sort on _id, CCDEV-71, to prevent pagination issues if results of primrary
        //  sort take more than one page
        options.sort = options.sort || {};
        if ( !options.sort._id ) {
            options.sort._id = 1;
        }

        //  TODO: clean up this waterfall

        async.waterfall( [
            ( next ) => {

                if( !orgDisplayFields.length ){
                    return next( null, [] );
                }

                Y.doccirrus.api.reporting.reportingDBaction( {
                    action: 'aggregate',
                    pipeline,
                    model: args.model,
                    options,
                    user: args.user,
                    callback: ( err, res ) => {
                        if( err ) {
                            Y.log( 'Error: Aggregate pipeline failed: ' + JSON.stringify( err ), 'error', NAME );
                            return next( err );
                        }
                        next( null, res );
                    }
                } );
            },
            ( data, next ) => {

                if( !orgDisplayFields.length || !displayFields || hideSummaryRow || 10000 < data.count ) {
                    return next( null, data );
                }

                const
                    mainAggrResult = data;

                if( 0 === addedGroupCount ){
                    mainAggrResult.result.push( {} ); //will be consumed by summaryRow
                    return next( null, mainAggrResult );
                }

                options = _.omit( args.options, ['limit', 'paging', 'skip'] );
                options.noRetryOnFailure = true;

                // remove last $facet step from pipeline to properly calculate totals, all paginated data already
                // kept in mainAggrResult
                if( pipeline && pipeline.length && pipeline[pipeline.length-1].$facet ){
                    pipeline.splice(pipeline.length-1, 1);
                }

                Y.doccirrus.api.reporting.reportingDBaction( {
                    action: 'aggregate',
                    pipeline: [...(pipeline.filter( ( item ) => !['$skip', '$limit'].includes( Object.keys( item )[0] ) )), groupSumQuery],
                    model: args.model,
                    options,
                    user: args.user,
                    callback: ( err, sumAggResult ) => {
                        if( err ) {
                            Y.log( 'Error: Aggregate pipeline for sum query failed: ' + JSON.stringify( err ), 'error', NAME );
                            return next( err );
                        }
                        mainAggrResult.result.push( sumAggResult.result[0] );
                        next( null, mainAggrResult );
                    }
                } );
            },
            ( data, next ) => {
                if( !saveToExpertMode ) {
                    return next( null, data );
                }

                let pipelineToSave = pipeline.filter( ( item ) => {
                    return !(item.$match && item.$match.timestampDate) && !['$skip', '$limit'].includes( Object.keys( item )[0] );
                } );

                Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'insight2',
                    data: {
                        $set: {aggregatePipeline: JSON.stringify( pipelineToSave )}
                    },
                    user: args.user,
                    query: {_id: args.originalParams.insightConfigId}
                }, ( err ) => {
                    if( err ) {
                        Y.log( 'Error: Saving aggregatePipeline failed: ' + JSON.stringify( err ), 'error', NAME );
                        return next( err );
                    }
                    //emit event for refresh reports table with updated pipeline
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        event: `insight2.refreshTable`,
                        tenantId: args.user && args.user.tenantId,
                        msg: {
                            data: args.originalParams.insightConfigId
                        }
                    } );
                    next( null, data );
                } );
            }
        ], ( err, result ) => callback( err, result ) );
    }

    /**
     *  Experimental, for streaming to CSV
     *
     *  TODO: prevent timeout here
     *
     *  @param  {Object}    args
     *  @param  {Object}    pipeline
     *  @/param  {Object}    options
     */

    async function makeReqAggregateCursor( args, pipeline, options ) {
        const
            getModelP = util.promisify( Y.doccirrus.mongodb.getModel );

        let err, reportingModel, cursor;

        //  1.  Get a mongoose model

        [ err, reportingModel ] = await formatPromiseResult( getModelP( args.user, 'reporting', false ) );

        if ( err ) {
            Y.log( `Could not create model to stream aggregation from: ${err.stack||err}`, 'error', NAME );
            return args.callback( err );
        }

        //  2.  Run the aggregation

        try {

            cursor = reportingModel.mongoose.aggregate( pipeline )
                .option( options )
                .cursor( { batchSize: CURSOR_BATCH_SIZE } )
                .exec();

        } catch ( err ) {
            Y.log( `Could not make cursor from aggregation: ${err.stack||err}`, 'warn', NAME );
            return args.callback( err );
        }

        args.callback( null, cursor );
    }

    // EXTMOJ-747 Recall nicht gesetzt
    function addSpecialCountQuery( pipeline, dates ) {

        const
            last3MonthActivePatients = moment( dates.startDate ).subtract( 3, 'months' ).toISOString();

        pipeline.unshift( {} );

        pipeline[0].$match = {
            "patientDbId": {
                "$exists": true
            },
            "timestampDate": {
                "$gte": new Date( last3MonthActivePatients )
            }
        };

        pipeline[1].$group.foundCount = {
            "$addToSet": {
                "$cond": [
                    {
                        "$and": [
                            {"$gte": ["$timestampDate", new Date( dates.startDate )]},
                            {"$lte": ["$timestampDate", new Date( dates.endDate )]}
                        ]
                    },
                    { $ifNull: [ "$scheduleId", { $ifNull: [ "$taskId", false ] } ] },
                    false
                ]
            }
        };

        return pipeline;
    }

    function getQueryForCaseFolderId( idList ) {
        var locList = [];

        idList.forEach( function( cfId ) {
            locList.push( cfId );
        } );

        var match = {
            $match: {
                caseFolderId: {
                    $in: idList
                }
            }
        };

        return match;
    }

    function getQueryForDates( dates ) {
        var dateMatch = {
            $match: {
                timestampDate: {}
            }
        };

        if( dates.endDate ) {
            dateMatch.$match.timestampDate.$lte = new Date( dates.endDate );
        }

        if( dates.startDate ) {
            dateMatch.$match.timestampDate.$gte = new Date( dates.startDate );
        }

        return dateMatch;
    }

    // ----------------
    // GET DATA BY CONFIG ID
    // ----------------



    function convertDatesInQuery( q ) {
        var keys = Object.keys( q ),
            ops = ['$dateGte', '$dateGt', '$dateLte', '$dateLt'],
            newKey;
        keys.map( function( k ) {
            if( q[k] && q[k].constructor === Object ) {
                convertDatesInQuery( q[k] );
            } else if( ops.includes( k ) && q[k] ) {
                newKey = k.replace( 'date', '' ).toLowerCase();
                q[newKey] = new Date( q[k] );
                delete q[k];
            }
        } );
    }

    function unescapePipeline( pipelineString ) {
        return JSON.parse( pipelineString );
    }

    function getInsightConfig( insightId, user ) {
        return new Promise( function( resolve, reject ) {
            Y.doccirrus.mongodb.runDb( {
                model: 'insight2',
                action: 'get',
                user: user,
                query: {
                    _id: insightId
                },
                callback: function( err, res ) {
                    if( err ) {
                        Y.log( 'getInsightConfig: Insight2 DB error: ' + err, 'error', NAME );
                        reject( err );
                    }

                    if( !res.length ) {
                        err = new Y.doccirrus.commonerrors.DCError( '25006' );
                        Y.log( 'getInsightConfig: ' + err, 'error', NAME );
                        reject( err );
                    }

                    resolve( res[0] );
                }
            } );
        } );
    }

    function generateRequestParams( config ) {
        let filterElements = config.filterElements || [],
            filterNotElements = config.filterNotElements || [],
            displayFields = config.displayFields || [],
            modelFields = getModelFields( displayFields ),
            allFields = displayFields.concat( modelFields ),
            filterQuery = getFilterQuery( filterElements ),
            filterNotQuery = getFilterNotQuery( filterNotElements ),
            groupQueryEnabled = config.groupBy && config.groupBy.enabled,
            params = [filterQuery],
            groupByVal,
            idFields,
            groupQueries,
            projectQuery;

        if( groupQueryEnabled && config.groupBy.value ) {
            groupByVal = config.groupBy.value;
            idFields = [
                {value: groupByVal}
            ];
            displayFields = displayFields.filter( function( field ) {
                return field.value !== groupByVal;
            } );
            groupQueries = getGroupQuery( idFields, allFields );

            groupQueries.forEach( function( query ) {
                params.push( query );
            } );
        } else {
            projectQuery = getProjectQuery( allFields );

            if( projectQuery && projectQuery.$project && Object.keys( projectQuery.$project ).length ) {
                params.push( projectQuery );
            }
        }
        params.push( filterNotQuery );
        params.displayFields = displayFields;

        return params;
    }

    function getModelFields( fields ) {
        let fieldValue = '',
            fieldSchema = {},
            res = [],
            finalRes = [];

        if( !inCaseSchema ) {
            inCaseSchema = Y.dcforms.reducedschema.loadSync( 'InCase_T' );
        }

        if( fields && fields.length ) {
            fields.forEach( function( field ) {
                fieldValue = field.value;
                fieldSchema = inCaseSchema[fieldValue];

                if( fieldSchema && fieldSchema.model ) {
                    res = res.concat( getDependencyFieldsForModel( fieldSchema.model ) );
                }
            } );

            finalRes = res.filter( function( item, pos ) {
                return res.indexOf( item ) === pos;
            } ).map( function( val ) {
                return {value: val};
            } );
        }

        return finalRes;
    }

    function getDependencyFieldsForModel( modelName ) {
        return modelDefinitions[modelName] || [];
    }


    function getProjectQuery( data ) {
        var result = null;
        if( data && data.length ) {
            result = {
                $project: {}
            };
            data.forEach( function( selector ) {
                var val = selector.value;
                if( val ) {
                    result.$project[val] = 1;
                }
            } );
        }
        return result;
    }

    function getGroupQuery( idFields, groupFields ) {
        var res = [],
            groupQuery = {
                $group: {
                    _id: {}
                }
            },
            projectQuery = {
                $project: {}
            };

        let projectExtension = {};
        idFields.forEach( function( idField ) {
            groupQuery.$group._id[idField.value] = '$' + idField.value;
            projectExtension[idField.value] = '$_id.' + idField.value;
        } );

        let singleGroupQueries, singleProjectQueries, groupCount = {}, projectCounts = {};

        groupFields.forEach( function( groupField ) {
            singleGroupQueries = getSingleGroupQueries( groupField );
            singleGroupQueries.forEach( function( groupQueryObj ) {
                if(!groupQuery.$group[groupQueryObj.fieldName]){
                    groupQuery.$group[groupQueryObj.fieldName] = groupQueryObj.query;
                    groupCount[groupQueryObj.fieldName] = 1;
                } else {
                    groupQuery.$group[`${groupQueryObj.fieldName}_${groupCount[groupQueryObj.fieldName]}`] = groupQueryObj.query;
                    groupCount[groupQueryObj.fieldName] += 1;
                }

            } );

            singleProjectQueries = getSingleProjectQueries( groupField );
            singleProjectQueries.forEach( function( projectQueryObj ) {
                if( projectQueryObj.fieldName === 'markerArray' ){ //flatten array of arrays
                    projectQuery.$project[projectQueryObj.fieldName] = {
                        $reduce: {
                            input: "$markerArray",
                            initialValue: [],
                            in: { $concatArrays : ["$$value", "$$this"] }
                        }
                    };
                } else {
                    if(!projectQuery.$project[projectQueryObj.fieldName]){
                        projectQuery.$project[projectQueryObj.fieldName] = projectQueryObj.query;
                        projectCounts[projectQueryObj.fieldName] = 1;
                    } else {
                        let nextKeyName = `${projectQueryObj.fieldName}_${projectCounts[projectQueryObj.fieldName]}`,
                            queryString = projectQueryObj.query;
                        if( groupCount[projectQueryObj.fieldName] ){
                            try{
                                queryString = JSON.parse(( JSON.stringify(projectQueryObj.query) || '').replace(projectQueryObj.fieldName, nextKeyName) );
                            } catch ( err ){
                                Y.log(`getGroupQuery: Error changing ${JSON.stringify(projectQueryObj.query)} : ${err.stack || err}`, 'warn', NAME );
                            }

                        }
                        projectQuery.$project[nextKeyName] = queryString;
                        projectCounts[projectQueryObj.fieldName] += 1;
                    }
                }
            } );
            projectQuery.$project = {...projectQuery.$project, ...projectExtension};
        } );

        res.push( groupQuery );
        res.push( projectQuery );

        return res;
    }
    function getSingleProjectQueries( fieldObj ) {
        var res = [],
            fieldName = fieldObj.value,
            optionName = fieldObj.groupOption;

        if( !fieldName ) {
            return res;
        }

        switch( optionName ) {
            case 'stringCountNotEmpty':
            case 'numberCount':
            case 'dateCount':
            case 'dateCountDistinct':
                res.push( {
                    query: {
                        $size: { $filter: {
                                input: '$' + fieldName,
                                as: 'el',
                                cond: { $ne: ['$$el', null] }
                            } }
                    },
                    fieldName: fieldName
                } );
                break;

            case 'stringTruncateList':
                res.push( {
                    query: {
                        $slice: ['$' + fieldName, fieldObj.truncateListLimit || 3]
                    },
                    fieldName: fieldName
                } );
                break;

            case 'dateRange':
                res.push( {
                    query: {
                        $concat: ['$_tmp_dateRangeMin', ' - ', '$_tmp_dateRangeMax']
                    },
                    fieldName: fieldName
                } );
                break;

            default:
                res.push( {
                    query: '$' + fieldName,
                    fieldName: fieldName
                } );
        }

        return res;
    }


    function getSingleGroupQueries( fieldObj ) {
        var res = [],
            fieldName = fieldObj.value,
            optionName = fieldObj.groupOption,
            key = fieldObj.stringDistinct || optionName === 'dateCountDistinct' ? '$addToSet' : '$push',
            query;

        if( !fieldName ) {
            return res;
        }

        switch( optionName ) {
            case 'stringCountNotEmpty':
            case 'stringCompleteList':
            case 'stringTruncateList':
            case 'dateCompleteList':
            case 'booleanCompleteList':
            case 'numberCount':
            case 'dateCount':
            case 'dateCountDistinct':
                query = {};
                query[key] = '$' + fieldName;
                res.push( {
                    query: query,
                    fieldName: fieldName
                } );
                break;

            case 'numberSum':
                res.push( {
                    query: {
                        $sum: '$' + fieldName
                    },
                    fieldName: fieldName
                } );
                break;

            case 'numberAvg':
                res.push( {
                    query: {
                        $avg: '$' + fieldName
                    },
                    fieldName: fieldName
                } );
                break;

            case 'numberMax':
            case 'dateMax':
                res.push( {
                    query: {
                        $max: '$' + fieldName
                    },
                    fieldName: fieldName
                } );
                break;

            case 'numberMin':
            case 'dateMin':
                res.push( {
                    query: {
                        $min: '$' + fieldName
                    },
                    fieldName: fieldName
                } );
                break;

            case 'dateRange':
                res.push( {
                    query: {
                        $min: '$' + fieldName
                    },
                    fieldName: '_tmp_dateRangeMin'
                } );
                res.push( {
                    query: {
                        $max: '$' + fieldName
                    },
                    fieldName: '_tmp_dateRangeMax'
                } );
                break;

            default:
                res.push( {
                    query: {
                        $first: '$' + fieldName
                    },
                    fieldName: fieldName
                } );
                break;
        }

        return res;
    }

    function getFilterQuery( elements ) {
        return getQueryFilterElements( elements );
    }

    function getQueryFilterElements( filters ) {
        return {
            $match: processFilters( filters )
        };
    }

    function getFilterNotQuery( elements ) {
        return getQueryFilterNotElements( elements );
    }

    function getQueryFilterNotElements( filters ) {
        return {
            $match: processFilters( filters, true )
        };
    }


    function processFilters( filters, isInverse = false ) {
        let
            lastObj = {},
            queryObject,
            queryArray,
            filterElement,
            regVal,
            currentCriteria;

        if( filters && filters.length ) {
            filters.forEach( function( filter, i ) {
                // current element values
                var field = filter.field,
                    value = filter.value,
                    operator = filter.operator;

                // check if field and value are present
                if( field && value !== undefined ) {

                    //reset tmp vars
                    filterElement = {};
                    filterElement[field] = {};
                    queryObject = {};
                    currentCriteria = {};

                    // if "array-like" operator change value to array
                    if( ('$in' === operator || '$nin' === operator) && 'string' === typeof value ) {
                        value = value.split( ',' );
                        currentCriteria[operator] = value;
                    } else if( 'iregex' === operator ) {
                        if( value && (value.regex || value.iregex ) ) {
                            regVal = {
                                $regex: Y.doccirrus.commonutils.$regexEscape( value.regex || value.iregex ) || '',
                                $options: value.options || 'i'
                            };
                            currentCriteria = regVal;
                        }
                    } else if( '$regex' === operator ) {
                        if( value && (value['\\\\$regex'] || value.regex ) ) {
                            let
                                regexp = value['\\\\$regex'] || value.regex || '',
                                options = value['\\\\$options'] || value.options || '';

                            if( isInverse ){
                                currentCriteria = {$not: new RegExp(regexp, options) };
                            } else {
                                regVal = {
                                    $regex: regexp,
                                    $options: options
                                };
                                currentCriteria = regVal;
                            }
                        }
                    } else if( ['$comp', '$compDate'].indexOf( operator ) !== -1 && value ) {
                        let
                            compVal = {},
                            opValue;
                        value = Y.doccirrus.schemautils.recoverKey( value );
                        for( let op in value ) {
                            if( value.hasOwnProperty( op ) ) {
                                opValue = value[op];

                                if( '$compDate' === operator ) {
                                    opValue = new Date( opValue );
                                }

                                compVal[op] = opValue;
                            }
                        }

                        currentCriteria = compVal;
                    } else if( '$eqDate' === operator ) {
                        currentCriteria.$eq = moment.utc( value ).toDate();
                    } else if( '$neDate' === operator ) {
                        currentCriteria.$ne = moment.utc( value ).toDate();
                    } else if( '$exists' === operator ) {
                        currentCriteria.$exists = true;
                        currentCriteria.$nin = ['', []];

                        if( !value ){
                            currentCriteria = {$not: currentCriteria};
                        }
                    } else {
                        currentCriteria[operator] = value;
                    }

                    if( isInverse && '$regex' !== operator ) {
                        currentCriteria = {$not: currentCriteria};
                    }

                    // 1st and 2nd have to be in one array
                    if( 0 === i ) {
                        filterElement[field] = currentCriteria;
                        lastObj = filterElement;
                    } else {
                        let
                            previousBetween = filters[i - 1].between;

                        queryObject[previousBetween] = queryArray = [];
                        queryArray.push( lastObj );

                        filterElement[field] = currentCriteria;
                        queryArray.push( filterElement );

                        lastObj = queryObject;
                    }
                }
            } );
        }

        return lastObj;
    }

    // ----------------
    // GET DATA (AGGREGATION)
    // ----------------

    // ----------------
    // GET DATA BY CONFIG ID
    // ----------------

    function getDataByConfigId( args ) {
        var callback = args.callback,
            insightId = args.originalParams.insightConfigId,
            query = args.query,
            reqParams;

        Y.log( 'GET INSIGHT CONFIG: ' + insightId, 'info', NAME );
        getInsightConfig( insightId, args.user ).then( function( result ) {
            let dateSettings = result && result.dateSettings,
                orgDisplayFields = (result && result.displayFields || []).filter( el => el.value );

            if( result.predefined ) {
                reqParams = unescapePipeline( result.pipeline );
            } else if( result.aggregatePipeline && result.isExpertModeActive ) {
                let pipeline;
                try {
                    pipeline = unescapePipeline( result.aggregatePipeline );
                } catch ( error ) {
                    Y.log( `getInsightConfig: error getting escaped pipeline ${error.stack || error}`, 'error', NAME );
                    return callback( error );
                }

                pipeline = setFiltering( pipeline, query );
                args.originalParams.pipeline = pipeline;

                reqParams = generateRequestParams( result );
                args.originalParams.displayFields = Array.from( reqParams.displayFields );
                args.originalParams.hideSummaryRow = result.hideSummaryRow;
                args.originalParams.orgDisplayFields = orgDisplayFields;
                setDateSettings( args, dateSettings );
                return getDataByAggregation( args );
            } else {
                reqParams = generateRequestParams( result );
                result.displayFields = Array.from( reqParams.displayFields );
                args.originalParams.saveToExpertMode = args.originalParams.savePipeline;
                delete reqParams.displayFields;
            }

            reqParams = setFiltering( reqParams, query );
            args.originalParams.serialEmail = result.serialEmail;
            args.originalParams.orgDisplayFields = orgDisplayFields;
            args.originalParams.pipeline = reqParams;
            args.originalParams.displayFields = result.displayFields;
            args.originalParams.hideSummaryRow = result.hideSummaryRow;

            setDateSettings( args, dateSettings );

            Y.log( 'GET REPORTS FOR CONFIG: ' + result._id + ' ' + result.csvFilename, 'info', NAME );
            return getDataByAggregation( args );

        }).catch( err => {
            Y.log( 'getDataByConfigId: ' + err.message, 'error', NAME );
            callback( err );
        } );
    }

    function setDateSettings( args, dateSettings ) {
        if( dateSettings && dateSettings.hideTimeline ) {
            let
                startDateISO = '',
                endDateISO = '';

            if( 'absolute' === dateSettings.dateMode &&
                dateSettings.absoluteStartDate &&
                dateSettings.absoluteEndDate ) {

                startDateISO = dateSettings.absoluteStartDate;
                endDateISO = dateSettings.absoluteEndDate;

            } else if( 'relative' === dateSettings.dateMode ) {

                let now = moment(),
                    startDate = now.add( dateSettings.relativeOffset, 'ms' );
                startDateISO = startDate.toISOString();

                let endDate = startDate.add( dateSettings.relativeDuration, 'ms' );
                endDateISO = endDate.toISOString();

            } else if( 'relativeWithMode' === dateSettings.dateMode ) {

                let start = moment(),
                    relativeMode = dateSettings.relativeMode;

                start.startOf( relativeMode );
                start.add( dateSettings.relativeModeOffset, relativeMode + 's' );
                startDateISO = start.toISOString();

                let end = start.add( 1, relativeMode + 's' ).subtract( 1, 'ms' );
                endDateISO = end.toISOString();

            }

            args.originalParams.dates = {
                startDate: startDateISO,
                endDate: endDateISO
            };
        }
    }

    function setFiltering( pipeline, query ) {
        pipeline = pipeline || [];
        if( query && Object.keys( query ).length > 0 ) {
            convertDatesInQuery( query );

            let match = {
                $match: query
            };

            let facetObj = pipeline.find( el => el.$facet );
            if( facetObj ){
                pipeline = pipeline.filter( el => !el.$facet );
            }

            pipeline.push( match );

            if( facetObj ){
                pipeline.push( facetObj );
            }
        }

        return pipeline;
    }

    // ----------------
    // GET DATA (ANALYSIS)
    // ----------------

    function getAnalysis( args ) {
        var groupByFields = args.originalParams.groupByFields,
            virtualFields = args.originalParams.virtualFields,
            additionalFields = args.originalParams.additionalFields || {},
            childrenLimit = args.originalParams.childrenLimit,
            childrenOrder = args.originalParams.childrenOrder,
            analysisOptions = args.originalParams.analysisOptions || {},
            filter = args.originalParams.filter;

        var analysis = new AnalysisGen( {
            groupByFields: groupByFields,
            virtualFields: virtualFields,
            additionalFields: additionalFields,
            filter: filter,
            childrenLimit: childrenLimit,
            childrenOrder: childrenOrder,
            options: analysisOptions
        } );

        var pipeline = analysis.generate();

        if( pipeline.length ) {
            Y.doccirrus.mongodb.runDb( {
                action: 'aggregate',
                pipeline: pipeline,
                model: args.model,
                options: {...args.options, noRetryOnFailure : true},
                user: args.user,
                callback: function( err, res ) {
                    if( err ) {
                        Y.log( 'Error: Aggregate pipeline failed: ' + err, 'error', NAME );
                        return args.callback( err );
                    } else {
                        res.result = analysisUtils.postProcessData( res.result[0], 0, 0, analysisOptions );
                        return args.callback( null, res );
                    }
                }
            } );
            return;
        }

        //  no analysis pipeline
        args.callback( null, {
            n: 0,
            name: 'root',
            size: 1,
            total: 0
        } );

    }

    // ----------------
    // SCHEDULES
    // ----------------

    /**
     * Gets LABDATA activities from reporting collection
     * @method getLabDataOverview
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.query
     * @param {Object} args.query.timestamp if labReqReceived is not set, query "timestamp" moved to "labReqReceived"
     * @param {Object} args.query.labReqReceived main timestamp query
     * @param {Object} args.options
     * @param {Function} args.callback
     */
    function getLabDataOverview( args ) {
        let
            {user, callback, query = {}, options = {}} = args;

        query.actType = 'LABDATA';
        if( query.timestamp ) {
            if( query.timestamp.$gte ) {
                query.timestamp.$gte = moment( query.timestamp.$gte ).toISOString();
            }
            if( query.timestamp.$lte ) {
                query.timestamp.$lte = moment(query.timestamp.$lte).toISOString();
            }

            if( !query.labLogTimestamp ) {
                query.labLogTimestamp = query.timestamp;
            }
            delete query.timestamp;
        }
        /*
         if( query.labTestResultVal && query.labTestResultVal.$gte ) {
         query.labTestResultVal.$gte = parseFloat( query.labTestResultVal.$gte.replace( ',', '.' ) );
         }
         if( query.labMin && query.labMin.$gte ) {
         query.labMin.$gte = parseFloat( query.labMin.$gte.replace( ',', '.' ) );
         }
         if( query.labMax && query.labMax.$gte ) {
         query.labMax.$gte = parseFloat( query.labMax.$gte.replace( ',', '.' ) );
         }
         */

        //  previously compared min and max values, only works for quantitative findings with simple range
        //query.$where = 'this.labTestResultVal > this.labMax || this.labTestResultVal < this.labMin';

        //  currently using isPathological flag, returns quantiative and qualitative findings, but not yet
        //  quantitaive findings with discrete pathological ranges, or free text / tabular results such as panels
        query.isPathological = true;

        options.lean = true;
        options.select = {
            patientName: 1,
            labHead: 1,
            labTestResultVal: 1,
            labReqReceived: 1,
            labMax: 1,
            labMin: 1,
            bestPatientPhone: 1,
            labTestResultUnit: 1,
            patientDbId: 1,
            activityId: 1,
            isPathological: 1,

            labResultDisplay: 1,
            labResults: 1,
            labTestResultText: 1,
            labNormalRanges: 1,
            labNormalText: 1,
            labFullText: 1,
            labTestLabel: 1,
            labTestNotes: 1,
            ldtVersion: 1,

            timestampDate: 1,
            labLogTimestamp: 1
        };

        //  if not limited, count query can lock up database with large result set
        options.countLimit = 1000;
        Y.doccirrus.api.reporting.reportingDBaction( {
            action: 'get',
            user,
            query,
            options,
            callback: onQueryReporting
        } );

        function onQueryReporting( err, result ) {
            callback( err, result );
        }
    }

    /**
     *  Gets patient labdata / findings
     *
     *  Testing alternate backend which uses reporting rather than aggregation
     *  This is the endpoint requested by the Tabelle tab of LABDATA activities in inCase
     *
     *  @param  args                        {Object}    REST /1/ format
     *  @param  args.user                   {Object}    REST user or equivalent
     *  @param  args.query                  {Object}
     *  @param  args.callback               {Function}  Of the form fn( err, { results: [], count: {Number} } )
     *
     *  Option to query a single activity:
     *  @param  args.query.activityId       {String}    activity id. If it is set, api will produce data for single LABDATA activity
     *
     *  Option to query a casefolder before a given date:
     *  @param  args.query.caseFolderId     {String}    casefolder _id, if showing a set of results
     *  @param  args.query.patientId        {String}    patient _id, if showing casefolder results
     *  @param  args.query.timestamp        {Date}      if showing casefolder results
     */

    function getLabDataTablePivot( args ) {

        var
            async = require( 'async' ),

            options = {},
            collected = [],
            query = {},

            labdata;

        async.series(
            [
                buildQuery,
                runQuery,
                collateResults,
                sortResults,
                filterResults
            ],
            onAllDone
        );

        //  Make a query on the reportings collection for either a single activity or a casefolder before a given date
        function buildQuery( itcb ) {
            if( args.query && args.query.activityId && '' !== args.query.activityId ) {
                query = {
                    'activityId': args.query.activityId,
                    'labResultDisplay': {$ne: 'billing'}                          //  findings, not metadata
                };
                Y.log( 'Laborblatt: query labadata for single activity: ' + JSON.stringify( query ), 'debug', NAME );

            } else {
                query = {
                    'actType': 'LABDATA',
                    'patientDbId': args.query.patientId || null,
                    //  'caseFolderId': args.query.caseFolderId || null,
                    'labResultDisplay': {$ne: 'billing'},                         //  findings, not metadata
                    'timestampDate': {$lte: new Date( args.query.timestamp )}
                };

                if( !query.patientDbId ) {
                    return itcb( Y.doccirrus.errors.rest( 404, 'Missing parameter patientId', true ) );
                }

                Y.log( 'Labortabelle: query labadata for casefolder: ' + JSON.stringify( query ), 'debug', NAME );
            }

            if( args.options.hasOwnProperty( 'skip' ) ) {
                options.skip = 0;
            }
            /* args.options.skip */
            if( args.options.hasOwnProperty( 'limit' ) ) {
                options.limit = MAX_LAB_RESULTS;
            }
            /* args.options.limit */
            if( args.options.hasOwnProperty( 'paging' ) ) {
                options.paging = args.options.paging;
            }

            options.fields = LAB_TABLE_FIELDS;
            options.lean = true;

            return itcb( null );
        }

        //  Get independent labdata findings from reporting collection
        function runQuery( itcb ) {
            Y.doccirrus.api.reporting.reportingDBaction( {
                user: args.user,
                action: 'get',
                query,
                options,
                callback: onQueryReportings
            } );

            function onQueryReportings( err, result ) {
                if( err ) {
                    return itcb( err );
                }

                labdata = result.result ? result.result : result;
                itcb( null );
            }
        }

        //  Arrange labadata entries into grups by original activity _id (columns in table on the client)
        //  See labResultDisplay options defined in the generic form mappers
        function collateResults( itcb ) {
            var
                allActivityIds = [],
                allResultCodes = [],
                newRow, newCell,
                i, j, row, activities;

            //  note all actvities and codes in this result set
            for( i = 0; i < labdata.length; i++ ) {
                row = labdata[i];
                if( -1 === allActivityIds.indexOf( row.activityId ) && row.labHead && '' !== row.labHead ) {
                    allActivityIds.push( row.activityId );
                }
                if( row.labHead && -1 === allResultCodes.indexOf( row.labHead ) ) {
                    allResultCodes.push( row.labHead );
                }
            }

            for( i = 0; i < allResultCodes.length; i++ ) {
                activities = [];

                for( j = 0; j < labdata.length; j++ ) {
                    row = labdata[j];
                    if( row.labHead === allResultCodes[i] ) {

                        newCell = {
                            '_id': row._id,
                            'activityId': row.activityId,
                            'labResultDisplay': row.labResultDisplay || '',
                            'labHead': row.labHead || '',
                            'labFullText': row.labFullText || '',
                            'labTestLabel': row.labTestLabel || '',
                            'labMin': row.labMin || '',
                            'labMax': row.labMax || '',
                            'labTestResultUnit': row.labTestResultUnit || '',
                            'labTestResultVal': ( ( row.labTestResultVal || 0 === row.labTestResultVal ) ? row.labTestResultVal : '' ),
                            'labTestResultText': row.labTestResultText || '',
                            'labNormalText': row.labNormalText || '',
                            'labNormalRanges': row.labNormalRanges || '',
                            'labTestNotes': row.labTestNotes || '',
                            'labReqReceived': row.labReqReceived,
                            'timestamp': row.timestampDate,
                            'isPathological': row.isPathological
                        };

                        activities.push( newCell );
                    }
                }

                //  Giving these different names to distinguish them from the assorted properties in activities and
                //  reporting - these may hold different values depending on labResultDisplay, and correspond to
                //  table rows rather than individual findings / reporting entries

                if( activities.length > 0 ) {
                    newRow = {
                        'title': activities[0].title,
                        'type': activities[0].labHead,
                        'labMin': activities[0].labMin + '',
                        'labMax': activities[0].labMax + '',
                        'labNormalText': activities[0].labNormalText,
                        'labTestLabel': activities[0].labTestLabel,
                        'unit': activities[0].labTestResultUnit,
                        'display': activities[0].labResultDisplay,
                        'activityIds': allActivityIds,
                        'activities': activities
                    };

                    /* TODO: special cases here
                     switch( newRow.type ) {
                     case '':
                     break;
                     }
                     */

                    //  values may not be present in first row, fill in where possible
                    for( j = 0; j < newRow.activities.length; j++ ) {
                        if( '' === newRow.labMin && '' !== newRow.activities[j].labMin ) {
                            newRow.labMin = newRow.activities[j].labMin;
                        }
                        if( '' === newRow.labMax && '' !== newRow.activities[j].labMax ) {
                            newRow.labMax = newRow.activities[j].labMax;
                        }
                        if( '' === newRow.labTestResultUnit && '' !== newRow.activities[j].labTestResultUnit ) {
                            newRow.unit = newRow.activities[j].labTestResultUnit;
                        }
                        if( '' === newRow.labNormalText && '' !== newRow.activities[j].labNormalText ) {
                            newRow.labNormalText = newRow.activities[j].labNormalText;
                        }
                        if( '' === newRow.labTestLabel && '' !== newRow.activities[j].labTestLabel ) {
                            newRow.labTestLabel = newRow.activities[j].labTestLabel;
                        }
                    }

                    //  shortcut / compact column option in PDF and client table
                    newRow.labNormalTextUnit = newRow.labNormalText + ' ' + newRow.unit;

                    collected.push( newRow );
                }
            }

            itcb( null );
        }

        //  apply sorting to collated rows
        function sortResults( itcb ) {
            var sortField = '', sortDir = 0;

            if( args.options && args.options.sort ) {
                if( args.options.sort.max ) {
                    sortField = 'max';
                    sortDir = args.options.sort.max;
                }
                if( args.options.sort.min ) {
                    sortField = 'min';
                    sortDir = args.options.sort.min;
                }
                if( args.options.sort.unit ) {
                    sortField = 'unit';
                    sortDir = args.options.sort.unit;
                }
                if( args.options.sort.type ) {
                    sortField = 'type';
                    sortDir = args.options.sort.type;
                }
            }

            if( '' !== sortField ) {
                if( 1 === sortDir ) {
                    collected.sort( orderDataAsc );
                } else {
                    collected.sort( orderDataDesc );
                }
            }

            function orderDataAsc( a, b ) {
                if( a[sortField] < b[sortField] ) {
                    return -1;
                }
                if( a[sortField] > b[sortField] ) {
                    return 1;
                }
                return 0;
            }

            function orderDataDesc( a, b ) {
                if( a[sortField] > b[sortField] ) {
                    return -1;
                }
                if( a[sortField] < b[sortField] ) {
                    return 1;
                }
                return 0;
            }

            itcb( null );
        }

        //  Note that we do not apply filters in the query:
        //  this is to preserve the activityIds array used by the table in the client
        function filterResults( itcb ) {
            var filterField = '', filterBy = '', filterSet = [];

            if( args.query ) {
                // now filtering this type by select2
                if( args.query.type && args.query.type.$regex ) {
                    filterField = 'type';
                    filterBy = args.query.type.$regex;
                    collected = collected.filter( reduceRows );
                }
                if( args.query.type && args.query.type.$in ) {
                    filterField = 'type';
                    filterSet = args.query.type.$in;
                    collected = collected.filter( reduceRowsSet );
                }
                if( args.query.unit && args.query.unit.$regex ) {
                    filterField = 'unit';
                    filterBy = args.query.unit.$regex;
                    collected = collected.filter( reduceRows );
                }
                if( args.query.max && args.query.max.$regex ) {
                    filterField = 'max';
                    filterBy = args.query.max.$regex;
                    collected = collected.filter( reduceRows );
                }
                if( args.query.min && args.query.min.$regex ) {
                    filterField = 'min';
                    filterBy = args.query.min.$regex;
                    collected = collected.filter( reduceRows );
                }
                if( args.query.labTestLabel && args.query.labTestLabel.$regex ) {
                    filterField = 'labTestLabel';
                    filterBy = args.query.labTestLabel.$regex;
                    collected = collected.filter( reduceRows );
                }
                if( args.query.labNormalText && args.query.labNormalText.$regex ) {
                    filterField = 'labNormalText';
                    filterBy = args.query.labNormalText.$regex;
                    collected = collected.filter( reduceRows );
                }
            }

            function reduceRows( row ) {
                var checkValue = row[filterField];
                if( !checkValue ) {
                    return false;
                }
                return null !== checkValue.match( filterBy );
            }

            function reduceRowsSet( row ) {
                var checkValue = row[filterField];
                if( !checkValue ) {
                    return false;
                }
                return ( -1 !== filterSet.indexOf( row[filterField] ) );
            }

            itcb( null );
        }

        function onAllDone( err ) {
            if( err ) {
                Y.log( 'Problem extracting labdata from reporting collection: ' + JSON.stringify( err ), 'warn', NAME );
                return args.callback( err );
            }

            return args.callback( err, collected );
        }

    } // end getLabDataTable

    function generateSchneiderKBVLogAnalysis( args ) {
        const
            {user, options, callback, originalParams} = args;

        delete options.limit;
        delete options.paging;

        let
            invoiceLogId = originalParams.invoiceLogId,
            //quarter = originalParams.quarter,
            //from,
            // to,
            result = [],
            aggregatedDataArr,
            failedActivityQueries = [];

        if( !invoiceLogId ) {
            Y.log( `generateSchneiderKBVLogAnalysis: Insufficient params. returning `, 'info', NAME );
            callback( "insufficient parameters" );
            return;
        }

        Y.log( `Starting aggregating quarterly report data for invoiceLogId: ${invoiceLogId} `, 'info', NAME );

        //from = moment.utc(quarter.year,"YYYY").quarter(quarter.quarter).toISOString();
        // to = moment.utc(quarter.year,"YYYY").quarter(quarter.quarter).endOf( 'quarter' ).toISOString();

        Y.doccirrus.mongodb.runDb( {
            action: 'aggregate',
            pipeline: [
                {$match: {"caseFolderType": "PUBLIC", "type": "schein", 'invoiceLogId': invoiceLogId}},
                {$project: {tms: '$data.treatments', schein: '$data._id'}},
                {$unwind: '$tms'},
                {
                    $match: {
                        'tms.price': {$exists: true},
                        'tms.unit': {$exists: true},
                        'tms.timestamp': {$exists: true},
                        'tms._lanr': {$exists: true},
                        'tms.employeeId': {$exists: true}
                    }
                },
                {
                    $project: {
                        code: '$tms.code',
                        lanr: '$tms._lanr',
                        price: '$tms.price',
                        employeeId: '$tms.employeeId',
                        employeeName: '$tms.employeeName',
                        activityId: '$tms._id',
                        _id: 0
                    }
                },
                {
                    $group: {
                        _id: {'code': '$code', 'lanr': '$lanr'},
                        N: {$sum: 1},
                        employeeIds: {$addToSet: '$employeeId'},
                        employeeNames: {$addToSet: '$employeeName'},
                        price: {$sum: '$price'},
                        activityIds: {$push: '$activityId'}
                    }
                },
                {
                    $project: {
                        code: '$_id.code',
                        lanr: '$_id.lanr',
                        employeeIds: '$employeeIds',
                        employeeNames: '$employeeNames',
                        N: 1,
                        price: 1,
                        activityIds: 1,
                        _id: 0
                    }
                },
                {$sort: {lanr: 1, code: 1}}
            ],
            model: 'invoiceentry',
            options: {...options, noRetryOnFailure: true},
            user: user
        } )

            .then( ( aggDataArr ) => {
                if( aggDataArr && aggDataArr.result && aggDataArr.result.length ) {
                    aggregatedDataArr = aggDataArr.result;
                } else {
                    throw {customCode: "aggregate_empty"};
                }

                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'invoiceentry',
                    action: 'count',
                    query: {
                        type: 'schein',
                        "caseFolderType": "PUBLIC",
                        'data.treatments': {$exists: true},
                        'invoiceLogId': invoiceLogId,
                        'data.timestamp': {$exists: true}
                    }
                } );
            } )

            .then( ( totalScheinCount ) => {
                Y.log( `generateSchneiderKBVLogAnalysis: Total schein count: ${totalScheinCount} `, 'info', NAME );
                let promiseArr = [];
                aggregatedDataArr.forEach( ( aggregatedData ) => {
                    promiseArr.push( Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            query: {
                                _id: {$in: aggregatedData.activityIds},
                                code: aggregatedData.code,
                                employeeId: {$in: aggregatedData.employeeIds}
                            },
                            options: {
                                sort: {timestamp: -1},
                                limit: 1,
                                select: {
                                    content: 1,
                                    'u_extra.leistungsgruppe': 1
                                }
                            }
                        } )
                            .then( ( activityArr ) => {
                                if( activityArr && activityArr[0] ) {
                                    result.push( {
                                        lg: activityArr[0].u_extra ? activityArr[0].u_extra.leistungsgruppe : null,
                                        code: aggregatedData.code,
                                        title: activityArr[0].content,
                                        codeGroupCount: aggregatedData.N,
                                        codeGroupPrice: (aggregatedData.price).toFixed( 2 ),
                                        codeGroupCountPercent: ((aggregatedData.N / totalScheinCount) * 100).toFixed( 2 ),
                                        doctorName: aggregatedData.employeeNames.join( ', ' ),
                                        lanr: aggregatedData.lanr
                                    } );
                                } else {
                                    failedActivityQueries.push( {
                                        _id: {$in: aggregatedData.activityIds},
                                        code: aggregatedData.code,
                                        employeeIds: aggregatedData.employeeIds
                                    } );
                                }
                            } )
                    );
                } );

                return Promise.all( promiseArr );
            } )
            .then( () => {
                if( failedActivityQueries.length ) {
                    Y.log( `generateSchneiderKBVLogAnalysis: failed activity count: ${failedActivityQueries.length} and queries: ${JSON.stringify( failedActivityQueries )}`, 'warn', NAME );
                }
                callback( null, result );
            } )
            .catch( ( err ) => {
                if( err && err.customCode && err.customCode === "aggregate_empty" ) {
                    Y.log( `generateSchneiderKBVLogAnalysis: Aggregate result was empty `, 'info', NAME );
                    callback( null, [] );
                } else {
                    Y.log( `generateSchneiderKBVLogAnalysis: Error: ${err && err.stack || err} `, 'error', NAME );
                    callback( err );
                }
            } );
    }

    function generatePerformanceGroupReport( args ) {
        const
            {user, options, callback, originalParams} = args;

        delete options.limit;
        delete options.paging;

        let
            invoiceLogId = originalParams.invoiceLogId;
        //quarter = originalParams.quarter,
        //from,
        //to;

        if( !invoiceLogId ) {
            Y.log( `generatePerformanceGroupReport: Insufficient params. returning `, 'info', NAME );
            callback( "insufficient parameters" );
            return;
        }

        //from = moment.utc(quarter.year,"YYYY").quarter(quarter.quarter).toISOString();
        //to = moment.utc(quarter.year,"YYYY").quarter(quarter.quarter).endOf( 'quarter' ).toISOString();

        function getAgeGroupFromAge( scheinDateStr, dobStr ) {
            let dobObj = moment( dobStr, "DD.MM.YYYY" );
            let age = moment( scheinDateStr ).diff( dobObj, "years" ); //patient is still alive when the schein is created so no need to care about date of death
            let matchedRange;

            const groupRange = [
                {start: 0, end: 0.9, groupName: "unter 1 Jahr"},
                {start: 1, end: 3, groupName: "1 - 3 Jahre"},
                {start: 4, end: 7, groupName: "4 - 7 Jahre"},
                {start: 8, end: 11, groupName: "8 - 11 Jahre"},
                {start: 12, end: 14, groupName: "12 - 14 Jahre"},
                {start: 15, end: 29, groupName: "15 - 29 Jahre"},
                {start: 30, end: 39, groupName: "30 - 39 Jahre"},
                {start: 40, end: 49, groupName: "40 - 49 Jahre"},
                {start: 50, end: 59, groupName: "50 - 59 Jahre"},
                {start: 60, end: 69, groupName: "60 - 69 Jahre"},
                {start: 70, end: 99999, groupName: "über 70 Jahre"}
            ];

            for( let index = 0; index < groupRange.length; index++ ) {
                if( (groupRange[index].start <= age) && (age <= groupRange[index].end) ) {
                    matchedRange = groupRange[index].groupName;
                    break;
                }
            }
            return matchedRange;
        }

        function aggregateReportData( next ) {
            Y.log( 'Start aggregating quarterly report data...', 'info', NAME );

            return Y.doccirrus.mongodb.runDb( {
                action: 'aggregate',
                pipeline: [
                    {$match: {"caseFolderType": "PUBLIC", "type": "schein", 'invoiceLogId': invoiceLogId}},
                    {
                        $project: {
                            tms: "$data.treatments",
                            schein: "$data._id",
                            scheinType: "$data.scheinType",
                            scheinSubgroup: "$data.scheinSubgroup",
                            scheinDate: "$data.timestamp",
                            dob: "$data.patient.kbvDob",
                            ikind: "$data.patient.insuranceStatus.insuranceKind",
                            gender: "$data.patient.gender"
                        }
                    },
                    {$unwind: "$tms"},
                    {
                        $match: {
                            'tms.price': {$exists: true},
                            'tms.unit': {$exists: true},
                            'schein': {$exists: true},
                            'scheinType': {$exists: true},
                            'scheinSubgroup': {$exists: true},
                            'scheinDate': {$exists: true},
                            'dob': {$exists: true},
                            'gender': {$exists: true}
                        }
                    },
                    {
                        $group: {
                            _id: "$schein",
                            points: {$sum: "$tms.price"},
                            scheinType: {$first: "$scheinType"},
                            scheinSubgroup: {$first: "$scheinSubgroup"},
                            scheinDate: {$first: "$scheinDate"},
                            dob: {$first: "$dob"},
                            ikind: {$first: "$ikind"},
                            gender: {$first: "$gender"}
                        }
                    }
                ],
                model: 'invoiceentry',
                options: {options, noRetryOnFailure : true},
                user: user
            }, next );
        }

        function groupTotals( data, next ) {
            data.grouped = [
                data.result.reduce( function( red, item ) {
                    var key = 'Gesamtsumme';
                    if( !red[key] ) {
                        red[key] = {pts: item.points, cnt: 1};
                    } else {
                        red[key].pts += item.points;
                        red[key].cnt += 1;
                    }
                    return red;
                }, {} )];

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByAge( data, next ) {
            data.grouped = data.grouped.concat( [
                data.result.reduce( function( red, item ) {
                    let ageGrouprange = getAgeGroupFromAge( item.scheinDate, item.dob );

                    if( !red[ageGrouprange] ) {
                        red[ageGrouprange] = {pts: item.points, cnt: 1};
                    } else {
                        red[ageGrouprange].pts += item.points;
                        red[ageGrouprange].cnt += 1;
                    }
                    return red;
                }, {} )] );

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByGender( data, next ) {
            data.grouped = data.grouped.concat( [
                data.result.reduce( function( red, item ) {
                    let gender = '';

                    if( item.gender === 'FEMALE' ) {
                        gender = 'Weiblich';
                    } else if( item.gender === 'MALE' ) {
                        gender = 'Männlich';
                    } else if( item.gender === 'UNKNOWN' ) {
                        gender = 'Unbekannt';
                    } else if( item.gender === 'UNDEFINED' ) {
                        gender = 'Unbestimmt';
                    }

                    if( !red[gender] ) {
                        red[gender] = {pts: item.points, cnt: 1};
                    } else {
                        red[gender].pts += item.points;
                        red[gender].cnt += 1;
                    }
                    return red;
                }, {} )] );

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByInsuranceKind( data, next ) {
            const IKIND_TRANSLAT_MAP = Object.freeze( {
                1: 'Mitglied',
                3: 'Familienversicherter',
                5: 'Rentner',
                0: ''
            } );

            data.grouped = data.grouped.concat( data.result.reduce( function( red, item ) {
                if( !item.ikind[0] ) {
                    item.ikind[0] = 0;
                }

                if( !red[IKIND_TRANSLAT_MAP[item.ikind[0]]] ) {
                    red[IKIND_TRANSLAT_MAP[item.ikind[0]]] = {pts: item.points, cnt: 1};
                } else {
                    red[IKIND_TRANSLAT_MAP[item.ikind[0]]].pts += item.points;
                    red[IKIND_TRANSLAT_MAP[item.ikind[0]]].cnt += 1;
                }
                return red;
            }, {} ) );

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByInsuranceType( data, next ) {
            let noOfActivitiesQueried = 0;

            if( data.result.length ) {
                data.result.forEach( ( item ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: {
                            _id: item._id,
                            scheinType: item.scheinType,
                            scheinSubgroup: item.scheinSubgroup
                        },
                        options: {
                            select: {
                                content: 1,
                                userContent: 1
                            }
                        }
                    } )
                        .then( ( actArr ) => {
                            noOfActivitiesQueried++;

                            if( actArr && actArr[0] ) {
                                if( actArr[0].userContent ) {
                                    item.scheinType = actArr[0].userContent;
                                } else {
                                    item.scheinType = actArr[0].content;
                                }
                            }

                            if( noOfActivitiesQueried === data.result.length ) {
                                startGrouping();
                            }
                        } )
                        .catch( ( err ) => {
                            noOfActivitiesQueried++;
                            Y.log( `generatePerformanceGroupReport/groupByInsuranceType: Error querying activity. Query: ${ JSON.stringify( {
                                query: {
                                    _id: item._id,
                                    scheinType: item.scheinType,
                                    scheinSubgroup: item.scheinSubgroup
                                }
                            } ) } Error: ${err && err.stack || err} `, 'warn', NAME );
                            if( noOfActivitiesQueried === data.result.length ) {
                                startGrouping();
                            }
                        } );
                } );
            } else {
                startGrouping();
            }

            function startGrouping() {
                data.grouped = data.grouped.concat( data.result.reduce( function( red, item ) {
                    if( !red[item.scheinType] ) {
                        red[item.scheinType] = {pts: item.points, cnt: 1};
                    } else {
                        red[item.scheinType].pts += item.points;
                        red[item.scheinType].cnt += 1;
                    }
                    return red;
                }, {} ) );

                next( null, data );
            }
        }

        function transformData( data, next ) {

            let
                analysis = [];

            data.grouped.forEach( list => Object.keys( list ).forEach( k => {
                if( k === "line_break" ) {
                    analysis.push( {
                        k: "",
                        cnt: "",
                        pts: "",
                        cntDivLen: "",
                        ptsDivCnt: ""
                    } );
                } else if( k ) {
                    analysis.push( {
                        k: k,
                        cnt: list[k].cnt,
                        pts: (list[k].pts).toFixed( 2 ),
                        cntDivLen: ((list[k].cnt / data.result.length) * 100).toFixed( 2 ),
                        ptsDivCnt: (list[k].pts / list[k].cnt).toFixed( 2 )
                    } );
                }
            } ) );

            next( null, analysis );
        }

        async.waterfall( [
            ( next ) => aggregateReportData( next ),
            ( data, next ) => groupTotals( data, next ),
            ( data, next ) => groupByInsuranceKind( data, next ),
            ( data, next ) => groupByGender( data, next ),
            ( data, next ) => groupByAge( data, next ),
            ( data, next ) => groupByInsuranceType( data, next ),
            ( data, next ) => transformData( data, next )
        ], ( err, data ) => {

            if( err ) {
                Y.log( `generatePerformanceGroupReport: Error: ${err && err.stack || err} `, 'error', NAME );
                return callback( err );
            }

            callback( null, data );

        } );
    }

    function generatePerformanceReportByEmployees( args ) {
        const
            {user, options, callback, originalParams} = args;

        delete options.limit;
        delete options.paging;

        let
            invoiceLogId = originalParams.invoiceLogId;

        if( !invoiceLogId ) {
            Y.log( `generatePerformanceReportByEmployees: Insufficient params. returning `, 'info', NAME );
            callback( "insufficient parameters" );
            return;
        }

        function getAgeGroupFromAge( scheinDateStr, dobStr ) {
            let dobObj = moment( dobStr, "DD.MM.YYYY" );
            let age = moment( scheinDateStr ).diff( dobObj, "years" ); //patient is still alive when the schein is created so no need to care about date of death
            let matchedRange;

            const groupRange = [
                {start: 0, end: 0.9, groupName: "unter 1 Jahr"},
                {start: 1, end: 3, groupName: "1 - 3 Jahre"},
                {start: 4, end: 7, groupName: "4 - 7 Jahre"},
                {start: 8, end: 11, groupName: "8 - 11 Jahre"},
                {start: 12, end: 14, groupName: "12 - 14 Jahre"},
                {start: 15, end: 29, groupName: "15 - 29 Jahre"},
                {start: 30, end: 39, groupName: "30 - 39 Jahre"},
                {start: 40, end: 49, groupName: "40 - 49 Jahre"},
                {start: 50, end: 59, groupName: "50 - 59 Jahre"},
                {start: 60, end: 69, groupName: "60 - 69 Jahre"},
                {start: 70, end: 99999, groupName: "über 70 Jahre"}
            ];

            for( let index = 0; index < groupRange.length; index++ ) {
                if( (groupRange[index].start <= age) && (age <= groupRange[index].end) ) {
                    matchedRange = groupRange[index].groupName;
                    break;
                }
            }
            return matchedRange;
        }

        function aggregateReportData( next ) {
            Y.log( 'Start aggregating quarterly report data...', 'info', NAME );

            return Y.doccirrus.mongodb.runDb( {
                action: 'aggregate',
                pipeline: [
                    {$match: {"caseFolderType": "PUBLIC", "type": "schein", 'invoiceLogId': invoiceLogId}},
                    {
                        $project: {
                            tms: "$data.treatments",
                            schein: "$data._id",
                            scheinType: "$data.scheinType",
                            scheinSubgroup: "$data.scheinSubgroup",
                            scheinDate: "$data.timestamp",
                            dob: "$data.patient.kbvDob",
                            ikind: "$data.patient.insuranceStatus.insuranceKind",
                            gender: "$data.patient.gender",
                            employeeId: "$data.employeeId"
                        }
                    },
                    {$unwind: "$tms"},
                    {
                        $match: {
                            'tms.price': {$exists: true},
                            'tms.unit': {$exists: true},
                            'schein': {$exists: true},
                            'scheinType': {$exists: true},
                            'scheinSubgroup': {$exists: true},
                            'scheinDate': {$exists: true},
                            'dob': {$exists: true},
                            'gender': {$exists: true}
                        }
                    },
                    {
                        $group: {
                            _id: {employeeId: "$employeeId", scheinId: "$schein"},
                            points: {$sum: "$tms.price"},
                            scheinType: {$first: "$scheinType"},
                            scheinSubgroup: {$first: "$scheinSubgroup"},
                            scheinDate: {$first: "$scheinDate"},
                            dob: {$first: "$dob"},
                            ikind: {$first: "$ikind"},
                            gender: {$first: "$gender"}
                        }
                    },
                    {
                        $group: {
                            _id: "$_id.employeeId",
                            count: {$sum: 1},
                            schein: {
                                $push: {
                                    schein: "$_id.scheinId",
                                    gender: "$gender",
                                    points: "$points",
                                    scheinType: "$scheinType",
                                    scheinSubgroup: "$scheinSubgroup",
                                    scheinDate: "$scheinDate",
                                    dob: "$dob",
                                    ikind: "$ikind"

                                }
                            }
                        }
                    }
                ],
                model: 'invoiceentry',
                options: {options, noRetryOnFailure : true},
                user: user
            }, next );
        }

        function mapEmployeeIdToEmployeeName( data, next ) {
            let noOfActivitiesQueried = 0;
            if( data.result.length ) {
                data.result.map( ( item ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        query: {
                            _id: item._id
                        },
                        options: {
                            select: {
                                firstname: 1,
                                lastname: 1
                            }
                        }
                    } )
                        .then( ( actArr ) => {
                            noOfActivitiesQueried++;
                            if( actArr && actArr[0] ) {
                                item.employeeName = actArr[0].lastname + ', ' + actArr[0].firstname;
                            }
                            if( noOfActivitiesQueried === data.result.length ) {
                                next( null, data );
                            }
                        } )
                        .catch( ( err ) => {
                            noOfActivitiesQueried++;
                            Y.log( `generatePerformanceReportByEmployees/mapEmployeeIdToEmployeeName: Error querying activity. Query: ${ JSON.stringify( {
                                query: {
                                    _id: item._id
                                }
                            } ) } Error: ${err && err.stack || err} `, 'warn', NAME );
                            if( noOfActivitiesQueried === data.result.length ) {
                                next( null, data );
                            }
                        } );

                } );
            } else {
                next( null, data );
            }
        }

        function groupTotals( data, next ) {
            data.grouped = [];
            data.result.forEach( function( item ) {
                let key = 'Gesamtsumme', red = {};
                item.schein.forEach( scheinObj => {
                    if( !red[key] ) {
                        red[key] = {pts: scheinObj.points, cnt: 1, doctorName: item.employeeName};
                    } else {
                        red[key].pts += scheinObj.points;
                        red[key].cnt += 1;
                    }
                } );
                data.grouped.push( red );
            } );

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByAge( data, next ) {
            data.result.forEach( function( item ) {
                let red = {};
                item.schein.forEach( scheinObj => {
                    let ageGrouprange = getAgeGroupFromAge( scheinObj.scheinDate, scheinObj.dob );
                    if( !red[ageGrouprange] ) {
                        red[ageGrouprange] = {pts: scheinObj.points, cnt: 1, doctorName: item.employeeName};
                    } else {
                        red[ageGrouprange].pts += scheinObj.points;
                        red[ageGrouprange].cnt += 1;
                    }
                } );
                data.grouped.push( red );
            } );

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByGender( data, next ) {
            data.result.forEach( function( item ) {
                let red = {};

                item.schein.forEach( scheinObj => {
                    let gender = '';

                    if( scheinObj.gender === 'FEMALE' ) {
                        gender = 'Weiblich';
                    } else if( scheinObj.gender === 'MALE' ) {
                        gender = 'Männlich';
                    } else if( scheinObj.gender === 'UNKNOWN' ) {
                        gender = 'Unbekannt';
                    } else if( scheinObj.gender === 'UNDEFINED' ) {
                        gender = 'Unbestimmt';
                    }

                    if( !red[gender] ) {
                        red[gender] = {pts: scheinObj.points, cnt: 1, doctorName: item.employeeName};
                    } else {
                        red[gender].pts += scheinObj.points;
                        red[gender].cnt += 1;
                    }
                } );
                data.grouped.push( red );
            } );

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByInsuranceKind( data, next ) {
            const IKIND_TRANSLAT_MAP = Object.freeze( {
                1: 'Mitglied',
                3: 'Familienversicherter',
                5: 'Rentner',
                0: ''
            } );

            data.result.forEach( function( item ) {
                let red = {};

                item.schein.forEach( scheinObj => {
                    if( !scheinObj.ikind[0] ) {
                        scheinObj.ikind[0] = 0;
                    }

                    if( !red[IKIND_TRANSLAT_MAP[scheinObj.ikind[0]]] ) {
                        red[IKIND_TRANSLAT_MAP[scheinObj.ikind[0]]] = {
                            pts: scheinObj.points,
                            cnt: 1,
                            doctorName: item.employeeName
                        };
                    } else {
                        red[IKIND_TRANSLAT_MAP[scheinObj.ikind[0]]].pts += scheinObj.points;
                        red[IKIND_TRANSLAT_MAP[scheinObj.ikind[0]]].cnt += 1;
                    }
                } );

                data.grouped.push( red );
            } );

            if( data && data.result.length ) {
                data.grouped.push( {
                    "line_break": true
                } );
            }

            next( null, data );
        }

        function groupByInsuranceType( data, next ) {
            let noOfScheinQueried = 0, count = 0;

            if( data.result.length ) {
                data.result.forEach( ( item ) => {
                    count = count + item.count;
                    item.schein.forEach( scheinObj => {

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            query: {
                                _id: scheinObj.schein,
                                scheinType: scheinObj.scheinType,
                                scheinSubgroup: scheinObj.scheinSubgroup
                            },
                            options: {
                                select: {
                                    content: 1,
                                    userContent: 1
                                }
                            }
                        } )
                            .then( ( actArr ) => {
                                noOfScheinQueried++;
                                if( actArr && actArr[0] ) {
                                    if( actArr[0].userContent ) {
                                        scheinObj.scheinType = actArr[0].userContent;
                                    } else {
                                        scheinObj.scheinType = actArr[0].content;
                                    }
                                }

                                if( noOfScheinQueried === count ) {
                                    startGrouping();
                                }
                            } )
                            .catch( ( err ) => {
                                noOfScheinQueried++;
                                Y.log( `generatePerformanceReportByEmployees/groupByInsuranceType: Error querying activity. Query: ${ JSON.stringify( {
                                    query: {
                                        _id: scheinObj.schein,
                                        scheinType: scheinObj.scheinType,
                                        scheinSubgroup: scheinObj.scheinSubgroup
                                    }
                                } ) } Error: ${err && err.stack || err} `, 'warn', NAME );
                                if( noOfScheinQueried === count ) {
                                    startGrouping();
                                }
                            } );

                    } );
                } );
            } else {
                startGrouping();
            }

            function startGrouping() {
                data.result.forEach( function( item ) {
                    let red = {};
                    item.schein.forEach( scheinObj => {
                        if( !red[scheinObj.scheinType] ) {
                            red[scheinObj.scheinType] = {pts: scheinObj.points, cnt: 1, doctorName: item.employeeName};
                        } else {
                            red[scheinObj.scheinType].pts += scheinObj.points;
                            red[scheinObj.scheinType].cnt += 1;
                        }
                    } );
                    data.grouped.push( red );
                } );
                next( null, data );
            }
        }

        function transformData( data, next ) {

            let analysis = [], totalcount = 0;
            data.result.forEach( item => {
                totalcount = totalcount + item.count;
            });

            data.grouped.forEach( list => Object.keys( list ).forEach( k => {
                if( k === "line_break" ) {
                    analysis.push( {
                        k: "",
                        cnt: "",
                        pts: "",
                        cntDivLen: "",
                        ptsDivCnt: "",
                        doctorName: ""
                    } );
                } else if( k ) {
                    analysis.push( {
                        k: k,
                        cnt: list[k].cnt,
                        pts: (list[k].pts).toFixed( 2 ),
                        cntDivLen: ((list[k].cnt / totalcount) * 100).toFixed( 2 ),
                        ptsDivCnt: (list[k].pts / list[k].cnt).toFixed( 2 ),
                        doctorName: list[k].doctorName
                    } );
                }
            } ) );

            next( null, analysis );
        }

        async.waterfall( [
            ( next ) => aggregateReportData( next ),
            ( data, next ) => mapEmployeeIdToEmployeeName( data, next ),
            ( data, next ) => groupTotals( data, next ),
            ( data, next ) => groupByInsuranceKind( data, next ),
            ( data, next ) => groupByGender( data, next ),
            ( data, next ) => groupByAge( data, next ),
            ( data, next ) => groupByInsuranceType( data, next ),
            ( data, next ) => transformData( data, next )
        ], ( err, data ) => {

            if( err ) {
                Y.log( `generatePerformanceReportByEmployees: Error: ${err && err.stack || err} `, 'error', NAME );
                return callback( err );
            }

            callback( null, data );

        } );
    }

    function generatePVSPerformanceReport( args ) {
        const
            {user, options, callback, originalParams} = args;

        delete options.limit;
        delete options.paging;

        let
            invoiceLogId = originalParams.invoiceLogId;

        if( !invoiceLogId ) {
            Y.log( `generatePVSPerformanceReport: Insufficient params. returning `, 'info', NAME );
            return callback( "insufficient parameters" );
        }

        function aggregationOfTreatmentCost( waterfallCb ) {

            return Y.doccirrus.mongodb.runDb( {
                action: 'aggregate',
                pipeline: [
                    {$match: {"type": "schein", 'invoiceLogId': invoiceLogId}},
                    {
                        $project: {
                            patient: '$data.patient',
                            tms: "$data.treatments"
                        }
                    },
                    {$unwind: "$tms"},
                    {
                        $match: {
                            'patient.kbvDob': {$exists: true},
                            'patient._id': {$exists: true},
                            'tms.costType': {$exists: true},
                            'tms.timestamp': {$exists: true},
                            'tms._id': {$exists: true},
                            'tms.price': {$exists: true},
                            'tms.unit': {$exists: true}
                        }
                    },
                    {
                        $group: {
                            _id: {patientId: "$patient._id", costType: "$tms.costType"},
                            points: {$sum: "$tms.price"},
                            priceWithVat: {$sum: {$add: ["$tms.price", "$tms.vatAmount"]}},
                            patient: {$first: "$patient"}
                        }
                    },
                    {
                        $group: {
                            _id: {patientId: "$_id.patientId"},
                            count: {$sum: 1},
                            tms: {
                                $push: {
                                    costType: "$_id.costType",
                                    price: "$points",
                                    priceWithVat: "$priceWithVat"
                                }
                            },
                            patient: {$first: "$patient"}
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            patientId: "$_id.patientId",
                            count: "$count",
                            costTypeArr: "$tms",
                            patientNo: "$patient.patientNo",
                            lastname: "$patient.lastname",
                            firstname: "$patient.firstname",
                            dob: "$patient.kbvDob",
                            insuranceStatus: {
                                "$arrayElemAt": [
                                    {
                                        $filter: {
                                            input: '$patient.insuranceStatus',
                                            as: 'insurance',
                                            cond: {$eq: ['$$insurance.type', 'PRIVATE']}
                                        }
                                    }, 0]
                            },
                            addresses: {
                                $filter: {
                                    input: '$patient.addresses',
                                    as: 'address',
                                    cond: {$in: ['$$address.kind', ['BILLING', 'OFFICIAL', 'POSTBOX']]}
                                }
                            }
                        }
                    }
                ],
                model: 'invoiceentry',
                options: {...options, noRetryOnFailure : true},
                user: user
            }, waterfallCb );
        }

        function transformPVSData( data, waterfallCb ) {
            let dataArr = [];

            if( data && data.result && data.result.length ) {

                data.result.forEach( item => {
                    let addressObj = {};

                    let treatmentsObj = item.costTypeArr.reduce( ( finalObj, tmsObj ) => {

                        finalObj.totalPrice += tmsObj.price;
                        finalObj.priceWithVat += tmsObj.priceWithVat;

                        switch( tmsObj.costType ) {
                            case "":
                                finalObj.treatmentPrice += tmsObj.price;
                                break;
                            default:
                                finalObj.others += tmsObj.price;
                                break;
                        }

                        return finalObj;

                    }, {treatmentPrice: 0, others: 0, totalPrice: 0, priceWithVat: 0} );

                    if( item.addresses && item.addresses.length ) {

                        let address = item.addresses.filter( addressObj => {
                            return addressObj.kind === 'BILLING';
                        } )[0];

                        if( !address ) {
                            address = item.addresses[0];
                        }

                        addressObj.receiver = address.receiver ? address.receiver : `${item.lastname}, ${item.firstname}` ;

                        if( address.kind === 'POSTBOX' ){
                            addressObj.line1 = address.postbox;
                        } else {
                            addressObj.line1 = `${address.street ? address.street : ''} ${address.houseno ? address.houseno : ''}` ;
                        }

                        addressObj.line2 = `${address.zip ? address.zip : ''} ${address.city ? address.city : ''}`;
                        addressObj.addon = address.addon;
                        addressObj.country = address.country;
                    }

                    dataArr.push( {
                        patientNo: item.patientNo,
                        patientName: `${item.lastname}, ${item.firstname}`,
                        dob: item.dob,
                        insuranceName: item.insuranceStatus && item.insuranceStatus.insuranceName ? item.insuranceStatus.insuranceName : '',
                        address: addressObj && Object.keys( addressObj ).length ? addressObj : '',
                        totalPrice: treatmentsObj.totalPrice.toFixed( 2 ),
                        priceWithVat: treatmentsObj.priceWithVat.toFixed( 2 ),
                        treatmentPrice: treatmentsObj.treatmentPrice.toFixed( 2 ),
                        others: treatmentsObj.others.toFixed( 2 )
                    } );

                } );

                waterfallCb( null, dataArr );
            } else {
                waterfallCb( null, dataArr );
            }

        }

        async.waterfall( [
            ( next ) => {
                aggregationOfTreatmentCost( next );
            },
            ( data, next ) => {
                transformPVSData( data, next );
            }
        ], ( err, data ) => {
            if( err ) {
                Y.log( `generatePVSPerformanceReport: Error: ${err && err.stack || err} `, 'error', NAME );
                return callback( err );
            }
            callback( null, data );
        } );
    }

    function generatePVSLogAnalysis( args ) {
        const
            {user, options, callback, originalParams} = args;

        delete options.limit;
        delete options.paging;

        let
            invoiceLogId = originalParams.invoiceLogId,
            result = [],
            aggregatedDataArr;

        if( !invoiceLogId ) {
            Y.log( `generatePVSLogAnalysis: Insufficient params. returning `, 'info', NAME );
            callback( "insufficient parameters" );
            return;
        }

        Y.log( `Starting aggregating quarterly report data for invoiceLogId: ${invoiceLogId} `, 'info', NAME );

        Y.doccirrus.mongodb.runDb( {
            action: 'aggregate',
            pipeline: [
                {$match: {"type": "schein", 'invoiceLogId': invoiceLogId}},
                {
                    $project: {
                        tms: '$data.treatments',
                        schein: '$data._id',
                        employees: '$data.patient.assignedEmployees'
                    }
                },
                {$unwind: '$tms'},
                {
                    $match: {
                        'tms.price': {$exists: true},
                        'tms.unit': {$exists: true},
                        'tms.timestamp': {$exists: true},
                        'tms.employeeId': {$exists: true}
                    }
                },
                {
                    $project: {
                        code: '$tms.code',
                        price: '$tms.price',
                        employeeId: '$tms.employeeId',
                        activityId: '$tms._id',
                        employeeArr: '$employees',
                        content: '$tms.content',
                        _id: 0
                    }
                },
                {
                    $group: {
                        _id: {'code': '$code', 'employeeId': '$employeeId'},
                        N: {$sum: 1},
                        price: {$first: '$price'},
                        employeeArr: {$first: '$employeeArr'},
                        content: {$first: '$content'}
                    }
                },
                {
                    $project: {
                        code: '$_id.code',
                        employeeId: '$_id.employeeId',
                        N: 1,
                        price: 1,
                        _id: 0,
                        content: 1,
                        employees: {
                            "$arrayElemAt": [
                                {
                                    $filter: {
                                        input: '$employeeArr',
                                        as: 'employee',
                                        cond: {$eq: ['$$employee._id', '$_id.employeeId']}
                                    }
                                }, 0]
                        }
                    }
                },
                {$sort: {code: 1}}
            ],
            model: 'invoiceentry',
            options: {options, noRetryOnFailure : true},
            user: user
        } )

            .then( ( aggDataArr ) => {
                if( aggDataArr && aggDataArr.result && aggDataArr.result.length ) {
                    aggregatedDataArr = aggDataArr.result;
                } else {
                    throw {customCode: "aggregate_empty"};
                }

                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'invoiceentry',
                    action: 'count',
                    query: {
                        type: 'schein',
                        'data.treatments': {$exists: true},
                        'invoiceLogId': invoiceLogId,
                        'data.timestamp': {$exists: true}
                    }
                } );
            } )

            .then( ( totalScheinCount ) => {
                Y.log( `generatePVSLogAnalysis: Total schein count: ${totalScheinCount} `, 'info', NAME );
                let promiseArr = [];
                aggregatedDataArr.forEach( ( aggregatedData ) => {
                    promiseArr.push( Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            model: 'catalog',
                            query: {
                                catalog: /^DC-GOÄ/,
                                seq: aggregatedData.code
                            },
                            options: {
                                sort: {_id: -1},
                                limit: 1,
                                select: {
                                    seq: 1,
                                    chapter: 1
                                }
                            }
                        } )
                            .then( ( catalogArr ) => {
                                let lg;

                                if( catalogArr && catalogArr[0] ) {
                                   lg = catalogArr[0].chapter;
                                }

                                result.push( {
                                    lg: `${ lg ? lg : '' }`,
                                    code: aggregatedData.code,
                                    content: aggregatedData.content,
                                    codeGroupCount: aggregatedData.N,
                                    pricePerTreatment: (aggregatedData.price).toFixed( 2 ),
                                    groupPrice: (aggregatedData.N * aggregatedData.price).toFixed( 2 ),
                                    doctorName: aggregatedData.employees ? `${ aggregatedData.employees.lastname ? aggregatedData.employees.lastname : '' }, ${ aggregatedData.employees.firstname ? aggregatedData.employees.firstname : '' }` : '-'
                                } );
                            } )
                    );
                } );

                return Promise.all( promiseArr );
            } )
            .then( () => {
                callback( null, result );
            } )
            .catch( ( err ) => {
                if( err && err.customCode && err.customCode === "aggregate_empty" ) {
                    Y.log( `generatePVSLogAnalysis: Aggregate result was empty `, 'info', NAME );
                    return callback( null, [] );
                }
                Y.log( `generatePVSLogAnalysis: Error: ${err && err.stack || err} `, 'error', NAME );
                callback( err );
            } );
    }

    /***  @param args
     *  @return {Promise<*>}
     */


    /**
     * Class case Schemas -- gathers all the schemas that the case Schema works with.
     */
    /**
     * @class rlv
     * @namespace doccirrus.api
     */
    Y.namespace( 'doccirrus.insight2' ).aggregations = {
        name: NAME,

        //  aggregations to show reports
        getDataByConfigId,
        getAnalysis,
        getDataByAggregation,
        getInsightConfig,

        //  used to generate a special report for labdata results, pathological items requiring special attention
        getLabDataOverview,
        getLabDataTablePivot,        //  TODO: check if still in use, remove if not


        //  special reports
        generateSchneiderKBVLogAnalysis,
        generatePerformanceGroupReport,
        generatePerformanceReportByEmployees,           //  moved
        generatePVSPerformanceReport,                   //  moved
        generatePVSLogAnalysis                          //  moved
    };

}, '0.0.1', {
    requires: [
        'dcforms-schema-InCase-T',
        'reporting-schema',
        'AnalysisGen',
        'analysisUtils',
        'reporting-cache',
        'insight2-migrationhelper',
        'syncAuxManager'
    ]
} );