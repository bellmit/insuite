/**
 * User: oliversieweke
 * Date: 18.04.18  11:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * User: oliversieweke
 * Date: 10.04.18  17:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'ticontext-api', function( Y, NAME ) {
        /**
         * @module ticontext-api
         * @returns {*}
         */
        const
            runDb = Y.doccirrus.mongodb.runDb,
            {formatPromiseResult} = require( 'dc-core' ).utils,
            // moment = require( 'moment' ),
            _ = require( 'lodash' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            getClientSystemId = () => {
                let puppetrySettings;
                try {
                    puppetrySettings = require( 'dc-core' ).config.load( `${process.cwd()}/puppetry.json` );
                } catch( err ) {
                    Y.log( `getClientSystemId: could not load puppetry.json: ${err.stack || err}`, 'info', NAME );
                }
                return puppetrySettings && puppetrySettings.puppetryClientSystemId ||
                       require( '../mojits/InTiMojit/settings.json' ).clientSystemId;
            },
            clientSystemId = getClientSystemId(),
            ERROR_CODE_TO_IMVALID_PARAM = new Map( [
                ["4004", "MandantId"],
                ["4005", "ClientSystemId"],
                ["4006", "WorkplaceId"],
                ["4007", "CtId"],
                ["4096", "CtId"] // (Value returned by Puppetry, does not appear in the specs)
            ] ),
            ERROR_CODE_TO_UNLINKED_PARAM = new Map( [
                ["4010", "ClientSystemId"],
                ["4011", "WorkplaceId"],
                ["4010", "CtId"]
            ] ),
            pipeline = [
                {
                    $lookup: {
                        from: "profiles",
                        localField: "_id",
                        foreignField: "workStation",
                        as: "profiles"
                    }
                },
                {
                    $unwind: {
                        path: "$profiles",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "ticardreaders",
                        localField: "profiles.tiCardReaders",
                        foreignField: "_id",
                        as: "profileTiCardReaders"
                    }
                },
                {
                    $lookup: {
                        from: "ticardreaders",
                        localField: "tiCardReaders",
                        foreignField: "_id",
                        as: "tiCardReaders"
                    }
                },
                {
                    $unwind: "$tiCardReaders"
                },
                {
                    $unwind: "$tiCardReaders.organisationalUnits"
                },
                {
                    $lookup: {
                        from: "organisationalunits",
                        localField: "tiCardReaders.organisationalUnits",
                        foreignField: "_id",
                        as: "organisationalUnits"
                    }
                },
                {
                    $unwind: "$organisationalUnits"
                },
                {
                    $group: {
                        _id: {
                            _id: "$organisationalUnits._id",
                            MandantId: "$organisationalUnits.humanId",
                            WorkplaceId: "$humanId",
                            MandantName: "$organisationalUnits.name",
                            WorkplaceName: "$name"
                        },
                        CtIds: {$addToSet: "$tiCardReaders.humanId"},
                        profiles: {
                            $addToSet: {
                                profileLabel: "$profiles.profileLabel",
                                cardTerminals: "$profileTiCardReaders.humanId"
                            }
                        },
                        CtNames: {$addToSet: "$tiCardReaders.name"}
                    }
                },
                {
                    $project: {
                        _id: 1,
                        CtIds: 1,
                        CtNames: 1,
                        profiles: 1,
                        context: {
                            MandantId: "$_id.MandantId",
                            ClientSystemId: clientSystemId,
                            WorkplaceId: "$_id.WorkplaceId",
                            MandantName: "$_id.MandantName",
                            WorkplaceName: "$_id.WorkplaceName"
                        }
                    }
                }
            ],
            timeout = 3000;

        let
            lastReloadDate = new Date().getTime();

        // tiCardReaderLastUpdate;

        /**
         * Returns the list of available Contexts associated to TI card readers, such that:
         *  - Only the contexts/card readers specified for the profile are listed
         *  - Only card readers connected to the TI connector are listed
         *  Returns a promise if no callback is provided.
         * @method getList
         * @param {Object} params
         * @param {Object} params.user
         * @param {Function} params.callback
         * @for doccirrus.api.ticontext
         * @returns {Array} Array containing objects describing the context information.
         */
        function getList( params ) {
            Y.log( 'Entering Y.doccirrus.api.ticontext.getList', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.ticontext.getList' );
            }
            const {user, originalParams, callback} = params;
            const unfilteredByProfile = originalParams && originalParams.unfilteredByProfile || params.unfilteredByProfile;

            return new Promise( ( resolve, reject ) => {

                Y.doccirrus.api.identity.getLastActivatedProfile( {
                    user,
                    callback: queryWorkstations
                } );

                function queryWorkstations( err, res ) {
                    if( err ) {
                        Y.log( `Failed to get last activated profile. Error ${err}`, 'debug', NAME );
                        reject( err );
                        return;
                    }

                    const pipeline = [];
                    let profileLastActivated;
                    let profileWorkStation;
                    let profileTiCardReaders;

                    if( !unfilteredByProfile ) {
                        profileLastActivated = res && res[0] && res[0].profileLastActivated;
                        profileWorkStation = profileLastActivated && profileLastActivated.workStation || null;
                        profileTiCardReaders = profileLastActivated && profileLastActivated.tiCardReaders || [];

                        pipeline.push( {
                            // Filtering for the profile's workstation
                            $match: {_id: profileWorkStation}
                        } );
                    }

                    pipeline.push(
                        {
                            $unwind: "$tiCardReaders"
                        } );
                    if( !unfilteredByProfile ) {
                        pipeline.push(
                            {
                                // Filtering for the associated card readers (otherwise pass all on to the next stage if none specified)
                                $match: profileTiCardReaders.length > 0 ? {tiCardReaders: {$in: profileTiCardReaders}} : {_id: {$exists: true}}
                            }
                        );
                    }

                    pipeline.push(
                        {
                            $lookup: {
                                from: "ticardreaders",
                                localField: "tiCardReaders",
                                foreignField: "_id",
                                as: "tiCardReader"
                            }
                        },
                        {
                            $unwind: "$tiCardReader"
                        },
                        {
                            $unwind: "$tiCardReader.organisationalUnits"
                        },
                        {
                            $lookup: {
                                from: "organisationalunits",
                                localField: "tiCardReader.organisationalUnits",
                                foreignField: "_id",
                                as: "organisationalUnit"
                            }
                        },
                        {
                            $unwind: "$organisationalUnit"
                        },
                        {
                            $project: {
                                _id: 0,
                                context: {
                                    MandantId: "$organisationalUnit.humanId",
                                    ClientSystemId: clientSystemId,
                                    WorkplaceId: "$humanId"
                                },
                                CtId: "$tiCardReader.humanId",
                                organisationalUnitName: "$organisationalUnit.name",
                                workStationName: "$name",
                                tiCardReaderName: "$tiCardReader.name"
                            }
                        }
                    );

                    runDb( {
                        user,
                        model: 'workstation',
                        action: 'aggregate',
                        pipeline
                    } )
                        .then( res => {
                            const
                                contextInfos = res.result,
                                promises = [];

                            // Checking if the card terminals are connected
                            contextInfos.forEach( contextInfo => {
                                promises.push(
                                    Y.doccirrus.api.timanager.getCardTerminals( {user, context: contextInfo.context} )
                                        .then( res => {
                                            if( !res ) {
                                                return null;
                                            }

                                            const cardTerminals = Array.isArray( res ) ? res : [res];

                                            for( let i = 0; i < cardTerminals.length; i++ ) {
                                                if( cardTerminals[i].CtId === contextInfo.CtId && cardTerminals[i].Connected === 'true' ) {
                                                    return contextInfo;
                                                }
                                            }
                                            return null;
                                        } )
                                        .catch( err => {
                                            Y.log( `Failed to get TI card terminals. Error ${err}`, 'debug', NAME );
                                            return null;
                                        } )
                                );
                            } );
                            return Promise.all( promises );
                        } )
                        .then( contextInfos => contextInfos.filter( contextInfo => contextInfo ) )
                        .then( contextInfos => {
                            const promises = [];
                            // Get available Cards
                            contextInfos.forEach( contextInfo => {
                                promises.push(
                                    Y.doccirrus.api.timanager.getCards( {user, data: contextInfo} )
                                        .then( ( {Cards} ) => {
                                            const cards = Array.isArray( Cards.Card ) ? Cards.Card : [Cards.Card];
                                            contextInfo.SMCBCards = cards.filter( card => (card.CardType === "SMC-B" ||  card.CardType === "HBA" || card.CardType === "EGK" ));
                                            return contextInfo;
                                        } )
                                        .catch( err => {
                                            Y.log( `Failed to get TI cards. Error ${err}`, 'debug', NAME );
                                            return contextInfo;
                                        } )
                                );
                            } );
                            return Promise.all( promises );
                        } )
                        .then( contextInfos => {
                            if( callback ) {
                                return callback( null, contextInfos );
                            } else {
                                return resolve( contextInfos );
                            }
                        } )
                        .catch( err => {
                            Y.log( `Unable to get contexts. ${err}`, 'error', NAME );
                            if( callback ) {
                                return callback( null, [] );
                            } else {
                                return resolve( [] );
                            }
                        } );
                }
            } );
        }

        /**
         * Returns the configuration parameters needed for the connector set up.
         * Returns a promise if no callback is provided.
         * @method getConfigurationParameters
         * @param {Object} params
         * @param {Object} params.user
         * @param {Function} [params.callback]
         * @for doccirrus.api.ticontext
         * @returns {Array} Array containing objects describing the context information.
         */
        async function getConfigurationParameters( params ) {
            Y.log( 'Entering Y.doccirrus.api.ticontext.getConfigurationParameters', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.ticontext.getConfigurationParameters' );
            }
            const {user, callback} = params;
            let err, result, tiSMCBs, tiSMCBsCount;

            [err, result] = await formatPromiseResult( runDb( {
                user,
                model: 'workstation',
                action: 'aggregate',
                pipeline
            } ) );

            if( err ) {
                Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in getting context infos from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
            }

            [err, tiSMCBsCount] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'tismcb',
                    action: 'count'
                } )
            );

            if( err ) {
                Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in getting tiSMCBs from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
            }

            if( tiSMCBsCount === 0 ) {
                [err] = await formatPromiseResult(
                    reloadSMCBs( {
                        user
                    } )
                );

                if( err ) {
                    Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in getting tiSMCBs from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                    return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
                }
            }

            [err, tiSMCBs] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'tismcb',
                    action: 'aggregate',
                    pipeline: [
                        {
                            $lookup: {
                                from: "organisationalunits",
                                localField: "organisationalUnits",
                                foreignField: "_id",
                                as: "organisationalUnits"
                            }
                        },
                        {
                            $unwind: "$organisationalUnits"
                        }
                    ]
                } )
            );

            if( err ) {
                Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in getting tiSMCBs from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
            }
            tiSMCBs = tiSMCBs.result.map( smcb => smcb );

            let tiSettings;
            [err, tiSettings] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'tisettings',
                    action: 'get'
                } )
            );
            if( err ) {
                Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in getting tiSettings from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
            }

            // -------------------------------------------------------------------------------------------------------------
            // This filtering replaces the $filter in the project, which works on Robo 3T, but somehow not in the inSuite:
            // {$filter: {
            //     input: "$profiles",
            //         as: "profile",
            //         cond: {
            //         $ne: ["$$profile.profileLabel", undefined]
            //     }
            // }
            // }
            result = result.result.map( contextInfo => {
                contextInfo.profiles = contextInfo.profiles.filter( profile => {
                    return profile.profileLabel;
                } );

                return contextInfo;
            } );

            // -------------------------------------------------------------------------------------------------------------

            [err, result] = await formatPromiseResult( Promise.all( result.map( async contextInfo => {
                let [_err, SMCBCards] = await formatPromiseResult( testContext( contextInfo, user ) );

                if( _err ) {
                    Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in testing context infos for card reader: ${JSON.stringify( _err.stack || _err )}`, 'error', NAME );
                }

                const smcbCards = tiSMCBs.filter( card => {
                    return card.organisationalUnits.humanId === contextInfo.context.MandantId;
                } );

                let cards = [];
                if( SMCBCards && SMCBCards.length > 0 ) {
                    SMCBCards = SMCBCards.filter( elem => elem.length > 0 );
                    if( SMCBCards && SMCBCards.length > 0 ) {
                        SMCBCards.forEach( card => {
                            const smc = smcbCards.find( smc => {
                                return smc.iccsn === card[0].Iccsn;
                            } );
                            if( smc ) {
                                cards.push( card[0] );
                            }
                        } );
                    } else if( smcbCards && smcbCards.length > 0 ) {
                        cards = smcbCards.filter( card => {
                            return card.organisationalUnits.humanId === contextInfo.context.MandantId;
                        } );
                    }
                }

                return {
                    ...contextInfo,
                    SMCBCards: cards,
                    settings: tiSettings,
                    ..._err ? _err : {}
                };
            } ) ) );

            if( err ) {
                Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in testing context infos for card reader (2): ${JSON.stringify( err.stack || err )}`, 'error', NAME );
            }

            return callback ? callback( null, result ) : result;
        }

        /**
         * Returns the TI Card Readers and Cards for the PatientBrowserViewModel.
         * Returns a promise if no callback is provided.
         * @method tiForPatientBrowser
         * @param {Object} params
         * @param {Object} params.user
         * @param {Function} [params.callback]
         * @for doccirrus.api.ticontext
         * @returns {Array} Array containing objects describing the context information.
         */
        async function tiForPatientBrowser( params ) {
            Y.log( 'Entering Y.doccirrus.api.ticontext.tiForPatientBrowser', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.ticontext.tiForPatientBrowser' );
            }
            const {user, callback} = params;
            let
                err,
                result,
                tiSMCBs,
                // promises = [],
                smcbCards = {};
            // cardTerminals;

            const userLocation = user.locations || [];
            const locationIds = {$in: userLocation.map( location => ObjectId( location && location._id ) )};

            if( userLocation && !userLocation.length ) {
                return callback ? callback( null, {
                    result: {},
                    SMCBCards: {}
                } ) : {
                    result: {},
                    SMCBCards: {}
                };
            }

            [err, result] = await formatPromiseResult( runDb( {
                user,
                model: 'workstation',
                action: 'aggregate',
                pipeline: [
                    {
                        $lookup: {
                            from: "profiles",
                            localField: "_id",
                            foreignField: "workStation",
                            as: "profiles"
                        }
                    },
                    {
                        $unwind: {
                            path: "$profiles",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: "ticardreaders",
                            localField: "profiles.tiCardReaders",
                            foreignField: "_id",
                            as: "profileTiCardReaders"
                        }
                    },
                    {
                        $lookup: {
                            from: "ticardreaders",
                            localField: "tiCardReaders",
                            foreignField: "_id",
                            as: "tiCardReaders"
                        }
                    },
                    {
                        $unwind: "$tiCardReaders"
                    },
                    {
                        $unwind: "$tiCardReaders.organisationalUnits"
                    },
                    {
                        $lookup: {
                            from: "organisationalunits",
                            localField: "tiCardReaders.organisationalUnits",
                            foreignField: "_id",
                            as: "organisationalUnits"
                        }
                    },
                    {
                        $unwind: "$organisationalUnits"
                    },
                    {
                        $match: {
                            $or: [
                                {"organisationalUnits.locations": {$size: 0}},
                                {"organisationalUnits.locations": locationIds}
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: {
                                _id: ["$organisationalUnits._id"],
                                MandantId: "$organisationalUnits.humanId",
                                WorkplaceId: "$humanId",
                                MandantName: "$organisationalUnits.name",
                                WorkplaceName: "$name"
                            },
                            CtIds: {$addToSet: "$tiCardReaders.humanId"},
                            profiles: {
                                $addToSet: {
                                    profileLabel: "$profiles.profileLabel",
                                    cardTerminals: "$profileTiCardReaders.humanId"
                                }
                            },
                            CtNames: {$addToSet: "$tiCardReaders.name"}
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            CtIds: 1,
                            CtNames: 1,
                            profiles: 1,
                            context: {
                                MandantId: "$_id.MandantId",
                                ClientSystemId: clientSystemId,
                                WorkplaceId: "$_id.WorkplaceId",
                                MandantName: "$_id.MandantName",
                                WorkplaceName: "$_id.WorkplaceName"
                            }
                        }
                    }
                ]
            } ) );

            if( err ) {
                Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-tiForPatientBrowser: Error in getting context infos from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
            }

            // -------------------------------------------------------------------------------------------------------------
            // This filtering replaces the $filter in the project, which works on Robo 3T, but somehow not in the inSuite:
            // {$filter: {
            //     input: "$profiles",
            //         as: "profile",
            //         cond: {
            //         $ne: ["$$profile.profileLabel", undefined]
            //     }
            // }
            // }
            result = result.result.map( contextInfo => {
                contextInfo.profiles = contextInfo.profiles.filter( profile => {
                    return profile.profileLabel;
                } );

                return contextInfo;
            } );

            [err, tiSMCBs] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'tismcb',
                    action: 'aggregate',
                    pipeline: [
                        {
                            $lookup: {
                                from: "organisationalunits",
                                localField: "organisationalUnits",
                                foreignField: "_id",
                                as: "organisationalUnits"
                            }
                        },
                        {
                            $unwind: "$organisationalUnits"
                        }
                    ]
                } )
            );

            if( err ) {
                Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-getConfigurationParameters: Error in getting tiSMCBs from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
            }
            tiSMCBs = tiSMCBs.result.map( smcb => smcb );

            for( let i = 0; i < result.length; i++ ) {
                if( !smcbCards[result[i].context.MandantId] ) {
                    smcbCards[result[i].context.MandantId] = [];
                }

                //Preparation for later optimization

                // let terminals;
                // [err, terminals] = await formatPromiseResult(
                //     Y.doccirrus.api.timanager.getCardTerminals( {user, data: result[i]} )
                //     .then( res => {
                //         if( !res ) {
                //             return null;
                //         }
                //
                //         if( Array.isArray( res ) ) {
                //             return res.map( terminal => terminal.CtId );
                //         }
                //         return res.CtId;
                //     } )
                //     .catch( err => {
                //         Y.log( `Failed to get TI card terminals. Error ${err}`, 'warn', NAME );
                //         return null;
                //     } )
                // );
                // if( err ) {
                //
                // } else if( terminals ) {
                //     if( !tiCardReaderLastUpdate || moment(tiCardReaderLastUpdate).isBefore(moment(new Date())) ){
                //
                //     }
                // }
            }
            //
            // for( let i = 0; i < cardTerminalIds.length; i++ ) {
            //     let tmpIds = cardTerminalIds[i];
            //     if( Array.isArray( cardTerminalIds[i] ) ) {
            //         tmpIds = [].concat( cardTerminalIds[i] );
            //     }
            //     result[i].CtIds = _.uniq( result[i].CtIds.concat( tmpIds ) );
            // }

            // -------------------------------------------------------------------------------------------------------------

            [err, result] = await formatPromiseResult( Promise.all( result.map( async contextInfo => {
                let [err, SMCBCards] = await formatPromiseResult( testContext( contextInfo, user ) );

                if( err ) {
                    Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-tiForPatientBrowser: Error in testing context infos for card reader: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                }

                if( SMCBCards && Array.isArray( SMCBCards ) && SMCBCards.length ) {
                    //filter only arrays with cards
                    SMCBCards = SMCBCards.flat();

                    if( SMCBCards && SMCBCards.length > 0 ) {
                        const filtered = tiSMCBs.filter( smcb => smcb.organisationalUnits.humanId === contextInfo.context.MandantId );
                        smcbCards[contextInfo.context.MandantId] = _.uniq( smcbCards[contextInfo.context.MandantId].concat( SMCBCards.filter( card => filtered.find( smc => smc.iccsn === card.Iccsn ) ) ), 'Iccsn' );
                    }
                }

                return {
                    ...contextInfo,
                    ...err ? err : {}
                };
            } ) ) );

            const tmpObj = {
                result: result,
                SMCBCards: smcbCards
            };

            if( err ) {
                return callback ? callback( err, null ) : err;
            }
            return callback ? callback( null, tmpObj ) : tmpObj;
        }

        /**
         * delete all SMCBs from DB and fetch new ones
         * @method reloadSMCBs
         * @param {Object} params
         * @param {Object} params.user
         * @param {Function} [params.callback]
         * @for doccirrus.api.ticontext
         * @returns {Array} Array containing SMCBs.
         */
        async function reloadSMCBs( params ) {
            Y.log( 'Entering Y.doccirrus.api.ticontext.reloadSMCBs', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.ticontext.reloadSMCBs' );
            }
            const {user, callback} = params;
            let err, result, tiSMCBCardsForSetup = [];

            if( !(new Date().getTime() - lastReloadDate < timeout) ) {
                lastReloadDate = new Date().getTime();
                [err, result] = await formatPromiseResult( runDb( {
                    user,
                    model: 'workstation',
                    action: 'aggregate',
                    pipeline
                } ) );

                if( err ) {
                    Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-reloadSMCBs: Error in getting context infos from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                    return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
                }

                let tiSMCBs;
                [err, tiSMCBs] = await formatPromiseResult(
                    runDb( {
                        user,
                        model: 'tismcb',
                        action: 'get',
                        query: {
                            _id: {$exists: true}
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-reloadSMCBs: Error in getting tiSMCBs from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                    return callback ? callback( Y.doccirrus.errors.rest( 'TI_00' ) ) : err;
                }

                result = result.result.map( contextInfo => {
                    contextInfo.profiles = contextInfo.profiles.filter( profile => {
                        return profile.profileLabel;
                    } );

                    return contextInfo;
                } );

                [err] = await formatPromiseResult( Promise.all( result.map( async contextInfo => {
                    let [err, SMCBCards] = await formatPromiseResult( testContext( contextInfo, user ) );

                    if( err ) {
                        Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-reloadSMCBs: Error in testing context infos for card reader: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                    }

                    let cards = [];
                    if( SMCBCards && SMCBCards.length > 0 ) {
                        SMCBCards = SMCBCards.filter( elem => elem.length > 0 );
                        SMCBCards.forEach( card => {
                            const smcs = card.filter( smc => smc.CardType === 'SMC-B' );
                            if( smcs && smcs.length > 0 ) {
                                cards.push( smcs );
                                for( let i = 0; i < smcs.length; i++ ) {
                                    tiSMCBCardsForSetup.push( {
                                        iccsn: smcs[i].Iccsn,
                                        name: smcs[i].CardHolderName,
                                        organisationalUnits: []
                                    } );
                                }
                            }
                        } );
                    }

                    return {
                        ...contextInfo,
                        SMCBCards: cards,
                        ...err ? err : {}
                    };
                } ) ) );

                tiSMCBCardsForSetup = _.sortBy( _.uniq( tiSMCBCardsForSetup, 'iccsn' ), 'iccsn' );
                const alreadyExistingSMCBCards = tiSMCBs.filter( smcb => tiSMCBCardsForSetup.find( tismcb => smcb.iccsn === tismcb.iccsn ) );
                const toRemove = tiSMCBs.filter( tismcb => tiSMCBCardsForSetup.find( smcb => smcb.iccsn !== tismcb.iccsn ) ).map( elem => elem._id );
                for( let i = 0; i < alreadyExistingSMCBCards.length; i++ ) {
                    const correspondingObject = tiSMCBCardsForSetup.find( tismcb => tismcb.iccsn === alreadyExistingSMCBCards[i].iccsn );
                    if( correspondingObject ) {
                        [err] = await formatPromiseResult(
                            runDb( {
                                user,
                                model: 'tismcb',
                                action: 'update',
                                fields: ['name'],
                                query: {
                                    _id: alreadyExistingSMCBCards[i]._id
                                },
                                data: {
                                    name: correspondingObject.name
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-reloadSMCBs: Error in updating tiSMCBs from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                            return callback ? callback( new Y.doccirrus.commonerrors.DCError( 'TI_00' ) ) : err;
                        }
                        const index = tiSMCBCardsForSetup.indexOf( tiSMCBCardsForSetup.find( tismcb => tismcb.iccsn === correspondingObject.iccsn ) );
                        tiSMCBCardsForSetup.splice( index, 1 );
                        const indexToRemove = toRemove.indexOf( alreadyExistingSMCBCards[i]._id );
                        if( indexToRemove > -1 ) {
                            toRemove.splice( index, 1 );
                        }
                    }
                }
                if( toRemove && toRemove.length ) {
                    [err] = await formatPromiseResult(
                        runDb( {
                            user,
                            model: 'tismcb',
                            action: 'delete',
                            query: {
                                _id: {$in: toRemove}
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-reloadSMCBs: Error in deleting tiSMCBs from DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                        return callback ? callback( new Y.doccirrus.commonerrors.DCError( 'TI_00' ) ) : err;
                    }
                }
                if( tiSMCBCardsForSetup && tiSMCBCardsForSetup.length > 0 ) {
                    [err] = await formatPromiseResult(
                        runDb( {
                            user,
                            model: 'tismcb',
                            action: 'mongoInsertMany',
                            data: tiSMCBCardsForSetup
                        } )
                    );

                    if( err ) {
                        Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-reloadSMCBs: Error in inserting tiSMCBs into DB: ${JSON.stringify( err.stack || err )}`, 'error', NAME );
                        return callback ? callback( new Y.doccirrus.commonerrors.DCError( 'TI_00' ) ) : err;
                    }
                }
            }
            return callback ? callback( null, tiSMCBCardsForSetup ) : tiSMCBCardsForSetup;
        }

        function testContext( {context, CtIds}, user ) {
            return Promise.all( CtIds.map( async CtId => {
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.api.timanager.getCards( {
                        user,
                        data: {context, CtId}
                    } )
                );

                if( err ) {
                    const errorTrace = err.root && err.root.Envelope && err.root.Envelope.Body && err.root.Envelope.Body.Fault && err.root.Envelope.Body.Fault.detail && err.root.Envelope.Body.Fault.detail.Error && err.root.Envelope.Body.Fault.detail.Error.Trace;
                    const connectorErrorCode = errorTrace && errorTrace.Code;
                    const inSuiteErrorMessage = connectorErrorCode ? undefined : err.message;
                    const invalidParam = ERROR_CODE_TO_IMVALID_PARAM.get( connectorErrorCode );
                    const unlinkedParam = ERROR_CODE_TO_UNLINKED_PARAM.get( connectorErrorCode );
                    const invalidParamValue = invalidParam === 'CtId' ? CtId : context[invalidParam];
                    const unlinkedParamValue = unlinkedParam === 'CtId' ? CtId : context[unlinkedParam];

                    throw {
                        inSuiteErrorMessage,
                        connectorErrorCode,
                        invalidParam,
                        unlinkedParam,
                        invalidParamValue,
                        unlinkedParamValue
                    };
                }

                if( result ) {
                    const cards = Array.isArray( result && result.Cards && result.Cards.Card ) ? result && result.Cards && result.Cards.Card : [result && result.Cards && result.Cards.Card];
                    return cards.filter( card => card && card.CardType === "SMC-B" );
                }
            } ) );
        }

        /**
         * @class ticontext
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).ticontext = {
            name: NAME,
            getList,
            getConfigurationParameters,
            tiForPatientBrowser,
            reloadSMCBs
        };
    },
    '0.0.1', {
        requires: ['timanager']
    }
);
