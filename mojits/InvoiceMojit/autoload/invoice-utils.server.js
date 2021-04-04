/**
 * User: md
 * Date: 06/12/18  10:44
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'dcinvoiceserverutils', function( Y, NAME ) {
    

    const
        ObjectId = require( 'mongoose' ).Types.ObjectId,
        {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
        i18n = Y.doccirrus.i18n;

    /**
     * @method assignAndSaveInvoiceNumber
     * @public
     *
     * get new number if activity does not have invoiceNo from sysnums and store back to activity
     *
     * @param {Object} user
     * @param {Object} activity
     * @param {String} testedState  - only processed APPROVED state
     * @param {Function} callback
     *
     * @returns {Function} callback
     */
    function assignAndSaveInvoiceNumber(user, activity, testedState, callback){

        if( 'APPROVED' !== testedState ) {
            //  not approved, nothing further to do
            return callback( null );
        }

        if( !activity._id ) {
            // there are no activity to write invoice number in
            Y.log(`assignAndSaveInvoiceNumber: empty invoice id for assigning serial number`, 'warn', NAME );
            return callback( null );
        }

        Y.doccirrus.api.invoiceconfiguration.getNextInvoiceNumber( {
            user: user,
            data: { locationId: activity.locationId },
            callback: onInvoiceNumberAssigned
        } );

        function onInvoiceNumberAssigned( err, numberStr ) {
            if( err ) {
                return callback( err );
            }

            activity.invoiceNo = activity.invoiceNo || numberStr;
            // regenerate the content too
            activity.content = Y.doccirrus.schemas.activity.generateContent( activity );

            let
                setArgs = {
                    'invoiceNo': activity.invoiceNo,
                    'content': activity.content,
                    'timestamp': activity.timestamp
                };

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'activity',
                migrate: true,
                query: { _id: new ObjectId( activity._id ) },
                data: { $set: setArgs },
                options: { multi: false }
            }, callback );

        }
    }

    /**
     * @method calculateErrors
     * @public
     *
     * get amount of errors, warnings and advices
     *
     * @param {Object} user
     * @param {String} itemId
     * @param {Function} callback
     *
     * @returns {Function} callback
     */

    async function calculateErrors( user, itemId, callback ) {
        const types = ['ERROR', 'WARNING', 'ADVICE'];
        let amount = {};
        for( let type of types ) {
            let [err, entries] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'count',
                    model: 'invoiceentry',
                    query: {
                        invoiceLogId: itemId,
                        type: type
                    }
                } )
            );

            if( err ) {
                Y.log(`utils calculateErrors: Error calculating: ${err.stack || err}`, "error", NAME);
                return callback( err );
            }

            switch( type ) {
                case 'ERROR':
                    amount.output = entries;
                    break;
                case 'WARNING':
                    amount.warnings = entries;
                    break;
                case 'ADVICE':
                    amount.advices = entries;
                    break;
            }
        }

        return callback( null, amount );
    }

    /**
     * @method getLockNotification
     * @public
     *
     * get error object for rest with message that describe who/when/where acquire redis lock
     *
     * @param {Array | String} lockData, data from redis lock format: where|operation|who|whenStarted|progress
     *
     * @returns {Object} object used as rest error
     */
    function getLockNotification( lockData ){

        if( !lockData || !lockData[1] ){
            return { code: '2509' };
        }

        let now = (new Date()).getTime(),
            lockDataArr = lockData[1].split('|'),
            errData = {
                $log: i18n( `InvoiceMojit.lockingNotification.${lockDataArr[0] || 'na'}`) ,
                $operation: i18n( `InvoiceMojit.lockingNotification.${lockDataArr[1] || 'na'}`),
                $person: lockDataArr[2],
                $started: Math.round((now - lockDataArr[3]) / 60000)
            },
            errMessage = Y.doccirrus.errorTable.getMessage(
                {
                    code: '2507',
                    data: errData
                }
            );
        return { code: '2507', message: errMessage};
    }

    /**
     * @method releaseLock
     * @public
     *
     * release redis lock
     *
     * @param {String} key
     */
    async function releaseLock( key ){
        Y.log(`releasing invoice lock`, 'debug', NAME);
        let [ err, res ] = await formatPromiseResult(
            Y.doccirrus.cacheUtils.dataCache.releaseLock( { key } )
        );

        if( err ){
            Y.log( `validatePvsLog: Error releasing invoice lock ${err.stack || err}`, 'error', NAME );
        }
        if( res && res.length && 1 === res[0] ){
            Y.log(`invoice lock released successfully`, 'debug', NAME);
        }
    }

    /**
     * @method employeesForRuleLog
     * @public
     *
     * helper function to collect employeeName for referenced activities from ruleLog entry
     *
     * @param {Object} user
     * @param {Array<Object>} ruleLogs  - array of ruleLog entries in form of db record
     *
     * @returns {Object}                - kind of dictionary object where key {String} is activity _id,
     *                                    and value {String} is employeeName that was obtained from activity
     */
    async function employeesForRuleLog( user, ruleLogs ){
        let affectedActivitiesIds = [], affectedActivities = {};

        //collect unique list of activity _ids, priority has factId, and if not set then grab from affectedActivities array
        (ruleLogs || []).map( ruleLog => {
            affectedActivitiesIds = [...new Set( [
                ...affectedActivitiesIds,
                ...( ruleLog.factId ? [ ruleLog.factId ] : (ruleLog.affectedActivities || []).map( el => el.id ) )
            ] ) ];
        } );
        affectedActivitiesIds = affectedActivitiesIds.filter( Boolean );

        if( affectedActivitiesIds.length ){
            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'get',
                query: {
                    _id: {$in: affectedActivitiesIds}
                },
                options: { select: {employeeName: 1}}
            } ) );
            if( err ) {
                Y.log( `employeesForRuleLog: Failed to get affected activities data for ruleLogs ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            (result || []).map( activity => {
                affectedActivities[activity._id.toString()] = activity.employeeName;
            } );
        }

        return {...affectedActivities};
    }

    /**
     * @method auditChangeValues
     * @public
     *
     * helper function to create audit entry for activity values update
     *
     * @param {Object} user
     * @param {String} activityId  - _id of activity that change status
     * @param {Object} oldValues - previous values
     * @param {Object} newValues - new values
     * @param {String|undefined} descriptionPrefix - first part of audit description
     * @param {Object|undefined} activityData - additional activity data needed for audit, if undefined will get from db
     *
     * @returns {Promise}
     */
    async function auditChangeValues( user, activityId, oldValues, newValues, descriptionPrefix = '', activityData = undefined ){
        const
            postAudit = promisifyArgsCallback( Y.doccirrus.api.audit.post ),
            generateAuditDescription = ( data ) => {
                return [ data.patientName, data.code, ( data.content || 'kein Inhalt' ) ].filter( Boolean ).join( ', ' ) || 'Eintrag ohne Titel';
            };

        let err;
        if( !activityData ){
            let activities;
            [ err, activities ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: { _id: activityId },
                    action: 'get',
                    options: {
                        select: {
                            status: 1,
                            actType: 1,
                            code: 1,
                            patientName: 1,
                            content: 1
                        }
                    }
                } )
            );
            if( err ){
                Y.log( `auditChangeValues: error getting activity data for ${activityId} : ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            activityData = activities && activities[0] || {};
        }

        let description = [ descriptionPrefix || '', generateAuditDescription( activityData ) || '' ].join( ' '),
            entry = Y.doccirrus.api.audit.getBasicEntry( user, 'put', 'activity', description );

        entry.objId = activityId;
        entry.diff = {};
        Object.keys( oldValues ).forEach( key => {
            if( !entry.diff[key] ){
                entry.diff[key] = {};
            }
            entry.diff[key].oldValue = oldValues[key];
        } );
        Object.keys( newValues ).forEach( key => {
            if( !entry.diff[key] ){
                entry.diff[key] = {};
            }
            entry.diff[key].newValue = newValues[key];
        } );

        [ err ] = await formatPromiseResult( postAudit( {
            user,
            data: Y.doccirrus.filters.cleanDbObject( entry )
        } ) );
        if( err ){
            Y.log( `auditChangeValues: error posting audit entry for activity ${activityId} : ${err.stack || err}`, 'error', NAME );
            throw err;
        }
    }

    Y.namespace( 'doccirrus' ).invoiceserverutils = {
        assignAndSaveInvoiceNumber,
        calculateErrors,
        getLockNotification,
        releaseLock,
        employeesForRuleLog,
        auditChangeValues
    };

}, '0.0.1', {requires: [ 'activity-schema' ]} );
