/**
 * User: pi
 * Date: 17/09/2014  10:50
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'invoiceconfiguration-api', function( Y, NAME ) {

        const
            async = require( 'async' ),
            {formatPromiseResult} = require('dc-core').utils;

        function init( callback ) {
            lazyMigrateInvoiceFactor( callback );
            lazyMigrateQDocuConfig( callback );
        }



        // lazy migrate gkv invoice factor
        function lazyMigrateInvoiceFactor( cb ) {
            const migrate = require( 'dc-core' ).migrate;
            let cluster = require( 'cluster' );
            if( !cluster.isMaster || (!Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC()) ) {
                cb();
                return;
            }
            migrate.eachTenantParallelLimit( ( user, callback ) => {
                Y.doccirrus.mongodb.getModel( user, 'invoiceconfiguration', true, ( err, model ) => {
                    if( err ) {
                        Y.log( `could not lazy migrate gkv invoice factor of tenant ${user.tenantId}: error while getting invoiceconfiguration model: ${err.stack || err}`, 'error', NAME );
                        callback( err );
                        return;
                    }

                    // lazy migrate vat invoice configuration
                    // This will pre configure the 16 % vat tax for germany needed in timeframe 01.07.2020 - 31.12.2020
                    if (Y.doccirrus.commonutils.doesCountryModeIncludeGermany()){
                        model.mongoose.update(
                            {
                                _id: '000000000000000000000001'
                            },
                            {
                                $set: {
                                    vat: 3
                                }
                            }
                            , ( err ) => {
                                if( err ) {
                                    Y.log( `could not lazy migrate vat invoice factor of tenant ${user.tenantId}: error while upserting vat invoice factor: ${err.stack || err}`, 'error', NAME );
                                    return;
                                }
                            }
                        );
                    }

                    model.mongoose.update( {_id: '000000000000000000000001'}, {
                        $addToSet: {
                            invoicefactors: {
                                "_id": "000000000000000000000011",
                                "year": "2021",
                                "quarter": "1",
                                "factor": 0.111244,
                                "isDefault": true
                            }
                        }
                    }, ( err, result ) => {
                        if( err ) {
                            Y.log( `could not lazy migrate gkv invoice factor of tenant ${user.tenantId}: error while upserting invoice factor: ${err.stack || err}`, 'error', NAME );
                            callback( err );
                            return;
                        }
                        callback( null, result.nModified > 0 );
                    } );
                } );
            }, 1, ( err, res ) => {
                if( err ) {
                    Y.log( `could not lazy migrate gkv invoice factor of all tenants. ${err.stack || err}`, 'error', NAME );
                    cb( err );
                    return;
                }
                const nTenantsUpdated = res.filter( Boolean ).length;
                Y.log( `finished lazy migration of gkv invoice factor. updated ${nTenantsUpdated} tenants`, 'info', NAME );
                cb();
            } );
        }

        /**
         *  Overriding default get because the number field always comes from sysnum (invoice counter)
         *  returns at most one document
         *
         *      1. Get the basic invoiceconfiguration object as defined in invoiceconfiguration-schema
         *      2. Set any missing defaults on the invoiceconfiguration object
         *      3. Get the invoice counter values from sysnum, set default if necessary
         *      4. Get the receipt counter values from sysnum, set default if necessary
         *      5. Get the receipts schemes counter values from sysnum, set default if necessary
         *
         *  @param  {Object}    args        v1 REST args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        function get( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceconfiguration.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.get');
            }
            var invoiceconfiguration;

            async.series(
                [
                    getInvoiceConfigObject,
                    addDefaultData,
                    getInvoiceSysnums,
                    getReceiptSysnums,
                    getReceiptsSchemesSysnums
                ],
                onAllDone

            );

            //  1. Get the basic invoiceconfiguration object as defined in invoiceconfiguration-schema
            function getInvoiceConfigObject( itcb ) {
                function onLoadConfiguration( err, result ) {
                    if ( !err && !result && !result[0] ) {
                        err = Y.doccirrus.errors.rest( 404, 'No invoice configuration object found', true );
                    }

                    if( err ) { return itcb( err ); }

                    invoiceconfiguration = result && result[0];
                    itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'invoiceconfiguration',
                    query: args.query,
                    options: { limit: 1 },
                    callback: onLoadConfiguration
                } );
            }

            //  2. Set any missing defaults on the invoiceconfiguration object
            function addDefaultData( itcb ) {
                var defaultData = Y.doccirrus.schemas.invoiceconfiguration.getDefaultData();

                // eslint-disable-next-line no-unused-vars
                for( let field in defaultData ) {
                    if( defaultData.hasOwnProperty( field ) ) {

                        if ( 'receiptNumberSchemes' === field && invoiceconfiguration[field] && !invoiceconfiguration[field][0] ) {
                            //  adding the default receipt configuration field
                            invoiceconfiguration[field] = defaultData[field];
                        }
                        if( typeof invoiceconfiguration[field] !== typeof defaultData[field] ) {
                            invoiceconfiguration[field] = defaultData[field];
                        }
                    }
                }

                itcb( null );
            }

            //  3. Get the invoice counter values from sysnum, set default if necessary
            function getInvoiceSysnums( itcb ) {

                function onDefaultInvoiceSysnumLoaded( err, resultInvoice ) {
                    if ( err ) {
                        Y.log( 'Could not load invoice sysnum for default location: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    var defaultCounter = ( invoiceconfiguration && resultInvoice[0] ) ? resultInvoice[0] : { number: 1 };

                    //  sets the nextNumber property of location invoice numbering schemes
                    populateInvoiceCounters( args.user, invoiceconfiguration, defaultCounter, itcb );
                }

                var defaultLocId = Y.doccirrus.schemas.location.getMainLocationId();

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'sysnum',
                    query: { partition: Y.doccirrus.schemas.sysnum.getInvoiceCounterDomain( defaultLocId ) },
                    options: { limit: 1 },
                    callback: onDefaultInvoiceSysnumLoaded
                } );
            }

            //  4. Get the receipt counter values from sysnum, set default if necessary
            function getReceiptSysnums( itcb ) {

                function onDefaultReceiptSysnumLoaded( err, resultReceipt ) {
                    if ( err ) {
                        Y.log( 'Could not load receipt sysnum for default location: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    var defaultCounter = invoiceconfiguration && resultReceipt[0] ? resultReceipt[0] : { number: 1 };

                    //  sets the nextNumber property of location receipt numbering schemes
                    populateReceiptCounters( args.user, invoiceconfiguration, defaultCounter, itcb );
                }

                var defaultLocId = Y.doccirrus.schemas.location.getMainLocationId(),
                    receiptPartition = Y.doccirrus.schemas.sysnum.getReceiptCounterDomain( defaultLocId );

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'sysnum',
                    query: { partition: receiptPartition },
                    options: { limit: 1 },
                    callback: onDefaultReceiptSysnumLoaded
                } );
            }

            //  5. Get the receipts schemes counter values from sysnum, set default if necessary
            function getReceiptsSchemesSysnums( itcb ) {

                function onDefaultReceiptsSchemesSysnumLoaded( err, resultReceiptsSchemes ) {
                    if ( err ) {
                        Y.log( 'Could not load receipts schemes sysnum for default location: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    var defaultCounter = invoiceconfiguration && resultReceiptsSchemes[0] ? resultReceiptsSchemes[0] : { number: 1 };

                    //  sets the nextNumber property of location receipts schemes numbering schemes
                    populateReceiptsSchemesCounters( args.user, invoiceconfiguration, defaultCounter, itcb );
                }

                var defaultLocId = Y.doccirrus.schemas.location.getMainLocationId(),
                    receiptPartition = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( defaultLocId );

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'sysnum',
                    query: { partition: receiptPartition },
                    options: { limit: 1 },
                    callback: onDefaultReceiptsSchemesSysnumLoaded
                } );
            }


            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not get invoice configuration: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, [ invoiceconfiguration ] );
            }
        }


        /**
         *  Expand an invoiceconfiguration object with invoice counter values (nextNumber property)
         *
         *  @param user                     {Object}    REST user or equivalent
         *  @param invoiceconfiguration     {Object}    invoiceconfiguration-schema
         *  @param defaultCounter           {Object}    Sysnum
         *  @param callback                 {Function}  Of the form fn( err, invoiceconfiguration )
         */

        function populateInvoiceCounters( user, invoiceconfiguration, defaultCounter, callback ) {

            async.map( invoiceconfiguration.invoiceNumberSchemes, populateSingleInvoiceCounter, callback );

            function populateSingleInvoiceCounter( numberScheme, itcb ) {
                function onLoadedSysnum( err, result ) {
                    var invoiceCounter = result && result[0];
                    if (err) { return itcb(err); }

                    numberScheme.nextNumber = invoiceCounter ? invoiceCounter.number : defaultCounter.number;
                    itcb( null, numberScheme );
                }

                var domainId = Y.doccirrus.schemas.sysnum.getInvoiceCounterDomain( numberScheme.locationId );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: { partition: domainId },
                    options: { limit: 1 },
                    callback: onLoadedSysnum
                } );
            }

        }

        /**
         *  Expand an invoiceconfiguration object with receipt counter values (nextNumber property)
         *
         *  @param user                     {Object}    REST user or equivalent
         *  @param invoiceconfiguration     {Object}    invoiceconfiguration-schema
         *  @param defaultCounter           {Object}    Sysnum
         *  @param callback                 {Function}  Of the form fn( err, invoiceconfiguration )
         */

        function populateReceiptCounters( user, invoiceconfiguration, defaultCounter, callback ) {

            async.map( invoiceconfiguration.receiptNumberSchemes, populateSingleReceiptCounter, callback );

            function populateSingleReceiptCounter( numberScheme, itcb ) {
                function onLoadedSysnum( err, result ) {
                    var receiptCounter = result && result[0];
                    if (err) { return itcb(err); }

                    numberScheme.nextNumber = receiptCounter ? receiptCounter.number : defaultCounter.number;
                    itcb( null, numberScheme );
                }

                var domainId = Y.doccirrus.schemas.sysnum.getReceiptCounterDomain( numberScheme.locationId );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: { partition: domainId },
                    options: { limit: 1 },
                    callback: onLoadedSysnum
                } );
            }

        }

        /**
         *  Expand an invoiceconfiguration object with receipts schemes counter values (nextNumber property)
         *
         *  @param {Object}                 user                    REST user or equivalent
         *  @param {Object}                 invoiceconfiguration    invoiceconfiguration-schema
         *  @param {Object}                 defaultCounter          Sysnum
         *  @param {Function}               callback                Of the form fn( err, invoiceconfiguration )
         */
        function populateReceiptsSchemesCounters( user, invoiceconfiguration, defaultCounter, callback ) {

            async.map( invoiceconfiguration.receiptsSchemes, populateSingleReceiptsSchemesCounter, callback );

            function populateSingleReceiptsSchemesCounter( receiptsScheme, itcb ) {
                function onLoadedSysnum( err, result ) {
                    var receiptsSchemesCounter = result && result[0];
                    if (err) { return itcb(err); }

                    receiptsScheme.nextNumber = receiptsSchemesCounter ? receiptsSchemesCounter.number : defaultCounter.number;
                    itcb( null, receiptsScheme );
                }

                let domainId = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( receiptsScheme.locationId, receiptsScheme._id && receiptsScheme._id.toString() );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: { partition: domainId },
                    options: { limit: 1 },
                    callback: onLoadedSysnum
                } );
            }
        }

        /**
         *  Get only the invoiceconfiguration object, with no linked information from location, defaults or sysnums
         *
         *  @param user         {Object}    REST user or equivalent
         *  @param callback     {Function}  Of the form fn( err, [ invoiceconfiguration ] );
         */

        function getUnpopulated(user, callback) {
            Y.doccirrus.mongodb.runDb(
                {
                    user: user,
                    model: 'invoiceconfiguration',
                    action: 'get',
                    options: {limit: 1},
                    query: {}
                },
                callback
            );
        }

        /**
         * helper.
         * Finds current active factor. If there is no factor for current quarter, takes closest from the past.
         * @param {Array} invoicefactors
         * @param {String}  [timestamp] ISO string. default current date
         * @returns {Object | null}
         */
        function getCurrentActiveFactor( invoicefactors, timestamp ){
            let
                moment = require( 'moment' ),
                lastMatch = null,
                result = null,
                date = moment( timestamp );
            invoicefactors.some( function( factor ) {
                var
                    current = moment( factor.year, 'YYYY' ).quarter( +factor.quarter ).startOf( 'quarter' ).hour( 0 ).minutes( 0 ).seconds( 0 );
                if( +factor.year === date.year() && +factor.quarter === date.quarter() ) {
                    result = factor;
                    return true;
                } else if( date.isAfter( current ) && (!lastMatch || current.isAfter( lastMatch )) ) {
                    lastMatch = factor;
                    return false;
                }
                return false;
            } );
            return result || lastMatch;
        }

        /**
         * Returns current active factor
         * @method invoicefactor
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.data]
         * @param {Array} [args.data.invoicefactors] factor array. If present - will be used to find factor, otherwise will catch factor array from invoiceconfiguration
         * @param {String} [args.data.timestamp] current date by default. format - ISO string
         * @param {Function} args.callback
         * @return {*} callback
         */
        function invoicefactor( args ) {
            var
                { user, data: { invoicefactors, timestamp } = {}, callback } = args,
                commonerrors = Y.doccirrus.commonerrors;
            if( invoicefactors ){
                 let
                     factor = getCurrentActiveFactor( invoicefactors, timestamp );
                return callback( null, factor );
            } else {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceconfiguration',
                    options: {
                        limit: 1,
                        lean: true
                    }
                }, ( err, results ) => {
                    let
                        factor;
                    if( err ) {
                        return callback( err );
                    }
                    if( !results.length ) {
                        return callback( new commonerrors.DCError( 400, { message: 'No invoice configuration found' } ) );
                    }
                    factor = getCurrentActiveFactor( results[ 0 ].invoicefactors, timestamp );
                    return callback( null, factor );
                } );
            }
        }

        /**
         *
         * NOT a client function
         *
         * returns the next invoice number with the number of digits specified in the config data
         * must be called ONLY when an invoice has been finalized (successfully approved)
         * if there is no config for the given location then the default location will be applied
         *
         * @param {Object} params
         */
        function getNextInvoiceNumber( params ) {
            Y.log('Entering Y.doccirrus.api.invoiceconfiguration.getNextInvoiceNumber', 'info', NAME);
            if (params.callback) {
                params.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME).wrapAndLogExitAsync(params.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.getNextInvoiceNumber');
            }
            var
                callback = params.callback,
                locationId = params.data && params.data.locationId && params.data.locationId.toString();

            if( !locationId ) {
                callback( Y.doccirrus.errors.rest( 400, 'no location provided' ) );
                return;
            }

            function getFormattedNumber( err, result ) {
                var
                    invoiceConfig = result && result[0],
                    numberStr ,
                    numberScheme,
                    defaultLocId = Y.doccirrus.schemas.location.getMainLocationId();

                if( err || !invoiceConfig || !invoiceConfig.invoiceNumberSchemes[0] ) {
                    callback( err || 'inconsistant data - no default invoice number scheme' );
                    return;
                }

                numberScheme = Y.Array.find( invoiceConfig && invoiceConfig.invoiceNumberSchemes, function( item ) {
                    return item.locationId === locationId;
                } );

                if( !numberScheme ) {   // then get the default one
                    numberScheme = Y.Array.find( invoiceConfig && invoiceConfig.invoiceNumberSchemes, function( item ) {
                        return item.locationId === defaultLocId;
                    } );
                }

                // get the number using the expected locationId and format it
                Y.doccirrus.schemas.sysnum.getNextInvoiceNumber( params.user, numberScheme.locationId, function( err, counterData ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    numberStr = counterData.number.toString();
                    while( numberStr.length < numberScheme.digits ) {
                        numberStr = '0' + numberStr;
                    }
                    numberStr = (numberScheme.year || '') + numberStr;
                    callback( null, numberStr );
                } );

            }

            Y.doccirrus.api.invoiceconfiguration.get( {
                user: params.user,
                callback: getFormattedNumber
            } );
        }

        /**
         *  NOT a client function
         *
         *  returns the next receipt number with the number of digits specified in the config data
         *  must be called ONLY when an receipt has been finalized (successfully approved)
         *  if there is no config for the given location then the default location will be applied
         *
         *  TODO: refactor with getNextInvoiceNumber to reduce duplication
         *
         *  @param  params                  {Object}
         *  @param  params.user             {Object}    REST user or equivalent
         *  @param  params.data             {Object}
         *  @param  params.data.locationId  {Object}    One receipt counter per location
         *  @param  params.callback         {Function}  Of the form fn( err, numberStr }
         */

        function getNextReceiptNumber( params ) {
            Y.log('Entering Y.doccirrus.api.invoiceconfiguration.getNextReceiptNumber', 'info', NAME);
            if (params.callback) {
                params.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME).wrapAndLogExitAsync(params.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.getNextReceiptNumber');
            }
            var
                callback = params.callback,
                locationId = params.data && params.data.locationId;

            if( !locationId ) {
                callback( Y.doccirrus.errors.rest( 400, 'no location provided' ) );
                return;
            }

            function getFormattedNumber( err, result ) {
                var
                    invoiceConfig = result && result[0],
                    numberScheme,
                    defaultLocId = Y.doccirrus.schemas.location.getMainLocationId();

                function onSysnumQueried( err, counterData ) {
                    if ( err ) {
                        Y.log( 'Could not get receipt counter value: ' + JSON.stringify( err ), 'warn', NAME );
                        //console.log( 'Failed to expand number scheme: ', numberScheme );
                        return callback( err );
                    }

                    var numberStr = counterData.number.toString();
                    while( numberStr.length < numberScheme.digits ) {
                        numberStr = '0' + numberStr;
                    }
                    numberStr = (numberScheme.year || '') + numberStr;
                    callback( null, numberStr );
                }

                if( err || !invoiceConfig || !invoiceConfig.receiptNumberSchemes[0] ) {
                    callback( err || 'inconsistant data - no default receipt number scheme' );
                    return;
                }

                //  first try find the number scheme for the given location
                numberScheme = Y.Array.find( invoiceConfig && invoiceConfig.receiptNumberSchemes, function( item ) {
                    return item.locationId === locationId;
                } );

                //  if not found then try find the number scheme for the default location
                if( !numberScheme ) {   // then get the default one
                    //console.log( 'No receipt number scheme for this location (' + locationId + '), looking up for the default location' );
                    numberScheme = Y.Array.find( invoiceConfig && invoiceConfig.receiptNumberSchemes, function( item ) {
                        return item.locationId === defaultLocId;
                    } );
                }

                // get the number using the expected locationId and format it
                //console.log( 'Query next receipt number with scheme: ', numberScheme );
                Y.doccirrus.schemas.sysnum.getNextReceiptNumber( params.user, numberScheme.locationId, onSysnumQueried  );
            }

            Y.log( 'Getting next receipt number for location: ' + locationId, 'debug', NAME );

            Y.doccirrus.api.invoiceconfiguration.get( {
                user: params.user,
                callback: getFormattedNumber
            } );
        }

        function getPvsCustomerNoList( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceconfiguration.getPvsCustomerNoList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.getPvsCustomerNoList');
            }
            const
                _ = require( 'lodash' ),
                Promise = require( 'bluebird' ),
                {user, callback} = args,
                employeeQuery = {
                    type: 'PHYSICIAN',
                    pvsCustomerNo: {$ne: null}
                },
                employeeSelect = {
                    pvsCustomerNo: 1,
                    firstname: 1,
                    lastname: 1

                },
                employeeMapper = ( employee ) => {
                    return {
                        name: `${employee.lastname} (${employee.pvsCustomerNo})`,

                        senderName: `${employee.firstname} ${employee.lastname}`,
                        senderCustomerNo: employee.pvsCustomerNo,
                        from: `employee.${employee._id}`
                    };
                },
                locationQuery = {
                    institutionCode: {$ne: null}
                },
                locationSelect = {
                    institutionCode: 1,
                    locname: 1
                },
                locationMapper = ( location ) => {
                    return {
                        name: `${location.locname} (${location.institutionCode})`,
                        senderName: location.locname,
                        senderCustomerNo: location.institutionCode,
                        from: `location.${location._id}`
                    };
                };

            function getFromModel( modelName, query, select, mapper ) {
                return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: modelName,
                    query: query,
                    options: {
                        lean: true,
                        select
                    }
                } ) ).map( mapper );
            }

            Promise.map( [
                {
                    modelName: 'location',
                    query: locationQuery,
                    select: locationSelect,
                    mapper: locationMapper
                }, {
                    modelName: 'employee',
                    query: employeeQuery,
                    select: employeeSelect,
                    mapper: employeeMapper
                }
            ], config => {
                return getFromModel( config.modelName, config.query, config.select, config.mapper );
            } ).then( _.flatten ).then( results => {
                callback( null, results );
            } ).catch( err => {
                Y.log( 'could not get pvs customer numbers ' + (err && err.stack || err), 'error', NAME );
                callback( err );
            } );
        }

        /**
         *  Look up tarmed tax point values for the given location
         *
         *  @param  {Object}    user
         *  @param  {String}    locationId      An invoice location
         *  @return {Promise}                   Promise to resolve with dunningScheme object
         */

        async function getScalingFactorsForTarmedPrices( user ) {
            let err, configs;
            [ err, configs ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'invoiceconfiguration',
                    query: {}
                } )
            );

            if ( err ) {
                Y.log( `Could not look up invoice configurations: ${err.stack||err}`, 'error', NAME );
                throw err;
            }
            if(!configs.length || !configs[0].tarmedTaxPointValues) {
                Y.log(`TarmedTaxPointValues not found for invoiceconfiguration`, 'error', NAME);
                throw Y.doccirrus.errors.rest(404, 'TarmedTaxPointValues not found', true);
            }

            return {
                taxPointValues: configs[0].tarmedTaxPointValues || [],
                invoiceFactorValues: configs[0].tarmedInvoiceFactorValues || []
            };
        }

        /**
         *  Removes mediport delivery flows after removing mediport delivery settings
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams     flow ids
         *  @param  {Function}  args.callback
         *  @return {Promise}
         */

        async function removeMediportDeliveryFlows( args ) {
            Y.log( "Y.doccirrus.api.invoiceconfigurations.removeMediportDeliveryFlows", 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.removeMediportDeliveryFlows' );
            }
            const callback = args.callback,
                user = args.user,
                flowIds = args.originalParams || {};

            let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'delete',
                model: 'flow',
                query: {
                    _id: {$in: Object.values( flowIds )}
                }
            } ) );
            if( err ) {
                Y.log( `Error in deleting mediport delivery flows:\nError:${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest('medidata_03', '', true) );
            }
            return callback();
        }

        /**
         *  Updates mediport delivery flows after editing mediport delivery settings
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams     represents invoiceconfigurations
         *  @param  {Function}  args.callback
         *  @return {Promise}
         */

        async function updateMediportDeliveryFlows( args ) {
            Y.log( "Y.doccirrus.api.invoiceconfigurations.updateMediportDeliveryFlows", 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.updateMediportDeliveryFlows' );
            }
            const callback = args.callback,
                user = args.user,
                data = args.originalParams || {};
            let err, result;

            const mediportDeliverySetting = data.mediportDeliverySettings && data.mediportDeliverySettings[0];
            if( !mediportDeliverySetting ) {
                return callback();
            }
            [err, result] = await formatPromiseResult( Y.doccirrus.mediportDeliverySettings.saveDeliveryFlows( {
                user,
                data: mediportDeliverySetting
            } ) );

            if( err ) {
                Y.log( `Error in updating mediport delivery flows:\nError:${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest('medidata_04', '', true) );
            }

            if( result && (result.sendFlowId || result.receiveFlowId) ) {
                mediportDeliverySetting.sendFlowId = result.sendFlowId || mediportDeliverySetting.sendFlowId;
                mediportDeliverySetting.receiveFlowId = result.receiveFlowId || mediportDeliverySetting.receiveFlowId;
                Y.log( `updateMediportDeliveryFlows(): updating delivery flows`, 'info', NAME );

                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'update',
                    query: {},
                    model: 'invoiceconfiguration',
                    data: {
                        $set: {
                            mediportDeliverySettings: [mediportDeliverySetting]
                        }
                    },
                    options: {
                        multi: true
                    }
                } ) );

                if( err ) {
                    Y.log( `Error in saving mediport delivery settings into invoice configuration:\nError:${err.stack || err}`, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest('medidata_03', '', true) );
                }
                return callback( null, {
                    mediportDeliverySettings: [mediportDeliverySetting]
                } );
            }
            return callback();
        }

        /**
         *  Look up dunning settings for the given location
         *
         *  @param  {Object}    user
         *  @param  {String}    locationId      An invoice location
         *  @return {Promise}                   Promise to resolve with dunningScheme object
         */

        async function getDunningScheme( user, locationId ) {
            let err, configs, config, dunningScheme, defaultDunningScheme,
                defaultLocId = Y.doccirrus.schemas.location.getMainLocationId();

            //  (1) Get all invoice configs (there should only be one)

            [ err, configs ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'invoiceconfiguration',
                    query: {}
                } )
            );

            if ( err ) {
                Y.log( `Could not look up invoice configurations: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //  (2) Try to match a dunning scheme for the given location
            for ( config of configs ) {
                if ( config.dunningSchemes ) {
                    for ( dunningScheme of config.dunningSchemes ) {
                        if ( dunningScheme.locationId === `${locationId}` ) {
                            return dunningScheme;
                        }
                    }
                    // if not returned scheme for given location then try find the scheme for the default location
                    defaultDunningScheme = config.dunningSchemes.find( dunningScheme => dunningScheme.locationId === defaultLocId );

                    if( defaultDunningScheme ) {
                        return defaultDunningScheme;
                    }
                }
            }

            Y.log( `Dunning scheme not found for location ${locationId}`, 'debug', NAME );
            return null;
        }

        function updatePadxSettingsOnLocationorEmployeeChange( user, modelName, data ) {
            const
                Promise = require( 'bluebird' ),
                ref = `${modelName}.${data._id.toString()}`,
                isLocationModel = 'location' === modelName,
                title = (isLocationModel ? `${data.locname} (${data.institutionCode || '-'})` : `${data.lastname} (${data.pvsCustomerNo || '-'})`),
                senderName = (isLocationModel ? data.locname : `${data.firstname} ${data.lastname}`),
                senderCustomerNo = (isLocationModel ? data.institutionCode : data.pvsCustomerNo);

            return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'invoiceconfiguration',
                query: {},
                options: {limit: 1}
            } ) ).get( 0 ).then( invoiceConfig => {
                if( !invoiceConfig || !invoiceConfig.padxSettings || !invoiceConfig.padxSettings.length ) {
                    return;
                }
                const padxSettings = JSON.parse( JSON.stringify( invoiceConfig.padxSettings ) );
                padxSettings.forEach( padxSetting => {
                    if( padxSetting.padxSettingTitleRef === ref ) {
                        padxSetting.padxSettingTitle = title;
                        padxSetting.senderName = senderName;
                        padxSetting.senderCustomerNo = senderCustomerNo;
                    }
                } );

                return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'update',
                    model: 'invoiceconfiguration',
                    query: {
                        _id: invoiceConfig._id
                    },
                    data: {
                        padxSettings: padxSettings
                    }
                } ) );

            } ).then( result => {
                if( result ) {
                    Y.log( `updated invoiceconfig on ${modelName} change: ${JSON.stringify( result )}`, 'debug', NAME );
                }
            } ).catch( err => {
                Y.log( `could not update invoiceconfig on ${modelName} change: ${err}`, 'error', NAME );
                throw err;
            } );
        }

        /**
         * get tarmed invoice factor if configured
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams.employeeId   - employee and casefolder from activity to match with configurations
         * @param {Object} args.originalParams.caseFolderId
         *
         * @returns {Function} args.callback                - found tarmed invoice factor or default
         */
        async function getTarmedInvoiceFactor( args ) {
            Y.log( 'Entering Y.doccirrus.api.invoiceconfiguration.getTarmedInvoiceFactor', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.getTarmedInvoiceFactor' );
            }

            const
                FACTOR = 1, //default factor if not configured or nor match by casefolder and/or employee data
                { user, originalParams: { employeeId, caseFolderId }, callback } = args;

            if( !employeeId || !caseFolderId ){
                Y.log( `getTarmedInvoiceFactor: required params employeeId:${employeeId} and/or caseFolderId:${caseFolderId} are missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }

            let [ err, invoiceconfigurations ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'invoiceconfiguration',
                    action: 'get',
                    query: {},
                    options: {
                        select: { tarmedInvoiceFactorValues: 1 }
                    }
                } )
            );

            if( err ){
                Y.log( `getTarmedInvoiceFactor: error getting invoiceconfiguration ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !invoiceconfigurations || !invoiceconfigurations.length || !invoiceconfigurations[0].tarmedInvoiceFactorValues || !invoiceconfigurations[0].tarmedInvoiceFactorValues.length ){
                //not configured
                return callback( null, FACTOR );
            }

            let casefolders;
            [ err, casefolders ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'casefolder',
                    action: 'get',
                    query: {_id: caseFolderId},
                    options: {
                        select: { type: 1 }
                    }
                } )
            );

            if( err ){
                Y.log( `getTarmedInvoiceFactor: error getting casefolder type ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !casefolders || !casefolders.length || !casefolders[0].type ){
                //casefolder without type
                return callback( null, FACTOR );
            }

            let filteredConfiguration = invoiceconfigurations[0].tarmedInvoiceFactorValues.filter( el => el.caseTypes.includes( casefolders[0].type ) );

            if( !filteredConfiguration.length ){
                //particular casefolder type is not configured
                return callback( null, FACTOR );
            }

            let employees;
            [ err, employees ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'employee',
                    action: 'get',
                    query: {_id: employeeId },
                    options: {
                        select: { qualiDignities: 1 }
                    }
                } )
            );

            if( err ){
                Y.log( `getTarmedInvoiceFactor: error getting employee dignity ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !employees || !employees.length || !employees[0].qualiDignities || !employees[0].qualiDignities.length ){
                //employee has not specified dignities
                return callback( null, FACTOR );
            }

            filteredConfiguration = filteredConfiguration.filter( el => employees[0].qualiDignities.includes( el.qualiDignity ) );

            if( filteredConfiguration.length > 1 ){
                Y.log( `getTarmedInvoiceFactor: there are more then one possible factors for ${JSON.stringify(employees[0].qualiDignities)}/${casefolders[0].type}`, 'warn', NAME );
            }

            //for now returned first matched factor
            callback( null, filteredConfiguration && filteredConfiguration[0] && filteredConfiguration[0].factor || FACTOR );
        }

        function lazyMigrateQDocuConfig( callback ) {
            const migrate = require( 'dc-core' ).migrate,
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                cluster = require( 'cluster' );

            if( !cluster.isMaster || (!Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC()) ) {
                return callback();
            }
            if( !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                return callback();
            }
            migrate.eachTenantParallelLimit( async ( user, cb ) => {
                Y.log( `lazyMigrateQDocuConfig: migrating qDocu config for tenant: ${user.tenantId}`, 'info', NAME );

                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceconfiguration',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {
                        _id: ObjectId( '000000000000000000000001' ),
                        patientKey: {$exists: false},
                        qsDataKey: {$exists: false}
                    },
                    data: {
                        $set: {
                            patientKey: "Pub_key_Vertrauensstelle_QS_PRODUKTIV.pub",
                            qsDataKey: "Pub_key_Bundesauswertungsstelle_GFL_ZK_PRODUKTIV.pub"
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `lazyMigrateQDocuConfig. Error in qDocu invoiceconfiguration migration. for tenant: ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                } else {
                    Y.log( `lazyMigrateQDocuConfig: Successfully executed for tenant: ${user.tenantId}`, 'info', NAME );
                }
                return cb( err );
            } );

            return callback();
        }
        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.api' ).invoiceconfiguration = {
            name: NAME,
            init,
            invoicefactor: function( args ) {
                Y.log('Entering Y.doccirrus.api.invoiceconfiguration.invoicefactor', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceconfiguration.invoicefactor');
                }
                invoicefactor( args );
            },
            get: get,
            getUnpopulated: getUnpopulated,
            getNextInvoiceNumber: getNextInvoiceNumber,
            getNextReceiptNumber: getNextReceiptNumber,
            getPvsCustomerNoList,
            getDunningScheme,
            getScalingFactorsForTarmedPrices,
            updateMediportDeliveryFlows,
            removeMediportDeliveryFlows,
            updatePadxSettingsOnLocationorEmployeeChange,
            getTarmedInvoiceFactor
        };

    },
    '0.0.1', { requires: [] }
);
