const
    { formatPromiseResult } = require( 'dc-core' ).utils,
    moment = require( 'moment' ),
    _ = require( 'lodash' ),
    { MongoClient, ObjectId } = require( 'mongodb' ),
    util = require('util'),
    connect = util.promisify( MongoClient.connect ),
    { getDBUri } = require( 'dc-core' ).utils;


const
    SCHEIN_TYPES = ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN'],
    PERIOD_AREAS = ['apk', 'schein', 'period'],
    DATE_TYPES = [ //staticaly build from rul engin echema
        "timestamp",
        "patientid.insurancestatus.cardswipe",
        "patientid.dateofdeath",
        "patientid.dateofinactive",
        "patientId.dob",
        "fk5025",
        "fk5026",
        "fk5034"
    ],
    DT_FORMAT = 'DD.MM.YYYY HH:mm:ss',
    COLLECTION_DATA_TYPES = ['patient', 'casefolder', 'task'];

let threadId,
    tenants = {};

/**
 * @method recoverKey
 * @private
 *
 * rename keys in JSON to recover . nad S symbols forbidden mongo
 *
 * @param {Object} obj
 *
 * @returns {Object} - same object with renamed keys
 */
function recoverKey( obj ) {
    if( typeof obj !== 'object' || !obj ) {
        return obj;
    }
    Object.keys( obj ).forEach( function( k ) {
        let ov = obj[k];
        if( /\\\\\$|\\\\\-/g.test( k ) ) {
            let newK = k.replace( /\\\\\$/g, '$' ).replace( /\\\\\-/g, '.' );
            obj[newK] = ov;
            delete obj[k];
        }
        recoverKey( ov );
    } );
    return obj;
}

/**
 * @method ensureIsArray
 * @private
 *
 * if argument of function is not array return it as array
 *
 * @param {Any} criterion
 *
 * @returns {Array}
 */
function ensureIsArray( criterion ) {
    if( !Array.isArray( criterion ) ) {
        return [criterion];
    }
    return criterion;
}

/**
 * @method arrayIntersections
 * @private
 *
 * check if two arrays have same elements
 *
 * @param {Array|Any} val
 * @param {Array|Any} criterion
 *
 * @returns {Boolean} - true if arrays have same elements
 */
function arrayIntersections( val, criterion ) {
    criterion = ensureIsArray( criterion );
    val = ensureIsArray( val );
    return Boolean( _.intersection( val, criterion ).length );
}

/**
 * @method arrayIntersectionsLength
 * @private
 *
 * get length of same elements in arguments
 * @param {Array|Any} val
 * @param {Array|Any} criterion
 *
 * @returns {Number} - length of intersections
 */
function arrayIntersectionsLength( val, criterion ) {
    criterion = ensureIsArray( criterion );
    val = ensureIsArray( val );
    return _.intersection( val, criterion ).length;
}

// implement mongo operators using javascript
const OPERATORS = {
    $exists: function( val, criterion ) {
        let exists = Boolean( 0 === val || val );
        return criterion ? exists : !exists;
    },
    $eq: function( val, criterion ) {
        return val === criterion;
    },
    $ne: function( val, criterion ) {
        return val !== criterion;
    },
    $not: function( val, criterion ) {
        return val !== criterion;
    },
    $regex: function( val, criterion, options ) {
        let regexp = new RegExp(criterion, (options || '').trim() ),
            match = val && 'function' === typeof val.match && val.match( regexp );
        return match && (match[0] === val || -1 !== val.indexOf(match[0]));
    },
    $in: function( val, criterion ) {
        let matches = arrayIntersectionsLength( val, criterion );
        return matches > 0;
    },
    $nin: function( val, criterion ) {
        let matches = arrayIntersectionsLength( val, criterion );
        return matches === 0;
    },
    $all: function( val, criterion ) {
        let matches = arrayIntersectionsLength( val, criterion );
        return matches === ( Array.isArray( criterion ) ? criterion.length : 1 );
    },
    $gt: function( val, criterion ) {
        return val > criterion;
    },
    $gte: function( val, criterion ) {
        return val >= criterion;
    },
    $lt: function( val, criterion ) {
        return val < criterion;
    },
    $lte: function( val, criterion ) {
        return val <= criterion;
    }
};

/**
 * @method log
 * @public
 *
 * independent logger, format of output is close to used in insuite, but instead of worker id can shown own id;
 * NOTE: log level is not filtered by insuite so use it carefully
 *
 * @param {String} message
 * @param {String} type     log level (debug|info|warn|error), default info
 *
 */
function log( message, type = 'info' ) {
    const
        dateTimeStr = moment().format( 'HH:mm:ss:SSS' );
    switch( type ) {
        case 'info':
        case 'debug':
            console.log( `${dateTimeStr} ${threadId}: (wt): ${message}` ); //eslint-disable-line no-console
            break;
        case 'error':
            console.error( `${dateTimeStr} ${threadId}: (wt): ${message}` ); //eslint-disable-line no-console
            break;
        case 'warn':
            console.warn( `${dateTimeStr} ${threadId}: (wt): ${message}` ); //eslint-disable-line no-console
            break;
    }
}

/**
 * @method validateCount
 * @private
 *
 * compare received count with given criteria
 *  e.g. { $gt: 5 }
 *
 * @param {Object} $count
 * @param {Number} count
 *
 * @returns {Boolean} - result of criteria evaluation
 */
function validateCount( $count, count ) {
    let left, right;

    if( _.isFinite( $count.$eq ) ) {
        return $count.$eq === count;
    }
    if( _.isFinite( $count.$gt ) ) {
        left = function() {
            return $count.$gt < count;
        };
    } else if( _.isFinite( $count.$gte ) ) {
        left = function() {
            return $count.$gte <= count;
        };
    }
    if( _.isFinite( $count.$lt ) ) {
        right = function() {
            return $count.$lt > count;
        };
    } else if( _.isFinite( $count.$lte ) ) {
        right = function() {
            return $count.$lte >= count;
        };
    }
    return (left ? left() : true) && (right ? right() : true);
}

/**
 * @method getObject
 * @private
 *
 * obtain value from hierarchical path by path
 *  e.g. "patientId.firstname"
 *
 * @param {String|Array} path - keys in object joined by dot or just a single key
 * @param {Object} obj JS object so get value from
 *
 * @returns {Object|Any} - value found by path
 */
function getObject( path, obj ) {
    let parts = (path || '').split( '.' );

    if ( null === parts || !parts.length ) {
        return null;
    }

    let p;
    while( obj && parts.length ) {
        p = parts.shift();
        if( obj[p] === undefined ) {
            obj[p] = {};
        }
        obj = obj[p];
    }
    return obj;
}

/**
 * @method getFilteredByRangeActivities
 * @private
 *
 * filter array of activities using specific from-to dates and comparing with activity timestamp, and
 *  extend it by continuous diagnosis
 *
 * @param {Array<Object>} affectedActivities - array contains activities on which rules are evaluated
 * @param {String} area - referenceArea entry|apk|schein|period
 * @param {Object} context - rule engine context (mutable object that passed through rule engine process)
 *                           here from context range for area was get
 *
 * @returns {Array<Object>} - filtered by timestamp activities
 */
function getFilteredByRangeActivities( affectedActivities, area, context ) {
    let
        filteredActivities = affectedActivities.filter( el => {
            return context.areas[area].range.from <= el.timestamp && el.timestamp <= context.areas[area].range.to;
        } ),
        continuous = filteredActivities.reduce( (prev, cur) => [...new Set([...prev, ...(cur.continuousIcds || [])])], []);

    if( continuous.length ){
        filteredActivities = [
            ...filteredActivities,
            ...affectedActivities.filter( el => { return continuous.includes( el._id.toString() );  } ),
            ...(context.continuousActivities || []).filter( el => { return continuous.includes( el._id.toString() );  } )
        ];
        //resort with the added activities
        filteredActivities.sort( (a, b) => b.timestamp - a.timestamp );
    }

    return filteredActivities;
}

/**
 * @method findCaseFolders
 * @private
 *
 * get single casefolder data or if configured list of PUBLIC casefolders
 *
 * @param {String} tenant  - tenantId key for tenant related global data
 * @param {Object} tenants - object that contains cached slowly changed data per tenants and connection for tenant db
 * @param {Object} context - rule engine context
 *
 * @returns {undefined} - result is extending context by found casefolder data
 */
async function findCaseFolders( tenant, tenants, context ) {
    const db = tenants[ tenant ].db;

    let [err, casefolders] = await formatPromiseResult(
         db.collection( `${context.staticData.isISD?'mirror':''}casefolders` ).find( { patientId: context.patientId } ).project( {type: 1, additionalType: 1} ).sort( {_id: 1} ).toArray()
    );
    if( err ){
        log( `findCaseFolders: ${err.stack || err}`, 'error' );
        throw err;
    }

    if( !casefolders.length ){
        context.caseFolderId = null;
        context.caseFolders = [];
        context.caseTypes = [];
        return;
    }

    let contextCasefolder = context.caseFolderId || context.data.caseFolderId,
        singleCaseFolder = casefolders.find( el => el._id.toString() === contextCasefolder );

    if( !contextCasefolder ){
        context.caseFolderId = casefolders[0] && casefolders[0]._id && casefolders[0]._id.toString();
        context.caseFolders = [ context.caseFolderId ];
        context.caseTypes = [...new Set([ casefolders[0].type, casefolders[0].additionalType, 'ALLCASES' ].filter( Boolean ))];
        return;
    }

    if( singleCaseFolder ){
        context.caseFolders = [ context.caseFolderId ];
        context.caseTypes = [...new Set([ singleCaseFolder.type, singleCaseFolder.additionalType, 'ALLCASES' ].filter( Boolean ))];
    }

    // MOJ-14319
    if( !context.combineGKV || singleCaseFolder && !['PUBLIC', 'PUBLIC_A'].includes( singleCaseFolder.type ) ) {
        //no need to combine casefolders
        return;
    }

    let gkvCaseFolders = casefolders.filter( el => ['PUBLIC', 'PUBLIC_A'].includes( el.type ) ).map( el => el._id.toString() );
    context.caseFolderId = gkvCaseFolders[0];
    context.caseFolders = gkvCaseFolders;
    // MOJ-14319
    context.caseTypes = [ 'PUBLIC', 'PUBLIC_A', 'ALLCASES' ];
}


/**
 * @method getPeriodForRuleSet
 * @private
 *
 * calculate period start an end dates
 * from timestamp and ruleSet details
 *
 * @param {Object} ruleSet
 * @param {String} timestamp
 *
 * @returns {Object} {{moment} startDate , {moment} endDate }
 */
function getPeriodForRuleSet( ruleSet, timestamp ){
    let type = ruleSet.periodType.toLowerCase(),
        count = parseInt( ruleSet.periodCount, 10 ) || 1,
        reference = ruleSet.periodReference,
        startDate,
        endDate = moment( timestamp );

    if ( 'punkt' === reference ) {
        startDate = endDate.clone();
        startDate = startDate.subtract( count, type + 's' );
    } else {
        startDate = endDate.clone();
        endDate = endDate.endOf( ( 'week' === type ) ? 'isoweek' : type );
        startDate = startDate.subtract( count - 1, type + 's' );
        startDate = startDate.startOf( ( 'week' === type ) ? 'isoweek' : type );
    }
    return {startDate, endDate};
}

/**
 * @method detectUnit
 * @private
 *
 * predict unit of age comparison days|months|weeks|years; default years
 *
 * @param {Integer} number  - tenantId key for tenant related global data
 *
 * @returns {Object} - number to compare with unit
 */
function detectUnit( number ){ // referred to ruleimportuils::getAgeInYears
    let isInteger = Number.isInteger( number );
    if( number && 'object' !== typeof number && !isInteger ){
        if( !isInteger && Number.isInteger( parseFloat(( number * 12 ).toFixed(5))) ){
            return {value: parseFloat(( number * 12 ).toFixed(5)), unit: 'months'};
        }
        if( !isInteger && Number.isInteger( parseFloat(( number * 365 ).toFixed(5))) ){
            return {value: parseFloat(( number * 365 ).toFixed(5)), unit: 'days'};
        }
        if( Number.isInteger( parseFloat(( number * 52 ).toFixed(5))) ){
            return {value: parseFloat(( number * 52 ).toFixed(5)), unit: 'weeks'};
        }
    } else {
        return {value: 'object' !== typeof number && number || 0, unit: 'years'};
    }
}

/**
 * @method getBirthRangeFromAge
 * @private
 *
 * build criteria to compare patientId.dob from patient age
 *
 * @param {Date} today - date to calculate age from
 * @param {Integer|Object} age - number or criteria
 *
 * @returns {Object} - mongo like query to compare patientId.dob
 */
function getBirthRangeFromAge( today, age ) {
    let
        date,
        range = {},
        dateTo,
        tmpValue,
        fromTolerance = age.fromTolerance || 0,     // TARMED validations
        untilTolerance = age.untilTolerance || 0;   // TARMED validations

    if( _.isFinite( age ) ) {
        tmpValue = detectUnit(age);
        date = moment( today ).subtract( tmpValue.value , tmpValue.unit ).add( 1, 'day' );
        return {
            $gt: date.clone().startOf('day').toDate(),
            $lte: moment( today ).toDate()
        };
    }
    if( !age ) {
        return null;
    }
    if( age && _.isFinite( age.$eq )) {
        tmpValue = age.unit ? {unit: age.unit, value: age.$eq} : detectUnit(age.$eq);
        switch(tmpValue.unit){
            case 'years':
            case 'months':
            case 'weeks':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).add( 1, 'day' );
                dateTo = date.clone().add(1, tmpValue.unit );
                break;
            case 'days':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).startOf('day').utc();
                dateTo = date.clone().add(1, tmpValue.unit ).endOf('day').utc();
        }
        return {
            $gt: date.startOf('day').toDate(),
            $lte: dateTo.startOf('day').toDate()
        };
    }
    if( age && _.isFinite( age.$ne )) {
        tmpValue = age.unit ? {unit: age.unit, value: age.$ne} : detectUnit(age.$ne);
        switch(tmpValue.unit){
            case 'years':
            case 'months':
            case 'weeks':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).add( 1, 'day' );
                dateTo = date.clone().add(1, tmpValue.unit );
                break;
            case 'days':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).endOf('day').utc();
                dateTo = date.clone().add(1, tmpValue.unit ).endOf('day').utc();
        }
        return { $not: {
                $gt: date.startOf('day').toDate(),
                $lte: dateTo.startOf('day').toDate()
            }} ;
    }
    if( age && _.isFinite( age.$gte ) ) {
        tmpValue = age.unit ? {unit: age.unit, value: age.$gte} : detectUnit(age.$gte);
        switch(tmpValue.unit){
            case 'years':
            case 'months':
            case 'weeks':
                date = moment( today ).subtract( tmpValue.value, tmpValue.unit ).add( 1, 'day' ).add( fromTolerance, 'day');
                break;
            case 'days':
                date = moment( today ).subtract( tmpValue.value, tmpValue.unit ).add( fromTolerance, 'day' ).endOf( 'day' ).utc();
        }
        range.$lt = date.startOf('day').toDate();
    }
    if( age && _.isFinite( age.$gt ) ) {
        tmpValue = age.unit ? {unit: age.unit, value: age.$gt} : detectUnit(age.$gt);
        switch(tmpValue.unit){
            case 'years':
            case 'months':
            case 'weeks':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).add( fromTolerance, 'day').add( 1, 'day' );
                break;
            case 'days':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).add( fromTolerance, 'day').startOf('day').utc();
        }
        range.$lt = date.startOf('day').toDate();
    }
    if( age && _.isFinite( age.$lte ) ) {
        tmpValue = age.unit ? {unit: age.unit, value: age.$lte} : detectUnit(age.$lte);
        switch(tmpValue.unit){
            case 'years':
            case 'months':
            case 'weeks':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).add( 1, 'day' ).subtract( untilTolerance, 'day' );
                break;
            case 'days':
                date = moment( today ).subtract( tmpValue.value + 1, tmpValue.unit ).subtract( untilTolerance, 'day' ).endOf( 'day' ).utc();
        }
        range.$gt = date.startOf('day').toDate();
    }
    if( age && _.isFinite( age.$lt ) ) {
        tmpValue = age.unit ? {unit: age.unit, value: age.$lt} : detectUnit(age.$lt);
        switch(tmpValue.unit){
            case 'years':
            case 'months':
            case 'weeks':
                date = moment( today ).subtract( tmpValue.value, tmpValue.unit ).add( 1, 'day' ).subtract( untilTolerance, 'day' );
                break;
            case 'days':
                date = moment( today ).subtract( tmpValue.value, tmpValue.unit ).subtract( untilTolerance, 'day' ).startOf( 'day' ).utc();
        }
        range.$gt = date.startOf('day').toDate();
    }
    if( age && age.$not && typeof age.$not === 'object' ) { // TARMED: age rules need to be able to exclude a range.
        return {
            $not: getBirthRangeFromAge( today, age.$not )
        };
    }

    return 'object' === typeof range && Object.keys( range ).length ? range : null;
}

/**
 * @method validate
 * @private
 *
 * validate rule criteria on data (activity data or other collection data like patient, casefolder, task)
 *  before validations some criteria are modified to match real data formats with rule editor gadgets format
 *
 * @param {Object} criteria - validate criteria
 * @param {Object} context  - some data from rule engine context, most important is context.data - object to validate
 * @param {Boolean} notOperator - show that result should be negated
 *
 * @returns {Boolean} - result of validation + context is modified by setting triggered rules id and on which activities rules was pass
 */
function validate( criteria, context, notOperator ) {
    let
        data = context.data,
        ruleSetName = context && context.originalRuleSet && `${context.originalRuleSet.description} (${context.originalRuleSet._id})`;

    if( 'object' !== typeof data ) {
        log( `validate: ${ruleSetName}: could not test criteria ${criteria} because no data passed`, 'warn' );
        return false;
    }

    //rewind special widget values
    if( criteria.code && criteria.code.$catalogShort ){
        criteria.catalogShort = {$eq: criteria.code.$catalogShort };
        delete criteria.code.$catalogShort;
    }
    if( criteria['patientId.age'] ) {
        let range = getBirthRangeFromAge( new Date(), criteria['patientId.age'] );
        if( range ) {
            criteria['patientId.dob'] = range;
        }
        delete criteria['patientId.age'];
    }

    if( criteria['patientId.markers'] ) {
        if(criteria['patientId.markers'].$eq){
            criteria['patientId.markers'].$in = [ criteria['patientId.markers'].$eq ];
            delete criteria['patientId.markers'].$eq;
        }
        if(criteria['patientId.markers'].$ne){
            criteria['patientId.markers'].$nin = [ criteria['patientId.markers'].$ne ];
            delete criteria['patientId.markers'].$ne;
        }
    }

    let result;
    if( Array.isArray( data ) ) {
        let $count = null;
        if( criteria.$count ){
            $count = criteria.$count;
            delete criteria.$count;
            result = data.filter( d => checkEntry( criteria, d, notOperator, ruleSetName, context ) );
            let passedCount = validateCount( $count, result.length );
            if( passedCount ){
                context.passedOn = [...context.passedOn, ...result.map( el => el._id && el._id.toString() )];
            }
            result = passedCount;
        } else {
            result = data.filter( d => checkEntry( criteria, d, notOperator, ruleSetName, context ) );
            if( result.length ){
                context.passedOn = [...context.passedOn, ...result.map( el => el._id && el._id.toString() )];
            }
            result = Boolean( result.length );
        }

        return Boolean( result );
    } else {
        result = checkEntry( criteria, data, notOperator, ruleSetName, context );
        if( result ){
            context.passedOn = [ ['patient', 'caseOpen'].includes( context.type ) ? data.patientId._id.toString() : data._id.toString() ];
        }
        return result;
    }
}

/**
 * @method isValidDate
 * @private
 *
 * check if given parameter is a Date
 *
 * @param {Any} date - date or string or other type to check if it is date
 *
 * @returns {Boolean} - true if correct date object
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}

/**
 * @method findOperators
 * @private
 *
 * find JS equivalents for mongo operations
 *
 * @param {Object} criterion - criterion object e.g. { "patientId.age": { "$gt": 5 } }
 * @param {Boolean} isDate   - identifies that value should be casted to Date
 * @param {String} ruleSetName   - description of ruleSet
 *
 * @returns {Array<Function>} - functions to execute to evaluate operations
 */
function findOperators( criterion, isDate, ruleSetName ) {
    const
        ops = [];

    //rewind $compDate
    if( criterion && 'object' === typeof criterion && criterion.$compDate ){
        criterion = criterion.$compDate;
        for (let [key, value] of Object.entries(criterion)) { //eslint-disable-line no-unused-vars
            criterion[key] = isValidDate(criterion[key]) ? criterion[key] : moment( value, 'DD.MM.YYYY' ).toDate();
        }
    }

    if( _.isString( criterion ) || _.isNumber( criterion ) || _.isBoolean( criterion ) || criterion === null ) {
        //for generated rules from catalog $eq operator can be omitted so actType: {$eq: 'TREATMENT'} can be just actType: 'TREATMENT'
        ops.push( ( val ) => OPERATORS.$eq( val, criterion ) );
    } else if( _.isPlainObject( criterion ) ) {
        let options = criterion && criterion.$options;
        Object.keys( criterion ).forEach( key => {
            if( OPERATORS[key] ) {
                let criterionValue = criterion[key];
                if( isDate && !isValidDate( criterionValue ) ){
                    criterionValue = moment( criterionValue ).toDate();
                }
                if( options ) {
                    ops.push( ( val, options ) => OPERATORS[key]( val, criterionValue, options ) );
                } else {
                    ops.push( ( val ) => OPERATORS[key]( val, criterionValue ) );
                }
            }
        } );
    }

    if( (!ops.length && _.isPlainObject( criterion )) || Array.isArray( criterion ) ) {
        log( `Not found operator for criterion ${JSON.stringify(criterion)} in ${ruleSetName}`, 'warn' );
    }
    return ops;
}

/**
 * @method checkEntry
 * @private
 *
 * deepest function where actual criteria comparison occurs;
 *
 * NOTE: this is equivalent to processing ENTRY reference area in old rule engine
 *
 * @param {Object} criteria - criterion object e.g. { "patientId.age": { "$gt": 5 }, "content": { "$eq": "test" } }
 * @param {Object} data     - object in which values found by pat is evaluated by criteria
 * @param {Boolean} notOperatorClause - indicates that result should be negated
 * @param {String} ruleSetName - description of ruleSet
 * @param {Object} context - subset of rule engine context, here only context.staticData is used (data passed from outside to not use Y.schema... )
 *
 * @returns {Boolean} - true if all criteria pass
 */
function checkEntry( criteria, data, notOperatorClause, ruleSetName, context ) {
    let result = Object.keys( criteria ).every( path => {

        if( !path || ['undefined', 'null'].includes( path ) ) { //for some failed cases produced by issue in rule editor it can be null
            log( `checkEntry: found incorrect criteria key: ${path} in ${ruleSetName}`, 'error' );
            return false;
        }

        let val,
            criterion,
            operators = [],
            notOperator = false;

        try {
            //some criteria should be processed in special way
            if( '$or' === path ) { // relevant to array of insurance status rewind by insurance type
                let orData = criteria[path],
                    orResult = false;
                orData.forEach( orClause => {
                    let orPath = Object.keys( orClause )[0];

                    val = getObject( orPath, data );
                    criterion = orClause[orPath];
                    operators = findOperators( criterion, false, ruleSetName );
                    orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                } );
                return orResult;
            } else if( 'patientId.partnerIds.partnerId' === path || 'partnerIds.partnerId' === path ) { //looks for partnerId in array of partnerIds
                let subPath = ('patientId.partnerIds.partnerId' === path) ? 'patientId.partnerIds' : 'partnerIds',
                    orData = (getObject( subPath, data ) || []).map( function( el ) {
                        return el.partnerId;
                    } ),
                    criterion = criteria[path],
                    operators = findOperators( criterion, false, ruleSetName ),
                    orResult = false;

                if( criterion.$all ) {
                    // should be sent all at once to correctly compare arrays intersection length
                    orResult = operators.every( operator => operator( orData, criterion && criterion.$options ) );
                } else {
                    orData.forEach( val => {
                        orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                    } );
                }

                return orResult;
            } else if( 'patientId.partnerIds.licenseModifier' === path || 'partnerIds.licenseModifier' === path ) { //same as previous for licenseModifier
                let subPath = ('patientId.partnerIds.licenseModifier' === path) ? 'patientId.partnerIds' : 'partnerIds',
                    orData = (getObject( subPath, data ) || []).map( function( el ) {
                        return context.staticData.DQS === el.partnerId && false === el.isDisabled && el.licenseModifier;
                    } ),
                    criterion = criteria[path],
                    operators = findOperators( criterion, false, ruleSetName ),
                    orResult = false;
                orData.forEach( val => {
                    orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                } );
                return orResult;
            } else if( ['fk5036Set.fk5036', 'fk5035Set.fk5035'].includes( path ) ) { //special path from rule editor map to activity field
                let pathArr = path.split( '.' ),
                    orData = (getObject( pathArr[0], data ) || []).map( function( el ) {
                        return el[pathArr[1]];
                    } ),
                    criterion = criteria[path],
                    operators = findOperators( criterion, false, ruleSetName ),
                    orResult = false;

                if( _.isEqual( criterion, {'$exists': false} ) ) {
                    return !(orData.length);
                }

                orData.forEach( val => {
                    orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                } );
                return orResult;
            } else if ( 'ageOnTimestamp' === path ){

                let range = getBirthRangeFromAge( new Date( data.timestamp ), criteria[path] );
                if( !range ) {
                    return false;
                }

                let operators = findOperators( range, true, ruleSetName ).filter( Boolean );
                let val = getObject( 'patientId.dob', data ),
                    res;
                val = isValidDate(val) ? val : moment( val ).toDate();
                res = operators.every( operator => operator( val ) );
                return res;
            } else {
                val = getObject( path, data );
                if ( DATE_TYPES.includes(path) ){
                    val = isValidDate(val) ? val : moment( val ).toDate();
                }

                if ( 'billingFactorValue' === path && val ) {
                    val = Number.parseFloat( val );
                }

                criterion = criteria[path];

                if(criterion && criterion.$not && typeof criterion.$not === 'object'){
                    notOperator = true;
                    criterion = criterion.$not;
                }

                operators = findOperators( criterion, DATE_TYPES.includes(path), ruleSetName );
            }
        } catch( e ) {
            log(`Error in determining the operator in ruleengine utils ${e.stack || e}`, 'error');
            console.log( '____context____' ); //eslint-disable-line no-console
            console.log( require('util').inspect( context, {depth: 10} ) ); //eslint-disable-line no-console
            console.log( '____criteria____' ); //eslint-disable-line no-console
            console.log( require('util').inspect( criteria, {depth: 10} ) ); //eslint-disable-line no-console
            console.log( '____path____' ); //eslint-disable-line no-console
            console.log( require('util').inspect( path, {depth: 10} ) ); //eslint-disable-line no-console
            console.log( '____notOperatorClause, ruleSetName____' ); //eslint-disable-line no-console
            console.log( notOperatorClause, ruleSetName ); //eslint-disable-line no-console
            operators = [];
        }
        operators = operators.filter( Boolean );

        if( !operators.length ) {
            return false;
        }

        let result = operators.every( operator => operator( val, criterion && criterion.$options ) );
        if( notOperator ){
            return !result;
        } else {
            return result;
        }

    } );

    return notOperatorClause ? !result : result;
}

/**
 * @method testRule
 * @private
 *
 * entry point of single rule validation on set of data
 * recursively travers logical tree ($and, $or, $not ) of rule validation criteria and validate each leaf criteria
 *
 *
 * @param {Object} initialClause - whole rule.validations object
 * @param {Object} context      - rule engine context (will be muted in case of rule pass)
 *
 * @returns {Boolean} - true if rule validations pass
 */
function testRule( initialClause, context ) {
    function iterate( clause, notOperator ) {
        if( Array.isArray( clause.$and || clause ) && !notOperator ) {
            return ( clause.$and || clause).every( el => iterate( el, notOperator ) );
        } else if( Array.isArray( clause.$and || clause ) && notOperator ) {
            return ( clause.$and || clause).some( el => iterate( el, notOperator ) );
        } else if( Array.isArray( clause.$or ) && !notOperator ) {
            return clause.$or.some( el => iterate( el, notOperator ) );
        } else if( Array.isArray( clause.$or ) && notOperator ) {
            return clause.$or.every( el => iterate( el, notOperator ) );
        } else if( Array.isArray( clause.$not ) ) {
            return clause.$not.every( el => iterate( el, true ) );
        } else {
            if( !clause.criteria ) {
                log( 'could not find fact or criteria is not given', 'error' );
                return false;
            }
            return validate( clause.criteria, context, notOperator );
        }
    }

    return iterate( initialClause );
}

/**
 * @method filterRuleSetsByCodesTypes
 * @private
 *
 * check if given ruleSet match to validation by code and/or type and other parameters
 * this function is used to filter whole ruleset to get only matched ruleSets for current trigger event
 *
 *
 * @param {Object} set - ruleSet to check
 * @param {String} area - reference area entry|apk|schein|period
 * @param {Object} context      - rule engine context
 *
 * @returns {Boolean} - ruleSet match
 */
function filterRuleSetsByCodesTypes( set, area, context ) {
    let areaCodes = context.areas[area].codes || [],
        areaTypes = context.areas[area].actTypes || [];

    if( context.onDelete ){
        areaCodes = [...new Set([ ...areaCodes, context.data.code ])];
        areaTypes = [...new Set([ ...areaTypes, context.data.actType ])];
    }

    let rules = area === 'entry' ? [] : set.rules.filter( rule => {
        return (rule.metaRequiredCodes && rule.metaRequiredCodes.length &&
                !arrayIntersections( rule.metaRequiredCodes, areaCodes ) &&
                (!rule.metaCodes || !rule.metaCodes.length)
               ) ||
               ((!rule.metaRequiredCodes || !rule.metaRequiredCodes.length) &&
                (!rule.metaCodes || !rule.metaCodes.length) &&
                arrayIntersections( rule.metaActTypes, areaTypes )
               );
    } );


    return (context.type === 'caseOpen' ? set.metaCaseOpen === true : !set.metaCaseOpen) &&
                 (arrayIntersections( set.caseFolderType, context.caseTypes )) && //case folder type should always match
                 ( ( set.metaFuzzy === true && !context.preValidateActivities ) ||
                      ( ( set.metaCaseOpen || !context.activityBasedRules ) && set.referenceArea === 'ENTRY' ) ||
                      ( rules.length && !context.preValidateActivities ) ||
                      ( ( area === 'entry' && !context.preValidateActivities ) ? //entry reference area use more open query to match activities that has no code like HISTORY
                          ( ( !areaCodes.length || !set.metaActCodes || ( set.metaActCodes.length === 0 ) || arrayIntersections( set.metaActCodes, areaCodes ) ) &&
                            ( !areaTypes.length || arrayIntersections( set.metaActTypes, areaTypes ) )
                          ) : //other types are matched by code + actType
                          ( (areaCodes.length ? arrayIntersections( set.metaActCodes, areaCodes ) : false) &&
                            (areaTypes.length ? arrayIntersections( set.metaActTypes, areaTypes ) : false)
                          )
                      )
                 );
}

/**
 * @method getActiveRuleSets
 * @private
 *
 * cache populating function called only at start and when rule collection is changed,
 * collect all active rule sets for all reference areas, recover keys, collect needed attributes per collection, etc.
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 *
 * @returns {undefined} - modified tenants[tenant]
 */
async function getActiveRuleSets( tenant, tenants ){
    //log('rule engine cache reloaded', 'info');
    const db = tenants[ tenant ].db;
    let [err, ruleSets] = await formatPromiseResult(
        db.collection( 'rules' ).find( {isDirectory: false, isActive: true, 'rules.isActive': true} ).toArray()
    );
    if( err ){
        log( `getActiveRuleSets: ${err.stack || err}`, 'error' );
        throw err;
    }
    ruleSets.forEach( ruleSet => {
        const caseFolderType = (ruleSet.caseFolderType || []);
        // MOJ-14319
        if( caseFolderType.includes( 'PUBLIC' ) && !caseFolderType.includes( 'PUBLIC_A' ) ) {
            ruleSet.caseFolderType.push( 'PUBLIC_A' );
        }
        if( caseFolderType.includes( 'PRIVATE' ) && !caseFolderType.includes( 'PRIVATE_A' ) ) {
            ruleSet.caseFolderType.push( 'PRIVATE_A' );
        }
    } );
    tenants[tenant].ruleSets = {};

    //initial population to not fall on empty db during testing
    tenants[tenant].ruleSets = {
        entry: [],
        apk: [],
        schein: [],
        period: []
    };
    tenants[tenant].attributes = {
        entry: [],
        patient: [],
        employee: [],
        location: []
    };

    if( !ruleSets || !ruleSets.length ){
        return;
    }
    ruleSets = ruleSets.map( ruleSet => {
        ruleSet.rules = recoverKey( ruleSet.rules );
        return ruleSet;
    });

    tenants[tenant].ruleSets.entry = ruleSets.filter( el => el.referenceArea === 'ENTRY' );
    tenants[tenant].ruleSets.apk = ruleSets.filter( el => el.referenceArea === 'APK' );
    tenants[tenant].ruleSets.schein = ruleSets.filter( el => el.referenceArea === 'SCHEIN' );
    tenants[tenant].ruleSets.period = ruleSets.filter( el => el.referenceArea === 'PERIOD' );

    let attributes = ruleSets.reduce( (acc, el ) => ([...new Set([...acc, ...(el.metaCriterias || []) ])]), [] ).map( el => el.replace( /\\\\\-/g, '.' ) );
    tenants[tenant].attributes = {
        entry: [],
        patient: [],
        employee: [],
        location: []
    };
    attributes.map( attr => {
        let parts = attr.split('.');
        switch( parts[0] ){
            case 'ageOnTimestamp':
                tenants[tenant].attributes.patient.push( 'dob' );
                break;
            case 'patientId':
                if(parts[1] === 'age' ){
                    tenants[tenant].attributes.patient.push( 'dob' );
                } else {
                    tenants[tenant].attributes.patient.push( parts[1] );
                }
                break;
            case 'employeeId':
                tenants[tenant].attributes.employee.push( parts[1] );
                break;
            case 'locationId':
                tenants[tenant].attributes.location.push( parts[1] );
                break;
            default:
                tenants[tenant].attributes.entry.push( attr );
        }
    } );

    //to prevent taking all attributes if not needed take only _id
    for(let collection of ['patient', 'employee', 'location']){ //eslint-disable-line no-unused-vars
        if( !tenants[tenant].attributes[collection].length ){
            tenants[tenant].attributes[collection].push( '_id' );
        }
    }

    tenants[tenant].hasAll = ruleSets.some  ( el => (el.caseFolderType || []).includes( 'ALLCASES') && el.rules.some( rule => rule.isActive === true ) );

    //check if there any casOpen rules
    tenants[tenant].hasCaseOpen = ruleSets.some( el => el.metaCaseOpen === true && el.rules.some( rule => rule.isActive === true ) );

    let periodSettings = {};
    for( let ruleSet of tenants[tenant].ruleSets.period){ //eslint-disable-line no-unused-vars
        let key = `${ruleSet.periodType}_${ruleSet.periodCount}_${ruleSet.periodReference}`;
        if( !periodSettings[key] ) {
            periodSettings[key] = {
                periodType: ruleSet.periodType,
                periodCount: ruleSet.periodCount,
                periodReference: ruleSet.periodReference
            };
        }
    }
    // grouped distinct combination of period rule settings - to get max time range to get affected activities
    tenants[tenant].periodSettings = Object.values( periodSettings );
}

/**
 * @method initTenant
 * @private
 *
 * cache used to establish new db connection per tenant db or return already connected client
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Object} context - rule engine context, here used context.staticData
 *
 * @returns {Object} - connected to mongodb client
 */
async function initTenant( tenant, tenants, context ){
    let db;
    if( !tenants[tenant] || !tenants[tenant].db ) {
        tenants[tenant] = {};
        //establishing new db connection per tenant

        let
            dbConfig = context.staticData.dbConfig,
            uri = getDBUri( tenant , dbConfig ),
            dbOptions = Object.assign({}, dbConfig.server);

        threadId = context.staticData.threadId || 'n/a';

        let [err, client] = await formatPromiseResult( connect( uri, dbOptions ) );
        if( err ){
            throw err;
        }

        db = client.db( tenant );

        //check auth status
        [err] = await formatPromiseResult( db.command( {connectionStatus : 1} ) );
        if( err ){
            throw err;
        }
        log( `initTenant: successfully connect to ${dbConfig.host}:${dbConfig.port}:${tenant}`, 'info' );
        tenants[tenant].db = db;
    } else {
        db = tenants[tenant].db;
    }

    return db;
}

/**
 * @method makeProjections
 * @private
 *
 * build projection like object from array of field names
 * e.g. [ 'firstname', 'timestamp'] => { firstaname: 1, timestamp: 1 }
 *
 * @param {Array<String>} arr
 *
 * @returns {Object}
 */
function makeProjections( arr ){
    return arr.reduce( ( acc, el ) => {
        acc[el] = 1;
        return acc;
    }, {} );
}

/**
 * @method getCrossUsageSettings
 * @private
 *
 * call mongo db to get system wide settings about cross casefolder and cross location execution
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {Promise<undefined>} - + modify context
 */
async function getCrossUsageSettings( tenant, tenants, context ){
    const
        db = tenants[tenant].db;
    let[ err, invoicesettings] = await formatPromiseResult(
        db.collection( 'invoiceconfigurations' ).find( {} ).project( {gkvCombineCaseFolders: 1, gkvCombineScheins: 1} ).toArray()
    );
    if( err ) {
        throw err;
    }
    if( invoicesettings && invoicesettings.length ){
        context.combineGKV = invoicesettings[0].gkvCombineCaseFolders || false;
        context.combineScheins = invoicesettings[0].gkvCombineScheins || false;
    }
}

/**
 * @method getActivitiesByQuery
 * @private
 *
 * call mongo db to get activities by query and take only selected fields
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Object} context - rule engine context
 * @param {Object} query - mongodb query
 *
 * @returns {Array<Object>} -array of activities
 */
async function getActivitiesByQuery( tenant, tenants, context, query ){
    const
        db = tenants[tenant].db,
        DEFAULT_FIELDS = ['_id', 'code', 'actType', 'timestamp', 'continuousIcds', 'patientId', 'caseFolderId',
            'locationId', 'employeeId', 'catalogShort', 'daySeparation', 'areTreatmentDiagnosesBillable'];

    let[ err, affectedActivities] = await formatPromiseResult(
        db.collection( `${context.staticData.isISD?'mirror':''}activities` ).find( query ).project( makeProjections( [...new Set([...DEFAULT_FIELDS, ...tenants[tenant].attributes.entry])]) )
            .toArray()
    );
    if( err ) {
        throw err;
    }
    return affectedActivities;
}


/**
 * @method getAffectedActivities
 * @private
 *
 * call mongo db to get all possible activities for this rule engine run, latter list will be filtered for reference areas, locations used etc.
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {Array<Object>} -array of affected activities, sorted by timestamp
 */
async function getAffectedActivities( tenant, tenants, context ){
    // min/max for period
    let min, max,
        contextTimestamp = context.timestamp || context.data.timestamp,
        startQuarter = moment( contextTimestamp ).startOf( 'quarter' ).toDate();

    if( !tenants[tenant].periodSettings ){
        return [];
    }

    tenants[tenant].periodSettings.map( ruleSet => {
        let {startDate, endDate} = getPeriodForRuleSet( ruleSet, contextTimestamp );

        if( !min || min.isAfter( startDate ) ) {
            min = startDate;
        }
        if( !max || max.isBefore( endDate ) ) {
            max = endDate;
        }
    } );

    context.min = min;
    context.max = max;

    let
        affectedActivityQuery = {
            $and: [
                {$or: [{importId: {$exists: false}}, {importId: {$eq: ''}}]},
                {status: {$in: ['VALID', 'APPROVED', 'BILLED']}},
                {patientId: context.patientId}
            ]
        },
        scheinsQuery = {
            $or: [
                {
                    $and: [
                        {actType: {$in: SCHEIN_TYPES}},
                        {timestamp: {$gte: startQuarter}}
                    ]
                }
            ]
        };

    if( context.caseFolders ){
        affectedActivityQuery.$and.push(
            {caseFolderId: {$in: context.caseFolders}}
        );
    }

    if( context.type === 'activity' && context.locations.length ){
        affectedActivityQuery.$and.push( {
            locationId: {$in: context.locations.map( el => (new ObjectId( el )) )}
        } );
    }

    if( min && max ) {
        scheinsQuery.$or.push( {
            timestamp: {
                $gte: min.toDate(),
                $lte: max.toDate()
            }
        } );
    } else { //there are no period rules still need get activities, for now get all in quarter
        scheinsQuery.$or.push( { timestamp: {$gte: startQuarter} } );
    }

    affectedActivityQuery.$and.push( scheinsQuery );

    let [ err, affectedActivities ] = await formatPromiseResult( getActivitiesByQuery( tenant, tenants, context, affectedActivityQuery ) );
    if( err ) {
        throw err;
    }
    affectedActivities.sort( (a, b) => b.timestamp - a.timestamp );
    return affectedActivities;
}

/**
 * @method getContinuousActivities
 * @private
 *
 * call mongo db to get all referenced activities that not in affected activities
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Object} context - rule engine context
 * @param {Array<Object>} affectedActivities - array of affected activities
 *
 *
 * @returns {Array<Object>} - array of continuous activities (from other case folders)
 */
async function getContinuousActivities( tenant, tenants, context, affectedActivities ){
    let
        continuous = affectedActivities.reduce( (prev, cur) => [...new Set([...prev, ...(cur.continuousIcds || [])])], []);

    //any continuous activities needed
    if( !continuous.length ){
        return [];
    }

    let
        alreadyLoaded = affectedActivities.filter( el => {
            return continuous.includes( el._id.toString() );
        } ),
        alreadyLoadedIds = alreadyLoaded.map( el => el._id.toString() ),
        notFoundInAffected = continuous.filter( el => {
            return !alreadyLoadedIds.includes( el );
        } );

    //all activities are already in affected activities
    if( !notFoundInAffected.length ){
        return [];
    }

    let [ err, referencedActivities ] = await formatPromiseResult( getActivitiesByQuery( tenant, tenants, context, {
        _id: { $in: notFoundInAffected.map( el => new ObjectId( el )) }
    } ) );
    if( err ) {
        throw err;
    }

    //need later for properly add locationId in ruleLog.affectedActivities
    referencedActivities = referencedActivities.map( act => {
        act.locationId_org = act.locationId && act.locationId.toString();
        return act;
    } );

    return referencedActivities;
}

/**
 * @method refineInsuranceStatus
 * @private
 *
 * rebuild insurance status aray to object where key is insurance type
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Object} patient - patient object from db (only needed attributes)
 *
 *
 * @returns {Object} - patient object modified
 */
function refineInsuranceStatus( tenant, tenants, patient ){
    if( tenants[tenant].attributes.patient.includes( 'insuranceStatus' ) && patient.insuranceStatus && patient.insuranceStatus.length ){
        //refine insurance status

        let insuranceStatus = {};
        patient.insuranceStatus.map( status => {
            insuranceStatus[status.type] = status;
        } );

        patient.insuranceStatus = insuranceStatus;
    }
    return patient;

}

/**
 * @method addCollection
 * @private
 *
 * extend data (affected activity or entry data) by additional collection data (patient, employee, location)
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {String} collection - collection name: patient|employee|location
 * @param {Array<Object>} affectedActivities - array of data to extend
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {Promise} - + modify affectedActivities content
 */
async function addCollection( tenant, tenants, collection, affectedActivities, context ) {

    //do not extend collection entry data, already come populated in data, e.g context.data === { patientId: {...}}
    if( context.type === 'patient' && collection === 'patient' ){
        if( context.data && context.data.patientId ) {
            context.data.patientId = refineInsuranceStatus( tenant, tenants, context.data.patientId );
        }
        return;
    }

    //TODO skip earlier if there are no fields to collect
    // tenants[tenant].attributes[collection] )

    const db = tenants[tenant].db;
    let
        ids = affectedActivities.map( el => el[`${collection}Id`] ).filter( Boolean ).map( el => new ObjectId( el.toString() ) );

    if( !ids.length ){
        return;
    }

    let [err, results] = await formatPromiseResult(
            db.collection( `${context.staticData.isISD?'mirror':''}${collection}s` ).find( {_id: {$in: ids} } ).project( makeProjections( tenants[tenant].attributes[collection] ) ).toArray()
        );

    if( err ) {
        log( `getActiveRuleSets: ${err.stack || err}`, 'error' );
        throw err;
    }

    if( collection === 'patient' ){

        if( !results || !results.length ) {
            throw new Error( 'patient not found' );
        }

        if( context.type === 'caseOpen' ){
            results = results.map( patient => {
                patient.caseFolderOpen = true;
                return patient;
            } );
        }

        results = results.map( patient => {
            patient = refineInsuranceStatus( tenant, tenants, patient );
            return patient;
        } );
    }

    context[collection] = JSON.parse(JSON.stringify(results));

    affectedActivities.map( act => {
        if( collection === 'location' ){
            act.locationId_org = act.locationId && act.locationId.toString();
        }
        act[ `${collection}Id` ] = results.find( el => act[ `${collection}Id` ] && el._id.toString() === act[ `${collection}Id` ].toString() );
    });
}

/**
 * @method calculateNAPK
 * @private
 *
 * calculate number of daySeparations in array of activities
 *
 * @param {Array<Object>} affectedActivities - array of data
 *
 * @returns {undefined} - + modify affectedActivities content
 */
function calculateNAPK( affectedActivities ){
    let daysNAPK = {};
    affectedActivities.filter( act => act.actType === 'TREATMENT' ).map( act => {
        let date = `${moment( act.timestamp ).format( 'YYYYMMDD' )}_${ act.daySeparation ? act.daySeparation : '00:00'}`;
        daysNAPK[date] = !daysNAPK[date] ? 1 : daysNAPK[date] + 1;
    });

    let nAPK = Object.keys( daysNAPK ).length;
    affectedActivities.map( act => {
        act.nAPK = nAPK;
    } );
}

/**
 * @method getActiveScheins
 * @private
 *
 * get latest scheins in quarter per location
 *
 * @param {Array<Object>} affectedActivities - array of data
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {undefined} - modify context
 */
function getActiveScheins( affectedActivities, context ){
    let
        scheins = {},
        contextTimestamp = context.timestamp || context.data.timestamp,
        startQuarter = moment( contextTimestamp ).startOf( 'quarter' ).toDate(),
        endQuarter = moment( contextTimestamp ).endOf( 'quarter' ).toDate();

    context.scheins = scheins;

    affectedActivities.filter( el => {
        let activityDate = new Date ( el.timestamp );
        return SCHEIN_TYPES.includes( el.actType ) && activityDate >= startQuarter && activityDate <= endQuarter;
    } ) .map( el => {
        if( !scheins[el.locationId.toString()] ) {
            scheins[el.locationId.toString()] = {
                timestamp: el.timestamp,
                _id: el._id.toString()
            };
        }
    } );
    // now scheins object keep latest schein per location in quarter
    if( Object.keys( scheins ).length ){
        context.latestScheinId = Object.values( scheins )[0]._id; //TODO note take schein and not aware casefolder and location
        context.latestScheinDate = Object.values( scheins )[0].timestamp;
        context.scheins = scheins;
    }

}

/**
 * @method getTimeRangesForAreas
 * @private
 *
 * calculate time ranges from - to per reference area
 *
 * @param {Array<Object>} affectedActivities - array of data
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {undefined} - modify context
 */
function getTimeRangesForAreas( affectedActivities, context ){
    if( !context.activityBasedRules ) {
        context.areas = {
            entry: {}
        };
        return;
    }

    let
        min = context.min,
        max = context.max;

    //setup ranges for rule areas
    let endRange = moment( context.data.timestamp ).endOf( 'day' ),
        afterEnd = endRange.clone().add( 1, 'day' ),
        contextTimestamp = context.timestamp || context.data.timestamp;

    context.areas = {
        entry: { range: {
                from: moment( contextTimestamp ).toDate(),
                to: moment( contextTimestamp ).toDate()
            }},
        apk: {
            range: {
                from: moment( contextTimestamp ).startOf( 'day' ).toDate(),
                to: endRange.toDate()
            }
        },
        schein: { //for now get one range for all locations ( it works like that in old rule engine )
            range: {
                from: moment( context.latestScheinDate || afterEnd ).toDate(),
                to: moment().endOf( 'day' ).toDate()
            }
        },
        period: {
            range: {
                from: min && min.toDate() || moment().endOf( 'day' ).toDate(),
                to: moment.min( [max, moment().endOf( 'day' )].filter( Boolean ) ).toDate() || endRange.toDate()
            }
        }
    };
}

/**
 * @method getAffectedCodesTypes
 * @private
 *
 * collect all used codes/actTypes per reference area in scope of time range
 *
 * @param {Array<Object>} affectedActivities - array of data
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {undefined} - modify context
 */
function getAffectedCodesTypes( affectedActivities, context ){
    if( !context.activityBasedRules ) {
        return;
    }
    context.areas.entry.codes = [ context.data.code ].filter( Boolean );
    context.areas.entry.actTypes = [ context.data.actType ].filter( Boolean );
    context.areas.entry.affectedActivitiesCount = 1;
    for( let area of PERIOD_AREAS ) { //eslint-disable-line no-unused-vars
        let filteredByRange = getFilteredByRangeActivities( affectedActivities, area, context );
        context.areas[area].codes = [...new Set( filteredByRange.map( el => el.code ).filter( Boolean ) )];
        context.areas[area].actTypes = [...new Set( filteredByRange.map( el => el.actType ).filter( Boolean ) )];
        context.areas[area].affectedActivitiesCount = filteredByRange.length;
    }
}

/**
 * @method splitByDaySeparation
 * @private
 *
 * split array of activities by found datSeparation field
 *
 * @param {Array<Object>} activities - array of data

 *
 * @returns {Array<Array<Object>>} - array of splitted objects
 */
function splitByDaySeparation( activities ){
    let splitted = [], current = [];
    activities.forEach( act => {
        current = [...current, act];
        if( act.daySeparation ){
            splitted = [...splitted, current ];
            current = [];
        }
    });

    if( current.length ){
        splitted = [...splitted, current ];
    }

    return splitted;
}

/**
 * @method validateRuleSets
 * @private
 *
 * validate all candidate rule sets/rules for each reference area on given data
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Array<Object>} affectedActivities - array of data
 * @param {Array<String>} areas - array of reference areas
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {undefined} - modify context
 */
function validateRuleSets( tenant, tenants, affectedActivities, areas, context ){
    const filterBySetArea = ( set, area ) => filterRuleSetsByCodesTypes( set, area, context );
    for( let area of areas ){ //eslint-disable-line no-unused-vars
        if( context.onDelete && area === 'entry' ){ //process only period type rules on delete
            continue;
        }
        if( COLLECTION_DATA_TYPES.includes(context.type) && area !== 'entry' ){
            continue;
        }

        context.areas[area].ruleSets = (tenants[tenant].ruleSets[area] || []).filter( set => filterBySetArea( set, area ) );
        context.areas[area].passed = {...context.areas[area].passed};

        for( let ruleSet of context.areas[area].ruleSets ){ //eslint-disable-line no-unused-vars
            // to debug single rule set it description can be used in next line
            //if( ruleSet.description !== 'TARMED 00.0025 Hierarchie in derselben Sitzung' ){ continue }

            if( area === 'period' ){
                //refine period for the ruleSets
                let {startDate, endDate} = getPeriodForRuleSet( ruleSet, context.timestamp || context.data.timestamp );
                context.areas[area].range.from = startDate.toDate();
                context.areas[area].range.to = endDate.toDate();
            }

            let areaActivities = area === 'entry' ? context.data : getFilteredByRangeActivities( affectedActivities, area, context );

            //calculate nAPK for affected activities if needed
            if( context.areas[area].ruleSets.find( set => set.metaCriterias && set.metaCriterias.includes( 'nAPK' )) ){
                calculateNAPK( areaActivities );
            }

            let activitiesByDaySeparations;
            if( area === 'apk' ){
                activitiesByDaySeparations = splitByDaySeparation( areaActivities );
            } else {
                activitiesByDaySeparations = [ areaActivities ];
            }

            for( let rule of ruleSet.rules ){ //eslint-disable-line no-unused-vars
                if( !rule.isActive ){
                    continue;
                }
                for( let areaActivitiesSplitted of activitiesByDaySeparations ){ //eslint-disable-line no-unused-vars
                    let options = {
                            data: areaActivitiesSplitted,
                            originalRuleSet: ruleSet,
                            passedOn: [],
                            type: context.type,
                            staticData: context.staticData
                        },
                        result = testRule( JSON.parse(JSON.stringify(rule.validations)), options );
                    if( result ){
                        if( !context.areas[area].passed[ruleSet._id] ){
                            context.areas[area].passed[ruleSet._id] = ruleSet;
                            context.areas[area].passed[ruleSet._id].passedRules = [];
                        }
                        let passedRule = {
                            ruleId: rule.ruleId,
                            passedOn: options.passedOn || []
                        };

                        if( context.activityBasedRules ){
                            passedRule.passedRange = {
                                from: context.areas[area].range.from,
                                to: context.areas[area].range.to
                            };
                        }
                        context.areas[area].passed[ruleSet._id].passedRules.push( passedRule );
                    }
                }

            }
        }
    }
}

/**
 * @method buildRemoveRuleLogQuery
 * @private
 *
 * based on validation results prepare mongo queries to delete rulelogs (id done out of this file in rule-api)
 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Object} context - rule engine context (will be modified)
 *
 *
 * @returns {undefined} - modify context.result
 */
function buildRemoveRuleLogQuery( tenant, tenants, context ) {
    let queries = [];

    for( let area of ['entry', ...PERIOD_AREAS] ) { //eslint-disable-line no-unused-vars
        let query = {
            patientId: context.patientId
        };
        if( context.onDelete && area === 'entry' ) {

            if( context.type === 'task' ){
                //allow generate remove entry query for task
            } else if( ['patient', 'casefolder'].includes(context.type) ){
                //special open query to delete all rule logs for patient and patient/casefolder
                if( context.type === 'casefolder' && context.caseFolderId ){
                    query.caseFolderId = context.caseFolderId;
                }
                queries.push( query );
                continue;
            } else {
                //process only period type rules on delete
                continue;
            }

        }

        if( COLLECTION_DATA_TYPES.includes( context.type ) && area !== 'entry' ){
            continue;
        }

        query.referenceArea = area.toUpperCase();

        //TODO location and casefolder
        // tenants[tenant].hasAll
        let casefolders = context.caseFolders;
        if( casefolders && casefolders.length && context.type !== 'task' ){
            query.caseFolderId = { $in: casefolders };
        }

        if( area === 'entry' ){
            let factIds = [];
            if( context.areas[area].passed && Object.keys(context.areas[area].passed) ){
                for( let ruleSetId of Object.keys(context.areas[area].passed) ){ //eslint-disable-line no-unused-vars
                    for( let passedRule of context.areas[area].passed[ruleSetId].passedRules ){ //eslint-disable-line no-unused-vars
                        factIds = [...new Set([...factIds, ...passedRule.passedOn])];
                    }
                }
            }

            if( context.data && context.data._id ) {
                factIds = [...new Set([...factIds, context.data._id])];
            }
            if( factIds.length ) {
                query.factId = { $in: factIds };
            }
            if( context.type === 'patient' && context.data && context.data.patientId && context.data.patientId._id ) {
                query.factId = context.data.patientId._id;
                query.caseFolderType = 'PATIENT';
            }
            if( context.type === 'casefolder' && context.data && context.data.patientId && context.data.patientId._id ) {
                query.factId = context.data._id.toString();
                query.caseFolderType = 'CASEFOLDER';
            }
            if( context.type === 'task' && context.data && context.data._id ) {
                query.factId = context.data._id.toString();
                query.caseFolderType = 'TASK';
            }
        }


        let ruleSets = [],
            ruleIds = [];

        if( !(context.onDelete && context.type === 'task' ) ){ //skip for deleting task
            for( let candidateRuleSet of (context.areas[area].ruleSets || []) ) { //eslint-disable-line no-unused-vars
                ruleSets = [...new Set( [...ruleSets, candidateRuleSet._id.toString() ] )];
                ruleIds = [...new Set( [...ruleIds, ...candidateRuleSet.rules.map( el => el.ruleId ) ] )];
            }
        }


        if( ruleIds.length && !['schein', 'entry', 'period'].includes( area ) ) {
            query.ruleId = {$in: ruleIds};
        }

        if( ruleSets.length && ['period'].includes( area ) ) {
            query.ruleSetId = {$in: ruleSets};
        }

        if( ['apk', 'schein'].includes( area ) ) {
            query.$or =[{
                referenceAreaFrom: context.areas[area].range.from
            }];
        }

        if( ['period'].includes( area ) ) { //take all rulelogs that includes timestamp between from-to
            query.$and = [
                {$or: [
                        { referenceAreaFrom: {$lte: context.timestamp || context.data.timestamp } },
                        { referenceAreaFrom: {$exists: false} }
                    ]},
                {$or: [
                        { referenceAreaTo: {$gte: context.timestamp || context.data.timestamp } },
                        { referenceAreaTo: {$exists: false} }
                    ]}
            ];
        }

        query.onCaseOpen = context.type === 'caseOpen' ? true : { $ne: true };

        queries.push( query );
    }

    context.result.removeQueries = queries;
}

/**
 * @method buildRemoveRuleLogQuery
 * @private
 *
 * based on validation results prepare data for executing actions (id done out of this file in rule-api):
 *  - crate new rule logs;
 *  - modify patient.markers;
 *  - create tasks, forms, activities

 *
 * @param {String} tenant - tenantId to refer db related data in global cache
 * @param {Object} tenants - global object to store cached data
 * @param {Array<Object>} affectedActivities - affected activities
 * @param {Object} context - rule engine context (will be modified)
 *
 */
function buildActions( tenant, tenants, affectedActivities, context ){
    let entries = [],
        tasks = [],
        patients = [],
        activitiesAutoCreate =[];

    for( let area of ['entry', ...PERIOD_AREAS] ) { //eslint-disable-line no-unused-vars
        if( context.onDelete && area === 'entry' ){ //process only period type rules on delete
            continue;
        }
        if( COLLECTION_DATA_TYPES.includes(context.type) && area !== 'entry' ){
            continue;
        }

        if( !context.areas[area].passed ){
            continue;
        }

        for( let passedRuleSet of Object.values( context.areas[area].passed ) ) { //eslint-disable-line no-unused-vars
            for( let passedResult of passedRuleSet.passedRules ){ //eslint-disable-line no-unused-vars

                let passedRule = passedRuleSet.rules.find( el => el.ruleId === passedResult.ruleId );

                for( let action of (passedRule.actions || [])){ //eslint-disable-line no-unused-vars
                    //TODO verify autoGenID across usages code is quite weird
                    let passedRange = passedResult.passedRange || {},
                        autoGenID = `${context.patientId}_${context.caseFolderId}_${passedRuleSet.referenceArea}` +
                                     ( ( !['patient', 'casefolder'].includes( context.type ) && area === 'entry' ) ? context.data._id.toString() : '' ) +
                                     ( ( area === 'schein' && passedRange.from ) ? '_' + passedRange.from.toISOString() : '' ) +
                                     '_' + passedRule.ruleId +
                                     ( action.template && action.template.tempateID ? `_${action.template.tempateID}` : '' ),
                        triggeredOn = passedResult.passedOn;

                    if( !context.silent && action.type === 'ACTIVITY' && action.template && !context.activeActive && !context.onDelete && action.template.autoCreate ) {
                        activitiesAutoCreate.push( {
                            template: action.template,
                            description: passedRule.description,
                            ruleSetCaseFolder: passedRuleSet.caseFolderType,
                            triggeredBy: triggeredOn,
                            ruleId: passedRule.ruleId,
                            ruleSetId: passedRuleSet._id.toString(),
                            referenceArea: passedRuleSet.referenceArea,
                            referenceAreaFrom: passedRange.from && passedRange.from.toString(),
                            caseFolderId: context.caseFolderId,
                            autoGenID,
                            periodOptions: {
                                periodStart: area === 'period' && moment(passedRange.from),
                                periodEnd: area === 'period' && moment(passedRange.to)
                            },
                            allCases: tenants[tenant].hasAll
                        } );
                    }

                    if( action.type === 'PATIENT' && action.template && action.template.markers && action.template.markers.length ) {
                        patients.push( {
                            patientId: context.patientId,
                            markers: action.template.markers
                        } );
                        continue;
                    }

                    if( !context.silent && ['TASK', 'TASK_WITH_FORM', 'FORM_WITHOUT_TASK' ].includes( action.type ) && action.template ) {
                        tasks.push( {
                            type: action.type,
                            template: action.template,
                            ruleSetDescription: passedRuleSet.description || '',
                            ruleSetCaseFolder: passedRuleSet.caseFolderType,
                            ruleDescription: passedRule.description || '',
                            triggeredBy: triggeredOn,
                            ruleId: passedRule.ruleId,
                            ruleSetId: passedRuleSet._id,
                            referenceArea: passedRuleSet.referenceArea,
                            referenceAreaFrom: passedRange.from && passedRange.from.toString(),
                            caseFolderId: context.caseFolderId,
                            autoGenID
                        } );
                        continue;
                    }

                    if( ['ERROR', 'WARNING', 'ACTIVITY'].includes(action.type) ) {

                        if(!context.caseFolderId){
                            log( `processActions: missed caseFolderId for rulelog for ${passedRule.description}. Skipped`, 'warn' );
                            continue;
                        }

                        let allCodes = [],
                            actCodes = passedRule.metaCodes || [],
                            requiredCodes = passedRule.metaRequiredCodes || [],
                            actTypes = passedRule.metaActTypes || [];

                        let passedActivities = [...affectedActivities, ...(context.continuousActivities || [])].filter( el => triggeredOn.includes( el._id.toString() ) ).map(
                            el => {
                                el.id = el._id.toString();
                                return el;
                            }
                        );

                        if( 20 < actCodes.length ) {
                            allCodes = actCodes;
                            actCodes = passedActivities.map(( activity ) => {
                                return activity.code;
                            });
                        }

                        let entry = {
                                referenceArea: area.toUpperCase(),
                                patientId: context.patientId,
                                caseFolderId: context.caseFolderId,
                                ruleSetId: passedRuleSet._id.toString(),
                                ruleId: passedRule.ruleId,
                                ruleLogType: action.type,
                                caseFolderType: passedRuleSet.caseFolderType,
                                message: passedRule.description || '',
                                timestamp: context.timestamp || context.data.timestamp,
                                requiredCodes,
                                actCodes,
                                allCodes,
                                actTypes,
                                onCaseOpen: context.type === 'caseOpen' || false
                            };

                        if( context.locations && context.locations.length === 1){
                            entry.locationId = context.locations[ 0 ];
                        }

                        if( area === 'entry' ){
                            if( context.preparedActivities && context.preparedActivities.length ){
                                entry.affectedActivities = passedActivities.map( el => {
                                    const { id, code, actType, timestamp } = el;
                                    return { id, code, actType, timestamp };
                                } );
                            } else {
                                const { _id: id, code, actType } = context.data;
                                if( code ){
                                    entry.affectedActivities = [ { id, code, actType } ];
                                }
                            }
                        } else {
                            entry.affectedActivities = passedActivities.map( el => {
                                const { id, code, actType, timestamp, locationId_org: locationId } = el;
                                return { id, code, actType, timestamp, locationId };
                            } );
                        }

                        switch( area ){
                            case 'entry': {
                                if( context.preparedActivities && context.preparedActivities.length ) {
                                    let data = entry.affectedActivities && entry.affectedActivities[0] || {};
                                    entry.factId = ['patient', 'caseOpen'].includes( context.type ) ? context.patientId : ( passedResult.passedOn && passedResult.passedOn[0] || data.id );
                                    entry.referenceAreaFrom = data.timestamp;
                                    entry.referenceAreaTo = data.timestamp;
                                } else {
                                    entry.factId = [ 'patient' , 'caseOpen' ].includes( context.type ) ? context.patientId : ( passedResult.passedOn && passedResult.passedOn[0] || context.data._id.toString() );
                                    entry.referenceAreaFrom = context.timestamp;
                                    entry.referenceAreaTo = context.timestamp;
                                }
                                break;
                            }
                            case 'apk':
                                entry.referenceAreaFrom = passedRange.from;
                                entry.referenceAreaTo = passedRange.to;
                                break;
                            case 'schein':
                                entry.factId = context.latestScheinId;
                                entry.referenceAreaFrom = passedRange.from;
                                entry.referenceAreaTo = passedRange.to;
                                break;
                            case 'period':
                                entry.message += ` (${moment(passedRange.from).format( DT_FORMAT )} - ${moment(passedRange.to).format( DT_FORMAT )})`;
                                entry.referenceAreaFrom = passedRange.from;
                                entry.referenceAreaTo = passedRange.to;
                                break;
                        }

                        if( !context.silent && action.type === 'ACTIVITY' && action.template && !context.activeActive && !context.onDelete && !action.template.autoCreate ) {
                            entry.ruleLogType = 'ACTIVITY';
                            entry.message = passedRule.description || '';
                            delete entry.referenceAreaTo;
                            delete entry.locationId;
                            delete entry.caseFolderType;
                            entry.activitiesToCreate = [ {
                                id: 0,
                                template: action.template,
                                ruleSetCaseFolder: passedRuleSet.caseFolderType,
                                triggeredBy: triggeredOn,
                                ruleId: passedRule.ruleId,
                                ruleSetId: passedRuleSet._id.toString(),
                                referenceArea: passedRuleSet.referenceArea,
                                referenceAreaFrom: passedRange.from && passedRange.from.toString(),
                                caseFolderId: context.caseFolderId,
                                autoGenID,
                                periodOptions: {
                                    periodStart: area === 'period' && moment(passedRange.from),
                                    periodEnd: area === 'period' && moment(passedRange.to)
                                },
                                allCases: tenants[tenant].hasAll
                            } ];
                            entry.referenceAreaFrom = passedRange.from;
                            entries.push( entry );
                        }

                        if( ['ERROR', 'WARNING'].includes(action.type) ){
                            entries.push( entry );
                        }
                    }
                }
            }

        }
    }

    context.result.entries = entries;
    context.result.tasks = tasks;
    context.result.patients = patients;
    context.result.activitiesAutoCreate = activitiesAutoCreate;
}

/**
 * @method trigger
 * @public
 *
 * single entry point for new rule engine do all processing in sequence of synchronous/asynchronous steps
 *
 * @param {Object} context   - execution context including data type, entry data or data of activities that triggers rule, only one entry point for all
 * reference areas: ENTRY, APK, SCHEIN and period, all will be processed at once
 *
 * @returns {Promise<Object>} - once finished returns object with pending actions
 */
async function trigger( context ){
    if( !context.type || !context.patientId ){
        log( `trigger: not properly populated ${context}`, 'error' );
        throw new Error('wrong context');
    }

    let tenant = context.tenantId;

    //one time setup db connection to particular database identified by tenantId
    let [err] = await formatPromiseResult(
        initTenant( tenant, tenants, context )
    );
    if( err ){
        log( `trigger: error initializing tenant ${tenant}: ${err.stack || err}`, 'error' );
        throw err;
    }

    // first time get all active rule sets and split them across reference areas, also do other ruleSet related operations
    // like collecting affected attributes, this information is cached and can be repopulated when context.dropCache === true
    if( !tenants[tenant].ruleSets || context.dropCache ){
        [err] = await formatPromiseResult( getActiveRuleSets( tenant, tenants ) );
        if( err ) {
            log( `trigger: error getting ruleSets ${tenant}: ${err.stack || err}`, 'error' );
            throw err;
        }
    }

    //some system can not have active ruleSets so return earlier
    if( ( !tenants[tenant].ruleSets.entry.length && !tenants[tenant].ruleSets.apk.length &&
        !tenants[tenant].ruleSets.schein.length && !tenants[tenant].ruleSets.period.length ) ||
        ( context.type === 'caseOpen' && tenants[tenant].hasCaseOpen === false )
    ){
        return {
            patientId: context.patientId,
            caseFolderId: context.caseFolderId,
            result: {
                removeQueries: [],
                entries: []
            }
        };
    }

    //NOTE: all followed functions are mutates context object, so it is main store point of execution


    // identify system wide cross casefolders and cross locations settings
    [err] = await formatPromiseResult(
        getCrossUsageSettings( tenant, tenants, context )
    );
    if( err ) {
        log( `trigger: error getting invoiceconfiguration: ${err.stack || err}`, 'error' );
        throw err;
    }


    // for activity based triggers identify from which casefolders affected activities should be collected and also
    // types+additionalTypes of those casefolders (!very important used for selecting rule sets)
    if( ['activity', 'caseOpen', 'task'].includes(context.type) ){
        [err] = await formatPromiseResult(
            findCaseFolders( tenant, tenants, context )
        );
        if( err ) {
            log( `trigger: error getting casefolders: ${err.stack || err}`, 'error' );
            throw err;
        }
    }

    // further specifying casefolder types for special cases and non activity based triggers (e.g. patient data change came from patient-process)
    switch( context.type ){
        case 'patient':
            context.caseTypes = [ 'PATIENT' ];
            break;
        case 'casefolder':
            context.caseTypes = [ 'CASEFOLDER' ];
            break;
        case 'task':
            context.caseTypes = [ 'TASK' ];
            break;
        case 'caseOpen':
            //here also used info from function above
            context.caseTypes = [ ...(context.caseTypes || []), 'PATIENT' ]; //to select entry reference areas
            break;
    }

    //if no need of cross locations and locationId provided use it for selecting activities,
    // otherwise take from all locations to get set of scheins per location
    context.locations = ( !context.combineScheins && context.locationId ) ? [context.locationId] : [];
    let affectedActivities = [],
        continuousActivities = [];

    //for activity based triggers get all possible activities this set will be further filter out for each reference area time ranges
    context.activityBasedRules = !( COLLECTION_DATA_TYPES.includes(context.type) );
    if( context.activityBasedRules ){
        [err, affectedActivities] = await formatPromiseResult(
            getAffectedActivities( tenant, tenants, context )
        );
        if( err ) {
            log( `trigger: error getting activities: ${err.stack || err}`, 'error' );
            throw err;
        }
        if( !affectedActivities.length && !(context.preparedActivities && context.preparedActivities.length)){
            return {
                patientId: context.patientId,
                caseFolderId: context.caseFolderId,
                result: {
                    removeQueries: [],
                    entries: []
                }
            };
        }
        [err, continuousActivities] = await formatPromiseResult(
            getContinuousActivities( tenant, tenants, context, affectedActivities )
        );
        if( err ) {
            log( `trigger: error getting continuous activities: ${err.stack || err}`, 'error' );
            throw err;
        }
        context.continuousActivities = continuousActivities;

        //get most recent scheins per location and filter out affected activities by active scheins locations
        getActiveScheins( affectedActivities, context );
        if( context.combineScheins && Object.keys( context.scheins ) ){
            context.locations = Object.keys( context.scheins );
            affectedActivities = affectedActivities.filter( el => context.locations.includes( el.locationId.toString() ) );
        }

    }

    if( context.preparedActivities && context.preparedActivities.length ){
        let affectedActivitiesIds = affectedActivities.map( el => el._id.toString() ),
            preparedFiltered = context.preparedActivities.filter( el => !affectedActivitiesIds.includes( el._id.toString() ) ) ;

        if( preparedFiltered.length ){
            affectedActivities = [ ...affectedActivities, ...preparedFiltered ];
            //ensure timestamp is a date (mainly for preparedActivities)
            affectedActivities = affectedActivities.map( el => {
                el.timestamp = new Date( el.timestamp );
                return el;
            });
            affectedActivities.sort( (a, b) => b.timestamp - a.timestamp );
        }
    }

    // extend affected activities by patient, location, employee data
    // e.g. patientId :: ObjectId will be transformed to patientId :: Object with all needed attributes used in rules
    for( let collection of ['patient', 'location', 'employee'] ){ //eslint-disable-line no-unused-vars
        if( context.activityBasedRules ) {
            [err] = await formatPromiseResult(
                addCollection( tenant, tenants, collection, affectedActivities, context )
            );
            if( err ) {
                log( `trigger: error extending activities by ${collection} data ${context.patientId}: ${err.stack || err}`, 'error' );
                throw err;
            }
        }

        //also entry data need to be extended
        [err] = await formatPromiseResult(
            addCollection( tenant, tenants, collection, [ context.data ], context )
        );
        if( err ) {
            log( `trigger: error extending entry data by ${collection} data ${context.patientId}: ${err.stack || err}`, 'error' );
            throw err ;
        }
    }


    //for each reference ares identify time ranges for filtering affected activities
    getTimeRangesForAreas( affectedActivities, context );

    //get affected codes in time range for areas
    getAffectedCodesTypes( affectedActivities, context );


    //processing of result of rule validations

    context.result = {};

    //where all validation occurs: each selected rule executed on each affected activity as it be ENTRY rule

    if( !context.preparedActivities || !context.preparedActivities.length ){
        validateRuleSets( tenant, tenants, affectedActivities, ['entry', ...PERIOD_AREAS], context );
    } else {
        let index = 0;
        for ( let activityData of affectedActivities ){ //eslint-disable-line no-unused-vars
            if( !context.preparedActivities.some( el => el._id.toString() === activityData._id.toString() ) ){
                //not in list of prepared
                continue;
            }

            context.data = JSON.parse( JSON.stringify( activityData ) );
            context.data.timestamp = moment( activityData.timestamp ).toDate();
            context.areas.entry.range = {
                from: context.data.timestamp,
                to: context.data.timestamp
            };
            context.areas.entry.codes = [ context.data.code ].filter( Boolean );
            context.areas.entry.actTypes = [ context.data.actType ].filter( Boolean );

            //for one entry run all reference areas but only if there are several prepared activities
            if( index === 0 ){
                validateRuleSets( tenant, tenants, affectedActivities, ['entry', ...PERIOD_AREAS], context );
            } else {
                validateRuleSets( tenant, tenants, affectedActivities, ['entry'], context );
            }
            index++;
        }
    }

    //processing of result of rule validations

    buildRemoveRuleLogQuery( tenant, tenants, context );
    buildActions( tenant, tenants, affectedActivities, context );

    // result of rule engine execution is stored in context.result


    return {
        hasAll: tenants[tenant].hasAll,
        patientId: context.patientId,
        caseFolderId: context.caseFolderId,
        result: context.result
    };
}



module.exports = {
    log,
    trigger
};