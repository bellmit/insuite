/**
 * User: do
 * Date: 28/05/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


// add this to the DBLayer TODO MOJ-805

YUI.add( 'invoiceconfiguration-process', function( Y, NAME ) {
    const
        {formatPromiseResult} = require('dc-core').utils,
        i18n = Y.doccirrus.i18n;

        function setIsModified( user, invoiceConfiguration, callback ) {
            invoiceConfiguration.padxSettingsWasModified = invoiceConfiguration.isModified( 'padxSettings' );
            invoiceConfiguration.autoValidationWasModified = invoiceConfiguration.isModified( 'gkvAutoValidationAt' ) ||
                                                             invoiceConfiguration.isModified( 'pvsAutoValidationAt' );
            if( invoiceConfiguration.padxSettings && invoiceConfiguration.padxSettings.length ) {
                invoiceConfiguration.padxSettingsModifiedIds = [];
                invoiceConfiguration.padxSettings.forEach( function( e, i ) {
                    if( !e._id ) {
                        return;
                    }
                    const
                        referencedDataChanged = [
                        `padxSettings.${i}.padxSettingTitle`,
                        `padxSettings.${i}.senderCustomerNo`
                    ].some( path => {
                        const pathChanged = invoiceConfiguration.isModified( path );
                        return pathChanged;
                    } );

                    if( referencedDataChanged ) {
                        invoiceConfiguration.padxSettingsModifiedIds.push( e._id.toString() );
                    }
                } );
            }
            callback( null, invoiceConfiguration );
        }

        /**
         * update dunning counters with new numbers
         * @param {User}        user
         * @param {Object}            invoiceConfiguration
         * @param {Function}    callback
         * @return {Function}
         */
        function updateDunningCounter( user, invoiceConfiguration, callback ) {
            var
                usageCount = {},
                found;
            if( !user ) { // if not triggered by a user
                callback( null, invoiceConfiguration );
                return;
            }
            
            if( !invoiceConfiguration.dunningSchemes || !invoiceConfiguration.dunningSchemes.length ) {
                // insert default value, then continue with sysnums
                Y.log( 'Inserting default dunningScheme into invoice Configuration. ' );
                invoiceConfiguration.dunningSchemes = [   // the default numbering scheme
                    {
                        "_id": "000000000000000000000002",
                        "warning1Value": 0,
                        "warning2Value": 0,
                        locationId: Y.doccirrus.schemas.location.getMainLocationId()
                    }
                ];
            }

            found = Y.Array.some( invoiceConfiguration.dunningSchemes, function( item ) {
                if( usageCount[item.locationId] ) {
                    return true;
                }
                usageCount[item.locationId] = 1;
            } );

            if( found ) {
                callback( Y.doccirrus.errors.rest( 7201, 'dunningSchemes', true ) );
                return;
            }

            if( !usageCount[Y.doccirrus.schemas.location.getMainLocationId()] ) {
                callback( Y.doccirrus.errors.rest( 7200, 'dunningSchemes', true ) );
                return;
            }

            return callback( null, invoiceConfiguration );
        }

        /**
         * update invoice counters with new numbers
         * @param {User}        user
         * @param {Object}      invoiceConfiguration
         * @param {Function}    callback
         * @return {Function}
         */
        function updateInvoiceCounter( user, invoiceConfiguration, callback ) {
            var
                usageCount = {},
                found;
            if( !user ) { // if not triggered by a user
                callback( null, invoiceConfiguration );
                return;
            }

            if( invoiceConfiguration.invoiceNumberSchemes && invoiceConfiguration.invoiceNumberSchemes.some( scheme => !scheme.nextNumber ) ){
                //skip processing because triggered not from UI
                return callback( null, invoiceConfiguration );
            }

            // create a new scoped counter
            function createNewCounter( numberScheme, _cb ) {
                var
                    did = Y.doccirrus.schemas.sysnum.getInvoiceCounterDomain( numberScheme.locationId );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    action: 'post',
                    data: { number: numberScheme.nextNumber, partition: did, skipcheck_: true },
                    callback: _cb
                } );
            }

            if( !invoiceConfiguration.invoiceNumberSchemes || !invoiceConfiguration.invoiceNumberSchemes.length ) {
                // insert default value, then continue with sysnums
                Y.log( 'Inserting default invoiceNumberSchemes into invoice Configuration. ' );
                invoiceConfiguration.invoiceNumberSchemes = [   // the default numbering scheme
                    {
                        "_id": "000000000000000000000002",      //  cust semaphore?
                        "year": "",
                        "nextNumber": 1,
                        "digits": 5,
                        locationId: Y.doccirrus.schemas.location.getMainLocationId()
                    }
                ];
            }

            found = Y.Array.some( invoiceConfiguration.invoiceNumberSchemes, function( item ) {
                if( usageCount[item.locationId] ) {
                    return true;
                }
                usageCount[item.locationId] = 1;
            } );

            if( found ) {
                callback( Y.doccirrus.errors.rest( 7201, 'invoiceNumberSchemes', true ) );
                return;
            }

            if( !usageCount[Y.doccirrus.schemas.location.getMainLocationId()] ) {
                callback( Y.doccirrus.errors.rest( 7200, 'invoiceNumberSchemes', true ) );
                return;
            }


            require( 'async' ).each( invoiceConfiguration.invoiceNumberSchemes, function( numberScheme, _cb ) {
                var
                    did = Y.doccirrus.schemas.sysnum.getInvoiceCounterDomain( numberScheme.locationId );
                Y.log( 'updating sysnums from invoiceconfiguration. Migrate phase: ' + Y.doccirrus.migrate.isMigrating() );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    migrate: Y.doccirrus.migrate.isMigrating(),
                    model: 'sysnum',
                    action: 'put',
                    query: {partition: did},
                    fields: ['number'],
                    data: {number: numberScheme.nextNumber, skipcheck_: true},
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'error in updating invoice counter: ' + JSON.stringify( err ), 'error', NAME );
                            return _cb( err );

                        }
                        if( !result || !result.number ) { // if it wasn't updated
                            createNewCounter( numberScheme, function( err1 ) {
                                if( err1 ) {
                                    Y.log( 'error in posting invoice counter: ' + JSON.stringify( err1 ), 'error', NAME );
                                }
                                _cb( err1 );
                            } );

                        } else {
                            return _cb( null );
                        }
                    }
                } );
            }, function( err ) {
                Y.Array.map( invoiceConfiguration.invoiceNumberSchemes, function( item ) {
                    delete item._doc.nextNumber; // this is read-only
                    return item;
                } );
                callback( err, invoiceConfiguration );
            } );
        }


        /**
         *  Update receipt counters with new numbers
         *
         *      1. Create counter for default location if no other receipt counter available
         *      2. Check that there is only one receipt numbering scheme per location
         *      3. Save all sysnums to database
         *      --> 3.1 Save single sysnum to database, create if necessary
         *      4. Call back with error or new invoiceConfiguration object
         *
         *  @param  {Object}                user                        REST user or equivalent
         *  @param  {Object}                invoiceConfiguration See    invoiceconfiguration-schema.common.js
         *  @param  {Function}              callback                    Of the form fn( err, invoiceConfiguration )
         *  @return {Function}
         */
        function updateReceiptCounter( user, invoiceConfiguration, callback ) {
            var
                async = require( 'async' );

            if( !user ) { // if not triggered by a user
                Y.log( 'Missing user for invoiceconfiguration-process updateReceiptCounter', 'warn', NAME );
                return callback( null, invoiceConfiguration );
            }

            if( invoiceConfiguration.receiptNumberSchemes && invoiceConfiguration.receiptNumberSchemes.some( scheme => !scheme.nextNumber ) ){
                //skip processing because triggered not from UI
                return callback( null, invoiceConfiguration );
            }

            async.series( [ initDefaults, checkForDuplicates, saveAllReceiptCounters ], onAllDone );

            //  1. Create counter for default location if no other receipt counter available
            function initDefaults( itcb ) {
                //  skip this step if we have at least one receipt number scheme
                if( invoiceConfiguration.receiptNumberSchemes && invoiceConfiguration.receiptNumberSchemes.length ) { return itcb( null ); }

                // add default scheme, then continue with sysnums
                Y.log( 'Inserting default receiptNumberScheme into invoice Configuration.', 'debug', NAME );

                var
                     defaultReceiptNumberingScheme = {
                        '_id': "000000000000000000000002",      //  cust semaphore? TODO: DOCUMENTME
                        'year': '',
                        'nextNumber': 1,
                        'digits': 5,
                        'locationId': Y.doccirrus.schemas.location.getMainLocationId()
                    };

                invoiceConfiguration.receiptNumberSchemes = [ defaultReceiptNumberingScheme ];
                itcb( null );
            }

            //  2. Check that there is only one receipt numbering scheme per location
            function checkForDuplicates( itcb ) {
                var
                    usageCount = {},
                    foundDuplicates,
                    err = null;

                function checkIfDuplicate( item ) {
                    if( usageCount[item.locationId] ) {
                        return true;
                    }
                    usageCount[item.locationId] = 1;
                }

                foundDuplicates = Y.Array.some( invoiceConfiguration.receiptNumberSchemes, checkIfDuplicate );

                if( foundDuplicates ) {
                    err = Y.doccirrus.errors.rest( 7201, 'receiptNumberSchemes', true);
                }

                //  default location must have a receipt numbering scheme
                if( !usageCount[Y.doccirrus.schemas.location.getMainLocationId()] ) {
                    err = Y.doccirrus.errors.rest( 7200, 'receiptNumberSchemes', true );
                }

                itcb( err );
            }

            //  3. Save all sysnums to database
            function saveAllReceiptCounters( itcb ) {
                function onAllCountersUpdated( err ) {
                    if ( err ) {
                        Y.log( 'Error while saving receipt counter sysnums: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                    Y.Array.map( invoiceConfiguration.receiptNumberSchemes, function( item ) {
                        delete item._doc.nextNumber; // this is read-only
                        return item;
                    } );
                    itcb( err );
                }
                async.each( invoiceConfiguration.receiptNumberSchemes, updateSingleReceiptNumberScheme, onAllCountersUpdated );
            }

            //  3.1 Save a single numbering scheme to database
            function updateSingleReceiptNumberScheme( numberScheme, itcb ) {
                var did = Y.doccirrus.schemas.sysnum.getReceiptCounterDomain( numberScheme.locationId );
                Y.log( 'updating receipt sysnums from invoiceconfiguration. Migrate phase: ' + Y.doccirrus.migrate.isMigrating() );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    migrate: Y.doccirrus.migrate.isMigrating(),
                    model: 'sysnum',
                    action: 'put',
                    query: { partition: did },
                    fields: [ 'number' ],
                    data: { number: numberScheme.nextNumber, skipcheck_: true },
                    callback: onPutSysnum
                } );

                function onPutSysnum( err, result ) {
                    if( err ) {
                        Y.log( 'error in updating invoice counter: ' + JSON.stringify( err ), 'error', NAME );
                        return itcb( err );

                    }

                    if ( result && result.number ) {
                        //  PUT operation happened successfully
                        return itcb( null );
                    }

                    // if it wasn't updated
                    createNewCounter( numberScheme, onPostSysnum );
                }

                function onPostSysnum( err ) {
                    if( err ) {
                        Y.log( 'Error in posting new receipt counter: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    Y.log( 'Created new receipt counter for location: ' + numberScheme.locationId, 'debug', NAME );
                    itcb( null );
                }
            }

            // create a new scoped counter
            function createNewCounter( numberScheme, _cb ) {
                var
                    //  did = numberScheme.locationId + '-receipt'
                    did = Y.doccirrus.schemas.sysnum.getReceiptCounterDomain( numberScheme.locationId );

                Y.log( 'Creating new receipt numbering scheme for location ' + numberScheme.locationId + ': ' + did, 'debug', NAME );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    action: 'post',
                    data: { number: numberScheme.nextNumber, partition: did, skipcheck_: true },
                    callback: _cb
                } );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not update receipt counters for invoiceConfiguration ' + invoiceConfiguration._id + ': ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, invoiceConfiguration );
            }

        }

        async function updateReceiptsSchemesCounter( user, invoiceConfiguration, callback ) {
            if( !user ) { // if not triggered by a user
                Y.log( 'Missing user for invoiceconfiguration-process updateReceiptsSchemesCounter', 'warn', NAME );
                return callback( null, invoiceConfiguration );
            }
            const
                defaultReceiptsScheme = {
                    '_id': "000000000000000000000002",
                    'name': i18n('InvoiceMojit.invoiceNumberScheme_item.group.CASHBOOK'),
                    'year': '',
                    'nextNumber': 1,
                    'digits': 5,
                    'locationId': Y.doccirrus.schemas.location.getMainLocationId()
                };
            let
                err, result,
                usageCount = {}, foundDuplicates,
                mainLocationSet = false;

            if( invoiceConfiguration.receiptsSchemes && invoiceConfiguration.receiptsSchemes.some( scheme => !scheme.nextNumber ) ){
                //skip processing because triggered not from UI
                return callback( null, invoiceConfiguration );
            }

            //  1. Create counter for default location if no other receipt counter available
            //  skip this step if we have at least one receipts scheme
            if( !(invoiceConfiguration.receiptsSchemes && invoiceConfiguration.receiptsSchemes.length) ) {
                // add default scheme, then continue with sysnums
                Y.log( 'Inserting default receiptsSchemes into invoice Configuration.', 'debug', NAME );

                invoiceConfiguration.receiptsSchemes = [defaultReceiptsScheme];
            }

            //  2. Check that there is only one receipts scheme per location

            foundDuplicates = invoiceConfiguration.receiptsSchemes.some( ( item ) => {
                let countId = `${item.locationId} ${item._id && item._id.toString() || ''}`;
                if( usageCount[countId] ) {
                    return true;
                }
                if( item.locationId === Y.doccirrus.schemas.location.getMainLocationId()){
                    mainLocationSet = true;
                }
                usageCount[countId] = 1;
            } );

            if( foundDuplicates ) {
                err = Y.doccirrus.errors.rest( 7201, 'receiptsSchemes', true );
            }

            //  default location must have a receipts scheme
            if( !mainLocationSet ) {
                err = Y.doccirrus.errors.rest( 7200, 'receiptsSchemes', true );
            }
            if( err ) {
                return callback( err );
            }

            err = null;

            //  3. Save all sysnums to database
            for( let receiptsScheme of invoiceConfiguration.receiptsSchemes ) {
                let did = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( receiptsScheme.locationId, receiptsScheme._id && receiptsScheme._id.toString() );
                Y.log( `updating receipts sysnums from invoiceconfiguration. Migrate phase: ${Y.doccirrus.migrate.isMigrating()}` );
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        migrate: Y.doccirrus.migrate.isMigrating(),
                        model: 'sysnum',
                        action: 'put',
                        query: {partition: did},
                        fields: ['number'],
                        data: {number: receiptsScheme.nextNumber, skipcheck_: true}
                    } )
                );
                if( err ) {
                    Y.log( `error in updating receipts counter: ${err.stack || err}`, 'error', NAME );
                    invoiceConfiguration.receiptsSchemes.map( ( item ) => {
                        delete item._doc.nextNumber; // this is read-only
                        return item;
                    } );
                    return callback( err );
                }
                if( !(result && result.number) ) {
                    //  PUT operation failed
                    did = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( receiptsScheme.locationId, receiptsScheme._id && receiptsScheme._id.toString() );
                    Y.log( `Creating new receipts scheme for location ${receiptsScheme.locationId}:  ${did}`, 'debug', NAME );
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'sysnum',
                            action: 'post',
                            data: {number: receiptsScheme.nextNumber, partition: did, skipcheck_: true}
                        } )
                    );
                    if( err ) {
                        Y.log( `Error in posting new receipts counter: ${err.stack || err}`, 'warn', NAME );
                        invoiceConfiguration.receiptsSchemes.map( ( item ) => {
                            delete item._doc.nextNumber; // this is read-only
                            return item;
                        } );
                        return callback( err );
                    }
                    Y.log( `Created new receipts counter for location: ${receiptsScheme.locationId}`, 'debug', NAME );
                }
            }
            invoiceConfiguration.receiptsSchemes.map( ( item ) => {
                delete item._doc.nextNumber; // this is read-only
                return item;
            } );
            return callback( null, invoiceConfiguration );
        }

        /**
         * The DC invoiceConfiguration data schema definition
         *
         * @class DCInvoiceConfigurationProcess
         */

        /**
         *
         * @method changeInvoiceConfiguration
         * @param {Object}          user db user
         * @param {Object}          data A mongoose object being changed in its updated state.
         * @param {Function}        finalCb function(err, data) passes data on unchanged, or an err.
         */
        function changeInvoiceConfiguration( user, data, finalCb ) {
            var async = require( 'async' );
            if( data.isNew || !user ) { // if not a put triggered by user then just skip
                finalCb( null, data );
                return;
            }
            Y.log( "changeInvoiceConfiguration. Recalculate prices ", 'info', NAME );

            /*jshint validthis:true */
            var
                moment = require( 'moment' ),
                invoiceFactors, originalInvoiceFactors;

            invoiceFactors = data.invoicefactors || [];
            originalInvoiceFactors =  data.originalData_ && data.originalData_.invoicefactors || [];

            // sort by year and quarter
            invoiceFactors.sort( function( a, b ) {
                if( a.year === b.year ) {
                    if( a.quarter === b.quarter ) {
                        return 0;
                    } else {
                        return a.quarter < b.quarter ? -1 : 1;
                    }
                } else {
                    return a.year < b.year ? -1 : 1;
                }
            } );

            // add date ranges for factors
            function addDateRangeToFactors() {
                var i, factor, factor2, start, end;
                for( i = 0; i < invoiceFactors.length; i++ ) {
                    factor = invoiceFactors[i];
                    start = moment( factor.year, 'YYYY' ).quarter( +factor.quarter ).startOf( 'quarter' ).hour( 0 ).minutes( 0 ).seconds( 0 );
                    if( invoiceFactors[i + 1] ) {
                        factor2 = invoiceFactors[i + 1];
                        // end of quarter before the next invoice factor quarter
                        end = moment( factor2.year, 'YYYY' ).quarter( +factor2.quarter ).endOf( 'quarter' ).subtract( 1, 'quarters' ).hour( 23 ).minutes( 59 ).seconds( 59 );
                    } else {
                        // end of time
                        end = null;
                    }
                    factor.start = start.toDate();
                    factor.end = end ? end.toDate() : end;
                }
            }

            function updatePrice( config ) {
                var treatment = config.treatment,
                    factor = config.factor;

                if( 'Punkte' === treatment.actualUnit && (Number( treatment.billingFactorValue ) !== factor.factor ) ) {
                    treatment.price = Y.doccirrus.schemas.activity.toPrice( treatment.actualPrice, factor.factor );
                    treatment.billingFactorValue = String( factor.factor );
                    return treatment;
                }
                return null;
            }

            function updateTreatment( params ) {
                let
                    { treatment, callback, factor } = params,
                    treatmentChanged;

                treatmentChanged = updatePrice( {
                    treatment: treatment,
                    factor: factor
                } );
                if( treatmentChanged ) {

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        migrate: true,
                        query: {
                            _id: treatment._id
                        },
                        data: {
                            $set: {
                                price: treatment.price,
                                billingFactorValue: treatment.billingFactorValue
                            }
                        }
                    }, callback );
                } else {
                    setImmediate( callback );
                }

            }

            function doTreatmentsInDateRange( factor, callback ) {
                var query = {
                    actType: 'TREATMENT',
                    catalogShort: 'EBM',
                    timestamp: {
                        $gte: factor.start
                    }
                };

                if( factor.end ) {
                    query.timestamp.$lte = factor.end;
                }
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'activity', true, ( err, activityModel ) => {
                            next( err, activityModel );
                        } );
                    }, function( activityModel, next ) {
                        let
                            error = null,
                            stream = activityModel.mongoose.find( query, {}, { timeout: true } ).lean().stream();

                        function onData( treatment ) {
                            stream.pause();
                            updateTreatment( {
                                treatment,
                                factor,
                                callback( err ) {
                                    if( err ) {
                                        return stream.destroy( err );
                                    }
                                    stream.resume();
                                }
                            } );
                        }

                        stream.on( 'data', onData ).on( 'error', (err) => error = err ).on( 'close', () => next( error ) ); //eslint-disable-line
                    }
                ], function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback();
                } );

            }

            addDateRangeToFactors();

            if( !originalInvoiceFactors.every( oFactor => {
                    return invoiceFactors.some( factor => {
                        return factor._id.toString() === oFactor._id.toString() && factor.factor === oFactor.factor &&
                               factor.quarter === oFactor.quarter && factor.year === oFactor.year;
                    } );
                } ) ) {
                async.each( invoiceFactors, doTreatmentsInDateRange, function( err ) {
                    Y.log( 'changeInvoiceConfiguration. Prices were recalculated.', 'info', NAME );
                    finalCb( err, data );
                } );
            } else {
                finalCb( null, data );
            }

        }

        function updatePvsLog( user, invoiceconfiguration, callback ) {
            const
                Promise = require( 'bluebird' );

            if( invoiceconfiguration.padxSettingsWasModified &&
                invoiceconfiguration.padxSettingsModifiedIds &&
                invoiceconfiguration.padxSettingsModifiedIds.length ) {

                Promise.map( invoiceconfiguration.padxSettingsModifiedIds, padxSettingId => {
                    return invoiceconfiguration.padxSettings.find( setting => (setting._id.toString() === padxSettingId) );
                } ).each( padxSetting => {
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'update',
                        model: 'pvslog',
                        query: {
                            padnextSettingId: padxSetting._id
                        },
                        data: {
                            padnextSettingTitle: padxSetting.padxSettingTitle,
                            padnextSettingCustomerNo: padxSetting.senderCustomerNo
                        }
                    } );
                } ).then( () => {
                    Y.log( 'updated pvslogs on padx setting change', 'debug', NAME );
                    callback();
                } ).catch( err => {
                    Y.log( 'could not update pvslogs on padx setting change ' + (err && err.stack || err), 'error', NAME );
                    callback();
                } );

            } else {
                return callback();
            }
        }

        function setAutoValidationCronJobs( user, invoiceconfiguration, callback ) {
            if( invoiceconfiguration.autoValidationWasModified ) {
                Y.doccirrus.invoicelogManager.setAutoValidation( user, invoiceconfiguration );
            }

            callback();
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Class Location Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'invoiceconfiguration' ),
                    setIsModified,
                    updateInvoiceCounter,
                    updateDunningCounter,
                    updateReceiptCounter,
                    updateReceiptsSchemesCounter
                ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'invoiceconfiguration' ),
                    updateInvoiceCounter,
                    updateDunningCounter,
                    updateReceiptCounter,
                    updateReceiptsSchemesCounter
                ], forAction: 'delete'}
            ],

            post: [
                {run: [changeInvoiceConfiguration, updatePvsLog, setAutoValidationCronJobs], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: ['activity-schema', 'patient-schema', 'InvoiceLogManager']}
);
