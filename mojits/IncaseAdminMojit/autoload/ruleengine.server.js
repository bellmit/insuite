/**
 * User: do
 * Date: 26/11/15  13:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'dcruleengine', function( Y, NAME ) {

        const Prom = require( 'bluebird' ),
            _ = require( 'lodash' ),
            moment = require('moment' ),
            getObject = Y.doccirrus.commonutils.getObject,
            { formatPromiseResult } = require( 'dc-core' ).utils;

        function everyAsync( arr, fn, context, notStop, notOperator ) {
            return new Prom( function( resolve, reject ) {
                var i = 0, valid = true;

                function next() {
                    if( i >= arr.length ) {
                        resolve( valid );
                    } else {
                        fn.call( context, arr[i], notOperator ).then( function( results ) {
                            let result = (results && typeof results.result !== 'undefined') ? results.result : results ;
                            if (context.rule.triggeredBy && results && results.triggeredBy) {
                                context.rule.triggeredBy = context.rule.triggeredBy.concat(results.triggeredBy);
                                context.rule.multiLocations = context.rule.multiLocations || results.multiLocations;
                            }

                            i++;
                            if( !result ) {
                                return resolve( false );
                            }
                            next();
                        } ).catch( reject );
                    }
                }

                if( !Array.isArray( arr ) || 0 === arr.length ) {
                    return resolve( valid );
                }

                next();
            } );
        }

        function someAsync( arr, fn, context, notStop, notOperator) {
            return new Prom( function( resolve, reject ) {
                var i = 0, valid = false;

                function next() {
                    if( i >= arr.length ) {
                        resolve( valid );
                    } else {
                        fn.call( context, arr[i], notOperator ).then( function( results ) {
                            let result = (typeof results.result !== 'undefined') ? results.result : results ;
                            if (context.rule.triggeredBy && results.triggeredBy) {
                                context.rule.triggeredBy = context.rule.triggeredBy.concat(results.triggeredBy);
                                context.rule.multiLocations = context.rule.multiLocations || results.multiLocations;
                            }
                            i++;
                            if( result ) {
                                if( notStop ) {
                                    valid = true;
                                } else {
                                    return resolve( true );
                                }
                            }
                            next();
                        } ).catch( reject );
                    }
                }

                if( !Array.isArray( arr ) || 0 === arr.length ) {
                    return resolve( valid );
                }

                next();
            } );
        }

        function clone( obj ) {
            return JSON.parse( JSON.stringify( obj ) );
        }

        function ensureIsArray( criterion ) {
            if( !Array.isArray( criterion ) ) {
                return [criterion];
            }
            return criterion;
        }

        function getIntersections( val, criterion ) {
            criterion = ensureIsArray( criterion );
            val = ensureIsArray( val );
            return _.intersection( val, criterion ).length;
        }

        const operators = {
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
                let matches = getIntersections( val, criterion );
                return matches > 0;
            },
            $nin: function( val, criterion ) {
                let matches = getIntersections( val, criterion );
                return matches === 0;
            },
            $all: function( val, criterion ) {
                let matches = getIntersections( val, criterion );
                return matches === Array.isArray( criterion ) ? criterion.length : 1;
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

        const factBase = {
            run: function( criteria, options, notOperator ) {
                return Prom.resolve( this.beforeValidation( clone( criteria ), options ) ).then( criteria => {
                    if( this.isLazy( options ) ) {
                        return Prom.resolve( this.lazyTest( criteria, options, notOperator ) );
                    }
                    return this.test( criteria, options, notOperator );
                } );
            },
            beforeValidation: function( criteria ) {
                return criteria;
            },
            isLazy: function() {
                return false;
            },
            checkEntry: function( criteria, data, notOperatorClause, ruleSetName ) {
                if( ( data.status && !data.taskRule && !data.patientRule && !( ['VALID', 'APPROVED', 'BILLED'].includes( data.status ) ) ) || ( !data.dob && data.importId ) ){
                    Y.log( 'skipped due to status or importId..', 'debug', NAME );
                    return false;
                }
                let result = Object.keys( criteria ).every( path => {
                    if( !path || [ 'undefined', 'null' ].includes(path) ){ //for some failed cases produced by issue in rule editor it can be null
                        Y.log( `checkEntry: found incorrect criteria key: ${path} in ${ruleSetName}`, 'error', NAME );
                        return false;
                    }

                    let val,
                        criterion,
                        operators = [],
                        notOperator = false;

                    if('$or' === path) {
                        let orData = criteria[path],
                            orResult = false;
                        orData.forEach( orClause => {
                           let orPath = Object.keys(orClause)[0];

                           val = getObject( orPath, data );
                           criterion = orClause[orPath];
                           operators = this.findOperators( criterion );
                           orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                        } );
                        return orResult;
                    } else if( 'patientId.partnerIds.partnerId' === path || 'partnerIds.partnerId' === path ) {
                        let subPath = ('patientId.partnerIds.partnerId' === path) ? 'patientId.partnerIds' : 'partnerIds',
                            orData = (getObject( subPath, data ) || []).map( function(el) {return el.partnerId; } ),
                            criterion = criteria[path],
                            operators = this.findOperators( criterion ),
                            orResult = false;

                        orData.forEach( val => {
                            orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                        } );
                        return orResult;
                    } else if( 'patientId.partnerIds.licenseModifier' === path || 'partnerIds.licenseModifier' === path ) {
                        let subPath = ('patientId.partnerIds.licenseModifier' === path) ? 'patientId.partnerIds' : 'partnerIds',
                            DQS = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                            orData = (getObject( subPath, data ) || []).map( function(el) {return DQS === el.partnerId && false === el.isDisabled && el.licenseModifier; } ),
                            criterion = criteria[path],
                            operators = this.findOperators( criterion ),
                            orResult = false;
                        orData.forEach( val => {
                            orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                        } );
                        return orResult;
                    } else if( ['fk5036Set.fk5036', 'fk5035Set.fk5035'].includes( path ) ) {
                        let pathArr = path.split( '.' ),
                            orData = (getObject( pathArr[0], data ) || []).map( function( el ) {
                                return el[pathArr[1]];
                            } ),
                            criterion = criteria[path],
                            operators = this.findOperators( criterion ),
                            orResult = false;

                        if( _.isEqual( criterion, {'$exists': false} ) ) {
                            return !(orData.length);
                        }

                        orData.forEach( val => {
                            orResult = orResult || operators.every( operator => operator( val, criterion && criterion.$options ) );
                        } );
                        return orResult;
                    } else {
                        if ( path === 'dob' || path === 'patientId.dob' ){
                            val = moment( getObject( path, data ) ).toISOString();
                        } else {
                            val = getObject( path, data );
                        }
                        if ( 'billingFactorValue' === path && val ) {
                            val = Number.parseFloat( val );
                        }

                        criterion = criteria[path];

                        if(criterion && criterion.$not && typeof criterion.$not === 'object'){
                            notOperator = true;
                            criterion = criterion.$not;
                        }

                        operators = this.findOperators( criterion );
                    }


                    if( !operators.length ) {
                        return false;
                    }

                    let result = operators.every( operator => operator( val, criterion && criterion.$options ) );
                    if(notOperator){
                        return !result;
                    } else {
                        return result;
                    }

                } );
                return notOperatorClause ? !result : result;
            },
            test: function( criteria, options, notOperator ) {
                let
                    data = options.data,
                    ruleSetName = options && options.originalRuleSet && `${options.originalRuleSet.description} (${options.originalRuleSet._id})`;

                if( 'object' !== typeof data ) {
                    return Prom.reject( Error( 'could not test criteria' + criteria + ' because no data passed' ) );
                }
                if( Array.isArray( data ) ) {
                    return Prom.resolve( data.some( d => this.checkEntry( criteria, d, notOperator, ruleSetName ) ) );
                } else {
                    return Prom.resolve( this.checkEntry( criteria, data, notOperator, ruleSetName ) );
                }
            },
            lazyTest: function() {
                return false;
            },
            findOperators: function( criterion ) {
                const
                    ops = [],
                    operators = this.operators;

                //rewind $compDate
                if( 'object' === typeof criterion && criterion.$compDate ){
                    criterion = criterion.$compDate;
                    for (let [key, value] of Object.entries(criterion)) {
                        criterion[key] = moment( value, 'DD.MM.YYYY' ).toISOString();
                    }
                }

                if( _.isString( criterion ) || _.isNumber( criterion ) || _.isBoolean( criterion ) ) {
                    ops.push( function( val ) {
                        return operators.$eq( val, criterion );
                    } );
                } else if( _.isPlainObject( criterion ) ) {
                    let options = criterion && criterion.$options;
                    Object.keys( criterion ).forEach( key => {
                        if( operators[key] ) {
                            if( options ) {
                                ops.push( function( val, options ) {
                                    return operators[key]( val, criterion[key], options );
                                } );
                            } else {
                                ops.push( function( val ) {
                                    return operators[key]( val, criterion[key] );
                                } );
                            }

                        }
                    } );
                }

                if( (!ops.length && _.isPlainObject( criterion )) || Array.isArray( criterion ) ) {
                    Y.log( `Not found operator for criterion ${JSON.stringify(criterion)}`, 'warn', NAME );
                    ops.push( function( val ) {
                        return operators && operators.$eqDeep( val, criterion );
                    } );
                }

                return ops;
            }

        };

        function createFact( name, prototype, options ) {
            options = options || {};
            return Object.create( Object.assign( {}, factBase, prototype || {} ), {
                name: {
                    value: name
                },
                operators: {
                    value: Object.assign( {}, operators, options.operators || {} )
                },
                options: {
                    value: options
                }
            } );
        }

        function execValdiation( validation, notOperator ) {
            /*jshint validthis:true */

            const
                contextParts = validation.context.split( '.' ),
                factName = contextParts[0],
                criteria = validation.criteria,
                factValidator = this.engine.getFact( factName );

            if( !factValidator || !criteria ) {
                Y.log( 'could not find fact or criteria is not given', 'error', NAME );
                return false;
            }

            return factValidator.run( criteria, Object.assign( {}, this.options, {originalRuleSet: this.ruleSet} ), notOperator );
        }

        function iterateValidationClauses( initalClause, context ) {
            function iterate( clause, notOperator ) {
                if( Array.isArray( clause.$and || clause ) && !notOperator ) {
                    return everyAsync( clause.$and || clause, iterate, context, undefined, notOperator );
                } else if( Array.isArray( clause.$and || clause ) && notOperator ) {
                    return someAsync( clause.$and || clause, iterate, context, true, notOperator );
                } else if( Array.isArray( clause.$or ) && !notOperator ) {
                    return someAsync( clause.$or, iterate, context, true, notOperator );
                } else if( Array.isArray( clause.$or ) && notOperator ) {
                    return everyAsync( clause.$or, iterate, context, undefined, notOperator );
                } else if( Array.isArray( clause.$not ) ) {
                    return everyAsync( clause.$not, iterate, context, true, true );
                } else {
                    return execValdiation.call( context, clause, notOperator );
                }
            }

            return iterate( initalClause );
        }

        /**
         * get time ranges if day separation is counted
         * @param {Object}  options
         * @param {Object}  options.user
         * @param {Object}  options.baseQuery - initial query to get all activities in time range for patient|casefolder etc.
         * @param {Object}  options.referenceAreaOptions.splitByQuery - aditional query to get day separations (it extends base query)
         *
         * @returns {Array<Object>}  array of time ranges or [null] if there are no day separations
         */
        async function splitReferenceArea( options ) {
            if( !options || !options.referenceAreaOptions || !options.referenceAreaOptions.splitByQuery ) {
                return [null];
            }

            let [err, activities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: options.user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        $and: [
                            options.baseQuery,
                            options.referenceAreaOptions.splitByQuery
                        ]
                    },
                    options: {
                        lean: true,
                        select: {
                            _id: 1,
                            timestamp: 1
                        },
                        sort: {timestamp: -1},
                        quiet: true
                    }
                } )
            );
            if( err ){
                Y.log( `splitReferenceArea: error getting activities: ${err.stack || err}`, 'error', NAME );
            }

            if( !activities.length ) {
                return [null]; // no need to split
            }
            const
                len = activities.length,
                startOfDay = options.referenceAreaOptions.from,
                endOfDay = options.referenceAreaOptions.to;
            let
                apkTimeRanges = activities.map( ( treatment, idx ) => {
                    return {
                        $gte: treatment.timestamp,
                        $lt: idx === len - 1 ? endOfDay : activities[idx + 1].timestamp
                    };
                } );

            apkTimeRanges.unshift( {
                $gte: startOfDay,
                $lt: activities[len - 1].timestamp
            } );

            //normalize dates
            apkTimeRanges = apkTimeRanges.map( range => ( { $gte: moment( range.$gte ).toISOString(), $lt: moment( range.$lt ).toISOString() } ));

            return apkTimeRanges;
        }

        function createRuleEngine( options ) {
            if( 'function' !== typeof options.getRuleSets ) {
                throw Error( 'getRuleSet must be specified' );
            }
            const
                ruleEngine = Object.create( {
                    addFact: function( fact ) {
                        if( !this.facts[fact.name] ) {
                            this.facts[fact.name] = fact;
                        }
                    },
                    getFact: function( name ) {
                        return this.facts[name];
                    },
                    execRuleSet: async function( ruleSet, options ) {
                        let
                            context = {},
                            filterRulesByCode = options.referenceArea !== 'ENTRY', //TODO check patient, task, casefolder rules
                            codesToMatch = _.uniq( options.codes || []).sort(),
                            actTypesToMatch = _.uniq( options.actTps || []).sort(),
                            match = (arr1, arr2) => { return arr2.some( el => arr1.indexOf(el) !== -1 ); };

                        if( !options.stat ){
                            options.stat = {
                                totalSets: 0,
                                totalRules: 0,
                                processedRules: 0,
                                processedByCode: 0,
                                processedByRequired: 0,
                                processByTypeOnly: 0,
                                skippedNotActive: 0,
                                skipped: 0,
                                forcedMissedMeta: 0,
                                forcedFuzzy: 0
                            };
                        }
                        options.stat.totalSets += 1;

                        if( options && 'PERIOD' === options.referenceArea ) {
                            //calculate period window
                            let {startDate, endDate} = Y.doccirrus.ruleutils.getPeriodForRuleSet( ruleSet, options.referenceAreaOptions.timestamp );

                            options.baseQuery = {
                                locationId: options.referenceAreaOptions.locationId
                            };

                            if( !options.allCases){
                                options.baseQuery.caseFolderId = options.caseFolderId;
                            } else {
                                options.baseQuery.patientId = options.patientId;
                            }

                            ruleSet.periodQuery = { $gte: startDate.toISOString(), $lt: endDate.toISOString() };
                            if( ruleSet.metaActTypes && ruleSet.metaActTypes.length ){
                                options.baseQuery.actType = { $in: ruleSet.metaActTypes };
                            }
                            if( !ruleSet.metaFuzzy && ruleSet.metaActCodes && ruleSet.metaActCodes.length ){
                                options.baseQuery.code = { $in: ruleSet.metaActCodes };
                            }
                        }

                        let [err, timeRanges] = await formatPromiseResult( splitReferenceArea( options ) );
                        if( err ){
                            Y.log( `execRuleSet: error obtaining timeRanges ${err.stack || err}`, 'error', NAME );
                        }



                        let passedRules = [];
                        for( let rule of ruleSet.rules ) {
                            options.stat.totalRules += 1;
                            if( !rule.isActive ) {
                                options.stat.skippedNotActive += 1;
                                continue;
                            }
                            if( ruleSet.metaFuzzy === true ){
                                options.stat.forcedFuzzy += 1;
                            } else if ( filterRulesByCode ) {
                                let
                                    actTypesToCheck = rule.metaActTypes || [],
                                    ruleCodes = [...(rule.metaCodes || [])],
                                    requiredCodes = [...(rule.metaRequiredCodes || [])],
                                    codesToCheck = [...ruleCodes, ...requiredCodes];

                                //if codes are defined in activities that selected as affected activities then try to match with each rule in set
                                if( actTypesToMatch.length ){
                                    let
                                        actTypesMatch = match(actTypesToCheck, actTypesToMatch),
                                        codesMatch = match(codesToCheck, codesToMatch);
                                    //rule has meta actTypes(and optionally codes)
                                    if( actTypesMatch && codesMatch ){
                                        options.stat.processedByCode += 1;
                                    } else if( !ruleCodes.length && requiredCodes.length && !match(requiredCodes, codesToMatch)){
                                        options.stat.processedByRequired += 1;
                                    } else if( !codesToCheck.length && match(actTypesToCheck, actTypesToMatch)){
                                        options.stat.processByTypeOnly += 1;
                                    } else {
                                        Y.log( `Rule skipped due to code mismatch ${ruleSet._id}/${rule.ruleId}, looking for ${actTypesToMatch}/${codesToMatch} in ${actTypesToCheck}/${codesToCheck}`, 'debug', NAME );
                                        options.stat.skipped += 1;
                                        continue;
                                    }
                                } else if( !rule.metaActTypes && !rule.metaCodes && !rule.metaRequiredCodes ){
                                    //should not goes here, but to not lose rule lets process this case
                                    Y.log( `Metadata not set on rule level ${ruleSet._id}/${rule.ruleId}`, 'warn', NAME );
                                    options.stat.forcedMissedMeta += 1;
                                }

                            }

                            options.stat.processedRules += 1; //processed by either code match or any forced reason

                            let timeRangeResults = [];
                            if( rule.validationsJS ) {
                                let fn;

                                try {
                                    fn = eval( rule.validationsJS ); //eslint-disable-line no-eval
                                } catch( e ) {
                                    Y.log( `execRuleSet: Could not eval validationsJs: ${e.stack||e}`, 'error', NAME );
                                    Y.log( `execRuleSet rule.validationsJs: ${rule.validationsJS}`, 'error', NAME );
                                    continue;
                                }

                                // if patient data needed for non ENTRY rule types use following e.g.:
                                //
                                // let patientData = options.cache && options.cache.patient && {
                                //     'patientId.age': moment().diff( moment( options.cache.patient.dob ), 'years' ),
                                //     'patientId.gender': options.cache.patient.gender
                                // } || {};
                                //
                                // and next path these data along with options.affectedActivities
                                //
                                // let result = fn( options.affectedActivities.map( el => ( {...el, ...patientData} ) ) );

                                let results;
                                for( let timeRange of timeRanges ) {
                                    let rangeQuery = timeRange ? timeRange : ruleSet.periodQuery ? ruleSet.periodQuery : null,
                                        filteredActivities = JSON.parse(JSON.stringify(options.affectedActivities)) || [];
                                    if( rangeQuery ) {
                                        filteredActivities = filteredActivities.filter( el => {
                                            let timestamp = new Date( el.timestamp );
                                            return new Date( rangeQuery.$gte ) <= timestamp && timestamp < new Date( rangeQuery.$lt );
                                        } );
                                    }

                                    let filteringByCasefolder = [];
                                    if( !( options.originalRuleSet && options.originalRuleSet.caseFolderType &&  options.originalRuleSet.caseFolderType.length &&
                                           options.originalRuleSet.caseFolderType.includes("ALLCASES") ) ){

                                        if( options.referenceAreaOptions.caseFolderIds && options.referenceAreaOptions.caseFolderIds.length ) {
                                            filteringByCasefolder = options.referenceAreaOptions.caseFolderIds;
                                        } else if( options.caseFolderId ){
                                            filteringByCasefolder = [ options.caseFolderId ];
                                        }
                                    }

                                    if( filteringByCasefolder.length ){
                                        filteredActivities = filteredActivities.filter( el => {
                                            return filteringByCasefolder.includes( el.caseFolderId );
                                        } );
                                    }

                                    let filteringByLocations = [];
                                    if( options.referenceAreaOptions.scheinLoacationsIds && options.referenceAreaOptions.scheinLoacationsIds.length ) {
                                        filteringByLocations = options.referenceAreaOptions.scheinLoacationsIds;
                                        rule.multiLocations = true;
                                    } else if( options.referenceAreaOptions.locationId ){
                                        filteringByLocations = [ options.referenceAreaOptions.locationId ];
                                    }

                                    if( filteringByLocations.length ){
                                        filteredActivities = filteredActivities.filter( el => {
                                            return filteringByLocations.includes( el.locationId );
                                        } );
                                    }

                                    try {
                                        results = fn( filteredActivities );
                                    } catch ( evalErr ) {
                                        Y.log( `execRuleSet: Could not evaluate rules: ${evalErr.stack||evalErr}`, 'error', NAME );
                                    }

                                    if( results && results.result ) {
                                        rule.triggeredBy = (results.triggeredBy || []).map( el => el.id );
                                        timeRangeResults.push( true );
                                    }
                                }
                            } else {
                                for( let timeRange of timeRanges){
                                    rule.triggeredBy = [];
                                    options.timeRange = timeRange;
                                    context = {
                                        ruleSet: ruleSet,
                                        engine: this,
                                        options: options,
                                        rule: rule
                                    };

                                    let [err, result] = await formatPromiseResult( iterateValidationClauses( rule.validations, context ) );
                                    if( err ){
                                        Y.log( `execRuleSet: error iterating validation clause ${err.stack || err}`, 'error', NAME );
                                    }
                                    timeRangeResults.push( result );
                                }
                            }

                            if( timeRangeResults.some( Boolean ) ) {
                                passedRules.push( rule );
                            }
                        }

                        return {
                            ruleSet: ruleSet,
                            passedRules: passedRules
                        };
                    },
                    execute: function( execOptions ) {
                        const
                            self = this;

                        function start() {
                            return self.options.getRuleSets( execOptions ).map( execSingleRuleSet );
                        }

                        //  catch and log errors / broken rules, MOJ-10805
                        function execSingleRuleSet( ruleSet ) {
                            try {
                                return self.execRuleSet( ruleSet, execOptions );
                            } catch ( err ) {
                                Y.log( `Problem executing rule set ${ruleSet._id.toString()} from catalog ${ruleSet.fromCatalog}, "${ruleSet.description}": ${err.stack||err}`, 'error', NAME );
                                throw err;
                            }
                        }

                        function finished( results ) {
                            results = results.filter( Boolean );
                            const
                                endTime = Date.now(),
                                duration = endTime - new Date( execOptions.startProcessing );
                            let totalPassedSets = 0,
                                tortalPassedRules = 0;
                            results.forEach( el => {
                                let passedRulesCount = (el.passedRules || []).filter( el => (el.actions || []).length ).length ;
                                if( passedRulesCount ){
                                    totalPassedSets++;
                                }
                                tortalPassedRules += passedRulesCount;
                            } );
                            Y.log(`RuleAPI: referenceArea ${execOptions.referenceArea} finished with:
passed ruleSets: ${totalPassedSets}
passed rules: ${tortalPassedRules}
${( execOptions.stat ) ? 'stats: ' + JSON.stringify(execOptions.stat, null, 2) : ''}`, 'debug', NAME );

                            return {
                                duration,
                                startTime: execOptions.startTime,
                                endTime,
                                results
                            };
                        }

                        return Prom.resolve(
                            'function' === typeof options.beforeExecution ? options.beforeExecution( execOptions ) : undefined
                        ).then( start.bind( this ) ).then( finished );
                    }
                }, {
                    facts: {
                        value: []
                    },
                    options: {
                        value: options
                    }
                } );

            return ruleEngine;
        }

        Y.namespace( 'doccirrus' ).ruleengine = {

            name: NAME,
            createRuleEngine: createRuleEngine,
            createFact: createFact

        };
    },
    '0.0.1', {requires: ['dccommonutils']}
);

