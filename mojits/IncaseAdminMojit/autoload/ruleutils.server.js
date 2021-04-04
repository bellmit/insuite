/**
 * User: do
 * Date: 27/11/15  12:44
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'dcruleutils', function( Y, NAME ) {

        const
            toPrice = Y.doccirrus.schemas.activity.toPrice,
            uuid = require( 'node-uuid' ),
            Prom = require( 'bluebird' ),
            moment = require( 'moment' ),
            //runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
            //getModel = Prom.promisify( Y.doccirrus.mongodb.getModel ),
            _ = require( 'lodash' ),
            ObjectId = require( 'mongodb' ).ObjectID,
            { formatPromiseResult, promisifyArgsCallback } = require( 'dc-core' ).utils;

        function isPopulated( obj ) {
            return 'string' !== typeof obj && !(obj instanceof ObjectId);
        }

        function refineInsuranceStatus( patient ) {
            var insuranceStatus = {};

            if( !patient ) {
                throw Error( 'could not refine patients insuranceStatus' );
            }

            patient.insuranceStatus.forEach( status => {
                insuranceStatus[status.type] = status;
            } );

            patient.insuranceStatus = insuranceStatus;
            return patient;
        }

        function populateActivity( user, activity ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );
            var props = {};

            if( !isPopulated( activity.caseFolderId ) ) {
                props.caseFolder = runDb( {
                    user: user,
                    model: 'casefolder',
                    query: {
                        _id: activity.caseFolderId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 );
            }

            if( !isPopulated( activity.patientId ) ) {
                props.patient = runDb( {
                    user: user,
                    model: 'patient',
                    query: {
                        _id: activity.patientId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ).then( refineInsuranceStatus );
            }

            if( !isPopulated( activity.employeeId ) ) {
                props.employee = runDb( {
                    user: user,
                    model: 'employee',
                    query: {
                        _id: activity.employeeId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 );
            }

            if( !isPopulated( activity.locationId ) ) {
                props.location = runDb( {
                    user: user,
                    model: 'location',
                    query: {
                        _id: activity.locationId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 );

            }

            if( 0 === Object.keys( props ).length ) {
                return activity;
            }

            return Prom.props( props ).then( function( result ) {
                if( result.patient ) {
                    activity.patientId = result.patient;
                }
                if( result.location ) {
                    activity.locationId = result.location;
                }
                if( result.caseFolder ) {
                    activity.caseFolderId = result.caseFolder;
                }
                if( result.employee ) {
                    activity.employeeId = result.employee;
                }
                return activity;
            } );
        }

        function cachePatient( options ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );
            let promise;

            function getPatientHead() {
                return runDb( {
                    user: options.user,
                    model: 'patient',
                    query: {
                        _id: options.patientId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ).then( patient => {
                    if( options.data && options.data && options.data.deletedId && !patient) {
                        // skip during deleting
                        return Prom.resolve();
                    } else {
                        return Prom.resolve( refineInsuranceStatus(patient) );
                    }
                } );
            }

            if( 'SCHEIN' === options.referenceArea && 'PUBLIC' === options.referenceAreaOptions.caseFolderType ) {
                promise = new Prom( function( resolve, reject ) {

                    Y.doccirrus.api.kbv.scheinRelatedPatientVersion( {
                        user: options.user,
                        originalParams: {
                            rulePatientId: options.patientId,
                            scheinId: options.referenceAreaOptions.scheinId
                        },
                        callback: function( err, patient ) {
                            if( err ) {
                                if( '4500' === err.code && options.referenceAreaOptions.scheinId.toString() === ( options.data && options.data.deletedId.toString() ) ) {
                                    //skip on deleting SCHEIN itself
                                    Y.log( '4500 skipped for clearing rule log', 'info', NAME );
                                } else if( '4052' !== err.code ) {
                                    return reject( err );
                                } else {
                                    Y.log( 'Patient not found error (4052) skipped', 'warn', NAME );
                                }
                            }
                            resolve( patient );
                        }
                    } );

                } ).then( patient => {
                    if( !patient ) {
                        return getPatientHead();
                    }
                    if( Array.isArray(patient.insuranceStatus) ){
                        patient = refineInsuranceStatus(patient);
                    }
                    return JSON.parse( JSON.stringify( patient ) );
                } );
            } else {
                promise = getPatientHead();
            }

            return promise.then( patient => {
                if( !patient ) {
                    if( options.data && options.data && options.data.deletedId ) {
                        Y.log( 'Patient not found during remove activity ' + options.data.deletedId, 'warn', NAME );
                    } else {
                        throw Error( 'could not cache patient' );
                    }

                } else {
                    if( options.caseFolderOpen ){
                        patient.caseFolderOpen = true;
                    }
                    options.cache.patient = patient;
                }

            } );

        }

        function validateCount( $count, count ) {
            var left, right;

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

        function displayTimeDiff( duration ) {
            const
                date = new Date( duration );
            return ((date.getMinutes() * 60000) + (date.getSeconds() * 1000) + date.getMilliseconds()) + '(ms)';
        }

        function getMatchingSubDocIds( user, model, query ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );
            return runDb( {
                user: user,
                model: model,
                query: query,
                options: {
                    lean: true,
                    select: {
                        _id: 1
                    }
                }
            } ).map( doc => doc._id.toString() );
        }

        function calculateApks( user, query, periodIds = [] ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

            let queryIds = (query && query._id && query._id['$in'] || []), //eslint-disable-line
                pipeline = [
                    {$match: { $and: [
                        {"actType": {$eq: "TREATMENT"}},
                        {"_id": {"$in": [...queryIds, ...periodIds].map( el => new ObjectId( el) ) }}
                    ]}},
                    {$project: {
                        date: {$concat:[
                            {$substr:[{$year:"$timestamp"},0,4]},
                            {$substr:[{$month:"$timestamp"},0,4]},
                            {$substr:[{$dayOfMonth:"$timestamp"},0,4]},
                            '_',
                            //{ $ifNull: [ "$daySeparation", "00:00" ] }
                            { $cond: [ { $or: [ { $not: "$daySeparation"}, { $eq: ["$daySeparation", ''] } ] }, "00:00", "$daySeparation" ] }
                        ]}
                    }},
                    {$group: {_id: "$date", cnt:{$sum: 1}}},
                    {$count: 'cnt'}
                ];

            return runDb( {
                user,
                action: 'aggregate',
                pipeline: pipeline,
                model: 'activity'
            } );
        }

        function detectUnit( number ){ // reveret to ruleimportuils::getAgeInYears
            if( number && 'object' !== typeof number && !Number.isInteger( number ) ){
                if( !Number.isInteger( number ) && Number.isInteger( parseFloat(( number * 12 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 12 ).toFixed(5)), unit: 'months'};
                }
                if( !Number.isInteger( number ) && Number.isInteger( parseFloat(( number * 365 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 365 ).toFixed(5)), unit: 'days'};
                }
                if( Number.isInteger( parseFloat(( number * 52 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 52 ).toFixed(5)), unit: 'weeks'};
                }
            } else {
                return {value: 'object' !== typeof number && number || 0, unit: 'years'};
            }
        }

        function getBirthRangeFromAge( today, age ) {
            var date, range = {}, dateTo, tmpValue;
            var fromTolerance = age.fromTolerance || 0; // TARMED validations
            var untilTolerance = age.untilTolerance || 0; // TARMED validations

            if( _.isFinite( age ) ) {
                tmpValue = detectUnit(age);
                date = moment( today ).subtract( tmpValue.value , tmpValue.unit ).add( 1, 'day' );
                return {
                    $gt: date.clone().toISOString(),
                    $lte: today
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
                    $gt: date.toISOString(),
                    $lte: dateTo.toISOString()
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
                    $gt: date.toISOString(),
                    $lte: dateTo.toISOString()
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
                range.$lt = date.toISOString();
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
                range.$lt = date.toISOString();
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
                range.$gt = date.toISOString();
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
                range.$gt = date.toISOString();
            }
            if( age && age.$not && typeof age.$not === 'object' ) { // TARMED: age rules need to be able to exclude a range.
                return {
                    $not: getBirthRangeFromAge( today, age.$not )
                };
            }

            return 'object' === typeof range && Object.keys( range ).length ? range : null;
        }

        /**
         * @method findCaseFolderById
         * @public
         *
         * get single casefolder data or if configured list of PUBLIC casefolders
         *
         * @param {Object} user
         * @param {String} caseFolderId
         * @param {String} patientId
         * @param {Boolean} entryRule
         * @param {Boolean} combineGKV
         *
         * @returns {Promise<Array<{Object}>>>}  - arrays of casefolder objects (some fields: _id, type, additionalType, patientId )
         */
        async function findCaseFolderById( user, caseFolderId, patientId, entryRule, combineGKV ) {
            if( !caseFolderId ) {
                Y.log( 'findCaseFolderById: could not find caseFolder by id: no _id passed', 'debug', NAME );
                return [ {} ];
            }

            //firstly get casefolder by ID to get type
            let [err, casefolders] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    query: {_id: caseFolderId},
                    options: {
                        select: {type: 1, additionalType: 1, patientId: 1}
                    }
                } )
            );
            if( err ){
                Y.log( `findCaseFolderById: error getting casefolders ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( entryRule || casefolders && casefolders[0] && casefolders[0].type !== 'PUBLIC' ){
                //for now only PUBLIC casefolder can be combined and also current casefolder have to be used for the ENTRY rules
                return casefolders;
            }

            if( !combineGKV ) {
                return casefolders;
            }

            //in casefolders combined is ON, get all PUBLIC casefolders
            [err, casefolders] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    query: {type: 'PUBLIC', patientId},
                    options: {
                        select: {type: 1, additionalType: 1, patientId: 1}
                    }
                } )
            );
            if( err ){
                Y.log( `findCaseFolderById: error getting all PUBLIC casefolders ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            return casefolders;
        }

        function getRuleSets( user, query ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );
            return runDb( {
                user: user,
                model: 'rule',
                query: query,
                options: {
                    lean: true
                }
            } ).map( function( ruleSet ) {
                ruleSet.rules = Y.doccirrus.schemautils.recoverKey( ruleSet.rules ); //JSON.parse( ruleSet.rules );
                return ruleSet;
            } );

        }

        function getScheinRange( user, scheinId, sameQuarter, scheinDataOnDelete ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );
            let from, patientId, caseFolderId;

            if( !scheinId ) {
                return Prom.reject( Error( 'could not get next schein: no scheinId given' ) );
            }

            return runDb( {
                user: user,
                model: 'activity',
                query: {
                    _id: scheinId
                },
                options: {
                    select: { patientId: 1, caseFolderId: 1, timestamp: 1 },
                    lean: true
                }
            } ).get( 0 ).then( schein => {

                return new Prom( function( resolve, reject ) {

                    if( !schein && !scheinDataOnDelete && !scheinDataOnDelete.from ) {
                        reject( Error( 'could not find schein with id ' + scheinId ) );
                        return;
                    }

                    if( !schein && !scheinDataOnDelete && !scheinDataOnDelete.from ) {
                        reject( Error( 'could not find schein with id ' + scheinId ) );
                        return;
                    }

                    if( schein ) {
                        from = schein.timestamp;
                        patientId = schein.patientId;
                        caseFolderId = schein.caseFolderId;
                    } else {
                        from = scheinDataOnDelete.from;
                        patientId = scheinDataOnDelete.patientId;
                        caseFolderId = scheinDataOnDelete.caseFolderId;
                    }


                    Y.doccirrus.api.patient.getNextSchein( {
                        user: user,
                        originalParams: {
                            patientId: patientId,
                            caseFolderId: caseFolderId,
                            timestamp: from,
                            statuses: ['VALID', 'APPROVED', 'BILLED'],
                            nonGreedy: true
                        },
                        callback: function( err, scheine ) {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( scheine[0] );
                            }
                        }
                    } );
                } );

            } ).then( schein => {
                let to;
                if( !schein ) {
                    to = sameQuarter ? Y.doccirrus.commonutils.getEndOfQuarter( from ) : new Date();
                } else {
                    to = schein.timestamp;
                }

                let
                    toMoment = moment( to ),
                    fromMoment = moment( from );

                if( sameQuarter ) {
                    if( fromMoment.quarter() !== toMoment.quarter() || fromMoment.year() !== toMoment.year() ) {
                        return { from: from, to: Y.doccirrus.commonutils.getEndOfQuarter( from ) };
                    }
                }

                return { from: from, to: to };
            } );
        }

        function createQueue( options ) {
            Y.log( `createQueue: rule engine queue creation`, 'info', NAME );

            options = options || {};

            const
                running = [],
                queue = [];

            let name = options.name || 'unnamed',
                logPrefix = 'Queue ' + name + ': ',
                concurrency = options.concurrency || null,
                priorityMode = Boolean( options.priority ) || false,
                instance = Object.create( {
                    push: function( task ) {
                        let idx;

                        if( 'function' !== typeof task.run ) {
                            Y.log( 'could not push task to queue: run method not specified', 'error', NAME );
                            return;
                        }

                        task.uuid = uuid.v4();

                        if( priorityMode ) {
                            task.priority = task.priority || 0;
                            queue.some( ( t, index ) => {
                                if( t.priority > task.priority ) {
                                    idx = index;
                                    return true;
                                }
                            } );
                        }
                        idx = idx || (idx === 0 ? idx : queue.length - 1);
                        queue.splice( idx, 0, task );
                        this.invalidate();
                    },
                    invalidate: function() {
                        Y.log( logPrefix + 'invalidate queue: running ' + running.length + ' concurrency ' + concurrency, 'debug', NAME );
                        if( (!concurrency || running.length < concurrency) && queue.length ) {
                            this.start( queue.shift() );
                        }
                    },
                    start: function( task ) {
                        Y.log( logPrefix + 'starting next task ' + task.uuid, 'debug', NAME );
                        running.push( task );
                        Prom.resolve( task.run() )
                            .then( () => this.finished( task ) )
                            .catch( () => this.finished( task ) );
                    },
                    finished: function( task ) {
                        Y.log( logPrefix + 'task finished ' + task.uuid, 'debug', NAME );
                        const idx = running.indexOf( task );
                        if( idx > -1 ) {
                            running.splice( idx, 1 );
                        }
                        this.invalidate();
                    },
                    /**
                     * Discard the first running item, timed out
                     */
                    kick: function() {
                        Y.log( `Rule utils queue kicking timed out job, queue length: ${queue.length} running: ${running.length}`, 'warn', NAME );
                        if ( 0 === running.length ) { return; }
                        running.shift();
                    }
                }, {
                    concurrency: {
                        get: function() {
                            return concurrency;
                        },
                        set: function( val ) {
                            concurrency = val;
                            this.invalidate();
                        }
                    },
                    running: {
                        get: function() {
                            return running;
                        }
                    },
                    idle: {
                        get: function() {
                            return Boolean( running.length );
                        }
                    }
                } );

            return instance;
        }

        function getRemoveQueryFromExecOptions( execOptions ) {
            const
                base = {
                    referenceArea: execOptions.referenceArea,
                    patientId: execOptions.patientId
                };

            if( execOptions.referenceAreaOptions.caseFolderIds && execOptions.referenceAreaOptions.caseFolderIds.length ){
                base.caseFolderId = { $in: execOptions.referenceAreaOptions.caseFolderIds };
            } else {
                base.caseFolderId = execOptions.caseFolderId;
            }

            if( execOptions.referenceAreaOptions.locationId ){
                base.$or = [ {locationId: execOptions.referenceAreaOptions.locationId}, {locationId: {$exists: false}} ];
            } else {
                base.locationId = {$exists: false};
            }

            if( execOptions.referenceAreaOptions.from ) {
                base.referenceAreaFrom = execOptions.referenceAreaOptions.from;
            }

            if( execOptions.referenceAreaOptions.to ) {
                base.referenceAreaTo = execOptions.referenceAreaOptions.to;
            }

            if( execOptions.data && execOptions.data._id ) {
                base.factId = execOptions.data._id;
            }

            if( 'SCHEIN' === execOptions.referenceArea ) {
                base.factId = execOptions.referenceAreaOptions.scheinId;
            }

            return base;
        }

        function walkUpFrom( user, from, fn ) {
            const getModel = Prom.promisify( Y.doccirrus.mongodb.getModel );
            return getModel( user, 'rule', true ).then( model => {
                function find( id ) {
                    return new Prom( function( resolve, reject ) {
                        model.mongoose.findOne( { _id: new ObjectId( id ) }, function( err, doc ) {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( doc );
                            }
                        } );
                    } ).then( doc => {
                        return Prom.resolve( fn( doc ) ).then( () => doc );
                    } ).then( doc => {
                        if( !doc || null === doc.parent ) {
                            return;
                        }
                        return find( doc.parent );
                    } );
                }

                return find( from );
            } );
        }

        /**
         * Apply fn to all descendants of passed node
         * @param {Object}      user
         * @param {String}from  parent                              node id
         * @param {Function}    fn                                  callback
         * @param {Opbject}     options
         * @param {Boolean}     options.includeDirectories
         * @returns {Promise}
         */
        function walkDownFrom( user, from, fn, options ) {
            const getModel = Prom.promisify( Y.doccirrus.mongodb.getModel );
            options = options || {};
            return getModel( user, 'rule', true ).then( model => {
                function find( id ) {
                    return new Prom( function( resolve, reject ) {
                        model.mongoose.find( { parent: id }, function( err, docs ) {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( docs );
                            }
                        } );
                    } ).each( doc => {
                        if( doc.isDirectory ) {
                            if( options.includeDirectories ) {
                                return Prom.resolve( fn( doc ) ).then( () => find( doc._id.toString() ) );
                            } else {
                                return find( doc._id.toString() );
                            }
                        } else {
                            return Prom.resolve( fn( doc ) );
                        }
                    } );
                }

                return find( from );
            } );
        }

        function iterateCriteria( criteria, fn ) {
            if( Array.isArray( criteria ) ) {

                criteria.forEach( c => {
                    iterateCriteria( c, fn );
                } );

            } else if( 'object' === typeof criteria ) {
                Object.keys( criteria ).forEach( key => {
                    if( '$or' === key || '$and' === key ) {
                        iterateCriteria( criteria[key], fn );
                    } else {
                        fn( key, criteria );
                    }
                } );
            }
        }

        function cleanRuleLog( user, ruleLogQuery, callback ) {
            var stream, error = null;
            callback = callback || function( err ) {
                    if( err ) {
                        Y.log( `cleanRuleLog. error: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                };

            Y.doccirrus.mongodb.getModel( user, 'rulelog', true, modelCb );

            function modelCb( err, model ) {
                if( err ) {
                    Y.log( 'Error getting rulelog model ' + err.message, 'error', NAME );
                    callback( err );
                    return;
                }

                stream = model.mongoose.find( ruleLogQuery, {}, { timeout: true } ).stream();

                stream.on( 'data', function( rulelog ) {
                    stream.pause();
                    model.mongoose.remove( {_id: rulelog._id}, ( err, result ) => onRemovedRuleLog( err, result, rulelog ) );
                } ).on( 'error', function( err ) {
                    Y.log( 'Error removing rulelog ' + err.message, 'error', NAME );
                    error = err;
                } ).on( 'end', function() {
                    callback( error );
                } );

                function onRemovedRuleLog( err, result, rulelog ) {
                    if( err ) {
                        stream.destroy( err );
                        return;
                    }
                    if( result && result.ok && result.ok !== 1 ) {
                        Y.log( 'Failed to remove ' + JSON.stringify( rulelog ), 'warn', NAME );
                        stream.resume();
                        return;
                    }

                    if( rulelog.caseFolderId ) {
                        let
                            rulelogObj = JSON.parse( JSON.stringify( rulelog ) );
                        rulelogObj.removeOnly = true;
                        Y.doccirrus.api.rulelog.updateCaseFolderStats( {
                            user: user,
                            originalParams: {
                                caseFolderId: rulelog.caseFolderId
                            },
                            callback: ( err ) => {
                                if( err ) {
                                    stream.destroy( err );
                                    return;
                                }

                                //no need to debounce here because rulelogObj is always non empty, and we need to send such events in order to
                                // remove system messages
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'casefolder',
                                    action: 'get',
                                    query: {_id: rulelog.caseFolderId},
                                    option: {lean: true}
                                }, ( err, caseFolders ) => {
                                    if( err ) {
                                        stream.destroy( err );
                                        return;
                                    }
                                    stream.resume();

                                    //Y.doccirrus.communication.emitEventForUser( {
                                    //    targetId: user.identityId,
                                    Y.doccirrus.communication.emitEventForSession( {
                                        sessionId: user.sessionId,
                                        event: 'rulelogUpdated',
                                        msg: {
                                            data: {
                                                caseFolderId: rulelog.caseFolderId,
                                                caseFolder: caseFolders && caseFolders[0] || [],
                                                entries: _.flatten( [rulelogObj] )
                                            }
                                        }
                                    } );

                                } );
                            }
                        } );
                    } else {
                        stream.resume();
                    }
                }
            }
        }

        function getCatalog(user, activity ){
            return new Promise( (resolve, reject) => {
                Y.doccirrus.api.catalog.catalogCodeSearch({
                    user: user,
                    originalParams: {
                        "isASV": false,
                        "data": {
                            "_includeCatalogText": true
                        }
                    },
                    query: {
                        "term": activity.code,
                        "catalogs": [
                            {
                                "filename": activity.catalogRef,
                                "short": activity.catalogShort
                            }
                        ],
                        "locationId": activity.locationId,
                        "tags": []
                    },
                    callback: ( err, result ) => {
                        if( err){
                            return reject( err );
                        }
                        resolve( result );
                    }
                } );
            } );
        }

        function setActivityData( activity ){
            return new Promise( (resolve, reject) => {
                if( !activity.catalogShort) {
                    return resolve( activity );
                }
                Y.doccirrus.schemas.activity._setActivityData( {
                    initData: {
                        actType: activity.actType,
                        catalogShort: activity.catalogShort,
                        locationId: activity.locationId
                    },
                    entry: activity
                }, ( err, activityExtended ) => {
                    if( err ){
                        return reject( err );
                    }
                    resolve( activityExtended );
                } );
            });
        }

        /**
         * @method getEmployeeAndLocationForActivity
         * @public
         *
         * find appropriate employee and location for activity
         *
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         *
         * @returns {Promise} {locationId, emloyeeId, employeeName}
         */
        async function getEmployeeAndLocationForActivity( user, activity ) {
            const lastSchein = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein );

            let [ err, lastScheins ] = await formatPromiseResult(
                lastSchein( {
                    user,
                    query: {
                        patientId: activity.patientId,
                        locationId: activity.locationId,
                        timestamp: activity.timestamp,
                        caseFolderId: activity.caseFolderId
                    }
                } )
            );

            if( err ){
                Y.log( `getEmployeeAndLocationForActivity: error getting last schein ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            let casefolders;
            [ err, casefolders ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'get',
                    query: {
                        _id: activity.caseFolderId
                    },
                    options: {
                        select: { type: 1 }
                    }
                } )
            );

            if( err ){
                Y.log( `getEmployeeAndLocationForActivity: error getting case folder ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            let patients;
            [ err, patients ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'get',
                    query: {
                        _id: activity.patientId
                    }
                } )
            );

            if( err ){
                Y.log( `getEmployeeAndLocationForActivity: error getting patient ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            let defaultData;
            [ err, defaultData ] = await formatPromiseResult(
                Y.doccirrus.schemas.patient.getDefaultLocationAndEmployeeForPatient( patients && patients[0], lastScheins && lastScheins[0], casefolders && casefolders[0] && casefolders[0].type, user, true )
            );

            if( err ){
                Y.log( `getEmployeeAndLocationForActivity: error getting default employee ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            let employees;
            [ err, employees ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        _id: defaultData.employeeId
                    }
                } )
            );

            if( err ){
                Y.log( `getEmployeeAndLocationForActivity: error getting employee details ${err.stack || err}`, 'error', NAME );
                throw( err );
            }
            defaultData.employeeName = Y.doccirrus.schemas.person.personDisplay( employees && employees[0] );

            return defaultData;
        }

        async function prepareActivityData( user, activity ) {
            let
                result = {
                    timestamp: Date.now(),
                    patientId: activity.patientId,
                    status: "VALID",
                    attachments: []
                };

            let [err, employeeLocationData ] = await formatPromiseResult(
                getEmployeeAndLocationForActivity( user, activity )
            );

            if( err ){
                Y.log( `prepareActivityData: error getting default location and employee for activity ${err.stack || err}`, 'error', NAME );
            }

            result.locationId = employeeLocationData.locationId;
            result.employeeId = employeeLocationData.employeeId;
            result.employeeName = employeeLocationData.employeeName;

            return result;
        }

        function getInvoiceConfiguration( user, timestamp ){
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.invoiceconfiguration.invoicefactor( {
                    user,
                    data: {
                        timestamp: timestamp
                    },
                    callback( err, factor ){
                        if( err ) {
                            return reject( err );
                        }
                        resolve( factor );
                    }
                } );
            } );
        }

        async function setActivityPrice(user, activityData, activities){ //jshint ignore:line
            if( Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( activityData.code ) ) {
                let price,
                    linkedPercentage = 25;
                if( 'Punkte' === activities[0].actualUnit ) {
                    price = toPrice( activities[0].actualPrice, Y.doccirrus.schemas.activity.goaeInvoiceFactor, linkedPercentage / 100 );
                } else {
                    price = toPrice( activities[0].actualPrice, linkedPercentage / 100 );
                }
                activityData.price = price;
                activityData.linkedPercentage = linkedPercentage;

                return activityData;
            }

            let
                catalogShort = activityData.catalogShort,
                catalog = activityData.catalog,
                billingFactor = activityData.billingFactorValue,
                actualUnit = activityData.actualUnit,
                actualPrice = activityData.actualPrice,
                timestamp = activityData.timestamp || Date.now(),

                billingFactorValue,
                invoiceConfiguration,
                error;

            if( !billingFactor && 'EBM' === catalogShort ) { // applied only for EBM catalog
                [ error, invoiceConfiguration ] = await formatPromiseResult( //jshint ignore:line
                    getInvoiceConfiguration( user, timestamp )
                );
                if( error ){
                    throw error;
                }
                if( invoiceConfiguration && invoiceConfiguration.factor ){
                    billingFactorValue = invoiceConfiguration.factor;
                } else {
                    Y.log('Invoice factor not found for ' + JSON.stringify(timestamp), 'error', NAME );
                }
            } else {
                billingFactorValue = billingFactor;
            }

            if( billingFactorValue && 'EBM' === catalogShort ) {
                activityData.billingFactorValue = billingFactorValue;
            }

            if( 'string' === typeof billingFactorValue ) {
                billingFactorValue = Number.parseFloat( billingFactorValue );
            }
            if( 'UVGOÄ' === catalogShort || 'GebüH' === catalogShort ) { // jshint ignore:line
                // Does not depend of billingFactorValue
            }
            if( 'GOÄ' === catalogShort && 'Punkte' === actualUnit && catalog ) {
                activityData.price = toPrice( actualPrice, billingFactorValue, Y.doccirrus.schemas.activity.goaeInvoiceFactor );
            } else if( 'EBM' === catalogShort && 'Euro' === actualUnit ) {
                activityData.price = toPrice( actualPrice );
            } else {
                activityData.price = toPrice( actualPrice, billingFactorValue );
            }

            return activityData;
        }


        function catalogtextProcess( user, activityData, originalUserContent ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogtext',
                    action: 'get',
                    query: {
                        locationId: activityData.locationId,
                        catalogShort: activityData.catalogShort,
                        code: activityData.code
                    },
                    options: {
                        lean: true
                    }
                }, ( err, catalogtexts ) => {
                    if( err ) {
                        return reject( err );
                    }

                    if( !originalUserContent ) {
                        return resolve( catalogtexts );
                    }

                    // write back comment to catalog text
                    let changed = false, skip = false,
                        catalogtext;

                    if( catalogtexts && catalogtexts.length ) {
                        catalogtext = catalogtexts[0];
                        ( catalogtext.items && catalogtext.items || [] ).forEach( slot => {
                            if( slot.text === originalUserContent ) {
                                skip = true;
                                return;
                            }
                            if( !skip && !slot.text && !changed ) {
                                slot.text = originalUserContent;
                                changed = true;
                                return;
                            }
                        } );
                    } else {
                        changed = true;
                        catalogtext = {
                            locationId: activityData.locationId,
                            catalogShort: activityData.catalogShort,
                            code: activityData.code,
                            items: [
                                {text: originalUserContent}, {}, {}, {}, {}, {}, {}, {}, {}, {}
                            ]
                        };
                    }

                    if( changed ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'catalogtext',
                            action: 'upsert',
                            fields: ['locationId', 'catalogShort', 'code', 'items'],
                            data: Y.doccirrus.filters.cleanDbObject( catalogtext )
                        }, ( err ) => {
                            if( err ) {
                                Y.log( 'Error on upserting catalogtext: ' + err.message, 'error', NAME );
                                return resolve();
                            }
                            resolve( catalogtext );
                        } );
                    } else {
                        resolve( catalogtext );
                    }
                } );
            } );
        }

        async function addActivity( user, ruleData, callback ) { //jshint ignore:line
            const
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),

                errorCb = ( message, error ) => {
                    Y.log( message + error.message, 'error', NAME );
                    if( 'function' === typeof callback ) { return callback( error ); }
                },
                upsertActivityFn = async ( activityData ) => {
                    let
                        query = {
                            $and: [
                                { autoGenID: activityData.autoGenID },
                                { status: {$ne: 'CANCELLED' } }
                            ]
                        },
                        command = {
                            user,
                            model: 'activity',
                            action: 'upsert',
                            query,
                            options: {setOnInsert: true, omitQueryId: true},
                            useCache: false
                        };
                    if( activityData.periodOptions ){
                        if( activityData.periodOptions.periodStart ){
                            if( [ 'string', 'number' ].includes( typeof activityData.periodOptions.periodStart ) ){
                                activityData.periodOptions.periodStart =moment( activityData.periodOptions.periodStart );
                            }
                            query.$and = [...query.$and, {timestamp: {$gte: activityData.periodOptions.periodStart.toDate()}}];
                        }
                        if( activityData.periodOptions.periodEnd ){
                            if( [ 'string', 'number' ].includes( typeof activityData.periodOptions.periodEnd ) ){
                                activityData.periodOptions.periodEnd = moment( activityData.periodOptions.periodEnd );
                            }
                            query.$and = [...query.$and, {timestamp: {$lte: activityData.periodOptions.periodEnd.toDate()}}];
                        }
                        delete activityData.periodOptions;
                    }
                    if( activityData.referenceArea && activityData.referenceArea !== 'ENTRY' && !activityData.manualCreation ){
                        command.context = { _skipTriggerRules: true };
                    }
                    delete activityData.referenceArea;
                    delete activityData.manualCreation;

                    command.data = Y.doccirrus.filters.cleanDbObject( activityData );

                    let [ err, activityCreated ] = await formatPromiseResult( runDb( command ) );
                    if( err ) {
                        Y.log( `upsertActivityFn: Error on adding Form ${err.stack || err}`, 'error', NAME );
                        throw( err );
                    }
                    return activityCreated && activityCreated._id && activityCreated._id.toString();
                };


            let isCasefolder = (ruleData.ruleSetCaseFolder || []).includes( 'CASEFOLDER' ),
                isPatient = (ruleData.ruleSetCaseFolder || []).includes( 'PATIENT' ),
                isTask = (ruleData.ruleSetCaseFolder || []).includes( 'TASK' ),
                isAllCases = (ruleData.ruleSetCaseFolder || []).includes( 'ALLCASES' ),
                activities,
                error;

            let id = ( ( isPatient || isTask ) ? ruleData.caseFolderId : ruleData.triggeredBy[0] );

            if(!id){
                Y.log('addActivity: can\'t collect casefolder patient data... Skip...', 'debug', NAME);
                return callback();
            }

            [ error, activities ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: ( isCasefolder || isPatient || isTask )? 'casefolder' : 'activity',
                    action: 'get',
                    query: {_id: id},
                    options: {lean: true, limit: 1}
                } )
            );
            if( error ){
                return errorCb('Error on getting origin for activity ', error);
            }

            let activity = activities && activities[0] || {},
                foundPatient;

            if( activity.patientId ){
                [error, foundPatient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {_id: activity.patientId},
                        options: {lean: true, limit: 1}
                    } )
                );

                if( error ){
                    return errorCb('Error on getting patient for activity ', error);
                }
                foundPatient = foundPatient && foundPatient[0];
            }

            // specify that form is auto generated by rule engine
            let vendorId = {},
                activityData;

            vendorId.RULEENGINE = 1;

            if( isCasefolder || isPatient || isTask ){
                // if triggered by other then activity populate required data
                activity.caseFolderId = activity._id;
                activity.timestamp = new Date();
            }

            [ error, activityData ] = await formatPromiseResult( //jshint ignore:line
                prepareActivityData( user, activity )
            );
            if( error ){
                return errorCb('Error in preparing activity data ', error);
            }
            //this will completely remove rule engine for this activity
            //activityData.vendorId = JSON.stringify( vendorId );

            activityData.caseFolderId = isAllCases ? foundPatient.activeCaseFolderId :
                (isPatient || isTask) ? ruleData.caseFolderId :
                ( isCasefolder ? ruleData.triggeredBy[0] : activity.caseFolderId );

            if(!activityData.caseFolderId){
                Y.log('addActivity: can\'t find casefolder _id ... Skip...', 'debug', NAME);
                return callback();
            }

            let template = ruleData.template, currentCaseFolder = activityData.caseFolderId;

            if( template.comment ) {
                template.comment = template.comment.replace( /\|n\|/g, '\n' );
            }
            if( template.explanations ) {
                template.explanations = template.explanations.replace( /\|n\|/g, '\n' );
            }

            activityData.actType = template.actType;
            activityData.userContent = template.comment;

            activityData.autoGenID = ruleData.autoGenID;
            activityData.periodOptions = ruleData.periodOptions;
            activityData.referenceArea = ruleData.referenceArea;
            activityData.manualCreation = ruleData.manualCreation;

            if( template.catalogShort && ( "TREATMENT" === template.actType || "DIAGNOSIS" === template.actType ) ) {
                let catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: template.actType,
                    short: template.catalogShort
                } );
                if( catalog ) {
                    activityData.catalogShort = template.catalogShort;
                    activityData.catalogRef = catalog.filename;
                    activityData.catalog = true;
                }
            }

            switch( template.actType ) {
                case "TREATMENT":
                    activityData.explanations = template.explanations;
                    activityData.code = template.code;
                    break;
                case "DIAGNOSIS":
                    activityData.diagnosisCert = template.diagnosisCert;
                    activityData.code = template.code;
                    activityData.explanations = template.explanations;
                    break;
            }

            let ativitiesToCreate = [], numberToCreate = 1;
            if( template.toCreate && "TREATMENT" === template.actType ) {
                numberToCreate = template.toCreate;
            }

            //link new activity to activity that trigger rule
            if( !isCasefolder && !isPatient && template.linkActivities ) {
                activityData.activities = [activity._id];
            }

            let catalogData;
            if( ['TREATMENT', 'DIAGNOSIS'].includes( template.actType ) ) {
                [error, catalogData] = await formatPromiseResult( //jshint ignore:line
                    getCatalog( user, activityData )
                );
                if( error ) {
                    return errorCb( 'Error on getting catalog data ', error );
                }
            }

            catalogData = (catalogData || []).filter( el => el.seq === activityData.code );

            let updatedActivityData,
                originalUserContent = activityData.userContent;
            [ error, updatedActivityData ] = await formatPromiseResult( //jshint ignore:line
                setActivityData( catalogData.length ? Object.assign(catalogData[0], activityData) : activityData )
            );
            if( error ){
                return errorCb('Error setting catalog data for activity ', error);
            }
            activityData = Object.assign( activityData, updatedActivityData );


            if( !isCasefolder && !isPatient && 'TREATMENT' === activityData.actType ) {
                [ error, updatedActivityData ] = await formatPromiseResult( //jshint ignore:line
                    setActivityPrice( user, activityData, activities )
                );
                if( error ){
                    Y.log('Error on setting price in activity ' + error.message, 'error', NAME );
                } else {
                    activityData = updatedActivityData;
                }
            }


            if( "TREATMENT" === template.actType || "DIAGNOSIS" === template.actType ) {
                let catalogtexts;
                [ error, catalogtexts ] = await formatPromiseResult( //jshint ignore:line
                    catalogtextProcess( user, activityData, originalUserContent )
                );
                if( error ){
                    return errorCb('Error setting catalog data for activity ', error);
                }
                if( !activityData.userContent ) {
                    //populate from catalogtext
                    if( catalogtexts && catalogtexts[0] && catalogtexts[0].items && catalogtexts[0].items[0] && catalogtexts[0].items[0].text ) {
                        activityData.userContent = catalogtexts[0].items[0].text;
                    }
                }
            }

            for( let i = 0; i < numberToCreate; i++ ) {
                //disallow new activity trigger rule engine on first save for all types except ENTRY
                if( 'ENTRY' !== ruleData.referenceArea && true === template.autoCreate ) {
                    activityData = Object.assign( activityData, {processingType: 'rulegenerated'} );
                }

                //note that only applicable now for autoCreate === true
                if( template.autoCreate === true && template.filenameRegexp && activity.attachments && activity.attachments.length ){
                    ativitiesToCreate.push( Y.doccirrus.cardioutils.multiplyActivitiesByMedia( user, activity, upsertActivityFn, activityData, template.filenameRegexp, activityData.autoGenID) );
                } else {
                    ativitiesToCreate.push( upsertActivityFn( activityData ) );
                }
            }

            Promise.all( ativitiesToCreate ).then( ( activities ) => {
                let ids = _.flattenDeep( activities || [] ).join( ', ' );
                Y.log( `addActivity: Activity(es) created by rule  ${ids}`, 'info', NAME );

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'refreshCaseFolder',
                    msg: {
                        data: {
                            caseFolderId: currentCaseFolder
                        }
                    }
                } );

                if( 'function' === typeof callback ) {
                    return callback( null, ids );
                }
            } ).catch( err => {
                let
                    errorMessage = `${Y.doccirrus.i18n( 'activity-process.autoCreationError' )}\n` +
                        ( err.message || ( ( err.code ? `${err.code}: ` : '' ) + `${err.data || ''}` ) );

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    messageId: errorMessage,
                    msg: {
                        data: errorMessage
                    },
                    meta: {
                        level: 'ERROR'
                    }
                } );

                errorCb( 'Failed to add activity(es): ', err );
            } );

        }

        /**
         * @method getMeta
         * @public
         *
         * traverse rule validation tree and collect all unique codes and actTypes
         * as result returns list of found codes and act types for ruleSet
         * rules array mutated with internal meta data per each rule:
         *    "metaCodes" - used codes in particular rule (that not in count = 0)
         *    "metaActTypes" - all distinct activity types in particular rule
         *    "metaRequiredCodes" - codes in validation along with count = 0
         *
         * @param {Object} rules        note: this collection is mutated
         * @param {Object} ruleSet
         *
         * @returns {Object}            collected metadata for ruleSet
         */
        function getMeta( rules, ruleSet ) {
            var actTypes = [],
                actCodes = [],
                actOperations = [],
                criterias = [],
                metaCaseOpen = false;

            rules.forEach( function( rl ) {
                function getOperations( value, operations ) {
                    if( 'object' === typeof value && null !== value ) {

                        if( value instanceof Array ) {
                            value.forEach( function(el){
                                return getOperations( el, operations );
                            });
                        } else {
                            return getOperations( value[Object.keys(value)[0]], operations.concat( Object.keys( value ) ) );
                        }
                    } else {
                        return operations;
                    }
                }

                function getCriteriaValue( value, strictOperator ) {
                    var keys;
                    if( 'object' === typeof value && null !== value ) {

                        if (value instanceof Array ) {
                            return value;
                        } else {
                            if(strictOperator){
                                keys = [ strictOperator ];
                            } else {
                                keys = Object.keys(value).filter( function(el){ return el !== '\\\\$catalogShort' && el !== '\\\\$exists'; } );
                            }

                            return keys[0] ? getCriteriaValue( value[keys[0]] ) : [];
                        }
                    } else {
                        return [ value ];
                    }
                }

                function proccessCriteria( criteria, collectedCodes, collectedTypes ) {
                    let hasCount0 = false, value,
                        foundCode = false,
                        foundActType = false;
                    Object.keys( criteria ).forEach( function( criteriaKey ) {
                        if( criteriaKey === '\\\\$or' && criteria['\\\\$or'].length ){
                            criteria['\\\\$or'].forEach( orCriteria => proccessCriteria( orCriteria, collectedCodes, collectedTypes ) );
                        }
                        actOperations = actOperations.concat( getOperations( criteria[criteriaKey], [] ));
                        criterias.push( criteriaKey );
                        switch( criteriaKey ) {
                            case 'actType':
                                foundActType = true;
                                value = getCriteriaValue( criteria[criteriaKey] );
                                actTypes = actTypes.concat( value );
                                collectedTypes = collectedTypes.concat( value );
                                break;
                            case 'code':
                                foundCode = true;
                                value = getCriteriaValue( criteria[criteriaKey] );
                                actCodes = actCodes.concat( value );
                                collectedCodes = collectedCodes.concat( value );
                                break;
                            case '\\\\$count':
                                value = getCriteriaValue( criteria[criteriaKey], '\\\\$eq' );
                                hasCount0 = 0 === ( value && value[ 0 ] );
                                break;
                            case 'patientId\\\\-caseFolderOpen':
                                value = getCriteriaValue( criteria[criteriaKey], '\\\\$eq' );
                                metaCaseOpen = metaCaseOpen || ( value && value[ 0 ] );
                                break;
                        }
                    } );
                    if( !foundCode && 'ENTRY' === ruleSet.referenceArea && !(ruleSet.caseFolderType || []).includes( 'CASEFOLDER' ) && ruleSet.code) {
                        criteria.code = {
                            '\\\\$eq' : ruleSet.code,
                            '\\\\$catalogShort' : ruleSet.catalogShort || ''
                        };
                        actCodes.push(ruleSet.code);
                    }
                    if( foundCode && 'object' !== typeof criteria.code && 'ENTRY' === ruleSet.referenceArea && !(ruleSet.caseFolderType || []).includes( 'CASEFOLDER' ) && ruleSet.code) {
                        criteria.code = {
                            '\\\\$eq' : criteria.code,
                            '\\\\$catalogShort' : ruleSet.catalogShort || ''
                        };
                        actCodes.push(ruleSet.code);
                    }
                    if( foundCode && 'object' === typeof criteria.code && criteria.code['\\\\$eq'] &&
                        (!criteria.code['\\\\$catalogShort'] || '' === criteria.code['\\\\$catalogShort']) &&
                        'ENTRY' === ruleSet.referenceArea && !(ruleSet.caseFolderType || []).includes( 'CASEFOLDER' ) && ruleSet.code && ruleSet.catalogShort ) {
                        criteria.code['\\\\$catalogShort'] = ruleSet.catalogShort;
                    }
                    if( !foundActType && 'ENTRY' === ruleSet.referenceArea && !(ruleSet.caseFolderType || []).includes( 'CASEFOLDER' ) && ruleSet.actType ) {
                        criteria.actType = ruleSet.actType;
                        actTypes.push(ruleSet.actType);
                    }
                    if(collectedCodes.length){
                        if(hasCount0){
                            rl.metaRequiredCodes = _.uniq( (rl.metaRequiredCodes || []).concat(collectedCodes) );
                        } else {
                            rl.metaCodes = _.uniq( (rl.metaCodes || []).concat(collectedCodes) );
                        }
                    }
                    if(collectedTypes.length) {
                        rl.metaActTypes = _.uniq( (rl.metaActTypes || []).concat( collectedTypes ) );

                    }
                }

                function proccessValidation( vld ) {
                    if (Array.isArray(vld) ) {
                        vld.forEach( function( vl ) {
                            proccessValidation( vl );
                        });
                    } else {
                        Object.keys( vld ).forEach( function( vlk ) {
                            switch( vlk ) {
                                case '\\\\$and':
                                case '\\\\$or':
                                case '\\\\$not':
                                    proccessValidation( vld[ vlk ] );
                                    break;
                                case 'criteria':
                                    proccessCriteria( vld[ vlk ], [], rl.metaActTypes || [] );
                                    break;
                            }
                        } );
                    }

                }

                proccessValidation( rl.validations );
            } );

            return {
                criterias: _.uniq(criterias).map( el => el.replace( /\\\\\$/g, '$').replace( /\\\\\-/g, '.' ) ),
                actTypes: _.uniq(actTypes),
                actCodes: _.uniq(actCodes),
                metaFuzzy: ( -1 !== actOperations.indexOf('\\\\$regex') || -1 !== actOperations.indexOf('\\\\$exists') ||
                    ( -1 !== criterias.indexOf('nAPK') && 0 === actCodes.length )
                ),
                metaCaseOpen
            };
        }

        /**
         * @method getPeriodForRuleSet
         * @public
         *
         * populate activeState for internal rules by certain values combination, in simple mode by description and fromCatalogShort
         *
         * @param {Object} ruleSet
         * @param {Boolean|Nothing} onlyNotActive - only collect disabled rules
         *
         * @returns {Array<Object>} collected rule identifiers (description, fromCatalogShort) and active state
         */
        function extractActiveStates( ruleSet, onlyNotActive ) {
            const activeStates = [];

            // in simple case whole rule description can be compared
            ruleSet.rules.forEach( rule => {

                if( !onlyNotActive || !ruleSet.isActive || !rule.isActive ){
                    activeStates.push( {
                        type: 'description',
                        code: rule.description,
                        catalogShort: ruleSet.fromCatalogShort,
                        notActive: !ruleSet.isActive || !rule.isActive
                    } );
                }
            } );
            return activeStates;

            // complex implementation needed when rule generators changed and there are renamed rule descriptions
            /*
            const oldSchemaTests = [
                {type: 'alter', regex: /^Altersbedingung für die Leistung\s(\S+)\s/},
                {type: 'ausschluss', regex: /^Ausschlussliste für die GNR\s(\S+)\s/},
                {type: 'anzahl', regex: /^Anzahlbedingungsliste für die GNR\s(\S+)\s/},
                {type: 'bericht', regex: /^Berichtspflicht für die Leistung\s(\S+)\s/},
                {type: 'grund', regex: /^Erforderliche Grundleistungen für Zuschlagsleistung\s(\S+)\s/},
                {type: 'geschlecht', regex: /^Geschlechtsbezug für die Leistung\s(\S+)\s/}
            ];

            // From EXTMOJ-1464 (4.2) only this needed
            const newSchemaTests = [
                {type: 'alter', regex: /^Altersbedingung\s(\S+)\s/},
                {type: 'ausschluss', regex: /^Ausschlussliste für\s(\S+)\s/},
                {type: 'anzahl', regex: /^Anzahlbedingungsliste\s(\S+)\s/},
                {type: 'bericht', regex: /^Berichtspflicht\s(\S+)\s/},
                {type: 'grund', regex: /^Erforderliche Grundleistungen für Zuschlagsleistung\s(\S+)\s/},
                {type: 'geschlecht', regex: /^Geschlechtsbezug\s(\S+)\s/}
            ];
            const tests = oldSchemaTests.concat( newSchemaTests );
            if( !ruleSet.isDirectory ) {
                ruleSet.rules.forEach( rule => {
                    const anyMatch = tests.some( test => {
                        const result = test.regex.exec( rule.description );

                        if( result && result[1] ) {
                            if( !onlyNotActive || !ruleSet.isActive || !rule.isActive ){
                                activeStates.push( {
                                    type: test.type,
                                    code: result[1],
                                    catalogShort: ruleSet.fromCatalogShort,
                                    notActive: !ruleSet.isActive || !rule.isActive
                                } );
                            }
                            return true;
                        }
                    } );
                    if( !anyMatch ) {
                        Y.log( `could not match any rule type on ruleSet ${JSON.stringify( ruleSet )}`, 'debug', NAME );
                    }
                } );
            }

            return activeStates;
            */

        }

        /**
         * @method getPeriodForRuleSet
         * @public
         *
         * get active status for curenly loaded ruleset looking in rules collected from db
         * from timestamp and ruleSet details
         *
         * @param {Array<Object>} oldActiveStates
         * @param {Object} ruleSet
         *
         * @returns {Boolaen} active state for ruleSet
         */
        function ruleSetWasActive( oldActiveStates, ruleSet ) {
            const ruleActiveStates = extractActiveStates( ruleSet );

            return !oldActiveStates.some( oldRuleState => {
                return ruleActiveStates.some( newRuleActiveState => oldRuleState.type === newRuleActiveState.type &&
                                                                    oldRuleState.code === newRuleActiveState.code &&
                                                                    oldRuleState.catalogShort === newRuleActiveState.catalogShort );
            } );

        }

        /**
         * @method createRuleActiveStates
         * @public
         *
         * collect all disabled activeStates for current DC rules (in all child folders of tree) in db
         *
         * @param {Object} user
         * @param {String} rootId - id of root folder
         *
         * @returns {Array<Object>} collected rule identifiers (description, fromCatalogShort) and active state (deactivated only)
         */
        async function createRuleActiveStates( user, rootId ) {
            let activeStates = [];

            let [err, folders] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'rule',
                    query: { isDirectory: true, _id: {$ne: Y.doccirrus.schemas.rule.getPracticeDirId()} },
                    options: {
                        select: {
                            _id: 1,
                            parent: 1
                        }
                    }
                } )
            );

            if( err ){
                Y.log( `createRuleActiveStates: error getting rule folders ${err.stack || err}`, 'error', NAME);
                throw err;
            }

            //filter tree to only contains child of rootId
            let ids,
                childs = folders.filter( el => el._id.toString() === rootId ),
                rest = folders.filter( el => el._id.toString() !== rootId ),
                added = true;

            while( added ){
                ids = childs.map( el => el._id.toString() );
                let new_childs = rest.filter( el => ids.includes( el.parent ) ); //eslint-disable-line no-loop-func
                rest = rest.filter( el => !ids.includes( el.parent ) ); //eslint-disable-line no-loop-func

                if( new_childs.length ){
                    childs = [...childs, ...new_childs];
                } else {
                    added = false;
                }
            }
            folders = childs.map( el => el._id.toString() );
            childs = undefined;
            rest = undefined;

            let ruleSets;
            [err, ruleSets] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'rule',
                    query: { isDirectory: false, parent: { $in: folders } },
                    options: {
                        select: {
                            _id: 1,
                            isActive: 1,
                            fromCatalogShort: 1,
                            "rules.isActive": 1,
                            "rules.description": 1
                        }
                    }
                } )
            );
            if( err ){
                Y.log( `createRuleActiveStates: error getting rules ${err.stack || err}`, 'error', NAME);
                throw err;
            }

            for( let ruleSet of (ruleSets || [])) {
                const currActiveStates = extractActiveStates( ruleSet, true );
                activeStates = [...activeStates, ...currActiveStates];
            }

            return {
                activeStates,
                visited: [
                    ...folders.filter( el => el !== rootId ),
                    ...ruleSets.map( el => el._id.toString() )
                ] };
        }

        /**
         * @method getPeriodForRuleSet
         * @public
         *
         * calculate period start an end dates
         * from timestamp and ruleSet details
         *
         * @param {Object} ruleSet
         * @param {String} originalParams.periodType
         * @param {String} originalParams.periodCount
         * @param {String} originalParams.periodReference
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
                endDate = endDate.endOf( 'day' );
                startDate = endDate.clone();
                startDate = startDate.subtract( count, type + 's' );
                startDate = startDate.startOf('day');
            } else {
                startDate = endDate.clone();
                endDate = endDate.endOf( ( 'week' === type ) ? 'isoweek' : type );
                startDate = startDate.subtract( count - 1, type + 's' );
                startDate = startDate.startOf( ( 'week' === type ) ? 'isoweek' : type );
            }
            return {startDate, endDate};
        }

        /**
         * @method traverseKeyValues
         * @public
         *
         * recursively traverse json and execute function on each key/value pair,
         *  only string keys are processed, and given function is run with currnt object and update parnt object
         *
         * @param {Object} obj                  json object
         * @param {Object} parent               part of json object (parent of current obj)
         * @param {String} parentKey            key name in skope of parent object
         * @param {Function} fn                 function that should be executed on values
         *
         * @returns {Object} nothing                     mutates obj
         */
        function traverseKeyValues(obj, parent, parentKey, fn)
        {
            for (let [key, value] of Object.entries(obj)) {
                if ( value instanceof Object && value !== null ) {
                    traverseKeyValues( value, obj, key, fn );
                }
                if(typeof key === 'string' && parent){
                    parent[parentKey] = fn( obj, key, value, parentKey );
                }
            }
            return obj;
        }

        /**
         * @method collectAffectedActivitiesFromInvoiceEntry
         * @public
         *
         * extract ids of all related to particular schein activities, including id of schein
         *
         * @param {Object} invoiceEntry                 invoice entry of type 'schein'
         *
         * @returns {Array<String>}                     array of collected ids
         */
        function collectAffectedActivitiesFromInvoiceEntry( invoiceEntry ){
            return [
                invoiceEntry.data._id,
                ...( invoiceEntry.data.treatments || [] ).map( el => el._id ),
                ...( invoiceEntry.data.diagnoses || [] ).map( el => el._id ),
                ...( invoiceEntry.data.continuousDiagnoses || [] ).map( el => el._id ),
                ...( invoiceEntry.data.medications || [] ).map( el => el._id )
            ].filter( Boolean );
        }

        Y.namespace( 'doccirrus' ).ruleutils = {

            name: NAME,
            isPopulated,
            populateActivity,
            cachePatient,
            validateCount,
            displayTimeDiff,
            getMatchingSubDocIds,
            calculateApks,
            getBirthRangeFromAge,
            findCaseFolderById,
            getRuleSets,
            getScheinRange,
            createQueue,
            getRemoveQueryFromExecOptions,
            walkUpFrom,
            walkDownFrom,
            iterateCriteria,
            cleanRuleLog,
            addActivity,
            getEmployeeAndLocationForActivity,
            getMeta,
            createRuleActiveStates,
            ruleSetWasActive,
            getPeriodForRuleSet,
            refineInsuranceStatus,
            traverseKeyValues,
            collectAffectedActivitiesFromInvoiceEntry
        };
    },
    '0.0.1', { requires: ['dccommonutils', 'kbv-api', 'schemautils', 'v_treatment-schema'] }
);
