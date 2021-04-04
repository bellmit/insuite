/**
 * User: mahmoud
 * Date: 05/11/14  16:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/ //jshint ignore:line
/* jshint ignore:start */


YUI.add( 'cardreader-api', function( Y, NAME ) {
        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            {logEnter, logExit} = require( `../../../server/utils/logWrapping.js` )( Y, NAME );

        const get = async args => {
            Y.log('Entering Y.doccirrus.api.cardreader.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`../../../server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardreader.get');
            }
            const {callback, ...rest} = args,
                    async = require( 'async' );

            // if TI, we short-circuit and do only a single simple call
            if( args.query && args.query.ti && 'true' === args.query.ti ) {
                Y.log( `Using Cardeader-TI-API. `, 'info', NAME );
                let err, res;
                [err, res] = await formatPromiseResult( Y.doccirrus.api.ticontext.getConfigurationParameters( { user: args.user } ) );
                if( err ) {
                    Y.log( `Cardeader-TI-API: ${err.stack || err} `, 'error', NAME );
                    return callback( err );
                }
                return callback( null, res );
            }

            Y.log( `Using Cardeader-API (non-TI). For TI use param: ti=true`, 'info', NAME );
            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.api.cardreaderconfiguration.getRegisteredCardreaders( {
                        ...rest,
                        callback(err, res){
                            next(err, res);
                        }
                    } );
                },
                ( res, next ) => {
                    Y.doccirrus.api.dscrmanager.getOnlineCardreadersList( {
                        ...args,
                        data: {
                            registeredCardreaders: res.registeredCardreaders,
                            deviceServers: res.deviceServers
                        },
                        callback: next
                    } );
                }
            ], callback );
        };

        /**
         * Wrapper for TIManager, to be called from REST /2
         * @param {Object} args
         * @param {Object} args.data
         * @param {module:authSchema.auth} args.user - User Object.
         * @param {Function} args.callback
         * @return {Promise<module:crlogSchema.crlog.parsedPatient|Object>}
         */
        async function getPatientFromCard( args ) {
            let timer = logEnter( 'Cardreader-TI-API getPatientFromCard' );
            const {user, callback} = args;
            let data = args.data;

            // switch array to string for CT IDs and SMCB Cards
            if( data && data.CtIds && Array.isArray( data.CtIds ) ) {
                data.CtId = data.CtIds[0];
            }
            if( data && data.SMCBCards && Array.isArray( data.SMCBCards ) ) {
                data.SMCBCard = data.SMCBCards[0];
            }

            const [err, result] = await formatPromiseResult(
                Y.doccirrus.api.timanager.readCard( {
                    user: user,
                    data: data
                } )
            );

            if( err ) {
                Y.log( `TI API /2 : ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                return handleResult( err, undefined, callback );
            } else if( result && result.errors && Array.isArray( result.errors ) ) {
                Y.log( `TI API /2 : ${result.errors.join()}`, 'error', NAME );
                logExit( timer );
                return handleResult( null, {errors: result.errors}, callback );
            } else {
                // wait for the log parsing to complete and write to DB.
                await (( ms ) => {
                    return new Promise( resolve => setTimeout( resolve, ms ) );
                })( 2000 );

                let err, res;
                [err, res] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'crlog',
                        user: user,
                        query: {
                            _id: result && result.ids && result.ids[0]
                        },
                        options: {
                            select: {
                                rawData: 1,
                                parsedPatient: 1
                            },
                            limit: 1,
                            lean: true
                        }
                    } )
                );

                if( err ) {
                    Y.log( `Second  TI API /2 : ${err.stack || err}`, 'error', NAME );
                    logExit( timer );
                    return handleResult( err, undefined, callback );
                }
                if( res && Array.isArray( res ) && res.length && res[0].parsedPatient ) {
                    logExit( timer );
                    return handleResult( undefined, res[0].parsedPatient, callback );
                }
                Y.log( `Second  TI API /2 : no result! ${res}`, 'error', NAME );
                logExit( timer );
                return handleResult( undefined, [], callback );
            }
        }

        Y.namespace( 'doccirrus.api' ).cardreader = {
            get,
            getPatientFromCard
        };
    },
    '0.0.1', {requires: ['dccrmanager', 'cardreadercommon', 'dccommonutils']}
);
/* jshint ignore:end */