/**
 * User: do
 * Date: 30/03/17  17:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'kbvutilityprice-api', function( Y, NAME ) {

        /**
         * @module kbvutilityprice-api
         */
        const insuranceGroupId = '000000000000000000000222';
        const {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils;
        const i18n = Y.doccirrus.i18n;
        const CONFIRM_KBVUTILITYPRICE_CHANGE = i18n( 'communications.message.CONFIRM_KBVUTILITYPRICE_CHANGE' );

        function get( args ) {
            var
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            Y.log( 'Entering Y.doccirrus.api.kbvutilityprice.get', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvutilityprice.get' );
            }
            const {user, query, options, callback} = args;
            Promise.resolve( runDb( {
                user,
                model: 'kbvutilityprice',
                query,
                options
            } ) ).then( function( results ) {
                const data = Array.isArray( results.result ) ? results.result : results;

                return Promise.each( data, (kbvutilityprice => {
                    const insuranceGroupIds = (kbvutilityprice.prices || [])
                        .map( priceConfig => priceConfig.insuranceGroupId )
                        .filter( Boolean );

                    return runDb( {
                        user,
                        model: 'insurancegroup',
                        query: {
                            _id: {$in: insuranceGroupIds}
                        },
                        options: {
                            lean: true,
                            select: {
                                name: 1
                            }
                        }
                    } ).then( insuranceGroups => {
                        if( insuranceGroups.length ) {
                            kbvutilityprice.prices.forEach( priceConfig => {
                                const insuranceGroup = insuranceGroups.find( ig => ig._id.toString() === priceConfig.insuranceGroupId );
                                priceConfig.insuranceGroupName = insuranceGroup && insuranceGroup.name || '';
                            } );
                        }
                    } );
                }) ).then( () => {
                    if( Array.isArray( results.result ) ) {
                        results.result = data;
                    } else {
                        results = data;
                    }
                    return results;
                } );
            } ).then( results => callback( null, results ) ).catch( err => {
                Y.log( `could add insurance group name to kbvutilityprice: ${err.stack || err}`, 'error', NAME );
                callback( err );
            } );

        }

        /**
         * Disables or enables kbvutiltiy price entries according to new sdhm catalog
         * @param {Object} args
         * @param {Object} args.originalParams
         * @param {Array<String>} args.originalParams.utilities
         * @param {Function} args.callback
         */
        function checkPrices( args ) {
            var
                Promise = require( 'bluebird' ),
                getModel = Promise.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( 'Entering Y.doccirrus.api.kbvutilityprice.checkPrices', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvutilityprice.checkPrices' );
            }
            const
                {user, originalParams, callback} = args,
                utilities = originalParams && originalParams.utilities;
            getModel( user, 'kbvutilityprice', true ).then( model => {
                return Promise.all( [
                    new Promise( ( resolve, reject ) => {
                        model.mongoose.update( {
                            utilityName: {$nin: utilities}
                        }, {active: false}, {multi: true}, ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        } );
                    } ),
                    new Promise( ( resolve, reject ) => {
                        model.mongoose.update( {
                            utilityName: {$in: utilities}
                        }, {active: true}, {multi: true}, ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        } );
                    } )
                ] );
            } ).then( result => {
                callback( null, result );
            } ).catch( err => {
                callback( err );
            } );

        }

        function getPrices( args ) {
            Y.log( 'Entering Y.doccirrus.api.kbvutilityprice.getPrices', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvutilityprice.getPrices' );
            }
            var
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );
            const
                {user, originalParams, callback} = args;
            let query, insuranceGroupIds;

            if( !originalParams.utilityNames || !Array.isArray( originalParams.utilityNames ) ||
                !originalParams.locationId || !originalParams.insuranceType ||
                // MOJ-14319: [OK]
                (Y.doccirrus.schemas.patient.isPublicInsurance( {type: originalParams.insuranceType} ) && !originalParams.serialNo) ) {

                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} );
            }
            runDb( {
                user,
                model: 'location',
                query: {
                    _id: originalParams.locationId
                },
                options: {
                    lean: true,
                    limit: 1,
                    select: {
                        kv: 1
                    }
                }
            } ).get( 0 ).then( location => {
                if( !location ) {
                    throw new Y.doccirrus.commonerrors.DCError( 500, {message: 'location not found'} );
                }
                if( !location.kv ) {
                    throw new Y.doccirrus.commonerrors.DCError( 30301, {$locname: location.locname} );
                }
                query = {
                    utilityName: {$in: originalParams.utilityNames},
                    insuranceType: originalParams.insuranceType,
                    kv: location.kv,
                    active: true
                };
                // MOJ-14319: [OK]
                if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: originalParams.insuranceType} ) ) {
                    return Y.doccirrus.api.insurancegroup.server.getInsuranceGroupIdsBySerialNo( {
                        user,
                        serialNo: originalParams.serialNo
                    } ).then( _insuranceGroupIds => {
                        insuranceGroupIds = _insuranceGroupIds;
                        query['prices.insuranceGroupId'] = {$in: insuranceGroupIds};
                    } );
                }
            } ).then( () => {
                return runDb( {
                    user,
                    model: 'kbvutilityprice',
                    query,
                    options: {
                        lean: true
                    }
                } );

            } ).then( results => {
                // for insuranceType PUBLIC we must find price matching insurance groups found by passed serial no
                if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: originalParams.insuranceType} ) ) { // MOJ-14319: [OK]
                    results.forEach( priceConfig => {
                        const priceObj = priceConfig.prices.find( price => insuranceGroupIds.includes( price.insuranceGroupId ) );
                        priceConfig.price = priceObj && (priceObj.price === 0 || priceObj.price) && priceObj.price || null;
                    } );
                }
                callback( null, results );
            } ).catch( err => {
                Y.log( `could not get prices for kbvutility ${err.stack || err}`, 'error', NAME );
                callback( err );
            } );
        }

        async function getAvailableKvs( args ) {
            const {user} = args;
            const locations = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                query: {},
                options: {
                    select: {kv: 1}
                }
            } );
            return locations.map( location => location.kv ).filter( Boolean );
        }

        async function buildPriceListFromCatalog() {
            const SU = Y.doccirrus.auth.getSUForLocal();
            const kbvUtilityPrices = [];
            const getSdhmAsync = promisifyArgsCallback( Y.doccirrus.api.kbvutility2.getSdhm );
            const getKbvUtilityPriceItem = ( utilityName, utilityPositionNo, price ) => ({
                "active": true,
                "careProvider": "",
                "utilityName": utilityName,
                "utilityPositionNo": utilityPositionNo.join( ', ' ),
                "kv": null,
                "insuranceType": "PUBLIC",
                "prices": [
                    {
                        "insuranceGroupId": insuranceGroupId,
                        "price": price
                    }
                ],
                official: true,
                skipcheck_: true
            });

            const sdhm2prices = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'KBVUTILITY2',
                short: 'SDHM2PRICES'
            } );

            if( !sdhm2prices || !sdhm2prices.filename ) {
                return kbvUtilityPrices;
            }

            let [err, catalogPrices] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'catalog',
                query: {
                    catalog: sdhm2prices.filename
                }
            } ) );

            if( err ) {
                Y.log( `init: could not get GKV-SV catalog prices ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            let sdhm2CatalogEntries;
            [err, sdhm2CatalogEntries] = await formatPromiseResult( getSdhmAsync( {insuranceType: 'PUBLIC'} ) );

            if( err ) {
                Y.log( `sdhm2Catalogs: could not get SDHM2 catalog entries ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            const hmNameMap = {};

            // build complete price set and later insert into individual tenants
            for( let sdhm2CatalogEntry of sdhm2CatalogEntries ) {
                (sdhm2CatalogEntry.heilmittelverordnung.vorrangiges_heilmittel_liste || [])
                    .concat(
                        (sdhm2CatalogEntry.heilmittelverordnung.ergaenzendes_heilmittel_liste || []),
                        (sdhm2CatalogEntry.heilmittelverordnung.standardisierte_heilmittel_kombination || [])
                    )
                    // eslint-disable-next-line no-loop-func
                    .forEach( hmEntry => {
                        const {name, positionsnr_liste} = hmEntry;
                        if( hmNameMap[name] ) {
                            return;
                        }
                        hmNameMap[name] = true;
                        const matchingCatalogPriceItems = catalogPrices.filter( catalogPrice => positionsnr_liste.includes( catalogPrice.position ) );
                        const priceAndPosition = matchingCatalogPriceItems.reduce( ( priceAndPosition, matchingCatalogPriceItem ) => {
                            if( !priceAndPosition ) {
                                priceAndPosition = {
                                    price: 0,
                                    position: []
                                };
                            }
                            priceAndPosition.price += matchingCatalogPriceItem.price;
                            priceAndPosition.position.push( matchingCatalogPriceItem.position );
                            return priceAndPosition;
                        }, null );

                        if( priceAndPosition ) {
                            kbvUtilityPrices.push( getKbvUtilityPriceItem(
                                name,
                                priceAndPosition.position,
                                priceAndPosition.price
                            ) );
                        } else {
                            Y.log( `did not find price for hmEntry ${JSON.stringify( hmEntry )}`, 'info', NAME );
                        }
                    } );
            }

            return kbvUtilityPrices;
        }

        async function invalidateKbvUtilityPricesActiveState( args ) {
            const {user, utilityNamesFromCatalog} = args;
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'kbvutilityprice',
                action: 'update',
                query: {
                    utilityName: {$nin: utilityNamesFromCatalog}
                },
                data: {
                    $set: {active: false}
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'kbvutilityprice',
                action: 'update',
                query: {
                    utilityName: {$in: utilityNamesFromCatalog}
                },
                data: {
                    $set: {active: true}
                }
            } );
        }

        async function updatePrice( args ) {
            const {user, updatedPrice} = args;
            const priceId = updatedPrice._id;
            delete updatedPrice._id;
            try {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvutilityprice',
                    action: 'update',
                    query: {
                        _id: priceId
                    },
                    data: updatedPrice
                } );
            } catch( err ) {
                Y.log( `could not kbvutilityprice: ${err.stack || err}`, 'warn', NAME );
            }
        }

        async function postPrices( args ) {
            const {user, newPrices} = args;
            try {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvutilityprice',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( newPrices.map( Y.doccirrus.filters.cleanDbObject ) )
                } );
            } catch( err ) {
                Y.log( `could not post kbvutilityprices: ${err.stack || err}`, 'warn', NAME );
            }
        }

        /**
         * Create a new set of prices from catalog after catalog was updated.
         * Compare existing standard prices with new prices.
         * If a price was changed by the user then flag the price as 'confirmOfficial' which
         * means the user has to confirm if the new prices should be considered.
         * Unchanged prices are overridden right away.
         * Notify the user if confirmation of updated prices is needed.
         * @param {Object} user
         * @return {Promise<void>}
         */
        async function updatePrices( user ) {
            let notifyUsersAboutConfirmation = 0;
            // KAP-237: workaround to create template data; needed for kbvutility price generation after commissioning new system
            let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'insurancegroup',
                query: {
                    _id: {$exists: true}
                }
            } ) );

            if( err ) {
                Y.log( `updatePrices: could not fetch insurancegroups to trigger init on commission ${err.stack || err}`, 'warn' );
            }

            let newKbvUtilityPrices;
            [err, newKbvUtilityPrices] = await formatPromiseResult( buildPriceListFromCatalog() );
            if( err ) {
                Y.log( `init: could not build new kbv utility prices ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            const utilityNamesFromCatalog = newKbvUtilityPrices.map( newKbvUtilityPrice => newKbvUtilityPrice.utilityName );
            [err] = await formatPromiseResult( invalidateKbvUtilityPricesActiveState( {user, utilityNamesFromCatalog} ) );
            if( err ) {
                Y.log( `init: could not mark none existing kbv utility prices ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            let availableKvs;
            [err, availableKvs] = await formatPromiseResult( getAvailableKvs( {user} ) );
            if( err ) {
                Y.log( `init: could not get available kvs ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            for( let newKbvUtilityPrice of newKbvUtilityPrices ) {
                let currentPrices;
                let newPrices;
                [err, currentPrices] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvutilityprice',
                    query: {
                        insuranceType: 'PUBLIC',
                        utilityName: newKbvUtilityPrice.utilityName
                    }
                } ) );

                if( err ) {
                    Y.log( `init: could not get current prices for utilityName ${newKbvUtilityPrice.utilityName}: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                newPrices = (!currentPrices.length ?
                    availableKvs :
                    availableKvs.filter( kv => !currentPrices.some( currentPrice => currentPrice.kv === kv ) ))
                    .map( kv => ({...newKbvUtilityPrice, kv}) );

                await postPrices( {user, newPrices} );

                let updatedPrice;
                for( let currentPrice of currentPrices ) {
                    updatedPrice = null;
                    const isOfficial = currentPrice.official === true;
                    const {utilityPositionNo, prices} = newKbvUtilityPrice;
                    const price = prices[0].price;
                    // eslint-disable-next-line no-loop-func
                    const currentStandardPrice = currentPrice.prices.find( priceObj => priceObj.insuranceGroupId === insuranceGroupId );
                    const priceChanged = !currentStandardPrice || currentStandardPrice.price !== price;

                    if( !priceChanged && !isOfficial ) {
                        updatedPrice = {
                            ...currentPrice,
                            utilityPositionNo,
                            official: true,
                            confirmOfficial: false,
                            officialUtilityPositionNo: null,
                            officialPrice: null
                        };
                    } else if( isOfficial && priceChanged ) {
                        updatedPrice = {
                            ...currentPrice,
                            utilityPositionNo,
                            confirmOfficial: false,
                            officialUtilityPositionNo: null,
                            officialPrice: null
                        };
                        let found = updatedPrice.prices.some( updatePriceObj => {
                            if( updatePriceObj.insuranceGroupId === insuranceGroupId ) {
                                updatePriceObj.price = price;
                                return true;
                            }
                        } );
                        if( !found ) {
                            updatedPrice.prices.push( prices[0] );
                        }
                    } else if( !isOfficial && priceChanged ) {
                        notifyUsersAboutConfirmation++;
                        updatedPrice = {
                            ...currentPrice,
                            confirmOfficial: true,
                            officialUtilityPositionNo: utilityPositionNo,
                            officialPrice: price
                        };
                    }

                    if( updatedPrice ) {
                        await updatePrice( {user, updatedPrice} );
                    }
                }
            }

            if( notifyUsersAboutConfirmation ) {
                Y.doccirrus.communication.emitEventForAll( {
                    event: 'message',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM,
                    msg: {data: CONFIRM_KBVUTILITYPRICE_CHANGE},
                    global: 'true'
                } );
            }

        }

        /**
         * Syncs kbvutilityprices with new KBVUTILITY2PRICE catalog.
         * @return {Promise<void>}
         */
        async function invalidatePrices() {
            const migrate = require( 'dc-core' ).migrate;

            if( !Y.doccirrus.ipc.isMaster() || Y.doccirrus.auth.isDCPRC() ) {
                return;
            }
            Y.log( `invalidate prices after catalog update`, 'info', NAME );

            migrate.eachTenantParallelLimit( doTenant, 1, finalCb );

            function finalCb( n ) {
                Y.log( `invalidatePrices: processed kbvutility prices for ${n} tenants`, 'info', NAME );
            }

            async function doTenant( user, cb ) {
                Y.log( `invalidatePrices: process tenant ${user.tenantId}`, 'info', NAME );
                let [err] = await formatPromiseResult( updatePrices( user ) );
                Y.log( `invalidatePrices: finished process tenant ${user.tenantId}`, 'info', NAME );
                cb( err );
            }
        }

        /**
         * Confirm a set of kbvutilityprices to use official price instead of price changed by the user.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Array} args.originalParams.pricesToConfirm
         * @param {Function} [args.callback]
         * @return {Promise<*>}
         */
        async function confirmPriceChange( args ) {
            const errors = [];
            const {user, originalParams = {}, callback} = args;
            const pricesToConfirm = originalParams.pricesToConfirm;
            if( Array.isArray( pricesToConfirm ) ) {
                for( let priceToConfirm of pricesToConfirm ) {
                    priceToConfirm.official = true;
                    priceToConfirm.confirmOfficial = false;
                    priceToConfirm.utilityPositionNo = priceToConfirm.officialUtilityPositionNo;

                    priceToConfirm.prices.forEach( priceObj => {
                        if( priceObj.insuranceGroupId === insuranceGroupId ) {
                            priceObj.price = priceToConfirm.officialPrice;
                        }
                    } );

                    priceToConfirm.officialPrice = null;
                    priceToConfirm.officialUtilityPositionNo = null;

                    let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'kbvutilityprice',
                        action: 'put',
                        query: {
                            _id: priceToConfirm._id
                        },
                        data: Y.doccirrus.filters.cleanDbObject( priceToConfirm ),
                        fields: ['official', 'confirmOfficial', 'utilityPositionNo', 'prices', 'officialPrice', 'officialUtilityPositionNo']
                    } ) );

                    if( err ) {
                        Y.log( `confirmPriceChange: could not update kbvutilityprice ${priceToConfirm._id}: ${err.stack || err}`, 'warn', NAME );
                        errors.push( err );
                    }
                }
            }

            return handleResult( null, {meta: {errors, warnings: []}}, callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class kbvutilityprice
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).kbvutilityprice = {

            name: NAME,
            invalidatePrices,
            updatePrices,
            get,
            checkPrices: checkPrices,
            getPrices: getPrices,
            confirmPriceChange

        };

    },
    '0.0.1', {requires: ['dcmongodb', 'kbvutilityprice-schema']}
);
