/**
 * User: as, os
 * Date: 03.04.18  15:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

YUI.add( 'timanager', async function( Y, NAME ) {
    const {setCache, getCache} = require( '../helpers/cachingUtils' )( Y, NAME );
    const {handleResult, formatPromiseResult} = require( 'dc-core' ).utils;
    const i18n = Y.doccirrus.i18n;
    const tiCardReaderI18n = i18n( 'InTiMojit.tiCardReader' );
    const {logEnter, logExit} = require( `../../../server/utils/logWrapping.js` )( Y, NAME );

    /**
     * Initial set up on master worker.
     * @param {Object} user
     * @param {Function} callback
     * @return {Promise<void>}
     */
    const init = async ( user, callback ) => {
        let [err] = await formatPromiseResult( discoverTiEndpoints( {user} ) );
        if( err ) {
            Y.log( `could not discover Ti endpoints: ${err.stack || err}`, 'error', NAME );
        }
        callback();
    };

    const getTiEndpoints = async ( {user} ) => {
        let [err, tiSettings] = await formatPromiseResult( Y.doccirrus.api.tisettings.get( {
            user
        } ) );

        if( err ) {
            Y.log( `getTiEndpoints: could not fetch tiSettings: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }
        tiSettings = tiSettings && tiSettings[0];

        Y.log( `Fetched tisettings from database: ${tiSettings}`, 'info', NAME );

        let connector;
        [err, connector] = await formatPromiseResult( Y.doccirrus.dcTi.createConnector( {tiSettings, log: Y.log} ) );
        if( err ) {
            Y.log( `getTiEndpoints: could not create Connector instance: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }
        let result;

        [err, result] = await formatPromiseResult( connector.discover() );
        if( err ) {
            Y.log( `getTiEndpoints: unable to discover TI endpoint: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        return result;
    };

    async function updateConnectorProductVersion( {user, productTypeVersion} ) {
        if( productTypeVersion !== '' ) {
            let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'location',
                query: {},
                data: {$set: {konnektorProductVersion: productTypeVersion}},
                options: {multi: true}
            } ) );
            if( err ) {
                Y.log( `could not update konnektor product version of locations: ${err.stack || err}`, 'warn', NAME );
            }
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'tisettings',
                query: {_id: "000000000000000000000001"},
                data: {$set: {konnektorProductVersion: productTypeVersion}}
            } ) );
            if( err ) {
                Y.log( `could not update konnektor product version of tisettings: ${err.stack || err}`, 'warn', NAME );
            }
        }

    }

    async function discoverTiEndpoints( {user} ) {
        const isRedisConnected = Y.doccirrus.cacheUtils.dataCache.isClientConnected();

        if( isRedisConnected ) {
            await setCache( `${user.tenantId}tiServicesInfo`, null );
            await setCache( `${user.tenantId}tiResourceInformation`, null );
            await setCache( `${user.tenantId}tiServicesVersionSupport`, null );
            let {servicesInfo, versionsSupported, productTypeVersion} = await getTiEndpoints( {user} );
            await setCache( `${user.tenantId}tiServicesInfo`, servicesInfo );
            // TODO: KIM move code from getTiInfo here and set this cache; return all needed data for getTiInfo
            // TODO: KIM check this periodically?
            // await setCache( `${user.tenantId}tiResourceInformation`, {
            //     vpnTiStatus: {
            //         status: null,
            //         notifiedUser: false
            //     }
            // } );
            await setCache( `${user.tenantId}tiServicesVersionSupport`, {
                versionsSupported,
                notifiedUser: false
            } );
            updateConnectorProductVersion( {user, productTypeVersion} );
        } else {
            setTimeout( () => discoverTiEndpoints( {user} ), 2000 );
        }
    }

    // =========================================== TERMINAL & CARD OPERATIONS =========================================== \\
    // ================================================================================================================== \\
    async function getCardTerminals( args ) {
        Y.log( 'Entering Y.doccirrus.api.timanager.getCardTerminals', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.getCardTerminals' );
        }
        const {user, context, callback} = args;
        let [err, vsdm] = await formatPromiseResult( Y.doccirrus.dcTi.createVSDM( {user} ) );

        if( err ) {
            Y.log( `getCardTerminals: could create VSDM: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let result;
        [err, result] = await formatPromiseResult( vsdm.getCardTerminals( context ) );

        if( err ) {
            Y.log( `getCardTerminals: could not get card terminals for context ${context}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return handleResult( null, result, callback );
    }

    /**
     * Gets all cards for a given context including there pin status.
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.originalParams.context
     * @param {String} args.originalParams.context.MandantId
     * @param {String} args.originalParams.context.ClientSystemId
     * @param {String} args.originalParams.context.WorkplaceId
     * @param {Object} args.originalParams.CtId
     * @param {Function} args.callback
     * @return {Promise<*>}
     */
    async function getCardsForQes( args ) {
        Y.log( 'Entering Y.doccirrus.api.timanager.getCardsForQes', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.getCardsForQes' );
        }

        const {user, originalParams, callback} = args,
            context = originalParams.context,
            CtId = originalParams.CtId || '';

        let [err, result] = await formatPromiseResult(
            Y.doccirrus.api.timanager.getCards( {
                user,
                data: {context, CtId}
            } ) );

        if( err ) {
            Y.log( `getCardsForQes: getCards failed: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, null, callback );
        }

        if( !result || !result.Cards || !result.Cards.Card || !result.Cards.Card.length ) {
            Y.log( `timanager-api: getCardsForQes: Error - No Card found. ${result} ${user}`, NAME );
            return handleResult( Y.doccirrus.errors.rest( '11417', true ), undefined, callback );
        }

        // FILTER only HBA or SMC-B Cards
        const cards = result.Cards.Card.filter( ( el ) => el.CardType === 'SMC-B' || el.CardType === 'HBA' );
        const cardReturns = [];
        for( let cardObj of cards ) {
            let [err1, res1] = await formatPromiseResult( Y.doccirrus.api.timanager.pinOperation( {
                user,
                data: {
                    context: {...context, UserId: cardObj.CardType === 'HBA' ? user.id : undefined},
                    CardHandle: cardObj && cardObj.CardHandle,
                    action: 'GetPinStatus',
                    PinTyp: cardObj.CardType === 'HBA' ? 'PIN.QES' : undefined  // defaults to PIN.SMC
                }
            } ) );
            if( err1 ) {
                Y.log( `timanager-api: getCardsForQes: ITERATOR pinOperation 'GetPinStatus' failed: ${err1.stack || err1}`, 'warn', NAME );
                return handleResult( err1, null, callback );
            }

            cardReturns.push( {...cardObj, pinOperationResult: res1} );
        }

        return handleResult( null, cardReturns, callback );
    }

    async function getCards( args ) {
        Y.log( 'Entering Y.doccirrus.api.timanager.getCards', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.getCards' );
        }
        const {user, data, callback} = args;
        let [err, vsdm] = await formatPromiseResult( Y.doccirrus.dcTi.createVSDM( {user} ) );
        if( err ) {
            Y.log( `getCards: could not create VSDM: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        const context = {...data.context, CtId: data.CtId};

        let result;
        [err, result] = await formatPromiseResult( vsdm.getCards( context ) );

        if( err ) {
            Y.log( `getCardTerminals: could not get card terminals for context ${data}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return handleResult( null, result, callback );
    }

    async function readCard( args ) {
        let timer = logEnter( 'Y.doccirrus.api.timanager.readCard' );
        const getInsuranceStatus = ( insuranceNumber ) => {
            return Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'patient',
                user: user,
                query: {
                    'insuranceStatus.insuranceNo': insuranceNumber
                },
                options: {
                    select: {
                        'insuranceStatus.$': 1
                    },
                    limit: 1
                }
            } );
        };

        const {user, data, callback} = args;
        const {TiError} = Y.doccirrus.dcTi.getTi();
        const {enforceOnlineCheck, context, CtId, SMCBCard, tiCardReaderName} = data;

        let [err, vsdm] = await formatPromiseResult( Y.doccirrus.dcTi.createVSDM( {user} ) );
        if( err ) {
            logExit( timer );
            Y.log( `readCard: could not create VSDM: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let tiSettings;
        [err, tiSettings] = await formatPromiseResult( Y.doccirrus.api.tisettings.get( {
            user
        } ) );
        if( err ) {
            logExit( timer );
            Y.log( `could not get tisettings: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let result;
        [err, result] = await formatPromiseResult( vsdm.readCard( {
            context,
            SMCBCard,
            CtId,
            enforceOnlineCheck,
            tiSettings: tiSettings[0],
            getInsuranceStatus
        } ) );

        if( err ) {
            logExit( timer );
            Y.log( `readCard: could not get card terminals for context ${context} and SMCBCard ${SMCBCard}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( result instanceof TiError ) {
            // refine error message of TiError with message from error table
            result.errors.forEach( error => {
                const {code, tiErrorCode, message} = error;
                error.message = Y.doccirrus.errorTable.hasCode( code ) || message === '' ? Y.doccirrus.errors.rest( code ) : `${message}<br><br>[Fehlercode: ${tiErrorCode}]`;
            } );
        } else if( result.cardReadResult ) { // MOJ-10104: This is for error 3001 caught in handleValidation
            const {rawCardData} = result.cardReadResult;
            result.forcedOnlineCheckMessage = result.forcedOnlineCheckMessage ? i18n( result.forcedOnlineCheckMessage ) : '';

            let ids;
            [err, ids] = await formatPromiseResult( Y.doccirrus.api.crlog.server.storeCardRead( {
                user, rawCardData,
                deviceName: `${tiCardReaderI18n}-${tiCardReaderName}`
            } ) );

            if( err ) {
                logExit( timer );
                Y.log( `readCard: could not store card read: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            result.ids = ids;
        } else if( !result.cardReadResult ) {
            Y.log( `readCard: no cardReadResult received from ${tiCardReaderName}`, 'warn', NAME );
        }

        logExit( timer );
        return handleResult( null, result, callback );
    }

    // ================================================= PIN OPERATIONS ================================================= \\
    // ================================================================================================================== \\
    async function pinOperation( args ) {
        let timer = logEnter( 'Y.doccirrus.api.timanager.pinOperation' );
        Y.log( 'Entering Y.doccirrus.api.timanager.pinOperation', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.pinOperation' );
        }

        const {user, data, callback} = args;
        let [err, vsdm] = await formatPromiseResult( Y.doccirrus.dcTi.createVSDM( {user} ) );
        if( err ) {
            logExit( timer );
            Y.log( `pinOperation: could not create VSDM: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        let result;
        [err, result] = await formatPromiseResult( vsdm.pinOperation( data ) );
        if( err ) {
            logExit( timer );
            Y.log( `pinOperation: error while executing pinOperation ${data.action}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        logExit( timer );
        return handleResult( null, result, callback );
    }

    // ================================================= TI INFORMATION ================================================= \\
    // ================================================================================================================== \\

    async function getResourceInformation( args ) { // Note: Parameters don'' necessarily need to be linked on the connector for this call to be successful
        const {user, context} = args;
        let [err, vsdm] = await formatPromiseResult( Y.doccirrus.dcTi.createVSDM( {user} ) );
        if( err ) {
            Y.log( `getResourceInformation: could not create VSDM: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        let result;
        [err, result] = await formatPromiseResult( vsdm.getResourceInformation( context ) );
        if( err ) {
            Y.log( `getResourceInformation: could not init eventService: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        return result;
    }

    async function getTiInfo( args ) {
        Y.log( 'Entering Y.doccirrus.api.timanager.getTiInfo', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.getTiInfo' );
        }
        const {user, callback} = args;
        const isRedisConnected = Y.doccirrus.cacheUtils.dataCache.isClientConnected();

        if( isRedisConnected ) {
            let [error] = await formatPromiseResult( discoverTiEndpoints( {user} ) );
            let
                err,
                contextInfos = null,
                tiServicesVersionSupport = null,
                resourceInformation = null;

            if( error ) {
                if (/ECONNREFUSED/.test(error)){
                    error = Y.doccirrus.errors.rest( '11418' );
                } else if (/wrong tag/.test(error)) {
                    error = Y.doccirrus.errors.rest( '11419' );
                }
                return handleResult( error, {
                    resourceInformation: null,
                    contextInfos: [],
                    tiServicesVersionSupport: null
                }, callback );
            }

            contextInfos = await Y.doccirrus.api.ticontext.getList( {...args, callback: undefined} );
            tiServicesVersionSupport = await getCache( `${user.tenantId}tiServicesVersionSupport` );

            for( let contextInfo of contextInfos ) {
                [err, resourceInformation] = await formatPromiseResult( getResourceInformation( {
                    user,
                    context: contextInfo.context
                } ) );

                if( err ) {
                    Y.log( `getTiInfo: could not get resource information for context: ${contextInfo.constructor}: ${err.stack || err}`, 'warn', NAME );
                    continue;
                }

                const vpnTiStatus = resourceInformation && resourceInformation.Connector && resourceInformation.Connector.VPNTIStatus && resourceInformation.Connector.VPNTIStatus.ConnectionStatus;

                setCache( `${user.tenantId}tiResourceInformation`, {
                    vpnTiStatus: {
                        status: vpnTiStatus,
                        notifiedUser: false
                    }
                } );
                break;
            }
            return handleResult( null, {resourceInformation, contextInfos, tiServicesVersionSupport}, callback );

        } else {
            return handleResult( null, {
                resourceInformation: null,
                contextInfos: [],
                tiServicesVersionSupport: null
            }, callback );
        }
    }

    async function getCachedTiStatusInfo( args ) {
        Y.log( 'Entering Y.doccirrus.api.timanager.getCachedTiStatusInfo', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.getCachedTiStatusInfo' );
        }
        const {user, callback} = args;

        let [err, [tiServicesVersionSupport, tiResourceInformation]] = await formatPromiseResult( Promise.all( [
            getCache( `${user.tenantId}tiServicesVersionSupport` ),
            getCache( `${user.tenantId}tiResourceInformation` )
        ] ) );

        if( err ) {
            Y.log( `getCachedTiStatusInfo: could not get ti status infos: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return handleResult( null, {
            tiServicesVersionSupport,
            tiResourceInformation
        }, callback );
    }

    async function cacheTiStatusInfo( args ) {
        Y.log( 'Entering Y.doccirrus.api.timanager.cacheTiStatusInfo', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.cacheTiStatusInfo' );
        }
        const
            {originalParams, callback, user} = args,
            {tiServicesVersionSupport, tiResourceInformation} = originalParams;

        let [err] = await formatPromiseResult( Promise.all( [
            setCache( `${user.tenantId}tiServicesVersionSupport`, tiServicesVersionSupport ),
            setCache( `${user.tenantId}tiResourceInformation`, tiResourceInformation )
        ] ) );

        if( err ) {
            Y.log( `cacheTiStatusInfo: could not cache ti status info: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }
        return handleResult( null, {}, callback );
    }

    async function getModeOnlineCheckOptions( args ) {
        Y.log( 'Entering Y.doccirrus.api.timanager.getModeOnlineCheckOptions', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.timanager.getModeOnlineCheckOptions' );
        }
        const {Connector} = Y.doccirrus.dcTi.getTi();
        const {callback} = args;
        const modeOnlineCheckOptions = Connector.getModeOnlineCheckOptions();
        return handleResult( null, modeOnlineCheckOptions, callback );
    }

    Y.namespace( 'doccirrus.api' ).timanager = {
        /**
         * @property name
         * @type {String}
         * @default timanager
         * @protected
         */
        name: NAME,
        init,
        getCardTerminals,
        getCardsForQes,
        getCards,
        readCard,
        pinOperation,
        getTiInfo,
        getModeOnlineCheckOptions,
        getCachedTiStatusInfo,
        cacheTiStatusInfo
    };
}, '0.0.1', {
    requires: [
        'JsonRpc',
        'tiDirectoryService-api',
        'dcTi'
    ]
} );