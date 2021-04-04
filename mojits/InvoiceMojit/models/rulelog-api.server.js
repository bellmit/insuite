/**
 * User: do
 * Date: 20/11/15  18:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'rulelog-api', function( Y, NAME ) {

        const Prom = require( 'bluebird' ),
            _ = require("lodash"),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;

        const
            updateCasefolderOnClient = async ( user, query, result ) => {
                if( !query || !query.patientId ) {
                    Y.log(`updateCasefolderOnClient: Casefolder updated method called without any patientId in the 'query' object. Skipping operation...`, "warn", NAME);
                    return;
                }

                let caseQuery = { patientId: query.patientId };
                if( query.caseFolderId ){
                    caseQuery = {_id: query.caseFolderId};
                }

                let [ err, caseFolders ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'get',
                        query: caseQuery,
                        useCache: false,
                        option: {lean: true}
                    } )
                );
                if( err ){
                    // no need action in case of error, just log error and skip communication.emit
                    Y.log( `updateCasefolderOnClient: Error on getting casefolder ${err.stack || err }` , 'error', NAME );
                    return;
                }

                for(const caseFolder of caseFolders) {
                    await Y.doccirrus.communication.emitEventForSession( {
                            sessionId: user.sessionId,
                            event: 'rulelogUpdated',
                            msg: {
                                data: {
                                    caseFolderId: caseFolder._id.toString(),
                                    caseFolder,
                                    entries: _.flatten( result )
                                }
                            }
                          } );
                }
            };

        function countByType( user, caseFolderId, type ) {
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );
            return runDb( {
                user: user,
                model: 'rulelog',
                action: 'count',
                query: {
                    caseFolderId: caseFolderId,
                    ruleLogType: type
                }
            } );
        }

        function getCaseFolderStats( user, caseFolderId ) {
            return Prom.props( {
                errors: countByType( user, caseFolderId, 'ERROR' ),
                warnings: countByType( user, caseFolderId, 'WARNING' ),
                activities: countByType( user, caseFolderId, 'ACTIVITY' )
            } );
        }

        async function addEntries( args ) {
            Y.log('Entering Y.doccirrus.api.rulelog.addEntries', 'debug', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulelog.addEntries', 'debug');
            }


            const
                { user, originalParams: params, callback } = args;

            if( !params.patientId ) {
                Y.log("Missing Parameter: patientId... Skip", 'debug', NAME );
                return callback( null, {} );
            }

            if( !params.caseFolderId ) {
                return callback( Error( "Missing Parameter: caseFolderId" ) );
            }

            if( !params.entries ) {
                return callback( Error( "Missing Parameter: entries" ) );
            }

            let response = {
                patientId: params.patientId,
                caseFolderId: params.caseFolderId,
                entries: params.entries || []
            };

            if( !params.entries.length ) {
                return callback( null, response );
            }

            let
                added = 0;

            for( let entry of params.entries ){
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'upsert',
                        model: 'rulelog',
                        query: _.pick( entry, ["referenceArea","patientId","caseFolderId","factId","ruleLogType","message"] ),
                        data: {...entry, skipcheck_: true },
                        options: { omitQueryId: true }
                    } )
                );
                if( err ){
                    Y.log( `addEntries: error adding entry ${JSON.stringify(entry)} : ${err.stack || err}`, 'warn', NAME );
                    continue;
                }
                added++;
                entry._id = result && result._id;
            }

            Y.log( `addEntries: added ${added} new entries`, 'debug', NAME );
            callback( null, response );
        }

        /**
         * @method removeEntries
         * @public
         *
         * remove rule logs entries and send debounce event for refresh casefolder on client
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function removeEntries( args ) {
            Y.log('Entering Y.doccirrus.api.rulelog.removeEntries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulelog.removeEntries');
            }
            const
                { user, query, callback } = args;

            //with new rule engine query contains all reference areas in same query and can be too big to show in normal log
            Y.log( `RuleLog: removeEntries: try to delete ruleLogs by query ${JSON.stringify( query )}`, 'debug', NAME );

            let [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'delete',
                    model: 'rulelog',
                    query,
                    options: {
                        override: true
                    }
                } )
            );
            if( err ) {
                Y.log( `RuleLog: could not delete old entries ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( Array.isArray( result ) ) {
                Y.log( `RuleLog: deleted ${result.length} old entries before adding new ones`, 'debug', NAME );
                result = JSON.parse(JSON.stringify(result)).map( el => {
                    el.removeOnly = true;
                    return el;
                } );

                if( result.length ){
                    //need this call to not be debounced to delete system messages
                    updateCasefolderOnClient( user, query, result );
                }
            }
            callback();
        }

        /**
         * @method updateCaseFolderStats
         * @public
         *
         * update rule stats (error, warning, activities to create) on casefolder and send debounce event for refresh casefolder on client
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {originalParams} args.query
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function updateCaseFolderStats( args ) {
            Y.log('updateCaseFolderStats: Entering Y.doccirrus.api.rulelog.updateCaseFolderStats', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulelog.updateCaseFolderStats');
            }
            const
                { user, originalParams: params, callback } = args,
                updateCaseFolderRuleStats = promisifyArgsCallback( Y.doccirrus.api.casefolder.updateCaseFolderRuleStats );

            if( !params.caseFolderId && !params.patientId ) {
                Y.log( `updateCaseFolderStats: Missing Parameter: caseFolderId or patientId`, 'debug', NAME);
                return callback();
            }
            let err, cases = [params.caseFolderId];
            if( !params.caseFolderId && params.patientId ){
                let caseFolders;
                [ err, caseFolders ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'casefolder',
                        query: {
                            patientId: params.patientId
                        },
                        options: {
                            select: {
                                _id: 1
                            }
                        }
                    } )
                );
                if( err ){
                    Y.log( `updateCaseFolderStats: Error on getting casefolders for patient ${params.patientId} ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }
                cases = (caseFolders || []).map( el => el._id );
            }

            for( let caseFolderId of cases){
                let stats;
                [ err, stats ] = await formatPromiseResult(
                    getCaseFolderStats( user, caseFolderId )
                );
                if( err ){
                    Y.log( `updateCaseFolderStats: Error on getting casefolder stats ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }

                [ err ] = await formatPromiseResult(
                    updateCaseFolderRuleStats( {
                        user,
                        originalParams: {
                            caseFolderId,
                            stats
                        }
                    } )
                );
                if( err ){
                    Y.log( `updateCaseFolderStats: Error on updating CaseFolder Rule Stats ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }
            }
            callback();
        }

        function removeEntriesAndUpdateCaseFolderStats( args ) {
            Y.log('Entering Y.doccirrus.api.rulelog.removeEntriesAndUpdateCaseFolderStats', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulelog.removeEntriesAndUpdateCaseFolderStats');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            function removedEntriesCb( err ) {

                if( err ) {
                    Y.log( 'RuleLog: removeEntriesAndUpdateCaseFolderStats: could not remove entries ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                updateCaseFolderStats( {
                    user: user,
                    originalParams: {
                        patientId: params.patientId,
                        caseFolderId: params.caseFolderId
                    },
                    callback: function( err ) {
                        if( err ) {
                            Y.log( 'RuleLog: removeEntriesAndUpdateCaseFolderStats: could not remove entries ' + err, 'error', NAME );
                            callback( err );
                            return;
                        }
                        callback();
                    }
                } );

            }

            let query = {
                referenceArea: params.referenceArea,
                    patientId: params.patientId,
                    caseFolderId: params.caseFolderId,
                    factId: params.factId
            };
            if (params.messages && params.messages.length) {
                query.message = {$in: params.messages};
            }
            if( params._id ){
                query._id = params._id;
            }

            removeEntries( {
                user,
                query,
                callback: removedEntriesCb
            } );
        }

        /**
         *  Collect rulelog for patient/casefolder used mainly from invoicing
         *
         *  @public
         *  @param  {Object}            args
         *  @param  {Object}            args.user
         *  @param  {String}            args.patientId
         *  @param  {String}            args.caseFolderId
         *  @param  {Boolean}           args.invoice
         *  @param  {String}            args.from
         *  @param  {String}            args.to
         *  @param  {Array<String>}     locationIds
         *  @param  {Array<String>}     affectedActivityIds if populated collect only rulelogs with these affected activities
         *  @param  {String}            args.callback
         *  @return {Promise|Function}  callback            array of collected ruleogs
         */
        async function collectRuleLogEntries( args ) {
            Y.log('Entering Y.doccirrus.api.rulelog.collectRuleLogEntries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulelog.collectRuleLogEntries');
            }

            const { user, patientId, caseFolderId, invoice, from, to, locationIds = [], affectedActivityIds = [], callback } = args;

            let query = {
                patientId,
                caseFolderId,
                $or: [ {
                    referenceArea: {
                        $in: ['ENTRY', 'APK', 'SCHEIN', 'PERIOD']
                    },
                    timestamp: {
                        $gte: from,
                        $lt: to
                    }
                } ]
            };

            if( affectedActivityIds.length ) {
                if( invoice ) {
                    query.$or.push( {'affectedActivities.id': {$in: affectedActivityIds}} );
                    query.$or.push( {factId: {$in: affectedActivityIds}} );
                } else {
                    query['affectedActivities.id'] = {$in: affectedActivityIds};
                }
            }

            if( invoice ){
                query.ruleLogType = { $in: ['ERROR', 'WARNING'] };
                query.$or.push({
                    referenceArea: 'SCHEIN',
                    referenceAreaFrom: from
                });
            }

            if( locationIds.length ) {
                query = {
                    $and: [
                        query,
                        {
                            $or: [
                                {locationId: {$in: locationIds}},
                                {locationId: {$exists: false}}
                            ]
                        }
                    ]
                };
            }

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'rulelog',
                    query
                } )
            );

            if( !callback ){
                Y.log('Exiting Y.doccirrus.api.rulelog.collectRuleLogEntries', 'info', NAME);
            }
            if( err ){
                Y.log( `collectRuleLogEntries: error collecting data: ${err.stack || err}`, 'error', NAME );
                if( callback ){
                    return callback( err );
                }
                throw err;
            }
            if( callback ){
                return callback( null, result );
            }
            return result;
        }

        /**
         *  Calculate errors from rulelog
         *
         *  @public
         *  @param  {Object}    args                patient id
         *  @param  {Object}    args.user                REST user with reference to employee
         *  @param  {String}    args.callback       callback function
         *  @return {Function}  callback            (err, entries)
         */

        async function calculateErrors( args ) {
            Y.log('Entering Y.doccirrus.api.rulelog.calculateErrors', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulelog.calculateErrors');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                types = ['ERROR', 'WARNING', 'ACTIVITY'];
            let amount = {},
                query = params;
            for( let type of types ) {
                query.ruleLogType = type;
                let [err, entries] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'count',
                        model: 'rulelog',
                        query
                    } )
                );

                if( err ) {
                    Y.log(`ruleLog calculateErrors: Error calculating: ${err.stack || err}`, "error", NAME);
                    return callback( err );
                }

                switch( type ) {
                    case 'ERROR':
                        amount.output = entries;
                        break;
                    case 'WARNING':
                        amount.warnings = entries;
                        break;
                    case 'ACTIVITY':
                        amount.advices = entries;
                        break;
                }
            }

            return callback( null, amount );
        }

        /**
         *  Get errors from rulelog
         *
         *  @public
         *  @param  {Object}    args                patient id
         *  @param  {Object}    args.user           REST user with reference to employee
         *  @param  {Object}    args.query          query for request
         *  @param  {Object}    args.options        options for request
         *  @param  {String}    args.callback       callback function
         *  @return {Function}  callback            (err, entries)
         */
        async function getErrors( args ) {
            Y.log('Entering Y.doccirrus.api.rulelog.getErrors', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulelog.getErrors');
            }
            const
                user = args.user,
                query = args.query || {},
                options = args.options || {},
                skipNumbers = options.skip || 0,
                callback = args.callback;

            let [err, entries] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'rulelog',
                    query,
                    options
                } )
            );

            if( err ) {
                Y.log(`ruleLog getErrors: Error getting data: ${err.stack || err}`, "error", NAME);
                return callback( err );
            }

            if( entries.result && entries.result.length ) {
                // set number to items
                entries.result.forEach( function( item, idx ) {
                    item.number = (idx + skipNumbers) + 1;
                });
            }

            return callback( null, entries );
        }

        Y.namespace( 'doccirrus.api' ).rulelog = {

            name: NAME,
            addEntries,
            removeEntries,
            updateCaseFolderStats,
            removeEntriesAndUpdateCaseFolderStats,
            collectRuleLogEntries,
            calculateErrors,
            getErrors

        };

    },
    '0.0.1', {requires: ['dcmongodb', 'dcruleutils']}
);
